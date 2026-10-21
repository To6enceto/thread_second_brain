import { constants } from "node:fs";
import { open, mkdir, rename, unlink, type FileHandle } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { localEndpoint, roleNames, type FolderRoles } from "../settings/settings.ts";
import { relativePath, DesktopError } from "./security.ts";
import { absoluteDirectory, fdPath } from "./vault-reader.ts";

export interface DesktopPreferences { endpoint: string; model: string; embeddingModel: string; roles: FolderRoles; }
export interface SaveReceipt { id: string; path: string; content: string; hash: string; createdAt: string; status: "pending" | "complete" | "left"; }
export interface HistoryCopy { id: string; importedAt: string; hash: string; content: string; }
export interface ProfileState { schemaVersion: 1; preferences: DesktopPreferences; saves: SaveReceipt[]; imports: HistoryCopy[]; }
const MAX_BYTES = 64 * 1048576;
export const hashText = (text: string): string => createHash("sha256").update(text).digest("hex");
export function freshProfile(): ProfileState {
  return { schemaVersion: 1, preferences: { endpoint: "http://127.0.0.1:11434", model: "", embeddingModel: "", roles: Object.fromEntries(roleNames.map(role => [role, ""])) as FolderRoles }, saves: [], imports: [] };
}
function object(input: unknown, keys: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== keys.split(",").sort().join(",")) throw new DesktopError("Desktop state has unknown or missing fields. Preserve it and restore a known backup.");
  return input as Record<string, unknown>;
}
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const iso = (value: unknown): boolean => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function preferences(input: unknown): DesktopPreferences {
  const data = object(input, "endpoint,model,embeddingModel,roles"), roles = object(data.roles, roleNames.join(","));
  if (!text(data.endpoint, 200)) throw new DesktopError("Enter a local Ollama endpoint.");
  for (const key of ["model", "embeddingModel"]) if (!text(data[key], 200) || /[\s\u0000-\u001f]/.test(data[key] as string) || /(?:[:/-])cloud(?:$|[:/])/i.test(data[key] as string)) throw new DesktopError("Choose downloaded local model names.");
  for (const value of Object.values(roles)) if (value !== "") relativePath(value);
  return { endpoint: localEndpoint(data.endpoint), model: data.model as string, embeddingModel: data.embeddingModel as string, roles: { ...roles } as FolderRoles };
}
export function profileState(input: unknown): ProfileState {
  const data = object(input, "schemaVersion,preferences,saves,imports");
  if (data.schemaVersion !== 1 || !Array.isArray(data.saves) || data.saves.length > 20 || !Array.isArray(data.imports) || data.imports.length > 5) throw new DesktopError("Unsupported or full desktop history. Preserve the profile; writing is unavailable.");
  const ids = new Set<string>();
  for (const value of data.saves) {
    const receipt = object(value, "id,path,content,hash,createdAt,status");
    if (!text(receipt.id, 100) || !receipt.id || ids.has(receipt.id) || !text(receipt.path, 512) || !receipt.path.endsWith(".md") || relativePath(receipt.path) !== receipt.path || !text(receipt.content, 1048576) || Buffer.byteLength(receipt.content) > 1048576 || hashText(receipt.content) !== receipt.hash || !iso(receipt.createdAt) || typeof receipt.status !== "string" || !["pending", "complete", "left"].includes(receipt.status)) throw new DesktopError("Invalid desktop save receipt. Preserve the profile and inspect recovery.");
    ids.add(receipt.id);
  }
  for (const value of data.imports) {
    const copy = object(value, "id,importedAt,hash,content");
    if (!text(copy.id, 100) || !copy.id || ids.has(copy.id) || !iso(copy.importedAt) || !text(copy.content, 32 * 1048576) || Buffer.byteLength(copy.content) > 32 * 1048576 || hashText(copy.content) !== copy.hash) throw new DesktopError("Invalid imported history copy. Preserve the desktop profile.");
    ids.add(copy.id);
  }
  const result = { schemaVersion: 1, preferences: preferences(data.preferences), saves: structuredClone(data.saves), imports: structuredClone(data.imports) } as ProfileState;
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_BYTES) throw new DesktopError("Desktop history exceeds its 64 MiB limit. Preserve it; no entries were deleted.");
  return result;
}

