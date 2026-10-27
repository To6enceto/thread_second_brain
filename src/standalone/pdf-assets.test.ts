import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDF_PARSER } from "../pdf/record.ts";
import { DesktopPdfAssets } from "./pdf-assets.ts";

const sha = (data: string): string => createHash("sha256").update(data).digest("hex");
async function fixture(t: import("node:test").TestContext) {
  const base = await mkdtemp(join(tmpdir(), "thread-pdf-assets-")); t.after(() => rm(base, { recursive: true, force: true }));
  const files: Record<string, string> = { "pdf-extract-worker.js": "postMessage('worker')", "pdf-resources/pdfjs-LICENSE.txt": "license", "pdf-resources/cmaps/LICENSE": "cmap license", "pdf-resources/standard_fonts/LICENSE_FOXIT": "foxit" };
  await mkdir(join(base, "pdf-resources/cmaps"), { recursive: true }); await mkdir(join(base, "pdf-resources/standard_fonts"), { recursive: true });
  for (const [path, data] of Object.entries(files)) await writeFile(join(base, path), data);
  await writeFile(join(base, "pdf-assets.json"), JSON.stringify({ schemaVersion: 1, parser: PDF_PARSER, files: Object.entries(files).map(([path, data]) => ({ path, bytes: data.length, hash: sha(data) })) }));
  await writeFile(join(base, "outside.txt"), "not inventoried");
  return { base, assets: new DesktopPdfAssets(base) };
}

test("desktop PDF assets serve only inventoried packaged files with matching size and hash", async t => {
  const { base, assets } = await fixture(t);
  assert.equal(Buffer.from(await assets.read("pdf-extract-worker.js")).toString(), "postMessage('worker')");
  assert.match(Buffer.from(await assets.read("pdf-assets.json")).toString(), /pdfjs-dist/);
  for (const path of ["outside.txt", "../outside.txt", "/etc/passwd", "pdf-resources/cmaps/missing.bcmap", 42, null]) await assert.rejects(assets.read(path), /Only packaged/);
  await writeFile(join(base, "pdf-resources/cmaps/LICENSE"), "cmap licenSE");
  await assert.rejects(assets.read("pdf-resources/cmaps/LICENSE"), /missing or changed/);
  await writeFile(join(base, "pdf-extract-worker.js"), "postMessage('worker') plus injected code");
  await assert.rejects(assets.read("pdf-extract-worker.js"), /missing or changed/);
});

test("desktop PDF assets refuse a malformed or missing inventory without serving files", async t => {
  const { base, assets } = await fixture(t);
  await writeFile(join(base, "pdf-assets.json"), JSON.stringify({ schemaVersion: 1, parser: "other", files: [] }));
  await assert.rejects(assets.read("pdf-extract-worker.js"), /missing or changed/);
  await rm(join(base, "pdf-assets.json"));
  await assert.rejects(new DesktopPdfAssets(base).read("pdf-extract-worker.js"), /missing or changed/);
});
