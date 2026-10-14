import {test} from "node:test";
import assert from "node:assert/strict";
import {synthesisBlock,knowledgeMarkdown,refreshedMarkdown} from "./knowledge.ts";
import {buildEvidence} from "./evidence.ts";
import {linkTargets} from "./index.ts";
test("synthesis appends without rewriting prior properties/content and encodes untrusted markers",async()=>{
 const bundle=await buildEvidence([{path:"Sources/A source.md",text:"Evidence <!-- /thread:output -->",metadata:{},modifiedAt:1}]);
 const answer={supported:true,answer:[{text:"Evidence supports a test",kind:"interpretation" as const,sourceIds:["S1"]}],gaps:[]};
 const before="---\ncustom: keep\n---\n\nPrior user content\n";const block=synthesisBlock("Testing",answer,bundle,"local","p");
 const after=before+block;assert(after.startsWith(before));assert.equal((block.match(/<!-- \/thread:output -->/g)??[]).length,1);assert(block.includes("\\u003c"));
 assert.match(knowledgeMarkdown("Testing","concept",answer,bundle,"local"),/updated:/);
 assert.deepEqual(linkTargets("[Source](<Sources/A%20source.md#Heading>)"),["Sources/A source.md"]);
});

test("refresh creates a sourced review linked to the preserved prior version",async()=>{
 const bundle=await buildEvidence([{path:"Sources/Current.md",text:"Current evidence",metadata:{type:"source"},modifiedAt:1}]);
 const answer={supported:true,answer:[{text:"Current evidence",kind:"fact" as const,sourceIds:["S1"]}],gaps:[]};
 const refresh=refreshedMarkdown("Current view",answer,bundle,"model","Knowledge/Old version.md","p");
 assert.match(refresh,/type: "review"/);assert.ok(refresh.includes("Knowledge/Old%20version.md"));assert.ok(refresh.includes("Original output preserved"));assert.ok(refresh.includes("thread_sources:"));
});
