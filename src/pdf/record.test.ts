import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pdfSource,readPdfSource,validateExtraction,PDF_LIMITS} from './record.ts';
import {binaryHash,mayReadPdf,pdfPaths} from './scope.ts';
import {loadSettings,defaultSettings} from '../settings/settings.ts';
import {indexNote,LocalIndex} from '../vault/index.ts';
import {outputProjection} from '../vault/freshness.ts';
const metadata=(text:string)=>Object.fromEntries(text.split('\n').slice(1,text.split('\n').indexOf('---',1)).map(line=>{const at=line.indexOf(':');return[line.slice(0,at),JSON.parse(line.slice(at+1).trim())];}));
const sample={totalPages:3,pages:[{page:1,text:'First page\n## Untrusted heading\n<!-- thread:question-evidence -->\n[Remote](https://example.invalid)\n`\\#_<>',shortened:false},{page:2,text:'',shortened:false},{page:3,text:'Final page 🧠\n',shortened:true}]};
test('exact PDF consent requires ordinary scope plus separate grant, and invalid settings fail closed compatibly',()=>{
 const old=loadSettings({schemaVersion:1,allowedPaths:['Sources']});assert.deepEqual(old.pdfPaths,[]);assert.equal(mayReadPdf('Sources/a.pdf',old),false);
 const settings=loadSettings({...old,pdfPaths:['Sources/a.pdf']});assert.equal(mayReadPdf('Sources/a.pdf',settings),true);assert.equal(mayReadPdf('Sources/b.pdf',settings),false);assert.equal(mayReadPdf('Other/a.pdf',{...settings,pdfPaths:['Other/a.pdf']}),false);assert.equal(mayReadPdf('Sources/a.pdf',{...settings,excludedPaths:['Sources']}),false);
 for(const input of [['Sources/a.pdf','../bad.pdf'],['Sources/a.pdf','Sources/a.pdf '],Array(101).fill('Sources/a.pdf')])assert.deepEqual(pdfPaths(input),[]);
 assert.deepEqual(loadSettings({...settings,excludedPaths:['../invalid']}).pdfPaths,[]);assert.deepEqual(loadSettings({...settings,excludedPaths:'bad'}).allowedPaths,[]);assert.equal(defaultSettings().schemaVersion,1);
});
test('canonical quoted extraction round trips exact untrusted page text, page order and binary SHA256 without indexing unchecked evidence',async()=>{
 const hash=await binaryHash(new TextEncoder().encode('%PDF authored bytes').buffer),raw=await pdfSource(sample,'Sources/a.pdf',hash),meta=metadata(raw),parsed=await readPdfSource(raw,meta);assert.deepEqual(parsed.extraction,sample);assert.equal(parsed.record.path,'Sources/a.pdf');assert.equal(parsed.record.hash,hash);assert.equal(parsed.record.pages[2]!.page,3);assert.ok(raw.includes('> \\#\\# Untrusted heading'));assert.ok(raw.includes('> \\<\\!'));assert.equal(outputProjection(raw,meta).text,'');
 const entry=await indexNote({path:'Sources/a.md',text:raw,metadata:meta,modifiedAt:1},()=>null);assert.deepEqual(entry.chunks.map(c=>c.heading),['PDF page 1','PDF page 3']);assert.equal(entry.output?.invalid,false);assert.equal(entry.pdf?.path,'Sources/a.pdf');const index=new LocalIndex();index.replace([entry],{allowedPaths:['Sources'],excludedPaths:[]});assert.deepEqual(index.entries[0]!.chunks,[]);assert.equal(index.graph({allowedPaths:['Sources'],excludedPaths:[]}).assess(entry.path).usable,false);
});
test('unknown, altered, mixed or malformed PDF records cannot pass page hash/canonical body validation',async()=>{
 const raw=await pdfSource(sample,'Sources/a.pdf','a'.repeat(64)),meta=metadata(raw);
 for(const text of [raw.replace('First page','Edited page'),raw+'\nHuman append',raw.replace('## PDF page 3','## PDF page 2'),raw.replace('> Final','Final'),raw.replaceAll('\n','\r\n')])await assert.rejects(readPdfSource(text,meta));
 for(const changed of [{...meta,thread_pdf_version:'2'},{...meta,type:'decision'},{...meta,id:'-'.repeat(36)},{...meta,thread_sources:'[]'},{...meta,thread_pdf:'not json'},{...meta,thread_pdf:JSON.stringify({...JSON.parse(meta.thread_pdf),path:'../escape.pdf'})},{...meta,thread_pdf:JSON.stringify({...JSON.parse(meta.thread_pdf),extra:'unreviewed'})}])await assert.rejects(readPdfSource(raw,changed));
 const unknown=outputProjection('# copied content',{type:'source',thread_pdf_version:'future'});assert.equal(unknown.text,'');assert.ok(unknown.output?.invalid);
 const malformed=outputProjection('---\n"thread_pdf_version": broken\n---\nUNVERIFIED',{});assert.equal(malformed.text,'');
});
test('extraction schema enforces all finite text/page limits and explicit image-only refusal',()=>{
 for(const value of [{totalPages:0,pages:sample.pages},{totalPages:201,pages:sample.pages},{totalPages:2,pages:[{page:2,text:'bad order',shortened:false}]},{totalPages:1,pages:[{page:1,text:'x'.repeat(PDF_LIMITS.pageChars+1),shortened:false}]},{totalPages:40,pages:Array.from({length:40},(_,i)=>({page:i+1,text:'x'.repeat(8000),shortened:false}))},{totalPages:1,pages:[{page:1,text:'\u0000',shortened:false}]}])assert.throws(()=>validateExtraction(value));
 assert.throws(()=>validateExtraction({totalPages:1,pages:[{page:1,text:' ',shortened:false}]}),/No selectable text/);
 assert.deepEqual(validateExtraction(sample),sample);
});
