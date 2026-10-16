import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalIndex, indexNote, type IndexEntry } from "./index.ts";
import { reviewSnapshot, reviewEventMarkdown, readReviewEvent, disposedReviewQueue, questionReviewReferences } from "./review-events.ts";
import { projectReviewQueue, type QueueItem } from "./review-queue.ts";
import { defaultSettings } from "../settings/settings.ts";
import { outputProjection } from "./freshness.ts";
import { contentHash } from "./scope.ts";
import { questionMarkdown, updateQuestion } from "./questions.ts";
import { buildEvidence } from "./evidence.ts";
import { savedSelection } from "./selection.ts";
const settings={...defaultSettings(),selectedProject:"P",allowedPaths:["P","Sources"]},day="2026-10-16";
const metadata=(raw:string)=>Object.fromEntries((/^---\n([\s\S]*?)\n---/.exec(raw)?.[1]??"").split("\n").filter(Boolean).map(line=>{const at=line.indexOf(": ");return[line.slice(0,at),JSON.parse(line.slice(at+2))];}));
const entry=(path:string,text:string,meta:Record<string,unknown>={})=>indexNote({path,text,metadata:meta,modifiedAt:1},()=>null);
const noQuestion=async()=>[];
const eventEntry=async(snapshot:Awaited<ReturnType<typeof reviewSnapshot>>,item:QueueItem,action:"reviewed"|"snoozed"="reviewed",revisit="")=>{const raw=reviewEventMarkdown("p",snapshot,item,action,"Explicit user reason",revisit,day);return entry("P/Reviews/Event.md",raw,metadata(raw));};

test("review records acknowledge only exact snapshots; due snoozes and excluded/duplicate events resurface without changing state",async()=>{
 const target=await entry("P/Q.md","## Open questions\nWhat is next?"),index=new LocalIndex();index.replace([target],settings);const item=projectReviewQueue(index,settings,day).items[0]!,snapshot=await reviewSnapshot(index,settings,item,noQuestion),record=await eventEntry(snapshot,item);
 index.replace([target,record],settings);let queue=await disposedReviewQueue(index,settings,noQuestion,day);assert.equal(queue.pending.length,0);assert.equal(queue.handled.length,1);assert.equal(queue.baseline,null);
 const snooze=await eventEntry(snapshot,item,"snoozed","2026-10-17");index.replace([target,snooze],settings);assert.equal((await disposedReviewQueue(index,settings,noQuestion,day)).handled[0]?.disposition,"snoozed");assert.equal((await disposedReviewQueue(index,settings,noQuestion,"2026-10-17")).pending.length,1);
 index.replace([target,record,{...record,path:"P/Reviews/Duplicate.md"}],settings);assert.equal((await disposedReviewQueue(index,settings,noQuestion,day)).pending.length,1);
 index.replace([target,record],settings);assert.equal((await disposedReviewQueue(index,{...settings,excludedPaths:[record.path]},noQuestion,day)).pending.length,1);
 index.replace([await entry(target.path,"## Open questions\nA changed question?"),record],settings);assert.equal((await disposedReviewQueue(index,settings,noQuestion,day)).pending.length,1);assert.equal(target.metadata.status,undefined);
 assert.throws(()=>reviewEventMarkdown("p",snapshot,item,"snoozed","reason",day,day),/after today/);assert.equal(readReviewEvent({...record.metadata,thread_review_version:"2"}),null);assert.equal(readReviewEvent({...record.metadata,recorded_on:"2026-02-30"}),null);
});

