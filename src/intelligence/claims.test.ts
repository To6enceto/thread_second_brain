import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEvidence } from "../vault/evidence.ts";
import { classifyClaim, decisionContext } from "./claims.ts";
import { validateAnswer } from "./answer.ts";
import { SECTION_KEYS, validateBriefing, type Claim } from "./briefing.ts";
import { indexNote, hitsToNotes } from "../vault/index.ts";
import { savedSelection, selectionEvidence } from "../vault/selection.ts";

test("recorded postponements remain records while new recommendations remain proposals", async () => {
  const bundle = await buildEvidence([{
    path: "P/Overview.md", metadata: { type: "project" }, modifiedAt: 1,
    text: "## Constraints\nLive voice is postponed to stay within the budget."
  }]);
  const model: Claim = { text: "Live voice is postponed to stay within the budget.", kind: "suggestion", sourceIds: ["S1"] };
  assert.deepEqual(classifyClaim(model, bundle), { ...model, kind: "fact", modelKind: "suggestion" });
  assert.equal(model.kind, "suggestion", "classification must not mutate original output");
  const recommendation = { ...model, text: "Compare a text-only alternative with that budget." };
  assert.equal(classifyClaim(recommendation, bundle).kind, "suggestion");
  assert.equal(classifyClaim({ ...model, kind: "fact", text: "Voice was deferred because it costs too much." }, bundle).kind, "interpretation");
});

test("quote matching does not promote a positive substring of a negated record", async () => {
  const bundle = await buildEvidence([{
    path: "P/Source.md", metadata: { type: "source" }, modifiedAt: 1,
    text: "There is no evidence that voice is affordable.\nNo test has confirmed the hypothesis."
  }]);
  for (const text of ["voice is affordable.", "test has confirmed the hypothesis.", "Voice is definitely affordable."]) {
    assert.equal(classifyClaim({ text, kind: "fact", sourceIds: ["S1"] }, bundle).kind, "interpretation");
  }
  assert.equal(classifyClaim({ text: "There is no evidence that voice is affordable.", kind: "fact", sourceIds: ["S1"] }, bundle).kind, "fact");
  const question = { ...bundle, sources: bundle.sources.map(source => ({ ...source, noteType: "question", excerpt: "Voice is affordable?" })) };
  assert.equal(classifyClaim({ text: "Voice is affordable.", kind: "fact", sourceIds: ["S1"] }, question).kind, "interpretation", "question punctuation must not become an assertion");
});

test("a complete recorded line can contain multiple sentences without becoming a paraphrase", async () => {
  const text = "The hosting budget is 20 euros. Live voice is postponed.";
  const bundle = await buildEvidence([{ path: "P/Overview.md", metadata: { type: "project" }, modifiedAt: 1, text: `## Constraints\n${text}` }]);
  assert.equal(classifyClaim({ text, kind: "suggestion", sourceIds: ["S1"] }, bundle).kind, "fact");
  assert.equal(classifyClaim({ text: "The hosting budget is 20 euros. Live voice is approved.", kind: "fact", sourceIds: ["S1"] }, bundle).kind, "interpretation");
});

test("unknown and generated source types cannot gain recorded authority through quotation", async () => {
  for (const type of [undefined, "answer", "knowledge", "weekly-review"]) {
    const bundle = await buildEvidence([{ path: "P/Saved.md", metadata: type ? { type } : {}, modifiedAt: 1, text: "Voice is affordable." }]);
    assert.equal(classifyClaim({ text: "Voice is affordable.", kind: "fact", sourceIds: ["S1"] }, bundle).kind, "interpretation", String(type));
  }
  const bundle = await buildEvidence([{ path: "P/Overview.md", metadata: { type: "project" }, modifiedAt: 1, text: "## Arbitrary prose\nVoice is affordable." }]);
  assert.equal(classifyClaim({ text: "Voice is affordable.", kind: "fact", sourceIds: ["S1"] }, bundle).kind, "interpretation");
  const session = { ...bundle, sources: bundle.sources.map(source => ({
    ...source, noteType: "session", heading: "User-reported progress",
    excerpt: "Tested the keyboard.\n\nThe report above is user input. Context follows.\nVoice is affordable."
  })) };
  assert.equal(classifyClaim({ text: "Voice is affordable.", kind: "fact", sourceIds: ["S1"] }, session).kind, "interpretation");
  assert.equal(classifyClaim({ text: "Tested the keyboard.", kind: "fact", sourceIds: ["S1"] }, session).kind, "fact");
});

test("decision context preserves each recorded status without asserting acceptance", async () => {
  const bundle = await buildEvidence(["accepted", "proposed", "superseded"].map((status, i) => ({
    path: `P/${i}.md`, text: "## Choice\nUse text practice.", metadata: { type: "decision", status }, modifiedAt: 1
  })));
  const claim: Claim = { text: "Use text practice.", kind: "fact", sourceIds: ["S1", "S2", "S3"] };
  const context = decisionContext(claim, bundle);
  assert.match(context, /S1: accepted; S2: proposed; S3: superseded/);
  assert.match(context, /do not verify/);
  assert.equal(classifyClaim(claim, bundle).kind, "fact", "a recorded choice is not a new action");
});

