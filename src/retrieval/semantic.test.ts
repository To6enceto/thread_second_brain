import { test } from "node:test";
import assert from "node:assert/strict";
import { SemanticSearch, semanticCandidates, type EmbeddingPort } from "./semantic.ts";
import { indexNote } from "../vault/index.ts";
const signal = () => new AbortController().signal;
async function note(path: string, text: string, metadata: Record<string,string> = {}) {
  return indexNote({path,text,metadata,modifiedAt:1},()=>null);
}
function embedding() {
  const calls:string[][]=[];let digest="a".repeat(64);
  const port:EmbeddingPort={embeddingIdentity:async()=>({model:"embed",digest}),embed:async(_identity,input)=>{
    calls.push(input);return input.map(text=>/funding|budget/i.test(text)?[1,0]:[0,1]);
  }};
  return {port,calls,retag:()=>{digest="b".repeat(64);}};
}
test("hybrid finds related wording with no keywords and binds cache to original note and model",async()=>{
  const entries=[await note("P/Plan.md","The project budget is 20 euros."),await note("P/Garden.md","Grow tomatoes.")];
  const cache=new SemanticSearch(),fake=embedding();
  const result=await cache.search(entries,"funding",{},"embed",fake.port,signal(),()=>true);
  assert.equal(result.coverage.matchedPassages,0);assert.equal(result.hits[0]?.entry.path,"P/Plan.md");assert.equal(result.hybrid?.mode,"hybrid");
  assert.equal(fake.calls.length,2);
  await cache.search(entries,"funding",{},"embed",fake.port,signal(),()=>true);assert.equal(fake.calls.length,3,"second query only embeds query");
  const updated=await note("P/Plan.md","The project budget is 30 euros.");
  await cache.search([updated],"funding",{},"embed",fake.port,signal(),()=>true);assert.equal(fake.calls.at(-1)?.[0],"\nThe project budget is 30 euros.");
  fake.retag();const before=fake.calls.length;await cache.search([updated],"funding",{},"embed",fake.port,signal(),()=>true);assert.equal(fake.calls.length,before+2);
  cache.clear();assert.equal(cache.size,0);
});
test("filters, required phrases, diversity and bounds survive semantic ranking",async()=>{
  const entries=await Promise.all(Array.from({length:150},(_,i)=>note(`P/${i}.md`,"budget "+"detail ".repeat(300),{type:i%2?"source":"decision",status:"proposed"})));
  const selection=semanticCandidates(entries,'"budget"');assert.equal(selection.candidates.length,128);assert.equal(new Set(selection.candidates.map(h=>h.entry.path)).size,128);
  const fake=embedding();const r=await new SemanticSearch().search(entries,'funding "budget"',{type:"source",status:"proposed",path:"P/1.md"},"embed",fake.port,signal(),()=>true);
  assert.ok(r.hits.length);assert.ok(r.hits.every(hit=>hit.entry.path==="P/1.md"&&hit.excerpt.includes("budget")));assert.equal(r.hybrid?.candidatePassages,1);
  const none=await new SemanticSearch().search(entries,'"missing phrase"',{},"embed",fake.port,signal(),()=>true);assert.equal(none.hits.length,0);
});
test("unavailable, malformed or mismatched embeddings fall back to usable keywords",async()=>{
  const entries=[await note("P/Plan.md","budget 20 euros")];
  for(const failure of ["unavailable","invalid","dimension"]){
    let call=0;const port:EmbeddingPort={embeddingIdentity:async()=>{if(failure==="unavailable")throw new Error("Model unavailable.");return{model:"embed",digest:"a".repeat(64)};},
      embed:async()=>{call++;return failure==="invalid"?[[0,0]]:call===1?[[1,0]]:[[1,0,1]];}};
    const r=await new SemanticSearch().search(entries,"budget",{},"embed",port,signal(),()=>true);assert.equal(r.hybrid?.mode,"keyword-fallback");assert.equal(r.hits[0]?.entry.path,"P/Plan.md");
  }
});
test("clearing during an in-flight source batch rejects it without resurrecting cached vectors or stale keyword fallback",async()=>{
  const cache=new SemanticSearch(),entries=[await note("P/Plan.md","budget 20 euros")];
  let release:()=>void=()=>{};let started:()=>void=()=>{};const waiting=new Promise<void>(resolve=>started=resolve);let count=0;
  const port:EmbeddingPort={embeddingIdentity:async()=>({model:"embed",digest:"a".repeat(64)}),embed:async()=>{if(++count===2){started();await new Promise<void>(resolve=>release=resolve);}return [[1,0]];}};
  const work=cache.search(entries,"budget",{},"embed",port,signal(),()=>true);await waiting;cache.clear();release();await assert.rejects(work,{name:"AbortError"});assert.equal(cache.size,0);
  const controller=new AbortController();controller.abort();await assert.rejects(cache.search(entries,"budget",{},"embed",port,controller.signal,()=>true),{name:"AbortError"});
});
test("derived cache remains bounded across model revisions",async()=>{
 const entries=await Promise.all(Array.from({length:128},(_,i)=>note(`P/${i}.md`,"budget 20 euros")));
 const cache=new SemanticSearch(),fake=embedding();
 for(let version=0;version<6;version++){
  fake.port.embeddingIdentity=async()=>({model:"embed",digest:String(version).repeat(64)});
  await cache.search(entries,"funding",{},"embed",fake.port,signal(),()=>true);
 }
 assert.equal(cache.size,512);
});
