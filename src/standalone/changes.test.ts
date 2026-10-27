import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { VaultWriter } from "./vault-writer.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { hashText } from "./profile.ts";
import { catalogFingerprint } from "./catalog.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-changes-")), vault = join(root, "vault"), profile = join(root, "profile");
  await mkdir(join(vault, "Projects"), { recursive: true }); await mkdir(profile);
  const path = "Projects/Original.md", before = "---\nid: preserve\n---\n# Original\nOriginal body.\n";
  await writeFile(join(vault, path), before); await writeFile(join(vault, "Projects/Source.md"), "Current source");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  const storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision);
  const compatibility = await storage.inspect(".obsidian", info.revision); await storage.enable(compatibility.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.projects = "Projects"; await storage.savePreferences(preferences, info.revision);
  const changes = new DesktopChanges(reader, storage);
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  return { root, vault, profile, path, before, reader, info, storage, changes };
}

test("main-owned edit preserves frontmatter, renews exact revision previews and guards undo", async t => {
  const f = await fixture(t), note = await f.reader.read(f.path, f.info.revision);
  const edit = await f.changes.beginEdit(f.path, note.stamp, f.info.revision); assert.equal(edit.body, "# Original\nOriginal body.\n");
  await f.changes.proposeEdit(edit.id, "# Changed\nReviewed body.\n", f.info.revision);
  let pending = f.changes.snapshot(f.info.revision).pending!; let preview = await f.changes.preview("apply", pending.id, f.info.revision);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before); assert.equal(preview.operations[0]!.after, "---\nid: preserve\n---\n# Changed\nReviewed body.\n");
  const oldId = preview.id; f.changes.draftChanged(preview.id); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /preview changed/);
  await f.changes.revise(preview.id, ["# Revised\nExact reviewed revision.\n"], f.info.revision);
  await assert.rejects(f.changes.confirm(oldId, f.info.revision), /preview changed/);
  pending = f.changes.snapshot(f.info.revision).pending!; preview = await f.changes.preview("apply", pending.id, f.info.revision); await f.changes.confirm(preview.id, f.info.revision);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), preview.operations[0]!.after);
  const applied = f.changes.snapshot(f.info.revision).history[0]!; const undo = await f.changes.preview("undo", applied.id, f.info.revision);
  await writeFile(join(f.vault, f.path), "Later user work"); await assert.rejects(f.changes.confirm(undo.id, f.info.revision), /changed/);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), "Later user work");
  await writeFile(join(f.vault, f.path), preview.operations[0]!.after!); const renewed = await f.changes.preview("undo", applied.id, f.info.revision); await f.changes.confirm(renewed.id, f.info.revision);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before); assert.equal(f.changes.snapshot(f.info.revision).history[0]!.status, "undone");
});

test("stale supporting evidence, target identity and read revocation cannot authorize writes", async t => {
  const f = await fixture(t);
  await f.changes.propose([{ path: f.path, before: f.before, after: "reviewed" }], [{ path: "Projects/Source.md", hash: hashText("Current source") }], f.info.revision);
  let pending = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", pending.id, f.info.revision);
  await writeFile(join(f.vault, "Projects/Source.md"), "Changed source"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /stale/);
  assert.equal(f.changes.snapshot(f.info.revision).pending!.status, "stale"); assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before);
  await f.changes.reject(pending.id, f.info.revision);
  await f.changes.propose([{ path: f.path, before: f.before, after: "reviewed" }], [], f.info.revision);
  pending = f.changes.snapshot(f.info.revision).pending!; preview = await f.changes.preview("apply", pending.id, f.info.revision);
  await rename(join(f.vault, f.path), join(f.vault, "Projects/Preserved.md")); await writeFile(join(f.vault, f.path), f.before);
  await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /identity|changed/);
  f.info = f.reader.grant({ roots: [], excluded: [] }, f.info.revision); await f.storage.release();
  assert.equal(f.changes.snapshot(f.info.revision).pending!.available, false);
  assert.ok(!JSON.stringify(f.changes.snapshot(f.info.revision)).includes(f.path));
  await assert.rejects(f.changes.preview("apply", pending.id, f.info.revision));
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before);
});

