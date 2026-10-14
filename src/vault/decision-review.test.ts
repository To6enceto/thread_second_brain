import assert from "node:assert/strict";
import { supersededStatus,decisionReviewBlock,reviewObservations,decisionComparison } from "./decision-review.ts";
const original="---\r\nid: original\r\ncustom: keep\r\nstatus: 'accepted' # user note\r\n---\r\n# Original reasoning\r\nKeep this choice.\r\n";
assert.equal(supersededStatus(original,"accepted"),original.replace("'accepted'","superseded"));
assert.equal(supersededStatus('---\ncustom: "status: accepted"\nstatus: accepted\n---\n',"accepted"),'---\ncustom: "status: accepted"\nstatus: superseded\n---\n');
for(const text of ["# Legacy", "---\nstatus: accepted\nstatus: proposed\n---\n", "---\nstatus: [accepted]\n---\n", "---\nstatus: superseded\n---\n", "---\n<<: *defaults\nstatus: accepted\n---\n"])assert.throws(()=>supersededStatus(text,"accepted"));
const bundle={sources:[{id:"S1",path:"old.md",heading:"",excerpt:"choice",contentHash:"x",recordedDate:"",dateBasis:""},{id:"S2",path:"later.md",heading:"",excerpt:"later",contentHash:"y",recordedDate:"",dateBasis:""}],truncated:false,noteHashes:{"old.md":"a","later.md":"b"}};
const assessment=reviewObservations({supported:true,answer:[{kind:"fact",text:"May challenge a constraint",sourceIds:["S1","S2"]},{kind:"fact",text:"Only old choice",sourceIds:["S1"]}],gaps:[]},bundle,"old.md");
assert.equal(assessment.answer.length,1);assert.equal(assessment.answer[0]?.kind,"interpretation");
const appended=original+decisionReviewBlock("retain","Budget remains unchanged",assessment,bundle);
assert.ok(appended.startsWith(original));assert.ok(appended.includes("**retain**"));assert.throws(()=>decisionReviewBlock("annotate","",assessment,bundle));

const repeated={...bundle,sources:[bundle.sources[0]!,{...bundle.sources[0]!,id:"S3",heading:"Evidence review · 2026-10-15"},{...bundle.sources[0]!,id:"S4",heading:"Gaps"},bundle.sources[1]!]};
assert.deepEqual(decisionComparison(repeated,"old.md").sources.map(s=>s.id),["S1","S2"]);

for(const continuation of ["  pending validation","\n  # comment\n\n  pending validation"]){
 const text=`---\ntype: decision\nstatus: accepted\n${continuation}\ncustom: keep\n---\nChoice remains.\n`;
 assert.throws(()=>supersededStatus(text,"accepted pending validation"),/parsed decision status/);
 assert.throws(()=>supersededStatus(text,"accepted"),/Multiline status/);
}
assert.throws(()=>supersededStatus(original,undefined),/parsed decision status/);
