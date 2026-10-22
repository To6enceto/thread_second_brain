import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ActionsView } from "./actions-view.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { ActionsSnapshot, ActionCommand, SessionDraft, SessionInput } from "./records.ts";
import type { ChangesSnapshot } from "./changes.ts";
import { newAction } from "../vault/action-record.ts";
import { localDay } from "../vault/workspace.ts";
class Element {
  tagName: string; id = ""; textContent = ""; disabled = false; hidden = false; className = ""; selected = false; multiple = false; checked = false; open = false; parentElement: Element | null = null;
  dataset: Record<string, string> = {}; attributes: Record<string, string> = {}; children: Element[] = []; listeners = new Map<string, (() => void)[]>(); private stored: string | null = null;
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); }
  get value(): string { return this.stored ?? (this.tagName === "SELECT" ? this.children[0]?.value ?? "" : ""); }
  set value(value: string) { this.stored = value; if (this.tagName === "SELECT") for (const option of this.children) option.selected = option.value === value; }
  get options(): Element[] { return this.children; }
  get selectedOptions(): Element[] { return this.children.filter(child => child.selected); }
  append(...nodes: Element[]): void { for (const node of nodes) node.parentElement = this; this.children.push(...nodes); }
  replaceChildren(...nodes: Element[]): void { this.children = []; this.append(...nodes); }
  setAttribute(key: string, value: string): void { this.attributes[key] = value; }
  addEventListener(event: string, listener: () => void): void { this.listeners.set(event, [...this.listeners.get(event) ?? [], listener]); }
  fire(event: string): void { if (event === "click" && this.disabled) return; for (const listener of this.listeners.get(event) ?? []) listener(); }
  focus(): void {}
  scrollIntoView(): void {}
  all(): Element[] { return this.children.flatMap(child => [child, ...child.all()]); }
  querySelectorAll(): Element[] { return this.all().filter(node => node.dataset.actionWork); }
}
const flush = async () => { await new Promise<void>(r => setImmediate(r)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const card = { path: "Projects/Demo/Actions/Check.md", hash: "a".repeat(64), record: newAction("demo", "Check citations", "User choice", localDay(), { sources: [], noteHashes: {}, truncated: false }), sources: [] };
const snapshot: ActionsSnapshot = { id: "actions", project: "Projects/Demo", actions: { cards: [card], bundle: { sources: [], noteHashes: {}, truncated: false }, identity: "demo", unavailable: 1, omitted: 0, candidates: 2 }, evidence: [{ path: "Sources/Note.md", hash: "b".repeat(64), status: "unknown" }], coverage: "Bounded context" };
const draft: SessionDraft = { id: "session", path: "Projects/Demo/Sessions/Wrap.md", markdown: "Private session draft", bundle: { sources: [], noteHashes: {}, truncated: false }, model: "local", generatedAt: 1, actionCount: 1 };
function fixture(t: TestContext) {
  const roots = new Map<string, Element>();
  const el = (id: string): Element => { const dynamic = [...roots.values()].flatMap(node => node.all()).find(node => node.id === id); if (dynamic) return dynamic; if (!roots.has(id)) roots.set(id, new Element()); return roots.get(id)!; };
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: (tag: string) => new Element(tag) } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "document", prior); else Reflect.deleteProperty(globalThis, "document"); });
  const load = deferred<DesktopResult<ActionsSnapshot>>(), generated = deferred<DesktopResult<SessionDraft>>(), prepared = deferred<DesktopResult<ChangesSnapshot>>();
  const calls = { inputs: [] as SessionInput[], commands: [] as ActionCommand[], sessionIds: [] as string[], drafts: 0, reviews: 0 }, access = { revision: 1, generation: 1, selection: { folder: "Projects", project: "Projects/Demo" } };
  const bridge = { cancelRecords: async () => ({ ok: true, value: null }), recordDraftChanged: async () => { calls.drafts++; return { ok: true, value: null }; }, loadActions: () => load.promise,
    prepareAction: (_id: string, input: ActionCommand) => { calls.commands.push(input); return prepared.promise; }, generateSession: (_id: string, input: SessionInput) => { calls.inputs.push(input); return generated.promise; }, prepareSession: (id: string) => { calls.sessionIds.push(id); return prepared.promise; } } as unknown as DesktopBridge;
  const view = new ActionsView(bridge, () => access, () => {}, () => { calls.reviews++; }, () => {});
  const label = (name: string): Element => { const node = el("actions-content").all().find(node => node.attributes["aria-label"] === name); assert.ok(node, name); return node; };
  const button = (name: string): Element => { const node = el("actions-content").all().find(node => node.tagName === "BUTTON" && node.textContent === name); assert.ok(node, name); return node; };
  const ready = async () => { const pending = view.refresh(); load.resolve({ ok: true, value: structuredClone(snapshot) }); await pending; };
  return { el, view, calls, access, load, generated, prepared, label, button, ready };
}

