import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questionMarkdown,updateQuestion,questionRecord,activeQuestion} from './questions.ts';
const empty={sources:[],noteHashes:{},truncated:false};
const metadata=(text:string)=>Object.fromEntries(text.split('\n').filter(l=>/^\w+: /.test(l)).map(l=>{const at=l.indexOf(': ');return[l.slice(0,at),JSON.parse(l.slice(at+2))];}));
test('managed questions create open records and append answers/reopening reasons without removing history',()=>{
 const initial=questionMarkdown('What about <script>budget?</script>','project',empty,'2026-10-16'),m=metadata(initial);assert.equal(m.status,'open');assert.equal(m.thread_question_version,'1');assert.equal(questionRecord(m).id,m.id);assert.match(initial,/\\<script\\>/);
 const investigating=updateQuestion(initial,m,{status:'investigating',answer:'Working hypothesis',reason:'Check evidence',day:'2026-10-17'},empty);
 const answered=updateQuestion(investigating,metadata(investigating),{status:'answered',answer:'Budget is 20 euros.',reason:'Verified source',day:'2026-10-18'},empty);
 const reopened=updateQuestion(answered,metadata(answered),{status:'open',answer:'',reason:'New conflicting evidence',day:'2026-10-19'},empty);
 for(const text of ['Working hypothesis','Budget is 20 euros.','Verified source','New conflicting evidence'])assert.ok(reopened.includes(text));assert.equal(metadata(reopened).status,'open');assert.equal(metadata(reopened).id,m.id);assert.equal(metadata(reopened).recorded_on,'2026-10-16');assert.match(reopened,/## Question\n/);
 assert.equal(activeQuestion('question','answered','Question'),false);assert.equal(activeQuestion('question','investigating','Question'),true);assert.equal(activeQuestion('questions',undefined,'Open questions'),true);assert.equal(activeQuestion('question','unknown','Question'),false);
});
test('question updates refuse missing consent fields, unsupported schemas and ambiguous YAML',()=>{
 const before=questionMarkdown('Why?','project',empty,'2026-10-16'),m=metadata(before),input={status:'answered' as const,answer:'An answer',reason:'A reason',day:'2026-10-16'};
 assert.throws(()=>updateQuestion(before,m,{...input,answer:''},empty),/answer/);assert.throws(()=>updateQuestion(before,m,{...input,reason:''},empty),/reason/);assert.throws(()=>updateQuestion(before,m,{...input,day:'2026-02-30'},empty),/date/);
 assert.throws(()=>updateQuestion(before,{...m,thread_question_version:'2'},input,empty),/unsupported/);
 for(const bad of [before.replace('status: "open"','status: "open"\nstatus: "answered"'),before.replace('status: "open"','"status": "open"'),before.replace('status: "open"','status: |\n  open'),before.replace('status: "open"','status: open\n  continuation')])assert.throws(()=>updateQuestion(bad,m,input,empty),/normaliz/);
 const crlf=before.replace(/\n/g,'\r\n'),after=updateQuestion(crlf,m,input,empty);assert.ok(after.startsWith(crlf.replace('status: "open"','status: "answered"')));assert.throws(()=>questionMarkdown('Why?','project',empty,'2026-02-30'),/valid/);
});


test('managed active state reaches home, recorded Resume and queue while legacy questions remain',async()=>{
 const {indexNote,LocalIndex}=await import('./index.ts'),{buildEvidence}=await import('./evidence.ts'),{projectHome}=await import('./project-home.ts'),{recordedBriefing}=await import('../intelligence/recorded.ts'),{projectReviewQueue}=await import('./review-queue.ts'),{defaultSettings}=await import('../settings/settings.ts');
 const settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},open=questionMarkdown('Managed pending question?','project',empty,'2026-10-16'),answered=updateQuestion(open,metadata(open),{status:'answered',answer:'Done',reason:'Verified',day:'2026-10-16'},empty);
 const notes=[{path:'P/Overview.md',text:'# Project',metadata:{type:'project',id:'project'},modifiedAt:1},{path:'P/Open.md',text:open,metadata:metadata(open),modifiedAt:1},{path:'P/Answered.md',text:answered,metadata:{...metadata(answered),id:'answered'},modifiedAt:1},{path:'P/Legacy.md',text:'## Open questions\nLegacy pending question?',metadata:{type:'questions'},modifiedAt:1}];
 const index=new LocalIndex();index.replace(await Promise.all(notes.map(n=>indexNote(n,()=>null))),settings);
 const home=projectHome(index,settings),queue=projectReviewQueue(index,settings,'2026-10-16'),recorded=recordedBriefing(await buildEvidence(notes));
 assert.equal(home.counts.questions,2);assert.equal(queue.counts['open-question'],2);assert.equal(recorded.sections.openQuestions.length,2);
 for(const paths of [home.questions.map(v=>v.path),queue.items.filter(v=>v.kind==='open-question').map(v=>v.path)]){assert.ok(paths.includes('P/Open.md'));assert.ok(paths.includes('P/Legacy.md'));assert.ok(!paths.includes('P/Answered.md'));}
});

