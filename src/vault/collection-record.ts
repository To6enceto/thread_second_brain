import { escapeMarkdown, sourceReferences } from "../intelligence/answer.ts";
import { readSourceReferences, type SourceReference, type FreshnessGraph } from "./freshness.ts";
import { contentHash, vaultPath } from "./scope.ts";
import { frontmatter, noteName } from "./workspace.ts";
import type { Evidence, EvidenceBundle } from "./evidence.ts";
import type { IndexEntry } from "./index.ts";
import type { EvidenceChoice } from "./workbench.ts";

export interface CollectionItem { source: SourceReference; choice: EvidenceChoice; locator: { chunk: number; offset: number; length: number }; }
export interface CollectionRecord {
  schemaVersion: 1; id: string; title: string; createdAt: string;
  scope: "project" | "allowed"; projectPath: string; projectIdentity: string; items: CollectionItem[];
}
export interface CollectionRow { number: number; choice: EvidenceChoice; state: "current" | "renamed" | "changed" | "unavailable"; source?: Evidence; noteHash?: string; }
const bytes = (s: string) => new TextEncoder().encode(s).length;
const start = "<!-- thread:collection-record -->", end = "<!-- /thread:collection-record -->";
function fields(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid collection object.");
  const item = value as Record<string, unknown>;
  if (required.some(k => !Object.hasOwn(item, k)) || Object.keys(item).some(k => !required.includes(k) && !optional.includes(k))) throw new Error("Unsupported collection fields.");
  return item;
}
const bounded = (v: unknown, n: number): v is string => typeof v === "string" && !!v.trim() && v.length <= n;
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export function validateCollection(value: unknown): CollectionRecord {
  if (bytes(JSON.stringify(value)) > 131072) throw new Error("Collection exceeds 128 KiB. Select fewer references.");
  const v = fields(value, ["schemaVersion", "id", "title", "createdAt", "scope", "projectPath", "projectIdentity", "items"]);
  if (v.schemaVersion !== 1 || typeof v.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.id)
    || !bounded(v.title, 100) || noteName(v.title) !== v.title || typeof v.createdAt !== "string" || !Number.isFinite(Date.parse(v.createdAt)) || new Date(v.createdAt).toISOString() !== v.createdAt
    || v.scope !== "project" && v.scope !== "allowed") throw new Error("Invalid collection identity or version.");
  if (v.scope === "project" ? !bounded(v.projectPath, 4096) || vaultPath(v.projectPath) !== v.projectPath || !bounded(v.projectIdentity, 4096)
    : v.projectPath !== "" || v.projectIdentity !== "") throw new Error("Invalid collection scope.");
  if (!Array.isArray(v.items) || !v.items.length || v.items.length > 50) throw new Error("A collection needs 1 to 50 references.");
  const seen = new Set<string>();
  const items: CollectionItem[] = v.items.map(raw => {
    const item = fields(raw, ["source", "choice", "locator"]);
    fields(item.source, ["path", "heading", "hash", "noteHash"], ["id", "noteType", "noteStatus", "pdf"]);
    const source = readSourceReferences([item.source])[0]!;
    const loc = fields(item.locator, ["chunk", "offset", "length"]);
    if (item.choice !== "include" && item.choice !== "exclude" && item.choice !== "pin" || !integer(loc.chunk, 0, 50000) || !integer(loc.offset, 0, 50000) || !integer(loc.length, 1, 4000)) throw new Error("Invalid collection choice or locator.");
    const locator = { chunk: loc.chunk, offset: loc.offset, length: loc.length }, key = JSON.stringify([source, locator]);
    if (seen.has(key)) throw new Error("Duplicate collection reference."); seen.add(key);
    return { source, choice: item.choice, locator };
  });
  return { schemaVersion: 1, id: v.id, title: v.title, createdAt: v.createdAt, scope: v.scope,
    projectPath: v.projectPath as string, projectIdentity: v.projectIdentity as string, items };
}

