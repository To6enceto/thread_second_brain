import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import type { ViewStateResult, WorkspaceLeaf } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { LocalIndex } from "../vault/index.ts";
import { buildEvidence } from "../vault/evidence.ts";

// Exercise the actual shared lifecycle; native layout/navigation is checked in Obsidian.
const compiled = await build({
  entryPoints: [new URL("./thread-workspace-view.ts", import.meta.url).pathname],
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "host-api-stub", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "host-stub" }));
    builder.onLoad({ filter: /.*/, namespace: "host-stub" }, () => ({ contents: `
      export class ItemView {
        constructor(leaf) { this.app = leaf.app; }
        async setState(state) { this.hostState = state; }
      }
      export class TFile {}
      export class WorkspaceLeaf {}
      export function setIcon() {}
    ` }));
  } }]
});
const { ThreadWorkspaceView } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString("base64")}`) as typeof import("./thread-workspace-view.ts");
const bundle = await buildEvidence([{
  path: "P/Overview.md", text: "## Objective\nPreserve open notes.",
  metadata: { type: "project" }, modifiedAt: 1
}]);
function fixture() {
  let layoutSaves = 0, settingsSaves = 0;
  const settings = { ...defaultSettings(), selectedProject: "P", allowedPaths: ["P"] };
  const index = new LocalIndex(); index.ready = true;
  const plugin = {
    settings, index, changes: { state: { pending: null } },
    evidence: async () => bundle, evidenceCurrent: async () => true,
    updateSettings: async () => { settingsSaves++; }
  };
  const view = new ThreadWorkspaceView({
    app: { workspace: { requestSaveLayout: () => { layoutSaves++; } } }
  } as unknown as WorkspaceLeaf, plugin as unknown as ThreadPlugin);
  view.render = () => {};
  return { view, plugin, saves: () => ({ layoutSaves, settingsSaves }) };
}

test("restored workspace state retains only known presentation areas without grants or inference", async () => {
  const { view, plugin, saves } = fixture();
  const before = JSON.stringify(plugin.settings);
  let requests = 0;
  plugin.evidence = async () => { requests++; return bundle; };
  for (const state of [null, [], "reviews", { area: "ask" }, { area: "__proto__" }]) {
    await view.setState(state, {} as ViewStateResult);
    assert.deepEqual(view.getState(), { area: "home" });
  }
  for (const area of ["research", "actions", "reviews"]) {
    await view.setState({ area, selectedProject: "Secret", allowedPaths: ["/"], answer: "stale" }, {} as ViewStateResult);
    assert.deepEqual(view.getState(), { area });
  }
  assert.equal(JSON.stringify(plugin.settings), before);
  assert.equal(requests, 0);
  assert.deepEqual(saves(), { layoutSaves: 0, settingsSaves: 0 });
});

test("workspace navigation aborts pending Resume and suppresses late evidence", async () => {
  const { view, plugin, saves } = fixture();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  plugin.evidence = async () => { await pending; return bundle; };
  const generation = view.resume(), controller = view.controller!;
  assert(controller);
  await view.navigate("research");
  assert(controller.signal.aborted);
  assert.equal(view.controller, null);
  release(); await generation;
  assert.equal(view.bundle, null); assert.equal(view.result, null);
  assert.deepEqual(view.getState(), { area: "research" });
  assert.deepEqual(saves(), { layoutSaves: 1, settingsSaves: 0 });
});

test("source changes and closure revoke workspace output through the shared lifecycle", async () => {
  const { view } = fixture();
  await view.resume(); assert(view.result);
  view.sourcesChanged(new Set(["P/Overview.md"]));
  assert.equal(view.result, null); assert.equal(view.bundle, null);
  await view.resume(); assert(view.result);
  await view.onClose();
  assert.equal(view.result, null); assert.equal(view.bundle, null);
  const revision = view.revision;
  await view.navigate("actions");
  assert.equal(view.revision, revision, "closed views cannot restart work");
});

test("workspace refuses an unavailable project without saving broader settings", async () => {
  const { view, plugin, saves } = fixture();
  const before = JSON.stringify(plugin.settings);
  await view.switchProject("Excluded project");
  assert.match(view.message, /no longer permitted/);
  assert.equal(JSON.stringify(plugin.settings), before);
  assert.deepEqual(saves(), { layoutSaves: 0, settingsSaves: 0 });
});
