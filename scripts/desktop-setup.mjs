import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
// Explicit setup keeps Electron's lazy first-run download out of normal startup.
const result = spawnSync(process.execPath, ["node_modules/electron/install.js"], {
  stdio: "inherit", env: { ...process.env, electron_config_cache: resolve(".thread-local/electron-cache") }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
