import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { frontmatter } from "../vault/workspace.ts";
import { contentHash } from "../vault/scope.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-projects-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["Projects/A", "Projects/B", "Projects/Private", "Sources"]) await mkdir(join(root, dir), { recursive: true });
  const put = (path: string, text: string) => writeFile(join(root, path), text);
  await put("Projects/A/Overview.md", frontmatter({ type: "project", id: "alpha" }) + "## Objective\nCompare orchids.\n## Open questions\nWhich orchid?");
  await put("Projects/B/Overview.md", "## Objective\nCompare violets.");
  await put("Projects/Private/Overview.md", frontmatter({ type: "project" }) + "secret");
  const reader = new VaultReader(), index = new EvidenceIndex(reader), projects = new DesktopProjects(reader, index);
  let info = await reader.select(root); info = reader.grant({ roots: ["Projects", "Sources"], excluded: ["Projects/Private"] }, info.revision);
  const selection = { folder: "Projects", project: "Projects/A" };
  return { root, put, reader, index, projects, info, selection };
}

test("desktop home maps permitted projects without granting access and records dates/statuses honestly", async t => {
  const f = await fixture(t);
  await f.put("Projects/A/Session.md", frontmatter({ type: "session", recorded_on: "2026-10-20" }) + "## User-reported progress\nCompared two orchids.");
  await f.put("Projects/A/Undated.md", frontmatter({ type: "session" }) + "A plan only.");
  await f.put("Projects/A/Decision.md", frontmatter({ type: "decision", status: "proposed", decided_on: "2026-10-21" }) + "## Choice\nTry orchids.");
  const before = f.reader.getInfo();
  const home = await f.projects.home(f.selection, f.info.revision);
  assert.deepEqual(home.projects, ["Projects/A", "Projects/B"]);
  assert.deepEqual(f.reader.getInfo(), before);
  assert.equal(home.home?.counts.sessions, 2); assert.equal(home.home?.counts.questions, 1);
  assert.match(home.home!.sessions[0]!.text, /recorded 2026-10-20/);
  assert.match(home.home!.sessions[1]!.text, /event date unknown/);
  assert.match(home.home!.decisions[0]!.text, /proposed - recorded/);
  const result = await f.projects.resume(f.selection, f.info.revision, Date.parse("2026-10-22T12:00:00Z"));
  assert.match(result.recorded.sections.objective[0]!.text, /Compare orchids/);
  assert.match(result.recorded.sections.lastActivity[0]!.text, /User-reported progress: Compared two orchids/);
  assert.match(result.recorded.sections.decisions[0]!.text, /proposed/);
  for (const claim of Object.values(result.recorded.sections).flat()) for (const id of claim.sourceIds) assert.ok(result.bundle.sources.some(s => s.id === id));
  const b = await f.projects.resume({ folder: "Projects", project: "Projects/B" }, f.info.revision);
  assert.match(b.recorded.sections.objective[0]!.text, /violets/);
  assert.equal(b.recorded.sections.lastActivity.length, 0); assert.match(b.recorded.gaps.join(" "), /No dated session/);
  assert.equal(b.bundle.baseline, undefined);
  assert.deepEqual((await f.projects.home({ folder: "", project: "" }, f.info.revision)).projects, ["Projects/A"]);
});

test("desktop project requests reject malformed/out-of-scope selections, revocation and paused work", async t => {
  const f = await fixture(t);
  for (const input of [{ folder: "../Projects", project: "" }, { folder: ".", project: "" }, { folder: "Projects", project: "Projects/Private" }, { folder: "Projects", project: "Projects/A", extra: true }]) await assert.rejects(f.projects.home(input, f.info.revision));
  await assert.rejects(f.projects.resume({ folder: "Projects", project: "" }, f.info.revision), /Choose a project/);
  f.index.cancel(f.info.revision);
  await assert.rejects(f.projects.resume(f.selection, f.info.revision), /stopped reading notes/i);
  await f.index.refresh(f.info.revision, true);
  f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset();
  await assert.rejects(f.projects.resume(f.selection, f.info.revision));
  const empty = await f.projects.home({ folder: "Projects", project: "" }, f.reader.getInfo()!.revision);
  assert.deepEqual(empty.projects, []); assert.equal(empty.home, null);
});

test("desktop Resume omits stale derived records and rejects edits/cancellation during source collection", async t => {
  const f = await fixture(t), source = "## Research\nOriginal research", hash = await contentHash(source);
  await f.put("Sources/Research.md", source);
  await f.put("Projects/A/Answer.md", frontmatter({ type: "answer", thread_sources: JSON.stringify([{ path: "Sources/Research.md", heading: "Research", hash, noteHash: hash }]) }) + "derivedorchid conclusion");
  const first = await f.projects.resume(f.selection, f.info.revision);
  assert.ok(first.bundle.noteHashes["Sources/Research.md"]);
  await f.put("Sources/Research.md", "Changed research");
  assert.ok(!(await f.projects.resume(f.selection, f.info.revision)).bundle.sources.some(s => s.path.endsWith("Answer.md")));
  const original = f.reader.read.bind(f.reader);
  let reads = 0;
  f.reader.read = async (...args) => {
    const result = await original(...args);
    if (++reads === 1) await f.put("Projects/A/Overview.md", "## Objective\nChanged during Resume.");
    return result;
  };
  await assert.rejects(f.projects.resume(f.selection, f.info.revision), /changed/);
  f.reader.read = original; await f.index.refresh(f.info.revision);
  f.reader.read = async (...args) => { const result = await original(...args); f.index.cancel(f.info.revision); return result; };
  await assert.rejects(f.projects.resume(f.selection, f.info.revision), /canceled|stopped/);
});
