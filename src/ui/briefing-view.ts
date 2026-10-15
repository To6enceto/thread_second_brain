import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { briefingPrompt, validateBriefing, SECTION_KEYS, type Briefing, type Claim, type SectionKey } from "../intelligence/briefing.ts";
import { recordedBriefing, composeBriefing } from "../intelligence/recorded.ts";
import { readableText } from "../vault/scope.ts";
import type { Evidence, EvidenceBundle } from "../vault/evidence.ts";

export const THREAD_VIEW = "thread-briefing";
const LABELS: Record<SectionKey, string> = {
  objective: "Objective", lastActivity: "Last recorded activity", decisions: "Recorded decisions",
  openQuestions: "Open questions", newEvidence: "New evidence", nextActions: "Suggested next action"
};

export class BriefingView extends ItemView {
  plugin: ThreadPlugin;
  controller: AbortController | null = null;
  revision = 0;
  message = "Select a readable project folder, then Resume to load its recorded context.";
  result: Briefing | null = null;
  recorded: Briefing | null = null;
  interpretations: Claim[] = [];
  modelGaps: string[] = [];
  bundle: EvidenceBundle | null = null;
  generatedAt = "";
  closed = false;

  constructor(leaf: WorkspaceLeaf, plugin: ThreadPlugin) { super(leaf); this.plugin = plugin; }
  getViewType(): string { return THREAD_VIEW; }
  getDisplayText(): string { return "Thread"; }
  getIcon(): string { return "book-open"; }
  async onOpen(): Promise<void> {
    this.closed = false;
    if (this.plugin.settings.selectedProject) this.message = "Ready to read your selected project's records. Local AI is optional.";
    this.render();
  }
  async onClose(): Promise<void> { this.closed = true; this.invalidate("Thread closed."); }

  cancelPending(): void { this.revision++; this.controller?.abort(); this.controller = null; }

  invalidate(message: string): void {
    this.cancelPending(); this.result = null; this.recorded = null; this.bundle = null;
    this.interpretations = []; this.modelGaps = []; this.generatedAt = ""; this.message = message;
    if (!this.closed) this.render();
  }

