import { Setting, parseYaml } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { actionLabels, actionStates, actionMarkdown, newAction, readAction, transitionAction, type ActionState } from "../vault/action-record.ts";
import { readMetadata, type EvidenceBundle } from "../vault/evidence.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { contentHash } from "../vault/scope.ts";
import type { IndexEntry } from "../vault/index.ts";
import { questionRecord } from "../vault/questions.ts";

export class ActionModal extends ThreadModal {
  initialPath = "";
  private inputs = 0;
  private previews = new Set<NewNoteModal>();
  private clearChoices: () => void = () => {};
  override invalidate(message?: string): void {
    super.invalidate(message); this.clearChoices();
    for (const preview of this.previews) preview.invalidate(message);
  }
  override onClose(): void { this.inputs++; this.invalidate("Action form closed. Prepare a new preview."); super.onClose(); }
  onOpen(): void {
    const el = this.contentEl;
    el.createEl("h2", { text: "Project actions" });
    el.createEl("p", { text: "Create a Planned action or explicitly change an existing state. Every change needs your reason and exact review. Dates and Done are user reports, not independently verified events. No AI changes status." });
    let mode = "new", name = "", title = "", reason = "", day = localDay(), target: ActionState = "in-progress";
    let entries: IndexEntry[] = [], records: IndexEntry[] = [], roots: IndexEntry[] = [], ready = false;
    const chosen = new Map<string, IndexEntry>();
    const watch = () => this.watchPaths([...new Set([...entries, ...records, ...roots].map(e => e.path))]);
    const reset = () => {
      this.inputs++; super.invalidate("Inputs changed. Prepare a new exact preview.");
      for (const preview of this.previews) preview.invalidate("Action inputs changed. Prepare a new preview.");
      watch(); if (ready) prepare.disabled = false;
    };
    let operation: HTMLSelectElement;
    new Setting(el).setName("Action operation").addDropdown(d => {
      operation = d.selectEl;
      d.selectEl.setAttribute("aria-label", "Action operation");
      d.addOption("new", "Create Planned action").addOption("transition", "Record a state transition").onChange(v => { mode = v; reset(); });
    });
    for (const [label, assign, max] of [
      ["Action note name", (v: string) => name = v, 100], ["Action title", (v: string) => title = v, 200]
    ] as const) new Setting(el).setName(label).addText(t => {
      t.inputEl.setAttribute("aria-label", label); t.inputEl.maxLength = max; t.onChange(v => { assign(v); reset(); });
    });
    el.createEl("p", { text: "Name and title apply to new notes only. Transitions preserve the existing title, properties and history. Legacy chosen-next-action notes stay unchanged." });
    const select = el.createEl("select", { attr: { "aria-label": "Action to update" } }); select.onchange = reset;
    el.createEl("button", { text: "Open selected action" }).onclick = () => {
      const entry = records.find(e => e.path === select.value), epoch = this.epoch;
      if (entry) void this.plugin.openIndexedSource(entry.path, entry.hash, "", () => !this.closed && epoch === this.epoch)
        .catch(error => { if (!this.closed && epoch === this.epoch) this.status?.setText(error instanceof Error ? error.message : "Action unavailable. Refresh."); });
    };
    new Setting(el).setName("New recorded state").addDropdown(d => {
      d.selectEl.setAttribute("aria-label", "Action state");
      for (const s of actionStates) d.addOption(s, actionLabels[s]);
      d.setValue(target).onChange(v => { if (actionStates.includes(v as ActionState)) target = v as ActionState; reset(); });
    });
    new Setting(el).setName("Your reason for creating or changing the action").addTextArea(t => {
      t.inputEl.setAttribute("aria-label", "Action reason"); t.inputEl.maxLength = 2000; t.onChange(v => { reason = v; reset(); });
    });
    new Setting(el).setName("Reported action date").addText(t => {
      t.inputEl.type = "date"; t.inputEl.setAttribute("aria-label", "Reported action date"); t.setValue(day).onChange(v => { day = v; reset(); });
    });
    el.createEl("p", { text: "Optional current evidence, managed questions or decisions (up to four notes). References do not accept a decision or resolve a question. All earlier references remain; stale support blocks transitions and evidence reuse until inspected." });
    const sources = el.createEl("select", { attr: { "aria-label": "Action supporting note" } }), selected = el.createDiv();
    const show = () => {
      selected.empty();
      for (const entry of chosen.values()) selected.createEl("button", { text: `Remove action support ${entry.path}` }).onclick = () => { chosen.delete(entry.path); reset(); show(); };
    };
    el.createEl("button", { text: "Add action support" }).onclick = () => {
      const entry = entries.find(e => e.path === sources.value);
      if (entry && chosen.size < 4) { chosen.set(entry.path, entry); reset(); show(); }
      else if (chosen.size >= 4) this.status?.setText("At most four supporting notes. Remove one before adding another.");
    };
    const prepare = el.createEl("button", { text: "Preview action", cls: "mod-cta" }); prepare.disabled = true;
    el.createEl("button", { text: "Refresh actions" }).onclick = () => { void load(); };
    el.createEl("button", { text: "Cancel action" }).onclick = () => { this.inputs++; this.invalidate("Action canceled. Refresh before continuing."); };
    this.status = el.createEl("p", { attr: { role: "status", "aria-live": "polite" } }); this.resultEl = el.createDiv();
    this.clearChoices = () => {
      ready = false; entries = []; records = []; roots = []; chosen.clear(); show(); prepare.disabled = true;
      select.replaceChildren(new Option("Refresh actions", "")); sources.replaceChildren(new Option("Refresh supporting notes", ""));
    };
    const load = async () => {
      this.inputs++; this.invalidate("Loading permitted action records...");
      const epoch = this.epoch, settings = structuredClone(this.plugin.settings);
      try {
        await this.plugin.rebuildIndex();
        if (this.closed || epoch !== this.epoch || JSON.stringify(settings) !== JSON.stringify(this.plugin.settings)) return;
        if (!settings.selectedProject) throw Error("Select a permitted project in Settings first.");
        this.plugin.projectIdentity(settings.selectedProject);
        const permitted = this.plugin.index.projectEntries(settings, null), graph = this.plugin.index.graph(settings);
        roots = permitted.filter(e => e.metadata.type === "project" && e.path.slice(0, e.path.lastIndexOf("/")) === settings.selectedProject);
        entries = permitted.filter(e => e.metadata.type !== "action" && e.chunks.length > 0);
        const all = this.plugin.index.projectRecords(settings, settings.selectedProject).filter(e => e.metadata.type === "action");
        records = all.filter(e => graph.assess(e.path).usable && e.id && this.plugin.index.idUnambiguous(e.id)).slice(0, 100);
        select.replaceChildren(new Option("Choose an action", ""));
        for (const entry of records) select.add(new Option(`${entry.path} - ${String(entry.metadata.status)}`, entry.path));
        if (this.initialPath && records.some(e => e.path === this.initialPath)) {
          mode = "transition"; operation.value = mode; select.value = this.initialPath;
        }
        this.initialPath = "";
        sources.replaceChildren(new Option("Choose current supporting note", ""));
        for (const entry of entries.slice(0, 500)) sources.add(new Option(`${entry.path} - ${String(entry.metadata.type ?? "note")}`, entry.path));
        ready = true; watch(); prepare.disabled = false;
        this.resultEl!.createEl("p", { text: `${records.length} usable actions shown (maximum 100); ${all.length - records.length} unavailable or omitted. Supporting choices show at most 500 indexed notes. Missing, stale, ambiguous, edited or excluded records are not silently substituted. Refresh after resolving them manually.` });
        this.status?.setText("Ready. Choose an explicit action, then review the exact preview. No notes have changed.");
      } catch (error) { if (!this.closed && epoch === this.epoch) this.status?.setText(error instanceof Error ? error.message : "Could not load actions. Refresh and inspect diagnostics."); }
    };
    prepare.onclick = async () => {
      if (prepare.disabled || this.controller) return;
      prepare.disabled = true;
      const controller = new AbortController(); this.controller = controller;
      const epoch = this.epoch, inputs = this.inputs, settings = structuredClone(this.plugin.settings);
      const approved = { mode, name, title, reason, day, target, path: select.value }, support = [...chosen.values()];
      const unchanged = () => this.plugin.active && !this.closed && inputs === this.inputs && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
      const current = () => unchanged() && epoch === this.epoch && !controller.signal.aborted;
      try {
        if (!settings.selectedProject || !this.plugin.index.ready) throw Error("Select a project and refresh actions first.");
        const identity = this.plugin.projectIdentity(settings.selectedProject);
        let bundle: EvidenceBundle = support.length ? await this.plugin.evidenceFromPaths(support.map(e => e.path), settings, controller.signal) : { sources: [], noteHashes: {}, truncated: false };
        for (const entry of support) {
          if (bundle.noteHashes[entry.path] !== entry.hash) throw Error("Supporting note changed. Refresh actions.");
          if (entry.id && !this.plugin.index.idUnambiguous(entry.id)) throw Error("Supporting note identity is ambiguous. Resolve duplicate IDs or restore full index coverage.");
          if (entry.metadata.type === "question") questionRecord(entry.metadata);
        }
        bundle = this.plugin.withDependencies({ ...bundle, noteHashes: { ...bundle.noteHashes, ...Object.fromEntries(roots.map(e => [e.path, e.hash])) } }, settings);
        if (!await this.plugin.evidenceCurrent(bundle, settings) || !current() || identity !== this.plugin.projectIdentity(settings.selectedProject)) throw Error("Project or support changed. Refresh actions.");
        if (approved.mode === "new") {
          const note = { path: `${settings.selectedProject}/Actions/${noteName(approved.name)}.md`,
            content: actionMarkdown(newAction(identity, approved.title, approved.reason, approved.day, bundle)) };
          const captured = bundle;
          const preview = new NewNoteModal(this.plugin, note, async () => {
            if (!unchanged()) return false;
            const valid = await this.plugin.evidenceCurrent(captured, settings);
            return valid && unchanged() && this.plugin.projectIdentity(settings.selectedProject) === identity;
          });
          for (const old of this.previews) if (old.closed) this.previews.delete(old);
          this.previews.add(preview); this.plugin.modals.add(preview); preview.open();
        } else {
          const entry = records.find(e => e.path === approved.path);
          if (!entry || !this.plugin.changePathAllowed(entry.path)) throw Error("Choose a current writable action. Protected or unsupported notes need manual editing.");
          const before = await this.plugin.readReviewedTarget(entry.path);
          if (before === null || await contentHash(before) !== entry.hash || !current()) throw Error("Action changed. Refresh it first.");
          const metadata = readMetadata(before, parseYaml), record = readAction(before, metadata);
          if (record.project !== identity || !this.plugin.index.idUnambiguous(record.id)) throw Error("Action identity is ambiguous or belongs to another project.");
          bundle = this.plugin.withDependencies({ ...bundle, noteHashes: { ...bundle.noteHashes, [entry.path]: entry.hash } }, settings);
          if (!await this.plugin.evidenceCurrent(bundle, settings) || !current()) throw Error("Action history or supporting notes changed. Refresh before updating.");
          const after = transitionAction(before, metadata, approved.target, approved.reason, approved.day, bundle);
          await this.plugin.changes.propose([{ path: entry.path, before, after }], this.plugin.changeContext(bundle, settings), current);
          if (current()) { this.status?.setText("Proposal prepared. Review changes before applying this transition."); this.plugin.openChanges(); }
        }
      } catch (error) { if (!this.closed && inputs === this.inputs) this.status?.setText(error instanceof Error ? error.message : "Could not preview action. Refresh and try again."); }
      finally { if (this.controller === controller) { this.controller = null; if (current()) prepare.disabled = false; } }
    };
    void load();
  }
}
