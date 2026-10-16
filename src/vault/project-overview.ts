import type { ThreadSettings } from "../settings/settings.ts";
import { object } from "../settings/settings.ts";
import { escapeMarkdown } from "../intelligence/answer.ts";
import type { ChangeProposal } from "./changes.ts";
import { LocalIndex, type IndexEntry } from "./index.ts";
import { permittedProjects } from "./project-home.ts";
import { disposedReviewQueue, type QuestionReferenceReader } from "./review-events.ts";
import { type QueueKind } from "./review-queue.ts";
import { calendarDay, projectTimeline, type TimelineEvent } from "./timeline.ts";
import { readableText } from "./scope.ts";
import { frontmatter, localDay } from "./workspace.ts";

export const projectStatuses=["active","paused","archived","unknown"] as const;
export type ProjectStatus=typeof projectStatuses[number];
export interface ProjectIdentity {id:string|null;hashes:Record<string,string>;reason:string;}
export interface ChosenAction {path:string;hash:string;selectedAt:string;excerpt:string;}
export interface ProjectCard {
  path:string;status:ProjectStatus;identity:ProjectIdentity;records:number;
  activity:TimelineEvent|null;questions:number|null;due:number|null;reviews:Partial<Record<QueueKind,number>>;
  proposal:number;chosen:ChosenAction|null;limits:string[];
}
export interface ProjectsOverview {cards:ProjectCard[];permitted:number;matching:number;limits:string[];}

