import {vaultPath} from '../vault/scope.ts';
import {binaryHash} from '../pdf/scope.ts';
export const PACKAGE_LIMITS=Object.freeze({entries:100,textBytes:2*1048576,pdfBytes:16*1048576,expandedBytes:32*1048576,serializedBytes:48*1048576,paths:1024});
export type PackageKind='markdown'|'text'|'pdf';
export interface PackageEntry {path:string;kind:PackageKind;bytes:number;sha256:string;identity:{id:string|null;type:string|null;project:string|null};links:string[];references:{path:string;hash:string}[];}
export interface ProjectPackage {format:'thread-project';schemaVersion:1;manifest:{id:string;createdAt:string;project:{path:string;id:string;title:string};entries:PackageEntry[];omissions:{unavailable:number;unselected:number;candidateLimit:number}};payloads:string[];}
/** Reject names that collide or change meaning on common desktop filesystems. */
export function packagePath(value:string):string{
 if(value.length>PACKAGE_LIMITS.paths||vaultPath(value)!==value||value!==value.normalize('NFC')||/[\\<>:"|?*\u007f]/.test(value)||/[\uD800-\uDFFF]/u.test(value))throw Error('Package paths must be normalized portable visible vault-relative paths.');
 if(value.split('/').some(part=>part.length>255||/[. ]$/.test(part)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw Error('A package path uses a reserved or nonportable filename.');return value;
}
export function packageKind(path:string):PackageKind{packagePath(path);if(/\.md$/i.test(path))return'markdown';if(/\.txt$/i.test(path))return'text';if(/\.pdf$/i.test(path))return'pdf';throw Error('Only Markdown, plain text and explicitly approved PDF files belong in project packages.');}
export function uniquePackagePaths(paths:string[]):void{
 const seen=new Set<string>(),folders=new Set<string>(),aliases=new Map<string,string>();
 for(const path of paths){const key=packagePath(path).toLowerCase();if(seen.has(key)||folders.has(key))throw Error('Package paths collide by case or file/folder identity.');const parts=path.split('/');for(let i=1;i<=parts.length;i++){const original=parts.slice(0,i).join('/'),parent=original.toLowerCase(),alias=aliases.get(parent);if(alias&&alias!==original)throw Error('Package folder names collide by case.');aliases.set(parent,original);if(i<parts.length){if(seen.has(parent))throw Error('A package file blocks a parent folder.');folders.add(parent);}}seen.add(key);}
}
export function encodePayload(bytes:Uint8Array):string{let raw='';for(let start=0;start<bytes.length;start+=16384)raw+=String.fromCharCode(...bytes.subarray(start,start+16384));return btoa(raw);}
export function byteHash(bytes:Uint8Array):Promise<string>{return binaryHash(Uint8Array.from(bytes).buffer);}
export function serializePackage(value:ProjectPackage):string{const text=JSON.stringify(value,null,2)+'\n';if(new TextEncoder().encode(text).length>PACKAGE_LIMITS.serializedBytes)throw Error('Package exceeds the 48 MiB serialized limit. Select fewer files.');return text;}
