import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopReviews, type ReviewMode } from "./reviews.ts";
import { frontmatter, localDay } from "../vault/workspace.ts";
import { buildEvidence } from "../vault/evidence.ts";
import { answerMarkdown } from "../intelligence/answer.ts";
import { decisionMarkdown } from "../vault/decision.ts";

async function fixture(t: TestContext, fetcher: typeof fetch = async () => { throw Error("Recorded review must not call a model"); }) {
  const root = await mkdtemp(join(tmpdir(), "thread-reviews-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const folder of ["Projects/Demo", "Projects/Other", "Sources", "Private", "Reviews"]) await mkdir(join(vault, folder), { recursive: true }); await mkdir(profile);
  const put = (path: string, raw: string) => writeFile(join(vault, path), raw), read = (path: string) => readFile(join(vault, path), "utf8");
  const original = frontmatter({ type: "project", id: "demo", status: "active" }) + "## Objective\nReview local evidence.\n## Open questions\nWhich local model?\n";
  await put("Projects/Demo/Overview.md", original); await put("Projects/Other/Overview.md", frontmatter({ type: "project", id: "other", status: "paused" }) + "## Objective\nAnother permitted project.\n");
  await put("Sources/Research.md", "## Method\nCheck the original passage.\n"); await put("Private/Secret.md", "PRIVATE FIXTURE TEXT");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Sources", "Reviews"], excluded: ["Private"] }, info.revision);
  const index = new EvidenceIndex(reader), projects = new DesktopProjects(reader, index), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision);
  const compatibility = await storage.inspect(".obsidian", info.revision); await storage.enable(compatibility.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.projects = "Projects"; preferences.roles.reviews = "Reviews"; await storage.savePreferences(preferences, info.revision);
  const changes = new DesktopChanges(reader, storage), ai = new DesktopAI(projects, index, fetcher), reviews = new DesktopReviews(reader, index, projects, storage, changes, ai), selection = { folder: "Projects", project: "Projects/Demo" };
  const load = (mode: ReviewMode) => reviews.load({ selection, mode, filter: "all" }, info.revision);
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  const apply = async () => { const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  return { root, vault, reader, info, index, projects, storage, changes, ai, reviews, selection, load, put, read, original, apply };
}

async function sourceBundle(path: string, text: string) { return buildEvidence([{ path, text, metadata: {}, modifiedAt: Date.now() }]); }

test("desktop review snapshots show stale dependencies and redact unavailable references without changing records", async t => {
  const f = await fixture(t), bundle = await sourceBundle("Sources/Research.md", await f.read("Sources/Research.md"));
  const output = answerMarkdown("What method?", { supported: true, answer: [{ kind: "fact", text: "Check the original passage.", sourceIds: ["S1"] }], gaps: [] }, bundle, "fixture", "demo");
  await f.put("Projects/Demo/Answer.md", output);
  let value = await f.load("freshness"); assert.equal(value.outputs![0]!.state, "current"); assert.equal(value.outputs![0]!.references[0]!.path, "Sources/Research.md");
  await f.put("Sources/Research.md", "## Method\nThe method has changed.\n"); value = await f.load("freshness"); assert.equal(value.outputs![0]!.state, "changed");
  const hidden = await sourceBundle("Private/Secret.md", "PRIVATE FIXTURE TEXT");
  await f.put("Projects/Demo/Decision.md", decisionMarkdown({ question: "Which workflow?", choice: "Local", alternatives: "Hosted", rationale: "Inspect evidence", constraints: "Offline", revisit: "When evidence changes", status: "accepted", date: localDay(), revisitOn: localDay() }, "demo", hidden));
  value = await f.load("queue"); assert.ok(value.queue!.pending.some(r => r.item.kind === "stale-output")); assert.ok(value.queue!.pending.some(r => r.item.kind === "decision-evidence")); assert.ok(value.queue!.pending.some(r => r.item.kind === "revisit-date"));
  assert.ok(!JSON.stringify(value).includes("Private/Secret")); assert.ok(!JSON.stringify(value).includes("PRIVATE FIXTURE"));
  assert.equal(await f.read("Projects/Demo/Answer.md"), output); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original); assert.equal(f.storage.changeState(f.info.revision).pending, null);
});

test("timeline and multi-project overview preserve explicit chronology and status filters", async t => {
  const f = await fixture(t); await f.put("Projects/Demo/Undated.md", frontmatter({ type: "session", project: "demo" }) + "## User-reported progress\nReported work without a date.\n");
  const timeline = (await f.load("timeline")).timeline!; assert.equal(timeline.events[0]!.day, null); assert.equal(timeline.unknown, 1); assert.ok(timeline.events[0]!.modified);
  const value = await f.reviews.load({ selection: { ...f.selection, project: "" }, mode: "overview", filter: "paused" }, f.info.revision);
  assert.equal(value.overview!.cards.length, 1); assert.equal(value.overview!.cards[0]!.path, "Projects/Other"); assert.equal(value.overview!.cards[0]!.status, "paused"); assert.equal(value.overview!.permitted, 2);
  assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});

test("health reports concrete date, heading and identity issues with only eligible individual repair choices", async t => {
  const f = await fixture(t);
  await f.put("Projects/Demo/Legacy.md", frontmatter({ type: "session", project: "demo", recorded_on: "not a date", id: "legacy" }) + "## Work\nRecorded report.\n");
  await f.put("Sources/Duplicate-a.md", frontmatter({ id: "duplicate" }) + "Source A"); await f.put("Sources/Duplicate-b.md", frontmatter({ id: "duplicate" }) + "Source B");
  const value = await f.reviews.load({ selection: { ...f.selection, project: "" }, mode: "health", filter: "all" }, f.info.revision), report = value.health!;
  assert.equal(report.counts["invalid-date"], 1); assert.equal(report.counts["duplicate-id"], 2); assert.ok(report.counts.heading >= 1);
  const date = report.issues.findIndex(i => i.dateKey === "recorded_on"), heading = report.issues.findIndex(i => i.kind === "heading" && i.path.endsWith("Legacy.md"));
  assert.equal(value.repairs![date]!.allowed, true); assert.ok(value.repairs![heading]!.headings.some(h => h.heading === "Work")); assert.deepEqual(value.repairs![heading]!.replacements, ["User-reported progress"]);
  assert.ok(value.repairs!.filter(r => report.issues[r.issue]!.kind === "duplicate-id").every(r => !r.allowed)); assert.ok(!JSON.stringify(value).includes("Private/Secret")); assert.equal(f.storage.changeState(f.info.revision).pending, null);
});

test("review requests reject unsupported selections and cancel late health reads after cancellation or revocation", async t => {
  const f = await fixture(t);
  for (const input of [{ selection: f.selection, mode: "remote", filter: "all" }, { selection: f.selection, mode: "overview", filter: "priority" }, { selection: { folder: "../Private", project: "" }, mode: "health", filter: "all" }, { selection: f.selection, mode: "queue", filter: "all", extra: true }]) await assert.rejects(f.reviews.load(input, f.info.revision));
  await assert.rejects(f.reviews.load({ selection: { ...f.selection, project: "" }, mode: "queue", filter: "all" }, f.info.revision), /Choose a project to see its review queue/);
  for (const revoke of [false, true]) {
    const child = await fixture(t); await child.load("health");
    const read = child.reader.read.bind(child.reader); let entered!: () => void, release!: () => void; const started = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; });
    child.reader.read = async (...args) => { const note = await read(...args); entered(); await gate; return note; };
    const pending = child.load("health"), rejected = assert.rejects(pending); await started;
    if (revoke) { child.reader.grant({ roots: [], excluded: [] }, child.info.revision); child.index.reset(); } else child.reviews.invalidate();
    release(); await rejected; assert.equal(child.storage.changeState(child.reader.getInfo()!.revision).pending, null);
  }
});