export function overviewIdentity(index:LocalIndex,settings:ThreadSettings,path:string):ProjectIdentity {
  const graph=index.graph(settings),headers=index.projectEntries(settings,null).filter(e=>e.path.slice(0,e.path.lastIndexOf("/"))===path&&e.metadata.type==="project"),ids=new Set(headers.flatMap(e=>e.id?[e.id]:[]));
  const hashes=Object.fromEntries(headers.map(e=>[e.path,e.hash]));
  if(ids.size>1||headers.some(e=>e.id&&(graph.ids.get(e.id)?.length??0)!==1))return{id:null,hashes,reason:"Project IDs are conflicting or duplicated in permitted notes. Resolve them manually before choosing an action; associated record counts are unavailable."};
  return{id:[...ids][0]??path,hashes,reason:""};
}
function statusOf(entries:IndexEntry[]):ProjectStatus {
  const values=new Set(entries.map(e=>e.metadata.status));
  if(!entries.length||values.size!==1)return "unknown";
  const value=[...values][0];return projectStatuses.slice(0,3).includes(value as ProjectStatus)?value as ProjectStatus:"unknown";
}
function timestamp(value:unknown):value is string {
  return typeof value==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
}
export function nextActionMarkdown(project:string,action:string,now=new Date()):string {
  if(!project.trim()||project.length>4096||!action.trim()||action.length>1000||!Number.isFinite(now.getTime()))throw new Error("Enter your chosen next action (1-1000 characters) for a valid project.");
  return frontmatter({id:crypto.randomUUID(),type:"next-action",thread_next_action_version:"1",project,selected_at:now.toISOString(),recorded_on:localDay(now),created:localDay(now)})
    +`# Explicit next-action selection\n\nThis is a user choice, not completed work, a priority score or an accepted decision. Prior selections remain in their original notes.\n\n## Chosen next action\n\n${escapeMarkdown(action.trim())}\n`;
}
function chosenAction(entries:IndexEntry[],index:LocalIndex,settings:ThreadSettings,projectId:string,now:Date):{chosen:ChosenAction|null;limit:string} {
  const graph=index.graph(settings),actions=entries.filter(e=>e.metadata.type==="next-action");
  const valid=actions.filter(e=>e.metadata.thread_next_action_version==="1"&&e.id&&e.id.length<=200&&(graph.ids.get(e.id)?.length??0)===1&&graph.assess(e.path).usable
    &&e.metadata.project===projectId&&timestamp(e.metadata.selected_at)&&e.metadata.selected_at<=now.toISOString()
    &&calendarDay(e.metadata.recorded_on)&&calendarDay(e.metadata.created)&&calendarDay(e.metadata.recorded_on)!<=localDay(now)&&calendarDay(e.metadata.created)!<=localDay(now)
    &&e.chunks.some(c=>c.heading==="Chosen next action"&&c.excerpt.trim()));
  if(valid.length!==actions.length)return{chosen:null,limit:"Chosen action is indeterminate: unsupported, stale, ambiguous or invalid selection records exist. Inspect them manually; older choices are not silently substituted."};
  valid.sort((a,b)=>String(b.metadata.selected_at).localeCompare(String(a.metadata.selected_at))||a.path.localeCompare(b.path));
  if(valid[0]&&valid[1]?.metadata.selected_at===valid[0].metadata.selected_at)return{chosen:null,limit:"Chosen action is indeterminate: multiple selections have the same capture timestamp. Inspect them manually."};
  const entry=valid[0];return{chosen:entry?{path:entry.path,hash:entry.hash,selectedAt:String(entry.metadata.selected_at),excerpt:entry.chunks.find(c=>c.heading==="Chosen next action")!.excerpt.slice(0,600)}:null,limit:"Chosen action uses the latest explicit selected_at capture timestamp among current permitted project selections, never file modification time. Only the first 600 indexed characters of the choice are shown."};
}
function visibleProposal(pending:ChangeProposal|null,project:string,settings:ThreadSettings):number {
  if(!pending)return 0;
  try{
    const context=object(JSON.parse(pending.context)),hashes=object(context.noteHashes);
    if(object(context.settings).selectedProject!==project||!Object.keys(hashes).length||!Object.keys(hashes).every(path=>readableText(path,settings))||!pending.operations.every(op=>readableText(op.path,settings)))return 0;
    return 1;
  }catch{return 0;}
}
export async function multiProjectOverview(index:LocalIndex,settings:ThreadSettings,readQuestion:QuestionReferenceReader,pending:ChangeProposal|null=null,filter:ProjectStatus|"all"="all",signal?:AbortSignal,now=new Date()):Promise<ProjectsOverview> {
  if(!index.ready)throw new Error("Project index is updating. Refresh the overview.");
  if(!["all",...projectStatuses].includes(filter)||!Number.isFinite(now.getTime()))throw new Error("Invalid overview filter or date.");
  const revision=index.revision,entries=index.entries,paths=permittedProjects(index,settings),eligible=index.projectEntries(settings,null);
  const projects=paths.map(path=>({path,status:statusOf(eligible.filter(e=>e.path.slice(0,e.path.lastIndexOf("/"))===path&&e.metadata.type==="project"))})),matching=projects.filter(p=>filter==="all"||p.status===filter),cards:ProjectCard[]=[];
  for(const project of matching.slice(0,20)){
    signal?.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,0));
    if(!index.ready||revision!==index.revision||entries!==index.entries)throw new Error("Project records changed. Refresh the overview.");
    const scope={...settings,selectedProject:project.path},identity=overviewIdentity(index,scope,project.path),records=index.projectRecords(scope,project.path),limits:string[]=[];
    const card:ProjectCard={...project,identity,records:records.length,activity:null,questions:null,due:null,reviews:{},proposal:visibleProposal(pending,project.path,settings),chosen:null,limits};
    if(!identity.id)limits.push(identity.reason);
    else if(records.length>2000)limits.push("This project exceeds the 2000-record overview budget. Detail counts, chronology and chosen action are unavailable here; open the project workflows to inspect it.");
    else{
      const timeline=projectTimeline(index,scope,localDay(now));card.activity=timeline.events.find(e=>e.day!==null)??null;
      const queue=await disposedReviewQueue(index,scope,readQuestion,localDay(now),signal);card.questions=queue.candidateCounts["open-question"]??0;card.due=queue.counts["revisit-date"];card.reviews=queue.counts;
      const choice=chosenAction(records,index,scope,identity.id,now);card.chosen=choice.chosen;limits.push(choice.limit,...queue.limits.slice(2));
      limits.push("Activity is the latest recognized recorded event date, including reviews/milestones; it does not establish when all described work happened. Unknown chronology is not replaced by file modification time.");
    }
    cards.push(card);
  }
  signal?.throwIfAborted();if(!index.ready||revision!==index.revision||entries!==index.entries)throw new Error("Project records changed. Refresh the overview.");
  return{cards,permitted:paths.length,matching:matching.length,limits:["Only already permitted, usable project discovery records are considered. Missing/conflicting status is unknown; filters never change statuses or grants.","Project folders sort alphabetically with no inferred priority or health score. At most 20 matching projects and 2000 project records per card are summarized on each explicit refresh.","Questions count recorded open-question candidate lines before review acknowledgement, not inferred unresolved tasks. Due counts include only unhandled revisit-date candidates among the first 200 candidates per category; omitted candidates can remain. Review conditions require judgment.","Proposal counts indicate visible recorded proposals only, including stale proposals. They do not certify that a proposal can be applied; inspect its current exact preview. No draft text is copied into this overview.","This on-demand indexed snapshot has no model, scheduler or automatic note changes. Content beyond the current index coverage and unrecognized legacy structure can be missing."]};
}
