import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopPdf } from "./pdf.ts";
import { metadata } from "./metadata.ts";
import { authoredPdf } from "../pdf/test-fixtures.ts";
const extraction = { totalPages: 2, pages: [{ page: 1, text: "Method checks every claim.", shortened: false }, { page: 2, text: "Limits are recorded.", shortened: false }] };
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-pdf-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const path of ["Papers", "Sources", "Private"]) await mkdir(join(vault, path), { recursive: true }); await mkdir(profile);
  const bytes = Buffer.from(authoredPdf(["Method checks every claim.", "Limits are recorded."]));
  await writeFile(join(vault, "Papers/Study.pdf"), bytes); await writeFile(join(vault, "Private/Hidden.pdf"), bytes); await writeFile(join(vault, "Sources/Note.md"), "# Note\nOrdinary note.\n");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Papers", "Sources"], excluded: ["Private"] }, info.revision);
  const index = new EvidenceIndex(reader), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision); const compat = await storage.inspect(".obsidian", info.revision); await storage.enable(compat.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.sources = "Sources"; await storage.savePreferences(preferences, info.revision);
  const changes = new DesktopChanges(reader, storage), pdf = new DesktopPdf(reader, index, storage, changes);
  const consent = async (granted = true) => { info = await reader.consentPdf("Papers/Study.pdf", granted, info.revision); return info; };
  const apply = async () => { const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  return { vault, bytes, reader, storage, changes, pdf, consent, apply, get info() { return info; }, read: (path: string) => readFile(join(vault, path)) };
}

test("PDF extraction saves an exact derived source bound to the consented original; collisions refuse and re-extraction adds a copy", async t => {
  const f = await fixture(t); let snapshot = await f.pdf.load(f.info.revision);
  assert.deepEqual(snapshot.files, [{ path: "Papers/Study.pdf", bytes: f.bytes.length, consented: false }]); await assert.rejects(f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision), /Grant/);
  await f.consent(); snapshot = await f.pdf.load(f.info.revision); assert.equal(snapshot.files[0]!.consented, true); await assert.rejects(f.pdf.read(snapshot.id, "Private/Hidden.pdf", f.info.revision), /Grant/);
  const original = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision); assert.deepEqual(Buffer.from(original.bytes), f.bytes);
  await f.pdf.prepare(snapshot.id, original.token, extraction, "Study extraction", f.info.revision); await assert.rejects(f.read("Sources/Study extraction.md"), { code: "ENOENT" });
  const preview = await f.apply(), saved = (await f.read("Sources/Study extraction.md")).toString(); assert.equal(saved, preview.operations[0]!.after);
  const record = JSON.parse(String(metadata(saved).thread_pdf)); assert.equal(record.path, "Papers/Study.pdf"); assert.equal(record.hash, original.hash); assert.match(saved, /## PDF page 2\n\n> Limits are recorded\./);
  snapshot = await f.pdf.load(f.info.revision); let again = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision);
  await assert.rejects(f.pdf.prepare(snapshot.id, again.token, extraction, "Study extraction", f.info.revision), /already exists/);
  snapshot = await f.pdf.load(f.info.revision); again = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision); await f.pdf.prepare(snapshot.id, again.token, extraction, "Study extraction 2", f.info.revision); await f.apply();
  assert.equal((await f.read("Sources/Study extraction.md")).toString(), saved); assert.deepEqual(await f.read("Papers/Study.pdf"), f.bytes);
  const undo = await f.changes.preview("undo", f.changes.snapshot(f.info.revision).history.at(-1)!.id, f.info.revision); assert.equal(undo.ready, true); await f.changes.confirm(undo.id, f.info.revision);
  await assert.rejects(f.read("Sources/Study extraction 2.md"), { code: "ENOENT" }); assert.equal((await f.read("Sources/Study extraction.md")).toString(), saved); assert.deepEqual(await f.read("Papers/Study.pdf"), f.bytes);
});

test("PDF saves refuse forged extractions, stale tokens, changed originals and revoked consent before and after proposal", async t => {
  const f = await fixture(t); await f.consent(); let snapshot = await f.pdf.load(f.info.revision), original = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision);
  for (const forged of [{ ...extraction, extra: true }, { totalPages: 1, pages: extraction.pages }, { totalPages: 2, pages: [{ page: 1, text: "x".repeat(8001), shortened: false }] }, { totalPages: 2, pages: [{ page: 2, text: "Out of order", shortened: false }] }, "text"]) await assert.rejects(f.pdf.prepare(snapshot.id, original.token, forged, "Forged", f.info.revision));
  await assert.rejects(f.pdf.prepare(snapshot.id, "forged-token", extraction, "Forged", f.info.revision), /text again/);
  for (const name of ["../Escape", "a".repeat(101), 7]) await assert.rejects(f.pdf.prepare(snapshot.id, original.token, extraction, name, f.info.revision));
  original = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision); f.pdf.draftChanged(); await assert.rejects(f.pdf.prepare(snapshot.id, original.token, extraction, "Canceled", f.info.revision), /text again/);
  original = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision); await writeFile(join(f.vault, "Papers/Study.pdf"), Buffer.concat([f.bytes, Buffer.from("% appended\n")]));
  await assert.rejects(f.pdf.prepare(snapshot.id, original.token, extraction, "Changed", f.info.revision), /changed|Refresh/i);
  await writeFile(join(f.vault, "Papers/Study.pdf"), f.bytes); snapshot = await f.pdf.load(f.info.revision); original = await f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision);
  await f.pdf.prepare(snapshot.id, original.token, extraction, "Pending", f.info.revision); await writeFile(join(f.vault, "Papers/Study.pdf"), Buffer.concat([f.bytes, Buffer.from("% later\n")]));
  let preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); assert.equal(preview.ready, false); await assert.rejects(f.changes.confirm(preview.id, f.info.revision));
  await writeFile(join(f.vault, "Papers/Study.pdf"), f.bytes); await f.consent(false);
  preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); assert.equal(preview.ready, false);
  await assert.rejects(f.read("Sources/Pending.md"), { code: "ENOENT" }); assert.deepEqual(await f.read("Papers/Study.pdf"), f.bytes);
  await assert.rejects(f.pdf.read(snapshot.id, "Papers/Study.pdf", f.info.revision), /changed|Refresh/);
});
