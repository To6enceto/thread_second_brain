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
  closeVault(): Promise<DesktopResult<null>>;
}
import type { IndexCoverage } from "../vault/index-coverage.ts";
export interface IndexSnapshot { revision: number; generation: number; listing: NoteList; coverage: IndexCoverage; invalid: number; reused: number; }
export interface SearchSnapshot extends IndexSnapshot { hits: { path: string; hash: string; heading: string; excerpt: string }[]; coverageText: string; }
export interface IndexEvent { revision: number; generation: number; kind: "invalidated" | "progress" | "ready"; message: string; snapshot?: IndexSnapshot; }
