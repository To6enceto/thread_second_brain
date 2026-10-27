import { createHash, randomUUID } from "node:crypto";
import { decodeProjectPackage, type DecodedPackage } from "../portability/decode.ts";
import { PACKAGE_LIMITS, packagePath, type ProjectPackage } from "../portability/format.ts";
import { buildProjectExport, exportInventory, type ExportCandidate, type ExportPort, type ExportPreview } from "../portability/export.ts";
import { exportDestination } from "../portability/write.ts";
import { compareProject, type ProjectComparison } from "../portability/compare.ts";
import { applyImport, identityWarnings, importRoot, inspectImport, newImport, type ImportPort, type ImportReceipt, type ImportState } from "../portability/import.ts";
import { defaultSettings, type ThreadSettings } from "../settings/settings.ts";
import { overviewIdentity } from "../vault/project-overview.ts";
import { mayReadPdf } from "../pdf/scope.ts";
import { readableText } from "../vault/scope.ts";
import { noteName } from "../vault/workspace.ts";
import type { IndexSnapshot, ProjectRequest } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { DesktopStorage } from "./storage.ts";
import type { VaultFiles } from "./vault-files.ts";
import { resolveLink } from "./links.ts";
import { parseMetadata } from "./metadata.ts";
import { DesktopError, permitted } from "./security.ts";
import { readPickedBytes } from "./text-import.ts";

export interface ExportSnapshot { id: string; project: string; candidates: ExportCandidate[]; unavailable: number; candidateLimit: number; coverage: string; }
export interface ExportPreviewSnapshot { id: string; path: string; bytes: number; manifest: ProjectPackage["manifest"]; texts: (string | null)[]; }
const TEXT_PREVIEW = 20000;
export type ComparisonSnapshot = ProjectComparison & { project: string };
export interface ImportPreviewSnapshot { id: string; root: string; entries: { path: string; bytes: number; kind: string }[]; warnings: string[]; recovery: boolean; adopted: string[]; }
export interface ImportStatus { pending: { root: string; source: string; startedAt: string; created: number; total: number; inFlight: boolean } | null; completed: number; }
const capped = (text: string | null): string | null => text === null || text.length <= TEXT_PREVIEW ? text : `${text.slice(0, TEXT_PREVIEW)}\n[Display limited to ${TEXT_PREVIEW} characters; the package keeps every byte.]`;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
/** Shared portability modules throw plain user-facing errors; keep their guidance instead of the generic IPC failure. */
async function shared<T>(work: () => T | Promise<T>): Promise<T> {
  try { return await work(); } catch (error) { throw error instanceof DesktopError ? error : new DesktopError(error instanceof Error ? error.message : "Portability work failed. Refresh and try again."); }
}
export interface PackageSummary { token: string; name: string; hash: string; project: { path: string; id: string; title: string }; createdAt: string; entries: number; omissions: { unavailable: number; unselected: number; candidateLimit: number }; }

/** Main only: one package chosen in the native dialog, read as inert bytes. */
export function readPickedPackage(path: string, current: () => void): Promise<{ name: string; bytes: Uint8Array }> {
  return readPickedBytes(path, current, PACKAGE_LIMITS.serializedBytes, "Choose an ordinary single-link Thread package up to 48 MiB.", name => {
    if (!name.endsWith(".thread-project.json")) throw new DesktopError("Choose a .thread-project.json package exported by Thread.");
    // The name is recorded in the shared import journal, which accepts only portable names.
    try { packagePath(name); } catch { throw new DesktopError("Rename the package to a portable name (letters, digits, spaces, dots, dashes; no characters such as : ? * or quotes) and choose it again."); }
  });
}
function summary(token: string, name: string, decoded: DecodedPackage): PackageSummary {
  const manifest = decoded.package.manifest;
  return { token, name, hash: decoded.hash, project: { ...manifest.project }, createdAt: manifest.createdAt, entries: manifest.entries.length, omissions: { ...manifest.omissions } };
}

interface ExportContext { id: string; selection: ProjectRequest; settings: ThreadSettings; projectId: string; index: IndexSnapshot; }

