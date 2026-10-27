import type { ContinuedAccess, DesktopBridge, DesktopResult, SavedAccessStatus } from "./contracts.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
export interface RememberInput { revision: number; projectsFolder: string; embeddingModel: string; }
/** Runs continuation steps in order and stops once the reopened vault is no longer current. */
export async function continueSteps(revision: number, current: () => number | null, steps: (() => Promise<unknown>)[]): Promise<boolean> {
  for (const step of steps) { if (current() !== revision) return false; await step(); }
  return current() === revision;
}

/** Shows explicitly remembered access; nothing in the vault is read until Continue. */
export class SavedAccessView {
  private bridge: DesktopBridge;
  private current: () => RememberInput | null;
  private closing: () => void;
  private continued: (result: ContinuedAccess) => Promise<boolean>;
  private announce: (message: string) => void;
  private state: SavedAccessStatus = { saved: null, warning: "" };
  private busy = false;
  constructor(bridge: DesktopBridge, current: () => RememberInput | null, closing: () => void, continued: (result: ContinuedAccess) => Promise<boolean>, announce: (message: string) => void) {
    this.bridge = bridge; this.current = current; this.closing = closing; this.continued = continued; this.announce = announce;
    el("saved-continue").addEventListener("click", () => { void this.run(async () => {
      this.announce("Checking the saved folder...");
      // Main closes the open vault before reopening, so the window drops its old access first.
      this.closing(); const result = value(await this.bridge.continueSavedAccess());
      if (!await this.continued(result)) return;
      this.announce(`Saved access opened: ${result.vault.name}, reading ${result.vault.scope.roots.join(", ")}.`);
    }); });
    el("saved-forget").addEventListener("click", () => { void this.run(async () => {
      this.render(value(await this.bridge.forgetSavedAccess()));
      this.announce("Saved access forgotten. Next time, choose the folder and approve access again. Current access is unchanged.");
    }); });
    el("remember-access").addEventListener("click", () => { const input = this.current(); if (!input) return; void this.run(async () => {
      this.render(value(await this.bridge.rememberAccess(input.projectsFolder, input.embeddingModel, input.revision)));
      this.announce("Access remembered on this computer. Next time, check the saved access and choose Continue.");
    }); });
  }
  async load(): Promise<void> {
    try { this.render(value(await this.bridge.savedAccess())); } catch (error) { this.announce(error instanceof Error ? error.message : "Saved access is unavailable."); }
  }
  update(): void {
    el<HTMLButtonElement>("saved-continue").disabled = this.busy || !this.state.saved;
    el<HTMLButtonElement>("saved-forget").disabled = this.busy;
    el<HTMLButtonElement>("remember-access").disabled = this.busy || !!this.state.warning || !this.current();
  }
  private render(status: SavedAccessStatus): void {
    this.state = status; const saved = status.saved, list = el("saved-access-details"), warning = el("saved-access-warning");
    el("saved-access").hidden = !saved && !status.warning;
    warning.textContent = status.warning; warning.hidden = !status.warning;
    const lines = saved ? [
      `Folder: ${saved.name} (${saved.path})`,
      `Thread may read: ${saved.scope.roots.join(", ")}`,
      `Kept private: ${saved.scope.excluded.length ? saved.scope.excluded.join(", ") : "none"}`,
      `Projects folder: ${saved.projectsFolder || "not saved"}`,
      `Local AI: ${saved.ai.model ? `${saved.ai.model} at ${saved.ai.endpoint}, checked again when you continue` : "not used"}`,
      ...(saved.ai.embeddingModel ? [`Embedding model: ${saved.ai.embeddingModel}`] : []),
      `Saved: ${new Date(saved.savedAt).toLocaleString()}`,
      "Never remembered: PDF permissions and saving."
    ] : [];
    list.replaceChildren(...lines.map(line => { const item = document.createElement("li"); item.textContent = line; return item; }));
    this.update();
  }
  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy) return; this.busy = true; this.update();
    try { await work(); } catch (error) { this.announce(error instanceof Error ? error.message : "Saved access could not finish. Try again."); }
    finally { this.busy = false; this.update(); }
  }
}
