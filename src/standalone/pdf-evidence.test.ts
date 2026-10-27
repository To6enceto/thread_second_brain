import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopAsk } from "./ask.ts";
import { VaultReader } from "./vault-reader.ts";
import { authoredPdf } from "../pdf/test-fixtures.ts";
import { pdfSource } from "../pdf/record.ts";
import { contentHash } from "../vault/scope.ts";

const extraction = { totalPages: 2, pages: [{ page: 1, text: "The orchid method checks every claim.", shortened: false }, { page: 2, text: "Orchid limits are recorded.", shortened: false }] };
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-pdf-evidence-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "Papers")); await mkdir(join(root, "Sources"));
  const bytes = Buffer.from(authoredPdf(extraction.pages.map(page => page.text))), hash = createHash("sha256").update(bytes).digest("hex");
  await writeFile(join(root, "Papers/Study.pdf"), bytes); const derived = await pdfSource(extraction, "Papers/Study.pdf", hash); await writeFile(join(root, "Sources/Study.md"), derived);
  const reader = new VaultReader(), index = new EvidenceIndex(reader); let info = await reader.select(root); info = reader.grant({ roots: ["Papers", "Sources"], excluded: [] }, info.revision);
  // Main resets evidence on every consent change; mirror that here.
  const consent = async (granted: boolean) => { info = await reader.consentPdf("Papers/Study.pdf", granted, info.revision); index.reset(); };
  const pages = async () => (await index.search("orchid", info.revision)).hits.filter(hit => hit.path === "Sources/Study.md").map(hit => hit.heading);
  return { root, bytes, hash, derived, reader, index, consent, pages, get info() { return info; }, set info(value) { info = value; } };
}

test("extracted PDF pages are evidence only while the consented original matches; changes, revocation and exclusion fail closed", async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.pages(), []); assert.match((await f.index.refresh(f.info.revision)).pdfChecks!, /1 extracted PDF sources; 1 need an explicit PDF grant; 0 have a changed original.*PDF originals: 0 verified/);
  await f.consent(true); assert.deepEqual((await f.pages()).sort(), ["PDF page 1", "PDF page 2"]); assert.match((await f.index.refresh(f.info.revision)).pdfChecks!, /0 need an explicit PDF grant; 0 have a changed original.*PDF originals: 1 verified/);
  const graph = f.index.index.graph(f.index.scope()); assert.equal(graph.assess("Sources/Study.md").usable, true); assert.equal(graph.assess("Sources/Study.md").dependencies["Papers/Study.pdf"], f.hash);
  assert.equal(await f.reader.currentHash("Papers/Study.pdf", f.info.revision), f.hash); assert.equal(await f.reader.currentHash("Sources/Study.md", f.info.revision), await contentHash(f.derived));
  const derivedHash = await contentHash(f.derived); assert.equal((await f.index.source("Sources/Study.md", f.info.revision, derivedHash)).text, f.derived);
  await writeFile(join(f.root, "Papers/Study.pdf"), Buffer.concat([f.bytes, Buffer.from("% edited\n")]));
  assert.deepEqual(await f.pages(), []); await assert.rejects(f.index.source("Sources/Study.md", f.info.revision, derivedHash), /original PDF changed/);
  assert.match((await f.index.refresh(f.info.revision)).pdfChecks!, /1 have a changed original/);
  assert.equal((await f.index.source("Sources/Study.md", f.info.revision, undefined)).text, f.derived);
  await writeFile(join(f.root, "Papers/Study.pdf"), f.bytes); assert.deepEqual((await f.pages()).sort(), ["PDF page 1", "PDF page 2"]);
  await f.consent(false); assert.deepEqual(await f.pages(), []); await assert.rejects(f.reader.currentHash("Papers/Study.pdf", f.info.revision), /consent/);
  await f.consent(true); f.info = f.reader.grant({ roots: ["Papers", "Sources"], excluded: ["Papers"] }, f.info.revision); f.index.reset();
  assert.deepEqual(f.info.pdfs, []); assert.deepEqual(await f.pages(), []); assert.deepEqual(f.index.scope().pdfPaths, []);
});

test("PDF original verification stays within the per-operation budget and reports omissions", async t => {
  const f = await fixture(t); await mkdir(join(f.root, "Many"));
  for (let i = 0; i < 11; i++) { const path = `Papers/S${i}.pdf`; await writeFile(join(f.root, path), Buffer.concat([f.bytes, Buffer.from(`% ${i}\n`)])); }
  f.info = f.reader.grant({ roots: ["Papers", "Sources"], excluded: [] }, f.info.revision);
  for (let i = 0; i < 11; i++) {
    const path = `Papers/S${i}.pdf`, hash = createHash("sha256").update(Buffer.concat([f.bytes, Buffer.from(`% ${i}\n`)])).digest("hex");
    await writeFile(join(f.root, `Sources/S${i}.md`), await pdfSource(extraction, path, hash)); f.info = await f.reader.consentPdf(path, true, f.info.revision);
  }
  f.index.reset(); const snapshot = await f.index.refresh(f.info.revision);
  assert.match(snapshot.pdfChecks!, /12 extracted PDF sources; 1 need an explicit PDF grant; 0 have a changed original.*PDF originals: 10 verified, 1 unavailable or omitted/);
});

