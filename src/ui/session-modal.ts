import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { SESSION_SCHEMA, sessionPrompt, validateSession, sessionMarkdown } from "../vault/session.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { chosenActionContext, type ActionSnapshot } from "../vault/action-board.ts";
import { actionLabels } from "../vault/action-record.ts";
import { contextCoverageText } from "../vault/evidence.ts";

export class SessionModal extends ThreadModal {
  generateButton: HTMLButtonElement | null = null;
  previewButton: HTMLButtonElement | null = null;
  private inputs = 0;
  private previews = new Set<NewNoteModal>();
  private clearActions: () => void = () => {};
  override invalidate(message?: string): void {
    super.invalidate(message); this.clearActions();
    if (this.previewButton) this.previewButton.disabled = true;
    if (this.generateButton) this.generateButton.disabled = false;
    for (const preview of this.previews) preview.invalidate(message);
  }
  override onClose(): void { this.inputs++; this.invalidate("Wrap-up closed. Generate a new preview."); super.onClose(); }
  onOpen(): void {
    const el = this.contentEl;
    el.createEl("h2", { text: "Session wrap-up" });
    el.createEl("p", { text: `Project: ${this.plugin.settings.selectedProject || "Select a project in Settings"}. Report your progress, optionally select recorded actions, then review a local summary. Saving never changes action status or accepts decisions.` });
    let name = `${localDay()} Wrap-up`, report = "", snapshot: ActionSnapshot | null = null;
    const chosen = new Set<string>();
    const changed = () => {
      this.inputs++; super.invalidate("Inputs changed. Generate a new wrap-up.");
      if (this.previewButton) this.previewButton.disabled = true;
      if (this.generateButton) this.generateButton.disabled = false;
      for (const preview of this.previews) preview.invalidate("Wrap-up inputs changed. Preview again.");
    };
    new Setting(el).setName("Session note name").addText(t => { t.inputEl.setAttribute("aria-label", "Session note name"); t.setValue(name).onChange(v => { name = v; changed(); }); });
    new Setting(el).setName("Your reported progress (optional)").addTextArea(t => { t.inputEl.setAttribute("aria-label", "Reported progress"); t.inputEl.maxLength = 5000; t.onChange(v => { report = v; changed(); }); });
    el.createEl("h3", { text: "Choose recorded action progress (optional)" });
    el.createEl("p", { text: "Select at most five current records. None are selected automatically. Dates and Done are user reports, not proof that the work happened in this session. A suggested next step must be recorded separately through Project actions and its exact review.", cls: "thread-muted" });
    const actions = el.createDiv();
    const refresh = el.createEl("button", { text: "Refresh recorded actions" });
    this.clearActions = () => { snapshot = null; chosen.clear(); actions.empty(); actions.createEl("p", { text: "Refresh to choose current action records, or generate without selecting any." }); };
    refresh.onclick = async () => {
      this.inputs++; this.invalidate("Reading current recorded actions...");
      const controller = new AbortController(); this.controller = controller;
      const epoch = this.epoch, inputs = this.inputs, settings = structuredClone(this.plugin.settings);
      const current = () => !this.closed && epoch === this.epoch && inputs === this.inputs && !controller.signal.aborted && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
      this.generateButton!.disabled = true;
      try {
        const loaded = await this.plugin.actionSnapshot(settings, current, controller.signal);
        if (!current()) return;
        snapshot = loaded; this.watchBundle(loaded.bundle); actions.empty();
        actions.createEl("p", { text: `${loaded.cards.length} current actions; ${loaded.unavailable} unavailable; ${loaded.omitted} omitted. Index coverage may omit other records. No selected actions yet.`, cls: "thread-muted" });
        for (const card of loaded.cards) {
          const last = card.record.history.at(-1)!, label = actions.createEl("label", { cls: "thread-progress-choice" });
          const checkbox = label.createEl("input", { type: "checkbox", attr: { "aria-label": `Use recorded action ${card.record.title}` } });
          label.createSpan({ text: `${card.record.title} - ${actionLabels[card.record.status]} - reported ${last.day}` });
          checkbox.onchange = () => {
            if (this.closed || snapshot !== loaded) return;
            if (checkbox.checked && chosen.size >= 5) { checkbox.checked = false; this.status?.setText("Select at most five recorded actions. Remove one first."); return; }
            if (checkbox.checked) chosen.add(card.path); else chosen.delete(card.path);
            changed(); this.watchBundle(loaded.bundle);
            this.status?.setText(`${chosen.size} recorded actions selected for this wrap-up. Generate to review the result.`);
          };
        }
        this.status?.setText("Choose recorded actions explicitly, or generate without selecting any.");
      } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : "Could not load recorded actions. Refresh or continue without a selection."); }
      finally { if (this.controller === controller) { this.controller = null; if (!this.closed) this.generateButton!.disabled = false; } }
    };
    this.generateButton = el.createEl("button", { text: "Generate session wrap-up", cls: "mod-cta" });
    el.createEl("button", { text: "Cancel wrap-up" }).onclick = () => { this.inputs++; this.invalidate("Wrap-up canceled."); };
    this.status = el.createEl("p", { attr: { role: "status", "aria-live": "polite" } }); this.resultEl = el.createDiv();
    this.previewButton = el.createEl("button", { text: "Preview session note", cls: "mod-cta" }); this.previewButton.disabled = true;
    this.clearActions();
    this.generateButton.onclick = async () => {
      if (this.controller || this.closed) return;
      changed();
      const controller = new AbortController(); this.controller = controller;
      const epoch = this.epoch, inputs = this.inputs, settings = structuredClone(this.plugin.settings);
      const approved = { name, report, paths: [...chosen], snapshot }; this.generateButton!.disabled = true;
      const unchanged = () => this.plugin.active && !this.closed && inputs === this.inputs && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
      const current = () => unchanged() && epoch === this.epoch && !controller.signal.aborted;
      try {
        if (!settings.selectedProject) throw new Error("Select an allowed project first.");
        const target = `${settings.selectedProject}/Sessions/${noteName(approved.name)}.md`;
        if (!this.plugin.index.ready) await this.plugin.rebuildIndex(); if (!current()) return;
        const project = this.plugin.projectIdentity(settings.selectedProject); this.status?.setText("Reading recorded project context...");
        const general = await this.plugin.evidence(settings, controller.signal);
        const selection = chosenActionContext(approved.snapshot ?? { cards: [], bundle: { sources: [], noteHashes: {}, truncated: false }, identity: project, candidates: 0, unavailable: 0, omitted: 0 }, approved.paths, general);
        const bundle = this.plugin.withDependencies(selection.bundle, settings);
        if (!bundle.sources.length) throw new Error("Add eligible project notes or select current actions before generating a sourced wrap-up.");
        if (!current() || !await this.plugin.evidenceCurrent(bundle, settings) || !current()) throw new Error("Project evidence changed. Generate again.");
        this.watchBundle(bundle); this.status?.setText("Generating a local session summary...");
        const raw = await new OllamaClient(settings.endpoint, settings.timeoutMs).generate(settings.model, sessionPrompt(bundle), controller.signal, SESSION_SCHEMA);
        const result = validateSession(raw, bundle);
        if (!current() || !await this.plugin.evidenceCurrent(bundle, settings) || !current() || this.plugin.projectIdentity(settings.selectedProject) !== project) throw new Error("Project evidence changed. Generate again.");
        const content = sessionMarkdown(approved.report, result, bundle, settings.model, project, selection.cards);
        this.resultEl!.createEl("p", { text: `${selection.cards.length} explicitly selected action reports. ${contextCoverageText(bundle)}`, cls: "thread-muted" });
        this.resultEl!.createEl("pre", { text: content, cls: "thread-preview" });
        for (const s of bundle.sources) this.resultEl!.createEl("button", { text: `${s.id}: ${s.path} › ${s.heading}`, cls: "thread-source" }).onclick = () => {
          void this.plugin.openIndexedSource(s.path, bundle.noteHashes[s.path]!, s.heading, current).catch(error => { if (current()) this.status?.setText(String(error)); });
        };
        this.previewButton!.disabled = false;
        this.previewButton!.onclick = () => {
          if (!current()) return;
          const preview = new NewNoteModal(this.plugin, { path: target, content }, async () => {
            if (!unchanged()) return false;
            const valid = await this.plugin.evidenceCurrent(bundle, settings);
            return valid && unchanged() && this.plugin.projectIdentity(settings.selectedProject) === project;
          });
          for (const old of this.previews) if (old.closed) this.previews.delete(old);
          this.previews.add(preview); this.plugin.modals.add(preview); preview.open();
        };
        this.status?.setText("Review the user report, selected recorded actions, context and suggestions. No action status changes. Nothing is saved until you approve the exact note preview.");
      } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : "Wrap-up failed. Refresh and inspect local diagnostics."); }
      finally { if (this.controller === controller) this.controller = null; if (!this.closed && epoch === this.epoch) this.generateButton!.disabled = false; }
    };
  }
}
