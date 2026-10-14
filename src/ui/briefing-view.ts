import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { briefingPrompt, validateBriefing, SECTION_KEYS, type Briefing, type SectionKey } from "../intelligence/briefing.ts";
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
  message = "Select a project folder and local model in Thread settings to begin.";
  result: Briefing | null = null;
  bundle: EvidenceBundle | null = null;
  generatedAt = "";
  closed = false;

  constructor(leaf: WorkspaceLeaf, plugin: ThreadPlugin) { super(leaf); this.plugin = plugin; }
  getViewType(): string { return THREAD_VIEW; }
  getDisplayText(): string { return "Thread"; }
  getIcon(): string { return "book-open"; }
  async onOpen(): Promise<void> {
    this.closed = false;
    if (this.plugin.settings.selectedProject && this.plugin.settings.model) this.message = "Ready to resume your selected project using local evidence.";
    this.render();
  }
  async onClose(): Promise<void> { this.closed = true; this.cancelPending(); this.result = null; this.bundle = null; }

  cancelPending(): void { this.revision++; this.controller?.abort(); this.controller = null; }

  invalidate(message: string): void {
    this.cancelPending(); this.result = null; this.bundle = null; this.message = message;
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
    if (this.controller) actions.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.invalidate("Generation canceled. You can try again."));
    actions.createEl("button", { text: "Settings" }).addEventListener("click", () => {
      this.plugin.openSetup();
    });
    actions.createEl("button",{text:"Find evidence"}).onclick=()=>this.plugin.openRecall();
    actions.createEl("button",{text:"Ask"}).onclick=()=>this.plugin.openAsk();
    root.createEl("p", { text: this.message, cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
    if (!this.result || !this.bundle) return;
    root.createEl("p", { text: `Generated ${this.generatedAt} using ${this.plugin.settings.model}.`, cls: "thread-meta" });
    for (const key of SECTION_KEYS) {
      const section = root.createEl("section"); section.createEl("h3", { text: LABELS[key] });
      const claims = this.result.sections[key];
      if (!claims.length) section.createEl("p", { text: key === "newEvidence"
        ? this.bundle.baseline ? "No newer evidence identified from the available dates." : "No comparison baseline yet."
        : "Not established in the available evidence.", cls: "thread-muted" });
      for (const claim of claims) {
        const item = section.createDiv({ cls: "thread-claim" });
        item.createEl("span", { text: claim.kind, cls: `thread-kind thread-kind-${claim.kind}` });
        item.createEl("p", { text: claim.text });
        for (const id of claim.sourceIds) {
          const source = this.bundle.sources.find((candidate) => candidate.id === id);
          if (source) this.sourceButton(item, source);
        }
      }
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

  private sourceButton(parent: HTMLElement, source: Evidence): void {
    const button = parent.createEl("button", { text: `${source.path}${source.heading ? ` > ${source.heading}` : ""}`, cls: "thread-source" });
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
    this.cancelPending(); this.result = null; this.bundle = null;
    const settings = structuredClone(this.plugin.settings);
    if (!settings.selectedProject || !settings.model) {
      this.message = "Choose a project folder and downloaded local model in Settings."; this.render(); return;
    }
    const controller = new AbortController(); this.controller = controller;
    const revision = this.revision;
    this.message = "Checking local model and reading selected project evidence..."; this.render();
    try {
      const client = new OllamaClient(settings.endpoint, settings.timeoutMs);
      await client.check(settings.model, controller.signal);
      const bundle = await this.plugin.evidence(settings, controller.signal);
      if (!bundle.sources.length) throw new Error("No eligible text was found in this project. Add a note or check your exclusions.");
      this.message = "Generating your project briefing locally..."; this.render();
      const raw = await client.generate(settings.model, briefingPrompt(settings.selectedProject, bundle), controller.signal);
      const result = validateBriefing(raw, bundle);
      const current = await this.plugin.evidenceCurrent(bundle, settings);
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      if (!current) throw new Error("Project evidence changed during generation. Generate a fresh briefing.");
      this.result = result; this.bundle = bundle; this.generatedAt = new Date().toLocaleString();
      this.message = "Briefing ready. Source links identify the evidence used; interpretations still need your judgment.";
    } catch (error) {
      if (revision !== this.revision || this.closed || controller.signal.aborted) return;
      this.message = error instanceof Error ? error.message : "Could not generate a briefing.";
    } finally {
      if (revision === this.revision && !this.closed) { this.controller = null; this.render(); }
    }
  }
}
