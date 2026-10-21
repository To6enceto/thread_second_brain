import { constants } from "node:fs";
import { open, mkdir, rename, unlink, type FileHandle } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DesktopError } from "./security.ts";
import { absoluteDirectory, fdPath } from "./vault-reader.ts";

/** Main-only durable state; callers supply a finite filename and validated schema. */
export class ProfileFile<T> {
  private directory: string;
  private filename: string;
  private before: string | null = null;
  private loaded = false;
  private busy = false;
  state: T;
  private validate: (input: unknown) => T | Promise<T>;
  private maxBytes: number;
  constructor(profileDirectory: string, filename: string, initial: T, validate: (input: unknown) => T | Promise<T>, maxBytes: number) {
    if (!/^(?:vault|changes)-[a-f0-9]{64}\.json$/.test(filename)) throw new DesktopError("Invalid vault identity.");
    this.directory = profileDirectory; this.filename = filename; this.state = initial; this.validate = validate; this.maxBytes = maxBytes;
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
      if (!before.isFile() || before.nlink !== 1 || before.size > this.maxBytes) throw new DesktopError("Desktop profile is not an ordinary bounded state file. Preserve it.");
      const bytes = Buffer.alloc(before.size + 1); let count = 0;
      while (count < bytes.length) { const part = await file.read(bytes, count, bytes.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
      const after = await file.stat();
      if (count !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new DesktopError("Desktop profile changed while reading. Reopen Thread.");
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, count));
    } finally { await file.close(); }
  }
  async load(): Promise<T> {
    this.loaded = false;
    const folder = await this.folder();
    try {
      const raw = await this.read(folder); const next = await this.validate(raw === null ? structuredClone(this.state) : JSON.parse(raw));
      await this.assertFolder(folder); this.before = raw; this.state = next; this.loaded = true; return structuredClone(next);
    } catch { throw new DesktopError("Desktop state is invalid or unavailable. Preserve the profile; do not reset it. Reading notes remains available, but saving is blocked."); }
    finally { await folder.close(); }
  }
  async store(input: T, current: () => void = () => {}): Promise<void> {
    if (!this.loaded || this.busy) throw new DesktopError("Desktop history is unavailable or busy. Reopen and inspect it before writing.");
    this.busy = true;
    let folder: FileHandle | undefined; let temporary = "";
    try {
      const next = await this.validate(input), raw = JSON.stringify(next);
      if (Buffer.byteLength(raw) > this.maxBytes) throw new DesktopError("Desktop history exceeds its byte limit. Preserve it; no entries were deleted.");
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
