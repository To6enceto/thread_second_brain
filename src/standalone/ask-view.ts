import type { AskContext, AskRequest, AskSnapshot, DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { EvidenceChoice } from "../vault/workbench.ts";
import { contextCoverageText } from "../vault/evidence.ts";
import { searchCoverageText } from "../retrieval/search.ts";
import { hybridCoverageText } from "../retrieval/semantic.ts";
import { claimLabel, decisionContext } from "../intelligence/claims.ts";

function el<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node;
}
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw new Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest; model: string; embeddingModel: string };

export class AskView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private openSource: (path: string, heading: string, hash: string) => void;
  private epoch = 0;
  private prepared: AskSnapshot | null = null;
  private context: AskContext | null = null;
  private choices: Record<string, EvidenceChoice> = {};
  private busy = false;
  private panel = el("ask-panel");
  private results = el("ask-results");
  private feedback = el("ask-status");
  private retrieveButton = el<HTMLButtonElement>("ask-retrieve");
  private cancelButton = el<HTMLButtonElement>("ask-cancel");
  constructor(bridge: DesktopBridge, access: () => Access | null, open: (path: string, heading: string, hash: string) => void) {
    this.bridge = bridge; this.access = access; this.openSource = open;
    for (const id of ["ask-question", "ask-scope", "ask-method", "ask-level", "ask-type", "ask-status-filter", "ask-path", "ask-from", "ask-through"]) {
      el(id).addEventListener(el(id).tagName === "SELECT" ? "change" : "input", () => this.invalidate("Search inputs changed. Retrieve evidence again."));
    }
    this.retrieveButton.addEventListener("click", () => { void this.retrieve(); });
    this.cancelButton.addEventListener("click", () => {
      this.epoch++; void this.bridge.cancelAI(); this.setBusy(false); el("ask-answer")?.replaceChildren();
      this.feedback.textContent = this.context ? "Ask canceled. Current evidence remains available; review the exact context before retrying."
        : this.prepared ? "Context update canceled. Change a passage choice or retrieve evidence again." : "Ask canceled. Retrieve evidence to start again.";
    });
    el("back-ask").addEventListener("click", () => this.open());
  }
  update(): void { el<HTMLButtonElement>("open-ask").disabled = !this.access(); this.retrieveButton.disabled = this.busy || !this.access(); }
  invalidate(message = "Evidence or model changed. Retrieve evidence again."): void {
    this.epoch++; this.prepared = null; this.context = null; this.choices = {}; this.results.replaceChildren();
    this.feedback.textContent = message; this.setBusy(false); el<HTMLButtonElement>("back-ask").disabled = true; void this.bridge.resetAsk();
  }
  hide(): void { this.panel.hidden = true; }
  open(): void {
    if (!this.access()) return;
    el("project-panel").hidden = true; el("source-pane").hidden = true; this.panel.hidden = false; this.panel.focus();
    this.update();
  }
  private setBusy(busy: boolean): void {
    this.busy = busy; this.cancelButton.disabled = !busy; this.update();
    const generate = document.getElementById("ask-generate") as HTMLButtonElement | null;
    if (generate) generate.disabled = busy || !this.context?.bundle.sources.length || !this.access()?.model;
  }
  private live(prepared: AskSnapshot): boolean {
    const access = this.access(); return prepared === this.prepared && access?.revision === prepared.index.revision && access.generation === prepared.index.generation;
  }
  private async retrieve(): Promise<void> {
    const access = this.access(); if (!access || this.busy) return;
    this.invalidate(); const epoch = this.epoch; this.setBusy(true); this.feedback.textContent = "Retrieving current permitted evidence...";
    const input: AskRequest = { question: el<HTMLTextAreaElement>("ask-question").value.trim(), selection: access.selection,
      scope: el<HTMLSelectElement>("ask-scope").value as AskRequest["scope"], method: el<HTMLSelectElement>("ask-method").value as AskRequest["method"],
      level: el<HTMLSelectElement>("ask-level").value as AskRequest["level"], embeddingModel: access.embeddingModel,
      filters: { type: el<HTMLInputElement>("ask-type").value, status: el<HTMLInputElement>("ask-status-filter").value, path: el<HTMLInputElement>("ask-path").value,
        from: el<HTMLInputElement>("ask-from").value, through: el<HTMLInputElement>("ask-through").value } };
    try {
      const result = value(await this.bridge.retrieveAsk(input, access.revision));
      if (epoch !== this.epoch || this.access()?.revision !== result.index.revision || this.access()?.generation !== result.index.generation) return;
      this.prepared = result; this.render(result); el<HTMLButtonElement>("back-ask").disabled = false;
      this.setBusy(false); await this.renew(result);
    } catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Retrieval failed. Refresh and retry."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }
  private chip(parent: HTMLElement, id: string, prepared: AskSnapshot): void {
    const source = prepared.bundle.sources.find(s => s.id === id)!;
    const button = add(parent, "button", `${id} ${source.path.split("/").at(-1)} > ${source.heading || "Note"}`, "thread-source-chip");
    button.dataset.sourcePath = source.path; button.setAttribute("aria-label", `Open evidence ${id}`);
    button.addEventListener("click", () => { if (this.live(prepared)) this.openSource(source.path, source.heading, prepared.bundle.noteHashes[source.path]!); });
  }
  private render(prepared: AskSnapshot): void {
    this.results.replaceChildren();
    if (prepared.bundle.searchCoverage) add(this.results, "p", searchCoverageText(prepared.bundle.searchCoverage), "thread-muted");
    if (prepared.bundle.hybridCoverage) add(this.results, "p", hybridCoverageText(prepared.bundle.hybridCoverage), "thread-muted");
    if (prepared.index.listing.identityIncomplete) add(this.results, "p", "Enumeration is incomplete. Unknown notes may be omitted; identity-dependent sources are withheld.", "thread-muted");
    const grid = add(this.results, "div", "", "thread-ask-grid"), evidence = add(grid, "section"), context = add(grid, "section");
    add(evidence, "h3", "Evidence");
    if (!prepared.bundle.sources.length) add(evidence, "p", "No eligible passages match. Adjust the question, scope or filters; inspect coverage.", "thread-empty");
    for (const source of prepared.bundle.sources) {
      const card = add(evidence, "article", "", "thread-record-card thread-evidence-card"); card.dataset.evidenceId = source.id;
      const row = add(card, "div", "", "thread-controls"); this.chip(row, source.id, prepared);
      const select = add(row, "select"); select.setAttribute("aria-label", `Evidence choice ${source.id}`);
      select.append(new Option("Include", "include"), new Option("Pin first", "pin"), new Option("Exclude", "exclude"));
      select.addEventListener("change", () => {
        if (!this.live(prepared)) return;
        this.choices[source.id] = select.value as EvidenceChoice; card.dataset.choice = select.value; void this.renew(prepared);
      });
      add(card, "pre", source.excerpt, "thread-excerpt");
    }
    add(context, "h3", "Context for the model", "thread-eyebrow"); add(context, "p").id = "ask-context-count";
    add(context, "p", "", "thread-muted").id = "ask-context-coverage";
    const details = add(context, "details"); add(details, "summary", "Exact source context sent to the model"); add(details, "pre").id = "ask-context-exact";
    const generate = add(context, "button", "Generate from chosen evidence", "thread-primary"); generate.id = "ask-generate"; generate.disabled = true;
    generate.addEventListener("click", () => { void this.generate(prepared); });
    add(context, "p", "No note changes. A cited answer still needs your judgment.", "thread-muted");
    add(context, "div").id = "ask-answer";
  }
  private async renew(prepared: AskSnapshot): Promise<void> {
    const epoch = ++this.epoch; this.context = null; el("ask-answer").replaceChildren(); el("ask-context-exact").textContent = "";
    this.setBusy(true); this.feedback.textContent = "Renewing exact source context...";
    try {
      const result = value(await this.bridge.chooseAsk(prepared.id, { ...this.choices }, prepared.index.revision));
      if (epoch !== this.epoch || !this.live(prepared)) return;
      this.context = result; const sources = result.bundle.sources;
      el("ask-context-exact").textContent = JSON.stringify(sources, null, 2);
      el("ask-context-count").textContent = `${sources.length} of ${prepared.bundle.sources.length} passages included; ${sources.filter(s => this.choices[s.id] === "pin").length} pinned first; ${Object.values(this.choices).filter(c => c === "exclude").length} explicitly excluded.`;
      el("ask-context-coverage").textContent = contextCoverageText(result.bundle);
      this.feedback.textContent = sources.length ? this.access()?.model ? "Evidence ready. Review the exact context, then generate." : "Evidence ready. Apply a downloaded text model in Optional local AI to generate." : "No chosen evidence. Include a passage, or retrieve again.";
    } catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Context preview failed. Retrieve again."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }
  private async generate(prepared: AskSnapshot): Promise<void> {
    const context = this.context; if (this.busy || !context || !this.live(prepared)) return;
    const epoch = ++this.epoch; this.setBusy(true); const output = el("ask-answer"); output.replaceChildren(); this.feedback.textContent = "Generating locally from the chosen context...";
    try {
      const result = value(await this.bridge.generateAsk(context.id, prepared.index.revision));
      if (epoch !== this.epoch || !this.live(prepared) || result.contextId !== this.context?.id) return;
      const card = add(output, "section", "", "thread-ai-card"); add(card, "h3", "AI answer");
      add(card, "p", `${result.model} · ${new Date(result.generatedAt).toLocaleString()}. Doesn't change your notes.`, "thread-muted");
      for (const claim of result.answer.answer) {
        const row = add(card, "div", "", "thread-ai-claim"); add(row, "p", `${claimLabel(claim.kind)}: ${claim.text}`);
        const decision = decisionContext(claim, context.bundle); if (decision) add(row, "small", decision);
        if (claim.modelKind) add(row, "small", `Model classification: ${claim.modelKind}; adjusted using the cited records.`);
        for (const id of claim.sourceIds) { this.chip(row, id, prepared); add(row, "blockquote", context.bundle.sources.find(s => s.id === id)!.excerpt); }
      }
      add(card, "h3", "Evidence gaps"); const gaps = add(card, "ul"); for (const gap of result.answer.gaps) add(gaps, "li", gap);
      this.feedback.textContent = result.answer.supported ? "Answer ready. Compare each claim with its cited excerpts." : "The chosen evidence does not establish an answer.";
    } catch (error) { if (epoch === this.epoch && this.live(prepared)) this.feedback.textContent = error instanceof Error ? error.message : "Local answer generation failed. Check the model and retry."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }
}
