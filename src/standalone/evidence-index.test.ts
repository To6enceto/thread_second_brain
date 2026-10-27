import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvidenceIndex } from "./evidence-index.ts";
import { VaultReader } from "./vault-reader.ts";
import { metadata } from "./metadata.ts";
import { resolveLink } from "./links.ts";
import { contentHash } from "../vault/scope.ts";
import { frontmatter } from "../vault/workspace.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-desktop-index-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "P"));
  const reader = new VaultReader(), index = new EvidenceIndex(reader);
  let info = await reader.select(root); info = reader.grant({ roots: ["."], excluded: ["P/Private.md"] }, info.revision);
  const put = (path: string, text: string) => writeFile(join(root, path), text);
  return { root, reader, index, info, put };
}

test("desktop index reuses unchanged notes, ranks sections, and revokes changed/renamed/deleted sources", async t => {
  const f = await fixture(t);
  await f.put("P/A.md", "---\ntype: project\nid: alpha\n---\n## Objective\nCompare orchid alternatives.\n## Budget\nThe orchid budget is 20 euros.");
  await f.put("P/B.md", "## Findings\nOrchid trials are local.");
  await f.put("P/Private.md", "secret orchid");
  const initial = await f.index.refresh(f.info.revision);
  assert.equal(initial.coverage.filesRead, 2); assert.equal(initial.coverage.omittedFiles, 0);
  const found = await f.index.search('"orchid budget"', f.info.revision);
  assert.equal(found.hits.length, 1); assert.equal(found.hits[0]!.heading, "Budget");
  const old = found.hits[0]!;
  await f.put("P/B.md", "## Findings\nNew violet trials are local.");
  const changed = await f.index.refresh(f.info.revision);
  assert.equal(changed.coverage.filesRead, 1); assert.equal(changed.reused, 1);
  await f.put("P/A.md", "## Budget\nThe orchid budget is now 30 euros.");
  await assert.rejects(f.index.source(old.path, f.info.revision, old.hash), /note changed/);
  await rename(join(f.root, "P/A.md"), join(f.root, "P/Renamed.md"));
  assert.equal((await f.index.search("orchid", f.info.revision)).hits[0]!.path, "P/Renamed.md");
  await rm(join(f.root, "P/Renamed.md"));
  assert.equal((await f.index.search("orchid", f.info.revision)).hits.length, 0);
  assert.equal((await f.index.search("secret", f.info.revision)).hits.length, 0);
});

test("desktop scope reset, cancellation and malformed metadata cannot expose cached evidence", async t => {
  const f = await fixture(t);
  await f.put("P/A.md", "## Objective\norchid");
  await f.put("P/Invalid.md", "---\ntype: answer\ntype: source\n---\nsecret result");
  const first = await f.index.refresh(f.info.revision);
  assert.equal(first.invalid, 1); assert.equal(first.coverage.omittedFiles, 1);
  assert.equal((await f.index.search("secret", f.info.revision)).hits.length, 0);
  f.index.cancel(f.info.revision);
  await assert.rejects(f.index.search("orchid", f.info.revision), /stopped reading notes/i);
  await f.index.refresh(f.info.revision, true);
  const pending = f.index.refresh(f.info.revision);
  f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset();
  await assert.rejects(pending);
  assert.equal(f.index.index.entries.length, 0);
  const empty = await f.index.refresh(f.reader.getInfo()!.revision);
  assert.equal(empty.coverage.indexedFiles, 0);
  f.reader.close(); f.index.reset();
  await assert.rejects(f.index.search("orchid", f.info.revision));
});

test("desktop index keeps shortened-section coverage and omits oversized files", async t => {
  const f = await fixture(t);
  await f.put("P/Long.md", `## Introduction\n${"filler ".repeat(10000)}\n## Target\nrareorchid decision`);
  await f.put("P/Huge.md", "h".repeat(1048577));
  const snapshot = await f.index.refresh(f.info.revision);
  assert.equal(snapshot.coverage.sizeSkips, 1); assert.equal(snapshot.coverage.omittedFiles, 1);
  assert.equal(snapshot.coverage.shortenedNotes, 1);
  assert.equal((await f.index.search("rareorchid", f.info.revision)).hits[0]!.heading, "Target");
  await assert.rejects(f.index.search('"unclosed', f.info.revision), /Check the search/);
});

test("desktop cached derived output loses evidence eligibility when its source changes or is excluded", async t => {
  const f = await fixture(t), raw = "## Research\nrecorded source", hash = await contentHash(raw);
  await f.put("P/Source.md", raw);
  const refs = JSON.stringify([{ path: "P/Source.md", heading: "Research", hash, noteHash: hash }]);
  await f.put("P/Answer.md", frontmatter({ type: "answer", thread_sources: refs }) + "derivedorchid conclusion");
  assert.equal((await f.index.search("derivedorchid", f.info.revision)).hits.length, 1);
  await f.put("P/Source.md", "Changed source");
  assert.equal((await f.index.search("derivedorchid", f.info.revision)).hits.length, 0);
  await f.put("P/Source.md", raw);
  assert.equal((await f.index.search("derivedorchid", f.info.revision)).hits.length, 1);
  const next = f.reader.grant({ roots: ["."], excluded: ["P/Source.md"] }, f.info.revision); f.index.reset();
  assert.equal((await f.index.search("derivedorchid", next.revision)).hits.length, 0);
});

