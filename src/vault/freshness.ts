import { object } from "../settings/settings.ts";
import { readableText,vaultPath,type ReadScope } from "./scope.ts";
import { reviewProvenance } from "./review-provenance.ts";
import { mayReadPdf } from "../pdf/scope.ts";
import type { PdfRecord } from "../pdf/record.ts";
import { hasAnswerRecord, answerRecordProjection } from "./answer-record.ts";
import { hasConversationRecord, readConversationRecord, conversationReferences } from "./conversation-record.ts";

export interface PdfCitation{path:string;hash:string;page:number;}
export interface SourceReference{path:string;id?:string;heading:string;hash:string;noteHash:string;noteType?:string;noteStatus?:string;pdf?:PdfCitation;}
export interface OutputProvenance{refs:SourceReference[];invalid:boolean;title:string;}
export interface SourceRange{from:number;to:number;}
export interface FreshNote{path:string;id?:string;hash:string;metadata:Record<string,unknown>;output?:OutputProvenance;pdf?:PdfRecord;}
export type FreshState="current"|"renamed"|"changed"|"unavailable"|"ambiguous"|"invalid"|"dependency";
export interface ReferenceState{ref:SourceReference;state:FreshState;path?:string;hash?:string;reason:string;}
export interface Freshness{state:FreshState;usable:boolean;references:ReferenceState[];dependencies:Record<string,string>;reason:string;}
export type RenameMap=Record<string,string>;
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);

export function readSourceReferences(value:unknown,allowEmpty=false):SourceReference[]{
  const raw=typeof value==="string"?JSON.parse(value):value;
  if(!Array.isArray(raw)||(!raw.length&&!allowEmpty)||raw.length>100)throw new Error("Missing or oversized source provenance.");
  return raw.map(v=>{
    const r=object(v);if(typeof r.path!=="string"||r.path.length>4096||vaultPath(r.path)!==r.path||!digest(r.hash)||!digest(r.noteHash)||typeof r.heading!=="string"||r.heading.length>4000)throw new Error("Invalid source reference.");
    for(const key of ["id","noteType","noteStatus"] as const)if(r[key]!==undefined&&(typeof r[key]!=="string"||!r[key].trim()||r[key].length>200))throw new Error("Invalid source identity.");
    let pdf:PdfCitation|undefined;
    if(r.pdf!==undefined){const p=object(r.pdf);if(typeof p.path!=="string"||p.path.length>4096||vaultPath(p.path)!==p.path||!p.path.toLowerCase().endsWith(".pdf")||!digest(p.hash)||!Number.isInteger(p.page)||Number(p.page)<1||Number(p.page)>200||Object.keys(p).sort().join("|")!=="hash|page|path")throw new Error("Invalid PDF page citation.");pdf={path:p.path,hash:p.hash,page:Number(p.page)};}
    // Reference excerpts stay in authoritative Markdown, never the derived index metadata.
    return {path:r.path,heading:r.heading,hash:r.hash,noteHash:r.noteHash,...(pdf?{pdf}:{}),...(typeof r.id==="string"?{id:r.id}:{}),...(typeof r.noteType==="string"?{noteType:r.noteType}:{}),...(typeof r.noteStatus==="string"?{noteStatus:r.noteStatus}:{})};
  });
}

function sourceLines(text:string):{lines:string[];starts:number[]}{
  const lines=text.split(/\r?\n/),starts:number[]=[];let at=0;
  for(const line of lines){starts.push(at);at+=line.length+(text[at+line.length]==="\r"?2:text[at+line.length]==="\n"?1:0);}
  return {lines,starts};
}
const privateMarker=/<!--\s*(\/\s*)?thread\s*:\s*(question|review)-evidence/i;
function bodyStart(text:string):number{return /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text)?.[0].length??0;}
function privateMarkers(body:string):{kinds:Set<string>;malformed:boolean}{
  const kinds=new Set<string>();let malformed=false;
  for(const marker of body.matchAll(new RegExp(privateMarker.source,"gi"))){
    const kind=marker[2]!.toLowerCase(),at=marker.index!,canonical=`<!-- ${marker[1]?"/":""}thread:${kind}-evidence -->`,after=at+canonical.length;kinds.add(kind);
    if((at>0&&body[at-1]!=="\n")||!body.startsWith(canonical,at)||!(after===body.length||body[after]==="\n"||body[after]==="\r"&&body[after+1]==="\n"))malformed=true;
  }
  return{kinds,malformed};
}
function decisionUserText(text:string):{text:string;ranges:SourceRange[]}{
  let dropping=false;let fence="";const result:string[]=[],ranges:SourceRange[]=[];const {lines,starts}=sourceLines(text);
  for(const [i,line] of lines.entries()){
    const marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length))fence=fence?"":marker;
    if(!fence&&/^### Local model observations \(/.test(line)){dropping=true;continue;}
    if(!fence&&/^##\s/.test(line))dropping=false;
    if(!dropping){
      result.push(line);const from=starts[i]!,to=starts[i+1]??text.length,last=ranges.at(-1);
      if(last?.to===from)last.to=to;else if(to>from)ranges.push({from,to});
    }
  }
  return {text:result.join("\n"),ranges};
}

