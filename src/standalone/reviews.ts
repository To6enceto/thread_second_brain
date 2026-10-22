import { randomUUID } from "node:crypto";
import { defaultSettings, type ThreadSettings } from "../settings/settings.ts";
import { disposedReviewQueue, questionReviewReferences, reviewSnapshot, reviewEventMarkdown, type DisposedQueue } from "../vault/review-events.ts";
import { projectTimeline, milestoneMarkdown, type Timeline } from "../vault/timeline.ts";
import { multiProjectOverview, projectStatuses, overviewIdentity, nextActionMarkdown, type ProjectsOverview, type ProjectStatus } from "../vault/project-overview.ts";
import { healthHeadings, recognizedHeadings, inspectVaultHealth, repairHealthDate, repairHealthHeading, type HealthReport, type HealthHeading } from "../vault/health.ts";
import { questionMarkdown } from "../vault/questions.ts";
import { noteName } from "../vault/workspace.ts";
import { ANSWER_SCHEMA, answerPrompt, validateAnswer, escapeMarkdown } from "../intelligence/answer.ts";
import { WEEKLY_SCHEMA, reviewPeriod, weeklyEvidence, weeklyPrompt, validateWeekly, weeklyMarkdown } from "../vault/weekly.ts";
import { refreshedMarkdown } from "../vault/knowledge.ts";
import { buildEvidence, type EvidenceBundle, type SourceNote } from "../vault/evidence.ts";
import type { IndexEntry } from "../vault/index.ts";
import { outputProjection, type FreshState } from "../vault/freshness.ts";
import type { IndexSnapshot, ProjectRequest } from "./contracts.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { DesktopProjects } from "./projects.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import type { DesktopAI } from "./local-ai.ts";
import { catalogFingerprint } from "./catalog.ts";
import { metadata, parseMetadata } from "./metadata.ts";
import { resolveLink } from "./links.ts";
import { hashText } from "./profile.ts";
import { DesktopError, within } from "./security.ts";

export const reviewModes = ["queue", "freshness", "timeline", "overview", "health", "weekly"] as const;
export type ReviewMode = typeof reviewModes[number];
export interface ReviewRequest { selection: ProjectRequest; mode: ReviewMode; filter: ProjectStatus | "all"; }
export interface ReviewSource { path: string; hash: string; }
export interface FreshOutput extends ReviewSource {
  state: FreshState; reason: string;
  references: { state: FreshState; reason: string; path?: string; hash?: string; heading?: string }[];
}
export interface ReviewRow { item: DisposedQueue["pending"][number]["item"]; available: boolean; disposition?: "reviewed" | "snoozed"; event?: ReviewSource; }
export type ReviewQueueView = Omit<DisposedQueue, "pending" | "handled"> & { pending: ReviewRow[]; handled: ReviewRow[] };
export interface RepairChoice { issue: number; allowed: boolean; headings: HealthHeading[]; replacements: string[]; }
export type ReviewCommand =
  | { kind: "review"; row: number; action: "reviewed" | "snoozed" | "question"; name: string; reason: string; revisit: string; question: string }
  | { kind: "milestone"; name: string; title: string; detail: string; day: string }
  | { kind: "next-action"; project: string; name: string; action: string }
  | { kind: "repair"; issue: number; value: string; headingAt: number | null };
export type ReviewGeneration = { kind: "weekly"; name: string; end: string; scope: "project" | "allowed" } | { kind: "refresh"; name: string; path: string; sources: string[] };
export interface ReviewDraft { id: string; kind: "weekly" | "refresh"; path: string; markdown: string; bundle: EvidenceBundle; model: string; generatedAt: number; coverage: string; }
export interface DesktopReviewSnapshot {
  id: string; mode: ReviewMode; project: string; coverage: string; sources: ReviewSource[];
  queue?: ReviewQueueView; outputs?: FreshOutput[]; timeline?: Timeline; overview?: ProjectsOverview;
  health?: HealthReport; repairs?: RepairChoice[];
}
interface ReviewContext {
  value: DesktopReviewSnapshot; request: ReviewRequest; index: IndexSnapshot; settings: ThreadSettings;
  roles: string; entries: IndexEntry[]; queue?: DisposedQueue;
}
function fields(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) throw new DesktopError("Enter only the labeled review fields.");
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number, label: string): string {
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new DesktopError(`Enter ${label} within ${limit} characters.`);
  return value;
}

