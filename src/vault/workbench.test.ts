import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvidence,MAX_CONTEXT } from "./evidence.ts";
import { selectContext } from "./workbench.ts";

test("workbench excludes exact passages, prioritizes pins and preserves source provenance without mutating candidates",async()=>{
 const candidates=await buildEvidence(["A","B","C"].map(name=>({path:`P/${name}.md`,text:`${name} evidence`,metadata:{type:"source"},modifiedAt:1})));
 const before=JSON.stringify(candidates),[a,b,c]=candidates.sources;
 const chosen=selectContext(candidates,{[a!.id]:"exclude",[c!.id]:"pin"});
 assert.deepEqual(chosen.sources,[c,b]);assert.deepEqual(Object.keys(chosen.noteHashes).sort(),[b!.path,c!.path].sort());
 assert.equal(JSON.stringify(candidates),before);assert.equal(chosen.sources[0]!.contentHash,c!.contentHash);assert.equal(chosen.noteHashes[c!.path],candidates.noteHashes[c!.path]);
 assert.deepEqual(selectContext(candidates,Object.fromEntries(candidates.sources.map(s=>[s.id,"exclude"]))).sources,[]);
 assert.throws(()=>selectContext(candidates,{unknown:"pin"}),/choices/);
});
test("pins never exceed context limits or import unrelated hashes",async()=>{
 const base=await buildEvidence([{path:"P/A.md",text:"Text",metadata:{},modifiedAt:1}]);
 const candidates={...base,sources:Array.from({length:30},(_,i)=>({...base.sources[0]!,id:`S${i}`,excerpt:"x".repeat(1200)})),noteHashes:{...base.noteHashes,"Private/hidden.md":"f".repeat(64)}};
 const chosen=selectContext(candidates,{S29:"pin"});assert.equal(chosen.sources[0]!.id,"S29");
 assert.ok(chosen.sources.reduce((n,s)=>n+JSON.stringify(s).length+2,0)<=MAX_CONTEXT);assert.ok(chosen.truncated);assert.ok(chosen.sources.length<30);assert.equal(chosen.noteHashes["Private/hidden.md"],undefined);
 const tooLarge={...candidates,sources:[{...candidates.sources[0]!,excerpt:"x".repeat(MAX_CONTEXT+1)}]};assert.deepEqual(selectContext(tooLarge,{S0:"pin"}).sources,[]);
});
