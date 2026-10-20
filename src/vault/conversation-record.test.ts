import { test } from "node:test";
import assert from "node:assert/strict";
import { createConversationRecord, conversationMarkdown, readConversationRecord, validateConversationRecord } from "./conversation-record.ts";
import { buildEvidence, readMetadata } from "./evidence.ts";
import { defaultSettings } from "../settings/settings.ts";
import type { ConversationTurn } from "../intelligence/conversation.ts";
import { FreshnessGraph, outputProjection } from "./freshness.ts";
import { indexNote } from "./index.ts";
import { contentHash } from "./scope.ts";
import { savedSelection } from "./selection.ts";
import { frontmatter } from "./workspace.ts";

const parse = (raw: string) => readMetadata(raw, yaml => Object.fromEntries(yaml.split(/\r?\n/).map(line => {
  const at = line.indexOf(":"); return [line.slice(0, at), JSON.parse(line.slice(at + 1))];
})));
const time = "2026-10-20T18:00:00.000Z";
const id = "a8bd7ae0-3643-47e7-93a3-b62088288730";
async function fixture() {
  const source = { path: "P/Source.md", text: "## Budget\nThe budget is 20 euros.", metadata: { type: "source" }, modifiedAt: 1 };
  const bundle = await buildEvidence([source]);
  const turn: ConversationTurn = { question: "FIRST_QUESTION_CANARY", answer: { supported: true, answer: [{ text: "ORIGINAL_CANARY", kind: "interpretation", modelKind: "fact", sourceIds: ["S1"] }], gaps: [] },
    corrections: { 0: { text: "CORRECTED_CANARY", kind: "suggestion", correctedAt: time } }, bundle, choices: { S1: "pin" }, generatedAt: time,
    settings: { ...defaultSettings(), model: "local", selectedProject: "P", allowedPaths: ["P"] }, vault: false, projectIdentity: "project-id" };
  const second = structuredClone(turn); second.question = "SECOND_QUESTION_CANARY";
  return { source, turn, turns: [turn, second] };
}

