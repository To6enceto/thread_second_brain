import {test} from "node:test";
import assert from "node:assert/strict";
import {LocalIndex,indexNote,hitsToNotes,linkTargets,identityFromIndex} from "./index.ts";
import {buildEvidence} from "./evidence.ts";
test("recall ranks text, metadata membership and eligible explicit links without scope escape",async()=>{
 const index=new LocalIndex();
 for(const [path,text,metadata] of [
  ["Projects/A/Overview.md","# Goal\nSpeaking practice [[Sources/Interview]]",{id:"project-a",type:"project"}],
  ["Sources/Interview.md","# Speaking\nCorrection practice interview",{}],
  ["Sources/Linked.md","Correction observation",{project:"project-a"}],
  ["Secrets/Hidden.md","Speaking practice correction",{}],
  ["Projects/AB/Wrong.md","Speaking practice correction",{}]
 ] as [string,string,Record<string,unknown>][]){index.entries.push(await indexNote({path,text,metadata,modifiedAt:1},l=>l+".md"));}
 const scope={allowedPaths:["Projects","Sources"],excludedPaths:["Sources/Linked.md"]};
 const hits=index.recall("speaking correction",scope,"Projects/A");
 assert(hits.some(h=>h.entry.path==="Sources/Interview.md"));
 assert(hits.every(h=>!["Secrets/Hidden.md","Projects/AB/Wrong.md","Sources/Linked.md"].includes(h.entry.path)));
 const bundle=await buildEvidence(hitsToNotes(hits));assert.equal(bundle.noteHashes[hits[0]!.entry.path],hits[0]!.entry.hash);
 assert.deepEqual(index.recall("the and",scope,null),[]);
 index.clear();assert.equal(index.recall("speaking",scope,null).length,0);
});
test("chunks are bounded and link extraction ignores external URLs",async()=>{
 const entry=await indexNote({path:"P/a.md",text:"x".repeat(60000),metadata:{},modifiedAt:1},()=>null);
 assert(entry.truncated);assert(entry.chunks.every(c=>c.excerpt.length<=1200));
 assert.deepEqual(linkTargets("[[Note#Heading|name]] [web](https://example.com) [local](a.md)"),["Note","a.md"]);
});
test("missing project metadata cannot match a project whose ID is the string undefined",async()=>{
 const index=new LocalIndex();for(const [path,metadata] of [["P/Overview.md",{type:"project",id:"undefined"}],["Other/a.md",{}]] as [string,Record<string,unknown>][])
  index.entries.push(await indexNote({path,text:"shared term",metadata,modifiedAt:1},()=>null));
 assert.deepEqual(index.projectEntries({allowedPaths:["P","Other"],excludedPaths:[]},"P").map(e=>e.path),["P/Overview.md"]);
});
test("pending project identity never becomes a legacy path fallback",async()=>{
 const entry=await indexNote({path:"P/Overview.md",text:"Goal",metadata:{type:"project",id:"stable-project"},modifiedAt:1},()=>null);
 assert.throws(()=>identityFromIndex([],"P",false),/still loading/);
 assert.equal(identityFromIndex([entry],"P",true),"stable-project");
 assert.equal(identityFromIndex([],"P",true),"P");
 assert.equal(identityFromIndex([entry],"Parent",true),"Parent");
 assert.throws(()=>identityFromIndex([entry,{...entry,path:"P/Other.md",id:"conflicting"}],"P",true),/multiple project IDs/);
});


test("excluded dependencies scrub transitive generated text and provenance excerpts from cached index",async()=>{
 const secret="DERIVED_SECRET_COPY_9714";const source=await indexNote({path:"P/Source.md",text:secret,metadata:{id:"s",type:"source"},modifiedAt:1},()=>null);
 const refs=(path:string,id:string,hash:string)=>JSON.stringify([{path,id,heading:"",excerpt:secret,hash,noteHash:hash}]);
 const a=await indexNote({path:"P/A.md",text:`---\nthread_sources: "${secret}"\n---\n# Result\n${secret}`,metadata:{id:"a",type:"answer",thread_model:"m",thread_sources:refs(source.path,"s",source.hash)},modifiedAt:1},()=>null);
 const b=await indexNote({path:"P/B.md",text:`# Result\n${secret}`,metadata:{id:"b",type:"answer",thread_model:"m",thread_sources:refs(a.path,"a",a.hash)},modifiedAt:1},()=>null);
 const index=new LocalIndex();const scope={allowedPaths:["P"],excludedPaths:[source.path]};index.replace([source,a,b],scope);
 assert.equal(index.recall("DERIVED_SECRET_COPY",scope,null).length,0);assert.ok(!JSON.stringify(index.entries).includes(secret));assert.ok(index.entries.every(e=>e.path!==source.path));
});

test("frontmatter is removed before body truncation so provenance cannot become recall text",async()=>{
 const text='---\nthread_sources: "'+"PROVENANCE_EXCERPT_SECRET".repeat(5000)+'"\n---\n# Visible\nOnly the body is recalled.';
 const entry=await indexNote({path:"P/Large.md",text,metadata:{type:"source"},modifiedAt:1},()=>null);
 assert.ok(entry.chunks.some(c=>c.excerpt.includes("Only the body")));assert.ok(!JSON.stringify(entry.chunks).includes("PROVENANCE_EXCERPT_SECRET"));
});


test("index metadata stores only retrieval fields, without arbitrary or cyclic user properties",async()=>{
 const custom:Record<string,unknown>={privateCopy:"Do not cache arbitrary properties"};custom.self=custom;
 const entry=await indexNote({path:"P/Source.md",text:"# Body\nVisible body",metadata:{id:"s",type:"source",custom,thread_sources:"private provenance"},modifiedAt:1},()=>null);
 assert.deepEqual(entry.metadata,{id:"s",type:"source"});assert.doesNotThrow(()=>JSON.stringify(entry));
});
