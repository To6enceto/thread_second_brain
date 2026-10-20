import assert from "node:assert/strict";
import { build } from "esbuild";
import type { WorkspaceLeaf } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { LocalIndex } from "../vault/index.ts";
import { buildEvidence } from "../vault/evidence.ts";

// Execute the actual view lifecycle without a DOM; native rendering is tested in Obsidian.
const compiled = await build({
  entryPoints: [new URL("./briefing-view.ts", import.meta.url).pathname], bundle: true, write: false,
  format: "esm", platform: "node", plugins: [{ name: "host-api-stub", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host-stub" }));
    builder.onLoad({ filter: /.*/, namespace: "host-stub" }, () => ({ contents: "export class ItemView {} export class TFile {} export class WorkspaceLeaf {} export function setIcon() {}" }));
  } }]
});
const { BriefingView } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString("base64")}`) as typeof import("./briefing-view.ts");
let release!: () => void;
const rebuilding = new Promise<void>(resolve => { release = resolve; });
const index = new LocalIndex();
const bundle = await buildEvidence([{ path: "P/Overview.md", text: "## Objective\nKeep working offline.", metadata: { type: "project" }, modifiedAt: 1 }]);
const plugin = {
  settings: { ...defaultSettings(), selectedProject: "P", allowedPaths: ["P"] }, index,
  rebuildIndex: async () => { await rebuilding; index.ready = true; },
  evidence: async () => bundle,
  changes: { state: { pending: null } }
};
const view = new BriefingView({} as WorkspaceLeaf, plugin as unknown as ThreadPlugin);
view.render = () => {};
const loading = view.loadHome();
assert.equal(view.homeLoading, true);
await view.resume();
assert.equal(view.homeLoading, false, "Resume must release superseded home loading controls");
assert(view.recorded?.sections.objective[0]?.text.includes("offline"));
release(); await loading;
assert.equal(view.homeLoading, false, "The superseded loader must not relock controls");
assert.equal(view.controller, null);