test("snapshot follows all relevant current references, including hidden sixth and transitive dependencies after a stale first reference",async()=>{
 const sources=await Promise.all(Array.from({length:7},(_,i)=>entry(`Sources/S${i}.md`,`source${i}`,{type:"source",id:`s${i}`}))),ref=(e:IndexEntry)=>({path:e.path,id:e.id,heading:"",hash:e.hash,noteHash:e.hash}),refs=sources.map(ref);
 refs[0]!.noteHash=await contentHash("old");const decision=await entry("P/D.md","## Choice\nA",{id:"d",type:"decision",status:"accepted",thread_sources:JSON.stringify(refs)}),index=new LocalIndex();index.replace([...sources,decision],settings);
 const item=projectReviewQueue(index,settings,day).items.find(i=>i.kind==="decision-evidence")!;assert.equal(item.related.length,5);const original=await reviewSnapshot(index,settings,item,noQuestion);assert.equal(Object.keys(original.hashes).length,8);
 const record=await eventEntry(original,item);index.replace([...sources,decision,record],settings);assert.ok((await disposedReviewQueue(index,settings,noQuestion,day)).handled.some(row=>row.item.kind==="decision-evidence"));
 const changed=await entry(sources[6]!.path,"changed sixth non-displayed source",sources[6]!.metadata);index.replace([...sources.slice(0,6),changed,decision,record],settings);assert.notEqual((await reviewSnapshot(index,settings,item,noQuestion)).digest,original.digest);assert.ok((await disposedReviewQueue(index,settings,noQuestion,day)).pending.some(row=>row.item.kind==="decision-evidence"));assert.equal(decision.metadata.status,"accepted");
 const excluded={...settings,excludedPaths:[sources[6]!.path]};assert.notEqual((await reviewSnapshot(index,excluded,item,noQuestion)).digest,original.digest);
 const child=await entry("Sources/Derived.md","derived",{id:"derived",type:"answer",thread_sources:JSON.stringify([ref(sources[6]!)])}),parent=await entry("P/Parent.md","## Choice\nB",{type:"decision",thread_sources:JSON.stringify([refs[0],ref(child)])});index.replace([...sources,child,parent],settings);const parentItem=projectReviewQueue(index,settings,day).items.find(i=>i.path===parent.path)!;const a=await reviewSnapshot(index,settings,parentItem,noQuestion);index.replace([...sources.slice(0,6),changed,child,parent],settings);assert.notEqual((await reviewSnapshot(index,settings,parentItem,noQuestion)).digest,a.digest);
});

test("managed question creation and event sources participate without placing private paths or excerpts in derived question caches",async()=>{
 const source=await entry("Sources/PRIVATE25.md","PRIVATE_EXCERPT25",{type:"source",id:"s"}),bundle=await buildEvidence([{path:source.path,text:"PRIVATE_EXCERPT25",metadata:source.metadata,modifiedAt:1}]);
 const created=questionMarkdown("Human question?","p",{sources:[],noteHashes:{},truncated:false},day),raw=updateQuestion(created,metadata(created),{status:"investigating",reason:"Human reason",answer:"Human response",day},bundle),q=await entry("P/Q.md",raw,metadata(raw)),index=new LocalIndex();index.replace([source,q],settings);
 const reader=async()=>questionReviewReferences(raw,text=>Object.fromEntries(text.split("\n").map(line=>{const at=line.indexOf(": ");return[line.slice(0,at),JSON.parse(line.slice(at+2))];}))),item=projectReviewQueue(index,settings,day).items[0]!,before=await reviewSnapshot(index,settings,item,reader);assert.equal(Object.keys(before.hashes).length,2);assert.ok(!JSON.stringify(q).includes("PRIVATE_EXCERPT25"));assert.ok(!JSON.stringify(q).includes("PRIVATE25"));
 index.replace([await entry(source.path,"Changed",source.metadata),q],settings);assert.notEqual((await reviewSnapshot(index,settings,item,reader)).digest,before.digest);
});

