import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, symlink, chmod, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_FILES, licenseFile, stagedFiles, validateInventory, type PackageInventory } from "./desktop-package.ts";
import { decodeRelease } from "../desktop/update-package.ts";

const release = { name: "thread-desktop", version: "0.1.0" };
async function folder(t: TestContext) { const root = await mkdtemp(join(tmpdir(), "thread-desktop-package-")); t.after(() => rm(root, { recursive: true, force: true })); return root; }
async function staged(root: string): Promise<void> {
  const files = ["thread-desktop", "thread-desktop.desktop.example", "README.txt", "licenses/electron-LICENSE.txt", "licenses/LICENSES.chromium.html", "licenses/yaml-LICENSE.txt", "runtime/electron", "runtime/chrome-sandbox", "runtime/resources/app/pdf-resources/cmaps/LICENSE", ...APP_FILES.map(name => `runtime/resources/app/${name}`)];
  for (const path of files) { await mkdir(join(root, path, ".."), { recursive: true }); await writeFile(join(root, path), path); }
  await chmod(join(root, "thread-desktop"), 0o755); await chmod(join(root, "runtime/electron"), 0o755);
}
const inventory = (root: string): PackageInventory => ({ ...release, electron: "45.0.0", files: stagedFiles(root) });

test("staged desktop packages validate their full inventory, licenses, version and executables", async t => {
  const root = await folder(t); await staged(root); validateInventory(inventory(root), release, ["yaml"]);
  const files = inventory(root); assert.equal(files.files.find(file => file.path === "thread-desktop")!.executable, true); assert.match(files.files[0]!.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => validateInventory(inventory(root), release, ["yaml", "pdfjs-dist"]), /licenses\/pdfjs-dist-LICENSE\.txt/);
  assert.throws(() => validateInventory(inventory(root), { ...release, version: "0.2.0" }, ["yaml"]), /version/);
  await writeFile(join(root, "runtime/resources/default_app.asar"), "default"); assert.throws(() => validateInventory(inventory(root), release, ["yaml"]), /default app/); await rm(join(root, "runtime/resources/default_app.asar"));
  await writeFile(join(root, "runtime/resources/app/extra.js"), "unexpected"); assert.throws(() => validateInventory(inventory(root), release, ["yaml"]), /Unexpected packaged app file/); await rm(join(root, "runtime/resources/app/extra.js"));
  await writeFile(join(root, "notes.md"), "stray"); assert.throws(() => validateInventory(inventory(root), release, ["yaml"]), /Unexpected packaged path/); await rm(join(root, "notes.md"));
  await rm(join(root, "runtime/resources/app/preload.cjs")); assert.throws(() => validateInventory(inventory(root), release, ["yaml"]), /missing: runtime\/resources\/app\/preload\.cjs/);
  await writeFile(join(root, "runtime/resources/app/preload.cjs"), "x"); await chmod(join(root, "thread-desktop"), 0o644); assert.throws(() => validateInventory(inventory(root), release, ["yaml"]), /executable/);
  await symlink("/etc/passwd", join(root, "runtime/link")); assert.throws(() => stagedFiles(root), /link or special file/);
});

test("bundled package licenses are required and package names are checked", async t => {
  const root = await folder(t); await mkdir(join(root, "with-license")); await writeFile(join(root, "with-license/LICENSE.md"), "MIT"); await mkdir(join(root, "@scope/pkg"), { recursive: true }); await writeFile(join(root, "@scope/pkg/COPYING"), "ISC"); await mkdir(join(root, "bare"));
  assert.equal(licenseFile(root, "with-license"), join(root, "with-license/LICENSE.md")); assert.equal(licenseFile(root, "@scope/pkg"), join(root, "@scope/pkg/COPYING"));
  assert.throws(() => licenseFile(root, "bare"), /no license file/); assert.throws(() => licenseFile(root, "../escape"), /Unexpected bundled package name/);
});

test("the plugin updater refuses a desktop tar.gz package", async t => {
  const root = await folder(t); await staged(join(root, "thread-desktop-0.1.0"));
  const tar = spawnSync("tar", ["-C", root, "-cf", "-", "thread-desktop-0.1.0"], { maxBuffer: 1 << 24 }), gzip = spawnSync("gzip", ["-n", "-c"], { input: tar.stdout });
  assert.equal(tar.status, 0); assert.equal(gzip.status, 0); assert.ok(gzip.stdout.length > 200, "a real desktop archive was built"); await writeFile(join(root, "desktop.tar.gz"), gzip.stdout);
  const bytes = Buffer.from(await readFile(join(root, "desktop.tar.gz"))); assert.throws(() => decodeRelease(bytes));
});
