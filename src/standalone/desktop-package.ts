import { createHash } from "node:crypto";
import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";

export interface PackagedFile { path: string; bytes: number; sha256: string; executable: boolean; }
export interface PackageInventory { name: string; version: string; electron: string; files: PackagedFile[]; }
// Packaged app files; anything else under runtime/resources/app is refused.
export const APP_FILES = ["app.html", "main.cjs", "package.json", "pdf-assets.json", "pdf-extract-worker.js", "preload.cjs", "renderer.js", "styles.css", "third-party.json"];
const REQUIRED = ["thread-desktop", "thread-desktop.desktop.example", "README.txt", "licenses/electron-LICENSE.txt", "licenses/LICENSES.chromium.html", "runtime/electron", "runtime/chrome-sandbox", ...APP_FILES.map(name => `runtime/resources/app/${name}`)];

/** Finds the license file of a bundled package; packaging stops when one is missing. */
export function licenseFile(modules: string, name: string): string {
  if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name)) throw Error(`Unexpected bundled package name ${name}.`);
  const directory = join(modules, name), file = readdirSync(directory).find(entry => /^(?:LICEN[CS]E|COPYING)(?:\.(?:md|txt))?$/i.test(entry));
  if (!file) throw Error(`Bundled package ${name} has no license file. Review it before packaging.`);
  return join(directory, file);
}
/** Lists every file under the staged folder with its hash; links and special files are refused. */
export function stagedFiles(root: string, prefix = ""): PackagedFile[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).flatMap(entry => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name, stat = lstatSync(join(root, path));
    if (stat.isDirectory()) return stagedFiles(root, path);
    if (!stat.isFile()) throw Error(`Staged package contains a link or special file: ${path}.`);
    const data = readFileSync(join(root, path));
    return [{ path, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), executable: (stat.mode & 0o111) !== 0 }];
  });
}
/** Refuses missing required files, unexpected app files, the Electron default app, foreign paths and version drift. */
export function validateInventory(value: PackageInventory, release: { name: string; version: string }, packages: string[]): void {
  if (value.name !== release.name || value.version !== release.version || !/^\d+\.\d+\.\d+$/.test(value.version)) throw Error("Desktop package name or version disagrees with desktop-release.json.");
  if (!/^\d+\.\d+\.\d+$/.test(value.electron)) throw Error("Electron runtime version is unavailable.");
  const paths = new Set(value.files.map(file => file.path));
  if (paths.size !== value.files.length) throw Error("Duplicate packaged path.");
  for (const path of [...REQUIRED, ...packages.map(name => `licenses/${name.replace("/", "__")}-LICENSE.txt`)]) if (!paths.has(path)) throw Error(`Packaged file missing: ${path}.`);
  for (const file of value.files) {
    if (!/^(?:thread-desktop(?:\.desktop\.example)?|README\.txt|licenses\/[^/]+|runtime\/[A-Za-z0-9_./ -]+)$/.test(file.path) || file.path.includes("..")) throw Error(`Unexpected packaged path: ${file.path}.`);
    if (file.path === "runtime/resources/default_app.asar") throw Error("Electron's default app must not ship; the packaged app loads from resources/app.");
    if (file.path.startsWith("runtime/resources/app/") && !APP_FILES.includes(file.path.slice("runtime/resources/app/".length)) && !file.path.startsWith("runtime/resources/app/pdf-resources/")) throw Error(`Unexpected packaged app file: ${file.path}.`);
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw Error(`Invalid inventory entry: ${file.path}.`);
  }
  for (const path of ["thread-desktop", "runtime/electron"]) if (!value.files.find(file => file.path === path)!.executable) throw Error(`${path} must be executable.`);
}
