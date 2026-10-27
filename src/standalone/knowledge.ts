import { randomUUID } from "node:crypto";
import { ANSWER_SCHEMA, answerPrompt, validateAnswer, escapeMarkdown, type Answer } from "../intelligence/answer.ts";
import { knowledgeMarkdown, synthesisBlock } from "../vault/knowledge.ts";
import { buildEvidence, type EvidenceBundle, type SourceNote } from "../vault/evidence.ts";
import { overviewIdentity } from "../vault/project-overview.ts";
import { noteName } from "../vault/workspace.ts";
import { defaultSettings, type ThreadSettings } from "../settings/settings.ts";
import type { IndexEntry } from "../vault/index.ts";
import type { IndexSnapshot, ProjectRequest } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import { projectedSource } from "./evidence-index.ts";
import type { DesktopProjects } from "./projects.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import type { DesktopAI } from "./local-ai.ts";
import { VaultWriter, type DestinationState } from "./vault-writer.ts";
import { DesktopError, within } from "./security.ts";
import { metadata } from "./metadata.ts";
import { hashText } from "./profile.ts";
import { catalogFingerprint } from "./catalog.ts";

export interface KnowledgeSnapshot { id: string; project: string; sources: { path: string; hash: string }[]; destinations: string[]; links: string[]; coverage: string; }
export interface KnowledgeInput { name: string; focus: string; type: "concept" | "comparison"; sources: string[]; existing: string; link: string; }
export interface KnowledgeDraft { id: string; answer: Answer; bundle: EvidenceBundle; operations: { path: string; before: string | null; after: string }[]; model: string; generatedAt: number; coverage: string; }
interface Context { value: KnowledgeSnapshot; index: IndexSnapshot; settings: ThreadSettings; roles: string; entries: IndexEntry[]; }
function input(value: unknown): KnowledgeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Use the fields shown."); const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "existing,focus,link,name,sources,type" || typeof v.name !== "string" || v.name.length > 100 || noteName(v.name) !== v.name || typeof v.focus !== "string" || v.focus.length > 1000 || v.focus.includes("\0") || v.type !== "concept" && v.type !== "comparison" || typeof v.existing !== "string" || typeof v.link !== "string" || !Array.isArray(v.sources) || !v.sources.length || v.sources.length > 5 || new Set(v.sources).size !== v.sources.length || v.sources.some(path => typeof path !== "string")) throw new DesktopError("Choose one to five different sources, a valid note name and the summary type; the focus can be up to 1000 characters.");
  return v as unknown as KnowledgeInput;
}
function appendable(entry: IndexEntry): boolean { return entry.metadata.type === undefined || ["note", "concept", "comparison"].includes(String(entry.metadata.type)); }
function protectedMetadata(raw: string, project: boolean): void {
  const fields = metadata(raw), allowed = project ? [] : ["thread_model", "thread_sources"];
  if (Object.keys(fields).some(key => /^thread_/i.test(key) && !allowed.includes(key)) || /<!--\s*\/?\s*thread\s*:(?:action|collection|conversation|answer|question|review|pdf)[\s:-]/i.test(raw)) throw new DesktopError("Thread cannot add a summary to this kind of note or link it from there.");
}

