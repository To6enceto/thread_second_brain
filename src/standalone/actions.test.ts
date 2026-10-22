import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopRecords } from "./records.ts";
import { frontmatter, localDay } from "../vault/workspace.ts";
import { actionMarkdown, newAction, readAction, transitionAction, type ActionState } from "../vault/action-record.ts";
import { metadata } from "./metadata.ts";

const day = localDay();
async function fixture(t: TestContext, fetcher: typeof fetch = async () => { throw Error("Manual actions must not call a model"); }) {
  const root = await mkdtemp(join(tmpdir(), "thread-actions-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const folder of ["Projects/Demo", "Sources", "Private"]) await mkdir(join(vault, folder), { recursive: true }); await mkdir(profile);
  const put = (path: string, text: string) => writeFile(join(vault, path), text), read = (path: string) => readFile(join(vault, path), "utf8");
  await put("Projects/Demo/Overview.md", frontmatter({ type: "project", id: "demo" }) + "## Objective\nCompare local models.\n");
  await put("Sources/Research.md", "## Method\nCompare citations against original passages.\n"); await put("Private/Secret.md", "Private example");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Sources"], excluded: ["Private"] }, info.revision);
  const index = new EvidenceIndex(reader), projects = new DesktopProjects(reader, index), storage = new DesktopStorage(reader, profile), changes = new DesktopChanges(reader, storage);
  await storage.initialize(info.revision); const compatibility = await storage.inspect(".obsidian", info.revision); await storage.enable(compatibility.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.projects = "Projects"; await storage.savePreferences(preferences, info.revision);
  const ai = new DesktopAI(projects, index, fetcher), records = new DesktopRecords(reader, index, projects, storage, changes, ai), selection = { folder: "Projects", project: "Projects/Demo" };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  const load = () => records.loadActions(selection, info.revision), apply = async () => { const pending = changes.snapshot(info.revision).pending!; const preview = await changes.preview("apply", pending.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  return { reader, info, index, projects, storage, changes, ai, records, selection, put, read, load, apply };
}
const create = { kind: "new", name: "Compare citations", title: "Compare citations", reason: "Check support explicitly", day, sources: ["Sources/Research.md"] };
const path = "Projects/Demo/Actions/Compare citations.md";

test("long action histories round-trip through proposals and the desktop index without truncation", async t => {
  const f = await fixture(t), target = "Projects/Demo/Long history.md";
  for (const [count, reason] of [[30, "x".repeat(2000)], [63, "x".repeat(2000)], [63, "\\".repeat(1900)]] as const) {
    const record = newAction("demo", "Retain every transition", reason, day, { sources: [], truncated: false, noteHashes: {} });
    record.history = Array.from({ length: count }, (_, i) => ({ ...record.history[0]!, from: i === 0 ? null : i % 2 ? "planned" as const : "in-progress" as const, to: i % 2 ? "in-progress" as const : "planned" as const }));
    record.status = record.history.at(-1)!.to;
    const original = actionMarkdown(record); await f.put(target, original);
    let snapshot = await f.load(); assert.equal(snapshot.actions.cards[0]!.record.history.length, count);
    const state: ActionState = record.status === "planned" ? "in-progress" : "planned";
    const command = { kind: "transition", path: target, state, reason, day, sources: [] };
    if (reason.startsWith("\\")) {
      // Large escaped histories remain readable, but cannot bypass the existing batch budget.
      await assert.rejects(f.records.prepareAction(snapshot.id, command, f.info.revision), /batch within 1 MB/);
      assert.equal(await f.read(target), original); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
      await f.put(target, transitionAction(original, metadata(original), state, reason, day, { sources: [], truncated: false, noteHashes: {} }));
    } else {
      await f.records.prepareAction(snapshot.id, command, f.info.revision);
      assert.equal(await f.read(target), original); await f.apply();
    }
    const after = await f.read(target), next = readAction(after, metadata(after));
    assert.ok(after.slice(0, after.indexOf("\n---", 4)).length > 65536);
    assert.deepEqual(next.history.slice(0, count), record.history); assert.equal(next.history.length, count + 1);
    snapshot = await f.load(); assert.equal(snapshot.actions.cards[0]!.record.history.length, count + 1); assert.equal(snapshot.actions.unavailable, 0);
    if (count === 63) {
      if (reason.startsWith("\\")) assert.ok(Buffer.byteLength(JSON.stringify(next)) > 240000);
      await assert.rejects(f.records.prepareAction(snapshot.id, { kind: "transition", path: target, state: "blocked", reason: "One too many", day, sources: [] }, f.info.revision), /history/);
      assert.equal(await f.read(target), after); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
    }
  }
});

test("larger metadata admission is limited to supported bounded action history", () => {
  const padding = "x".repeat(65536);
  for (const header of [`title: ${padding}`, `type: action\nthread_action_version: \"99\"\nthread_action_record: ${padding}`, `type: action\nthread_action_version: \"1\"\nthread_action_record: ${padding}`, `title: ${"x".repeat(1048576)}`]) assert.throws(() => metadata(`---\n${header}\n---\n`));
});

test("desktop actions start Planned, retain all explicit transitions and change only after exact reviewed Apply", async t => {
  const f = await fixture(t); let snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 0); assert.ok(!JSON.stringify(snapshot).includes("Private"));
  await f.records.prepareAction(snapshot.id, create, f.info.revision); await assert.rejects(f.read(path), { code: "ENOENT" }); await f.apply();
  let text = await f.read(path), record = readAction(text, metadata(text)); const id = record.id; assert.equal(record.status, "planned");
  for (const state of ["in-progress", "blocked", "done", "planned"] as const) {
    snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 1); assert.equal(snapshot.actions.cards[0]!.record.id, id);
    const before = await f.read(path); await f.records.prepareAction(snapshot.id, { kind: "transition", path, state, reason: `User recorded ${state}`, day, sources: [] }, f.info.revision);
    assert.equal(await f.read(path), before); await f.apply(); text = await f.read(path); record = readAction(text, metadata(text)); assert.equal(record.status, state); assert.equal(record.id, id);
  }
  assert.deepEqual(record.history.map(h => h.to), ["planned", "in-progress", "blocked", "done", "planned"]);
  assert.equal(record.history[0]!.sources[0]!.path, "Sources/Research.md"); assert.match(text, /User recorded blocked/);
  snapshot = await f.load(); await assert.rejects(f.records.prepareAction(snapshot.id, create, f.info.revision), /Target changed/); assert.equal(await f.read(path), text);
});

test("desktop action board reports stale, edited, duplicate and unsupported records without silently mutating them", async t => {
  const f = await fixture(t); let snapshot = await f.load(); await f.records.prepareAction(snapshot.id, create, f.info.revision); await f.apply(); const original = await f.read(path);
  await f.put("Sources/Research.md", "Changed supporting evidence"); snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 0); assert.equal(snapshot.actions.unavailable, 1);
  const transition = { kind: "transition", path, state: "done", reason: "Explicit report", day, sources: [] };
  await assert.rejects(f.records.prepareAction(snapshot.id, transition, f.info.revision), /supported action/); assert.equal(await f.read(path), original);
  await f.put("Sources/Research.md", "## Method\nCompare citations against original passages.\n"); await f.put(path, original + "User appended text\n"); snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 0);
  await f.put(path, original); await f.put("Projects/Demo/Duplicate.md", original); snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 0); assert.equal(snapshot.actions.unavailable, 2);
  await f.put("Projects/Demo/Duplicate.md", "Ordinary note"); await f.put(path, original.replace('thread_action_version: "1"', 'thread_action_version: "99"')); snapshot = await f.load(); assert.equal(snapshot.actions.cards.length, 0);
  assert.equal(f.changes.snapshot(f.info.revision).pending, null);
});

