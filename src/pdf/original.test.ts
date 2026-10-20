import{test}from'node:test';
import assert from'node:assert/strict';
import{readPdfOriginal}from'./original.ts';
import{defaultSettings}from'../settings/settings.ts';
test('binary reader requires exact consent/scope and finite stat before any original read',async()=>{
 const path='Sources/a.pdf',scope={...defaultSettings(),allowedPaths:['Sources'],pdfPaths:[path]},file={path,stat:{size:10}},bytes=new TextEncoder().encode('%PDF-1.4 test').buffer;let reads=0;const port={get:()=>file,read:async()=>{reads++;return bytes;}};
 for(const settings of[{...scope,pdfPaths:[]},{...scope,allowedPaths:[]},{...scope,excludedPaths:['Sources']}])await assert.rejects(readPdfOriginal(path,settings,port,()=>true,new AbortController().signal),/consent or scope/);assert.equal(reads,0);file.stat.size=16*1048576+1;await assert.rejects(readPdfOriginal(path,scope,port,()=>true,new AbortController().signal),/16 MiB/);assert.equal(reads,0);file.stat.size=10;
 const result=await readPdfOriginal(path,scope,port,()=>true,new AbortController().signal);assert.equal(result.bytes,bytes);assert.match(result.hash,/^[a-f0-9]{64}$/);assert.equal(reads,1);
});
test('binary read aborts after held-read consent, object identity, path or size changes without publishing a snapshot',async()=>{
 const path='Sources/a.pdf',scope={...defaultSettings(),allowedPaths:['Sources'],pdfPaths:[path]};
 for(const kind of['consent','replace','move','oversize','abort']){
  const file={path,stat:{size:10}};let current=true,selected=file,release:(data:ArrayBuffer)=>void=()=>{},started:()=>void=()=>{};const begun=new Promise<void>(r=>started=r),controller=new AbortController(),pending=readPdfOriginal(path,scope,{get:()=>selected,read:()=>{started();return new Promise<ArrayBuffer>(r=>release=r);}},()=>current,controller.signal);await begun;
  if(kind==='consent')current=false;if(kind==='replace')selected={...file};if(kind==='move')file.path='Sources/moved.pdf';if(kind==='abort')controller.abort();release(kind==='oversize'?new ArrayBuffer(16*1048576+1):new TextEncoder().encode('%PDF-1.4 test').buffer);await assert.rejects(pending,kind==='abort'?{name:'AbortError'}:/changed|moved|replaced|16 MiB/);
 }
});
