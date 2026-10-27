import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopNewProject } from "./new-project.ts";
import { metadata } from "./metadata.ts";
import type { VaultWriter } from "./vault-writer.ts";

async function fixture(t: TestContext, options: { roles?: Record<string, string>; writing?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "thread-new-project-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const folder of ["Projects", "Templates", "Private"]) await mkdir(join(vault, folder), { recursive: true }); await mkdir(profile);
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Templates"], excluded: ["Private"] }, info.revision);
  const storage = new DesktopStorage(reader, profile), changes = new DesktopChanges(reader, storage), creator = new DesktopNewProject(reader, storage, changes);
  await storage.initialize(info.revision);
  if (options.writing !== false) {
    const compatibility = await storage.inspect(".obsidian", info.revision); await storage.enable(compatibility.id, info.revision);
    const preferences = storage.status(info.revision).preferences; Object.assign(preferences.roles, options.roles ?? { projects: "Projects", templates: "Templates" }); await storage.savePreferences(preferences, info.revision);
  }
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); });
  const apply = async () => { const batch = changes.snapshot(info.revision).pending!, preview = await changes.preview("apply", batch.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); };
  const files = async (folder: string): Promise<string[]> => (await readdir(join(vault, folder), { recursive: true })).map(String).sort();
  return { vault, info, creator, changes, storage, apply, files, read: (path: string) => readFile(join(vault, path), "utf8") };
}

test("a new project is one create-only reviewed proposal with the shared starter notes, written only on Apply", async t => {
  const f = await fixture(t), snapshot = await f.creator.prepare("project", "Pilot study", f.info.revision);
  assert.deepEqual([...snapshot.pending!.paths].sort(), ["Projects/Pilot study/Overview.md", "Projects/Pilot study/Questions.md", "Templates/Thread Decision.md", "Templates/Thread Project.md", "Templates/Thread Session.md"]);
  assert.deepEqual(await f.files("Projects"), []); assert.deepEqual(await f.files("Templates"), []);
  await f.apply();
  const overview = await f.read("Projects/Pilot study/Overview.md"); assert.equal(metadata(overview).type, "project"); assert.match(overview, /^# Pilot study$/m);
  assert.equal(metadata(await f.read("Projects/Pilot study/Questions.md")).project, metadata(overview).id);
  await assert.rejects(f.creator.prepare("project", "Pilot study", f.info.revision), /A project folder named Projects\/Pilot study already exists/);
  const second = await f.creator.prepare("project", "Second study", f.info.revision);
  assert.deepEqual([...second.pending!.paths].sort(), ["Projects/Second study/Overview.md", "Projects/Second study/Questions.md"]);
});

test("the sample project is one synthetic note in a new Projects folder, written only on Apply", async t => {
  const f = await fixture(t), snapshot = await f.creator.prepare("sample", "", f.info.revision), op = { path: snapshot.pending!.paths[0]! };
  assert.equal(snapshot.pending!.paths.length, 1); assert.match(op.path, /^Projects\/Thread Sample [a-f0-9-]+\/Overview\.md$/);
  assert.deepEqual(await f.files("Projects"), []);
  await f.apply(); const text = await f.read(op.path); assert.equal(metadata(text).thread_sample, "synthetic"); assert.match(text, /invented example content/);
});

test("invalid requests, missing folder settings and saving that is not allowed are refused plainly without writing", async t => {
  const f = await fixture(t);
  await assert.rejects(f.creator.prepare("folder", "X", f.info.revision), /Choose a sample project or a new project/);
  for (const name of ["", " ", "a".repeat(101)]) await assert.rejects(f.creator.prepare("project", name, f.info.revision), /1 to 100 characters/);
  for (const name of ["Bad/name", ".hidden", "a#b"]) await assert.rejects(f.creator.prepare("project", name, f.info.revision), /Use a project name without/);
  await assert.rejects(f.creator.prepare("project", "Stale", f.info.revision - 1), /approve read access first/);
  const noTemplates = await fixture(t, { roles: { projects: "Projects", templates: "" } });
  await assert.rejects(noTemplates.creator.prepare("project", "Pilot", noTemplates.info.revision), /Set Projects and Templates folders/);
  assert.equal((await noTemplates.creator.prepare("sample", "", noTemplates.info.revision)).pending!.paths.length, 1);
  const noProjects = await fixture(t, { roles: { projects: "", templates: "Templates" } });
  await assert.rejects(noProjects.creator.prepare("sample", "", noProjects.info.revision), /Set a Projects folder/);
  const readOnly = await fixture(t, { writing: false });
  await assert.rejects(readOnly.creator.prepare("sample", "", readOnly.info.revision), /Set a Projects folder/);
  const released = await fixture(t); await released.storage.release();
  await assert.rejects(released.creator.prepare("sample", "", released.info.revision), /allow saving/);
  for (const g of [f, noTemplates, noProjects, readOnly, released]) assert.deepEqual(await g.files("Projects"), []);
});

test("a project folder created by anything other than this apply is still refused, and nothing is left half-written", async t => {
  const f = await fixture(t); await f.creator.prepare("project", "Outside", f.info.revision);
  const batch = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", batch.id, f.info.revision);
  await mkdir(join(f.vault, "Projects", "Outside"));
  await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /The note changed/);
  assert.deepEqual(await f.files("Projects/Outside"), []); assert.deepEqual(await f.files("Templates"), []);
});

