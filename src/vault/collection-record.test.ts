import { test } from "node:test";
import assert from "node:assert/strict";
import { captureCollection, collectionMarkdown, readCollection, resolveCollection, validateCollection, collectionCandidates, type CollectionRecord } from "./collection-record.ts";
import { buildEvidence, readMetadata, MAX_CONTEXT } from "./evidence.ts";
import { indexNote, hitsToNotes } from "./index.ts";
import { FreshnessGraph, outputProjection } from "./freshness.ts";
import { selectContext } from "./workbench.ts";
const metadata = (raw: string) => readMetadata(raw, yaml => Object.fromEntries(yaml.split(/\r?\n/).map(line => { const at = line.indexOf(":"); return [line.slice(0, at), JSON.parse(line.slice(at + 1))]; })));
const scope = { allowedPaths: ["P"], excludedPaths: [] };
async function fixture() {
  const entries = await Promise.all(["BUDGET_CANARY is 20 euros.", "VOICE_CANARY is postponed."].map((text, i) => indexNote({ path: `P/${i}.md`, text: `## Limits\n${text}`, metadata: { id: `source-${i}`, type: "source" }, modifiedAt: 1 }, () => null)));
  const bundle = await buildEvidence(hitsToNotes(entries.map(entry => ({ entry, ...entry.chunks[0]!, score: 1 }))));
  const record: CollectionRecord = { schemaVersion: 1, id: "11223344-5566-4788-9900-aabbccddeeff", title: "Research", createdAt: "2026-10-20T12:00:00.000Z", scope: "project", projectPath: "P", projectIdentity: "P", items: captureCollection(bundle, { S1: "pin", S2: "exclude" }, entries) };
  return { entries, bundle, record };
}
test("collections round trip only references and intent; index and editor projection contain no evidence", async () => {
  const { record, entries } = await fixture(), raw = collectionMarkdown(record), m = metadata(raw);
  assert.deepEqual(readCollection(raw, m), record); assert.deepEqual(readCollection(raw.replace(/\n/g, "\r\n"), metadata(raw.replace(/\n/g, "\r\n"))), record);
  assert.ok(!raw.includes("BUDGET_CANARY") && !raw.includes("VOICE_CANARY") && !raw.includes('"excerpt"'));
  assert.match(raw, /Reference 1 \(pin\)/); assert.match(raw, /Reference 2 \(exclude\)/);
  const projected = outputProjection(raw, m); assert.equal(projected.text, ""); assert.deepEqual(projected.ranges, []); assert.equal(projected.output?.invalid, false);
  const saved = await indexNote({ path: "P/Collections/Research.md", text: raw, metadata: m, modifiedAt: 1 }, () => null); assert.deepEqual(saved.chunks, []);
  const rows = await resolveCollection(record, entries, new FreshnessGraph(entries, scope)); assert.deepEqual(rows.map(r => r.state), ["current", "current"]);
  const reused = collectionCandidates(rows, new Set()); assert.deepEqual(reused.choices, { S1: "pin", S2: "exclude" }); assert.equal(selectContext(reused.bundle, reused.choices).sources.length, 1);
  assert.match(reused.bundle.sources[0]!.excerpt, /BUDGET_CANARY/);
});
test("collection versions, fields, bounds, body and identity are strict and fail closed", async () => {
  const { record } = await fixture(), raw = collectionMarkdown(record), m = metadata(raw);
  const cases: ((r: unknown) => unknown)[] = [r => ({ ...(r as object), schemaVersion: 2 }), r => ({ ...(r as object), extra: true }), r => ({ ...(r as object), scope: ["project"] }), r => ({ ...(r as object), projectPath: "../P" }), r => ({ ...(r as object), id: "not-id" }), r => ({ ...(r as object), createdAt: "2026-10-20" }), r => ({ ...(r as object), items: [] }), r => ({ ...(r as object), items: Array(51).fill(record.items[0]) })];
  for (const mutate of cases) assert.throws(() => validateCollection(mutate(structuredClone(record))));
  for (const mutate of [(r: CollectionRecord) => { r.items[0]!.choice = ["pin"] as never; }, (r: CollectionRecord) => { r.items[0]!.locator.offset = -1; }, (r: CollectionRecord) => { r.items[0]!.locator.length = 4001; }, (r: CollectionRecord) => { Object.assign(r.items[0]!.source, { excerpt: "LEAK" }); }, (r: CollectionRecord) => { r.items.push(structuredClone(r.items[0]!)); }]) { const copy = structuredClone(record); mutate(copy); assert.throws(() => validateCollection(copy)); }
  for (const updated of [{ ...m, thread_collection_version: 2 }, { ...m, id: "other" }, { ...m, project: ["P"] }, { ...m, thread_sources: "[]" }, { ...m, thread_answer_record: "{}" }]) assert.equal(outputProjection(raw, updated).output?.invalid, true);
  assert.throws(() => readCollection(raw + "changed", m)); assert.throws(() => readCollection(raw.replace("Reference 1", "Reference 9"), m));
  const tooBig = { ...record, items: Array.from({ length: 50 }, (_, i) => ({ ...record.items[0]!, source: { ...record.items[0]!.source, path: "P/" + "x".repeat(3500) + i + ".md" } })) }; assert.throws(() => validateCollection(tooBig), /128 KiB/);
});
test("renames resolve within grants; missing/excluded/ambiguous references never return old paths or contents", async () => {
  const { record, entries } = await fixture(), moved = entries.map((e, i) => ({ ...e, path: `P/Moved${i}.md` }));
  let rows = await resolveCollection(record, moved, new FreshnessGraph(moved, scope)); assert.equal(rows[0]!.state, "renamed"); assert.equal(rows[0]!.source!.path, "P/Moved0.md");
  for (const graph of [new FreshnessGraph(moved, { ...scope, excludedPaths: ["P/Moved0.md"] }), new FreshnessGraph([], scope), new FreshnessGraph([...moved, { ...moved[0]!, path: "P/Duplicate.md" }], scope), new FreshnessGraph(moved, scope, {}, false)]) {
    rows = await resolveCollection(record, moved, graph); assert.deepEqual(rows[0], { number: 1, choice: "pin", state: "unavailable" }); assert.ok(!JSON.stringify(rows[0]).includes("Moved") && !JSON.stringify(rows[0]).includes("CANARY"));
  }
  const legacy = structuredClone(record); delete legacy.items[0]!.source.id;
  rows = await resolveCollection(legacy, moved, new FreshnessGraph(moved, scope, { "P/0.md": "P/Moved0.md" })); assert.equal(rows[0]!.state, "renamed");
});
test("changed passages require explicit reconfirmation and unsafe or omitted locations stay unavailable", async () => {
  const { record, entries, bundle } = await fixture();
  const changed = await indexNote({ path: entries[0]!.path, text: "## Limits\nCURRENT_CANARY budget is 40 euros.", metadata: entries[0]!.metadata, modifiedAt: 2 }, () => null);
  const current = [changed, entries[1]!], rows = await resolveCollection(record, current, new FreshnessGraph(current, scope)); assert.equal(rows[0]!.state, "changed");
  assert.ok(!JSON.stringify(collectionCandidates(rows, new Set()).bundle).includes("CURRENT_CANARY"));
  assert.match(collectionCandidates(rows, new Set([1])).bundle.sources[0]!.excerpt, /CURRENT_CANARY/);
  assert.equal(selectContext(collectionCandidates(rows, new Set()).bundle, collectionCandidates(rows, new Set()).choices).sources.length, 0);
  const stale = { ...changed, output: { refs: [], invalid: true, title: "stale" } }; assert.equal((await resolveCollection(record, [stale], new FreshnessGraph([stale], scope)))[0]!.state, "unavailable");
  const removed = { ...changed, chunks: [{ heading: "Unrelated", excerpt: "No old section." }] }; assert.equal((await resolveCollection(record, [removed], new FreshnessGraph([removed], scope)))[0]!.state, "unavailable");
  assert.throws(() => captureCollection(bundle, {}, [changed]), /locatable/);
  const shifted = { ...entries[0]!, chunks: [{ heading: "Other", excerpt: "X" }, ...entries[0]!.chunks] }; assert.equal((await resolveCollection(record, [shifted], new FreshnessGraph([shifted], scope)))[0]!.state, "current");
});
test("collection reuse preserves finite context and never promotes stale PDF mappings", async () => {
  const { record, entries } = await fixture(), base = (await resolveCollection(record, entries, new FreshnessGraph(entries, scope)))[0]!;
  const rows = Array.from({ length: 50 }, (_, i) => ({ ...base, number: i + 1, choice: "pin" as const, source: { ...base.source!, path: `P/${i}.md`, excerpt: "x".repeat(4000) } }));
  const { bundle, choices } = collectionCandidates(rows, new Set()); const selected = selectContext(bundle, choices);
  assert.ok(selected.sources.length < 50); assert.ok(selected.sources.reduce((n, s) => n + JSON.stringify(s).length + 2, 0) <= MAX_CONTEXT);
  const pdf = structuredClone(record); pdf.items[0]!.source.pdf = { path: "P/Original.pdf", hash: "a".repeat(64), page: 1 };
  assert.equal((await resolveCollection(pdf, entries, new FreshnessGraph(entries, scope)))[0]!.state, "unavailable");
  const all = { ...record, scope: "allowed" as const, projectPath: "", projectIdentity: "" }; const raw = collectionMarkdown(all); assert.equal(readCollection(raw, metadata(raw)).scope, "allowed");
});
