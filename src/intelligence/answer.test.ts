import {test} from "node:test";
import assert from "node:assert/strict";
import {validateAnswer,answerMarkdown,escapeMarkdown} from "./answer.ts";
import {buildEvidence} from "../vault/evidence.ts";
test("answers omit unknown citations and respect unsupported flag",async()=>{
 const bundle=await buildEvidence([{path:"P/a.md",text:"Speaking practice",metadata:{},modifiedAt:1}]);
 const claim={text:"Practice speaking",kind:"fact",sourceIds:["S1"]};
 assert(validateAnswer(JSON.stringify({supported:true,answer:[claim],gaps:[]}),bundle).supported);
 assert.equal(validateAnswer(JSON.stringify({supported:true,answer:[{...claim,sourceIds:["S999"]}],gaps:[]}),bundle).supported,false);
 assert.equal(validateAnswer(JSON.stringify({supported:false,answer:[claim],gaps:[]}),bundle).answer.length,0);
 assert.throws(()=>validateAnswer("{}",bundle));
 const md=answerMarkdown("A ![[private]] question",{supported:true,answer:[{...claim,kind:"fact"}],gaps:[]},bundle,"local");
 assert(md.includes('type: "answer"'));assert(md.includes("thread_sources:"));assert(!md.includes("![[private]]"));
 assert.equal(escapeMarkdown("<script>"),"\\<script\\>");
 assert.throws(()=>answerMarkdown("Q",{supported:false,answer:[],gaps:[]},bundle,"local"));
});

test("new answer Markdown explains legacy kind values and retains decision/model context",async()=>{
 const bundle=await buildEvidence([{path:"P/Decision.md",text:"## Choice\nUse text practice.",metadata:{type:"decision",status:"proposed"},modifiedAt:1}]);
 const answer=validateAnswer(JSON.stringify({supported:true,answer:[{text:"Use text practice.",kind:"suggestion",sourceIds:["S1"]}],gaps:[]}),bundle);
 const md=answerMarkdown("What is recorded?",answer,bundle,"local");
 assert.match(md,/Recorded statement \(fact\)/);
 assert.match(md,/S1: proposed/);
 assert.match(md,/Model classification: suggestion/);
 assert.match(md,/not independently verified facts/);
 assert.equal(answer.answer[0]?.text,"Use text practice.");
 assert.match(md,/thread_sources:/);
});
