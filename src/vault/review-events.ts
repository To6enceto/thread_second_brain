import type { ThreadSettings } from "../settings/settings.ts";
import { escapeMarkdown } from "../intelligence/answer.ts";
import { readReviewEvent, reviewManifestHash, type ReviewEvent } from "./review-provenance.ts";
export { readReviewEvent, type ReviewEvent } from "./review-provenance.ts";
import { calendarDate } from "./decision.ts";
import { type IndexEntry, LocalIndex } from "./index.ts";
import { contentHash, readableText } from "./scope.ts";
import { frontmatter, localDay } from "./workspace.ts";
import { projectReviewQueue, queueKinds, type QueueItem, type ReviewQueue } from "./review-queue.ts";
import { outputProjection, readSourceReferences, type SourceReference } from "./freshness.ts";
import { readMetadata } from "./evidence.ts";

export interface ReviewSnapshot { key:string; digest:string; hashes:Record<string,string>; }
export interface DisposedItem { item:QueueItem; snapshot:ReviewSnapshot|null; event?:IndexEntry; disposition?:"reviewed"|"snoozed"; }
export interface DisposedQueue extends Omit<ReviewQueue,"items"> { pending:DisposedItem[]; handled:DisposedItem[]; candidateCounts:Record<string,number>; }
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
export type QuestionReferenceReader=(path:string,hash:string)=>Promise<SourceReference[]>;
class UnsupportedSnapshot extends Error {}
export function questionReviewReferences(raw:string,parseYaml:(value:string)=>unknown):SourceReference[] {
 try {
  const metadata=readMetadata(raw,parseYaml);
  if(raw.length>1048576||metadata.type!=="question"||metadata.thread_question_version!=="1"||outputProjection(raw,metadata).output?.invalid)throw new Error("Question provenance cannot be snapshotted. Preserve it and review manually.");
  const refs=readSourceReferences(metadata.thread_sources,true);
  for(const block of raw.matchAll(/^<!-- thread:question-evidence -->\r?\n([\s\S]*?)^<!-- \/thread:question-evidence -->/gm)){
    for(const match of block[1]!.matchAll(/^```json\r?\n([\s\S]*?)\r?\n```/gm)){
      const data:unknown=JSON.parse(match[1]!);if(!data||typeof data!=="object"||!("schemaVersion" in data)||data.schemaVersion!==1||!("sources" in data))throw new Error("Unsupported question source snapshots. Review manually.");
      refs.push(...readSourceReferences(data.sources,true));
    }
  }
  if(refs.length>1000)throw new Error("Question exceeds the 1000-reference review budget. Review manually.");
  return refs;
 }catch{throw new UnsupportedSnapshot("Question source snapshots are unsupported, invalid or oversized. Preserve the record and review manually.");}
}


export async function reviewSnapshot(index:LocalIndex,settings:ThreadSettings,item:QueueItem,readQuestion:QuestionReferenceReader):Promise<ReviewSnapshot> {
  if(!index.ready)throw new Error("Review index is updating. Refresh the queue.");
  const revision=index.revision,entries=index.entries,graph=index.graph(settings),target=entries.find(e=>e.path===item.path);
  if(!target||target.hash!==item.hash||!readableText(target.path,settings))throw new Error("Review target changed or is unavailable. Refresh the queue.");
  const visited=new Set<string>(),hashes:Record<string,string>={},states:unknown[]=[];let references=0;
  const visit=async(entry:IndexEntry)=>{
    if(visited.has(entry.path))return;if(Object.keys(hashes).length>=200)throw new UnsupportedSnapshot("This review exceeds the 200-note dependency snapshot limit. Review the source manually.");
    if(entry.output?.invalid||entry.decisionSources?.invalid)throw new UnsupportedSnapshot("Invalid source provenance prevents an exact review snapshot. Review manually.");
    if(entry.id&&!index.idUnambiguous(entry.id))throw new UnsupportedSnapshot("Ambiguous source identities or incomplete index coverage prevent an exact review snapshot. Restore coverage or resolve identities manually.");
    visited.add(entry.path);hashes[entry.path]=entry.hash;
    states.push([entry.path,entry.id??null,entry.hash,entry.metadata.type??null,entry.metadata.status??null,entry.output?.invalid??false,entry.decisionSources?.invalid??false,
      entry.id?(graph.ids.get(entry.id)??[]).map(e=>[e.path,e.hash]).sort():[]]);
    // Walk every reference, including references after a stale or missing one.
    const questionRefs=entry.metadata.type==="question"?await readQuestion(entry.path,entry.hash):[];
    for(const ref of [...entry.output?.refs??[],...entry.decisionSources?.refs??[],...questionRefs]){
      if(++references>2000)throw new UnsupportedSnapshot("This review exceeds the 2000-reference snapshot budget. Review manually.");
      const resolved=graph.resolve(ref);if(resolved.state==="ambiguous")throw new UnsupportedSnapshot("Ambiguous source identities or incomplete index coverage prevent an exact review snapshot. Restore coverage or resolve identities manually.");states.push([ref.id??null,ref.path,ref.noteHash,ref.noteType??null,ref.noteStatus??null,resolved.state,resolved.path??null,resolved.hash??null]);
      const next=resolved.path?graph.notes.get(resolved.path):undefined;
      if(next&&graph.binaries.has(next.path)){if(!Object.hasOwn(hashes,next.path)&&Object.keys(hashes).length>=200)throw new UnsupportedSnapshot("This review exceeds the 200-note dependency snapshot limit. Review the source manually.");hashes[next.path]=next.hash;states.push([next.path,next.hash,"pdf-original"]);}
      else if(next&&readableText(next.path,settings))await visit(next as IndexEntry);
    }
  };
  await visit(target);
  const key=await contentHash(JSON.stringify([item.kind,target.id??target.path,item.heading,["open-question","revisit-condition"].includes(item.kind)?item.text:""]));
  const fingerprint=await contentHash(JSON.stringify(states));
  if(!index.ready||index.revision!==revision||index.entries!==entries)throw new Error("Review sources changed. Refresh the queue.");
  return{key,digest:fingerprint,hashes};
}

