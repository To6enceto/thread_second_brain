import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { VaultWriter } from "./vault-writer.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopKnowledge } from "./knowledge.ts";
import { metadata } from "./metadata.ts";
import { MAX_CONTEXT } from "../vault/evidence.ts";
const selection = { folder: "Projects", project: "Projects/Demo" }, command = { name: "Local research", type: "concept", focus: "Explain the local budget", sources: ["Sources/Research.md"], existing: "", link: "" };
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-knowledge-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const path of ["Projects/Demo", "Knowledge", "Sources", "Private"]) await mkdir(join(vault, path), { recursive: true }); await mkdir(profile);
  const original = '\uFEFF---\r\ntype: concept\r\naliases: [Research]\r\ncustom: preserved\r\n---\r\n# Existing\r\nPrior body with exact CRLF.\r\n', project = '---\ntype: project\nid: demo\n---\n## Objective\nKeep local research.', source = '---\nid: source\ntype: source\n---\n## Budget\nLocal research budget is 20 euros.';
  const put = (path: string, raw: string) => writeFile(join(vault, path), raw), read = (path: string) => readFile(join(vault, path), "utf8"); await put("Knowledge/Existing.md", original); await put("Projects/Demo/Overview.md", project); await put("Sources/Research.md", source); await put("Private/Secret.md", "PRIVATE_CANARY");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Sources", "Knowledge"], excluded: ["Private"] }, info.revision);
  const evidence = new EvidenceIndex(reader), projects = new DesktopProjects(reader, evidence), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision); const compat = await storage.inspect(".obsidian", info.revision); await storage.enable(compat.id, info.revision); const prefs = storage.status(info.revision).preferences; Object.assign(prefs.roles, { projects: "Projects", sources: "Sources", knowledge: "Knowledge" }); await storage.savePreferences(prefs, info.revision);
  const calls: { path: string; body: Record<string, unknown> }[] = []; let hook: ((path: string) => Promise<Response | void>) | undefined;
  const ai = new DesktopAI(projects, evidence, async (input, init) => { const path = new URL(String(input)).pathname, body = init?.body ? JSON.parse(String(init.body)) : {}; calls.push({ path, body }); const override = await hook?.(path); if (override) return override;
    if (path === "/api/status") return new Response(JSON.stringify({ cloud: { disabled: true } }));
    if (path === "/api/tags") return new Response(JSON.stringify({ models: [{ name: "text:local", digest: "a".repeat(64) }] }));
    if (path === "/api/show") return new Response(JSON.stringify({ capabilities: ["completion"], model_info: { architecture: "fixture" } }));
    const prompt = JSON.parse(body.messages[1].content); return new Response(JSON.stringify({ message: { content: JSON.stringify({ supported: true, answer: [{ text: prompt.evidence[0].excerpt.slice(0, 240), kind: "fact", sourceIds: [prompt.evidence[0].id] }], gaps: [] }) } }));
  }, 5000); ai.configure({ endpoint: "http://localhost:11434", model: "text:local" });
  const changes = new DesktopChanges(reader, storage), knowledge = new DesktopKnowledge(reader, evidence, projects, storage, changes, ai), load = () => knowledge.load(selection, info.revision);
  const apply = async () => { const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); }); return { root, vault, reader, info, evidence, projects, storage, changes, knowledge, ai, calls, load, apply, put, read, original, project, source, hook(fn: typeof hook) { hook = fn; } };
}
test("knowledge creates a cited concept and explicit project link only after exact review; Undo preserves all original bytes", async t => {
  const f = await fixture(t), snapshot = await f.load(), draft = await f.knowledge.generate(snapshot.id, { ...command, link: "Projects/Demo/Overview.md" }, f.info.revision); assert.equal(draft.operations.length, 2); assert.equal(f.changes.snapshot(f.info.revision).pending, null); await assert.rejects(f.read("Knowledge/Local research.md"), { code: "ENOENT" }); assert.equal(await f.read("Projects/Demo/Overview.md"), f.project);
  const expected = structuredClone(draft.operations); draft.operations[0]!.after = "FORGED_RENDERER"; await f.knowledge.prepare(draft.id, f.info.revision); const preview = await f.apply(); for (const operation of expected) { assert.equal(await f.read(operation.path), operation.after); assert.equal(preview.operations.find(op => op.path === operation.path)!.after, operation.after); }
  assert.equal(metadata(expected[0]!.after).type, "concept"); assert.match(expected[1]!.after, /Local%20research.md/); assert.equal(await f.read("Sources/Research.md"), f.source);
  const undo = await f.changes.preview("undo", f.changes.snapshot(f.info.revision).history[0]!.id, f.info.revision); assert.equal(undo.ready, true); await f.changes.confirm(undo.id, f.info.revision); assert.equal(await f.read("Projects/Demo/Overview.md"), f.project); await assert.rejects(f.read("Knowledge/Local research.md"), { code: "ENOENT" });
});
test("knowledge append preserves BOM, CRLF, properties and old text; Undo refuses newer edits", async t => {
  const f = await fixture(t), snapshot = await f.load(), draft = await f.knowledge.generate(snapshot.id, { ...command, type: "comparison", existing: "Knowledge/Existing.md" }, f.info.revision); assert.equal(draft.operations[0]!.before, f.original); assert.ok(draft.operations[0]!.after.startsWith(f.original)); assert.equal(metadata(draft.operations[0]!.after).custom, "preserved"); await f.knowledge.prepare(draft.id, f.info.revision); await f.apply();
  const applied = await f.read("Knowledge/Existing.md"); assert.equal(applied, draft.operations[0]!.after); const undo = await f.changes.preview("undo", f.changes.snapshot(f.info.revision).history[0]!.id, f.info.revision); await f.put("Knowledge/Existing.md", applied + "External addition\n"); await assert.rejects(f.changes.confirm(undo.id, f.info.revision), /changed|conflict/i); assert.equal(await f.read("Knowledge/Existing.md"), applied + "External addition\n");
});
test("target and source eligibility, collisions, self-reference and managed records are rejected before model transmission", async t => {
  const f = await fixture(t); await f.put("Knowledge/Source.md", '---\ntype: source\n---\nOriginal'); await f.put("Knowledge/Managed.md", '---\nthread_capture_kind: thought\n---\nManaged'); const snapshot = await f.load(); assert.ok(!snapshot.destinations.includes("Knowledge/Source.md"));
  for (const input of [{ ...command, sources: ["Private/Secret.md"] }, { ...command, sources: [command.sources[0], command.sources[0]] }, { ...command, sources: Array.from({ length: 6 }, (_, n) => `${n}.md`) }, { ...command, name: "../Escape" }, { ...command, type: "other" }, { ...command, name: "Existing" }, { ...command, existing: "Knowledge/Source.md" }, { ...command, existing: "Knowledge/Managed.md" }, { ...command, existing: "Knowledge/Existing.md", sources: ["Knowledge/Existing.md"] }, { ...command, link: "Projects/Demo/Overview.md", sources: ["Projects/Demo/Overview.md"] }, { ...command, arbitrary: true }]) await assert.rejects(f.knowledge.generate(snapshot.id, input, f.info.revision));
  assert.equal(f.calls.length, 0); assert.equal(f.changes.snapshot(f.info.revision).pending, null); assert.equal(await f.read("Knowledge/Existing.md"), f.original);
});
test("knowledge hashes and target identities are revalidated before transmission, proposal and Apply", async t => {
  const f = await fixture(t); let snapshot = await f.load(); f.hook(async path => { if (path === "/api/status") await f.put("Sources/Research.md", f.source + "External source edit"); }); await assert.rejects(f.knowledge.generate(snapshot.id, command, f.info.revision), /changed|Refresh/); assert.ok(!f.calls.some(call => call.path === "/api/chat")); f.hook(undefined);
  snapshot = await f.load(); let draft = await f.knowledge.generate(snapshot.id, { ...command, existing: "Knowledge/Existing.md" }, f.info.revision); await f.put("Knowledge/Existing.md", f.original + "External target edit"); await assert.rejects(f.knowledge.prepare(draft.id, f.info.revision), /changed|Refresh/); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  snapshot = await f.load(); draft = await f.knowledge.generate(snapshot.id, { ...command, existing: "Knowledge/Existing.md" }, f.info.revision); await f.knowledge.prepare(draft.id, f.info.revision); const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); await f.put("Sources/Research.md", f.source + "A newer source edit"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed|stale|conflict/i); assert.equal(await f.read("Knowledge/Existing.md"), f.original + "External target edit");
});
test("knowledge cancellation, input/model changes and permission revocation reject late responses and do not leave proposals", async t => {
  const f = await fixture(t);
  for (const cancel of [() => f.knowledge.draftChanged(), () => f.ai.configure({ endpoint: "http://localhost:11434", model: "text:local" }), () => { f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.evidence.reset(); f.knowledge.invalidate(); }]) {
    const snapshot = await f.load(); let release!: () => void, enter!: () => void; const entered = new Promise<void>(r => { enter = r; }), held = new Promise<void>(r => { release = r; }); f.hook(async path => { if (path === "/api/chat") { enter(); await held; } });
    const work = f.knowledge.generate(snapshot.id, command, f.info.revision), refused = assert.rejects(work, /canceled|changed/i); await entered; cancel(); release(); await refused; await assert.rejects(f.read("Knowledge/Local research.md"), { code: "ENOENT" });
  }
});
test("knowledge uses bounded explicit context and rejects unsupported answers without a pending change", async t => {
  const f = await fixture(t); for (let n = 0; n < 5; n++) await f.put(`Sources/Long${n}.md`, `## Long\n${String(n).repeat(18000)}\n`);
  const snapshot = await f.load(), draft = await f.knowledge.generate(snapshot.id, { ...command, sources: Array.from({ length: 5 }, (_, n) => `Sources/Long${n}.md`) }, f.info.revision); assert.ok(draft.bundle.truncated); assert.ok(draft.bundle.sources.reduce((size, s) => size + JSON.stringify(s).length + 2, 0) <= MAX_CONTEXT);
  f.hook(async path => path === "/api/chat" ? new Response(JSON.stringify({ message: { content: JSON.stringify({ supported: false, answer: [], gaps: ["Insufficient evidence"] }) } })) : undefined); await assert.rejects(f.knowledge.generate(snapshot.id, command, f.info.revision), /Insufficient evidence/); assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  f.ai.configure({ endpoint: "http://localhost:11434", model: "" }); await assert.rejects(f.knowledge.generate(snapshot.id, command, f.info.revision), /downloaded/);
});
test("interrupted knowledge append keeps durable recovery and restores known writes through explicit review", async t => {
  const f = await fixture(t), snapshot = await f.load(), draft = await f.knowledge.generate(snapshot.id, { ...command, existing: "Knowledge/Existing.md", link: "Projects/Demo/Overview.md" }, f.info.revision); await f.knowledge.prepare(draft.id, f.info.revision); const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision), replace = VaultWriter.prototype.replace;
  const mocked = t.mock.method(VaultWriter.prototype, "replace", async function (this: VaultWriter, ...args: Parameters<VaultWriter["replace"]>) { await replace.apply(this, args); f.changes.invalidate(); throw Error("Controlled synthetic interruption after append"); });
  await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /recovery|backups/); mocked.mock.restore(); assert.equal(await f.read("Knowledge/Existing.md"), draft.operations[0]!.after); assert.equal(await f.read("Projects/Demo/Overview.md"), f.project); const recovery = f.changes.snapshot(f.info.revision).recovery; assert.ok(recovery);
  const restored = await f.changes.preview("recover", recovery.id, f.info.revision); assert.equal(restored.ready, true); await f.changes.confirm(restored.id, f.info.revision); assert.equal(await f.read("Knowledge/Existing.md"), f.original); assert.equal(await f.read("Projects/Demo/Overview.md"), f.project); assert.equal(f.changes.snapshot(f.info.revision).recovery, null);
});
