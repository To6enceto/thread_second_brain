import { context } from "esbuild";
import {copyPdfResources,writePdfInventory} from "./scripts/pdf-assets.mjs";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

copyPdfResources();
const pdfContext=await context({entryPoints:["src/pdf/worker.ts"],outfile:"pdf-extract-worker.js",bundle:true,platform:"browser",format:"iife",target:"es2022",minify:production,logLevel:"info",plugins:[{name:"local-pdf-inventory",setup(build){build.onEnd(result=>{if(!result.errors.length)writePdfInventory();});}}]});
const buildContext = await context({
  entryPoints: ["src/main.ts"],
  outfile: "main.js",
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  platform: "browser",
  format: "cjs",
  target: "es2022",
  sourcemap: production ? false : "inline",
  minify: production,
  logLevel: "info"
});

if (watch) {
  await pdfContext.watch();
  await buildContext.watch();
} else {
  try {
    await pdfContext.rebuild();
    await buildContext.rebuild();
  } finally {
    await pdfContext.dispose();
    await buildContext.dispose();
  }
}
