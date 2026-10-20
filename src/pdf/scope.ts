import {mayRead,vaultPath,type ReadScope} from '../vault/scope.ts';
export interface PdfScope extends ReadScope {pdfPaths:string[];}
export function pdfPath(value:unknown):string{
 if(typeof value!=='string'||value.length>4096||vaultPath(value)!==value||!/\.pdf$/i.test(value))throw Error('Choose an exact visible vault-relative PDF path.');return value;
}
export function pdfPaths(value:unknown):string[]{
 if(!Array.isArray(value)||value.length>100)return[];
 try{return [...new Set(value.map(pdfPath))];}catch{return[];}
}
export function mayReadPdf(path:string,scope:ReadScope&{pdfPaths?:string[]}):boolean{
 try{return pdfPath(path)===path&&Array.isArray(scope.pdfPaths)&&scope.pdfPaths.includes(path)&&mayRead(path,scope);}catch{return false;}
}
export async function binaryHash(bytes:ArrayBuffer):Promise<string>{
 const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
