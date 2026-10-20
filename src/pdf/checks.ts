import {PDF_LIMITS} from './record.ts';
/** One bounded operation; failures are cached only for this operation. */
export class PdfChecks {
 readonly hashes=new Map<string,string|null>();
 bytes=0;limited=0;
 async verify(path:string,size:()=>number|null,read:()=>Promise<{hash:string;bytes:ArrayBuffer}>,signal:AbortSignal):Promise<string|null>{
  signal.throwIfAborted();if(this.hashes.has(path))return this.hashes.get(path)!;
  const length=size();
  if(this.hashes.size>=10||length===null||!Number.isSafeInteger(length)||length<0||length>PDF_LIMITS.bytes||length>32*1048576-this.bytes){this.limited++;this.hashes.set(path,null);return null;}
  // Charge before the read; post-read growth is charged too and cannot publish.
  this.bytes+=length;this.hashes.set(path,null);
  try{const result=await read();signal.throwIfAborted();this.bytes+=Math.max(0,result.bytes.byteLength-length);if(this.bytes>32*1048576){this.limited++;return null;}this.hashes.set(path,result.hash);return result.hash;}
  catch(error){signal.throwIfAborted();if(error instanceof DOMException&&error.name==='AbortError')throw error;return null;}
 }
 get summary():string{return `PDF originals: ${[...this.hashes.values()].filter(Boolean).length} verified, ${[...this.hashes.values()].filter(v=>!v).length} unavailable or omitted; ${this.bytes} bytes read/reserved. Limit 10 distinct originals / 32 MiB per operation. Grant exact PDF access or explicitly re-extract changed originals; no automatic note updates.`;}
}