test("desktop health discloses index omissions and preserves finite diagnostic coverage", async t => {
  const f = await fixture(t);
  for (let i = 0; i < 501; i++) await f.put(`Sources/Note-${String(i).padStart(3, "0")}.md`, frontmatter({ created: "unknown" }) + "Source text");
  await f.put("Sources/Oversized.md", "x".repeat(1048577));
  const value = await f.load("health"), report = value.health!;
  assert.ok(report.examined <= 500); assert.equal(report.issues.length, 200); assert.ok(report.counts["invalid-date"] > report.issues.length); assert.ok(report.bytes <= 8388608); assert.ok(f.index.index.coverage!.omittedFiles > 0); assert.match(value.coverage, /skipped \(not indexed\)/);
});

test("explicit review acknowledges only its exact snapshot and changed sources return to the queue", async t => {
  const f = await fixture(t); let value = await f.load("queue"), row = value.queue!.pending.findIndex(r => r.item.kind === "open-question");
  const command = { kind: "review", row, action: "reviewed", name: "Checked", reason: "Inspected the recorded question", revisit: "", question: "" };
  await f.reviews.prepare(value.id, command, f.info.revision); await assert.rejects(f.read("Projects/Demo/Reviews/Checked.md"), { code: "ENOENT" });
  const preview = await f.apply(); assert.equal(await f.read("Projects/Demo/Reviews/Checked.md"), preview.operations[0]!.after); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
  value = await f.load("queue"); assert.equal(value.queue!.handled.length, 1); assert.equal(value.queue!.pending.length, 0); assert.equal(value.queue!.candidateCounts["open-question"], 1);
  await f.put("Projects/Demo/Overview.md", f.original + "## Additional context\nAdditional recorded context.\n"); value = await f.load("queue"); assert.equal(value.queue!.handled.length, 0); assert.equal(value.queue!.pending.length, 1);
  assert.match(await f.read("Projects/Demo/Reviews/Checked.md"), /does not make output current/);
});

