import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  launcherConfig, launchArguments, desktopArgument, desktopEntry, writeShortcut,
  checkInstallation, readLauncherConfig, checkLocalServer, ensureLocalServer, startOllama, LocalStatusTimeout
} from "./launcher.ts";

const example = () => ({ version: 1, vaultPath: "/tmp/Vault & % $(command)", vaultId: "0123456789abcdef",
  obsidian: { kind: "flatpak", executable: "/usr/bin/flatpak" },
  ollama: { port: 11434, startIfMissing: false } });

test("launcher schema rejects unsupported config, relative/control paths and incomplete startup consent", () => {
  const config = launcherConfig(example());
  assert.equal(config.ollama.startIfMissing, false);
  assert.equal(launcherConfig({ ...example(), ollama: { port: 11434 } }).ollama.startIfMissing, false);
  for (const patch of [{ version: 2 }, { command: "sh" }, { vaultPath: "../vault" }, { vaultId: "/tmp/vault" },
    { vaultPath: "/tmp/../vault" }, { vaultPath: "/tmp/a\nExec=bad" },
    { obsidian: { kind: "flatpak", executable: "flatpak" } },
    { ollama: { port: 0, startIfMissing: false } },
    { ollama: { port: 11434, startIfMissing: "yes" } },
    { ollama: { port: 11434, startIfMissing: null } },
    { ollama: { port: 11434, startIfMissing: true } }]) {
    assert.throws(() => launcherConfig({ ...example(), ...patch }));
  }
  assert.deepEqual(launchArguments(config), ["run", "md.obsidian.Obsidian",
    "obsidian://thread?vault=0123456789abcdef&threadVault=%2Ftmp%2FVault%20%26%20%25%20%24(command)"]);
  config.obsidian.profilePath = "/tmp/Profile Space";
  assert.equal(launchArguments(config)[2], "--user-data-dir=/tmp/Profile Space");
});

