import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { RecordsView } from "./records-view.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { DecisionAssessment, RecordCommand, RecordsSnapshot } from "./records.ts";
import type { ChangesSnapshot } from "./changes.ts";
class Element {
  tagName: string; id = ""; textContent = ""; disabled = false; hidden = false; className = ""; selected = false; multiple = false; open = false; parentElement: Element | null = null;
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
  all(): Element[] { return this.children.flatMap(child => [child, ...child.all()]); }
  querySelectorAll(): Element[] { return this.all().filter(node => node.dataset.recordWork); }
}
const flush = async () => { await new Promise<void>(r => setImmediate(r)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const snapshot: RecordsSnapshot = { id: "records", project: "Projects/Demo", decisions: [{ path: "Projects/Demo/Decision.md", hash: "a".repeat(64), status: "accepted" }], questions: [{ path: "Projects/Demo/Question.md", hash: "b".repeat(64), status: "open" }], evidence: [{ path: "Sources/Note.md", hash: "c".repeat(64), status: "unknown" }], legacy: [], coverage: "Bounded context" };
const assessment: DecisionAssessment = { id: "assessment", path: snapshot.decisions[0]!.path, model: "local", generatedAt: 1, answer: { supported: true, answer: [{ kind: "interpretation", text: "Private observation", sourceIds: ["S1"] }], gaps: [] }, bundle: { sources: [], noteHashes: {}, truncated: false } };
function fixture(t: TestContext) {
  const roots = new Map<string, Element>();
  const el = (id: string): Element => { const dynamic = [...roots.values()].flatMap(node => node.all()).find(node => node.id === id); if (dynamic) return dynamic; if (!roots.has(id)) roots.set(id, new Element()); return roots.get(id)!; };
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: (tag: string) => new Element(tag) } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "document", prior); else Reflect.deleteProperty(globalThis, "document"); });
  const load = deferred<DesktopResult<RecordsSnapshot>>(), assessed = deferred<DesktopResult<DecisionAssessment>>(), prepared = deferred<DesktopResult<ChangesSnapshot>>();
  const calls = { drafts: [] as boolean[], commands: [] as RecordCommand[], reviews: 0 }, access = { revision: 1, generation: 1, selection: { folder: "Projects", project: "Projects/Demo" } };
  const bridge = { cancelRecords: async () => ({ ok: true, value: null }), recordDraftChanged: async (keep: boolean) => { calls.drafts.push(keep); return { ok: true, value: null }; }, loadRecords: () => load.promise, assessDecision: () => assessed.promise, prepareRecord: (_id: string, input: RecordCommand) => { calls.commands.push(input); return prepared.promise; } } as unknown as DesktopBridge;
  const view = new RecordsView(bridge, () => access, () => {}, () => { calls.reviews++; }, () => {});
  const label = (name: string): Element => { const node = el("records-content").all().find(node => node.attributes["aria-label"] === name); assert.ok(node, name); return node; };
  const button = (name: string): Element => { const node = el("records-content").all().find(node => node.tagName === "BUTTON" && node.textContent === name); assert.ok(node, name); return node; };
  const ready = async () => { const pending = view.refresh(); load.resolve({ ok: true, value: structuredClone(snapshot) }); await pending; };
  return { el, view, calls, access, load, assessed, prepared, label, button, ready };
}

test("records invalidation restores Refresh and rejects a delayed revoked list", async t => {
  const f = fixture(t), pending = f.view.refresh(); assert.equal(f.el("records-refresh").disabled, true);
  f.view.invalidate("Access revoked"); f.access.revision++; assert.equal(f.el("records-refresh").disabled, false);
  f.load.resolve({ ok: true, value: snapshot }); await pending;
  assert.equal(f.el("records-content").children.length, 0); assert.equal(f.el("records-status").textContent, "Access revoked");
});

test("changed evidence rejects late assessment and disables review preview until renewed", async t => {
  const f = fixture(t); await f.ready(); const mode = f.label("Record action"); mode.value = "decision-review"; mode.fire("change");
  assert.equal(f.button("Preview record action").disabled, true); f.label("Decision to review").value = snapshot.decisions[0]!.path;
  f.button("Ask the AI to compare the decision with these notes").fire("click"); f.label("Supporting notes").fire("change");
  f.assessed.resolve({ ok: true, value: assessment }); await flush();
  assert.equal(f.el("record-assessment").children.length, 0); assert.equal(f.button("Preview record action").disabled, true); assert.equal(f.el("records-refresh").disabled, false);
});

test("form edits cancel late proposal navigation and preserve explicit proposed default", async t => {
  const f = fixture(t); await f.ready(); assert.equal(f.label("Decision status").value, "proposed");
  f.label("New note or replacement name").value = "Proposed"; f.label("Decision choice").value = "Original draft";
  f.button("Preview record action").fire("click"); const captured = f.calls.commands[0]!; assert.equal(captured.kind, "decision");
  if (captured.kind === "decision") assert.equal(captured.decision.status, "proposed");
  f.label("Decision choice").value = "Unreviewed later edit"; f.label("Decision choice").fire("input");
  f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 0); assert.equal(f.button("Preview record action").disabled, false);
  assert.ok(f.calls.drafts.includes(true));
});

test("managed question form sends explicit state, answer and reason to the reviewed proposal path", async t => {
  const f = fixture(t); await f.ready(); const mode = f.label("Record action"); mode.value = "question-update"; mode.fire("change");
  f.label("Question to update").value = snapshot.questions[0]!.path; f.label("Question state").value = "answered";
  f.label("Question answer or working response").value = "User answer"; f.label("Question update reason").value = "Observed result";
  f.button("Preview record action").fire("click"); const command = f.calls.commands[0]!; assert.equal(command.kind, "question-update");
  if (command.kind === "question-update") { assert.equal(command.update.status, "answered"); assert.equal(command.update.answer, "User answer"); assert.equal(command.update.reason, "Observed result"); }
  f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 1);
});
