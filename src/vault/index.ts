import { reviewProvenance, reviewManifestHash } from "./review-provenance.ts";
import { readPdfSource,pdfEvidenceText,type PdfRecord } from "../pdf/record.ts";
import { outputProjection,FreshnessGraph,readSourceReferences,type OutputProvenance,type RenameMap,type SourceReference } from "./freshness.ts";
import type { SourceNote } from "./evidence.ts";
import { sectionChunks, type SectionCoverage } from "./sections.ts";
import { indexBudget, type IndexBudget } from "../settings/index-budget.ts";
import type { IndexCoverage } from "./index-coverage.ts";
import { contentHash, isWithin, readableText, type ReadScope } from "./scope.ts";
import { searchEntries, keywordTerms, type SearchResult, type SearchFilters } from "../retrieval/search.ts";

export interface IndexEntry {
  pdf?:PdfRecord;
  sectionCoverage?:SectionCoverage;
  reviewManifestHash?:string;
  decisionSources?: {refs:SourceReference[];invalid:boolean};
  path: string; id?: string; title: string; metadata: Record<string, unknown>;
  hash: string; modifiedAt: number; chunks: {heading: string; excerpt: string}[];
  links: string[]; linkTexts?: string[]; truncated: boolean; output?:OutputProvenance;
}
export interface RecallHit { entry: IndexEntry; heading: string; excerpt: string; score: number; matchedTerms?: string[]; requiredPhrases?: string[]; }
export function identityFromIndex(entries:IndexEntry[],project:string,ready:boolean,complete=true): string {
  if(!ready)throw new Error("Project evidence is still loading. Refresh and preview again.");
  if(!complete)throw new Error("Index budgets omitted permitted files. Complete coverage is required to establish project identity; choose a larger profile or explicitly narrow scope, then rebuild.");
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
export async function indexNote(note: SourceNote, resolve: (link: string) => string | null, options:{budget?:IndexBudget;signal?:AbortSignal}={}): Promise<IndexEntry> {
  options.signal?.throwIfAborted();const budget=options.budget??indexBudget("standard");
  if(new TextEncoder().encode(note.text).length>budget.maxFileBytes)throw new Error("Note exceeds the selected raw-file index budget.");
  let projected=outputProjection(note.text,note.metadata),pdf:PdfRecord|undefined;
  if(note.metadata.thread_pdf_version!==undefined||note.metadata.thread_pdf!==undefined){
    try{const validated=await readPdfSource(note.text,note.metadata);pdf=validated.record;projected={text:pdfEvidenceText(validated.extraction),ranges:[],output:{refs:[{path:pdf.path,heading:"",hash:pdf.hash,noteHash:pdf.hash,noteType:"pdf"}],invalid:false,title:"Extracted PDF text; original verification required"}};}catch{/* Keep the fail-closed projection for unsupported or edited extractions. */}
  }
  const selected=await sectionChunks(projected.text,budget,options.signal),chunks=selected.chunks;
  const linkTexts=[...new Set(chunks.flatMap(chunk=>linkTargets(`${chunk.heading}\n${chunk.excerpt}`)))];
  const fields=new Set(["id","type","status","project","created","updated","captured_on","recorded_on","decided_on","generated_on","thread_model","thread_import_hash","thread_original_name","thread_original_url","thread_period_start","thread_period_end","thread_previous_output","revisit_on","thread_question_version","thread_review_version","thread_review_key","thread_review_snapshot","action","event_on","thread_milestone_version","thread_next_action_version","selected_at"]);
  const metadata=Object.fromEntries(Object.entries(note.metadata).filter(([key,value])=>fields.has(key)&&typeof value==="string"));
  const aliases = typeof note.metadata.aliases === "string" ? [note.metadata.aliases] : note.metadata.aliases;
  if (Array.isArray(aliases)) metadata.aliases = aliases.filter((value): value is string => typeof value === "string").slice(0, 20).map(value => value.slice(0, 100));
  let decisionSources:IndexEntry["decisionSources"];
  if(note.metadata.type==="decision"&&note.metadata.thread_sources!==undefined){
    try{
      if(typeof note.metadata.thread_sources==="string"&&note.metadata.thread_sources.length>1048576)throw new Error("Oversized decision references");
      decisionSources={refs:readSourceReferences(note.metadata.thread_sources,true).map(ref=>({...ref,heading:""})),invalid:false};
    }catch{decisionSources={refs:[],invalid:true};}
  }
  const review=note.metadata.type==="review-event"&&note.metadata.thread_review_version==="1"&&!projected.output?.invalid?reviewProvenance(note.text,note.metadata):undefined;
  const hash=await contentHash(note.text);options.signal?.throwIfAborted();
  return {...(pdf?{pdf}:{}),sectionCoverage:selected.coverage,...(review?{reviewManifestHash:await reviewManifestHash(review.kind,review.target,review.hashes)}:{}),path:note.path,...(typeof note.metadata.id==="string"?{id:note.metadata.id}:{}),
    ...(decisionSources?{decisionSources}:{}),
    title:note.path.split("/").at(-1)!.replace(/\.(md|txt)$/i,""),metadata,...(projected.output?{output:projected.output}:{}),
    hash,modifiedAt:note.modifiedAt,chunks,linkTexts,
    links:[...new Set(linkTexts.map(resolve).filter((p):p is string=>Boolean(p)))],
    truncated:selected.coverage.limited};
}
export function queryTerms(query: string): string[] {
  return keywordTerms(query.slice(0,1000)).slice(0,40);
}
export class LocalIndex {
  /** Binary authority is never restored from the persisted text index. */
  binaries=new Map<string,string>();
  entries: IndexEntry[]=[];
  coverage:IndexCoverage|null=null;
  ready=false;
  revision=0;
  renames:RenameMap={};
  get identityComplete():boolean{return this.coverage===null||this.coverage.omittedFiles===0;}
  idUnambiguous(id:string):boolean{return this.ready&&this.identityComplete&&this.entries.filter(e=>e.id===id).length===1;}
  graph(scope:ReadScope):FreshnessGraph{return new FreshnessGraph(this.entries,scope,this.renames,this.identityComplete,this.binaries);}
  replace(entries:IndexEntry[],scope:ReadScope):void{
    const allowed=entries.filter(e=>readableText(e.path,scope));
    const graph=new FreshnessGraph(allowed,scope,this.renames,this.identityComplete,this.binaries);
    this.entries=allowed.map(e=>e.output&&!graph.assess(e.path).usable?{...e,chunks:[],links:[],linkTexts:[]}:e);this.ready=true;
  }
  clear(): void {this.entries=[];this.binaries.clear();this.coverage=null;this.ready=false;this.revision++;}
  projectRecords(scope:ReadScope,project:string):IndexEntry[]{
    return projectMembers(this.entries.filter(entry=>readableText(entry.path,scope)),project);
  }
  projectEntries(scope:ReadScope,project:string|null): IndexEntry[] {
    const graph=this.graph(scope);
    const eligible=this.entries.filter(e=>readableText(e.path,scope)&&graph.assess(e.path).usable);
    return project?projectMembers(eligible,project):eligible;
  }
  recall(query: string, scope: ReadScope, project: string | null, limit=20): RecallHit[] {
    return this.search(query,scope,project,{},limit).hits;
  }
  search(query:string,scope:ReadScope,project:string|null,filters:SearchFilters={},limit=20):SearchResult{
    return searchEntries(this.projectEntries(scope,project),query,filters,limit);
  }
}
export function hitsToNotes(hits: RecallHit[]): SourceNote[] {
  const notes=new Map<string,SourceNote>();
  for(const hit of hits){
    // A whole indexed section is provable only when its sole chunk was retained
    // without index clipping. Other windows may begin/end inside a statement.
    const section = hit.entry.chunks.filter(chunk => chunk.heading === hit.heading);
    const partial = !hit.entry.sectionCoverage || hit.entry.truncated || section.length !== 1 || section[0]?.excerpt !== hit.excerpt;
    const chunk=`${hit.heading?`## ${hit.heading}\n`:""}${hit.excerpt}\n`;
    const existing=notes.get(hit.entry.path);
    if(existing){existing.partial ||= partial;existing.text+=chunk;existing.focusTerms=[...new Set([...(existing.focusTerms??[]),...(hit.matchedTerms??[])])];existing.focusPhrases=[...new Set([...(existing.focusPhrases??[]),...(hit.requiredPhrases??[])])];}
    else notes.set(hit.entry.path,{partial,path:hit.entry.path,text:chunk,metadata:hit.entry.metadata,modifiedAt:hit.entry.modifiedAt,fullHash:hit.entry.hash,relevance:hit.score,focusTerms:hit.matchedTerms??[],focusPhrases:hit.requiredPhrases??[],...(hit.entry.pdf?{pdf:hit.entry.pdf}:{})});
  }
  return [...notes.values()];
}

function projectMembers(entries:IndexEntry[],project:string):IndexEntry[]{
  const contained=entries.filter(entry=>isWithin(entry.path,project));
  const ids=new Set(contained.filter(entry=>entry.metadata.type==="project").map(entry=>entry.id).filter(Boolean));
  const linked=new Set(contained.flatMap(entry=>entry.links));
  return entries.filter(entry=>isWithin(entry.path,project)||linked.has(entry.path)||(typeof entry.metadata.project==="string"&&ids.has(entry.metadata.project)));
}