/** Per-vault application state; never a note store or a grant source. */
export class DesktopProfile {
  private directory: string;
  private filename: string;
  private before: string | null = null;
  private loaded = false;
  private busy = false;
  state = freshProfile();
  constructor(profileDirectory: string, identity: string) {
    if (!/^[a-f0-9]{64}$/.test(identity)) throw new DesktopError("Invalid vault identity.");
    this.directory = profileDirectory; this.filename = `vault-${identity}.json`;
  }
  private async folder(): Promise<FileHandle> {
    const base = await absoluteDirectory(this.directory);
    try {
      try { await mkdir(fdPath(base, "thread-v1"), { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      const folder = await open(fdPath(base, "thread-v1"), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      const stat = await folder.stat();
      if (stat.uid !== process.getuid!() || (stat.mode & 0o077) !== 0) { await folder.close(); throw new DesktopError("Desktop profile folder must be owned by you and private. Preserve it and check its permissions."); }
      return folder;
    } finally { await base.close(); }
  }
  private async assertFolder(folder: FileHandle): Promise<void> {
    const current = await this.folder();
    try { const [before, after] = await Promise.all([folder.stat(), current.stat()]); if (before.dev !== after.dev || before.ino !== after.ino) throw new DesktopError("Desktop profile directory changed. Preserve both copies and reopen."); }
    finally { await current.close(); }
  }
  private async read(folder: FileHandle): Promise<string | null> {
    let file: FileHandle;
    try { file = await open(fdPath(folder, this.filename), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    try {
      const before = await file.stat();
      if (!before.isFile() || before.nlink !== 1 || before.size > MAX_BYTES) throw new DesktopError("Desktop profile is not an ordinary bounded state file. Preserve it.");
      const bytes = Buffer.alloc(before.size + 1); let count = 0;
      while (count < bytes.length) { const part = await file.read(bytes, count, bytes.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
      const after = await file.stat();
      if (count !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new DesktopError("Desktop profile changed while reading. Reopen Thread.");
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, count));
    } finally { await file.close(); }
  }
  async load(): Promise<ProfileState> {
    this.loaded = false;
    const folder = await this.folder();
    try {
      const raw = await this.read(folder); const next = raw === null ? freshProfile() : profileState(JSON.parse(raw));
      await this.assertFolder(folder); this.before = raw; this.state = next; this.loaded = true; return structuredClone(next);
    } catch { throw new DesktopError("Desktop state is invalid or unavailable. Preserve the profile; do not reset it. Reading notes remains available, but saving is blocked."); }
    finally { await folder.close(); }
  }
  async store(input: ProfileState, current: () => void = () => {}): Promise<void> {
    if (!this.loaded || this.busy) throw new DesktopError("Desktop history is unavailable or busy. Reopen and inspect it before writing.");
    const next = profileState(input), raw = JSON.stringify(next); this.busy = true;
    let folder: FileHandle | undefined; let temporary = "";
    try {
      current(); folder = await this.folder();
      if (await this.read(folder) !== this.before) throw new DesktopError("Desktop history changed in another process. Reopen without discarding it.");
      temporary = `.state-${randomUUID()}`;
      const file = await open(fdPath(folder, temporary), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { await file.writeFile(raw, "utf8"); await file.sync(); } finally { await file.close(); }
      current();
      if (await this.read(folder) !== this.before) throw new DesktopError("Desktop history changed before commit. Preserve it and reopen.");
      current(); await this.assertFolder(folder); await rename(fdPath(folder, temporary), fdPath(folder, this.filename)); temporary = ""; await folder.sync(); await this.assertFolder(folder);
      this.before = raw; this.state = next;
    } catch (error) { this.loaded = false; throw error; }
    finally { if (folder) { if (temporary) await unlink(fdPath(folder, temporary)).catch(() => {}); await folder.close(); } this.busy = false; }
  }
}
