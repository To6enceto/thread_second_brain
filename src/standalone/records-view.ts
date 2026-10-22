import type { DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { DecisionAssessment, RecordCommand, RecordsSnapshot } from "./records.ts";
import type { DecisionInput } from "../vault/decision.ts";
import type { QuestionUpdate } from "../vault/questions.ts";
import { localDay } from "../vault/workspace.ts";
import { contextCoverageText } from "../vault/evidence.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node; }
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest };
export class RecordsView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private show: () => void;
  private review: () => void;
  private source: (path: string, heading: string, hash: string) => void;
  private epoch = 0;
  private busy = false;
  private snapshot: RecordsSnapshot | null = null;
  private assessment: DecisionAssessment | null = null;
  constructor(bridge: DesktopBridge, access: () => Access | null, show: () => void, review: () => void, source: (path: string, heading: string, hash: string) => void) {
    this.bridge = bridge; this.access = access; this.show = show; this.review = review; this.source = source;
    el("open-records").addEventListener("click", () => { this.open(); });
    el("records-refresh").addEventListener("click", () => { void this.refresh(); });
    el("records-cancel").addEventListener("click", () => this.invalidate("Record work canceled. Refresh records to continue."));
    el("records-close").addEventListener("click", () => { this.hide(); el("source-pane").hidden = false; });
    this.invalidate();
  }
  private message(text: string): void { el("records-status").textContent = text; }
  invalidate(message = "Choose a permitted project and refresh records."): void {
    this.epoch++; this.snapshot = null; this.assessment = null; el("records-content").replaceChildren(); this.setBusy(false); this.message(message); void this.bridge.cancelRecords();
  }
  hide(): void { el("records-panel").hidden = true; this.invalidate(); }
  open(): void { this.show(); el("records-panel").hidden = false; el("records-panel").focus(); void this.refresh(); }
  private setBusy(active: boolean): void {
    this.busy = active; el<HTMLButtonElement>("records-refresh").disabled = active; el<HTMLButtonElement>("records-cancel").disabled = !active && !this.snapshot;
    for (const button of el("records-content").querySelectorAll<HTMLButtonElement>("[data-record-work]")) button.disabled = active || button.dataset.needsAssessment === "true" && !this.assessment;
  }
  private async run(work: (access: Access, current: () => boolean) => Promise<void>): Promise<void> {
    const access = this.access(); if (!access?.selection.project) { this.message("Choose a permitted project first. Project selection grants no new access."); return; }
    if (this.busy) return;
    const epoch = ++this.epoch, key = JSON.stringify(access), current = () => epoch === this.epoch && key === JSON.stringify(this.access());
    this.setBusy(true);
    try { await work(access, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Record work failed. Refresh and try again."); }
    finally { if (current()) this.setBusy(false); }
  }
  async refresh(): Promise<void> {
    this.invalidate("Loading current permitted records...");
    await this.run(async (access, current) => {
      const snapshot = value(await this.bridge.loadRecords(access.selection, access.revision)); if (!current()) return;
      this.snapshot = snapshot; this.render(snapshot); this.message("Records ready. Nothing changes until you approve an exact change preview.");
    });
  }
  private draft(keep: boolean): void {
    this.epoch++; if (!keep) { this.assessment = null; el("record-assessment")?.replaceChildren(); }
    this.setBusy(false); void this.bridge.recordDraftChanged(keep); this.message("Draft changed. Prepare a new exact preview; notes remain unchanged.");
  }
  private button(parent: HTMLElement, label: string, click: () => void, work = false): HTMLButtonElement {
    const button = add(parent, "button", label); if (work) button.dataset.recordWork = "true"; button.addEventListener("click", click); return button;
  }
  private select(parent: HTMLElement, label: string, options: [string, string][], change: () => void): HTMLSelectElement {
    const wrapper = add(parent, "label", label), select = add(wrapper, "select"); select.setAttribute("aria-label", label);
    for (const [key, title] of options) { const option = add(select, "option", title); option.value = key; }
    select.addEventListener("change", change); return select;
  }
  private input(parent: HTMLElement, label: string, initial = "", limit = 5000, date = false): HTMLInputElement | HTMLTextAreaElement {
    const wrapper = add(parent, "label", label), input = date || limit === 100 ? add(wrapper, "input") : add(wrapper, "textarea");
    input.setAttribute("aria-label", label); input.value = initial; input.maxLength = limit;
    if (date) (input as HTMLInputElement).type = "date"; else if (input.tagName === "TEXTAREA") (input as HTMLTextAreaElement).rows = 3;
    input.addEventListener("input", () => this.draft(true)); return input;
  }
  private render(snapshot: RecordsSnapshot): void {
    const area = el("records-content"); area.replaceChildren(); add(area, "p", snapshot.project, "thread-path"); add(area, "p", snapshot.coverage, "thread-muted");
    const list = add(area, "details"); add(list, "summary", `Recorded decisions (${snapshot.decisions.length}) and questions (${snapshot.questions.length})`);
    for (const record of [...snapshot.decisions, ...snapshot.questions]) {
      const row = add(list, "div", "", "thread-record-card"); add(row, "span", record.status, `thread-record-status thread-record-status-${["accepted", "proposed", "superseded"].includes(record.status) ? record.status : "other"}`);
      this.button(row, record.path, () => this.source(record.path, "", record.hash)).className = "thread-source-chip";
    }
    if (!snapshot.decisions.length && !snapshot.questions.length) add(list, "p", "No managed records yet. Create one below; legacy notes stay unchanged.");
    const form = add(area, "div", "", "thread-record-form");
    let updateMode = (): void => {};
    const mode = this.select(form, "Record action", [["decision", "Create decision"], ["question", "Create open question"], ["question-update", "Update managed question"], ["decision-review", "Review decision evidence"]], () => { this.draft(false); updateMode(); });
    const name = this.input(form, "New note or replacement name", "", 100);
    const decisionArea = add(form, "details"); decisionArea.open = true; add(decisionArea, "summary", "Decision or replacement fields");
    const decisionFields = Object.fromEntries(([ ["question", "Decision question"], ["choice", "Decision choice"], ["alternatives", "Decision alternatives"], ["rationale", "Decision rationale"], ["constraints", "Decision constraints"], ["revisit", "Decision revisit condition"] ] as const).map(([key, label]) => [key, this.input(decisionArea, label)])) as Record<"question" | "choice" | "alternatives" | "rationale" | "constraints" | "revisit", HTMLInputElement | HTMLTextAreaElement>;
    const decisionStatus = this.select(decisionArea, "Decision status", [["proposed", "Proposed"], ["accepted", "Accepted - I accept this choice"]], () => this.draft(true));
    const decisionDate = this.input(decisionArea, "Decision date", localDay(), 10, true), revisitDate = this.input(decisionArea, "Revisit date", "", 10, true);
    const fields = (): DecisionInput => ({ ...Object.fromEntries(Object.entries(decisionFields).map(([key, input]) => [key, input.value])) as Pick<DecisionInput, keyof typeof decisionFields>, status: decisionStatus.value as DecisionInput["status"], date: decisionDate.value, revisitOn: revisitDate.value });
    const questionArea = add(form, "section"), question = this.input(questionArea, "New question", "", 1000);
    let copied: number | null = null;
    const legacy = this.select(questionArea, "Legacy question section", [["", "No legacy copy"], ...snapshot.legacy.map((v, i): [string, string] => [String(i), `${v.path} > ${v.heading}`])], () => { copied = null; this.draft(true); });
    this.button(questionArea, "Copy legacy section into new question", () => { const index = Number(legacy.value), source = legacy.value !== "" ? snapshot.legacy[index] : null; if (!source) return; copied = index; question.value = source.text; this.draft(true); });
    add(questionArea, "p", "Copying creates a new question only. The legacy source remains unchanged and linked as evidence.", "thread-muted");
    const updateArea = add(form, "section");
    const target = this.select(updateArea, "Managed question to update", [["", "Choose a question"], ...snapshot.questions.map((v): [string, string] => [v.path, `${v.status}: ${v.path}`])], () => this.draft(false));
    const state = this.select(updateArea, "Question state", [["investigating", "Investigating"], ["answered", "Answered - I record this answer"], ["open", "Open / reopen explicitly"]], () => this.draft(true));
    const answer = this.input(updateArea, "Question answer or working response"), reason = this.input(updateArea, "Question update reason");
    const eventDate = this.input(form, "Question event date", localDay(), 10, true);
    const reviewArea = add(form, "section");
    const decision = this.select(reviewArea, "Decision to review", [["", "Choose a decision"], ...snapshot.decisions.map((v): [string, string] => [v.path, `${v.status}: ${v.path}`])], () => this.draft(false));
    const action = this.select(reviewArea, "Decision review action", [["retain", "Retain current choice"], ["annotate", "Annotate current choice"], ["supersede", "Supersede - explicitly accept my replacement"]], () => { this.draft(true); updateMode(); });
    const reasoning = this.input(reviewArea, "Review reasoning");
    const sources = this.select(form, "Record evidence notes", snapshot.evidence.map((v): [string, string] => [v.path, v.path]), () => this.draft(false)); sources.multiple = true; sources.size = 5;
    for (const option of sources.options) option.selected = false;
    add(form, "p", "Use Ctrl or Shift to choose evidence. Up to ten notes for a new decision; four for a question or decision review. Evidence is optional except for AI decision review.", "thread-muted");
    const paths = () => [...sources.selectedOptions].map(option => option.value);
    const assess = this.button(form, "Assess selected decision evidence", () => { const path = decision.value, selected = paths(); this.draft(false); void this.run(async (access, current) => {
      this.message("Comparing the decision and selected evidence locally...");
      const result = value(await this.bridge.assessDecision(snapshot.id, path, selected, access.revision)); if (!current()) return;
      this.assessment = result; this.showAssessment(result); this.message("Interpretations ready. Choose your explicit action and reasoning, then preview it.");
    }); }, true);
    const assessmentArea = add(form, "div"); assessmentArea.id = "record-assessment";
    const preview = this.button(form, "Preview record action", () => {
      const chosen = mode.value, selected = paths(); let command: RecordCommand;
      if (chosen === "decision") command = { kind: chosen, name: name.value, decision: fields(), sources: selected };
      else if (chosen === "question") command = { kind: chosen, name: name.value, question: question.value, day: eventDate.value, sources: selected, legacy: copied };
      else if (chosen === "question-update") command = { kind: chosen, path: target.value, update: { status: state.value as QuestionUpdate["status"], answer: answer.value, reason: reason.value, day: eventDate.value }, sources: selected };
      else { if (!this.assessment) return; command = { kind: "decision-review", assessment: this.assessment.id, action: action.value as "retain" | "annotate" | "supersede", reason: reasoning.value, name: name.value, replacement: fields() }; }
      void this.run(async (access, current) => { this.message("Preparing the exact reviewed proposal..."); value(await this.bridge.prepareRecord(snapshot.id, command, access.revision)); if (current()) this.review(); });
    }, true); preview.className = "thread-primary";
    updateMode = () => {
      questionArea.hidden = mode.value !== "question"; updateArea.hidden = mode.value !== "question-update"; reviewArea.hidden = mode.value !== "decision-review";
      decisionArea.hidden = mode.value !== "decision" && !(mode.value === "decision-review" && action.value === "supersede");
      name.parentElement!.hidden = mode.value === "question-update" || mode.value === "decision-review" && action.value !== "supersede";
      eventDate.parentElement!.hidden = mode.value !== "question" && mode.value !== "question-update";
      assess.hidden = mode.value !== "decision-review"; preview.dataset.needsAssessment = String(mode.value === "decision-review"); this.setBusy(this.busy);
    }; updateMode();
  }
  private showAssessment(assessment: DecisionAssessment): void {
    const area = el("record-assessment"); area.replaceChildren(); const card = add(area, "section", "", "thread-ai-card"); add(card, "h3", "AI interpretations - no decision is accepted");
    add(card, "p", `${assessment.model} - ${new Date(assessment.generatedAt).toLocaleString()}`, "thread-muted");
    for (const claim of assessment.answer.answer) add(card, "p", `Interpretation: ${claim.text} (${claim.sourceIds.join(", ")})`);
    for (const gap of assessment.answer.gaps) add(card, "p", `Gap: ${gap}`, "thread-muted");
    add(card, "p", contextCoverageText(assessment.bundle), "thread-muted");
    const exact = add(card, "details"); add(exact, "summary", "Evidence used for this assessment");
    for (const source of assessment.bundle.sources) { this.button(exact, `${source.id}: ${source.path} > ${source.heading}`, () => this.source(source.path, source.heading, assessment.bundle.noteHashes[source.path]!)).className = "thread-source-chip"; add(exact, "p", source.excerpt); }
  }
}
