import type { DesktopBridge, DesktopResult } from "./contracts.ts";
import type { CompatibilityPreview, StorageStatus } from "./storage.ts";
import type { DesktopPreferences } from "./profile.ts";
import { roleNames } from "../settings/settings.ts";
import type { ModelSetup } from "./model-setup.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
export class StorageView {
  private bridge: DesktopBridge;
  private revision: () => number | null;
  private models: ModelSetup;
  private epoch = 0;
  private state: StorageStatus | null = null;
  private preview: CompatibilityPreview | null = null;
  constructor(bridge: DesktopBridge, revision: () => number | null, models: ModelSetup, changed: () => void = () => {}) {
    this.bridge = bridge; this.revision = revision; this.models = models;
    for (const role of roleNames) {
      const label = document.createElement("label"); label.textContent = role; const input = document.createElement("input"); input.id = `storage-role-${role}`; input.maxLength = 512;
      label.append(input); el("storage-roles").append(label);
    }
    el("storage-refresh").addEventListener("click", () => { void this.refresh(); });
    el("storage-use-drafts").addEventListener("click", () => {
      if (!this.state) return; this.models.restoreDraft(this.state.preferences);
      el<HTMLInputElement>("projects-folder").value = this.state.preferences.roles.projects;
      el("projects-folder").dispatchEvent(new Event("input")); this.roles(this.state.preferences);
      this.message("Saved settings filled in. Set up the AI model and refresh projects yourself. What Thread may read is unchanged.");
    });
    el("plugin-config").addEventListener("input", () => {
      changed();
      const epoch = ++this.epoch; this.clearInspection();
      if (this.state) this.state = { ...this.state, writing: false };
      this.buttons(); this.message("Settings folder changed. Check the plugin's files and allow saving again.");
      // Revoke main-process ownership too, including pending enable/copy work.
      void bridge.releaseWriting().then(result => { if (epoch === this.epoch && !result.ok) this.message(result.message); });
    });
    el("storage-inspect").addEventListener("click", () => { void this.run(async (revision, current) => {
      const folder = el<HTMLInputElement>("plugin-config").value; this.clearInspection();
      const preview = value(await bridge.inspectCompatibility(folder, revision)); if (!current()) return;
      if (preview.folder !== folder || folder !== el<HTMLInputElement>("plugin-config").value) throw Error("Settings folder changed. Check again.");
      this.preview = preview; el("storage-compatibility").textContent = preview.compatible ? preview.installed ? `Thread plugin ${preview.version} works with saving here, and it has no unfinished changes.` : "The Thread plugin is not installed in this settings folder. If you use Thread in Obsidian, check that this is the right folder; otherwise you can allow saving." : preview.reasons.join(" ");
      el("storage-history-preview").textContent = preview.history;
      el("storage-import-preferences").textContent = JSON.stringify(preview.preferences, null, 2);
      this.message("Check finished. Read the result, then allow saving. Nothing was copied or changed.");
    }); });
    el("storage-enable").addEventListener("click", () => { void this.run(async (revision, current) => {
      const preview = this.chosenInspection(); const result = value(await bridge.enableWriting(preview.id, revision));
      if (current()) { this.show(result); this.message("Saving is allowed. You still see every note before it is saved. Keep other editors closed."); }
    }); });
    el("storage-release").addEventListener("click", () => { void this.run(async (revision, current) => {
      changed();
      value(await bridge.releaseWriting()); if (current()) { this.clearInspection(); this.show(value(await bridge.storageStatus(revision))); this.message("Saving stopped. Check the plugin's files again before allowing it."); }
    }); });
    el("storage-save").addEventListener("click", () => { void this.run(async (revision, current) => {
      changed();
      const roles = Object.fromEntries(roleNames.map(role => [role, el<HTMLInputElement>(`storage-role-${role}`).value.trim()])) as DesktopPreferences["roles"];
      const result = value(await bridge.savePreferences({ ...models.draft(), roles }, revision)); if (current()) { this.show(result); this.message("Settings saved. What Thread may read and PDF permissions were not saved here."); }
    }); });
    el("storage-import").addEventListener("click", () => { void this.run(async (revision, current) => {
      changed();
      const preview = this.chosenInspection(); const result = value(await bridge.importPluginCopy(preview.id, revision));
      if (current()) { this.show(result); this.message("Copied the plugin's settings and a read-only copy of its history. The plugin's files and what Thread may read are unchanged."); }
    }); });
    this.reset();
  }
  private message(text: string): void { el("storage-status").textContent = text; }
  private clearInspection(): void {
    this.preview = null;
    for (const id of ["storage-compatibility", "storage-history-preview", "storage-import-preferences"]) el(id).replaceChildren();
  }
  private chosenInspection(): CompatibilityPreview {
    if (!this.preview || this.preview.folder !== el<HTMLInputElement>("plugin-config").value) throw Error("Check the plugin's files in this settings folder first.");
    return this.preview;
  }
  private roles(preferences: DesktopPreferences): void { for (const role of roleNames) el<HTMLInputElement>(`storage-role-${role}`).value = preferences.roles[role]; }
  private buttons(busy = false): void {
    for (const id of ["storage-refresh", "storage-inspect", "storage-release", "storage-use-drafts"]) el<HTMLButtonElement>(id).disabled = busy || this.revision() === null;
    el<HTMLButtonElement>("storage-enable").disabled = busy || !this.preview?.compatible || !!this.state?.warning;
    el<HTMLButtonElement>("storage-import").disabled = busy || !this.preview?.compatible || !this.state?.writing;
    el<HTMLButtonElement>("storage-save").disabled = busy || !this.state?.writing;
  }
  private show(state: StorageStatus): void {
    this.state = state; this.roles(state.preferences); el("storage-preferences").textContent = JSON.stringify(state.preferences, null, 2);
    this.message(state.warning || `${state.writing ? "Saving is allowed." : "Saving is off."} ${state.saves.length} save records; ${state.importedCopies} copied plugin histories.`);
    const recovery = el("storage-recovery"); recovery.replaceChildren();
    for (const receipt of state.saves) {
      const row = document.createElement("section"); row.className = "thread-record-card"; recovery.append(row);
      const title = document.createElement("p"); title.textContent = `${receipt.status}: ${receipt.path}`; row.append(title);
      if (receipt.status !== "pending") continue;
      const inspect = document.createElement("button"); inspect.textContent = "Look at unfinished save"; inspect.disabled = !state.writing; row.append(inspect);
      inspect.addEventListener("click", () => { void this.run(async (revision, current) => {
        const preview = value(await this.bridge.inspectSaveRecovery(receipt.id, revision)); if (!current()) return;
        // One exact recovery preview is active at a time.
        this.show(state); const area = document.createElement("section"); recovery.append(area);
        const explanation = document.createElement("p"); explanation.textContent = `${preview.path}: ${preview.matches ? "The note on disk matches the intended note. This does not show which app wrote it." : preview.present ? "The note on disk is different from the intended note." : "There is no note at this place."} Resolving changes only Thread's record; your files stay as they are.`; area.append(explanation);
        const details = document.createElement("details"), summary = document.createElement("summary"), body = document.createElement("pre"); summary.textContent = "The note Thread meant to save"; body.textContent = preview.content; body.tabIndex = 0; details.append(summary, body); area.append(details);
        for (const action of ["confirm", "leave"] as const) {
          const button = document.createElement("button"); button.textContent = action === "confirm" ? "Confirm completed save" : "Keep files and close recovery"; button.disabled = action === "confirm" && !preview.matches; area.append(button);
          button.addEventListener("click", () => { void this.run(async (revision, current) => {
            value(await this.bridge.resolveSaveRecovery(preview.id, action, revision));
            if (current()) { this.show(value(await this.bridge.storageStatus(revision))); this.message("Unfinished save resolved. No notes were changed or removed."); }
          }); });
        }
        this.message("Compare the note on disk with the intended note before resolving this unfinished save.");
      }); });
    }
  }
  reset(): void {
    this.epoch++; this.state = null; this.clearInspection();
    for (const id of ["storage-preferences", "storage-compatibility", "storage-history-preview", "storage-recovery"]) el(id).replaceChildren();
    this.message("Choose a notes folder first."); this.buttons();
  }
  async refresh(): Promise<void> {
    this.clearInspection();
    await this.run(async (revision, current) => { const result = value(await this.bridge.storageStatus(revision)); if (current()) this.show(result); });
  }
  private async run(work: (revision: number, current: () => boolean) => Promise<void>): Promise<void> {
    const revision = this.revision(); if (revision === null) return;
    const epoch = ++this.epoch, current = () => epoch === this.epoch && revision === this.revision(); this.buttons(true); this.message("Checking saving settings...");
    try { await work(revision, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Saving settings are unavailable. Keep Thread's profile as it is and try again."); }
    finally { if (current()) this.buttons(); }
  }
}