test("future snoozes and follow-up questions are separate non-overwriting records without resolving the target", async t => {
  const f = await fixture(t); let value = await f.load("queue"); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const base = { kind: "review", row: 0, action: "snoozed", name: "Revisit", reason: "Need another comparison", revisit: localDay(tomorrow), question: "" };
  await assert.rejects(f.reviews.prepare(value.id, { ...base, revisit: localDay() }, f.info.revision), /after today/);
  await f.reviews.prepare(value.id, base, f.info.revision); await f.apply(); value = await f.load("queue"); assert.equal(value.queue!.handled[0]!.disposition, "snoozed");
  await f.put("Projects/Demo/Overview.md", f.original + "A changed snapshot.\n"); value = await f.load("queue");
  await f.reviews.prepare(value.id, { ...base, action: "question", name: "Follow-up", question: "Which citations need another check?" }, f.info.revision); await f.apply();
  const followup = await f.read("Projects/Demo/Questions/Follow-up.md"); assert.match(followup, /status: "open"/); assert.match(followup, /Review origin \(not supporting evidence\)/); assert.match(followup, /Need another comparison/);
  value = await f.load("queue"); const row = value.queue!.pending.findIndex(r => r.item.path.endsWith("Overview.md")); await assert.rejects(f.reviews.prepare(value.id, { ...base, row, action: "question", name: "Follow-up", question: "Another question" }, f.info.revision), /The note changed before the change was prepared/); assert.equal(await f.read("Projects/Demo/Questions/Follow-up.md"), followup);
});

test("milestones and explicit next actions preserve earlier records and require exact new-note Apply", async t => {
  const f = await fixture(t); let value = await f.load("timeline");
  await f.reviews.prepare(value.id, { kind: "milestone", name: "First comparison", title: "Compared three citations", detail: "User reports completing a small comparison.", day: localDay() }, f.info.revision);
  await assert.rejects(f.read("Projects/Demo/Milestones/First comparison.md"), { code: "ENOENT" }); await f.apply();
  value = await f.load("timeline"); assert.equal(value.timeline!.events[0]!.kind, "milestone"); assert.equal(value.timeline!.events[0]!.day, localDay());
  value = await f.load("overview"); await f.reviews.prepare(value.id, { kind: "next-action", project: "Projects/Demo", name: "Next check", action: "Compare the remaining citation." }, f.info.revision); await f.apply();
  value = await f.load("overview"); const card = value.overview!.cards.find(c => c.path === "Projects/Demo")!; assert.match(card.chosen!.excerpt, /remaining citation/); assert.equal(card.status, "active"); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
  const batch = f.changes.snapshot(f.info.revision).history.at(-1)!, undo = await f.changes.preview("undo", batch.id, f.info.revision); await f.changes.confirm(undo.id, f.info.revision); await assert.rejects(f.read("Projects/Demo/Next actions/Next check.md"), { code: "ENOENT" }); assert.match(await f.read("Projects/Demo/Milestones/First comparison.md"), /Compared three citations/);
});

