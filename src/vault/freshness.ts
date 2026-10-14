import { object } from "../settings/settings.ts";
import { readableText,vaultPath,type ReadScope } from "./scope.ts";

export interface SourceReference{path:string;id?:string;heading:string;hash:string;noteHash:string;noteType?:string;noteStatus?:string;}
export interface OutputProvenance{refs:SourceReference[];invalid:boolean;title:string;}
export interface FreshNote{path:string;id?:string;hash:string;metadata:Record<string,unknown>;output?:OutputProvenance;}
export type FreshState="current"|"renamed"|"changed"|"unavailable"|"ambiguous"|"invalid"|"dependency";
export interface ReferenceState{ref:SourceReference;state:FreshState;path?:string;hash?:string;reason:string;}
export interface Freshness{state:FreshState;usable:boolean;references:ReferenceState[];dependencies:Record<string,string>;reason:string;}
export type RenameMap=Record<string,string>;
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);

function references(value:unknown):SourceReference[]{
  const raw=typeof value==="string"?JSON.parse(value):value;
  if(!Array.isArray(raw)||!raw.length||raw.length>100)throw new Error("Missing or oversized source provenance.");
  return raw.map(v=>{
    const r=object(v);if(typeof r.path!=="string"||r.path.length>4096||vaultPath(r.path)!==r.path||!digest(r.hash)||!digest(r.noteHash)||typeof r.heading!=="string"||r.heading.length>4000)throw new Error("Invalid source reference.");
    for(const key of ["id","noteType","noteStatus"] as const)if(r[key]!==undefined&&(typeof r[key]!=="string"||!r[key].trim()||r[key].length>200))throw new Error("Invalid source identity.");
    // Reference excerpts stay in authoritative Markdown, never the derived index metadata.
    return {path:r.path,heading:r.heading,hash:r.hash,noteHash:r.noteHash,...(typeof r.id==="string"?{id:r.id}:{}),...(typeof r.noteType==="string"?{noteType:r.noteType}:{}),...(typeof r.noteStatus==="string"?{noteStatus:r.noteStatus}:{})};
  });
}

function decisionUserText(text:string):string{
  let dropping=false;let fence="";const result:string[]=[];
  for(const line of text.split(/\r?\n/)){
    const marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length))fence=fence?"":marker;
    if(!fence&&/^### Local model observations \(/.test(line)){dropping=true;continue;}
    if(!fence&&/^##\s/.test(line))dropping=false;
    if(!dropping)result.push(line);
  }
  return result.join("\n");
}

export function outputProjection(text:string,metadata:Record<string,unknown>):{text:string;output?:OutputProvenance}{
  if(metadata.type==="source")return {text};
  if(metadata.type==="decision")return {text:decisionUserText(text)};
  const generated=["answer","review","session","concept","comparison","briefing"].includes(String(metadata.type))&&(metadata.thread_sources!==undefined||metadata.thread_model!==undefined||metadata.generated_on!==undefined);
  const lines=text.split(/\r?\n/);let fence="";let start=-1;let first=-1;let record="";let latest:{record:string;body:string}|undefined;let malformed=false;
  for(let i=0;i<lines.length;i++){
    const line=lines[i]!;const marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length))fence=fence?"":marker;
    if(fence)continue;
    if(line.startsWith("<!-- thread:output ")){
      if(start!==-1)malformed=true;
      const match=/^<!-- thread:output (.+) -->$/.exec(line);if(!match){malformed=true;continue;}
      if(first===-1)first=i;start=i;record=match[1]!;
    }else if(line==="<!-- /thread:output -->"){
      if(start===-1){malformed=true;continue;}latest={record,body:lines.slice(start+1,i).join("\n")};start=-1;
    }
  }
  if(start!==-1)malformed=true;
  if(!generated&&first===-1&&!malformed)return {text};
  try{
    if(malformed||text.length>1048576)throw new Error("Incomplete or oversized output provenance.");
    if(latest){
      const data=object(JSON.parse(latest.record));if(data.schemaVersion!==1||typeof data.title!=="string"||data.title.length>1000)throw new Error("Unknown synthesis record.");
      const refs=references(data.sources);
      // Use only the latest generated version. Human prefix is retained for pre-existing notes.
      const prefix=!generated?lines.slice(0,first).join("\n")+"\n":"";
      return {text:prefix+latest.body,output:{refs,invalid:false,title:data.title}};
    }
    return {text,output:{refs:references(metadata.thread_sources),invalid:false,title:""}};
  }catch{return {text:"",output:{refs:[],invalid:true,title:""}};}
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
  constructor(entries:FreshNote[],scope:ReadScope,renames:RenameMap={}){
    this.scope=scope;this.renames=renames;this.notes=new Map(entries.filter(e=>readableText(e.path,scope)).map(e=>[e.path,e]));
    for(const e of this.notes.values())if(e.id){const group=this.ids.get(e.id)??[];group.push(e);this.ids.set(e.id,group);}
  }
  resolve(ref:SourceReference):ReferenceState{
    let note:FreshNote|undefined;
    if(ref.id){
      const candidates=this.ids.get(ref.id)??[];if(candidates.length>1)return {ref,state:"ambiguous",reason:"Stable source ID is duplicated in allowed notes."};note=candidates[0];
    }else{
      const current=this.notes.get(ref.path);const path=movedPath(ref.path,this.renames);const moved=path?this.notes.get(path):undefined;
      if(current&&moved&&current.path!==moved.path&&current.hash===ref.noteHash&&moved.hash===ref.noteHash)return {ref,state:"ambiguous",reason:"Legacy path and renamed note both match; select the intended source explicitly."};
      note=current?.hash===ref.noteHash?current:moved??current;
    }
    if(!note||!readableText(note.path,this.scope))return {ref,state:"unavailable",reason:"Source is missing or unavailable in the current read scope."};
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
