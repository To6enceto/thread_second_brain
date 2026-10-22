import type { DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { ActionCommand, ActionsSnapshot, SessionDraft } from "./records.ts";
import { actionLabels, actionStates, type ActionState } from "../vault/action-record.ts";
import { localDay } from "../vault/workspace.ts";
import { contextCoverageText } from "../vault/evidence.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node; }
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest };
export class ActionsView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private show: () => void;
  private review: () => void;
  private source: (path: string, heading: string, hash: string) => void;
  private epoch = 0;
  private busy = false;
  private snapshot: ActionsSnapshot | null = null;
  private session: SessionDraft | null = null;
  constructor(bridge: DesktopBridge, access: () => Access | null, show: () => void, review: () => void, source: (path: string, heading: string, hash: string) => void) {
    this.bridge = bridge; this.access = access; this.show = show; this.review = review; this.source = source;
    el("open-actions").addEventListener("click", () => this.open());
    el("actions-refresh").addEventListener("click", () => { void this.refresh(); });
    el("actions-cancel").addEventListener("click", () => this.invalidate("Action and wrap-up work canceled. Refresh to continue."));
    el("actions-close").addEventListener("click", () => { this.hide(); el("source-pane").hidden = false; }); this.invalidate();
  }
  private message(text: string): void { el("actions-status").textContent = text; }
  invalidate(message = "Choose a permitted project and refresh actions."): void {
    this.epoch++; this.snapshot = null; this.session = null; el("actions-content").replaceChildren(); this.setBusy(false); this.message(message); void this.bridge.cancelRecords();
  }
  hide(): void { el("actions-panel").hidden = true; this.invalidate(); }
  open(): void { this.show(); el("actions-panel").hidden = false; el("actions-panel").focus(); void this.refresh(); }
  private setBusy(active: boolean): void {
    this.busy = active; el<HTMLButtonElement>("actions-refresh").disabled = active; el<HTMLButtonElement>("actions-cancel").disabled = !active && !this.snapshot;
    for (const button of el("actions-content").querySelectorAll<HTMLButtonElement>("[data-action-work]")) button.disabled = active || button.dataset.needsSession === "true" && !this.session;
  }
  private async run(work: (access: Access, current: () => boolean) => Promise<void>): Promise<void> {
    const access = this.access(); if (!access?.selection.project) { this.message("Choose a permitted project first. Selection grants no access."); return; }
    if (this.busy) return;
    const epoch = ++this.epoch, key = JSON.stringify(access), current = () => epoch === this.epoch && key === JSON.stringify(this.access()); this.setBusy(true);
    try { await work(access, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Action work failed. Refresh and try again."); }
    finally { if (current()) this.setBusy(false); }
  }
  async refresh(): Promise<void> {
    this.invalidate("Reading current action records...");
    await this.run(async (access, current) => { const snapshot = value(await this.bridge.loadActions(access.selection, access.revision)); if (!current()) return; this.snapshot = snapshot; this.render(snapshot); this.message("Board ready. States are user reports. Preview every change explicitly."); });
  }
  private changed(): void {
    this.epoch++; this.session = null; el("session-draft")?.replaceChildren(); this.setBusy(false); void this.bridge.recordDraftChanged(false); this.message("Inputs changed. Generate or preview again; notes remain unchanged.");
  }
  private button(parent: HTMLElement, label: string, click: () => void, work = false): HTMLButtonElement {
    const button = add(parent, "button", label); if (work) button.dataset.actionWork = "true"; button.addEventListener("click", click); return button;
  }
  private input(parent: HTMLElement, label: string, initial: string, max: number, date = false): HTMLInputElement | HTMLTextAreaElement {
    const wrapper = add(parent, "label", label), input = max > 200 ? add(wrapper, "textarea") : add(wrapper, "input"); input.setAttribute("aria-label", label); input.value = initial; input.maxLength = max;
    if (date) (input as HTMLInputElement).type = "date"; if (input.tagName === "TEXTAREA") (input as HTMLTextAreaElement).rows = 3;
    input.addEventListener("input", () => this.changed()); return input;
  }
  private select(parent: HTMLElement, label: string, options: [string, string][], changed: () => void = () => this.changed()): HTMLSelectElement {
    const wrapper = add(parent, "label", label), select = add(wrapper, "select"); select.setAttribute("aria-label", label);
    for (const [key, title] of options) { const option = add(select, "option", title); option.value = key; } select.addEventListener("change", changed); return select;
  }
  private render(snapshot: ActionsSnapshot): void {
    const area = el("actions-content"); area.replaceChildren(); add(area, "p", snapshot.project, "thread-path");
    add(area, "p", `${snapshot.actions.cards.length} current actions; ${snapshot.actions.unavailable} unavailable; ${snapshot.actions.omitted} omitted. ${snapshot.coverage}`, "thread-muted");
    add(area, "p", "Stale, unsupported, edited or ambiguous records are preserved. Inspect their original notes and refresh; they are never silently replaced. Legacy chosen-next-action notes remain readable in Your notes.", "thread-muted");
    const board = add(area, "div", "", "thread-action-board");
    let chooseTransition = (_path: string): void => {};
    for (const state of actionStates) {
      const column = add(board, "section", "", "thread-action-column"), cards = snapshot.actions.cards.filter(c => c.record.status === state); add(column, "h3", `${actionLabels[state]} (${cards.length})`);
      if (!cards.length) add(column, "p", "No current records in this state.", "thread-muted");
      for (const card of cards) {
        const row = add(column, "article", "", "thread-record-card"), last = card.record.history.at(-1)!; add(row, "h4", card.record.title);
        add(row, "span", actionLabels[state], `thread-record-status thread-action-state-${state}`); add(row, "p", `Reported ${last.day}; ${card.record.history.length} retained events.`, "thread-muted"); add(row, "p", last.reason);
        this.button(row, "Open action source", () => this.source(card.path, "", card.hash)).className = "thread-source-chip";
        this.button(row, `Record transition: ${card.record.title}`, () => chooseTransition(card.path));
      }
    }
    const form = add(area, "section", "", "thread-record-form thread-action-form"); add(form, "h3", "Record an action explicitly");
    let showMode = (): void => {};
    const mode = this.select(form, "Action operation", [["new", "Create Planned action"], ["transition", "Record a state transition"]], () => { this.changed(); showMode(); });
    const name = this.input(form, "Action note name", "", 100), title = this.input(form, "Action title", "", 200);
    const target = this.select(form, "Action to update", [["", "Choose an action"], ...snapshot.actions.cards.map((c): [string, string] => [c.path, `${actionLabels[c.record.status]}: ${c.record.title}`])]);
    const state = this.select(form, "Action state", actionStates.map(s => [s, actionLabels[s]])); state.value = "in-progress";
    const reason = this.input(form, "Action reason", "", 2000), day = this.input(form, "Reported action date", localDay(), 10, true);
    const sources = this.select(form, "Action supporting notes", snapshot.evidence.map(e => [e.path, e.path])); sources.multiple = true; sources.size = 5; for (const option of sources.options) option.selected = false;
    add(form, "p", "Use Ctrl or Shift to choose up to four current supporting notes. References never accept decisions or resolve questions. Creating always starts Planned; each transition needs a reason and exact review.", "thread-muted");
    const prepare = this.button(form, "Preview action", () => {
      const common = { reason: reason.value, day: day.value, sources: [...sources.selectedOptions].map(o => o.value) };
      const command: ActionCommand = mode.value === "new" ? { kind: "new", name: name.value, title: title.value, ...common } : { kind: "transition", path: target.value, state: state.value as ActionState, ...common };
      void this.run(async (access, current) => { this.message("Preparing the exact action proposal..."); value(await this.bridge.prepareAction(snapshot.id, command, access.revision)); if (current()) this.review(); });
    }, true); prepare.className = "thread-primary";
    showMode = () => { name.parentElement!.hidden = title.parentElement!.hidden = mode.value !== "new"; target.parentElement!.hidden = state.parentElement!.hidden = mode.value !== "transition"; };
    chooseTransition = path => { mode.value = "transition"; target.value = path; this.changed(); showMode(); target.focus(); target.scrollIntoView({ block: "center" }); }; showMode();
    const wrap = add(area, "section", "", "thread-record-form"); add(wrap, "h3", "Session wrap-up");
    add(wrap, "p", "Report your progress and explicitly select up to five action reports. Done and dates are user reports, not proof work occurred in this session. Generating or saving never changes action states.", "thread-muted");
    const sessionName = this.input(wrap, "Session note name", `${localDay()} Wrap-up`, 100), report = this.input(wrap, "Reported progress", "", 5000), chosen = new Set<string>();
    const choices = add(wrap, "fieldset"); add(choices, "legend", "Choose recorded action progress (optional)"); const count = add(choices, "p", "No action reports selected.", "thread-muted");
    for (const card of snapshot.actions.cards) {
      const label = add(choices, "label"), checkbox = add(label, "input"); checkbox.type = "checkbox"; checkbox.setAttribute("aria-label", `Use recorded action ${card.record.title}`);
      add(label, "span", `${card.record.title} - ${actionLabels[card.record.status]} - reported ${card.record.history.at(-1)!.day}`);
      checkbox.addEventListener("change", () => { if (checkbox.checked && chosen.size >= 5) { checkbox.checked = false; this.message("Select at most five action reports. Remove one first."); return; } if (checkbox.checked) chosen.add(card.path); else chosen.delete(card.path); this.changed(); count.textContent = `${chosen.size} action reports selected explicitly.`; });
    }
    this.button(wrap, "Generate session wrap-up", () => {
      const input = { name: sessionName.value, report: report.value, actions: [...chosen] }; this.changed();
      void this.run(async (access, current) => { this.message("Generating a local session summary from current context..."); const draft = value(await this.bridge.generateSession(snapshot.id, input, access.revision)); if (!current()) return; this.session = draft; this.showSession(draft); this.message("Session draft ready. Inspect reports, interpretations and sources; preview before saving."); });
    }, true);
    const preview = this.button(wrap, "Preview session note", () => { const session = this.session; if (!session) return; void this.run(async (access, current) => { this.message("Preparing the exact session note proposal..."); value(await this.bridge.prepareSession(session.id, access.revision)); if (current()) this.review(); }); }, true); preview.dataset.needsSession = "true"; preview.className = "thread-primary";
    const result = add(wrap, "div"); result.id = "session-draft";
  }
  private showSession(draft: SessionDraft): void {
    const area = el("session-draft"); area.replaceChildren(); const card = add(area, "section", "", "thread-ai-card"); add(card, "h3", "Reviewed session draft with AI summary");
    add(card, "p", `${draft.model} - ${new Date(draft.generatedAt).toLocaleString()} - ${draft.actionCount} explicitly selected action reports.`, "thread-muted"); add(card, "p", contextCoverageText(draft.bundle), "thread-muted");
    const content = add(card, "pre", draft.markdown, "thread-exact-change"); content.tabIndex = 0;
    const details = add(card, "details"); add(details, "summary", "Current supporting passages");
    for (const source of draft.bundle.sources) { this.button(details, `${source.id}: ${source.path} > ${source.heading}`, () => this.source(source.path, source.heading, draft.bundle.noteHashes[source.path]!)).className = "thread-source-chip"; add(details, "p", source.excerpt); }
  }
}
