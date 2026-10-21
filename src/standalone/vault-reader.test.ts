import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, link, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { READ_LIMITS, VaultReader } from "./vault-reader.ts";

async function fixture(run: (reader: VaultReader, root: string, base: string) => Promise<void>): Promise<void> {
  const base = await mkdtemp(join(tmpdir(), "thread-desktop-test-")), root = join(base, "Vault");
  try {
    await mkdir(join(root, "Projects", "Private"), { recursive: true });
    await mkdir(join(root, ".obsidian", "plugins", "thread"), { recursive: true });
    await writeFile(join(root, "Projects", "Overview.md"), "# Objective\nKeep my notes local.\n");
    await writeFile(join(root, "Projects", "Private", "Secret.md"), "PRIVATE_CONTENT");
    await writeFile(join(root, ".obsidian", "plugins", "thread", "data.json"), '{"preserve":true}');
    await writeFile(join(root, "Welcome.md"), "Outside the project scope.");
    await run(new VaultReader(), root, base);
  } finally { await rm(base, { recursive: true, force: true }); }
}

test("desktop selection grants nothing; approved scope excludes private and plugin data and preserves bytes", async () => fixture(async (reader, root) => {
  let info = await reader.select(root);
  assert.deepEqual((await reader.list(info.revision)).paths, []);
  await assert.rejects(reader.read("Projects/Overview.md", info.revision), /outside/);
  info = reader.grant({ roots: ["Projects", "Projects/Private"], excluded: ["Projects/Private"] }, info.revision);
  assert.deepEqual((await reader.list(info.revision)).paths, ["Projects/Overview.md"]);
  const note = await reader.read("Projects/Overview.md", info.revision);
  assert.equal(note.text, "# Objective\nKeep my notes local.\n");
  for (const path of ["Welcome.md", "Projects/Private/Secret.md", ".obsidian/plugins/thread/data.json", "../elsewhere.md", "/tmp/elsewhere.md", "Projects\\Overview.md"]) await assert.rejects(reader.read(path, info.revision));
  info = reader.grant({ roots: ["."], excluded: ["Projects/Private"] }, info.revision);
  assert.deepEqual((await reader.list(info.revision)).paths, ["Projects/Overview.md", "Welcome.md"]);
  assert.equal(await readFile(join(root, "Projects", "Overview.md"), "utf8"), note.text);
  assert.equal(await readFile(join(root, ".obsidian/plugins/thread/data.json"), "utf8"), '{"preserve":true}');
}));

test("desktop refuses symlink roots, directory/file escapes, aliases and hardlinked notes", async () => fixture(async (reader, root, base) => {
  await writeFile(join(base, "Outside.md"), "OUTSIDE");
  await symlink(join(base, "Outside.md"), join(root, "Projects", "Escape.md"));
  await symlink(base, join(root, "Projects", "EscapeDir"));
  await link(join(base, "Outside.md"), join(root, "Projects", "Hard.md"));
  await symlink(root, join(base, "VaultAlias"));
  await assert.rejects(reader.select(join(base, "VaultAlias")));
  let info = await reader.select(root);
  info = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision);
  assert.deepEqual((await reader.list(info.revision)).paths, ["Projects/Overview.md"]);
  for (const path of ["Projects/Escape.md", "Projects/EscapeDir/Outside.md", "Projects/Hard.md"]) await assert.rejects(reader.read(path, info.revision));
  await rename(join(root, "Projects"), join(root, "Moved"));
  await symlink(base, join(root, "Projects"));
  await assert.rejects(reader.read("Projects/Outside.md", info.revision));
}));

test("desktop scope/vault changes revoke in-flight reads and old list revisions", async () => fixture(async (reader, root, base) => {
  let info = await reader.select(root);
  info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  const pending = reader.read("Projects/Overview.md", info.revision);
  const revoked = reader.grant({ roots: [], excluded: [] }, info.revision);
  await assert.rejects(pending, /changed/);
  await assert.rejects(reader.list(info.revision), /changed/);
  assert.deepEqual((await reader.list(revoked.revision)).paths, []);
  info = reader.grant({ roots: ["Projects"], excluded: [] }, revoked.revision);
  const scan = reader.list(info.revision); reader.close();
  await assert.rejects(scan, /changed/);
  await assert.rejects(reader.read("Projects/Overview.md", info.revision), /changed/);
  await mkdir(join(base, "Second"));
  assert.deepEqual((await reader.select(join(base, "Second"))).scope.roots, []);
}));

