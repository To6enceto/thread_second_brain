import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, rename, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { RememberedAccess, accessState } from "./remembered-access.ts";

const ai = { endpoint: "http://127.0.0.1:11439", model: "qwen3:4b-instruct" };
async function fixture(t: TestContext) {
  const base = await mkdtemp(join(tmpdir(), "thread-access-")), vault = join(base, "Vault"), profile = join(base, "profile");
  t.after(() => rm(base, { recursive: true, force: true }));
  await mkdir(join(vault, "Projects", "Demo"), { recursive: true }); await mkdir(join(vault, "Projects", "Private"), { recursive: true }); await mkdir(profile);
  await writeFile(join(vault, "Projects", "Demo", "Overview.md"), "# Demo\n"); await writeFile(join(vault, "Projects", "Demo", "Study.pdf"), "%PDF-1.4\n");
  const reader = new VaultReader(), info = await reader.select(vault), granted = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision);
  return { base, vault, profile, reader, granted, file: join(profile, "thread-v1", "access.json") };
}

test("remembering saves only main-held scope and identity, and a new launch reads nothing but the saved summary", async t => {
  const f = await fixture(t), access = new RememberedAccess(f.profile); await access.load();
  await f.reader.consentPdf("Projects/Demo/Study.pdf", true, f.granted.revision);
  const status = await access.remember(f.reader, ai, "Projects", "nomic-embed-text", f.granted.revision);
  assert.deepEqual(status.saved?.scope, { roots: ["Projects"], excluded: ["Projects/Private"] }); assert.equal(status.saved?.path, f.vault); assert.equal(status.warning, "");
  const raw = JSON.parse(await readFile(f.file, "utf8"));
  assert.deepEqual(Object.keys(raw.saved).sort(), ["ai", "identity", "path", "projectsFolder", "savedAt", "scope"]);
  assert.deepEqual(raw.saved.ai, { endpoint: ai.endpoint, model: ai.model, embeddingModel: "nomic-embed-text" });
  assert.ok(!JSON.stringify(raw).includes("Study.pdf")); assert.equal((await stat(f.file)).mode & 0o777, 0o600);
  assert.ok(!("identity" in status.saved!));
  const later = new RememberedAccess(f.profile), loaded = await later.load();
  assert.deepEqual(loaded, status);
  const reader = new VaultReader(), opened = await later.open(reader);
  assert.deepEqual(opened.vault.scope, { roots: ["Projects"], excluded: ["Projects/Private"] }); assert.deepEqual(opened.vault.pdfs, []);
  assert.equal(opened.projectsFolder, "Projects"); assert.deepEqual(opened.ai, raw.saved.ai); assert.equal(reader.getInfo()?.revision, opened.vault.revision);
});

test("remembering requires current approved access and valid mapping and local model names", async t => {
  const f = await fixture(t), access = new RememberedAccess(f.profile); await access.load();
  await assert.rejects(access.remember(f.reader, ai, "Projects", "", f.granted.revision - 1), /Access changed/);
  const empty = f.reader.grant({ roots: [], excluded: [] }, f.granted.revision);
  await assert.rejects(access.remember(f.reader, ai, "Projects", "", empty.revision), /Approve read access/);
  const again = f.reader.grant({ roots: ["Projects"], excluded: [] }, empty.revision);
  for (const folder of [".", "../Projects", ".hidden", "Projects/"]) await assert.rejects(access.remember(f.reader, ai, folder, "", again.revision));
  await assert.rejects(access.remember(f.reader, { ...ai, model: "gpt-oss:20b-cloud" }, "", "", again.revision));
  await assert.rejects(access.remember(f.reader, { ...ai, endpoint: "http://example.com:11434" }, "", "", again.revision));
  await assert.rejects(access.remember(f.reader, ai, "", "bad name", again.revision));
  assert.equal(access.status().saved, null);
  assert.equal((await access.remember(f.reader, { endpoint: ai.endpoint, model: "" }, "", "", again.revision)).saved?.ai.model, "");
});

