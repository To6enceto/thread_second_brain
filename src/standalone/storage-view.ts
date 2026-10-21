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
  constructor(bridge: DesktopBridge, revision: () => number | null, models: ModelSetup) {
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
      this.message("Preference drafts restored. Apply local AI settings and refresh projects explicitly. Read access is unchanged.");
    });
    el("plugin-config").addEventListener("input", () => {
      const epoch = ++this.epoch; this.clearInspection();
      if (this.state) this.state = { ...this.state, writing: false };
      this.buttons(); this.message("Configuration folder changed. Read its plugin files and enable writing again.");
      // Revoke main-process ownership too, including pending enable/copy work.
      void bridge.releaseWriting().then(result => { if (epoch === this.epoch && !result.ok) this.message(result.message); });
    });
    el("storage-inspect").addEventListener("click", () => { void this.run(async (revision, current) => {
      const folder = el<HTMLInputElement>("plugin-config").value; this.clearInspection();
      const preview = value(await bridge.inspectCompatibility(folder, revision)); if (!current()) return;
      if (preview.folder !== folder || folder !== el<HTMLInputElement>("plugin-config").value) throw Error("Configuration folder changed. Inspect again.");
      this.preview = preview; el("storage-compatibility").textContent = preview.compatible ? preview.installed ? `Compatible Thread ${preview.version}. No pending plugin recovery found.` : "No Thread plugin metadata found in the selected configuration folder." : preview.reasons.join(" ");
      el("storage-history-preview").textContent = preview.history;
      el("storage-import-preferences").textContent = JSON.stringify(preview.preferences, null, 2);
      this.message("Compatibility inspected. Review it before enabling writing. Nothing was copied or changed.");
    }); });
    el("storage-enable").addEventListener("click", () => { void this.run(async (revision, current) => {
      const preview = this.chosenInspection(); const result = value(await bridge.enableWriting(preview.id, revision));
      if (current()) { this.show(result); this.message("Desktop owns writing. Every note still requires an exact preview and explicit Save. Keep other editors closed."); }
    }); });
    el("storage-release").addEventListener("click", () => { void this.run(async (revision, current) => {
      value(await bridge.releaseWriting()); if (current()) { this.clearInspection(); this.show(value(await bridge.storageStatus(revision))); this.message("Writing released. Inspect compatibility again before enabling it."); }
    }); });
    el("storage-save").addEventListener("click", () => { void this.run(async (revision, current) => {
      const roles = Object.fromEntries(roleNames.map(role => [role, el<HTMLInputElement>(`storage-role-${role}`).value.trim()])) as DesktopPreferences["roles"];
      const result = value(await bridge.savePreferences({ ...models.draft(), roles }, revision)); if (current()) { this.show(result); this.message("Desktop preferences saved. Read access and PDF consent were not saved."); }
    }); });
    el("storage-import").addEventListener("click", () => { void this.run(async (revision, current) => {
      const preview = this.chosenInspection(); const result = value(await bridge.importPluginCopy(preview.id, revision));
      if (current()) { this.show(result); this.message("Copied compatible preference drafts and an immutable history snapshot. Plugin files and read access remain unchanged."); }
    }); });
    this.reset();
  }
  private message(text: string): void { el("storage-status").textContent = text; }
  private clearInspection(): void {
    this.preview = null;
    for (const id of ["storage-compatibility", "storage-history-preview", "storage-import-preferences"]) el(id).replaceChildren();
  }
  private chosenInspection(): CompatibilityPreview {
    if (!this.preview || this.preview.folder !== el<HTMLInputElement>("plugin-config").value) throw Error("Inspect the chosen configuration folder before enabling writing or copying.");
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
    this.message(state.warning || `${state.writing ? "Desktop owns writing." : "Writing disabled."} ${state.saves.length} save receipts; ${state.importedCopies} imported history copies. Preferences grant no read access.`);
    const recovery = el("storage-recovery"); recovery.replaceChildren();
    for (const receipt of state.saves) {
      const row = document.createElement("section"); row.className = "thread-record-card"; recovery.append(row);
      const title = document.createElement("p"); title.textContent = `${receipt.status}: ${receipt.path}`; row.append(title);
      if (receipt.status !== "pending") continue;
      const inspect = document.createElement("button"); inspect.textContent = "Inspect pending save"; inspect.disabled = !state.writing; row.append(inspect);
      inspect.addEventListener("click", () => { void this.run(async (revision, current) => {
        const preview = value(await this.bridge.inspectSaveRecovery(receipt.id, revision)); if (!current()) return;
        // One exact recovery preview is active at a time.
        this.show(state); const area = document.createElement("section"); recovery.append(area);
        const explanation = document.createElement("p"); explanation.textContent = `${preview.path}: ${preview.matches ? "Current bytes match the intended note. This does not prove which process created them." : preview.present ? "Current bytes differ from the intended note." : "No note exists at this destination."} Recovery changes only the receipt; existing files are preserved.`; area.append(explanation);
        const details = document.createElement("details"), summary = document.createElement("summary"), body = document.createElement("pre"); summary.textContent = "Exact intended note from the pending receipt"; body.textContent = preview.content; body.tabIndex = 0; details.append(summary, body); area.append(details);
        for (const action of ["confirm", "leave"] as const) {
          const button = document.createElement("button"); button.textContent = action === "confirm" ? "Confirm completed save" : "Keep files and close recovery"; button.disabled = action === "confirm" && !preview.matches; area.append(button);
          button.addEventListener("click", () => { void this.run(async (revision, current) => {
            value(await this.bridge.resolveSaveRecovery(preview.id, action, revision));
            if (current()) { this.show(value(await this.bridge.storageStatus(revision))); this.message("Recovery receipt resolved explicitly. No vault files were changed or removed."); }
          }); });
        }
        this.message("Review the current target and intended bytes before resolving this pending receipt.");
      }); });
    }
  }
  reset(): void {
    this.epoch++; this.state = null; this.clearInspection();
    for (const id of ["storage-preferences", "storage-compatibility", "storage-history-preview", "storage-recovery"]) el(id).replaceChildren();
    this.message("Select a vault to inspect desktop state."); this.buttons();
  }
  async refresh(): Promise<void> {
    this.clearInspection();
    await this.run(async (revision, current) => { const result = value(await this.bridge.storageStatus(revision)); if (current()) this.show(result); });
  }
  private async run(work: (revision: number, current: () => boolean) => Promise<void>): Promise<void> {
    const revision = this.revision(); if (revision === null) return;
    const epoch = ++this.epoch, current = () => epoch === this.epoch && revision === this.revision(); this.buttons(true); this.message("Checking desktop storage...");
    try { await work(revision, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Storage unavailable. Preserve your history and retry."); }
    finally { if (current()) this.buttons(); }
  }
}
