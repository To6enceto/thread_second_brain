import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink, link, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { packageFixture } from "../portability/test-fixtures.ts";
import { emptyImports } from "../portability/import.ts";
import { DesktopPortability, readPickedPackage } from "./portability.ts";
import { ImportJournal } from "./import-journal.ts";
import { DesktopError } from "./security.ts";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopStorage } from "./storage.ts";
import { VaultFiles } from "./vault-files.ts";
import { decodeProjectPackage } from "../portability/decode.ts";
import { parseMetadata } from "./metadata.ts";
import { authoredPdf } from "../pdf/test-fixtures.ts";
import { pdfSource } from "../pdf/record.ts";
import { createHash } from "node:crypto";

async function folder(t: TestContext) { const root = await mkdtemp(join(tmpdir(), "thread-portability-")); t.after(() => rm(root, { recursive: true, force: true })); return root; }
const encode = (value: unknown): string => JSON.stringify(value);

test("package snapshots come only from one chosen ordinary .thread-project.json file within 48 MiB", async t => {
  const root = await folder(t), good = join(root, "Checkpoint.thread-project.json"), text = encode(await packageFixture());
  await writeFile(good, text); await writeFile(join(root, "Notes.json"), text); await writeFile(join(root, "Huge.thread-project.json"), Buffer.alloc(48 * 1048576 + 1));
  await symlink(good, join(root, "Linked.thread-project.json")); await writeFile(join(root, "Copy.thread-project.json"), text); await link(join(root, "Copy.thread-project.json"), join(root, "Hard.thread-project.json"));
  assert.equal(Buffer.from((await readPickedPackage(good, () => {})).bytes).toString(), text);
  for (const [name, message] of [["Notes.json", /\.thread-project\.json/], ["Huge.thread-project.json", /48 MiB/], ["Linked.thread-project.json", /./], ["Hard.thread-project.json", /single-link/], ["../x.thread-project.json", /./]] as const) await assert.rejects(readPickedPackage(join(root, name), () => {}), message);
  let calls = 0; await assert.rejects(readPickedPackage(good, () => { if (++calls === 3) appendFileSync(good, " "); }), /changed/);
  for (const name of ["backup 10:30.thread-project.json", "what?.thread-project.json", "Cafe\u0301.thread-project.json"]) { await writeFile(join(root, name), text); await assert.rejects(readPickedPackage(join(root, name), () => {}), /portable name/); }
});

test("portability decodes picked packages with the shared validator and refuses malformed, traversal and hash-mismatched packages", async t => {
  const root = await folder(t), portability = new DesktopPortability(null as never, null as never, null as never, null as never), fixture = await packageFixture(), good = join(root, "Good.thread-project.json"); await writeFile(good, encode(fixture));
  assert.equal(await portability.pick(async () => null), null);
  const summary = (await portability.pick(async () => good))!; assert.equal(summary.entries, 1); assert.equal(summary.project.id, "project"); assert.equal(portability.package(summary.token).package.manifest.entries[0]!.path, "P/Source.md");
  const traversal = structuredClone(fixture); traversal.manifest.entries[0]!.path = "../Escape.md";
  const mismatch = structuredClone(fixture); mismatch.manifest.entries[0]!.sha256 = "0".repeat(64);
  for (const [name, body] of [["Malformed", "{not json"], ["Traversal", encode(traversal)], ["Mismatch", encode(mismatch)], ["Version", encode({ ...fixture, schemaVersion: 2 })]] as const) {
    const path = join(root, `${name}.thread-project.json`); await writeFile(path, body); await assert.rejects(portability.pick(async () => path), /Package refused before any write/);
  }
  assert.throws(() => portability.package(summary.token), /again/);
  const slow = portability.pick(async () => { await new Promise(resolve => setTimeout(resolve, 20)); return good; }); portability.invalidate(); await assert.rejects(slow, /changed|canceled/);
});