/** On-demand review snapshots. No inference, proposal or write occurs while loading. */
export class DesktopReviews {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private ai: DesktopAI;
  private generating: number | null = null;
  private draft: { context: ReviewContext; value: ReviewDraft; version: number } | null = null;
  private preparing: number | null = null;
  private epoch = 0;
  private controller: AbortController | null = null;
  private context: ReviewContext | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, storage: DesktopStorage, changes: DesktopChanges, ai: DesktopAI) {
    this.reader = reader; this.evidence = evidence; this.projects = projects; this.storage = storage; this.changes = changes; this.ai = ai;
  }
  draftChanged(): void { this.epoch++; this.controller?.abort(); this.controller = null; this.draft = null; if (this.preparing !== null) this.changes.invalidate(); if (this.generating !== null) this.ai.cancel(); }
  invalidate(): void { this.draftChanged(); this.context = null; }
  private roles(revision: unknown): string { return JSON.stringify(this.storage.status(revision).preferences.roles); }
  private async read(entry: ReviewSource, snapshot: IndexSnapshot, current: () => void, maxBytes = 1048576): Promise<string> {
    current(); const file = snapshot.listing.files[entry.path];
    if (!file || file.bytes > maxBytes) throw new DesktopError("Review source is missing or exceeds the read budget. Inspect it manually.");
    const note = await this.reader.read(entry.path, snapshot.revision, maxBytes); current();
    if (hashText(note.text) !== entry.hash) throw new DesktopError("Review source changed. Refresh the snapshot.");
    return note.text;
  }
  async load(input: unknown, revision: unknown): Promise<DesktopReviewSnapshot> {
    this.invalidate(); const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    try {
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "filter,mode,selection") throw new DesktopError("Choose a review view and current project selection.");
      const request = input as ReviewRequest;
      if (!reviewModes.includes(request.mode) || !["all", ...projectStatuses].includes(request.filter)) throw new DesktopError("Choose a supported review view and project filter.");
      const roles = this.roles(revision), home = await this.projects.home(request.selection, revision), snapshot = home.index;
      const current = (): void => {
        controller.signal.throwIfAborted();
        if (epoch !== this.epoch || roles !== this.roles(revision)) throw new DesktopError("Review request, permissions or folders changed. Refresh the view.");
        this.evidence.assertCurrent(snapshot);
      };
      current();
      if (["queue", "timeline"].includes(request.mode) && !home.home) throw new DesktopError("Choose a permitted project for its queue or timeline.");
      const settings: ThreadSettings = { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: request.selection.folder }, selectedProject: request.selection.project };
      const index = this.evidence.index, entries = index.entries, eligible = index.projectEntries(settings, null), graph = index.graph(settings);
      const value: DesktopReviewSnapshot = { id: randomUUID(), mode: request.mode, project: settings.selectedProject, sources: eligible.map(({ path, hash }) => ({ path, hash })), coverage: `${snapshot.listing.paths.length} permitted notes listed; ${snapshot.coverage.omittedFiles} omitted from the index; ${snapshot.invalid} unavailable during indexing. Dates describe records, not verified events. Unindexed content is not certified.` };
      const readQuestion = async (path: string, hash: string) => questionReviewReferences(await this.read({ path, hash }, snapshot, current), parseMetadata);
      let queue: DisposedQueue | undefined;
      if (request.mode === "queue") {
        queue = await disposedReviewQueue(index, settings, readQuestion, undefined, controller.signal); current();
        const row = (value: DisposedQueue["pending"][number]): ReviewRow => ({ item: structuredClone(value.item), available: !!value.snapshot, ...(value.disposition ? { disposition: value.disposition } : {}), ...(value.event ? { event: { path: value.event.path, hash: value.event.hash } } : {}) });
        value.queue = { ...queue, pending: queue.pending.map(row), handled: queue.handled.map(row) };
      }
      if (request.mode === "timeline") value.timeline = projectTimeline(index, settings);
      if (request.mode === "overview") {
        value.overview = await multiProjectOverview(index, settings, readQuestion, null, request.filter, controller.signal); current();
        // Desktop and plugin journals are independent; count only visible desktop targets.
        const pending = this.changes.snapshot(revision).pending;
        for (const card of value.overview.cards) card.proposal = pending?.available && pending.paths.length > 0 && pending.paths.every(path => within(path, card.path)) ? 1 : 0;
        value.overview.limits.push("Proposal counts cover only desktop pending changes whose destinations are all permitted and within that project. Plugin journals are not shared.");
      }
      if (request.mode === "freshness") value.outputs = entries.filter(entry => entry.output).map(entry => {
        const state = graph.assess(entry.path);
        return { path: entry.path, hash: entry.hash, state: state.state, reason: state.reason, references: state.references.map(ref => ref.path && snapshot.listing.files[ref.path] ? { state: ref.state, reason: ref.reason, path: ref.path, hash: ref.hash, heading: ref.ref.heading } : { state: ref.state, reason: "Supporting source unavailable in the current scope. Choose a current replacement." }) };
      });
      if (request.mode === "health") {
        const notes = new Map<string, string>();
        value.health = await inspectVaultHealth(index, settings, {
          parse: parseMetadata,
          read: async (entry, maxBytes) => { current(); if ((snapshot.listing.files[entry.path]?.bytes ?? Infinity) > maxBytes) return null; const raw = await this.read(entry, snapshot, current, maxBytes); notes.set(entry.path, raw); return raw; },
          resolve: (from, link) => { current(); const paths = resolveLink(from, link, snapshot.listing.paths).paths; return paths.length === 1 ? paths[0]! : null; }
        }, controller.signal); current();
        const roles = this.storage.status(revision).preferences.roles;
        value.repairs = value.health.issues.map((issue, i) => {
          const entry = entries.find(e => e.path === issue.path), raw = notes.get(issue.path), allowed = !!entry && raw !== undefined && (!!issue.dateKey || issue.kind === "heading") && Object.values(roles).some(folder => folder && within(issue.path, folder)) && graph.assess(issue.path).usable && (!entry.id || index.idUnambiguous(entry.id));
          return { issue: i, allowed, headings: allowed ? healthHeadings(raw!, metadata(raw!)) : [], replacements: allowed ? recognizedHeadings(entry!.metadata) : [] };
        });
      }
      await this.evidence.refresh(revision); current();
      this.context = { value, request: structuredClone(request), index: snapshot, settings, roles, entries, ...(queue ? { queue } : {}) };
      return structuredClone(value);
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") throw new DesktopError(error.message); throw error; }
    finally { if (this.controller === controller) this.controller = null; }
  }
  private active(id: unknown, revision: unknown): ReviewContext {
    const context = this.context;
    if (!context || id !== context.value.id || revision !== context.index.revision || context.roles !== this.roles(revision)) throw new DesktopError("Review snapshot, permissions or folders changed. Refresh the view.");
    this.evidence.assertCurrent(context.index); return context;
  }
  private guard(context: ReviewContext, revision: unknown, epoch: number): void {
    if (epoch !== this.epoch || this.active(context.value.id, revision) !== context) throw new DesktopError("Review request canceled or changed. Refresh the view.");
  }
  private async verify(context: ReviewContext, hashes: Record<string, string>, revision: unknown, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(revision); current();
    for (const [path, hash] of Object.entries(hashes)) await this.read({ path, hash }, context.index, current);
    await this.evidence.refresh(revision); current();
  }
  async prepare(id: unknown, input: unknown, revision: unknown) {
    const context = this.active(id, revision), epoch = ++this.epoch, current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new DesktopError("Choose an explicit review action.");
      const kind = (input as Record<string, unknown>).kind;
      const keys = kind === "review" ? ["kind", "row", "action", "name", "reason", "revisit", "question"] : kind === "milestone" ? ["kind", "name", "title", "detail", "day"] : kind === "next-action" ? ["kind", "project", "name", "action"] : kind === "repair" ? ["kind", "issue", "value", "headingAt"] : null;
      if (!keys) throw new DesktopError("Choose a supported review action.");
      const data = fields(input, keys), hashes: Record<string, string> = {};
      let path: string, after: string, before: string | null = null;
      const identity = (project: string) => {
        const value = overviewIdentity(this.evidence.index, { ...context.settings, selectedProject: project }, project);
        if (!value.id) throw new DesktopError(value.reason); Object.assign(hashes, value.hashes); return value.id;
      };
      if (kind === "review") {
        const row = context.queue?.pending[Number(data.row)];
        if (!Number.isSafeInteger(data.row) || !row?.snapshot) throw new DesktopError("Choose a current review item with a supported snapshot.");
        await this.verify(context, row.snapshot.hashes, revision, current);
        const snapshot = await reviewSnapshot(this.evidence.index, context.settings, row.item, async (path, hash) => questionReviewReferences(await this.read({ path, hash }, context.index, current), parseMetadata)); current();
        if (snapshot.key !== row.snapshot.key || snapshot.digest !== row.snapshot.digest) throw new DesktopError("Review dependencies changed. Refresh the queue.");
        Object.assign(hashes, snapshot.hashes); const project = identity(context.value.project), reason = text(data.reason, 5000, "review reason"), revisit = text(data.revisit, 10, "future revisit date"), question = text(data.question, 1000, "follow-up question");
        if (data.action === "question") {
          if (!reason.trim()) throw new DesktopError("Enter your follow-up reason.");
          after = questionMarkdown(question, project, { sources: [], truncated: false, noteHashes: {} }) + `\n## Follow-up reason\n\n${escapeMarkdown(reason.trim())}\n\n## Review origin (not supporting evidence)\n\n<!-- thread:question-evidence -->\n[${escapeMarkdown(row.item.path)}](<${encodeURI(row.item.path).replace(/#/g, "%23")}>)\nSnapshot key: ${snapshot.key}\nSnapshot digest: ${snapshot.digest}\n<!-- /thread:question-evidence -->\n`;
        } else {
          if (data.action !== "reviewed" && data.action !== "snoozed") throw new DesktopError("Choose Reviewed, a future-date revisit, or a follow-up question.");
          after = reviewEventMarkdown(project, snapshot, row.item, data.action, reason, revisit);
        }
        path = `${context.value.project}/${data.action === "question" ? "Questions" : "Reviews"}/${noteName(text(data.name, 100, "review note name"))}.md`;
      } else if (kind === "milestone") {
        if (!context.value.timeline || !context.value.project) throw new DesktopError("Refresh the selected project timeline first.");
        after = milestoneMarkdown(identity(context.value.project), text(data.title, 200, "milestone title"), text(data.detail, 5000, "milestone detail"), text(data.day, 10, "reported event date"));
        path = `${context.value.project}/Milestones/${noteName(text(data.name, 100, "milestone note name"))}.md`;
      } else if (kind === "next-action") {
        const card = context.value.overview?.cards.find(card => card.path === data.project);
        if (!card?.identity.id) throw new DesktopError("Choose a current unambiguous project from the overview.");
        after = nextActionMarkdown(identity(card.path), text(data.action, 1000, "chosen next action")); path = `${card.path}/Next actions/${noteName(text(data.name, 100, "selection note name"))}.md`;
      } else {
        const issue = context.value.health?.issues[Number(data.issue)], choice = context.value.repairs?.[Number(data.issue)];
        if (!Number.isSafeInteger(data.issue) || !issue || !choice?.allowed) throw new DesktopError("Choose an eligible individual diagnostic repair. Preserve unsupported records.");
        const entry = context.entries.find(entry => entry.path === issue.path), graph = this.evidence.index.graph(context.settings), state = graph.assess(issue.path);
        if (!entry || !state.usable || entry.id && !this.evidence.index.idUnambiguous(entry.id)) throw new DesktopError("Repair source is stale or ambiguous. Inspect it manually.");
        before = await this.read(issue, context.index, current); const value = text(data.value, 200, "explicit replacement");
        if (issue.dateKey) {
          if (data.headingAt !== null) throw new DesktopError("Choose only the invalid date correction.");
          after = repairHealthDate(before, issue.dateKey, value, parseMetadata);
        } else {
          if (!Number.isSafeInteger(data.headingAt) || !choice.headings.some(h => h.at === data.headingAt)) throw new DesktopError("Choose an existing eligible heading.");
          after = repairHealthHeading(before, data.headingAt as number, value, parseMetadata);
        }
        metadata(after); path = issue.path; Object.assign(hashes, state.dependencies, { [path]: issue.hash });
      }
      await this.verify(context, hashes, revision, current);
      const sources = Object.entries(hashes).filter(([source]) => source !== path).map(([path, hash]) => ({ path, hash }));
      current(); return await this.changes.propose([{ path, before, after }], sources, revision, catalogFingerprint(context.index.listing, [path]));
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.preparing === epoch) this.preparing = null; }
  }
  private async bundle(context: ReviewContext, entries: IndexEntry[], revision: unknown, current: () => void): Promise<EvidenceBundle> {
    const notes: SourceNote[] = [], hashes: Record<string, string> = {}, graph = this.evidence.index.graph(context.settings);
    for (const entry of entries) {
      current(); const state = graph.assess(entry.path);
      if (!state.usable || entry.id && !this.evidence.index.idUnambiguous(entry.id)) throw new DesktopError("Selected evidence is stale or ambiguous. Choose current original notes.");
      const raw = await this.read(entry, context.index, current);
      notes.push({ path: entry.path, text: outputProjection(raw, entry.metadata).text, metadata: entry.metadata, modifiedAt: entry.modifiedAt, fullHash: entry.hash });
      Object.assign(hashes, state.dependencies, { [entry.path]: entry.hash });
    }
    await this.verify(context, hashes, revision, current); const bundle = await buildEvidence(notes); current(); bundle.noteHashes = { ...bundle.noteHashes, ...hashes }; return bundle;
  }
  async generate(id: unknown, input: unknown, revision: unknown): Promise<ReviewDraft> {
    const context = this.active(id, revision); this.draftChanged(); const epoch = this.epoch, version = this.ai.version; this.generating = epoch;
    try { return await this.ai.run(async (settings, signal, currentAI, client) => {
      const current = (): void => { currentAI(); this.guard(context, revision, epoch); if (this.ai.version !== version) throw new DesktopError("Model changed. Generate the review again."); };
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new DesktopError("Choose a local review generation mode.");
      const kind = (input as Record<string, unknown>).kind;
      if (kind !== "weekly" && kind !== "refresh") throw new DesktopError("Choose Weekly review or Refreshed version.");
      const data = fields(input, kind === "weekly" ? ["kind", "name", "end", "scope"] : ["kind", "name", "path", "sources"]), name = noteName(text(data.name, 100, "new review note name")), folder = this.storage.status(revision).preferences.roles.reviews;
      if (!folder) throw new DesktopError("Map a Reviews folder and explicitly grant its read access before saving a review.");
      if (!settings.model) throw new DesktopError("Apply a downloaded local text model. Recorded review views remain available without AI.");
      const journal = this.storage.changeState(revision); if (journal.pending || journal.recovery) throw new DesktopError("Review pending changes or resolve recovery before generating another review draft.");
      const path = `${folder}/${name}.md`; let bundle: EvidenceBundle, markdown: string;
      const anchors: Record<string, string> = {}; let project = "";
      if (kind === "weekly") {
        if (data.scope !== "project" && data.scope !== "allowed") throw new DesktopError("Choose selected project or explicitly all permitted notes.");
        const period = reviewPeriod(text(data.end, 10, "review end date"));
        if (data.scope === "project") {
          if (!context.value.project) throw new DesktopError("Select a permitted project or explicitly choose all permitted notes.");
          const identity = overviewIdentity(this.evidence.index, context.settings, context.value.project);
          if (!identity.id) throw new DesktopError(identity.reason); project = identity.id; Object.assign(anchors, identity.hashes);
        }
        const entries = this.evidence.index.projectEntries(context.settings, data.scope === "project" ? context.value.project : null).sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
        bundle = weeklyEvidence(await this.bundle(context, entries.slice(0, 80), revision, current), period); Object.assign(bundle.noteHashes, anchors);
        if (!bundle.sources.length) throw new DesktopError("No usable evidence on or before the review end date. Choose another period or explicit scope.");
        const verify = () => this.verify(context, bundle.noteHashes, revision, current); await verify();
        const raw = await client(verify).generate(settings.model, weeklyPrompt(bundle, period), signal, WEEKLY_SCHEMA); current();
        const result = validateWeekly(raw, bundle, period); if (entries.length > 80) result.gaps.push("Only the 80 most recently modified eligible notes were considered.");
        markdown = weeklyMarkdown(result, bundle, period, settings.model, project); await verify();
      } else {
        const original = context.value.outputs?.find(output => output.path === data.path), eligible = this.evidence.index.projectEntries(context.settings, null);
        if (!original) throw new DesktopError("Refresh Source freshness and choose an output from that snapshot.");
        if (!Array.isArray(data.sources) || !data.sources.length || data.sources.length > 5 || new Set(data.sources).size !== data.sources.length || data.sources.some(path => typeof path !== "string" || path === original.path || !eligible.some(entry => entry.path === path))) throw new DesktopError("Choose one to five distinct current sources, separate from the original output.");
        const entry = context.entries.find(entry => entry.path === original.path)!;
        project = entry.metadata.project === undefined ? "" : text(entry.metadata.project, 4096, "original project association");
        bundle = await this.bundle(context, data.sources.map(path => eligible.find(entry => entry.path === path)!), revision, current); bundle.noteHashes[original.path] = original.hash;
        if (!bundle.sources.length) throw new DesktopError("No usable passages in the chosen sources.");
        const verify = () => this.verify(context, bundle.noteHashes, revision, current); await verify();
        const raw = await client(verify).generate(settings.model, answerPrompt(`Synthesize current evidence for ${name}. Preserve uncertainty and distinguish facts, interpretations and suggestions.`, bundle), signal, ANSWER_SCHEMA); current();
        const result = validateAnswer(raw, bundle); if (!result.supported) throw new DesktopError(result.gaps.join(" "));
        markdown = refreshedMarkdown(name, result, bundle, settings.model, original.path, project); await verify();
      }
      metadata(markdown); current();
      const value: ReviewDraft = { id: randomUUID(), kind, path, markdown, bundle, model: settings.model, generatedAt: Date.now(), coverage: context.value.coverage };
      this.draft = { context, value, version }; return structuredClone(value);
    }); } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.generating === epoch) this.generating = null; }
  }
  async prepareDraft(id: unknown, revision: unknown) {
    const draft = this.draft;
    if (!draft || id !== draft.value.id || draft.version !== this.ai.version) throw new DesktopError("Review draft changed. Generate it again before previewing.");
    const { context, value } = draft, epoch = ++this.epoch, current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      await this.verify(context, value.bundle.noteHashes, revision, current); current();
      return await this.changes.propose([{ path: value.path, before: null, after: value.markdown }], Object.entries(value.bundle.noteHashes).map(([path, hash]) => ({ path, hash })), revision, catalogFingerprint(context.index.listing, [value.path]));
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