/** Main-held package snapshots, export previews and imports; the renderer only ever holds their tokens. */
export class DesktopPortability {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private storage: DesktopStorage;
  private files: VaultFiles;
  private snapshot: { token: string; name: string; decoded: DecodedPackage } | null = null;
  private exportContext: ExportContext | null = null;
  private preview: { id: string; path: string; value: ExportPreview; context: ExportContext } | null = null;
  private controller: AbortController | null = null;
  private epoch = 0;
  private choosing = false;
  constructor(reader: VaultReader, evidence: EvidenceIndex, storage: DesktopStorage, files: VaultFiles) { this.reader = reader; this.evidence = evidence; this.storage = storage; this.files = files; }
  invalidate(): void { this.epoch++; this.snapshot = null; this.exportContext = null; this.preview = null; this.importPreview = null; this.controller?.abort(); this.controller = null; }
  draftChanged(): void { this.epoch++; this.preview = null; this.controller?.abort(); this.controller = null; }
  private settings(selection: ProjectRequest, revision: unknown): ThreadSettings {
    return { ...defaultSettings(), ...this.evidence.scope(), roles: { ...this.storage.status(revision).preferences.roles, projects: selection.folder }, selectedProject: selection.project };
  }
  private exportPort(context: ExportContext, revision: unknown, current: () => boolean): ExportPort {
    const listing = context.index.listing, settings = context.settings, allowed = (path: string): boolean => current() && (readableText(path, settings) || mayReadPdf(path, settings));
    return {
      current, parse: parseMetadata,
      size: path => allowed(path) ? listing.files[path]?.bytes ?? listing.pdfs[path]?.bytes ?? null : null,
      readText: async path => { if (!current() || !readableText(path, settings)) throw new DesktopError("Export source is outside read scope."); return (await this.reader.read(path, revision, PACKAGE_LIMITS.textBytes)).text; },
      readPdf: async (path, signal) => { const original = await this.reader.readPdf(path, revision, () => signal.throwIfAborted()); return { hash: original.hash, bytes: original.bytes.buffer as ArrayBuffer }; },
      resolve: (path, link) => { const resolved = resolveLink(path, link, listing.paths); return resolved.paths.length === 1 && allowed(resolved.paths[0]!) ? resolved.paths[0]! : null; }
    };
  }
  private async verify(hashes: Record<string, string>, revision: unknown, current: () => void): Promise<void> {
    for (const [path, hash] of Object.entries(hashes)) { current(); if (await this.reader.currentHash(path, revision, current, PACKAGE_LIMITS.textBytes) !== hash) throw new DesktopError("Export snapshots changed. Refresh and preview again."); }
  }
  async exportInventory(selection: ProjectRequest, revision: unknown): Promise<ExportSnapshot> {
    this.invalidate(); const epoch = this.epoch, index = await this.evidence.refresh(revision);
    if (epoch !== this.epoch) throw new DesktopError("Export inventory was canceled. Refresh it."); this.evidence.assertCurrent(index);
    if (!selection || typeof selection.project !== "string" || !selection.project || typeof selection.folder !== "string") throw new DesktopError("Choose a permitted project first.");
    const settings = this.settings(selection, revision), identity = overviewIdentity(this.evidence.index, settings, selection.project); if (!identity.id) throw new DesktopError(identity.reason);
    const inventory = await shared(() => exportInventory(this.evidence.index, settings)), context: ExportContext = { id: randomUUID(), selection, settings, projectId: identity.id, index };
    this.exportContext = context;
    return { id: context.id, project: selection.project, ...inventory, coverage: `${inventory.candidates.length} current permitted project files and granted PDFs offered; ${inventory.unavailable} stale, ambiguous or unsupported omitted; ${inventory.candidateLimit} beyond the 100-file candidate budget. A checkpoint is a selected project package, not a full vault backup or change journal. Settings, caches, journals and models are never included.` };
  }
  private exportActive(id: unknown, revision: unknown): ExportContext {
    const context = this.exportContext; if (!context || context.id !== id || context.index.revision !== revision) throw new DesktopError("Export inventory, access or project changed. Refresh it."); this.evidence.assertCurrent(context.index); return context;
  }
  private destination(folder: unknown, name: unknown, settings: ThreadSettings): string {
    if (typeof folder !== "string" || typeof name !== "string" || name.length > 100) throw new DesktopError("Enter a destination folder and a package name of at most 100 characters.");
    let path: string; try { path = exportDestination(`${packagePath(folder)}/${noteName(name)}.thread-project.json`, settings.excludedPaths); } catch (error) { throw new DesktopError(error instanceof Error ? error.message : "Choose a visible new package destination."); }
    if (!permitted(path, this.reader.getInfo()!.scope)) throw new DesktopError("Save checkpoints inside the current read roots and outside exclusions.");
    return path;
  }
  async previewExport(id: unknown, selected: unknown, folder: unknown, name: unknown, revision: unknown): Promise<ExportPreviewSnapshot> {
    const context = this.exportActive(id, revision); this.draftChanged(); const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    const live = (): boolean => epoch === this.epoch && !controller.signal.aborted && this.exportContext === context && this.reader.getInfo()?.revision === revision, current = (): void => { if (!live()) throw new DesktopError("Export preview changed or was canceled. Build a new preview."); };
    if (!Array.isArray(selected) || selected.some(path => typeof path !== "string")) throw new DesktopError("Choose files from the current export inventory.");
    const path = this.destination(folder, name, context.settings);
    let value: ExportPreview;
    try { value = await buildProjectExport(this.evidence.index, context.settings, context.projectId, selected as string[], this.exportPort(context, revision, live), controller.signal); }
    catch (error) { current(); throw error instanceof DesktopError ? error : new DesktopError(error instanceof Error ? error.message : "Could not build the export preview."); }
    current(); await this.verify(value.hashes, revision, current); current();
    const preview = { id: randomUUID(), path, value, context }; this.preview = preview; if (this.controller === controller) this.controller = null;
    const texts = value.package.manifest.entries.map((entry, index) => entry.kind === "pdf" ? null : capped(new TextDecoder("utf-8", { ignoreBOM: true }).decode(Buffer.from(value.package.payloads[index]!, "base64"))));
    return { id: preview.id, path, bytes: Buffer.byteLength(value.text), manifest: structuredClone(value.package.manifest), texts };
  }
  /** Read-only: package bytes are history and never grant reads or change notes. */
  async compareCheckpoint(token: unknown, selection: ProjectRequest, revision: unknown): Promise<ComparisonSnapshot> {
    const decoded = this.package(token); this.draftChanged(); const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    const index = await this.evidence.refresh(revision), live = (): boolean => epoch === this.epoch && !controller.signal.aborted && this.reader.getInfo()?.revision === revision;
    const current = (): void => { if (!live()) throw new DesktopError("Comparison changed or was canceled. Compare again."); }; current(); this.evidence.assertCurrent(index);
    if (!selection || typeof selection.project !== "string" || !selection.project || typeof selection.folder !== "string") throw new DesktopError("Choose the checkpoint's permitted project first.");
    const settings = this.settings(selection, revision), scope = this.reader.getInfo()!.scope;
    // The desktop scope lists exact files; permitted Markdown absent from a complete listing is genuinely missing, not out of scope.
    if (!index.listing.limited && !index.listing.identityIncomplete) settings.allowedPaths.push(...decoded.package.manifest.entries.map(entry => entry.path).filter(path => path.endsWith(".md") && index.listing.files[path] === undefined && permitted(path, scope)));
    const context: ExportContext = { id: "", selection, settings, projectId: "", index }, base = this.exportPort(context, revision, live);
    const allowed = (path: string): boolean => live() && (readableText(path, settings) || mayReadPdf(path, settings));
    const port = { ...base, exists: (path: string) => allowed(path) && (index.listing.files[path] ?? index.listing.pdfs[path]) !== undefined, verify: async (hashes: Record<string, string>) => { try { await this.verify(hashes, revision, current); return true; } catch { return false; } } };
    let result: ProjectComparison;
    try { result = await compareProject(this.evidence.index, settings, decoded, port, controller.signal); }
    catch (error) { current(); throw error instanceof DesktopError ? error : new DesktopError(error instanceof Error ? error.message : "Comparison failed. Choose the package again."); }
    current(); if (this.controller === controller) this.controller = null;
    return { ...result, project: selection.project, rows: result.rows.map(row => ({ ...row, before: row.before && { ...row.before, text: capped(row.before.text) }, after: row.after && { ...row.after, text: capped(row.after.text) } })) };
  }
  private importScope(): { allowedPaths: string[]; excludedPaths: string[]; pdfPaths: string[] } {
    const info = this.reader.getInfo(); if (!info) throw new DesktopError("Select a vault first.");
    if (info.scope.roots.includes(".")) throw new DesktopError("Whole-vault read access covers every folder. Narrow read roots before importing so the new copies stay unread.");
    return { allowedPaths: [...info.scope.roots], excludedPaths: [...info.scope.excluded], pdfPaths: [...info.pdfs] };
  }
  private importPort(revision: unknown, live: () => boolean, persist: (state: ImportState) => Promise<void>): ImportPort {
    return {
      current: live,
      check: (root, entries) => { if (!live()) throw new DesktopError("Import preview changed."); importRoot(root, this.importScope()); for (const entry of entries) { if (packagePath(entry.path) !== entry.path || !entry.path.startsWith(`${root}/`)) throw new DesktopError("Invalid import destination."); } },
      kind: path => this.files.kindSync(path, revision),
      hash: path => this.files.hash(path, revision, PACKAGE_LIMITS.pdfBytes),
      persist, folder: path => this.files.folder(path, revision), create: (path, bytes) => this.files.create(path, bytes, revision)
    };
  }
  importStatus(revision: unknown): ImportStatus {
    const state = this.storage.importState(revision), pending = state.receipts.find(receipt => receipt.status === "pending");
    return { pending: pending ? { root: pending.root, source: pending.source, startedAt: pending.startedAt, created: pending.created.length, total: pending.entries.length, inFlight: pending.inFlight !== null } : null, completed: state.receipts.filter(receipt => receipt.status === "complete").length };
  }
  private importPreview: { id: string; token: string; receipt: ImportReceipt; adopted: string[] } | null = null;
  /** Previews new copies under a new top-level folder outside every read root, exclusion and PDF grant. */
  async previewImport(token: unknown, rootInput: unknown, revision: unknown): Promise<ImportPreviewSnapshot> {
    const decoded = this.package(token); this.importPreview = null; const epoch = ++this.epoch, live = (): boolean => epoch === this.epoch && this.reader.getInfo()?.revision === revision;
    const state = this.storage.importState(revision), pending = state.receipts.find(receipt => receipt.status === "pending");
    let receipt: ImportReceipt;
    if (pending) { if (pending.packageHash !== decoded.hash) throw new DesktopError("An interrupted import is pending. Choose that same package to recover it, or close recovery first."); receipt = structuredClone(pending); }
    else {
      if (typeof rootInput !== "string" || rootInput.length > 200) throw new DesktopError("Enter a new top-level folder name of at most 200 characters.");
      try { importRoot(rootInput, this.importScope()); } catch (error) { throw new DesktopError(error instanceof Error ? error.message : "Choose a new top-level folder outside read access."); }
      receipt = await shared(() => newImport(decoded, this.snapshot!.name, rootInput));
    }
    await this.files.pin(revision); if (!receipt.rootCreated) await this.files.collision(receipt.root, revision);
    const adopted = await shared(() => inspectImport(receipt, this.importPort(revision, live, async () => {})));
    if (!live()) throw new DesktopError("Import preview changed. Preview again.");
    const existing = this.evidence.index.entries.flatMap(entry => entry.id ? [{ id: entry.id, path: entry.path }] : []);
    this.importPreview = { id: randomUUID(), token: token as string, receipt, adopted };
    return { id: this.importPreview.id, root: receipt.root, entries: decoded.package.manifest.entries.map((entry, index) => ({ path: receipt.entries[index]!.path, bytes: entry.bytes, kind: entry.kind })), warnings: identityWarnings(decoded.package.manifest.entries, existing), recovery: !!pending, adopted };
  }
  /** Writer-owned, journaled create-only import; partial copies are preserved for recovery. */
  async applyImport(id: unknown, revision: unknown): Promise<ImportStatus> {
    const preview = this.importPreview; if (!preview || preview.id !== id) throw new DesktopError("Preview the import first.");
    const decoded = this.package(preview.token), epoch = this.epoch;
    await this.storage.importWork(revision, async (journal, current) => {
      const live = (): boolean => { try { current(); } catch { return false; } return epoch === this.epoch && this.importPreview === preview; };
      const state = structuredClone(journal.state), receipt = state.receipts.find(item => item.id === preview.receipt.id) ?? structuredClone(preview.receipt);
      await this.files.pin(revision); if (!receipt.rootCreated) await this.files.collision(receipt.root, revision);
      try { await applyImport(state, receipt, decoded, preview.adopted, this.importPort(revision, live, next => journal.store(next, current))); }
      catch (error) { throw error instanceof DesktopError ? error : new DesktopError(`${error instanceof Error ? error.message : "Import stopped."} Partial copies are preserved; choose the same package to inspect recovery.`); }
    });
    this.importPreview = null; return this.importStatus(revision);
  }
  /** Closes an interrupted import without deleting anything; partial copies remain for manual review. */
  async leaveImport(revision: unknown): Promise<ImportStatus> {
    await this.storage.importWork(revision, async (journal, current) => {
      const state = structuredClone(journal.state), pending = state.receipts.find(receipt => receipt.status === "pending"); if (!pending) throw new DesktopError("No interrupted import is pending.");
      pending.status = "left"; pending.inFlight = null; await journal.store(state, current);
    });
    this.importPreview = null; return this.importStatus(revision);
  }
  /** Create-only: revalidates snapshots and the destination immediately before writing, then verifies the written bytes. */
  async writeExport(id: unknown, revision: unknown): Promise<string> {
    const preview = this.preview; if (!preview || preview.id !== id) throw new DesktopError("Build a current export preview first.");
    const context = this.exportActive(preview.context.id, revision), epoch = this.epoch, bytes = new TextEncoder().encode(preview.value.text);
    const live = (): boolean => epoch === this.epoch && this.preview === preview && this.reader.getInfo()?.revision === revision;
    return this.storage.exclusiveWrite(revision, async current => {
      const guard = (): void => { current(); if (!live()) throw new DesktopError("Export preview changed. Build a new preview."); };
      const check = async (): Promise<void> => { guard(); this.destination(preview.path.slice(0, preview.path.lastIndexOf("/")), preview.path.slice(preview.path.lastIndexOf("/") + 1, -".thread-project.json".length), context.settings); if (await this.files.kind(preview.path, revision)) throw new DesktopError("That package destination already exists. Choose a new name; no file was overwritten."); await this.files.collision(preview.path, revision); guard(); };
      await check();
      await this.evidence.refresh(revision); guard();
      const now = await shared(() => buildProjectExport(this.evidence.index, context.settings, context.projectId, preview.value.package.manifest.entries.map(entry => entry.path), this.exportPort(context, revision, live), new AbortController().signal));
      if (JSON.stringify(now.package.manifest.entries) !== JSON.stringify(preview.value.package.manifest.entries)) throw new DesktopError("Export snapshots changed. Refresh and preview again.");
      await this.verify(preview.value.hashes, revision, guard); await check();
      // Once created, the file exists: verify it immediately rather than reporting a stale preview.
      await this.files.create(preview.path, bytes, revision, true);
      if (await this.files.hash(preview.path, revision, PACKAGE_LIMITS.serializedBytes) !== sha256(bytes)) throw new DesktopError("Saved package bytes differ from the preview. Inspect the destination before retrying with a new name.");
      this.preview = null; return preview.path;
    });
  }
  /** Native dialog callback is supplied by main only. */
  async pick(choose: () => Promise<string | null>): Promise<PackageSummary | null> {
    if (this.choosing) throw new DesktopError("Finish the open package dialog first.");
    this.invalidate(); const epoch = this.epoch, current = (): void => { if (epoch !== this.epoch) throw new DesktopError("Package selection changed or was canceled. Choose it again."); };
    this.choosing = true;
    try {
      const path = await choose(); current(); if (!path) return null;
      const file = await readPickedPackage(path, current); let decoded: DecodedPackage;
      try { decoded = await decodeProjectPackage(file.bytes, parseMetadata, () => epoch === this.epoch); }
      catch (error) { current(); throw new DesktopError(`Package refused before any write: ${error instanceof Error ? error.message : "invalid package"}`); }
      current(); this.snapshot = { token: randomUUID(), name: file.name, decoded };
      return summary(this.snapshot.token, file.name, decoded);
    } finally { this.choosing = false; }
  }
  package(token: unknown): DecodedPackage {
    if (!this.snapshot || typeof token !== "string" || token !== this.snapshot.token) throw new DesktopError("Choose and validate the package again.");
    return this.snapshot.decoded;
  }
}
