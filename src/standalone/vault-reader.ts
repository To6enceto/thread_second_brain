import { constants } from "node:fs";
import { open, opendir, type FileHandle } from "node:fs/promises";
import { basename, isAbsolute, normalize } from "node:path";
import { DesktopError, permitted, relativePath, scopeInput } from "./security.ts";
import type { NoteList, NoteSnapshot, ReadScope, VaultInfo } from "./contracts.ts";

export const READ_LIMITS = { notes: 500, entries: 5000, depth: 16, bytes: 2 * 1024 * 1024, milliseconds: 10000 } as const;
const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const fdPath = (handle: FileHandle, part?: string): string => `/proc/self/fd/${handle.fd}${part ? `/${part}` : ""}`;
interface Selection { path: string; dev: number; ino: number; revision: number; scope: ReadScope; }

// Directory-relative descriptors prevent a parent rename/symlink swap from
// redirecting a later open outside the selected root on the supported Linux host.
async function absoluteDirectory(path: string): Promise<FileHandle> {
  if (!isAbsolute(path) || normalize(path) !== path || path.includes("\0")) throw new DesktopError("Choose an ordinary absolute directory.");
  let handle = await open("/", directoryFlags);
  try {
    for (const part of path.split("/").filter(Boolean)) {
      const next = await open(fdPath(handle, part), directoryFlags);
      await handle.close(); handle = next;
    }
    return handle;
  } catch (error) { await handle.close(); throw error; }
}

export class VaultReader {
  private selection: Selection | null = null;
  private revision = 0;

  close(): void { this.revision++; this.selection = null; }
  getInfo(): VaultInfo | null {
    const selected = this.selection;
    return selected ? { name: basename(selected.path) || selected.path, path: selected.path, revision: selected.revision, scope: structuredClone(selected.scope) } : null;
  }
  async select(path: string): Promise<VaultInfo> {
    const epoch = this.revision;
    const root = await absoluteDirectory(path);
    try {
      const stat = await root.stat();
      if (epoch !== this.revision) throw new DesktopError("Vault selection changed. Select the vault again.");
      this.selection = { path, dev: stat.dev, ino: stat.ino, revision: ++this.revision, scope: { roots: [], excluded: [] } };
      return this.getInfo()!;
    } finally { await root.close(); }
  }
  grant(input: unknown, revision: unknown): VaultInfo {
    const selected = this.current(revision), scope = scopeInput(input);
    this.selection = { ...selected, scope, revision: ++this.revision };
    return this.getInfo()!;
  }
  private current(revision: unknown): Selection {
    if (!this.selection || !Number.isSafeInteger(revision) || revision !== this.selection.revision) {
      throw new DesktopError("Vault or read access changed. Refresh before reading.");
    }
    return this.selection;
  }
  private async openRoot(selected: Selection): Promise<FileHandle> {
    this.current(selected.revision);
    const root = await absoluteDirectory(selected.path);
    const stat = await root.stat();
    if (stat.dev !== selected.dev || stat.ino !== selected.ino) {
      await root.close(); throw new DesktopError("The selected vault was replaced. Select it again and review access.");
    }
    return root;
  }
  private async openPath(selected: Selection, path: string): Promise<FileHandle> {
    let handle = await this.openRoot(selected);
    try {
      const parts = path === "." ? [] : path.split("/");
      for (const [index, part] of parts.entries()) {
        const flags = index === parts.length - 1
          ? constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK : directoryFlags;
        const next = await open(fdPath(handle, part), flags);
        await handle.close(); handle = next;
      }
      return handle;
    } catch (error) { await handle.close(); throw error; }
  }
  async list(revision: unknown): Promise<NoteList> {
    const selected = this.current(revision);
    const result: NoteList = { revision: selected.revision, paths: [], omitted: 0, limited: false };
    const seen = new Set<string>(); let visited = 0;
    const deadline = performance.now() + READ_LIMITS.milliseconds;
    const bounded = (): boolean => {
      this.current(selected.revision);
      if (visited >= READ_LIMITS.entries || result.paths.length >= READ_LIMITS.notes || performance.now() > deadline) { result.limited = true; return true; }
      return false;
    };
    const walk = async (path: string, depth: number): Promise<void> => {
      if (seen.has(path) || !permitted(path, selected.scope) || bounded()) return;
      seen.add(path);
      if (depth > READ_LIMITS.depth) { result.limited = true; return; }
      let handle: FileHandle | undefined;
      try {
        handle = await this.openPath(selected, path);
        const stat = await handle.stat();
        if (stat.isDirectory()) {
          const directory = await opendir(fdPath(handle));
          for await (const entry of directory) {
            if (bounded()) break;
            visited++;
            if (entry.name.startsWith(".")) continue;
            const child = path === "." ? entry.name : `${path}/${entry.name}`;
            try { relativePath(child); } catch { result.omitted++; continue; }
            if (!permitted(child, selected.scope)) continue;
            if (entry.isSymbolicLink()) { result.omitted++; continue; }
            if (entry.isDirectory() || entry.isFile() && child.toLowerCase().endsWith(".md")) await walk(child, depth + 1);
            else result.omitted++;
          }
        } else if (stat.isFile() && stat.nlink === 1 && path.toLowerCase().endsWith(".md") && stat.size <= READ_LIMITS.bytes) {
          result.paths.push(path);
        } else result.omitted++;
      } catch (error) {
        this.current(selected.revision);
        if (error instanceof DesktopError) throw error;
        result.omitted++;
      } finally { await handle?.close(); }
    };
    // Eliminate nested roots to avoid duplicate traversal and inconsistent budgets.
    const roots = selected.scope.roots.filter(path => !selected.scope.roots.some(other => other !== path && (other === "." || path.startsWith(`${other}/`))));
    for (const root of roots) await walk(root, 0);
    const check = await this.openRoot(selected); await check.close();
    this.current(selected.revision);
    result.paths.sort((a, b) => a.localeCompare(b));
    return result;
  }
  async read(input: unknown, revision: unknown): Promise<NoteSnapshot> {
    const path = relativePath(input), selected = this.current(revision);
    if (!path.toLowerCase().endsWith(".md") || !permitted(path, selected.scope)) throw new DesktopError("This Markdown note is outside the approved read scope.");
    const handle = await this.openPath(selected, path);
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.nlink !== 1 || before.size > READ_LIMITS.bytes) throw new DesktopError("Only ordinary single-link Markdown files up to 2 MiB can be read.");
      const buffer = Buffer.alloc(READ_LIMITS.bytes + 1);
      let count = 0;
      while (count < buffer.length) {
        this.current(selected.revision);
        const part = await handle.read(buffer, count, buffer.length - count, count);
        if (!part.bytesRead) break;
        count += part.bytesRead;
      }
      const after = await handle.stat();
      const current = await this.openPath(selected, path);
      let actual;
      try { actual = await current.stat(); } finally { await current.close(); }
      if (count > READ_LIMITS.bytes || count !== before.size || [after, actual].some(stat => stat.dev !== before.dev || stat.ino !== before.ino || stat.nlink !== 1 || stat.size !== before.size || stat.mtimeMs !== before.mtimeMs || stat.ctimeMs !== before.ctimeMs)) {
        throw new DesktopError("The source changed while reading. Refresh and open it again.");
      }
      this.current(selected.revision);
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, count)); }
      catch { throw new DesktopError("This note is not valid UTF-8 text."); }
      return { revision: selected.revision, path, text, modifiedAt: after.mtimeMs };
    } finally { await handle.close(); }
  }
}
