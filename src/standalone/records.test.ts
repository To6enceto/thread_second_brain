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
import { DesktopRecords, type RecordCommand } from "./records.ts";
import { frontmatter } from "../vault/workspace.ts";
import { metadata } from "./metadata.ts";
import type { DecisionInput } from "../vault/decision.ts";

const fields: DecisionInput = { question: "Which workflow?", choice: "Local", alternatives: "Hosted", rationale: "Offline access", constraints: "Free runtime", revisit: "When needs change", status: "proposed", date: "2026-10-22", revisitOn: "" };
async function fixture(t: TestContext, fetcher: typeof fetch = async () => { throw Error("Manual flow must not call a model"); }) {
  const root = await mkdtemp(join(tmpdir(), "thread-records-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const folder of ["Projects/Demo", "Projects/Private", "Sources"]) await mkdir(join(vault, folder), { recursive: true }); await mkdir(profile);
  const put = (path: string, text: string) => writeFile(join(vault, path), text);
  const original = frontmatter({ type: "project", id: "demo" }) + "## Objective\nCompare a local workflow.\n## Open questions\nWhich model works?\n";
  await put("Projects/Demo/Overview.md", original); await put("Sources/Research.md", "## Cost\nThe local workflow has no API fee.\n"); await put("Projects/Private/Secret.md", "Private secret");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Sources"], excluded: ["Projects/Private"] }, info.revision);
  const index = new EvidenceIndex(reader), projects = new DesktopProjects(reader, index), storage = new DesktopStorage(reader, profile), changes = new DesktopChanges(reader, storage);
  await storage.initialize(info.revision); const compatibility = await storage.inspect(".obsidian", info.revision); await storage.enable(compatibility.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.projects = "Projects"; await storage.savePreferences(preferences, info.revision);
  const ai = new DesktopAI(projects, index, fetcher), records = new DesktopRecords(reader, index, projects, storage, changes, ai), selection = { folder: "Projects", project: "Projects/Demo" };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  const load = () => records.load(selection, info.revision), read = (path: string) => readFile(join(vault, path), "utf8");
  const apply = async () => { const batch = changes.snapshot(info.revision).pending!, preview = await changes.preview("apply", batch.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  return { root, vault, put, read, reader, info, index, projects, storage, changes, records, ai, selection, load, apply, original };
}

test("desktop records create explicit proposed/accepted decisions without writes before exact Apply and refuse collisions", async t => {
  const f = await fixture(t), snapshot = await f.load(); assert.ok(!JSON.stringify(snapshot).includes("Secret"));
  const command: RecordCommand = { kind: "decision", name: "Local choice", decision: fields, sources: ["Sources/Research.md"] };
  await f.records.prepare(snapshot.id, command, f.info.revision);
  await assert.rejects(f.read("Projects/Demo/Decisions/Local choice.md"), { code: "ENOENT" });
  const preview = await f.apply(), text = await f.read(preview.operations[0]!.path); assert.equal(metadata(text).status, "proposed"); assert.equal(metadata(text).project, "demo"); assert.match(text, /Offline access/);
  let next = await f.load(); await assert.rejects(f.records.prepare(next.id, command, f.info.revision), /Target changed/); assert.equal(await f.read(preview.operations[0]!.path), text);
  next = await f.load(); await f.records.prepare(next.id, { ...command, name: "Accepted choice", decision: { ...fields, status: "accepted" } }, f.info.revision); await f.apply();
  assert.equal(metadata(await f.read("Projects/Demo/Decisions/Accepted choice.md")).status, "accepted"); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});

test("question investigation, recorded answer and reopening preserve every previous event and original legacy note", async t => {
  const f = await fixture(t); let snapshot = await f.load(); assert.equal(snapshot.legacy.length, 1);
  await f.records.prepare(snapshot.id, { kind: "question", name: "Model", question: snapshot.legacy[0]!.text, day: "2026-10-22", sources: [], legacy: 0 }, f.info.revision);
  await f.apply(); const path = "Projects/Demo/Questions/Model.md", original = await f.read(path); assert.equal(metadata(original).status, "open");
  for (const [status, answer, reason] of [["investigating", "Try local models", "Begin comparison"], ["answered", "Model A meets the test", "Observed local result"], ["open", "", "New constraint reopens this"]] as const) {
    snapshot = await f.load(); await f.records.prepare(snapshot.id, { kind: "question-update", path, update: { status, answer, reason, day: "2026-10-22" }, sources: ["Sources/Research.md"] }, f.info.revision);
    const before = await f.read(path); await f.apply(); const after = await f.read(path); assert.equal(metadata(after).status, status); assert.match(after, new RegExp(reason)); assert.ok(after.includes(before.slice(before.indexOf("# Project question"))));
  }
  const final = await f.read(path); assert.match(final, /Model A meets the test/); assert.match(final, /answered to open/); assert.match(final, /open to investigating/); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});

test("records reject untrusted shapes, stale evidence, revoked scope and canceled delayed reads", async t => {
  const f = await fixture(t); let snapshot = await f.load();
  const command = { kind: "decision", name: "No write", decision: fields, sources: [] };
  for (const input of [{ ...command, extra: true }, { ...command, decision: { ...fields, status: ["accepted"] } }, { ...command, sources: ["Projects/Private/Secret.md"] }, { ...command, name: "../Escape" }, { kind: "question", name: "Invalid", question: "?", day: "2026-02-31", sources: [], legacy: null }]) await assert.rejects(f.records.prepare(snapshot.id, input, f.info.revision));
  await f.put("Sources/Research.md", "changed current source"); await assert.rejects(f.records.prepare(snapshot.id, { ...command, sources: ["Sources/Research.md"] }, f.info.revision), /changed/);
  snapshot = await f.load(); const originalRead = f.reader.read.bind(f.reader); let blocked!: () => void, release!: () => void;
  const entered = new Promise<void>(r => { blocked = r; }), gate = new Promise<void>(r => { release = r; });
  f.reader.read = async (...args) => { const note = await originalRead(...args); blocked(); await gate; return note; };
  const pending = f.records.prepare(snapshot.id, { ...command, sources: ["Sources/Research.md"] }, f.info.revision); await entered; f.records.invalidate(); release(); await assert.rejects(pending, /changed|canceled/); f.reader.read = originalRead;
  assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  snapshot = await f.load(); f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset();
  await assert.rejects(f.records.prepare(snapshot.id, command, f.info.revision)); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});

test("duplicate question identities and unsupported metadata block updates without altering history", async t => {
  const f = await fixture(t); let snapshot = await f.load();
  await f.records.prepare(snapshot.id, { kind: "question", name: "Identity", question: "What changed?", day: "2026-10-22", sources: [], legacy: null }, f.info.revision); await f.apply();
  const path = "Projects/Demo/Questions/Identity.md", before = await f.read(path); await f.put("Projects/Demo/Duplicate.md", before);
  snapshot = await f.load(); const command = { kind: "question-update", path, update: { status: "answered", answer: "Answer", reason: "Reason", day: "2026-10-22" }, sources: [] };
  await assert.rejects(f.records.prepare(snapshot.id, command, f.info.revision), /ambiguous/); assert.equal(await f.read(path), before);
  await f.put("Projects/Demo/Duplicate.md", "Ordinary note without duplicate ID"); await f.put(path, before.replace('thread_question_version: "1"', 'thread_question_version: "99"'));
  snapshot = await f.load(); await assert.rejects(f.records.prepare(snapshot.id, command, f.info.revision), /unsupported/);
  assert.equal(f.changes.snapshot(f.info.revision).pending, null);
});

function provider() {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname; calls.push(path);
    if (path === "/api/status") return Response.json({ cloud: { disabled: true } });
    if (path === "/api/tags") return Response.json({ models: [{ name: "text:local", digest: "a".repeat(64) }] });
    if (path === "/api/show") return Response.json({ capabilities: ["completion"], model_info: { architecture: "fixture" } });
    const body = JSON.parse(String(options!.body)), prompt = JSON.parse(body.messages.find((m: { role: string }) => m.role === "user").content);
    const source = prompt.evidence.find((s: { path: string }) => s.path === "Sources/Research.md"); assert.ok(source);
    return Response.json({ message: { content: JSON.stringify({ supported: true, answer: [{ kind: "fact", text: "The local workflow has no API fee.", sourceIds: [source.id] }], gaps: ["The selected notes do not establish quality."] }) } });
  };
  return { calls, fetcher };
}
async function seedDecision(f: Awaited<ReturnType<typeof fixture>>) {
  const snapshot = await f.load(); await f.records.prepare(snapshot.id, { kind: "decision", name: "Original", decision: { ...fields, status: "accepted" }, sources: [] }, f.info.revision); await f.apply();
  f.ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" }); return "Projects/Demo/Decisions/Original.md";
}

test("decision observations never accept choices; explicit retain/annotate/supersede preserve old reasoning and require exact review", async t => {
  const p = provider(), f = await fixture(t, p.fetcher), path = await seedDecision(f), original = await f.read(path);
  for (const action of ["retain", "annotate", "supersede"] as const) {
    const snapshot = await f.load(), assessment = await f.records.assess(snapshot.id, path, ["Sources/Research.md"], f.info.revision);
    assert.equal(assessment.answer.answer[0]!.kind, "interpretation"); assert.ok(assessment.answer.gaps.length); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
    f.records.draftChanged(true);
    const before = await f.read(path);
    const command = { kind: "decision-review", assessment: assessment.id, action, reason: `Explicit ${action} reasoning`, name: "Replacement", replacement: { ...fields, choice: "Revised local option", status: "accepted" } };
    await f.records.prepare(snapshot.id, command, f.info.revision); assert.equal(await f.read(path), before);
    const preview = await f.apply(), after = await f.read(path); assert.match(after, new RegExp(`Explicit ${action} reasoning`)); assert.match(after, /Offline access/); assert.match(after, /interpretations/);
    assert.equal(preview.operations.length, action === "supersede" ? 2 : 1);
    if (action === "supersede") {
      assert.equal(metadata(after).status, "superseded"); const replacement = await f.read("Projects/Demo/Decisions/Replacement.md"); assert.equal(metadata(replacement).status, "accepted"); assert.match(replacement, /Revised local option/);
      const last = f.changes.snapshot(f.info.revision).history.at(-1)!, undo = await f.changes.preview("undo", last.id, f.info.revision); await f.changes.confirm(undo.id, f.info.revision);
      assert.equal(await f.read(path), before); await assert.rejects(f.read("Projects/Demo/Decisions/Replacement.md"), { code: "ENOENT" });
    } else assert.equal(metadata(after).status, "accepted");
  }
  assert.ok((await f.read(path)).includes(original)); assert.equal(p.calls.filter(path => path === "/api/chat").length, 3);
});

test("decision assessment checks dependencies before model context and rejects late canceled/revoked/stale/model-changed results", async t => {
  const p = provider(); let onShow: (() => Promise<void>) | null = null;
  const f = await fixture(t, async (...args) => { const response = await p.fetcher(...args); if (String(args[0]).endsWith("/api/show")) await onShow?.(); return response; });
  const path = await seedDecision(f), snapshot = await f.load(); onShow = () => f.put("Sources/Research.md", "Changed before model context");
  await assert.rejects(f.records.assess(snapshot.id, path, ["Sources/Research.md"], f.info.revision), /changed/); assert.ok(!p.calls.includes("/api/chat"));
  for (const cause of ["cancel", "edit", "revoke", "model"] as const) {
    let entered!: () => void, release!: () => void; const start = new Promise<void>(r => { entered = r; }), gate = new Promise<void>(r => { release = r; }), local = provider();
    const child = await fixture(t, async (...args) => { if (String(args[0]).endsWith("/api/chat")) { entered(); await gate; } return local.fetcher(...args); });
    const target = await seedDecision(child), loaded = await child.load();
    const result = child.records.assess(loaded.id, target, ["Sources/Research.md"], child.info.revision), rejected = assert.rejects(result); await start;
    if (cause === "cancel") child.records.draftChanged(false);
    if (cause === "edit") await child.put("Sources/Research.md", "Changed while inference ran");
    if (cause === "revoke") { child.reader.grant({ roots: [], excluded: [] }, child.info.revision); child.index.reset(); }
    if (cause === "model") child.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    release(); await rejected; assert.equal(child.storage.changeState(child.reader.getInfo()!.revision).pending, null);
  }
});

test("supersession refuses replacement collision, forged assessment and non-explicit acceptance; model absence keeps manual records usable", async t => {
  const f = await fixture(t, provider().fetcher), path = await seedDecision(f), snapshot = await f.load(), before = await f.read(path);
  const assessment = await f.records.assess(snapshot.id, path, ["Sources/Research.md"], f.info.revision);
  const command = { kind: "decision-review", assessment: assessment.id, action: "supersede", reason: "Changed constraints", name: "Original", replacement: { ...fields, status: "accepted" } };
  await assert.rejects(f.records.prepare(snapshot.id, { ...command, assessment: "forged" }, f.info.revision), /assessment changed/);
  await assert.rejects(f.records.prepare(snapshot.id, { ...command, replacement: fields }, f.info.revision), /Explicitly accept/);
  await assert.rejects(f.records.prepare(snapshot.id, command, f.info.revision), /distinct/);
  await f.put("Projects/Demo/Decisions/Foreign.md", "Do not overwrite"); const next = await f.load(), renewed = await f.records.assess(next.id, path, ["Sources/Research.md"], f.info.revision);
  await assert.rejects(f.records.prepare(next.id, { ...command, assessment: renewed.id, name: "Foreign" }, f.info.revision), /Target changed/);
  assert.equal(await f.read("Projects/Demo/Decisions/Foreign.md"), "Do not overwrite"); assert.equal(await f.read(path), before);
  f.ai.configure({ endpoint: "http://localhost:11434", model: "" }); await assert.rejects(f.records.assess(next.id, path, ["Sources/Research.md"], f.info.revision), /downloaded local text model/);
  await f.records.prepare(next.id, { kind: "question", name: "Offline", question: "What now?", day: "2026-10-22", sources: [], legacy: null }, f.info.revision); await f.apply(); assert.equal(metadata(await f.read("Projects/Demo/Questions/Offline.md")).status, "open");
});

test("idle records invalidation does not revoke a separately reviewed change capability", async t => {
  const f = await fixture(t), snapshot = await f.load();
  await f.records.prepare(snapshot.id, { kind: "question", name: "Independent review", question: "What now?", day: "2026-10-22", sources: [], legacy: null }, f.info.revision);
  const pending = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", pending.id, f.info.revision);
  f.records.invalidate(); await f.changes.confirm(preview.id, f.info.revision);
  assert.equal(metadata(await f.read("Projects/Demo/Questions/Independent review.md")).status, "open");
});
