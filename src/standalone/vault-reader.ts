import { createHash } from "node:crypto";
import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { lstat, open, opendir, type FileHandle } from "node:fs/promises";
import { basename, isAbsolute, normalize } from "node:path";
import { DesktopError, permitted, relativePath, scopeInput } from "./security.ts";
import type { NoteList, NoteSnapshot, ReadScope, VaultInfo } from "./contracts.ts";
import { PDF_LIMITS } from "../pdf/record.ts";
import { pdfPath } from "../pdf/scope.ts";

export const READ_LIMITS = { notes: 500, entries: 5000, depth: 16, bytes: 2 * 1024 * 1024, milliseconds: 10000, pdfs: 200, pdfConsent: 100 } as const;
const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
export const fdPath = (handle: FileHandle, part?: string): string => `/proc/self/fd/${handle.fd}${part ? `/${part}` : ""}`;
const stamp = (stat: Stats): string => [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
interface Selection { path: string; dev: number; ino: number; revision: number; scope: ReadScope; pdfs: string[]; }
export interface PdfOriginal { path: string; bytes: Uint8Array; hash: string; stamp: string; }

// Directory-relative descriptors prevent a parent rename/symlink swap from
// redirecting a later open outside the selected root on the supported Linux host.
export async function absoluteDirectory(path: string): Promise<FileHandle> {
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
    return selected ? { name: basename(selected.path) || selected.path, path: selected.path, revision: selected.revision, scope: structuredClone(selected.scope), pdfs: [...selected.pdfs] } : null;
  }
  async select(path: string): Promise<VaultInfo> {
    const epoch = this.revision;
    const root = await absoluteDirectory(path);
    try {
      const stat = await root.stat();
      if (epoch !== this.revision) throw new DesktopError("Vault selection changed. Select the vault again.");
      this.selection = { path, dev: stat.dev, ino: stat.ino, revision: ++this.revision, scope: { roots: [], excluded: [] }, pdfs: [] };
      return this.getInfo()!;
    } finally { await root.close(); }
  }
  grant(input: unknown, revision: unknown): VaultInfo {
    const selected = this.current(revision), scope = scopeInput(input);
    // Read-scope changes always clear PDF consent; it is never carried to a new scope.
    this.selection = { ...selected, scope, pdfs: [], revision: ++this.revision };
    return this.getInfo()!;
  }
  /** Volatile exact-file binary consent inside the current read scope; Markdown grants never imply it. */
  async consentPdf(input: unknown, granted: unknown, revision: unknown): Promise<VaultInfo> {
    const selected = this.current(revision); let path: string;
    try { path = pdfPath(relativePath(input)); } catch { throw new DesktopError("Choose an exact listed PDF inside the approved read scope."); }
    if (typeof granted !== "boolean" || !permitted(path, selected.scope)) throw new DesktopError("Choose an exact listed PDF inside the approved read scope.");
    const limit = (pdfs: string[]): void => { if (pdfs.filter(item => item !== path).length >= READ_LIMITS.pdfConsent) throw new DesktopError(`Grant at most ${READ_LIMITS.pdfConsent} PDFs. Revoke one first.`); };
    if (granted) {
      limit(selected.pdfs);
      const handle = await this.openPath(selected, path);
      try { const stat = await handle.stat(); if (!stat.isFile() || stat.nlink !== 1) throw new DesktopError("Only ordinary single-link PDF files can be granted."); }
      finally { await handle.close(); }
    }
    // Recompute from the live selection so a concurrent revoke or grant is never lost or undone.
    // Consent keeps the vault revision so writer ownership survives; main resets evidence and dependent work instead.
    const now = this.current(revision); if (granted) limit(now.pdfs);
    const pdfs = now.pdfs.filter(item => item !== path); if (granted) pdfs.push(path);
    this.selection = { ...now, pdfs: pdfs.sort((a, b) => a.localeCompare(b)) };
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
  async identity(revision: unknown): Promise<string> {
    const selected = this.current(revision), root = await this.openRoot(selected);
    try { const stat = await root.stat(); this.current(revision); return createHash("sha256").update(`${stat.dev}:${stat.ino}`).digest("hex"); }
    finally { await root.close(); }
  }
  /** Explicit metadata consent only; never added to the text index or read grants. */
  async pluginFiles(input: unknown, revision: unknown): Promise<Record<string, string | null>> {
    if (typeof input !== "string" || !/^[.]?[A-Za-z0-9_-]{1,100}$/.test(input)) throw new DesktopError("Use a single ordinary Obsidian configuration folder name, such as .obsidian.");
    const selected = this.current(revision), base = `${input}/plugins/thread`, files: Record<string, string | null> = {};
    let total = 0;
    for (const [name, limit] of [["manifest.json", 65536], ["data.json", 1048576], ["changes.json", 24 * 1048576], ["project-imports.json", 16 * 1048576]] as const) {
      const path = `${base}/${name}`;
      if (selected.scope.excluded.some(root => root === "." || path === root || path.startsWith(`${root}/`))) throw new DesktopError("Plugin metadata is excluded. Review exclusions explicitly before compatibility inspection.");
      let file: FileHandle;
      try { file = await this.openPath(selected, path); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") { files[name] = null; continue; } throw new DesktopError("Plugin metadata is unavailable or uses a link. Preserve it; writing remains disabled."); }
      try {
        const before = await file.stat();
        if (!before.isFile() || before.nlink !== 1 || before.size > limit) throw new DesktopError("Plugin metadata exceeds its ordinary-file budget. Preserve it; writing remains disabled.");
        const buffer = Buffer.alloc(before.size + 1); let count = 0;
        while (count < buffer.length) { this.current(revision); const part = await file.read(buffer, count, buffer.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
        const after = await file.stat(), current = await this.openPath(selected, path);
        let actual; try { actual = await current.stat(); } finally { await current.close(); }
        if (count !== before.size || stamp(after) !== stamp(before) || stamp(actual) !== stamp(before)) throw new DesktopError("Plugin metadata changed. Inspect compatibility again.");
        this.current(revision); total += count;
        if (total > 40 * 1048576) throw new DesktopError("Plugin metadata exceeds the 40 MiB inspection budget.");
        files[name] = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, count));
      } finally { await file.close(); }
    }
    const root = await this.openRoot(selected); await root.close(); this.current(revision); return files;
  }
  async list(revision: unknown): Promise<NoteList> {
    const selected = this.current(revision);
    const result: NoteList = { revision: selected.revision, paths: [], files: {}, omitted: 0, omittedMarkdown: 0, identityIncomplete: false, limited: false, pdfs: {}, pdfLimited: false };
    const seen = new Set<string>(); let visited = 0;
    const deadline = performance.now() + READ_LIMITS.milliseconds;
    const bounded = (): boolean => {
      this.current(selected.revision);
      if (visited >= READ_LIMITS.entries || result.paths.length >= READ_LIMITS.notes || performance.now() > deadline) { result.limited = true; result.identityIncomplete = true; return true; }
      return false;
    };
    // PDFs stay omitted from the text listing; their stamps only feed consent and change detection.
    const pdf = (path: string, stat: Stats): void => {
      if (!path.toLowerCase().endsWith(".pdf") || !stat.isFile() || stat.nlink !== 1) return;
      if (Object.keys(result.pdfs).length >= READ_LIMITS.pdfs) { result.pdfLimited = true; return; }
      result.pdfs[path] = { stamp: stamp(stat), bytes: stat.size };
    };
    const walk = async (path: string, depth: number): Promise<void> => {
      if (seen.has(path) || !permitted(path, selected.scope) || bounded()) return;
      seen.add(path);
      if (depth > READ_LIMITS.depth) { result.limited = true; result.identityIncomplete = true; return; }
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
            try { relativePath(child); } catch { result.omitted++; result.identityIncomplete = true; continue; }
            if (!permitted(child, selected.scope)) continue;
            if (entry.isSymbolicLink()) { result.omitted++; result.identityIncomplete = true; continue; }
            if (entry.isDirectory() || entry.isFile() && child.toLowerCase().endsWith(".md")) await walk(child, depth + 1);
            else {
              result.omitted++; if (child.toLowerCase().endsWith(".md")) { result.omittedMarkdown++; result.identityIncomplete = true; }
              else if (entry.isFile() && child.toLowerCase().endsWith(".pdf")) { try { pdf(child, await lstat(fdPath(handle, entry.name))); } catch { /* Unreadable PDFs stay unlisted; text enumeration is unaffected. */ } }
            }
          }
        } else if (stat.isFile() && stat.nlink === 1 && path.toLowerCase().endsWith(".md") && stat.size <= READ_LIMITS.bytes) {
          result.paths.push(path);
          result.files[path] = { stamp: stamp(stat), bytes: stat.size };
        } else {
          result.omitted++;
          if (path.toLowerCase().endsWith(".md")) { result.omittedMarkdown++; result.identityIncomplete = true; }
          else pdf(path, stat);
        }
      } catch (error) {
        this.current(selected.revision);
        if (error instanceof DesktopError) throw error;
        result.omitted++;
        // Failed directory traversal may conceal any number of Markdown IDs.
        // Do not turn that unknown count into a fabricated file total.
        result.identityIncomplete = true;
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
  async read(input: unknown, revision: unknown, byteLimit: number = READ_LIMITS.bytes): Promise<NoteSnapshot> {
    if (!Number.isSafeInteger(byteLimit) || byteLimit < 0 || byteLimit > READ_LIMITS.bytes) throw new DesktopError("Invalid read budget.");
    const path = relativePath(input), selected = this.current(revision);
    if (!path.toLowerCase().endsWith(".md") || !permitted(path, selected.scope)) throw new DesktopError("This Markdown note is outside the approved read scope.");
    const handle = await this.openPath(selected, path);
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.nlink !== 1 || before.size > byteLimit) throw new DesktopError("Only ordinary single-link Markdown files within the read budget (at most 2 MiB) can be read.");
      const buffer = Buffer.alloc(byteLimit + 1);
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
      if (count > byteLimit || count !== before.size || [after, actual].some(stat => stat.dev !== before.dev || stat.ino !== before.ino || stat.nlink !== 1 || stat.size !== before.size || stat.mtimeMs !== before.mtimeMs || stat.ctimeMs !== before.ctimeMs)) {
        throw new DesktopError("The source changed while reading. Refresh and open it again.");
      }
      this.current(selected.revision);
      let text: string;
      // A leading BOM is part of the original snapshot and its conflict hash.
      try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, count)); }
      catch { throw new DesktopError("This note is not valid UTF-8 text."); }
      return { revision: selected.revision, path, text, modifiedAt: after.mtimeMs, stamp: stamp(after) };
    } finally { await handle.close(); }
  }
  /** Current SHA-256 of a permitted note's text, or of a consented PDF original's bytes. */
  async currentHash(path: string, revision: unknown, current: () => void = () => {}, byteLimit: number = READ_LIMITS.bytes): Promise<string> {
    if (/\.pdf$/i.test(path)) return (await this.readPdf(path, revision, current)).hash;
    return createHash("sha256").update((await this.read(path, revision, byteLimit)).text).digest("hex");
  }
  /** Main only: bytes of an explicitly consented PDF; the renderer never names an absolute path. */
  async readPdf(input: unknown, revision: unknown, current: () => void = () => {}): Promise<PdfOriginal> {
    const selected = this.current(revision); let path: string;
    try { path = pdfPath(relativePath(input)); } catch { throw new DesktopError("PDF consent or scope changed. Select the current PDF and grant access explicitly."); }
    const allowed = (): void => { current(); const now = this.current(revision); if (!now.pdfs.includes(path) || !permitted(path, now.scope)) throw new DesktopError("PDF consent or scope changed. Select the current PDF and grant access explicitly."); };
    allowed();
    let handle: FileHandle;
    try { handle = await this.openPath(selected, path); } catch { allowed(); throw new DesktopError("The selected PDF is missing or uses a link. Select an existing ordinary vault PDF."); }
    try {
      const before = await handle.stat(); allowed();
      if (!before.isFile() || before.nlink !== 1) throw new DesktopError("Only ordinary single-link PDF files can be read.");
      if (before.size > PDF_LIMITS.bytes) throw new DesktopError("PDF exceeds the 16 MiB input limit.");
      const buffer = Buffer.alloc(before.size + 1); let count = 0;
      while (count < buffer.length) { allowed(); const part = await handle.read(buffer, count, buffer.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
      const after = await handle.stat(), fresh = await this.openPath(selected, path);
      let actual; try { actual = await fresh.stat(); } finally { await fresh.close(); }
      if (count !== before.size || stamp(after) !== stamp(before) || stamp(actual) !== stamp(before)) throw new DesktopError("PDF moved or changed during reading. Select it again.");
      allowed();
      // Exactly sized copy: budgets charge the backing buffer length.
      const bytes = new Uint8Array(buffer.subarray(0, count));
      return { path, bytes, hash: createHash("sha256").update(bytes).digest("hex"), stamp: stamp(after) };
    } finally { await handle.close(); }
  }
}