test("desktop import journal round-trips the shared state and preserves an invalid file without resetting it", async t => {
  const root = await folder(t), identity = "a".repeat(64), journal = new ImportJournal(root, identity);
  assert.deepEqual(await journal.load(), emptyImports());
  const receipt = { id: "r1", packageHash: "b".repeat(64), source: "Checkpoint.thread-project.json", root: "Thread Import 1", startedAt: new Date().toISOString(), status: "pending" as const, rootCreated: false, entries: [{ path: "Thread Import 1/P/Source.md", bytes: 3, sha256: "c".repeat(64) }], created: [], inFlight: null };
  await journal.store({ schemaVersion: 1, receipts: [receipt] }); const again = new ImportJournal(root, identity); assert.equal((await again.load()).receipts[0]!.id, "r1");
  await mkdir(join(root, "thread-v1"), { recursive: true }); const path = join(root, "thread-v1", `imports-${identity}.json`); await writeFile(path, '{"schemaVersion":1,"receipts":[{"id":"bad"}]}');
  await assert.rejects(new ImportJournal(root, identity).load(), /Preserve the profile/); assert.equal(await readFile(path, "utf8"), '{"schemaVersion":1,"receipts":[{"id":"bad"}]}');
});

async function vault(t: TestContext) {
  const root = await folder(t), base = join(root, "vault"), profile = join(root, "profile");
  for (const path of ["Projects/Demo", "Papers", "Private", "Checkpoints"]) await mkdir(join(base, path), { recursive: true }); await mkdir(profile);
  const files: Record<string, string | Buffer> = { "Projects/Demo/Overview.md": "---\ntype: project\nid: demo\nstatus: active\n---\n## Objective\nPort local checkpoints.\n[[Notes]]\n", "Projects/Demo/Notes.md": "\uFEFF# Notes\r\nByte exact notes.\r\n", "Private/Secret.md": "PRIVATE" };
  for (const [path, body] of Object.entries(files)) await writeFile(join(base, path), body);
  const pdf = Buffer.from(authoredPdf(["Checkpoint PDF page."])); await writeFile(join(base, "Papers/Paper.pdf"), pdf);
  const reader = new VaultReader(); let info = await reader.select(base); info = reader.grant({ roots: ["Projects", "Papers", "Checkpoints"], excluded: ["Private"] }, info.revision);
  const evidence = new EvidenceIndex(reader), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision); const compat = await storage.inspect(".obsidian", info.revision); await storage.enable(compat.id, info.revision);
  const portability = new DesktopPortability(reader, evidence, storage, new VaultFiles(reader)), selection = { folder: "Projects", project: "Projects/Demo" };
  t.after(() => storage.close());
  return { base, reader, evidence, storage, portability, selection, pdf, files, get info() { return info; }, set info(value) { info = value; } };
}

