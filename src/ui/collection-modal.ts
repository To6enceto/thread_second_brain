import { Setting, parseYaml } from "obsidian";
import type ThreadPlugin from "../main.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { captureCollection, collectionMarkdown, readCollection, resolveCollection, collectionCandidates, type CollectionRecord, type CollectionRow } from "../vault/collection-record.ts";
import { readMetadata, contextCoverageText, type EvidenceBundle } from "../vault/evidence.ts";
import { selectContext, type EvidenceChoice } from "../vault/workbench.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { contentHash, readableText } from "../vault/scope.ts";

export interface CollectionContext { settings: ThreadSettings; vault: boolean; identity: string; }
function sameSettings(plugin: ThreadPlugin, context: CollectionContext): boolean {
  return plugin.active && JSON.stringify(plugin.settings) === JSON.stringify(context.settings);
}
function sameContext(plugin: ThreadPlugin, context: CollectionContext): boolean {
  try { return sameSettings(plugin, context) && (context.vault || plugin.projectIdentity(context.settings.selectedProject) === context.identity); }
  catch { return false; }
}

export class CollectionSaveModal extends ThreadModal {
  private snapshot: EvidenceBundle;
  private choices: Record<string, EvidenceChoice>;
  private context: CollectionContext;
  private parentCurrent: () => boolean;
  private inputs = 0;
  private revoked = false;
  private previews = new Set<NewNoteModal>();
  private prepare: HTMLButtonElement | null = null;
  constructor(plugin: ThreadPlugin, bundle: EvidenceBundle, choices: Record<string, EvidenceChoice>, context: CollectionContext, parentCurrent: () => boolean) {
    super(plugin); this.snapshot = structuredClone(bundle); this.choices = { ...choices }; this.context = structuredClone(context); this.parentCurrent = parentCurrent;
  }
  override invalidate(message = "Collection sources or parent changed. Retrieve evidence and save again."): void {
    super.invalidate(message); this.revoked = true; if (this.prepare) this.prepare.disabled = true;
    for (const preview of this.previews) if (!preview.closed) preview.invalidate(message);
    this.previews.clear();
  }
  override onClose(): void { this.inputs++; this.invalidate("Collection save closed. Open a new preview."); super.onClose(); }
  onOpen(): void {
    const el = this.contentEl; el.createEl("h2", { text: "Save research collection" });
    el.createEl("p", { text: "Save references and Include / Pin / Exclude choices, without copied excerpts. Edits create a new named copy; existing collections are preserved." });
    let name = `Collection ${localDay()} ${crypto.randomUUID().slice(0, 8)}`;
    new Setting(el).setName("New collection note name").addText(t => { t.inputEl.setAttribute("aria-label", "New collection note name"); t.setValue(name).onChange(value => {
      if (this.closed || this.revoked) return; name = value; this.inputs++;
      for (const preview of this.previews) if (!preview.closed) preview.invalidate("Collection name changed. Preview again."); this.previews.clear();
      this.status?.setText("Name changed. Review a new exact preview.");
    }); });
    this.resultEl = el.createDiv(); this.resultEl.createEl("p", { text: `${this.snapshot.sources.length} references. Read grants and context budgets will be checked again on every use.` });
    this.status = el.createEl("p", { attr: { role: "status", "aria-live": "polite" } });
    const prepare = this.prepare = el.createEl("button", { text: "Preview collection note", cls: "mod-cta" });
    el.createEl("button", { text: "Cancel collection save" }).onclick = () => this.close();
    this.watchBundle(this.snapshot);
    prepare.onclick = async () => {
      if (this.closed || this.revoked || prepare.disabled) return;
      const inputs = this.inputs, epoch = this.epoch, title = name, bundle = this.snapshot, context = this.context;
      const current = () => !this.closed && !this.revoked && inputs === this.inputs && epoch === this.epoch && this.parentCurrent() && sameContext(this.plugin, context);
      const valid = async () => !this.closed && inputs === this.inputs && this.parentCurrent() && sameSettings(this.plugin, context)
        && await this.plugin.evidenceCurrent(bundle, context.settings) && !this.closed && inputs === this.inputs && this.parentCurrent() && sameContext(this.plugin, context);
      prepare.disabled = true; this.status?.setText("Checking references and preparing the exact collection preview...");
      try {
        if (!await valid() || !current()) throw new Error("Collection evidence changed. Retrieve it again.");
        const record: CollectionRecord = { schemaVersion: 1, id: crypto.randomUUID(), title: noteName(title), createdAt: new Date().toISOString(), scope: context.vault ? "allowed" : "project",
          projectPath: context.vault ? "" : context.settings.selectedProject, projectIdentity: context.vault ? "" : context.identity,
          items: captureCollection(bundle, this.choices, this.plugin.index.entries) };
        const folder = context.vault ? context.settings.roles.knowledge : context.settings.selectedProject;
        if (!folder) throw new Error("Map a Knowledge folder before saving wider-scope collections.");
        const note = { path: `${folder}/Collections/${record.title}.md`, content: collectionMarkdown(record) };
        if (!current()) return;
        const preview = new NewNoteModal(this.plugin, note, valid);
        for (const old of this.previews) if (old.closed) this.previews.delete(old);
        this.previews.add(preview); this.plugin.modals.add(preview); preview.open(); this.status?.setText("Exact preview ready. No note is saved until you approve it.");
      } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : "Could not prepare collection."); }
      finally { if (current()) prepare.disabled = false; }
    };
  }
}

