import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesktopAsk } from "./ask.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopProjects } from "./projects.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { VaultReader } from "./vault-reader.ts";
import type { AskRequest } from "./contracts.ts";

const options: AskRequest = { question: "orchid budget", selection: { folder: "Projects", project: "Projects/Demo" }, scope: "project", filters: {}, method: "keyword", embeddingModel: "", level: "standard" };
function provider() {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let hook: ((path: string, body: Record<string, unknown>) => Promise<Response | void>) | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname, body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ path, body }); const override = await hook?.(path, body); if (override) return override;
    let data: unknown;
    if (path === "/api/status") data = { cloud: { disabled: true } };
    else if (path === "/api/tags") data = { models: ["text:local", "embed:local"].map(name => ({ name, digest: "a".repeat(64) })) };
    else if (path === "/api/show") data = { capabilities: [body.model === "embed:local" ? "embedding" : "completion"], model_info: { architecture: "fixture" } };
    else if (path === "/api/embed") data = { model: "embed:local", embeddings: (body.input as string[]).map(() => [1, 0, 0]) };
    else if (path === "/api/chat") {
      const prompt = JSON.parse((body.messages as { content: string }[])[1]!.content);
      data = { message: { content: JSON.stringify({ supported: true, answer: [{ text: prompt.evidence[0].excerpt, kind: "fact", sourceIds: [prompt.evidence[0].id] }], gaps: [] }) } };
    }
    return new Response(JSON.stringify(data));
  };
  return { calls, fetcher, hook(fn: typeof hook) { hook = fn; } };
}
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-ask-")); t.after(() => rm(root, { recursive: true, force: true }));
  const notes = {
    "Projects/Demo/Overview.md": "---\ntype: project\nid: demo\n---\n## Budget\nOrchid budget is 20 euros.\n## Constraints\nLive voice is postponed.",
    "Projects/Demo/Decision.md": "---\ntype: decision\nstatus: proposed\ncreated: 2026-10-21\n---\n## Choice\nProposed orchid budget is 30 euros.",
    "Projects/Other/Overview.md": "---\ntype: project\n---\n## Objective\nOther orchid budget is 90 euros.",
    "Projects/Private/Secret.md": "Orchid budget secret 999 euros.",
  };
  for (const [path, text] of Object.entries(notes)) { await mkdir(join(root, path, ".."), { recursive: true }); await writeFile(join(root, path), text); }
  const reader = new VaultReader(); let ai: DesktopAI | undefined, ask: DesktopAsk | undefined;
  const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") { ai?.forget(); ask?.forget(); } });
  let info = await reader.select(root); info = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision);
  const projects = new DesktopProjects(reader, evidence), p = provider();
  ai = new DesktopAI(projects, evidence, p.fetcher, 5000); ask = new DesktopAsk(reader, evidence, projects, ai);
  await evidence.refresh(info.revision);
  return { reader, evidence, projects, ai, ask, info, root, p, notes, configure: () => ai!.configure({ endpoint: "http://localhost:11434", model: "text:local" }) };
}

test("desktop Ask keyword scope, filters and omissions work without AI and cannot expand grants", async t => {
  const f = await fixture(t), before = f.reader.getInfo();
  const project = await f.ask.retrieve(options, f.info.revision);
  assert.ok(project.bundle.sources.length); assert.ok(project.bundle.sources.every(s => s.path.startsWith("Projects/Demo/")));
  const all = await f.ask.retrieve({ ...options, scope: "vault" }, f.info.revision);
  assert.ok(all.bundle.sources.some(s => s.path.startsWith("Projects/Other/")));
  assert.ok(all.bundle.sources.every(s => !s.path.startsWith("Projects/Private/") && !s.excerpt.includes("Orchid budget secret 999 euros.")));
  assert.ok(all.index.listing.paths.every(path => !path.startsWith("Projects/Private/")));
  const filtered = await f.ask.retrieve({ ...options, filters: { type: "decision", status: "proposed", path: "Projects/Demo", from: "2026-10-20", through: "2026-10-22" } }, f.info.revision);
  assert.equal(filtered.bundle.sources.length, 1); assert.equal(filtered.bundle.sources[0]!.noteStatus, "proposed");
  assert.equal(f.p.calls.length, 0); assert.deepEqual(f.reader.getInfo(), before);
  for (const patch of [{ question: "" }, { question: "x".repeat(1001) }, { method: "cloud" }, { filters: { path: "../Secret" } }, { filters: { from: "2026-02-30" } }, { filters: { type: 3 } }, { level: "unlimited" }, { embeddingModel: "foo:cloud" }, { selection: { folder: "Projects", project: "Projects/Private" } }]) await assert.rejects(f.ask.retrieve({ ...options, ...patch }, f.info.revision));
});

