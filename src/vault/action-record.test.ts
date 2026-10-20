import { test } from "node:test";
import assert from "node:assert/strict";
import { actionMarkdown, actionProjection, newAction, readAction, transitionAction, validateAction } from "./action-record.ts";
import { outputProjection } from "./freshness.ts";
import { buildEvidence, type EvidenceBundle } from "./evidence.ts";
import { indexNote, LocalIndex } from "./index.ts";
import { defaultSettings } from "../settings/settings.ts";

const empty: EvidenceBundle = { sources: [], noteHashes: {}, truncated: false };
const now = new Date("2026-10-20T12:00:00.000Z"), day = "2026-10-20";
function meta(raw: string): Record<string, unknown> {
  return Object.fromEntries(raw.split(/\r?\n---(?:\r?\n|$)/)[0]!.split("\n").filter(l => /^\w+: /.test(l)).map(l => { const at = l.indexOf(": "); return [l.slice(0, at), JSON.parse(l.slice(at + 2).trim())]; }));
}
test("actions retain every explicit transition, reopen Done and preserve custom header bytes and CRLF", () => {
  let raw = actionMarkdown(newAction("project", "Test $& budget", "Chosen deliberately", day, empty, now)).replace("type: ", 'custom: ["preserve", "me"]\n# user comment\ntype: ');
  const original = readAction(raw, meta(raw));
  for (const to of ["in-progress", "blocked", "done", "planned"] as const) {
    const previous = raw;
    raw = transitionAction(raw, meta(raw), to, `User reason $& ${to}`, day, empty, now);
    const record = readAction(raw, meta(raw));
    assert.deepEqual(record.history.slice(0, -1), readAction(previous, meta(previous)).history);
    assert.equal(record.status, to); assert.equal(record.title, original.title); assert.equal(record.id, original.id);
    assert.ok(raw.includes('custom: ["preserve", "me"]\n# user comment\n'));
    assert.equal(record.history.at(-1)!.reason, `User reason $& ${to}`);
  }
  assert.equal(readAction(raw, meta(raw)).history.length, 5);
  const crlf = raw.replace(/\n/g, "\r\n"), after = transitionAction(crlf, meta(crlf), "done", "Explicit completion", day, empty, now);
  assert.equal(after.replace(/\r\n/g, "").includes("\n"), false); assert.equal(readAction(after, meta(after)).status, "done");
});
test("transitions never replace managed-line lookalikes inside earlier custom YAML scalars or comments", () => {
  const base = actionMarkdown(newAction("p", "Choose a test", "Explicit", day, empty, now));
  for (const line of [`custom: 'status: "planned"'`, `# example status: "planned"`]) {
    for (const newline of ["\n", "\r\n"]) {
      const before = base.replace('id: ', line + "\nid: ").replace(/\n/g, newline);
      const metadata = { ...meta(base), ...(line.startsWith("custom:") ? { custom: 'status: "planned"' } : {}) };
      const original = readAction(before, metadata);
      const after = transitionAction(before, metadata, "done", "Explicit report", day, empty, now);
      assert.ok(after.includes(line + newline), "unrelated exact bytes must stay unchanged");
      const afterMetadata: Record<string, unknown> = { ...meta(after.replace(line + newline, "")), ...(metadata.custom ? { custom: metadata.custom } : {}) };
      assert.equal(afterMetadata.status, "done");
      const record = readAction(after, afterMetadata);
      assert.equal(record.status, "done"); assert.deepEqual(record.history.slice(0, -1), original.history);
    }
  }
});
test("action parser refuses malformed enums, history, oversized references and hand-edited canonical data", () => {
  const valid = newAction("p", "Do a test", "Explicit", day, empty, now), raw = actionMarkdown(valid), metadata = meta(raw);
  const variants = [
    { ...valid, status: ["planned"] }, { ...valid, id: "legacy" }, { ...valid, title: "two\nlines" }, { ...valid, extra: true },
    { ...valid, history: [] }, { ...valid, history: [{ ...valid.history[0], to: "done" }] },
    { ...valid, history: [...valid.history, { ...valid.history[0], from: "planned", to: "done", day: "2026-10-19" }] },
    { ...valid, history: [{ ...valid.history[0], reason: "x".repeat(2001) }] }
  ];
  variants.forEach(v => assert.throws(() => validateAction(v)));
  assert.throws(() => transitionAction(raw, metadata, "planned", "Same", day, empty, now));
  assert.throws(() => newAction("p", "T", "R", "2026-10-21", empty, now));
  assert.throws(() => readAction(raw.replace("Chosen deliberately", "Other") + "\nManual text", metadata));
  assert.throws(() => readAction(raw.replace('status: "planned"', 'status: "done"\nstatus: "planned"'), metadata));
  assert.throws(() => readAction(raw.replace('status: "planned"', 'status: "planned"\n  hidden: value'), metadata));
  assert.throws(() => readAction(raw, { ...metadata, thread_conversation_version: "1" }));
  assert.equal(outputProjection(raw + "Unexpected", metadata).text, "");
  assert.equal(outputProjection(raw, { ...metadata, thread_action_version: 9 }).output?.invalid, true);
});
test("action history limits refuse loss instead of pruning, including byte and snapshot bounds", () => {
  let record = newAction("p", "T", "R", day, empty, now);
  for (let i = 1; i < 64; i++) {
    const to = record.status === "planned" ? "done" : "planned";
    record = validateAction({ ...record, status: to, history: [...record.history, { from: record.status, to, day, recordedAt: now.toISOString(), reason: "R", sources: [] }] });
  }
  const raw = actionMarkdown(record);
  assert.throws(() => transitionAction(raw, meta(raw), "planned", "65th", day, empty, now));
  const ref = { path: "P/S.md", heading: "", hash: "a".repeat(64), noteHash: "b".repeat(64) };
  assert.throws(() => validateAction({ ...record, history: record.history.map(h => ({ ...h, sources: [ref, ref] })) }));
  assert.throws(() => validateAction({ ...record, history: record.history.map(h => ({ ...h, reason: "界".repeat(2000) })) }));
});
test("action source projection omits reference/private JSON, and current graph blocks stale or excluded support", async () => {
  const source = { path: "P/Source.md", text: "# Budget\n20 euros", metadata: { id: "source-id", type: "source" }, modifiedAt: 1 };
  const bundle = await buildEvidence([source]), record = newAction("p", "Compare budget", "I plan this test", day, bundle, now), raw = actionMarkdown(record);
  const projection = actionProjection(raw, meta(raw));
  assert.ok(projection.text.includes("I plan this test")); assert.ok(!projection.text.includes("20 euros"));
  assert.ok(!projection.text.includes("Source.md")); assert.ok(!projection.text.includes("thread_action_record"));
  assert.ok(raw.includes("](<P/Source.md#Budget>)")); assert.ok(!raw.includes('"excerpt"'));
  assert.equal(raw.slice(projection.ranges[0]!.from, projection.ranges[0]!.to), projection.text);
  const action = { path: "P/Actions/Test.md", text: raw, metadata: meta(raw), modifiedAt: 1 };
  const entries = await Promise.all([source, action].map(s => indexNote(s, () => null)));
  const settings = { ...defaultSettings(), selectedProject: "P", allowedPaths: ["P"] }, index = new LocalIndex(); index.replace(entries, settings);
  assert.equal(index.graph(settings).assess(action.path).usable, true);
  assert.equal(index.graph({ ...settings, excludedPaths: [source.path] }).assess(action.path).usable, false);
  index.replace([await indexNote({ ...source, text: "# Budget\n40 euros" }, () => null), entries[1]!], settings);
  assert.equal(index.graph(settings).assess(action.path).usable, false);
  assert.deepEqual(record.history[0]!.sources, projection.refs);
});
