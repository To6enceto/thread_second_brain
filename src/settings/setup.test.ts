import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingScope, scopePreviewText, sampleNote } from "./setup.ts";
test("grant preview is exact, explicit, exclusion-first and side-effect free",()=>{
 const current={allowedPaths:["Sources"]};const preview=pendingScope("Projects/A","Sources\nResearch\nResearch","Projects/A/Private",current);
 assert.deepEqual(preview.allowedPaths,["Sources","Research","Projects/A"]);assert.deepEqual(preview.newRoots,["Research","Projects/A"]);assert.deepEqual(current.allowedPaths,["Sources"]);
 assert.equal(pendingScope("Projects/A","","Projects",current).projectReadable,false);assert.match(scopePreviewText(preview),/Merely previewing does not grant/);
 assert.deepEqual(pendingScope("","","",current).allowedPaths,[]);
 for(const input of ["../private","/",".obsidian"])assert.throws(()=>pendingScope("",input,"",current));
 assert.throws(()=>pendingScope("","","../excluded",current));
});
test("optional sample is marked synthetic and confined to a unique mapped new path",()=>{
 const a=sampleNote("Projects",[]),b=sampleNote("Projects",[]);assert.notEqual(a.path,b.path);assert.match(a.path,/^Projects\/Thread Sample [a-f0-9-]+\/Overview.md$/);assert.match(a.content,/invented example/);assert.match(a.content,/thread_sample: "synthetic"/);
 assert.throws(()=>sampleNote("",[]),/mapping/);assert.throws(()=>sampleNote("Projects",["Projects"]),/outside exclusions/);assert.throws(()=>sampleNote("Projects",[],"../private"));
});