test("reserved review provenance stays out of derived evidence and selections even with missing schema or rejected frontmatter",async()=>{
 const item={kind:"open-question",path:"P/PRIVATE25.md",hash:"a".repeat(64),heading:"Question",text:"Human question",related:[]} as QueueItem,snapshot={key:"b".repeat(64),digest:"c".repeat(64),hashes:{[item.path]:item.hash}},raw=reviewEventMarkdown("p",snapshot,item,"reviewed","User-authored reason","",day),m=metadata(raw),projected=outputProjection(raw,m);
 assert.ok(projected.text.includes("User-authored reason"));assert.ok(!projected.text.includes("PRIVATE25"));const indexed=await entry("P/R.md",raw,m);assert.ok(!JSON.stringify(indexed).includes("PRIVATE25"));
 const at=raw.indexOf("PRIVATE25");await assert.rejects(savedSelection("P/R.md",raw,raw,at,at+9,settings,projected.ranges),/eligible/);
 for(const [text,meta]of [[raw,{...m,thread_review_version:undefined}],[raw.replace(/\n---\n/,"\n--\n"),{}],[raw.replace(/^---/,"--"),{}],[raw,{...m,type:"source"}],[raw.replace("<!-- /thread:review-evidence -->",""),m]] as const){assert.equal(outputProjection(text,meta).output?.invalid,true);assert.equal(outputProjection(text,meta).text,"");}
 assert.equal(outputProjection("Ordinary authored review without private markers",{type:"review-event"}).text,"Ordinary authored review without private markers");
});

test("dispositions screen beyond the first twenty candidates, retain transparent counts, and cancel bounded work",async()=>{
 const index=new LocalIndex(),targets=await Promise.all(Array.from({length:30},(_,i)=>entry(`P/Q${String(i).padStart(2,"0")}.md`,`## Open questions\nQuestion ${i}`)));index.replace(targets,settings);const items=projectReviewQueue(index,settings,day,200).items;
 const records=[];for(const [i,item]of items.slice(0,20).entries()){const r=await eventEntry(await reviewSnapshot(index,settings,item,noQuestion),item);records.push({...r,path:`P/Reviews/E${i}.md`});}
 index.replace([...targets,...records],settings);const queue=await disposedReviewQueue(index,settings,noQuestion,day);assert.equal(queue.pending.length,10);assert.equal(queue.handled.length,20);assert.equal(queue.candidateCounts["open-question"],30);assert.equal(queue.counts["open-question"],10);
 const controller=new AbortController();controller.abort();await assert.rejects(disposedReviewQueue(index,settings,noQuestion,day,controller.signal),/abort/i);
});

test("invalid and oversized dependency graphs cannot be acknowledged",async()=>{
 const bad=await entry("P/Bad.md","human decision",{type:"decision",thread_sources:"bad JSON"}),index=new LocalIndex();index.replace([bad],settings);let queue=await disposedReviewQueue(index,settings,noQuestion,day);assert.equal(queue.pending[0]?.snapshot,null);assert.ok(queue.limits.some(v=>v.includes('cannot be acknowledged')));
 const nodes:IndexEntry[]=[];for(let i=200;i>=0;i--){const next=nodes.at(-1);nodes.push(await entry(`P/N${i}.md`,"## Choice\nHuman choice",{type:"decision",...(next?{thread_sources:JSON.stringify([{path:next.path,heading:"",hash:next.hash,noteHash:next.hash}])}:{})}));}
 index.replace(nodes,settings);const target=nodes.at(-1)!,item={path:target.path,hash:target.hash,kind:"decision-evidence",text:"",heading:"",related:[]} as QueueItem;await assert.rejects(reviewSnapshot(index,settings,item,noQuestion),/200-note/);
});

test("ambiguous source and target identities cannot hide changed candidate or transitive evidence",async()=>{
 const a=await entry("Sources/A.md","A",{id:"same",type:"source"}),b=await entry("Sources/B.md","B",{id:"same",type:"source"}),ref={path:a.path,id:"same",heading:"",hash:a.hash,noteHash:a.hash},target=await entry("P/D.md","## Choice\nA",{id:"d",type:"decision",thread_sources:JSON.stringify([ref])}),index=new LocalIndex();
 index.replace([a,target],settings);const oldItem={path:target.path,hash:target.hash,kind:"decision-evidence",text:"",heading:"",related:[]} as QueueItem,old=await reviewSnapshot(index,settings,oldItem,noQuestion),record=await eventEntry(old,oldItem);
 for(const candidate of [b,await entry(b.path,"Changed ambiguous candidate",b.metadata),await entry(b.path,"## Choice\nHuman record",{id:"same",type:"decision",thread_sources:JSON.stringify([{path:a.path,heading:"",hash:a.hash,noteHash:a.hash}])})]){
  index.replace([a,candidate,target,record],settings);await assert.rejects(reviewSnapshot(index,settings,oldItem,noQuestion),/Ambiguous/);const queue=await disposedReviewQueue(index,settings,noQuestion,day);assert.ok(queue.pending.some(row=>row.item.path===target.path&&row.snapshot===null));assert.ok(!queue.handled.some(row=>row.item.path===target.path));
 }
 const duplicate={...target,path:"P/Duplicate.md"};index.replace([a,target,duplicate,record],settings);await assert.rejects(reviewSnapshot(index,settings,oldItem,noQuestion),/Ambiguous/);
});