test("desktop source reopen sees external edits and replaced vault identities are refused", async () => fixture(async (reader, root, base) => {
  let info = await reader.select(root);
  info = reader.grant({ roots: ["Projects"], excluded: [] }, info.revision);
  await writeFile(join(root, "Projects", "Overview.md"), "changed by another editor");
  assert.equal((await reader.read("Projects/Overview.md", info.revision)).text, "changed by another editor");
  await rename(root, join(base, "OldVault"));
  await mkdir(join(root, "Projects"), { recursive: true });
  await writeFile(join(root, "Projects", "Overview.md"), "foreign root");
  await assert.rejects(reader.read("Projects/Overview.md", info.revision), /replaced/);
  await assert.rejects(reader.list(info.revision), /replaced/);
}));

test("desktop source reader refuses oversize and invalid UTF-8 notes; markup stays literal", async () => fixture(async (reader, root) => {
  const markup = '<script>window.executed = true</script>\n![remote](https://example.invalid/a.png)';
  await writeFile(join(root, "Markup.md"), markup);
  await writeFile(join(root, "Large.md"), Buffer.alloc(READ_LIMITS.bytes + 1, 65));
  await writeFile(join(root, "Invalid.md"), Buffer.from([0xff, 0xfe]));
  let info = await reader.select(root);
  info = reader.grant({ roots: ["."], excluded: ["Projects"] }, info.revision);
  assert.equal((await reader.read("Markup.md", info.revision)).text, markup);
  await assert.rejects(reader.read("Large.md", info.revision), /2 MiB/);
  await assert.rejects(reader.read("Invalid.md", info.revision), /UTF-8/);
  assert.ok(!(await reader.list(info.revision)).paths.includes("Large.md"));
}));

test("desktop listing reports note and depth limits instead of claiming complete coverage", async () => fixture(async (reader, root) => {
  const many = join(root, "Many"); await mkdir(many);
  await Promise.all(Array.from({ length: READ_LIMITS.notes + 1 }, (_, i) => writeFile(join(many, `${i}.md`), "note")));
  const deep = join(root, "Deep", ...Array.from({ length: READ_LIMITS.depth + 1 }, () => "next"));
  await mkdir(deep, { recursive: true }); await writeFile(join(deep, "Below.md"), "too deep");
  let info = await reader.select(root);
  info = reader.grant({ roots: ["Many"], excluded: [] }, info.revision);
  const notes = await reader.list(info.revision);
  assert.equal(notes.paths.length, READ_LIMITS.notes); assert.equal(notes.limited, true);
  info = reader.grant({ roots: ["Deep"], excluded: [] }, info.revision);
  const depth = await reader.list(info.revision);
  assert.deepEqual(depth.paths, []); assert.equal(depth.limited, true);
}));

test("desktop listing bounds unsupported entries too and never expands missing roots", async () => fixture(async (reader, root) => {
  await mkdir(join(root, "Unsupported"));
  // Small batches avoid file-descriptor pressure in the test itself.
  for (let i = 0; i <= READ_LIMITS.entries; i += 100) {
    await Promise.all(Array.from({ length: Math.min(100, READ_LIMITS.entries + 1 - i) }, (_, n) => writeFile(join(root, "Unsupported", `${i + n}.txt`), "")));
  }
  let info = await reader.select(root);
  info = reader.grant({ roots: ["Unsupported"], excluded: [] }, info.revision);
  const limited = await reader.list(info.revision);
  assert.equal(limited.limited, true); assert.equal(limited.omitted, READ_LIMITS.entries);
  info = reader.grant({ roots: ["Missing"], excluded: [] }, info.revision);
  assert.deepEqual((await reader.list(info.revision)).paths, []);
}));
