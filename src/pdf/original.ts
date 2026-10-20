import{PDF_LIMITS}from'./record.ts';
import{binaryHash,mayReadPdf,type PdfScope}from'./scope.ts';
export interface PdfFile {path:string;stat:{size:number};}
export async function readPdfOriginal<F extends PdfFile>(path:string,scope:PdfScope,port:{get:(path:string)=>F|null;read:(file:F)=>Promise<ArrayBuffer>},current:()=>boolean,signal:AbortSignal):Promise<{hash:string;bytes:ArrayBuffer}>{
 const allowed=()=>{signal.throwIfAborted();if(!current()||!mayReadPdf(path,scope))throw Error('PDF consent or scope changed. Select the current PDF and grant access explicitly.');};allowed();const file=port.get(path);if(!file||file.path!==path)throw Error('The selected PDF is missing. Add/select an existing local vault PDF.');
 if(!Number.isSafeInteger(file.stat.size)||file.stat.size<0||file.stat.size>PDF_LIMITS.bytes)throw Error('PDF exceeds the 16 MiB input limit or has unavailable size metadata.');
 const bytes=await port.read(file);allowed();if(file.path!==path||port.get(path)!==file)throw Error('PDF moved or was replaced during reading. Select it again.');if(bytes.byteLength>PDF_LIMITS.bytes)throw Error('PDF exceeds the 16 MiB input limit.');const hash=await binaryHash(bytes);allowed();if(file.path!==path||port.get(path)!==file)throw Error('PDF moved or was replaced during hashing.');return{hash,bytes};
}
