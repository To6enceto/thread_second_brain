import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "../settings/settings.ts";
import { buildEvidence } from "../vault/evidence.ts";
import { conversationContext, conversationPrompt, snapshotTurn, MAX_CONVERSATION_CONTEXT, MAX_CONVERSATION_PROMPT, type ConversationTurn } from "./conversation.ts";
import { validateAnswer } from "./answer.ts";

const bundle = await buildEvidence([{ path: "P/Source.md", text: "# Budget\n\nBudget is 20 euros.", metadata: { type: "source" }, modifiedAt: 1 }]);
const turn: ConversationTurn = {
  question: "What is the budget?",
  answer: { supported: true, answer: [{ text: "Budget is 20 euros.", kind: "fact", sourceIds: ["S1"] }], gaps: [] },
  corrections: {}, bundle, choices: { S1: "pin" }, generatedAt: "2026-10-20T18:00:00.000Z",
  settings: { ...defaultSettings(), model: "local", selectedProject: "P" }, vault: false, projectIdentity: "P"
};

test("conversation snapshots preserve original claims and reviewed corrections without sharing mutable state", () => {
  const input = structuredClone(turn);
  input.corrections[0] = { text: "Check the budget.", kind: "suggestion", correctedAt: input.generatedAt };
  const frozen = snapshotTurn(input, 0);
  input.corrections[0]!.text = "MUTATION";
  input.bundle.sources[0]!.excerpt = "MUTATION";
  assert.equal(frozen.answer.answer[0]!.text, "Budget is 20 euros.");
  assert.equal(frozen.corrections[0]!.text, "Check the budget.");
  assert.equal(frozen.bundle.sources[0]!.excerpt, "Budget is 20 euros.");
  assert.throws(() => snapshotTurn(turn, 6), /limit/);
  assert.throws(() => snapshotTurn({ ...turn, corrections: { 0: { text: " ", kind: "fact", correctedAt: turn.generatedAt } } }, 0), /nonempty/);
});

test("earlier AI has no citation IDs and cannot reintroduce excluded, changed, clipped or differently headed evidence", () => {
  const changedIds = structuredClone(bundle); changedIds.sources[0]!.id = "S7";
  const { prompt, context } = conversationPrompt("Why?", changedIds, [turn]);
  assert.equal(context.turns.length, 1);
  assert.ok(!context.serialized.includes("sourceIds"));
  assert.deepEqual(JSON.parse(prompt).evidence.map((s: { id: string }) => s.id), ["S7"]);
  assert.equal(validateAnswer(JSON.stringify({ supported: true, answer: [{ text: "Prior answer", kind: "fact", sourceIds: ["S1"] }], gaps: [] }), changedIds).supported, false);
  for (const mutate of [
    (b: typeof bundle) => { b.sources = []; },
    (b: typeof bundle) => { b.noteHashes["P/Source.md"] = "0".repeat(64); },
    (b: typeof bundle) => { b.sources[0]!.excerpt = "Budget is 20"; },
    (b: typeof bundle) => { b.sources[0]!.heading = "Other"; }
  ]) {
    const current = structuredClone(bundle); mutate(current);
    const result = conversationPrompt("Why?", current, [turn]);
    assert.equal(result.context.serialized, "[]");
    assert.deepEqual(result.context.omitted, [{ turn: 1, reason: "evidence selection" }]);
    assert.ok(!JSON.stringify(JSON.parse(result.prompt).earlierConversation).includes("20 euros"));
  }
  const dependency = structuredClone(turn); dependency.bundle.noteHashes["P/Dependency.md"] = "1".repeat(64);
  assert.equal(conversationContext([dependency], bundle).turns.length, 0);
});

test("context keeps whole recent turns, reports omissions and bounds the serialized prompt", () => {
  const oversized = structuredClone(turn); oversized.answer.gaps = Array.from({ length: 12 }, () => "gap".repeat(400));
  const corrected = structuredClone(turn); corrected.corrections[0] = { text: "NOT an accepted budget.", kind: "interpretation", correctedAt: turn.generatedAt };
  const unsupported = structuredClone(turn); unsupported.answer = { supported: false, answer: [], gaps: ["No evidence for hosting location."] };
  const result = conversationPrompt("What remains unknown?", bundle, [turn, oversized, corrected, snapshotTurn(unsupported, 3)]);
  assert.deepEqual(result.context.turns.map(t => t.turn), [1, 3, 4]);
  assert.deepEqual(result.context.omitted, [{ turn: 2, reason: "character budget" }]);
  assert.match(result.context.serialized, /NOT an accepted budget/);
  assert.equal(result.context.turns[1]!.claims[0]!.userCorrected, true);
  assert.ok(result.context.serialized.length <= MAX_CONVERSATION_CONTEXT);
  assert.ok(result.prompt.length <= MAX_CONVERSATION_PROMPT);
  assert.throws(() => conversationPrompt("Why?", bundle, Array(6).fill(turn)), /limit/);
  const huge = structuredClone(bundle); huge.sources[0]!.excerpt = "x".repeat(MAX_CONVERSATION_PROMPT);
  assert.throws(() => conversationPrompt("Why?", huge, []), /24000/);
});