function privateRecordText(text:string,version:unknown,kind:"question"|"review",malformed:boolean):{text:string;ranges:SourceRange[];output?:OutputProvenance}{
  const {lines,starts}=sourceLines(text),kept:string[]=[],ranges:SourceRange[]=[];let dropping=false,blocks=0,invalid=version!=="1"||malformed;
  const bodyFrom=bodyStart(text);
  // These markers are reserved in managed records, including inside fences.
  // User-entered text escapes them; machine evidence must never become prose.
  for(const [i,line]of lines.entries()){
    if(starts[i]!<bodyFrom)continue;
    const marker=privateMarker.exec(line),sameKind=marker?.[2]?.toLowerCase()===kind;
    if(sameKind&&!marker![1]){
      if(dropping||line!==`<!-- thread:${kind}-evidence -->`)invalid=true;dropping=true;blocks++;continue;
    }
    if(sameKind&&marker![1]){
      if(!dropping||line!==`<!-- /thread:${kind}-evidence -->`)invalid=true;dropping=false;continue;
    }
    if(dropping)continue;
    kept.push(line);const from=starts[i]!,to=starts[i+1]??text.length,last=ranges.at(-1);
    if(last?.to===from)last.to=to;else if(to>from)ranges.push({from,to});
  }
  if(invalid||dropping||!blocks)return{text:"",ranges:[],output:{refs:[],invalid:true,title:`Unsupported managed ${kind} evidence blocks`}};
  return{text:kept.join("\n"),ranges};
}