test('saved question evidence never bypasses exclusions through cache, links, model or editor selection',async()=>{
 const {indexNote,LocalIndex,hitsToNotes}=await import('./index.ts'),{buildEvidence}=await import('./evidence.ts'),{outputProjection}=await import('./freshness.ts'),{savedSelection}=await import('./selection.ts');
 const scope={allowedPaths:['P'],excludedPaths:['P/AUTO_SOURCE_PATH.md']},source={path:'P/AUTO_SOURCE_PATH.md',text:'AUTOMATIC_EXCERPT_CANARY',metadata:{type:'source'},modifiedAt:1},evidence=await buildEvidence([source]);
 const creation=questionMarkdown('Human question?','project',evidence,'2026-10-16'),event=updateQuestion(creation,metadata(creation),{status:'investigating',answer:'Human working response',reason:'Human reason',day:'2026-10-16'},evidence);
 for(const text of [creation,event]){
  const meta=metadata(text),projection=outputProjection(text,meta),entry=await indexNote({path:'P/Q.md',text,metadata:meta,modifiedAt:1},target=>target),index=new LocalIndex();index.replace([entry,await indexNote(source,()=>null)],scope);
  assert.equal(index.graph(scope).assess('P/Q.md').usable,true);assert.ok(text.includes('AUTO_SOURCE_PATH')&&text.includes('AUTOMATIC_EXCERPT_CANARY'),'Authoritative evidence must remain saved');
  for(const derived of [JSON.stringify(index.entries),JSON.stringify(await buildEvidence([{path:'P/Q.md',text:projection.text,metadata:meta,modifiedAt:1,fullHash:entry.hash}])),JSON.stringify(await buildEvidence(hitsToNotes(index.recall('Human',scope,null))))]){
   assert.ok(!derived.includes('AUTO_SOURCE_PATH'),derived);assert.ok(!derived.includes('AUTOMATIC_EXCERPT_CANARY'),derived);
  }
  assert.equal(index.recall('AUTOMATIC_EXCERPT_CANARY',scope,null).length,0);assert.ok(projection.text.includes('Human question?'));
  for(const at of [text.indexOf('AUTO_SOURCE_PATH'),text.lastIndexOf('AUTO_SOURCE_PATH')])await assert.rejects(savedSelection('P/Q.md',text,text,at,at+16,scope,projection.ranges),/eligible/);
  const at=text.indexOf('Human question?');assert.equal((await savedSelection('P/Q.md',text,text,at,at+15,scope,projection.ranges)).text,'Human question?');
 }
 assert.ok(outputProjection(event,metadata(event)).text.includes('Human working response'));
 for(const text of [event.replace('<!-- /thread:question-evidence -->',''),event.replace('<!-- thread:question-evidence -->','<!-- thread:question-evidence broken -->'),event.replaceAll('<!-- thread:question-evidence -->','').replaceAll('<!-- /thread:question-evidence -->','')]){
  const projection=outputProjection(text,metadata(text));assert.equal(projection.output?.invalid,true);assert.equal(projection.text,'');assert.deepEqual(projection.ranges,[]);
 }
 assert.equal(outputProjection(event,{...metadata(event),thread_question_version:'2'}).output?.invalid,true);
});