test("raw review schema, reason and manifest validation precede durable disposition reuse",async()=>{
 const target=await entry("P/Q.md","## Open questions\nQuestion?"),index=new LocalIndex();index.replace([target],settings);const item=projectReviewQueue(index,settings,day).items[0]!,snapshot=await reviewSnapshot(index,settings,item,noQuestion),raw=reviewEventMarkdown("p",snapshot,item,"reviewed","Required reason","",day),m=metadata(raw),json=JSON.stringify({schemaVersion:1,kind:item.kind,hashes:snapshot.hashes});
 const variants=[raw.replace(json,'{bad JSON'),raw.replace(json,''),raw.replace('"schemaVersion":1','"schemaVersion":999'),raw.replace('Required reason',''),raw.replace(/^created:.*\n/m,''),raw.replace('"hashes":','"missing":'),raw.replace('"kind":"open-question"','"kind":"unknown"'),raw.replace(target.hash,'invalid-hash'),raw.replace(/^(?:thread_review_version:.*|<!-- \/?thread:review-evidence -->)\n/gm,''),raw.replace(/^thread_review_version:.*\n/m,'').replace(/<!-- \/?thread:review-evidence -->\n/g,'').replace(/\n---\n/,'\n--\n')];
 for(const malformed of variants){const meta=metadata(malformed),projection=outputProjection(malformed,meta),event=await entry("P/Reviews/Bad.md",malformed,meta);assert.equal(projection.output?.invalid,true);assert.equal(projection.text,"");assert.deepEqual(projection.ranges,[]);assert.ok(!event.reviewManifestHash);index.replace([target,event],settings);const queue=await disposedReviewQueue(index,settings,noQuestion,day);assert.ok(queue.pending.some(row=>row.item.path===target.path));assert.ok(!queue.handled.some(row=>row.item.path===target.path));}
 // A structurally valid but changed manifest cannot claim the original exact snapshot.
 const mismatch=raw.replace(target.hash,'f'.repeat(64)),event=await entry("P/Reviews/Mismatch.md",mismatch,m);assert.ok(event.reviewManifestHash);assert.ok(!JSON.stringify(event).includes(target.path));index.replace([target,event],settings);assert.ok((await disposedReviewQueue(index,settings,noQuestion,day)).pending.some(row=>row.item.path===target.path));
 const unmanaged=await entry("P/Manual.md","An ordinary authored record",{type:"review-event"});assert.equal(unmanaged.output,undefined);
});