test("desktop Exec escaping preserves literal argument data and artifacts refuse collisions", async () => {
  // Literal backslash, quote, dollar, backtick and percent require different layers.
  const raw = '/tmp/A "B" \\ $HOME `x` %U';
  const encoded = desktopArgument(raw);
  const entryDecoded = encoded.replace(/\\\\/g, "\\");
  const argument = entryDecoded.slice(1, -1).replace(/\\([\\"`$])/g, "$1").replace(/%%/g, "%");
  assert.equal(argument, raw);
  assert.ok(encoded.includes("%%U"));
  const directory = await mkdtemp(join(tmpdir(), "thread-shortcut-"));
  try {
    const path = join(directory, "thread.desktop");
    const content = desktopEntry("/usr/bin/node", "/tmp/a b/launch.mjs", "/tmp/config.json");
    assert.ok(content.includes("Terminal=true"));
    assert.ok(!content.includes("sh -c"));
    await writeShortcut(path, content);
    await assert.rejects(writeShortcut(path, "replacement"), /EEXIST/);
    assert.equal(await readFile(path, "utf8"), content);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("launcher preflight reads only configured plugin metadata and reports missing/disabled installs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "thread-launch-install-"));
  try {
    const config = launcherConfig({ ...example(), vaultPath: directory,
      obsidian: { kind: "executable", executable: process.execPath } });
    await assert.rejects(checkInstallation(config), /Install and enable Thread/);
    const plugin = join(directory, ".obsidian/plugins/thread");
    await mkdir(plugin, { recursive: true });
    await writeFile(join(plugin, "manifest.json"), '{"id":"thread"}');
    await writeFile(join(plugin, "main.js"), "test");
    await writeFile(join(directory, ".obsidian/community-plugins.json"), '["thread"]');
    await checkInstallation(config);
    await writeFile(join(directory, ".obsidian/community-plugins.json"), "[]");
    await assert.rejects(checkInstallation(config), /Install and enable Thread/);
    const path = join(directory, "launcher.json");
    await writeFile(path, JSON.stringify(config)); assert.deepEqual(await readLauncherConfig(path), config);
    await writeFile(path, " ".repeat(16385)); await assert.rejects(readLauncherConfig(path), /bounded/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("local status is bounded, refuses redirects/unknown cloud and distinguishes absence from timeout", async () => {
  let mode = "ready";
  const server = createServer((request, response) => {
    assert.equal(request.url, "/api/status");
    if (mode === "timeout") return;
    if (mode === "redirect") { response.writeHead(302, { Location: "https://example.invalid" }); response.end(); return; }
    response.end(mode === "ready" ? '{"cloud":{"disabled":true}}' :
      mode === "cloud" ? '{"cloud":{"disabled":false}}' :
      mode === "oversize" ? " ".repeat(65537) : "invalid");
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    assert.equal(await checkLocalServer(port), "ready");
    mode = "cloud"; await assert.rejects(checkLocalServer(port), /cloud features/);
    mode = "redirect"; await assert.rejects(checkLocalServer(port), /redirects/);
    mode = "invalid"; await assert.rejects(checkLocalServer(port), /Invalid/);
    mode = "oversize"; await assert.rejects(checkLocalServer(port), /limit/);
    mode = "timeout"; await assert.rejects(checkLocalServer(port), /timed out/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  assert.equal(await checkLocalServer(port), "absent");
});

test("existing server, absent without consent, unsafe status and failed startup do not start competing processes", async () => {
  let starts = 0, time = 0;
  const config = launcherConfig({ ...example(), ollama: { port: 11434 } }).ollama;
  const port = {
    check: async (): Promise<"ready" | "absent"> => "ready",
    start: async () => { starts++; return () => false; },
    wait: async (ms: number) => { time += ms; }, now: () => time
  };
  assert.match(await ensureLocalServer(config, port), /Existing/); assert.equal(starts, 0);
  port.check = async () => "absent";
  assert.match(await ensureLocalServer(config, port), /recorded-only/); assert.equal(starts, 0);
  const consented = { ...config, startIfMissing: true, executable: "/local/ollama", modelsPath: "/local/models" };
  port.check = async () => { throw Error("Unsafe existing server"); };
  await assert.rejects(ensureLocalServer(consented, port), /Unsafe/); assert.equal(starts, 0);
  let checks = 0;
  port.check = async () => ++checks < 3 ? "absent" : "ready";
  assert.match(await ensureLocalServer(consented, port), /Consented/); assert.equal(starts, 1);
  checks = 0;
  port.check = async () => {
    checks++;
    if (checks === 1) return "absent";
    if (checks === 2) throw new LocalStatusTimeout("Owned server is warming up");
    return "ready";
  };
  assert.match(await ensureLocalServer(consented, port), /Consented/); assert.equal(starts, 2);
  port.check = async () => { throw new LocalStatusTimeout("Existing server is unresponsive"); };
  await assert.rejects(ensureLocalServer(consented, port), /unresponsive/); assert.equal(starts, 2);
  port.check = async () => "absent";
  port.start = async () => { starts++; return () => true; };
  await assert.rejects(ensureLocalServer(consented, port), /exited/);
  port.start = async () => { starts++; return () => false; };
  await assert.rejects(ensureLocalServer(consented, port), /20 seconds/);
});

test("owned runtime startup passes safe argv and overrides host cloud/bind settings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "thread-owned-start-"));
  try {
    const runtime = join(directory, "runtime");
    const output = join(directory, "environment.json");
    await writeFile(runtime, `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(output)},JSON.stringify({args:process.argv.slice(2),host:process.env.OLLAMA_HOST,cloud:process.env.OLLAMA_NO_CLOUD,models:process.env.OLLAMA_MODELS}));\n`, { mode: 0o700 });
    const config = { port: 12123, startIfMissing: true, executable: runtime, modelsPath: directory };
    await assert.rejects(startOllama({ ...config, startIfMissing: false }, join(directory, "bad.log")), /consented/);
    const original = join(directory, "preserved.md");
    await writeFile(original, "Preserve this file.");
    await symlink(original, join(directory, "linked.log"));
    await assert.rejects(startOllama(config, join(directory, "linked.log")), /ELOOP/);
    assert.equal(await readFile(original, "utf8"), "Preserve this file.");
    const exited = await startOllama(config, join(directory, "launch.log"));
    for (let i = 0; !exited() && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(exited(), true);
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), {
      args: ["serve"], host: "127.0.0.1:12123", cloud: "1", models: directory
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