test('missing schema cannot reinterpret Thread question provenance as an ordinary note',async()=>{
 const {indexNote,LocalIndex,hitsToNotes}=await import('./index.ts'),{buildEvidence}=await import('./evidence.ts'),{outputProjection}=await import('./freshness.ts'),{savedSelection}=await import('./selection.ts');
 const scope={allowedPaths:['P'],excludedPaths:['P/AUTO_PRIVATE_PATH.md']},bundle=await buildEvidence([{path:'P/AUTO_PRIVATE_PATH.md',text:'PRIVATE_MISSING_SCHEMA',metadata:{type:'source'},modifiedAt:1}]);
 const original=questionMarkdown('Human question','project',bundle,'2026-10-16'),missing=original.replace(/^thread_question_version:.*\n/m,'');
 for(const raw of [missing,missing.replace(/^thread_sources:.*\n/m,''),original.replace('type: "question"','type: "source"')]){
  const meta=metadata(raw),projection=outputProjection(raw,meta);assert.equal(projection.output?.invalid,true);assert.equal(projection.text,'');assert.deepEqual(projection.ranges,[]);
  const entry=await indexNote({path:'P/Q.md',text:raw,metadata:meta,modifiedAt:1},target=>target),index=new LocalIndex();index.replace([entry],scope);assert.equal(index.graph(scope).assess(entry.path).usable,false);
  assert.ok(!JSON.stringify(index.entries).includes('AUTO_PRIVATE_PATH'));assert.equal(index.recall('PRIVATE',scope,null).length,0);assert.deepEqual((await buildEvidence(hitsToNotes(index.recall('Human',scope,null)))).sources,[]);
  const at=raw.indexOf('AUTO_PRIVATE_PATH');await assert.rejects(savedSelection('P/Q.md',raw,raw,at,at+17,scope,projection.ranges),/eligible/);
 }
 assert.throws(()=>updateQuestion(missing,metadata(missing),{status:'investigating',answer:'',reason:'Explicit reason',day:'2026-10-16'},empty),/unsupported/);
 assert.equal(outputProjection('## Question\nAn ordinary authored question',{type:'question'}).text,'## Question\nAn ordinary authored question');
});

test('malformed frontmatter cannot erase the reserved question provenance boundary',async()=>{
 const {indexNote,LocalIndex,hitsToNotes}=await import('./index.ts'),{buildEvidence,readMetadata}=await import('./evidence.ts'),{outputProjection}=await import('./freshness.ts'),{savedSelection}=await import('./selection.ts');
 const scope={allowedPaths:['P'],excludedPaths:['P/PRIVATE_RAW_PATH.md']},bundle=await buildEvidence([{path:'P/PRIVATE_RAW_PATH.md',text:'RAW_PRIVATE_EXCERPT',metadata:{type:'source'},modifiedAt:1}]);
 const created=questionMarkdown('Human question','project',bundle,'2026-10-16'),raw=updateQuestion(created,metadata(created),{status:'investigating',answer:'Human answer',reason:'Human reason',day:'2026-10-16'},bundle);
 for(const malformed of [raw.replace(/^---/,'--'),raw.replace(/\n---\n/,'\n--\n'),raw.replace('status: "investigating"','status: ['),raw.replace(/^(?:---|thread_question_version:.*)$/gm,'')]){
  const meta=readMetadata(malformed,()=>{throw new Error('Malformed fixture YAML');});assert.deepEqual(meta,{});
  const projection=outputProjection(malformed,meta);assert.equal(projection.output?.invalid,true);assert.equal(projection.text,'');assert.deepEqual(projection.ranges,[]);
  const entry=await indexNote({path:'P/Q.md',text:malformed,metadata:meta,modifiedAt:1},target=>target),index=new LocalIndex();index.replace([entry],scope);assert.equal(index.graph(scope).assess(entry.path).usable,false);
  assert.ok(!JSON.stringify(index.entries).includes('PRIVATE_RAW_PATH'));assert.ok(!JSON.stringify(index.entries).includes('RAW_PRIVATE_EXCERPT'));assert.equal(index.recall('PRIVATE',scope,null).length,0);assert.deepEqual((await buildEvidence(hitsToNotes(index.recall('Human',scope,null)))).sources,[]);
  const at=malformed.lastIndexOf('RAW_PRIVATE_EXCERPT');await assert.rejects(savedSelection('P/Q.md',malformed,malformed,at,at+19,scope,projection.ranges),/eligible/);
 }
 assert.equal(outputProjection('An ordinary note without reserved provenance',{}).text,'An ordinary note without reserved provenance');
});
