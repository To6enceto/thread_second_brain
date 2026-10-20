import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexNote,LocalIndex} from '../vault/index.ts';
import {readMetadata} from '../vault/evidence.ts';
import {frontmatter} from '../vault/workspace.ts';
import {contentHash} from '../vault/scope.ts';
import {defaultSettings} from '../settings/settings.ts';
import {buildProjectExport,exportInventory,type ExportPort} from './export.ts';
import {packagePath,uniquePackagePaths,packageKind,byteHash,encodePayload} from './format.ts';
import {pdfSource} from '../pdf/record.ts';
import {authoredPdf} from '../pdf/test-fixtures.ts';
import {questionMarkdown} from '../vault/questions.ts';
import {reviewEventMarkdown} from '../vault/review-events.ts';
const parse=(yaml:string)=>Object.fromEntries(yaml.split('\n').map(line=>{const at=line.indexOf(': ');return[line.slice(0,at),JSON.parse(line.slice(at+2))];}));
const settings={...defaultSettings(),allowedPaths:['P'],excludedPaths:['P/Private'],selectedProject:'P'};
async function fixture(notes:Record<string,string>){const index=new LocalIndex();index.replace(await Promise.all(Object.entries(notes).map(([path,text])=>indexNote({path,text,metadata:readMetadata(text,parse),modifiedAt:1},()=>null))),settings);const port:ExportPort={size:path=>notes[path]===undefined?null:new TextEncoder().encode(notes[path]!).length,readText:async path=>notes[path]!,readPdf:async()=>{throw Error('No binary permission');},parse,resolve:(_p,link)=>link==='Secret'?'P/Private/Secret.md':null,current:()=>true};return{index,port};}
test('portable paths refuse traversal, hidden/executable assets, platform aliases and case/file-directory collisions',()=>{
 for(const path of ['../a.md','/a.md','P\\a.md','P/a.md ','P/CON.md','P/a:bad.md','P/AUX/file.md','P/e\u0301.md','P/Bad?.md','P/.cache/a.md'])assert.throws(()=>packagePath(path));
 for(const paths of [['P/A.md','P/a.md'],['P/a.md','P/a.md/b.md'],['P/a.md/b.md','P/a.md'],['P/a.md','p/b.md']])assert.throws(()=>uniquePackagePaths(paths));
 assert.equal(packagePath('P/Brain 🧠.md'),'P/Brain 🧠.md');assert.throws(()=>packageKind('P/a.js'));assert.equal(packageKind('P/A.PDF'),'pdf');
});
test('supporting PDF copies need explicit selection and consent; question/review private snapshots do not escape exclusions',async()=>{
 const binary=authoredPdf(['Page one']),hash=await byteHash(new Uint8Array(binary)),raw=await pdfSource({totalPages:1,pages:[{page:1,text:'Page one',shortened:false}]},'P/Original.pdf',hash),f=await fixture({'P/Extract.md':raw,'P/Overview.md':'Project'}),scope={...settings,pdfPaths:['P/Original.pdf']};
 const all=await Promise.all([indexNote({path:'P/Extract.md',text:raw,metadata:readMetadata(raw,parse),modifiedAt:1},()=>null),indexNote({path:'P/Overview.md',text:'Project',metadata:{},modifiedAt:1},()=>null)]);f.index.binaries.set('P/Original.pdf',hash);f.index.replace(all,scope);let binaryReads=0;
 const port={...f.port,size:(path:string)=>path.endsWith('.pdf')?binary.byteLength:f.port.size(path),readPdf:async()=>{binaryReads++;return{hash,bytes:binary};}};
 const textOnly=await buildProjectExport(f.index,scope,'p',['P/Overview.md','P/Extract.md'],port,new AbortController().signal);assert.equal(binaryReads,0);assert.ok(!textOnly.package.manifest.entries.some(e=>e.kind==='pdf'));assert.equal(textOnly.hashes['P/Original.pdf'],hash);
 const withPdf=await buildProjectExport(f.index,scope,'p',['P/Overview.md','P/Extract.md','P/Original.pdf'],port,new AbortController().signal);assert.equal(binaryReads,1);assert.equal(withPdf.package.manifest.entries.find(e=>e.kind==='pdf')!.sha256,hash);
 const revoked={...scope,pdfPaths:[]};assert.ok(!exportInventory(f.index,revoked).candidates.some(e=>e.path==='P/Extract.md'||e.kind==='pdf'));
 const ref={id:'S1',path:'P/Private/Secret.md',heading:'',excerpt:'COPIED_PRIVATE33',contentHash:hash,recordedDate:'2000-01-01',dateBasis:'capture'},bundle={sources:[ref],noteHashes:{[ref.path]:hash},truncated:false},question=questionMarkdown('Why?','p',bundle),review=reviewEventMarkdown('p',{key:hash,digest:hash,hashes:{'P/Overview.md':hash,[ref.path]:hash}},{kind:'stale-output',path:'P/Overview.md',hash,heading:'',text:'',related:[]},'reviewed','Inspected');
 const privateFixture=await fixture({'P/Overview.md':'Project','P/Q.md':question,'P/R.md':review});const result=await buildProjectExport(privateFixture.index,settings,'p',['P/Overview.md','P/Q.md','P/R.md'],privateFixture.port,new AbortController().signal);assert.deepEqual(result.package.manifest.entries.map(e=>e.path),['P/Overview.md']);assert.equal(result.package.manifest.omissions.unavailable,2);assert.ok(!result.package.payloads.some(p=>atob(p).includes('COPIED_PRIVATE33')));
});
test('explicit selected checkpoint preserves exact Unicode/CRLF bytes, SHA and no excluded manifest link enumeration',async()=>{
 const raw='Human source 🧠\r\n[[Secret]]\r\n',f=await fixture({'P/Source.md':raw,'P/Other.md':'Not selected','P/Private/Secret.md':'EXCLUDED_SECRET'}),result=await buildProjectExport(f.index,settings,'p',['P/Source.md'],f.port,new AbortController().signal);
 assert.equal(result.package.manifest.entries.length,1);assert.deepEqual(Uint8Array.from(atob(result.package.payloads[0]!),c=>c.charCodeAt(0)),new TextEncoder().encode(raw));assert.equal(result.package.manifest.entries[0]!.sha256,await contentHash(raw));assert.deepEqual(result.package.manifest.entries[0]!.links,[]);assert.ok(!result.text.includes('P/Private'));assert.ok(!result.text.includes('EXCLUDED_SECRET'));assert.equal(result.package.manifest.omissions.unselected,1);assert.equal(result.package.schemaVersion,1);
 assert.equal(encodePayload(new Uint8Array([0,255,128])), 'AP+A');assert.equal(await byteHash(new TextEncoder().encode(raw)),await contentHash(raw));
});
test('stale or excluded copied decision/question/review provenance is omitted as a whole without leaking paths/excerpts',async()=>{
 const source='Current evidence',hash=await contentHash(source),ref={path:'P/Private/Secret.md',id:'secret',heading:'',hash,noteHash:hash,excerpt:'COPIED_PRIVATE33'},decision=frontmatter({type:'decision',thread_sources:JSON.stringify([ref])})+'## Choice\nKeep\nCOPIED_PRIVATE33',f=await fixture({'P/Overview.md':'Project text','P/Decision.md':decision,'P/Private/Secret.md':frontmatter({id:'secret',type:'source'})+source});
 const result=await buildProjectExport(f.index,settings,'p',['P/Overview.md','P/Decision.md'],f.port,new AbortController().signal);assert.equal(result.package.manifest.entries.length,1);assert.equal(result.package.manifest.omissions.unavailable,1);assert.ok(!result.text.includes('Secret')&&!result.text.includes('COPIED_PRIVATE33'));assert.ok(!result.package.payloads.some(s=>atob(s).includes('COPIED_PRIVATE33')));
 const invalid=await fixture({'P/Overview.md':'Project','P/Q.md':frontmatter({type:'question',thread_question_version:'2',thread_sources:JSON.stringify([ref])})+'## Question\nWhy?'});assert.equal(exportInventory(invalid.index,settings).unavailable,1);
});
test('current source snapshots, finite size gates, cancellation and candidate selection cannot be bypassed',async()=>{
 const f=await fixture({'P/A.md':'One','P/B.md':'Two'}),signal=new AbortController().signal;await assert.rejects(buildProjectExport(f.index,settings,'p',['P/Private/Secret.md'],f.port,signal),/inventory/);
 let reads=0;await assert.rejects(buildProjectExport(f.index,settings,'p',['P/A.md'],{...f.port,size:()=>3*1048576,readText:async()=>{reads++;return'One';}},signal),/budget/);assert.equal(reads,0);
 await assert.rejects(buildProjectExport(f.index,settings,'p',['P/A.md'],{...f.port,readText:async()=>'Changed'},signal),/changed/);
 await assert.rejects(buildProjectExport(f.index,settings,'p',['P/A.md'],{...f.port,current:()=>false},signal),/changed/);
 const c=new AbortController();c.abort();await assert.rejects(buildProjectExport(f.index,settings,'p',['P/A.md'],f.port,c.signal),/abort/i);
 const collision=await fixture({'P/A.md':'One','P/a.md':'Two'});await assert.rejects(buildProjectExport(collision.index,settings,'p',['P/A.md','P/a.md'],collision.port,signal),/collide/);
});

