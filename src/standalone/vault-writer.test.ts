import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, rename, symlink, link } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { VaultWriter } from "./vault-writer.ts";

test("exclusive desktop writer preserves collisions, aliases, scope and exact UTF-8 bytes", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-writer-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "Projects")); const reader = new VaultReader(); let info = await reader.select(root);
  info = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision); const writer = new VaultWriter(reader);
  const path = "Projects/Answers/Café.md", content = "# Exact\nBulgarian: бележка\n";
  const preview = await writer.inspect(path, info.revision); assert.equal(preview.file, null);
  await writer.create(path, content, preview, info.revision, async () => {}, () => {});
  assert.equal(await readFile(join(root, path), "utf8"), content);
  await assert.rejects(writer.create(path, "overwrite", preview, info.revision, async () => {}, () => {}), /changed/);
  await assert.rejects(writer.inspect("Projects/Answers/cafe\u0301.md", info.revision), /already exists/);
  for (const bad of ["Projects/Private/X.md", "Elsewhere/X.md", "../X.md", "Projects/.obsidian/X.md", "Projects/X.js"]) await assert.rejects(writer.inspect(bad, info.revision));
  await symlink(join(root, "Projects/Answers"), join(root, "Projects/Linked")); await assert.rejects(writer.inspect("Projects/Linked/X.md", info.revision), /link/);
  await link(join(root, path), join(root, "Projects/Hard.md")); await assert.rejects(writer.inspect("Projects/Hard.md", info.revision), /single-link/);
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
