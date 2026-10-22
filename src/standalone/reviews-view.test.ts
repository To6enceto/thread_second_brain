import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ReviewsView } from "./reviews-view.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { DesktopReviewSnapshot, ReviewCommand, ReviewDraft, ReviewGeneration } from "./reviews.ts";
import type { ChangesSnapshot } from "./changes.ts";
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
  querySelectorAll(): Element[] { return this.all().filter(node => node.dataset.reviewWork); }
}
const flush = async () => { await new Promise<void>(r => setImmediate(r)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const snapshot: DesktopReviewSnapshot = { id: "reviews", mode: "weekly", project: "Projects/Demo", sources: [{ path: "Sources/Note.md", hash: "b".repeat(64) }], coverage: "Bounded context" };
const draft: ReviewDraft = { id: "generated", kind: "weekly", path: "Reviews/Weekly.md", markdown: "Private review draft", bundle: { sources: [], noteHashes: {}, truncated: false }, model: "local", generatedAt: 1, coverage: "One note" };
function fixture(t: TestContext) {
  const roots = new Map<string, Element>();
  const el = (id: string): Element => { const dynamic = [...roots.values()].flatMap(node => node.all()).find(node => node.id === id); if (dynamic) return dynamic; if (!roots.has(id)) roots.set(id, new Element()); return roots.get(id)!; };
  const prior = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: (tag: string) => new Element(tag) } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "document", prior); else Reflect.deleteProperty(globalThis, "document"); });
  el("reviews-mode").value = "weekly"; el("reviews-filter").value = "all";
  const load = deferred<DesktopResult<DesktopReviewSnapshot>>(), generated = deferred<DesktopResult<ReviewDraft>>(), prepared = deferred<DesktopResult<ChangesSnapshot>>();
  const calls = { inputs: [] as ReviewGeneration[], commands: [] as ReviewCommand[], draftIds: [] as string[], drafts: 0, reviews: 0 }, access = { revision: 1, generation: 1, selection: { folder: "Projects", project: "Projects/Demo" } };
  const bridge = { cancelReviews: async () => ({ ok: true, value: null }), reviewDraftChanged: async () => { calls.drafts++; return { ok: true, value: null }; }, loadReviews: () => load.promise,
    prepareReview: (_id: string, input: ReviewCommand) => { calls.commands.push(input); return prepared.promise; }, generateReview: (_id: string, input: ReviewGeneration) => { calls.inputs.push(input); return generated.promise; }, prepareReviewDraft: (id: string) => { calls.draftIds.push(id); return prepared.promise; } } as unknown as DesktopBridge;
  const view = new ReviewsView(bridge, () => access, () => {}, () => { calls.reviews++; }, () => {}, async () => {}, () => {});
  const label = (name: string): Element => { const node = el("reviews-content").all().find(node => node.attributes["aria-label"] === name); assert.ok(node, name); return node; };
  const button = (name: string): Element => { const node = el("reviews-content").all().find(node => node.tagName === "BUTTON" && node.textContent === name); assert.ok(node, name); return node; };
  const ready = async (data = snapshot) => { const pending = view.refresh(); load.resolve({ ok: true, value: structuredClone(data) }); await pending; };
  return { el, view, calls, access, load, generated, prepared, label, button, ready };
}
test("review invalidation clears content and restores refresh while late revoked responses stay hidden", async t => {
  const f = fixture(t), pending = f.view.refresh(); assert.equal(f.el("reviews-refresh").disabled, true); f.view.invalidate("Access revoked"); f.access.revision++;
  f.load.resolve({ ok: true, value: snapshot }); await pending; assert.equal(f.el("reviews-content").children.length, 0); assert.equal(f.el("reviews-refresh").disabled, false); assert.equal(f.el("reviews-status").textContent, "Access revoked");
});
test("weekly scope starts with project and explicit scope edits discard late model results", async t => {
  const f = fixture(t); await f.ready(); assert.equal(f.label("Weekly review scope").value, "project"); assert.equal(f.button("Preview weekly review note").disabled, true);
  f.button("Generate weekly review").fire("click"); assert.equal(f.calls.inputs[0]!.kind, "weekly"); assert.equal((f.calls.inputs[0] as { scope: string }).scope, "project");
  f.label("Weekly review scope").value = "allowed"; f.label("Weekly review scope").fire("change"); f.generated.resolve({ ok: true, value: draft }); await flush(); assert.equal(f.el("review-draft").children.length, 0); assert.equal(f.button("Preview weekly review note").disabled, true);
  f.button("Generate weekly review").fire("click"); await flush(); assert.equal((f.calls.inputs[1] as { scope: string }).scope, "allowed");
});
test("only the retained generated ID can prepare a save and edits reject late proposal navigation", async t => {
  const f = fixture(t); await f.ready(); f.button("Generate weekly review").fire("click"); f.generated.resolve({ ok: true, value: draft }); await flush();
  assert.equal(f.button("Preview weekly review note").disabled, false); f.button("Preview weekly review note").fire("click"); assert.deepEqual(f.calls.draftIds, [draft.id]);
  f.label("Weekly review note name").fire("input"); f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 0); assert.equal(f.el("review-draft").children.length, 0);
});
test("freshness requires explicit source selection and cancel discards an in-flight draft", async t => {
  const f = fixture(t); await f.ready({ ...snapshot, mode: "freshness", outputs: [{ path: "Reviews/Old.md", hash: "a".repeat(64), state: "changed", reason: "Changed source", references: [] }] });
  const sources = f.label("Current replacement sources"); assert.equal(sources.multiple, true); assert.equal(sources.selectedOptions.length, 0); sources.options[0]!.selected = true; sources.fire("change");
  f.button("Generate refreshed").fire("click"); assert.deepEqual(f.calls.inputs[0], { kind: "refresh", name: f.label("Refreshed note name").value, path: "Reviews/Old.md", sources: [snapshot.sources[0]!.path] });
  f.el("reviews-cancel").fire("click"); f.generated.resolve({ ok: true, value: draft }); await flush(); assert.equal(f.el("reviews-content").children.length, 0); assert.equal(f.el("reviews-refresh").disabled, false);
});
test("individual diagnostic controls prepare only the chosen issue and reject canceled review navigation", async t => {
  const f = fixture(t); await f.ready({ ...snapshot, mode: "health", health: { issues: [{ kind: "invalid-date", path: "Projects/Demo/Overview.md", hash: "a".repeat(64), message: "Bad date", effect: "Unknown chronology", guidance: "Choose actual date", dateKey: "created" }], counts: { "invalid-date": 1, "duplicate-id": 0, references: 0, project: 0, heading: 0, format: 0 }, available: 1, examined: 1, skipped: 0, bytes: 100, limits: [] }, repairs: [{ issue: 0, allowed: true, headings: [], replacements: [] }] });
  f.button("Prepare individual repair 1").fire("click"); f.label("Correct recorded date").value = "2026-10-20"; f.label("Correct recorded date").fire("input"); f.button("Preview individual repair").fire("click");
  assert.deepEqual(f.calls.commands, [{ kind: "repair", issue: 0, value: "2026-10-20", headingAt: null }]); f.view.hide(); f.prepared.resolve({ ok: true, value: { pending: null, history: [], recovery: null } }); await flush(); assert.equal(f.calls.reviews, 0);
});
