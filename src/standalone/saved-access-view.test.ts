import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { SavedAccessView, continueSteps, type RememberInput } from "./saved-access-view.ts";
import type { ContinuedAccess, DesktopBridge, DesktopResult, SavedAccessStatus } from "./contracts.ts";

class Element {
  id = ""; textContent = ""; disabled = false; hidden = false; children: Element[] = [];
  listeners = new Map<string, (() => void)[]>();
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  replaceChildren(...nodes: Element[]): void { this.children = nodes; }
  fire(event: string): void { if (event === "click" && this.disabled) return; for (const listener of this.listeners.get(event) ?? []) listener(); }
}
const flush = async (): Promise<void> => { await new Promise<void>(resolve => setImmediate(resolve)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const saved: SavedAccessStatus = { warning: "", saved: { name: "Vault", path: "/home/user/Vault", scope: { roots: ["Projects", "Sources"], excluded: ["Projects/Private"] }, projectsFolder: "Projects", ai: { endpoint: "http://127.0.0.1:11439", model: "qwen3:4b-instruct", embeddingModel: "" }, savedAt: "2026-10-27T10:00:00.000Z" } };
const continued: ContinuedAccess = { vault: { name: "Vault", path: "/home/user/Vault", revision: 4, scope: saved.saved!.scope, pdfs: [] }, projectsFolder: "Projects", ai: saved.saved!.ai };
function fixture(t: TestContext, initial: SavedAccessStatus, input: RememberInput | null = null) {
  const elements = new Map<string, Element>(); const el = (id: string): Element => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!; };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: () => new Element() } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "document", descriptor); else Reflect.deleteProperty(globalThis, "document"); });
  const calls = { continued: 0, forgot: 0, remembered: [] as unknown[][], closing: 0, opened: [] as ContinuedAccess[], messages: [] as string[] };
  const reply = { continue: deferred<DesktopResult<ContinuedAccess>>() };
  const bridge = {
    savedAccess: async () => ({ ok: true, value: initial }),
    continueSavedAccess: () => { calls.continued++; return reply.continue.promise; },
    forgetSavedAccess: async () => { calls.forgot++; return { ok: true, value: { saved: null, warning: "" } }; },
    rememberAccess: async (...args: unknown[]) => { calls.remembered.push(args); return { ok: true, value: saved }; }
  } as unknown as DesktopBridge;
  const state = { input, opened: true };
  const view = new SavedAccessView(bridge, () => state.input, () => { calls.closing++; }, async result => { calls.opened.push(result); return state.opened; }, message => calls.messages.push(message));
  return { el, view, calls, reply, state };
}
const text = (node: Element): string[] => node.children.map(child => child.textContent);

test("the card shows exactly the saved access and nothing else is read before Continue", async t => {
  const f = fixture(t, saved); await f.view.load();
  assert.equal(f.el("saved-access").hidden, false); assert.equal(f.el("saved-access-warning").hidden, true);
  assert.deepEqual(text(f.el("saved-access-details")), ["Folder: Vault (/home/user/Vault)", "Thread may read: Projects, Sources", "Kept private: Projects/Private", "Projects folder: Projects",
    "Local AI: qwen3:4b-instruct at http://127.0.0.1:11439, checked again when you continue", `Saved: ${new Date(saved.saved!.savedAt).toLocaleString()}`, "Never remembered: PDF permissions and saving."]);
  assert.equal(f.calls.continued, 0); assert.equal(f.calls.closing, 0); assert.equal(f.el("saved-continue").disabled, false);
  assert.equal(f.el("remember-access").disabled, true);
});

test("Continue closes current access first, opens only the main-validated result, and a refusal keeps the card", async t => {
  const f = fixture(t, saved); await f.view.load();
  f.el("saved-continue").fire("click"); assert.equal(f.calls.closing, 1); assert.equal(f.el("saved-continue").disabled, true); assert.equal(f.el("saved-forget").disabled, true);
  f.el("saved-continue").fire("click"); assert.equal(f.calls.continued, 1);
  f.reply.continue.resolve({ ok: false, message: "The saved folder was moved or replaced, so Thread did not open it." }); await flush();
  assert.deepEqual(f.calls.opened, []); assert.match(f.calls.messages.at(-1)!, /moved or replaced/); assert.equal(f.el("saved-access").hidden, false); assert.equal(f.el("saved-continue").disabled, false);
  f.reply.continue = deferred(); f.el("saved-continue").fire("click"); f.reply.continue.resolve({ ok: true, value: continued }); await flush();
  assert.deepEqual(f.calls.opened, [continued]); assert.equal(f.calls.messages.at(-1), "Saved access opened: Vault, reading Projects, Sources.");
});

test("Remember is available only after approval, sends only the mapping, embedding name and revision, and Forget hides the card", async t => {
  const f = fixture(t, { saved: null, warning: "" }); await f.view.load();
  assert.equal(f.el("saved-access").hidden, true); assert.equal(f.el("remember-access").disabled, true); assert.equal(f.el("saved-continue").disabled, true);
  f.el("remember-access").fire("click"); assert.deepEqual(f.calls.remembered, []);
  f.state.input = { revision: 9, projectsFolder: "Projects", embeddingModel: "" }; f.view.update(); assert.equal(f.el("remember-access").disabled, false);
  f.el("remember-access").fire("click"); await flush(); assert.deepEqual(f.calls.remembered, [["Projects", "", 9]]); assert.equal(f.el("saved-access").hidden, false);
  f.el("saved-forget").fire("click"); await flush(); assert.equal(f.calls.forgot, 1); assert.equal(f.el("saved-access").hidden, true); assert.deepEqual(text(f.el("saved-access-details")), []);
});

test("an unreadable saved file shows its warning, cannot continue or be overwritten, and can be forgotten", async t => {
  const f = fixture(t, { saved: null, warning: "Saved access could not be read, so Thread is not using it." }, { revision: 2, projectsFolder: "", embeddingModel: "" }); await f.view.load();
  assert.equal(f.el("saved-access").hidden, false); assert.equal(f.el("saved-access-warning").hidden, false); assert.match(f.el("saved-access-warning").textContent, /could not be read/);
  assert.equal(f.el("saved-continue").disabled, true); assert.equal(f.el("remember-access").disabled, true); assert.equal(f.el("saved-forget").disabled, false);
  f.el("saved-forget").fire("click"); await flush(); assert.equal(f.el("saved-access").hidden, true); assert.equal(f.el("remember-access").disabled, false);
});

test("a continuation overtaken by Close or another vault stops before the next step and claims nothing", async t => {
  let revision: number | null = 4; const ran: string[] = [];
  assert.equal(await continueSteps(4, () => revision, [async () => { ran.push("storage"); }, async () => { ran.push("notes"); revision = null; }, async () => { ran.push("projects"); }, async () => { ran.push("ai"); }]), false);
  assert.deepEqual(ran, ["storage", "notes"]);
  revision = 5; assert.equal(await continueSteps(4, () => revision, [async () => { ran.push("never"); }]), false); assert.deepEqual(ran, ["storage", "notes"]);
  revision = 4; assert.equal(await continueSteps(4, () => revision, [async () => { ran.push("all"); }]), true);
  const f = fixture(t, saved); await f.view.load(); f.state.opened = false;
  f.el("saved-continue").fire("click"); f.reply.continue.resolve({ ok: true, value: continued }); await flush();
  assert.deepEqual(f.calls.opened, [continued]); assert.ok(!f.calls.messages.some(message => message.startsWith("Saved access opened"))); assert.equal(f.el("saved-continue").disabled, false);
});
