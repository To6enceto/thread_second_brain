import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChangeJournal, changeState, emptyChanges } from "./change-journal.ts";
import { DesktopProfile, freshProfile, hashText } from "./profile.ts";

test("separate change originals and recovery survive restart without migrating existing desktop state", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-change-journal-")), identity = "c".repeat(64);
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = new DesktopProfile(root, identity); await profile.load(); await profile.store(freshProfile());
  const path = join(root, "thread-v1", `vault-${identity}.json`), original = await readFile(path, "utf8");
  const journal = new ChangeJournal(root, identity); const state = await journal.load();
  state.pending = { id: "proposal", createdAt: new Date().toISOString(), context: "", status: "pending", operations: [{ path: "Projects/Note.md", before: "original", after: "reviewed", beforeHash: hashText("original"), afterHash: hashText("reviewed") }] };
  const { status: _status, ...batch } = state.pending;
  state.recovery = { batch, action: "apply", paths: ["Projects/Note.md"] };
  await journal.store(state);
  const reopened = new ChangeJournal(root, identity); assert.deepEqual(await reopened.load(), state);
  assert.equal(await readFile(path, "utf8"), original);
  const journalPath = join(root, "thread-v1", `changes-${identity}.json`);
  await writeFile(journalPath, '{"schemaVersion":99,"personal":"preserve"}');
  await assert.rejects(reopened.store(emptyChanges()), /changed in another process/);
  await assert.rejects(reopened.load(), /invalid or unavailable/);
  await assert.rejects(reopened.store(emptyChanges()), /unavailable/);
  assert.equal(await readFile(journalPath, "utf8"), '{"schemaVersion":99,"personal":"preserve"}');
});

test("change journal rejects unknown versions, coercible enums and mismatched durable originals", async () => {
  for (const state of [{ ...emptyChanges(), unknown: true }, { ...emptyChanges(), schemaVersion: 2 }, { ...emptyChanges(), recovery: { action: ["undo"] } }, { ...emptyChanges(), pending: { status: ["pending"] } }]) await assert.rejects(changeState(state));
  const operation = { path: "Projects/Note.md", before: "original", after: "after", beforeHash: hashText("different"), afterHash: hashText("after") };
  await assert.rejects(changeState({ ...emptyChanges(), pending: { id: "p", createdAt: "now", status: "pending", context: "", operations: [operation] } }), /hashes/);
});
