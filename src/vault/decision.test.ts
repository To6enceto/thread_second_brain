import {test} from "node:test";
import assert from "node:assert/strict";
import {decisionMarkdown,type DecisionInput} from "./decision.ts";
const bundle={sources:[],truncated:false,noteHashes:{}};
const input:DecisionInput={question:"How to prototype?",choice:"Text first",alternatives:"Voice",rationale:"Budget",constraints:"No API",revisit:"After user tests",status:"proposed",date:"2026-10-14"};
test("decisions preserve identity, explicit status, alternatives and revisit conditions",()=>{
 const proposed=decisionMarkdown(input,"project-id",bundle);assert.match(proposed,/status: "proposed"/);assert.match(proposed,/project: "project-id"/);assert.match(proposed,/Voice/);assert.match(proposed,/After user tests/);assert.match(proposed,/No supporting notes/);
 assert.match(decisionMarkdown({...input,status:"accepted"},"p",bundle),/status: "accepted"/);
 assert.throws(()=>decisionMarkdown({...input,rationale:""},"p",bundle),/rationale/);
 assert.throws(()=>decisionMarkdown({...input,date:"2026-02-30"},"p",bundle),/valid decision date/);
 assert.throws(()=>decisionMarkdown({...input,status:"superseded" as "proposed"},"p",bundle),/status/);
});
test("optional revisit dates are explicit calendar properties and never change decision status",()=>{
 assert.match(decisionMarkdown({...input,revisitOn:"2026-10-16"},"p",bundle),/revisit_on: "2026-10-16"/);assert.match(decisionMarkdown({...input,revisitOn:"2026-10-16"},"p",bundle),/status: "proposed"/);
 assert.ok(!decisionMarkdown(input,"p",bundle).includes("revisit_on:"));
 for(const revisitOn of ["2026-02-30","tomorrow","2026-13-01","2026-1-1"])assert.throws(()=>decisionMarkdown({...input,revisitOn},"p",bundle),/revisit date/);
});
