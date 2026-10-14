import {test} from "node:test";
import assert from "node:assert/strict";
import {contentHash} from "./scope.ts";
import {verifyThenOpenSource} from "./source-link.ts";
test("pending source reads cannot open after invalidation or host unload",async()=>{
 for(const reason of ["edit","unload","modal close"]){
  let current=true;let opened=false;let release!:(value:string)=>void;
  const old=await contentHash("before");const pending=verifyThenOpenSource(old,()=>new Promise(r=>release=r),()=>current,async()=>{opened=true;});
  current=false;release("before");await assert.rejects(pending,/no longer allowed/,reason);assert.equal(opened,false,reason);
 }
});
test("changed content rejects a link even without an event",async()=>{
 await assert.rejects(verifyThenOpenSource(await contentHash("before"),async()=>"after",()=>true,async()=>assert.fail("must not open")),/Source changed/);
});
