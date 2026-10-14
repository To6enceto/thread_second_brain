import assert from "node:assert/strict";
import { reviewPeriod,validateWeekly,weeklyMarkdown,periodSourceIds,weeklyEvidence } from "./weekly.ts";
assert.deepEqual(reviewPeriod("2026-03-30",new Date(2026,3,1)),{start:"2026-03-24",end:"2026-03-30"});
assert.deepEqual(reviewPeriod("2026-01-02",new Date(2026,0,3)),{start:"2025-12-27",end:"2026-01-02"});
for(const day of ["2026-02-30","wrong","2026-10-16"])assert.throws(()=>reviewPeriod(day,new Date(2026,9,15)),/valid review/);
const bundle={sources:[{id:"S1",path:"P/Old.md",heading:"",excerpt:"Old work",contentHash:"a",recordedDate:"2026-09-01",dateBasis:"recorded_on",changedOn:"2026-09-01"},{id:"S2",path:"P/Current.md",heading:"",excerpt:"Resolved: preserve sources",contentHash:"b",recordedDate:"2026-10-14",dateBasis:"recorded_on",changedOn:"2026-10-14",changeBasis:"file modification date, not event date"}],truncated:false,noteHashes:{"P/Old.md":"a","P/Current.md":"b"}};
const p={start:"2026-10-09",end:"2026-10-15"};const claim={kind:"fact",text:"Resolution recorded",sourceIds:["S2"]};
const result=validateWeekly(JSON.stringify({activity:[{...claim,sourceIds:["S1"]}],resolvedQuestions:[claim],projectsToRevisit:[claim],gaps:[]}),bundle,p);
assert.equal(result.sections.activity.length,0);assert.equal(result.sections.resolvedQuestions[0]!.kind,"interpretation");assert.equal(result.sections.projectsToRevisit[0]!.kind,"suggestion");assert.equal(result.newEvidence.length,1);assert.deepEqual(result.newEvidence[0]!.sourceIds,["S2"]);
const text=weeklyMarkdown(result,bundle,p,"local-model","p");assert.match(text,/thread_period_start: "2026-10-09"/);assert.match(text,/type: "review"/);assert.match(text,/thread_sources/);assert.ok(text.includes("do not date the underlying events"));
assert.throws(()=>validateWeekly('{}',bundle,p),/incomplete/);

const midnight={...bundle,sources:[{...bundle.sources[1]!,recordedDate:"2026-10-14T21:30:00Z",dateBasis:"file modification time; event date unknown",changedOn:"2026-10-15"}]};
assert.deepEqual(periodSourceIds(midnight,{start:"2026-10-08",end:"2026-10-14"}),[]);

assert.equal(weeklyEvidence(midnight,{start:"2026-10-08",end:"2026-10-14"}).sources.length,0);
