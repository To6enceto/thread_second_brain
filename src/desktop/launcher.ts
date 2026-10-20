// This module belongs to the local Node helper, never the Obsidian bundle.
import { access, open, stat, writeFile } from "node:fs/promises";
import { constants, openSync, closeSync, fstatSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { get } from "node:http";
import { spawn } from "node:child_process";

export interface LauncherConfig {
  version: 1;
  vaultPath: string;
  vaultId: string;
  obsidian: { kind: "flatpak" | "executable"; executable: string; profilePath?: string };
  ollama: { port: number; startIfMissing: boolean; executable?: string; modelsPath?: string };
}

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) throw Error("Unexpected launcher configuration. Use the version 1 example in docs/launcher.md.");
  return value as Record<string, unknown>;
}
function absolute(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)
    || !isAbsolute(value) || resolve(value) !== value) throw Error(`${label} must be a normalized absolute path without control characters.`);
  return value;
}
export function launcherConfig(value: unknown): LauncherConfig {
  const root = record(value, ["version", "vaultPath", "vaultId", "obsidian", "ollama"]);
  const obsidian = record(root.obsidian, ["kind", "executable", "profilePath"]);
  const ollama = record(root.ollama, ["port", "startIfMissing", "executable", "modelsPath"]);
  const startIfMissing = ollama.startIfMissing === undefined ? false : ollama.startIfMissing;
  if (root.version !== 1 || !["flatpak", "executable"].includes(String(obsidian.kind))
    || !Number.isInteger(ollama.port) || Number(ollama.port) < 1 || Number(ollama.port) > 65535
    || typeof startIfMissing !== "boolean") throw Error("Unsupported launcher version, Obsidian kind, Ollama port or startup consent.");
  if (typeof root.vaultId !== "string" || !/^[a-f0-9]{16}$/.test(root.vaultId)) {
    throw Error("Copy the 16-character vault ID from Obsidian's vault switcher and set vaultId.");
  }
  const result: LauncherConfig = {
    version: 1, vaultPath: absolute(root.vaultPath, "Vault"), vaultId: root.vaultId,
    obsidian: { kind: obsidian.kind as "flatpak" | "executable", executable: absolute(obsidian.executable, "Obsidian executable") },
    ollama: { port: Number(ollama.port), startIfMissing }
  };
  if (obsidian.profilePath !== undefined) result.obsidian.profilePath = absolute(obsidian.profilePath, "Obsidian profile");
  if (ollama.executable !== undefined) result.ollama.executable = absolute(ollama.executable, "Ollama executable");
  if (ollama.modelsPath !== undefined) result.ollama.modelsPath = absolute(ollama.modelsPath, "Ollama models");
  if (result.ollama.startIfMissing && (!result.ollama.executable || !result.ollama.modelsPath)) {
    throw Error("Consented Ollama startup requires executable and modelsPath. Nothing will be downloaded.");
  }
  return result;
}
async function readJson(path: string, limit: number): Promise<unknown> {
  const file = await open(path, "r");
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit) throw Error("Launcher metadata is not a bounded regular file.");
    const data = Buffer.alloc(limit + 1);
    const { bytesRead } = await file.read(data, 0, data.length, 0);
    if (bytesRead > limit) throw Error("Launcher metadata exceeds its size limit.");
    return JSON.parse(data.subarray(0, bytesRead).toString("utf8")) as unknown;
  } finally { await file.close(); }
}
export async function readLauncherConfig(path: string): Promise<LauncherConfig> {
  return launcherConfig(await readJson(path, 16384));
}
export function launchArguments(config: LauncherConfig): string[] {
  const uri = `obsidian://thread?vault=${config.vaultId}&threadVault=${encodeURIComponent(config.vaultPath)}`;
  const args = config.obsidian.kind === "flatpak" ? ["run", "md.obsidian.Obsidian"] : [];
  if (config.obsidian.profilePath) args.push(`--user-data-dir=${config.obsidian.profilePath}`);
  return [...args, uri];
}