test("individual health repairs preserve other fields and body, refuse unsupported inputs and guard external edits", async t => {
  const f = await fixture(t), path = "Projects/Demo/Legacy.md", original = '---\r\nid: legacy\r\ntype: session\r\nproject: demo\r\nrecorded_on: "unknown" # retain comment\r\ncustom: retained\r\n---\r\n## Work\r\nUser report retained.\r\n'; await f.put(path, original);
  let value = await f.load("health"), issue = value.health!.issues.findIndex(i => i.path === path && i.dateKey === "recorded_on");
  await assert.rejects(f.reviews.prepare(value.id, { kind: "repair", issue, value: "2026-02-31", headingAt: null }, f.info.revision), /date/);
  await f.reviews.prepare(value.id, { kind: "repair", issue, value: localDay(), headingAt: null }, f.info.revision); assert.equal(await f.read(path), original); await f.apply();
  const dated = await f.read(path); assert.equal(dated, original.replace('"unknown"', JSON.stringify(localDay())));
  value = await f.load("health"); issue = value.health!.issues.findIndex(i => i.path === path && i.kind === "heading"); const heading = value.repairs![issue]!.headings[0]!;
  await assert.rejects(f.reviews.prepare(value.id, { kind: "repair", issue, value: "Invented meaning", headingAt: heading.at }, f.info.revision), /recognized heading/);
  await f.reviews.prepare(value.id, { kind: "repair", issue, value: "User-reported progress", headingAt: heading.at }, f.info.revision);
  const pending = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", pending.id, f.info.revision); await f.put(path, dated + "External edit\r\n"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision)); assert.equal(await f.read(path), dated + "External edit\r\n");
  await f.changes.reject(pending.id, f.info.revision); value = await f.load("health"); issue = value.health!.issues.findIndex(i => i.path === path && i.kind === "heading");
  await f.reviews.prepare(value.id, { kind: "repair", issue, value: "User-reported progress", headingAt: value.repairs![issue]!.headings[0]!.at }, f.info.revision); await f.apply(); assert.equal(await f.read(path), dated.replace("## Work", "## User-reported progress") + "External edit\r\n");
});

test("review proposals reject malformed inputs, new duplicate identities and canceled preparation without changing notes", async t => {
  const f = await fixture(t); let value = await f.load("queue"); const command = { kind: "review", row: 0, action: "reviewed", name: "Checked", reason: "Checked explicitly", revisit: "", question: "" };
  for (const invalid of [{ ...command, row: "0" }, { ...command, row: -1 }, { ...command, name: "../escape" }, { ...command, reason: "x".repeat(5001) }, { ...command, action: "resolve" }, { ...command, injected: true }]) await assert.rejects(f.reviews.prepare(value.id, invalid, f.info.revision));
  await f.reviews.prepare(value.id, command, f.info.revision); const pending = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", pending.id, f.info.revision);
  await f.put("Sources/New duplicate.md", frontmatter({ id: "demo" }) + "A competing identity"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /stale/); await assert.rejects(f.read("Projects/Demo/Reviews/Checked.md"), { code: "ENOENT" });
  await f.changes.reject(pending.id, f.info.revision); await f.put("Sources/New duplicate.md", "Ordinary note"); value = await f.load("queue");
  const read = f.reader.read.bind(f.reader); let entered!: () => void, release!: () => void; const start = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; });
  f.reader.read = async (...args) => { const note = await read(...args); entered(); await gate; return note; };
  const preparing = f.reviews.prepare(value.id, command, f.info.revision), rejected = assert.rejects(preparing, /canceled|changed/); await start; f.reviews.draftChanged(); release(); await rejected;
  assert.equal(f.changes.snapshot(f.info.revision).pending, null); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});