test("mixed question/review/synthesis namespaces cannot bypass any private evidence projection",async()=>{
 const privatePath="Private/EXCLUDED25.md",item={path:privatePath,hash:'a'.repeat(64),kind:'open-question',heading:'',text:'Private question',related:[]} as QueueItem,snapshot={key:'b'.repeat(64),digest:'c'.repeat(64),hashes:{[privatePath]:item.hash}},review=reviewEventMarkdown('p',snapshot,item,'reviewed','User reason','',day),q=questionMarkdown('Human question?','p',{sources:[],noteHashes:{},truncated:false},day),block=/<!-- thread:review-evidence -->[\s\S]*?<!-- \/thread:review-evidence -->/.exec(review)![0],questionBlock=`<!-- thread:question-evidence -->\n${privatePath}\n<!-- /thread:question-evidence -->`,synthesis=`<!-- thread:output {"schemaVersion":1,"title":"old","sources":[]} -->\n${privatePath}\n<!-- /thread:output -->`,scope={...settings,excludedPaths:['Private']};
 for(const [raw,m]of [[q+'\n'+block,metadata(q)],[q+'\n'+block.replace('<!-- /thread:review-evidence -->',''),metadata(q)],[q+'\n'+block.replaceAll('thread:review-evidence','THREAD:REVIEW-EVIDENCE'),metadata(q)],[review+'\n'+questionBlock,metadata(review)],[review+'\n'+questionBlock.replace('<!-- /thread:question-evidence -->',''),metadata(review)],[q+'\n'+synthesis,metadata(q)],[review+'\n'+synthesis,metadata(review)]] as const){
  const projected=outputProjection(raw,m);assert.equal(projected.output?.invalid,true);assert.equal(projected.text,'');assert.deepEqual(projected.ranges,[]);const indexed=await entry('P/Mixed.md',raw,m),index=new LocalIndex();index.replace([indexed],scope);assert.ok(!JSON.stringify(index.entries).includes(privatePath));assert.equal(index.search('EXCLUDED25',scope,'P').hits.length,0);const evidence=await buildEvidence([{path:indexed.path,text:projected.text,metadata:m,modifiedAt:1}]);assert.ok(!JSON.stringify(evidence.sources).includes(privatePath));const at=raw.lastIndexOf(privatePath);await assert.rejects(savedSelection(indexed.path,raw,raw,at,at+privatePath.length,scope,projected.ranges),/eligible/);
 }
 assert.equal(outputProjection(q,metadata(q)).output,undefined);assert.equal(outputProjection(review,metadata(review)).output,undefined);
});

test("malformed additional same-format blocks are reserved rather than eligible prose",async()=>{
 const privatePath='Private/EXCLUDED25.md',item={path:privatePath,hash:'a'.repeat(64),kind:'open-question',heading:'',text:'Private question',related:[]} as QueueItem,snapshot={key:'b'.repeat(64),digest:'c'.repeat(64),hashes:{[privatePath]:item.hash}},review=reviewEventMarkdown('p',snapshot,item,'reviewed','User reason','',day),question=questionMarkdown('Human question?','p',{sources:[],noteHashes:{},truncated:false},day),scope={...settings,excludedPaths:['Private']};
 for(const [kind,base]of [['review',review],['question',question]] as const){
  const block=`<!-- thread:${kind}-evidence -->\n${privatePath}\n<!-- /thread:${kind}-evidence -->`;
  const variants=[block.toUpperCase().replace(privatePath.toUpperCase(),privatePath),block.replaceAll('<!-- ','<!--   '),block.replaceAll('thread:','thread : '),block.replaceAll('/thread','/   thread'),block.replaceAll(`${kind}-evidence`,`${kind}-evidence_extra`),'prefix '+block.replaceAll('\n',' '),block.replaceAll('<!-- ','<!--\n ')];
  for(const extra of variants){const raw=base+'\n'+extra,projected=outputProjection(raw,metadata(base));assert.equal(projected.output?.invalid,true);assert.equal(projected.text,'');assert.deepEqual(projected.ranges,[]);const indexed=await entry('P/Malformed.md',raw,metadata(base)),index=new LocalIndex();index.replace([indexed],scope);assert.ok(!JSON.stringify(index.entries).includes(privatePath));assert.equal(index.search('EXCLUDED25',scope,'P').hits.length,0);assert.equal((await buildEvidence([{path:indexed.path,text:projected.text,metadata:indexed.metadata,modifiedAt:1}])).sources.length,0);const at=raw.lastIndexOf(privatePath);await assert.rejects(savedSelection(indexed.path,raw,raw,at,at+privatePath.length,scope,projected.ranges),/eligible/);}
 }
 // Literal private marker examples already inside managed frontmatter do not
 // turn a normal question into a mixed format or expose that private header.
 const qmeta={...metadata(question),thread_sources:JSON.stringify([{excerpt:'<!-- THREAD:REVIEW-EVIDENCE -->'}])},header=question.replace(/^thread_sources:.*$/m,'thread_sources: '+JSON.stringify(qmeta.thread_sources));assert.equal(outputProjection(header,qmeta).output,undefined);assert.ok(!outputProjection(header,qmeta).text.includes('THREAD:REVIEW'));
});
