import { parseYaml } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { readClip, clippedSource, possibleClipDuplicates, type ReviewedClip } from "../vault/clipper.ts";
import { readableText } from "../vault/scope.ts";
import { noteName, localDay, writablePath } from "../vault/workspace.ts";
import { permittedProjects } from "../vault/project-home.ts";
import { overviewIdentity } from "../vault/project-overview.ts";
import type { EvidenceBundle } from "../vault/evidence.ts";
import type { ThreadSettings } from "../settings/settings.ts";

interface ClipReview { clip: ReviewedClip; path: string; project: string; identity: string; bundle: EvidenceBundle; matches: number; settings: ThreadSettings; }
export class ClipperModal extends ThreadModal {
  private inputs = 0;
  private review: ClipReview | null = null;
  private previews = new Set<NewNoteModal>();
  private clearPickers: () => void = () => {};
  private previewButton: HTMLButtonElement | null = null;
  private acknowledge: HTMLInputElement | null = null;
  override invalidate(message = "Notes or settings changed. Refresh clips and review again."): void {
    super.invalidate(message); this.review = null; this.clearPickers();
    if (this.acknowledge) this.acknowledge.checked = false;
    if (this.previewButton) this.previewButton.disabled = true;
    for (const preview of this.previews) preview.invalidate(message);
  }
  override onClose(): void { this.inputs++; this.invalidate("Clip intake closed. Prepare a new preview."); super.onClose(); }
  onOpen(): void {
    const el = this.contentEl; el.createEl("h2", { text: "Review a saved web clip" });
    el.createEl("p", { text: "Choose a clip you deliberately saved in this vault. Thread reads only permitted local text and never fetches its website, images or attachments. Save creates a new source copy; the original stays unchanged." });
    const fields = el.createDiv({ cls: "thread-clip-fields" });
    const clipLabel = fields.createEl("label"); clipLabel.createSpan({ text: "Saved clip" });
    const clipPicker = clipLabel.createEl("select", { attr: { "aria-label": "Saved clip" } });
    const projectLabel = fields.createEl("label"); projectLabel.createSpan({ text: "Project association" });
    const projectPicker = projectLabel.createEl("select", { attr: { "aria-label": "Clip project association" } });
    const nameLabel = fields.createEl("label"); nameLabel.createSpan({ text: "New source note name" });
    const name = nameLabel.createEl("input", { attr: { type: "text", "aria-label": "New clipped source name" } }); name.value = `Clip ${localDay()} ${crypto.randomUUID().slice(0, 8)}`;
    let path = "", project = "";
    const reset = () => { this.review = null; this.resultEl?.empty(); if (this.acknowledge) this.acknowledge.checked = false; if (this.previewButton) this.previewButton.disabled = true; };
    const changed = () => { this.inputs++; super.invalidate("Inputs changed. Review the selected clip again."); reset(); for (const preview of this.previews) preview.invalidate("Intake inputs changed. Preview again."); };
    this.clearPickers = () => { path = ""; project = ""; clipPicker.replaceChildren(new Option("Refresh permitted clips", "")); projectPicker.replaceChildren(new Option("Choose a project explicitly", "")); };
    clipPicker.onchange = () => { path = clipPicker.value; changed(); }; projectPicker.onchange = () => { project = projectPicker.value; changed(); }; name.oninput = changed;
    const actions = el.createDiv({ cls: "thread-actions" });
    actions.createEl("button", { text: "Refresh clips" }).onclick = () => this.refresh(clipPicker, projectPicker);
    actions.createEl("button", { text: "Review selected clip" }).onclick = async () => {
      this.inputs++; reset(); const inputs = this.inputs, epoch = this.epoch, selected = path, association = project, settings = structuredClone(this.plugin.settings);
      for (const preview of this.previews) preview.invalidate("New clip review started. Preview again.");
      const controller = new AbortController(); this.controller?.abort(); this.controller = controller;
      const current = () => this.plugin.active && !this.closed && inputs === this.inputs && epoch === this.epoch && !controller.signal.aborted && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
      try {
        this.status?.setText("Checking the local clip, association and possible duplicates...");
        if (!this.plugin.index.ready || !readableText(selected, settings) || !permittedProjects(this.plugin.index, settings).includes(association)) throw Error("Choose a permitted clip and project. Refresh after changing read settings.");
        const entry = this.plugin.index.entries.find(e => e.path === selected), graph = this.plugin.index.graph(settings), identity = overviewIdentity(this.plugin.index, settings, association);
        if (!entry || entry.output || entry.pdf || entry.decisionSources || !graph.assess(selected).usable || !identity.id) throw Error("Clip or project identity is unavailable. Choose an original clip with complete current index coverage.");
        const clip = await readClip(await this.plugin.projectExportPort(current).readText(selected), parseYaml);
        if (!current()) return;
        if (clip.hash !== entry.hash) throw Error("Clip changed since indexing. Refresh and review again.");
        const candidates = this.plugin.index.entries.filter(e => readableText(e.path, settings) && e.metadata.type === "source" && typeof e.metadata.thread_import_hash === "string" && graph.assess(e.path).usable).sort((a, b) => a.path.localeCompare(b.path));
        const matches = possibleClipDuplicates(candidates.slice(0, 100), clip);
        const bundle = this.plugin.withDependencies({ sources: [], truncated: false, noteHashes: { [selected]: clip.hash, ...identity.hashes, ...Object.fromEntries(matches.map(m => [m.entry.path, m.entry.hash])) } }, settings);
        if (!await this.plugin.evidenceCurrent(bundle, settings) || !current()) throw Error("Clip, project or duplicate evidence changed. Refresh and review again.");
        if (this.plugin.projectIdentity(association) !== identity.id) throw Error("Project identity changed. Refresh first.");
        this.review = { clip, path: selected, project: association, identity: identity.id, bundle, matches: matches.length, settings };
        const root = this.resultEl!; root.createEl("h3", { text: "Recorded clip metadata" });
        for (const [label, value] of [["Title", clip.metadata.title], ["Author", clip.metadata.author], ["URL (not fetched)", clip.metadata.url], ["Publication date (source claim)", clip.metadata.published], ["Capture date (clip record)", clip.metadata.captured]]) root.createEl("p", { text: `${label}: ${value ?? "Unknown"}` });
        root.createEl("p", { text: `Chosen project: ${association}. Publication/capture dates are not verified events; intake time will be recorded separately.` });
        root.createEl("h3", { text: "Possible duplicates" });
        for (const match of matches) root.createEl("p", { text: `${match.reason}: ${match.entry.path}` });
        root.createEl("p", { text: `${matches.length} matches among ${Math.min(100, candidates.length)} permitted indexed imported sources; ${Math.max(0, candidates.length - 100)} omitted by the candidate limit. Index omissions and unpermitted notes are not checked. Same URL is a hint, not duplicate identity.`, cls: "thread-muted" });
        const original = root.createEl("details"); original.createEl("summary", { text: "Exact original clipped text" }); original.createEl("pre", { text: clip.raw, cls: "thread-preview" });
        this.previewButton!.disabled = false; this.status?.setText("Review metadata and possible duplicates, then prepare an exact new-note preview. Nothing has been saved.");
      } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : "Could not review clip. Refresh and inspect local read settings."); }
      finally { if (this.controller === controller) this.controller = null; }
    };
    actions.createEl("button", { text: "Cancel clip intake" }).onclick = () => { this.inputs++; this.invalidate("Clip intake canceled. Refresh to start again."); };
    this.status = el.createEl("p", { attr: { role: "status", "aria-live": "polite" } }); this.resultEl = el.createDiv();
    const label = el.createEl("label", { cls: "thread-conversation-choice" }); this.acknowledge = label.createEl("input", { type: "checkbox", attr: { "aria-label": "I reviewed possible duplicates" } }); label.createSpan({ text: "I reviewed possible duplicates and want a separate copy." });
    this.acknowledge.onchange = () => { this.inputs++; for (const preview of this.previews) preview.invalidate("Duplicate acknowledgement changed. Preview again."); };
    this.previewButton = el.createEl("button", { text: "Preview clipped source", cls: "mod-cta" }); this.previewButton.disabled = true;
    this.previewButton.onclick = async () => {
      const reviewed = this.review, inputs = this.inputs, epoch = this.epoch;
      if (!reviewed || this.previewButton!.disabled) return;
      const unchanged = () => this.plugin.active && !this.closed && inputs === this.inputs && JSON.stringify(reviewed.settings) === JSON.stringify(this.plugin.settings);
      const valid = async () => unchanged() && await this.plugin.evidenceCurrent(reviewed.bundle, reviewed.settings) && unchanged() && this.plugin.projectIdentity(reviewed.project) === reviewed.identity;
      try {
        if (reviewed.matches && !this.acknowledge!.checked) throw Error("Review the possible duplicates and acknowledge a separate copy before previewing.");
        const target = `${reviewed.project}/Sources/${noteName(name.value)}.md`;
        writablePath(target, [...Object.values(reviewed.settings.roles), reviewed.settings.selectedProject], reviewed.settings.excludedPaths);
        const content = clippedSource(reviewed.clip, reviewed.path, reviewed.identity);
        if (!await valid() || !unchanged() || epoch !== this.epoch) throw Error("Clip or project changed. Review again.");
        const preview = new NewNoteModal(this.plugin, { path: target, content }, valid);
        for (const old of this.previews) if (old.closed) this.previews.delete(old);
        this.previews.add(preview); this.plugin.modals.add(preview); preview.open();
        this.status?.setText("Exact preview ready. Saving creates only the named new copy, without changing the original clip.");
      } catch (error) { if (unchanged() && epoch === this.epoch) this.status?.setText(error instanceof Error ? error.message : "Could not prepare clipped source."); }
    };
    this.clearPickers(); if (this.plugin.index.ready) void this.refresh(clipPicker, projectPicker);
    else this.status.setText("Refresh clips to load currently permitted indexed notes.");
  }
  private async refresh(clipPicker: HTMLSelectElement, projectPicker: HTMLSelectElement): Promise<void> {
    this.inputs++; this.invalidate("Loading permitted indexed clip paths..."); const epoch = this.epoch;
    try {
      if (!this.plugin.index.ready) await this.plugin.rebuildIndex(); if (this.closed || epoch !== this.epoch) return;
      const entries = this.plugin.index.entries.filter(e => readableText(e.path, this.plugin.settings)).sort((a, b) => a.path.localeCompare(b.path));
      clipPicker.replaceChildren(new Option("Choose a saved clip", "")); for (const entry of entries.slice(0, 200)) clipPicker.add(new Option(entry.path, entry.path));
      projectPicker.replaceChildren(new Option("Choose a project explicitly", "")); for (const path of permittedProjects(this.plugin.index, this.plugin.settings)) projectPicker.add(new Option(path, path));
      this.status?.setText(`${Math.min(200, entries.length)} permitted indexed paths; ${Math.max(0, entries.length - 200)} omitted by the picker limit. Choose an original clip and project. No source has been imported.`);
    } catch { if (!this.closed && epoch === this.epoch) this.status?.setText("Could not refresh clips. Check read settings and rebuild the index."); }
  }
}
