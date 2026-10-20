import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalIndex, indexNote, type IndexEntry } from "./index.ts";
import { affectedEntries, IndexUpdates, type UpdatePort } from "./index-updates.ts";
const scope={allowedPaths:["P"],excludedPaths:[]};
const note=async(path:string,text:string,id=path)=>indexNote({path,text,metadata:{id,type:"source"},modifiedAt:1},target=>`P/${target}.md`);
function output(path:string,source:IndexEntry,id:string):IndexEntry{return { ...source,path,id,metadata:{type:"answer"},chunks:[{heading:"",excerpt:"STALE_DERIVED_SECRET"}],linkTexts:["STALE_DERIVED_SECRET"],links:[],output:{invalid:false,title:"",refs:[{path:source.path,id:source.id,heading:"",hash:source.hash,noteHash:source.hash}]} };}
test("affected closure covers transitive, renamed and duplicate stable identities",async()=>{
 const source=await note("P/S.md","source","s"),a=output("P/A.md",source,"a"),b=output("P/B.md",a,"b"),other=await note("P/Other.md","unrelated","other");
 const moved={...source,path:"P/Moved.md"};
 assert.deepEqual([...affectedEntries([moved,a,b,other],[moved.path],scope,{"P/S.md":moved.path})].sort(),[a.path,b.path,moved.path].sort());
 const duplicate={...source,path:"P/Duplicate.md"};assert.ok(affectedEntries([source,duplicate,a,b,other],[duplicate.path],scope).has(source.path));
});
test("ordinary edit removes changed bytes and scrubs dependents immediately, then reads only affected notes",async()=>{
 const source=await note("P/S.md","source","s"),a=output("P/A.md",source,"a"),other=await note("P/Other.md","unrelated");
 const index=new LocalIndex();index.replace([source,a,other],scope);const updates=new IndexUpdates(index);updates.full=false;
 const affected=updates.invalidate([source.path],scope);assert.deepEqual([...affected].sort(),[source.path,a.path].sort());assert.ok(!JSON.stringify(index.entries).includes("STALE_DERIVED_SECRET"));assert.equal(index.entries.find(e=>e.path===other.path),other);
 const changed=await note(source.path,"new source","s"),reads:string[]=[];
 const port:UpdatePort={scope,current:()=>true,paths:()=>{throw new Error("Unexpected full scan");},read:async path=>{reads.push(path);return path===source.path?changed:path===a.path?a:null;},resolve:()=>null,affected:()=>{},persist:async()=>{}};
 await updates.flush(port);assert.deepEqual(reads.sort(),[source.path,a.path].sort());assert.equal(index.entries.find(e=>e.path===other.path),other);assert.ok(!index.graph(scope).assess(a.path).usable);assert.equal(index.ready,true);
});
test("edits during reads cannot publish the earlier snapshot and unfinished paths survive cancellation",async()=>{
 const index=new LocalIndex(),updates=new IndexUpdates(index),old=await note("P/S.md","old"),newer=await note("P/S.md","new");let release:()=>void=()=>{},started:()=>void=()=>{};const waiting=new Promise<void>(r=>started=r);let reads=0;
 const port:UpdatePort={scope,current:()=>true,paths:()=>[old.path],read:async()=>{if(++reads===1){started();await new Promise<void>(r=>release=r);return old;}return newer;},resolve:()=>null,affected:()=>{},persist:async()=>{}};
 const work=updates.flush(port);await waiting;updates.invalidate([old.path],scope);release();await work;assert.equal(index.entries[0]?.hash,newer.hash);assert.equal(updates.pending.size,0);assert.equal(reads,2);
});
test("new stable-ID sources rehydrate waiting outputs and link creation/rename relinks without unrelated reads",async()=>{
 const index=new LocalIndex(),source=await note("P/New.md","source","s"),waiting=output("P/Result.md",{...source,path:"P/Missing.md"},"result"),overview=await note("P/Overview.md","[[New]]","overview");
 index.replace([waiting,overview],scope);const updates=new IndexUpdates(index);updates.full=false;updates.invalidate([source.path],scope);const reads:string[]=[];
 await updates.flush({scope,current:()=>true,paths:()=>[],read:async path=>{reads.push(path);return path===source.path?source:path===waiting.path?waiting:null;},resolve:(_path,target)=>target==="New"?source.path:null,affected:()=>{},persist:async()=>{}});
 assert.deepEqual(reads.sort(),[source.path,waiting.path].sort());assert.ok(index.graph(scope).assess(waiting.path).usable);assert.equal(index.entries.find(e=>e.path===overview.path)?.links[0],source.path);
});
test("scope reset removes all cached bytes before awaits and excluded paths are never read",async()=>{
 const index=new LocalIndex(),updates=new IndexUpdates(index),entry=await note("P/Private.md","secret");index.replace([entry],scope);updates.reset();assert.equal(index.entries.length,0);
 const privateScope={allowedPaths:["P"],excludedPaths:[entry.path]};let reads=0;
 await updates.flush({scope:privateScope,current:()=>true,paths:()=>[entry.path],read:async()=>{reads++;return entry;},resolve:()=>null,affected:()=>{},persist:async()=>{}});assert.equal(reads,0);assert.equal(index.entries.length,0);
});

test("bounded publication removes omitted sources and dependent text without endlessly rereading omissions",async()=>{
 const source=await note('P/S.md','source','s'),derived=output('P/A.md',source,'a'),other=await note('P/Other.md','other'),index=new LocalIndex();index.replace([source,derived,other],scope);const updates=new IndexUpdates(index);updates.full=false;updates.invalidate([source.path],scope);const reads:string[]=[],notifications=new Set<string>();
 await updates.flush({scope,current:()=>true,paths:()=>[],read:async path=>{reads.push(path);assert.ok(reads.length<6,'Budget omission was requeued indefinitely');return path===source.path?source:path===derived.path?derived:null;},resolve:()=>null,retain:entries=>({entries:entries.filter(e=>e.path!==source.path),invalidate:new Set([other.path])}),affected:paths=>{for(const p of paths)notifications.add(p);},persist:async()=>{}});
 assert.equal(index.ready,true);assert.equal(updates.pending.size,0);assert.ok(!index.entries.some(e=>e.path===source.path));assert.ok(!JSON.stringify(index.entries).includes('STALE_DERIVED_SECRET'));assert.ok(notifications.has(other.path));assert.equal(reads.filter(p=>p===source.path).length,1);
});
test("stopped work with revoked current authority publishes nothing and preserves a restartable full scan",async()=>{
 const index=new LocalIndex(),updates=new IndexUpdates(index),source=await note('P/S.md','source');let current=true,release:()=>void=()=>{},started:()=>void=()=>{},persisted=0;const begun=new Promise<void>(r=>started=r),port:UpdatePort={scope,current:()=>current,paths:()=>[source.path],read:async()=>{started();await new Promise<void>(r=>release=r);return source;},resolve:()=>null,affected:()=>{},persist:async()=>{persisted++;}};
 const work=updates.flush(port);await begun;current=false;updates.stop();release();await assert.rejects(work,/abort|changed/i);assert.equal(index.entries.length,0);assert.equal(persisted,0);assert.equal(updates.full,true);assert.equal(index.ready,false);
 current=true;await updates.flush({...port,read:async()=>source});assert.equal(index.ready,true);assert.equal(index.entries[0]?.hash,source.hash);assert.equal(persisted,1);
});
