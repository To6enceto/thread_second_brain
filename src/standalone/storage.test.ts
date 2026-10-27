import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesktopStorage } from "./storage.ts";
import { VaultReader } from "./vault-reader.ts";
import { WriterOwnership } from "../local/writer-ownership.ts";
import { defaultSettings } from "../settings/settings.ts";
import { hashText } from "./profile.ts";
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-storage-")), vault = join(root, "vault"), profile = join(root, "profile"), plugin = join(vault, ".obsidian/plugins/thread");
  await mkdir(plugin, { recursive: true }); await mkdir(profile); await mkdir(join(vault, "Projects")); await writeFile(join(vault, "Projects/Original.md"), "PRESERVE ORIGINAL");
  const settings = { ...defaultSettings(), model: "qwen3:4b-instruct", allowedPaths: ["."], pdfPaths: ["Private.pdf"] }; settings.roles.projects = "Projects";
  const changes = { schemaVersion: 1, pending: null, history: [], recovery: null };
  const files = { "manifest.json": JSON.stringify({ id: "thread", version: "0.4.2", isDesktopOnly: true }), "data.json": JSON.stringify(settings), "changes.json": JSON.stringify(changes), "project-imports.json": JSON.stringify({ schemaVersion: 1, receipts: [] }) };
  for (const [name, content] of Object.entries(files)) await writeFile(join(plugin, name), content);
  const reader = new VaultReader(); const info = await reader.select(vault); const storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision);
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  return { root, vault, profile, plugin, reader, info, storage, files };
}

test("explicit compatibility, ownership and history copy never inherit plugin read/PDF grants or mutate journals", async t => {
  const f = await fixture(t); await assert.rejects(f.storage.enable("forged", f.info.revision), /out of date/);
  const before = f.reader.getInfo(); const preview = await f.storage.inspect(".obsidian", f.info.revision);
  assert.equal(preview.compatible, true); assert.equal(preview.preferences.model, "qwen3:4b-instruct");
  assert.ok(!("allowedPaths" in preview.preferences)); assert.ok(!("pdfPaths" in preview.preferences));
  const enabled = await f.storage.enable(preview.id, f.info.revision); assert.equal(enabled.writing, true);
  const copied = await f.storage.importCopy(preview.id, f.info.revision); assert.equal(copied.importedCopies, 1); assert.equal(copied.preferences.roles.projects, "Projects");
  assert.deepEqual(f.reader.getInfo(), before); for (const [name, raw] of Object.entries(f.files)) assert.equal(await readFile(join(f.plugin, name), "utf8"), raw);
  assert.equal(await readFile(join(f.vault, "Projects/Original.md"), "utf8"), "PRESERVE ORIGINAL");
  await f.storage.close(); const reopened = new DesktopStorage(f.reader, f.profile); t.after(() => reopened.close());
  const state = await reopened.initialize(f.info.revision); assert.equal(state.writing, false); assert.equal(state.importedCopies, 1); assert.equal(state.preferences.model, "qwen3:4b-instruct"); assert.deepEqual(f.reader.getInfo()!.scope.roots, []);
});

test("legacy or pending plugin recovery, changed metadata and competing writers block desktop writing", async t => {
  const f = await fixture(t);
  await writeFile(join(f.plugin, "manifest.json"), JSON.stringify({ id: "thread", version: "0.4.1", isDesktopOnly: true }));
  const legacy = await f.storage.inspect(".obsidian", f.info.revision); assert.equal(legacy.compatible, false); await assert.rejects(f.storage.enable(legacy.id, f.info.revision), /0.4.2/);
  await writeFile(join(f.plugin, "manifest.json"), f.files["manifest.json"]);
  const pending = { id: "p", createdAt: new Date().toISOString(), context: "", status: "pending", operations: [{ path: "Projects/Planned.md", before: null, beforeHash: null, after: "draft", afterHash: hashText("draft") }] };
  const raw = JSON.stringify({ schemaVersion: 1, pending, recovery: { batch: pending, action: "apply", paths: ["Projects/Planned.md"] }, history: [] });
  await writeFile(join(f.plugin, "changes.json"), raw);
  const blocked = await f.storage.inspect(".obsidian", f.info.revision); assert.equal(blocked.compatible, false); await assert.rejects(f.storage.enable(blocked.id, f.info.revision), /unfinished changes/); assert.equal(await readFile(join(f.plugin, "changes.json"), "utf8"), raw);
  await writeFile(join(f.plugin, "changes.json"), f.files["changes.json"]);
  const ready = await f.storage.inspect(".obsidian", f.info.revision), owner = await WriterOwnership.acquire(await f.reader.identity(f.info.revision));
  await assert.rejects(f.storage.enable(ready.id, f.info.revision), /Another Thread writer/); await owner.release();
  await writeFile(join(f.plugin, "data.json"), JSON.stringify(defaultSettings()));
  await assert.rejects(f.storage.enable(ready.id, f.info.revision), /files changed/);
  assert.equal(f.storage.status(f.info.revision).writing, false);
});

test("metadata consent bounds paths, refuses links and unknown history, and grant changes revoke ownership operations", async t => {
  const f = await fixture(t);
  for (const folder of ["../other", ".", "", "nested/.obsidian", [".obsidian"]]) await assert.rejects(f.storage.inspect(folder, f.info.revision));
  await writeFile(join(f.plugin, "changes.json"), '{"schemaVersion":2}'); await assert.rejects(f.storage.inspect(".obsidian", f.info.revision), /could not be understood/);
  await rm(join(f.plugin, "changes.json")); await symlink(join(f.vault, "Projects/Original.md"), join(f.plugin, "changes.json")); await assert.rejects(f.storage.inspect(".obsidian", f.info.revision), /link/);
  await rm(join(f.plugin, "changes.json")); await writeFile(join(f.plugin, "changes.json"), f.files["changes.json"]);
  const preview = await f.storage.inspect(".obsidian", f.info.revision); await f.storage.enable(preview.id, f.info.revision);
  let resume!: () => void; const wait = new Promise<void>(resolve => { resume = resolve; }); let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
  const operation = f.storage.owned(f.info.revision, async (_profile, current) => { entered(); await wait; current(); });
  await started; f.reader.grant({ roots: [], excluded: [] }, f.info.revision); const release = f.storage.release(); resume();
  await assert.rejects(operation, /folder changed/); await release;
  const owner = await WriterOwnership.acquire(await f.reader.identity(f.reader.getInfo()!.revision)); await owner.release();
  assert.equal(await readFile(join(f.vault, "Projects/Original.md"), "utf8"), "PRESERVE ORIGINAL");
});

test("releasing writing invalidates delayed compatibility and enable operations", async t => {
  for (const phase of ["inspect", "enable"] as const) {
    const f = await fixture(t), preview = await f.storage.inspect(".obsidian", f.info.revision);
    const read = f.reader.pluginFiles.bind(f.reader); let enter!: () => void, resume!: () => void;
    const started = new Promise<void>(resolve => { enter = resolve; }), gate = new Promise<void>(resolve => { resume = resolve; });
    f.reader.pluginFiles = async (...args) => { enter(); await gate; return read(...args); };
    const pending = phase === "inspect" ? f.storage.inspect(".obsidian", f.info.revision) : f.storage.enable(preview.id, f.info.revision);
    await started; await f.storage.release(); resume(); await assert.rejects(pending, /changed|out of date/);
    assert.equal(f.storage.status(f.info.revision).writing, false);
    const owner = await WriterOwnership.acquire(await f.reader.identity(f.info.revision)); await owner.release();
  }
});