test("desktop omitted Markdown never establishes stable-ID uniqueness; ordinary attachments do not remove it", async t => {
  const f = await fixture(t), raw = frontmatter({ id: "source-identity", type: "source" }) + "recorded source", hash = await contentHash(raw);
  await f.put("P/Source.md", raw);
  await f.put("P/image.png", "unsupported attachment");
  const refs = JSON.stringify([{ id: "source-identity", path: "P/Source.md", heading: "", hash, noteHash: hash }]);
  await f.put("P/Answer.md", frontmatter({ type: "answer", thread_sources: refs }) + "derivedorchid conclusion");
  assert.equal((await f.index.search("derivedorchid", f.info.revision)).hits.length, 1);
  assert.equal(f.index.index.identityComplete, true);
  await f.put("P/Oversized.md", frontmatter({ id: "source-identity" }) + "x".repeat(2 * 1024 * 1024));
  const omitted = await f.index.search("derivedorchid", f.info.revision);
  assert.equal(omitted.listing.limited, false); assert.equal(omitted.listing.omittedMarkdown, 1);
  assert.equal(omitted.coverage.availableFiles, 3); assert.equal(omitted.coverage.omittedFiles, 1);
  assert.equal(f.index.index.identityComplete, false); assert.equal(omitted.hits.length, 0);
  assert.match(omitted.coverageText, /saved results that depend on note IDs are not reused/);
  await rm(join(f.root, "P/Oversized.md"));
  assert.equal((await f.index.search("derivedorchid", f.info.revision)).hits.length, 1);
  // A refused directory path can conceal an unknown number of IDs. Counts stay
  // honest (zero known omitted Markdown files) while identity reuse is withheld.
  await symlink("missing-directory", join(f.root, "P/Unavailable"));
  const unavailable = await f.index.search("derivedorchid", f.info.revision);
  assert.equal(unavailable.listing.identityIncomplete, true); assert.equal(unavailable.coverage.omittedFiles, 0);
  assert.equal(f.index.index.identityComplete, false); assert.equal(unavailable.hits.length, 0);
  const next = f.reader.grant({ roots: ["."], excluded: ["P/Unavailable"] }, f.info.revision); f.index.reset();
  assert.equal((await f.index.search("derivedorchid", next.revision)).hits.length, 1);
});

test("desktop malformed link and long-heading indexing do not delay cancellation timers", async t => {
  const f = await fixture(t);
  for (const text of ["[".repeat(120000), "# Title" + " ".repeat(120000) + "\nbody"]) {
  f.index.reset();
  await f.put("P/Malformed.md", text);
  const started = performance.now();
  const canceled = new Promise<number>(resolve => setTimeout(() => { f.index.cancel(f.info.revision); resolve(performance.now() - started); }, 100));
  const indexed = f.index.refresh(f.info.revision).catch(error => assert.equal(error.name, "AbortError"));
  assert.ok(await canceled < 1500, "a 100ms cancel timer must not wait seconds for malformed links");
  await indexed;
  assert.equal(f.index.index.ready, false); assert.equal(f.index.index.entries.length, 0);
  await assert.rejects(f.index.search("anything", f.info.revision), /stopped reading notes/i);
  }
});

test("desktop metadata supports existing YAML scalars and refuses duplicate, unknown, alias or oversized metadata", () => {
  assert.deepEqual(metadata('---\nid: "id1"\ncreated: 2026-10-21\naliases: [one, two]\n---\nbody'), { id: "id1", created: "2026-10-21", aliases: ["one", "two"] });
  for (const body of ["type: source\ntype: answer", "type: !custom source", "a: &ref [one]\nb: *ref", `title: ${"a".repeat(65536)}`]) {
    assert.throws(() => metadata(`---\n${body}\n---\nbody`));
  }
  assert.throws(() => metadata("---\ntype: answer\nbody"));
});

test("desktop link resolution reports ambiguity and never routes hidden, traversing or remote targets", () => {
  const paths = ["P/A.md", "P/B.md", "Q/B.md", "Root.md"];
  assert.deepEqual(resolveLink("P/A.md", "B#Details", paths).paths, ["P/B.md"]);
  assert.equal(resolveLink("P/A.md", "#Details", paths).heading, "Details");
  assert.equal(resolveLink("Root.md", "B", paths).paths.length, 2);
  for (const target of ["https://example.org", "file:///tmp/x.md", "../Q/B.md", "%2e%2e/Q/B.md", ".obsidian/config.md", "//host/x.md", "javascript:alert(1)"]) assert.equal(resolveLink("P/A.md", target, paths).paths.length, 0);
  assert.match(resolveLink("P/A.md", "Missing", paths).message, /No matching/);
});
