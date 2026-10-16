import { buildEvidence,type EvidenceBundle } from "./evidence.ts";
import { contentHash,readableText,type ReadScope } from "./scope.ts";
import { tokens } from "../retrieval/tokens.ts";
import { localDay } from "./workspace.ts";
import { decisionMarkdown } from "./decision.ts";
import { questionMarkdown } from "./questions.ts";
import type { SourceRange } from "./freshness.ts";

export const MAX_SELECTION=4000;
export type SelectionAction="ask"|"related"|"question"|"decision";
export interface SelectionSnapshot {path:string;text:string;hash:string;from:number;to:number;}

export function selectionAvailable(path:string,scope:ReadScope,readSelection:()=>string):boolean{
  if(!readableText(path,scope))return false;
  const text=readSelection();return !!text.trim()&&text.length<=MAX_SELECTION;
}
export async function savedSelection(path:string,saved:string,editor:string,from:number,to:number,scope:ReadScope,eligible:readonly SourceRange[]):Promise<SelectionSnapshot>{
  if(!readableText(path,scope))throw new Error("Select text inside Thread's allowed read paths and outside exclusions.");
  if(saved!==editor&&saved.replace(/\r\n/g,"\n")!==editor)throw new Error("Save the note before using its selection as evidence.");
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<=from||to>editor.length)throw new Error("Select a nonempty saved passage again.");
  // Obsidian normalizes CRLF in the editor; provenance and hashes use saved bytes.
  if(saved!==editor){
    const rawOffset=(offset:number)=>{let removed=0;for(const match of saved.matchAll(/\r\n/g)){if(match.index-removed>=offset)break;removed++;}return offset+removed;};
    from=rawOffset(from);to=rawOffset(to);
  }
  const text=saved.slice(from,to);
  if(!text.trim()||text.length>MAX_SELECTION)throw new Error(`Select 1-${MAX_SELECTION} characters of saved text.`);
  if([from,to].some(at=>at>0&&/[\uD800-\uDBFF]/.test(saved[at-1]!)&&/[\uDC00-\uDFFF]/.test(saved[at]??"")))throw new Error("Select complete Unicode characters.");
  if(!eligible.some(range=>range.from<=from&&to<=range.to))throw new Error("Select current eligible body text; older synthesis and model-observation blocks cannot be reused.");
  return {path,text,from,to,hash:await contentHash(saved)};
}
export async function selectionEvidence(snapshot:SelectionSnapshot,metadata:Record<string,unknown>,modifiedAt:number):Promise<EvidenceBundle>{
  const identity=Object.fromEntries(["id","type","status","recorded_on","decided_on","updated","captured_on","created"].flatMap(key=>typeof metadata[key]==="string"?[[key,metadata[key]]]:[]));
  return buildEvidence([{path:snapshot.path,text:snapshot.text,metadata:identity,modifiedAt,fullHash:snapshot.hash}]);
}
export function selectionQuery(text:string):string{
  return [...new Set(tokens(text).filter(word=>word.length>1))].slice(0,12).join(" ").slice(0,1000);
}
export function selectionDraft(action:"question"|"decision",question:string,choice:string,reason:string,project:string,bundle:EvidenceBundle):string{
  if(!project||!question.trim()||question.length>1000)throw new Error("Choose a project and enter a question of up to 1000 characters.");
  if(action==="decision")return decisionMarkdown({question,choice,rationale:reason,alternatives:"",constraints:"",revisit:"",status:"proposed",date:localDay()},project,bundle);
  return questionMarkdown(question,project,bundle);
}