function provider() {
  const prompts: { task: string; evidence: { id: string; path: string; noteType?: string }[]; periodSourceIds?: string[] }[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path === "/api/status") return Response.json({ cloud: { disabled: true } });
    if (path === "/api/tags") return Response.json({ models: [{ name: "text:local", digest: "a".repeat(64) }] });
    if (path === "/api/show") return Response.json({ capabilities: ["completion"], model_info: { architecture: "fixture" } });
    const body = JSON.parse(String(options!.body)), prompt = JSON.parse(body.messages.find((m: { role: string }) => m.role === "user").content); prompts.push(prompt);
    const source = prompt.evidence.find((s: { noteType: string }) => s.noteType === "session") ?? prompt.evidence[0], claim = { kind: "interpretation", text: "The selected records describe a local comparison.", sourceIds: [source.id] };
    const value = prompt.period ? { activity: [claim], resolvedQuestions: [], projectsToRevisit: [{ ...claim, kind: "suggestion" }], gaps: ["No explicit resolution established."] } : { supported: true, answer: [claim], gaps: ["Inspect the quoted support."] };
    return Response.json({ message: { content: JSON.stringify(value) } });
  };
  return { fetcher, prompts };
}
const weeklyInput = { kind: "weekly", name: "Reviewed week", end: localDay(), scope: "project" };
async function weeklyFixture(t: TestContext, fetcher: typeof fetch) {
  const f = await fixture(t, fetcher); await f.put("Projects/Demo/Session.md", frontmatter({ type: "session", project: "demo", recorded_on: localDay() }) + "## User-reported progress\nI compared three citations.\n");
  f.ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" }); return f;
}

test("weekly drafts keep project scope and reported dates, save only exact reviewed bytes and refuse overwrite", async t => {
  const p = provider(), f = await weeklyFixture(t, p.fetcher); let value = await f.load("queue");
  const draft = await f.reviews.generate(value.id, weeklyInput, f.info.revision); assert.ok(p.prompts[0]!.evidence.every(s => s.path.startsWith("Projects/Demo/"))); assert.match(draft.markdown, /User-reported progress: I compared three citations/); assert.match(draft.markdown, /do not date the underlying events/);
  await assert.rejects(f.read(draft.path), { code: "ENOENT" }); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
  await f.reviews.prepareDraft(draft.id, f.info.revision); const preview = await f.apply(); assert.equal(preview.operations[0]!.after, draft.markdown); assert.equal(await f.read(draft.path), draft.markdown);
  value = await f.load("queue"); const next = await f.reviews.generate(value.id, weeklyInput, f.info.revision); await assert.rejects(f.reviews.prepareDraft(next.id, f.info.revision), /The note changed before the change was prepared/); assert.equal(await f.read(draft.path), draft.markdown);
  const batch = f.changes.snapshot(f.info.revision).history.at(-1)!, undo = await f.changes.preview("undo", batch.id, f.info.revision); await f.changes.confirm(undo.id, f.info.revision); await assert.rejects(f.read(draft.path), { code: "ENOENT" });
});

test("all-permitted weekly scope is explicit, bounded to 80 notes and never includes excluded sources", async t => {
  const p = provider(), f = await weeklyFixture(t, p.fetcher);
  for (let i = 0; i < 82; i++) await f.put(`Sources/Record-${i}.md`, frontmatter({ captured_on: localDay() }) + `## Method\nRecorded source ${i}.\n`);
  const value = await f.reviews.load({ selection: { ...f.selection, project: "" }, mode: "overview", filter: "all" }, f.info.revision);
  await assert.rejects(f.reviews.generate(value.id, weeklyInput, f.info.revision), /Choose a project, or choose all notes/);
  const draft = await f.reviews.generate(value.id, { ...weeklyInput, scope: "allowed" }, f.info.revision); assert.ok(Object.keys(draft.bundle.noteHashes).length <= 80); assert.match(draft.markdown, /Only the 80 most recently modified/); assert.ok(!JSON.stringify(p.prompts).includes("Private/Secret")); assert.ok(p.prompts[0]!.evidence.some(s => s.path.startsWith("Sources/")));
});

