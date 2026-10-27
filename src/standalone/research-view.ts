import type { CollectionChoices, CollectionHandoff, DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { IntakeSnapshot, IntakeFile, ClipSnapshot, CaptureInput } from "./intake.ts";
import type { CollectionsSnapshot, CollectionReview } from "./collections.ts";
import type { KnowledgeSnapshot, KnowledgeDraft } from "./knowledge.ts";
import type { PdfSnapshot } from "./pdf.ts";
import { extractPdf } from "../pdf/parser.ts";
import { PDF_LIMITS, type PdfExtraction } from "../pdf/record.ts";
import { localDay } from "../vault/workspace.ts";
import { contextCoverageText } from "../vault/evidence.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const buffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node; }
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest };
export class ResearchView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private show: () => void;
  private review: () => void;
  private source: (path: string, heading: string, hash: string) => void;
  private handoff: (value: CollectionHandoff) => void;
  private extract: typeof extractPdf;
  private epoch = 0;
  private busy = false;
  private clip: ClipSnapshot | null = null;
  private draft: KnowledgeDraft | null = null;
  private extracted: { token: string; extraction: PdfExtraction } | null = null;
  private controller: AbortController | null = null;
  private reloadAfterIndex = false;
  constructor(bridge: DesktopBridge, access: () => Access | null, show: () => void, review: () => void, source: (path: string, heading: string, hash: string) => void, handoff: (value: CollectionHandoff) => void, extract: typeof extractPdf = extractPdf) {
    this.bridge = bridge; this.access = access; this.show = show; this.review = review; this.source = source; this.handoff = handoff; this.extract = extract;
    el("open-research").addEventListener("click", () => this.open()); el("ask-open-collections").addEventListener("click", () => this.open("collections"));
    for (const id of ["research-mode", "research-scope"]) el(id).addEventListener("change", () => { void this.refresh(); });
    el("research-refresh").addEventListener("click", () => { void this.refresh(); });
    el("research-cancel").addEventListener("click", () => this.invalidate("Canceled. Choose Refresh research to continue."));
    el("research-close").addEventListener("click", () => { this.hide(); el("source-pane").hidden = false; }); this.invalidate();
  }
  private message(text: string): void { el("research-status").textContent = text; }
  invalidate(message = "Choose Refresh research to start."): void { this.epoch++; this.clip = null; this.draft = null; this.extracted = null; this.controller?.abort(); this.controller = null; el("research-content").replaceChildren(); this.setBusy(false); this.message(message); void this.bridge.cancelResearch(); }
  hide(): void { el("research-panel").hidden = true; this.invalidate(); }
  open(mode?: string): void { if (mode) el<HTMLSelectElement>("research-mode").value = mode; this.show(); el("research-panel").hidden = false; el("research-panel").focus(); void this.refresh(); }
  private setBusy(busy: boolean): void { this.busy = busy; el<HTMLButtonElement>("research-refresh").disabled = busy;
    for (const button of el("research-content").querySelectorAll<HTMLButtonElement>("[data-research-work]")) button.disabled = busy || button.dataset.needsClip === "true" && !this.clip || button.dataset.needsDraft === "true" && !this.draft || button.dataset.needsExtraction === "true" && !this.extracted;
  }
  private async run(work: (access: Access, current: () => boolean) => Promise<void>): Promise<void> {
    const access = this.access(); if (!access) { this.message("Choose your notes folder and approve read access first."); return; } if (this.busy) return;
    const epoch = ++this.epoch, key = JSON.stringify(access), current = () => epoch === this.epoch && key === JSON.stringify(this.access()); this.setBusy(true);
    try { await work(access, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "That did not work. Choose Refresh research and try again."); }
    finally { if (current()) this.setBusy(false); }
  }
  async refresh(): Promise<void> {
    this.invalidate("Loading..."); const mode = el<HTMLSelectElement>("research-mode").value;
    el("research-scope-label").hidden = mode !== "collections";
    await this.run(async (access, current) => {
      const area = el("research-content");
      if (mode === "capture" || mode === "clips") { const snapshot = value(await this.bridge.loadIntake(access.selection, access.revision)); if (!current()) return; add(area, "p", snapshot.coverage, "thread-muted"); if (mode === "capture") this.capture(area, snapshot); else this.clips(area, snapshot); }
      else if (mode === "collections") { const snapshot = value(await this.bridge.loadCollections(access.selection, el<HTMLSelectElement>("research-scope").value as "project" | "allowed", access.revision)); if (!current()) return; this.collections(area, snapshot); }
      else if (mode === "pdfs") { const snapshot = value(await this.bridge.loadPdfs(access.revision)); if (!current()) return; this.pdfs(area, snapshot); }
      else { const snapshot = value(await this.bridge.loadKnowledge(access.selection, access.revision)); if (!current()) return; this.knowledge(area, snapshot); }
      this.message("Ready. Nothing is saved until you preview and approve it.");
    });
  }
  /** After a PDF consent change, main rebuilds evidence; reload the PDF list once the new index is ready. */
  indexReady(): void { if (this.reloadAfterIndex && !el("research-panel").hidden) { this.reloadAfterIndex = false; void this.refresh(); } }
  private changed(keepClip = false): void { this.epoch++; this.draft = null; if (!keepClip) { this.clip = null; el("research-clip-review")?.replaceChildren(); } el("research-knowledge-draft")?.replaceChildren(); el("research-suggestion")?.replaceChildren(); this.setBusy(false); void this.bridge.researchDraftChanged(keepClip); this.message("Something changed. Review it or write the draft again; your notes are unchanged."); }
  private button(parent: HTMLElement, label: string, click: () => void, work = false): HTMLButtonElement { const button = add(parent, "button", label); if (work) button.dataset.researchWork = "true"; button.addEventListener("click", click); return button; }
  private input(parent: HTMLElement, label: string, initial: string, max: number, multiline = max > 200): HTMLInputElement | HTMLTextAreaElement { const wrapper = add(parent, "label", label), input = multiline ? add(wrapper, "textarea") : add(wrapper, "input"); input.setAttribute("aria-label", label); input.value = initial; input.maxLength = max; if (input.tagName === "TEXTAREA") (input as HTMLTextAreaElement).rows = 4; input.addEventListener("input", () => this.changed()); return input; }
  private select(parent: HTMLElement, label: string, choices: [string, string][], changed: () => void = () => this.changed()): HTMLSelectElement { const select = add(add(parent, "label", label), "select"); select.setAttribute("aria-label", label); for (const [key, text] of choices) { const option = add(select, "option", text); option.value = key; } select.addEventListener("change", changed); return select; }
  private chip(parent: HTMLElement, path: string, hash: string, heading = ""): void { this.button(parent, path + (heading ? ` > ${heading}` : ""), () => this.source(path, heading, hash)).className = "thread-source-chip"; }
  private exact(parent: HTMLElement, label: string, text: string): void { const details = add(parent, "details"); add(details, "summary", label); const pre = add(details, "pre", text, "thread-excerpt"); pre.tabIndex = 0; }
  private form(parent: HTMLElement, title: string): HTMLElement { const form = add(parent, "section", "", "thread-record-form thread-research-form"); add(form, "h3", title); return form; }
  private capture(area: HTMLElement, snapshot: IntakeSnapshot): void {
    const form = this.form(area, "Capture a thought or local file"); let picked: IntakeFile | null = null;
    const name = this.input(form, "Name for the new note", `${localDay()} Capture`, 100), text = this.input(form, "Captured text", "", 2097152), url = this.input(form, "Web address (optional; Thread never opens it)", "", 2000, false), project = this.select(form, "Project for this note (optional)", [["", "No project"], ...snapshot.projects.map(path => [path, path] as [string, string])]);
    add(form, "p", "A typed thought is saved in your Inbox folder; a chosen .md or .txt file is copied into your Sources folder. Up to 2 MiB (a smaller limit can apply to the change record). The original file is never changed.", "thread-muted");
    const file = add(form, "p", "No file chosen.", "thread-path");
    this.button(form, "Choose local text file", () => { picked = null; text.value = ""; text.readOnly = false; file.textContent = "Choosing a file..."; this.changed(); void this.run(async (access, current) => { let result: IntakeFile | null; try { result = value(await this.bridge.pickIntakeFile(snapshot.id, access.revision)); } catch (error) { if (current()) file.textContent = "No file chosen."; throw error; } if (!current()) return; picked = result; text.value = result?.text ?? ""; text.readOnly = !!result; file.textContent = result ? `${result.name} - copy kept for this note` : "No file chosen."; this.message(result ? "Check the copied text and choose a name for the new note." : "No file chosen."); }); }, true);
    this.button(form, "Use what I typed instead", () => { picked = null; text.value = ""; text.readOnly = false; file.textContent = "No file chosen."; this.changed(); });
    const captured = () => ({ kind: picked ? "import" as const : "thought" as const, text: picked ? "" : text.value, file: picked?.id ?? "" });
    this.button(form, "Suggest a project", () => { void this.run(async (access, current) => { const suggested = value(await this.bridge.suggestIntakeProject(snapshot.id, captured(), access.revision)); if (!current()) return; const result = el("research-suggestion"); result.replaceChildren(); add(result, "p", suggested ? `Suggested project: ${suggested}. Choose Use suggested project to accept it.` : "No matching project found."); if (suggested) this.button(result, "Use suggested project", () => { project.value = suggested; this.changed(); }); }); }, true); add(form, "div").id = "research-suggestion";
    this.button(form, "Preview captured note", () => { const input: CaptureInput = { ...captured(), name: name.value, url: url.value, project: project.value }; void this.run(async (access, current) => { value(await this.bridge.prepareCapture(snapshot.id, input, access.revision)); if (current()) this.review(); }); }, true).className = "thread-primary";
  }
  private clips(area: HTMLElement, snapshot: IntakeSnapshot): void {
    const form = this.form(area, "Review a saved clip"), clip = this.select(form, "Saved clip", [["", "Choose a saved clip"], ...snapshot.clips.map(item => [item.path, item.path] as [string, string])]), project = this.select(form, "Project for this clip", [["", "Choose a project explicitly"], ...snapshot.projects.map(path => [path, path] as [string, string])]), name = this.input(form, "Name for the new source note", `${localDay()} Clip`, 100);
    const acknowledgement = add(add(form, "label", "I reviewed possible duplicates and want a separate copy.", "thread-research-check"), "input"); acknowledgement.type = "checkbox"; acknowledgement.setAttribute("aria-label", "I reviewed possible duplicates"); acknowledgement.addEventListener("change", () => this.changed(true));
    this.button(form, "Review selected clip", () => { this.clip = null; acknowledgement.checked = false; el("research-clip-review").replaceChildren(); void this.run(async (access, current) => {
      const reviewed = value(await this.bridge.reviewClip(snapshot.id, { path: clip.value, project: project.value, name: name.value }, access.revision)); if (!current()) return; this.clip = reviewed; const result = el("research-clip-review");
      add(result, "h3", "What the clip says about itself"); for (const [label, text] of [["Title", reviewed.metadata.title], ["Author", reviewed.metadata.author], ["Web address (never opened)", reviewed.metadata.url], ["Published (as the clip states)", reviewed.metadata.published], ["Clipped on", reviewed.metadata.captured]]) add(result, "p", `${label}: ${text ?? "Unknown"}`);
      add(result, "p", `Chosen project: ${reviewed.project}`); add(result, "p", reviewed.coverage, "thread-muted"); this.chip(result, reviewed.path, reviewed.hash); for (const match of reviewed.matches) { add(result, "p", match.reason); this.chip(result, match.path, match.hash); } this.exact(result, "The clipped text, exactly as saved", reviewed.original); this.message("Check these details and any possible duplicates, then preview the new note.");
    }); }, true);
    add(form, "div").id = "research-clip-review";
    const preview = this.button(form, "Preview clipped source", () => { const reviewed = this.clip; if (!reviewed) return; const accepted = acknowledgement.checked; void this.run(async (access, current) => { value(await this.bridge.prepareClip(snapshot.id, reviewed.id, accepted, access.revision)); if (current()) this.review(); }); }, true); preview.dataset.needsClip = "true"; preview.disabled = true; preview.className = "thread-primary";
  }
  private collections(area: HTMLElement, snapshot: CollectionsSnapshot): void {
    add(area, "p", snapshot.coverage, "thread-muted"); if (!snapshot.items.length) add(area, "p", "No saved collections yet. In Ask, choose Find passages, pick passages and save them as a collection.", "thread-empty");
    const detail = add(area, "section", "", "thread-record-form thread-research-form");
    for (const item of snapshot.items) this.button(area, `Open collection: ${item.title}`, () => { detail.replaceChildren(); this.changed(); void this.run(async (access, current) => { const review = value(await this.bridge.openCollection(snapshot.id, item.path, access.revision)); if (!current()) return; this.collection(detail, snapshot, review); this.message("Collection checked. Confirm any changed passages before using them again."); }); }, true);
  }
  private collection(area: HTMLElement, snapshot: CollectionsSnapshot, review: CollectionReview): void {
    add(area, "h3", review.title); add(area, "p", review.coverage, "thread-muted"); const choices: CollectionChoices = { choices: {}, confirmed: [] };
    for (const row of review.rows) {
      const card = add(area, "article", "", "thread-record-card thread-research-reference"); card.dataset.state = row.state; add(card, "h4", `Reference ${row.number} - ${row.state}`);
      const select = this.select(card, `Collection choice ${row.number}`, [["include", "Include"], ["pin", "Pin first"], ["exclude", "Exclude"]], () => { choices.choices[String(row.number)] = select.value as "include" | "pin" | "exclude"; this.changed(); }); select.value = row.choice; select.disabled = !row.source;
      if (!row.source) { add(card, "p", "Not available with the current access or limits. The old path and text are not shown.", "thread-muted"); continue; }
      this.chip(card, row.source.path, row.noteHash!, row.source.heading); add(card, "pre", row.source.excerpt, "thread-excerpt");
      if (row.state === "changed") { const label = add(card, "label", "I checked this changed passage.", "thread-research-check"), confirm = add(label, "input"); confirm.type = "checkbox"; confirm.setAttribute("aria-label", `Reconfirm reference ${row.number}`); confirm.addEventListener("change", () => { choices.confirmed = choices.confirmed.filter(n => n !== row.number); if (confirm.checked) choices.confirmed.push(row.number); this.changed(); }); }
    }
    const question = this.input(area, "Collection question", "", 1000), name = this.input(area, "New collection copy name", `${review.title.slice(0, 80)} copy`, 100);
    this.button(area, "Use these passages in Ask", () => { const input = structuredClone(choices), query = question.value; void this.run(async (access, current) => { const result = value(await this.bridge.reuseCollection(snapshot.id, review.id, input, query, access.revision)); if (current()) this.handoff(result); }); }, true).className = "thread-primary";
    this.button(area, "Preview collection copy", () => { const input = structuredClone(choices), title = name.value; void this.run(async (access, current) => { value(await this.bridge.saveEditedCollection(snapshot.id, review.id, input, title, access.revision)); if (current()) this.review(); }); }, true);
  }
  private knowledge(area: HTMLElement, snapshot: KnowledgeSnapshot): void {
    add(area, "p", snapshot.coverage, "thread-muted"); const form = this.form(area, "Write a summary note"), name = this.input(form, "Summary note title", "", 100), focus = this.input(form, "Summary focus (optional)", "", 1000), type = this.select(form, "Knowledge type", [["concept", "Concept"], ["comparison", "Comparison"]]), existing = this.select(form, "Save summary to", [["", "Create a new Knowledge note"], ...snapshot.destinations.map(path => [path, `Append to ${path}`] as [string, string])]), link = this.select(form, "Also link from a project note (optional)", [["", "No project-note change"], ...snapshot.links.map(path => [path, path] as [string, string])]), sources = this.select(form, "Summary sources (up to five)", snapshot.sources.map(source => [source.path, source.path])); sources.multiple = true; sources.size = 6; for (const option of sources.options) option.selected = false;
    add(form, "p", "Choose up to five sources (Ctrl-click, or Shift with the arrow keys). They must be different from the note you add to or link from. You review every note before it is written.", "thread-muted");
    this.button(form, "Write a draft with AI", () => { this.draft = null; el("research-knowledge-draft").replaceChildren(); const input = { name: name.value, focus: focus.value, type: type.value as "concept" | "comparison", existing: existing.value, link: link.value, sources: [...sources.selectedOptions].map(option => option.value) }; void this.run(async (access, current) => {
      this.message("The AI is writing a draft with citations, on this computer..."); const draft = value(await this.bridge.generateKnowledge(snapshot.id, input, access.revision)); if (!current()) return; this.draft = draft; const output = el("research-knowledge-draft"); add(output, "h3", "AI interpretation - notes unchanged"); add(output, "p", `${draft.model} - ${new Date(draft.generatedAt).toLocaleString()}`, "thread-muted"); add(output, "p", contextCoverageText(draft.bundle), "thread-muted"); for (const claim of draft.answer.answer) { add(output, "p", `${claim.kind}: ${claim.text}`); for (const id of claim.sourceIds) { const source = draft.bundle.sources.find(s => s.id === id)!; this.chip(output, source.path, draft.bundle.noteHashes[source.path]!, source.heading); } } for (const gap of draft.answer.gaps) add(output, "p", gap, "thread-muted"); for (const operation of draft.operations) this.exact(output, `${operation.before === null ? "New note" : "Append"}: ${operation.path}`, operation.after); this.message("Draft ready. Preview every note it would change before applying.");
    }); }, true);
    add(form, "div", "", "thread-ai-card").id = "research-knowledge-draft";
    const prepare = this.button(form, "Preview the notes", () => { const draft = this.draft; if (!draft) return; void this.run(async (access, current) => { value(await this.bridge.prepareKnowledge(draft.id, access.revision)); if (current()) this.review(); }); }, true); prepare.dataset.needsDraft = "true"; prepare.disabled = true; prepare.className = "thread-primary";
  }
  private pdfs(area: HTMLElement, snapshot: PdfSnapshot): void {
    add(area, "p", snapshot.coverage, "thread-muted"); if (!snapshot.files.length) add(area, "p", "No PDFs in the folders Thread may read. Put a PDF in one of them, then choose Refresh research.", "thread-empty");
    const grants = add(area, "section", "", "thread-record-form thread-research-form"); add(grants, "h3", "Which PDFs Thread may read");
    add(grants, "p", "Allow PDFs one at a time, for this session only. Allowing one PDF lets Thread read only that file; changing what Thread may read removes every PDF permission.", "thread-muted");
    for (const file of snapshot.files) {
      const row = add(grants, "div", "", "thread-controls"); add(row, "span", `${file.path} - ${Math.ceil(file.bytes / 1024)} KiB - ${file.consented ? "allowed" : "not allowed"}`, "thread-path");
      this.button(row, `${file.consented ? "Revoke" : "Grant"} PDF read: ${file.path}`, () => { this.reloadAfterIndex = true; void this.run(async access => { try { value(await this.bridge.consentPdf(file.path, !file.consented, access.revision)); this.message("PDF permission changed. Updating; the list reloads when ready."); } catch (error) { this.reloadAfterIndex = false; throw error; } }); }, true);
    }
    const form = this.form(area, "Get the PDF's text"), granted = snapshot.files.filter(file => file.consented);
    const pick = this.select(form, "PDF to extract", [["", granted.length ? "Choose an allowed PDF" : "Allow a PDF first"], ...granted.map(file => [file.path, file.path] as [string, string])], () => { this.extracted = null; this.controller?.abort(); this.controller = null; el("research-pdf-preview").replaceChildren(); this.changed(); });
    const name = add(add(form, "label", "New PDF source name"), "input"); name.setAttribute("aria-label", "New PDF source name"); name.maxLength = 100; name.value = `${localDay()} PDF`;
    add(form, "p", `Thread reads the text on this computer. Scanned or image-only pages have no readable text, and Thread does not do OCR. Limits: 16 MiB, ${PDF_LIMITS.totalPages} pages, ${PDF_LIMITS.pages} pages read and ${PDF_LIMITS.chars} characters. Saving creates a new note in your Sources folder; the PDF and earlier notes from it stay unchanged.`, "thread-muted");
    this.button(form, "Extract selected PDF", () => { const path = pick.value; this.extracted = null; el("research-pdf-preview").replaceChildren(); if (!path) { this.message("Choose an allowed PDF first."); return; } void this.run(async (access, current) => {
      const original = value(await this.bridge.readPdf(snapshot.id, path, access.revision)); if (!current()) return;
      const controller = new AbortController(); this.controller = controller; this.message("Reading the PDF's text on this computer...");
      const extraction = await this.extract(buffer(original.bytes), async asset => buffer(value(await this.bridge.readPdfAsset(asset))), controller.signal, (page, total) => { if (current()) this.message(`Reading page ${page} of ${total}...`); });
      if (!current() || this.controller !== controller) return; this.controller = null; this.extracted = { token: original.token, extraction }; const preview = el("research-pdf-preview");
      add(preview, "h3", "Extracted text - not saved"); add(preview, "p", `${extraction.pages.length} of ${extraction.totalPages} pages examined; ${extraction.pages.filter(page => page.shortened).length} shortened; ${extraction.pages.filter(page => !page.text.trim()).length} empty. Text order and missing fonts can omit or reorder content.`, "thread-muted");
      for (const page of extraction.pages) this.exact(preview, `PDF page ${page.page}${page.shortened ? " (shortened)" : ""}`, page.text || "No text could be read on this page (it may be a scanned image).");
      this.message("Text ready. Check each page, then preview the new note.");
    }); }, true).className = "thread-primary";
    add(form, "div", "", "thread-ai-card").id = "research-pdf-preview";
    const save = this.button(form, "Preview PDF source", () => { const extracted = this.extracted; if (!extracted) return; const title = name.value; void this.run(async (access, current) => { value(await this.bridge.preparePdf(snapshot.id, extracted.token, extracted.extraction, title, access.revision)); if (current()) this.review(); }); }, true);
    save.dataset.needsExtraction = "true"; save.disabled = true;
  }
}
