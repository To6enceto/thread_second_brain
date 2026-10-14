import {test} from "node:test";
import assert from "node:assert/strict";
import {createNewNotes,type NewNotePort} from "./new-notes.ts";
const note={path:"P/a.md",content:"approved"};
test("state changes queued by the final validation cannot write",async()=>{
 let current=true;let validations=0;let writes=0;
 const port:NewNotePort={exists:()=>false,checkPath:()=>{},ensureFolder:async()=>{},create:async()=>{writes++;}};
 await assert.rejects(createNewNotes([note],port,async()=>{if(++validations===2)queueMicrotask(()=>{current=false;});},()=>current),/changed before saving/);
 assert.equal(validations,2);assert.equal(writes,0);
});
test("permission changes during folder creation refuse writes",async()=>{
 let allowed=true;let writes=0;
 const port:NewNotePort={exists:()=>false,checkPath:()=>{if(!allowed)throw new Error("excluded")},ensureFolder:async()=>{allowed=false;},create:async()=>{writes++;}};
 await assert.rejects(createNewNotes([note],port,async()=>{},()=>true),/excluded/);assert.equal(writes,0);
});
test("collision preflight and partial failures preserve notes and report exact paths",async()=>{
 let writes=0;const port:NewNotePort={exists:()=>false,checkPath:()=>{},ensureFolder:async()=>{},create:async()=>{if(++writes===2)throw new Error("disk full");}};
 await assert.rejects(createNewNotes([note,{path:"P/b.md",content:"b"}],port,async()=>{},()=>true),/disk full.*already created: P\/a.md/);
 writes=0;await assert.rejects(createNewNotes([note],{...port,exists:()=>true},async()=>{},()=>true),/Already exists/);assert.equal(writes,0);
});
