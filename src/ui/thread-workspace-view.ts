import type { ViewStateResult } from "obsidian";
import { BriefingView } from "./briefing-view.ts";
import type { ActionSnapshot } from "../vault/action-board.ts";
import { actionStates, actionLabels } from "../vault/action-record.ts";

export const THREAD_WORKSPACE_VIEW = "thread-workspace";
export type WorkspaceArea = "home" | "research" | "actions" | "reviews";

function restoredArea(state: unknown): WorkspaceArea {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "home";
  const area = (state as Record<string, unknown>).area;
  return area === "research" || area === "actions" || area === "reviews" ? area : "home";
}

export class ThreadWorkspaceView extends BriefingView {
  area: WorkspaceArea = "home";
  actionBoard: ActionSnapshot | null = null;

  override invalidate(message: string, preserveHome = false): void {
    this.actionBoard = null;
    super.invalidate(message, preserveHome);
  }
  override sourcesChanged(paths: Set<string>): void {
    if (this.area === "actions") this.invalidate("Action records or support changed. Refresh the action board.");
    else super.sourcesChanged(paths);
  }
  async loadActionBoard(): Promise<void> {
    if (this.closed || this.area !== "actions") return;
    this.invalidate("Reading current permitted action records...");
    const controller = new AbortController(); this.controller = controller;
    const revision = this.revision, settings = structuredClone(this.plugin.settings);
    const current = () => !this.closed && this.area === "actions" && revision === this.revision && !controller.signal.aborted && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
    this.render();
    try {
      const snapshot = await this.plugin.actionSnapshot(settings, current, controller.signal);
      if (!current()) return;
      this.actionBoard = snapshot; this.bundle = snapshot.bundle;
      this.message = `${snapshot.cards.length} current actions; ${snapshot.unavailable} unavailable; ${snapshot.omitted} omitted by the 100-record display limit. Indexed coverage can omit other notes.`;
    } catch (error) { if (current()) this.message = error instanceof Error ? error.message : "Could not load action records. Refresh and inspect local diagnostics."; }
    finally { if (this.controller === controller) { this.controller = null; if (!this.closed) this.render(); } }
  }

  override getViewType(): string { return THREAD_WORKSPACE_VIEW; }
  override getDisplayText(): string { return "Thread workspace"; }
  override getState(): Record<string, unknown> { return { area: this.area }; }