test("action IPC validation, canceled reads, permission revocation and external preview conflicts preserve notes", async t => {
  const f = await fixture(t); let snapshot = await f.load();
  for (const input of [{ ...create, extra: true }, { ...create, name: "../escape" }, { ...create, sources: ["Private/Secret.md"] }, { ...create, day: "2026-02-31" }, { ...create, title: "x".repeat(201) }, { ...create, sources: Array(5).fill("Sources/Research.md") }]) await assert.rejects(f.records.prepareAction(snapshot.id, input, f.info.revision));
  const read = f.reader.read.bind(f.reader); let entered!: () => void, release!: () => void; const start = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; });
  f.reader.read = async (...args) => { const value = await read(...args); entered(); await gate; return value; };
  const preparing = f.records.prepareAction(snapshot.id, create, f.info.revision); const rejected = assert.rejects(preparing, /canceled|changed/); await start; f.records.draftChanged(false); release(); await rejected; f.reader.read = read;
  assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  snapshot = await f.load(); await f.records.prepareAction(snapshot.id, create, f.info.revision); await f.apply(); const before = await f.read(path);
  snapshot = await f.load(); await assert.rejects(f.records.prepareAction(snapshot.id, { kind: "transition", path, state: ["done"], reason: "Bad input", day, sources: [] }, f.info.revision), /explicit recorded/);
  await f.records.prepareAction(snapshot.id, { kind: "transition", path, state: "done", reason: "Reported done", day, sources: [] }, f.info.revision);
  const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); await f.put(path, before + "External edit preserved"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision)); assert.match(await f.read(path), /External edit preserved/);
  f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset(); await assert.rejects(f.records.prepareAction(snapshot.id, create, f.info.revision));
});

