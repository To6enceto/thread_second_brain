import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, symlink, link, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { readPickedText } from "./text-import.ts";
import { hashText } from "./profile.ts";

test("native selected text preserves BOM/CRLF decoded bytes and leaves its original unchanged", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-picked-")); t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "Original.txt"), text = "\uFEFFOriginal research\r\nNo rewriting.\r\n"; await writeFile(path, text); const before = await readFile(path);
  const picked = await readPickedText(path, () => {}); assert.deepEqual(picked, { name: "Original.txt", text, hash: hashText(text) }); assert.deepEqual(await readFile(path), before);
});
test("native intake refuses unsupported, empty, invalid UTF-8, oversized, linked and special files", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-picked-")); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "valid.md"), "source"); await writeFile(join(root, "invalid.txt"), Buffer.from([0xc0, 0xaf])); await writeFile(join(root, "empty.md"), " "); await writeFile(join(root, "large.txt"), "x".repeat(2 * 1048576 + 1));
  await symlink(join(root, "valid.md"), join(root, "linked.md")); await link(join(root, "valid.md"), join(root, "hard.md")); await mkdir(join(root, "directory.md")); execFileSync("mkfifo", [join(root, "pipe.txt")]);
  for (const name of ["invalid.txt", "empty.md", "large.txt", "linked.md", "hard.md", "valid.md", "directory.md", "pipe.txt", "page.html", ".hidden.md"]) await assert.rejects(readPickedText(join(root, name), () => {}), name);
  await mkdir(join(root, "parent")); await writeFile(join(root, "parent/child.md"), "source"); await symlink(join(root, "parent"), join(root, "alias")); await assert.rejects(readPickedText(join(root, "alias/child.md"), () => {}));
  await assert.rejects(readPickedText("relative.md", () => {}));
});
test("native text reader rejects cancellation and a replaced source instead of publishing obsolete bytes", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-picked-")); t.after(() => rm(root, { recursive: true, force: true })); const path = join(root, "Source.md"); await writeFile(path, "old source");
  let calls = 0; await assert.rejects(readPickedText(path, () => { if (++calls === 3) throw Error("Canceled selection"); }), /Canceled selection/);
  calls = 0; await assert.rejects(readPickedText(path, () => { if (++calls === 3) execFileSync(process.execPath, ["-e", "require('fs').writeFileSync(process.argv[1], 'replacement source')", path]); }), /changed while Thread was reading/);
  assert.equal(await readFile(path, "utf8"), "replacement source");
});