test("late edit preparation cannot restore a revoked draft and protected provenance stays intact", async t => {
  const f = await fixture(t), marked = "---\nid: kept\n---\nBody\n<!-- thread:output protected -->\n";
  await writeFile(join(f.vault, f.path), marked); const note = await f.reader.read(f.path, f.info.revision), edit = await f.changes.beginEdit(f.path, note.stamp, f.info.revision);
  await assert.rejects(f.changes.proposeEdit(edit.id, "removed provenance", f.info.revision), /provenance/);
  const original = VaultWriter.prototype.inspect; let enter!: () => void, resume!: () => void;
  const started = new Promise<void>(resolve => { enter = resolve; }), gate = new Promise<void>(resolve => { resume = resolve; });
  VaultWriter.prototype.inspect = async function (...args) { enter(); await gate; return original.apply(this, args); };
  try {
    const pending = f.changes.proposeEdit(edit.id, "Reviewed\n<!-- thread:output protected -->\n", f.info.revision);
    await started; f.changes.invalidate(); resume(); await assert.rejects(pending, /draft changed/);
  } finally { VaultWriter.prototype.inspect = original; }
  assert.equal(f.changes.snapshot(f.info.revision).pending, null); assert.equal(await readFile(join(f.vault, f.path), "utf8"), marked);
});

test("pending changes block ordinary saves and pending save receipts block change operations", async t => {
  const f = await fixture(t); await f.changes.propose([{ path: f.path, before: f.before, after: "reviewed" }], [], f.info.revision);
  await assert.rejects(f.storage.owned(f.info.revision, async () => "must not run"), /unfinished changes/);
  await f.changes.reject(f.changes.snapshot(f.info.revision).pending!.id, f.info.revision);
  await f.storage.owned(f.info.revision, async (profile, current) => { await profile.store({ ...profile.state, saves: [{ id: "unfinished", path: "Projects/New.md", content: "intended", hash: hashText("intended"), createdAt: new Date().toISOString(), status: "pending" }] }, current); });
  await assert.rejects(f.changes.propose([{ path: f.path, before: f.before, after: "reviewed" }], [], f.info.revision), /unfinished saves/);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before);
});

test("reviewed create batches refuse collisions and undo only their unchanged created notes", async t => {
  const f = await fixture(t), path = "Projects/Created.md";
  await f.changes.propose([{ path, before: null, after: "exact new content" }], [], f.info.revision);
  const pending = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", pending.id, f.info.revision);
  await writeFile(join(f.vault, path), "foreign note"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed/);
  assert.equal(await readFile(join(f.vault, path), "utf8"), "foreign note"); await f.changes.reject(pending.id, f.info.revision);
  const second = "Projects/Distinct.md"; await f.changes.propose([{ path: second, before: null, after: "reviewed new" }], [], f.info.revision);
  const create = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); await f.changes.confirm(create.id, f.info.revision);
  assert.equal(await readFile(join(f.vault, second), "utf8"), "reviewed new");
  const batch = f.changes.snapshot(f.info.revision).history[0]!, undo = await f.changes.preview("undo", batch.id, f.info.revision);
  await f.changes.confirm(undo.id, f.info.revision); await assert.rejects(readFile(join(f.vault, second)), { code: "ENOENT" });
  assert.equal(await readFile(join(f.vault, path), "utf8"), "foreign note");
});

test("bounded multi-note failure rolls back completed writes and preserves a concurrent edit", async t => {
  const f = await fixture(t), second = "Projects/Second.md"; await writeFile(join(f.vault, second), "second original");
  await f.changes.propose([{ path: f.path, before: f.before, after: "first changed" }, { path: second, before: "second original", after: "second changed" }], [], f.info.revision);
  const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision);
  const original = VaultWriter.prototype.replace;
  VaultWriter.prototype.replace = async function (path, ...args) {
    if (path === second) { await writeFile(join(f.vault, second), "external during apply"); throw Error("controlled concurrent edit"); }
    return original.call(this, path, ...args);
  };
  try { await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /Recovery required/); }
  finally { VaultWriter.prototype.replace = original; }
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before); assert.equal(await readFile(join(f.vault, second), "utf8"), "external during apply");
  assert.ok(f.changes.snapshot(f.info.revision).recovery);
  await f.storage.close(); const reopened = new DesktopStorage(f.reader, f.profile); t.after(() => reopened.close()); await reopened.initialize(f.info.revision);
  const changes = new DesktopChanges(f.reader, reopened); const recovery = changes.snapshot(f.info.revision).recovery!;
  assert.ok(recovery); const conflicting = await changes.preview("recover", recovery.id, f.info.revision); assert.equal(conflicting.ready, false);
  await assert.rejects(changes.confirm(conflicting.id, f.info.revision), /preview changed/);
  const compatible = await reopened.inspect(".obsidian", f.info.revision); await reopened.enable(compatible.id, f.info.revision);
  // Simulate the user explicitly restoring their conflicted note to its original;
  // recovery then only reconciles its durable record, without removing newer work.
  await writeFile(join(f.vault, second), "second original");
  const renewed = await changes.preview("recover", recovery.id, f.info.revision); assert.equal(renewed.ready, true); await changes.confirm(renewed.id, f.info.revision);
  assert.equal(changes.snapshot(f.info.revision).recovery, null); assert.equal(changes.snapshot(f.info.revision).pending!.status, "stale");
  assert.equal(await readFile(join(f.vault, second), "utf8"), "second original");
});

