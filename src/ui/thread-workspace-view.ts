import type { ViewStateResult } from "obsidian";
import { BriefingView } from "./briefing-view.ts";

export const THREAD_WORKSPACE_VIEW = "thread-workspace";
export type WorkspaceArea = "home" | "research" | "actions" | "reviews";

function restoredArea(state: unknown): WorkspaceArea {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "home";
  const area = (state as Record<string, unknown>).area;
  return area === "research" || area === "actions" || area === "reviews" ? area : "home";
}

export class ThreadWorkspaceView extends BriefingView {
  area: WorkspaceArea = "home";

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
        ["Wrap up", () => this.plugin.openSession()], ["Weekly review", () => this.plugin.openWeekly()],
        ["Timeline", () => this.plugin.openTimeline()]
      ]);
      card("Project direction", "Inspect decisions and current project records before choosing your next action.", [
        ["Decisions", () => this.plugin.openDecisions()], ["All projects", () => this.plugin.openProjectOverview()],
        ["Workspaces", () => this.plugin.openWorkspace()]
      ]);
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
