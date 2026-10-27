import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ModelSetup } from "./model-setup.ts";
import type { DesktopBridge } from "./contracts.ts";

class Element {
  textContent = ""; disabled = false; children: Element[] = []; private stored: string | null = null; tag: string;
  listeners = new Map<string, (() => void)[]>();
  constructor(tag = "div", text = "", value = "") { this.tag = tag; this.textContent = text; if (tag === "option") this.stored = value; }
  get value(): string { return this.stored ?? (this.tag === "select" ? this.children[0]?.value ?? "" : ""); }
  set value(value: string) { this.stored = this.tag === "select" && !this.children.some(child => child.value === value) ? "" : value; }
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  replaceChildren(...nodes: Element[]): void { this.children = nodes; if (this.tag === "select") this.stored = null; }
}
const models = [{ name: "qwen3:4b-instruct", completion: true, embedding: false }, { name: "nomic-embed-text", completion: false, embedding: true }];
function fixture(t: TestContext, options: { listed?: typeof models; check?: () => { ok: boolean; value?: string; message?: string }; discover?: { ok: boolean; message?: string } } = {}) {
  const elements = new Map<string, Element>(); const el = (id: string): Element => { if (!elements.has(id)) elements.set(id, new Element(id === "ai-model" || id === "ai-embedding" ? "select" : "div")); return elements.get(id)!; };
  const before = { document: Object.getOwnPropertyDescriptor(globalThis, "document"), Option: Object.getOwnPropertyDescriptor(globalThis, "Option") };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el } });
  Object.defineProperty(globalThis, "Option", { configurable: true, value: class extends Element { constructor(text: string, value: string) { super("option", text, value); } } });
  t.after(() => { for (const [key, descriptor] of Object.entries(before)) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); });
  const calls = { configured: [] as unknown[], checks: 0 };
  const bridge = {
    discoverModels: async () => options.discover && !options.discover.ok ? { ok: false, message: options.discover.message } : ({ ok: true, value: { models: options.listed ?? models, total: 2, omitted: 0 } }),
    configureAI: async (settings: { endpoint: string; model: string }) => { calls.configured.push(settings); return { ok: true, value: settings }; },
    checkAI: async () => { calls.checks++; return options.check?.() ?? { ok: true, value: "Local completion confirmed; cloud disabled." }; },
    cancelAI: async () => ({ ok: true, value: null })
  } as unknown as DesktopBridge;
  return { el, setup: new ModelSetup(bridge, () => {}), calls };
}
const saved = { endpoint: "http://127.0.0.1:11439", model: "qwen3:4b-instruct", embeddingModel: "nomic-embed-text" };

test("a remembered model becomes usable only after discovery, apply and the connection test pass", async t => {
  const f = fixture(t); const pending = f.setup.restore(saved); assert.equal(f.setup.model(), "");
  await pending;
  assert.deepEqual(f.calls.configured, [{ endpoint: saved.endpoint, model: saved.model }]); assert.equal(f.calls.checks, 1);
  assert.equal(f.setup.model(), saved.model); assert.equal(f.setup.embeddingModel(), saved.embeddingModel);
  assert.equal(f.el("ai-endpoint").value, saved.endpoint); assert.match(f.el("ai-setup-status").textContent, /^Saved AI rechecked: qwen3:4b-instruct\. Local completion confirmed/);
});

test("an unavailable runtime, missing model or failed connection test leaves Thread working without AI", async t => {
  for (const options of [{ discover: { ok: false, message: "Ollama is not reachable on loopback." } }, { listed: [models[1]!] }, { check: () => ({ ok: false, message: "Cloud features are enabled." }) }]) {
    const f = fixture(t, options); await f.setup.restore(saved);
    assert.equal(f.setup.model(), ""); assert.equal(f.setup.embeddingModel(), "");
    assert.match(f.el("ai-setup-status").textContent, /Thread is working without AI until you set it up again\.$/);
  }
  const failed = fixture(t, { check: () => ({ ok: false, message: "Cloud features are enabled." }) }); await failed.setup.restore(saved);
  assert.deepEqual(failed.calls.configured, [{ endpoint: saved.endpoint, model: saved.model }, { endpoint: saved.endpoint, model: "" }]);
  const unlisted = fixture(t, { listed: [models[1]!] }); await unlisted.setup.restore(saved); assert.deepEqual(unlisted.calls.configured, []);
  const f = fixture(t, { listed: [models[0]!] }); await f.setup.restore(saved);
  assert.equal(f.setup.model(), saved.model); assert.equal(f.setup.embeddingModel(), ""); assert.match(f.el("ai-setup-status").textContent, /nomic-embed-text is not available, so Ask searches by keywords\./);
});

test("Cancel or a superseded recheck returns main to recorded-only, but never undoes a newer explicit Apply", async t => {
  let release!: (value: { ok: boolean; value: string }) => void;
  const cancel = fixture(t, { check: () => new Promise(resolve => { release = resolve; }) as never }); const pending = cancel.setup.restore(saved);
  await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(cancel.calls.checks, 1);
  for (const listener of cancel.el("ai-cancel-checks").listeners.get("click")!) listener();
  assert.deepEqual(cancel.calls.configured, [{ endpoint: saved.endpoint, model: saved.model }, { endpoint: saved.endpoint, model: "" }]);
  release({ ok: true, value: "late pass" }); await pending; assert.equal(cancel.setup.model(), ""); assert.equal(cancel.calls.configured.length, 2);

  const applied = fixture(t); const configured = applied.calls.configured; let first = true, finish!: () => void;
  const bridge = (applied.setup as unknown as { bridge: Record<string, unknown> }).bridge;
  bridge.configureAI = (settings: { endpoint: string; model: string }) => { configured.push(settings); if (!first) return Promise.resolve({ ok: true, value: settings }); first = false; return new Promise(resolve => { finish = () => resolve({ ok: true, value: settings }); }); };
  const restoring = applied.setup.restore(saved); await new Promise<void>(resolve => setImmediate(resolve));
  applied.el("ai-model").value = "qwen3:4b-instruct"; for (const listener of applied.el("ai-apply").listeners.get("click")!) listener();
  finish(); await restoring; await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual((configured as { model: string }[]).map(item => item.model), ["qwen3:4b-instruct", "qwen3:4b-instruct"]); assert.equal(applied.setup.model(), "qwen3:4b-instruct");
});
