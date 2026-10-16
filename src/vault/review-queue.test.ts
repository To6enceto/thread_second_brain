import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalIndex, indexNote } from "./index.ts";
import { contentHash } from "./scope.ts";
import { defaultSettings } from "../settings/settings.ts";
import { projectReviewQueue } from "./review-queue.ts";
const settings={...defaultSettings(),selectedProject:"P",allowedPaths:["P","Sources"],excludedPaths:["Sources/EXCLUDED_PATH.md"]};
const entry=async(path:string,text:string,metadata:Record<string,unknown>={})=>indexNote({path,text,metadata,modifiedAt:1},()=>null);
const refs=(path:string,id:string,hash:string)=>({path,id,heading:"private cached heading",excerpt:"CACHED_PRIVATE_EXCERPT",hash,noteHash:hash});
test("queue connects changed sources, accepted decisions, explicit dates/conditions, questions and stale outputs without leaking excluded or stale content",async()=>{
 const source=await entry("Sources/Budget.md","Current budget 20 euros",{id:"source",type:"source",project:"project"}),oldHash=await contentHash("Earlier budget"),references=JSON.stringify([refs(source.path,"source",oldHash),refs("Sources/EXCLUDED_PATH.md","private",oldHash)]);
 const project=await entry("P/Overview.md","## Objective\nResearch locally",{type:"project",id:"project"});
 const decision=await entry("P/Decision.md","## Choice\nLocal model\n## Revisit when\nAfter user tests",{type:"decision",status:"accepted",revisit_on:"2026-10-15",thread_sources:references});
 assert.ok(!JSON.stringify(decision.decisionSources).includes("CACHED_PRIVATE_EXCERPT"));assert.ok(!JSON.stringify(decision.decisionSources).includes("private cached heading"));
 const questions=await entry("P/Questions.md","## Open questions\n- [ ] Which model?\n- [x] Completed task?\n- What is missing?");
 const output=await entry("P/Answer.md","STALE_OUTPUT_PRIVATE_CONTENT",{type:"answer",thread_model:"m",thread_sources:JSON.stringify([refs(source.path,"source",oldHash)])});
 const review=await entry("P/Review.md","STALE_REVIEW_PRIVATE_CONTENT",{type:"review",generated_on:"2026-10-15",thread_model:"m",thread_sources:JSON.stringify([refs(source.path,"source",oldHash)])});
 const index=new LocalIndex();index.replace([source,project,decision,questions,output,review],settings);const queue=projectReviewQueue(index,settings,"2026-10-16");
 assert.equal(queue.baseline?.path,review.path);assert.equal(queue.counts["changed-source"],1);assert.equal(queue.counts["decision-evidence"],1);assert.equal(queue.counts["revisit-date"],1);assert.equal(queue.counts["revisit-condition"],1);assert.equal(queue.counts["open-question"],2);assert.equal(queue.counts["stale-output"],2);
 for(const secret of ["EXCLUDED_PATH","CACHED_PRIVATE_EXCERPT","private cached heading","STALE_OUTPUT_PRIVATE_CONTENT","STALE_REVIEW_PRIVATE_CONTENT","Completed task?"])assert.ok(!JSON.stringify(queue).includes(secret),secret);
 assert.equal(decision.metadata.status,"accepted");assert.ok(queue.items.find(item=>item.kind==="decision-evidence")?.text.startsWith("accepted:"));
});
test("unchanged stable-ID renames are not changes, and missing source paths are redacted",async()=>{
 const source=await entry("Sources/New.md","same",{id:"s",type:"source"});const decision=await entry("P/D.md","## Choice\nA",{type:"decision",status:"proposed",thread_sources:JSON.stringify([refs("Sources/Old.md","s",source.hash)])});
 const index=new LocalIndex();index.replace([source,decision],settings);let queue=projectReviewQueue(index,settings,"2026-10-16");assert.equal(queue.counts["decision-evidence"],0);assert.equal(queue.counts["changed-source"],0);assert.match(queue.limits[0]!,/No readable saved review baseline/);
 index.replace([decision],settings);queue=projectReviewQueue(index,settings,"2026-10-16");assert.equal(queue.counts["decision-evidence"],1);assert.ok(!JSON.stringify(queue).includes("Sources/Old.md"));
});
test("due/future/invalid dates, superseded history and conditions retain human semantics",async()=>{
 const index=new LocalIndex();index.replace(await Promise.all([
 entry("P/Due.md","## Revisit when\nIf the model changes",{type:"decision",status:"proposed",revisit_on:"2026-10-16T00:00:00.000Z"}),
 entry("P/Future.md","## Revisit when\nNot recorded.",{type:"decision",status:"accepted",revisit_on:"2026-10-17"}),
 entry("P/Invalid.md","",{type:"decision",revisit_on:"2026-02-30"}),
 entry("P/History.md","## Revisit when\nOld condition",{type:"decision",status:"superseded",revisit_on:"2026-01-01"}),
 entry("P/BadRefs.md","## Choice\nHuman record",{type:"decision",status:"accepted",thread_sources:"broken JSON"})
 ]),settings);
 const queue=projectReviewQueue(index,settings,"2026-10-16");assert.equal(queue.counts["revisit-date"],1);assert.equal(queue.counts["revisit-condition"],1);assert.equal(queue.counts["decision-evidence"],1);assert.ok(queue.limits.some(text=>text.includes("1 invalid revisit")));assert.ok(queue.items.find(item=>item.kind==="revisit-condition")?.text.includes("requires your judgment"));assert.ok(!queue.items.some(item=>item.path==="P/History.md"));
});
test("category caps/counts and deterministic ordering are visible; invalid scopes and pending indexes refuse",async()=>{
 const index=new LocalIndex();index.replace(await Promise.all(Array.from({length:30},(_,i)=>entry(`P/Q${String(i).padStart(2,"0")}.md`,`## Unresolved questions\n- Question ${i}?`))),settings);
 const first=projectReviewQueue(index,settings,"2026-10-16");assert.equal(first.counts["open-question"],30);assert.equal(first.items.length,20);index.entries.reverse();assert.deepEqual(projectReviewQueue(index,settings,"2026-10-16"),first);
 assert.throws(()=>projectReviewQueue(index,{...settings,selectedProject:""}),/Select/);assert.throws(()=>projectReviewQueue(index,{...settings,excludedPaths:["P"]}),/visible/);index.ready=false;assert.throws(()=>projectReviewQueue(index,settings),/updating/);
});
test("invalid and future review dates cannot replace a valid recorded baseline",async()=>{
 const source=await entry("P/S.md","source",{id:"s",type:"source"}),sources=JSON.stringify([refs(source.path,"s",source.hash)]),index=new LocalIndex();
 index.replace([source,...await Promise.all([entry("P/Valid.md","review",{type:"review",generated_on:"2026-10-15",thread_sources:sources}),entry("P/Future.md","review",{type:"review",generated_on:"2030-01-01",thread_sources:sources}),entry("P/Invalid.md","review",{type:"review",generated_on:"zzzz",thread_sources:sources})])],settings);
 assert.equal(projectReviewQueue(index,settings,"2026-10-16").baseline?.path,"P/Valid.md");
});
