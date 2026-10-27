import type { DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { ExportSnapshot, ExportPreviewSnapshot, PackageSummary, ComparisonSnapshot, ImportPreviewSnapshot, ImportStatus } from "./portability.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node; }
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest };
export class PortabilityView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private show: () => void;
  private source: (path: string, heading: string, hash: string) => void;
  private epoch = 0;
  private busy = false;
  private package: PackageSummary | null = null;
  private exportPreview: ExportPreviewSnapshot | null = null;
  private importPreview: ImportPreviewSnapshot | null = null;
  // A completed write changes the vault listing, which refreshes this panel; keep its confirmation visible.
  private notice = "";
  constructor(bridge: DesktopBridge, access: () => Access | null, show: () => void, source: (path: string, heading: string, hash: string) => void) {
    this.bridge = bridge; this.access = access; this.show = show; this.source = source;
    el("open-portability").addEventListener("click", () => this.open());
    el("portability-mode").addEventListener("change", () => { void this.refresh(); });
    el("portability-refresh").addEventListener("click", () => { void this.refresh(); });
    el("portability-cancel").addEventListener("click", () => this.invalidate("Portability work canceled. Refresh to continue."));
    el("portability-close").addEventListener("click", () => { this.hide(); el("source-pane").hidden = false; }); this.invalidate();
  }
  private message(text: string): void { el("portability-status").textContent = text; }
  /** A just-completed write's confirmation is shown once on the next default refresh; explicit messages (such as Cancel) replace it. */
  invalidate(message?: string): void { message ??= this.notice ? `${this.notice} The panel was refreshed after the vault changed.` : "Refresh portability for the current permitted project."; this.notice = ""; this.epoch++; this.package = null; this.exportPreview = null; this.importPreview = null; el("portability-content").replaceChildren(); this.setBusy(false); this.message(message); void this.bridge.cancelPortability(); }
  hide(): void { el("portability-panel").hidden = true; this.invalidate(); }
  open(): void { this.show(); el("portability-panel").hidden = false; el("portability-panel").focus(); void this.refresh(); }
  private setBusy(busy: boolean): void {
    // Inputs stay locked while work runs: an edit would cancel an in-flight save or import mid-write.
    this.busy = busy; el<HTMLButtonElement>("portability-refresh").disabled = busy; el<HTMLSelectElement>("portability-mode").disabled = busy;
    for (const field of el("portability-content").querySelectorAll<HTMLInputElement>("input")) field.disabled = busy;
    for (const button of el("portability-content").querySelectorAll<HTMLButtonElement>("[data-portability-work]")) button.disabled = busy || button.dataset.needs === "export" && !this.exportPreview || button.dataset.needs === "package" && !this.package || button.dataset.needs === "import" && !this.importPreview;
  }
  private async run(work: (access: Access, current: () => boolean) => Promise<void>): Promise<void> {
    const access = this.access(); if (!access) { this.message("Choose a vault and explicitly grant read access first."); return; } if (this.busy) return;
    this.notice = ""; const epoch = ++this.epoch, key = JSON.stringify(access), current = () => epoch === this.epoch && key === JSON.stringify(this.access()); this.setBusy(true);
    try { await work(access, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Portability work failed. Refresh and try again."); }
    finally { if (current()) this.setBusy(false); }
  }
  private button(parent: HTMLElement, label: string, click: () => void, needs = ""): HTMLButtonElement { const button = add(parent, "button", label); button.dataset.portabilityWork = "true"; if (needs) { button.dataset.needs = needs; button.disabled = true; } button.addEventListener("click", click); return button; }
  private input(parent: HTMLElement, label: string, initial: string, max: number): HTMLInputElement { const input = add(add(parent, "label", label), "input"); input.setAttribute("aria-label", label); input.value = initial; input.maxLength = max; input.addEventListener("input", () => this.changed()); return input; }
  private changed(): void { this.epoch++; this.exportPreview = null; this.importPreview = null; el("portability-preview")?.replaceChildren(); this.setBusy(false); void this.bridge.cancelPortability(); this.message("Inputs changed. Preview again; nothing was written."); }
  /** A finished write is a fact: report it unless the vault itself changed, even if a listing refresh already reset the panel. */
  private completed(access: Access, current: () => boolean, text: string): void { if (current()) { this.notice = text; this.message(text); } else if (this.access()?.revision === access.revision) this.message(text); }
  private exact(parent: HTMLElement, label: string, text: string): void { const details = add(parent, "details"); add(details, "summary", label); const pre = add(details, "pre", text, "thread-excerpt"); pre.tabIndex = 0; }
  async refresh(): Promise<void> {
    this.invalidate("Reading current portability context..."); const mode = el<HTMLSelectElement>("portability-mode").value;
    await this.run(async (access, current) => {
      const area = el("portability-content");
      if (mode === "export") { const snapshot = value(await this.bridge.exportInventory(access.selection, access.revision)); if (!current()) return; this.exporter(area, snapshot, access.selection.project); }
      else { const status = mode === "import" ? value(await this.bridge.importStatus(access.revision)) : null; if (!current()) return; this.packages(area, mode, status); }
      this.message("Context ready. Choose inputs explicitly; nothing is written automatically.");
    });
  }
  private exporter(area: HTMLElement, snapshot: ExportSnapshot, project: string): void {
    add(area, "p", snapshot.coverage, "thread-muted"); if (!snapshot.candidates.length) add(area, "p", "No current permitted files are available for this project.", "thread-empty");
    const form = add(area, "section", "", "thread-record-form"); add(form, "h3", "Choose checkpoint files"); const chosen = new Set<string>();
    for (const candidate of snapshot.candidates) { const label = add(form, "label", "", "thread-research-check"), box = add(label, "input"); box.type = "checkbox"; box.setAttribute("aria-label", `Include ${candidate.path}`); add(label, "span", ` ${candidate.path} (${candidate.kind})`); box.addEventListener("change", () => { if (box.checked) chosen.add(candidate.path); else chosen.delete(candidate.path); this.changed(); }); }
    const folder = this.input(form, "Checkpoint folder (inside read access)", `${project}/Checkpoints`, 1000), name = this.input(form, "Checkpoint name", `${new Date().toISOString().slice(0, 10)} checkpoint`, 100);
    this.button(form, "Preview checkpoint", () => { const selected = [...chosen]; void this.run(async (access, current) => {
      const preview = value(await this.bridge.previewExport(snapshot.id, selected, folder.value, name.value, access.revision)); if (!current()) return; this.exportPreview = preview; const output = el("portability-preview"); output.replaceChildren();
      add(output, "h3", "Exact checkpoint inventory - not saved"); add(output, "p", `Destination: ${preview.path}. ${preview.manifest.entries.length} files; ${preview.bytes} package bytes (version 1 JSON with SHA-256 and base64 payloads).`);
      add(output, "p", `Omissions: ${preview.manifest.omissions.unavailable} unavailable or unsupported; ${preview.manifest.omissions.unselected} unselected; ${preview.manifest.omissions.candidateLimit} beyond the candidate budget. No settings, caches, journals or models are included.`, "thread-muted");
      for (const [index, entry] of preview.manifest.entries.entries()) this.exact(output, `${entry.path} - ${entry.kind}, ${entry.bytes} bytes`, `${JSON.stringify(entry, null, 2)}\n\n${preview.texts[index] ?? "Binary PDF copy of the granted original; the manifest records its full byte hash."}`);
      this.message("Exact checkpoint preview ready. Saving refuses existing destinations.");
    }); }).className = "thread-primary";
    add(form, "div", "", "thread-ai-card").id = "portability-preview";
    this.button(form, "Save previewed checkpoint", () => { const preview = this.exportPreview; if (!preview) return; void this.run(async (access, current) => { const path = value(await this.bridge.writeExport(preview.id, access.revision)); this.completed(access, current, `Saved checkpoint ${path}. Source notes and read access are unchanged.`); this.exportPreview = null; }); }, "export");
  }
  private packages(area: HTMLElement, mode: string, status: ImportStatus | null): void {
    const form = add(area, "section", "", "thread-record-form");
    if (status) {
      add(area, "p", `${status.completed} completed imports recorded in desktop history.`, "thread-muted");
      if (status.pending) { add(form, "p", `Interrupted import into ${status.pending.root} (${status.pending.created} of ${status.pending.total} copies verified; started ${status.pending.startedAt}). Choose the same package to inspect and continue, or close recovery. Partial copies are never deleted.`, "thread-empty");
        this.button(form, "Close interrupted import (keep partial copies)", () => { void this.run(async (access, current) => { value(await this.bridge.leaveImport(access.revision)); if (current()) void this.refresh(); }); }); }
    }
    add(form, "h3", mode === "import" ? "Import a package as new copies" : "Compare a checkpoint with the current project");
    add(form, "p", "Choose a .thread-project.json file in the system dialog. It is validated as inert data before anything is shown; reading it grants no access.", "thread-muted");
    const picked = add(form, "p", "No package selected.", "thread-path");
    this.button(form, "Choose package file", () => { this.changed(); this.package = null; void this.run(async (access, current) => { const summary = value(await this.bridge.pickPackage(access.revision)); if (!current()) return; this.package = summary; picked.textContent = summary ? `${summary.name} - project ${summary.project.path} (${summary.project.id}), ${summary.entries} files, created ${summary.createdAt}` : "Package selection canceled."; this.message(summary ? "Package validated. Nothing has been written." : "No package selected."); }); });
    if (mode === "compare") this.button(form, "Compare with current project", () => { const summary = this.package; if (!summary) return; void this.run(async (access, current) => { const result = value(await this.bridge.compareCheckpoint(summary.token, access.selection, access.revision)); if (!current()) return; this.comparison(result); }); }, "package").className = "thread-primary";
    else {
      const root = this.input(form, "New top-level import folder (outside read access)", `Thread Import ${Math.random().toString(16).slice(2, 10)}`, 200);
      this.button(form, "Preview import", () => { const summary = this.package; if (!summary) return; void this.run(async (access, current) => {
        const preview = value(await this.bridge.previewImport(summary.token, root.value, access.revision)); if (!current()) return; this.importPreview = preview; const output = el("portability-preview"); output.replaceChildren();
        add(output, "h3", preview.recovery ? `Recovery preview for ${preview.root}` : `New copies under ${preview.root}`); add(output, "p", `${preview.entries.length} files. ${preview.adopted.length} uncertain copies verified for adoption. Existing files are never overwritten and IDs are never rewritten. The imported folder stays outside read access until you grant it explicitly; links and PDF original paths may need manual review.`, "thread-muted");
        for (const warning of preview.warnings) add(output, "p", warning);
        const list = add(output, "ul"); for (const entry of preview.entries) add(list, "li", `${entry.path} - ${entry.kind}, ${entry.bytes} bytes`, "thread-path");
        this.message("Import preview ready. Import writes only new files.");
      }); }, "package");
      this.button(form, "Import as new copies", () => { const preview = this.importPreview; if (!preview) return; void this.run(async (access, current) => { const result = value(await this.bridge.applyImport(preview.id, access.revision)); this.completed(access, current, `Imported ${preview.entries.length} new copies into ${preview.root}. ${result.completed} completed imports recorded. Grant read access to that folder explicitly to use it.`); this.importPreview = null; }); }, "import").className = "thread-primary";
    }
    add(form, "div", "", "thread-ai-card").id = "portability-preview";
  }
  private comparison(result: ComparisonSnapshot): void {
    const output = el("portability-preview"); output.replaceChildren(); add(output, "h3", `Checkpoint comparison - ${result.project}`);
    const counts = ["unchanged", "changed", "missing", "current-only"].map(state => `${result.rows.filter(row => row.state === state).length} ${state}`).join("; ");
    add(output, "p", `${counts}. ${result.unavailable} unavailable under current access; ${result.currentLimit} current files beyond the candidate budget. Package contents are history, not evidence or a read grant; nothing was restored.`, "thread-muted");
    for (const row of result.rows) {
      const card = add(output, "article", "", "thread-record-card"); card.dataset.state = row.state; add(card, "h4", `${row.path} - ${row.state}`);
      if (row.after && row.state !== "missing") { const open = add(card, "button", `Open current ${row.path}`, "thread-source-chip"); open.addEventListener("click", () => this.source(row.path, "", row.after!.hash)); if (row.kind === "pdf") open.disabled = true; }
      if (row.before) this.exact(card, "Checkpoint version", row.before.text ?? `Binary PDF snapshot, ${row.before.bytes} bytes.`);
      if (row.after) this.exact(card, "Current version", row.after.text ?? `Binary PDF original, ${row.after.bytes} bytes.`);
    }
    this.message("Comparison ready. Read-only; no notes changed.");
  }
}
