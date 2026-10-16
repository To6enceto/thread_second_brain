import type { ThreadSettings } from "../settings/settings.ts";
import { escapeMarkdown } from "../intelligence/answer.ts";
import { calendarDate } from "./decision.ts";
import { LocalIndex, type IndexEntry } from "./index.ts";
import { readReviewEvent } from "./review-provenance.ts";
import { readableText, vaultPath } from "./scope.ts";
import { frontmatter, localDay } from "./workspace.ts";

export interface TimelineEvent {
  kind:"session"|"review"|"review-event"|"milestone"|"decision"|"decision-review";
  path:string;hash:string;heading:string;day:string|null;dateBasis:string;text:string;
  capture:string;modified:string;usable:boolean;related?:{path:string;hash:string};
}
export interface Timeline {events:TimelineEvent[];total:number;unknown:number;records:number;examined:number;limits:string[];}
export function calendarDay(value:unknown):string|null {
  if(typeof value!=="string")return null;
  const day=value.replace(/T00:00:00\.000Z$/,"");return calendarDate(day)?day:null;
}
export function milestoneRecord(m:Record<string,unknown>,today=localDay()):boolean {
  const event=calendarDay(m.event_on),recorded=calendarDay(m.recorded_on),created=calendarDay(m.created);
  return m.type==="milestone"&&m.thread_milestone_version==="1"&&typeof m.id==="string"&&!!m.id.trim()&&m.id.length<=200&&typeof m.project==="string"&&!!m.project.trim()&&m.project.length<=4096
    &&calendarDate(today)&&!!event&&event<=today&&!!recorded&&recorded<=today&&!!created&&created<=today;
}
export function milestoneMarkdown(project:string,title:string,detail:string,eventDay:string,today=localDay()):string {
  if(!project.trim()||project.length>4096||!title.trim()||title.length>200||!detail.trim()||detail.length>5000||!calendarDate(today)||!calendarDate(eventDay)||eventDay>today)throw new Error("Enter a milestone title (up to 200 characters), detail (up to 5000) and a valid event date on or before today.");
  return frontmatter({id:crypto.randomUUID(),type:"milestone",thread_milestone_version:"1",project,event_on:eventDay,recorded_on:today,created:today})
    +`# Project milestone\n\nThis is an explicit user-reported milestone, not independently verified achievement. Event date: ${eventDay}; captured locally: ${today}.\n\n## Milestone\n\n${escapeMarkdown(title.trim())}\n\n## Detail\n\n${escapeMarkdown(detail.trim())}\n`;
}
function outsideFences(text:string):string[] {
  let fence="";return text.split(/\r?\n/).filter(line=>{
    const marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length)){fence=fence?"":marker;return false;}return !fence;
  });
}
export function projectTimeline(index:LocalIndex,settings:ThreadSettings,today=localDay()):Timeline {
  if(!index.ready)throw new Error("Project index is updating. Refresh the timeline.");
  if(!settings.selectedProject)throw new Error("Select a permitted project first.");
  if(!calendarDate(today))throw new Error("Invalid timeline date.");
  const records=index.projectRecords(settings,settings.selectedProject);if(!records.length)throw new Error("No project records are visible in the current read scope.");
  const graph=index.graph(settings),eligible=new Map(index.projectEntries(settings,null).map(e=>[e.path,e])),examined=[...records].sort((a,b)=>b.modifiedAt-a.modifiedAt||a.path.localeCompare(b.path)).slice(0,2000),events:TimelineEvent[]=[];let hiddenLinks=0,repeated=0;
  const add=(entry:IndexEntry,kind:TimelineEvent["kind"],key:string,text:string,heading="",explicit?:string|null)=>{
    const captureKey=["created","captured_on","generated_on"].find(k=>calendarDay(entry.metadata[k]));
    const event:TimelineEvent={kind,path:entry.path,hash:entry.hash,heading,day:explicit===undefined?calendarDay(entry.metadata[key]):explicit,dateBasis:key,text,capture:captureKey?`${captureKey}: ${calendarDay(entry.metadata[captureKey])}`:"Capture date unknown",modified:Number.isFinite(entry.modifiedAt)&&Number.isFinite(new Date(entry.modifiedAt).getTime())?localDay(new Date(entry.modifiedAt)):"unknown",usable:graph.assess(entry.path).usable};
    events.push(event);return event;
  };
  for(const entry of examined){
    const type=entry.metadata.type,usable=graph.assess(entry.path).usable;
    if(type==="session")add(entry,"session","recorded_on","Session record; its date does not establish when every described activity happened.");
    if(type==="review")add(entry,"review","generated_on","Saved generated review; generation date is not the date of the events described.");
    if(type==="review-event"){
      const record=entry.reviewManifestHash&&usable?readReviewEvent(entry.metadata):null;
      add(entry,"review-event","recorded_on",record?`Explicit snapshot ${record.action}${record.revisitOn?` until ${record.revisitOn}`:""}; no freshness or status change is implied.`:"Unsupported explicit review record; normalize it manually.","",record?record.recordedOn:null);
    }
    if(type==="milestone"){
      const supported=milestoneRecord(entry.metadata,today),title=usable&&supported?entry.chunks.find(c=>c.heading==="Milestone")?.excerpt.split(/\r?\n/)[0]?.slice(0,200):undefined;
      add(entry,"milestone","event_on (user-reported)",supported?`User-reported milestone${title?`: ${title}`:"; title not recognized"}.`:"Legacy or unsupported milestone; event chronology unknown.","Milestone",supported?calendarDay(entry.metadata.event_on):null);
    }
    if(type==="decision"){
      add(entry,"decision","decided_on",`Decision record; current status: ${String(entry.metadata.status??"not recorded").slice(0,100)}. This does not establish its status on the original date.`);
      if(!usable)continue;
      const sections=new Map<string,string>();
      for(const chunk of entry.chunks){
        if(!/^Evidence review [\u00b7-] \d{4}-\d{2}-\d{2}$/.test(chunk.heading))continue;
        if(sections.has(chunk.heading)){repeated++;continue;}sections.set(chunk.heading,chunk.excerpt);
      }
      for(const [heading,excerpt]of sections){
        const date=calendarDay(heading.slice(-10)),event=add(entry,"decision-review","recorded heading date","Recorded decision evidence review; repeated headings may combine events from the same day.",heading,date);
        const replacement=outsideFences(excerpt).map(line=>/^Replacement decision: \[Open replacement\]\(<([^>]+)>\)$/.exec(line)?.[1]).find(Boolean);
        if(replacement){
          let path="";try{path=decodeURIComponent(replacement);if(vaultPath(path)!==path)path="";}catch{path="";}
          const related=eligible.get(path);
          if(related&&related.metadata.type==="decision"&&readableText(path,settings)&&(!related.id||(graph.ids.get(related.id)?.length??0)===1))event.related={path,hash:related.hash};else hiddenLinks++;
        }
      }
    }
  }
  events.sort((a,b)=>(b.day??"").localeCompare(a.day??"")||a.path.localeCompare(b.path)||a.heading.localeCompare(b.heading)||a.kind.localeCompare(b.kind));
  return{events:events.slice(0,200),total:events.length,unknown:events.filter(e=>!e.day).length,records:records.length,examined:examined.length,limits:[
    "This is a chronology of recognized current records, not a complete historical event log. Earlier unsaved contents are never reconstructed. All statuses describe current note contents.",
    "At most 200 events from the 2000 most recently modified project records are shown, ordered by explicit record/event date (newest first), then path/heading. Unknown chronology sorts last; counts include omitted events.",
    "Only indexed sections are examined (currently the first 50000 body characters per note). Repeated dated headings combine entries; only the first indexed passage of each heading is inspected for a replacement link. Long reasons can hide later links.",
    "Replacement navigation opens a current note at the recorded path. Legacy links archive no replacement ID/hash, so they do not prove historical identity. Missing, excluded, ambiguous or stale replacements are hidden.",
    ...(hiddenLinks?[`${hiddenLinks} unavailable recorded replacement links are hidden without their paths.`]:[]),...(repeated?[`${repeated} repeated heading passages were combined; inspect the current source for complete recorded details.`]:[])]};
}
