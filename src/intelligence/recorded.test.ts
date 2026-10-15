import assert from "node:assert/strict";
import { buildEvidence } from "../vault/evidence.ts";
import { recordedBriefing, composeBriefing } from "./recorded.ts";

const now = Date.parse("2026-10-15T12:00:00Z");
const note = (path: string, text: string, metadata: Record<string, unknown> = {}) => ({ path, text, metadata, modifiedAt: now });
const bundle = await buildEvidence([
  note("Projects/Test/Overview.md", "## Objective\nCompare heat measurements.\n## Planned work\nInterview three people next week.\n## Open questions\nWhich block has shade?", { type: "project", goal: "Record accurate measurements." }),
  note("Projects/Test/Choice.md", "# A choice\nAn alternative.\n## Choice\nUse a local sensor.", { type: "decision", status: "proposed" }),
  note("Projects/Test/Old.md", "# Choice\nUse a cloud sensor.", { type: "decision", status: "superseded" }),
  note("Projects/Test/Session.md", "## User-reported progress\nMeasured one block.\n\nThe report above is user input.\n\nDo not include this boilerplate.", { type: "session", recorded_on: "2026-10-14" }),
  note("Projects/Test/Future.md", "## User-reported progress\nThis is future-dated.", { type: "session", recorded_on: "2027-01-01" }),
  note("Projects/Test/Source.md", "## Objective\nUnrelated source objective.", { type: "source" })
], now);
const records = recordedBriefing(bundle, now);
assert.equal(records.sections.objective.length, 2);
assert(records.sections.objective.some(c => c.text === "Record accurate measurements."));
assert(records.sections.objective.every(c => !c.text.includes("Unrelated")));
assert.equal(records.sections.openQuestions[0]?.text, "Recorded question: Which block has shade?");
assert(records.sections.decisions.some(c => c.text === "proposed: Use a local sensor."));
assert(records.sections.decisions.some(c => c.text === "superseded: Use a cloud sensor."));
assert.equal(records.sections.lastActivity[0]?.text, "User-reported progress: Measured one block.");
assert.equal(records.sections.lastActivity.length, 1);
assert.equal(records.sections.nextActions.length, 0);
const property = bundle.sources.find(s => s.property === "goal");
assert.equal(property?.heading, ""); // Open the actual note, not an invented heading.
assert(property && records.sections.objective.some(c => c.sourceIds.includes(property.id)));
const planned = await buildEvidence([note("Overview.md", "## Objective\nTest keyboard exercises.\n## Planned work\nPlan to interview three people.")], now);
assert.equal(recordedBriefing(planned, now).sections.lastActivity.length, 0);
const unknown = recordedBriefing(await buildEvidence([note("Legacy.md", "The project is probably done.")], now), now);
assert.equal(unknown.sections.objective.length, 0);
assert.equal(unknown.sections.lastActivity.length, 0);
assert(unknown.gaps.some(g => g.includes("No recognized")));
const model = structuredClone(records);
model.sections.decisions = [{ text: "Everything is accepted.", kind: "fact", sourceIds: ["S1"] }];
model.sections.nextActions = [{ text: "Compare the sensors.", kind: "fact", sourceIds: ["S1"] }];
const composed = composeBriefing(records, model);
assert.deepEqual(composed.briefing.sections.decisions, records.sections.decisions);
assert(composed.interpretations.every(c => c.kind === "interpretation"));
assert.equal(composed.briefing.sections.nextActions[0]?.kind, "suggestion");

const oldTimezone = process.env.TZ;
try {
  process.env.TZ = "Europe/Sofia";
  const midnight = Date.parse("2026-10-14T21:30:00Z"); // 00:30 on the local 15th.
  const today = await buildEvidence([{ ...note("Today.md", "## User-reported progress\nLocal midnight report.", { type: "session", recorded_on: "2026-10-15" }), modifiedAt: midnight }], midnight);
  assert.equal(today.baseline?.path, "Today.md");
  assert.equal(recordedBriefing(today, midnight).sections.lastActivity[0]?.text, "User-reported progress: Local midnight report.");
  const sameDay = await buildEvidence([
    { ...note("A-early.md", "## User-reported progress\nEarlier report.", { type: "session", recorded_on: "2026-10-15" }), modifiedAt: now - 1000 },
    note("Z-latest.md", "## User-reported progress\nLatest report.", { type: "session", recorded_on: "2026-10-15" })
  ], now);
  assert.equal(sameDay.baseline?.path, "Z-latest.md");
  const latest = recordedBriefing(sameDay, now).sections.lastActivity[0];
  assert.equal(latest?.text, "User-reported progress: Latest report.");
  assert.equal(sameDay.sources.find(s => s.id === latest?.sourceIds[0])?.path, sameDay.baseline?.path);
  const reviewBaseline = await buildEvidence([
    { ...note("A-early.md", "## User-reported progress\nEarlier report.", { type: "session", recorded_on: "2026-10-14" }), modifiedAt: now - 1000 },
    note("Z-latest.md", "## User-reported progress\nLatest report.", { type: "session", recorded_on: "2026-10-14" }),
    note("Review.md", "## Review\nA later review.", { type: "review", generated_on: "2026-10-15" })
  ], now);
  assert.equal(reviewBaseline.baseline?.path, "Review.md");
  assert.equal(recordedBriefing(reviewBaseline, now).sections.lastActivity[0]?.text, "User-reported progress: Latest report.");
} finally {
  if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone;
}