test("a project folder swapped in after the first new note is never counted as made by this apply", async t => {
  const f = await fixture(t); await f.creator.prepare("project", "Swap", f.info.revision);
  const writer = (f.changes as unknown as { writer: VaultWriter }).writer, create = writer.create.bind(writer); let swapped = false;
  writer.create = async (...args: Parameters<VaultWriter["create"]>) => {
    const chain = await create(...args);
    if (!swapped && args[0].startsWith("Projects/Swap/")) { swapped = true; await rename(join(f.vault, "Projects/Swap"), join(f.vault, "Projects/Moved")); await mkdir(join(f.vault, "Projects/Swap")); }
    return chain;
  };
  const batch = f.changes.snapshot(f.info.revision).pending!, preview = await f.changes.preview("apply", batch.id, f.info.revision);
  await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /Folders moved while writing|The note changed/);
  assert.equal(swapped, true); assert.deepEqual(await f.files("Projects/Swap"), []);
  assert.equal((await f.files("Projects/Moved")).length, 1);
});

test("an existing project folder is refused even when it holds no note Thread can read", async t => {
  const f = await fixture(t); await mkdir(join(f.vault, "Projects", "Empty")); await mkdir(join(f.vault, "Projects", "Images")); await writeFile(join(f.vault, "Projects", "Images", "a.png"), "png");
  for (const name of ["Empty", "Images"]) await assert.rejects(f.creator.prepare("project", name, f.info.revision), new RegExp(`A project folder named Projects/${name} already exists`));
  await f.creator.prepare("project", "Undone", f.info.revision); await f.apply();
  const applied = f.changes.snapshot(f.info.revision).history[0]!, undo = await f.changes.preview("undo", applied.id, f.info.revision); await f.changes.confirm(undo.id, f.info.revision);
  assert.deepEqual(await f.files("Projects/Undone"), []);
  await assert.rejects(f.creator.prepare("project", "Undone", f.info.revision), /A project folder named Projects\/Undone already exists/);
});

test("existing templates are found on disk even when the note listing stops before them", async t => {
  const f = await fixture(t); await mkdir(join(f.vault, "Projects", "Bulk"));
  for (let i = 0; i < 520; i++) await writeFile(join(f.vault, "Projects", "Bulk", `${String(i).padStart(3, "0")}.md`), `# Note ${i}\n`);
  for (const name of ["Thread Project", "Thread Decision", "Thread Session"]) await writeFile(join(f.vault, "Templates", `${name}.md`), "# Kept as it is\n");
  const snapshot = await f.creator.prepare("project", "Large vault", f.info.revision);
  assert.deepEqual([...snapshot.pending!.paths].sort(), ["Projects/Large vault/Overview.md", "Projects/Large vault/Questions.md"]);
  await f.apply(); assert.equal(await f.read("Templates/Thread Project.md"), "# Kept as it is\n");
});

test("a run-made folder swapped before the next note is refused, and a blocked next note rolls the first back", async t => {
  const swap = await fixture(t); await swap.creator.prepare("project", "Swap later", swap.info.revision);
  const writer = (swap.changes as unknown as { writer: VaultWriter }).writer, create = writer.create.bind(writer), inspect = writer.inspect.bind(writer); let created = 0, swapped = false;
  writer.create = async (...args: Parameters<VaultWriter["create"]>) => { const chain = await create(...args); created++; return chain; };
  writer.inspect = async (...args: Parameters<VaultWriter["inspect"]>) => {
    if (created === 1 && !swapped && args[0] === "Projects/Swap later/Questions.md") { swapped = true; await rename(join(swap.vault, "Projects/Swap later"), join(swap.vault, "Projects/Moved")); await mkdir(join(swap.vault, "Projects/Swap later")); }
    return inspect(...args);
  };
  const batch = swap.changes.snapshot(swap.info.revision).pending!, preview = await swap.changes.preview("apply", batch.id, swap.info.revision);
  await assert.rejects(swap.changes.confirm(preview.id, swap.info.revision), /The note changed/);
  assert.equal(swapped, true); assert.deepEqual(await swap.files("Projects/Swap later"), []); assert.deepEqual(swap.changes.snapshot(swap.info.revision).history, []);
  const block = await fixture(t); await block.creator.prepare("project", "Blocked", block.info.revision);
  const writer2 = (block.changes as unknown as { writer: VaultWriter }).writer, create2 = writer2.create.bind(writer2); let first = true;
  writer2.create = async (...args: Parameters<VaultWriter["create"]>) => { const chain = await create2(...args); if (first) { first = false; await writeFile(join(block.vault, "Projects/Blocked/Questions.md"), "outside"); } return chain; };
  const batch2 = block.changes.snapshot(block.info.revision).pending!, preview2 = await block.changes.preview("apply", batch2.id, block.info.revision);
  await assert.rejects(block.changes.confirm(preview2.id, block.info.revision), /The note changed/);
  assert.deepEqual(await block.files("Projects/Blocked"), ["Questions.md"]); assert.equal(await block.read("Projects/Blocked/Questions.md"), "outside");
  assert.deepEqual(block.changes.snapshot(block.info.revision).history, []);
});
