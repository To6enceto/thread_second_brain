import{test}from'node:test';
import assert from'node:assert/strict';
import{extractPdf,pdfInventory}from'./parser.ts';
import{binaryHash}from'./scope.ts';
import{PDF_PARSER}from'./record.ts';
const sample={schemaVersion:1,parser:PDF_PARSER,files:[{path:'pdf-extract-worker.js',bytes:6,hash:'a'.repeat(64)}]};
test('packaged asset inventory refuses traversal, duplicate/unbounded assets and parser/version mismatches',()=>{
 assert.equal(pdfInventory(sample).length,1);
 for(const value of [{...sample,schemaVersion:2},{...sample,parser:'other'}, {...sample,files:[...sample.files,...sample.files]},...['../secret','pdf-resources/cmaps/../../secret','pdf-resources/cmaps/.secret','Other/private.md'].map(path=>({...sample,files:[{...sample.files[0],path}]})),{...sample,files:[{...sample.files[0],bytes:20*1048576}]}])assert.throws(()=>pdfInventory(value));
});
test('PDF parser boundary verifies own assets, rejects malformed worker output and terminates on cancel/resources failure',async()=>{
 const NativeWorker=globalThis.Worker,create=URL.createObjectURL,revoke=URL.revokeObjectURL,source=new TextEncoder().encode('worker').buffer,hash=await binaryHash(source),inventory={...sample,files:[{path:'pdf-extract-worker.js',bytes:source.byteLength,hash}]};let mode='wait',created=0,terminated=0,revoked=0,workerStarted:()=>void=()=>{};const reads:string[]=[];
 class FakeWorker{onerror:((event:ErrorEvent)=>void)|null=null;onmessage:((event:MessageEvent)=>void)|null=null;constructor(){created++;workerStarted();}postMessage(){queueMicrotask(()=>{if(mode==='result')this.onmessage?.({data:{kind:'result',result:{totalPages:1,pages:[{page:2,text:'wrong page',shortened:false}]}}} as MessageEvent);if(mode==='resource')this.onmessage?.({data:{kind:'asset',id:1,path:'pdf-resources/cmaps/Missing.bcmap'}}as MessageEvent);});}terminate(){terminated++;}}
 Reflect.set(globalThis,'Worker',FakeWorker);URL.createObjectURL=()=> 'blob:synthetic-owned-worker';URL.revokeObjectURL=()=>{revoked++;};
 const read=async(path:string)=>{reads.push(path);return path==='pdf-assets.json'?new TextEncoder().encode(JSON.stringify(inventory)).buffer:source;},bytes=()=>new TextEncoder().encode('%PDF-1.4 authored').buffer;
 try{
  const aborted=new AbortController();aborted.abort();await assert.rejects(extractPdf(bytes(),read,aborted.signal),{name:'AbortError'});assert.deepEqual([...reads],[]);
  const corrupt=async(path:string)=>path==='pdf-assets.json'?new TextEncoder().encode(JSON.stringify(inventory)).buffer:new TextEncoder().encode('wrong!').buffer;await assert.rejects(extractPdf(bytes(),corrupt,new AbortController().signal),/resource changed/);assert.equal(created,0);
  mode='result';await assert.rejects(extractPdf(bytes(),read,new AbortController().signal),/page text|mapping/);assert.equal(terminated,1);assert.equal(revoked,1);
  mode='resource';await assert.rejects(extractPdf(bytes(),read,new AbortController().signal),/required packaged PDF resource/);assert.ok(!reads.includes('pdf-resources/cmaps/Missing.bcmap'));assert.equal(terminated,2);
  mode='wait';const controller=new AbortController(),begun=new Promise<void>(resolve=>workerStarted=resolve),pending=extractPdf(bytes(),read,controller.signal);await Promise.race([begun,pending]);controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(terminated,3);assert.equal(revoked,3);
 }finally{Reflect.set(globalThis,'Worker',NativeWorker);URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
