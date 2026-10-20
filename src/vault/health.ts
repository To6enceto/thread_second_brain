import type { ThreadSettings } from "../settings/settings.ts";
import { LocalIndex, type IndexEntry } from "./index.ts";
import { readMetadata, noteSections } from "./evidence.ts";
import { outputProjection } from "./freshness.ts";
import { permittedProjects } from "./project-home.ts";
import { questionReviewReferences } from "./review-events.ts";
import { questionRecord } from "./questions.ts";
import { reviewProvenance } from "./review-provenance.ts";
import { calendarDay } from "./timeline.ts";
import { calendarDate } from "./decision.ts";
import { contentHash, isWithin, readableText } from "./scope.ts";

export const healthDateKeys=["created","updated","captured_on","recorded_on","decided_on","generated_on","revisit_on","event_on","thread_period_start","thread_period_end"] as const;
export type HealthKind="duplicate-id"|"invalid-date"|"references"|"project"|"heading"|"format";
export interface HealthIssue {kind:HealthKind;path:string;hash:string;message:string;effect:string;guidance:string;dateKey?:string;}
export interface HealthReport {issues:HealthIssue[];counts:Record<HealthKind,number>;available:number;examined:number;skipped:number;bytes:number;limits:string[];}
export interface HealthPort {read:(entry:IndexEntry,maxBytes:number)=>Promise<string|null>;resolve:(path:string,link:string)=>string|null;parse:(yaml:string)=>unknown;}
const maxFileBytes=1048576,maxScanBytes=8388608;
export function healthMetadata(raw:string,parse:HealthPort["parse"]):Record<string,unknown> {
  const header=/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if(!header){if(/^(?:\uFEFF)?---(?:\r?\n|$)/.test(raw))throw new Error("Incomplete frontmatter needs manual normalization.");return{};}
  let value:unknown;try{value=parse(header[1]!);}catch{throw new Error("Malformed frontmatter needs manual normalization.");}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Frontmatter needs manual normalization as an unambiguous property mapping.");
  return readMetadata(raw,()=>value);
}
function recognizedDate(key:string,value:unknown):boolean {
  if(calendarDay(value))return true;
  if(["revisit_on","event_on","thread_period_start","thread_period_end"].includes(key)||typeof value!=="string")return false;
  return calendarDate(value.slice(0,10))&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
}
export function recognizedHeadings(metadata:Record<string,unknown>):string[] {
  const type=metadata.type;
  if(type==="project")return["Objective","Goal"];
  if(type==="session")return["User-reported progress"];
  if(type==="questions")return["Open questions","Unresolved questions"];
  if(type==="question")return["Question"];
  if(type==="decision")return["Choice","Decision","Chosen option"];
  if(type==="milestone")return["Milestone"];
  if(type==="next-action")return["Chosen next action"];
  return[];
}
function headingMatches(type:unknown,actual:string,expected:string):boolean {
  if(expected==="Objective")return /^(?:project )?objectives?$/i.test(actual);
  if(expected==="Goal")return /^(?:project )?goals?$/i.test(actual);
  if(expected==="Open questions")return /^open questions?$/i.test(actual);
  if(expected==="Unresolved questions")return /^unresolved questions?$/i.test(actual);
  return type==="session"||type==="milestone"||type==="next-action"?actual===expected:actual.toLowerCase()===expected.toLowerCase();
}
export async function inspectVaultHealth(index:LocalIndex,settings:ThreadSettings,port:HealthPort,signal?:AbortSignal,progress:(done:number,total:number)=>void=()=>{}):Promise<HealthReport> {
  if(!index.ready)throw new Error("Index is updating. Refresh vault health.");
  const revision=index.revision,entries=index.entries,eligible=entries.filter(e=>readableText(e.path,settings)).sort((a,b)=>a.path.localeCompare(b.path)),graph=index.graph(settings),projects=permittedProjects(index,settings),projectIds=new Map<string,number>();
  for(const project of projects)for(const e of eligible.filter(e=>e.path.slice(0,e.path.lastIndexOf("/"))===project&&e.metadata.type==="project"&&e.id))projectIds.set(e.id!,1+(projectIds.get(e.id!)??0));
  const linked=new Set(eligible.filter(e=>projects.some(p=>isWithin(e.path,p))).flatMap(e=>e.links));
  const counts:HealthReport["counts"]={"duplicate-id":0,"invalid-date":0,references:0,project:0,heading:0,format:0},issues:HealthIssue[]=[];let examined=0,skipped=0,bytes=0;
  const current=()=>{signal?.throwIfAborted();if(!index.ready||revision!==index.revision||entries!==index.entries)throw new Error("Notes or permissions changed. Refresh vault health.");};
  const add=(entry:IndexEntry,kind:HealthKind,message:string,effect:string,guidance:string,dateKey?:string)=>{counts[kind]++;if(issues.length<200)issues.push({kind,path:entry.path,hash:entry.hash,message,effect,guidance,...(dateKey?{dateKey}:{})});};
  for(const entry of eligible.slice(0,500)){
    current();if(bytes>=maxScanBytes)break;await new Promise(resolve=>setTimeout(resolve,0));current();
    const raw=await port.read(entry,Math.min(maxFileBytes,maxScanBytes-bytes));current();
    if(raw===null){skipped++;progress(examined+skipped,Math.min(500,eligible.length));continue;}
    const size=new TextEncoder().encode(raw).length;if(size>maxFileBytes||bytes+size>maxScanBytes){skipped++;continue;}
    if(!readableText(entry.path,settings)||await contentHash(raw)!==entry.hash)throw new Error("A note changed while checking health. Refresh the scan.");current();bytes+=size;examined++;
    let metadata:Record<string,unknown>;
    try{metadata=healthMetadata(raw,port.parse);}catch{add(entry,"format","Frontmatter is malformed or unsupported.","Properties cannot be reliably interpreted; recorded context and chronology can be incomplete.","Preserve the note and normalize its frontmatter manually. No automatic migration is offered.");progress(examined+skipped,Math.min(500,eligible.length));continue;}
    if(metadata.id!==undefined&&(typeof metadata.id!=="string"||!metadata.id.trim()||metadata.id.length>200))add(entry,"format","The ID property is empty or unsupported.","Stable identity and rename resolution may be unavailable.","Inspect the original ID and links manually; Thread never reassigns identities.");
    if(entry.id&&(graph.ids.get(entry.id)?.length??0)>1)add(entry,"duplicate-id","This note shares its ID with other permitted notes.","Stable citations, project associations or source snapshots can be ambiguous.","Compare permitted duplicates manually and preserve their history. No ID is reassigned and excluded notes are not enumerated.");
    for(const key of healthDateKeys)if(metadata[key]!==undefined&&!recognizedDate(key,metadata[key]))add(entry,"invalid-date",`The ${key} property is not a supported calendar date.`,"Chronology, comparison baselines or due-date handling can be unavailable or misleading.","Enter the actual recorded date explicitly as YYYY-MM-DD. Do not infer it from modification time. Complex properties require manual editing.",key);
    if(metadata.selected_at!==undefined&&(typeof metadata.selected_at!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(metadata.selected_at)||!calendarDate(metadata.selected_at.slice(0,10))||!Number.isFinite(Date.parse(metadata.selected_at))||new Date(metadata.selected_at).toISOString()!==metadata.selected_at))add(entry,"invalid-date","The selected_at capture timestamp is unsupported.","The chosen next action may be indeterminate.","Preserve the selection and correct its actual capture timestamp manually; Thread never invents one.");
    const projection=outputProjection(raw,metadata);
    if(projection.output?.invalid)add(entry,"format","Managed evidence or generated provenance is unsupported.","Derived evidence is hidden until normalized; raw note contents remain unchanged.","Preserve private markers, versions and history. Review the format manually or create a new supported record.");
    let unavailable=0,unsupported=Boolean(entry.decisionSources?.invalid);
    for(const ref of [...entry.output?.refs??[],...entry.decisionSources?.refs??[]])if(!["current","renamed","changed"].includes(graph.resolve(ref).state))unavailable++;
    if(metadata.type==="question"&&metadata.thread_question_version!==undefined){try{for(const ref of questionReviewReferences(raw,port.parse))if(!["current","renamed","changed"].includes(graph.resolve(ref).state))unavailable++;}catch{unsupported=true;}}
    if(metadata.type==="review-event"){try{for(const path of Object.keys(reviewProvenance(raw,metadata).hashes))if(!readableText(path,settings)||!graph.notes.has(path))unavailable++;}catch{unsupported=true;}}
    for(const link of (entry.linkTexts??[]).slice(0,200)){const path=port.resolve(entry.path,link);if(!path||!readableText(path,settings)||!graph.notes.has(path))unavailable++;}
    if(unavailable||unsupported)add(entry,"references",`${unavailable} unavailable or ambiguous reference occurrences${unsupported?"; unsupported source-reference format":""}.`,"Source navigation, exact snapshots or freshness validation can be incomplete. Changed content alone is handled by Source freshness.","Inspect the original note and its currently permitted links manually. Missing and excluded targets are indistinguishable here; their paths and copied contents are hidden.");
    const associated=["session","decision","question","questions","review","review-event","milestone","next-action"].includes(String(metadata.type));
    if(metadata.project!==undefined&&(typeof metadata.project!=="string"||!metadata.project.trim()||!((projectIds.get(metadata.project)??0)===1||projects.includes(metadata.project))))add(entry,"project","The explicit project association is unavailable or ambiguous.","This record can be omitted from a project or associated ambiguously; containment and explicit links can still include it.","Choose the intended already permitted project and edit the association manually after checking its identity. Read grants stay unchanged.");
    else if(associated&&metadata.project===undefined&&!projects.some(p=>isWithin(entry.path,p))&&!linked.has(entry.path))add(entry,"project","No recognized project association is recorded.","This typed record may be absent from project-specific views.","Link it explicitly from an intended permitted project or add its verified project association manually. No association is inferred.");
    const expected=recognizedHeadings(metadata),sections=noteSections(projection.text);
    if(expected.length&&!projection.output?.invalid&&!expected.some(heading=>sections.some(s=>headingMatches(metadata.type,s.heading,heading)))&&!(expected.includes("Objective")&&[metadata.objective,metadata.goal].some(v=>typeof v==="string"&&v.trim())))add(entry,"heading","No nonempty recognized record heading was found within indexed coverage.",`Recorded-context parsing expects one of: ${expected.join(", ")}. Legacy prose is not inferred to have that meaning.`,"Inspect the note and explicitly rename one suitable heading, or normalize it manually. An empty or omitted section can also cause this diagnostic.");
    progress(examined+skipped,Math.min(500,eligible.length));
  }
  current();return{issues,counts,available:eligible.length,examined,skipped,bytes,limits:["Only currently permitted indexed Markdown/text notes are checked. At most 500 files in alphabetical path order, 1 MiB UTF-8 per file, 8 MiB cumulative text and 200 displayed diagnostics. Counts include detected diagnostics beyond the display limit; unexamined files are not certified healthy.","Reads are sequential and cancelable; oversized or budget-limited notes are skipped before reading when their stat size establishes the limit. Files can change after a snapshot, so refresh before acting.","References use recognized provenance plus at most 200 projected links per note. Unavailable/ambiguous references have redacted paths; no excluded target is read. Duplicate IDs and project resolution inspect only the current permitted index.","Heading checks use current indexed text coverage (section-balanced passages within the selected finite index profile), recognized record types and nonempty sections. Other structure, empty sections and omitted content can require manual inspection. No score or whole-vault compatibility claim is made.","Repairs are individual explicit date corrections or heading renames through existing exact change review. Protected sources, unsupported/stale records, ambiguous identities, complex properties, IDs and associations require manual guidance; no bulk migration or automatic cleanup runs."]};
}

