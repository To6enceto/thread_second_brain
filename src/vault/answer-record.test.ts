import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvidence, readMetadata } from "./evidence.ts";
import { createAnswerRecord, reviewedAnswerMarkdown, validateAnswerRecord } from "./answer-record.ts";
import { answerMarkdown, sourceReferences, type Answer } from "../intelligence/answer.ts";
import { FreshnessGraph, outputProjection } from "./freshness.ts";
import { indexNote } from "./index.ts";
import { frontmatter } from "./workspace.ts";
import { contentHash } from "./scope.ts";
import { savedSelection } from "./selection.ts";

const metadata = (raw: string) => readMetadata(raw, yaml => Object.fromEntries(yaml.split(/\r?\n/).map(line => {
  const at = line.indexOf(":"); return [line.slice(0, at), JSON.parse(line.slice(at + 1))];
})));
const generatedAt = "2026-10-20T12:00:00.000Z", correctedAt = "2026-10-20T12:01:00.000Z";
async function fixture() {
  const source = { path: "P/Source.md", text: "## Choice\nVoice is proposed.", metadata: { type: "decision", status: "proposed" }, modifiedAt: 1 };
  const bundle = await buildEvidence([source]);
  bundle.sources[0]!.id = "S3"; // Excluding/pinning other passages need not leave consecutive IDs.
  const answer: Answer = { supported: true, answer: [{ text: "ORIGINAL_MODEL_CANARY", kind: "interpretation", modelKind: "fact", sourceIds: ["S3"] }], gaps: ["No measured result."] };
  const corrections = { 0: { text: "Compare the proposed voice approach.", kind: "suggestion" as const, correctedAt } };
  const record = createAnswerRecord("What should we do?", answer, bundle, "local", generatedAt, corrections);
  return { source, bundle, answer, corrections, record, raw: reviewedAnswerMarkdown(record, bundle, "p") };
}

test("reviewed answer round trips retain originals and project only the current correction", async () => {
  const { bundle, answer, corrections, record, raw } = await fixture();
  assert.equal(record.claims[0]!.original.kind, "fact");
  assert.equal(record.claims[0]!.classifiedKind, "interpretation");
  assert.match(raw, /Original model \(fact\): ORIGINAL/);
  assert.match(raw, /User correction - Proposed action/);
  assert.match(raw, /S3: proposed/);
  corrections[0].text = "Later draft edit";
  assert.equal(record.claims[0]!.correction?.text, "Compare the proposed voice approach.");
  assert.equal(answer.answer[0]!.text, "ORIGINAL_MODEL_CANARY");
  const m = metadata(raw), projected = outputProjection(raw, m);
  assert.equal(projected.output?.invalid, false);
  assert.match(projected.text, /Compare the proposed voice approach/);
  assert.ok(!projected.text.includes("ORIGINAL_MODEL_CANARY"));
  assert.equal(raw.slice(projected.ranges[0]!.from, projected.ranges[0]!.to), projected.text);
  const index = await indexNote({ path: "P/Answer.md", text: raw, metadata: m, modifiedAt: 1 }, () => null);
  assert.ok(!JSON.stringify(index).includes("ORIGINAL_MODEL_CANARY"), "original history stays out of index and selection");
  const from = raw.indexOf("Original model (fact)");
  await assert.rejects(savedSelection("P/Answer.md", raw, raw, from, from + 20, { allowedPaths: ["P"], excludedPaths: [] }, projected.ranges), /eligible/);
  const crlf = raw.replace(/\n/g, "\r\n"), converted = outputProjection(crlf, metadata(crlf));
  assert.equal(converted.text, projected.text);
  assert.equal(crlf.slice(converted.ranges[0]!.from, converted.ranges[0]!.to).replace(/\r\n/g, "\n"), projected.text);
  assert.deepEqual(validateAnswerRecord(JSON.parse(m.thread_answer_record as string), sourceReferences(bundle)), record);
});

test("unknown, malformed or changed managed answer records cannot become ordinary source evidence", async () => {
  const { raw, record } = await fixture(), m = metadata(raw);
  const body = raw.slice(raw.indexOf("\n---\n") + 5).replace(/^\n/, "");
  const unchanged = frontmatter(m as Record<string, string>) + body;
  assert.equal(unchanged, raw, "metadata mutation setup must preserve a valid unchanged control");
  assert.equal(outputProjection(unchanged, metadata(unchanged)).output?.invalid, false);
  const mutations: Record<string, unknown>[] = [
    { thread_answer_version: "2" }, { thread_answer_record: "{}" }, { type: "source" },
    { thread_sources: "[]" }, { thread_question_version: "1" }, { thread_model: "different" },
    { thread_answer_record: JSON.stringify({ ...record, sourceIds: ["S1"] }) },
    { thread_answer_record: JSON.stringify({ ...record, extra: true }) },
    { thread_answer_record: JSON.stringify({ ...record, claims: [{ ...record.claims[0], correction: { text: "", kind: "fact", correctedAt } }] }) }
  ];
  for (const patch of mutations) {
    const altered = { ...m, ...patch };
    const text = frontmatter(altered as Record<string, string>) + body;
    const projected = outputProjection(text, metadata(text));
    assert.equal(projected.output?.invalid, true, JSON.stringify(patch));
    assert.equal(projected.text, "");
    assert.deepEqual(projected.ranges, []);
  }
  for (const altered of [
    raw.replace("## Reviewed answer", "## Changed answer"), raw.replace("Original model (fact)", "Original model (suggestion)"),
    raw.replace("<!-- /thread:answer-record -->", ""), raw + "\n<!-- thread:output {} -->\n",
    "# Manual note\n" + body
  ]) assert.equal(outputProjection(altered, metadata(altered)).output?.invalid, true);
});