test("refreshed versions use explicit current evidence, retain the stale original and require a new destination", async t => {
  const p = provider(), f = await fixture(t, p.fetcher), oldBundle = await sourceBundle("Sources/Research.md", await f.read("Sources/Research.md"));
  const original = answerMarkdown("Old answer", { supported: true, answer: [{ kind: "interpretation", text: "Old copied inference", sourceIds: ["S1"] }], gaps: [] }, oldBundle, "fixture", "demo"), path = "Projects/Demo/Old answer.md"; await f.put(path, original); await f.put("Sources/Research.md", "## Method\nA new source method.\n");
  f.ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" }); const value = await f.load("freshness"), input = { kind: "refresh", name: "Refreshed answer", path, sources: ["Sources/Research.md"] };
  for (const sources of [[], [path], ["Private/Secret.md"], ["Sources/Research.md", "Sources/Research.md"]]) await assert.rejects(f.reviews.generate(value.id, { ...input, sources }, f.info.revision), /one to five different notes/);
  const draft = await f.reviews.generate(value.id, input, f.info.revision); assert.ok(p.prompts[0]!.evidence.every(s => s.path === "Sources/Research.md")); assert.ok(!JSON.stringify(p.prompts).includes("Old copied inference")); assert.match(draft.markdown, /Original output preserved/); assert.equal(await f.read(path), original);
  await f.reviews.prepareDraft(draft.id, f.info.revision); await f.apply(); assert.equal(await f.read(draft.path), draft.markdown); assert.equal(await f.read(path), original);
});

test("weekly generation rejects invalid fields and discards late canceled, edited, revoked and model-changed results", async t => {
  const p = provider(), f = await weeklyFixture(t, p.fetcher), value = await f.load("queue");
  for (const input of [{ ...weeklyInput, end: "2026-02-31" }, { ...weeklyInput, end: "2999-01-01" }, { ...weeklyInput, scope: "secret" }, { ...weeklyInput, name: "../escape" }, { ...weeklyInput, markdown: "forged" }]) await assert.rejects(f.reviews.generate(value.id, input, f.info.revision));
  for (const cause of ["input", "cancel", "source", "revoke", "model"] as const) {
    let entered!: () => void, release!: () => void; const start = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; }), p = provider();
    const child = await weeklyFixture(t, async (...args) => { if (String(args[0]).endsWith("/api/chat")) { entered(); await gate; } return p.fetcher(...args); }); const snapshot = await child.load("queue");
    const generating = child.reviews.generate(snapshot.id, weeklyInput, child.info.revision), rejected = assert.rejects(generating); await start;
    if (cause === "input") child.reviews.draftChanged();
    if (cause === "cancel") child.reviews.invalidate();
    if (cause === "source") await child.put("Projects/Demo/Session.md", "Changed report");
    if (cause === "revoke") { child.reader.grant({ roots: [], excluded: [] }, child.info.revision); child.index.reset(); }
    if (cause === "model") child.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    release(); await rejected; assert.equal(child.storage.changeState(child.reader.getInfo()!.revision).pending, null); await assert.rejects(child.reviews.prepareDraft("forged", child.reader.getInfo()!.revision), /draft changed/); assert.equal(await child.read("Projects/Demo/Overview.md"), child.original);
  }
});

test("review generation verifies evidence before model transmission and invalidates generated save capabilities", async t => {
  const p = provider(); let onShow: (() => Promise<void>) | null = null;
  const f = await weeklyFixture(t, async (...args) => { const response = await p.fetcher(...args); if (String(args[0]).endsWith("/api/show")) await onShow?.(); return response; }); let value = await f.load("queue");
  onShow = () => f.put("Projects/Demo/Overview.md", f.original + "A source change before transmission"); await assert.rejects(f.reviews.generate(value.id, weeklyInput, f.info.revision), /changed/); assert.equal(p.prompts.length, 0);
  onShow = null; value = await f.load("queue"); let draft = await f.reviews.generate(value.id, weeklyInput, f.info.revision); f.reviews.draftChanged(); await assert.rejects(f.reviews.prepareDraft(draft.id, f.info.revision), /draft changed/);
  draft = await f.reviews.generate(value.id, weeklyInput, f.info.revision); await f.put("Projects/Demo/Session.md", "Changed after generation"); await assert.rejects(f.reviews.prepareDraft(draft.id, f.info.revision), /changed/); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
});
