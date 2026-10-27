import { randomUUID } from "node:crypto";
import { captureCollection, collectionMarkdown, readCollection, resolveCollection, collectionCandidates, type CollectionRecord, type CollectionRow } from "../vault/collection-record.ts";
import { overviewIdentity } from "../vault/project-overview.ts";
import { defaultSettings, type ThreadSettings } from "../settings/settings.ts";
import { noteName } from "../vault/workspace.ts";
import type { EvidenceChoice } from "../vault/workbench.ts";
import type { IndexEntry } from "../vault/index.ts";
import type { IndexSnapshot, ProjectRequest, AskRequest } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { DesktopProjects } from "./projects.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import type { DesktopAsk } from "./ask.ts";
import { metadata } from "./metadata.ts";
import { hashText } from "./profile.ts";
import { catalogFingerprint } from "./catalog.ts";
import { DesktopError } from "./security.ts";

export interface CollectionsSnapshot { id: string; scope: "project" | "allowed"; project: string; items: { path: string; hash: string; title: string }[]; coverage: string; }
export interface CollectionReview { id: string; title: string; path: string; hash: string; rows: CollectionRow[]; coverage: string; }
interface Context { value: CollectionsSnapshot; index: IndexSnapshot; selection: ProjectRequest; settings: ThreadSettings; roles: string; entries: IndexEntry[]; identity: string; anchors: Record<string, string>; }
function object(input: unknown): Record<string, unknown> { if (!input || typeof input !== "object" || Array.isArray(input)) throw new DesktopError("Use current collection controls."); return input as Record<string, unknown>; }
function title(input: unknown): string { if (typeof input !== "string" || input.length > 100 || noteName(input) !== input) throw new DesktopError("Enter a new collection name of 1-100 characters."); return input; }

