import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { PortabilityView } from "./portability-view.ts";
import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { ExportPreviewSnapshot, PackageSummary, ImportPreviewSnapshot, ComparisonSnapshot } from "./portability.ts";
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
  fire(event: string): void { if (this.disabled) return; for (const listener of this.listeners.get(event) ?? []) listener(); }
  focus(): void {}
  scrollIntoView(): void {}
  all(): Element[] { return this.children.flatMap(child => [child, ...child.all()]); }
  hasAttribute(key: string): boolean { return Object.hasOwn(this.attributes, key); }
  querySelectorAll(selector: string): Element[] { return this.all().filter(node => selector === "input" ? node.tagName === "INPUT" : selector.includes("portability-work") ? node.dataset.portabilityWork : node.dataset.askAction); }
}
const flush = async () => { await new Promise<void>(r => setImmediate(r)); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const manifest = { id: "m", createdAt: "2026-10-27T00:00:00.000Z", project: { path: "Projects/Demo", id: "demo", title: "Demo" }, entries: [{ path: "Projects/Demo/Notes.md", kind: "markdown" as const, bytes: 5, sha256: "a".repeat(64), identity: { id: null, type: null, project: null }, links: [], references: [] }], omissions: { unavailable: 0, unselected: 0, candidateLimit: 0 } };
const summary: PackageSummary = { token: "token", name: "C.thread-project.json", hash: "b".repeat(64), project: manifest.project, createdAt: manifest.createdAt, entries: 1, omissions: manifest.omissions };
function fixture(t: TestContext) {
  const roots = new Map<string, Element>();
  const el = (id: string): Element => { const dynamic = [...roots.values()].flatMap(node => node.all()).find(node => node.id === id); if (dynamic) return dynamic; if (!roots.has(id)) roots.set(id, new Element()); return roots.get(id)!; };
  const before = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: el, createElement: (tag: string) => new Element(tag) } }); t.after(() => { if (before) Object.defineProperty(globalThis, "document", before); else Reflect.deleteProperty(globalThis, "document"); });
  el("portability-mode").value = "export";
  const access = { revision: 1, generation: 1, selection: { folder: "Projects", project: "Projects/Demo" } };
  const previewed = deferred<DesktopResult<ExportPreviewSnapshot>>(), picked = deferred<DesktopResult<PackageSummary | null>>(), importPreview = deferred<DesktopResult<ImportPreviewSnapshot>>(), compared = deferred<DesktopResult<ComparisonSnapshot>>();
  const calls = { cancels: 0, writes: [] as string[], applies: [] as string[], leaves: 0, opened: [] as string[], previews: [] as string[][] };
  const bridge = {
    cancelPortability: async () => { calls.cancels++; return { ok: true, value: null }; },
    exportInventory: async () => ({ ok: true, value: { id: "inv", project: "Projects/Demo", candidates: [{ path: "Projects/Demo/Notes.md", kind: "text", hash: "a".repeat(64) }], unavailable: 0, candidateLimit: 0, coverage: "1 file" } }),
    previewExport: (_id: string, selected: string[]) => { calls.previews.push(selected); return previewed.promise; }, writeExport: async (id: string) => { calls.writes.push(id); return { ok: true, value: "Projects/Demo/Checkpoints/C.thread-project.json" }; },
    importStatus: async () => ({ ok: true, value: { pending: { root: "Thread Import R", source: "C.thread-project.json", startedAt: "now", created: 1, total: 2, inFlight: false }, completed: 0 } }),
    pickPackage: () => picked.promise, previewImport: () => importPreview.promise, applyImport: async (id: string) => { calls.applies.push(id); return { ok: true, value: { pending: null, completed: 1 } }; }, leaveImport: async () => { calls.leaves++; return { ok: true, value: { pending: null, completed: 0 } }; },
    compareCheckpoint: () => compared.promise
  } as unknown as DesktopBridge;
  const view = new PortabilityView(bridge, () => access, () => {}, path => calls.opened.push(path));
  const all = () => [...roots.values()].flatMap(root => root.all()), label = (name: string): Element => { const node = all().find(node => node.attributes["aria-label"] === name); assert.ok(node, name); return node; }, button = (name: string): Element => { const node = all().find(node => node.tagName === "BUTTON" && node.textContent === name); assert.ok(node, name); return node; };
  return { el, view, access, calls, previewed, picked, importPreview, compared, label, button, all };
}
test("export previews only explicitly chosen files, inputs lock while previewing and a canceled late preview is discarded", async t => {
  const f = fixture(t); await f.view.refresh(); assert.equal(f.button("Save previewed checkpoint").disabled, true);
  f.label("Include Projects/Demo/Notes.md").checked = true; f.label("Include Projects/Demo/Notes.md").fire("change"); f.button("Preview checkpoint").fire("click"); assert.deepEqual(f.calls.previews[0], ["Projects/Demo/Notes.md"]);
  assert.equal(f.label("Checkpoint name").disabled, true); f.el("portability-cancel").fire("click"); f.previewed.resolve({ ok: true, value: { id: "late", path: "x", bytes: 1, manifest, texts: ["LATE_TEXT"] } }); await flush();
  assert.ok(!f.all().some(node => node.textContent.includes("LATE_TEXT"))); assert.equal(f.el("portability-content").children.length, 0);
});
test("export saves the current preview and import recovery, preview and apply use main-held tokens only", async t => {
  const f = fixture(t); await f.view.refresh();
  f.previewed.resolve({ ok: true, value: { id: "p1", path: "Projects/Demo/Checkpoints/C.thread-project.json", bytes: 10, manifest, texts: ["NOTES_TEXT"] } });
  f.button("Preview checkpoint").fire("click"); await flush(); assert.ok(f.all().some(node => node.textContent.includes("NOTES_TEXT"))); f.button("Save previewed checkpoint").fire("click"); await flush(); assert.deepEqual(f.calls.writes, ["p1"]);
  f.el("portability-mode").value = "import"; await f.view.refresh(); assert.ok(f.all().some(node => node.textContent.includes("Interrupted import into Thread Import R")));
  f.button("Choose package file").fire("click"); f.picked.resolve({ ok: true, value: summary }); await flush(); assert.equal(f.button("Preview import").disabled, false);
  f.button("Preview import").fire("click"); f.importPreview.resolve({ ok: true, value: { id: "i1", root: "Thread Import R", entries: [{ path: "Thread Import R/Projects/Demo/Notes.md", bytes: 5, kind: "markdown" }], warnings: ["ID warning"], recovery: true, adopted: [] } }); await flush();
  assert.ok(f.all().some(node => node.textContent === "Recovery preview for Thread Import R")); f.button("Import as new copies").fire("click"); await flush(); assert.deepEqual(f.calls.applies, ["i1"]);
  f.button("Close interrupted import (keep partial copies)").fire("click"); await flush(); assert.equal(f.calls.leaves, 1);
});
test("late package picks are ignored after cancel and comparisons render rows with current-source links", async t => {
  const f = fixture(t); f.el("portability-mode").value = "compare"; await f.view.refresh(); f.button("Choose package file").fire("click"); f.el("portability-cancel").fire("click");
  f.picked.resolve({ ok: true, value: summary }); await flush(); assert.equal(f.el("portability-content").children.length, 0);
  await f.view.refresh(); const again = fixture(t); again.el("portability-mode").value = "compare"; await again.view.refresh(); again.button("Choose package file").fire("click"); again.picked.resolve({ ok: true, value: summary }); await flush();
  again.button("Compare with current project").fire("click"); again.compared.resolve({ ok: true, value: { project: "Projects/Demo", rows: [{ path: "Projects/Demo/Notes.md", kind: "markdown", state: "changed", before: { hash: "a".repeat(64), bytes: 5, text: "OLD" }, after: { hash: "c".repeat(64), bytes: 6, text: "NEW" } }], hashes: {}, missing: [], unavailable: 0, currentLimit: 0, omissions: manifest.omissions, capturedAt: "now" } }); await flush();
  assert.ok(again.all().some(node => node.textContent === "Projects/Demo/Notes.md - changed")); again.button("Open current Projects/Demo/Notes.md").fire("click"); assert.deepEqual(again.calls.opened, ["Projects/Demo/Notes.md"]);
});
test("inputs and the workflow selector are locked while an import runs, so edits cannot cancel a write mid-way", async t => {
  const f = fixture(t), applied = deferred<DesktopResult<{ pending: null; completed: number }>>(); f.el("portability-mode").value = "import"; await f.view.refresh();
  f.button("Choose package file").fire("click"); f.picked.resolve({ ok: true, value: summary }); await flush(); f.button("Preview import").fire("click");
  f.importPreview.resolve({ ok: true, value: { id: "i1", root: "Thread Import X", entries: [], warnings: [], recovery: false, adopted: [] } }); await flush();
  (f as unknown as { calls: { applies: string[] } }).calls.applies.length = 0; const bridge = (f.view as unknown as { bridge: DesktopBridge }).bridge as unknown as Record<string, unknown>; bridge.applyImport = () => applied.promise;
  f.button("Import as new copies").fire("click"); assert.equal(f.label("New top-level import folder (outside read access)").disabled, true); assert.equal(f.el("portability-mode").disabled, true);
  applied.resolve({ ok: true, value: { pending: null, completed: 1 } }); await flush(); assert.equal(f.label("New top-level import folder (outside read access)").disabled, false); assert.match(f.el("portability-status").textContent, /Imported/);
});
test("a save confirmation survives the panel refresh caused by the new package file", async t => {
  const f = fixture(t); await f.view.refresh(); f.previewed.resolve({ ok: true, value: { id: "p1", path: "Projects/Demo/Checkpoints/C.thread-project.json", bytes: 10, manifest, texts: ["NOTES_TEXT"] } });
  f.button("Preview checkpoint").fire("click"); await flush(); f.button("Save previewed checkpoint").fire("click"); await flush();
  f.view.invalidate(); assert.match(f.el("portability-status").textContent, /Saved checkpoint Projects\/Demo\/Checkpoints\/C\.thread-project\.json\..*refreshed after the vault changed/);
  await f.view.refresh(); assert.equal(f.el("portability-status").textContent, "Context ready. Choose inputs explicitly; nothing is written automatically.");
});
test("a write confirmation is shown once, survives a refresh that lands first, and never replaces a cancel message", async t => {
  const f = fixture(t), saved = deferred<DesktopResult<string>>(); await f.view.refresh();
  f.previewed.resolve({ ok: true, value: { id: "p1", path: "x", bytes: 1, manifest, texts: ["T"] } }); f.button("Preview checkpoint").fire("click"); await flush();
  const bridge = (f.view as unknown as { bridge: Record<string, unknown> }).bridge; bridge.writeExport = () => saved.promise;
  f.button("Save previewed checkpoint").fire("click"); f.view.invalidate(); saved.resolve({ ok: true, value: "Projects/Demo/Checkpoints/C.thread-project.json" }); await flush();
  assert.match(f.el("portability-status").textContent, /^Saved checkpoint Projects\/Demo\/Checkpoints\/C\.thread-project\.json\./);
  f.view.invalidate(); assert.equal(f.el("portability-status").textContent, "Refresh portability for the current permitted project.");
  await f.view.refresh(); f.button("Preview checkpoint").fire("click"); await flush(); bridge.writeExport = async () => ({ ok: true, value: "Projects/Demo/Checkpoints/D.thread-project.json" });
  f.button("Save previewed checkpoint").fire("click"); await flush(); f.el("portability-cancel").fire("click"); assert.equal(f.el("portability-status").textContent, "Portability work canceled. Refresh to continue.");
});
test("a late save reply leaves a newer preview built after a refresh intact and saveable", async t => {
  const f = fixture(t), saved = deferred<DesktopResult<string>>(); await f.view.refresh();
  f.previewed.resolve({ ok: true, value: { id: "p1", path: "x", bytes: 1, manifest, texts: ["T"] } }); f.button("Preview checkpoint").fire("click"); await flush();
  const bridge = (f.view as unknown as { bridge: Record<string, unknown> }).bridge; bridge.writeExport = () => saved.promise;
  f.button("Save previewed checkpoint").fire("click"); f.view.invalidate(); await f.view.refresh();
  bridge.previewExport = async () => ({ ok: true, value: { id: "p2", path: "y", bytes: 1, manifest, texts: ["T2"] } }); f.button("Preview checkpoint").fire("click"); await flush();
  saved.resolve({ ok: true, value: "Projects/Demo/Checkpoints/C.thread-project.json" }); await flush();
  bridge.writeExport = async (id: string) => { f.calls.writes.push(id); return { ok: true, value: "Projects/Demo/Checkpoints/D.thread-project.json" }; };
  f.button("Save previewed checkpoint").fire("click"); await flush(); assert.deepEqual(f.calls.writes, ["p2"]);
});
