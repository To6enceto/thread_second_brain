// Linux-only explicit code replacement tooling; not loaded by Obsidian.
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { check, compareVersions, decodeRelease, digest, encodeRelease, exactObject, json, releaseFiles, releaseLimits, updateFile, validateRuntime, type Release } from "./update-package.ts";
import { absolutePath, containsPath, dataSchemas, directories, maybeRead, previewUpdate, readOrdinary, snapshotData, targetSnapshot, validateInstallationPath, type DirectoryIdentity, type UpdatePreview, type TargetSnapshot } from "./update-preview.ts";

const names = [...releaseFiles, updateFile], lockName = ".thread-update-lock", pendingName = ".thread-update-pending";
const lockBytes = Buffer.from("Thread update coordinator v1\n");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const encoded = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + "\n");
export interface UpdateIntent {
  schemaVersion: 1; id: string; approvalSha256: string; direction: "update" | "rollback"; preview: UpdatePreview;
  stateDirectories: DirectoryIdentity[]; installDirectories: DirectoryIdentity[];
}
export interface RollbackApproval { schemaVersion: 1; kind: "rollback"; completedStatePath: string; intentSha256: string; preview: UpdatePreview; }
export interface UpdateHooks {
  closed: () => void;
  checkpoint?: (event: string, intentSha256: string) => void;
}
function syncDirectory(path: string): void {
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function writeExclusive(path: string, bytes: Buffer): void {
  directories(dirname(path)); const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(dirname(path));
}
function publishRecord(path: string, bytes: Buffer): void {
  const parent = dirname(path), identity = directories(parent);
  check(!maybeRead(path, releaseLimits.metadata), "Coordinator record already exists. Preserve it; do not overwrite.");
  const temp = join(parent, `.thread-update-${basename(path)}-${randomUUID()}.tmp`);
  writeExclusive(temp, bytes);
  // A crash before rename leaves only an owned temp, never a partial final marker.
  check(same(identity, directories(parent)) && readOrdinary(temp, releaseLimits.metadata).equals(bytes), "Coordinator staging changed. Preserve it.");
  check(!maybeRead(path, releaseLimits.metadata), "Coordinator record appeared during staging. Preserve it.");
  renameSync(temp, path); syncDirectory(parent);
}
function sha(value: unknown): asserts value is string { check(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), "Supply the exact printed SHA-256 approval."); }
function installationDirectories(path: string): DirectoryIdentity[] {
  const parents = [...new Set([path, ...names.map(n => join(path, dirname(n)))])].sort();
  return [...new Map(parents.flatMap(p => directories(p)).map(d => [d.path, d])).values()];
}
/** Fail closed if Linux process visibility is unavailable. Never terminate a process. */
export function requireClosedObsidian(acknowledged: boolean, procRoot = "/proc", uid = process.getuid!()): void {
  check(acknowledged && process.platform === "linux", "Close Obsidian and explicitly pass --obsidian-closed. The helper never stops applications.");
  for (const pid of readdirSync(procRoot).filter(p => /^\d+$/.test(p))) {
    try {
      if (lstatSync(join(procRoot, pid)).uid !== uid) continue;
      const comm = readFileSync(join(procRoot, pid, "comm"), "utf8").trim();
      check(!/obsidian/i.test(comm), "An Obsidian process is running. Close it yourself before updating; no application was stopped.");
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ESRCH") continue; throw error; }
  }
}
/** flock shares this open file description with the child; the parent retains it. */
export function withUpdateLock<T>(installPath: string, action: () => T): T {
  const path = join(installPath, lockName); directories(installPath);
  let fd: number;
  try { fd = openSync(path, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const prior = readOrdinary(path, lockBytes.length);
    check(prior.length === 0 || prior.equals(lockBytes), "Reserved updater lock already contains unrelated data. Preserve it; no update was applied.");
    fd = openSync(path, constants.O_RDWR | constants.O_NOFOLLOW);
  }
  try {
    // An empty inode is a complete flock coordinator, including after an early crash.
    // Previously created marker bytes remain compatible and are never rewritten.
    fsyncSync(fd); syncDirectory(installPath);
    const bytes = readOrdinary(path, lockBytes.length);
    check(bytes.length === 0 || bytes.equals(lockBytes), "Reserved updater lock already contains unrelated data. Preserve it; no update was applied.");
    const stat = fstatSync(fd), current = lstatSync(path);
    check(stat.ino === current.ino && stat.dev === current.dev && stat.nlink === 1 && stat.isFile(), "Update lock changed.");
    const locked = spawnSync("flock", ["--exclusive", "--nonblock", "3"], { stdio: ["ignore", "pipe", "pipe", fd] });
    check(!locked.error && locked.status === 0, "Another updater holds the lock, or Linux util-linux flock is unavailable. Wait for it or install the system-provided tool yourself.");
    return action();
  } finally { closeSync(fd); }
}
function pendingBytes(statePath: string, hash: string): Buffer { return encoded({ schemaVersion: 1, statePath, intentSha256: hash }); }
function checkPending(installPath: string, statePath: string, hash: string): boolean {
  const current = maybeRead(join(installPath, pendingName), 16384);
  check(!current || current.equals(pendingBytes(statePath, hash)), "A different or ambiguous update is pending. Preserve its state and recover that operation first."); return !!current;
}
function previewFields(value: unknown): UpdatePreview {
  const p = exactObject(value, ["schemaVersion", "packagePath", "installPath", "hostVersion", "package", "target", "rollbackCompatible", "changes"]);
  check(p.schemaVersion === 1 && typeof p.hostVersion === "string", "Unsupported approved preview.");
  absolutePath(p.packagePath as string); absolutePath(p.installPath as string);
  validateInstallationPath(p.installPath as string, p.hostVersion);
  return p as unknown as UpdatePreview;
}
function stageFiles(path: string, files: Map<string, Buffer>): void {
  mkdirSync(path, { mode: 0o700 }); syncDirectory(dirname(path));
  for (const [name, bytes] of files) {
    const parent = dirname(join(path, name)); mkdirSync(parent, { recursive: true, mode: 0o700 }); directories(parent);
    writeExclusive(join(path, name), bytes);
  }
  // Persist creation of each nested directory as well as its files.
  for (const parent of [...new Set([...files.keys()].map(n => dirname(join(path, n))))]) {
    let at = parent; while (containsPath(path, at)) { syncDirectory(at); if (at === path) break; at = dirname(at); }
  }
}
function readPrevious(statePath: string): Release {
  const files = new Map<string, Buffer>(); let total = 0;
  for (const name of names) {
    const bytes = name === updateFile ? maybeRead(join(statePath, "previous", name), releaseLimits.metadata) : readOrdinary(join(statePath, "previous", name), Math.min(releaseLimits.file, releaseLimits.total - total));
    if (bytes) { files.set(name, bytes); total += bytes.length; }
  }
  return validateRuntime(files, true);
}
function expectedPreview(p: UpdatePreview, next: Release, previous: Release, archive: Buffer, data = snapshotData(p.installPath)): UpdatePreview {
  const runtime = Object.fromEntries(names.map(n => [n, previous.files.has(n) ? digest(previous.files.get(n)!) : null]));
  return { schemaVersion: 1, packagePath: p.packagePath, installPath: p.installPath, hostVersion: p.hostVersion,
    package: { ...digest(archive), version: next.version, dataFormat: next.metadata!.dataFormat },
    target: { directories: directories(p.installPath), version: previous.version, dataFormat: previous.metadata?.dataFormat ?? null, runtime, data },
    rollbackCompatible: previous.metadata?.dataFormat === next.metadata!.dataFormat,
    changes: names.map(path => { const before = runtime[path] ?? null, after = digest(next.files.get(path)!); return { path, before, after, action: !before ? "add" : before.sha256 === after.sha256 ? "unchanged" : "replace" }; }) };
}
function validateDataDigests(value: unknown): TargetSnapshot["data"] {
  const data = exactObject(value, Object.keys(dataSchemas)); let total = 0;
  for (const item of Object.values(data)) {
    if (item === null) continue;
    const d = exactObject(item, ["bytes", "sha256"]); sha(d.sha256);
    check(typeof d.bytes === "number" && Number.isSafeInteger(d.bytes) && d.bytes > 0 && d.bytes <= 32 * 1048576, "Invalid retained data size."); total += d.bytes;
  }
  check(total <= 64 * 1048576, "Invalid retained data budget."); return data as TargetSnapshot["data"];
}
function readIntent(statePath: string, hash: string): { intent: UpdateIntent; next: Release } {
  absolutePath(statePath); sha(hash);
  const bytes = readOrdinary(join(statePath, "intent.json"), releaseLimits.metadata);
  check(digest(bytes).sha256 === hash, "Recovery intent changed or approval hash differs. Preserve all artifacts.");
  const raw = exactObject(json(bytes), ["schemaVersion", "id", "approvalSha256", "direction", "preview", "stateDirectories", "installDirectories"]);
  check(raw.schemaVersion === 1 && typeof raw.id === "string" && /^[a-f0-9-]{36}$/.test(raw.id), "Unsupported recovery intent."); sha(raw.approvalSha256);
  check(raw.direction === "update" || raw.direction === "rollback", "Unsupported update direction.");
  const p = previewFields(raw.preview);
  check(!containsPath(p.installPath, statePath) && !containsPath(statePath, p.installPath), "Recovery state must be separate from the installation.");
  check(same(raw.stateDirectories, directories(statePath)) && same(raw.installDirectories, installationDirectories(p.installPath)), "Update directory identity changed. Preserve the operation for investigation.");
  const archive = readOrdinary(join(statePath, "candidate.zip"), releaseLimits.archive), next = decodeRelease(archive), previous = readPrevious(statePath);
  // Derive hashes/paths/versions from retained bytes; current data is checked before writes.
  const target = exactObject(p.target, ["directories", "version", "dataFormat", "runtime", "data"]);
  check(same(expectedPreview(p, next, previous, archive, validateDataDigests(target.data)), p), "Retained code or installation directory changed. Do not overwrite it.");
  check(raw.direction === "update" ? compareVersions(next.version, previous.version) >= 0 : !!previous.metadata && previous.metadata.dataFormat === next.metadata!.dataFormat, "Unsupported downgrade or rollback data compatibility.");
  return { intent: raw as unknown as UpdateIntent, next };
}
export function previewRollback(statePath: string, intentSha256: string, hostVersion: string): RollbackApproval {
  const { intent, next } = readIntent(statePath, intentSha256), p = intent.preview;
  check(maybeRead(join(statePath, "completed.json"), 1024)?.equals(encoded({ schemaVersion: 1, intentSha256 })), "Rollback requires a completed update. Recover pending code first.");
  check(!maybeRead(join(p.installPath, pendingName), 16384), "Recover the pending operation before previewing rollback.");
  const previous = readPrevious(statePath);
  check(previous.metadata && previous.metadata.dataFormat === next.metadata!.dataFormat, "Previous code has no declared compatible data format. Preserve it; rollback is unavailable.");
  const current = targetSnapshot(p.installPath, hostVersion);
  check(p.changes.every(row => same(current.snapshot.runtime[row.path], row.after)), "Installed code no longer matches this completed update. Do not roll back later code.");
  const packagePath = join(statePath, "previous.zip"), archive = readOrdinary(packagePath, releaseLimits.archive);
  check(encodeRelease(previous.files).equals(archive), "Retained previous package changed. Preserve it for investigation.");
  const preview = expectedPreview({ ...p, packagePath, hostVersion }, previous, current.release, archive);
  check(same(targetSnapshot(p.installPath, hostVersion).snapshot, current.snapshot), "Installation changed while previewing rollback.");
  return { schemaVersion: 1, kind: "rollback", completedStatePath: statePath, intentSha256, preview };
}
export function writeRollbackPreview(path: string, approval: RollbackApproval): string {
  absolutePath(path); check(!containsPath(approval.preview.installPath, path), "Save preview artifacts outside the installation.");
  check(same(previewRollback(approval.completedStatePath, approval.intentSha256, approval.preview.hostVersion), approval), "Rollback snapshot changed; preview again.");
  const bytes = encoded(approval); check(bytes.length <= releaseLimits.metadata, "Preview exceeds its limit."); writeExclusive(path, bytes); return digest(bytes).sha256;
}
function approvedPreview(value: unknown): { preview: UpdatePreview; direction: UpdateIntent["direction"] } {
  if (value && typeof value === "object" && "kind" in value) {
    const a = exactObject(value, ["schemaVersion", "kind", "completedStatePath", "intentSha256", "preview"]);
    check(a.schemaVersion === 1 && a.kind === "rollback", "Unsupported rollback preview.");
    const p = previewFields(a.preview); absolutePath(a.completedStatePath as string); sha(a.intentSha256);
    check(same(previewRollback(a.completedStatePath as string, a.intentSha256, p.hostVersion), value), "Rollback package, code or data changed since approval.");
    return { preview: p, direction: "rollback" };
  }
  const p = previewFields(value);
  check(same(previewUpdate(p.packagePath, p.installPath, p.hostVersion), p), "Package, code or data changed since approval. Prepare a new preview.");
  return { preview: p, direction: "update" };
}
function currentRuntime(intent: UpdateIntent): Map<string, Buffer | null> {
  const p = intent.preview;
  check(same(intent.installDirectories, installationDirectories(p.installPath)) && same(p.target.data, snapshotData(p.installPath)), "Installation directories or plugin data changed. Preserve pending recovery.");
  const current = new Map<string, Buffer | null>(); let total = 0;
  for (const row of p.changes) {
    const bytes = maybeRead(join(p.installPath, row.path), Math.min(releaseLimits.file, releaseLimits.total - total));
    if (bytes) total += bytes.length;
    const actual = bytes ? digest(bytes) : null;
    check(same(actual, row.before) || same(actual, row.after), `Unexpected current code at ${row.path}. Preserve the file and recovery state; no blind overwrite.`);
    current.set(row.path, bytes);
  }
  return current;
}
function finishUpdate(statePath: string, hash: string, hooks: UpdateHooks): void {
  const { intent, next } = readIntent(statePath, hash), p = intent.preview;
  hooks.closed(); currentRuntime(intent);
  const pendingPath = join(p.installPath, pendingName), completedPath = join(statePath, "completed.json"), completion = encoded({ schemaVersion: 1, intentSha256: hash });
  const completed = maybeRead(completedPath, 1024);
  check(!completed || completed.equals(completion), "Completion record is ambiguous. Preserve recovery state.");
  const pending = checkPending(p.installPath, statePath, hash);
  if (completed) {
    const current = targetSnapshot(p.installPath, p.hostVersion);
    check(current.release.version === next.version && p.changes.every(row => same(current.snapshot.runtime[row.path], row.after)), "Completed installation changed; do not repeat this operation.");
    if (pending) { unlinkSync(pendingPath); syncDirectory(p.installPath); } return;
  }
  if (!pending) publishRecord(pendingPath, pendingBytes(statePath, hash));
  hooks.checkpoint?.("intent", hash);
  for (const row of p.changes.filter(row => row.action !== "unchanged")) {
    hooks.closed(); const current = currentRuntime(intent).get(row.path);
    if (current && same(digest(current), row.after)) continue;
    const destination = join(p.installPath, row.path), parent = dirname(destination);
    const temp = join(parent, `.thread-update-${intent.id}-${randomUUID()}.tmp`);
    writeExclusive(temp, next.files.get(row.path)!);
    hooks.checkpoint?.(`staged:${row.path}`, hash);
    // Retain unexpected temp files on interruption. Recovery creates a new owned temp.
    hooks.closed(); currentRuntime(intent);
    check(same(intent.stateDirectories, directories(statePath)), "Recovery directory changed.");
    check(readOrdinary(temp, releaseLimits.file).equals(next.files.get(row.path)!), "Staged replacement changed. Preserve recovery and the temporary file.");
    renameSync(temp, destination); syncDirectory(parent);
    hooks.checkpoint?.(`replaced:${row.path}`, hash);
  }
  const final = targetSnapshot(p.installPath, p.hostVersion);
  check(same(final.snapshot.data, p.target.data) && p.changes.every(row => same(final.snapshot.runtime[row.path], row.after)), "Final update validation failed. Preserve pending recovery.");
  publishRecord(completedPath, completion);
  hooks.checkpoint?.("completed", hash);
  checkPending(p.installPath, statePath, hash); unlinkSync(pendingPath); syncDirectory(p.installPath);
}
export function applyUpdate(previewPath: string, approvalSha256: string, statePath: string, hooks: UpdateHooks): string {
  absolutePath(previewPath); absolutePath(statePath); sha(approvalSha256); hooks.closed();
  const bytes = readOrdinary(previewPath, releaseLimits.metadata); check(digest(bytes).sha256 === approvalSha256, "Preview approval differs. Review the exact preview again.");
  const approval = json(bytes), { preview: p, direction } = approvedPreview(approval);
  check(!containsPath(p.installPath, statePath) && !containsPath(statePath, p.installPath), "Keep recovery state separate from the installation.");
  return withUpdateLock(p.installPath, () => {
    hooks.closed(); check(!maybeRead(join(p.installPath, pendingName), 16384), "An update is pending. Recover it first.");
    approvedPreview(approval);
    directories(dirname(statePath)); mkdirSync(statePath, { mode: 0o700 }); syncDirectory(dirname(statePath));
    const previous = targetSnapshot(p.installPath, p.hostVersion).release;
    stageFiles(join(statePath, "previous"), previous.files);
    if (previous.metadata) writeExclusive(join(statePath, "previous.zip"), encodeRelease(previous.files));
    writeExclusive(join(statePath, "candidate.zip"), readOrdinary(p.packagePath, releaseLimits.archive));
    const intent: UpdateIntent = { schemaVersion: 1, id: randomUUID(), approvalSha256, direction, preview: p, stateDirectories: directories(statePath), installDirectories: installationDirectories(p.installPath) };
    const intentBytes = encoded(intent), hash = digest(intentBytes).sha256;
    check(intentBytes.length <= releaseLimits.metadata, "Recovery intent exceeds its limit."); publishRecord(join(statePath, "intent.json"), intentBytes);
    hooks.checkpoint?.("prepared", hash);
    finishUpdate(statePath, hash, hooks); return hash;
  });
}
export function recoverUpdate(statePath: string, intentSha256: string, hooks: UpdateHooks): void {
  hooks.closed(); const { intent } = readIntent(statePath, intentSha256);
  withUpdateLock(intent.preview.installPath, () => finishUpdate(statePath, intentSha256, hooks));
}
