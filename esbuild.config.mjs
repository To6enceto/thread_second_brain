import { context } from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

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
  await buildContext.watch();
} else {
  try {
    await buildContext.rebuild();
  } finally {
    await buildContext.dispose();
  }
}
