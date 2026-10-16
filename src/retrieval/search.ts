import type { HybridCoverage } from "./semantic.ts";
import type { IndexEntry, RecallHit } from "../vault/index.ts";
import { isWithin, vaultPath } from "../vault/scope.ts";
import { localDay } from "../vault/workspace.ts";
import { tokens } from "./tokens.ts";
export { tokens } from "./tokens.ts";

export interface SearchFilters { type?: string; status?: string; path?: string; from?: string; through?: string; }
export interface SearchCoverage {
  eligibleNotes: number; filteredNotes: number; matchedNotes: number; matchedPassages: number;
  returnedPassages: number; truncatedNotes: number; limited: boolean; queryTruncated: boolean;
}
export interface SearchResult { hits: RecallHit[]; coverage: SearchCoverage; hybrid?: HybridCoverage; }
const stopWords = new Set("the a an and or is to of in for what how we our was are did does why with has have can which when where from be it on as by".split(" "));
export function keywordTerms(text: string): string[] { return [...new Set(tokens(text).filter(term => !stopWords.has(term)))]; }

export function parseQuery(query: string): { terms: string[]; phrases: string[]; truncated: boolean } {
  const text = query.slice(0, 1000);
  if ((text.match(/"/g)?.length ?? 0) % 2) throw new Error("Close each quoted search phrase.");
  const phrases = [...text.matchAll(/"([^"]+)"/g)].map(match => tokens(match[1]!).join(" ")).filter(Boolean);
  if (phrases.length > 8) throw new Error("Use at most eight quoted phrases.");
  const all = keywordTerms(text);
  return { terms: all.slice(0, 40), phrases, truncated: query.length > 1000 || all.length > 40 };
}

function validDay(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeFilters(filters: SearchFilters = {}): Required<SearchFilters> {
  const result = { type: filters.type?.trim().toLocaleLowerCase() ?? "", status: filters.status?.trim().toLocaleLowerCase() ?? "",
    path: filters.path?.trim() ?? "", from: filters.from?.trim() ?? "", through: filters.through?.trim() ?? "" };
  if (result.type.length > 100 || result.status.length > 100) throw new Error("Keep type and status filters within 100 characters.");
  if (result.path) result.path = vaultPath(result.path);
  if (result.from && !validDay(result.from) || result.through && !validDay(result.through)) throw new Error("Use valid YYYY-MM-DD record dates.");
  if (result.from && result.through && result.from > result.through) throw new Error("The starting record date must not follow the ending date.");
  return result;
}
export function entryDay(entry: IndexEntry): string {
  for (const key of ["recorded_on", "decided_on", "captured_on", "updated", "generated_on", "created"]) {
    const value = entry.metadata[key];
    if (typeof value === "string" && validDay(value.slice(0, 10))) return value.slice(0, 10);
  }
  return localDay(new Date(entry.modifiedAt));
}
export function filterEntries(entries: IndexEntry[], filters: SearchFilters = {}): IndexEntry[] {
  const filter = normalizeFilters(filters);
  return entries.filter(entry => (!filter.type || String(entry.metadata.type ?? "").toLocaleLowerCase() === filter.type)
    && (!filter.status || String(entry.metadata.status ?? "").toLocaleLowerCase() === filter.status)
    && (!filter.path || isWithin(entry.path, filter.path))
    && (!filter.from || entryDay(entry) >= filter.from) && (!filter.through || entryDay(entry) <= filter.through));
}

function aliases(entry: IndexEntry): string[] {
  const values = entry.metadata.aliases;
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string").slice(0, 20) : typeof values === "string" ? [values] : [];
}
function counts(words: string[]): Map<string, number> {
  const result = new Map<string, number>(); for (const word of words) result.set(word, (result.get(word) ?? 0) + 1); return result;
}

/** Reserve the best passage from different notes before adding up to two extras each. */
export function balancedHits(ranked: RecallHit[], limit: number): RecallHit[] {
  const selected = new Set<RecallHit>(); const perNote = new Map<string, number>();
  for (let round = 0; round < 3 && selected.size < limit; round++) for (const hit of ranked) {
    if (selected.size >= limit) break;
    if (selected.has(hit) || (perNote.get(hit.entry.path) ?? 0) > round) continue;
    selected.add(hit); perNote.set(hit.entry.path, (perNote.get(hit.entry.path) ?? 0) + 1);
  }
  return ranked.filter(hit => selected.has(hit));
}

export function searchEntries(eligible: IndexEntry[], query: string, filters: SearchFilters = {}, requestedLimit = 20): SearchResult {
  const parsed = parseQuery(query), entries = filterEntries(eligible, filters);
  const limit = Number.isFinite(requestedLimit) ? Math.max(0, Math.min(Math.floor(requestedLimit), 50)) : 20;
  const docs = entries.map(entry => ({ entry, title: counts(tokens(entry.title)), alias: counts(tokens(aliases(entry).join(" "))),
    all: new Set(tokens(`${entry.title} ${aliases(entry).join(" ")} ${entry.chunks.map(chunk => `${chunk.heading} ${chunk.excerpt}`).join(" ")}`)) }));
  const frequency = new Map(parsed.terms.map(term => [term, docs.filter(doc => doc.all.has(term)).length]));
  const lengths = entries.flatMap(entry => entry.chunks.map(chunk => tokens(chunk.excerpt).length));
  const average = lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length) || 1;
  const ranked: RecallHit[] = [], seen = new Set<string>();
  if (parsed.terms.length || parsed.phrases.length) for (const doc of docs) for (const chunk of doc.entry.chunks) {
    const fields = [doc.entry.title, ...aliases(doc.entry), chunk.heading, chunk.excerpt].map(text => ` ${tokens(text).join(" ")} `);
    if (!parsed.phrases.every(phrase => fields.some(field => field.includes(` ${phrase} `)))) continue;
    const bodyWords = tokens(chunk.excerpt), body = counts(bodyWords), heading = counts(tokens(chunk.heading));
    const matched = parsed.terms.filter(term => body.has(term) || heading.has(term) || doc.title.has(term) || doc.alias.has(term));
    if (!matched.length && !parsed.phrases.length) continue;
    let score = parsed.phrases.length * 4 + matched.length / Math.max(1, parsed.terms.length) * 4;
    for (const term of matched) {
      const tf = body.get(term) ?? 0, df = frequency.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const bodyScore = tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * bodyWords.length / average));
      score += idf * (bodyScore + (heading.has(term) ? 3 : 0) + (doc.title.has(term) ? 5 : 0) + (doc.alias.has(term) ? 5 : 0));
    }
    const key = `${doc.entry.path}\0${chunk.heading}\0${chunk.excerpt}`;
    if (!seen.has(key)) { seen.add(key); ranked.push({ entry: doc.entry, ...chunk, score, matchedTerms: matched, requiredPhrases: parsed.phrases }); }
  }
  ranked.sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path) || a.heading.localeCompare(b.heading) || a.excerpt.localeCompare(b.excerpt));
  const hits = balancedHits(ranked, limit);
  return { hits, coverage: { eligibleNotes: eligible.length, filteredNotes: entries.length, matchedNotes: new Set(ranked.map(hit => hit.entry.path)).size,
    matchedPassages: ranked.length, returnedPassages: hits.length, truncatedNotes: entries.filter(entry => entry.truncated).length,
    limited: hits.length < ranked.length, queryTruncated: parsed.truncated } };
}

export function searchCoverageText(coverage: SearchCoverage): string {
  return `${coverage.returnedPassages} selected passages; ${coverage.matchedPassages} matches across ${coverage.matchedNotes} notes. ${coverage.filteredNotes} of ${coverage.eligibleNotes} eligible notes pass filters. At most 3 passages per note and 50 results. Only the first 50000 body characters per note are indexed (${coverage.truncatedNotes} shortened notes). ${coverage.queryTruncated ? "The query was shortened to 1000 characters/40 terms. " : ""}Weighted token matching; quoted phrases are required. Results do not establish complete coverage.`;
}
