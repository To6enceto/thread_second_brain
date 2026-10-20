import {packagePath,packageKind,PACKAGE_LIMITS,uniquePackagePaths,type PackageEntry} from './format.ts';
import {isWithin,type ReadScope} from '../vault/scope.ts';
import type {DecodedPackage} from './decode.ts';
export interface ImportReceipt {id:string;packageHash:string;source:string;root:string;startedAt:string;status:'pending'|'complete'|'left';rootCreated:boolean;entries:{path:string;bytes:number;sha256:string}[];created:string[];inFlight:string|null;}
export interface ImportState {schemaVersion:1;receipts:ImportReceipt[];}
export const emptyImports=():ImportState=>({schemaVersion:1,receipts:[]});
function exact(v:unknown,keys:string):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==keys.split('|').sort().join('|'))throw Error('Invalid project import history. Preserve project-imports.json; restore a known good copy before importing.');return v as Record<string,unknown>;}
const validHash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function loadProjectImports(value:unknown):ImportState{
 const state=exact(value,'schemaVersion|receipts');if(state.schemaVersion!==1||!Array.isArray(state.receipts)||state.receipts.length>100)throw Error('Unsupported/full project import history.');const ids=new Set<string>();
 for(const v of state.receipts){const r=exact(v,'id|packageHash|source|root|startedAt|status|rootCreated|entries|created|inFlight');if(typeof r.id!=='string'||!r.id||r.id.length>100||ids.has(r.id)||!validHash(r.packageHash)||typeof r.source!=='string'||typeof r.root!=='string'||typeof r.startedAt!=='string'||!Number.isFinite(Date.parse(r.startedAt))||!['pending','complete','left'].includes(String(r.status))||typeof r.rootCreated!=='boolean'||!Array.isArray(r.entries)||!r.entries.length||r.entries.length>100||!Array.isArray(r.created))throw Error('Invalid project import receipt.');ids.add(r.id);packagePath(r.source);importRoot(r.root,{allowedPaths:[],excludedPaths:[]});const paths:string[]=[];
  let expanded=0;for(const v of r.entries){const e=exact(v,'path|bytes|sha256');if(typeof e.path!=='string'||!isWithin(e.path,r.root)||e.path===r.root||!Number.isSafeInteger(e.bytes)||Number(e.bytes)<0||Number(e.bytes)>16*1048576||!validHash(e.sha256))throw Error('Invalid import destination snapshot.');const kind=packageKind(e.path);if(Number(e.bytes)>(kind==='pdf'?PACKAGE_LIMITS.pdfBytes:PACKAGE_LIMITS.textBytes))throw Error('Invalid import file budget.');expanded+=Number(e.bytes);paths.push(e.path);}if(expanded>PACKAGE_LIMITS.expandedBytes)throw Error('Invalid import expanded budget.');uniquePackagePaths(paths);
  if(r.created.length>100||new Set(r.created).size!==r.created.length||r.created.some(p=>!paths.includes(String(p)))||r.inFlight!==null&&(typeof r.inFlight!=='string'||!paths.includes(r.inFlight)||r.created.includes(r.inFlight))||!r.rootCreated&&(r.created.length>0||r.inFlight!==null)||r.status==='complete'&&(r.created.length!==paths.length||r.inFlight!==null))throw Error('Invalid import progress receipt.');
 }
 return structuredClone(value) as ImportState;
}
/** A top-level root makes ownership/collision boundaries visible and unambiguous. */
export function importRoot(root:string,scope:ReadScope&{pdfPaths?:string[]}):string{
 packagePath(root);if(root.includes('/')||[...scope.allowedPaths,...scope.excludedPaths,...scope.pdfPaths??[]].some(p=>isWithin(root,p)||isWithin(p,root)))throw Error('Choose a new top-level folder outside all text/PDF grants and exclusions.');return root;
}
export function importEntries(decoded:DecodedPackage,root:string):ImportReceipt['entries']{return decoded.package.manifest.entries.map(e=>({path:packagePath(root+'/'+e.path),bytes:e.bytes,sha256:e.sha256}));}
export interface ImportPort {current:()=>boolean;check:(root:string,entries:ImportReceipt['entries'])=>void;kind:(path:string)=>'file'|'folder'|null;hash:(path:string)=>Promise<string>;persist:(state:ImportState)=>Promise<void>;folder:(path:string)=>Promise<void>;create:(path:string,bytes:Uint8Array)=>Promise<void>;}
export async function inspectImport(receipt:ImportReceipt,port:ImportPort):Promise<string[]>{
 const check=()=>{if(!port.current())throw Error('Import preview changed. Validate and preview again.');port.check(receipt.root,receipt.entries);};check();const adopted:string[]=[];
 if(!receipt.rootCreated){if(port.kind(receipt.root))throw Error('Import root already exists. Choose a new folder.');}
 else if(port.kind(receipt.root)!=='folder')throw Error('Partial import folder is missing or changed. Preserve remaining files and close recovery.');
 for(const e of receipt.entries){check();const kind=port.kind(e.path);if(receipt.created.includes(e.path)||receipt.inFlight===e.path&&kind==='file'){if(kind!=='file'||await port.hash(e.path)!==e.sha256)throw Error('An imported or uncertain file changed. It will not be overwritten. Keep partial files and close recovery, or restore its exact bytes yourself.');if(!receipt.created.includes(e.path))adopted.push(e.path);}
  else if(kind)throw Error('A destination already exists. No existing file will be overwritten.');
  const parts=e.path.split('/');for(let i=1;i<parts.length;i++)if(port.kind(parts.slice(0,i).join('/'))==='file')throw Error('A file blocks a destination folder.');
 }check();return adopted;
}
export function newImport(decoded:DecodedPackage,source:string,root:string):ImportReceipt{return{id:crypto.randomUUID(),packageHash:decoded.hash,source,root,startedAt:new Date().toISOString(),status:'pending',rootCreated:false,entries:importEntries(decoded,root),created:[],inFlight:null};}
/** Caller owns one app-wide lease and keeps the persisted state synchronized. */
export async function applyImport(state:ImportState,receipt:ImportReceipt,decoded:DecodedPackage,adopted:string[],port:ImportPort):Promise<void>{
 if(receipt.status!=='pending'||receipt.packageHash!==decoded.hash||JSON.stringify(receipt.entries)!==JSON.stringify(importEntries(decoded,receipt.root)))throw Error('Recovery package or destinations differ from the reviewed snapshot.');
 const check=()=>{if(!port.current())throw Error('Import canceled or preview changed. Partial files are preserved; validate recovery before continuing.');port.check(receipt.root,receipt.entries);};check();
 const actual=await inspectImport(receipt,port);if(JSON.stringify(actual)!==JSON.stringify(adopted))throw Error('Recovery contents changed. Build a new preview.');check();
 if(!state.receipts.some(r=>r===receipt)){if(state.receipts.length>=100||state.receipts.some(r=>r.status==='pending'))throw Error('Import history is full or has pending recovery. Resolve recovery first; preserve the journal.');state.receipts.push(receipt);}await port.persist(state);check();
 if(!receipt.rootCreated){if(port.kind(receipt.root))throw Error('Import root appeared concurrently.');await port.folder(receipt.root);receipt.rootCreated=true;await port.persist(state);check();}
 for(const path of adopted){if(!receipt.created.includes(path))receipt.created.push(path);}receipt.inFlight=null;await port.persist(state);check();
 for(let i=0;i<receipt.entries.length;i++){
  const entry=receipt.entries[i]!;if(receipt.created.includes(entry.path))continue;check();if(port.kind(entry.path))throw Error('A destination appeared concurrently. Existing files are preserved.');
  const parts=entry.path.split('/');for(let n=2;n<parts.length;n++){check();const path=parts.slice(0,n).join('/'),kind=port.kind(path);if(kind==='file')throw Error('A file blocks an import folder.');if(!kind)await port.folder(path);}
  check();if(port.kind(entry.path))throw Error('A destination appeared concurrently.');receipt.inFlight=entry.path;await port.persist(state);check();if(port.kind(entry.path))throw Error('An uncertain destination appeared. Preview recovery before continuing.');
  await port.create(entry.path,decoded.payloads[i]!);check();if(await port.hash(entry.path)!==entry.sha256)throw Error('Written file verification failed. Preserve partial files and inspect recovery.');check();receipt.created.push(entry.path);receipt.inFlight=null;await port.persist(state);
 }
 await inspectImport(receipt,port);check();receipt.status='complete';await port.persist(state);
}
export function identityWarnings(entries:PackageEntry[],existing:{id:string;path:string}[]):string[]{const byId=new Map<string,string[]>();for(const e of entries)if(e.identity.id)byId.set(e.identity.id,[...byId.get(e.identity.id)??[],e.path]);return[...byId].flatMap(([id,paths])=>paths.length>1||existing.some(e=>e.id===id)?[`ID ${id}: ${paths.join(', ')}${existing.some(e=>e.id===id)?' also exists in the current permitted index':''}. Preserved; ambiguous IDs are not safe citations.`]:[]);}