/** Main-owned source and target snapshots; AI proposes content and never writes it. */
export class DesktopKnowledge {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private ai: DesktopAI;
  private writer: VaultWriter;
  private context: Context | null = null;
  private draft: { value: KnowledgeDraft; context: Context; hashes: Record<string, string>; states: Record<string, DestinationState>; version: number } | null = null;
  private epoch = 0;
  private generating: number | null = null;
  private preparing: number | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, storage: DesktopStorage, changes: DesktopChanges, ai: DesktopAI) { this.reader = reader; this.evidence = evidence; this.projects = projects; this.storage = storage; this.changes = changes; this.ai = ai; this.writer = new VaultWriter(reader); }
  draftChanged(): void { this.epoch++; this.draft = null; if (this.generating !== null) this.ai.cancel(); if (this.preparing !== null) this.changes.invalidate(); }
  invalidate(): void { this.draftChanged(); this.context = null; }
  private roles(revision: unknown): string { return JSON.stringify(this.storage.status(revision).preferences.roles); }
  async load(selection: ProjectRequest, revision: unknown): Promise<KnowledgeSnapshot> {
    this.invalidate(); const epoch = this.epoch, roles = this.roles(revision), home = await this.projects.home(selection, revision);
    if (epoch !== this.epoch || roles !== this.roles(revision)) throw new DesktopError("Canceled, or the folders changed. Choose Refresh research."); this.evidence.assertCurrent(home.index);
    const settings: ThreadSettings = { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: selection.folder }, selectedProject: selection.project };
    const entries = this.evidence.index.projectEntries(settings, null).filter(entry => !entry.id || this.evidence.index.idUnambiguous(entry.id)).sort((a, b) => a.path.localeCompare(b.path));
    const value: KnowledgeSnapshot = { id: randomUUID(), project: selection.project, sources: entries.filter(entry => entry.chunks.length).map(({ path, hash }) => ({ path, hash })), destinations: entries.filter(entry => settings.roles.knowledge && within(entry.path, settings.roles.knowledge) && appendable(entry)).map(entry => entry.path), links: entries.filter(entry => selection.project && entry.path.slice(0, entry.path.lastIndexOf("/")) === selection.project && entry.metadata.type === "project").map(entry => entry.path), coverage: `${entries.length} notes Thread may read are available as sources; ${home.index.coverage.omittedFiles} could not be read. Choose up to five sources. The AI sees at most 16000 characters. Adding to an existing note keeps its properties and text; Thread's own record notes cannot be changed here. A source, or a note it relies on, cannot also be a note this changes.` };
    this.context = { value, index: home.index, settings, roles, entries }; return structuredClone(value);
  }
  private active(id: unknown, revision: unknown): Context { const c = this.context; if (!c || c.value.id !== id || c.index.revision !== revision || c.roles !== this.roles(revision)) throw new DesktopError("Your notes or folders changed. Choose Refresh research."); this.evidence.assertCurrent(c.index); return c; }
  private guard(c: Context, epoch: number, revision: unknown): void { if (epoch !== this.epoch || this.active(c.value.id, revision) !== c) throw new DesktopError("Something changed or was canceled. Write the draft again."); }
  private async verify(c: Context, hashes: Record<string, string>, states: Record<string, DestinationState>, revision: unknown, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(revision); current(); this.evidence.assertCurrent(c.index);
    for (const [path, hash] of Object.entries(hashes)) { const actual = await this.reader.currentHash(path, revision, current); current(); if (actual !== hash) throw new DesktopError("A source or target note changed. Choose Refresh research and write the draft again."); }
    for (const [path, state] of Object.entries(states)) { const actual = await this.writer.inspect(path, revision); current(); if (JSON.stringify(actual) !== JSON.stringify(state)) throw new DesktopError("The note this would change was edited meanwhile. Keep that work and write the draft again."); }
    await this.evidence.refresh(revision); current(); this.evidence.assertCurrent(c.index);
  }
  async generate(id: unknown, rawInput: unknown, revision: unknown): Promise<KnowledgeDraft> {
    const c = this.active(id, revision), options = input(rawInput); this.draftChanged(); const epoch = this.epoch, version = this.ai.version; this.generating = epoch;
    try { return await this.ai.run(async (settings, signal, aiCurrent, client) => {
      const current = () => { aiCurrent(); this.guard(c, epoch, revision); if (version !== this.ai.version) throw new DesktopError("The AI model changed. Write the draft again."); };
      if (!settings.model) throw new DesktopError("Set up an AI model under Optional local AI to write a summary.");
      const journal = this.storage.changeState(revision); if (journal.pending || journal.recovery) throw new DesktopError("Finish or resolve the unfinished changes in Review changes first.");
      const folder = this.storage.status(revision).preferences.roles.knowledge; if (!folder) throw new DesktopError("Set a Knowledge folder under Saving notes and make sure Thread may read it first.");
      if (options.sources.some(path => !c.value.sources.some(source => source.path === path)) || options.existing && !c.value.destinations.includes(options.existing) || options.link && !c.value.links.includes(options.link)) throw new DesktopError("Choose sources from the list, where to save the summary, and optionally a project note to link from.");
      const path = options.existing || `${folder}/${options.name}.md`;
      if (options.link === path) throw new DesktopError("Choose a different project note to link from.");
      const states: Record<string, DestinationState> = {}, originals: Record<string, string | null> = {}, hashes: Record<string, string> = {}, dependencies: Record<string, string> = {}, graph = this.evidence.index.graph(c.settings);
      for (const target of [path, ...(options.link ? [options.link] : [])]) {
        if (!Object.values(this.storage.status(revision).preferences.roles).some(role => role && within(target, role))) throw new DesktopError("Choose notes inside the folders set under Saving notes. This does not let Thread read anything new.");
        const state = await this.writer.inspect(target, revision); current(); states[target] = state;
        if (target === path && !options.existing ? state.file !== null : state.file === null) throw new DesktopError("A note with that name already exists, or the note to add to is gone. Choose Refresh research and choose again.");
        originals[target] = state.file ? (await this.reader.read(target, revision, 1048576)).text : null; current();
        if (state.file) {
          if (hashText(originals[target]!) !== state.file.hash) throw new DesktopError("The note changed while Thread opened it. Choose Refresh research.");
          protectedMetadata(originals[target]!, target === options.link); hashes[target] = state.file.hash;
          Object.assign(dependencies, graph.assess(target).dependencies);
        }
      }
      const notes: SourceNote[] = [], sourceHashes: Record<string, string> = {};
      for (const selected of options.sources) {
        const entry = c.entries.find(entry => entry.path === selected)!, state = graph.assess(selected);
        if (!state.usable) throw new DesktopError("A chosen source may be out of date. Check it in Project reviews first.");
        const note = await this.reader.read(selected, revision); current(); if (hashText(note.text) !== entry.hash) throw new DesktopError("A chosen source changed. Choose Refresh research.");
        notes.push({ ...note, ...await projectedSource(note.text, entry), metadata: entry.metadata, fullHash: entry.hash }); Object.assign(sourceHashes, state.dependencies, { [selected]: entry.hash });
      }
      if (Object.keys(states).some(target => Object.hasOwn(sourceHashes, target) || Object.hasOwn(dependencies, target))) throw new DesktopError("The notes to change must be different from the sources and the notes they rely on.");
      const identity = c.value.project ? overviewIdentity(this.evidence.index, c.settings, c.value.project) : { id: "", hashes: {}, reason: "" }; if (c.value.project && !identity.id) throw new DesktopError(identity.reason);
      Object.assign(hashes, sourceHashes, dependencies, identity.hashes);
      const bundle = await buildEvidence(notes); current(); Object.assign(bundle.noteHashes, sourceHashes); if (!bundle.sources.length) throw new DesktopError("The chosen sources have no usable passages.");
      const verify = () => this.verify(c, hashes, states, revision, current); await verify();
      const response = await client(verify).generate(settings.model, answerPrompt(`Synthesize a ${options.type} about ${options.name}. ${options.focus} Separate supported facts, interpretations and suggestions; explain disagreements and gaps.`, bundle), signal, ANSWER_SCHEMA); current();
      const answer = validateAnswer(response, bundle); if (!answer.supported) throw new DesktopError(answer.gaps.join(" ") || "The chosen sources do not support a summary."); await verify();
      const project = identity.id ?? "", before = originals[path]!, after = before === null ? knowledgeMarkdown(options.name, options.type, answer, bundle, settings.model, project) : before + synthesisBlock(options.name, answer, bundle, settings.model, project);
      const operations: KnowledgeDraft["operations"] = [{ path, before, after }];
      if (options.link) { const original = originals[options.link]!; if (original === null) throw new DesktopError("The project note to link from is gone."); operations.push({ path: options.link, before: original, after: original + `\n\nRelated knowledge: [${escapeMarkdown(options.name)}](<${encodeURI(path).replace(/#/g, "%23")}>)\n` }); }
      for (const operation of operations) metadata(operation.after);
      if (operations.reduce((bytes, op) => bytes + Buffer.byteLength(op.before ?? "") + Buffer.byteLength(op.after), 0) > 1048576) throw new DesktopError("This change is larger than the 1 MB that Thread can record for undo. Choose smaller notes.");
      const value: KnowledgeDraft = { id: randomUUID(), answer, bundle, operations, model: settings.model, generatedAt: Date.now(), coverage: c.value.coverage }; current(); this.draft = { value, context: c, hashes, states, version }; return structuredClone(value);
    }); } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.generating === epoch) this.generating = null; }
  }
  async prepare(id: unknown, revision: unknown) {
    const draft = this.draft; if (!draft || draft.value.id !== id || draft.version !== this.ai.version) throw new DesktopError("The draft changed. Write it again before previewing.");
    const epoch = ++this.epoch, current = () => { this.guard(draft.context, epoch, revision); if (draft !== this.draft || draft.version !== this.ai.version) throw new DesktopError("The draft changed. Write it again."); }; this.preparing = epoch;
    try {
      await this.verify(draft.context, draft.hashes, draft.states, revision, current);
      const sources = Object.entries(draft.hashes).filter(([path]) => !Object.hasOwn(draft.states, path)).map(([path, hash]) => ({ path, hash }));
      return await this.changes.propose(draft.value.operations, sources, revision, catalogFingerprint(draft.context.index.listing, Object.keys(draft.states)));
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