test("Resume uses validated PDF page text from a linked extraction only while its original is granted", async t => {
  const f = await fixture(t); await mkdir(join(f.root, "Projects/Demo"), { recursive: true });
  await writeFile(join(f.root, "Projects/Demo/Overview.md"), "---\ntype: project\nid: demo\n---\n## Objective\nCheck orchid claims.\n## Related\n[[Study]]\n");
  f.info = f.reader.grant({ roots: ["Papers", "Sources", "Projects"], excluded: [] }, f.info.revision); f.index.reset();
  const projects = new DesktopProjects(f.reader, f.index), selection = { folder: "Projects", project: "Projects/Demo" };
  let resume = await projects.resume(selection, f.info.revision); assert.ok(!resume.bundle.sources.some(source => source.path === "Sources/Study.md"));
  await f.consent(true); resume = await projects.resume(selection, f.info.revision);
  const pages = resume.bundle.sources.filter(source => source.path === "Sources/Study.md");
  assert.deepEqual(pages.map(source => source.heading).sort(), ["PDF page 1", "PDF page 2"]); assert.deepEqual(pages.map(source => source.pdf?.page).sort(), [1, 2]);
  assert.equal(pages[0]!.pdf!.hash, f.hash); assert.equal(resume.bundle.noteHashes["Papers/Study.pdf"], f.hash); assert.ok(pages.some(source => source.excerpt.includes("orchid method checks every claim")));
});

async function withProject(f: Awaited<ReturnType<typeof fixture>>) {
  await mkdir(join(f.root, "Projects/Demo"), { recursive: true });
  await writeFile(join(f.root, "Projects/Demo/Overview.md"), "---\ntype: project\nid: demo\n---\n## Objective\nCheck orchid claims.\n## Related\n[[Study]]\n");
  f.info = f.reader.grant({ roots: ["Papers", "Sources", "Projects"], excluded: [] }, f.info.revision); f.index.reset(); await f.consent(true);
  return new DesktopProjects(f.reader, f.index);
}

test("Ask refuses PDF page evidence before model use after the original changes or its grant is revoked", async t => {
  const f = await fixture(t), projects = await withProject(f), ai = new DesktopAI(projects, f.index, async () => { throw Error("No model call expected"); }, 5000), ask = new DesktopAsk(f.reader, f.index, projects, ai);
  const request = { question: "orchid method claim", selection: { folder: "Projects", project: "Projects/Demo" }, scope: "vault", filters: {}, method: "keyword", embeddingModel: "", level: "standard" };
  let prepared = await ask.retrieve(request, f.info.revision); assert.ok(prepared.bundle.sources.some(source => source.pdf?.path === "Papers/Study.pdf"));
  await ask.choose(prepared.id, {}, f.info.revision);
  await writeFile(join(f.root, "Papers/Study.pdf"), Buffer.concat([f.bytes, Buffer.from("% edited\n")])); await assert.rejects(ask.choose(prepared.id, {}, f.info.revision), /changed|Retrieve|Refresh/i);
  await writeFile(join(f.root, "Papers/Study.pdf"), f.bytes); prepared = await ask.retrieve(request, f.info.revision); await ask.choose(prepared.id, {}, f.info.revision);
  f.info = await f.reader.consentPdf("Papers/Study.pdf", false, f.info.revision); await assert.rejects(ask.choose(prepared.id, {}, f.info.revision), /changed|Retrieve|Refresh/i);
  f.index.reset(); prepared = await ask.retrieve(request, f.info.revision); assert.ok(!prepared.bundle.sources.some(source => source.pdf));
});

test("Resume drops PDF pages after the original changes, is removed or loses its grant, and restores them for exact bytes", async t => {
  const f = await fixture(t), projects = await withProject(f), selection = { folder: "Projects", project: "Projects/Demo" };
  const pdfPages = async () => (await projects.resume(selection, f.info.revision)).bundle.sources.filter(source => source.pdf).length;
  assert.equal(await pdfPages(), 2);
  await writeFile(join(f.root, "Papers/Study.pdf"), Buffer.concat([f.bytes, Buffer.from("% edited\n")])); assert.equal(await pdfPages(), 0);
  await writeFile(join(f.root, "Papers/Study.pdf"), f.bytes); assert.equal(await pdfPages(), 2);
  await rename(join(f.root, "Papers/Study.pdf"), join(f.root, "Moved.pdf")); assert.equal(await pdfPages(), 0);
  await rename(join(f.root, "Moved.pdf"), join(f.root, "Papers/Study.pdf")); assert.equal(await pdfPages(), 2);
  await f.consent(false); assert.equal(await pdfPages(), 0);
});
