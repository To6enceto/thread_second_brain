import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesktopAI } from "./local-ai.ts";
import { DesktopProjects } from "./projects.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { VaultReader } from "./vault-reader.ts";
import { SECTION_KEYS } from "../intelligence/briefing.ts";

const digest = "a".repeat(64);
const details = { capabilities: ["completion"], model_info: { architecture: "fixture" } };
function provider(chat?: (body: Record<string, unknown>) => Promise<unknown>, show = details) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname, body = options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ path, body });
    const data = path === "/api/status" ? { cloud: { disabled: true } } : path === "/api/tags" ? { models: [{ name: "text:local", digest }] } : path === "/api/show" ? show : await chat?.(body);
    return new Response(JSON.stringify(data));
  };
  return { calls, fetcher };
}
async function fixture(t: TestContext, fetcher: typeof fetch, timeout = 1000) {
  const root = await mkdtemp(join(tmpdir(), "thread-ai-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "Projects/Demo"), { recursive: true });
  const path = join(root, "Projects/Demo/Overview.md"), text = "---\ntype: project\nid: demo\n---\n## Objective\nCompare orchids locally.";
  await writeFile(path, text);
  const reader = new VaultReader(); let ai: DesktopAI | undefined;
  const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") ai?.forget(); });
  let info = await reader.select(root); info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  const projects = new DesktopProjects(reader, evidence); ai = new DesktopAI(projects, evidence, fetcher, timeout);
  await evidence.refresh(info.revision);
  ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" });
  const prepared = await ai.prepare({ folder: "Projects", project: "Projects/Demo" }, info.revision);
  return { root, path, text, reader, evidence, projects, ai, info, prepared };
}
const output = () => ({ message: { content: JSON.stringify({ ...Object.fromEntries(SECTION_KEYS.map(k => [k, k === "objective" ? [{ text: "A local orchid comparison is planned.", kind: "interpretation", sourceIds: ["S1"] }] : []])), gaps: [] }) } });

test("desktop model setup is metadata-only, validates loopback/config and never grants read access", async t => {
  const p = provider(), f = await fixture(t, p.fetcher), scope = f.reader.getInfo();
  const found = await f.ai.discover("http://localhost:11434"); assert.equal(found.models[0]!.completion, true);
  assert.match(await f.ai.check(), /cloud features disabled/);
  assert.ok(p.calls.every(c => ["/api/status", "/api/tags", "/api/show"].includes(c.path)));
  assert.deepEqual(f.reader.getInfo(), scope);
  for (const url of ["https://example.com", "http://127.0.0.1/path", "http://user@localhost", "file:///tmp/x"]) await assert.rejects(f.ai.discover(url), /loopback/);
  for (const model of ["remote:cloud", "a b", "x".repeat(201)]) assert.throws(() => f.ai.configure({ endpoint: "http://localhost", model }));
  assert.throws(() => f.ai.configure({ endpoint: "http://localhost", model: "text", extra: true }));
  f.ai.reset(); await assert.rejects(f.ai.interpret(f.prepared.briefingId, f.info.revision), /briefing changed/);
});

test("desktop interpretation uses main-owned context and keeps recorded facts separate", async t => {
  const p = provider(async () => output()), f = await fixture(t, p.fetcher);
  const before = structuredClone(f.prepared.recorded);
  await assert.rejects(f.ai.interpret("forged", f.info.revision), /briefing changed/);
  const result = await f.ai.interpret(f.prepared.briefingId, f.info.revision);
  assert.equal(result.interpretations.length, 1); assert.equal(result.interpretations[0]!.kind, "interpretation");
  assert.deepEqual(f.prepared.recorded, before); assert.equal(result.model, "text:local");
  const chat = p.calls.find(c => c.path === "/api/chat")!;
  assert.ok(JSON.stringify(chat.body).includes("Compare orchids locally")); assert.equal(chat.body.stream, false);
});

test("desktop refuses changed sources after model checks and before transmitting any context", async t => {
  const p = provider(async () => output()); let edit: (() => Promise<void>) | undefined;
  const f = await fixture(t, async (...args) => { const result = await p.fetcher(...args); if (String(args[0]).endsWith("/api/show")) await edit?.(); return result; });
  edit = () => writeFile(f.path, "Changed during model check");
  await assert.rejects(f.ai.interpret(f.prepared.briefingId, f.info.revision), /changed|canceled/);
  assert.ok(!p.calls.some(c => c.path === "/api/chat"));
});

test("desktop rejects replies after external edits, revocation, model changes and explicit cancellation", async t => {
  for (const change of ["edit", "revoke", "model", "cancel"] as const) {
    let release!: (value: unknown) => void, entered!: () => void;
    const atChat = new Promise<void>(resolve => { entered = resolve; });
    const p = provider(async () => { entered(); return new Promise(resolve => { release = resolve; }); });
    const f = await fixture(t, p.fetcher);
    const run = f.ai.interpret(f.prepared.briefingId, f.info.revision); const rejected = assert.rejects(run);
    await atChat;
    if (change === "edit") await writeFile(f.path, "Changed during inference");
    if (change === "revoke") { f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.evidence.reset(); f.ai.forget(); }
    if (change === "model") f.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    if (change === "cancel") f.ai.cancel();
    release(output()); await rejected;
    assert.match(f.prepared.recorded.sections.objective[0]!.text, /Compare orchids locally/);
  }
});

test("desktop model failures and malformed output preserve recorded context and never echo provider body", async t => {
  for (const mode of ["cloud", "remote", "incompatible", "malformed", "oversized"] as const) {
    const p = provider(async () => mode === "malformed" ? { message: { content: "private-provider-body" } } : output());
    const fetcher: typeof fetch = async (...args) => {
      if (mode === "cloud") return new Response(JSON.stringify({ cloud: { disabled: false } }));
      if (String(args[0]).endsWith("/api/show") && mode === "remote") return new Response(JSON.stringify({ ...details, remote_host: "https://example.com" }));
      if (String(args[0]).endsWith("/api/show") && mode === "incompatible") return new Response(JSON.stringify({ ...details, capabilities: ["embedding"] }));
      if (mode === "oversized") return new Response("x".repeat(2 * 1024 * 1024 + 1));
      return p.fetcher(...args);
    };
    const f = await fixture(t, fetcher), before = structuredClone(f.prepared.recorded);
    await assert.rejects(f.ai.interpret(f.prepared.briefingId, f.info.revision), error => error instanceof Error && !error.message.includes("private-provider-body"));
    assert.deepEqual(f.prepared.recorded, before);
    if (mode !== "malformed") assert.ok(!p.calls.some(c => c.path === "/api/chat"));
  }
});

test("desktop operation timeout and cancel abort pending local transport", async t => {
  // Prepare real source fixtures outside the deliberately tiny transport deadline.
  const f = await fixture(t, provider().fetcher);
  let started: () => void = () => {}, requests = 0, aborted = 0;
  const fetcher: typeof fetch = async (_url, options) => { requests++; started(); return new Promise((_resolve, reject) => {
    const signal = options!.signal!; signal.addEventListener("abort", () => { aborted++; reject(signal.reason); }, { once: true });
  }); };
  const ai = new DesktopAI(f.projects, f.evidence, fetcher, 60);
  ai.configure({ endpoint: "http://127.0.0.1:11434", model: "text:local" });
  // Keep the test process alive because AbortSignal.timeout deliberately unrefs its timer.
  const alive = setTimeout(() => {}, 1000);
  try { await assert.rejects(ai.check(), /took too long/); } finally { clearTimeout(alive); }
  assert.equal(requests, 1); assert.equal(aborted, 1);
  const begun = new Promise<void>(resolve => { started = resolve; });
  const run = ai.check(), rejected = assert.rejects(run, /canceled/); await begun; ai.cancel(); await rejected;
  assert.equal(requests, 2); assert.equal(aborted, 2);
});

test("desktop unavailable transport and invalid provider JSON give safe diagnostics with recorded facts intact", async t => {
  for (const mode of ["offline", "invalid-json"] as const) {
    const f = await fixture(t, async () => {
      if (mode === "offline") throw new TypeError("network unavailable");
      return new Response('{"synthetic-private-provider-body');
    });
    await assert.rejects(f.ai.interpret(f.prepared.briefingId, f.info.revision), error => error instanceof Error
      && /Cannot reach local Ollama|malformed JSON/.test(error.message) && !error.message.includes("synthetic-private"));
    assert.match(f.prepared.recorded.sections.objective[0]!.text, /Compare orchids locally/);
  }
});
