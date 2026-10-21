export interface ReadScope { roots: string[]; excluded: string[]; }
export interface VaultInfo { name: string; path: string; revision: number; scope: ReadScope; }
export interface NoteList { revision: number; paths: string[]; omitted: number; limited: boolean; }
export interface NoteSnapshot { revision: number; path: string; text: string; modifiedAt: number; }
export type DesktopResult<T> = { ok: true; value: T } | { ok: false; message: string };
export interface DesktopBridge {
  selectVault(): Promise<DesktopResult<VaultInfo | null>>;
  grantScope(scope: ReadScope, revision: number): Promise<DesktopResult<VaultInfo>>;
  listNotes(revision: number): Promise<DesktopResult<NoteList>>;
  readNote(path: string, revision: number): Promise<DesktopResult<NoteSnapshot>>;
  closeVault(): Promise<DesktopResult<null>>;
}
