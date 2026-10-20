import {PDF_LIMITS,PDF_PARSER,validateExtraction,type PdfExtraction} from './record.ts';
import {binaryHash} from './scope.ts';
import {object} from '../settings/settings.ts';
export interface PdfAsset {path:string;bytes:number;hash:string;}
export function pdfInventory(value:unknown):PdfAsset[]{
 const raw=object(value);if(raw.schemaVersion!==1||raw.parser!==PDF_PARSER||!Array.isArray(raw.files)||!raw.files.length||raw.files.length>300)throw Error('Local PDF asset inventory is unavailable. Reinstall the complete verified Thread package.');
 const paths=new Set<string>();let bytes=0;const files=raw.files.map(value=>{const file=object(value);if(typeof file.path!=='string'||!(file.path==='pdf-extract-worker.js'||/^pdf-resources\/(?:cmaps|standard_fonts)\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/.test(file.path)||file.path==='pdf-resources/pdfjs-LICENSE.txt')||paths.has(file.path)||!Number.isSafeInteger(file.bytes)||Number(file.bytes)<1||Number(file.bytes)>12*1048576||typeof file.hash!=='string'||!/^[a-f0-9]{64}$/.test(file.hash))throw Error('Invalid local PDF assets. Reinstall the complete verified Thread package.');paths.add(file.path);bytes+=Number(file.bytes);return{path:file.path,bytes:Number(file.bytes),hash:file.hash};});
 if(!paths.has('pdf-extract-worker.js')||bytes>16*1048576)throw Error('Local PDF assets exceed supported bounds.');return files;
}
const messages:Record<string,string>={encrypted:'Encrypted/password-protected PDFs are unsupported. Use an unlocked local copy you are allowed to read.',size:'PDF exceeds the 16 MiB input limit.', 'page-limit':'PDF exceeds the 200-page document limit. Select a smaller document.', 'no-text':'No selectable text was found in examined pages. Image-only PDFs require OCR, which Thread does not provide.',unsupported:'PDF text extraction failed. The file may be malformed, unsupported or missing a required local resource. Original PDF is unchanged.'};
export async function extractPdf(bytes:ArrayBuffer,readAsset:(path:string)=>Promise<ArrayBuffer>,signal:AbortSignal,progress:(page:number,total:number)=>void=()=>{}):Promise<PdfExtraction>{
 signal.throwIfAborted();if(bytes.byteLength>PDF_LIMITS.bytes)throw Error(messages.size);if(new TextDecoder('ascii').decode(bytes.slice(0,1024)).indexOf('%PDF-')<0)throw Error('Not a supported PDF file.');
 const controller=new AbortController();const abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});let worker:Worker|null=null,url='',assetRequests=0,assetBytes=0;
 const deadline=setTimeout(()=>controller.abort(new Error('PDF extraction reached the 30-second local deadline. Select a smaller document.')),PDF_LIMITS.timeoutMs);
 const active=()=>controller.signal.throwIfAborted();
 try{
  const manifestBytes=await readAsset('pdf-assets.json');active();if(manifestBytes.byteLength>200000)throw Error('PDF asset inventory is oversized.');const inventory=new Map(pdfInventory(JSON.parse(new TextDecoder().decode(manifestBytes))).map(file=>[file.path,file]));
  const load=async(path:string)=>{active();const item=inventory.get(path);if(!item)throw Error('Required PDF resource is not packaged.');const data=await readAsset(path);active();if(data.byteLength!==item.bytes||await binaryHash(data)!==item.hash)throw Error('Packaged PDF resource changed. Reinstall the complete verified Thread package.');active();return data;};
  const source=await load('pdf-extract-worker.js');active();url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);const owned=worker;
  return await new Promise<PdfExtraction>((resolve,reject)=>{
   const canceled=()=>reject(controller.signal.reason instanceof Error?controller.signal.reason:new DOMException('PDF extraction canceled.','AbortError'));controller.signal.addEventListener('abort',canceled,{once:true});
   owned.onerror=event=>{event.preventDefault();reject(Error('The local PDF worker failed. Reinstall the complete verified Thread package or choose a supported smaller PDF.'));};
   owned.onmessage=event=>{if(controller.signal.aborted)return;const data=object(event.data);
    if(data.kind==='progress'&&Number.isInteger(data.page)&&Number.isInteger(data.totalPages))progress(Number(data.page),Number(data.totalPages));
    else if(data.kind==='result'){try{resolve(validateExtraction(data.result));}catch(error){reject(error);}}
    else if(data.kind==='error')reject(Error(messages[String(data.code)]??messages.unsupported));
    else if(data.kind==='asset'&&Number.isSafeInteger(data.id)&&typeof data.path==='string'){
     const path=data.path;if(!/^pdf-resources\/(?:cmaps|standard_fonts)\//.test(path)||++assetRequests>200){reject(Error('PDF requested unsupported local resources.'));return;}
     void load(path).then(bytes=>{assetBytes+=bytes.byteLength;if(assetBytes>8*1048576)throw Error('PDF local-resource budget exceeded.');if(!controller.signal.aborted)owned.postMessage({kind:'asset-result',id:data.id,ok:true,bytes},[bytes]);}).catch(()=>reject(Error('A required packaged PDF resource is unavailable, changed or over budget. Reinstall the complete verified Thread package.')));
    }
   };owned.postMessage({kind:'extract',bytes},[bytes]);
  });
 }finally{clearTimeout(deadline);signal.removeEventListener('abort',abort);worker?.terminate();if(url)URL.revokeObjectURL(url);}
}
