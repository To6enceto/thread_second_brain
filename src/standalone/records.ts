import { randomUUID } from "node:crypto";
import { ANSWER_SCHEMA, answerPrompt, validateAnswer, type Answer } from "../intelligence/answer.ts";
import { decisionComparison, decisionReviewBlock, reviewObservations, supersededStatus } from "../vault/decision-review.ts";
import type { DesktopAI } from "./local-ai.ts";
import { decisionMarkdown, type DecisionInput } from "../vault/decision.ts";
import { questionMarkdown, questionRecord, updateQuestion, type QuestionUpdate } from "../vault/questions.ts";
import { buildEvidence, type EvidenceBundle, type SourceNote } from "../vault/evidence.ts";
import { identityFromIndex, type IndexEntry } from "../vault/index.ts";
import { outputProjection } from "../vault/freshness.ts";
import { noteName } from "../vault/workspace.ts";
import type { IndexSnapshot, ProjectRequest } from "./contracts.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { DesktopProjects } from "./projects.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import type { VaultReader } from "./vault-reader.ts";
import { hashText } from "./profile.ts";
import { metadata } from "./metadata.ts";
import { DesktopError } from "./security.ts";
import { defaultSettings } from "../settings/settings.ts";
import { actionSnapshot, chosenActionContext, type ActionSnapshot } from "../vault/action-board.ts";
import { actionMarkdown, actionStates, newAction, readAction, transitionAction, type ActionState } from "../vault/action-record.ts";
import { parseMetadata } from "./metadata.ts";
import { SESSION_SCHEMA, sessionPrompt, validateSession, sessionMarkdown } from "../vault/session.ts";

export interface RecordChoice { path: string; hash: string; status: string; }
export interface LegacyQuestion { path: string; hash: string; heading: string; text: string; }
export interface RecordsSnapshot {
  id: string; project: string; decisions: RecordChoice[]; questions: RecordChoice[];
  evidence: RecordChoice[]; legacy: LegacyQuestion[]; coverage: string;
}
export type RecordCommand =
  | { kind: "decision"; name: string; decision: DecisionInput; sources: string[] }
  | { kind: "question"; name: string; question: string; day: string; sources: string[]; legacy: number | null }
  | { kind: "question-update"; path: string; update: QuestionUpdate; sources: string[] }
  | { kind: "decision-review"; assessment: string; action: "retain" | "annotate" | "supersede"; reason: string; name: string; replacement: DecisionInput };
export interface DecisionAssessment { id: string; path: string; answer: Answer; bundle: EvidenceBundle; model: string; generatedAt: number; }
export interface ActionsSnapshot { id: string; project: string; actions: ActionSnapshot; evidence: RecordChoice[]; coverage: string; }
export type ActionCommand =
  | { kind: "new"; name: string; title: string; reason: string; day: string; sources: string[] }
  | { kind: "transition"; path: string; state: ActionState; reason: string; day: string; sources: string[] };
export interface SessionInput { name: string; report: string; actions: string[]; }
export interface SessionDraft { id: string; path: string; markdown: string; bundle: EvidenceBundle; actionCount: number; model: string; generatedAt: number; }
interface RecordContext { value: RecordsSnapshot; selection: ProjectRequest; index: IndexSnapshot; roles: string; identity: string; entries: IndexEntry[]; records: IndexEntry[]; anchors: Record<string, string>; }

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) throw new DesktopError("Invalid record fields. Refresh records and enter the labeled fields.");
  return value as Record<string, unknown>;
}
function string(value: unknown, limit: number, label: string): string {
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new DesktopError(`Enter ${label} within ${limit} characters.`);
  return value;
}
function decision(value: unknown): DecisionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Enter the labeled decision fields.");
  const data = object({ revisitOn: "", ...value }, ["question", "choice", "alternatives", "rationale", "constraints", "revisit", "status", "date", "revisitOn"]);
  for (const [key, value] of Object.entries(data)) string(value, 5000, key);
  if (data.status !== "proposed" && data.status !== "accepted") throw new DesktopError("Choose Proposed or explicitly Accepted.");
  return data as unknown as DecisionInput;
}
function questionUpdate(value: unknown): QuestionUpdate {
  const data = object(value, ["status", "answer", "reason", "day"]);
  for (const [key, value] of Object.entries(data)) string(value, 5000, key);
  if (data.status !== "open" && data.status !== "investigating" && data.status !== "answered") throw new DesktopError("Choose an explicit question state.");
  return data as unknown as QuestionUpdate;
}

