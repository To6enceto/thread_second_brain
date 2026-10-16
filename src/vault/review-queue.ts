import { activeQuestion } from "./questions.ts";
import { calendarDate } from "./decision.ts";
import { LocalIndex, type IndexEntry } from "./index.ts";
import { type SourceReference } from "./freshness.ts";
import { readableText } from "./scope.ts";
import { localDay } from "./workspace.ts";
import type { ThreadSettings } from "../settings/settings.ts";

export const queueKinds = ["changed-source","decision-evidence","revisit-date","revisit-condition","open-question","stale-output"] as const;
export type QueueKind = typeof queueKinds[number];
export const queueLabels:Record<QueueKind,string>={"changed-source":"Changed recorded sources","decision-evidence":"Decisions needing evidence review","revisit-date":"Due revisit dates","revisit-condition":"Conditions requiring judgment","open-question":"Recorded open questions","stale-output":"Saved outputs needing freshness review"};
export interface QueueSource { path:string;hash:string; }
export interface QueueItem extends QueueSource { kind:QueueKind;heading:string;text:string;related:QueueSource[]; }
export interface ReviewQueue { project:string;day:string;baseline:QueueSource|null;items:QueueItem[];counts:Record<QueueKind,number>;records:number;limits:string[]; }
function revisitDay(value:unknown):string|null{
 if(typeof value!=="string")return null;
 const day=value.replace(/T00:00:00\.000Z$/,"");return calendarDate(day)?day:null;
}
function excerpts(entry:IndexEntry,heading:RegExp):{heading:string;text:string}[]{
 const seen=new Set<string>();return entry.chunks.filter(chunk=>heading.test(chunk.heading.trim())).flatMap(chunk=>chunk.excerpt.split(/\r?\n/).flatMap(line=>{
  const text=line.trim();if(!text||/^[-*]\s+\[[xX]\]/.test(text)||/^(?:Not recorded\.|None recorded\.|None\.)$/i.test(text)||seen.has(text))return [];
  seen.add(text);return [{heading:chunk.heading,text:text.slice(0,400)}];
 }));
}
export function projectReviewQueue(index:LocalIndex,settings:ThreadSettings,day=localDay()):ReviewQueue{
 if(!calendarDate(day))throw new Error("Invalid review day.");
 if(!index.ready)throw new Error("Project index is updating. Refresh the queue afterward.");
 if(!settings.selectedProject)throw new Error("Select a permitted project first.");
 const records=index.projectRecords(settings,settings.selectedProject);
 if(!records.length)throw new Error("No project records are visible in the current read scope.");
 const graph=index.graph(settings),all=new Map(index.entries.filter(entry=>readableText(entry.path,settings)).map(entry=>[entry.path,entry]));
 const items:QueueItem[]=[],changed=new Map<string,QueueItem>();let invalidDates=0,unavailable=0;
 const add=(entry:IndexEntry,kind:QueueKind,text:string,heading="",related:QueueSource[]=[])=>items.push({path:entry.path,hash:entry.hash,kind,heading,text,related:related.slice(0,5)});
 const sources=(refs:SourceReference[])=>{
  const related=new Map<string,QueueSource>();let needsReview=false,missing=0;
  for(const ref of refs){
   const state=graph.resolve(ref),entry=state.path?all.get(state.path):undefined;
   if(!entry){needsReview=true;missing++;continue;}
   related.set(entry.path,{path:entry.path,hash:entry.hash});
   if(state.state==="changed")changed.set(entry.path,{path:entry.path,hash:entry.hash,kind:"changed-source",heading:"",text:"This source differs from at least one recorded supporting snapshot. Inspect its current note; this is not an event-date claim.",related:[]});
   if(!["current","renamed"].includes(state.state)||!graph.assess(entry.path).usable)needsReview=true;
  }
  unavailable+=missing;return{related:[...related.values()],needsReview,missing};
 };
 const baseline=records.filter(entry=>{const generated=revisitDay(entry.metadata.generated_on);return entry.metadata.type==="review"&&entry.output&&!entry.output.invalid&&generated!==null&&generated<=day;})
  .sort((a,b)=>String(b.metadata.generated_on??"").localeCompare(String(a.metadata.generated_on??""))||b.modifiedAt-a.modifiedAt||a.path.localeCompare(b.path))[0];
 for(const entry of records){
  if(entry.output){
   const supporting=sources(entry.output.refs),state=graph.assess(entry.path);
   if(!state.usable)add(entry,"stale-output",`Saved output is ${state.state}. Open Source freshness and explicitly choose current evidence for a new version. Unavailable references are redacted; stale excerpts are not shown.`,"",supporting.related);
  }
  if(entry.metadata.type==="decision"){
   const refs=entry.decisionSources,supporting=sources(refs?.refs??[]),status=String(entry.metadata.status??"status not recorded").slice(0,100);
   if(refs?.invalid||supporting.needsReview)add(entry,"decision-evidence",`${status}: ${refs?.invalid?"Recorded source references are invalid.":"Supporting evidence changed, is ambiguous, stale or unavailable."} Review explicitly; the recorded choice/status remains unchanged.${supporting.missing?" Unavailable reference paths are hidden.":""}`,"",supporting.related);
   if(status!=="superseded"){
    if(entry.metadata.revisit_on!==undefined){const revisit=revisitDay(entry.metadata.revisit_on);if(!revisit)invalidDates++;else if(revisit<=day)add(entry,"revisit-date",`${status}: revisit date ${revisit} is due as of ${day}. A due date does not establish that the choice should change.`);}
    for(const condition of excerpts(entry,/^revisit when$/i))add(entry,"revisit-condition",`${status}: ${condition.text} Condition satisfaction requires your judgment.`,condition.heading,supporting.related);
   }
  }
  if(graph.assess(entry.path).usable&&(entry.metadata.type!=="question"||activeQuestion(entry.metadata.type,entry.metadata.status,"Question"))){
   for(const question of excerpts(entry,entry.metadata.type==="question"?/^question$/i:/^(?:open|unresolved) questions?$/i))add(entry,"open-question",question.text,question.heading);
  }
 }
 items.push(...changed.values());
 const unique=[...new Map(items.map(item=>[JSON.stringify([item.kind,item.path,item.heading,item.text]),item])).values()];
 unique.sort((a,b)=>a.path.localeCompare(b.path)||a.heading.localeCompare(b.heading)||a.text.localeCompare(b.text));
 const counts=Object.fromEntries(queueKinds.map(kind=>[kind,unique.filter(item=>item.kind===kind).length])) as Record<QueueKind,number>;
 return{project:settings.selectedProject,day,baseline:baseline?{path:baseline.path,hash:baseline.hash}:null,items:queueKinds.flatMap(kind=>unique.filter(item=>item.kind===kind).slice(0,20)),counts,records:records.length,
  limits:[baseline?`Comparison baseline: ${baseline.path}. Source changes also use recorded decision/output references.`:"No readable saved review baseline. Source changes are shown only when recorded decision/output references establish an earlier snapshot.",
   "Only reviews with a valid nonfuture recorded generation date can be comparison baselines. Older retained stale versions can remain listed until explicitly reconciled in the authoritative records.",
   "This is an on-demand indexed snapshot, not an exhaustive change feed. Uncited changes, unrecognized legacy structure and content beyond the first 50000 body characters per note can be missing. At most 20 items per category and five related sources per item are shown.",
   "Opening or refreshing the queue does not resolve questions, satisfy conditions, accept decisions or change notes. Use explicit existing review workflows or edit the authoritative record yourself.",
   ...(invalidDates?[`${invalidDates} invalid revisit dates cannot be scheduled; use an explicit YYYY-MM-DD property.`]:[]),...(unavailable?[`${unavailable} unavailable reference occurrences have their paths and excerpts hidden.`]:[])]};
}