test("desktop exact contexts bind current passage choices and exclude text from the main-owned prompt", async t => {
  const f = await fixture(t); f.configure(); const result = await f.ask.retrieve(options, f.info.revision);
  const [excluded, pinned] = result.bundle.sources; assert.ok(excluded && pinned);
  for (const choices of [{ X9: "pin" }, { [excluded.id]: "other" }]) await assert.rejects(f.ask.choose(result.id, choices, f.info.revision));
  await assert.rejects(f.ask.choose("forged", {}, f.info.revision));
  const first = await f.ask.choose(result.id, {}, f.info.revision);
  const selected = await f.ask.choose(result.id, { [excluded.id]: "exclude", [pinned.id]: "pin" }, f.info.revision);
  assert.equal(selected.bundle.sources[0]!.id, pinned.id); assert.ok(!selected.bundle.sources.some(s => s.id === excluded.id));
  await assert.rejects(f.ask.generate(first.id, f.info.revision), /context changed/);
  // A renderer-side mutation must not change the main-owned prompt.
  selected.bundle.sources[0]!.excerpt = "forged renderer text";
  const answer = await f.ask.generate(selected.id, f.info.revision); assert.equal(answer.answer.supported, true);
  const chat = f.p.calls.find(c => c.path === "/api/chat")!;
  const prompt = JSON.parse((chat.body.messages as { content: string }[])[1]!.content);
  assert.equal(prompt.question, options.question); assert.equal(prompt.evidence[0].excerpt, pinned.excerpt);
  assert.ok(!JSON.stringify(prompt).includes(excluded.excerpt)); assert.ok(!JSON.stringify(prompt).includes("forged renderer"));
  const empty = await f.ask.choose(result.id, Object.fromEntries(result.bundle.sources.map(s => [s.id, "exclude"])), f.info.revision);
  await assert.rejects(f.ask.generate(empty.id, f.info.revision), /Include at least/);
});

test("desktop hybrid sends only scoped filtered current candidates and discloses keyword fallback", async t => {
  const f = await fixture(t);
  const hybrid = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local", filters: { type: "decision" }, level: "broader" }, f.info.revision);
  assert.equal(hybrid.bundle.hybridCoverage?.mode, "hybrid"); assert.equal(hybrid.bundle.searchCoverage?.level, "broader");
  const sent = f.p.calls.filter(c => c.path === "/api/embed").flatMap(c => c.body.input as string[]).join(" ");
  assert.match(sent, /30 euros/); assert.ok(!/999|90 euros|20 euros/.test(sent));
  const missing = await f.ask.retrieve({ ...options, method: "hybrid" }, f.info.revision);
  assert.equal(missing.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(missing.bundle.sources.length);
  f.p.hook(async path => path === "/api/embed" ? new Response("private body", { status: 503 }) : undefined);
  const failed = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision);
  assert.equal(failed.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(!JSON.stringify(failed).includes("private body"));
  f.p.hook(async path => path === "/api/embed" ? new Response("private invalid provider body") : undefined);
  const malformed = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision);
  assert.equal(malformed.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(!JSON.stringify(malformed).includes("private invalid"));
});

test("desktop Ask rechecks external edits after model metadata and before any evidence transmission", async t => {
  for (const mode of ["chat", "embed"] as const) {
    const f = await fixture(t); f.configure();
    const found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
    f.p.hook(async path => { if (path === "/api/show") await writeFile(join(f.root, "Projects/Demo/Overview.md"), "Changed externally."); });
    await assert.rejects(mode === "chat" ? f.ask.generate(chosen.id, f.info.revision) : f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision));
    assert.ok(!f.p.calls.some(c => c.path === "/api/chat" || c.path === "/api/embed"));
  }
});

