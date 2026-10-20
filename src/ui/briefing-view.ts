import { ItemView, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { briefingPrompt, validateBriefing, SECTION_KEYS, type Briefing, type Claim, type SectionKey } from "../intelligence/briefing.ts";
import { recordedBriefing, composeBriefing } from "../intelligence/recorded.ts";
import { claimLabel } from "../intelligence/claims.ts";
import { readableText,isWithin } from "../vault/scope.ts";
import { contextCoverageText, type Evidence, type EvidenceBundle } from "../vault/evidence.ts";
import { permittedProjects, projectHome, type ProjectHome, type HomeItem } from "../vault/project-home.ts";

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
  home: ProjectHome | null = null;
  homeLoading = false;

  constructor(leaf: WorkspaceLeaf, plugin: ThreadPlugin) { super(leaf); this.plugin = plugin; }
  getViewType(): string { return THREAD_VIEW; }
  getDisplayText(): string { return "Thread"; }
  getIcon(): string { return "book-open"; }
  async onOpen(): Promise<void> {
    this.closed = false;
    if (this.plugin.settings.selectedProject) this.message = "Ready to read your selected project's records. Local AI is optional.";
    await this.loadHome();
  }
  async onClose(): Promise<void> { this.closed = true; this.invalidate("Thread closed."); }

  cancelPending(): void { this.revision++; this.controller?.abort(); this.controller = null; }

  invalidate(message: string, preserveHome = false): void {
    this.cancelPending(); this.result = null; this.recorded = null; this.bundle = null;
    this.interpretations = []; this.modelGaps = []; this.generatedAt = ""; this.message = message;
    this.homeLoading = false;
    if (!preserveHome) this.home = null;
    if (!this.closed) this.render();
  }

  sourcesChanged(paths:Set<string>):void {
    if(!this.bundle||Object.keys(this.bundle.noteHashes).some(path=>paths.has(path))){this.invalidate("Supporting source notes changed. Resume to refresh.");return;}
    const homePaths=this.home?[...this.home.sessions,...this.home.decisions,...this.home.questions].map(item=>item.path):[];
    if([...paths].some(path=>isWithin(path,this.plugin.settings.selectedProject)||homePaths.includes(path))){this.home=null;if(!this.closed)this.render();}
  }

  render(): void {
    const root = this.contentEl;
    root.empty(); root.addClass("thread-view");
    const header = root.createDiv({ cls: "thread-header" });
    header.createEl("h2", { text: "Thread", cls: "thread-wordmark" });
    const headerActions = header.createDiv({ cls: "thread-actions" });
    const refresh = headerActions.createEl("button", { cls: "thread-icon-button", attr: { "aria-label": "Refresh home" } });
    setIcon(refresh, "refresh-cw"); refresh.disabled = this.homeLoading;
    refresh.onclick = () => { void this.loadHome(); };
    const settings = headerActions.createEl("button", { cls: "thread-icon-button", attr: { "aria-label": "Settings" } });
    setIcon(settings, "settings"); settings.onclick = () => this.plugin.openSetup();
    this.renderNavigation(root);
    if (this.renderArea(root)) return;
    const controls = this.result && !this.controller ? root.createEl("details", { cls: "thread-project-controls" }) : root;
    if (controls !== root) controls.createEl("summary", { text: "Project controls" });
    this.renderProjectSelector(controls);
    const actions = controls.createDiv({ cls: "thread-primary-actions" });
    const resumeRow = actions.createDiv({ cls: "thread-resume-row" });
    const resumeWrap = resumeRow.createDiv({ cls: "thread-resume-wrap" });
    const resume = resumeWrap.createEl("button", { text: "Resume project", cls: "mod-cta thread-resume" });
    resumeWrap.createEl("span", { text: "Recorded context first · AI optional", cls: "thread-resume-subtext" });
    resume.disabled = this.controller !== null;
    resume.addEventListener("click", () => { void this.resume(); });
    if (this.controller) resumeRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => { void this.cancelGeneration(); });
    const quick = actions.createDiv({ cls: "thread-quick-actions" });
    for (const [label, icon, action] of [
      ["Ask", "search", () => this.plugin.openAsk()],
      ["Capture", "plus", () => this.plugin.openCapture()],
      ["Wrap up", "list-checks", () => this.plugin.openSession()]
    ] as const) {
      const button = quick.createEl("button");
      setIcon(button.createSpan({ cls: "thread-action-icon", attr: { "aria-hidden": "true" } }), icon);
      button.createSpan({ text: label }); button.onclick = action;
    }
    const navigation = actions.createDiv({ cls: "thread-actions thread-home-navigation" });
    navigation.createEl("button",{text:"All projects"}).onclick=()=>this.plugin.openProjectOverview();
    if (this.plugin.settings.model) {
      const model = controls.createDiv({ cls: "thread-model-line" });
      model.createSpan({ cls: "thread-model-dot", attr: { "aria-hidden": "true" } });
      model.createSpan({ text: this.plugin.settings.model });
    }
    root.createEl("p", { text: this.message, cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
    this.renderHome(controls);
    const more = controls.createEl("section", { cls: "thread-all-tools" }); more.createEl("h3", { text: "All tools", cls: "thread-label" });
    const secondary = more.createDiv({ cls: "thread-tool-groups" });
    for (const [group, tools] of [
      ["Evidence", [["Find evidence", () => this.plugin.openRecall()], ["Questions", () => this.plugin.openQuestions()], ["Source freshness", () => this.plugin.openFreshness()], ["Local PDF extraction", () => this.plugin.openPdf()]]],
      ["Decisions", [["Decisions", () => this.plugin.openDecisions()], ["Review decisions", () => this.plugin.openDecisionReview()]]],
      ["Knowledge", [["Knowledge", () => this.plugin.openKnowledge()], ["Changes", () => this.plugin.openChanges()]]],
      ["Routine", [["Project actions", () => this.plugin.openActions()], ["Timeline", () => this.plugin.openTimeline()], ["Weekly review", () => this.plugin.openWeekly()], ["Workspaces", () => this.plugin.openWorkspace()]]],
      ["Vault", [["Vault health", () => this.plugin.openHealth()], ["Index coverage", () => this.plugin.openIndexCoverage()]]],
      ["Packages", [["Export checkpoint", () => this.plugin.openProjectExport()], ["Compare checkpoint", () => this.plugin.openProjectComparison()], ["Import package / recovery", () => this.plugin.openProjectImport()]]]
    ] as const) {
      const toolsEl = secondary.createDiv({ cls: "thread-tool-group" });
      toolsEl.createEl("h3", { text: group, cls: "thread-label" });
      for (const [label, action] of tools) toolsEl.createEl("button", { text: label }).onclick = action;
    }
    controls.createEl("p", { text: "Dates describe records, not verified events.", cls: "thread-home-footnote" });
    if (!this.result || !this.bundle) return;
    const progress = root.createDiv({ cls: "thread-progress" });
    progress.createDiv({ text: `Recorded context · ${this.bundle.sources.length} passages`, cls: "thread-progress-recorded" });
    progress.createDiv({ text: this.generatedAt ? `AI · ${this.generatedAt} · ${this.plugin.settings.model}` : "AI optional", cls: "thread-progress-ai" });
    const legend = root.createDiv({ cls: "thread-legend" });
    legend.createSpan({ text: "From your notes", cls: "thread-legend-recorded" });
    legend.createSpan({ text: "AI interpretation", cls: "thread-legend-ai" });
    root.createEl("h3", { text: "Recorded context", cls: "thread-recorded-heading" });
    root.createEl("p", { text: "Quoted from recognized note fields. Recorded statements and user reports still need your judgment.", cls: "thread-meta" });
    for (const key of SECTION_KEYS.filter(key => key !== "nextActions")) {
      const section = root.createEl("section", { cls: `thread-recorded-section thread-section-${key}` }); section.createEl("h3", { text: LABELS[key], cls: "thread-label" });
      const claims = this.result.sections[key];
      if (!claims.length) section.createEl("p", { text: key === "newEvidence"
        ? this.bundle.baseline ? "No newer evidence identified from the available dates." : "No comparison baseline yet."
        : "Not established in the available evidence.", cls: "thread-muted" });
      for (const claim of claims) this.renderClaim(section, claim);
    }
    if (this.generatedAt) {
      const ai = root.createEl("section", { cls: "thread-ai" });
      const heading = ai.createDiv({ cls: "thread-section-heading" });
      heading.createEl("h3", { text: "AI interpretations and suggestions", cls: "thread-label" });
      heading.createSpan({ text: "Doesn't change your notes", cls: "thread-meta" });
      ai.createEl("p", { text: `Generated ${this.generatedAt} using ${this.plugin.settings.model}. These do not change the recorded context.`, cls: "thread-meta" });
      for (const claim of this.interpretations) this.renderClaim(ai, claim);
      const next = ai.createDiv({ cls: "thread-next-action" });
      next.createEl("h4", { text: "Suggested next action" });
      if (!this.result.sections.nextActions.length) next.createEl("p", { text: "No sourced suggestion returned." });
      for (const claim of this.result.sections.nextActions) this.renderClaim(next, claim);
      const modelGaps = ai.createEl("details"); modelGaps.createEl("summary", { text: "Model-reported gaps and limits" });
      for (const gap of this.modelGaps) modelGaps.createEl("p", { text: gap });
    }
    const limits = root.createEl("section", { cls: "thread-limits" });
    limits.createEl("h3", { text: "Evidence gaps and limits", cls: "thread-label" });
    const gaps = limits.createEl("ul");
    for (const gap of this.result.gaps) gaps.createEl("li", { text: gap });
    gaps.createEl("li", { text: contextCoverageText(this.bundle) });
    const details = limits.createEl("details", { cls: "thread-evidence" });
    details.createEl("summary", { text: `Evidence used (${this.bundle.sources.length} passages)` });
    for (const source of this.bundle.sources) {
      const item = details.createDiv(); this.sourceButton(item, source);
      item.createEl("p", { text: source.excerpt, cls: "thread-excerpt" });
    }
  }

  protected renderNavigation(root: HTMLElement): void {
    root.createEl("button", { text: "Open full workspace" }).onclick = () => { void this.plugin.openThreadWorkspace(); };
  }

  protected renderArea(_root: HTMLElement): boolean { return false; }

  protected renderProjectSelector(root: HTMLElement): void {
    const projectLabel = root.createEl("label", { cls: "thread-project-selector" });
    projectLabel.createEl("span", { text: "Project", cls: "thread-label" });
    projectLabel.createEl("span", { text: this.plugin.settings.selectedProject.split("/").pop() || "Choose a permitted project", cls: "thread-project-name" });
    projectLabel.createEl("span", { text: this.plugin.settings.selectedProject, cls: "thread-project-path" });
    setIcon(projectLabel.createSpan({ cls: "thread-project-chevron", attr: { "aria-hidden": "true" } }), "chevrons-up-down");
    const selector = projectLabel.createEl("select", { attr: { "aria-label": "Project" } });
    selector.add(new Option("Choose a permitted project", ""));
    for (const path of permittedProjects(this.plugin.index, this.plugin.settings)) selector.add(new Option(path, path));
    selector.value = this.plugin.settings.selectedProject; selector.disabled = this.homeLoading;
    selector.onchange = () => { void this.switchProject(selector.value); };
  }

  async loadHome(): Promise<void> {
    this.invalidate("Loading current project home..."); this.homeLoading = true;
    const revision = this.revision, settings = structuredClone(this.plugin.settings); this.render();
    try {
      if (!this.plugin.index.ready) await this.plugin.rebuildIndex();
      if (revision !== this.revision || this.closed || JSON.stringify(settings) !== JSON.stringify(this.plugin.settings)) return;
      if (settings.selectedProject) this.home = projectHome(this.plugin.index, settings, this.plugin.changes.state.pending);
      this.message = settings.selectedProject ? "Project home ready. Resume loads recorded context; AI is optional." : "Choose a permitted project. Map folders and explicit read permissions in Settings if none appear.";
    } catch (error) {
      if (revision === this.revision && !this.closed) this.message = error instanceof Error ? error.message : "Could not load project home.";
    } finally {
      if (revision === this.revision && !this.closed) { this.homeLoading = false; this.render(); }
    }
  }

  async switchProject(path: string): Promise<void> {
    try {
      if (path && !permittedProjects(this.plugin.index, this.plugin.settings).includes(path)) throw new Error("Project is no longer permitted. Refresh home or check Settings.");
      await this.plugin.updateSettings({ ...this.plugin.settings, selectedProject: path });
      if (!this.closed) await this.loadHome();
    } catch (error) {
      if (!this.closed) { this.invalidate(error instanceof Error ? error.message : "Could not switch project."); }
    }
  }

  private renderHome(root: HTMLElement): void {
    const snapshot = this.home;
    if (!snapshot) {
      root.createEl("button", { text: "Review queue" }).onclick = () => this.plugin.openReviewQueue();
      return;
    }
    const revision = this.revision;
    const home = root.createEl("details", { cls: "thread-home" }); home.open = !this.result;
    home.createEl("summary", { text: "Project home" });
    const reviews = home.createEl("section", { cls: "thread-pending-reviews" });
    reviews.createEl("h3", { text: "Needs your review", cls: "thread-label" });
    reviews.createEl("p", { text: `Pending reviews (${snapshot.pendingReviews})` });
    reviews.createEl("p", { text: snapshot.pendingReviews ? "A proposal for this project awaits explicit review." : "No proposal visible for this project. Changes also contains recovery and retained history.", cls: "thread-muted" });
    const reviewActions = reviews.createDiv({ cls: "thread-actions" });
    reviewActions.createEl("button", { text: "Review changes" }).onclick = () => this.plugin.openChanges();
    reviewActions.createEl("button", { text: "Review queue" }).onclick = () => this.plugin.openReviewQueue();
    const items = (label: string, list: HomeItem[], total: number) => {
      const questions = label === "Recorded questions";
      const section = home.createEl("section", { cls: `thread-home-section${label === "Recent sessions" ? " thread-sessions" : ""}${questions ? " thread-home-questions" : ""}` });
      const heading = section.createDiv({ cls: "thread-section-heading" });
      heading.createEl("h3", { text: label });
      heading.createSpan({ text: `${list.length} of ${total}`, cls: "thread-meta" });
      if (!list.length) section.createEl("p", { text: "No eligible records included.", cls: "thread-muted" });
      for (const item of list) {
        const row = section.createDiv({ cls: "thread-home-record" });
        if (questions) row.createSpan({ text: "?", cls: "thread-question-glyph", attr: { "aria-hidden": "true" } });
        const open = row.createEl("button", { text: questions ? item.text : item.path.split("/").pop()!.replace(/\.md$/i, ""), cls: "thread-source", attr: { title: item.path } });
        if (!questions) row.createEl("p", { text: item.text, cls: `thread-excerpt${label === "Recent sessions" ? " thread-record-date" : ""}` });
        open.onclick = () => { void this.plugin.openIndexedSource(item.path, item.hash, item.heading,
          () => !this.closed && this.revision === revision && this.home === snapshot && this.plugin.settings.selectedProject === snapshot.project)
          .catch(error => { if (!this.closed && this.revision === revision) { this.message = error instanceof Error ? error.message : "Source unavailable. Refresh home."; this.render(); } }); };
      }
    };
    items("Recent sessions", snapshot.sessions, snapshot.counts.sessions);
    items("Decisions", snapshot.decisions, snapshot.counts.decisions);
    items("Recorded questions", snapshot.questions, snapshot.counts.questions);
  }

  private renderClaim(parent: HTMLElement, claim: Claim): void {
    const item = parent.createDiv({ cls: "thread-claim" });
    item.createEl("span", { text: claimLabel(claim.kind), cls: `thread-kind thread-kind-${claim.kind}` });
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
    const button = parent.createEl("button", { cls: "thread-source", attr: { title: source.path } });
    button.createSpan({ text: source.id, cls: "thread-source-id" });
    button.createSpan({ text: `${source.path.split("/").pop()}${source.property ? ` › property: ${source.property}` : source.heading ? ` › ${source.heading}` : ""}` });
    button.dataset.sourcePath = source.path;
    button.addEventListener("click", () => { void this.openSource(source); });
  }

  private async openSource(source: Evidence): Promise<void> {
    const bundle = this.bundle;
    if (!bundle || !await this.plugin.evidenceCurrent(bundle, this.plugin.settings)) {
      this.invalidate("Evidence changed or is no longer allowed. Generate a fresh briefing."); return;
    }
    if(source.pdf){const revision=this.revision;await this.plugin.openIndexedSource(source.path,bundle.noteHashes[source.path]!,source.heading,()=>!this.closed&&this.bundle===bundle&&revision===this.revision);return;}
    const file = this.app.vault.getAbstractFileByPath(source.path);
    if (!(file instanceof TFile) || !readableText(file.path, this.plugin.settings)) return;
    await this.plugin.sourceLeaf().openFile(file, {
      eState: { subpath: source.heading ? `#${source.heading}` : "" }
    });
  }

  async resume(): Promise<void> {
    this.invalidate("Reading recorded project context...", true);
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
      if(!await this.plugin.evidenceCurrent(bundle,settings)||revision!==this.revision||this.closed||controller.signal.aborted)throw Error("Project evidence changed before generation. Resume again.");
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