export function reviewEventMarkdown(project:string,snapshot:ReviewSnapshot,item:QueueItem,action:ReviewEvent["action"],reason:string,revisitOn="",day=localDay()):string {
  if(!project||project.length>4096||!digest(snapshot.key)||!digest(snapshot.digest)||!calendarDate(day)||!reason.trim()||reason.length>5000||!["reviewed","snoozed"].includes(action))throw new Error("Enter a review reason of up to 5000 characters and choose a valid action.");
  if(action==="snoozed"&&(!calendarDate(revisitOn)||revisitOn<=day))throw new Error("Choose a revisit date after today.");
  return frontmatter({id:crypto.randomUUID(),type:"review-event",thread_review_version:"1",project,recorded_on:day,action,thread_review_key:snapshot.key,thread_review_snapshot:snapshot.digest,...(action==="snoozed"?{revisit_on:revisitOn}:{}),created:localDay()})
    +`# Explicit project review\n\nAction: **${action}**${action==="snoozed"?` until ${revisitOn}`:" / no change"}. This acknowledges only the recorded snapshot. It does not make output current, accept a decision, resolve a question or establish supporting claims.\n\n## Reason\n\n${escapeMarkdown(reason.trim())}\n\n## Target and source snapshots\n\n<!-- thread:review-evidence -->\nTarget: [${escapeMarkdown(item.path)}](<${encodeURI(item.path).replace(/#/g,"%23")}>)\n\n\`\`\`json\n${JSON.stringify({schemaVersion:1,kind:item.kind,hashes:snapshot.hashes}).replace(/[<>`]/g,c=>"\\u"+c.charCodeAt(0).toString(16).padStart(4,"0"))}\n\`\`\`\n<!-- /thread:review-evidence -->\n`;
}

export async function disposedReviewQueue(index:LocalIndex,settings:ThreadSettings,readQuestion:QuestionReferenceReader,day=localDay(),signal?:AbortSignal):Promise<DisposedQueue> {
  const revision=index.revision,entries=index.entries,queue=projectReviewQueue(index,settings,day,200),graph=index.graph(settings),records=index.projectRecords(settings,settings.selectedProject);
  const events=records.flatMap(entry=>{const event=readReviewEvent(entry.metadata);return event&&index.idUnambiguous(event.id)&&graph.assess(entry.path).usable&&event.recordedOn<=day?[{entry,event}]:[];})
    .sort((a,b)=>b.event.recordedOn.localeCompare(a.event.recordedOn)||b.entry.modifiedAt-a.entry.modifiedAt||a.entry.path.localeCompare(b.entry.path));
  const pending:DisposedItem[]=[],handled:DisposedItem[]=[],counts:Record<string,number>={};let incomplete=0;
  for(const item of queue.items){
    signal?.throwIfAborted();if((pending.length+handled.length)%12===0)await new Promise(resolve=>setTimeout(resolve,0));
    let snapshot:ReviewSnapshot|null=null;try{snapshot=await reviewSnapshot(index,settings,item,readQuestion);}catch(error){if(!index.ready||index.revision!==revision)throw new Error("Review index changed. Refresh the queue.");if(!(error instanceof UnsupportedSnapshot))throw error;incomplete++;}
    const manifest=snapshot?await reviewManifestHash(item.kind,item.path,snapshot.hashes):null;
    const match=snapshot?events.find(e=>e.entry.reviewManifestHash===manifest&&e.event.key===snapshot.key&&e.event.snapshot===snapshot.digest):undefined;
    const active=match&&(match.event.action==="reviewed"||match.event.revisitOn!>day);
    const row:DisposedItem={item,snapshot,...(active?{event:match.entry,disposition:match.event.action}:{})};(active?handled:pending).push(row);
  }
  signal?.throwIfAborted();if(!index.ready||revision!==index.revision||entries!==index.entries)throw new Error("Review index changed. Refresh the queue.");
  for(const kind of queueKinds)counts[kind]=pending.filter(row=>row.item.kind===kind).length;
  return{...queue,counts:counts as ReviewQueue["counts"],candidateCounts:queue.counts,pending:queueKinds.flatMap(kind=>pending.filter(row=>row.item.kind===kind).slice(0,20)),handled:queueKinds.flatMap(kind=>handled.filter(row=>row.item.kind===kind).slice(0,20)),
    limits:[...queue.limits,"Dispositions inspect at most 200 candidates per category; 20 pending and 20 handled items per category are shown. A hidden or changed review record cannot suppress an item. Dates are checked when you refresh; no scheduler runs.",...(incomplete?[`${incomplete} items have unsupported, ambiguous or oversized source snapshots and cannot be acknowledged here; inspect them manually.`]:[])]};
}
