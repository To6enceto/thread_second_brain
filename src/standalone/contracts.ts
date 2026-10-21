export interface ReadScope { roots: string[]; excluded: string[]; }
export interface VaultInfo { name: string; path: string; revision: number; scope: ReadScope; }
export interface NoteList { revision: number; paths: string[]; files: Record<string, { stamp: string; bytes: number }>; omitted: number; omittedMarkdown: number; identityIncomplete: boolean; limited: boolean; }
export interface NoteSnapshot { revision: number; path: string; text: string; modifiedAt: number; stamp: string; }
export type DesktopResult<T> = { ok: true; value: T } | { ok: false; message: string };
export interface DesktopBridge {
  selectVault(): Promise<DesktopResult<VaultInfo | null>>;
  grantScope(scope: ReadScope, revision: number): Promise<DesktopResult<VaultInfo>>;
  listNotes(revision: number): Promise<DesktopResult<NoteList>>;
  readNote(path: string, revision: number, expectedHash?: string): Promise<DesktopResult<NoteSnapshot & { generation: number }>>;
  refreshIndex(revision: number): Promise<DesktopResult<IndexSnapshot>>;
  cancelIndex(revision: number): Promise<DesktopResult<null>>;
  searchNotes(query: string, revision: number): Promise<DesktopResult<SearchSnapshot>>;
  resolveLink(from: string, target: string, revision: number): Promise<DesktopResult<import("./links.ts").LinkResolution>>;
  onIndexEvent(listener: (event: IndexEvent) => void): () => void;
  projectHome(selection: ProjectRequest, revision: number): Promise<DesktopResult<ProjectSnapshot>>;
  resumeProject(selection: ProjectRequest, revision: number): Promise<DesktopResult<PreparedResume>>;
  discoverModels(endpoint: string): Promise<DesktopResult<{ models: import("../intelligence/ollama.ts").DownloadedModel[]; total: number; omitted: number }>>;
  configureAI(config: AIConfig): Promise<DesktopResult<AIConfig>>;
  checkAI(): Promise<DesktopResult<string>>;
  cancelAI(): Promise<DesktopResult<null>>;
  interpretResume(briefingId: string, revision: number): Promise<DesktopResult<AIInterpretation>>;
  closeVault(): Promise<DesktopResult<null>>;
}
import type { IndexCoverage } from "../vault/index-coverage.ts";
export interface IndexSnapshot { revision: number; generation: number; listing: NoteList; coverage: IndexCoverage; invalid: number; reused: number; }
export interface SearchSnapshot extends IndexSnapshot { hits: { path: string; hash: string; heading: string; excerpt: string }[]; coverageText: string; }
export interface IndexEvent { revision: number; generation: number; kind: "invalidated" | "progress" | "ready"; message: string; snapshot?: IndexSnapshot; }

export interface ProjectRequest { folder: string; project: string; }
export interface ProjectSnapshot {
  revision: number; generation: number; projects: string[];
  home: import("../vault/project-home.ts").ProjectHome | null;
  index: IndexSnapshot;
}
export interface RecordedSnapshot extends ProjectSnapshot {
  bundle: import("../vault/evidence.ts").EvidenceBundle;
  recorded: import("../intelligence/briefing.ts").Briefing;
  generatedAt: number;
}

export interface AIConfig { endpoint: string; model: string; }
export interface PreparedResume extends RecordedSnapshot { briefingId: string; }
export interface AIInterpretation {
  briefingId: string; revision: number; generation: number; model: string; generatedAt: number;
  interpretations: import("../intelligence/briefing.ts").Claim[];
  nextActions: import("../intelligence/briefing.ts").Claim[];
  modelGaps: string[];
}
