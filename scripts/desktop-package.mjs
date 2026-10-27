import { chmodSync, copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { APP_FILES, licenseFile, stagedFiles, validateInventory } from "../src/standalone/desktop-package.ts";

const release = JSON.parse(readFileSync("src/standalone/desktop-release.json", "utf8")), build = ".thread-local/desktop/build", runtime = "node_modules/electron/dist";
const name = `${release.name}-${release.version}`, staging = `.thread-local/desktop/package/${name}`, archive = `dist/${name}-linux-x64.tar.gz`;
const electron = readFileSync(`${runtime}/version`, "utf8").trim(), packages = JSON.parse(readFileSync(`${build}/third-party.json`, "utf8"));
rmSync(".thread-local/desktop/package", { recursive: true, force: true }); mkdirSync(`${staging}/licenses`, { recursive: true }); mkdirSync("dist", { recursive: true });
// The packaged app replaces Electron's default app, so the runtime starts Thread directly.
cpSync(runtime, `${staging}/runtime`, { recursive: true }); rmSync(`${staging}/runtime/resources/default_app.asar`, { force: true });
mkdirSync(`${staging}/runtime/resources/app`, { recursive: true });
for (const file of APP_FILES) copyFileSync(`${build}/${file}`, `${staging}/runtime/resources/app/${file}`);
cpSync(`${build}/pdf-resources`, `${staging}/runtime/resources/app/pdf-resources`, { recursive: true });
copyFileSync(`${runtime}/LICENSE`, `${staging}/licenses/electron-LICENSE.txt`); copyFileSync(`${runtime}/LICENSES.chromium.html`, `${staging}/licenses/LICENSES.chromium.html`);
for (const pkg of packages) copyFileSync(licenseFile("node_modules", pkg), `${staging}/licenses/${pkg.replace("/", "__")}-LICENSE.txt`);
writeFileSync(`${staging}/thread-desktop`, `#!/bin/sh
# Thread Desktop ${release.version}: runs the bundled Electron ${electron} runtime with the packaged app.
# Chromium's sandbox stays enabled; pass --user-data-dir=PATH to use a separate profile.
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
if [ "$(id -u)" = 0 ]; then echo "Run Thread Desktop as your normal user, not as root." >&2; exit 1; fi
unset ELECTRON_RUN_AS_NODE
exec "$here/runtime/electron" "$@"
`); chmodSync(`${staging}/thread-desktop`, 0o755);
writeFileSync(`${staging}/thread-desktop.desktop.example`, `[Desktop Entry]
# Example only. Thread never installs this file. Replace /path/to with the extracted folder before using it.
Type=Application
Name=Thread Desktop
Comment=Resume projects and trace decisions in your local Markdown notes
Exec=/path/to/${name}/thread-desktop
Terminal=false
Categories=Office;
`);
writeFileSync(`${staging}/README.txt`, `Thread Desktop ${release.version} (local Fedora build, Electron ${electron})

Run: extract this folder anywhere you own, then start ./thread-desktop
Nothing is installed. Remove the folder to remove the app; your notes are never stored here.

Profile: desktop settings and journals live in Electron's user data folder for
"Thread Desktop" (normally ~/.config/Thread Desktop), outside your vaults and
this folder. Pass --user-data-dir=PATH to use another profile.

Update: quit Thread, extract the newer thread-desktop folder beside this one,
start the new ./thread-desktop and delete the old folder when satisfied. The
profile formats are unchanged in this release. The Obsidian plugin's updater
does not accept desktop packages; desktop updates are always manual.

Requires: Linux x64 with unprivileged user namespaces (Fedora default) for
Chromium's sandbox, and optionally a local Ollama on loopback for AI features.
Ollama and model weights are not included. The app works offline.

Licenses: see licenses/. Thread itself is UNLICENSED: this build is for local
use and no public distribution license is asserted.
`);
const files = stagedFiles(staging), inventory = { name: release.name, version: release.version, electron, files };
validateInventory(inventory, release, packages); writeFileSync(`${staging}/inventory.json`, JSON.stringify(inventory, null, 2) + "\n");
// Deterministic archive: fixed order, timestamps, ownership and modes (independent of umask), and no gzip name or time.
const tar = spawnSync("tar", ["--sort=name", "--mtime=@0", "--owner=0", "--group=0", "--numeric-owner", "--mode=u+rwX,go+rX,go-w", "--format=gnu", "-C", ".thread-local/desktop/package", "-cf", "-", name], { maxBuffer: 1 << 30 });
if (tar.status !== 0) throw Error(`tar failed: ${tar.stderr}`);
const gzip = spawnSync("gzip", ["-n", "-9", "-c"], { input: tar.stdout, maxBuffer: 1 << 30 });
if (gzip.status !== 0) throw Error(`gzip failed: ${gzip.stderr}`);
writeFileSync(archive, gzip.stdout);
console.log(`${archive} | ${gzip.stdout.length} bytes | ${files.length + 1} files | SHA-256 ${createHash("sha256").update(gzip.stdout).digest("hex")}`);
