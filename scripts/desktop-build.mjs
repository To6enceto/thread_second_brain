import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { copyPdfResources, verifiedPdfPackageFiles, writePdfInventory } from "./pdf-assets.mjs";
const output = ".thread-local/desktop/build";
const release = JSON.parse(await readFile("src/standalone/desktop-release.json", "utf8"));
await mkdir(output, { recursive: true });
// Bundled third-party packages, recorded so packaging can ship each license.
const bundled = new Set();
const record = metafile => { for (const input of Object.keys(metafile.inputs)) { const match = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input); if (match) bundled.add(match[1]); } };
for (const [entry, name, platform, format] of [
  ["main", "main.cjs", "node", "cjs"], ["preload", "preload.cjs", "node", "cjs"],
  ["renderer", "renderer.js", "browser", "iife"]
]) {
  const result = await build({ entryPoints: [`src/standalone/${entry}.ts`], outfile: `${output}/${name}`,
    bundle: true, platform, format, target: "es2022", external: ["electron"], metafile: true });
  record(result.metafile);
  if (Object.keys(result.metafile.inputs).some(path => path.includes("node_modules/obsidian") || path === "src/main.ts")) throw new Error("Desktop must not bundle the Obsidian host.");
  if (entry === "renderer" && Object.values(result.metafile.outputs).some(file => file.imports.length)) throw new Error("Desktop renderer must be self-contained.");
}
for (const file of ["app.html", "styles.css"]) await copyFile(`src/standalone/${file}`, `${output}/${file}`);
// The renderer starts this worker only after main re-verifies the build inventory hashes.
copyPdfResources(output);
record((await build({ entryPoints: ["src/pdf/worker.ts"], outfile: `${output}/pdf-extract-worker.js`, bundle: true, platform: "browser", format: "iife", target: "es2022", minify: true, metafile: true })).metafile);
writePdfInventory(output); verifiedPdfPackageFiles(output);
await writeFile(`${output}/third-party.json`, JSON.stringify([...bundled].sort(), null, 2) + "\n");
await writeFile(`${output}/package.json`, JSON.stringify({ name: release.name, version: release.version, private: true, main: "main.cjs" }, null, 2) + "\n");
console.log(`Desktop build ready in ${output}. Start with npm run desktop:start.`);
