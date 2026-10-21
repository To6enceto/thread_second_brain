import type { DesktopBridge, DesktopResult, NoteSnapshot } from "./contracts.ts";
import type { ChangeAction, ChangePreview, ChangeSummary, ChangesSnapshot } from "./changes.ts";
import { editableBody, lineDiff } from "../vault/change-draft.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
function text(parent: HTMLElement, tag: string, content: string, className = ""): HTMLElement { const item = document.createElement(tag); item.textContent = content; item.className = className; parent.append(item); return item; }
function button(parent: HTMLElement, label: string, click: () => void): HTMLButtonElement { const item = document.createElement("button"); item.textContent = label; item.addEventListener("click", click); parent.append(item); return item; }
function exact(parent: HTMLElement, label: string, content: string | null): void {
  const details = document.createElement("details"); text(details, "summary", label); const pre = text(details, "pre", content === null ? "[No file]" : content, "thread-exact-change"); pre.tabIndex = 0; parent.append(details);
}
export class ChangesView {
  private bridge: DesktopBridge;
  private revision: () => number | null;
  private showPanel: () => void;
  private epoch = 0;
  private note: NoteSnapshot | null = null;
  private dirty = false;
  constructor(bridge: DesktopBridge, revision: () => number | null, showPanel: () => void) {
    this.bridge = bridge; this.revision = revision; this.showPanel = showPanel;
    el("open-changes").addEventListener("click", () => { this.open(); });
    el("changes-refresh").addEventListener("click", () => { void this.refresh(); });
    el("propose-note").addEventListener("click", () => { void this.startEdit(); });
    el("changes-close").addEventListener("click", () => { this.invalidate(); el("changes-panel").hidden = true; el("source-pane").hidden = false; });
    this.invalidate();
  }
  private message(message: string): void { el("changes-status").textContent = message; }
  setNote(note: NoteSnapshot | null): void { this.note = note; el<HTMLButtonElement>("propose-note").disabled = !note; }
  invalidate(message = "Open Review changes to inspect retained proposals and recovery."): void {
    this.epoch++; this.dirty = false;
    el("changes-work").replaceChildren(); el("changes-list").replaceChildren(); this.message(message);
    this.busy(false);
    void this.bridge.invalidateChangeView();
  }
  hide(): void { el("changes-panel").hidden = true; this.invalidate(); }
  open(): void { this.showPanel(); el("changes-panel").hidden = false; el("changes-panel").focus(); void this.refresh(); }
  private async run(work: (revision: number, current: () => boolean) => Promise<void>): Promise<void> {
    const revision = this.revision(); if (revision === null) { this.message("Choose a vault and approve access before reviewing note content."); return; }
    const epoch = ++this.epoch, current = (): boolean => epoch === this.epoch && revision === this.revision();
    this.message("Checking current changes..."); this.busy(true);
    try { await work(revision, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Change unavailable. Preserve history and refresh."); }
    finally { if (current()) this.busy(false); }
  }
  private busy(active: boolean): void {
    el<HTMLButtonElement>("changes-refresh").disabled = active;
    for (const node of el("changes-panel").querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>("button[data-change-action], textarea")) node.disabled = active || node.dataset.unavailable === "true" || node.dataset.confirm === "true" && this.dirty;
  }
  private action(parent: HTMLElement, label: string, run: () => void, available = true): HTMLButtonElement {
    const item = button(parent, label, run); item.dataset.changeAction = "true"; item.dataset.unavailable = String(!available); item.disabled = !available; return item;
  }
  async refresh(): Promise<void> {
    this.dirty = false; el("changes-work").replaceChildren();
    void this.bridge.invalidateChangeView();
    await this.run(async (revision, current) => { const snapshot = value(await this.bridge.changesSnapshot(revision)); if (!current()) return; this.show(snapshot); this.message("Review is explicit. Originals stay in this desktop profile; plugin history is separate."); });
  }
  private show(snapshot: ChangesSnapshot): void {
    const list = el("changes-list"); list.replaceChildren();
    const row = (summary: ChangeSummary, action: ChangeAction): void => {
      const card = document.createElement("section"); card.className = "thread-record-card"; list.append(card);
      text(card, "p", `${summary.status} · ${summary.createdAt}`, "thread-muted"); text(card, "p", summary.paths.join("\n"), "thread-path");
      this.action(card, action === "apply" ? "Preview pending change" : action === "undo" ? "Preview undo" : "Inspect recovery", () => { void this.loadPreview(action, summary.id); }, summary.available && summary.status !== "undone");
      if (action === "apply" && !snapshot.recovery) this.action(card, "Reject proposal", () => { void this.run(async (revision, current) => { const result = value(await this.bridge.rejectChange(summary.id, revision)); if (current()) { this.clearPreview(); this.show(result); this.message("Proposal rejected. Notes were not changed."); } }); });
    };
    if (snapshot.recovery) { text(list, "h3", "Recovery needs your review"); row(snapshot.recovery, "recover"); }
    if (snapshot.pending) row(snapshot.pending, "apply");
    if (!snapshot.pending && !snapshot.recovery) text(list, "p", "No pending change. Open a permitted note to propose a body update.", "thread-muted");
    text(list, "h3", `Applied history · ${snapshot.history.length} of 20 retained batches`);
    for (const batch of [...snapshot.history].reverse()) row(batch, "undo");
  }
  private clearPreview(): void { this.dirty = false; el("changes-work").replaceChildren(); }
  private async startEdit(): Promise<void> {
    const note = this.note; if (!note) return;
    this.showPanel(); el("changes-panel").hidden = false; this.clearPreview(); el("changes-list").replaceChildren();
    await this.run(async (revision, current) => {
      const draft = value(await this.bridge.beginNoteEdit(note.path, note.stamp, revision)); if (!current()) return;
      const area = el("changes-work"); text(area, "h3", "Propose a note body change"); text(area, "p", draft.path, "thread-path");
      text(area, "p", "Note properties and Thread provenance stay protected. This draft is not saved to your note.", "thread-muted");
      const label = text(area, "label", "Proposed body"), body = document.createElement("textarea"); body.value = draft.body; body.rows = 12; body.maxLength = 1048576; body.setAttribute("aria-label", "Proposed body"); label.append(body);
      this.action(area, "Preview proposed change", () => { const proposed = body.value; void this.run(async (revision, current) => {
        const snapshot = value(await this.bridge.proposeNoteEdit(draft.id, proposed, revision)); if (!current()) return;
        this.show(snapshot); if (snapshot.pending) await this.loadPreview("apply", snapshot.pending.id);
      }); });
      this.message("Edit the body, then preview the exact change. Nothing has been written to the note."); body.focus();
    });
  }
  private async loadPreview(action: ChangeAction, id: string): Promise<void> {
    this.clearPreview();
    await this.run(async (revision, current) => {
      const preview = value(await this.bridge.previewChange(action, id, revision)); if (!current()) return;
      this.renderPreview(preview); this.message(preview.message);
    });
  }
  private renderPreview(preview: ChangePreview): void {
    const area = el("changes-work"); area.replaceChildren();
    text(area, "h3", preview.action === "apply" ? "Exact proposed change" : preview.action === "undo" ? "Exact undo preview" : "Exact recovery preview");
    const bodies: HTMLTextAreaElement[] = [];
    for (const [index, op] of preview.operations.entries()) {
      const card = document.createElement("section"); card.className = "thread-record-card"; area.append(card);
      text(card, "p", `Operation ${index + 1} of ${preview.operations.length}`, "thread-eyebrow"); text(card, "h4", op.path, "thread-path");
      const diff = lineDiff(op.before ?? "", op.after ?? ""), table = document.createElement("div"); table.className = "thread-change-diff"; table.tabIndex = 0; table.setAttribute("aria-label", `Change diff ${index + 1}`); card.append(table);
      let beforeLine = 0, afterLine = 0;
      for (const line of diff.lines.slice(0, 500)) {
        if (line.kind !== "added") beforeLine++; if (line.kind !== "removed") afterLine++;
        const row = document.createElement("div"); row.className = `thread-diff-line thread-diff-${line.kind}`; table.append(row);
        text(row, "span", line.kind === "added" ? "" : String(beforeLine), "thread-line-number"); text(row, "span", line.kind === "removed" ? "" : String(afterLine), "thread-line-number");
        text(row, "span", line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " ", "thread-diff-marker"); text(row, "span", line.text);
      }
      if (diff.lines.length > 500) text(card, "p", "Diff limited to 500 lines. Inspect the complete exact content below.", "thread-muted");
      exact(card, "Exact before", op.before); exact(card, "Exact after", op.after);
      if (op.current !== op.before) exact(card, "Current note differs from the expected version", op.current);
      if (preview.action === "apply" && preview.ready) {
        const details = document.createElement("details"); text(details, "summary", "Edit proposed body"); card.append(details);
        const label = text(details, "label", `Proposed body ${index + 1}`), body = document.createElement("textarea"); body.rows = 8; body.maxLength = 1048576; body.value = editableBody(op.after ?? "").body; body.setAttribute("aria-label", `Proposed body ${index + 1}`); label.append(body); bodies.push(body);
        body.addEventListener("input", () => {
          this.dirty = true; this.epoch++; this.busy(false); this.message("Draft changed. Renew the exact preview before applying."); void this.bridge.changeDraftEdited(preview.id);
        });
      }
    }
    const controls = document.createElement("div"); controls.className = "thread-controls"; area.append(controls);
    if (bodies.length) this.action(controls, "Renew exact preview", () => { const values = bodies.map(body => body.value); void this.run(async (revision, current) => {
      const snapshot = value(await this.bridge.reviseChange(preview.id, values, revision)); if (!current()) return;
      this.show(snapshot); if (snapshot.pending) await this.loadPreview("apply", snapshot.pending.id);
    }); });
    const confirm = this.action(controls, preview.action === "apply" ? "Apply exact change" : preview.action === "undo" ? "Undo exact change" : "Restore reviewed recovery", () => { void this.run(async (revision, current) => {
      const snapshot = value(await this.bridge.confirmChange(preview.id, revision)); if (!current()) return;
      this.clearPreview(); this.show(snapshot); this.message("Reviewed operation completed. Refresh sources to see current content.");
    }); }, preview.ready); confirm.dataset.confirm = "true"; confirm.className = "thread-primary";
    text(area, "p", "Originals are retained before the first write. Every target is checked again. Later external edits block undo or recovery. Ordinary filesystem writes are not a multi-file transaction.", "thread-muted");
  }
}