function formatRecord<T>(work: () => T): T {
  try { return work(); } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
}

/** Main owns record identities, current source bytes and proposal operations. */
export class DesktopRecords {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private context: RecordContext | null = null;
  private epoch = 0;
  private ai: DesktopAI;
  private preparing: number | null = null;
  private assessing: number | null = null;
  private actions: { context: RecordContext; value: ActionSnapshot } | null = null;
  private session: { context: RecordContext; value: SessionDraft; version: number } | null = null;
  private assessment: { value: DecisionAssessment; context: RecordContext; before: string; status: unknown; version: number } | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, storage: DesktopStorage, changes: DesktopChanges, ai: DesktopAI) {
    this.reader = reader; this.evidence = evidence; this.projects = projects; this.storage = storage; this.changes = changes; this.ai = ai;
  }
  invalidate(): void { this.context = null; this.actions = null; this.draftChanged(false); }
  draftChanged(keepAssessment: unknown): void {
    if (typeof keepAssessment !== "boolean") throw new DesktopError("Invalid record draft update.");
    this.epoch++; this.session = null; if (this.assessing !== null) this.ai.cancel(); if (this.preparing !== null) this.changes.invalidate(); if (!keepAssessment) this.assessment = null;
  }
  private roles(revision: unknown): string { return JSON.stringify(this.storage.status(revision).preferences.roles); }
  async load(selection: unknown, revision: unknown): Promise<RecordsSnapshot> {
    this.invalidate(); const epoch = this.epoch;
    const home = await this.projects.home(selection, revision);
    if (epoch !== this.epoch) throw new DesktopError("Records changed while loading. Refresh records.");
    if (!home.home) throw new DesktopError("Choose a permitted project before opening records.");
    this.evidence.assertCurrent(home.index);
    const project = home.home.project, index = this.evidence.index, scope = this.evidence.scope();
    const identity = formatRecord(() => identityFromIndex(index.entries, project, index.ready, index.identityComplete));
    if (identity !== project && !index.idUnambiguous(identity)) throw new DesktopError("Project identity is ambiguous. Resolve duplicate IDs before recording changes.");
    const entries = index.projectEntries(scope, null), records = index.projectRecords(scope, project);
    const choice = (entry: IndexEntry): RecordChoice => ({ path: entry.path, hash: entry.hash, status: typeof entry.metadata.status === "string" ? entry.metadata.status : "unknown" });
    const legacy = index.projectEntries(scope, project).filter(e => e.metadata.type !== "question").flatMap(entry => entry.chunks.filter(c => /^(?:open|unresolved) questions?$/i.test(c.heading.trim())).map(c => ({ path: entry.path, hash: entry.hash, heading: c.heading, text: c.excerpt.slice(0, 1000) }))).slice(0, 100);
    const value: RecordsSnapshot = { id: randomUUID(), project, decisions: records.filter(e => e.metadata.type === "decision").map(choice), questions: records.filter(e => e.metadata.type === "question").map(choice), evidence: entries.map(choice), legacy,
      coverage: `${home.index.listing.paths.length} permitted notes listed; ${home.index.coverage.omittedFiles} omitted from the index. Up to 100 legacy sections shown. Evidence context is bounded to 16000 characters; dates describe records, not verified events.` };
    const anchors = Object.fromEntries(index.entries.filter(e => e.path.slice(0, e.path.lastIndexOf("/")) === project && (e.metadata.type === "project" || /(?:^|\/)overview\.md$/i.test(e.path))).map(e => [e.path, e.hash]));
    this.context = { value, selection: structuredClone(selection as ProjectRequest), index: home.index, roles: this.roles(revision), identity, entries: structuredClone(entries), records: structuredClone(records), anchors };
    return structuredClone(value);
  }
  private active(id: unknown, revision: unknown): RecordContext {
    const context = this.context;
    if (!context || id !== context.value.id || revision !== context.index.revision || context.roles !== this.roles(revision)) throw new DesktopError("Records, access or folder preferences changed. Refresh records.");
    this.evidence.assertCurrent(context.index); return context;
  }
  private guard(context: RecordContext, revision: unknown, epoch: number): void {
    if (epoch !== this.epoch || this.active(context.value.id, revision) !== context) throw new DesktopError("Record request canceled or changed. Refresh records.");
  }
  private async verify(context: RecordContext, hashes: Record<string, string>, revision: unknown, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(revision); current(); this.evidence.assertCurrent(context.index);
    for (const [path, hash] of Object.entries(hashes)) {
      const file = context.index.listing.files[path];
      if (!file || hashText((await this.reader.read(path, revision, file.bytes)).text) !== hash) throw new DesktopError("Record evidence changed. Refresh records and select current sources.");
      current();
    }
    await this.evidence.refresh(revision); current(); this.evidence.assertCurrent(context.index);
  }
  private paths(value: unknown, context: RecordContext, limit: number): string[] {
    if (!Array.isArray(value) || value.length > limit || value.some(path => typeof path !== "string" || !context.entries.some(entry => entry.path === path)) || new Set(value).size !== value.length) throw new DesktopError(`Choose up to ${limit} distinct current evidence notes.`);
    return value as string[];
  }
  private async bundle(context: RecordContext, paths: string[], revision: unknown, current: () => void): Promise<EvidenceBundle> {
    const notes: SourceNote[] = [], graph = this.evidence.index.graph(this.evidence.scope()), hashes = { ...context.anchors };
    for (const path of paths) {
      const entry = context.entries.find(e => e.path === path)!; current();
      const state = graph.assess(path); if (!state.usable) throw new DesktopError("Selected derived evidence is stale. Choose current original sources.");
      Object.assign(hashes, state.dependencies, { [path]: entry.hash });
      const note = await this.reader.read(path, revision, context.index.listing.files[path]!.bytes); current();
      if (hashText(note.text) !== entry.hash) throw new DesktopError("Selected source changed. Refresh records.");
      notes.push({ ...note, text: outputProjection(note.text, entry.metadata).text, metadata: entry.metadata, fullHash: entry.hash });
    }
    await this.verify(context, hashes, revision, current);
    const bundle = await buildEvidence(notes); current(); bundle.noteHashes = { ...bundle.noteHashes, ...hashes }; return bundle;
  }
  private async target(context: RecordContext, path: unknown, type: "decision" | "question" | "action", revision: unknown, current: () => void) {
    const entry = context.records.find(entry => entry.path === path && entry.metadata.type === type);
    if (!entry) throw new DesktopError(`Choose a current project ${type}.`);
    const note = await this.reader.read(entry.path, revision, 1048576); current();
    if (hashText(note.text) !== entry.hash) throw new DesktopError("The selected record changed. Refresh records.");
    return { entry, before: note.text, metadata: metadata(note.text) };
  }
  async loadActions(selection: unknown, revision: unknown): Promise<ActionsSnapshot> {
    const records = await this.load(selection, revision), context = this.active(records.id, revision), epoch = this.epoch;
    const current = () => this.guard(context, revision, epoch);
    const settings = { ...defaultSettings(), ...this.evidence.scope(), selectedProject: records.project, roles: this.storage.status(revision).preferences.roles };
    const actions = await actionSnapshot(this.evidence.index, settings, {
      read: async path => { current(); const note = await this.reader.read(path, revision, 1048576); current(); return note.text; },
      parse: parseMetadata, current: () => { current(); return true; },
      verify: async bundle => { await this.verify(context, bundle.noteHashes, revision, current); return true; }
    }, new AbortController().signal);
    current();
    if (actions.identity !== context.identity) throw new DesktopError("Project identity changed. Refresh actions.");
    this.actions = { context, value: actions };
    return { id: records.id, project: records.project, actions: structuredClone(actions), evidence: records.evidence.filter(e => context.entries.find(entry => entry.path === e.path)?.metadata.type !== "action"), coverage: records.coverage };
  }
  private activeActions(id: unknown, revision: unknown) {
    const context = this.active(id, revision), actions = this.actions;
    if (!actions || actions.context !== context) throw new DesktopError("Action records changed. Refresh the board.");
    return actions;
  }
  async prepareAction(id: unknown, input: unknown, revision: unknown) {
    const { context, value: actions } = this.activeActions(id, revision), epoch = ++this.epoch;
    const current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new DesktopError("Choose an explicit action operation.");
      const kind = (input as Record<string, unknown>).kind;
      if (kind !== "new" && kind !== "transition") throw new DesktopError("Choose Create Planned action or Record a state transition.");
      const data = object(input, kind === "new" ? ["kind", "name", "title", "reason", "day", "sources"] : ["kind", "path", "state", "reason", "day", "sources"]);
      const paths = this.paths(data.sources, context, 4), reason = string(data.reason, 2000, "action reason"), day = string(data.day, 10, "reported action date");
      for (const path of paths) {
        const entry = context.entries.find(e => e.path === path)!;
        if (entry.metadata.type === "action" || entry.id && !this.evidence.index.idUnambiguous(entry.id)) throw new DesktopError("Choose current, unambiguous non-action supporting notes.");
        if (entry.metadata.type === "question") formatRecord(() => questionRecord(entry.metadata));
      }
      const bundle = await this.bundle(context, paths, revision, current);
      let operation: { path: string; before: string | null; after: string };
      if (kind === "new") {
        const name = formatRecord(() => noteName(string(data.name, 100, "action note name")));
        const after = formatRecord(() => actionMarkdown(newAction(context.identity, string(data.title, 200, "action title"), reason, day, bundle)));
        operation = { path: `${context.value.project}/Actions/${name}.md`, before: null, after };
      } else {
        const card = actions.cards.find(c => c.path === data.path);
        if (!card) throw new DesktopError("Choose a current supported action from the board. Unavailable records stay preserved.");
        if (typeof data.state !== "string" || !actionStates.includes(data.state as ActionState)) throw new DesktopError("Choose an explicit recorded action state.");
        const target = await this.target(context, data.path, "action", revision, current), record = formatRecord(() => readAction(target.before, target.metadata));
        const freshness = this.evidence.index.graph(this.evidence.scope()).assess(target.entry.path);
        if (!freshness.usable || record.project !== context.identity || !this.evidence.index.idUnambiguous(record.id)) throw new DesktopError("Action identity or support is unavailable. Refresh and inspect the original.");
        Object.assign(bundle.noteHashes, freshness.dependencies, { [target.entry.path]: target.entry.hash });
        operation = { path: target.entry.path, before: target.before, after: formatRecord(() => transitionAction(target.before, target.metadata, data.state as ActionState, reason, day, bundle)) };
      }
      formatRecord(() => readAction(operation.after, metadata(operation.after)));
      await this.verify(context, bundle.noteHashes, revision, current);
      const sources = Object.entries(bundle.noteHashes).filter(([path]) => path !== operation.path).map(([path, hash]) => ({ path, hash }));
      current(); return await this.changes.propose([operation], sources, revision);
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
  async generateSession(id: unknown, input: unknown, revision: unknown): Promise<SessionDraft> {
    const { context, value: actions } = this.activeActions(id, revision);
    this.draftChanged(false); const epoch = this.epoch, version = this.ai.version; this.assessing = epoch;
    try { return await this.ai.run(async (settings, signal, currentAI, client) => {
      const current = (): void => { currentAI(); this.guard(context, revision, epoch); if (version !== this.ai.version) throw new DesktopError("Model changed. Generate the session again."); };
      const data = object(input, ["name", "report", "actions"]), name = formatRecord(() => noteName(string(data.name, 100, "session note name"))), report = string(data.report, 5000, "reported progress");
      if (!Array.isArray(data.actions) || data.actions.length > 5 || data.actions.some(p => typeof p !== "string" || !actions.cards.some(c => c.path === p)) || new Set(data.actions).size !== data.actions.length) throw new DesktopError("Select at most five distinct current action reports, or leave the selection empty.");
      if (!settings.model) throw new DesktopError("Apply a downloaded local text model before generating a session. Manual actions remain available.");
      current(); const general = await this.projects.resume(context.selection, revision); current();
      const chosen = formatRecord(() => chosenActionContext(actions, data.actions as string[], general.bundle)), bundle = chosen.bundle;
      Object.assign(bundle.noteHashes, context.anchors);
      const graph = this.evidence.index.graph(this.evidence.scope());
      for (const card of chosen.cards) { const state = graph.assess(card.path); if (!state.usable) throw new DesktopError("Selected action support is stale. Refresh the board."); Object.assign(bundle.noteHashes, state.dependencies); }
      if (!bundle.sources.length) throw new DesktopError("Add current project notes or select action reports before generating a sourced session.");
      const verify = () => this.verify(context, bundle.noteHashes, revision, current); await verify();
      const raw = await client(verify).generate(settings.model, sessionPrompt(bundle), signal, SESSION_SCHEMA); current();
      const result = formatRecord(() => validateSession(raw, bundle)); await verify();
      const value: SessionDraft = { id: randomUUID(), path: `${context.value.project}/Sessions/${name}.md`, markdown: formatRecord(() => sessionMarkdown(report, result, bundle, settings.model, context.identity, chosen.cards)), bundle, actionCount: chosen.cards.length, model: settings.model, generatedAt: Date.now() };
      this.session = { context, value, version }; return structuredClone(value);
    }); } finally { if (this.assessing === epoch) this.assessing = null; }
  }
  async prepareSession(id: unknown, revision: unknown) {
    const session = this.session;
    if (!session || id !== session.value.id || session.version !== this.ai.version) throw new DesktopError("Session draft changed. Generate it again before previewing.");
    const { context, value } = session, epoch = ++this.epoch, current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      await this.verify(context, value.bundle.noteHashes, revision, current);
      current(); return await this.changes.propose([{ path: value.path, before: null, after: value.markdown }], Object.entries(value.bundle.noteHashes).map(([path, hash]) => ({ path, hash })), revision);
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
  async assess(id: unknown, path: unknown, selected: unknown, revision: unknown): Promise<DecisionAssessment> {
    const context = this.active(id, revision); this.draftChanged(false); const epoch = this.epoch, version = this.ai.version;
    this.assessing = epoch;
    try { return await this.ai.run(async (settings, signal, currentAI, client) => {
      const current = (): void => { currentAI(); this.guard(context, revision, epoch); if (version !== this.ai.version) throw new DesktopError("Model changed. Assess again."); };
      if (!settings.model) throw new DesktopError("Apply a downloaded local text model before assessment. Manual decisions and questions remain available.");
      const target = await this.target(context, path, "decision", revision, current), paths = this.paths(selected, context, 4);
      if (target.metadata.status !== "accepted" && target.metadata.status !== "proposed") throw new DesktopError("Choose an accepted or proposed decision. Superseded and unsupported records remain preserved.");
      if (!paths.length || paths.includes(target.entry.path)) throw new DesktopError("Choose one to four evidence notes separately from the decision.");
      if (!context.entries.some(e => e.path === target.entry.path)) throw new DesktopError("Decision evidence is unavailable. Inspect its freshness and original sources.");
      const bundle = decisionComparison(await this.bundle(context, [target.entry.path, ...paths], revision, current), target.entry.path);
      if (!bundle.sources.some(s => s.path === target.entry.path) || !bundle.sources.some(s => s.path !== target.entry.path)) throw new DesktopError("The bounded context must include both decision and evidence. Choose smaller notes.");
      const verify = () => this.verify(context, bundle.noteHashes, revision, current);
      await verify();
      const raw = await client(verify).generate(settings.model, answerPrompt("Does the selected later evidence support revisiting this decision, and which constraints remain? Explain the specific tension and uncertainty.", bundle), signal, ANSWER_SCHEMA);
      current(); const answer = reviewObservations(validateAnswer(raw, bundle), bundle, target.entry.path); await verify();
      const value: DecisionAssessment = { id: randomUUID(), path: target.entry.path, answer, bundle, model: settings.model, generatedAt: Date.now() };
      this.assessment = { value, context, before: target.before, status: target.metadata.status, version }; return structuredClone(value);
    }); } finally { if (this.assessing === epoch) this.assessing = null; }
  }
  async prepare(id: unknown, input: unknown, revision: unknown) {
    const context = this.active(id, revision), epoch = ++this.epoch, current = () => this.guard(context, revision, epoch);
    this.preparing = epoch;
    try {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new DesktopError("Choose a record action.");
      const kind = (input as Record<string, unknown>).kind;
      let operations: { path: string; before: string | null; after: string }[], bundle: EvidenceBundle;
      if (kind === "decision") {
        const data = object(input, ["kind", "name", "decision", "sources"]), fields = decision(data.decision);
        bundle = await this.bundle(context, this.paths(data.sources, context, 10), revision, current);
        operations = [{ path: `${context.value.project}/Decisions/${formatRecord(() => noteName(string(data.name, 100, "note name")))}.md`, before: null, after: formatRecord(() => decisionMarkdown(fields, context.identity, bundle)) }];
      } else if (kind === "question") {
        const data = object(input, ["kind", "name", "question", "day", "sources", "legacy"]), paths = this.paths(data.sources, context, 4);
        if (data.legacy !== null) {
          if (!Number.isInteger(data.legacy) || (data.legacy as number) < 0 || !context.value.legacy[data.legacy as number]) throw new DesktopError("Choose a current legacy section or no copy.");
          const source = context.value.legacy[data.legacy as number]!; if (!paths.includes(source.path)) paths.push(source.path);
        }
        bundle = await this.bundle(context, paths, revision, current);
        operations = [{ path: `${context.value.project}/Questions/${formatRecord(() => noteName(string(data.name, 100, "note name")))}.md`, before: null, after: formatRecord(() => questionMarkdown(string(data.question, 1000, "question"), context.identity, bundle, string(data.day, 10, "event date"))) }];
      } else if (kind === "question-update") {
        const data = object(input, ["kind", "path", "update", "sources"]), fields = questionUpdate(data.update);
        const target = await this.target(context, data.path, "question", revision, current), record = formatRecord(() => questionRecord(target.metadata));
        if (typeof target.metadata.status !== "string" || !this.evidence.index.idUnambiguous(record.id)) throw new DesktopError("Question identity/status is ambiguous or coverage incomplete. Preserve it and resolve its metadata first.");
        const paths = this.paths(data.sources, context, 4);
        if (paths.includes(target.entry.path)) throw new DesktopError("Choose supporting evidence separately from the updated question.");
        bundle = await this.bundle(context, paths, revision, current); bundle.noteHashes[target.entry.path] = target.entry.hash;
        operations = [{ path: target.entry.path, before: target.before, after: formatRecord(() => updateQuestion(target.before, target.metadata, fields, bundle)) }];
      } else if (kind === "decision-review") {
        const data = object(input, ["kind", "assessment", "action", "reason", "name", "replacement"]), assessed = this.assessment;
        if (!assessed || data.assessment !== assessed.value.id || assessed.context !== context || assessed.version !== this.ai.version) throw new DesktopError("Decision assessment changed. Assess current evidence again.");
        if (data.action !== "retain" && data.action !== "annotate" && data.action !== "supersede") throw new DesktopError("Choose Retain, Annotate or explicitly Supersede.");
        const reason = string(data.reason, 5000, "review reasoning"), { path } = assessed.value;
        bundle = assessed.value.bundle; operations = []; let original = assessed.before, replacement = "";
        if (data.action === "supersede") {
          const fields = decision(data.replacement);
          if (fields.status !== "accepted") throw new DesktopError("Explicitly accept the replacement before superseding.");
          original = formatRecord(() => supersededStatus(original, assessed.status));
          if (metadata(original).status !== "superseded") throw new DesktopError("Status needs manual normalization before supersession.");
          replacement = `${context.value.project}/Decisions/${formatRecord(() => noteName(string(data.name, 100, "replacement name")))}.md`;
          if (replacement === path) throw new DesktopError("Choose a distinct replacement name. The original must remain.");
          operations.push({ path: replacement, before: null, after: formatRecord(() => decisionMarkdown(fields, context.identity, bundle)) });
        }
        const action = data.action;
        operations.push({ path, before: assessed.before, after: original + formatRecord(() => decisionReviewBlock(action, reason, assessed.value.answer, bundle, replacement)) });
      } else throw new DesktopError("Choose a supported record action.");
      await this.verify(context, bundle.noteHashes, revision, current);
      const sources = Object.entries(bundle.noteHashes).filter(([path]) => !operations.some(op => op.path === path)).map(([path, hash]) => ({ path, hash }));
      current(); return await this.changes.propose(operations, sources, revision);
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
