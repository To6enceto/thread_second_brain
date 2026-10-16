import type { EmbeddingIdentity } from "../intelligence/ollama.ts";
import { validateVectors } from "../intelligence/ollama.ts";
import type { IndexEntry, RecallHit } from "../vault/index.ts";
import { contentHash } from "../vault/scope.ts";
import { balancedHits, filterEntries, parseQuery, searchEntries, tokens, type SearchFilters, type SearchResult } from "./search.ts";

export interface EmbeddingPort {
  embeddingIdentity(model: string, signal: AbortSignal): Promise<EmbeddingIdentity>;
  embed(identity: EmbeddingIdentity, input: string[], signal: AbortSignal, current: () => boolean): Promise<number[][]>;
}
export interface HybridCoverage {
  mode: "hybrid" | "keyword-fallback"; model: string; digest?: string; candidatePassages: number;
  availablePassages: number; semanticMatches: number; returnedPassages: number; reason?: string;
}
export function hybridCoverageText(value: HybridCoverage): string {
  if (value.mode === "keyword-fallback") return `Keyword fallback: ${value.reason} Choose a compatible downloaded embedding model in settings, or use Keyword.`;
  return `Hybrid retrieval with ${value.model} (${value.digest?.slice(0, 12)}): considered ${value.candidatePassages} of ${value.availablePassages} candidate passages; ${value.semanticMatches} passed the 0.45 cosine threshold; ${value.returnedPassages} combined results. At most 128 passages, 350 characters each, considered in note order with one per note before extras. Similarity and rank fusion are heuristics, not proof of support or complete coverage.`;
}
export function semanticCandidates(entries: IndexEntry[], query: string): { candidates: RecallHit[]; total: number } {
  const parsed = parseQuery(query), seen = new Set<string>();
  const all = entries.flatMap(entry => entry.chunks.flatMap(chunk => {
    const hits: RecallHit[] = [];
    for (let offset = 0; offset < chunk.excerpt.length; offset += 300) {
      const excerpt = chunk.excerpt.slice(offset, offset + 350);
      const fields = [entry.title, ...(Array.isArray(entry.metadata.aliases) ? entry.metadata.aliases.filter((v): v is string => typeof v === "string") : []), chunk.heading, excerpt];
      if (!parsed.phrases.every(phrase => fields.some(field => ` ${tokens(field).join(" ")} `.includes(` ${phrase} `)))) continue;
      const key = JSON.stringify([entry.path, chunk.heading, excerpt]);
      if (!excerpt.trim() || seen.has(key)) continue;
      seen.add(key); hits.push({ entry, heading: chunk.heading, excerpt, score: 0, requiredPhrases: parsed.phrases });
    }
    return hits;
  }));
  // Unlike output diversity, candidate coverage may include many passages per note.
  const groups = new Map<string, RecallHit[]>();
  for (const hit of all) { const group = groups.get(hit.entry.path) ?? []; group.push(hit); groups.set(hit.entry.path, group); }
  const candidates: RecallHit[] = [];
  for (let round = 0; candidates.length < 128; round++) {
    let added = false;
    for (const group of groups.values()) { if (candidates.length === 128) break; const hit = group[round]; if (hit) { candidates.push(hit); added = true; } }
    if (!added) break;
  }
  return { candidates, total: all.length };
}
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Embedding dimensions changed. Choose a compatible local model and search again.");
  let sum = 0; for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return sum / Math.hypot(...a) / Math.hypot(...b);
}
function hitKey(hit: RecallHit): string { return JSON.stringify([hit.entry.path, hit.heading, hit.excerpt]); }
export class SemanticSearch {
  private vectors = new Map<string, {path:string; vector:number[]}>();
  private epoch = 0;
  clear(): void { this.epoch++; this.vectors.clear(); }
  invalidate(paths: Set<string>): void { for (const [key,value] of this.vectors) if (paths.has(value.path)) this.vectors.delete(key); }
  get size(): number { return this.vectors.size; }
  async search(entries: IndexEntry[], query: string, filters: SearchFilters, model: string, port: EmbeddingPort,
    signal: AbortSignal, current: () => boolean): Promise<SearchResult> {
    const keyword = searchEntries(entries, query, filters, 50), epoch = this.epoch;
    const assertCurrent = () => { signal.throwIfAborted(); if (epoch !== this.epoch || !current()) throw new DOMException("Search sources changed. Search again.", "AbortError"); };
    assertCurrent();
    try {
      const { candidates, total } = semanticCandidates(filterEntries(entries, filters), query);
      if (!query.trim()) throw new Error("Enter words for semantic retrieval.");
      const identity = await port.embeddingIdentity(model, signal); assertCurrent();
      const queryVector = validateVectors(await port.embed(identity, [query.slice(0, 1000)], signal, current), 1)[0]!; assertCurrent();
      const keys = await Promise.all(candidates.map(hit => contentHash(JSON.stringify([identity.digest, hit.entry.path, hit.entry.hash, hit.heading, hit.excerpt])))); assertCurrent();
      const vectors: (number[] | undefined)[] = keys.map(key => this.vectors.get(key)?.vector);
      const missing = candidates.map((_, i) => i).filter(i => !vectors[i]);
      for (let start = 0; start < missing.length; start += 8) {
        assertCurrent();
        const batch = missing.slice(start, start + 8);
        const result = validateVectors(await port.embed(identity, batch.map(i => `${candidates[i]!.heading}\n${candidates[i]!.excerpt}`), signal,
          () => epoch === this.epoch && current()), batch.length); assertCurrent();
        batch.forEach((i, offset) => {
          const vector = result[offset]!;
          cosine(queryVector, vector); vectors[i] = vector;
          this.vectors.delete(keys[i]!); this.vectors.set(keys[i]!, {path:candidates[i]!.entry.path,vector});
          if (this.vectors.size > 512) this.vectors.delete(this.vectors.keys().next().value!);
        });
      }
      const semantic = candidates.map((hit, i) => ({ ...hit, score: cosine(queryVector, vectors[i]!) }))
        .filter(hit => hit.score >= 0.45).sort((a, b) => b.score - a.score);
      const fused = new Map<string, RecallHit>();
      for (const lane of [keyword.hits, semantic]) lane.forEach((hit, rank) => {
        const key = hitKey(hit), previous = fused.get(key);
        fused.set(key, { ...hit, score: (previous?.score ?? 0) + 1 / (60 + rank + 1) });
      });
      const hits = balancedHits([...fused.values()].sort((a, b) => b.score - a.score), 20); assertCurrent();
      return { ...keyword, hits, hybrid: { mode: "hybrid", model, digest: identity.digest, candidatePassages: candidates.length,
        availablePassages: total, semanticMatches: semantic.length, returnedPassages: hits.length } };
    } catch (error) {
      assertCurrent();
      // A local embedding failure must never make text retrieval unavailable.
      return { ...searchEntries(entries, query, filters), hybrid: { mode: "keyword-fallback", model, candidatePassages: 0, availablePassages: 0,
        semanticMatches: 0, returnedPassages: keyword.hits.slice(0, 20).length, reason: error instanceof Error ? error.message : "Local embeddings unavailable." } };
    }
  }
}
