import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, renameSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { releaseFixture } from "./update-fixture.ts";
import { digest, encodeRelease } from "./update-package.ts";
import { previewUpdate, writePreview, targetSnapshot } from "./update-preview.ts";
import { applyUpdate, previewRollback, writeRollbackPreview, recoverUpdate, requireClosedObsidian, withUpdateLock } from "./update-apply.ts";
export function updateFixture(legacy = false) {
  const root = mkdtempSync(join(tmpdir(), "thread-update-apply-")), install = join(root, "vault/.obsidian/plugins/thread"), archive = join(root, "candidate.zip"), previewPath = join(root, "preview.json"), state = join(root, "state");
  mkdirSync(install, { recursive: true });
  const previous = releaseFixture(legacy ? "0.3.0" : "0.4.0", "old", !legacy), next = releaseFixture("0.4.1", "new");
  for (const [path, bytes] of previous) { mkdirSync(dirname(join(install, path)), { recursive: true }); writeFileSync(join(install, path), bytes); }
  writeFileSync(archive, encodeRelease(next));
  writeFileSync(join(install, "data.json"), '{"schemaVersion":1,"private":"PRESERVE_SETTINGS"}');
  writeFileSync(join(install, "changes.json"), '{"schemaVersion":1,"history":["PRESERVE_JOURNAL"]}');
  writeFileSync(join(install, "unrelated.txt"), "UNRELATED");
  writeFileSync(join(root, "vault/Note.md"), "PRESERVE_NOTE");
  const preview = previewUpdate(archive, install, "1.14.4"), approval = writePreview(previewPath, preview).sha256;
  const protectedFiles = ["data.json", "changes.json", "unrelated.txt"].map(n => join(install, n)).concat(join(root, "vault/Note.md"));
  const protectedBefore = protectedFiles.map(p => readFileSync(p));
  return { root, install, archive, previewPath, state, previous, next, preview, approval,
    preserved: () => protectedFiles.forEach((p, i) => assert.deepEqual(readFileSync(p), protectedBefore[i])),
    cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
const closed = () => {};
test("exact apply preserves notes/settings/journals/unrelated files and repeated recovery is idempotent", () => {
  const f = updateFixture(); try {
    const hash = applyUpdate(f.previewPath, f.approval, f.state, { closed });
    assert.equal(targetSnapshot(f.install, "1.14.4").snapshot.version, "0.4.1");
    f.preserved(); for (const [path, bytes] of f.previous) assert.deepEqual(readFileSync(join(f.state, "previous", path)), bytes);
    recoverUpdate(f.state, hash, { closed }); f.preserved();
    assert.ok(!readdirSync(f.install).includes(".thread-update-pending"));
    assert.throws(() => applyUpdate(f.previewPath, f.approval, join(f.root, "again"), { closed }), /changed/);
  } finally { f.cleanup(); }
});
test("crash boundaries before writes, partial staging, mixed code and completed intent recover", () => {
  for (const stop of ["prepared", "intent", "staged:main.js", "replaced:main.js", "replaced:manifest.json", "completed"]) {
    const f = updateFixture(); let hash = ""; try {
      assert.throws(() => applyUpdate(f.previewPath, f.approval, f.state, { closed, checkpoint(event, approval) { hash = approval; if (event === stop) throw Error("Authored interruption"); } }), /Authored interruption/);
      f.preserved(); recoverUpdate(f.state, hash, { closed }); f.preserved();
      for (const [path, bytes] of f.next) assert.deepEqual(readFileSync(join(f.install, path)), bytes);
    } finally { f.cleanup(); }
  }
});
test("stale approval, target, package, state collision and closed-host refusal do not replace code", () => {
  for (const kind of ["approval", "code", "data", "package", "state", "closed"]) {
    const f = updateFixture(); try {
      if (kind === "code") writeFileSync(join(f.install, "main.js"), "LATER_CODE");
      if (kind === "data") writeFileSync(join(f.install, "data.json"), '{"schemaVersion":1,"later":true}');
      if (kind === "package") writeFileSync(f.archive, encodeRelease(releaseFixture("0.4.1", "different")));
      if (kind === "state") mkdirSync(f.state);
      const before = readFileSync(join(f.install, "main.js"));
      assert.throws(() => applyUpdate(f.previewPath, kind === "approval" ? "0".repeat(64) : f.approval, f.state, { closed: kind === "closed" ? () => { throw Error("Still running"); } : closed }));
      assert.deepEqual(readFileSync(join(f.install, "main.js")), before);
    } finally { f.cleanup(); }
  }
});
test("recovery refuses edited code/data/intent/staging, changed parents and links while retaining pending operation", () => {
  for (const kind of ["code", "data", "intent", "staging", "link", "parent", "pending"]) {
    const f = updateFixture(); let hash = ""; try {
      assert.throws(() => applyUpdate(f.previewPath, f.approval, f.state, { closed, checkpoint(event, h) { hash = h; if (event === "replaced:main.js") throw Error("Interrupted"); } }));
      if (kind === "code") writeFileSync(join(f.install, "styles.css"), "EXTERNAL_EDIT");
      if (kind === "data") writeFileSync(join(f.install, "data.json"), '{"schemaVersion":1,"changed":true}');
      if (kind === "intent") writeFileSync(join(f.state, "intent.json"), "{}");
      if (kind === "staging") writeFileSync(join(f.state, "candidate.zip"), Buffer.from("Changed"));
      if (kind === "pending") writeFileSync(join(f.install, ".thread-update-pending"), "{}");
      if (kind === "link") { const path = join(f.install, "styles.css"), outside = join(f.root, "outside"); writeFileSync(outside, "EXTERNAL_LINK"); unlinkSync(path); symlinkSync(outside, path); }
      if (kind === "parent") { const original = join(f.install, "pdf-resources/cmaps"), retained = join(f.root, "retained-cmaps"); renameSync(original, retained); cpSync(retained, original, { recursive: true }); }
      const before = readFileSync(join(f.install, "main.js")); assert.throws(() => recoverUpdate(f.state, hash, { closed }));
      assert.deepEqual(readFileSync(join(f.install, "main.js")), before);
      assert.ok(readdirSync(f.install).includes(".thread-update-pending"));
    } finally { f.cleanup(); }
  }
});
test("Linux flock really excludes a second process and releases on descriptor close", () => {
  const f = updateFixture(); try {
    const module = resolve("src/desktop/update-apply.ts");
    const script = `import {withUpdateLock} from ${JSON.stringify(module)}; withUpdateLock(${JSON.stringify(f.install)},()=>{});`;
    withUpdateLock(f.install, () => {
      const second = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8" });
      assert.notEqual(second.status, 0); assert.match(second.stderr, /Another updater/);
    });
    const second = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr);
  } finally { f.cleanup(); }
});
test("a different pending operation blocks apply; process scan and explicit acknowledgement fail closed", () => {
  const f = updateFixture(); try {
    writeFileSync(join(f.install, ".thread-update-pending"), "Different operation");
    assert.throws(() => applyUpdate(f.previewPath, f.approval, f.state, { closed }), /pending/); f.preserved();
    assert.throws(() => requireClosedObsidian(false), /obsidian-closed/);
    const proc = join(f.root, "proc"); mkdirSync(join(proc, "12"), { recursive: true }); writeFileSync(join(proc, "12/comm"), "obsidian\n");
    assert.throws(() => requireClosedObsidian(true, proc), /running/);
    writeFileSync(join(proc, "12/comm"), "unrelated\n"); requireClosedObsidian(true, proc);
  } finally { f.cleanup(); }
});
test("compatible rollback previews current data, refuses stale approval, preserves later data and recovers interruption", () => {
  const f = updateFixture(); try {
    const hash = applyUpdate(f.previewPath, f.approval, f.state, { closed });
    writeFileSync(join(f.install, "data.json"), '{"schemaVersion":1,"laterSetting":"RETAIN_LATER"}');
    writeFileSync(join(f.install, "changes.json"), '{"schemaVersion":1,"history":["LATER_JOURNAL"]}');
    const approval = previewRollback(f.state, hash, "1.14.4"), previewPath = join(f.root, "rollback.json");
    assert.equal(approval.preview.package.version, "0.4.0");
    const approved = writeRollbackPreview(previewPath, approval);
    const saved = readFileSync(join(f.install, "data.json")); writeFileSync(join(f.install, "data.json"), '{"schemaVersion":1,"changedAgain":true}');
    assert.throws(() => applyUpdate(previewPath, approved, join(f.root, "stale-rollback"), { closed }), /changed/);
    writeFileSync(join(f.install, "data.json"), saved);
    const rollbackState = join(f.root, "rollback-state"); let rollbackHash = "";
    assert.throws(() => applyUpdate(previewPath, approved, rollbackState, { closed, checkpoint(event, h) { rollbackHash = h; if (event === "replaced:main.js") throw Error("Rollback interrupted"); } }), /Rollback interrupted/);
    recoverUpdate(rollbackState, rollbackHash, { closed });
    assert.equal(targetSnapshot(f.install, "1.14.4").snapshot.version, "0.4.0");
    for (const [path, bytes] of f.previous) assert.deepEqual(readFileSync(join(f.install, path)), bytes);
    assert.deepEqual(readFileSync(join(f.install, "data.json")), saved);
    assert.equal(readFileSync(join(f.install, "changes.json"), "utf8"), '{"schemaVersion":1,"history":["LATER_JOURNAL"]}');
    assert.equal(readFileSync(join(f.root, "vault/Note.md"), "utf8"), "PRESERVE_NOTE");
  } finally { f.cleanup(); }
});
test("legacy code is retained but rollback refuses unknown compatibility; later code or unsupported data also refuse", () => {
  for (const kind of ["legacy", "later-code", "unknown-data"]) {
    const f = updateFixture(kind === "legacy"); try {
      const hash = applyUpdate(f.previewPath, f.approval, f.state, { closed });
      if (kind === "later-code") writeFileSync(join(f.install, "main.js"), "LATER_CODE");
      if (kind === "unknown-data") writeFileSync(join(f.install, "data.json"), '{"schemaVersion":99}');
      const code = readFileSync(join(f.install, "main.js"));
      assert.throws(() => previewRollback(f.state, hash, "1.14.4"));
      assert.deepEqual(readFileSync(join(f.install, "main.js")), code);
      for (const [path, bytes] of f.previous) assert.deepEqual(readFileSync(join(f.state, "previous", path)), bytes);
    } finally { f.cleanup(); }
  }
});
test("corrupt temporary replacement is retained and refused; recovery uses a new verified temporary file", () => {
  const f = updateFixture(); let hash = ""; try {
    assert.throws(() => applyUpdate(f.previewPath, f.approval, f.state, { closed, checkpoint(event, h) {
      hash = h;
      if (event === "staged:main.js") {
        const temp = readdirSync(f.install).find(n => n.endsWith(".tmp"))!; writeFileSync(join(f.install, temp), "PARTIAL_TEMP");
      }
    } }), /Staged replacement changed/);
    assert.deepEqual(readFileSync(join(f.install, "main.js")), f.previous.get("main.js"));
    const retained = readdirSync(f.install).find(n => n.endsWith(".tmp"))!;
    recoverUpdate(f.state, hash, { closed }); f.preserved();
    assert.equal(readFileSync(join(f.install, retained), "utf8"), "PARTIAL_TEMP");
  } finally { f.cleanup(); }
});
test("CLI never accepts an unacknowledged write or unknown bypass flag", () => {
  const f = updateFixture(); try {
    for (const extra of [[], ["--force"], ["--obsidian-closed", "--skip-checks"]]) {
      const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/update-thread.mjs", "apply", f.previewPath, f.approval, f.state, ...extra], { encoding: "utf8" });
      assert.notEqual(result.status, 0); assert.match(result.stderr, /Usage/); f.preserved();
      assert.deepEqual(readFileSync(join(f.install, "main.js")), f.previous.get("main.js"));
    }
  } finally { f.cleanup(); }
});
test("SIGKILL during coordinator creation/publication leaves no partial final record and explicit recovery finishes", () => {
  for (const record of ["intent.json", ".thread-update-pending", "completed.json"]) for (const boundary of ["create", "publish", "published"]) {
    const f = updateFixture(); try {
      const parent = record === ".thread-update-pending" ? f.install : f.state, destination = join(parent, record), prefix = `.thread-update-${record}-`;
      const child = `import fs from 'node:fs';import{basename}from'node:path';import{syncBuiltinESMExports}from'node:module';
const open=fs.openSync,rename=fs.renameSync;
fs.openSync=function(path,...args){const fd=open(path,...args);if(${JSON.stringify(boundary)}==='create'&&typeof path==='string'&&basename(path).startsWith(${JSON.stringify(prefix)}))process.kill(process.pid,'SIGKILL');return fd;};
fs.renameSync=function(from,to){if(to===${JSON.stringify(destination)}&&${JSON.stringify(boundary)}==='publish')process.kill(process.pid,'SIGKILL');const result=rename(from,to);if(to===${JSON.stringify(destination)}&&${JSON.stringify(boundary)}==='published')process.kill(process.pid,'SIGKILL');return result;};syncBuiltinESMExports();
const{applyUpdate}=await import(${JSON.stringify(resolve("src/desktop/update-apply.ts"))});
applyUpdate(${JSON.stringify(f.previewPath)},${JSON.stringify(f.approval)},${JSON.stringify(f.state)},{closed(){}});`;
      const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", child], { encoding: "utf8" });
      assert.equal(result.signal, "SIGKILL", result.stderr); f.preserved();
      const exists = readdirSync(parent).includes(record);
      assert.equal(exists, boundary === "published");
      if (exists) assert.doesNotThrow(() => JSON.parse(readFileSync(destination, "utf8")));
      if (record === "intent.json" && !exists) {
        for (const [path, bytes] of f.previous) assert.deepEqual(readFileSync(join(f.install, path)), bytes);
        applyUpdate(f.previewPath, f.approval, join(f.root, "new-state"), { closed });
      } else {
        const hash = digest(readFileSync(join(f.state, "intent.json"))).sha256;
        recoverUpdate(f.state, hash, { closed });
      }
      assert.equal(targetSnapshot(f.install, "1.14.4").snapshot.version, "0.4.1");
      assert.ok(!readdirSync(f.install).includes(".thread-update-pending")); f.preserved();
    } finally { f.cleanup(); }
  }
});
test("an inconsistent foreign final completion record is still preserved and refused", () => {
  const f = updateFixture(); let hash = ""; try {
    assert.throws(() => applyUpdate(f.previewPath, f.approval, f.state, { closed, checkpoint(event, h) { hash = h; if (event === "intent") throw Error("Interrupted"); } }));
    const path = join(f.state, "completed.json"); writeFileSync(path, '{"foreign":true}');
    assert.throws(() => recoverUpdate(f.state, hash, { closed }), /ambiguous/);
    assert.equal(readFileSync(path, "utf8"), '{"foreign":true}'); f.preserved();
  } finally { f.cleanup(); }
});
test("SIGKILL immediately after first lock creation permits a fresh approved retry", () => {
  const f = updateFixture(); try {
    const lock = join(f.install, ".thread-update-lock");
    const child = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';const open=fs.openSync;
fs.openSync=function(path,...args){const fd=open(path,...args);if(path===${JSON.stringify(lock)})process.kill(process.pid,'SIGKILL');return fd;};syncBuiltinESMExports();
const{applyUpdate}=await import(${JSON.stringify(resolve("src/desktop/update-apply.ts"))});
applyUpdate(${JSON.stringify(f.previewPath)},${JSON.stringify(f.approval)},${JSON.stringify(f.state)},{closed(){}});`;
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", child], { encoding: "utf8" });
    assert.equal(result.signal, "SIGKILL", result.stderr); assert.equal(readFileSync(lock).length, 0);
    for (const [path, bytes] of f.previous) assert.deepEqual(readFileSync(join(f.install, path)), bytes);
    applyUpdate(f.previewPath, f.approval, join(f.root, "retry-state"), { closed });
    assert.equal(targetSnapshot(f.install, "1.14.4").snapshot.version, "0.4.1"); f.preserved();
  } finally { f.cleanup(); }
});
test("existing empty/legacy lock bytes stay unchanged and foreign contents are refused without overwrite", () => {
  for (const bytes of [Buffer.alloc(0), Buffer.from("Thread update coordinator v1\n"), Buffer.from("UNRELATED_LOCK")]) {
    const f = updateFixture(); try {
      const path = join(f.install, ".thread-update-lock"); writeFileSync(path, bytes);
      if (bytes.toString() === "UNRELATED_LOCK") assert.throws(() => withUpdateLock(f.install, () => assert.fail("foreign lock entered")), /unrelated data/);
      else withUpdateLock(f.install, () => {});
      assert.deepEqual(readFileSync(path), bytes); f.preserved();
    } finally { f.cleanup(); }
  }
});
test("concurrent first-use initialization serializes two real updater processes on the same empty lock", async () => {
  const f = updateFixture(); try {
    const module = resolve("src/desktop/update-apply.ts"), lock = JSON.stringify(f.install), release = join(f.root, "release-test-lock");
    const script = `import fs from'node:fs';import{withUpdateLock}from${JSON.stringify(module)};process.stdin.once('data',()=>{try{withUpdateLock(${lock},()=>{fs.writeSync(1,'locked\\n');const deadline=Date.now()+10000;while(!fs.existsSync(${JSON.stringify(release)})){if(Date.now()>deadline)throw Error('Test lock release timed out');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10)}});process.exit(0)}catch(e){fs.writeSync(2,e.message);process.exit(1)}});fs.writeSync(1,'ready\\n');`;
    const start = () => {
      const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], { stdio: ["pipe", "pipe", "pipe"] });
      let out = "", err = ""; let ready!: () => void;
      const started = new Promise<void>(r => { ready = r; });
      child.stdout.on("data", b => { out += b.toString(); if (out.includes("ready\n")) ready(); });
      child.stderr.on("data", b => { err += b.toString(); });
      const ended = new Promise<{ code: number | null; out: string; err: string }>((r, reject) => { child.on("error", reject); child.on("close", code => r({ code, out, err })); });
      return { child, started, ended };
    };
    const a = start(), b = start(); await Promise.all([a.started, b.started]);
    a.child.stdin.end("go"); b.child.stdin.end("go");
    const loser = await Promise.race([a.ended, b.ended]); writeFileSync(release, "release");
    const results = await Promise.all([a.ended, b.ended]); assert.equal(loser.code, 1);
    assert.deepEqual(results.map(r => r.code).sort(), [0, 1]); assert.equal(results.filter(r => r.out.includes("locked")).length, 1);
    assert.match(results.find(r => r.code === 1)!.err, /Another updater/);
    assert.equal(readFileSync(join(f.install, ".thread-update-lock")).length, 0); f.preserved();
  } finally { f.cleanup(); }
});
