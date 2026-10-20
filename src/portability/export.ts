import {readSourceReferences,type SourceReference} from '../vault/freshness.ts';
import {questionReviewReferences} from '../vault/review-events.ts';
import {reviewProvenance} from '../vault/review-provenance.ts';
import {readMetadata} from '../vault/evidence.ts';
import {object} from '../settings/settings.ts';
import {contentHash,readableText} from '../vault/scope.ts';
import {mayReadPdf} from '../pdf/scope.ts';
import type {ThreadSettings} from '../settings/settings.ts';
import type {LocalIndex,IndexEntry} from '../vault/index.ts';
import {PACKAGE_LIMITS,packagePath,packageKind,uniquePackagePaths,encodePayload,byteHash,serializePackage,type PackageEntry,type ProjectPackage} from './format.ts';
export interface ExportCandidate {path:string;kind:'text'|'pdf';hash:string;}
export interface ExportInventory {candidates:ExportCandidate[];unavailable:number;candidateLimit:number;}
export interface ExportPreview {text:string;package:ProjectPackage;hashes:Record<string,string>;settings:string;revision:number;}
export interface ExportPort {size:(path:string)=>number|null;readText:(path:string)=>Promise<string>;readPdf:(path:string,signal:AbortSignal)=>Promise<{hash:string;bytes:ArrayBuffer}>;parse:(yaml:string)=>unknown;resolve:(path:string,link:string)=>string|null;current:()=>boolean;}
export function exportInventory(index:LocalIndex,settings:ThreadSettings):ExportInventory{
 if(!index.ready||!settings.selectedProject)throw Error('Select a permitted project and wait for the index before exporting.');
 const records=index.projectRecords(settings,settings.selectedProject),graph=index.graph(settings),candidates:ExportCandidate[]=[];let unavailable=0;
 for(const entry of records){if(!graph.assess(entry.path).usable||entry.decisionSources?.invalid||entry.id&&!index.idUnambiguous(entry.id)){unavailable++;continue;}try{packagePath(entry.path);}catch{unavailable++;continue;}candidates.push({path:entry.path,hash:entry.hash,kind:'text'});}
 const paths=new Set(candidates.flatMap(c=>{const entry=records.find(e=>e.path===c.path);return entry?.pdf?[entry.pdf.path]:[];}));
 for(const path of paths)if(mayReadPdf(path,settings)&&index.binaries.has(path)){try{packagePath(path);candidates.push({path,hash:index.binaries.get(path)!,kind:'pdf'});}catch{unavailable++;}}
 candidates.sort((a,b)=>a.path.localeCompare(b.path));return{candidates:candidates.slice(0,100),unavailable,candidateLimit:Math.max(0,candidates.length-100)};
}
function privateReferences(raw:string,metadata:Record<string,unknown>,entry:IndexEntry,parse:ExportPort['parse']):{refs:SourceReference[];hashes:Record<string,string>}{
 const refs=[...entry.output?.refs??[]];let hashes:Record<string,string>={};
 // Export retains all raw history, unlike the latest-only AI projection.
 let inside=false,blocks=0;
 for(const line of raw.split(/\r?\n/)){
  if(!/<!--\s*(?:\/\s*)?thread\s*:\s*output/i.test(line))continue;
  if(line==='<!-- /thread:output -->'){if(!inside)throw Error('Unmatched synthesis history marker.');inside=false;continue;}
  const match=/^<!-- thread:output (.+) -->$/.exec(line);
  if(!match||inside||++blocks>100)throw Error('Unsupported retained synthesis history.');
  const record=object(JSON.parse(match[1]!));
  if(record.schemaVersion!==1||Object.keys(record).sort().join('|')!=='generated_on|id|model|project|schemaVersion|sources|title'||typeof record.id!=='string'||typeof record.generated_on!=='string'||typeof record.model!=='string'||typeof record.project!=='string'||typeof record.title!=='string'||record.title.length>1000)throw Error('Unsupported synthesis history version.');
  refs.push(...readSourceReferences(record.sources));if(refs.length>2000)throw Error('Retained history exceeds the 2000-reference export budget.');inside=true;
 }
 if(inside)throw Error('Incomplete retained synthesis history.');
 // Older decision observations stored links but no complete source snapshots.
 // Preserve them locally; exporting them cannot establish current permission.
 if(metadata.type==='decision'&&/^#{1,6}\s+Local model observations\b/im.test(raw))throw Error('Unverifiable appended decision-observation history.');
 if(metadata.thread_sources!==undefined)refs.push(...readSourceReferences(metadata.thread_sources,true));
 else if(/^[\t ]*(?:thread_sources|["']thread_sources["'])\s*:/im.test(raw))throw Error('Unrecognized copied source provenance.');
 if(metadata.type==='question'&&metadata.thread_question_version!==undefined)refs.push(...questionReviewReferences(raw,parse));
 if(metadata.type==='review-event')hashes=reviewProvenance(raw,metadata).hashes;
 return{refs,hashes};
}
/** Whole-note omission avoids exporting copied private evidence whose sources are unavailable. */
export async function buildProjectExport(index:LocalIndex,settings:ThreadSettings,projectId:string,selected:string[],port:ExportPort,signal:AbortSignal):Promise<ExportPreview>{
 const revision=index.revision,settingsText=JSON.stringify(settings),inventory=exportInventory(index,settings),graph=index.graph(settings),chosen=new Set(selected),hashes:Record<string,string>={},entries:PackageEntry[]=[],payloads:string[]=[];let expanded=0,unavailable=inventory.unavailable,pdfBytes=0,pdfFiles=0;
 const assertCurrent=()=>{signal.throwIfAborted();if(!port.current()||!index.ready||index.revision!==revision)throw Error('Export sources or permissions changed. Build a new preview.');};assertCurrent();
 if(!chosen.size||chosen.size>100||[...chosen].some(path=>!inventory.candidates.some(c=>c.path===path)))throw Error('Choose 1-100 current files from the export inventory.');
 packagePath(settings.selectedProject);if(!projectId||projectId.length>4096)throw Error('Project identity is unavailable.');
 for(const candidate of inventory.candidates.filter(c=>chosen.has(c.path))){
  assertCurrent();await new Promise(resolve=>setTimeout(resolve,0));assertCurrent();const kind=packageKind(candidate.path);let bytes:Uint8Array,identity:PackageEntry['identity']={id:null,type:null,project:null},references:Record<string,string>={},links:string[]=[];
  const size=port.size(candidate.path);if(size===null||!Number.isSafeInteger(size)||size<0||size>(kind==='pdf'?PACKAGE_LIMITS.pdfBytes:PACKAGE_LIMITS.textBytes)||expanded+size>PACKAGE_LIMITS.expandedBytes||kind==='pdf'&&pdfBytes+size>32*1048576)throw Error('Selected export exceeds available file size or package byte budgets. Select fewer files.');
  if(candidate.kind==='pdf'){
   if(!mayReadPdf(candidate.path,settings)||++pdfFiles>10)throw Error('PDF export requires exact consent and at most10 originals per operation.');
   const original=await port.readPdf(candidate.path,signal);assertCurrent();pdfBytes+=original.bytes.byteLength;if(pdfBytes>32*1048576||original.hash!==candidate.hash)throw Error('PDF original changed or exceeds the 32 MiB operation budget. Build a new export preview.');bytes=new Uint8Array(original.bytes);
  }else{
   if(!readableText(candidate.path,settings))throw Error('Export source is outside read scope.');const entry=index.entries.find(e=>e.path===candidate.path)!;
   const raw=await port.readText(candidate.path);assertCurrent();if(await contentHash(raw)!==candidate.hash)throw Error('Export source changed. Rebuild and preview again.');
   const metadata=readMetadata(raw,port.parse);let privateData:ReturnType<typeof privateReferences>;
   try{privateData=privateReferences(raw,metadata,entry,port.parse);}catch{unavailable++;continue;}
   let eligible=true;
   for(const ref of privateData.refs){const resolved=graph.resolve(ref);if(!resolved.path||!['current','renamed'].includes(resolved.state)||!graph.scopeAllows(resolved.path,ref.noteHash)){eligible=false;break;}references[resolved.path]=ref.noteHash;Object.assign(references,graph.assess(resolved.path).dependencies);}
   for(const [path,hash]of Object.entries(privateData.hashes)){if(!graph.scopeAllows(path,hash)){eligible=false;break;}references[path]=hash;Object.assign(references,graph.assess(path).dependencies);}
   Object.assign(references,graph.assess(entry.path).dependencies);
   if(!eligible||Object.keys(references).length>200){unavailable++;continue;}
   identity={id:typeof metadata.id==='string'?metadata.id:null,type:typeof metadata.type==='string'?metadata.type:null,project:typeof metadata.project==='string'?metadata.project:null};
   if((identity.id?.length??0)>200||(identity.type?.length??0)>100||(identity.project?.length??0)>4096){unavailable++;continue;}
   if(identity.project&&identity.project!==projectId&&identity.project!==settings.selectedProject&&!index.entries.some(e=>e.metadata.type==='project'&&graph.assess(e.path).usable&&(e.id===identity.project||e.path.slice(0,e.path.lastIndexOf('/'))===identity.project)))identity.project=null;
   links=[...new Set((entry.linkTexts??[]).flatMap(link=>{const path=port.resolve(entry.path,link);return path&&graph.notes.has(path)&&graph.assess(path).usable?[path]:[];}))].slice(0,200);bytes=new TextEncoder().encode(raw);
  }
  if(bytes.length>(kind==='pdf'?PACKAGE_LIMITS.pdfBytes:PACKAGE_LIMITS.textBytes)||expanded+bytes.length>PACKAGE_LIMITS.expandedBytes)throw Error('Export exceeds a file or 32 MiB expanded package budget. Select fewer files.');
  // References and links are metadata too: never emit an unsafe or hidden path.
  try{for(const path of [...links,...Object.keys(references)])packagePath(path);}catch{unavailable++;continue;}
  const hash=await byteHash(bytes);assertCurrent();if(hash!==candidate.hash)throw Error('Export byte hash differs from the selected snapshot.');
  expanded+=bytes.length;hashes[candidate.path]=hash;Object.assign(hashes,references);entries.push({path:candidate.path,kind,bytes:bytes.length,sha256:hash,identity,links,references:Object.entries(references).map(([path,hash])=>({path,hash}))});payloads.push(encodePayload(bytes));
 }
 if(!entries.length)throw Error('No selected notes/files have current permitted provenance. Review sources and preview again.');if(!entries.some(e=>e.kind!=='pdf'))throw Error('Select at least one current project text note.');uniquePackagePaths(entries.map(e=>e.path));
 const value:ProjectPackage={format:'thread-project',schemaVersion:1,manifest:{id:crypto.randomUUID(),createdAt:new Date().toISOString(),project:{path:settings.selectedProject,id:projectId,title:settings.selectedProject.split('/').at(-1)!.slice(0,100)},entries,omissions:{unavailable,unselected:inventory.candidates.length-chosen.size,candidateLimit:inventory.candidateLimit}},payloads};
 assertCurrent();return{text:serializePackage(value),package:value,hashes,settings:settingsText,revision};
}
