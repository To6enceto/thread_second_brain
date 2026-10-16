import { calendarDate } from "./decision.ts";
import { contentHash, vaultPath } from "./scope.ts";

export const queueKinds=["changed-source","decision-evidence","revisit-date","revisit-condition","open-question","stale-output"] as const;
export type QueueKind=typeof queueKinds[number];
export interface ReviewEvent { id:string; key:string; snapshot:string; action:"reviewed"|"snoozed"; recordedOn:string; revisitOn?:string; }
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
export function readReviewEvent(m:Record<string,unknown>):ReviewEvent|null {
  if(m.type!=="review-event"||m.thread_review_version!=="1"||typeof m.id!=="string"||!m.id.trim()||m.id.length>200||typeof m.project!=="string"||!m.project.trim()||m.project.length>4096
    ||!digest(m.thread_review_key)||!digest(m.thread_review_snapshot)||!["reviewed","snoozed"].includes(String(m.action))||typeof m.recorded_on!=="string"||!calendarDate(m.recorded_on)||typeof m.created!=="string"||!calendarDate(m.created))return null;
  if(m.action==="snoozed"&&(typeof m.revisit_on!=="string"||!calendarDate(m.revisit_on)||m.revisit_on<=m.recorded_on))return null;
  return{id:m.id,key:m.thread_review_key,snapshot:m.thread_review_snapshot,action:m.action as ReviewEvent["action"],recordedOn:m.recorded_on,...(m.action==="snoozed"?{revisitOn:m.revisit_on as string}:{})};
}
export function reviewProvenance(raw:string,metadata:Record<string,unknown>):{kind:QueueKind;target:string;hashes:Record<string,string>} {
  if(raw.length>1048576||!readReviewEvent(metadata))throw new Error("Unsupported review record.");
  const reason=/^## Reason\r?\n\r?\n([\s\S]*?)\r?\n\r?\n## Target and source snapshots\r?$/m.exec(raw)?.[1];
  if(!reason?.trim()||reason.length>10000)throw new Error("Missing or oversized review reason.");
  const blocks=[...raw.matchAll(/^<!-- thread:review-evidence -->\r?\n([\s\S]*?)^<!-- \/thread:review-evidence -->\r?$/gm)];
  if(blocks.length!==1)throw new Error("Unsupported review evidence blocks.");
  const match=/^Target: \[[^\r\n]*\]\(<([^>\r\n]+)>\)\r?\n\r?\n```json\r?\n([^\r\n]+)\r?\n```\r?\n?$/.exec(blocks[0]![1]!);
  if(!match)throw new Error("Missing review evidence schema.");
  const data:unknown=JSON.parse(match[2]!),target=decodeURIComponent(match[1]!);
  if(!data||typeof data!=="object"||Array.isArray(data)||Object.keys(data).sort().join(",")!=="hashes,kind,schemaVersion"||!("schemaVersion" in data)||data.schemaVersion!==1||!("kind" in data)||!queueKinds.includes(data.kind as QueueKind)||!("hashes" in data)||!data.hashes||typeof data.hashes!=="object"||Array.isArray(data.hashes))throw new Error("Unsupported review evidence schema.");
  const pairs=Object.entries(data.hashes);if(!pairs.length||pairs.length>200||target.length>4096||pairs.some(([path,hash])=>path.length>4096||vaultPath(path)!==path||!/\.(?:md|txt)$/i.test(path)||!digest(hash))||!Object.hasOwn(data.hashes,target))throw new Error("Invalid review source snapshots.");
  return{kind:data.kind as QueueKind,target,hashes:Object.fromEntries(pairs) as Record<string,string>};
}
export function reviewManifestHash(kind:QueueKind,target:string,hashes:Record<string,string>):Promise<string>{
  return contentHash(JSON.stringify([kind,target,Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b))]));
}
