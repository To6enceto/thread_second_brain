import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {qualityCases,evaluateQuality} from "./quality.ts";
import {buildEvidence} from "../vault/evidence.ts";
import {validateAnswer,type Answer} from "../intelligence/answer.ts";
import {validateBriefing,SECTION_KEYS,type Briefing} from "../intelligence/briefing.ts";
const raw=JSON.parse(readFileSync(new URL("../../evaluation/fixtures.json",import.meta.url),"utf8"));
const cases=qualityCases(raw);assert.ok(cases.length>=10);
for(const c of cases){
 const bundle=await buildEvidence(c.notes,Date.parse("2026-10-15T12:00:00Z"));
 const reference=c.mode==="answer"?validateAnswer(JSON.stringify(c.reference),bundle):validateBriefing(JSON.stringify(c.reference),bundle);
 assert.deepEqual(evaluateQuality(c,reference,bundle),{id:c.id,passed:true,failures:[]},c.id);
 // Negative controls exercise this evaluator directly, independently of the
 // product validator which may already remove or repair a malformed claim.
 const wrong=c.mode==="answer"?c.knownWrong as Answer:{sections:Object.fromEntries(SECTION_KEYS.map(k=>[k,(c.knownWrong as Record<string,unknown>)[k]])),gaps:[]} as unknown as Briefing;
 assert.equal(evaluateQuality(c,wrong,bundle).passed,false,`Negative control not detected: ${c.id}`);
}
assert.throws(()=>qualityCases({schemaVersion:99,cases:[]}));
assert.throws(()=>qualityCases({...raw,cases:[raw.cases[0],raw.cases[0]]}));
assert.throws(()=>qualityCases({...raw,cases:[{...raw.cases[0],notes:[{...raw.cases[0].notes[0],path:"../private.md"}]}]}));
assert.throws(()=>qualityCases({...raw,cases:[{...raw.cases[0],requirements:[{section:"unknown",terms:[],sourcePaths:[]}]}]}));

const conflict=cases.find(c=>c.id==="conflicting-sources")!;
const conflictBundle=await buildEvidence(conflict.notes);
const separate=validateAnswer(JSON.stringify({supported:true,answer:[{text:"Teacher A recommends corrections before each exercise.",kind:"fact",sourceIds:["S1"]},{text:"Teacher B recommends corrections after each exercise.",kind:"fact",sourceIds:["S2"]},{text:"The notes do not agree on correction timing.",kind:"interpretation",sourceIds:["S1","S2"]}],gaps:[]}),conflictBundle);
assert.equal(evaluateQuality(conflict,separate,conflictBundle).passed,true);
assert.throws(()=>qualityCases({...raw,cases:[{...raw.cases[0],id:"../outside"}]}));
assert.throws(()=>qualityCases({...raw,cases:[{...raw.cases[0],requirements:[{section:"answer",terms:[""],sourcePaths:[raw.cases[0].notes[0].path]}]}]}));
