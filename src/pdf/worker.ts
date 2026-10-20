import {pageText} from './text.ts';
import {getDocument,PDFWorker} from 'pdfjs-dist';
import {WorkerMessageHandler} from 'pdfjs-dist/build/pdf.worker.mjs';
import {PDF_LIMITS,type PdfExtraction} from './record.ts';
const owner=globalThis as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void;addEventListener:(kind:string,handler:(event:MessageEvent)=>void)=>void};
const refuse=()=>{throw Error('PDF extraction refuses network or nested workers.');};
Object.assign(globalThis,{fetch:async()=>refuse(),XMLHttpRequest:class{constructor(){refuse();}},WebSocket:class{constructor(){refuse();}},Worker:class{constructor(){refuse();}},importScripts:refuse});
console.warn=()=>{};console.error=()=>{};
let sequence=0,busy=false;const resources=new Map<number,{resolve:(data:Uint8Array)=>void;reject:(error:Error)=>void}>();
class LocalBinaryDataFactory {
 async fetch({kind,filename}:{kind:string;filename:string}):Promise<Uint8Array>{
  const prefix=kind==='cMapUrl'?'cmaps':kind==='standardFontDataUrl'?'standard_fonts':null;
  if(!prefix||!/^[A-Za-z0-9_.-]{1,100}$/.test(filename)||filename.startsWith('.'))throw Error('Unsupported local PDF resource.');
  const id=++sequence;return new Promise((resolve,reject)=>{resources.set(id,{resolve,reject});owner.postMessage({kind:'asset',id,path:`pdf-resources/${prefix}/${filename}`});});
 }
}
async function extract(bytes:ArrayBuffer):Promise<PdfExtraction>{
 const channel=new MessageChannel();channel.port1.start();channel.port2.start();WorkerMessageHandler.initializeFromPort(channel.port1);
 // PDF.js consumes a message port with the Worker messaging API; parsing remains inside this owned worker.
 const bridge=PDFWorker.create({port:channel.port2 as unknown as Worker}),task=getDocument({data:new Uint8Array(bytes),worker:bridge,verbosity:0,BinaryDataFactory:LocalBinaryDataFactory,cMapUrl:'local-cmaps/',standardFontDataUrl:'local-fonts/',useWorkerFetch:false,useSystemFonts:false,disableFontFace:true,useWasm:false,stopAtErrors:true,enableXfa:false,disableRange:true,disableStream:true,disableAutoFetch:true,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,maxImageSize:0});
 task.onPassword=()=>{void task.destroy();owner.postMessage({kind:'error',code:'encrypted'});};
 try{
  const doc=await task.promise;if(doc.numPages<1||doc.numPages>PDF_LIMITS.totalPages)throw Error('page-limit');const info=(await doc.getMetadata()).info;if(!info||typeof info!=='object'||!('EncryptFilterName'in info)||info.EncryptFilterName!==null)throw Error('encrypted');const pages:PdfExtraction['pages']=[];let chars=0;
  for(let number=1;number<=Math.min(doc.numPages,PDF_LIMITS.pages)&&chars<PDF_LIMITS.chars;number++){
   owner.postMessage({kind:'progress',page:number,totalPages:doc.numPages});const page=await doc.getPage(number),result=await pageText(page.streamTextContent({includeMarkedContent:false,disableNormalization:false}),Math.min(PDF_LIMITS.pageChars,PDF_LIMITS.chars-chars));page.cleanup();
   chars+=result.text.length;pages.push({page:number,...result});
  }
  if(!pages.some(page=>page.text.trim()))throw Error('no-text');return{totalPages:doc.numPages,pages};
 }finally{await task.destroy();bridge.destroy();channel.port1.close();channel.port2.close();}
}
owner.addEventListener('message',event=>{
 const data=event.data as {kind?:string;id?:number;bytes?:ArrayBuffer;ok?:boolean};
 if(data.kind==='asset-result'&&typeof data.id==='number'){
  const request=resources.get(data.id);if(!request)return;resources.delete(data.id);if(data.ok&&data.bytes instanceof ArrayBuffer)request.resolve(new Uint8Array(data.bytes));else request.reject(Error('Packaged PDF resource unavailable.'));return;
 }
 if(data.kind!=='extract'||busy||!(data.bytes instanceof ArrayBuffer))return;busy=true;
 if(data.bytes.byteLength>PDF_LIMITS.bytes){owner.postMessage({kind:'error',code:'size'});return;}
 void extract(data.bytes).then(result=>owner.postMessage({kind:'result',result})).catch(error=>owner.postMessage({kind:'error',code:error instanceof Error&&['page-limit','no-text','encrypted'].includes(error.message)?error.message:'unsupported'}));
});
