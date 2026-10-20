import {searchBudget,type SearchLevel} from "./budget.ts";
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
  level?:SearchLevel;candidateNotes?:number;availableNotes?:number;candidateHeadings?:number;availableHeadings?:number;
}
export function hybridCoverageText(value: HybridCoverage): string {
  if (value.mode === "keyword-fallback") return `Keyword fallback: ${value.reason} Choose a compatible downloaded embedding model in settings, or use Keyword. Requested ${value.level??"standard"} result budget remains in effect.`;
  const budget=searchBudget(value.level);
  return `Hybrid retrieval with ${value.model} (${value.digest?.slice(0, 12)}): ${budget.level} budget, considered ${value.candidatePassages} of ${value.availablePassages} unique candidate windows across ${value.candidateNotes??"unknown"} of ${value.availableNotes??"unknown"} notes and ${value.candidateHeadings??"unknown"} of ${value.availableHeadings??"unknown"} distinct note/heading groups; ${value.semanticMatches} passed the 0.45 cosine threshold; ${value.returnedPassages} combined results. At most ${budget.candidates} windows, 350 characters each, and ${budget.results} results, with one note before extras and initial windows across distinct headings before extra windows. Repeated equal heading names share a group. Search more explicitly raises the finite budget; filters and index omissions still apply. Similarity and rank fusion are heuristics, not proof of support or complete coverage.`;
}
export interface SemanticCandidates {candidates:RecallHit[];total:number;notes:number;headings:number;}
/** Inspect only the already bounded index; yield before each finite chunk batch and never send text here. */
export async function semanticCandidates(entries:IndexEntry[],query:string,level:SearchLevel="standard",signal?:AbortSignal,current:()=>boolean=()=>true):Promise<SemanticCandidates> {
  const parsed=parseQuery(query),budget=searchBudget(level),groups=new Map<string,Map<string,RecallHit[]>>();let total=0,headings=0,inspected=0;
  const assertCurrent=()=>{signal?.throwIfAborted();if(!current())throw new DOMException("Search sources changed. Search again.","AbortError");};assertCurrent();
  for(const entry of [...entries].sort((a,b)=>a.path.localeCompare(b.path))){
    const sections=new Map<string,RecallHit[]>(),seen=new Set<string>(),aliases=Array.isArray(entry.metadata.aliases)?entry.metadata.aliases.filter((v):v is string=>typeof v==="string"):[];
    for(const chunk of entry.chunks){
      if(inspected++%32===0){await new Promise(resolve=>setTimeout(resolve,0));assertCurrent();}
      for(let offset=0;offset<chunk.excerpt.length;offset+=300){
        const excerpt=chunk.excerpt.slice(offset,offset+350),fields=[entry.title,...aliases,chunk.heading,excerpt];
        if(!excerpt.trim()||!parsed.phrases.every(phrase=>fields.some(field=>` ${tokens(field).join(" ")} `.includes(` ${phrase} `))))continue;
        const key=JSON.stringify([chunk.heading,excerpt]);if(seen.has(key))continue;seen.add(key);total++;
        const group=sections.get(chunk.heading)??[];group.push({entry,heading:chunk.heading,excerpt,score:0,requiredPhrases:parsed.phrases});sections.set(chunk.heading,group);
      }
    }
    if(sections.size){groups.set(entry.path,sections);headings+=sections.size;}
  }
  assertCurrent();
  const ordered=[...groups.values()].map(sections=>{
    const windows:RecallHit[]=[];for(let round=0;windows.length<budget.candidates;round++){let added=false;for(const group of sections.values()){if(windows.length===budget.candidates)break;const hit=group[round];if(hit){windows.push(hit);added=true;}}if(!added)break;}return windows;
  });
  const candidates:RecallHit[]=[];
  for(let round=0;candidates.length<budget.candidates;round++){let added=false;for(const group of ordered){if(candidates.length===budget.candidates)break;const hit=group[round];if(hit){candidates.push(hit);added=true;}}if(!added)break;}
  assertCurrent();return{candidates,total,notes:groups.size,headings};
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
    signal: AbortSignal, current: () => boolean, level:SearchLevel="standard", selection?:SemanticCandidates): Promise<SearchResult> {
    const budget=searchBudget(level),keyword = searchEntries(entries, query, filters, 50), epoch = this.epoch;
    const assertCurrent = () => { signal.throwIfAborted(); if (epoch !== this.epoch || !current()) throw new DOMException("Search sources changed. Search again.", "AbortError"); };
    assertCurrent();
    try {
      const {candidates,total,notes,headings}=selection??await semanticCandidates(filterEntries(entries,filters),query,budget.level,signal,()=>epoch===this.epoch&&current());
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
          if (this.vectors.size > 1024) this.vectors.delete(this.vectors.keys().next().value!);
        });
      }
      const semantic = candidates.map((hit, i) => ({ ...hit, score: cosine(queryVector, vectors[i]!) }))
        .filter(hit => hit.score >= 0.45).sort((a, b) => b.score - a.score);
      const fused = new Map<string, RecallHit>();
      for (const lane of [keyword.hits, semantic]) lane.forEach((hit, rank) => {
        const key = hitKey(hit), previous = fused.get(key);
        fused.set(key, { ...hit, score: (previous?.score ?? 0) + 1 / (60 + rank + 1) });
      });
      const hits = balancedHits([...fused.values()].sort((a, b) => b.score - a.score), budget.results); assertCurrent();
      return { ...keyword, hits,coverage:{...keyword.coverage,level:budget.level,returnedPassages:Math.min(keyword.hits.length,budget.results),limited:keyword.coverage.limited||keyword.hits.length>budget.results}, hybrid: { mode: "hybrid", model, digest: identity.digest, candidatePassages: candidates.length,
        availablePassages: total, semanticMatches: semantic.length, returnedPassages: hits.length,level:budget.level,candidateNotes:new Set(candidates.map(hit=>hit.entry.path)).size,availableNotes:notes,candidateHeadings:new Set(candidates.map(hit=>JSON.stringify([hit.entry.path,hit.heading]))).size,availableHeadings:headings } };
    } catch (error) {
      assertCurrent();
      // A local embedding failure must never make text retrieval unavailable.
      const fallback=searchEntries(entries,query,filters,budget.results);
      return { ...fallback,coverage:{...fallback.coverage,level:budget.level}, hybrid: { mode: "keyword-fallback", model, candidatePassages: 0, availablePassages: 0,
        semanticMatches: 0, returnedPassages: fallback.hits.length,level:budget.level, reason: error instanceof Error ? error.message : "Local embeddings unavailable." } };
    }
  }
}
