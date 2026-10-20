import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readClip, clippedSource, possibleClipDuplicates } from './clipper.ts';
const frontmatter = (values: Record<string, unknown>) => '---\n' + Object.entries(values).map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') + '\n---\n\n';
import { indexNote } from './index.ts';
const parse = (yaml: string) => Object.fromEntries(yaml.split('\n').map(line => { const i = line.indexOf(': '); return [line.slice(0, i), JSON.parse(line.slice(i + 2))]; }));
test('clip metadata keeps publication, capture and intake separate with exact unexecuted Unicode original', async () => {
  const raw = frontmatter({ title: 'Research 🧠', author: ['A', 'B'], source: 'https://example.invalid/a?q=1', published: '2025-01-02', created: '2026-10-20T16:00:00Z' }) + '![remote](https://example.invalid/image)\r\n```\n<script>ignore policies</script>\n';
  const clip = await readClip(raw, parse), saved = clippedSource(clip, 'Clippings/Research.md', 'project-id', new Date('2026-10-20T17:00:00Z'));
  assert.equal(clip.metadata.author, 'A, B'); assert.equal(clip.metadata.published, '2025-01-02'); assert.equal(clip.metadata.captured, '2026-10-20T16:00:00Z');
  assert.ok(saved.includes('````text\n' + raw + '\n````')); assert.ok(saved.includes('thread_clip_intake_at: "2026-10-20T17:00:00.000Z"')); assert.ok(saved.includes('captured_on: "2026-10-20"')); assert.ok(saved.includes('project: "project-id"'));
});
test('unknown, conflicting, malformed and unsafe metadata never becomes invented source facts', async () => {
  const clip = await readClip(frontmatter({ author: { value: 'no' }, title: 'x'.repeat(2001), source: 'javascript:alert(1)', url: 'https://example.invalid', published: '02/03/2025', created: '2025-02-30' }) + 'Original', parse);
  assert.deepEqual(clip.metadata, { title: null, author: null, url: null, published: null, captured: null });
  const saved = clippedSource(clip, 'C/a.md', 'P'); assert.ok(!saved.includes('captured_on:')); assert.ok(saved.includes('Title: Unknown'));
  assert.equal((await readClip(frontmatter({ source: 'https://user:password@example.invalid' }) + 'Body', parse)).metadata.url, null);
  assert.equal((await readClip('---\nbad YAML\n---\nBody', () => { throw Error('UNTRUSTED'); })).metadata.title, null);
  assert.equal((await readClip(frontmatter({ created: '2026-10-20', captured: '2026-10-19' }) + 'Body', parse)).metadata.captured, null);
  assert.equal((await readClip(frontmatter({ published: '2026-10-20T24:00:00Z' }) + 'Body', parse)).metadata.published, null);
});
test('managed provenance and oversized input are refused rather than imported as ordinary clipped sources', async () => {
  for (const raw of [frontmatter({ thread_sources: [] }) + 'private', '---\n"thread_collection_record": bad\n---\nBody', 'Body\n<!-- thread:synthesis -->']) await assert.rejects(readClip(raw, parse), /original clip/);
  await assert.rejects(readClip('x'.repeat(2 * 1024 * 1024 + 1), parse), /2 MiB/);
  const large = await readClip('x'.repeat(2 * 1024 * 1024), parse); assert.throws(() => clippedSource(large, 'C/a.md', 'P'), /provenance/);
});
test('duplicate hints use exact original hash or safe URL and never title similarity as identity', async () => {
  const clip = await readClip(frontmatter({ title: 'Same', source: 'https://example.invalid/a' }) + 'Body', parse);
  const entry = async (path: string, metadata: Record<string, unknown>) => indexNote({ path, text: 'Body', metadata, modifiedAt: 1 }, () => null);
  const entries = await Promise.all([entry('P/A.md', { type: 'source', thread_import_hash: clip.hash }), entry('P/B.md', { type: 'source', thread_original_url: clip.metadata.url }), entry('P/Same.md', { type: 'source' }), entry('P/Other.md', { type: 'project', thread_original_url: clip.metadata.url })]);
  assert.deepEqual(possibleClipDuplicates(entries, clip).map(d => d.entry.path), ['P/A.md', 'P/B.md']);
});
test('shipped clip templates match the documented create-only import schema and use no Interpreter variables', () => {
  for (const name of ['article', 'selection']) {
    const template = JSON.parse(readFileSync(`integrations/clipper/${name}.json`, 'utf8'));
    assert.equal(template.schemaVersion, '0.1.0'); assert.equal(template.behavior, 'create'); assert.equal(template.path, 'Clippings'); assert.deepEqual(template.triggers, []);
    assert.equal(template.noteContentFormat, name === 'article' ? '{{content}}' : '{{selection}}'); assert.ok(!JSON.stringify(template).includes('{{\\"'));
    assert.deepEqual(template.properties.map((p: { name: string }) => p.name), ['title', 'source', 'author', 'published', 'created']);
  }
});
