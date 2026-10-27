import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync } from "node:fs";
import { mkdir, open, opendir, type FileHandle } from "node:fs/promises";
import { absoluteDirectory, fdPath, type VaultReader } from "./vault-reader.ts";
import { DesktopError, relativePath } from "./security.ts";
import { hashText } from "./profile.ts";

const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const code = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code;

/** Main-only create-only file operations for packages and imports; callers enforce destination policy. */
export class VaultFiles {
  private reader: VaultReader;
  constructor(reader: VaultReader) { this.reader = reader; }
  private async root(revision: unknown): Promise<FileHandle> {
    const expected = await this.reader.identity(revision), info = this.reader.getInfo()!, handle = await absoluteDirectory(info.path), stat = await handle.stat();
    if (hashText(`${stat.dev}:${stat.ino}`) !== expected || this.reader.getInfo()?.revision !== revision) { await handle.close(); throw new DesktopError("Vault identity changed. Select it again."); }
    return handle;
  }
  /** Walks parent folders without following links; returns the parent handle or null when a parent is missing. */
  private async parent(path: string, revision: unknown, create: boolean): Promise<{ handle: FileHandle; name: string } | null> {
    const parts = relativePath(path).split("/"); let handle = await this.root(revision);
    try {
      for (const part of parts.slice(0, -1)) {
        let next: FileHandle;
        try { next = await open(fdPath(handle, part), directoryFlags); }
        catch (error) {
          if (code(error) === "ENOENT" && create) { await mkdir(fdPath(handle, part)); await handle.sync(); next = await open(fdPath(handle, part), directoryFlags); }
          else if (code(error) === "ENOENT") { await handle.close(); return null; }
          else throw new DesktopError("A destination folder is unavailable, a file or a link. Choose an ordinary new location.");
        }
        await handle.close(); handle = next;
      }
      return { handle, name: parts.at(-1)! };
    } catch (error) { await handle.close(); throw error; }
  }
  private pinned: { revision: unknown; dev: number; ino: number; path: string } | null = null;
  /** Captures the verified vault root so synchronous lookups can recheck it; call before each import run. */
  async pin(revision: unknown): Promise<void> { const handle = await this.root(revision); try { const stat = await handle.stat(); this.pinned = { revision, dev: stat.dev, ino: stat.ino, path: this.reader.getInfo()!.path }; } finally { await handle.close(); } }
  /** Synchronous descriptor-relative lookup for the shared importer; never follows links. */
  kindSync(path: string, revision: unknown): "file" | "folder" | null {
    const pinned = this.pinned; if (!pinned || pinned.revision !== revision || this.reader.getInfo()?.revision !== revision) throw new DesktopError("Vault or access changed. Preview the import again.");
    const parts = relativePath(path).split("/"), fds: number[] = [];
    try {
      let fd = openSync("/", directoryFlags); fds.push(fd);
      for (const part of pinned.path.split("/").filter(Boolean)) { fd = openSync(`/proc/self/fd/${fd}/${part}`, directoryFlags); fds.push(fd); }
      const root = fstatSync(fd); if (root.dev !== pinned.dev || root.ino !== pinned.ino) throw new DesktopError("Vault identity changed. Select it again.");
      for (const [index, part] of parts.entries()) {
        try { fd = openSync(`/proc/self/fd/${fd}/${part}`, index === parts.length - 1 ? constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK : directoryFlags); }
        catch (error) { if (code(error) === "ENOENT") return null; throw new DesktopError("A destination is a link, a file blocking a folder or unavailable. Nothing was overwritten."); }
        fds.push(fd);
      }
      const stat = fstatSync(fd); if (stat.isDirectory()) return "folder"; if (stat.isFile()) return "file"; throw new DesktopError("A destination is not an ordinary file or folder.");
    } finally { for (const fd of fds) closeSync(fd); }
  }
  async kind(path: string, revision: unknown): Promise<"file" | "folder" | null> {
    const found = await this.parent(path, revision, false); if (!found) return null;
    try {
      let target: FileHandle;
      try { target = await open(fdPath(found.handle, found.name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
      catch (error) { if (code(error) === "ENOENT") return null; throw new DesktopError("A destination is a link or unavailable. Nothing was overwritten."); }
      try { const stat = await target.stat(); if (stat.isDirectory()) return "folder"; if (stat.isFile()) return "file"; throw new DesktopError("A destination is not an ordinary file or folder."); }
      finally { await target.close(); }
    } finally { await found.handle.close(); }
  }
  /** Refuses names that differ only by case or Unicode normalization at every level, up to 5000 entries per folder. */
  async collision(path: string, revision: unknown): Promise<void> {
    const parts = relativePath(path).split("/"); let handle = await this.root(revision);
    try {
      for (const [index, part] of parts.entries()) {
        const directory = await opendir(fdPath(handle)); let count = 0;
        for await (const entry of directory) {
          if (++count > 5000) throw new DesktopError("A destination folder exceeds the 5000-entry inspection limit. Choose a smaller folder.");
          if (entry.name !== part && entry.name.normalize("NFC").toLowerCase() === part.normalize("NFC").toLowerCase()) throw new DesktopError("A destination collides by case or Unicode normalization. Choose a new name.");
        }
        if (index === parts.length - 1) break;
        let next: FileHandle; try { next = await open(fdPath(handle, part), directoryFlags); } catch (error) { if (code(error) === "ENOENT") break; throw new DesktopError("A destination folder is unavailable or a link."); }
        await handle.close(); handle = next;
      }
    } finally { await handle.close(); }
  }
  async folder(path: string, revision: unknown): Promise<void> {
    const found = await this.parent(path, revision, true);
    try { await mkdir(fdPath(found!.handle, found!.name)); await found!.handle.sync(); }
    catch (error) { if (code(error) === "EEXIST") throw new DesktopError("A destination folder appeared concurrently. Nothing was overwritten."); throw error; }
    finally { await found!.handle.close(); }
  }
  /** Create-only write; existing names are never replaced. */
  async create(path: string, bytes: Uint8Array, revision: unknown, makeParents = false): Promise<void> {
    const found = await this.parent(path, revision, makeParents); if (!found) throw new DesktopError("A destination folder is missing. Preview again.");
    try {
      let file: FileHandle;
      try { file = await open(fdPath(found.handle, found.name), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644); }
      catch (error) { if (code(error) === "EEXIST") throw new DesktopError("That destination already exists. Nothing was overwritten."); throw error; }
      try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
      await found.handle.sync();
    } finally { await found.handle.close(); }
  }
  async hash(path: string, revision: unknown, limit: number): Promise<string> {
    const found = await this.parent(path, revision, false); if (!found) throw new DesktopError("A written copy is missing.");
    try {
      const file = await open(fdPath(found.handle, found.name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const stat = await file.stat(); if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit) throw new DesktopError("A written copy is not an ordinary file within its limit.");
        const buffer = Buffer.alloc(stat.size + 1); let count = 0;
        while (count < buffer.length) { const part = await file.read(buffer, count, buffer.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
        if (count !== stat.size) throw new DesktopError("A written copy changed while verifying.");
        return createHash("sha256").update(buffer.subarray(0, count)).digest("hex");
      } finally { await file.close(); }
    } finally { await found.handle.close(); }
  }
}