/** Only references persist. Every reopen resolves current permitted source bytes anew. */
export class DesktopCollections {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private ask: DesktopAsk;
  private context: Context | null = null;
  private reviewed: { value: CollectionReview; hashes: Record<string, string> } | null = null;
  private epoch = 0;
  private preparing: number | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, storage: DesktopStorage, changes: DesktopChanges, ask: DesktopAsk) { this.reader = reader; this.evidence = evidence; this.projects = projects; this.storage = storage; this.changes = changes; this.ask = ask; }
  draftChanged(): void { this.epoch++; if (this.preparing !== null) this.changes.invalidate(); }
  invalidate(): void { this.draftChanged(); this.context = null; this.reviewed = null; }
  private roles(revision: unknown): string { return JSON.stringify(this.storage.status(revision).preferences.roles); }
  private active(id: unknown, revision: unknown): Context {
    const context = this.context; if (!context || context.value.id !== id || context.index.revision !== revision || context.roles !== this.roles(revision)) throw new DesktopError("Collection context or folders changed. Refresh it."); this.evidence.assertCurrent(context.index); return context;
  }
  private guard(context: Context, epoch: number, revision: unknown): void { if (epoch !== this.epoch || this.active(context.value.id, revision) !== context) throw new DesktopError("Collection choices changed or were canceled. Review again."); }
  private async verify(index: IndexSnapshot, hashes: Record<string, string>, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(index.revision); current(); this.evidence.assertCurrent(index);
    for (const [path, hash] of Object.entries(hashes)) { const note = await this.reader.read(path, index.revision); current(); if (hashText(note.text) !== hash) throw new DesktopError("Collection or supporting source changed. Reopen it."); }
    await this.evidence.refresh(index.revision); current(); this.evidence.assertCurrent(index);
  }
  async load(selection: ProjectRequest, scope: unknown, revision: unknown): Promise<CollectionsSnapshot> {
    this.invalidate(); const epoch = this.epoch, roles = this.roles(revision);
    if (scope !== "project" && scope !== "allowed") throw new DesktopError("Choose project or all permitted collection scope explicitly.");
    const home = await this.projects.home(selection, revision), current = () => { if (epoch !== this.epoch || roles !== this.roles(revision)) throw new DesktopError("Collections canceled or folders changed."); this.evidence.assertCurrent(home.index); }; current();
    if (scope === "project" && !home.home) throw new DesktopError("Choose a permitted project to open its collections.");
    const settings: ThreadSettings = { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: selection.folder }, selectedProject: selection.project };
    const identity = scope === "project" ? overviewIdentity(this.evidence.index, settings, selection.project) : { id: "", hashes: {}, reason: "" };
    if (scope === "project" && !identity.id) throw new DesktopError(identity.reason);
    const entries = this.evidence.index.projectEntries(settings, scope === "project" ? selection.project : null), candidates = entries.filter(entry => entry.metadata.type === "collection").sort((a, b) => a.path.localeCompare(b.path));
    const items: CollectionsSnapshot["items"] = []; let unavailable = 0;
    for (const entry of candidates.slice(0, 100)) {
      const note = await this.reader.read(entry.path, revision); current(); if (hashText(note.text) !== entry.hash) throw new DesktopError("Collection changed. Refresh the list.");
      let record: CollectionRecord; try { record = readCollection(note.text, metadata(note.text)); } catch { unavailable++; continue; }
      if (record.scope === scope && (scope === "allowed" || record.projectPath === selection.project && record.projectIdentity === identity.id)) items.push({ path: entry.path, hash: entry.hash, title: record.title });
    }
    await this.verify(home.index, identity.hashes, current);
    const value: CollectionsSnapshot = { id: randomUUID(), scope, project: scope === "project" ? selection.project : "", items, coverage: `${items.length} matching collections among ${Math.min(100, candidates.length)} of ${candidates.length} indexed candidates; ${unavailable} unsupported. ${home.index.coverage.omittedFiles} notes omitted from indexing. Other scope identities are not offered. References grant no access; unavailable rows hide source paths and text.` };
    this.context = { value, index: home.index, selection, settings, roles, entries, identity: identity.id ?? "", anchors: identity.hashes }; return structuredClone(value);
  }
  async open(id: unknown, path: unknown, revision: unknown): Promise<CollectionReview> {
    const context = this.active(id, revision); this.draftChanged(); this.reviewed = null; const epoch = this.epoch, current = () => this.guard(context, epoch, revision), entry = context.value.items.find(item => item.path === path);
    if (!entry) throw new DesktopError("Choose a listed current collection.");
    try {
      const note = await this.reader.read(entry.path, revision); current(); if (hashText(note.text) !== entry.hash) throw new DesktopError("Collection changed. Refresh it.");
      const record = readCollection(note.text, metadata(note.text));
      if (record.scope !== context.value.scope || record.projectPath !== context.value.project || record.projectIdentity !== context.identity) throw new DesktopError("Collection scope or project identity changed.");
      const graph = this.evidence.index.graph(context.settings), rows = await resolveCollection(record, context.entries, graph); current();
      const hashes = { ...context.anchors, [entry.path]: entry.hash };
      for (const row of rows) if (row.source) Object.assign(hashes, graph.assess(row.source.path).dependencies, { [row.source.path]: row.noteHash! });
      await this.verify(context.index, hashes, current);
      const value: CollectionReview = { id: randomUUID(), path: entry.path, hash: entry.hash, title: record.title, rows, coverage: `${rows.filter(row => row.source).length} of ${rows.length} references currently available. Changed passages require explicit reconfirmation; unavailable and unconfirmed passages cannot enter Ask. Include/Pin/Exclude remain inside the 16000-character context bound. Edits save a new copy containing only currently available and reconfirmed references; the original collection stays unchanged.` };
      this.reviewed = { value, hashes }; return structuredClone(value);
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
  }
  private selected(reviewId: unknown, input: unknown) {
    const reviewed = this.reviewed, data = object(input);
    if (!reviewed || reviewed.value.id !== reviewId || Object.keys(data).sort().join(",") !== "choices,confirmed") throw new DesktopError("Reopen the collection and use its current choice controls.");
    const choices = object(data.choices), rows = reviewed.value.rows;
    if (Object.entries(choices).some(([number, choice]) => !rows.some(row => String(row.number) === number) || typeof choice !== "string" || !["include", "exclude", "pin"].includes(choice)) || !Array.isArray(data.confirmed) || data.confirmed.length > rows.length || new Set(data.confirmed).size !== data.confirmed.length || data.confirmed.some(number => !rows.some(row => row.number === number && row.state === "changed"))) throw new DesktopError("Use current reference numbers and explicitly confirm changed references.");
    const selected = rows.map(row => ({ ...row, choice: (choices[String(row.number)] ?? row.choice) as EvidenceChoice }));
    const candidates = collectionCandidates(selected, new Set(data.confirmed as number[]));
    if (!candidates.bundle.sources.length) throw new DesktopError("No current or reconfirmed references are available.");
    return { reviewed, ...candidates };
  }
  async reuse(id: unknown, reviewId: unknown, input: unknown, question: unknown, revision: unknown) {
    const context = this.active(id, revision), chosen = this.selected(reviewId, input), epoch = ++this.epoch, current = () => this.guard(context, epoch, revision);
    if (typeof question !== "string" || !question.trim() || question.length > 1000) throw new DesktopError("Enter a question of 1-1000 characters for this collection.");
    await this.verify(context.index, chosen.reviewed.hashes, current);
    const options: AskRequest = { question, selection: context.selection, scope: context.value.scope === "project" ? "project" : "vault", method: "keyword", embeddingModel: "", level: "standard", filters: {} };
    return this.ask.useCollection(options, context.index, chosen.bundle, chosen.choices, chosen.reviewed.hashes, { [chosen.reviewed.value.path]: chosen.reviewed.value.hash, ...context.anchors }, current);
  }
  private content(name: string, scope: "project" | "allowed", projectPath: string, projectIdentity: string, items: CollectionRecord["items"]): string { return collectionMarkdown({ schemaVersion: 1, id: randomUUID(), title: name, createdAt: new Date().toISOString(), scope, projectPath, projectIdentity, items }); }
  private destination(name: string, project: string, revision: unknown): string {
    const folder = project || this.storage.status(revision).preferences.roles.knowledge; if (!folder) throw new DesktopError("Map a Knowledge folder for an all-permitted collection. Mapping grants no reads."); return `${folder}/Collections/${name}.md`;
  }
  async saveEdited(id: unknown, reviewId: unknown, input: unknown, nameInput: unknown, revision: unknown) {
    const context = this.active(id, revision), chosen = this.selected(reviewId, input), epoch = ++this.epoch, current = () => this.guard(context, epoch, revision); this.preparing = epoch;
    try {
      const name = title(nameInput), path = this.destination(name, context.value.project, revision), after = this.content(name, context.value.scope, context.value.project, context.identity, captureCollection(chosen.bundle, chosen.choices, context.entries)); metadata(after);
      await this.verify(context.index, chosen.reviewed.hashes, current);
      return await this.changes.propose([{ path, before: null, after }], Object.entries(chosen.reviewed.hashes).map(([path, hash]) => ({ path, hash })), revision, catalogFingerprint(context.index.listing, [path]));
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.preparing === epoch) this.preparing = null; }
  }
  async saveAsk(askId: unknown, nameInput: unknown, revision: unknown) {
    const source = this.ask.collectionSource(askId, revision), name = title(nameInput), epoch = ++this.epoch, roles = this.roles(revision); this.preparing = epoch;
    const current = () => { source.assert(); if (epoch !== this.epoch || roles !== this.roles(revision)) throw new DesktopError("Collection save canceled or folders changed."); };
    try {
      const request = source.snapshot.request, settings = { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: request.selection.folder } };
      const scope = request.scope === "project" ? "project" : "allowed", project = scope === "project" ? request.selection.project : "", identity = project ? overviewIdentity(this.evidence.index, settings, project) : { id: "", hashes: {}, reason: "" };
      if (project && !identity.id) throw new DesktopError(identity.reason);
      await source.validate(); current(); const hashes = { ...source.hashes, ...identity.hashes };
      await this.verify(source.snapshot.index, hashes, current);
      const after = this.content(name, scope, project, identity.id ?? "", captureCollection(source.snapshot.bundle, source.choices, this.evidence.index.entries)), path = this.destination(name, project, revision); metadata(after); current();
      return await this.changes.propose([{ path, before: null, after }], Object.entries(hashes).map(([path, hash]) => ({ path, hash })), revision, catalogFingerprint(source.snapshot.index.listing, [path]));
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
