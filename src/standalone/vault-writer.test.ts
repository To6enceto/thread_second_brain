import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, rename, symlink, link } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { VaultWriter } from "./vault-writer.ts";
import { writeFileSync, renameSync, mkdirSync } from "node:fs";

test("exclusive desktop writer preserves collisions, aliases, scope and exact UTF-8 bytes", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-writer-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "Projects")); const reader = new VaultReader(); let info = await reader.select(root);
  info = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision); const writer = new VaultWriter(reader);
  const path = "Projects/Answers/Café.md", content = "# Exact\nBulgarian: бележка\n";
  const preview = await writer.inspect(path, info.revision); assert.equal(preview.file, null);
  await writer.create(path, content, preview, info.revision, async () => {}, () => {});
  assert.equal(await readFile(join(root, path), "utf8"), content);
  await assert.rejects(writer.create(path, "overwrite", preview, info.revision, async () => {}, () => {}), /destination changed since the preview/);
  await assert.rejects(writer.inspect("Projects/Answers/cafe\u0301.md", info.revision), /already exists/);
  for (const bad of ["Projects/Private/X.md", "Elsewhere/X.md", "../X.md", "Projects/.obsidian/X.md", "Projects/X.js"]) await assert.rejects(writer.inspect(bad, info.revision));
  await symlink(join(root, "Projects/Answers"), join(root, "Projects/Linked")); await assert.rejects(writer.inspect("Projects/Linked/X.md", info.revision), /link/);
  await link(join(root, path), join(root, "Projects/Hard.md")); await assert.rejects(writer.inspect("Projects/Hard.md", info.revision), /ordinary Markdown notes/);
});

test("reviewed existing-note updates preserve exact UTF-8, shorten content and conditionally undo creations", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-update-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "Projects")); const path = "Projects/Note.md", before = "---\nid: kept\n---\nOriginal very long text\n";
  await writeFile(join(root, path), before);
  const reader = new VaultReader(); let info = await reader.select(root); info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  const writer = new VaultWriter(reader), expected = await writer.inspect(path, info.revision), after = "---\nid: kept\n---\nбележка\n";
  await writer.replace(path, before, after, expected, info.revision, () => {}); assert.equal(await readFile(join(root, path), "utf8"), after);
  await assert.rejects(writer.replace(path, before, "stale", expected, info.revision, () => {}), /changed/);
  await writer.removeCreated(path, after, await writer.inspect(path, info.revision), info.revision, () => {});
  await assert.rejects(readFile(join(root, path)), { code: "ENOENT" });
});

test("update and removal refuse external edits, identity replacement and revoked scope", async t => {
  for (const operation of ["replace", "remove"] as const) for (const change of ["content", "parent", "revoke"] as const) {
    const root = await mkdtemp(join(tmpdir(), "thread-update-race-")); t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, "Projects")); const path = "Projects/Note.md"; await writeFile(join(root, path), "before");
    const reader = new VaultReader(); let info = await reader.select(root); info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
    const writer = new VaultWriter(reader), expected = await writer.inspect(path, info.revision); let calls = 0;
    const current = (): void => {
      if (++calls !== 2) return;
      if (change === "content") writeFileSync(join(root, path), "external edit");
      if (change === "parent") { renameSync(join(root, "Projects"), join(root, "Preserved")); mkdirSync(join(root, "Projects")); writeFileSync(join(root, path), "replacement"); }
      if (change === "revoke") reader.grant({ roots: [], excluded: [] }, info.revision);
    };
    await assert.rejects(operation === "replace" ? writer.replace(path, "before", "after", expected, info.revision, current) : writer.removeCreated(path, "before", expected, info.revision, current));
    assert.equal(await readFile(join(root, path), "utf8"), change === "content" ? "external edit" : change === "parent" ? "replacement" : "before");
    if (change === "parent") assert.equal(await readFile(join(root, "Preserved/Note.md"), "utf8"), "before");
  }
});

test("desktop writer refuses parent replacement, target races and revocation without overwrites", async t => {
  for (const change of ["parent", "target", "revoke"] as const) {
    const root = await mkdtemp(join(tmpdir(), "thread-write-race-")); t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, "Projects")); const reader = new VaultReader(); let info = await reader.select(root);
    info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision); const writer = new VaultWriter(reader), path = "Projects/Test.md";
    const preview = await writer.inspect(path, info.revision);
    const validate = async (): Promise<void> => {
      if (change === "parent") { await rename(join(root, "Projects"), join(root, "Moved")); await mkdir(join(root, "Projects")); }
      if (change === "target") await writeFile(join(root, path), "external");
      if (change === "revoke") reader.grant({ roots: [], excluded: [] }, info.revision);
    };
    await assert.rejects(writer.create(path, "new", preview, info.revision, validate, () => {}));
    if (change === "target") assert.equal(await readFile(join(root, path), "utf8"), "external");
    else await assert.rejects(readFile(join(root, path)), { code: "ENOENT" });
    if (change === "parent") await assert.rejects(readFile(join(root, "Moved/Test.md")), { code: "ENOENT" });
  }
});
