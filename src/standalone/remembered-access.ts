import { basename, isAbsolute, normalize } from "node:path";
import { ProfileFile } from "./profile-file.ts";
import { freshProfile, preferences } from "./profile.ts";
import { DesktopError, relativePath, scopeInput } from "./security.ts";
import type { AIConfig, ContinuedAccess, ReadScope, SavedAccessStatus } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";

export interface SavedAI { endpoint: string; model: string; embeddingModel: string; }
export interface SavedAccess { path: string; identity: string; scope: ReadScope; projectsFolder: string; ai: SavedAI; savedAt: string; }
export interface AccessState { schemaVersion: 1; saved: SavedAccess | null; }
const MAX_BYTES = 64 * 1024;
const UNREADABLE = "Saved access could not be read, so Thread is not using it. Choose your vault folder as usual, or forget saved access to remove the unreadable file.";

function fields(input: unknown, keys: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== keys.split(",").sort().join(",")) throw new DesktopError("The saved access file has unexpected content.");
  return input as Record<string, unknown>;
}
function projectsFolder(value: unknown): string {
  if (value === "") return "";
  if (relativePath(value) === ".") throw new DesktopError("Enter a named projects folder. Projects at the top of the notes folder are not supported yet.");
  return value as string;
}
function savedAI(value: unknown): SavedAI {
  const data = fields(value, "endpoint,model,embeddingModel");
  const { endpoint, model, embeddingModel } = preferences({ ...data, roles: freshProfile().preferences.roles });
  return { endpoint, model, embeddingModel };
}
export function accessState(input: unknown): AccessState {
  const data = fields(input, "schemaVersion,saved");
  if (data.schemaVersion !== 1) throw new DesktopError("The saved access file is from an unknown version.");
  if (data.saved === null) return { schemaVersion: 1, saved: null };
  const saved = fields(data.saved, "path,identity,scope,projectsFolder,ai,savedAt");
  if (typeof saved.path !== "string" || saved.path.length > 4096 || !isAbsolute(saved.path) || normalize(saved.path) !== saved.path || saved.path.includes("\0")) throw new DesktopError("The saved access file names an invalid folder.");
  if (typeof saved.identity !== "string" || !/^[a-f0-9]{64}$/.test(saved.identity)) throw new DesktopError("The saved access file has an invalid folder check.");
  if (typeof saved.savedAt !== "string" || !Number.isFinite(Date.parse(saved.savedAt)) || new Date(saved.savedAt).toISOString() !== saved.savedAt) throw new DesktopError("The saved access file has an invalid date.");
  const scope = scopeInput(saved.scope);
  if (!scope.roots.length) throw new DesktopError("The saved access file lists no folders to read.");
  return { schemaVersion: 1, saved: { path: saved.path, identity: saved.identity, scope, projectsFolder: projectsFolder(saved.projectsFolder), ai: savedAI(saved.ai), savedAt: saved.savedAt } };
}

/** One explicitly remembered vault scope in the desktop profile. Reading it never reads the vault. */
export class RememberedAccess {
  private file: ProfileFile<AccessState>;
  private warning = "";
  constructor(profileDirectory: string) { this.file = new ProfileFile(profileDirectory, "access.json", { schemaVersion: 1, saved: null }, accessState, MAX_BYTES); }
  async load(): Promise<SavedAccessStatus> {
    try { await this.file.load(); this.warning = ""; } catch { this.warning = UNREADABLE; }
    return this.status();
  }
  status(): SavedAccessStatus {
    const saved = this.warning ? null : this.file.state.saved;
    return { warning: this.warning, saved: saved && { name: basename(saved.path) || saved.path, path: saved.path, scope: structuredClone(saved.scope), projectsFolder: saved.projectsFolder, ai: { ...saved.ai }, savedAt: saved.savedAt } };
  }
  /** Saves main-held scope and identity; the renderer supplies only the mapping and embedding name. */
  async remember(reader: VaultReader, ai: AIConfig, folder: unknown, embeddingModel: unknown, revision: unknown): Promise<SavedAccessStatus> {
    if (this.warning) throw new DesktopError("Forget the unreadable saved access first, then remember this folder.");
    const info = reader.getInfo();
    if (!info || info.revision !== revision) throw new DesktopError("Access changed. Approve read access again, then remember it.");
    if (!info.scope.roots.length) throw new DesktopError("Approve read access first, then remember it.");
    const identity = await reader.identity(revision);
    const state = accessState({ schemaVersion: 1, saved: { path: info.path, identity, scope: info.scope, projectsFolder: folder, ai: { endpoint: ai.endpoint, model: ai.model, embeddingModel }, savedAt: new Date().toISOString() } });
    try { await this.file.store(state, () => { if (reader.getInfo()?.revision !== revision) throw new DesktopError("Access changed. Approve read access again, then remember it."); }); }
    catch (error) {
      // A refused or failed write leaves the writer unloaded; reload the unchanged file so Remember keeps working.
      await this.load(); throw error instanceof DesktopError ? error : new DesktopError("Thread could not save the access. The previous saved access is unchanged. Try again.");
    }
    return this.status();
  }
  async forget(): Promise<SavedAccessStatus> {
    await this.file.remove({ schemaVersion: 1, saved: null }); this.warning = ""; return this.status();
  }
  /** Reopens the saved folder only if it is still the same directory, then grants exactly the saved scope. */
  async open(reader: VaultReader): Promise<ContinuedAccess> {
    const saved = this.warning ? null : this.file.state.saved;
    if (!saved) throw new DesktopError("There is no saved access. Choose your notes folder.");
    let identity = "", revision = 0;
    try { revision = (await reader.select(saved.path)).revision; identity = await reader.identity(revision); }
    catch { reader.close(); throw new DesktopError(`The saved folder is not available at ${saved.path}. Reconnect it and continue again, choose the folder again, or forget saved access.`); }
    if (identity !== saved.identity) { reader.close(); throw new DesktopError("The saved folder was moved or replaced, so Thread did not open it. Choose the folder again and remember access again, or forget saved access."); }
    return { vault: reader.grant(saved.scope, revision), projectsFolder: saved.projectsFolder, ai: { ...saved.ai } };
  }
}
