import { test } from "node:test";
import assert from "node:assert/strict";
import { indexBudget } from "../settings/index-budget.ts";
import { indexNote } from "./index.ts";
import { entryPayloadBytes, indexCoverage, indexCoverageText, retainIndexEntries } from "./index-coverage.ts";

test("deterministic entry admission counts metadata/provenance bytes and never exceeds its serialized payload budget",async()=>{
 const a=await indexNote({path:'P/A.md',text:'## A\nText',metadata:{type:'source',id:'a'},modifiedAt:1},()=>null),b=await indexNote({path:'P/B.md',text:'## B\nText',metadata:{type:'source',project:'x'.repeat(5000)},modifiedAt:1},()=>null),c={...a,path:'P/C.md'},budget={...indexBudget('standard'),maxEntryBytes:entryPayloadBytes([a,c])},admitted=new Set([a.path,b.path,c.path]),result=retainIndexEntries([c,b,a],admitted,budget);
 assert.deepEqual(result.entries.map(e=>e.path),[a.path,c.path]);assert.equal(result.entryBudgetSkips,1);assert.ok(result.removed.has(b.path));assert.ok(entryPayloadBytes(result.entries)<=budget.maxEntryBytes);
 const narrowed=retainIndexEntries([a,b,c],new Set([a.path]),indexBudget('standard'));assert.deepEqual(narrowed.entries,[a]);assert.deepEqual([...narrowed.removed].sort(),[b.path,c.path]);
});
test("coverage distinguishes omitted files and unknown text from partial sections and actual retained storage",async()=>{
 const note=await indexNote({path:'P/A.md',text:'x'.repeat(250000)+'\n## Tail\nLater evidence',metadata:{type:'source'},modifiedAt:1},()=>null),report=indexCoverage('standard',4,3,[note],{rawBytesRead:250030,filesRead:1,sizeSkips:1,readBudgetSkips:1,elapsedMs:20},0);assert.equal(report.omittedFiles,3);assert.equal(report.fileBudgetSkips,1);assert.equal(report.shortenedNotes,1);assert.equal(report.entryBytes,entryPayloadBytes([note]));assert.ok(report.includedSections>1);assert.ok(indexCoverageText(report).includes('unknown'));assert.ok(indexCoverageText(report).includes('uniqueness cannot'));
});

test("omitted permitted files cannot silently make stable IDs unique or authorize derived-source reuse",async()=>{
 const {LocalIndex,identityFromIndex}=await import('./index.ts'),{reviewSnapshot}=await import('./review-events.ts'),{overviewIdentity}=await import('./project-overview.ts'),{defaultSettings}=await import('../settings/settings.ts');
 const scope={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},source=await indexNote({path:'P/Source.md',text:'SOURCE29 original',metadata:{id:'s',type:'source'},modifiedAt:1},()=>null),ref={path:source.path,id:source.id,heading:'',hash:source.hash,noteHash:source.hash},derived=await indexNote({path:'P/Answer.md',text:'DERIVED29 copy',metadata:{id:'a',type:'answer',thread_model:'m',thread_sources:JSON.stringify([ref])},modifiedAt:1},()=>null),index=new LocalIndex();
 index.coverage=indexCoverage('standard',3,3,[source,derived],{rawBytesRead:100,filesRead:2,sizeSkips:1,readBudgetSkips:0,elapsedMs:1},0);index.replace([source,derived],scope);assert.equal(index.identityComplete,false);assert.equal(index.idUnambiguous('s'),false);assert.equal(index.graph(scope).resolve(ref).state,'ambiguous');assert.equal(index.graph(scope).assess(derived.path).usable,false);assert.ok(!JSON.stringify(index.entries).includes('DERIVED29 copy'));assert.ok(index.search('SOURCE29',scope,null).hits.some(h=>h.entry.path===source.path));assert.throws(()=>identityFromIndex(index.entries,'P',true,index.identityComplete),/omitted permitted/);assert.equal(overviewIdentity(index,scope,'P').id,null);
 await assert.rejects(reviewSnapshot(index,scope,{path:source.path,hash:source.hash,kind:'changed-source',heading:'',text:'changed',related:[]},async()=>[]),/coverage/);
 index.coverage=indexCoverage('standard',2,2,[source,derived],{rawBytesRead:100,filesRead:2,sizeSkips:0,readBudgetSkips:0,elapsedMs:1},0);index.replace([source,derived],scope);assert.equal(index.idUnambiguous('s'),true);assert.equal(index.graph(scope).assess(derived.path).usable,true);
});