  render(): void {
    const root = this.contentEl;
    root.empty(); root.addClass("thread-view");
    root.createEl("h2", { text: "Thread" });
    root.createEl("p", { text: this.plugin.settings.selectedProject || "No project selected", cls: "thread-project" });
    const actions = root.createDiv({ cls: "thread-actions" });
    const resume = actions.createEl("button", { text: "Resume project", cls: "mod-cta" });
    resume.disabled = this.controller !== null;
    resume.addEventListener("click", () => { void this.resume(); });
    if (this.controller) actions.createEl("button", { text: "Cancel" }).addEventListener("click", () => { void this.cancelGeneration(); });
    actions.createEl("button", { text: "Settings" }).addEventListener("click", () => {
      this.plugin.openSetup();
    });
    actions.createEl("button",{text:"Find evidence"}).onclick=()=>this.plugin.openRecall();
    actions.createEl("button",{text:"Ask"}).onclick=()=>this.plugin.openAsk();
    actions.createEl("button",{text:"Decisions"}).onclick=()=>this.plugin.openDecisions();
    actions.createEl("button",{text:"Capture"}).onclick=()=>this.plugin.openCapture();
    actions.createEl("button",{text:"Review decisions"}).onclick=()=>this.plugin.openDecisionReview();
    actions.createEl("button",{text:"Knowledge"}).onclick=()=>this.plugin.openKnowledge();
    actions.createEl("button",{text:"Source freshness"}).onclick=()=>this.plugin.openFreshness();
    actions.createEl("button",{text:"Weekly review"}).onclick=()=>this.plugin.openWeekly();
    actions.createEl("button",{text:"Wrap up"}).onclick=()=>this.plugin.openSession();
    actions.createEl("button",{text:"Changes"}).onclick=()=>this.plugin.openChanges();
    root.createEl("p", { text: this.message, cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
    if (!this.result || !this.bundle) return;
    root.createEl("h3", { text: "Recorded context" });
    root.createEl("p", { text: "Quoted from recognized note fields. Recorded statements and user reports still need your judgment.", cls: "thread-meta" });
    for (const key of SECTION_KEYS.filter(key => key !== "nextActions")) {
      const section = root.createEl("section"); section.createEl("h3", { text: LABELS[key] });
      const claims = this.result.sections[key];
      if (!claims.length) section.createEl("p", { text: key === "newEvidence"
        ? this.bundle.baseline ? "No newer evidence identified from the available dates." : "No comparison baseline yet."
        : "Not established in the available evidence.", cls: "thread-muted" });
      for (const claim of claims) this.renderClaim(section, claim);
    }
    if (this.generatedAt) {
      const ai = root.createEl("section", { cls: "thread-ai" });
      ai.createEl("h3", { text: "AI interpretations and suggestions" });
      ai.createEl("p", { text: `Generated ${this.generatedAt} using ${this.plugin.settings.model}. These do not change the recorded context.`, cls: "thread-meta" });
      for (const claim of this.interpretations) this.renderClaim(ai, claim);
      ai.createEl("h4", { text: "Suggested next action" });
      if (!this.result.sections.nextActions.length) ai.createEl("p", { text: "No sourced suggestion returned." });
      for (const claim of this.result.sections.nextActions) this.renderClaim(ai, claim);
      const modelGaps = ai.createEl("details"); modelGaps.createEl("summary", { text: "Model-reported gaps and limits" });
      for (const gap of this.modelGaps) modelGaps.createEl("p", { text: gap });
    }
    root.createEl("h3", { text: "Evidence gaps and limits" });
    const gaps = root.createEl("ul");
    for (const gap of this.result.gaps) gaps.createEl("li", { text: gap });
    const details = root.createEl("details", { cls: "thread-evidence" });
    details.createEl("summary", { text: `Evidence used (${this.bundle.sources.length} passages)` });
    for (const source of this.bundle.sources) {
      const item = details.createDiv(); this.sourceButton(item, source);
      item.createEl("p", { text: source.excerpt, cls: "thread-excerpt" });
    }
  }

  private renderClaim(parent: HTMLElement, claim: Claim): void {
    const item = parent.createDiv({ cls: "thread-claim" });
    item.createEl("span", { text: claim.kind, cls: `thread-kind thread-kind-${claim.kind}` });
    item.createEl("p", { text: claim.text });
    for (const id of claim.sourceIds) {
      const source = this.bundle?.sources.find(candidate => candidate.id === id);
      if (!source) continue;
      this.sourceButton(item, source);
      const excerpt = item.createEl("details"); excerpt.createEl("summary", { text: "Supporting excerpt" });
      excerpt.createEl("p", { text: source.excerpt, cls: "thread-excerpt" });
    }
  }

  async cancelGeneration(): Promise<void> {
    this.cancelPending(); const revision = this.revision;
    this.interpretations = []; this.modelGaps = []; this.generatedAt = "";
    const current = this.bundle && await this.plugin.evidenceCurrent(this.bundle, this.plugin.settings).catch(() => false);
    if (revision !== this.revision || this.closed) return;
    if (!current) { this.invalidate("Canceled. Evidence changed; Resume to reload recorded context."); return; }
    this.result = this.recorded;
    this.message = "AI generation canceled. Current recorded context remains available."; this.render();
  }

  private sourceButton(parent: HTMLElement, source: Evidence): void {
    const button = parent.createEl("button", { text: `${source.path}${source.property ? ` > property: ${source.property}` : source.heading ? ` > ${source.heading}` : ""}`, cls: "thread-source" });
    button.dataset.sourcePath = source.path;
    button.addEventListener("click", () => { void this.openSource(source); });
  }

  private async openSource(source: Evidence): Promise<void> {
    const bundle = this.bundle;
    if (!bundle || !await this.plugin.evidenceCurrent(bundle, this.plugin.settings)) {
      this.invalidate("Evidence changed or is no longer allowed. Generate a fresh briefing."); return;
    }
    const file = this.app.vault.getAbstractFileByPath(source.path);
    if (!(file instanceof TFile) || !readableText(file.path, this.plugin.settings)) return;
    await this.app.workspace.getLeaf(false).openFile(file, {
      eState: { subpath: source.heading ? `#${source.heading}` : "" }
    });
  }

  async resume(): Promise<void> {
    this.invalidate("Reading recorded project context...");
    const settings = structuredClone(this.plugin.settings);
    if (!settings.selectedProject) {
      this.message = "Choose a readable project folder in Settings."; this.render(); return;
    }
    const controller = new AbortController(); this.controller = controller;
    const revision = this.revision;
    this.message = "Reading selected project records..."; this.render();
    try {
      const bundle = await this.plugin.evidence(settings, controller.signal);
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      if (!bundle.sources.length) throw new Error("No eligible text was found in this project. Add a note or check your exclusions.");
      this.bundle = bundle; this.recorded = recordedBriefing(bundle); this.result = this.recorded;
      this.message = "Recorded context ready. Checking local AI..."; this.render();
      if (!settings.model) { this.message = "Recorded context ready. Select a downloaded model in Settings for optional AI interpretation."; return; }
      const client = new OllamaClient(settings.endpoint, settings.timeoutMs);
      await client.check(settings.model, controller.signal);
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      this.message = "Recorded context ready. Generating AI interpretations locally..."; this.render();
      const raw = await client.generate(settings.model, briefingPrompt(settings.selectedProject, bundle), controller.signal);
      const result = validateBriefing(raw, bundle);
      const current = await this.plugin.evidenceCurrent(bundle, settings);
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      if (!current) throw new Error("Project evidence changed during generation. Generate a fresh briefing.");
      const composed = composeBriefing(this.recorded, result);
      this.result = composed.briefing; this.interpretations = composed.interpretations; this.modelGaps = composed.modelGaps;
      this.generatedAt = new Date().toLocaleString();
      this.message = "Briefing ready. Recorded context and AI interpretations are shown separately.";
    } catch (error) {
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      const current = this.bundle && await this.plugin.evidenceCurrent(this.bundle, settings).catch(() => false);
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      if (!current) { this.result = null; this.recorded = null; this.bundle = null; }
      this.message = `${current ? "Recorded context remains available. Local AI: " : ""}${error instanceof Error ? error.message : "Could not generate a briefing."}`;
    } finally {
      if (revision === this.revision && !this.closed) { this.controller = null; this.render(); }
    }
  }
}
