import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionChunks } from "./sections.ts";
import { indexBudget, indexProfile, indexProfiles } from "../settings/index-budget.ts";
import { defaultSettings, loadSettings } from "../settings/settings.ts";
import { MAX_CONTEXT } from "./evidence.ts";

test("bounded section selection reaches later headings without a long introduction consuming every passage",async()=>{
 const budget=indexBudget("standard"),text="x".repeat(180000)+"\n## Later evidence\nNEEDLE29 measured the later section.\n## Last section\nAnother finding.",result=await sectionChunks(text,budget);
 assert.ok(result.chunks.some(c=>c.heading==="Later evidence"&&c.excerpt.includes("NEEDLE29")));assert.ok(result.chunks.some(c=>c.heading==="Last section"));assert.equal(result.coverage.sections,3);assert.equal(result.coverage.includedSections,3);assert.ok(result.coverage.limited);assert.ok(result.chunks.length<=budget.maxChunks);assert.ok(result.coverage.retainedChars<=budget.maxNoteChars);
});
test("section boundaries ignore frontmatter and fenced heading examples; repeated names retain separate coverage",async()=>{
 const text='---\nprivate: metadata\n---\n## One\nFirst\n```md\n## Not a heading\n```\n## One\n'+"long ".repeat(5000),result=await sectionChunks(text,{...indexBudget("standard"),maxNoteChars:5000});assert.equal(result.coverage.sections,2);assert.ok(result.chunks.every(c=>c.heading==="One"));assert.ok(!JSON.stringify(result.chunks).includes("metadata"));assert.ok(result.chunks.some(c=>c.excerpt.includes("Not a heading")));assert.ok(result.coverage.limited);
 const short=await sectionChunks('## Same\nA\n## Same\nB',indexBudget('standard'));assert.equal(short.coverage.limited,false);assert.equal(short.coverage.includedSections,2);
});
test("section, heading, chunk and character limits count omissions instead of claiming full coverage",async()=>{
 const text=Array.from({length:30},(_,i)=>`## H${i}\n${"sample ".repeat(300)}`).join('\n'),budget={...indexBudget('conservative'),maxSections:10,maxChunks:3,maxNoteChars:2500},result=await sectionChunks(text,budget);assert.equal(result.coverage.sections,30);assert.ok(result.coverage.chunks<=3);assert.ok(result.coverage.retainedChars<=2500);assert.equal(result.coverage.omittedSections,27);assert.ok(result.coverage.limited);
 const oversized=await sectionChunks('## '+"H".repeat(4001)+'\nUnknown\n## Next\nKnown',indexBudget('standard'));assert.equal(oversized.coverage.sections,2);assert.equal(oversized.coverage.omittedSections,1);assert.ok(oversized.chunks.every(c=>c.heading==='Next'));
 const blankPrefix=await sectionChunks(' '.repeat(10000)+'late text',{...budget,maxNoteChars:1000});assert.equal(blankPrefix.coverage.sections,1);assert.equal(blankPrefix.coverage.includedSections,0);assert.equal(blankPrefix.coverage.limited,true);
});
test("Unicode chunk edges are safe and processing can cancel before publication",async()=>{
 const result=await sectionChunks('## Unicode\n'+'🧠'.repeat(2000),indexBudget('standard'));for(const c of result.chunks){assert.ok(!/^[\uDC00-\uDFFF]/.test(c.excerpt));assert.ok(!/[\uD800-\uDBFF]$/.test(c.excerpt));}
 const controller=new AbortController(),pending=sectionChunks(('line\n').repeat(10000),indexBudget('standard'),controller.signal);controller.abort();await assert.rejects(pending,/abort/i);
});
test("index profiles keep old settings compatible, reject unknown values and leave model context bounds unchanged",()=>{
 assert.equal(loadSettings({schemaVersion:1,allowedPaths:['P'],model:'local'}).indexProfile,'standard');assert.equal(defaultSettings().indexProfile,'standard');assert.equal(indexProfile('unknown'),'standard');for(const profile of indexProfiles){const settings=loadSettings({indexProfile:profile}),budget=indexBudget(profile);assert.equal(settings.indexProfile,profile);assert.ok(Object.values(budget).every(v=>Number.isSafeInteger(v)&&v>0));budget.maxFiles=1;assert.notEqual(indexBudget(profile).maxFiles,1);}assert.equal(MAX_CONTEXT,16000);
});