  override async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.area = restoredArea(state);
    this.invalidate("Workspace restored. Refresh home to load current records.");
    // Only the validated presentation state reaches Obsidian's view lifecycle.
    await super.setState(this.getState(), result);
  }

  async navigate(area: WorkspaceArea): Promise<void> {
    if (this.closed) return;
    this.area = restoredArea({ area });
    this.invalidate("Choose an action. Current read permissions still apply.");
    this.app.workspace.requestSaveLayout();
    if (this.area === "home") await this.loadHome();
    if (this.area === "actions") await this.loadActionBoard();
  }

  protected override renderNavigation(root: HTMLElement): void {
    root.addClass("thread-workspace");
    const navigation = root.createEl("nav", { cls: "thread-workspace-nav", attr: { "aria-label": "Thread workspace" } });
    for (const [label, area] of [["Home", "home"], ["Ask", null], ["Research", "research"], ["Actions", "actions"], ["Reviews", "reviews"]] as const) {
      const button = navigation.createEl("button", { text: label });
      if (area) {
        button.dataset.area = area;
        if (area === this.area) button.setAttribute("aria-current", "page");
        button.onclick = () => {
          void this.navigate(area).then(() => {
            if (!this.closed) this.contentEl.querySelector<HTMLButtonElement>(`[data-area="${area}"]`)?.focus();
          });
        };
      } else button.onclick = () => this.plugin.openAsk();
    }
    navigation.createEl("button", { text: "Open sidebar", cls: "thread-workspace-sidebar" }).onclick = () => { void this.plugin.openThread(); };
  }

  protected override renderArea(root: HTMLElement): boolean {
    if (this.area === "home") return false;
    this.renderProjectSelector(root);
    root.createEl("p", { text: this.message, cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
    const area = root.createEl("section", { cls: "thread-workspace-area" });
    const cards = area.createDiv({ cls: "thread-workspace-cards" });
    const card = (title: string, description: string, actions: readonly (readonly [string, () => void])[]) => {
      const container = cards.createDiv({ cls: "thread-card" });
      container.createEl("h3", { text: title });
      container.createEl("p", { text: description, cls: "thread-muted" });
      const buttons = container.createDiv({ cls: "thread-actions" });
      for (const [label, action] of actions) buttons.createEl("button", { text: label }).onclick = action;
    };
    if (this.area === "research") {
      card("Find and ask", "Choose current permitted evidence before generating a local answer.", [
        ["Find evidence", () => this.plugin.openRecall()], ["Ask", () => this.plugin.openAsk()],
        ["Questions", () => this.plugin.openQuestions()]
      ]);
      card("Collect knowledge", "Capture sources and inspect their freshness. PDF access requires explicit consent.", [
        ["Capture", () => this.plugin.openCapture()], ["Knowledge", () => this.plugin.openKnowledge()],
        ["Source freshness", () => this.plugin.openFreshness()], ["Local PDF extraction", () => this.plugin.openPdf()]
      ]);
    } else if (this.area === "actions") {
      card("Record progress", "Wrap up a session or review the week. Saving a record remains explicit.", [
        ["Project actions", () => this.plugin.openActions()],
        ["Wrap up", () => this.plugin.openSession()], ["Weekly review", () => this.plugin.openWeekly()],
        ["Timeline", () => this.plugin.openTimeline()]
      ]);
      card("Project direction", "Inspect decisions and current project records before choosing your next action.", [
        ["Decisions", () => this.plugin.openDecisions()], ["All projects", () => this.plugin.openProjectOverview()],
        ["Workspaces", () => this.plugin.openWorkspace()]
      ]);
      const heading = area.createDiv({ cls: "thread-actions" });
      heading.createEl("h3", { text: "Recorded action board" });
      const refresh = heading.createEl("button", { text: "Refresh action board" });
      refresh.disabled = this.controller !== null; refresh.onclick = () => { void this.loadActionBoard(); };
      area.createEl("p", { text: "Statuses and dates are explicit user reports, not independently verified events. Review action opens the existing form; moving a card requires a separate exact change preview.", cls: "thread-muted" });
      const board = area.createDiv({ cls: "thread-action-board" });
      for (const state of actionStates) {
        const column = board.createEl("section", { cls: "thread-action-column", attr: { "aria-label": `${actionLabels[state]} actions` } });
        const records = this.actionBoard?.cards.filter(c => c.record.status === state) ?? [];
        column.createEl("h4", { text: `${actionLabels[state]}${this.actionBoard ? ` (${records.length})` : ""}` });
        if (!records.length) column.createEl("p", { text: this.actionBoard ? "No current actions in this state." : "Refresh to load current records.", cls: "thread-muted" });
        for (const item of records) {
          const entry = column.createDiv({ cls: "thread-card" }), last = item.record.history.at(-1)!;
          entry.createEl("h4", { text: item.record.title });
          entry.createEl("p", { text: `${actionLabels[state]} · reported ${last.day}`, cls: "thread-meta" });
          entry.createEl("p", { text: last.reason.slice(0, 300) + (last.reason.length > 300 ? "..." : "") });
          entry.createEl("p", { text: `Recorded ${last.recordedAt}`, cls: "thread-meta" });
          const revision = this.revision;
          entry.createEl("button", { text: "Open action", attr: { "aria-label": `Open action ${item.record.title}` } }).onclick = () => {
            void this.plugin.openIndexedSource(item.path, item.hash, "", () => !this.closed && revision === this.revision)
              .catch(error => { if (!this.closed && revision === this.revision) this.invalidate(error instanceof Error ? error.message : "Action unavailable. Refresh."); });
          };
          entry.createEl("button", { text: "Review action", attr: { "aria-label": `Review action ${item.record.title}` } }).onclick = () => {
            if (!this.closed && revision === this.revision) this.plugin.openActions(item.path);
          };
        }
      }
    } else {
      card("Review explicitly", "Inspect changed sources, decisions and proposed note changes before applying anything.", [
        ["Review queue", () => this.plugin.openReviewQueue()], ["Review decisions", () => this.plugin.openDecisionReview()],
        ["Changes", () => this.plugin.openChanges()]
      ]);
      card("Coverage and recovery", "Check current read coverage and inspect checkpoint or recovery operations.", [
        ["Vault health", () => this.plugin.openHealth()], ["Index coverage", () => this.plugin.openIndexCoverage()],
        ["Export checkpoint", () => this.plugin.openProjectExport()], ["Import package / recovery", () => this.plugin.openProjectImport()]
      ]);
    }
    return true;
  }
}
