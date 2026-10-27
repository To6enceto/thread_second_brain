import { randomUUID } from "node:crypto";
import { captureMarkdown, MAX_IMPORT_BYTES, suggestProject } from "../vault/capture.ts";
import { readClip, clippedSource, possibleClipDuplicates, type ReviewedClip, type ClipMetadata } from "../vault/clipper.ts";
import { noteName } from "../vault/workspace.ts";
import { defaultSettings, type ThreadSettings } from "../settings/settings.ts";
import { overviewIdentity } from "../vault/project-overview.ts";
import type { IndexEntry } from "../vault/index.ts";
import type { IndexSnapshot, ProjectRequest } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { DesktopProjects } from "./projects.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import { catalogFingerprint } from "./catalog.ts";
import { metadata, parseMetadata } from "./metadata.ts";
import { DesktopError } from "./security.ts";
import { readPickedText, type PickedText } from "./text-import.ts";

export interface IntakeSnapshot { id: string; projects: string[]; clips: { path: string; hash: string }[]; coverage: string; }
export interface IntakeFile extends PickedText { id: string; }
export interface CaptureInput { kind: "thought" | "import"; name: string; text: string; file: string; url: string; project: string; }
export interface ClipSnapshot { id: string; path: string; hash: string; name: string; project: string; metadata: ClipMetadata; original: string; matches: { path: string; hash: string; reason: string }[]; coverage: string; }
interface Context { value: IntakeSnapshot; index: IndexSnapshot; settings: ThreadSettings; roles: string; entries: IndexEntry[]; }
function fields(value: unknown, keys: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== keys.split(",").sort().join(",")) throw new DesktopError("Use the fields shown."); return value as Record<string, unknown>;
}
// The index retains only selected metadata, so this skips known Thread records; readClip still refuses the rest.
const MANAGED_TYPES = new Set(["action", "answer", "collection", "conversation", "decision", "project", "question", "questions", "review", "review-event", "session"]);
function clipCandidate(entry: IndexEntry): boolean { const { type } = entry.metadata; return !Object.keys(entry.metadata).some(key => /^thread_/i.test(key)) && !(typeof type === "string" && (MANAGED_TYPES.has(type) || type === "source" && entry.metadata.captured_on !== undefined)); }
function text(value: unknown, limit: number, label: string): string { if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new DesktopError(`Enter ${label} within ${limit} characters.`); return value; }

