import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseFixture } from './update-fixture.ts';
import { addUpdateMetadata, decodeRelease, encodeRelease, digest, validateRuntime, compatibleHost, compareVersions, updateFile, releaseFiles } from './update-package.ts';
test('exact reproducible runtime package binds all files and metadata without authorizing arbitrary paths', () => {
  const files = releaseFixture(), first = encodeRelease(files), second = encodeRelease(files), parsed = decodeRelease(first);
  assert.deepEqual(first, second); assert.equal(parsed.files.size, 192); assert.equal(parsed.version, '0.4.0'); assert.equal(parsed.metadata!.dataFormat, 'thread-0.4-v1');
  for (const [name, data] of files) assert.deepEqual(parsed.files.get(name), data);
  assert.equal(digest(first).sha256.length, 64); const missing = new Map(files); missing.delete('main.js'); assert.throws(() => validateRuntime(missing), /inventory/);
  const extra = new Map(files); extra.set('data.json', Buffer.from('{}')); assert.throws(() => validateRuntime(extra), /inventory/);
  const traversal = new Map(files); traversal.delete('styles.css'); traversal.set('../data.json', Buffer.from('{}')); assert.throws(() => validateRuntime(traversal), /inventory/);
});
test('unsupported compression flags paths attributes sizes bounds CRC and duplicate records are refused', () => {
  const original = encodeRelease(releaseFixture()), central = original.readUInt32LE(original.length - 6);
  const mutations: ((b: Buffer) => void)[] = [b => { b[40] = b[40]! ^ 1; }, b => b.writeUInt16LE(8, 8), b => b.writeUInt16LE(1, 6), b => b.writeUInt32LE(0xa1ff0000, central + 38), b => b.writeUInt16LE(0x314, central + 4), b => b.writeUInt32LE(0xffffffff, 18), b => b.writeUInt16LE(99, 26), b => b.writeUInt16LE(1, 28), b => b.writeUInt32LE(1, central + 42), b => b.writeUInt16LE(1, b.length - 14), b => b.writeUInt32LE(1, b.length - 6), b => b.fill(46, 30, 36)];
  for (const mutate of mutations) { const bytes = Buffer.from(original); mutate(bytes); assert.throws(() => decodeRelease(bytes), /Invalid or unsupported/); }
  for (const bytes of [Buffer.alloc(0), original.subarray(0, 80), Buffer.concat([original, Buffer.from('unexpected')]), Buffer.alloc(40 * 1048576 + 1)]) assert.throws(() => decodeRelease(bytes), /Invalid or unsupported/);
});
test('candidate identity versions host and data compatibility fail closed, while legacy install metadata is explicit', () => {
  for (const host of ['1.14.3', '1.15.0', '2.0.0', '1.14.4-beta', '01.14.4']) assert.throws(() => compatibleHost(host)); compatibleHost('1.14.4'); compatibleHost('1.14.9'); assert.ok(compareVersions('0.4.10', '0.4.9') > 0);
  const legacy = releaseFixture('0.3.0', 'legacy', false); assert.equal(validateRuntime(legacy, true).metadata, null); assert.throws(() => validateRuntime(legacy), /Unsupported Thread version/);
  for (const [key, value] of [['dataFormat', 'future'], ['version', '0.5.0'], ['minAppVersion', '1.0.0'], ['id', 'other'], ['extra', true]]) {
    const files = releaseFixture(), metadata = JSON.parse(files.get(updateFile)!.toString()); metadata[key as string] = value; files.set(updateFile, Buffer.from(JSON.stringify(metadata))); assert.throws(() => validateRuntime(files));
  }
  for (const version of ['0.5.0', '1.0.0', '0.4.0-preview', '0.4.1000']) assert.throws(() => releaseFixture(version));
});
test('self-consistent ZIP still rejects corrupt file hashes, PDF inventories and unknown manifest declarations', () => {
  const files = releaseFixture(); files.set('main.js', Buffer.from('changed')); assert.throws(() => validateRuntime(files), /hash mismatch/);
  const bad = releaseFixture(); const pdf = JSON.parse(bad.get('pdf-assets.json')!.toString()); pdf.files[0].hash = 'a'.repeat(64); bad.set('pdf-assets.json', Buffer.from(JSON.stringify(pdf))); assert.throws(() => addUpdateMetadata(bad), /PDF inventory/);
  const duplicate = releaseFixture(); const m = JSON.parse(duplicate.get(updateFile)!.toString()); m.files[1] = m.files[0]; duplicate.set(updateFile, Buffer.from(JSON.stringify(m))); assert.throws(() => validateRuntime(duplicate), /inventory/);
  const missing = releaseFixture(); const mf = JSON.parse(missing.get('manifest.json')!.toString()); mf.isDesktopOnly = false; missing.set('manifest.json', Buffer.from(JSON.stringify(mf))); assert.throws(() => addUpdateMetadata(missing), /identity/);
  assert.equal(new Set(releaseFiles).size, 191);
});