test("desktop export previews permitted project files and granted PDFs, then writes a byte-exact create-only package", async t => {
  const f = await vault(t); let inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  assert.deepEqual(inventory.candidates.map(candidate => candidate.path), ["Projects/Demo/Notes.md", "Projects/Demo/Overview.md"]); assert.ok(!JSON.stringify(inventory).includes("Private"));
  const pdfHash = createHash("sha256").update(f.pdf).digest("hex");
  await writeFile(join(f.base, "Projects/Demo/Paper text.md"), await pdfSource({ totalPages: 1, pages: [{ page: 1, text: "Checkpoint PDF page.", shortened: false }] }, "Papers/Paper.pdf", pdfHash)); f.evidence.reset();
  inventory = await f.portability.exportInventory(f.selection, f.info.revision); assert.ok(!inventory.candidates.some(candidate => candidate.kind === "pdf"));
  f.info = await f.reader.consentPdf("Papers/Paper.pdf", true, f.info.revision); f.evidence.reset(); inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  assert.deepEqual(inventory.candidates.filter(candidate => candidate.kind === "pdf").map(candidate => [candidate.path, candidate.hash]), [["Papers/Paper.pdf", pdfHash]]);
  const preview = await f.portability.previewExport(inventory.id, inventory.candidates.map(candidate => candidate.path), "Checkpoints", "Demo checkpoint", f.info.revision);
  assert.equal(preview.path, "Checkpoints/Demo checkpoint.thread-project.json"); assert.equal(preview.manifest.entries.length, 4); assert.ok(preview.texts[1]!.startsWith("\uFEFF# Notes")); assert.equal(preview.texts[0], null);
  assert.equal(await f.portability.writeExport(preview.id, f.info.revision), preview.path);
  const written = await readFile(join(f.base, preview.path)), decoded = await decodeProjectPackage(new Uint8Array(written), parseMetadata);
  assert.equal(Buffer.from(decoded.payloads[1]!).toString(), f.files["Projects/Demo/Notes.md"]); assert.deepEqual(Buffer.from(decoded.payloads[0]!), f.pdf); assert.equal(decoded.package.manifest.project.id, "demo");
  inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const again = await f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], "Checkpoints", "Demo checkpoint", f.info.revision);
  await assert.rejects(f.portability.writeExport(again.id, f.info.revision), /already exists/);
  inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const lower = await f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], "Checkpoints", "demo checkpoint", f.info.revision);
  await assert.rejects(f.portability.writeExport(lower.id, f.info.revision), /case or Unicode/);
  for (const [folderName, name] of [["Private", "Leak"], ["Outside", "Leak"], ["../Escape", "Leak"], ["Checkpoints", "../Leak"]]) await assert.rejects(f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], folderName, name, f.info.revision));
  assert.deepEqual(await readFile(join(f.base, "Papers/Paper.pdf")), f.pdf);
  await writeFile(join(f.base, "Projects/Demo/Long.md"), "# Long\n" + "x".repeat(30000)); f.evidence.reset(); const longInventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const longPreview = await f.portability.previewExport(longInventory.id, ["Projects/Demo/Long.md"], "Checkpoints", "Long preview", f.info.revision); assert.match(longPreview.texts[0]!, /Display limited to 20000 characters; the package keeps every byte\./);
});

test("desktop export refuses changed sources between preview and write and canceled previews", async t => {
  const f = await vault(t); let inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const preview = await f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], "Checkpoints", "Changed", f.info.revision);
  await writeFile(join(f.base, "Projects/Demo/Notes.md"), "# Notes\nEdited after preview.\n");
  await assert.rejects(f.portability.writeExport(preview.id, f.info.revision), /changed|Refresh/i); await assert.rejects(readFile(join(f.base, "Checkpoints/Changed.thread-project.json")), { code: "ENOENT" });
  inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const pending = f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], "Checkpoints", "Canceled", f.info.revision); f.portability.draftChanged();
  await assert.rejects(pending, /changed|canceled|aborted/i);
  await f.storage.release(); inventory = await f.portability.exportInventory(f.selection, f.info.revision);
  const unowned = await f.portability.previewExport(inventory.id, ["Projects/Demo/Notes.md"], "Checkpoints", "Unowned", f.info.revision);
  await assert.rejects(f.portability.writeExport(unowned.id, f.info.revision), /Enable writing|compatibility/);
});