test("persisted classification fields require primitive strings without coercion", async () => {
  const { raw, record, bundle } = await fixture(), m = metadata(raw);
  const body = raw.slice(raw.indexOf("\n---\n") + 5).replace(/^\n/, "");
  for (const target of ["original", "classifiedKind", "correction"]) for (const shape of ["array", "object", "null"]) {
    const malformed = structuredClone(record) as unknown as { claims: { original: {kind: unknown}; classifiedKind: unknown; correction: {kind: unknown} }[] };
    const claim = malformed.claims[0]!;
    const invalid = (kind: unknown) => shape === "array" ? [kind] : shape === "object" ? { kind } : null;
    if (target === "classifiedKind") claim.classifiedKind = invalid(claim.classifiedKind);
    else if (target === "original") claim.original.kind = invalid(claim.original.kind);
    else claim.correction.kind = invalid(claim.correction.kind);
    assert.throws(() => validateAnswerRecord(malformed, sourceReferences(bundle)), /claim|classification/);
    const edited = frontmatter({ ...m, thread_answer_record: JSON.stringify(malformed) } as Record<string, string>) + body;
    assert.equal(edited.slice(edited.indexOf("\n---\n") + 5), raw.slice(raw.indexOf("\n---\n") + 5), "only metadata changes");
    const projected = outputProjection(edited, metadata(edited));
    assert.equal(projected.output?.invalid, true, target);
    assert.equal(projected.text, "", target);
    assert.deepEqual(projected.ranges, [], target);
  }
});

test("correction limits reject invalid classifications, citations, timestamps and oversized drafts", async () => {
  const { record, bundle, answer } = await fixture(), refs = sourceReferences(bundle);
  for (const correction of [
    { text: " ", kind: "fact", correctedAt }, { text: "x".repeat(1201), kind: "fact", correctedAt },
    { text: "Text", kind: "verified", correctedAt }, { text: "Text", kind: "fact", correctedAt: "yesterday" },
    { text: "Text", kind: "fact", correctedAt, sourceIds: ["S9"] }
  ]) assert.throws(() => validateAnswerRecord({ ...record, claims: [{ ...record.claims[0], correction }] }, refs));
  assert.throws(() => validateAnswerRecord({ ...record, claims: Array(7).fill(record.claims[0]) }, refs));
  assert.throws(() => validateAnswerRecord({ ...record, claims: [{ ...record.claims[0], original: { ...record.claims[0]!.original, sourceIds: ["S999"] } }] }, refs));
  assert.throws(() => validateAnswerRecord({ ...record, gaps: ["x".repeat(70000)] }, refs));
  assert.throws(() => createAnswerRecord("Q", answer, bundle, "local", generatedAt, { 5: { text: "Orphan", kind: "fact", correctedAt } }));
});

test("correction rendering escapes user syntax and retains transitive freshness with legacy compatibility", async () => {
  const { record, bundle, source, answer } = await fixture();
  record.claims[0]!.correction!.text = "![[Private]]\n<!-- thread:output {} -->\n<script>alert(1)</script>";
  const raw = reviewedAnswerMarkdown(record, bundle), m = metadata(raw);
  assert.ok(!raw.slice(raw.indexOf("\n---\n") + 5).includes("![[Private]]"));
  assert.equal(outputProjection(raw, m).output?.invalid, false);
  const original = await indexNote(source, () => null), saved = await indexNote({ path: "P/Answer.md", text: raw, metadata: m, modifiedAt: 1 }, () => null);
  const scope = { allowedPaths: ["P"], excludedPaths: [] };
  assert.equal(new FreshnessGraph([original, saved], scope).assess(saved.path).usable, true);
  assert.equal(new FreshnessGraph([{ ...original, hash: await contentHash("changed") }, saved], scope).assess(saved.path).usable, false);
  assert.equal(new FreshnessGraph([original, saved], { ...scope, excludedPaths: [original.path] }).assess(saved.path).usable, false);
  const legacy = answerMarkdown("Legacy", answer, bundle, "local");
  assert.equal(outputProjection(legacy, metadata(legacy)).output?.invalid, false);
});