export class CollectionOpenModal extends ThreadModal {
  private context: CollectionContext;
  private parentCurrent: () => boolean;
  private use: (bundle: EvidenceBundle, choices: Record<string, EvidenceChoice>, collection: { path: string; hash: string }) => void;
  private picker: HTMLElement | null = null;
  private selected = "";
  private records = new Map<string, string>();
  private rows: CollectionRow[] = [];
  private confirmed = new Set<number>();
  private loaded: { path: string; hash: string } | null = null;
  private fullBundle: EvidenceBundle | null = null;
  private inputs = 0;
  private useButton: HTMLButtonElement | null = null;
  private contextEl: HTMLElement | null = null;
  constructor(plugin: ThreadPlugin, context: CollectionContext, current: () => boolean, use: CollectionOpenModal["use"]) {
    super(plugin); this.context = structuredClone(context); this.parentCurrent = current; this.use = use;
  }
  override invalidate(message = "Collections or sources changed. Refresh collections before continuing."): void {
    super.invalidate(message); this.inputs++; this.rows = []; this.confirmed.clear(); this.loaded = null; this.fullBundle = null;
    this.records.clear(); this.selected = ""; this.picker?.empty(); this.contextEl?.empty(); if (this.useButton) this.useButton.disabled = true;
  }
  override onClose(): void { this.inputs++; super.onClose(); }
  private current(epoch: number): boolean { return !this.closed && epoch === this.epoch && this.parentCurrent() && sameContext(this.plugin, this.context); }
  onOpen(): void {
    const el = this.contentEl; el.createEl("h2", { text: "Open research collection" });
    el.createEl("p", { text: "Review current permitted passages. Changed references require explicit reconfirmation. Missing or excluded sources stay unavailable. Opening a collection neither generates an answer nor grants access." });
    this.picker = el.createDiv();
    el.createEl("button", { text: "Refresh collections" }).onclick = () => this.refresh();
    el.createEl("button", { text: "Review selected collection" }).onclick = () => this.loadSelected();
    el.createEl("button", { text: "Cancel collection reuse" }).onclick = () => this.close();
    this.status = el.createEl("p", { attr: { role: "status", "aria-live": "polite" } }); this.resultEl = el.createDiv(); this.contextEl = el.createDiv();
    this.useButton = el.createEl("button", { text: "Use collection in Ask", cls: "mod-cta" }); this.useButton.disabled = true;
    this.useButton.onclick = async () => {
      if (this.useButton!.disabled || !this.loaded || !this.fullBundle) return;
      const epoch = this.epoch, inputs = this.inputs, loaded = { ...this.loaded }, full = this.fullBundle;
      this.useButton!.disabled = true;
      try {
        const fresh = await this.plugin.evidenceCurrent(full, this.context.settings);
        if (!this.current(epoch) || inputs !== this.inputs) return;
        if (!fresh) { this.invalidate("Sources changed. Refresh and review the collection again."); return; }
        const selected = collectionCandidates(this.rows, this.confirmed);
        if (!selectContext(selected.bundle, selected.choices).sources.length) throw new Error("Choose at least one current passage.");
        const bundle = this.plugin.withDependencies({ ...selected.bundle, noteHashes: { ...selected.bundle.noteHashes, [loaded.path]: loaded.hash } }, this.context.settings);
        this.use(bundle, selected.choices, loaded); this.close();
      } catch (error) { if (this.current(epoch)) this.status?.setText(error instanceof Error ? error.message : "Could not reuse collection."); }
      finally { if (this.current(epoch)) this.showContext(); }
    };
    void this.refresh();
  }
  async refresh(): Promise<void> {
    this.invalidate("Loading permitted collections..."); const epoch = this.epoch, settings = this.context.settings;
    try {
      await this.plugin.rebuildIndex(); if (!this.current(epoch)) return;
      const available = this.context.vault ? this.plugin.index.entries : this.plugin.index.projectRecords(settings, settings.selectedProject);
      const entries = available.filter(e => readableText(e.path, settings) && e.metadata.type === "collection").sort((a, b) => a.path.localeCompare(b.path));
      const selected = entries.slice(0, 100); this.records = new Map(selected.map(e => [e.path, e.hash]));
      new Setting(this.picker!).setName("Research collection").addDropdown(d => {
        d.selectEl.setAttribute("aria-label", "Research collection"); d.addOption("", "Choose a collection");
        for (const entry of selected) d.addOption(entry.path, entry.title);
        d.onChange(value => { if (!this.current(epoch)) return; this.selected = value; this.inputs++; this.rows = []; this.loaded = null; this.fullBundle = null; this.confirmed.clear(); this.resultEl?.empty(); this.contextEl?.empty(); this.useButton!.disabled = true; });
      });
      this.watchPaths(selected.map(e => e.path)); this.status?.setText(`${selected.length} permitted indexed collections; ${entries.length - selected.length} omitted by the list limit. Choose one to review. Index coverage may omit other records.`);
    } catch (error) { if (this.current(epoch)) this.status?.setText(error instanceof Error ? error.message : "Could not load collections."); }
  }
  async loadSelected(): Promise<void> {
    const path = this.selected, hash = this.records.get(path), epoch = this.epoch, inputs = ++this.inputs, settings = this.context.settings;
    this.rows = []; this.confirmed.clear(); this.loaded = null; this.fullBundle = null; this.resultEl?.empty(); this.contextEl?.empty(); this.useButton!.disabled = true;
    const current = () => this.current(epoch) && inputs === this.inputs;
    try {
      if (!hash || !current() || !readableText(path, settings)) throw new Error("Choose a permitted collection first.");
      this.status?.setText("Re-reading current references and checking source permissions...");
      const raw = await this.app.vault.adapter.read(path);
      if (!current() || !readableText(path, this.plugin.settings) || await contentHash(raw) !== hash || !current()) throw new Error("Collection changed. Refresh first.");
      const record = readCollection(raw, readMetadata(raw, parseYaml));
      if (record.scope !== (this.context.vault ? "allowed" : "project") || !this.context.vault && (record.projectPath !== settings.selectedProject || record.projectIdentity !== this.context.identity)) throw new Error("Collection belongs to another scope or project. Select its scope explicitly in Ask.");
      const rows = await resolveCollection(record, this.plugin.index.entries, this.plugin.index.graph(settings));
      if (!current()) return;
      const all = collectionCandidates(rows, new Set(rows.map(r => r.number))).bundle;
      const full = this.plugin.withDependencies({ ...all, noteHashes: { ...all.noteHashes, [path]: hash } }, settings);
      this.watchBundle(full);
      const fresh = await this.plugin.evidenceCurrent(full, settings);
      if (!current()) return;
      if (!fresh) throw new Error("Sources or PDF consent changed. Refresh before reuse.");
      this.rows = rows; this.loaded = { path, hash }; this.fullBundle = full; this.renderRows();
      this.status?.setText("Current excerpts checked. Reconfirm changed passages and inspect the chosen context before Use collection in Ask. No answer generated.");
    } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : "Could not open collection."); }
  }
  private showContext(): void {
    const root = this.contextEl; if (!root || !this.useButton) return;
    root.empty(); const selected = collectionCandidates(this.rows, this.confirmed), chosen = selectContext(selected.bundle, selected.choices);
    root.createEl("p", { text: `${this.rows.filter(r => r.state === "unavailable").length} unavailable; ${this.rows.filter(r => r.state === "changed" && !this.confirmed.has(r.number)).length} changed passages awaiting your confirmation.`, cls: "thread-meta" });
    root.createEl("p", { text: contextCoverageText(chosen), cls: "thread-meta" });
    this.useButton.disabled = !this.loaded || !chosen.sources.length;
  }
  private renderRows(): void {
    const root = this.resultEl!; root.empty();
    for (const row of this.rows) {
      const card = root.createDiv({ cls: "thread-evidence-card" });
      if (!row.source) { card.createEl("p", { text: `Reference ${row.number}: unavailable (${row.choice}). Missing, excluded, ambiguous or outside current indexed evidence. Retrieve again if needed.` }); continue; }
      card.createEl("p", { text: `Reference ${row.number}: ${row.state} - ${row.source.path}${row.source.heading ? ` > ${row.source.heading}` : ""}`, cls: "thread-meta" });
      card.createEl("pre", { text: row.source.excerpt, cls: "thread-excerpt" });
      new Setting(card).setName(`Reference ${row.number} intent`).addDropdown(d => {
        d.selectEl.setAttribute("aria-label", `Collection choice ${row.number}`); d.addOption("include", "Include").addOption("pin", "Pin first").addOption("exclude", "Exclude").setValue(row.choice).onChange(value => {
          if (!this.loaded || !this.rows.includes(row) || !["include", "pin", "exclude"].includes(value)) return;
          row.choice = value as EvidenceChoice; this.inputs++; this.showContext();
        });
      });
      if (row.state === "changed") {
        const label = card.createEl("label", { cls: "thread-conversation-choice" }), checkbox = label.createEl("input", { type: "checkbox", attr: { "aria-label": `Confirm changed reference ${row.number}` } });
        label.createEl("span", { text: "I reviewed this current passage and want to use it." });
        checkbox.onchange = () => { if (!this.loaded || !this.rows.includes(row)) return; if (checkbox.checked) this.confirmed.add(row.number); else this.confirmed.delete(row.number); this.inputs++; this.showContext(); };
      }
    }
    this.showContext();
  }
}