async function exported(f: Awaited<ReturnType<typeof vault>>, name: string): Promise<string> {
  const inventory = await f.portability.exportInventory(f.selection, f.info.revision), preview = await f.portability.previewExport(inventory.id, inventory.candidates.map(candidate => candidate.path), "Checkpoints", name, f.info.revision);
  return join(f.base, await f.portability.writeExport(preview.id, f.info.revision));
}
const listFiles = async (root: string): Promise<string[]> => { const { readdir } = await import("node:fs/promises"); return (await readdir(root, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort(); };

test("checkpoint comparison is read-only and reports unchanged, changed, missing, current-only and unavailable rows", async t => {
  const f = await vault(t), packagePath = await exported(f, "Baseline");
  await writeFile(join(f.base, "Projects/Demo/Notes.md"), "# Notes\nChanged after the checkpoint.\n"); await writeFile(join(f.base, "Projects/Demo/Added.md"), "# Added\nCurrent only.\n");
  let summary = (await f.portability.pick(async () => packagePath))!, before = await listFiles(f.base);
  let result = await f.portability.compareCheckpoint(summary.token, f.selection, f.info.revision);
  const states = Object.fromEntries(result.rows.map(row => [row.path, row.state]));
  assert.equal(states["Projects/Demo/Notes.md"], "changed"); assert.equal(states["Projects/Demo/Overview.md"], "unchanged"); assert.equal(states["Projects/Demo/Added.md"], "current-only");
  assert.ok(result.rows.find(row => row.path === "Projects/Demo/Notes.md")!.before!.text!.startsWith("\uFEFF# Notes")); assert.deepEqual(await listFiles(f.base), before);
  await rm(join(f.base, "Projects/Demo/Added.md")); await rm(join(f.base, "Projects/Demo/Notes.md")); f.evidence.reset();
  result = await f.portability.compareCheckpoint(summary.token, f.selection, f.info.revision); assert.equal(result.rows.find(row => row.path === "Projects/Demo/Notes.md")!.state, "missing");
  f.info = f.reader.grant({ roots: ["Projects/Demo/Overview.md", "Checkpoints"], excluded: [] }, f.info.revision); f.evidence.reset();
  summary = (await f.portability.pick(async () => packagePath))!; result = await f.portability.compareCheckpoint(summary.token, f.selection, f.info.revision);
  assert.ok(!result.rows.some(row => row.path === "Projects/Demo/Notes.md")); assert.ok(result.unavailable >= 1);
  await assert.rejects(f.portability.compareCheckpoint(summary.token, { folder: "Projects", project: "Projects/Other" }, f.info.revision), (error: unknown) => error instanceof DesktopError && /same current permitted project|Choose/.test(error.message));
  before = await listFiles(f.base); await assert.rejects(f.portability.compareCheckpoint("forged", f.selection, f.info.revision), /again/); assert.deepEqual(await listFiles(f.base), before);
});

test("comparison treats PDF entries as unavailable once the original's grant is revoked", async t => {
  const f = await vault(t), pdfHash = createHash("sha256").update(f.pdf).digest("hex");
  await writeFile(join(f.base, "Projects/Demo/Paper text.md"), await pdfSource({ totalPages: 1, pages: [{ page: 1, text: "Checkpoint PDF page.", shortened: false }] }, "Papers/Paper.pdf", pdfHash));
  f.info = await f.reader.consentPdf("Papers/Paper.pdf", true, f.info.revision); f.evidence.reset(); const packagePath = await exported(f, "With PDF");
  let summary = (await f.portability.pick(async () => packagePath))!, result = await f.portability.compareCheckpoint(summary.token, f.selection, f.info.revision);
  assert.equal(result.rows.find(row => row.path === "Papers/Paper.pdf")!.state, "unchanged");
  f.info = await f.reader.consentPdf("Papers/Paper.pdf", false, f.info.revision); f.evidence.reset(); summary = (await f.portability.pick(async () => packagePath))!; result = await f.portability.compareCheckpoint(summary.token, f.selection, f.info.revision);
  assert.ok(!result.rows.some(row => row.path === "Papers/Paper.pdf")); assert.ok(result.unavailable >= 1);
});

test("imports create byte-exact new copies under a new unread top-level folder and refuse unsafe roots", async t => {
  const f = await vault(t), packagePath = await exported(f, "For import");
  let summary = (await f.portability.pick(async () => packagePath))!;
  for (const root of ["Projects", "Private", "Papers/Nested", ".Hidden", ""]) await assert.rejects(f.portability.previewImport(summary.token, root, f.info.revision));
  // Errors must be DesktopErrors: plain errors are replaced by the generic IPC failure message.
  await mkdir(join(f.base, "Existing")); await assert.rejects(f.portability.previewImport(summary.token, "Existing", f.info.revision), (error: unknown) => error instanceof DesktopError && /already exists/.test(error.message));
  await mkdir(join(f.base, "thread import b")); await assert.rejects(f.portability.previewImport(summary.token, "Thread Import B", f.info.revision), /case or Unicode/);
  const preview = await f.portability.previewImport(summary.token, "Thread Import A", f.info.revision);
  assert.deepEqual(preview.entries.map(entry => entry.path), ["Thread Import A/Projects/Demo/Notes.md", "Thread Import A/Projects/Demo/Overview.md"]); assert.equal(preview.recovery, false);
  const status = await f.portability.applyImport(preview.id, f.info.revision); assert.equal(status.pending, null); assert.equal(status.completed, 1);
  assert.equal(await readFile(join(f.base, "Thread Import A/Projects/Demo/Notes.md"), "utf8"), f.files["Projects/Demo/Notes.md"]);
  assert.ok(!(await f.reader.list(f.info.revision)).paths.some(path => path.startsWith("Thread Import A")));
  summary = (await f.portability.pick(async () => packagePath))!; const second = await f.portability.previewImport(summary.token, "Thread Import C", f.info.revision);
  await mkdir(join(f.base, "Thread Import C")); await assert.rejects(f.portability.applyImport(second.id, f.info.revision), /exists|appeared/);
  f.info = f.reader.grant({ roots: ["."], excluded: [] }, f.info.revision);
  summary = (await f.portability.pick(async () => packagePath))!; await assert.rejects(f.portability.previewImport(summary.token, "Thread Import D", f.info.revision), /Whole-vault/);
});

test("interrupted imports keep partial copies, then recover by continuing or are closed without deleting anything", async t => {
  const f = await vault(t), packagePath = await exported(f, "Interrupted"), otherPath = await exported(f, "Other package"), files = (f.portability as unknown as { files: VaultFiles }).files, original = files.create.bind(files);
  let calls = 0; files.create = async (path, bytes, revision, parents) => { if (++calls === 2) throw Error("Simulated power loss"); return original(path, bytes, revision, parents); };
  let summary = (await f.portability.pick(async () => packagePath))!, preview = await f.portability.previewImport(summary.token, "Thread Import R", f.info.revision);
  await assert.rejects(f.portability.applyImport(preview.id, f.info.revision), /Partial copies are preserved/);
  let status = f.portability.importStatus(f.info.revision); assert.equal(status.pending!.created, 1); assert.equal(status.pending!.total, 2);
  assert.equal(await readFile(join(f.base, "Thread Import R/Projects/Demo/Notes.md"), "utf8"), f.files["Projects/Demo/Notes.md"]);
  await assert.rejects(f.portability.previewImport((await f.portability.pick(async () => otherPath))!.token, "Other", f.info.revision), /interrupted import is pending/);
  files.create = original; summary = (await f.portability.pick(async () => packagePath))!; preview = await f.portability.previewImport(summary.token, "ignored", f.info.revision);
  assert.equal(preview.recovery, true); assert.equal(preview.root, "Thread Import R");
  status = await f.portability.applyImport(preview.id, f.info.revision); assert.equal(status.pending, null);
  assert.equal(await readFile(join(f.base, "Thread Import R/Projects/Demo/Overview.md"), "utf8"), f.files["Projects/Demo/Overview.md"]);
  calls = 0; files.create = async (path, bytes, revision, parents) => { if (++calls === 2) throw Error("Simulated crash"); return original(path, bytes, revision, parents); };
  summary = (await f.portability.pick(async () => packagePath))!; preview = await f.portability.previewImport(summary.token, "Thread Import L", f.info.revision); await assert.rejects(f.portability.applyImport(preview.id, f.info.revision));
  status = await f.portability.leaveImport(f.info.revision); assert.equal(status.pending, null); assert.ok(await readFile(join(f.base, "Thread Import L/Projects/Demo/Notes.md")));
  await assert.rejects(f.portability.leaveImport(f.info.revision), /No interrupted import/);
});