test("continuing refuses a missing or replaced folder, closes the reader and keeps the saved entry", async t => {
  const f = await fixture(t), access = new RememberedAccess(f.profile); await access.load();
  await access.remember(f.reader, ai, "Projects", "", f.granted.revision);
  await rename(f.vault, `${f.vault}-moved`);
  const reader = new VaultReader();
  await assert.rejects(access.open(reader), /not available at/); assert.equal(reader.getInfo(), null);
  await mkdir(f.vault); await writeFile(join(f.vault, "Other.md"), "replacement");
  await assert.rejects(access.open(reader), /moved or replaced/); assert.equal(reader.getInfo(), null);
  assert.equal(access.status().saved?.path, f.vault);
  await rm(f.vault, { recursive: true }); await rename(`${f.vault}-moved`, f.vault);
  assert.deepEqual((await access.open(reader)).vault.scope.roots, ["Projects"]);
});

test("an unreadable saved file is reported, never used, and Forget removes only that file", async t => {
  const f = await fixture(t), access = new RememberedAccess(f.profile); await access.load();
  await access.remember(f.reader, ai, "", "", f.granted.revision);
  const saved = JSON.parse(await readFile(f.file, "utf8"));
  for (const bad of ["not json", JSON.stringify({ ...saved, grants: ["."] }), JSON.stringify({ ...saved, saved: { ...saved.saved, scope: { roots: ["../.."], excluded: [] } } }), JSON.stringify({ ...saved, saved: { ...saved.saved, path: "relative/vault" } })]) {
    await writeFile(f.file, bad); const reopened = new RememberedAccess(f.profile), status = await reopened.load();
    assert.equal(status.saved, null); assert.match(status.warning, /could not be read/);
    await assert.rejects(reopened.open(new VaultReader()), /No saved access/);
    await assert.rejects(reopened.remember(f.reader, ai, "", "", f.granted.revision), /Forget the unreadable/);
  }
  const reopened = new RememberedAccess(f.profile); await reopened.load();
  await writeFile(join(f.profile, "thread-v1", "vault-keep.json"), "other state");
  assert.deepEqual(await reopened.forget(), { saved: null, warning: "" });
  await assert.rejects(stat(f.file), /ENOENT/); assert.equal(await readFile(join(f.profile, "thread-v1", "vault-keep.json"), "utf8"), "other state");
  assert.deepEqual(await reopened.forget(), { saved: null, warning: "" });
  assert.equal((await reopened.remember(f.reader, ai, "", "", f.granted.revision)).saved?.path, f.vault);
});

test("the saved-access schema accepts only exact versioned fields", () => {
  const saved = { path: "/home/user/Vault", identity: "a".repeat(64), scope: { roots: ["Projects"], excluded: [] }, projectsFolder: "", ai: { endpoint: "http://127.0.0.1:11434", model: "", embeddingModel: "" }, savedAt: "2026-10-27T00:00:00.000Z" };
  assert.deepEqual(accessState({ schemaVersion: 1, saved }).saved, saved);
  assert.deepEqual(accessState({ schemaVersion: 1, saved: null }), { schemaVersion: 1, saved: null });
  for (const bad of [{ schemaVersion: 2, saved: null }, { schemaVersion: 1, saved: { ...saved, pdfs: [] } }, { schemaVersion: 1, saved: { ...saved, scope: { roots: [], excluded: [] } } },
    { schemaVersion: 1, saved: { ...saved, identity: "x" } }, { schemaVersion: 1, saved: { ...saved, path: "/home/user/../Vault" } }, { schemaVersion: 1, saved: { ...saved, savedAt: "yesterday" } },
    { schemaVersion: 1, saved: { ...saved, ai: { ...saved.ai, writing: true } } }]) assert.throws(() => accessState(bad));
});

test("a refused or failed Remember write keeps the previous entry and Remember keeps working", async t => {
  const f = await fixture(t), access = new RememberedAccess(f.profile); await access.load();
  await access.remember(f.reader, ai, "Projects", "", f.granted.revision); const before = await readFile(f.file, "utf8");
  const reader = f.reader as unknown as { getInfo: () => unknown }, original = reader.getInfo.bind(f.reader); let calls = 0;
  reader.getInfo = () => { calls++; const info = original() as { revision: number }; return calls > 1 ? { ...info, revision: info.revision + 1 } : info; };
  await assert.rejects(access.remember(f.reader, ai, "", "", f.granted.revision), /Access changed/);
  reader.getInfo = original; assert.equal(await readFile(f.file, "utf8"), before); assert.equal(access.status().warning, "");
  assert.equal((await access.remember(f.reader, ai, "", "", f.granted.revision)).saved?.projectsFolder, "");
});
