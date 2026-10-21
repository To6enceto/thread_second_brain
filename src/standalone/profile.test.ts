import { renameSync, mkdirSync } from "node:fs";
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, mkdir, symlink, link, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesktopProfile, freshProfile, hashText, preferences, profileState, type SaveReceipt } from "./profile.ts";
const identity = "a".repeat(64);
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-profile-")); t.after(() => rm(root, { recursive: true, force: true }));
  return { root, path: join(root, "thread-v1", `vault-${identity}.json`), profile: new DesktopProfile(root, identity) };
}
const receipt = (): SaveReceipt => ({ id: "save1", path: "Projects/A/Answers/Test.md", content: "Original provenance", hash: hashText("Original provenance"), createdAt: "2026-10-22T00:00:00.000Z", status: "pending" });

test("versioned desktop preferences and unresolved receipts survive restart without granting access", async t => {
  const f = await fixture(t), state = await f.profile.load();
  state.preferences.model = "qwen3:4b-instruct"; state.preferences.roles.projects = "Projects"; state.saves.push(receipt());
  await f.profile.store(state);
  const reopened = new DesktopProfile(f.root, identity); const loaded = await reopened.load();
  assert.deepEqual(loaded, state); assert.equal(loaded.saves[0]!.status, "pending");
  loaded.saves[0]!.content = "renderer mutation"; assert.equal(reopened.state.saves[0]!.content, "Original provenance");
  assert.ok(!("allowedPaths" in loaded.preferences)); assert.ok(!("pdfPaths" in loaded.preferences));
  for (const patch of [{ schemaVersion: 2 }, { grants: ["."] }, { saves: [{ ...receipt(), hash: "forged" }] }]) await assert.rejects(f.profile.store({ ...state, ...patch } as typeof state));
  assert.deepEqual(JSON.parse(await readFile(f.path, "utf8")), state);
});

test("corrupt/unknown profile and externally replaced history are preserved and block writes", async t => {
  const f = await fixture(t); await f.profile.load(); await f.profile.store(freshProfile());
  await writeFile(f.path, "unfinished personal state");
  await assert.rejects(f.profile.store(freshProfile()), /changed in another process/);
  await assert.rejects(f.profile.load(), /invalid or unavailable/);
  await assert.rejects(f.profile.store(freshProfile()), /unavailable/);
  assert.equal(await readFile(f.path, "utf8"), "unfinished personal state");
  await writeFile(f.path, JSON.stringify({ ...freshProfile(), schemaVersion: 9 })); await assert.rejects(f.profile.load());
  assert.equal(JSON.parse(await readFile(f.path, "utf8")).schemaVersion, 9);
  assert.deepEqual((await readdir(join(f.root, "thread-v1"))).filter(name => name.startsWith(".state-")), []);
});

test("profile rejects symlink directories/files, hard links and canceled commits without touching the destination", async t => {
  const f = await fixture(t); const elsewhere = join(f.root, "elsewhere"); await mkdir(elsewhere, { mode: 0o700 });
  await symlink(elsewhere, join(f.root, "thread-v1")); await assert.rejects(f.profile.load()); assert.deepEqual(await readdir(elsewhere), []);
  await rm(join(f.root, "thread-v1")); await f.profile.load();
  const target = join(elsewhere, "target"); await writeFile(target, "PRESERVE"); await symlink(target, f.path); await assert.rejects(f.profile.load()); assert.equal(await readFile(target, "utf8"), "PRESERVE");
  await rm(f.path); await link(target, f.path); await assert.rejects(f.profile.load()); assert.equal(await readFile(target, "utf8"), "PRESERVE");
  await rm(f.path); await f.profile.load(); await f.profile.store(freshProfile()); const before = await readFile(f.path, "utf8");
  let checks = 0; const changed = freshProfile(); changed.preferences.model = "changed";
  await assert.rejects(f.profile.store(changed, () => { if (++checks >= 2) throw Error("revoked"); }), /revoked/);
  assert.equal(await readFile(f.path, "utf8"), before);
});

test("profile state has finite validated storage, local preferences and immutable history-copy hashes", () => {
  for (const patch of [{ endpoint: "https://example.com" }, { model: "bad:cloud" }, { roles: { ...freshProfile().preferences.roles, projects: "../Private" } }, { allowedPaths: ["."] }]) assert.throws(() => preferences({ ...freshProfile().preferences, ...patch }));
  const state = freshProfile(); state.saves = Array.from({ length: 21 }, (_, i) => ({ ...receipt(), id: `save${i}` })); assert.throws(() => profileState(state), /full/);
  state.saves = [{ ...receipt(), content: "a".repeat(1048577) }]; assert.throws(() => profileState(state));
  state.saves = []; state.imports = [{ id: "copy", importedAt: receipt().createdAt, content: "[]", hash: hashText("[]") }];
  assert.deepEqual(profileState(state), state); state.imports[0]!.content = "changed"; assert.throws(() => profileState(state));
});


test("profile directory replacement during a prepared commit fails closed", async t => {
  const f = await fixture(t); await f.profile.load(); await f.profile.store(freshProfile()); let checks = 0;
  const next = freshProfile(); next.preferences.model = "replacement";
  await assert.rejects(f.profile.store(next, () => {
    if (++checks === 2) { renameSync(join(f.root, "thread-v1"), join(f.root, "preserved")); mkdirSync(join(f.root, "thread-v1"), { mode: 0o700 }); }
  }), /directory changed/);
  assert.deepEqual(await readdir(join(f.root, "thread-v1")), []);
  assert.deepEqual(JSON.parse(await readFile(join(f.root, "preserved", `vault-${identity}.json`), "utf8")), freshProfile());
});