test("selected conversation turns round trip with provenance, corrections and original numbering", async () => {
  const { turns } = await fixture();
  const record = createConversationRecord("Research", turns, [2], id, time), raw = conversationMarkdown(record);
  assert.deepEqual(readConversationRecord(raw, parse(raw)), record);
  assert.match(raw, /## Turn 2/); assert.ok(!raw.includes("FIRST_QUESTION_CANARY"));
  assert.match(raw, /1 \(not included in this save\)/); assert.match(raw, /Original output and corrections/);
  assert.match(raw, /ORIGINAL_CANARY/); assert.match(raw, /CORRECTED_CANARY/); assert.match(raw, /S1 \(pin\)/);
  turns[1]!.corrections[0]!.text = "LATER_EDIT"; assert.ok(!raw.includes("LATER_EDIT")); assert.equal(record.turns[0]!.answer.claims[0]!.correction!.text, "CORRECTED_CANARY");
  const crlf = raw.replace(/\n/g, "\r\n"); assert.deepEqual(readConversationRecord(crlf, parse(crlf)), record);
  const all = createConversationRecord("Research", turns, [2, 1], id, time);
  assert.deepEqual(all.turns.map(turn => turn.number), [1, 2]);
  assert.equal(JSON.parse(parse(conversationMarkdown(all)).thread_sources as string).length, 1, "Duplicate source refs are shared across turns");
});

test("conversation transcripts never enter indexed prose or selection evidence, while freshness follows their actual sources", async () => {
  const { turns, source } = await fixture();
  const raw = conversationMarkdown(createConversationRecord("Research", turns, [1, 2], id, time)), metadata = parse(raw);
  const projection = outputProjection(raw, metadata); assert.equal(projection.output!.invalid, false); assert.equal(projection.text, ""); assert.deepEqual(projection.ranges, []);
  const entry = await indexNote({ path: "P/Conversations/Research.md", text: raw, metadata, modifiedAt: 1 }, () => null);
  assert.deepEqual(entry.chunks, []); assert.ok(!JSON.stringify(entry).includes("ORIGINAL_CANARY")); assert.ok(!JSON.stringify(entry).includes("CORRECTED_CANARY"));
  const bodyFrom = raw.indexOf("\n---\n") + 5, from = raw.indexOf("CORRECTED", bodyFrom);
  assert.ok(from >= bodyFrom, "Selection must target real escaped body text");
  await assert.rejects(savedSelection(entry.path, raw, raw, from, from + 5, turns[0]!.settings, projection.ranges), /eligible/);
  const original = await indexNote(source, () => null), scope = turns[0]!.settings;
  assert.equal(new FreshnessGraph([original, entry], scope).assess(entry.path).usable, true);
  assert.equal(new FreshnessGraph([{ ...original, hash: await contentHash("changed") }, entry], scope).assess(entry.path).usable, false);
  assert.equal(new FreshnessGraph([original, entry], { ...scope, excludedPaths: [source.path] }).assess(entry.path).usable, false);
  assert.equal(new FreshnessGraph([entry], scope).assess(entry.path).usable, false);
});

test("unknown versions, altered bodies, invalid per-turn metadata and substituted refs fail closed with unchanged controls", async () => {
  const { turns } = await fixture();
  const record = createConversationRecord("Research", turns, [1, 2], id, time), raw = conversationMarkdown(record), metadata = parse(raw);
  const body = raw.slice(raw.indexOf("\n---\n") + 5).replace(/^\n/, "");
  assert.equal(frontmatter(metadata as Record<string, string>) + body, raw);
  assert.equal(outputProjection(raw, metadata).output!.invalid, false);
  const changes: ((r: typeof record) => void)[] = [
    r => { Reflect.set(r, "schemaVersion", 2); }, r => { Reflect.set(r, "scope", ["project"]); },
    r => { Reflect.set(r, "extra", true); }, r => { r.turns[1]!.number = 1; },
    r => { r.turns[0]!.answer.claims[0]!.original.sourceIds = ["S99"]; },
    r => { Reflect.set(r.turns[0]!.answer.claims[0]!, "classifiedKind", ["fact"]); },
    r => { Reflect.set(r.turns[0]!.answer.claims[0]!.correction!, "kind", null); },
    r => { r.turns[0]!.evidence[0]!.path = "../Private.md"; },
    r => { r.turns[1]!.context.included = [2]; },
    r => { Reflect.set(r.turns[0]!, "choices", ["exclude"]); },
    r => { r.turns[0]!.supported = false; }
  ];
  const patches: Record<string, unknown>[] = changes.map(change => { const edited = structuredClone(record); change(edited); return { thread_conversation_record: JSON.stringify(edited) }; });
  patches.push({ thread_conversation_version: "2" }, { type: "source" }, { thread_answer_version: "1" }, { thread_sources: "[]" }, { project: "another" }, { id: crypto.randomUUID() },
    { thread_sources: JSON.stringify([{ ...JSON.parse(metadata.thread_sources as string)[0], extra: true }]) });
  for (const patch of patches) {
    const edited = frontmatter({ ...metadata, ...patch } as Record<string, string>) + body;
    assert.equal(edited.slice(edited.indexOf("\n---\n") + 5), raw.slice(raw.indexOf("\n---\n") + 5));
    const projected = outputProjection(edited, parse(edited)); assert.equal(projected.output!.invalid, true, JSON.stringify(patch)); assert.deepEqual(projected.ranges, []); assert.equal(projected.text, "");
  }
  for (const edited of [raw.replace("## Turn 1", "## Turn 5"), raw + "extra", raw.replace("<!-- /thread:conversation-record -->", ""), body]) {
    assert.equal(outputProjection(edited, parse(edited)).output!.invalid, true);
  }
});

test("unsupported turns and PDF citations are preserved without granting permissions or claiming support", async () => {
  const { turn } = await fixture();
  turn.answer = { supported: false, answer: [], gaps: ["No measurement was recorded."] }; turn.corrections = {};
  turn.bundle.sources[0]!.pdf = { path: "P/Paper.pdf", hash: "d".repeat(64), page: 3 };
  const record = createConversationRecord("Unknown result", [turn], [1], id, time), raw = conversationMarkdown(record);
  assert.deepEqual(readConversationRecord(raw, parse(raw)), record);
  assert.match(raw, /did not establish an answer/); assert.match(raw, /Paper.pdf, page 3/);
  assert.equal(record.turns[0]!.supported, false); assert.deepEqual(record.turns[0]!.answer.claims, []);
  const bad = structuredClone(record); Reflect.set(bad.turns[0]!.answer, "model", ["local"]); assert.throws(() => validateConversationRecord(bad));
  const badPage = structuredClone(record); badPage.turns[0]!.evidence[0]!.pdf!.page = 0; assert.throws(() => validateConversationRecord(badPage));
  const wide = structuredClone(turn); wide.vault = true; wide.projectIdentity = "";
  const allowed = createConversationRecord("Allowed", [wide], [1], id, time); assert.equal(allowed.projectPath, ""); assert.equal(allowed.projectIdentity, "");
  assert.equal(parse(conversationMarkdown(allowed)).project, undefined);
});

test("conversation saves reject invalid selections, oversized content, inconsistent scope and unescaped syntax", async () => {
  const { turns } = await fixture();
  for (const selected of [[], [0], [3], [1, 1], [1.5]]) assert.throws(() => createConversationRecord("Research", turns, selected, id, time));
  assert.throws(() => createConversationRecord("../Private", turns, [1], id, time));
  const changed = structuredClone(turns); changed[1]!.settings.selectedProject = "Other";
  assert.throws(() => createConversationRecord("Research", changed, [1, 2], id, time), /scope/);
  turns[0]!.corrections[0]!.text = "<script>alert(1)</script>\n![[Private]]\n<!-- thread:output {} -->";
  const raw = conversationMarkdown(createConversationRecord("Research", turns, [1], id, time)), body = raw.slice(raw.indexOf("\n---\n") + 5);
  assert.ok(!body.includes("<script>")); assert.ok(!body.includes("![[Private]]")); assert.ok(!body.includes("<!-- thread:output"));
  const oversized = createConversationRecord("Research", turns, [1], id, time);
  for (let i = 0; i < 30; i++) {
    oversized.turns[0]!.evidence.push({ ...oversized.turns[0]!.evidence[0]!, excerpt: "x".repeat(16000), heading: `Section ${i}` });
    oversized.turns[0]!.choices.push("include"); oversized.turns[0]!.answer.sourceIds.push(`S${i + 2}`);
  }
  assert.throws(() => validateConversationRecord(oversized), /256 KiB/);
  const tooManyRefs = createConversationRecord("Research", turns, [1, 2], id, time);
  for (const turn of tooManyRefs.turns) {
    turn.evidence = Array.from({ length: 51 }, (_, i) => ({ ...turn.evidence[0]!, path: `P/Source-${turn.number}-${i}.md` }));
    turn.answer.sourceIds = turn.evidence.map((_, i) => `S${i + 1}`);
    turn.choices = turn.evidence.map(() => "include");
  }
  assert.throws(() => validateConversationRecord(tooManyRefs), /100 distinct/);
});