test("Answer preserves original model kind while Briefing omits records from next actions", async () => {
  const bundle = await buildEvidence([{ path: "P/Overview.md", metadata: { type: "project" }, modifiedAt: 1, text: "## Constraints\nLive voice is postponed." }]);
  const claim = { text: "Live voice is postponed.", kind: "suggestion", sourceIds: ["S1"] };
  const answer = validateAnswer(JSON.stringify({ supported: true, answer: [claim], gaps: [] }), bundle);
  assert.equal(answer.answer[0]?.kind, "fact");
  assert.equal(answer.answer[0]?.modelKind, "suggestion");
  assert.match(answer.gaps.join(" "), /does not verify truth/);
  const briefing = validateBriefing(JSON.stringify({
    ...Object.fromEntries(SECTION_KEYS.map(key => [key, []])), gaps: [],
    nextActions: [claim, { ...claim, text: "Compare free text-only alternatives." }]
  }), bundle);
  assert.deepEqual(briefing.sections.nextActions.map(c => c.text), ["Compare free text-only alternatives."]);
  assert.match(briefing.gaps.join(" "), /omitted from proposed actions/);
});

test("clipped questions and qualifiers cannot become recorded assertions", async () => {
  const claim: Claim = { text: "Voice is affordable", kind: "suggestion", sourceIds: ["S1"] };
  for (const ending of ["?", " only if the untested subsidy arrives."]) {
    const bundle = await buildEvidence([{
      path: "P/Source.md", metadata: { type: "source" }, modifiedAt: 1,
      text: "x".repeat(3980) + "\n" + claim.text + ending
    }]);
    assert.ok(bundle.sources[0]!.excerpt.endsWith(claim.text), "exercise the reviewer's actual clipped edge");
    assert.equal(bundle.sources[0]!.excerptComplete, false);
    assert.equal(classifyClaim(claim, bundle).kind, "suggestion");
    assert.equal(classifyClaim({ ...claim, kind: "fact" }, bundle).kind, "interpretation");
    assert.ok(JSON.stringify(bundle.sources).length <= 16000);
  }
  const suffix = "\n## Choice\n" + claim.text;
  const noteBound = await buildEvidence([{
    path: "P/Long.md", metadata: { type: "decision" }, modifiedAt: 1,
    text: "x".repeat(50000 - suffix.length) + suffix + "?"
  }]);
  const edge = noteBound.sources.find(source => source.heading === "Choice")!;
  assert.equal(edge.excerpt, claim.text);
  assert.equal(classifyClaim({ ...claim, sourceIds: [edge.id] }, noteBound).kind, "suggestion");
});

test("focused windows, indexed chunk joins and selections do not certify original boundaries", async () => {
  const claim: Claim = { text: "Voice is affordable.", kind: "fact", sourceIds: ["S1"] };
  const focused = await buildEvidence([{
    path: "P/Source.md", metadata: { type: "source" }, modifiedAt: 1,
    text: "x".repeat(5000) + "\n" + claim.text + "\n" + "z".repeat(5000), focusTerms: ["voice", "affordable"]
  }]);
  assert.ok(focused.sources[0]!.excerpt.includes(claim.text));
  assert.ok(focused.sources[0]!.excerpt.length < 4001);
  assert.equal(focused.sources[0]!.excerptComplete, false);
  assert.equal(classifyClaim(claim, focused).kind, "interpretation");
  const raw = "x".repeat(994) + "Never " + claim.text + "\n" + "z".repeat(1400);
  const entry = await indexNote({ path: "P/Source.md", metadata: { type: "source" }, modifiedAt: 1, text: raw }, () => null);
  assert.equal(entry.truncated, false, "complete index coverage still has partial individual windows");
  assert.ok(entry.chunks[1]!.excerpt.startsWith(claim.text));
  for (const chunks of [[entry.chunks[1]!], entry.chunks]) {
    const indexed = await buildEvidence(hitsToNotes(chunks.map(chunk => ({ entry, ...chunk, score: 1 }))));
    assert.ok(indexed.sources.some(source => source.excerpt.includes(claim.text)));
    assert.equal(classifyClaim(claim, indexed).kind, "interpretation");
  }
  const from = raw.indexOf(claim.text);
  const selected = await savedSelection(entry.path, raw, raw, from, from + claim.text.length,
    { allowedPaths: ["P"], excludedPaths: [] }, [{ from: 0, to: raw.length }]);
  assert.equal(classifyClaim(claim, await selectionEvidence(selected, entry.metadata, 1)).kind, "interpretation");
  const short = await indexNote({ path: "P/Source.md", metadata: { type: "source" }, modifiedAt: 1, text: claim.text }, () => null);
  const complete = await buildEvidence(hitsToNotes([{ entry: short, ...short.chunks[0]!, score: 1 }]));
  assert.equal(classifyClaim(claim, complete).kind, "fact", "whole indexed sections still support records");
  const unknown = { ...complete, sources: complete.sources.map(({ excerptComplete: _complete, ...source }) => source) };
  assert.equal(classifyClaim(claim, unknown).kind, "interpretation", "missing boundary provenance is conservative");
});