test("action support refuses ambiguous identities, invalid managed questions and action self-reference", async t => {
  const f = await fixture(t); await f.put("Sources/Question.md", frontmatter({ id: "question", type: "question", thread_question_version: "99", project: "demo", status: "open" }) + "## Question\nUnsupported question\n");
  let snapshot = await f.load(); assert.ok(!snapshot.evidence.some(e => e.path === "Sources/Question.md")); await assert.rejects(f.records.prepareAction(snapshot.id, { ...create, sources: ["Sources/Question.md"] }, f.info.revision), /current evidence notes/);
  await f.put("Sources/A.md", frontmatter({ id: "same" }) + "Note A"); await f.put("Sources/B.md", frontmatter({ id: "same" }) + "Note B"); snapshot = await f.load(); await assert.rejects(f.records.prepareAction(snapshot.id, { ...create, sources: ["Sources/A.md"] }, f.info.revision), /unambiguous|current evidence notes/);
  await f.records.prepareAction(snapshot.id, create, f.info.revision); await f.apply(); snapshot = await f.load(); await assert.rejects(f.records.prepareAction(snapshot.id, { ...create, name: "Another", sources: [path] }, f.info.revision), /non-action/);
});

function sessionProvider() {
  const prompts: { evidence: { id: string; path: string; noteType?: string; noteStatus?: string }[] }[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/status") return Response.json({ cloud: { disabled: true } });
    if (path === "/api/tags") return Response.json({ models: [{ name: "text:local", digest: "a".repeat(64) }] });
    if (path === "/api/show") return Response.json({ capabilities: ["completion"], model_info: { architecture: "fixture" } });
    const body = JSON.parse(String(options!.body)), prompt = JSON.parse(body.messages.find((m: { role: string }) => m.role === "user").content); prompts.push(prompt);
    const action = prompt.evidence.find((s: { noteType: string }) => s.noteType === "action"), source = action ?? prompt.evidence[0];
    return Response.json({ message: { content: JSON.stringify({ progress: [{ kind: "interpretation", text: "The selected report records progress; timing is not verified.", sourceIds: [source.id] }], decisions: [], openQuestions: [], nextActions: [{ kind: "suggestion", text: "Inspect one cited result.", sourceIds: [source.id] }], gaps: ["Completion is a user report."] }) } });
  };
  return { fetcher, prompts };
}
async function seedActions(f: Awaited<ReturnType<typeof fixture>>) {
  let snapshot = await f.load(); await f.records.prepareAction(snapshot.id, create, f.info.revision); await f.apply();
  snapshot = await f.load(); await f.records.prepareAction(snapshot.id, { kind: "transition", path, state: "done", reason: "User reports the comparison", day, sources: [] }, f.info.revision); await f.apply();
  snapshot = await f.load(); await f.records.prepareAction(snapshot.id, { ...create, name: "Not selected", title: "Unselected action" }, f.info.revision); await f.apply();
  f.ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" }); return f.load();
}

