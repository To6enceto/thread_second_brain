import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, linkSync, unlinkSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { releaseFixture } from './update-fixture.ts';
import { encodeRelease, digest } from './update-package.ts';
import { previewUpdate, writePreview, targetSnapshot, readOrdinary } from './update-preview.ts';
function fixture(legacy = true) {
  const root = mkdtempSync(join(tmpdir(), 'thread-update-preview-')), install = join(root, 'vault/.obsidian/plugins/thread'), archive = join(root, 'candidate.zip');
  mkdirSync(install, { recursive: true }); const files = releaseFixture(legacy ? '0.3.0' : '0.4.0', 'previous', !legacy);
  for (const [path, bytes] of files) { mkdirSync(dirname(join(install, path)), { recursive: true }); writeFileSync(join(install, path), bytes); }
  writeFileSync(archive, encodeRelease(releaseFixture()));
  writeFileSync(join(install, 'data.json'), JSON.stringify({ schemaVersion: 1, model: 'SECRET_PREVIEW_DATA', allowedPaths: ['Private'] }));
  writeFileSync(join(install, 'changes.json'), JSON.stringify({ schemaVersion: 1, pending: null, recovery: null, history: [] }));
  writeFileSync(join(install, 'unrelated.txt'), 'User bytes'); writeFileSync(join(root, 'vault/Note.md'), 'Untouched original note');
  return { root, install, archive, files, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
const snapshot = (root: string): Record<string, string> => Object.fromEntries(readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? Object.entries(snapshot(join(root, e.name))) : [[join(root, e.name), digest(readFileSync(join(root, e.name))).sha256]]));
test('real filesystem preview binds exact code/data hashes, preserves all files and distinguishes legacy rollback compatibility', () => {
  const f = fixture(); try {
    const before = snapshot(join(f.root, 'vault')), preview = previewUpdate(f.archive, f.install, '1.14.4');
    assert.equal(preview.changes.length, 192); assert.equal(preview.target.version, '0.3.0'); assert.equal(preview.package.version, '0.4.0'); assert.equal(preview.rollbackCompatible, false);
    assert.equal(preview.changes.find(c => c.path === 'thread-update.json')!.action, 'add'); assert.equal(preview.target.data['imports.json'], null); assert.ok(preview.target.data['changes.json']);
    assert.ok(!JSON.stringify(preview).includes('SECRET_PREVIEW_DATA')); assert.deepEqual(snapshot(join(f.root, 'vault')), before);
    const out = join(f.root, 'preview.json'), hash = writePreview(out, preview); assert.equal(digest(readFileSync(out)).sha256, hash.sha256); assert.throws(() => writePreview(out, preview), /EEXIST/); assert.throws(() => writePreview(join(f.install, 'preview.json'), preview), /outside/);
    assert.deepEqual(snapshot(join(f.root, 'vault')), before);
  } finally { f.cleanup(); }
  const f2 = fixture(false); try { assert.equal(previewUpdate(f2.archive, f2.install, '1.14.4').rollbackCompatible, true); } finally { f2.cleanup(); }
});
test('package, installation ancestors, runtime and data links are refused without following them', () => {
  for (const kind of ['package', 'runtime', 'data', 'ancestor', 'hardlink']) {
    const f = fixture(); try {
      if (kind === 'ancestor') { const alias = join(f.root, 'alias'); symlinkSync(join(f.root, 'vault'), alias); assert.throws(() => previewUpdate(f.archive, join(alias, '.obsidian/plugins/thread'), '1.14.4'), /directories/); continue; }
      const path = kind === 'package' ? f.archive : join(f.install, kind === 'data' ? 'data.json' : 'main.js');
      const outside = join(f.root, 'outside'); writeFileSync(outside, readFileSync(path)); unlinkSync(path); if (kind === 'hardlink') linkSync(outside, path); else symlinkSync(outside, path);
      const before = readFileSync(outside); assert.throws(() => previewUpdate(f.archive, f.install, '1.14.4'), /without links/); assert.deepEqual(readFileSync(outside), before);
    } finally { f.cleanup(); }
  }
});
test('unsupported data, host, install path, corrupted declared code and ordinary downgrades refuse previews', () => {
  const f = fixture(false); try {
    assert.throws(() => previewUpdate(f.archive, f.install, '1.13.0'), /Host compatibility/); assert.throws(() => previewUpdate(f.archive, join(f.root, 'vault'), '1.14.4'), /installation directory/);
    writeFileSync(join(f.install, 'data.json'), '{"schemaVersion":99}'); assert.throws(() => previewUpdate(f.archive, f.install, '1.14.4'), /data schema/);
    writeFileSync(join(f.install, 'data.json'), '{"private":SECRET_PREVIEW_DATA}'); assert.throws(() => previewUpdate(f.archive, f.install, '1.14.4'), error => error instanceof Error && !error.message.includes('SECRET_PREVIEW_DATA') && /Invalid local JSON/.test(error.message));
    writeFileSync(join(f.install, 'data.json'), '{"schemaVersion":1}'); writeFileSync(join(f.install, 'main.js'), 'Concurrent changed code'); assert.throws(() => previewUpdate(f.archive, f.install, '1.14.4'), /hash mismatch/);
    for (const [path, bytes] of releaseFixture('0.4.1', 'later')) writeFileSync(join(f.install, path), bytes);
    assert.throws(() => previewUpdate(f.archive, f.install, '1.14.4'), /Downgrades/);
  } finally { f.cleanup(); }
});
test('snapshot reflects later code/data changes and bounded file reader refuses large or nonregular inputs', () => {
  const f = fixture(); try {
    const original = targetSnapshot(f.install, '1.14.4').snapshot; writeFileSync(join(f.install, 'main.js'), 'Different previous bytes'); writeFileSync(join(f.install, 'data.json'), '{"schemaVersion":1,"changed":true}');
    const now = targetSnapshot(f.install, '1.14.4').snapshot; assert.notDeepEqual(original.runtime, now.runtime); assert.notDeepEqual(original.data, now.data);
    assert.throws(() => readOrdinary(f.archive, 1), /bounded/); assert.throws(() => readOrdinary(f.install, 100), /bounded/);
    const fifo = join(f.root, 'named-pipe'); const make = spawnSync('mkfifo', [fifo]); assert.equal(make.status, 0); assert.throws(() => readOrdinary(fifo, 100), /bounded/);
  } finally { f.cleanup(); }
});
test('actual CLI writes only an exclusive review artifact and never exposes private data values', () => {
  const f = fixture(); try {
    const before = snapshot(join(f.root, 'vault')), out = join(f.root, 'cli-preview.json');
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/update-thread.mjs', 'preview', f.archive, f.install, '1.14.4', out], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.ok(result.stdout.includes('Approval SHA-256')); assert.ok(result.stdout.includes('Previous-code rollback compatible: false')); assert.ok(!result.stdout.includes('SECRET_PREVIEW_DATA')); assert.deepEqual(snapshot(join(f.root, 'vault')), before);
    const repeat = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/update-thread.mjs', 'preview', f.archive, f.install, '1.14.4', out], { encoding: 'utf8' }); assert.notEqual(repeat.status, 0); assert.deepEqual(snapshot(join(f.root, 'vault')), before);
  } finally { f.cleanup(); }
});
test('publishing revalidates late target/package changes and runtime reads stop at the aggregate budget', () => {
  const f = fixture(); try {
    const preview = previewUpdate(f.archive, f.install, '1.14.4'); writeFileSync(join(f.install, 'data.json'), '{"schemaVersion":1,"changed":true}');
    assert.throws(() => writePreview(join(f.root, 'stale.json'), preview), /before publishing/);
    for (const path of ['main.js', 'styles.css', 'pdf-extract-worker.js']) writeFileSync(join(f.install, path), Buffer.alloc(12 * 1048576, 65));
    assert.throws(() => targetSnapshot(f.install, '1.14.4'), /bounded regular files/);
  } finally { f.cleanup(); }
});