test('all retained synthesis blocks must be current, supported and permitted before exact raw history can export',async()=>{
 const {synthesisBlock}=await import('../vault/knowledge.ts'),source='Current source',hash=await contentHash(source),allowedBundle={sources:[{id:'S1',path:'P/Source.md',heading:'',excerpt:source,contentHash:hash,recordedDate:'2000-01-01',dateBasis:'capture'}],noteHashes:{'P/Source.md':hash},truncated:false},privateBundle={...allowedBundle,sources:[{...allowedBundle.sources[0]!,path:'P/Private/Secret.md',excerpt:'COPIED_PRIVATE_OLD_BLOCK'}],noteHashes:{'P/Private/Secret.md':hash}},answer={supported:true,answer:[{text:'COPIED_PRIVATE_OLD_BLOCK',kind:'fact' as const,sourceIds:['S1']}],gaps:[]},currentAnswer={...answer,answer:[{...answer.answer[0]!,text:'Current supported fact'}]};
 const latest=synthesisBlock('Current',currentAnswer,allowedBundle,'authored fixture'),oldExcluded=synthesisBlock('Old',answer,privateBundle,'authored fixture'),stale=synthesisBlock('Old',answer,{...allowedBundle,noteHashes:{'P/Source.md':'f'.repeat(64)}},'authored fixture'),unsupported=synthesisBlock('Old',answer,allowedBundle,'authored fixture').replace('"schemaVersion":1','"schemaVersion":2');
 for(const older of [oldExcluded,stale,unsupported,Array(101).fill(latest).join(''),oldExcluded.replace('<!-- thread:output ','prefix<!-- thread:output ').replace('<!-- /thread:output -->','prefix<!-- /thread:output -->')]){
  const raw='Human prefix\n'+older+latest,f=await fixture({'P/Overview.md':'Project','P/Source.md':source,'P/Output.md':raw});assert.equal(f.index.graph(settings).assess('P/Output.md').usable,true,'Regression must reach a latest-current indexed note');const result=await buildProjectExport(f.index,settings,'p',['P/Overview.md','P/Output.md'],f.port,new AbortController().signal);assert.deepEqual(result.package.manifest.entries.map(e=>e.path),['P/Overview.md']);assert.equal(result.package.manifest.omissions.unavailable,1);assert.ok(!result.package.payloads.some(p=>atob(p).includes('COPIED_PRIVATE_OLD_BLOCK')));assert.ok(!JSON.stringify(result.package.manifest).includes('Private'));
 }
 const raw='Human prefix\n'+synthesisBlock('First current',currentAnswer,allowedBundle,'authored fixture')+latest,f=await fixture({'P/Source.md':source,'P/Output.md':raw}),ok=await buildProjectExport(f.index,settings,'p',['P/Output.md'],f.port,new AbortController().signal);assert.equal(ok.package.manifest.entries.length,1);assert.equal(new TextDecoder().decode(Uint8Array.from(atob(ok.package.payloads[0]!),c=>c.charCodeAt(0))),raw);assert.equal(ok.package.manifest.entries[0]!.references[0]!.path,'P/Source.md');
});
test('legacy appended decision model observations lack complete snapshots and are conservatively omitted',async()=>{
 const {decisionReviewBlock}=await import('../vault/decision-review.ts'),source='Current source',hash=await contentHash(source),bundle={sources:[{id:'S1',path:'P/Private/Secret.md',heading:'',excerpt:'COPIED_LEGACY33',contentHash:hash,recordedDate:'2000-01-01',dateBasis:'capture'}],noteHashes:{'P/Private/Secret.md':hash},truncated:false},raw=frontmatter({type:'decision',thread_sources:'[]'})+'## Choice\nKeep'+decisionReviewBlock('annotate','Human reason',{supported:true,answer:[{text:'COPIED_LEGACY33',kind:'interpretation',sourceIds:['S1']}],gaps:[]},bundle),f=await fixture({'P/Overview.md':'Project','P/Decision.md':raw}),result=await buildProjectExport(f.index,settings,'p',['P/Overview.md','P/Decision.md'],f.port,new AbortController().signal);assert.deepEqual(result.package.manifest.entries.map(e=>e.path),['P/Overview.md']);assert.equal(result.package.manifest.omissions.unavailable,1);assert.ok(!result.package.payloads.some(p=>atob(p).includes('COPIED_LEGACY33')));
});
