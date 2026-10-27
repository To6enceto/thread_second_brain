import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { StorageView } from "./storage-view.ts";
import { freshProfile } from "./profile.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { CompatibilityPreview, StorageStatus } from "./storage.ts";
import type { ModelSetup } from "./model-setup.ts";

class Element {
  id = ""; value = ""; disabled = false; textContent = ""; className = ""; maxLength = 0;
  children: Element[] = [];
  listeners = new Map<string, (() => void)[]>();
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  append(...nodes: Element[]): void { this.children.push(...nodes); }
  replaceChildren(...nodes: Element[]): void { this.textContent = ""; this.children = nodes; }
  fire(event: string): void { if (event === "click" && this.disabled) return; for (const listener of this.listeners.get(event) ?? []) listener(); }
}
const flush = async (): Promise<void> => { await new Promise<void>(resolve => setImmediate(resolve)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function fixture(t: TestContext) {
  const elements = new Map<string, Element>(); const el = (id: string): Element => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!; };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: () => new Element() } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "document", descriptor); else Reflect.deleteProperty(globalThis, "document"); });
  const state: StorageStatus = { preferences: freshProfile().preferences, warning: "", writing: false, saves: [], importedCopies: 0, changesPending: false, changesRecovery: false };
  const preview: CompatibilityPreview = { id: "old-preview", folder: ".old-config", installed: false, version: "", compatible: true, reasons: [], preferences: { ...freshProfile().preferences, model: "distinct:local", roles: { ...freshProfile().preferences.roles, knowledge: "DistinctKnowledge" } }, history: '{"history":"exact"}', hash: "a".repeat(64) };
  const calls = { enabled: [] as string[], copied: [] as string[], released: 0 };
  const inspection = deferred<DesktopResult<CompatibilityPreview>>(), enabled = deferred<DesktopResult<StorageStatus>>(), copied = deferred<DesktopResult<StorageStatus>>();
  const bridge = {
    inspectCompatibility: () => inspection.promise,
    enableWriting: (id: string) => { calls.enabled.push(id); return enabled.promise; },
    importPluginCopy: (id: string) => { calls.copied.push(id); return copied.promise; },
    releaseWriting: async () => { calls.released++; return { ok: true, value: null }; },
    storageStatus: async () => ({ ok: true, value: state })
  } as unknown as DesktopBridge;
  const models = { draft: () => ({ endpoint: state.preferences.endpoint, model: "", embeddingModel: "" }), restoreDraft: () => {} } as unknown as ModelSetup;
  const view = new StorageView(bridge, () => 7, models); el("plugin-config").value = ".old-config";
  return { el, view, state, preview, calls, inspection, enabled, copied };
}

test("configuration edits reject delayed compatibility results and revoke ownership", async t => {
  const f = fixture(t); f.el("storage-inspect").fire("click");
  f.el("plugin-config").value = ".actual-config"; f.el("plugin-config").fire("input");
  f.inspection.resolve({ ok: true, value: f.preview }); await flush();
  assert.equal(f.el("storage-enable").disabled, true); assert.equal(f.el("storage-import").disabled, true);
  assert.equal(f.el("storage-import-preferences").textContent, ""); assert.equal(f.el("storage-history-preview").textContent, "");
  f.el("storage-enable").fire("click"); assert.deepEqual(f.calls.enabled, []); assert.equal(f.calls.released, 1);
  assert.match(f.el("storage-status").textContent, /Settings folder changed/);
});

test("exact proposed preferences and history are visible before copy and clear together", async t => {
  const f = fixture(t); f.el("storage-inspect").fire("click"); f.inspection.resolve({ ok: true, value: f.preview }); await flush();
  assert.deepEqual(JSON.parse(f.el("storage-import-preferences").textContent), f.preview.preferences);
  assert.equal(f.el("storage-history-preview").textContent, f.preview.history);
  f.el("storage-enable").fire("click"); f.enabled.resolve({ ok: true, value: { ...f.state, writing: true } }); await flush();
  assert.equal(f.el("storage-import").disabled, false); assert.deepEqual(JSON.parse(f.el("storage-preferences").textContent), f.state.preferences);
  f.el("storage-import").fire("click"); assert.deepEqual(f.calls.copied, [f.preview.id]);
  f.copied.resolve({ ok: true, value: { ...f.state, writing: true, preferences: f.preview.preferences, importedCopies: 1 } }); await flush();
  await f.view.refresh(); assert.equal(f.el("storage-import-preferences").textContent, ""); assert.equal(f.el("storage-history-preview").textContent, ""); assert.equal(f.el("storage-import").disabled, true);
});

test("configuration edits suppress late enable and import replies and mismatched preview folders", async t => {
  for (const stage of ["enable", "copy", "mismatch"] as const) await t.test(stage, async child => {
    const f = fixture(child); f.el("storage-inspect").fire("click"); f.inspection.resolve({ ok: true, value: stage === "mismatch" ? { ...f.preview, folder: ".different" } : f.preview }); await flush();
    if (stage === "mismatch") { assert.equal(f.el("storage-enable").disabled, true); return; }
    f.el("storage-enable").fire("click");
    if (stage === "copy") { f.enabled.resolve({ ok: true, value: { ...f.state, writing: true } }); await flush(); f.el("storage-import").fire("click"); }
    f.el("plugin-config").value = ".actual-config"; f.el("plugin-config").fire("input");
    (stage === "copy" ? f.copied : f.enabled).resolve({ ok: true, value: { ...f.state, writing: true, importedCopies: 1 } }); await flush();
    assert.equal(f.calls.released, 1); assert.equal(f.el("storage-save").disabled, true); assert.equal(f.el("storage-import").disabled, true);
    assert.match(f.el("storage-status").textContent, /Settings folder changed/);
  });
});
