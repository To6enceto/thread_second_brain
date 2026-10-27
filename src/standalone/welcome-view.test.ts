import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { WelcomeView, type WelcomeState } from "./welcome-view.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";

class Element {
  textContent = ""; value = ""; hidden = false; focused = 0; listeners = new Map<string, (() => void)[]>();
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  fire(event: string): void { for (const listener of this.listeners.get(event) ?? []) listener(); }
  focus(): void { this.focused++; }
}
const flush = async (): Promise<void> => { await new Promise<void>(resolve => setImmediate(resolve)); };
function fixture(t: TestContext, discover: DesktopResult<unknown> = { ok: true, value: { models: [{ name: "qwen3:4b-instruct", completion: true, embedding: false }, { name: "embed", completion: false, embedding: true }], total: 2, omitted: 0 } }) {
  const elements = new Map<string, Element>(); const el = (id: string): Element => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!; };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "document", descriptor); else Reflect.deleteProperty(globalThis, "document"); });
  const calls = { prepared: [] as unknown[][], chose: 0, access: 0, hidden: 0, changes: 0, endpoints: [] as string[] };
  const state: WelcomeState = { folder: null, roots: [], revision: null };
  const reply = { prepare: { ok: true, value: { pending: null, recovery: null, history: [] } } as DesktopResult<unknown> };
  const bridge = {
    discoverModels: async (endpoint: string) => { calls.endpoints.push(endpoint); return discover; },
    prepareNewProject: async (...args: unknown[]) => { calls.prepared.push(args); return reply.prepare; }
  } as unknown as DesktopBridge;
  el("welcome-panel").hidden = true;
  const view = new WelcomeView(bridge, { state: () => state, choose: () => { calls.chose++; }, focusAccess: () => { calls.access++; return state.folder !== null; }, endpoint: () => "http://127.0.0.1:11439", hideOthers: () => { calls.hidden++; }, openChanges: () => { calls.changes++; } });
  return { el, view, calls, state, reply };
}

test("the welcome opens, hides other panels, shows live step status and can be skipped and reopened", t => {
  const f = fixture(t); f.view.open();
  assert.equal(f.el("welcome-panel").hidden, false); assert.equal(f.calls.hidden, 1); assert.equal(f.el("welcome-panel").focused, 1);
  assert.equal(f.el("welcome-folder-status").textContent, "No folder chosen yet."); assert.equal(f.el("welcome-access-status").textContent, "Thread cannot read anything yet.");
  f.el("welcome-choose").fire("click"); f.el("welcome-access").fire("click"); assert.equal(f.calls.chose, 1); assert.equal(f.calls.access, 1);
  assert.equal(f.el("welcome-access-status").textContent, "Choose your notes folder first (step 1).");
  Object.assign(f.state, { folder: "Vault", roots: ["Projects", "Sources"], revision: 3 }); f.view.update();
  assert.equal(f.el("welcome-folder-status").textContent, "Chosen: Vault"); assert.equal(f.el("welcome-access-status").textContent, "Thread may read: Projects, Sources");
  f.el("welcome-skip").fire("click"); assert.equal(f.el("welcome-panel").hidden, true); assert.equal(f.el("choose").focused, 1);
  f.el("open-welcome").fire("click"); assert.equal(f.el("welcome-panel").hidden, false);
  f.el("new-project").fire("click"); assert.equal(f.el("welcome-project-name").focused, 1);
});

test("the Ollama test reports usable models, none, or the plain error, using the configured address", async t => {
  const ok = fixture(t); ok.el("welcome-test-ai").fire("click"); await flush();
  assert.deepEqual(ok.calls.endpoints, ["http://127.0.0.1:11439"]); assert.equal(ok.el("welcome-ai-status").textContent, "Ollama answered: 1 text model you can use. Choose one under Optional local AI.");
  const none = fixture(t, { ok: true, value: { models: [], total: 0, omitted: 0 } }); none.el("welcome-test-ai").fire("click"); await flush();
  assert.match(none.el("welcome-ai-status").textContent, /no downloaded text model was found/);
  const down = fixture(t, { ok: false, message: "Cannot reach local Ollama. Start it with OLLAMA_NO_CLOUD=1 and check the endpoint." }); down.el("welcome-test-ai").fire("click"); await flush();
  assert.match(down.el("welcome-ai-status").textContent, /^Cannot reach local Ollama/);
});

test("start actions need approved access, call only prepareNewProject and open Review changes", async t => {
  const f = fixture(t); f.el("welcome-sample").fire("click"); await flush();
  assert.deepEqual(f.calls.prepared, []); assert.equal(f.el("welcome-start-status").textContent, "Choose your notes folder and approve read access first.");
  f.state.revision = 7; f.el("welcome-sample").fire("click"); await flush();
  assert.deepEqual(f.calls.prepared, [["sample", "", 7]]); assert.equal(f.calls.changes, 1); assert.match(f.el("welcome-start-status").textContent, /^Sample project ready to check in Review changes/);
  f.el("welcome-project-name").value = "Pilot study"; f.el("welcome-new-project").fire("click"); await flush();
  assert.deepEqual(f.calls.prepared.at(-1), ["project", "Pilot study", 7]); assert.equal(f.calls.changes, 2);
  f.reply.prepare = { ok: false, message: "Set Projects and Templates folders under Saving notes > Where Thread saves each kind of note first." };
  f.el("welcome-new-project").fire("click"); await flush(); assert.equal(f.calls.changes, 2); assert.match(f.el("welcome-start-status").textContent, /^Set Projects and Templates folders/);
});

test("a running step tells the other step to wait instead of silently ignoring it", async t => {
  const f = fixture(t); let release!: () => void;
  const bridge = (f.view as unknown as { bridge: Record<string, unknown> }).bridge; bridge.discoverModels = () => new Promise(resolve => { release = () => resolve({ ok: true, value: { models: [], total: 0, omitted: 0 } }); });
  f.el("welcome-test-ai").fire("click"); f.el("welcome-test-ai").fire("click"); assert.equal(f.el("welcome-ai-status").textContent, "Wait for the current step to finish.");
  f.state.revision = 4; f.el("welcome-sample").fire("click"); await flush(); assert.deepEqual(f.calls.prepared, [["sample", "", 4]]);
  release(); await flush(); assert.match(f.el("welcome-ai-status").textContent, /no downloaded text model/);
});
