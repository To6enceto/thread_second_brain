import assert from "node:assert/strict";
import { indexNote, LocalIndex } from "../vault/index.ts";
import { parseQuery, normalizeFilters, searchCoverageText } from "./search.ts";
import { searchEntries } from "./search.ts";
import { hitsToNotes } from "../vault/index.ts";
import { buildEvidence } from "../vault/evidence.ts";
import { contentHash } from "../vault/scope.ts";

const scope = { allowedPaths: ["P"], excludedPaths: ["P/Excluded.md"] };
const date = Date.parse("2026-10-14T12:00:00Z");
const make = (path: string, text: string, metadata: Record<string, unknown> = {}) => indexNote({ path, text, metadata, modifiedAt: date }, () => null);
const index = new LocalIndex();
index.replace(await Promise.all([
  make("P/Grant.md", "## Funding\nThe grant is 20 euros.", { type: "source", aliases: ["research budget"], captured_on: "2026-10-14" }),
  make("P/Other.md", "The grant is 200 euros.", { type: "source", captured_on: "2026-10-13" }),
  make("P/Choice.md", "## Choice\nUse a local model for private research.", { type: "decision", status: "proposed", decided_on: "2026-10-15" }),
  make("P/Unrelated.md", "Cloud model on a local network.", { type: "decision", status: "accepted" }),
  make("P/Excluded.md", "The grant is 20 euros.", { type: "source" }),
  make("Outside/Hidden.md", "The grant is 20 euros.", {}),
  make("P/Stale.md", "The grant is 20 euros.", { type: "answer", thread_sources: "invalid" })
]), scope);
assert.deepEqual(index.search("20", scope, "P").hits.map(hit => hit.entry.path), ["P/Grant.md"]);
assert.equal(index.search('"local model"', scope, "P").hits[0]?.entry.path, "P/Choice.md");
assert.equal(index.search('"model local"', scope, "P").hits.length, 0);
assert.equal(index.search('"research budget"', scope, "P").hits[0]?.entry.path, "P/Grant.md");
assert.equal(searchEntries([await make("P/Split aliases.md", "Unrelated body", { aliases: ["research", "budget"] })], '"research budget"').hits.length, 0);
assert.equal(index.search("research budget", scope, "P").hits[0]?.entry.path, "P/Grant.md");
assert(index.search("local research", scope, "P").hits[0]?.matchedTerms?.includes("research"));
assert.deepEqual(index.search("model", scope, "P", { type: "decision", status: "proposed" }).hits.map(hit => hit.entry.path), ["P/Choice.md"]);
assert.deepEqual(index.search("grant", scope, "P", { from: "2026-10-14", through: "2026-10-14" }).hits.map(hit => hit.entry.path), ["P/Grant.md"]);
assert.equal(index.search("grant", scope, "P", { path: "Outside" }).hits.length, 0);
assert.equal(index.search("grant", scope, "P", { path: "P/Grant.md" }).hits.length, 1);
assert(index.search("grant", scope, null).hits.every(hit => !/Excluded|Hidden|Stale/.test(hit.entry.path)));
assert.deepEqual(index.search("the and", scope, "P").hits, []);
assert.throws(() => parseQuery('"unclosed'), /Close/);
assert.throws(() => normalizeFilters({ from: "2026-02-30" }), /valid/);
assert.throws(() => normalizeFilters({ from: "2026-10-15", through: "2026-10-14" }), /starting/);
assert.throws(() => normalizeFilters({ path: "../P" }));
assert(parseQuery(Array.from({ length: 50 }, (_, n) => `word${n}`).join(" ")).truncated);
const many = new LocalIndex();
many.replace(await Promise.all([
  make("P/Long.md", Array.from({ length: 45 }, (_, n) => `## Budget ${n}\nBudget evidence ${n}.`).join("\n")),
  ...Array.from({ length: 8 }, (_, n) => make(`P/Distinct-${n}.md`, `## Budget\nDifferent budget source ${n}.`))
]), scope);
const diverse = many.search("budget", scope, "P", {}, 12);
assert.equal(new Set(diverse.hits.map(hit => hit.entry.path)).size, 9);
assert(diverse.hits.filter(hit => hit.entry.path === "P/Long.md").length <= 3);
assert(diverse.coverage.limited);
assert.equal(diverse.coverage.matchedNotes, 9);
assert(searchCoverageText(diverse.coverage).includes("complete coverage"));
const alias = await make("P/Aliases.md", "Body", { aliases: ["x".repeat(200), ...Array(30).fill("alias"), { secret: "do not serialize" }] });
assert.equal((alias.metadata.aliases as string[]).length, 20);
assert.equal((alias.metadata.aliases as string[])[0]?.length, 100);
assert(!JSON.stringify(alias.metadata).includes("do not serialize"));

