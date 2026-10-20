import { constants, lstatSync, openSync, closeSync, fstatSync, readSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { check, json, digest, releaseLimits, releaseFiles, updateFile, decodeRelease, validateRuntime, compareVersions, compatibleHost, type FileDigest, type Release } from "./update-package.ts";
export interface DirectoryIdentity { path: string; dev: number; ino: number; }
export const dataSchemas = { "data.json": 1, "changes.json": 1, "imports.json": 1, "renames.json": 1, "project-imports.json": 1, "index.json": 2 } as const;
export interface TargetSnapshot { directories: DirectoryIdentity[]; version: string; dataFormat: string | null; runtime: Record<string, FileDigest | null>; data: Record<string, FileDigest | null>; }
export interface UpdatePreview {
  schemaVersion: 1; packagePath: string; installPath: string; hostVersion: string;
  package: FileDigest & { version: string; dataFormat: string };
  target: TargetSnapshot; rollbackCompatible: boolean;
  changes: { path: string; action: "add" | "replace" | "unchanged"; before: FileDigest | null; after: FileDigest }[];
}
export function absolutePath(path: string): string {
  check(typeof path === "string" && path.length <= 4096 && isAbsolute(path) && resolve(path) === path && !/[\u0000-\u001f\u007f]/.test(path), "Use a normalized absolute local path without control characters."); return path;
}
export function containsPath(root: string, path: string): boolean { return path === root || path.startsWith(root + sep); }
export function directories(path: string): DirectoryIdentity[] {
  absolutePath(path); const parents: string[] = []; let at = path;
  while (true) { parents.unshift(at); const parent = dirname(at); if (parent === at) break; at = parent; }
  return parents.map(path => { const stat = lstatSync(path); check(stat.isDirectory() && !stat.isSymbolicLink(), "Update paths require ordinary directories, never symbolic links."); return { path, dev: stat.dev, ino: stat.ino }; });
}
export function readOrdinary(path: string, limit: number): Buffer {
  absolutePath(path); const beforeParents = directories(dirname(path)), before = lstatSync(path);
  check(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= limit, "Update inputs must be bounded regular files without links.");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = fstatSync(fd); check(opened.dev === before.dev && opened.ino === before.ino && opened.isFile() && opened.nlink === 1 && opened.size <= limit, "Input changed while opening.");
    const bytes = Buffer.alloc(opened.size + 1); let used = 0, read = 0;
    do { read = readSync(fd, bytes, used, bytes.length - used, used); used += read; } while (read && used < bytes.length);
    const after = fstatSync(fd), current = lstatSync(path);
    check(used === opened.size && after.size === opened.size && after.mtimeMs === opened.mtimeMs && after.ctimeMs === opened.ctimeMs && current.dev === opened.dev && current.ino === opened.ino && current.isFile() && current.nlink === 1 && current.mtimeMs === after.mtimeMs && current.ctimeMs === after.ctimeMs && JSON.stringify(beforeParents) === JSON.stringify(directories(dirname(path))), "Input or parent directory changed while reading. Preview again.");
    return bytes.subarray(0, used);
  } finally { closeSync(fd); }
}
export function maybeRead(path: string, limit: number): Buffer | null {
  try { lstatSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } return readOrdinary(path, limit);
}
export function targetSnapshot(installPath: string, hostVersion: string): { snapshot: TargetSnapshot; release: Release } {
  absolutePath(installPath); compatibleHost(hostVersion);
  check(basename(installPath) === "thread" && basename(dirname(installPath)) === "plugins" && basename(dirname(dirname(installPath))) === ".obsidian", "Choose the exact .obsidian/plugins/thread installation directory.");
  const parents = directories(installPath), files = new Map<string, Buffer>(); let runtimeBytes = 0;
  for (const path of releaseFiles) { const bytes = readOrdinary(join(installPath, path), Math.min(releaseLimits.file, releaseLimits.total - runtimeBytes)); runtimeBytes += bytes.length; files.set(path, bytes); }
  const metadata = maybeRead(join(installPath, updateFile), Math.min(releaseLimits.metadata, releaseLimits.total - runtimeBytes)); if (metadata) files.set(updateFile, metadata);
  const release = validateRuntime(files, true), runtime: TargetSnapshot["runtime"] = {};
  for (const path of [...releaseFiles, updateFile]) runtime[path] = files.has(path) ? digest(files.get(path)!) : null;
  const data: TargetSnapshot["data"] = {}; let total = 0;
  for (const [path, schema] of Object.entries(dataSchemas)) {
    const bytes = maybeRead(join(installPath, path), Math.min(32 * 1048576, 64 * 1048576 - total)); if (!bytes) { data[path] = null; continue; }
    total += bytes.length; check(total <= 64 * 1048576, "Plugin data exceeds the compatibility inspection budget. Preserve it; no update was applied.");
    const value = json(bytes, 32 * 1048576); check(value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).schemaVersion === schema, "Unsupported plugin data schema. Preserve data and use compatible code; no migration is attempted."); data[path] = digest(bytes);
  }
  check(JSON.stringify(parents) === JSON.stringify(directories(installPath)), "Installation directory changed during preview.");
  return { release, snapshot: { directories: parents, version: release.version, dataFormat: release.metadata?.dataFormat ?? null, runtime, data } };
}
export function previewUpdate(packagePath: string, installPath: string, hostVersion: string): UpdatePreview {
  absolutePath(packagePath); absolutePath(installPath); compatibleHost(hostVersion);
  check(!containsPath(installPath, packagePath), "Keep the selected package outside the installation.");
  const bytes = readOrdinary(packagePath, releaseLimits.archive), next = decodeRelease(bytes), first = targetSnapshot(installPath, hostVersion);
  check(compareVersions(next.version, first.snapshot.version) >= 0, "Downgrades are not ordinary updates. Compatible previous-code rollback is a separate reviewed action.");
  const second = targetSnapshot(installPath, hostVersion);
  check(JSON.stringify(first.snapshot) === JSON.stringify(second.snapshot) && digest(readOrdinary(packagePath, releaseLimits.archive)).sha256 === digest(bytes).sha256, "Package or installation changed. Prepare a fresh preview.");
  return { schemaVersion: 1, packagePath, installPath, hostVersion, package: { ...digest(bytes), version: next.version, dataFormat: next.metadata!.dataFormat }, target: first.snapshot,
    rollbackCompatible: first.snapshot.dataFormat === next.metadata!.dataFormat,
    changes: [...releaseFiles, updateFile].map(path => { const before = first.snapshot.runtime[path] ?? null, after = digest(next.files.get(path)!); return { path, before, after, action: !before ? "add" : before.sha256 === after.sha256 ? "unchanged" : "replace" }; }) };
}
export function writePreview(path: string, preview: UpdatePreview): FileDigest {
  absolutePath(path); check(!containsPath(preview.installPath, path), "Save preview artifacts outside the installation."); directories(dirname(path));
  check(JSON.stringify(previewUpdate(preview.packagePath, preview.installPath, preview.hostVersion)) === JSON.stringify(preview), "Package or installation changed before publishing the preview. Prepare a new preview.");
  const bytes = Buffer.from(JSON.stringify(preview, null, 2) + "\n"); check(bytes.length <= releaseLimits.metadata, "Preview metadata exceeds its limit."); writeFileSync(path, bytes, { flag: "wx", mode: 0o600 }); return digest(bytes);
}
