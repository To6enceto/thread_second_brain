import type { IndexBudget, IndexProfile } from "../settings/index-budget.ts";
import type { IndexEntry } from "./index.ts";

export interface IndexCoverage {
  profile:IndexProfile;availableFiles:number;indexedFiles:number;omittedFiles:number;shortenedNotes:number;
  retainedChars:number;availableCharsInIndexedNotes:number;sections:number;includedSections:number;chunks:number;
  entryBytes:number;rawBytesRead:number;filesRead:number;sizeSkips:number;readBudgetSkips:number;fileBudgetSkips:number;entryBudgetSkips:number;elapsedMs:number;
}
export interface IndexReadStats {rawBytesRead:number;filesRead:number;sizeSkips:number;readBudgetSkips:number;elapsedMs:number;}
export const entryPayloadBytes=(entries:IndexEntry[]):number=>new TextEncoder().encode(JSON.stringify(entries)).length;
/** Admission counts all serialized fields, including metadata and provenance, rather than just excerpt text. */
export function retainIndexEntries(entries:IndexEntry[],admitted:ReadonlySet<string>,budget:IndexBudget):{entries:IndexEntry[];removed:Set<string>;entryBudgetSkips:number} {
  const kept:IndexEntry[]=[],removed=new Set<string>();let bytes=2,entryBudgetSkips=0;
  for(const entry of [...entries].sort((a,b)=>a.path.localeCompare(b.path))){
    if(!admitted.has(entry.path)){removed.add(entry.path);continue;}
    const size=new TextEncoder().encode(JSON.stringify(entry)).length+(kept.length?1:0);
    if(bytes+size>budget.maxEntryBytes){removed.add(entry.path);entryBudgetSkips++;continue;}
    bytes+=size;kept.push(entry);
  }
  return{entries:kept,removed,entryBudgetSkips};
}
export function indexCoverage(profile:IndexProfile,availableFiles:number,admittedFiles:number,entries:IndexEntry[],stats:IndexReadStats,entryBudgetSkips:number):IndexCoverage {
  return{profile,availableFiles,indexedFiles:entries.length,omittedFiles:Math.max(0,availableFiles-entries.length),shortenedNotes:entries.filter(e=>e.truncated).length,
    retainedChars:entries.reduce((n,e)=>n+e.chunks.reduce((sum,c)=>sum+c.excerpt.length,0),0),availableCharsInIndexedNotes:entries.reduce((n,e)=>n+(e.sectionCoverage?.availableChars??0),0),
    sections:entries.reduce((n,e)=>n+(e.sectionCoverage?.sections??0),0),includedSections:entries.reduce((n,e)=>n+(e.chunks.length?e.sectionCoverage?.includedSections??0:0),0),chunks:entries.reduce((n,e)=>n+e.chunks.length,0),entryBytes:entryPayloadBytes(entries),...stats,
    fileBudgetSkips:Math.max(0,availableFiles-admittedFiles),entryBudgetSkips};
}
export function indexCoverageText(coverage:IndexCoverage):string {
  return `${coverage.indexedFiles} of ${coverage.availableFiles} permitted text files indexed; ${coverage.omittedFiles} omitted. ${coverage.includedSections} of ${coverage.sections} nonempty sections represented in indexed notes; ${coverage.retainedChars} retained characters (overlap included), ${coverage.availableCharsInIndexedNotes} available projected characters in those notes; ${coverage.shortenedNotes} shortened notes. ${coverage.entryBytes} serialized entry bytes. Omitted-file text coverage is unknown.${coverage.omittedFiles?" Stable-ID uniqueness cannot be established across omitted permitted files; identity-dependent reuse or actions require complete coverage. Choose a larger profile or explicitly narrow scope, then rebuild.":""}`;
}