test("desktop Ask suppresses replies after cancel, model change, source edit, choices and access revocation", async t => {
  for (const change of ["cancel", "model", "edit", "choices", "revoke"] as const) {
    const f = await fixture(t); f.configure(); const found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
    let entered!: () => void, release!: () => void;
    const atChat = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    f.p.hook(async path => { if (path === "/api/chat") { entered(); await gate; } });
    const run = f.ask.generate(chosen.id, f.info.revision), rejected = assert.rejects(run); await atChat;
    if (change === "cancel") f.ai.cancel();
    if (change === "model") f.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    if (change === "edit") await writeFile(join(f.root, "Projects/Demo/Overview.md"), "Changed externally.");
    if (change === "choices") await f.ask.choose(found.id, { [found.bundle.sources[0]!.id]: "exclude" }, f.info.revision);
    if (change === "revoke") { f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.ask.forget(); f.evidence.reset(); }
    release(); await rejected;
    if (change === "cancel") { f.p.hook(undefined); assert.equal((await f.ask.generate(chosen.id, f.info.revision)).answer.supported, true); }
  }
});

test("desktop Ask invalid citations/malformed answers fail safely and missing text model leaves retrieval usable", async t => {
  const f = await fixture(t); let found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
  await assert.rejects(f.ask.generate(chosen.id, f.info.revision), /downloaded text model/);
  f.configure(); await assert.rejects(f.ask.choose(found.id, {}, f.info.revision), /context changed/);
  found = await f.ask.retrieve(options, f.info.revision); chosen = await f.ask.choose(found.id, {}, f.info.revision);
  f.p.hook(async path => path === "/api/chat" ? new Response(JSON.stringify({ message: { content: JSON.stringify({ supported: true, answer: [{ text: "Made up", kind: "fact", sourceIds: ["X99"] }], gaps: [] }) } })) : undefined);
  const result = await f.ask.generate(chosen.id, f.info.revision); assert.equal(result.answer.supported, false); assert.deepEqual(result.answer.answer, []);
  f.p.hook(async path => path === "/api/chat" ? new Response(JSON.stringify({ message: { content: "private invalid output" } })) : undefined);
  await assert.rejects(f.ask.generate(chosen.id, f.info.revision), error => error instanceof Error && /invalid JSON/.test(error.message) && !error.message.includes("private"));
});

test("desktop IPC rejects non-string scope, method, budget and evidence choice enums without coercion", async t => {
  const f = await fixture(t);
  for (const [key, valid] of [["scope", "project"], ["method", "keyword"], ["level", "standard"]]) {
    for (const invalid of [[valid], { value: valid }, null, 1, true]) {
      await assert.rejects(f.ask.retrieve({ ...options, [key!]: invalid, selection: { folder: "Projects", project: "" } }, f.info.revision), /Review the question/);
    }
  }
  const found = await f.ask.retrieve(options, f.info.revision), id = found.bundle.sources[0]!.id;
  for (const valid of ["include", "exclude", "pin"]) {
    for (const invalid of [[valid], { value: valid }, null, 1, true]) await assert.rejects(f.ask.choose(found.id, { [id]: invalid }, f.info.revision), /Invalid evidence choices/);
  }
  const excluded = await f.ask.choose(found.id, { [id]: "exclude" }, f.info.revision);
  assert.ok(!excluded.bundle.sources.some(source => source.id === id));
  assert.equal(f.p.calls.length, 0);
});
