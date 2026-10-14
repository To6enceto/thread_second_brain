import { test } from "node:test";
import assert from "node:assert/strict";
import { SECTION_KEYS, validateBriefing } from "./briefing.ts";
import type { EvidenceBundle } from "../vault/evidence.ts";

const bundle: EvidenceBundle = { truncated: false, noteHashes: {}, sources: [
  { id: "S1", path: "Project/Overview.md", heading: "Objective", excerpt: "Build a prototype", contentHash: "h", recordedDate: "2026-10-14", dateBasis: "updated" }
] };
const blank = () => ({ ...Object.fromEntries(SECTION_KEYS.map((key) => [key, []])), gaps: [] });

test("unknown and missing references are omitted and do not turn into verified claims", () => {
  const data = { ...blank(), objective: [
    { text: "Build a prototype", kind: "fact", sourceIds: ["S1"] },
    { text: "Raise money", kind: "fact", sourceIds: ["Invented"] },
    { text: "Hire a team", kind: "fact", sourceIds: [] }
  ], nextActions: [{ text: "Test the prototype", kind: "fact", sourceIds: ["S1"] }] };
  const result = validateBriefing(JSON.stringify(data), bundle);
  assert.equal(result.sections.objective.length, 1);
  assert.equal(result.sections.nextActions[0]?.kind, "suggestion");
  assert.ok(result.gaps.some((gap) => gap.includes("unknown")));
  assert.equal(result.sections.newEvidence.length, 0);
});

test("malformed model JSON fails visibly and evidence-free answers remain empty", () => {
  assert.throws(() => validateBriefing("not json", bundle), /valid briefing JSON/);
  assert.throws(() => validateBriefing("{}", bundle), /incomplete briefing/);
  const result = validateBriefing(JSON.stringify(blank()), { sources: [], truncated: false, noteHashes: {} });
  assert.equal(result.sections.objective.length, 0);
  assert.ok(result.gaps.length > 0);
});

test("proposed decision evidence cannot appear without its recorded status", () => {
  const proposed: EvidenceBundle = { ...bundle, sources: bundle.sources.map(source => ({ ...source, noteType: "decision", noteStatus: "proposed" })) };
  const result = validateBriefing(JSON.stringify({ ...blank(), decisions: [{ text: "Use a hosted model", kind: "fact", sourceIds: ["S1"] }] }), proposed);
  assert.match(result.sections.decisions[0]?.text ?? "", /^proposed:/);
});

test("dated source changes remain visible even when the model omits their summary", () => {
  const dated: EvidenceBundle = { ...bundle, baseline: { path: "Project/Session.md", date: "2026-10-12" }, newEvidenceIds: ["S1"],
    sources: bundle.sources.map(source => ({ ...source, changedOn: "2026-10-14", changeBasis: "recorded update date" })) };
  const result = validateBriefing(JSON.stringify(blank()), dated);
  assert.equal(result.sections.newEvidence.length, 1);
  assert.match(result.sections.newEvidence[0]?.text ?? "", /2026-10-14/);
  assert.deepEqual(result.sections.newEvidence[0]?.sourceIds, ["S1"]);
});


test("latest user-reported progress informs activity without converting plans to completed work",()=>{
 const sources=[{id:"S1",path:"P/Session.md",noteType:"session",heading:"User-reported progress",excerpt:"Finished the correction toggle.\n\nThe report above is user input. Context follows.",contentHash:"a",recordedDate:"2026-10-15",dateBasis:"recorded_on"},{id:"S2",path:"P/Session.md",noteType:"session",heading:"Suggested next step",excerpt:"Test voice later",contentHash:"b",recordedDate:"2026-10-15",dateBasis:"recorded_on"}];
 const b={sources,truncated:false,noteHashes:{},baseline:{path:"P/Session.md",date:"2026-10-15"}};
 const raw={objective:[],lastActivity:[{text:"Test voice later",kind:"suggestion",sourceIds:["S2"]}],decisions:[],openQuestions:[],newEvidence:[],nextActions:[],gaps:[]};
 const result=validateBriefing(JSON.stringify(raw),b);assert.equal(result.sections.lastActivity.length,1);assert.match(result.sections.lastActivity[0]!.text,/User-reported progress: Finished/);assert.deepEqual(result.sections.lastActivity[0]!.sourceIds,["S1"]);
});


test("model citation cannot promote user-reported achievement into established fact",()=>{
 const source={id:"S1",path:"P/Session.md",noteType:"session",heading:"User-reported progress",excerpt:"Completed a correction toggle.\n\nThe report above is user input. Older context follows.",contentHash:"a",recordedDate:"2026-10-15",dateBasis:"recorded_on"};
 const b={sources:[source],truncated:false,noteHashes:{},baseline:{path:source.path,date:"2026-10-15"}};
 const raw={objective:[],lastActivity:[{text:"The correction toggle is completed.",kind:"fact",sourceIds:["S1"]}],decisions:[],openQuestions:[],newEvidence:[],nextActions:[],gaps:[]};
 const result=validateBriefing(JSON.stringify(raw),b);
 assert.deepEqual(result.sections.lastActivity,[{text:"User-reported progress: Completed a correction toggle.",kind:"fact",sourceIds:["S1"]}]);
 const empty=validateBriefing(JSON.stringify(raw),{...b,sources:[{...source,excerpt:"Not reported.\n\nThe report above is user input."}]});
 assert.equal(empty.sections.lastActivity.length,0);
});