test("explicit recovery restores a known applied write after interruption and keeps originals", async t => {
  const f = await fixture(t); await f.changes.propose([{ path: f.path, before: f.before, after: "after" }], [], f.info.revision);
  const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision), original = VaultWriter.prototype.replace;
  VaultWriter.prototype.replace = async function (path, ...args) { await original.call(this, path, ...args); f.changes.invalidate(); throw Error("controlled interruption after write"); };
  try { await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /recovery|backups/); } finally { VaultWriter.prototype.replace = original; }
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), "after"); assert.ok(f.storage.changeState(f.info.revision).recovery);
  const recovery = await f.changes.preview("recover", f.changes.snapshot(f.info.revision).recovery!.id, f.info.revision); await f.changes.confirm(recovery.id, f.info.revision);
  assert.equal(await readFile(join(f.vault, f.path), "utf8"), f.before); assert.equal(f.changes.snapshot(f.info.revision).recovery, null);
});

test("guarded review contexts survive restart, refuse newly appearing notes and retain guarded Undo", async t => {
  const f = await fixture(t), target = "Projects/Review.md", inputs = [{ path: target, before: null, after: "Explicit reviewed snapshot" }];
  await assert.rejects(f.changes.propose(inputs, [], f.info.revision, "invalid"), /saved review/); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  const catalog = catalogFingerprint(await f.reader.list(f.info.revision), [target]); await f.changes.propose(inputs, [], f.info.revision, catalog);
  const context = JSON.parse(f.storage.changeState(f.info.revision).pending!.context); assert.equal(context.schemaVersion, 2); assert.equal(context.catalog, catalog);
  await f.storage.close();
  const reader = new VaultReader(); let info = await reader.select(f.vault); assert.deepEqual(info.scope.roots, []); info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  const storage = new DesktopStorage(reader, f.profile); await storage.initialize(info.revision); const inspected = await storage.inspect(".obsidian", info.revision); await storage.enable(inspected.id, info.revision);
  t.after(() => storage.close()); const changes = new DesktopChanges(reader, storage), pending = changes.snapshot(info.revision).pending!;
  assert.equal((await changes.preview("apply", pending.id, info.revision)).ready, true);
  await writeFile(join(f.vault, "Projects/New dependency.md"), "A previously absent dependency"); assert.equal((await changes.preview("apply", pending.id, info.revision)).ready, false); await assert.rejects(readFile(join(f.vault, target)), { code: "ENOENT" });
  await changes.reject(pending.id, info.revision); await changes.propose(inputs, [], info.revision, catalogFingerprint(await reader.list(info.revision), [target]));
  const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); await changes.confirm(preview.id, info.revision); assert.equal(await readFile(join(f.vault, target), "utf8"), inputs[0]!.after);
  await writeFile(join(f.vault, "Projects/New dependency.md"), "Changed after the reviewed write"); const batch = changes.snapshot(info.revision).history.at(-1)!, undo = await changes.preview("undo", batch.id, info.revision); await changes.confirm(undo.id, info.revision);
  await assert.rejects(readFile(join(f.vault, target)), { code: "ENOENT" }); assert.equal(await readFile(join(f.vault, "Projects/New dependency.md"), "utf8"), "Changed after the reviewed write");
});
