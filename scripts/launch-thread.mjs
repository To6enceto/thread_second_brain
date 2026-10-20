import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import {
  launcherConfig, readLauncherConfig, desktopEntry, writeShortcut, checkInstallation,
  checkLocalServer, ensureLocalServer, startOllama, openObsidian
} from "../src/desktop/launcher.ts";

const [command, input, output, ...extra] = process.argv.slice(2);
const script = fileURLToPath(import.meta.url);
try {
  if (command === "init" && input && output && extra.length === 1) {
    const config = launcherConfig({ version: 1, vaultPath: resolve(input), vaultId: extra[0],
      obsidian: { kind: "flatpak", executable: "/usr/bin/flatpak" },
      ollama: { port: 11434, startIfMissing: false } });
    const directory = resolve(output), configPath = join(directory, "launcher.json");
    await mkdir(directory); // Exclusive directory prevents mixing with an earlier artifact.
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await writeShortcut(join(directory, "thread.desktop"), desktopEntry(process.execPath, script, configPath));
    console.log(`Created launcher.json and thread.desktop in ${directory}. Nothing installed or started.\nReview the config, run "check", then "run". See docs/launcher.md.`);
  } else if (command === "shortcut" && input && output && extra.length === 0) {
    const configPath = resolve(input);
    await readLauncherConfig(configPath);
    await writeShortcut(resolve(output), desktopEntry(process.execPath, script, configPath));
    console.log("Created shortcut artifact. Nothing installed or started.");
  } else if ((command === "run" || command === "check") && input
    && (output === undefined || command === "run" && output === "--desktop") && extra.length === 0) {
    const configPath = resolve(input), config = await readLauncherConfig(configPath);
    await checkInstallation(config);
    if (command === "check") {
      console.log(`Installation files and enabled-plugin entry found. Ollama: ${await checkLocalServer(config.ollama.port)}. Nothing started. A launch is still needed to verify the desktop session.`);
    } else {
      const directory = dirname(configPath);
      console.log("Checking local Ollama...");
      console.log(await ensureLocalServer(config.ollama, {
        check: checkLocalServer, start: settings => startOllama(settings, join(directory, "ollama-launch.log")),
        wait: ms => new Promise(resolveWait => setTimeout(resolveWait, ms)), now: Date.now
      }));
      await openObsidian(config, join(directory, "obsidian-launch.log"));
      console.log("Open request sent to Obsidian. If Thread is not shown, open this vault once and enable the updated plugin. The launcher does not grant read access.");
    }
  } else throw Error("Usage: npm run launcher -- init <vault-path> <new-artifact-directory> <vault-id>\n       npm run launcher -- check|run <launcher.json>\n       npm run launcher -- shortcut <launcher.json> <new.desktop>");
} catch (error) {
  console.error(`Launch Thread: ${error instanceof Error ? error.message : "Unexpected launcher failure."}`);
  process.exitCode = 1;
  if (process.argv.includes("--desktop") && process.stdin.isTTY) {
    const terminal = createInterface({ input: process.stdin, output: process.stderr });
    try { await terminal.question("Press Enter to close. "); } finally { terminal.close(); }
  }
}
