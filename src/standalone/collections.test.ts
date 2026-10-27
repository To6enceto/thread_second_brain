import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopAsk } from "./ask.ts";
import { DesktopCollections } from "./collections.ts";
import { metadata, parseMetadata } from "./metadata.ts";
import { readCollection, collectionMarkdown, validateCollection, type CollectionRecord } from "../vault/collection-record.ts";
import { indexNote } from "../vault/index.ts";
import { hashText } from "./profile.ts";
import type { AskRequest } from "./contracts.ts";
const selection = { folder: "Projects", project: "Projects/Demo" };
const request: AskRequest = { selection, scope: "project", question: "research", method: "keyword", level: "standard", filters: {}, embeddingModel: "" };
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-collections-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const path of ["Projects/Demo", "Knowledge", "Sources", "Private", "Projects/Other"]) await mkdir(join(vault, path), { recursive: true }); await mkdir(profile);
  const notes = { "Projects/Demo/Overview.md": '---\ntype: project\nid: demo\n---\n## Objective\nResearch with local evidence.', "Sources/A.md": '---\nid: a\ntype: source\nproject: demo\n---\n## Limits\nResearch ALPHA_CANARY budget is 20 euros.', "Sources/B.md": '---\nid: b\ntype: source\nproject: demo\n---\n## Limits\nResearch BETA_CANARY voice is postponed.', "Projects/Other/Overview.md": '---\ntype: project\nid: other\n---\nOther project', "Private/Secret.md": 'PRIVATE_CANARY' };
  for (const [path, text] of Object.entries(notes)) await writeFile(join(vault, path), text);
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Knowledge", "Sources"], excluded: ["Private"] }, info.revision);
  const evidence = new EvidenceIndex(reader), projects = new DesktopProjects(reader, evidence), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision); const compat = await storage.inspect(".obsidian", info.revision); await storage.enable(compat.id, info.revision); const prefs = storage.status(info.revision).preferences; Object.assign(prefs.roles, { projects: "Projects", sources: "Sources", knowledge: "Knowledge" }); await storage.savePreferences(prefs, info.revision);
  const calls: string[] = [], ai = new DesktopAI(projects, evidence, async input => { calls.push(String(input)); throw Error("No model call expected"); }), ask = new DesktopAsk(reader, evidence, projects, ai), changes = new DesktopChanges(reader, storage), collections = new DesktopCollections(reader, evidence, projects, storage, changes, ask);
  const read = (path: string) => readFile(join(vault, path), "utf8"), put = (path: string, raw: string) => writeFile(join(vault, path), raw);
  const apply = async () => { const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  const saved = async (scope: "project" | "vault" = "project") => { const result = await ask.retrieve({ ...request, scope }, info.revision); const choices = Object.fromEntries(result.bundle.sources.map(source => [source.id, source.path === "Sources/B.md" ? "exclude" : "pin"])); await ask.choose(result.id, choices, info.revision); await collections.saveAsk(result.id, "Research", info.revision); await apply(); return { result, choices, path: scope === "project" ? "Projects/Demo/Collections/Research.md" : "Knowledge/Collections/Research.md" }; };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); }); return { root, vault, reader, evidence, projects, storage, changes, ai, ask, collections, info, read, put, apply, saved, notes, calls };
}
test("Ask collections save retained references and choices through exact review and reopen without inference", async t => {
  const f = await fixture(t), { path, result } = await f.saved(), raw = await f.read(path), record = readCollection(raw, metadata(raw)); assert.equal(record.scope, "project"); assert.equal(record.projectIdentity, "demo"); assert.ok(record.items.some(item => item.choice === "exclude")); assert.ok(!/ALPHA_CANARY|BETA_CANARY|"excerpt"/.test(raw));
  const list = await f.collections.load(selection, "project", f.info.revision), review = await f.collections.open(list.id, path, f.info.revision); assert.ok(review.rows.every(row => row.state === "current")); assert.equal(f.calls.length, 0);
  // Renderer copies are never trusted back as evidence.
  review.rows[0]!.source!.excerpt = "FORGED_RENDERER"; result.bundle.sources[0]!.excerpt = "FORGED_ASK";
  const reused = await f.collections.reuse(list.id, review.id, { choices: {}, confirmed: [] }, "What is the research budget?", f.info.revision); assert.ok(reused.context.bundle.sources.some(s => s.path === "Sources/A.md")); assert.ok(!JSON.stringify(reused.context).includes("BETA_CANARY")); assert.ok(!JSON.stringify(reused).includes("FORGED")); assert.equal(reused.context.bundle.noteHashes[path], hashText(raw)); assert.equal(f.calls.length, 0);
  await assert.rejects(f.ask.generate(reused.context.id, f.info.revision), /downloaded text model/); assert.equal(f.calls.length, 0);
  await f.collections.saveEdited(list.id, review.id, { choices: { "1": "exclude" }, confirmed: [] }, "Edited copy", f.info.revision); const preview = await f.apply(); assert.equal(await f.read("Projects/Demo/Collections/Edited copy.md"), preview.operations[0]!.after); assert.equal(await f.read(path), raw);
  const next = await f.collections.load(selection, "project", f.info.revision), opened = await f.collections.open(next.id, path, f.info.revision); await assert.rejects(f.collections.saveEdited(next.id, opened.id, { choices: {}, confirmed: [] }, "Research", f.info.revision), /changed|Target/); assert.equal(await f.read(path), raw);
});
test("changed references require reconfirmation, excluded references are redacted and renamed references resolve by identity", async t => {
  const f = await fixture(t), { path } = await f.saved(); await f.put("Sources/A.md", f.notes["Sources/A.md"].replace("20 euros", "CURRENT_CANARY 40 euros")); await rename(join(f.vault, "Sources/B.md"), join(f.vault, "Sources/Renamed.md"));
  let list = await f.collections.load(selection, "project", f.info.revision), review = await f.collections.open(list.id, path, f.info.revision); const changed = review.rows.find(row => row.state === "changed")!, renamed = review.rows.find(row => row.state === "renamed")!; assert.ok(changed && renamed); assert.equal(renamed.source!.path, "Sources/Renamed.md");
  let reused = await f.collections.reuse(list.id, review.id, { choices: {}, confirmed: [] }, "Research?", f.info.revision); assert.ok(!JSON.stringify(reused.context).includes("CURRENT_CANARY"));
  reused = await f.collections.reuse(list.id, review.id, { choices: { [String(changed.number)]: "pin" }, confirmed: [changed.number] }, "Research?", f.info.revision); assert.match(JSON.stringify(reused.context), /CURRENT_CANARY/);
  for (const input of [{ choices: { "99": "pin" }, confirmed: [] }, { choices: { "1": ["pin"] }, confirmed: [] }, { choices: {}, confirmed: [changed.number, changed.number] }, { choices: {}, confirmed: [renamed.number] }]) await assert.rejects(f.collections.reuse(list.id, review.id, input, "Research?", f.info.revision));
  const revoked = f.reader.grant({ roots: ["Projects", "Knowledge", "Sources"], excluded: ["Private", "Sources/A.md"] }, f.info.revision); f.evidence.reset(); f.ask.forget(); f.collections.invalidate();
  list = await f.collections.load(selection, "project", revoked.revision); review = await f.collections.open(list.id, path, revoked.revision); const unavailable = review.rows.find(row => row.number === changed.number)!; assert.deepEqual(unavailable, { number: changed.number, choice: "pin", state: "unavailable" }); assert.ok(!JSON.stringify(review).includes("Sources/A.md") && !JSON.stringify(review).includes("ALPHA_CANARY") && !JSON.stringify(review).includes("CURRENT_CANARY"));
});
test("collection identity and selected scope never expand authority and current changes invalidate reuse and saves", async t => {
  const f = await fixture(t), { path } = await f.saved(); assert.equal((await f.collections.load(selection, "allowed", f.info.revision)).items.length, 0); assert.equal((await f.collections.load({ folder: "Projects", project: "Projects/Other" }, "project", f.info.revision)).items.length, 0);
  const list = await f.collections.load(selection, "project", f.info.revision), review = await f.collections.open(list.id, path, f.info.revision);
  const stale = f.collections.reuse(list.id, review.id, { choices: {}, confirmed: [] }, "Research?", f.info.revision), canceled = assert.rejects(stale, /changed|canceled/); f.collections.draftChanged(); await canceled;
  const reused = await f.collections.reuse(list.id, review.id, { choices: {}, confirmed: [] }, "Research?", f.info.revision); await f.put(path, (await f.read(path)) + "External edit"); await assert.rejects(f.ask.choose(reused.snapshot.id, {}, f.info.revision), /changed|Refresh/); await assert.rejects(f.collections.saveEdited(list.id, review.id, { choices: {}, confirmed: [] }, "Stale copy", f.info.revision), /changed|Refresh/); await assert.rejects(f.read("Projects/Demo/Collections/Stale copy.md"), { code: "ENOENT" });
  await f.put("Projects/Demo/Overview.md", f.notes["Projects/Demo/Overview.md"].replace("id: demo", "id: replacement")); assert.equal((await f.collections.load(selection, "project", f.info.revision)).items.length, 0);
});
test("all-permitted collection destinations stay mapped and retained Ask choice changes cancel a pending save", async t => {
  const f = await fixture(t), { path } = await f.saved("vault"); assert.equal(readCollection(await f.read(path), metadata(await f.read(path))).scope, "allowed"); const list = await f.collections.load(selection, "allowed", f.info.revision); assert.equal(list.items[0]!.path, path);
  const result = await f.ask.retrieve(request, f.info.revision); await f.ask.choose(result.id, {}, f.info.revision); const pending = f.collections.saveAsk(result.id, "Late", f.info.revision), rejected = assert.rejects(pending, /changed/); f.ask.forget(); await rejected; assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  const current = await f.ask.retrieve(request, f.info.revision); await f.ask.choose(current.id, {}, f.info.revision); await f.collections.saveAsk(current.id, "Fresh", f.info.revision); const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); await f.put("Sources/New.md", "New catalog entry"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed|stale|conflict/i); await assert.rejects(f.read("Projects/Demo/Collections/Fresh.md"), { code: "ENOENT" });
});
test("standalone parses large valid collection records through shared round-trip and index contracts, retaining ordinary metadata limits", async () => {
  const record: CollectionRecord = { schemaVersion: 1, id: "11223344-5566-4788-9900-aabbccddeeff", title: "Bounded", createdAt: "2026-10-22T12:00:00.000Z", scope: "allowed", projectPath: "", projectIdentity: "", items: Array.from({ length: 50 }, (_, i) => ({ choice: "pin", locator: { chunk: 0, offset: 0, length: 1 }, source: { path: `Sources/${i}.md`, heading: '"'.repeat(1800), noteHash: "a".repeat(64), hash: "b".repeat(64) } })) };
  // Maximize a valid record near its shared 128 KiB limit, including YAML escaping.
  for (const item of record.items) item.source.heading = "h".repeat(2200);
  const raw = collectionMarkdown(record); assert.ok(raw.length > 65536); assert.ok(Buffer.byteLength(JSON.stringify(record)) <= 131072); const fields = metadata(raw); assert.deepEqual(readCollection(raw, fields), record); assert.deepEqual(readCollection(raw.replace(/\n/g, "\r\n"), metadata(raw.replace(/\n/g, "\r\n"))), record);
  const indexed = await indexNote({ path: "Knowledge/Collections/Bounded.md", text: raw, metadata: fields, modifiedAt: 1 }, () => null); assert.equal(indexed.output?.invalid, false); assert.deepEqual(indexed.chunks, []);
  assert.throws(() => parseMetadata('ordinary: ' + 'x'.repeat(66000)), /64 KiB/); const wrongVersion = raw.replace('thread_collection_version: "1"', 'thread_collection_version: "2"'); assert.notEqual(wrongVersion, raw); assert.throws(() => metadata(wrongVersion)); assert.throws(() => metadata(raw.replace(/\n---\n/, '\nextra: ' + 'x'.repeat(66000) + '\n---\n')));
  const oversized = structuredClone(record); for (const item of oversized.items) item.source.heading = "x".repeat(3000); assert.throws(() => validateCollection(oversized), /128 KiB/);
});