test("action board invalidation clears content and restores Refresh while late revoked responses stay hidden", async t => {
  const f = fixture(t), pending = f.view.refresh(); assert.equal(f.el("actions-refresh").disabled, true); f.view.invalidate("Access revoked"); f.access.revision++;
  f.load.resolve({ ok: true, value: snapshot }); await pending; assert.equal(f.el("actions-content").children.length, 0); assert.equal(f.el("actions-refresh").disabled, false); assert.equal(f.el("actions-status").textContent, "Access revoked");
});

test("wrap-up starts with no selected actions and selection edits reject a late session draft", async t => {
  const f = fixture(t); await f.ready(); const choice = f.label("Use recorded action Check citations"); assert.equal(choice.checked, false); assert.equal(f.button("Preview session note").disabled, true);
  f.button("Generate session wrap-up").fire("click"); assert.deepEqual(f.calls.inputs[0]!.actions, []);
  choice.checked = true; choice.fire("change"); f.generated.resolve({ ok: true, value: draft }); await flush(); assert.equal(f.el("session-draft").children.length, 0); assert.equal(f.button("Preview session note").disabled, true); assert.equal(f.el("actions-refresh").disabled, false);
});

test("explicit selected progress prepares only the generated session ID and cannot reopen review after an input edit", async t => {
  const f = fixture(t); await f.ready(); const choice = f.label("Use recorded action Check citations"); choice.checked = true; choice.fire("change"); f.label("Reported progress").value = "My report";
  f.button("Generate session wrap-up").fire("click"); assert.deepEqual(f.calls.inputs[0]!.actions, [card.path]); assert.equal(f.calls.inputs[0]!.report, "My report"); f.generated.resolve({ ok: true, value: draft }); await flush(); assert.equal(f.button("Preview session note").disabled, false);
  f.button("Preview session note").fire("click"); assert.deepEqual(f.calls.sessionIds, [draft.id]); f.label("Session note name").fire("input"); f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 0); assert.equal(f.el("session-draft").children.length, 0);
});

test("board offers keyboard-native explicit transition fields and canceled proposals do not navigate to review", async t => {
  const f = fixture(t); await f.ready(); assert.equal(f.label("Action operation").value, "new"); f.button("Record transition: Check citations").fire("click"); assert.equal(f.label("Action operation").value, "transition"); assert.equal(f.label("Action to update").value, card.path);
  f.label("Action state").value = "done"; f.label("Action reason").value = "User reports done"; f.button("Preview action").fire("click"); const command = f.calls.commands[0]!; assert.equal(command.kind, "transition"); if (command.kind === "transition") { assert.equal(command.state, "done"); assert.equal(command.path, card.path); assert.equal(command.reason, "User reports done"); }
  f.label("Action reason").fire("input"); f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 0); assert.equal(f.button("Preview action").disabled, false);
});