// Query matches near the end of a chunk must survive multi-note context cropping.
const tail = new LocalIndex();
tail.replace(await Promise.all(Array.from({ length: 12 }, (_, n) => make(`P/Tail-${n}.md`, "x ".repeat(475) + "The grant is 20 euros."))), scope);
const tailHits = tail.search("grant 20", scope, "P").hits;
assert.equal(tailHits.length, 12);
const tailContext = await buildEvidence(hitsToNotes(tailHits));
assert.equal(tailContext.sources.length, 12);
assert(tailContext.sources.every(source => source.excerpt.includes("The grant is 20 euros.")));
assert(JSON.stringify(tailContext.sources).length <= 16000);
for (const source of tailContext.sources) assert.equal(source.contentHash, await contentHash(source.excerpt));

const escaped = new LocalIndex();
escaped.replace(await Promise.all(Array.from({ length: 12 }, (_, n) => make(`P/Escaped-${n}.md`, '\\"😀'.repeat(230) + "The grant is 20 euros."))), scope);
const escapedContext = await buildEvidence(hitsToNotes(escaped.search("grant 20", scope, "P").hits));
assert(escapedContext.sources.length > 0);
assert(escapedContext.sources.every(source => source.excerpt.includes("grant is 20")));
assert(JSON.stringify(escapedContext.sources).length <= 16000);

const phraseTail = new LocalIndex();
phraseTail.replace(await Promise.all(Array.from({ length: 12 }, (_, n) => make(`P/Phrase-${n}.md`, "research x budget " + "x ".repeat(460) + "The research budget is 20 euros."))), scope);
const phraseHits = phraseTail.search('"research budget"', scope, "P").hits;
assert.equal(phraseHits.length, 12);
const phraseContext = await buildEvidence(hitsToNotes(phraseHits));
assert.equal(phraseContext.sources.length, 12);
assert(phraseContext.sources.every(source => source.excerpt.includes("The research budget is 20 euros.")));
assert(JSON.stringify(phraseContext.sources).length <= 16000);

const stopPhrase = new LocalIndex();
stopPhrase.replace(await Promise.all(Array.from({ length: 12 }, (_, n) => make(`P/Stop-${n}.md`, "x ".repeat(470) + "Whether to be available is undecided."))), scope);
const stopContext = await buildEvidence(hitsToNotes(stopPhrase.search('"to be"', scope, "P").hits));
assert.equal(stopContext.sources.length, 12);
assert(stopContext.sources.every(source => source.excerpt.includes("to be available")));

const focusedNotes = Array.from({ length: 12 }, (_, n) => ({ path: `P/Focused-${n}.md`, text: n === 0
  ? "alpha beta " + "x ".repeat(510) + "gamma delta" : "alpha beta and gamma delta are recorded together.",
  metadata: {}, modifiedAt: 1, relevance: n === 0 ? 100 : 10, focusTerms: ["alpha", "beta", "gamma", "delta"], focusPhrases: ["alpha beta", "gamma delta"] }));
const fitting = await buildEvidence(focusedNotes);
assert(!fitting.sources.some(source => source.path === "P/Focused-0.md"));
assert.equal(fitting.sources.length, 11); // An over-wide required span must not block other fitting evidence.
assert(fitting.sources.every(source => source.excerpt.includes("alpha beta") && source.excerpt.includes("gamma delta")));

for (const [raw, query] of [["cafe\u0301", "café"], ["oﬃce", "office"], ["¼", "1 4"], ["℀", "a c"], ["ΟΣ", "ος"], ["İstanbul", "İstanbul"]]) {
 const unicode = new LocalIndex();
 const sentence = `The ${raw} is 20 euros.`;
 unicode.replace(await Promise.all(Array.from({ length: 12 }, (_, n) => make(`P/Unicode-${n}.md`, "x ".repeat(475) + sentence))), scope);
 for (const text of [query!, `"${query}"`]) {
  const found = unicode.search(text, scope, "P"); assert.equal(found.hits.length, 12);
  const context = await buildEvidence(hitsToNotes(found.hits));
  assert.equal(context.sources.length, 12);
  assert(context.sources.every(source => source.excerpt.includes(sentence)), `Normalized query lost raw evidence: ${text}`);
  assert(JSON.stringify(context.sources).length <= 16000);
  for (const source of context.sources) assert.equal(source.contentHash, await contentHash(source.excerpt));
 }
}
