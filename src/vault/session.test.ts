import assert from "node:assert/strict";
import { sessionMarkdown,validateSession } from "./session.ts";
const bundle={sources:[{id:"S1",path:"Project/Decision.md",noteType:"decision",noteStatus:"proposed",heading:"Choice",excerpt:"Prototype text",contentHash:"abc",recordedDate:"2026-10-14",dateBasis:"decided_on"}],truncated:false,noteHashes:{"Project/Decision.md":"def"}};
const claim={kind:"fact",text:"Prototype text",sourceIds:["S1"]};
const result=validateSession(JSON.stringify({progress:[claim],decisions:[claim],openQuestions:[],nextActions:[claim],gaps:[]}),bundle);
assert.match(result.sections.decisions[0]!.text,/proposed:/);assert.equal(result.sections.nextActions[0]!.kind,"suggestion");
const text=sessionMarkdown("I tested <three> examples.",result,bundle,"local-model","project-id");
assert.match(text,/type: "session"/);assert.match(text,/project: "project-id"/);assert.match(text,/recorded_on: "\d{4}-\d{2}-\d{2}"/);assert.match(text,/id: "[a-f0-9-]{36}"/);assert.ok(text.includes("user input"));assert.ok(text.includes("I tested \\<three\\>"));assert.ok(text.includes("thread_sources:"));
assert.throws(()=>validateSession('{}',bundle),/incomplete/);assert.throws(()=>sessionMarkdown("",result,bundle,"m",""),/project/);
