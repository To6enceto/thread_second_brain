import {test} from "node:test";
import assert from "node:assert/strict";
import {ChangeManager,type ChangePort} from "./changes.ts";
function fixture(){
 const files=new Map<string,string>([["K/a.md","before"]]);const saved:string[]=[];let failAt="";let conflict=false;
 const port:ChangePort={check:()=>{},prepare:async()=>{},contextCurrent:()=>true,read:async p=>files.get(p)??null,create:async(p,c)=>{assert(!files.has(p));if(p===failAt)throw new Error("injected write failure");files.set(p,c);},
 replace:async(p,expected,c)=>{assert.equal(files.get(p),expected);if(p===failAt){if(conflict)files.set("K/a.md","later user edit");throw new Error("injected write failure");}files.set(p,c);},
 removeCreated:async(p,expected)=>{assert.equal(files.get(p),expected);files.delete(p);},persist:async s=>{saved.push(s);},validateContext:async()=>true};
 return {files,saved,port,manager:new ChangeManager(port),fail:(p:string,later=false)=>{failAt=p;conflict=later;}};
}
test("all originals persist before writes; apply and guarded undo restore exactly",async()=>{
 const f=fixture();const create=f.port.create;f.port.create=async(p,c)=>{const state=JSON.parse(f.saved.at(-1)!);assert.equal(state.recovery.batch.operations.length,2);await create(p,c);};
 await f.manager.propose([{path:"K/new.md",before:null,after:"new"},{path:"K/a.md",before:"before",after:"after"}]);await f.manager.apply();
 assert.equal(f.files.get("K/a.md"),"after");assert.equal(f.manager.state.history.length,1);
 await f.manager.undo(f.manager.state.history[0]!.id);assert.equal(f.files.get("K/a.md"),"before");assert(!f.files.has("K/new.md"));
 const restored=new ChangeManager(f.port);await restored.load(JSON.parse(f.saved.at(-1)!));assert(restored.state.history[0]!.undone);
});
test("stale proposal and undo preserve concurrent edits",async()=>{
 const f=fixture();await f.manager.propose([{path:"K/a.md",before:"before",after:"after"}]);f.files.set("K/a.md","concurrent");await assert.rejects(f.manager.apply(),/stale/);assert.equal(f.files.get("K/a.md"),"concurrent");
 await f.manager.reject();await f.manager.propose([{path:"K/a.md",before:"concurrent",after:"after"}]);await f.manager.apply();f.files.set("K/a.md","later");await assert.rejects(f.manager.undo(f.manager.state.history[0]!.id),/Undo refused/);assert.equal(f.files.get("K/a.md"),"later");
});
test("partial failure rolls back, and recovery retains conflicting later work",async()=>{
 const f=fixture();f.files.set("K/b.md","b");await f.manager.propose([{path:"K/a.md",before:"before",after:"after"},{path:"K/b.md",before:"b",after:"B"}]);f.fail("K/b.md");await assert.rejects(f.manager.apply(),/rolled back/);assert.equal(f.files.get("K/a.md"),"before");
 await f.manager.reject();await f.manager.propose([{path:"K/a.md",before:"before",after:"after"},{path:"K/b.md",before:"b",after:"B"}]);f.fail("K/b.md",true);await assert.rejects(f.manager.apply(),/Recovery required: K\/a.md/);assert.equal(f.files.get("K/a.md"),"later user edit");
 await assert.rejects(f.manager.recover(),/later edits were preserved/);assert.equal(f.files.get("K/a.md"),"later user edit");
});
test("pre-write persistence failure never writes; history is bounded and corrupt backups reject",async()=>{
 const f=fixture();await f.manager.propose([{path:"K/a.md",before:"before",after:"after"}]);f.port.persist=async()=>{throw new Error("no cache disk")};await assert.rejects(f.manager.apply(),/no cache disk/);assert.equal(f.files.get("K/a.md"),"before");
 const g=fixture();for(let i=0;i<21;i++){await g.manager.propose([{path:`K/${i}.md`,before:null,after:String(i)}]);await g.manager.apply();}assert.equal(g.manager.state.history.length,20);
 const corrupt=structuredClone(g.manager.state);corrupt.history[0]!.operations[0]!.before="tampered";await assert.rejects(new ChangeManager(g.port).load(corrupt),/hashes do not match/);
});
test("source changes during final target read refuse the write",async()=>{
 const f=fixture();let current=true;let reads=0;const original=f.port.read;
 f.port.contextCurrent=()=>current;f.port.read=async path=>{const value=await original(path);if(++reads===2)queueMicrotask(()=>{current=false;});return value;};
 await f.manager.propose([{path:"K/a.md",before:"before",after:"after"}]);await assert.rejects(f.manager.apply(),/immediately before writing/);assert.equal(f.files.get("K/a.md"),"before");
});
test("interrupted state reloads for guarded recovery and shared plugin instances cannot overlap",async()=>{
 const f=fixture();f.files.set("K/b.md","b");await f.manager.propose([{path:"K/a.md",before:"before",after:"after"},{path:"K/b.md",before:"b",after:"B"}]);f.fail("K/b.md",true);await assert.rejects(f.manager.apply(),/Recovery required/);
 const loaded=new ChangeManager(f.port);await loaded.load(JSON.parse(f.saved.at(-1)!));assert(loaded.state.recovery);await assert.rejects(loaded.recover(),/later edits/);
 f.files.set("K/a.md","before");await loaded.recover();assert.equal(loaded.state.recovery,null);
 const lease={busy:false};const a=new ChangeManager(f.port,lease);const b=new ChangeManager(f.port,lease);let release!:()=>void;
 f.port.persist=()=>new Promise<void>(r=>release=r);const pending=a.reject();await assert.rejects(b.reject(),/Another change operation/);release();await pending;
});
test("failed undo restores applied contents when possible",async()=>{
 const f=fixture();f.files.set("K/b.md","b");await f.manager.propose([{path:"K/a.md",before:"before",after:"after"},{path:"K/b.md",before:"b",after:"B"}]);await f.manager.apply();
 f.fail("K/a.md");await assert.rejects(f.manager.undo(f.manager.state.history[0]!.id),/applied batch was restored/);assert.equal(f.files.get("K/a.md"),"after");assert.equal(f.files.get("K/b.md"),"B");
});
test("old review buttons cannot apply or reject a different draft",async()=>{
 const f=fixture();await f.manager.propose([{path:"K/a.md",before:"before",after:"old draft"}]);const old=f.manager.state.pending!.id;await f.manager.reject(old);
 await f.manager.propose([{path:"K/a.md",before:"before",after:"new draft"}]);await assert.rejects(f.manager.apply(old),/Proposal changed/);await assert.rejects(f.manager.reject(old),/Proposal changed/);assert.equal(f.files.get("K/a.md"),"before");assert.equal(f.manager.state.pending!.operations[0]!.after,"new draft");
});
test("canceled generation cannot persist a proposal after hashing",async()=>{
 const f=fixture();let current=true;const pending=f.manager.propose([{path:"K/a.md",before:"before",after:"draft"}],"",()=>current);current=false;
 await assert.rejects(pending,/generation canceled/);assert.equal(f.manager.state.pending,null);assert.equal(f.saved.length,0);
});
test("failed create never trashes a coincidentally identical collision",async()=>{
 const f=fixture();let removed=false;f.port.create=async(path,content)=>{f.files.set(path,content);throw new Error("another action created this note");};f.port.removeCreated=async()=>{removed=true;};
 await f.manager.propose([{path:"K/collision.md",before:null,after:"same approved bytes"}]);await assert.rejects(f.manager.apply(),/Recovery required/);assert.equal(f.files.get("K/collision.md"),"same approved bytes");assert.equal(removed,false);
});