// Desktop Entry applies string escaping before parsing Exec quoting/field codes.
export function desktopArgument(value: string): string {
  if (/[\u0000-\u001f\u007f]/.test(value)) throw Error("Shortcut arguments cannot contain control characters.");
  const quoted = value.replace(/%/g, "%%").replace(/[\\"`$]/g, character => `\\${character}`);
  return `"${quoted.replace(/\\/g, "\\\\")}"`;
}
export function desktopEntry(node: string, script: string, configPath: string): string {
  const args = [absolute(node, "Node"), "--experimental-strip-types", absolute(script, "Launcher"),
    "run", absolute(configPath, "Config"), "--desktop"];
  return `[Desktop Entry]\nType=Application\nName=Launch Thread\nComment=Open the configured Obsidian vault and Thread\nExec=${args.map(desktopArgument).join(" ")}\nTerminal=true\nIcon=md.obsidian.Obsidian\nCategories=Office;\n`;
}
export async function writeShortcut(path: string, content: string): Promise<void> {
  await writeFile(path, content, { flag: "wx", mode: 0o700 });
}

export type ServerStatus = "ready" | "absent";
export class LocalStatusTimeout extends Error {}
export function checkLocalServer(port: number): Promise<ServerStatus> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return Promise.reject(Error("Invalid local port."));
  return new Promise((resolveStatus, reject) => {
    const request = get({ hostname: "127.0.0.1", port, path: "/api/status", agent: false }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        request.destroy(Error("Local Ollama status is unavailable. Update Ollama and check the configured port; redirects are refused."));
        return;
      }
      const chunks: Buffer[] = []; let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 65536) request.destroy(Error("Local status exceeds its metadata limit."));
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        try {
          const status = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { cloud?: { disabled?: unknown } } | null;
          if (status?.cloud?.disabled !== true) throw Error("Ollama cloud features are not confirmed disabled. Restart it yourself with OLLAMA_NO_CLOUD=1, then retry. Thread did not stop it.");
          resolveStatus("ready");
        } catch (error) { reject(error instanceof SyntaxError ? Error("Invalid local Ollama status. Check the port and update Ollama.") : error); }
      });
    });
    const timer = setTimeout(() => request.destroy(new LocalStatusTimeout("Local Ollama check timed out. Check its process and port; Thread will not start a competing server.")), 1500);
    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ECONNREFUSED") resolveStatus("absent");
      else reject(error);
    });
    request.on("close", () => clearTimeout(timer));
  });
}

export async function checkInstallation(config: LauncherConfig): Promise<void> {
  if (!(await stat(config.vaultPath)).isDirectory()) throw Error("Vault path is not a directory.");
  await access(config.obsidian.executable, constants.X_OK);
  const plugin = join(config.vaultPath, ".obsidian", "plugins", "thread");
  try {
    const manifest = await readJson(join(plugin, "manifest.json"), 16384) as { id?: unknown } | null;
    if (manifest?.id !== "thread") throw Error("Wrong plugin identity.");
    await access(join(plugin, "main.js"), constants.R_OK);
    const enabled = await readJson(join(config.vaultPath, ".obsidian", "community-plugins.json"), 65536);
    if (!Array.isArray(enabled) || !enabled.includes("thread")) throw Error("Thread disabled.");
  } catch {
    throw Error("Install and enable Thread in this vault first. Open the vault once in Obsidian before using its shortcut.");
  }
}

export interface StartupPort {
  check(port: number): Promise<ServerStatus>;
  start(config: LauncherConfig["ollama"]): Promise<() => boolean>;
  wait(ms: number): Promise<void>;
  now(): number;
}
function openLog(path: string): number {
  const fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  if (!fstatSync(fd).isFile()) { closeSync(fd); throw Error("Launcher log destination must be a regular file, not a link or device."); }
  return fd;
}
export async function ensureLocalServer(config: LauncherConfig["ollama"], port: StartupPort): Promise<string> {
  if (await port.check(config.port) === "ready") return "Existing local Ollama is ready; cloud features disabled. No process started.";
  if (!config.startIfMissing) return "Ollama is unavailable. Opening recorded-only Thread; start your local server to use AI.";
  if (!config.executable || !config.modelsPath) throw Error("Ollama startup has no configured executable/models path.");
  const exited = await port.start(config);
  const deadline = port.now() + 20000;
  while (port.now() < deadline) {
    if (exited()) throw Error("The configured Ollama process exited. Inspect its launcher log and check executable/model directory permissions.");
    try {
      if (await port.check(config.port) === "ready") return "Consented local Ollama startup is ready; cloud features disabled.";
    } catch (error) {
      // An owned server can bind before GPU discovery completes. Never restart it.
      if (!(error instanceof LocalStatusTimeout)) throw error;
    }
    await port.wait(200);
  }
  throw Error("Ollama startup did not become ready within 20 seconds. Inspect its launcher log. No process was stopped.");
}

export async function startOllama(config: LauncherConfig["ollama"], logPath: string): Promise<() => boolean> {
  if (!config.startIfMissing || !config.executable || !config.modelsPath) throw Error("Ollama startup is not explicitly configured and consented.");
  await access(config.executable, constants.X_OK);
  if (!(await stat(config.modelsPath)).isDirectory()) throw Error("Configured model directory is missing. Download models explicitly first.");
  const fd = openLog(logPath);
  const child = spawn(config.executable, ["serve"], {
    detached: true, stdio: ["ignore", fd, fd],
    env: { ...process.env, OLLAMA_HOST: `127.0.0.1:${config.port}`, OLLAMA_NO_CLOUD: "1", OLLAMA_MODELS: config.modelsPath }
  });
  closeSync(fd);
  let ended = false;
  child.on("exit", () => { ended = true; });
  await new Promise<void>((resolveStarted, reject) => { child.once("spawn", resolveStarted); child.once("error", reject); });
  child.unref();
  return () => ended;
}
export async function openObsidian(config: LauncherConfig, logPath: string): Promise<void> {
  const fd = openLog(logPath);
  const child = spawn(config.obsidian.executable, launchArguments(config), { detached: true, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  await new Promise<void>((resolveStarted, reject) => {
    const timer = setTimeout(resolveStarted, 1500);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolveStarted();
      else reject(Error(`Obsidian launch failed (${signal ?? code}). Inspect ${logPath}; check Flatpak installation, vault access and display session.`));
    });
  });
  child.unref();
}
