import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { ResearchView } from "./research-view.ts";
import { AskView } from "./ask-view.ts";
import type { CollectionHandoff, DesktopBridge, DesktopResult, IndexSnapshot } from "./contracts.ts";
import type { IntakeSnapshot, IntakeFile, ClipSnapshot, CaptureInput } from "./intake.ts";
import type { KnowledgeDraft, KnowledgeInput } from "./knowledge.ts";
import type { ChangesSnapshot } from "./changes.ts";
import type { PdfOriginalSnapshot } from "./pdf.ts";
import type { PdfExtraction } from "../pdf/record.ts";
class Element {
  tagName: string; id = ""; textContent = ""; disabled = false; hidden = false; className = ""; selected = false; multiple = false; checked = false; readOnly = false; open = false; parentElement: Element | null = null;
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
  hasAttribute(key: string): boolean { return Object.hasOwn(this.attributes, key); }
  querySelectorAll(selector: string): Element[] { return this.all().filter(node => selector.includes("research-work") ? node.dataset.researchWork : node.dataset.askAction); }
}
const flush = async () => { await new Promise<void>(r => setImmediate(r)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const intake: IntakeSnapshot = { id: "intake", projects: ["Projects/Demo"], clips: [{ path: "Inbox/Clip.md", hash: "a".repeat(64) }], coverage: "Bounded duplicate coverage" };
const clip: ClipSnapshot = { id: "clip", path: "Inbox/Clip.md", hash: "a".repeat(64), name: "Saved", project: "Projects/Demo", metadata: { title: null, author: null, url: null, published: null, captured: null }, original: "ORIGINAL_CLIP", matches: [{ path: "Sources/Earlier.md", hash: "b".repeat(64), reason: "Same URL" }], coverage: "Bounded current matches" };
const draft: KnowledgeDraft = { id: "draft", answer: { supported: true, answer: [], gaps: [] }, bundle: { sources: [], noteHashes: {}, truncated: false }, operations: [{ path: "Knowledge/New.md", before: null, after: "GENERATED_DRAFT" }], model: "local", generatedAt: 1, coverage: "One source" };
const changed = { pending: null, history: [], recovery: null } as ChangesSnapshot;
function fixture(t: TestContext) {
  const roots = new Map<string, Element>();
  const el = (id: string): Element => { const dynamic = [...roots.values()].flatMap(node => node.all()).find(node => node.id === id); if (dynamic) return dynamic; if (!roots.has(id)) roots.set(id, new Element()); return roots.get(id)!; };
  for (const [key, replacement] of [["document", { getElementById: el, createElement: (tag: string) => new Element(tag) }], ["Option", class extends Element { constructor(label: string, value: string) { super("option"); this.textContent = label; this.value = value; } }]] as const) {
    const before = Object.getOwnPropertyDescriptor(globalThis, key); Object.defineProperty(globalThis, key, { configurable: true, value: replacement }); t.after(() => { if (before) Object.defineProperty(globalThis, key, before); else Reflect.deleteProperty(globalThis, key); });
  }
  el("research-mode").value = "capture"; el("research-scope").value = "project";
  const pdfRead = deferred<DesktopResult<PdfOriginalSnapshot>>(), extracted = deferred<PdfExtraction>(), signals: AbortSignal[] = [];
  const loaded = deferred<DesktopResult<IntakeSnapshot>>(), picked = deferred<DesktopResult<IntakeFile | null>>(), reviewed = deferred<DesktopResult<ClipSnapshot>>(), generated = deferred<DesktopResult<KnowledgeDraft>>(), prepared = deferred<DesktopResult<ChangesSnapshot>>();
  const access = { revision: 1, generation: 1, selection: { folder: "Projects", project: "Projects/Demo" }, model: "local", embeddingModel: "" };
  const calls = { edits: [] as boolean[], captures: [] as CaptureInput[], acknowledge: [] as boolean[], generations: [] as KnowledgeInput[], draftIds: [] as string[], reviews: 0, handoffs: [] as CollectionHandoff[], asks: 0, saveNames: [] as string[], resetAsk: 0, consents: [] as [string, boolean][], pdfPrepares: [] as [string, PdfExtraction, string][] };
  const bridge = { cancelResearch: async () => ({ ok: true, value: null }), researchDraftChanged: async (keep: boolean) => { calls.edits.push(keep); return { ok: true, value: null }; },
    loadIntake: () => loaded.promise, pickIntakeFile: () => picked.promise, suggestIntakeProject: async () => ({ ok: true, value: "Projects/Demo" }), prepareCapture: (_id: string, input: CaptureInput) => { calls.captures.push(input); return prepared.promise; }, reviewClip: () => reviewed.promise, prepareClip: (_id: string, _reviewId: string, ack: boolean) => { calls.acknowledge.push(ack); return prepared.promise; },
    loadKnowledge: async () => ({ ok: true, value: { id: "knowledge", project: "Projects/Demo", sources: [{ path: "Sources/Note.md", hash: "a".repeat(64) }], destinations: ["Knowledge/Existing.md"], links: ["Projects/Demo/Overview.md"], coverage: "Bounded context" } }),
    generateKnowledge: (_id: string, input: KnowledgeInput) => { calls.generations.push(input); return generated.promise; }, prepareKnowledge: (id: string) => { calls.draftIds.push(id); return prepared.promise; },
    loadPdfs: async () => ({ ok: true, value: { id: "pdfs", files: [{ path: "Papers/Study.pdf", bytes: 2048, consented: true }, { path: "Papers/Other.pdf", bytes: 1024, consented: false }], coverage: "2 permitted PDFs" } }),
    consentPdf: async (path: string, granted: boolean) => { calls.consents.push([path, granted]); return { ok: true, value: {} }; }, readPdf: () => pdfRead.promise, readPdfAsset: async () => ({ ok: true, value: new Uint8Array() }),
    preparePdf: (_id: string, token: string, extraction: PdfExtraction, name: string) => { calls.pdfPrepares.push([token, extraction, name]); return prepared.promise; },
    resetAsk: async () => { calls.resetAsk++; return { ok: true, value: null }; }, cancelAI: async () => ({ ok: true, value: null }), retrieveAsk: async () => { calls.asks++; throw Error("No automatic retrieval"); }, saveAskCollection: (_id: string, name: string) => { calls.saveNames.push(name); return prepared.promise; }
  } as unknown as DesktopBridge;
  const view = new ResearchView(bridge, () => access, () => {}, () => { calls.reviews++; }, () => {}, handoff => calls.handoffs.push(handoff), async (_bytes, _asset, signal) => { signals.push(signal); return extracted.promise; });
  const all = () => [...roots.values()].flatMap(root => root.all()), label = (name: string): Element => { const node = all().find(node => node.attributes["aria-label"] === name); assert.ok(node, name); return node; }, button = (name: string): Element => { const node = all().find(node => node.tagName === "BUTTON" && node.textContent === name); assert.ok(node, name); return node; };
  const ready = async (mode = "capture") => { el("research-mode").value = mode; const work = view.refresh(); loaded.resolve({ ok: true, value: intake }); await work; };
  return { el, roots, view, bridge, access, calls, pdfRead, extracted, signals, loaded, picked, reviewed, generated, prepared, label, button, ready, all };
}
test("research refresh and file picking discard late responses after access or input changes", async t => {
  const f = fixture(t), pending = f.view.refresh(); f.view.invalidate("Access revoked"); f.access.revision++; f.loaded.resolve({ ok: true, value: intake }); await pending; assert.equal(f.el("research-content").children.length, 0); assert.equal(f.el("research-refresh").disabled, false); assert.equal(f.el("research-status").textContent, "Access revoked");
  await f.ready(); f.button("Choose local text file").fire("click"); f.label("Captured note name").fire("input"); f.picked.resolve({ ok: true, value: { id: "file", name: "Source.txt", hash: "a".repeat(64), text: "LATE_PRIVATE_TEXT" } }); await flush(); assert.equal(f.label("Captured text").value, ""); assert.ok(!f.all().some(node => node.textContent.includes("LATE_PRIVATE_TEXT")));
});
test("refused file picks clear the choosing label and keep the typed URL single-line", async t => {
  const f = fixture(t); await f.ready(); assert.equal(f.label("Original URL (optional, not fetched)").tagName, "INPUT"); assert.equal(f.label("Captured text").tagName, "TEXTAREA");
  f.button("Choose local text file").fire("click"); f.picked.resolve({ ok: false, message: "Choose a valid UTF-8 text file; invalid bytes are not replaced." } as DesktopResult<IntakeFile | null>); await flush();
  assert.equal(f.el("research-status").textContent, "Choose a valid UTF-8 text file; invalid bytes are not replaced."); assert.ok(f.all().some(node => node.textContent === "No file retained.")); assert.ok(!f.all().some(node => node.textContent.startsWith("Choosing"))); assert.equal(f.label("Captured text").readOnly, false);
});
test("capture starts without project association, applies suggestions only on choice and passes an opaque picked token", async t => {
  const f = fixture(t); await f.ready(); assert.equal(f.label("Capture project association").value, ""); f.label("Captured text").value = "Typed thought"; f.button("Suggest project association").fire("click"); await flush(); assert.equal(f.label("Capture project association").value, ""); f.button("Use suggested project").fire("click"); assert.equal(f.label("Capture project association").value, "Projects/Demo");
  f.button("Choose local text file").fire("click"); f.picked.resolve({ ok: true, value: { id: "opaque", name: "Original.txt", hash: "a".repeat(64), text: "ORIGINAL_TEXT" } }); await flush(); assert.equal(f.label("Captured text").value, "ORIGINAL_TEXT"); f.button("Preview captured note").fire("click"); assert.equal(f.calls.captures[0]!.kind, "import"); assert.equal(f.calls.captures[0]!.file, "opaque"); assert.equal(f.calls.captures[0]!.text, ""); f.view.hide(); f.prepared.resolve({ ok: true, value: changed }); await flush(); assert.equal(f.calls.reviews, 0);
});
test("clip acknowledgement retains reviewed metadata while changed clip inputs require another review", async t => {
  const f = fixture(t); await f.ready("clips"); assert.equal(f.label("Clip project association").value, ""); assert.equal(f.button("Preview clipped source").disabled, true); f.label("Saved clip").value = "Inbox/Clip.md"; f.label("Clip project association").value = "Projects/Demo";
  f.button("Review selected clip").fire("click"); f.reviewed.resolve({ ok: true, value: clip }); await flush(); assert.equal(f.button("Preview clipped source").disabled, false); assert.ok(f.all().some(node => node.textContent === "Title: Unknown"));
  f.label("I reviewed possible duplicates").checked = true; f.label("I reviewed possible duplicates").fire("change"); assert.equal(f.calls.edits.at(-1), true); assert.ok(f.el("research-clip-review").children.length); f.button("Preview clipped source").fire("click"); assert.deepEqual(f.calls.acknowledge, [true]); f.label("New clipped source name").fire("input"); assert.equal(f.button("Preview clipped source").disabled, true); assert.equal(f.el("research-clip-review").children.length, 0); f.prepared.resolve({ ok: true, value: changed }); await flush(); assert.equal(f.calls.reviews, 0);
});
test("knowledge requires explicit selections and stale generation or prepare results cannot display or navigate", async t => {
  const f = fixture(t); await f.ready("knowledge"); const sources = f.label("Synthesis sources"); assert.equal(sources.multiple, true); assert.equal(sources.selectedOptions.length, 0); assert.equal(f.label("Optional project link").value, ""); sources.options[0]!.selected = true; f.label("Knowledge title").value = "Research";
  f.button("Generate knowledge proposal").fire("click"); assert.deepEqual(f.calls.generations[0]!.sources, ["Sources/Note.md"]); f.label("Synthesis focus").fire("input"); f.generated.resolve({ ok: true, value: draft }); await flush(); assert.equal(f.el("research-knowledge-draft").children.length, 0); assert.equal(f.button("Preview knowledge changes").disabled, true);
  f.button("Generate knowledge proposal").fire("click"); await flush(); assert.equal(f.button("Preview knowledge changes").disabled, false); f.button("Preview knowledge changes").fire("click"); assert.deepEqual(f.calls.draftIds, ["draft"]); f.el("research-cancel").fire("click"); f.prepared.resolve({ ok: true, value: changed }); await flush(); assert.equal(f.calls.reviews, 0); assert.equal(f.el("research-content").children.length, 0);
});
function handoff(): CollectionHandoff {
  const bundle = { sources: [{ id: "S1", path: "Sources/Current.md", heading: "Budget", excerpt: "CURRENT_REFERENCE", contentHash: "a".repeat(64), modifiedAt: 1, recordedDate: "2026-10-22", dateBasis: "record date" }], noteHashes: { "Sources/Current.md": "b".repeat(64) }, truncated: false };
  return { snapshot: { id: "ask", request: { question: "Collection question", selection: { folder: "Projects", project: "Projects/Demo" }, scope: "project", method: "keyword", level: "standard", filters: {}, embeddingModel: "" }, index: { revision: 1, generation: 1, listing: { identityIncomplete: false } } as IndexSnapshot, bundle, history: [] }, context: { id: "context", retrievalId: "ask", bundle, conversation: { serialized: "[]", turns: [], omitted: [] } } as CollectionHandoff["context"], choices: { S1: "pin" } };
}
test("collection view hides unavailable references, requires an explicit changed-reference checkbox and passes intents only", async t => {
  const f = fixture(t), data = handoff(); let submitted: unknown;
  f.bridge.loadCollections = async () => ({ ok: true, value: { id: "collections", scope: "project", project: "Projects/Demo", items: [{ path: "Projects/Demo/Collections/Research.md", title: "Research", hash: "c".repeat(64) }], coverage: "Current scope" } });
  f.bridge.openCollection = async () => ({ ok: true, value: { id: "review", path: "Projects/Demo/Collections/Research.md", title: "Research", hash: "c".repeat(64), rows: [{ number: 1, state: "changed", choice: "pin", source: data.snapshot.bundle.sources[0], noteHash: "b".repeat(64) }, { number: 2, state: "unavailable", choice: "exclude" }], coverage: "Reconfirm changed passages" } });
  f.bridge.reuseCollection = async (_id, _review, choices, question) => { submitted = { choices, question }; return { ok: true, value: data }; };
  await f.ready("collections"); f.button("Open collection: Research").fire("click"); await flush(); assert.equal(f.label("Reconfirm reference 1").checked, false); assert.equal(f.label("Collection choice 2").disabled, true); assert.ok(f.all().some(node => node.textContent.startsWith("Unavailable under current scope")));
  f.label("Collection question").value = "Research?"; f.label("Reconfirm reference 1").checked = true; f.label("Reconfirm reference 1").fire("change"); f.label("Collection choice 1").value = "include"; f.label("Collection choice 1").fire("change"); f.button("Use chosen references in Ask").fire("click"); await flush(); assert.deepEqual(submitted, { choices: { choices: { "1": "include" }, confirmed: [1] }, question: "Research?" }); assert.equal(f.calls.handoffs.length, 1);
});
test("Ask adopts a trusted collection without retrieval/generation and late collection saves cannot navigate after edits", async t => {
  const f = fixture(t), ask = new AskView(f.bridge, () => f.access, () => {}, () => { f.calls.reviews++; }), data = handoff(); ask.adoptCollection(data); assert.equal(f.calls.asks, 0); assert.equal(f.calls.resetAsk, 0); assert.equal(f.el("ask-question").value, data.snapshot.request.question); assert.equal(f.label("Evidence choice S1").value, "pin"); assert.match(f.el("ask-context-exact").textContent, /CURRENT_REFERENCE/); assert.equal(f.el("ask-generate").disabled, false);
  f.label("Collection name").value = "Research"; f.label("Collection name").fire("input"); f.button("Preview named collection").fire("click"); assert.deepEqual(f.calls.saveNames, ["Research"]); f.label("Collection name").value = "New name"; f.label("Collection name").fire("input"); f.prepared.resolve({ ok: true, value: changed }); await flush(); assert.equal(f.calls.reviews, 0);
  f.access.revision++; ask.adoptCollection(data); assert.equal(f.el("ask-results").children.length, 0); assert.equal(f.calls.resetAsk, 1);
});
const pdfOriginal: PdfOriginalSnapshot = { token: "token", path: "Papers/Study.pdf", hash: "a".repeat(64), bytes: new Uint8Array([37, 80, 68, 70]) };
const pdfText: PdfExtraction = { totalPages: 1, pages: [{ page: 1, text: "EXTRACTED_PAGE_TEXT", shortened: false }] };
test("PDF mode grants exact files, previews extracted pages and saves only the current extraction through review", async t => {
  const f = fixture(t); f.el("research-mode").value = "pdfs"; await f.view.refresh(); assert.equal(f.button("Preview PDF source").disabled, true);
  f.button("Grant PDF read: Papers/Other.pdf").fire("click"); f.button("Revoke PDF read: Papers/Study.pdf").fire("click"); await flush(); assert.deepEqual(f.calls.consents[0], ["Papers/Other.pdf", true]);
  await f.view.refresh(); assert.deepEqual(f.label("PDF to extract").options.map(option => option.value), ["", "Papers/Study.pdf"]); f.label("PDF to extract").value = "Papers/Study.pdf"; f.label("New PDF source name").value = "Study text";
  f.button("Extract selected PDF").fire("click"); f.pdfRead.resolve({ ok: true, value: pdfOriginal }); await flush(); f.extracted.resolve(pdfText); await flush(); await flush();
  assert.ok(f.all().some(node => node.textContent === "EXTRACTED_PAGE_TEXT")); assert.equal(f.button("Preview PDF source").disabled, false);
  f.label("New PDF source name").fire("input"); assert.equal(f.calls.edits.length, 0); f.button("Preview PDF source").fire("click"); assert.deepEqual(f.calls.pdfPrepares[0], ["token", pdfText, "Study text"]);
  f.prepared.resolve({ ok: true, value: changed }); await flush(); assert.equal(f.calls.reviews, 1);
});
test("PDF extraction is aborted by cancel and late reads or extractions cannot display or enable saving", async t => {
  const f = fixture(t); f.el("research-mode").value = "pdfs"; await f.view.refresh(); f.label("PDF to extract").value = "Papers/Study.pdf";
  f.button("Extract selected PDF").fire("click"); f.pdfRead.resolve({ ok: true, value: pdfOriginal }); await flush(); assert.equal(f.signals.length, 1);
  f.el("research-cancel").fire("click"); assert.equal(f.signals[0]!.aborted, true); f.extracted.resolve(pdfText); await flush(); await flush();
  assert.ok(!f.all().some(node => node.textContent === "EXTRACTED_PAGE_TEXT")); assert.equal(f.el("research-content").children.length, 0); assert.equal(f.calls.pdfPrepares.length, 0);
});
test("changing the selected PDF clears a finished preview and aborts a running extraction", async t => {
  const f = fixture(t); f.el("research-mode").value = "pdfs"; await f.view.refresh(); f.label("PDF to extract").value = "Papers/Study.pdf";
  f.button("Extract selected PDF").fire("click"); f.pdfRead.resolve({ ok: true, value: pdfOriginal }); await flush(); f.extracted.resolve(pdfText); await flush(); await flush();
  assert.equal(f.button("Preview PDF source").disabled, false); f.label("PDF to extract").value = ""; f.label("PDF to extract").fire("change");
  assert.equal(f.button("Preview PDF source").disabled, true); assert.equal(f.el("research-pdf-preview").children.length, 0); assert.equal(f.signals[0]!.aborted, false);
  const g = fixture(t); g.el("research-mode").value = "pdfs"; await g.view.refresh(); g.label("PDF to extract").value = "Papers/Study.pdf";
  g.button("Extract selected PDF").fire("click"); g.pdfRead.resolve({ ok: true, value: pdfOriginal }); await flush(); g.label("PDF to extract").fire("change"); assert.equal(g.signals[0]!.aborted, true);
  g.extracted.resolve(pdfText); await flush(); await flush(); assert.ok(!g.all().some(node => node.textContent === "EXTRACTED_PAGE_TEXT")); assert.equal(g.button("Preview PDF source").disabled, true);
});