/** Retained main-owned intake snapshots; no source or destination is written until exact Apply. */
export class DesktopIntake {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private context: Context | null = null;
  private picked: IntakeFile | null = null;
  private clip: { value: ClipSnapshot; reviewed: ReviewedClip; identity: string; hashes: Record<string, string> } | null = null;
  private epoch = 0;
  private choosing = false;
  private preparing: number | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, storage: DesktopStorage, changes: DesktopChanges) { this.reader = reader; this.evidence = evidence; this.projects = projects; this.storage = storage; this.changes = changes; }
  draftChanged(keepClip = false): void { this.epoch++; if (!keepClip) this.clip = null; if (this.preparing !== null) this.changes.invalidate(); }
  invalidate(): void { this.draftChanged(); this.context = null; this.picked = null; }
  private roles(revision: unknown): string { return JSON.stringify(this.storage.status(revision).preferences.roles); }
  async load(selection: ProjectRequest, revision: unknown): Promise<IntakeSnapshot> {
    this.invalidate(); const epoch = this.epoch, roles = this.roles(revision), home = await this.projects.home(selection, revision);
    if (epoch !== this.epoch || roles !== this.roles(revision)) throw new DesktopError("Canceled, or the folders changed. Choose Refresh research."); this.evidence.assertCurrent(home.index);
    const settings: ThreadSettings = { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: selection.folder }, selectedProject: selection.project };
    const graph = this.evidence.index.graph(settings), clips = this.evidence.index.entries.filter(entry => !entry.output && !entry.pdf && !entry.decisionSources && clipCandidate(entry) && graph.assess(entry.path).usable).sort((a, b) => a.path.localeCompare(b.path));
    const value: IntakeSnapshot = { id: randomUUID(), projects: home.projects, clips: clips.slice(0, 100).map(({ path, hash }) => ({ path, hash })), coverage: `${home.index.listing.paths.length} notes Thread may read; ${home.index.coverage.omittedFiles} skipped and ${home.index.invalid} unreadable. ${Math.min(clips.length, 100)} of ${clips.length} notes offered as saved clips; Thread's own notes are skipped, and other record notes are refused when you check them. Duplicate checks cover only source notes Thread can currently read, so a note cannot be confirmed unique against others.` };
    this.context = { value, index: home.index, settings, roles, entries: this.evidence.index.entries }; return structuredClone(value);
  }
  private active(id: unknown, revision: unknown): Context {
    const context = this.context; if (!context || context.value.id !== id || context.index.revision !== revision || context.roles !== this.roles(revision)) throw new DesktopError("Your notes, folders or access changed. Choose Refresh research."); this.evidence.assertCurrent(context.index); return context;
  }
  private guard(context: Context, revision: unknown, epoch: number): void { if (this.epoch !== epoch || this.active(context.value.id, revision) !== context) throw new DesktopError("Something changed or was canceled. Preview again."); }
  private async verify(context: Context, hashes: Record<string, string>, revision: unknown, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(revision); current();
    for (const [path, hash] of Object.entries(hashes)) { const actual = await this.reader.currentHash(path, revision, current); current(); if (actual !== hash) throw new DesktopError("A note used here changed. Choose Refresh research."); }
    await this.evidence.refresh(revision); current(); this.evidence.assertCurrent(context.index);
  }
  /** Native dialog callback is supplied by main only. Renderer never supplies an absolute path. */
  async pick(id: unknown, revision: unknown, choose: () => Promise<string | null>): Promise<IntakeFile | null> {
    const context = this.active(id, revision); if (this.choosing) throw new DesktopError("Finish the current file dialog first.");
    this.draftChanged(); this.picked = null; const epoch = this.epoch, current = () => this.guard(context, revision, epoch); this.choosing = true;
    try { const path = await choose(); current(); if (!path) return null; const file = await readPickedText(path, current); current(); this.picked = { ...file, id: randomUUID() }; return structuredClone(this.picked); }
    finally { this.choosing = false; }
  }
  private captured(input: Record<string, unknown>): string {
    const kind = input.kind, raw = text(input.text, MAX_IMPORT_BYTES, "captured text"), file = text(input.file, 100, "picked file token");
    if (kind === "thought" && file === "") return raw;
    if (kind === "import" && raw === "" && this.picked?.id === file) return this.picked.text;
    throw new DesktopError("Type a thought or choose a text file.");
  }
  suggest(id: unknown, input: unknown, revision: unknown): string | null {
    const context = this.active(id, revision), data = fields(input, "kind,text,file"), raw = this.captured(data);
    if (Buffer.byteLength(raw) > MAX_IMPORT_BYTES) throw new DesktopError("Keep captured text within 2 MiB.");
    const match = suggestProject(raw, this.evidence.index.projectEntries(context.settings, null)), path = match?.path.slice(0, match.path.lastIndexOf("/"));
    return path && context.value.projects.includes(path) ? path : null;
  }
  async reviewClip(id: unknown, input: unknown, revision: unknown): Promise<ClipSnapshot> {
    const context = this.active(id, revision); this.draftChanged(); const epoch = this.epoch, current = () => this.guard(context, revision, epoch);
    try {
      const data = fields(input, "path,project,name"), path = text(data.path, 512, "saved clip path"), project = text(data.project, 512, "clip project"), name = noteName(text(data.name, 100, "new clipped source name"));
      const entry = context.value.clips.find(item => item.path === path);
      if (!entry || !context.value.projects.includes(project)) throw new DesktopError("Choose a saved clip from the list and a project.");
      const identity = overviewIdentity(this.evidence.index, context.settings, project); if (!identity.id) throw new DesktopError(identity.reason);
      const original = await this.reader.read(path, revision); current(); const reviewed = await readClip(original.text, parseMetadata); current();
      if (reviewed.hash !== entry.hash) throw new DesktopError("The clip changed. Choose Refresh research and check it again.");
      const graph = this.evidence.index.graph(context.settings), candidates = context.entries.filter(item => item.metadata.type === "source" && typeof item.metadata.thread_import_hash === "string" && graph.assess(item.path).usable).sort((a, b) => a.path.localeCompare(b.path));
      const matches = possibleClipDuplicates(candidates.slice(0, 100), reviewed), hashes = { [path]: entry.hash, ...identity.hashes };
      for (const match of matches) Object.assign(hashes, graph.assess(match.entry.path).dependencies, { [match.entry.path]: match.entry.hash });
      await this.verify(context, hashes, revision, current);
      const value: ClipSnapshot = { id: randomUUID(), path, hash: entry.hash, name, project, metadata: reviewed.metadata, original: reviewed.raw, matches: matches.map(match => ({ path: match.entry.path, hash: match.entry.hash, reason: match.reason })), coverage: `${matches.length} possible duplicates among ${Math.min(100, candidates.length)} of ${candidates.length} saved source notes Thread can read. Other, private and unread notes are not checked. The same web address is a hint, not proof of a duplicate. Web addresses are never opened; the published and clipped dates are what the clip says, not checked facts. The time you save it is recorded separately.` };
      this.clip = { value, reviewed, identity: identity.id, hashes }; return structuredClone(value);
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
  }
  async prepareClip(id: unknown, reviewId: unknown, acknowledge: unknown, revision: unknown) {
    const context = this.active(id, revision), clip = this.clip, epoch = ++this.epoch, current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      if (!clip || clip.value.id !== reviewId) throw new DesktopError("Check the chosen clip again before previewing its note.");
      if (typeof acknowledge !== "boolean" || clip.value.matches.length && !acknowledge) throw new DesktopError("Check the possible duplicates and tick the box for a separate copy before previewing.");
      const folder = this.storage.status(revision).preferences.roles.sources; if (!folder) throw new DesktopError("Set a Sources folder under Saving notes first. This does not let Thread read anything new.");
      const after = clippedSource(clip.reviewed, clip.value.path, clip.identity), path = `${folder}/${clip.value.name}.md`; metadata(after);
      await this.verify(context, clip.hashes, revision, current);
      return await this.changes.propose([{ path, before: null, after }], Object.entries(clip.hashes).map(([path, hash]) => ({ path, hash })), revision, catalogFingerprint(context.index.listing, [path]));
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.preparing === epoch) this.preparing = null; }
  }
  async capture(id: unknown, input: unknown, revision: unknown) {
    const context = this.active(id, revision), epoch = ++this.epoch, current = () => this.guard(context, revision, epoch); this.preparing = epoch;
    try {
      const data = fields(input, "kind,name,text,file,url,project"), raw = this.captured(data), name = noteName(text(data.name, 100, "new note name")), url = text(data.url, 2000, "original URL"), project = text(data.project, 512, "project association");
      const imported = data.kind === "import", folder = this.storage.status(revision).preferences.roles[imported ? "sources" : "inbox"];
      if (!folder) throw new DesktopError(`Set ${imported ? "a Sources" : "an Inbox"} folder under Saving notes first. This does not let Thread read anything new.`);
      if (project && !context.value.projects.includes(project)) throw new DesktopError("Choose a project from the list, or No project.");
      const hashes: Record<string, string> = {}; let identity = "";
      if (project) { const value = overviewIdentity(this.evidence.index, context.settings, project); if (!value.id) throw new DesktopError(value.reason); identity = value.id; Object.assign(hashes, value.hashes); }
      const captured = await captureMarkdown(raw, imported ? this.picked!.name : "", identity, url, imported); current();
      if (imported) { const duplicate = context.entries.find(entry => entry.metadata.type === "source" && entry.metadata.thread_import_hash === captured.hash); if (duplicate) throw new DesktopError(`This exact text was already saved at ${duplicate.path}. Look at that note; it may have changed since.`); }
      await this.verify(context, hashes, revision, current); metadata(captured.content); const path = `${folder}/${name}.md`;
      return await this.changes.propose([{ path, before: null, after: captured.content }], Object.entries(hashes).map(([path, hash]) => ({ path, hash })), revision, catalogFingerprint(context.index.listing, [path]));
    } catch (error) { if (error instanceof Error) throw new DesktopError(error.message); throw error; }
    finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
