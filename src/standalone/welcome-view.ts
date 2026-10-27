import type { DesktopBridge, DesktopResult } from "./contracts.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
export interface WelcomeState { folder: string | null; roots: string[]; revision: number | null; }
export interface WelcomeHooks { state: () => WelcomeState; choose: () => void; focusAccess: () => boolean; endpoint: () => string; hideOthers: () => void; openChanges: () => void; }

/** Skippable first-run steps; every action reuses an existing explicit control or reviewed save. */
export class WelcomeView {
  private bridge: DesktopBridge;
  private hooks: WelcomeHooks;
  private busy = new Set<string>();
  constructor(bridge: DesktopBridge, hooks: WelcomeHooks) {
    this.bridge = bridge; this.hooks = hooks;
    el("open-welcome").addEventListener("click", () => this.open());
    el("new-project").addEventListener("click", () => this.open(true));
    el("welcome-skip").addEventListener("click", () => { this.hide(); el("choose").focus(); });
    el("welcome-choose").addEventListener("click", () => this.hooks.choose());
    el("welcome-access").addEventListener("click", () => { if (!this.hooks.focusAccess()) el("welcome-access-status").textContent = "Choose your notes folder first (step 1)."; });
    el("welcome-test-ai").addEventListener("click", () => { void this.run("welcome-ai-status", "Asking Ollama on this computer...", async () => {
      const result = value(await this.bridge.discoverModels(this.hooks.endpoint())), usable = result.models.filter(model => model.completion).length;
      return usable ? `Ollama answered: ${usable} text ${usable === 1 ? "model" : "models"} you can use. Choose one under Optional local AI.` : "Ollama answered, but no downloaded text model was found. Run the ollama pull command, then test again.";
    }); });
    el("welcome-sample").addEventListener("click", () => { void this.start("sample", ""); });
    el("welcome-new-project").addEventListener("click", () => { void this.start("project", el<HTMLInputElement>("welcome-project-name").value); });
  }
  open(atStart = false): void {
    this.hooks.hideOthers(); el("welcome-panel").hidden = false; this.update();
    if (atStart) el("welcome-project-name").focus(); else el("welcome-panel").focus();
  }
  hide(): void { el("welcome-panel").hidden = true; }
  update(): void {
    const state = this.hooks.state();
    el("welcome-folder-status").textContent = state.folder ? `Chosen: ${state.folder}` : "No folder chosen yet.";
    el("welcome-access-status").textContent = state.roots.length ? `Thread may read: ${state.roots.join(", ")}` : "Thread cannot read anything yet.";
  }
  private async start(kind: "project" | "sample", name: string): Promise<void> {
    await this.run("welcome-start-status", "Preparing the notes...", async () => {
      const revision = this.hooks.state().revision;
      if (revision === null) throw Error("Choose your notes folder and approve read access first.");
      value(await this.bridge.prepareNewProject(kind, name, revision)); this.hooks.openChanges();
      return `${kind === "sample" ? "Sample project" : "New project"} ready to check in Review changes. Nothing is saved until you apply it.`;
    });
  }
  private async run(status: string, pending: string, work: () => Promise<string>): Promise<void> {
    if (this.busy.has(status)) { el(status).textContent = "Wait for the current step to finish."; return; }
    this.busy.add(status); el(status).textContent = pending;
    try { el(status).textContent = await work(); } catch (error) { el(status).textContent = error instanceof Error ? error.message : "That did not work. Try again."; }
    finally { this.busy.delete(status); }
  }
}
