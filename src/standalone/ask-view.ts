import type { AskAnswer, AskContext, AskRequest, AskSnapshot, CollectionHandoff, DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
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
  private reviewChanges: () => void;
  private epoch = 0;
  private prepared: AskSnapshot | null = null;
  private context: AskContext | null = null;
  private answer: AskAnswer | null = null;
  private choices: Record<string, EvidenceChoice> = {};
  private busy = false;
  private collectionSaving = false;
  private drafts = new Map<number, { text: string; kind: string }>();
  private revokeSave = (): void => {};
  private panel = el("ask-panel");
  private results = el("ask-results");
  private feedback = el("ask-status");
  private retrieveButton = el<HTMLButtonElement>("ask-retrieve");
  private cancelButton = el<HTMLButtonElement>("ask-cancel");
  constructor(bridge: DesktopBridge, access: () => Access | null, open: (path: string, heading: string, hash: string) => void, reviewChanges: () => void = () => {}) {
    this.bridge = bridge; this.access = access; this.openSource = open; this.reviewChanges = reviewChanges;
    for (const id of ["ask-question", "ask-scope", "ask-method", "ask-level", "ask-type", "ask-status-filter", "ask-path", "ask-from", "ask-through"]) {
      el(id).addEventListener(el(id).tagName === "SELECT" ? "change" : "input", () => this.invalidate("Search inputs changed. Retrieve evidence again."));
    }
    this.retrieveButton.addEventListener("click", () => { void this.retrieve(); });
    this.cancelButton.addEventListener("click", () => {
      this.revokeSave(); this.drafts.clear();
      this.epoch++; this.answer = null; void this.bridge.cancelAI(); this.setBusy(false); el("ask-answer")?.replaceChildren();
      this.feedback.textContent = this.context ? "Ask canceled. Current evidence remains available; review the exact context before retrying."
        : this.prepared ? "Context update canceled. Change a passage choice or retrieve evidence again." : "Ask canceled. Retrieve evidence to start again.";
    });
    el("ask-new-conversation").addEventListener("click", () => this.invalidate("New conversation. Retrieve evidence to begin."));
    el("back-ask").addEventListener("click", () => this.open());
  }
  update(): void { el<HTMLButtonElement>("open-ask").disabled = !this.access(); this.retrieveButton.disabled = this.busy || !this.access(); }
  invalidate(message = "Evidence or model changed. Retrieve evidence again."): void {
    this.revokeSave(); this.drafts.clear();
    this.epoch++; this.collectionSaving = false; this.prepared = null; this.context = null; this.answer = null; this.choices = {}; this.results.replaceChildren();
    this.feedback.textContent = message; this.setBusy(false); el<HTMLButtonElement>("back-ask").disabled = true; void this.bridge.resetAsk();
  }
  hide(): void { this.panel.hidden = true; }
  open(): void {
    if (!this.access()) return;
    el("project-panel").hidden = true; el("source-pane").hidden = true; this.panel.hidden = false; this.panel.focus();
    this.update();
  }
  adoptCollection(handoff: CollectionHandoff): void {
    const access = this.access(), prepared = handoff.snapshot;
    if (!access || access.revision !== prepared.index.revision || access.generation !== prepared.index.generation) { this.invalidate("Collection context changed. Reopen and review it again."); return; }
    this.revokeSave(); this.drafts.clear(); this.epoch++; this.answer = null; this.choices = { ...handoff.choices }; this.prepared = prepared; this.context = handoff.context;
    el<HTMLTextAreaElement>("ask-question").value = prepared.request.question; el<HTMLSelectElement>("ask-scope").value = prepared.request.scope; el<HTMLSelectElement>("ask-method").value = prepared.request.method; el<HTMLSelectElement>("ask-level").value = prepared.request.level;
    for (const id of ["ask-type", "ask-status-filter", "ask-path", "ask-from", "ask-through"]) el<HTMLInputElement>(id).value = "";
    this.render(prepared); this.renderContext(prepared, handoff.context); el<HTMLButtonElement>("back-ask").disabled = false; this.setBusy(false); this.open();
  }
  private setBusy(busy: boolean): void {
    this.busy = busy; this.cancelButton.disabled = !busy; this.update();
    const generate = document.getElementById("ask-generate") as HTMLButtonElement | null;
    for (const button of this.results.querySelectorAll<HTMLButtonElement>("[data-ask-action]")) button.disabled = busy || button.dataset.needsContext === "true" && !this.context || button.dataset.limit === "true" || button.hasAttribute("data-draft-blocked") && this.drafts.size > 0;
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
    if (prepared.history.length) {
      const history = add(this.results, "details"); add(history, "summary", `Earlier completed turns (${prepared.history.length} of 6)`);
      add(history, "p", "Earlier AI output and corrections are context, never evidence. A new retrieval starts a new conversation.", "thread-muted");
      for (const [i, turn] of prepared.history.entries()) {
        add(history, "h3", `Turn ${i + 1}: ${turn.question}`);
        for (const [index, claim] of turn.answer.answer.entries()) {
          const correction = turn.corrections[index]; add(history, "p", `${correction ? "User correction - " : ""}${claimLabel(correction?.kind ?? claim.kind)}: ${correction?.text ?? claim.text}`);
        }
      }
    }
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
      select.value = this.choices[source.id] ?? "include"; card.dataset.choice = select.value;
      select.addEventListener("change", () => {
        if (!this.live(prepared)) return;
        this.choices[source.id] = select.value as EvidenceChoice; card.dataset.choice = select.value; void this.renew(prepared);
      });
      add(card, "pre", source.excerpt, "thread-excerpt");
    }
    add(context, "h3", "Context for the model", "thread-eyebrow"); add(context, "p").id = "ask-context-count";
    add(context, "p", "", "thread-muted").id = "ask-context-coverage";
    const details = add(context, "details"); add(details, "summary", "Exact source context sent to the model"); add(details, "pre").id = "ask-context-exact";
    const conversation = add(context, "details"); add(conversation, "summary", "Exact earlier conversation context (not evidence)"); add(conversation, "pre").id = "ask-conversation-exact";
    add(context, "p", "", "thread-muted").id = "ask-conversation-coverage";
    const generate = add(context, "button", "Generate from chosen evidence", "thread-primary"); generate.id = "ask-generate"; generate.disabled = true;
    generate.addEventListener("click", () => { void this.generate(prepared); });
    add(context, "p", "No note changes. A cited answer still needs your judgment.", "thread-muted");
    const collections = add(context, "details"); add(collections, "summary", "Save these references as a collection");
    add(collections, "p", "Stores current references and Include/Pin/Exclude choices, including excluded passages. No excerpts are stored and no read permissions are granted. Every save is a new reviewed note.", "thread-muted");
    const name = add(add(collections, "label", "Collection name"), "input"); name.setAttribute("aria-label", "Collection name"); name.maxLength = 100;
    name.addEventListener("input", () => { if (this.collectionSaving) { this.epoch++; this.collectionSaving = false; this.setBusy(false); } void this.bridge.researchDraftChanged(false); });
    const save = add(collections, "button", "Preview named collection"); save.dataset.askAction = "true"; save.dataset.needsContext = "true"; save.disabled = true;
    save.addEventListener("click", () => { void this.saveCollection(prepared, name.value); });
    add(context, "div").id = "ask-answer";
  }
  private async renew(prepared: AskSnapshot): Promise<void> {
    this.revokeSave(); this.drafts.clear();
    const epoch = ++this.epoch; this.context = null; this.answer = null; el("ask-answer").replaceChildren(); el("ask-context-exact").textContent = "";
    this.setBusy(true); this.feedback.textContent = "Renewing exact source context...";
    try {
      const result = value(await this.bridge.chooseAsk(prepared.id, { ...this.choices }, prepared.index.revision));
      if (epoch !== this.epoch || !this.live(prepared)) return;
      this.context = result; this.renderContext(prepared, result);
    } catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Context preview failed. Retrieve again."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }
  private renderContext(prepared: AskSnapshot, result: AskContext): void {
    const sources = result.bundle.sources;
    el("ask-conversation-exact").textContent = result.conversation.serialized;
    el("ask-conversation-coverage").textContent = `Earlier turns included: ${result.conversation.turns.map(turn => turn.turn).join(", ") || "none"}. Omitted: ${result.conversation.omitted.map(turn => `${turn.turn} (${turn.reason})`).join(", ") || "none"}. Six turns, 4000 characters of earlier context, 24000 total prompt characters maximum.`;
    el("ask-context-exact").textContent = JSON.stringify(sources, null, 2);
    el("ask-context-count").textContent = `${sources.length} of ${prepared.bundle.sources.length} passages included; ${sources.filter(s => this.choices[s.id] === "pin").length} pinned first; ${Object.values(this.choices).filter(c => c === "exclude").length} explicitly excluded.`;
    el("ask-context-coverage").textContent = contextCoverageText(result.bundle);
    this.feedback.textContent = sources.length ? this.access()?.model ? "Evidence ready. Review the exact context, then generate." : "Evidence ready. Apply a downloaded text model in Optional local AI to generate." : "No chosen evidence. Include a passage, or retrieve again.";
  }
  private async saveCollection(prepared: AskSnapshot, name: string): Promise<void> {
    if (this.busy || !this.context || !this.live(prepared)) return; const epoch = ++this.epoch; this.collectionSaving = true; this.setBusy(true); this.feedback.textContent = "Preparing the exact named collection preview...";
    try { value(await this.bridge.saveAskCollection(prepared.id, name, prepared.index.revision)); if (epoch === this.epoch && this.live(prepared)) this.reviewChanges(); }
    catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Collection preview failed. Retrieve again."; }
    finally { if (epoch === this.epoch) { this.collectionSaving = false; this.setBusy(false); } }
  }
  private async generate(prepared: AskSnapshot): Promise<void> {
    const context = this.context; if (this.busy || !context || !this.live(prepared)) return;
    this.revokeSave(); this.drafts.clear();
    const epoch = ++this.epoch; this.answer = null; this.setBusy(true); const output = el("ask-answer"); output.replaceChildren(); this.feedback.textContent = "Generating locally from the chosen context...";
    try {
      const result = value(await this.bridge.generateAsk(context.id, prepared.index.revision));
      if (epoch !== this.epoch || !this.live(prepared) || result.contextId !== this.context?.id) return;
      this.answer = result; this.renderAnswer(prepared, context);
      this.feedback.textContent = result.answer.supported ? "Answer ready. Compare each claim with its cited excerpts." : "The chosen evidence does not establish an answer.";
    } catch (error) { if (epoch === this.epoch && this.live(prepared)) this.feedback.textContent = error instanceof Error ? error.message : "Local answer generation failed. Check the model and retry."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }
  private renderAnswer(prepared: AskSnapshot, context: AskContext): void {
    const result = this.answer; if (!result) return;
    this.revokeSave();
    const output = el("ask-answer"); output.replaceChildren();
    const card = add(output, "section", "", "thread-ai-card"); add(card, "h3", `AI answer - turn ${result.turnNumber} of 6`);
    add(card, "p", `${result.model} · ${new Date(result.generatedAt).toLocaleString()}. Doesn't change your notes.`, "thread-muted");
    for (const [index, claim] of result.answer.answer.entries()) {
      const correction = result.corrections[index], row = add(card, "div", "", "thread-ai-claim");
      add(row, "p", `${correction ? "User correction - " : ""}${claimLabel(correction?.kind ?? claim.kind)}: ${correction?.text ?? claim.text}`);
      const decision = decisionContext(claim, context.bundle); if (decision) add(row, "small", decision);
      if (claim.modelKind) add(row, "small", `Model classification: ${claim.modelKind}; adjusted using the cited records.`);
      for (const id of claim.sourceIds) { this.chip(row, id, prepared); add(row, "blockquote", context.bundle.sources.find(s => s.id === id)!.excerpt); }
      const details = add(row, "details"); add(details, "summary", `Correct claim ${index + 1}`);
      add(details, "p", `Original model (${claim.modelKind ?? claim.kind}): ${claim.text}`, "thread-muted");
      add(details, "p", "Your correction keeps the original output and citations. Choosing a recorded statement does not verify truth.", "thread-muted");
      const text = add(details, "textarea"); text.maxLength = 1200; text.value = this.drafts.get(index)?.text ?? correction?.text ?? claim.text; text.setAttribute("aria-label", `Claim text ${index + 1}`);
      const kind = add(details, "select"); kind.setAttribute("aria-label", `Claim classification ${index + 1}`);
      for (const value of ["fact", "interpretation", "suggestion"] as const) kind.append(new Option(claimLabel(value), value)); kind.value = this.drafts.get(index)?.kind ?? correction?.kind ?? claim.kind;
      const edited = (): void => {
        if (text.value === (correction?.text ?? claim.text) && kind.value === (correction?.kind ?? claim.kind)) this.drafts.delete(index);
        else this.drafts.set(index, { text: text.value, kind: kind.value });
        this.revokeSave(); this.setBusy(this.busy);
        this.feedback.textContent = this.drafts.size ? "Unapplied correction drafts. Apply each correction or revert it before saving or continuing." : "Correction drafts match the answer. Renew the save preview.";
      };
      text.addEventListener("input", edited); kind.addEventListener("change", edited);
      const revert = add(details, "button", "Revert unapplied correction"); revert.dataset.askAction = "";
      revert.addEventListener("click", () => { text.value = correction?.text ?? claim.text; kind.value = correction?.kind ?? claim.kind; edited(); });
      const apply = add(details, "button", "Apply correction"); apply.dataset.askAction = "";
      apply.addEventListener("click", () => { void (async () => {
        const answer = this.answer; if (this.busy || !answer || !this.live(prepared)) return;
        const appliedText = text.value, appliedKind = kind.value; this.revokeSave();
        const epoch = ++this.epoch; this.setBusy(true); this.feedback.textContent = "Validating correction and current sources...";
        try {
          const updated = value(await this.bridge.correctAsk(answer.id, index, appliedText, appliedKind as "fact" | "interpretation" | "suggestion", prepared.index.revision));
          if (epoch !== this.epoch || !this.live(prepared)) return;
          if (text.value === appliedText && kind.value === appliedKind) this.drafts.delete(index);
          this.answer = updated; this.renderAnswer(prepared, context);
          this.feedback.textContent = "Correction applied to this draft. Original model output remains intact; review a renewed preview before saving.";
        } catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Correction unavailable."; }
        finally { if (epoch === this.epoch) this.setBusy(false); }
      })(); });
    }
    add(card, "h3", "Evidence gaps"); const gaps = add(card, "ul"); for (const gap of result.answer.gaps) add(gaps, "li", gap);
    const followup = add(output, "section", "", "thread-record-card"); add(followup, "h3", "Ask a follow-up");
    add(followup, "p", "Explicitly reuse this retrieval and review chosen evidence again. Earlier responses are not new evidence. Retrieve evidence to start a new conversation.", "thread-muted");
    const question = add(followup, "textarea"); question.maxLength = 1000; question.setAttribute("aria-label", "Follow-up question"); question.id = "ask-followup";
    const next = add(followup, "button", "Continue with current evidence"); next.id = "ask-continue"; next.dataset.askAction = "";
    next.dataset.draftBlocked = "";
    if (result.turnNumber >= 6) { next.disabled = true; next.dataset.limit = "true"; add(followup, "p", "Six-turn limit reached. Start a new conversation.", "thread-muted"); }
    next.addEventListener("click", () => { void this.continue(prepared, question.value); });
    this.renderSave(output, prepared, result);
  }
  private renderSave(output: HTMLElement, prepared: AskSnapshot, answer: AskAnswer): void {
    const section = add(output, "section", "", "thread-record-card"); add(section, "h3", "Save a new reviewed note");
    add(section, "p", "Enable writing in Desktop storage first. Preview the exact destination and Markdown; Save refuses overwrites. Unapplied corrections block saving. Pending receipts remain in Desktop storage after an interruption.", "thread-muted");
    const label = add(section, "label", "New note name"), name = add(label, "input"); name.id = "ask-save-name"; name.maxLength = 100;
    name.value = `Answer ${new Date().toISOString().slice(0, 10)}`;
    const kindLabel = add(section, "label", "Save format"), kind = add(kindLabel, "select"); kind.id = "ask-save-kind";
    kind.append(new Option("Current reviewed answer", "answer"), new Option("Selected conversation turns", "conversation"));
    const turns = add(section, "fieldset"); add(turns, "legend", "Conversation turns to save"); turns.hidden = true;
    for (let n = 1; n <= answer.turnNumber; n++) {
      const label = add(turns, "label", `Turn ${n}`), check = add(label, "input"); check.type = "checkbox"; check.value = String(n); check.checked = true;
    }
    const previewButton = add(section, "button", "Preview new note"); previewButton.id = "ask-save-preview"; previewButton.dataset.askAction = ""; previewButton.dataset.draftBlocked = "";
    const previewArea = add(section, "div"); previewArea.id = "ask-save-exact";
    const save = add(section, "button", "Save exact new note", "thread-primary"); save.id = "ask-save-confirm"; save.dataset.askAction = ""; save.dataset.draftBlocked = "";
    let previewId = "", token = 0;
    const revoke = (): void => { token++; previewId = ""; previewArea.replaceChildren(); save.disabled = true; save.dataset.limit = "true"; void this.bridge.revokeSavePreview(); };
    this.revokeSave = revoke; revoke();
    name.addEventListener("input", revoke); kind.addEventListener("change", () => { turns.hidden = kind.value !== "conversation"; revoke(); }); turns.addEventListener("change", revoke);
    const current = (request: number): boolean => request === token && this.live(prepared) && this.answer === answer;
    previewButton.addEventListener("click", () => { void (async () => {
      if (this.busy || this.drafts.size || !this.live(prepared)) return; revoke(); const request = token, epoch = this.epoch; this.setBusy(true);
      try {
        const selected = [...turns.querySelectorAll<HTMLInputElement>("input:checked")].map(check => Number(check.value));
        const result = value(await this.bridge.previewAskSave(answer.id, kind.value as "answer" | "conversation", name.value, selected, prepared.index.revision));
        if (!current(request)) return;
        previewId = result.id; add(previewArea, "p", result.path, "thread-source-chip"); add(previewArea, "pre", result.content); save.dataset.limit = "false";
        this.feedback.textContent = "Exact new-note preview ready. Review every byte and the destination before Save.";
      } catch (error) { if (current(request)) this.feedback.textContent = error instanceof Error ? error.message : "Preview unavailable. Inspect Desktop storage."; }
      finally { if (epoch === this.epoch) this.setBusy(false); }
    })(); });
    save.addEventListener("click", () => { void (async () => {
      if (this.busy || this.drafts.size || !previewId || !this.live(prepared)) return;
      const request = token, epoch = this.epoch; this.setBusy(true); this.feedback.textContent = "Recording intent and saving the exact new note...";
      try {
        const result = value(await this.bridge.saveAskPreview(previewId, prepared.index.revision));
        if (current(request)) { revoke(); this.feedback.textContent = `Saved ${result.path}. Desktop storage retains the receipt. Refresh projects to include the new note.`; }
      } catch (error) { if (current(request)) { revoke(); this.feedback.textContent = error instanceof Error ? error.message : "Save unconfirmed. Inspect Desktop storage recovery."; } }
      finally { if (epoch === this.epoch) this.setBusy(false); }
    })(); });
  }
  private async continue(prepared: AskSnapshot, question: string): Promise<void> {
    const answer = this.answer; if (this.busy || this.drafts.size || !answer || !this.live(prepared)) return;
    const epoch = ++this.epoch; this.setBusy(true); this.feedback.textContent = "Checking current evidence before continuing...";
    try {
      const result = value(await this.bridge.continueAsk(answer.id, question, prepared.index.revision));
      if (epoch !== this.epoch || !this.live(prepared)) return;
      this.prepared = result; this.answer = null; this.context = null;
      el<HTMLTextAreaElement>("ask-question").value = result.request.question; this.render(result); this.setBusy(false); await this.renew(result);
    } catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Follow-up unavailable. Retrieve again."; }
    finally { if (epoch === this.epoch) this.setBusy(false); }
  }

}