function repairable(raw:string,parse:HealthPort["parse"]):Record<string,unknown> {
  const metadata=healthMetadata(raw,parse),versions:Record<string,string>={question:"thread_question_version","review-event":"thread_review_version",milestone:"thread_milestone_version","next-action":"thread_next_action_version"},key=versions[String(metadata.type)];
  if(outputProjection(raw,metadata).output?.invalid||key&&(metadata[key]!=="1"||typeof metadata.id!=="string"||!metadata.id.trim()||metadata.id.length>200||typeof metadata.project!=="string"||!metadata.project.trim()||metadata.project.length>4096)
    ||metadata.id!==undefined&&(typeof metadata.id!=="string"||!metadata.id.trim()||metadata.id.length>200))throw new Error("Unsupported managed records or identities need manual normalization. Preserve the original history.");
  if(metadata.type==="question")questionRecord(metadata);return metadata;
}
export function repairHealthDate(raw:string,key:string,value:string,parse:HealthPort["parse"]):string {
  if(!healthDateKeys.includes(key as typeof healthDateKeys[number])||!calendarDate(value))throw new Error("Choose an existing invalid date property and enter its actual YYYY-MM-DD date.");
  const metadata=repairable(raw,parse),old=metadata[key];if(typeof old!=="string"||recognizedDate(key,old))throw new Error("Only an existing invalid simple string date can be corrected here. Other properties need manual editing.");
  const header=/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);if(!header)throw new Error("Normalize frontmatter manually.");
  const lines=header[1]!.split(/\r?\n/),keys=lines.filter(line=>new RegExp(`^(?:${key}\\s*:|["']${key}["']\\s*:|<<\\s*:)`).test(line)),line=keys[0]??"",match=/^(\w+[ \t]*:[ \t]*)([^#]*?)([ \t]*(?:#.*)?)$/.exec(line);
  if(keys.length!==1||!match||![old,JSON.stringify(old),`'${old}'`].includes(match[2]!)||lines.some(l=>/^(?:\{|[ \t]*[^#\s][^:]*:[ \t]*[|>])/.test(l)))throw new Error("Ambiguous or complex frontmatter needs manual editing.");
  for(const following of lines.slice(lines.indexOf(line)+1)){if(!following.trim()||/^\s*#/.test(following))continue;if(/^\S/.test(following))break;throw new Error("Multiline properties need manual editing.");}
  const position=header[0].search(new RegExp(`^${key}[ \t]*:`,'m'));if(position<0)throw new Error("Quoted or complex property keys need manual editing.");
  const after=raw.slice(0,position)+match[1]+JSON.stringify(value)+match[3]+raw.slice(position+line.length),updated=healthMetadata(after,parse);
  if(JSON.stringify({...metadata,[key]:value})!==JSON.stringify(updated))throw new Error("The correction would affect other properties. Edit manually.");return after;
}
export interface HealthHeading {at:number;line:string;heading:string;}
export function healthHeadings(raw:string,metadata:Record<string,unknown>):HealthHeading[] {
  const projection=outputProjection(raw,metadata);if(projection.output?.invalid)return[];
  const bodyFrom=/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0].length??0,headings:HealthHeading[]=[];let fence="";
  for(const match of raw.matchAll(/[^\n]*(?:\n|$)/g)){
    const at=match.index!,full=match[0];if(!full||at<bodyFrom||!projection.ranges.some(range=>at>=range.from&&at+full.length<=range.to))continue;
    const line=full.replace(/\r?\n$/,""),marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length)){fence=fence?"":marker;continue;}
    const heading=!fence?/^#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)?.[1]:undefined;if(heading&&headings.length<200)headings.push({at,line,heading});
  }
  return headings;
}
export function repairHealthHeading(raw:string,at:number,value:string,parse:HealthPort["parse"]):string {
  const metadata=repairable(raw,parse);if(!recognizedHeadings(metadata).includes(value))throw new Error("Choose a recognized heading for this record; Thread cannot infer its meaning.");
  const target=healthHeadings(raw,metadata).find(h=>h.at===at);if(!target)throw new Error("The chosen heading is unavailable or private. Inspect the note manually.");
  const replacement=target.line.replace(/^(#{1,6}[ \t]+)(.+?)([ \t]+#+[ \t]*)?$/,(_,prefix:string,_title:string,tail:string|undefined)=>prefix+value+(tail??""));
  return raw.slice(0,at)+replacement+raw.slice(at+target.line.length);
}
