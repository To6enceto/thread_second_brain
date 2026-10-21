import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ChangesView } from "./changes-view.ts";
import type { DesktopBridge, DesktopResult, NoteSnapshot } from "./contracts.ts";
import type { ChangePreview, EditDraft } from "./changes.ts";

class Element {
  tag: string; textContent = ""; value = ""; disabled = false; hidden = false; className = ""; tabIndex = 0; rows = 0; maxLength = 0;
  dataset: Record<string, string> = {}; attributes: Record<string, string> = {}; children: Element[] = []; listeners = new Map<string, (() => void)[]>();
  constructor(tag = "div") { this.tag = tag; }
  append(...nodes: Element[]): void { this.children.push(...nodes); }
  replaceChildren(...nodes: Element[]): void { this.children = nodes; this.textContent = ""; }
  setAttribute(key: string, value: string): void { this.attributes[key] = value; }
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  fire(event: string): void { if (event === "click" && this.disabled) return; for (const listener of this.listeners.get(event) ?? []) listener(); }
  focus(): void {}
  all(): Element[] { return this.children.flatMap(child => [child, ...child.all()]); }
  querySelectorAll(): Element[] { return this.all().filter(item => item.tag === "textarea" || item.tag === "button" && item.dataset.changeAction); }
}
const flush = async (): Promise<void> => { await new Promise<void>(resolve => setImmediate(resolve)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function fixture(t: TestContext) {
  const elements = new Map<string, Element>(), el = (id: string): Element => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!; };
  el("changes-panel").append(el("changes-work"), el("changes-list"));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: (tag: string) => new Element(tag) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "document", descriptor); else Reflect.deleteProperty(globalThis, "document"); });
  const calls = { invalidations: 0, dirty: [] as string[], confirmations: [] as string[] }, edit = deferred<DesktopResult<EditDraft>>(), preview = deferred<DesktopResult<ChangePreview>>();
  const bridge = {
    invalidateChangeView: async () => { calls.invalidations++; return { ok: true, value: null }; },
    changesSnapshot: async () => ({ ok: true, value: { pending: { id: "pending", createdAt: "now", status: "pending", available: true, paths: ["Projects/Note.md"] }, recovery: null, history: [] } }),
    beginNoteEdit: () => edit.promise, previewChange: () => preview.promise,
    changeDraftEdited: async (id: string) => { calls.dirty.push(id); return { ok: true, value: null }; },
    confirmChange: async (id: string) => { calls.confirmations.push(id); return { ok: false, message: "must not run" }; }
  } as unknown as DesktopBridge;
  const view = new ChangesView(bridge, () => 1, () => {});
  const find = (label: string): Element => { const item = el("changes-panel").all().find(item => item.tag === "button" && item.textContent === label); assert.ok(item, label); return item; };
  return { el, view, edit, preview, calls, find };
}
const note: NoteSnapshot = { path: "Projects/Note.md", text: "before", stamp: "stamp", modifiedAt: 1, revision: 1 };
const previewValue: ChangePreview = { id: "exact", batchId: "pending", action: "apply", ready: true, message: "Review", operations: [{ path: note.path, before: "before\n", after: "after\n", current: "before\n" }] };

test("revoked source draft and late preview replies never restore note content or approval controls", async t => {
  const f = fixture(t); f.view.setNote(note); f.el("propose-note").fire("click"); f.view.invalidate("Access revoked");
  assert.equal(f.el("changes-refresh").disabled, false);
  f.edit.resolve({ ok: true, value: { id: "edit", path: note.path, body: "private body" } }); await flush();
  assert.equal(f.el("changes-work").children.length, 0); assert.equal(f.el("changes-status").textContent, "Access revoked");
  assert.equal(f.el("changes-refresh").disabled, false);
  f.view.open(); await flush(); f.find("Preview pending change").fire("click"); f.view.invalidate("Source changed");
  assert.equal(f.el("changes-refresh").disabled, false);
  f.el("changes-refresh").fire("click"); await flush();
  f.find("Preview pending change").fire("click");
  assert.equal(f.el("changes-refresh").disabled, true);
  f.view.invalidate("Source changed");
  f.preview.resolve({ ok: true, value: previewValue }); await flush();
  assert.equal(f.el("changes-work").children.length, 0); assert.equal(f.el("changes-status").textContent, "Source changed");
  assert.equal(f.el("changes-refresh").disabled, false);
});

test("edited body immediately disables Apply and revokes its main approval; marked diff retains exact content", async t => {
  const f = fixture(t); f.view.open(); await flush(); f.find("Preview pending change").fire("click");
  f.preview.resolve({ ok: true, value: previewValue }); await flush();
  const nodes = f.el("changes-work").all(); assert.ok(nodes.some(node => node.textContent === "+")); assert.ok(nodes.some(node => node.textContent === "-"));
  assert.ok(nodes.some(node => node.tag === "pre" && node.textContent === "after\n"));
  const body = nodes.find(node => node.tag === "textarea")!; body.value = "unreviewed"; body.fire("input"); await flush();
  assert.equal(f.find("Apply exact change").disabled, true); assert.deepEqual(f.calls.dirty, ["exact"]); f.find("Apply exact change").fire("click"); assert.deepEqual(f.calls.confirmations, []);
  assert.equal(f.find("Renew exact preview").disabled, false);
});
