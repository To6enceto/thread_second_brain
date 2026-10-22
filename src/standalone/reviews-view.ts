import type { DesktopBridge, DesktopResult, ProjectRequest } from "./contracts.ts";
import type { DesktopReviewSnapshot, ReviewCommand, ReviewDraft, ReviewGeneration, ReviewMode, ReviewRequest, ReviewSource } from "./reviews.ts";
import { queueKinds, queueLabels } from "../vault/review-queue.ts";
import { localDay } from "../vault/workspace.ts";
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", cls = ""): HTMLElementTagNameMap[K] { const node = document.createElement(tag); node.textContent = text; node.className = cls; parent.append(node); return node; }
function value<T>(result: DesktopResult<T>): T { if (!result.ok) throw Error(result.message); return result.value; }
type Access = { revision: number; generation: number; selection: ProjectRequest };
export class ReviewsView {
  private bridge: DesktopBridge;
  private access: () => Access | null;
  private show: () => void;
  private review: () => void;
  private source: (path: string, heading: string, hash: string) => void;
  private project: (path: string) => Promise<void>;
  private records: () => void;
  private epoch = 0;
  private busy = false;
  private snapshot: DesktopReviewSnapshot | null = null;
  private draft: ReviewDraft | null = null;
  constructor(bridge: DesktopBridge, access: () => Access | null, show: () => void, review: () => void, source: (path: string, heading: string, hash: string) => void, project: (path: string) => Promise<void>, records: () => void) {
    this.bridge = bridge; this.access = access; this.show = show; this.review = review; this.source = source; this.project = project; this.records = records;
    el("open-reviews").addEventListener("click", () => this.open());
    for (const id of ["reviews-mode", "reviews-filter"]) el(id).addEventListener("change", () => { void this.refresh(); });
    el("reviews-refresh").addEventListener("click", () => { void this.refresh(); });
    el("reviews-cancel").addEventListener("click", () => this.invalidate("Review work canceled. Refresh to continue."));
    el("reviews-close").addEventListener("click", () => { this.hide(); el("source-pane").hidden = false; }); this.invalidate();
  }
  private message(text: string): void { el("reviews-status").textContent = text; }
  invalidate(message = "Refresh reviews for current permitted sources."): void {
    this.epoch++; this.snapshot = null; this.draft = null; el("reviews-content").replaceChildren(); this.setBusy(false); this.message(message); void this.bridge.cancelReviews();
  }
  hide(): void { el("reviews-panel").hidden = true; this.invalidate(); }
  open(mode?: ReviewMode): void { if (mode) el<HTMLSelectElement>("reviews-mode").value = mode; this.show(); el("reviews-panel").hidden = false; el("reviews-panel").focus(); void this.refresh(); }
  private setBusy(active: boolean): void {
    this.busy = active; el<HTMLButtonElement>("reviews-refresh").disabled = active; el<HTMLButtonElement>("reviews-cancel").disabled = !active && !this.snapshot;
    for (const button of el("reviews-content").querySelectorAll<HTMLButtonElement>("[data-review-work]")) button.disabled = active || button.dataset.unavailable === "true" || button.dataset.needsDraft === "true" && !this.draft;
  }
  private async run(work: (access: Access, current: () => boolean) => Promise<void>): Promise<void> {
    const access = this.access(); if (!access) { this.message("Choose a vault and explicitly grant read access first."); return; } if (this.busy) return;
    const epoch = ++this.epoch, key = JSON.stringify(access), current = () => epoch === this.epoch && key === JSON.stringify(this.access()); this.setBusy(true);
    try { await work(access, current); } catch (error) { if (current()) this.message(error instanceof Error ? error.message : "Review work failed. Refresh and try again."); }
    finally { if (current()) this.setBusy(false); }
  }
  async refresh(): Promise<void> {
    this.invalidate("Reading current review context...");
    await this.run(async (access, current) => {
      const request: ReviewRequest = { selection: access.selection, mode: el<HTMLSelectElement>("reviews-mode").value as ReviewMode, filter: el<HTMLSelectElement>("reviews-filter").value as ReviewRequest["filter"] };
      const snapshot = value(await this.bridge.loadReviews(request, access.revision)); if (!current()) return;
      this.snapshot = snapshot; this.render(snapshot); this.message("Review snapshot ready. Nothing is acknowledged, repaired or saved automatically.");
    });
  }
  private changed(): void { this.epoch++; this.draft = null; el("review-draft")?.replaceChildren(); this.setBusy(false); void this.bridge.reviewDraftChanged(); this.message("Inputs changed. Generate or preview again; notes remain unchanged."); }
  private button(parent: HTMLElement, label: string, click: () => void, work = false): HTMLButtonElement { const button = add(parent, "button", label); if (work) button.dataset.reviewWork = "true"; button.addEventListener("click", click); return button; }
  private chip(parent: HTMLElement, source: ReviewSource, heading = ""): void { this.button(parent, source.path + (heading ? ` > ${heading}` : ""), () => this.source(source.path, heading, source.hash)).className = "thread-source-chip"; }
  private input(parent: HTMLElement, label: string, initial: string, max: number, date = false): HTMLInputElement | HTMLTextAreaElement {
    const wrapper = add(parent, "label", label), input = max > 200 ? add(wrapper, "textarea") : add(wrapper, "input"); input.setAttribute("aria-label", label); input.value = initial; input.maxLength = max;
    if (date) (input as HTMLInputElement).type = "date"; if (input.tagName === "TEXTAREA") (input as HTMLTextAreaElement).rows = 3; input.addEventListener("input", () => this.changed()); return input;
  }
  private select(parent: HTMLElement, label: string, options: [string, string][], changed: () => void = () => this.changed()): HTMLSelectElement {
    const select = add(add(parent, "label", label), "select"); select.setAttribute("aria-label", label);
    for (const [key, text] of options) { const option = add(select, "option", text); option.value = key; } select.addEventListener("change", changed); return select;
  }
  private limits(parent: HTMLElement, lines: string[]): void { const details = add(parent, "details"); add(details, "summary", "Coverage and limits"); for (const line of lines) add(details, "p", line, "thread-muted"); }
  private form(parent: HTMLElement, title: string): HTMLElement { const form = add(parent, "section", "", "thread-record-form thread-review-form"); add(form, "h3", title); return form; }
  private prepare(snapshot: DesktopReviewSnapshot, command: ReviewCommand): void {
    void this.run(async (access, current) => { this.message("Preparing the exact proposal..."); value(await this.bridge.prepareReview(snapshot.id, command, access.revision)); if (current()) this.review(); });
  }
  private render(snapshot: DesktopReviewSnapshot): void {
    const area = el("reviews-content"); area.replaceChildren(); add(area, "p", snapshot.project || "Currently permitted notes", "thread-path"); add(area, "p", snapshot.coverage, "thread-muted");
    if (snapshot.queue) this.queue(area, snapshot);
    if (snapshot.timeline) this.timeline(area, snapshot);
    if (snapshot.overview) this.overview(area, snapshot);
    if (snapshot.health) this.health(area, snapshot);
    if (snapshot.outputs) this.freshness(area, snapshot);
    if (snapshot.mode === "weekly") this.weekly(area, snapshot);
  }
  private queue(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const queue = snapshot.queue!; add(area, "p", "Acknowledgements apply to an exact snapshot. They never make evidence fresh, accept a decision or resolve a question.", "thread-muted");
    this.button(area, "Open decisions and questions", this.records);
    let choose = (_index: number): void => {};
    for (const kind of queueKinds) {
      const section = add(area, "section"), rows = queue.pending.map((row, index) => ({ row, index })).filter(({ row }) => row.item.kind === kind);
      add(section, "h3", `${queueLabels[kind]} (${rows.length} shown; ${queue.candidateCounts[kind] ?? 0} candidates)`);
      if (!rows.length) add(section, "p", "No pending items shown in this category.", "thread-muted");
      for (const { row, index } of rows) {
        const card = add(section, "article", "", "thread-record-card thread-review-card"); add(card, "p", row.item.text); this.chip(card, row.item, row.item.heading); for (const related of row.item.related) this.chip(card, related);
        if (row.available) this.button(card, `Review item ${index + 1}`, () => choose(index)); else add(card, "p", "Snapshot unavailable. Inspect and normalize the original manually.", "thread-muted");
        if (kind === "stale-output") this.button(card, "Open source freshness", () => this.open("freshness"));
      }
    }
    const handled = add(area, "details"); add(handled, "summary", `Handled snapshots (${queue.handled.length})`);
    for (const row of queue.handled) { const card = add(handled, "article", "", "thread-record-card"); add(card, "p", `${row.disposition}: ${row.item.text}`); this.chip(card, row.item, row.item.heading); if (row.event) this.chip(card, row.event); }
    const options: [string, string][] = queue.pending.flatMap((row, i) => row.available ? [[String(i), `${i + 1}: ${row.item.text}`] as [string, string]] : []);
    if (options.length) {
      const form = this.form(area, "Record an explicit review"); let show = (): void => {};
      const item = this.select(form, "Review item", options), action = this.select(form, "Review action", [["reviewed", "Reviewed - no change"], ["snoozed", "Snooze until a future date"], ["question", "Create a follow-up question"]], () => { this.changed(); show(); });
      const name = this.input(form, "Review record name", `${localDay()} Review`, 100), reason = this.input(form, "Review reason", "", 5000), revisit = this.input(form, "Revisit date", "", 10, true), question = this.input(form, "Follow-up question", "", 1000);
      this.button(form, "Preview review action", () => this.prepare(snapshot, { kind: "review", row: Number(item.value), action: action.value as "reviewed" | "snoozed" | "question", name: name.value, reason: reason.value, revisit: revisit.value, question: question.value }), true).className = "thread-primary";
      show = () => { revisit.parentElement!.hidden = action.value !== "snoozed"; question.parentElement!.hidden = action.value !== "question"; }; show();
      choose = index => { item.value = String(index); this.changed(); item.focus(); item.scrollIntoView({ block: "center" }); };
    }
    this.limits(area, queue.limits);
  }
  private timeline(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const timeline = snapshot.timeline!; add(area, "p", `${timeline.events.length} of ${timeline.total} events shown; ${timeline.unknown} dates unknown; ${timeline.examined} of ${timeline.records} records examined.`, "thread-muted");
    for (const event of timeline.events) { const card = add(area, "article", "", "thread-record-card thread-review-card"); add(card, "h3", `${event.day ?? "Date unknown"} - ${event.kind}`); add(card, "p", event.text); add(card, "p", `${event.dateBasis}; ${event.capture}; file modified ${event.modified}. These describe different dates.`, "thread-muted"); this.chip(card, event, event.heading); if (event.related) this.chip(card, event.related); if (!event.usable) add(card, "p", "Evidence is unavailable or stale. Inspect the original; do not treat this as current support.", "thread-muted"); }
    const form = this.form(area, "Record a milestone"); const name = this.input(form, "Milestone note name", `${localDay()} Milestone`, 100), title = this.input(form, "Milestone title", "", 200), detail = this.input(form, "Milestone detail", "", 5000), day = this.input(form, "Milestone event date", localDay(), 10, true);
    add(form, "p", "An explicit user report. Enter the event date yourself; capture and file modification dates do not prove achievement.", "thread-muted");
    this.button(form, "Preview milestone note", () => this.prepare(snapshot, { kind: "milestone", name: name.value, title: title.value, detail: detail.value, day: day.value }), true).className = "thread-primary"; this.limits(area, timeline.limits);
  }
  private overview(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const overview = snapshot.overview!; add(area, "p", `${overview.cards.length} shown of ${overview.matching} matching; ${overview.permitted} permitted projects. Counts are bounded; no priority is inferred.`, "thread-muted");
    for (const card of overview.cards) {
      const row = add(area, "article", "", "thread-record-card thread-review-card"); add(row, "h3", card.path); add(row, "span", card.status, "thread-record-status"); add(row, "p", `${card.records} records; questions ${card.questions ?? "unavailable"}; due ${card.due ?? "unavailable"}; desktop pending proposals ${card.proposal}.`);
      for (const kind of queueKinds) add(row, "p", `${queueLabels[kind]}: ${card.reviews[kind] ?? "unavailable"}`, "thread-muted");
      if (card.activity) { add(row, "p", `${card.activity.day ?? "Unknown event date"}: ${card.activity.text}`); this.chip(row, card.activity, card.activity.heading); }
      if (card.chosen) { add(row, "p", `Chosen next action: ${card.chosen.excerpt}`); this.chip(row, card.chosen); }
      if (!card.identity.id) add(row, "p", card.identity.reason, "thread-muted");
      this.button(row, "Open project", () => { void this.project(card.path).catch(error => this.message(error instanceof Error ? error.message : "Refresh the project list.")); }); this.limits(row, card.limits);
    }
    const choices: [string, string][] = overview.cards.filter(card => card.identity.id).map(card => [card.path, card.path]);
    if (choices.length) { const form = this.form(area, "Choose a next action"); const project = this.select(form, "Next action project", choices), name = this.input(form, "Next action record name", `${localDay()} Next action`, 100), action = this.input(form, "Chosen next action", "", 1000); this.button(form, "Preview next action record", () => this.prepare(snapshot, { kind: "next-action", project: project.value, name: name.value, action: action.value }), true).className = "thread-primary"; }
    this.limits(area, overview.limits);
  }
  private health(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const report = snapshot.health!; add(area, "p", `${report.examined} of ${report.available} files examined; ${report.skipped} skipped; ${report.bytes} bytes read. ${report.issues.length} diagnostics shown.`, "thread-muted");
    add(area, "p", Object.entries(report.counts).map(([kind, count]) => `${kind}: ${count}`).join("; "), "thread-muted");
    const form = this.form(area, "Individual repair"); add(form, "p", "Select one eligible diagnostic below. Other fields and history are preserved. All repairs require exact change review; unsupported records need manual normalization.", "thread-muted"); const fields = add(form, "div");
    for (const [index, issue] of report.issues.entries()) {
      const card = add(area, "article", "", "thread-record-card thread-review-card"); add(card, "h3", issue.kind); add(card, "p", issue.message); add(card, "p", issue.effect); add(card, "p", issue.guidance, "thread-muted"); this.chip(card, issue);
      const choice = snapshot.repairs?.find(choice => choice.issue === index);
      if (choice?.allowed) this.button(card, `Prepare individual repair ${index + 1}`, () => {
        this.changed(); fields.replaceChildren(); add(fields, "p", `${issue.path}: ${issue.message}`);
        const input = issue.dateKey ? this.input(fields, "Correct recorded date", "", 10, true) : this.select(fields, "Recognized replacement heading", choice.replacements.map(value => [value, value]));
        const heading = issue.dateKey ? null : this.select(fields, "Heading to rename", choice.headings.map(value => [String(value.at), value.heading]));
        this.button(fields, "Preview individual repair", () => this.prepare(snapshot, { kind: "repair", issue: index, value: input.value, headingAt: heading ? Number(heading.value) : null }), true).className = "thread-primary"; this.setBusy(false); input.focus(); form.scrollIntoView({ block: "center" });
      });
    }
    this.limits(area, report.limits);
  }
  private generation(parent: HTMLElement, snapshot: DesktopReviewSnapshot, label: string, input: () => ReviewGeneration): void {
    this.button(parent, `Generate ${label}`, () => { const request = input(); this.changed(); void this.run(async (access, current) => { this.message("Generating locally from current evidence..."); const draft = value(await this.bridge.generateReview(snapshot.id, request, access.revision)); if (!current()) return; this.draft = draft; this.showDraft(draft); this.message("Draft ready. Inspect current sources and exact text, then preview before saving."); }); }, true);
    const preview = this.button(parent, `Preview ${label} note`, () => { const draft = this.draft; if (!draft) return; void this.run(async (access, current) => { this.message("Preparing the exact generated note..."); value(await this.bridge.prepareReviewDraft(draft.id, access.revision)); if (current()) this.review(); }); }, true); preview.dataset.needsDraft = "true"; preview.className = "thread-primary";
    add(parent, "div").id = "review-draft";
  }
  private freshness(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const outputs = snapshot.outputs!; add(area, "p", `${outputs.length} indexed saved outputs. Refreshing creates a separate version from current sources; the original is preserved.`, "thread-muted");
    for (const output of outputs) { const card = add(area, "article", "", "thread-record-card thread-review-card"); add(card, "span", output.state, "thread-record-status"); this.chip(card, output); add(card, "p", output.reason); for (const ref of output.references) { add(card, "p", `${ref.state}: ${ref.reason}`, "thread-muted"); if (ref.path && ref.hash) this.chip(card, { path: ref.path, hash: ref.hash }, ref.heading); } }
    if (!outputs.length) return;
    const form = this.form(area, "Create a refreshed version"), original = this.select(form, "Original output", outputs.map(source => [source.path, source.path])), name = this.input(form, "Refreshed note name", `${localDay()} Refreshed`, 100), sources = this.select(form, "Current replacement sources", snapshot.sources.map(source => [source.path, source.path]));
    sources.multiple = true; sources.size = 6; for (const option of sources.options) option.selected = false;
    add(form, "p", "Explicitly select one to five current notes with Ctrl or Shift. The original output is not model evidence. Unsupported or stale selections are refused. The mapped Reviews folder must already be readable and writable.", "thread-muted");
    this.generation(form, snapshot, "refreshed", () => ({ kind: "refresh", name: name.value, path: original.value, sources: [...sources.selectedOptions].map(option => option.value) }));
  }
  private weekly(area: HTMLElement, snapshot: DesktopReviewSnapshot): void {
    const form = this.form(area, "Weekly review"), scope = this.select(form, "Weekly review scope", [["project", "Selected project"], ["allowed", "All explicitly permitted notes"]]), end = this.input(form, "Week ending", localDay(), 10, true), name = this.input(form, "Weekly review note name", `${localDay()} Weekly review`, 100);
    add(form, "p", "Seven calendar days ending on the chosen date. Up to 80 recent eligible notes and bounded evidence. Activity dates are user reports; gaps remain visible. Choose all-permitted scope explicitly. Saving uses the mapped Reviews folder and refuses overwrites.", "thread-muted");
    this.generation(form, snapshot, "weekly review", () => ({ kind: "weekly", name: name.value, end: end.value, scope: scope.value as "project" | "allowed" }));
  }
  private showDraft(draft: ReviewDraft): void {
    const area = el("review-draft"); area.replaceChildren(); const card = add(area, "section", "", "thread-ai-card"); add(card, "h3", "AI review draft - notes unchanged"); add(card, "p", `${draft.model} - ${new Date(draft.generatedAt).toLocaleString()}`, "thread-muted"); add(card, "p", draft.path, "thread-path"); add(card, "p", draft.coverage, "thread-muted"); add(card, "pre", draft.markdown, "thread-exact-change").tabIndex = 0;
    const details = add(card, "details"); add(details, "summary", "Current supporting passages"); for (const source of draft.bundle.sources) { this.chip(details, { path: source.path, hash: draft.bundle.noteHashes[source.path]! }, source.heading); add(details, "p", `${source.id}: ${source.excerpt}`); }
  }
}
