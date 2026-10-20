import {readMetadata} from '../vault/evidence.ts';
import {PACKAGE_LIMITS,packagePath,packageKind,uniquePackagePaths,byteHash,encodePayload,type ProjectPackage} from './format.ts';
export interface DecodedPackage {package:ProjectPackage;payloads:Uint8Array[];hash:string;}
function record(v:unknown,keys:string):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==keys.split('|').sort().join('|'))throw Error('Unsupported package fields or structure.');return v as Record<string,unknown>;}
function string(v:unknown,max:number):string{if(typeof v!=='string'||!v.length||v.length>max||/[\u0000-\u001f]/.test(v))throw Error('Invalid package text metadata.');return v;}
function integer(v:unknown,max:number):number{if(!Number.isSafeInteger(v)||Number(v)<0||Number(v)>max)throw Error('Package count or byte budget exceeded.');return Number(v);}
const hash=(v:unknown)=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))throw Error('Invalid SHA-256 digest.');return v;};
/** All payloads are inert bytes; no URLs, document parsers or Markdown rendering. */
export async function decodeProjectPackage(bytes:Uint8Array,parse:(yaml:string)=>unknown,current:()=>boolean=()=>true):Promise<DecodedPackage>{
 const check=()=>{if(!current())throw Error('Package validation canceled or changed.');};check();
 if(bytes.length>PACKAGE_LIMITS.serializedBytes)throw Error('Package exceeds the48 MiB serialized limit.');
 const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),top=record(JSON.parse(raw),'format|schemaVersion|manifest|payloads');
 if(top.format!=='thread-project'||top.schemaVersion!==1)throw Error('Only uncompressed Thread project schema version1 is supported.');
 const manifest=record(top.manifest,'id|createdAt|project|entries|omissions');
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(string(manifest.id,36)))throw Error('Invalid package identity.');
 const date=string(manifest.createdAt,30);if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString()!==date)throw Error('Invalid package creation date.');
 const project=record(manifest.project,'path|id|title');packagePath(string(project.path,1024));string(project.id,4096);string(project.title,1000);
 const omissions=record(manifest.omissions,'unavailable|unselected|candidateLimit');for(const value of Object.values(omissions))integer(value,Number.MAX_SAFE_INTEGER);
 if(!Array.isArray(manifest.entries)||!manifest.entries.length||manifest.entries.length>100||!Array.isArray(top.payloads)||top.payloads.length!==manifest.entries.length)throw Error('Choose a package with1-100 files and matching payloads.');
 let declared=0;const declaredPaths:string[]=[];for(const value of manifest.entries){const e=record(value,'path|kind|bytes|sha256|identity|links|references'),path=packagePath(string(e.path,1024)),kind=packageKind(path);declaredPaths.push(path);if(e.kind!==kind)throw Error('File type and extension disagree.');declared+=integer(e.bytes,kind==='pdf'?PACKAGE_LIMITS.pdfBytes:PACKAGE_LIMITS.textBytes);}if(declared>PACKAGE_LIMITS.expandedBytes)throw Error('Package exceeds the32 MiB expanded limit.');uniquePackagePaths(declaredPaths);
 let expanded=0;const paths:string[]=[],payloads:Uint8Array[]=[];
 for(let i=0;i<manifest.entries.length;i++){
  check();await new Promise(resolve=>setTimeout(resolve,0));check();const entry=record(manifest.entries[i],'path|kind|bytes|sha256|identity|links|references');
  const path=packagePath(string(entry.path,1024)),kind=packageKind(path);if(kind!==entry.kind)throw Error('File type and extension disagree.');paths.push(path);
  const size=integer(entry.bytes,kind==='pdf'?PACKAGE_LIMITS.pdfBytes:PACKAGE_LIMITS.textBytes);expanded+=size;if(expanded>PACKAGE_LIMITS.expandedBytes)throw Error('Package exceeds the32 MiB expanded limit.');hash(entry.sha256);
  const identity=record(entry.identity,'id|type|project');for(const [key,value]of Object.entries(identity))if(value!==null&&(typeof value!=='string'||value.length>(key==='id'?200:key==='type'?100:4096)))throw Error('Invalid package identity metadata.');
  if(!Array.isArray(entry.links)||entry.links.length>200||!Array.isArray(entry.references)||entry.references.length>200)throw Error('Package link/provenance budget exceeded.');
  for(const link of entry.links)packagePath(string(link,1024));for(const value of entry.references){const ref=record(value,'path|hash');packagePath(string(ref.path,1024));hash(ref.hash);}
  const encoded=top.payloads[i];if(typeof encoded!=='string'||encoded.length!==4*Math.ceil(size/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Invalid or oversized canonical base64 payload.');
  const data=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(data.length!==size||encodePayload(data)!==encoded||await byteHash(data)!==entry.sha256)throw Error('Payload length or hash mismatch.');check();
  if(kind==='pdf'){if(size<5||new TextDecoder().decode(data.subarray(0,5))!=='%PDF-'||Object.values(identity).some(v=>v!==null)||entry.links.length||entry.references.length)throw Error('Unsupported PDF payload metadata or signature.');}
  else{const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(data);const metadata=readMetadata(text.replace(/^\uFEFF/,''),parse);for(const key of ['id','type'] as const)if((typeof metadata[key]==='string'?metadata[key]:null)!==identity[key])throw Error('Manifest identity disagrees with actual note properties.');if(identity.project!==null&&metadata.project!==identity.project)throw Error('Manifest project association disagrees with note properties.');}
  payloads.push(data);
 }
 uniquePackagePaths(paths);check();return{package:top as unknown as ProjectPackage,payloads,hash:await byteHash(bytes)};
}
