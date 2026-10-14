import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvidence, noteSections, readMetadata } from "./evidence.ts";

test("headings in fences and frontmatter do not become section boundaries", () => {
  const sections = noteSections("---\ntype: project\n---\n# Objective\nBuild it.\n```md\n# Example\n```\n## Questions\nHow?");
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.heading, "Objective");
  assert.ok(sections[0]?.excerpt.includes("# Example"));
  assert.equal(sections[1]?.heading, "Questions");
});

test("metadata comes from the same source text snapshot and malformed YAML remains readable", () => {
  const text = "---\nstatus: proposed\n---\n# Decision\nTry a prototype.";
  const metadata = readMetadata(text, header => ({ status: header.includes("proposed") ? "proposed" : "accepted" }));
  assert.equal(metadata.status, "proposed");
  assert.deepEqual(readMetadata(text, () => { throw new Error("Invalid YAML"); }), {});
  assert.deepEqual(readMetadata("Plain note", () => { throw new Error("Must not parse body as YAML"); }), {});
});

test("bounded evidence preserves priority, explicit dates, and full-note freshness hashes", async () => {
  const notes = [
    { path: "Project/Z.md", text: "x".repeat(70000), metadata: {}, modifiedAt: 1 },
    { path: "Project/Overview.md", text: "# Objective\nBuild an app", metadata: { id: "p1", type: "project", status: "active", updated: "2026-10-14" }, modifiedAt: 2 }
  ];
  const bundle = await buildEvidence(notes);
  assert.equal(bundle.sources[0]?.path, "Project/Overview.md");
  assert.equal(bundle.sources[0]?.recordedDate, "2026-10-14");
  assert.equal(bundle.sources[0]?.noteId, "p1");
  assert.equal(bundle.sources[0]?.noteStatus, "active");
  assert.ok(bundle.sources.reduce((sum, source) => sum + source.excerpt.length, 0) <= 16000);
  assert.ok(JSON.stringify(bundle.sources).length <= 16000);
  assert.equal(bundle.truncated, true);
  assert.match(bundle.noteHashes["Project/Z.md"] ?? "", /^[a-f0-9]{64}$/);
});

test("existing dated sessions provide a baseline without inventing event dates", async () => {
  const bundle = await buildEvidence([
    { path: "Project/Session.md", text: "Work ended", metadata: { type: "session", recorded_on: "2026-10-12" }, modifiedAt: Date.parse("2026-10-14") },
    { path: "Project/Research.md", text: "New research", metadata: { captured_on: "2026-10-14" }, modifiedAt: Date.parse("2026-10-14") },
    { path: "Project/Older.md", text: "Older evidence", metadata: { updated: "2026-10-10" }, modifiedAt: Date.parse("2026-10-10") }
  ], Date.parse("2026-10-14T12:00:00Z"));
  assert.equal(bundle.baseline?.path, "Project/Session.md");
  assert.equal(bundle.newEvidenceIds?.length, 1);
  assert.equal(bundle.sources.find(source => bundle.newEvidenceIds?.includes(source.id))?.path, "Project/Research.md");
});

test("JSON escaping stays inside the complete serialized evidence budget", async () => {
  for (const text of ['"\\\n'.repeat(10000), '\\'.repeat(30000), '\n"😀'.repeat(10000)]) {
    const bundle = await buildEvidence([{ path: "Project/Quotes.md", text, metadata: {}, modifiedAt: 1 }]);
    assert.ok(JSON.stringify(bundle.sources).length <= 16000);
    assert.ok(bundle.sources.length > 0);
    assert.equal(bundle.truncated, true);
  }
});


test("latest same-date session remains in bounded Resume evidence despite long decisions",async()=>{
 const bundle=await buildEvidence([
  {path:"P/Older.md",text:"Earlier session",metadata:{type:"session",recorded_on:"2026-10-14"},modifiedAt:1},
  {path:"P/Latest.md",text:"Current session: tested both approaches",metadata:{type:"session",recorded_on:"2026-10-14"},modifiedAt:5},
  ...Array.from({length:8},(_,i)=>({path:`P/Decision${i}.md`,text:"Long reasoning ".repeat(1000),metadata:{type:"decision"},modifiedAt:10+i}))
 ],Date.parse("2026-10-14T15:00:00Z"));
 assert.equal(bundle.baseline?.path,"P/Latest.md");assert.equal(bundle.sources[0]?.path,"P/Latest.md");assert.ok(bundle.truncated);assert.ok(JSON.stringify(bundle.sources).length<=16000);
});


test("current local calendar day is eligible just after midnight",async()=>{
 const now=new Date(2026,9,15,0,30).getTime();
 const bundle=await buildEvidence([{path:"P/Today.md",text:"Just wrapped up",metadata:{type:"session",recorded_on:"2026-10-15"},modifiedAt:now}],now);
 assert.equal(bundle.baseline?.path,"P/Today.md");
 const future=await buildEvidence([{path:"P/Tomorrow.md",text:"Future record",metadata:{type:"session",recorded_on:"2026-10-16"},modifiedAt:now}],now);
 assert.equal(future.baseline,undefined);
});
