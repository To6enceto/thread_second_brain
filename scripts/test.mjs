import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collect(path) : path.endsWith(".test.ts") ? [path] : [];
  });
}

const files = collect("src").sort();
if (files.length === 0) {
  throw new Error("No tests found. An empty suite must not pass.");
}
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], {
  stdio: "inherit"
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
