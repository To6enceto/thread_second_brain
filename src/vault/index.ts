import { noteSections, type SourceNote } from "./evidence.ts";
import { contentHash, isWithin, readableText, type ReadScope } from "./scope.ts";

export interface IndexEntry {
  path: string; id?: string; title: string; metadata: Record<string, unknown>;
  hash: string; modifiedAt: number; chunks: {heading: string; excerpt: string}[];
  links: string[]; truncated: boolean;
}
export interface RecallHit { entry: IndexEntry; heading: string; excerpt: string; score: number; }
export function identityFromIndex(entries:IndexEntry[],project:string,ready:boolean): string {
  if(!ready)throw new Error("Project evidence is still loading. Refresh and preview again.");
  if(!project)throw new Error("Select a project in Settings first.");
  const ids=new Set(entries.filter(e=>e.path.slice(0,e.path.lastIndexOf("/"))===project&&e.metadata.type==="project"&&e.id?.trim()).map(e=>e.id!));
  if(ids.size>1)throw new Error("This folder contains multiple project IDs. Select a specific project folder or resolve its project metadata first.");
  return [...ids][0]??project;
}
export function linkTargets(text: string): string[] {
  return [...new Set([...text.matchAll(/\[\[([^\]|#]+)(?:[^\]]*)\]\]|\[[^\]]*\]\(([^\s)]+)\)/g)]
    .flatMap(match=>{
      if(match[1])return [match[1].trim()];
      const target=(match[2]??"").replace(/^<|>$/g,"").split("#")[0]??"";
      try{return [decodeURIComponent(target).trim()];}catch{return [];}
    }).filter(link=>link && !/^[a-z]+:|^#|^\//i.test(link)))];
}
export async function indexNote(note: SourceNote, resolve: (link: string) => string | null): Promise<IndexEntry> {
  const text=note.text.slice(0,50000);
  const chunks=noteSections(text).flatMap(section=>{
    const result: {heading:string;excerpt:string}[]=[];
    for(let start=0;start<section.excerpt.length;start+=1000)result.push({heading:section.heading,excerpt:section.excerpt.slice(start,start+1200)});
    return result;
  });
  return {path:note.path,...(typeof note.metadata.id==="string"?{id:note.metadata.id}:{}),
    title:note.path.split("/").at(-1)!.replace(/\.(md|txt)$/i,""),metadata:note.metadata,
    hash:await contentHash(note.text),modifiedAt:note.modifiedAt,chunks,
    links:[...new Set(linkTargets(text).map(resolve).filter((p):p is string=>Boolean(p)))],
    truncated:note.text.length>50000};
}
const stopWords=new Set(["the","a","an","and","or","is","to","of","in","for","what","how","we","our","was","are","did","does","why","with"]);
export function queryTerms(query: string): string[] {
  return [...new Set((query.slice(0,500).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(t=>t.length>1&&!stopWords.has(t)))];
}
export class LocalIndex {
  entries: IndexEntry[]=[];
  ready=false;
  revision=0;
  clear(): void {this.entries=[];this.ready=false;this.revision++;}
  projectEntries(scope:ReadScope,project:string|null): IndexEntry[] {
    const eligible=this.entries.filter(e=>readableText(e.path,scope));
    const contained=project?eligible.filter(e=>isWithin(e.path,project)):eligible;
    const ids=new Set(contained.filter(e=>e.metadata.type==="project").map(e=>e.id).filter(Boolean));
    const linked=new Set(contained.flatMap(e=>e.links));
    return project?eligible.filter(e=>isWithin(e.path,project)||linked.has(e.path)||(typeof e.metadata.project==="string"&&ids.has(e.metadata.project))):eligible;
  }
  recall(query: string, scope: ReadScope, project: string | null, limit=20): RecallHit[] {
    const terms=queryTerms(query);if(!terms.length)return [];
    const candidates=this.projectEntries(scope,project);
    const hits=candidates.flatMap(entry=>entry.chunks.flatMap(chunk=>{
      const body=chunk.excerpt.toLocaleLowerCase();const heading=chunk.heading.toLocaleLowerCase();const title=entry.title.toLocaleLowerCase();
      const matched=terms.filter(t=>body.includes(t)||heading.includes(t)||title.includes(t));
      if(!matched.length)return [];
      const score=matched.reduce((n,t)=>n+(body.includes(t)?1:0)+(heading.includes(t)?3:0)+(title.includes(t)?5:0),0)+matched.length/terms.length;
      return [{entry,...chunk,score}];
    }));
    return hits.sort((a,b)=>b.score-a.score||a.entry.path.localeCompare(b.entry.path)||a.heading.localeCompare(b.heading)).slice(0,Math.max(0,Math.min(limit,50)));
  }
}
export function hitsToNotes(hits: RecallHit[]): SourceNote[] {
  const notes=new Map<string,SourceNote>();
  for(const hit of hits){
    const chunk=`${hit.heading?`## ${hit.heading}\n`:""}${hit.excerpt}\n`;
    const existing=notes.get(hit.entry.path);
    if(existing)existing.text+=chunk;
    else notes.set(hit.entry.path,{path:hit.entry.path,text:chunk,metadata:hit.entry.metadata,modifiedAt:hit.entry.modifiedAt,fullHash:hit.entry.hash});
  }
  return [...notes.values()];
}
