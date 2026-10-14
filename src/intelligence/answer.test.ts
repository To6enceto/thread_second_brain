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
