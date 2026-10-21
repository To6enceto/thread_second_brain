import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const executable = resolve("node_modules/electron/dist/electron");
try { await access(executable); } catch {
  console.error("Electron's local runtime is missing. Run npm run desktop:setup once (downloads Electron), then try again.");
  process.exit(1);
}
const profile = resolve(".thread-local/desktop/profile");
await mkdir(profile, { recursive: true });
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, [resolve(".thread-local/desktop/build"), `--user-data-dir=${profile}`], { stdio: "inherit", env });
child.on("error", () => { console.error("Thread could not launch. Run npm run desktop:build and check your graphical Linux session."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
