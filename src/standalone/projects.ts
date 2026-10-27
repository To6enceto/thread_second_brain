import { READ_LIMITS } from "./vault-reader.ts";
import { defaultSettings } from "../settings/settings.ts";
import { permittedProjects, projectHome } from "../vault/project-home.ts";
import { buildEvidence, type SourceNote } from "../vault/evidence.ts";
import { contentHash } from "../vault/scope.ts";
import { recordedBriefing } from "../intelligence/recorded.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import { projectedSource } from "./evidence-index.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { ProjectRequest, ProjectSnapshot, RecordedSnapshot } from "./contracts.ts";
import { DesktopError, relativePath } from "./security.ts";

function request(value: unknown): ProjectRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Choose a projects folder and project.");
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "folder,project" || typeof data.folder !== "string" || typeof data.project !== "string") throw new DesktopError("Invalid project selection.");
  for (const path of [data.folder, data.project]) if (path && relativePath(path) === ".") throw new DesktopError("Map a named project folder. Root-level projects are not supported yet.");
  return { folder: data.folder, project: data.project };
}

/** Session-only organization; never changes the reader's grants or plugin state. */
export class DesktopProjects {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  constructor(reader: VaultReader, evidence: EvidenceIndex) { this.reader = reader; this.evidence = evidence; }
  async home(input: unknown, revision: unknown): Promise<ProjectSnapshot> {
    const selection = request(input), snapshot = await this.evidence.refresh(revision);
    this.evidence.assertCurrent(snapshot);
    const settings = { ...defaultSettings(), ...this.evidence.scope() };
    settings.roles.projects = selection.folder;
    const projects = permittedProjects(this.evidence.index, settings);
    if (selection.project && !projects.includes(selection.project)) throw new DesktopError("Project unavailable in the current read scope. Refresh projects and choose again.");
    settings.selectedProject = selection.project;
    return { revision: snapshot.revision, generation: snapshot.generation, projects,
      home: selection.project ? projectHome(this.evidence.index, settings) : null, index: snapshot };
  }
  async assertCurrent(recorded: RecordedSnapshot): Promise<void> {
    const snapshot = recorded.index;
    await this.evidence.refresh(snapshot.revision);
    this.evidence.assertCurrent(snapshot);
    for (const [path, hash] of Object.entries(recorded.bundle.noteHashes)) {
      this.evidence.assertCurrent(snapshot);
      const file = snapshot.listing.files[path] ?? snapshot.listing.pdfs[path];
      if (!file || await this.reader.currentHash(path, snapshot.revision, undefined, Math.min(file.bytes, READ_LIMITS.bytes)) !== hash) throw new DesktopError("Supporting source changed. Resume again.");
    }
    await this.evidence.refresh(snapshot.revision);
    this.evidence.assertCurrent(snapshot);
  }
  async resume(input: unknown, revision: unknown, now = Date.now()): Promise<RecordedSnapshot> {
    const selection = request(input), home = await this.home(selection, revision);
    if (!home.home) throw new DesktopError("Choose a permitted project before Resume.");
    const snapshot = home.index, scope = this.evidence.scope();
    const entries = this.evidence.index.projectEntries(scope, selection.project);
    const graph = this.evidence.index.graph(scope), notes: SourceNote[] = [];
    const hashes: Record<string, string> = {};
    for (const entry of entries) {
      this.evidence.assertCurrent(snapshot);
      Object.assign(hashes, graph.assess(entry.path).dependencies, { [entry.path]: entry.hash });
      const note = await this.reader.read(entry.path, revision, snapshot.listing.files[entry.path]!.bytes);
      this.evidence.assertCurrent(snapshot);
      if (await contentHash(note.text) !== entry.hash) throw new DesktopError("Source changed. Refresh and Resume again.");
      notes.push({ ...note, ...await projectedSource(note.text, entry), metadata: entry.metadata, fullHash: entry.hash });
    }
    const bundle = await buildEvidence(notes, now);
    // Dependencies can live outside the project. Validate their current bytes too.
    for (const [path, hash] of Object.entries(hashes)) {
      this.evidence.assertCurrent(snapshot);
      const file = snapshot.listing.files[path] ?? snapshot.listing.pdfs[path];
      if (!file) throw new DesktopError("Supporting source unavailable. Refresh and Resume again.");
      if (await this.reader.currentHash(path, revision, undefined, Math.min(file.bytes, READ_LIMITS.bytes)) !== hash) throw new DesktopError("Supporting source changed. Refresh and Resume again.");
    }
    await this.evidence.refresh(revision);
    this.evidence.assertCurrent(snapshot);
    bundle.noteHashes = { ...bundle.noteHashes, ...hashes };
    return { ...home, bundle, recorded: recordedBriefing(bundle, now), generatedAt: now };
  }
}