test("session uses only explicitly chosen action reports, preserves states and saves exact non-overwriting Markdown with guarded Undo", async t => {
  const provider = sessionProvider(), f = await fixture(t, provider.fetcher); let snapshot = await seedActions(f);
  const before = await f.read(path), otherPath = "Projects/Demo/Actions/Not selected.md", other = await f.read(otherPath);
  const draft = await f.records.generateSession(snapshot.id, { name: "Reviewed session", report: "I checked <three> citations.", actions: [path] }, f.info.revision);
  assert.equal(draft.actionCount, 1); assert.equal(draft.bundle.sources.filter(s => s.noteType === "action").length, 2);
  assert.ok(provider.prompts[0]!.evidence.filter(s => s.noteType === "action").every(s => s.path === path)); assert.match(draft.markdown, /User-recorded state: \*\*Done\*\*/); assert.match(draft.markdown, /I checked \\<three\\>/); assert.match(draft.markdown, /does not establish/);
  assert.equal(await f.read(path), before); assert.equal(await f.read(otherPath), other); await assert.rejects(f.read(draft.path), { code: "ENOENT" });
  await f.records.prepareSession(draft.id, f.info.revision); await assert.rejects(f.read(draft.path), { code: "ENOENT" }); await f.apply(); assert.equal(await f.read(draft.path), draft.markdown);
  assert.equal(await f.read(path), before); assert.equal(await f.read(otherPath), other);
  snapshot = await f.load(); const collision = await f.records.generateSession(snapshot.id, { name: "Reviewed session", report: "Later report", actions: [] }, f.info.revision);
  assert.equal(collision.actionCount, 0); assert.equal(provider.prompts[1]!.evidence.filter(s => s.noteType === "action").length, 0);
  await assert.rejects(f.records.prepareSession(collision.id, f.info.revision), /Target changed/); assert.equal(await f.read(draft.path), draft.markdown);
  const history = f.changes.snapshot(f.info.revision).history.at(-1)!, undo = await f.changes.preview("undo", history.id, f.info.revision); await f.changes.confirm(undo.id, f.info.revision);
  await assert.rejects(f.read(draft.path), { code: "ENOENT" }); assert.equal(await f.read(path), before);
});

test("session rejects forged selections, invalid fields and late canceled, edited, revoked or model-changed generation", async t => {
  const f = await fixture(t, sessionProvider().fetcher), snapshot = await seedActions(f), input = { name: "Session", report: "Reported work", actions: [path] };
  for (const invalid of [{ ...input, actions: ["Private/Secret.md"] }, { ...input, actions: [path, path] }, { ...input, actions: Array(6).fill(path) }, { ...input, report: "x".repeat(5001) }, { ...input, name: "../escape" }, { ...input, modelOutput: "forged" }]) await assert.rejects(f.records.generateSession(snapshot.id, invalid, f.info.revision));
  for (const cause of ["cancel", "input", "edit", "revoke", "model"] as const) {
    let entered!: () => void, release!: () => void; const start = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; }), provider = sessionProvider();
    const child = await fixture(t, async (...args) => { if (String(args[0]).endsWith("/api/chat")) { entered(); await gate; } return provider.fetcher(...args); }); const loaded = await seedActions(child), before = await child.read(path);
    const pending = child.records.generateSession(loaded.id, input, child.info.revision), rejected = assert.rejects(pending); await start;
    if (cause === "cancel") child.records.invalidate();
    if (cause === "input") child.records.draftChanged(false);
    if (cause === "edit") await child.put("Sources/Research.md", "A new supporting source edit");
    if (cause === "revoke") { child.reader.grant({ roots: [], excluded: [] }, child.info.revision); child.index.reset(); }
    if (cause === "model") child.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    release(); await rejected; assert.equal(await child.read(path), before); assert.equal(child.storage.changeState(child.reader.getInfo()!.revision).pending, null); await assert.rejects(child.records.prepareSession("forged", child.reader.getInfo()!.revision), /draft changed/);
  }
});

test("session revalidates before sending context and revokes generated drafts after inputs or source changes", async t => {
  const provider = sessionProvider(); let onShow: (() => Promise<void>) | null = null;
  const f = await fixture(t, async (...args) => { const response = await provider.fetcher(...args); if (String(args[0]).endsWith("/api/show")) await onShow?.(); return response; }); let snapshot = await seedActions(f);
  const input = { name: "Session", report: "Reported work", actions: [path] };
  onShow = () => f.put("Sources/Research.md", "Changed before sending context"); await assert.rejects(f.records.generateSession(snapshot.id, input, f.info.revision), /changed/); assert.equal(provider.prompts.length, 0);
  onShow = null; await f.put("Sources/Research.md", "## Method\nCompare citations against original passages.\n"); snapshot = await f.load();
  let draft = await f.records.generateSession(snapshot.id, input, f.info.revision); f.records.draftChanged(false); await assert.rejects(f.records.prepareSession(draft.id, f.info.revision), /draft changed/);
  draft = await f.records.generateSession(snapshot.id, input, f.info.revision); await f.put(path, (await f.read(path)) + "New external edit"); await assert.rejects(f.records.prepareSession(draft.id, f.info.revision), /changed/); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
});
