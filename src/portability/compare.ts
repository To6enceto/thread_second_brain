import { buildProjectExport, exportInventory, retainedReferences, type ExportPort } from './export.ts';
import type { DecodedPackage } from './decode.ts';
import type { PackageEntry } from './format.ts';
import { type LocalIndex, indexNote } from '../vault/index.ts';
import { readMetadata } from '../vault/evidence.ts';
import { overviewIdentity } from '../vault/project-overview.ts';
import { readableText } from '../vault/scope.ts';
import { mayReadPdf } from '../pdf/scope.ts';
import type { ThreadSettings } from '../settings/settings.ts';

export interface ComparisonPort extends ExportPort { exists(path: string): boolean; verify(hashes: Record<string, string>): Promise<boolean>; }
export interface SnapshotSide { hash: string; bytes: number; text: string | null; }
export interface ComparisonRow { path: string; kind: PackageEntry['kind']; state: 'unchanged' | 'changed' | 'missing' | 'current-only'; before: SnapshotSide | null; after: SnapshotSide | null; }
export interface ProjectComparison { rows: ComparisonRow[]; hashes: Record<string, string>; missing: string[]; unavailable: number; currentLimit: number; omissions: DecodedPackage['package']['manifest']['omissions']; capturedAt: string; }
const textOf = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
function side(entry: PackageEntry, bytes: Uint8Array): SnapshotSide { return { hash: entry.sha256, bytes: entry.bytes, text: entry.kind === 'pdf' ? null : textOf(bytes) }; }

/** Retained bytes are history, not a read grant or a substitute for current dependencies. */
export async function compareProject(index: LocalIndex, settings: ThreadSettings, decoded: DecodedPackage, port: ComparisonPort, signal: AbortSignal): Promise<ProjectComparison> {
  const revision = index.revision, entries = index.entries;
  const check = () => { signal.throwIfAborted(); if (!port.current() || !index.ready || revision !== index.revision || entries !== index.entries) throw Error('Project or package changed. Compare again.'); };
  check();
  const identity = overviewIdentity(index, settings, settings.selectedProject), manifest = decoded.package.manifest;
  if (!settings.selectedProject || !identity.id || manifest.project.path !== settings.selectedProject || manifest.project.id !== identity.id) throw Error('Choose a checkpoint for the same current permitted project with unambiguous identity.');
  const inventory = exportInventory(index, settings), graph = index.graph(settings);
  const current = inventory.candidates.length ? await buildProjectExport(index, settings, identity.id, inventory.candidates.map(c => c.path), port, signal) : null;
  check();
  const currentEntries = new Map(current?.package.manifest.entries.map((e, i) => [e.path, { entry: e, bytes: Uint8Array.from(atob(current.package.payloads[i]!), c => c.charCodeAt(0)) }]) ?? []);
  const hashes = { ...identity.hashes, ...current?.hashes }, missing: string[] = [], rows: ComparisonRow[] = [];
  let unavailable = inventory.unavailable + (current ? current.package.manifest.omissions.unavailable - inventory.unavailable : 0);
  const prior = new Set(manifest.entries.map(e => e.path));
  for (const [i, entry] of manifest.entries.entries()) {
    check(); await new Promise(resolve => setTimeout(resolve, 0)); check();
    if (!(entry.kind === 'pdf' ? mayReadPdf(entry.path, settings) : readableText(entry.path, settings))) { unavailable++; continue; }
    let dependencies: Record<string, string> = {};
    let eligible = true;
    try {
      const requireHash = (path: string, hash: string) => {
        const fresh = graph.assess(path);
        if (!graph.scopeAllows(path, hash) || !fresh.usable) { eligible = false; return; }
        dependencies[path] = hash; Object.assign(dependencies, fresh.dependencies);
      };
      for (const reference of entry.references) requireHash(reference.path, reference.hash);
      if (entry.kind !== 'pdf') {
        const raw = textOf(decoded.payloads[i]!), metadata = readMetadata(raw, port.parse);
        const old = await indexNote({ path: entry.path, text: raw, metadata, modifiedAt: 0 }, () => null, { signal }); check();
        if (old.output?.invalid || old.decisionSources?.invalid || old.id && index.entries.filter(e => e.id === old.id).length > 1) eligible = false;
        const retained = retainedReferences(raw, metadata, old, port.parse);
        for (const ref of retained.refs) {
          const resolved = graph.resolve(ref);
          if (!resolved.path || !['current', 'renamed'].includes(resolved.state)) { eligible = false; break; }
          requireHash(resolved.path, ref.noteHash);
        }
        for (const [path, hash] of Object.entries(retained.hashes)) requireHash(path, hash);
      }
    } catch { check(); eligible = false; }
    check();
    const after = currentEntries.get(entry.path);
    // An existing but unindexed/unsupported file is unknown, never a removal.
    if (!eligible || !after && port.exists(entry.path)) { unavailable++; continue; }
    Object.assign(hashes, dependencies);
    const state = after ? entry.sha256 === after.entry.sha256 ? 'unchanged' : 'changed' : 'missing';
    if (!after) missing.push(entry.path);
    rows.push({ path: entry.path, kind: entry.kind, state, before: side(entry, decoded.payloads[i]!), after: after ? side(after.entry, after.bytes) : null });
  }
  for (const [path, value] of currentEntries) if (!prior.has(path)) rows.push({ path, kind: value.entry.kind, state: 'current-only', before: null, after: side(value.entry, value.bytes) });
  check();
  if (!await port.verify(hashes)) throw Error('Current content or supporting permissions changed. Compare again.');
  check(); if (missing.some(path => port.exists(path))) throw Error('A missing path appeared during comparison. Compare again.');
  return { rows: rows.sort((a, b) => a.path.localeCompare(b.path)), hashes, missing, unavailable, currentLimit: inventory.candidateLimit, omissions: { ...manifest.omissions }, capturedAt: manifest.createdAt };
}