export function outputProjection(text:string,metadata:Record<string,unknown>):{text:string;ranges:SourceRange[];output?:OutputProvenance}{
  const whole={text,ranges:[{from:0,to:text.length}]};
  if(metadata.thread_pdf_version!==undefined||metadata.thread_pdf!==undefined||/^[\t ]*(?:thread_pdf(?:_version)?|["']thread_pdf(?:_version)?["'])\s*:/im.test(text))return{text:"",ranges:[],output:{refs:[],invalid:true,title:"PDF extraction needs current-original verification before evidence reuse."}};
  if (hasConversationRecord(text, metadata)) {
    try {
      const record = readConversationRecord(text, metadata);
      return { text: "", ranges: [], output: { refs: conversationReferences(record), invalid: false, title: "Saved conversation; transcript is not reusable source evidence" } };
    } catch { return { text: "", ranges: [], output: { refs: [], invalid: true, title: "Unsupported or changed conversation record" } }; }
  }
  if (hasAnswerRecord(text, metadata)) {
    try {
      const refs = readSourceReferences(metadata.thread_sources);
      return { ...answerRecordProjection(text, metadata, refs), output: { refs, invalid: false, title: "Reviewed answer; user classifications are not independent verification" } };
    } catch { return { text: "", ranges: [], output: { refs: [], invalid: true, title: "Unsupported or changed reviewed answer record" } }; }
  }
  // Dispatch and line validation share recognition; only standalone canonical
  // markers are valid. Frontmatter is already private in managed records.
  const body=text.slice(bodyStart(text)),markers=privateMarkers(body),markerKinds=markers.kinds;
  const managedQuestion=metadata.thread_question_version!==undefined||/^[\t ]*(?:thread_question_version|["']thread_question_version["'])\s*:/im.test(text)
    ||markerKinds.has("question")||metadata.type==="question"&&metadata.thread_sources!==undefined;
  const managedReview=["thread_review_version","thread_review_key","thread_review_snapshot"].some(key=>metadata[key]!==undefined)
    ||/^[\t ]*(?:thread_review_(?:version|key|snapshot)|["']thread_review_(?:version|key|snapshot)["'])\s*:/im.test(text)||markerKinds.has("review");
  if(managedQuestion&&managedReview||(managedQuestion||managedReview)&&/<!--\s*(?:\/\s*)?thread\s*:\s*output/i.test(body)){
    return{text:"",ranges:[],output:{refs:[],invalid:true,title:"Conflicting managed record formats need manual normalization"}};
  }
  if(managedQuestion)return privateRecordText(text,metadata.type==="question"?metadata.thread_question_version:undefined,"question",markers.malformed);
  if(managedReview){
    try{reviewProvenance(text,metadata);return privateRecordText(text,metadata.type==="review-event"?metadata.thread_review_version:undefined,"review",markers.malformed);}
    catch{return{text:"",ranges:[],output:{refs:[],invalid:true,title:"Unsupported managed review record"}};}
  }
  if(metadata.type==="source")return whole;
  if(metadata.type==="decision")return decisionUserText(text);
  const generated=["answer","review","session","concept","comparison","briefing"].includes(String(metadata.type))&&(metadata.thread_sources!==undefined||metadata.thread_model!==undefined||metadata.generated_on!==undefined);
  const {lines,starts}=sourceLines(text);let fence="";let start=-1;let first=-1;let record="";let latest:{record:string;body:string;range:SourceRange}|undefined;let malformed=false;
  for(let i=0;i<lines.length;i++){
    const line=lines[i]!;const marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length))fence=fence?"":marker;
    if(fence)continue;
    if(line.startsWith("<!-- thread:output ")){
      if(start!==-1)malformed=true;
      const match=/^<!-- thread:output (.+) -->$/.exec(line);if(!match){malformed=true;continue;}
      if(first===-1)first=i;start=i;record=match[1]!;
    }else if(line==="<!-- /thread:output -->"){
      if(start===-1){malformed=true;continue;}latest={record,body:lines.slice(start+1,i).join("\n"),range:{from:starts[start+1]!,to:starts[i]!}};start=-1;
    }
  }
  if(start!==-1)malformed=true;
  if(!generated&&first===-1&&!malformed)return whole;
  try{
    if(malformed||text.length>1048576)throw new Error("Incomplete or oversized output provenance.");
    if(latest){
      const data=object(JSON.parse(latest.record));if(data.schemaVersion!==1||typeof data.title!=="string"||data.title.length>1000)throw new Error("Unknown synthesis record.");
      const refs=readSourceReferences(data.sources);
      // Use only the latest generated version. Human prefix is retained for pre-existing notes.
      const prefix=!generated?lines.slice(0,first).join("\n")+"\n":"";
      return {text:prefix+latest.body,ranges:[...(!generated&&starts[first]!>0?[{from:0,to:starts[first]!}]:[]),latest.range],output:{refs,invalid:false,title:data.title}};
    }
    return {...whole,output:{refs:readSourceReferences(metadata.thread_sources),invalid:false,title:""}};
  }catch{return {text:"",ranges:[],output:{refs:[],invalid:true,title:""}};}
}

export function loadRenames(value:unknown):RenameMap{
  const data=object(value);if(data.schemaVersion!==1)throw new Error("Unknown rename cache.");const result:RenameMap={};const entries=Object.entries(object(data.paths));if(entries.length>2000)throw new Error("Rename cache is oversized.");
  for(const [from,to]of entries){if(typeof to!=="string"||vaultPath(from)!==from||vaultPath(to)!==to)throw new Error("Invalid rename cache.");result[from]=to;}return result;
}
function movedPath(path:string,renames:RenameMap):string|null{
  let current=path;const visited=new Set<string>();
  for(let n=0;n<20;n++){
    if(visited.has(current))return null;visited.add(current);
    const from=Object.keys(renames).filter(p=>current===p||current.startsWith(p+"/")).sort((a,b)=>b.length-a.length)[0];
    if(!from)return current;current=renames[from]!+current.slice(from.length);
  }
  return null;
}

export class FreshnessGraph{
  notes:Map<string,FreshNote>;ids=new Map<string,FreshNote[]>();renames:RenameMap;scope:ReadScope;memo=new Map<string,Freshness>();scopeMemo=new Map<string,boolean>();
  identityComplete:boolean;
  binaries:ReadonlyMap<string,string>;
  constructor(entries:FreshNote[],scope:ReadScope,renames:RenameMap={},identityComplete=true,binaries:ReadonlyMap<string,string>=new Map()){
    this.identityComplete=identityComplete;
    this.scope=scope;this.renames=renames;this.notes=new Map(entries.filter(e=>readableText(e.path,scope)).map(e=>[e.path,e]));
    this.binaries=new Map([...binaries].filter(([path,hash])=>digest(hash)&&mayReadPdf(path,scope)));
    for(const [path,hash]of this.binaries)this.notes.set(path,{path,hash,metadata:{type:"pdf"}});
    for(const e of this.notes.values())if(e.id){const group=this.ids.get(e.id)??[];group.push(e);this.ids.set(e.id,group);}
  }
  resolve(ref:SourceReference):ReferenceState{
    let note:FreshNote|undefined;
    if(ref.id){
      if(!this.identityComplete)return{ref,state:"ambiguous",reason:"Index budgets omitted permitted files; stable-ID uniqueness cannot be established. Restore complete coverage before reuse."};
      const candidates=this.ids.get(ref.id)??[];if(candidates.length>1)return {ref,state:"ambiguous",reason:"Stable source ID is duplicated in allowed notes."};note=candidates[0];
    }else{
      const current=this.notes.get(ref.path);const path=movedPath(ref.path,this.renames);const moved=path?this.notes.get(path):undefined;
      if(!this.identityComplete&&path&&path!==ref.path&&!moved)return{ref,state:"ambiguous",reason:"Renamed-source coverage is incomplete. Restore index coverage before reuse."};
      if(current&&moved&&current.path!==moved.path&&current.hash===ref.noteHash&&moved.hash===ref.noteHash)return {ref,state:"ambiguous",reason:"Legacy path and renamed note both match; select the intended source explicitly."};
      note=current?.hash===ref.noteHash?current:moved??current;
    }
    if(!note||!(this.binaries.has(note.path)?mayReadPdf(note.path,this.scope):readableText(note.path,this.scope)))return {ref,state:"unavailable",reason:"Source is missing or unavailable in the current read scope. PDF originals require exact consent and a current bounded verification."};
    if(ref.pdf&&(!note.pdf||ref.pdf.path!==note.pdf.path||ref.pdf.hash!==note.pdf.hash||!note.pdf.pages.some(p=>p.page===ref.pdf!.page)||ref.heading!==`PDF page ${ref.pdf.page}`))return{ref,state:"invalid",reason:"PDF page mapping does not match its validated extraction."};
    const changed=note.hash!==ref.noteHash||(ref.noteType!==undefined&&note.metadata.type!==ref.noteType)||(ref.noteStatus!==undefined&&note.metadata.status!==ref.noteStatus);
    return {ref,state:changed?"changed":note.path!==ref.path?"renamed":"current",path:note.path,hash:note.hash,reason:changed?"Source note changed; this includes properties and edits outside the cited passage.":note.path!==ref.path?"Source moved; allowed identity and content still match.":"Source content and identity match."};
  }
  scopeAllows(path:string,hash:string,stack=new Set<string>()):boolean{
    const current=this.notes.has(path)?path:movedPath(path,this.renames);const note=current?this.notes.get(current):undefined;
    if(!digest(hash)||!note||note.hash!==hash||stack.has(note.path)||stack.size>=30)return false;
    // Repeated passages often reference the same generated note. Bound work per
    // snapshot and depth, while retaining cycle and maximum-depth checks above.
    const key=JSON.stringify([note.path,hash,stack.size]);const cached=this.scopeMemo.get(key);if(cached!==undefined)return cached;
    if(!note.output)return true;if(note.output.invalid)return false;
    const next=new Set(stack);next.add(note.path);
    const allowed=note.output.refs.every(ref=>{const source=this.resolve(ref);return !!source.path&&this.scopeAllows(source.path,ref.noteHash,next);});
    this.scopeMemo.set(key,allowed);return allowed;
  }
  assess(path:string,stack=new Set<string>()):Freshness{
    const result=(state:FreshState,reason:string,references:ReferenceState[]=[],dependencies:Record<string,string>={}):Freshness=>({state,usable:state==="current"||state==="renamed",reason,references,dependencies});
    const note=this.notes.get(path);if(!note)return result("unavailable","Note is outside current read scope or missing.");
    if(stack.has(path)||stack.size>=30)return result("invalid","Cyclic or overly deep output provenance cannot be validated.");
    const key=JSON.stringify([path,stack.size]);const cached=this.memo.get(key);if(cached)return cached;
    if(!note.output)return result("current","Original or user-authored record.");
    if(note.output.invalid)return result("invalid","Source provenance is invalid or incomplete. Choose explicit current sources for a new version.");
    const refs=note.output.refs.map(r=>this.resolve(r));const dependencies:Record<string,string>={};let state:FreshState=refs.some(r=>r.state==="renamed")?"renamed":"current";let reason="Supporting source notes match.";
    const next=new Set(stack);next.add(path);
    for(const ref of refs){
      if(!ref.path||!ref.hash||!(ref.state==="current"||ref.state==="renamed")){state=ref.state;reason=ref.reason;break;}
      dependencies[ref.path]=ref.hash;const child=this.assess(ref.path,next);
      if(!child.usable){state="dependency";reason=`A supporting generated note needs review: ${ref.path}.`;break;}
      Object.assign(dependencies,child.dependencies);if(child.state==="renamed"&&state==="current")state="renamed";
    }
    const assessed=result(state,reason,refs,dependencies);this.memo.set(key,assessed);return assessed;
  }
}