/** Caller validates the captured bundle against current source bytes and settings. */
export function captureCollection(bundle: EvidenceBundle, choices: Record<string, EvidenceChoice>, entries: readonly IndexEntry[]): CollectionItem[] {
  if (!bundle.sources.length || bundle.sources.length > 50) throw new Error("Save 1 to 50 current indexed passages.");
  return sourceReferences(bundle).map(({ excerpt, ...source }, i) => {
    const entry = entries.find(e => e.path === source.path && e.hash === source.noteHash);
    const chunk = entry?.chunks.findIndex(c => c.heading === source.heading && c.excerpt.includes(excerpt)) ?? -1;
    if (!entry || chunk < 0 || !excerpt || excerpt.length > 4000) throw new Error("A passage is no longer locatable in the current index. Retrieve evidence again.");
    return { source, choice: choices[bundle.sources[i]!.id] ?? "include", locator: { chunk, offset: entry.chunks[chunk]!.excerpt.indexOf(excerpt), length: excerpt.length } };
  });
}
function body(record: CollectionRecord): string {
  const e = escapeMarkdown;
  return `${start}\n# ${e(record.title)}\n\nSaved explicitly at ${record.createdAt}.\n\n`
    + "These references and choices grant no read access. Thread rereads current permitted sources before reuse. No excerpts are stored here. Changes require explicit reconfirmation; edits save a new copy.\n\n"
    + (record.scope === "project" ? `Project: ${e(record.projectPath)} (${e(record.projectIdentity)}).\n\n` : "Scope: currently allowed paths, checked anew on use.\n\n")
    + record.items.map((item, i) => `- Reference ${i + 1} (${item.choice}): ${e(item.source.path)}${item.source.heading ? ` > ${e(item.source.heading)}` : ""}. Note hash ${item.source.noteHash}; passage hash ${item.source.hash}.`
      + (item.source.pdf ? ` PDF: ${e(item.source.pdf.path)}, page ${item.source.pdf.page}; hash ${item.source.pdf.hash}.` : "")).join("\n") + `\n${end}\n`;
}
export function collectionMarkdown(value: CollectionRecord): string {
  const record = validateCollection(value);
  const raw = frontmatter({ id: record.id, type: "collection", title: record.title, created: record.createdAt.slice(0, 10),
    ...(record.scope === "project" ? { project: record.projectIdentity } : {}), thread_collection_version: "1", thread_collection_record: JSON.stringify(record) }) + body(record);
  if (bytes(raw) > 524288) throw new Error("Collection note exceeds 512 KiB.");
  return raw;
}
export function hasCollection(raw: string, metadata: Record<string, unknown>): boolean {
  return metadata.type === "collection" || metadata.thread_collection_version !== undefined || metadata.thread_collection_record !== undefined
    || /^[\t ]*(?:thread_collection_(?:version|record)|["']thread_collection_(?:version|record)["'])\s*:/im.test(raw) || /<!--\s*(?:\/\s*)?thread\s*:\s*collection-record/i.test(raw);
}
export function readCollection(raw: string, metadata: Record<string, unknown>): CollectionRecord {
  if (bytes(raw) > 524288 || metadata.type !== "collection" || metadata.thread_collection_version !== "1" || typeof metadata.thread_collection_record !== "string" || bytes(metadata.thread_collection_record) > 131072) throw new Error("Unsupported collection. Preserve it and save a new collection.");
  if (Object.keys(metadata).some(k => /^thread_(?:answer|conversation|question|review|pdf|sources)(?:_|$)/.test(k))) throw new Error("Conflicting collection format.");
  const record = validateCollection(JSON.parse(metadata.thread_collection_record));
  if (metadata.id !== record.id || metadata.title !== record.title || metadata.created !== record.createdAt.slice(0, 10) || metadata.project !== (record.scope === "project" ? record.projectIdentity : undefined)) throw new Error("Collection identity changed.");
  const header = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0], expected = "\n" + body(record), actual = header ? raw.slice(header.length) : "";
  if (!header || actual !== expected && actual !== expected.replace(/\n/g, "\r\n")) throw new Error("Collection content changed. Save a new reviewed copy.");
  return record;
}

/** Only currently permitted index entries are returned; caller rereads their hashes before display. */
export async function resolveCollection(record: CollectionRecord, entries: readonly IndexEntry[], graph: FreshnessGraph): Promise<CollectionRow[]> {
  const valid = validateCollection(record), rows: CollectionRow[] = [];
  for (const [i, item] of valid.items.entries()) {
    const unavailable: CollectionRow = { number: i + 1, choice: item.choice, state: "unavailable" };
    const resolved = graph.resolve(item.source), entry = entries.find(e => e.path === resolved.path);
    if (!entry || !["current", "renamed", "changed"].includes(resolved.state) || !graph.assess(entry.path).usable) { rows.push(unavailable); continue; }
    let chunk = entry.chunks[item.locator.chunk];
    if (!chunk || chunk.heading !== item.source.heading) {
      const matching = entry.chunks.filter(c => c.heading === item.source.heading);
      if (matching.length !== 1) { rows.push(unavailable); continue; } chunk = matching[0]!;
    }
    const changed = resolved.state === "changed";
    const excerpt = changed ? chunk.excerpt.slice(0, 4000).replace(/[\uD800-\uDBFF]$/, "") : chunk.excerpt.slice(item.locator.offset, item.locator.offset + item.locator.length);
    const hash = await contentHash(excerpt);
    if (!excerpt || !changed && (hash !== item.source.hash || excerpt.length !== item.locator.length)) { rows.push(unavailable); continue; }
    const source: Evidence = { id: `S${i + 1}`, path: entry.path, heading: chunk.heading, excerpt, contentHash: hash,
      modifiedAt: entry.modifiedAt, recordedDate: new Date(entry.modifiedAt).toISOString(), dateBasis: "file modification time; event date unknown",
      excerptComplete: !!entry.sectionCoverage && !entry.truncated && entry.chunks.filter(c => c.heading === chunk.heading).length === 1 && excerpt === chunk.excerpt,
      ...(entry.id ? { noteId: entry.id } : {}), ...(typeof entry.metadata.type === "string" ? { noteType: entry.metadata.type } : {}),
      ...(typeof entry.metadata.status === "string" ? { noteStatus: entry.metadata.status } : {}), ...(item.source.pdf ? { pdf: { ...item.source.pdf } } : {}) };
    rows.push({ number: i + 1, choice: item.choice, state: changed ? "changed" : resolved.state === "renamed" ? "renamed" : "current", source, noteHash: entry.hash });
  }
  return rows;
}
export function collectionCandidates(rows: readonly CollectionRow[], confirmed: ReadonlySet<number>): { bundle: EvidenceBundle; choices: Record<string, EvidenceChoice> } {
  const available = rows.filter(row => row.source && (row.state !== "changed" || confirmed.has(row.number)));
  const sources = available.map((row, i) => ({ ...row.source!, id: `S${i + 1}` }));
  return { bundle: { sources, noteHashes: Object.fromEntries(available.map(row => [row.source!.path, row.noteHash!])), truncated: available.length !== rows.length,
    coverage: { availableNotes: new Set(rows.flatMap(row => row.source ? [row.source.path] : [])).size, includedNotes: new Set(sources.map(s => s.path)).size, availablePassages: rows.length, includedPassages: sources.length } },
    choices: Object.fromEntries(sources.map((s, i) => [s.id, available[i]!.choice])) };
}
