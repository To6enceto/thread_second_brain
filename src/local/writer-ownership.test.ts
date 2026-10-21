import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { WriterOwnership, vaultIdentity } from "./writer-ownership.ts";

test("Linux writer ownership binds vault identity across aliases and refuses overlapping processes", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-ownership-")); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "vault")); await symlink(join(root, "vault"), join(root, "alias"));
  const identity = await vaultIdentity(join(root, "vault")); assert.equal(await vaultIdentity(join(root, "alias")), identity);
  const owner = await WriterOwnership.acquire(identity); t.after(() => owner.release());
  await assert.rejects(WriterOwnership.acquire(identity), /Another Thread writer/);
  const script = `import {WriterOwnership} from ${JSON.stringify(new URL("./writer-ownership.ts", import.meta.url).href)}; try {await WriterOwnership.acquire(${JSON.stringify(identity)});process.exit(3)} catch(e) {console.log(e.message)}`;
  const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script]);
  let output = ""; child.stdout.on("data", chunk => output += chunk); const [code] = await once(child, "exit");
  assert.equal(code, 0); assert.match(output, /Another Thread writer/); owner.assert();
  await owner.release(); assert.throws(() => owner.assert(), /ownership ended/);
  const replacement = await WriterOwnership.acquire(identity); await replacement.release();
});

test("kernel releases ownership after a crashed writer without filesystem cleanup or lock stealing", async t => {
  const root = await mkdtemp(join(tmpdir(), "thread-crashed-owner-")); t.after(() => rm(root, { recursive: true, force: true }));
  const identity = await vaultIdentity(root);
  const script = `import {WriterOwnership} from ${JSON.stringify(new URL("./writer-ownership.ts", import.meta.url).href)};await WriterOwnership.acquire(${JSON.stringify(identity)});console.log('ready');setInterval(()=>{},1000)`;
  const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script]);
  t.after(() => { if (child.exitCode === null) child.kill(); }); await once(child.stdout, "data");
  await assert.rejects(WriterOwnership.acquire(identity), /Another Thread writer/);
  const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
  const owner = await WriterOwnership.acquire(identity); owner.assert(); await owner.release();
  await assert.rejects(WriterOwnership.acquire("../vault"), /identity/);
});
