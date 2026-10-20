import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalIndex, indexNote } from '../vault/index.ts';
import { defaultSettings } from '../settings/settings.ts';
import { readMetadata, buildEvidence } from '../vault/evidence.ts';
import { frontmatter } from '../vault/workspace.ts';
import { contentHash } from '../vault/scope.ts';
import { buildProjectExport, exportInventory } from './export.ts';
import { decodeProjectPackage } from './decode.ts';
import { compareProject, type ComparisonPort } from './compare.ts';
import { synthesisBlock } from '../vault/knowledge.ts';
import { authoredPdf } from '../pdf/test-fixtures.ts';
import { pdfSource } from '../pdf/record.ts';
import { byteHash } from './format.ts';
const parse = (yaml: string) => Object.fromEntries(yaml.split('\n').map(line => { const at = line.indexOf(': '); return [line.slice(0, at), JSON.parse(line.slice(at + 2))]; }));
const signal = () => new AbortController().signal;
async function fixture(notes: Record<string, string>) {
  const settings = { ...defaultSettings(), selectedProject: 'P', allowedPaths: ['P'], excludedPaths: ['P/Private'] };
  const index = new LocalIndex(), files = new Map(Object.entries({ 'P/Overview.md': frontmatter({ type: 'project' }) + '## Objective\nCompare real snapshots.', ...notes })), binaries = new Map<string, ArrayBuffer>();
  const rebuild = async () => { index.replace(await Promise.all([...files].map(([path, text]) => indexNote({ path, text, metadata: readMetadata(text, parse), modifiedAt: 1 }, () => null))), settings); };
  await rebuild();
  const reads: string[] = [];
  const port: ComparisonPort = { current: () => true, exists: path => files.has(path) || binaries.has(path), parse, resolve: () => null,
    size: path => files.has(path) ? new TextEncoder().encode(files.get(path)!).length : binaries.get(path)?.byteLength ?? null,
    readText: async path => { reads.push(path); return files.get(path)!; }, readPdf: async path => ({ hash: await byteHash(new Uint8Array(binaries.get(path)!)), bytes: binaries.get(path)! }),
    verify: async hashes => { for (const [path, hash] of Object.entries(hashes)) if (files.has(path) ? await contentHash(files.get(path)!) !== hash : !binaries.has(path) || await byteHash(new Uint8Array(binaries.get(path)!)) !== hash) return false; return true; }
  };
  const capture = async () => { const value = await buildProjectExport(index, settings, 'P', exportInventory(index, settings).candidates.map(c => c.path), port, signal()); return decodeProjectPackage(new TextEncoder().encode(value.text), parse); };
  return { settings, index, files, binaries, port, reads, rebuild, capture };
}
test('checkpoint comparison uses exact old/new bytes, distinguishes missing/current-only and never infers history from mtime', async () => {
  const f = await fixture({ 'P/A.md': 'Before 🧠\r\n', 'P/Removed.md': frontmatter({ id: 'old-id' }) + 'Retained old note' }), saved = await f.capture();
  f.files.set('P/A.md', 'After 🧠\n'); f.files.delete('P/Removed.md'); f.files.set('P/New.md', 'Now present'); await f.rebuild();
  const result = await compareProject(f.index, f.settings, saved, f.port, signal()), row = (path: string) => result.rows.find(r => r.path === path)!;
  assert.equal(row('P/A.md').state, 'changed'); assert.equal(row('P/A.md').before!.text, 'Before 🧠\r\n'); assert.equal(row('P/A.md').after!.text, 'After 🧠\n');
  assert.equal(row('P/Removed.md').state, 'missing'); assert.equal(row('P/New.md').state, 'current-only'); assert.equal(row('P/Overview.md').state, 'unchanged');
  assert.equal(result.capturedAt, saved.package.manifest.createdAt); assert.equal(row('P/New.md').before, null); assert.equal(row('P/Removed.md').after, null);
  f.files.set('P/Removed.md', 'Unindexed now'); await assert.doesNotReject(async () => { const unknown = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!unknown.rows.some(r => r.path === 'P/Removed.md')); assert.equal(unknown.unavailable, 1); });
});
test('present exclusions redact historical identities and content even when package includes real old bytes', async () => {
  const f = await fixture({ 'P/Secret.md': 'OLD SECRET45' }), saved = await f.capture(); f.settings.excludedPaths.push('P/Secret.md'); await f.rebuild(); f.reads.length = 0;
  const result = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!JSON.stringify(result).includes('Secret')); assert.ok(!f.reads.includes('P/Secret.md')); assert.equal(result.unavailable, 1);
  const wrong = structuredClone(saved); wrong.package.manifest.project.id = 'other'; await assert.rejects(compareProject(f.index, f.settings, wrong, f.port, signal()), /same current/);
  Object.defineProperty(f.index, "identityComplete", { value: false }); await assert.rejects(compareProject(f.index, f.settings, saved, f.port, signal()), /identity/);
});
test('raw historical copied references and retained earlier blocks are checked without trusting package manifest references', async () => {
  const f = await fixture({ 'P/Source.md': 'Evidence old', 'P/Second.md': 'Other evidence' });
  const bundle = await buildEvidence([{ path: 'P/Source.md', text: f.files.get('P/Source.md')!, metadata: {}, modifiedAt: 1 }]);
  const answer = { supported: true, answer: [{ text: 'COPIED OLD45', kind: 'fact' as const, sourceIds: ['S1'] }], gaps: [] };
  f.files.set('P/Output.md', synthesisBlock('Old', answer, bundle, 'synthetic') + synthesisBlock('Latest', answer, bundle, 'synthetic')); await f.rebuild(); const saved = await f.capture();
  // An attacker can rebuild the manifest hash. Actual old Markdown must still constrain access.
  for (const e of saved.package.manifest.entries) e.references = [];
  f.files.set('P/Source.md', 'Evidence changed'); f.files.delete('P/Output.md'); await f.rebuild();
  const result = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!JSON.stringify(result).includes('COPIED OLD45')); assert.ok(!result.rows.some(r => r.path === 'P/Output.md')); assert.ok(result.unavailable >= 1);
  // A historical note with a manifest-only dependency cannot bypass present scope either.
  saved.package.manifest.entries.find(e => e.path === 'P/Second.md')!.references = [{ path: 'P/Private/Secret.md', hash: 'a'.repeat(64) }];
  const hidden = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!hidden.rows.some(r => r.path === 'P/Second.md'));
});
test('PDF-dependent historical text needs present exact consent and original snapshot, while binary bytes are never text', async () => {
  const f = await fixture({}), binary = authoredPdf(['Authored page45']), hash = await byteHash(new Uint8Array(binary));
  f.settings.pdfPaths = ['P/Original.pdf']; f.binaries.set('P/Original.pdf', binary); f.index.binaries.set('P/Original.pdf', hash);
  f.files.set('P/Extract.md', await pdfSource({ totalPages: 1, pages: [{ page: 1, text: 'Authored page45', shortened: false }] }, 'P/Original.pdf', hash)); await f.rebuild(); const saved = await f.capture();
  const permitted = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.equal(permitted.rows.find(r => r.path === 'P/Original.pdf')!.before!.text, null); assert.ok(permitted.rows.some(r => r.path === 'P/Extract.md'));
  f.settings.pdfPaths = []; await f.rebuild(); const revoked = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!revoked.rows.some(r => /Extract|Original/.test(r.path))); assert.ok(!JSON.stringify(revoked).includes('Authored page45'));
});
test('comparison currentness and hash/absence guards reject late or canceled snapshots', async () => {
  const f = await fixture({ 'P/A.md': 'A' }), saved = await f.capture(); const controller = new AbortController(); controller.abort();
  await assert.rejects(compareProject(f.index, f.settings, saved, f.port, controller.signal), /abort/i);
  await assert.rejects(compareProject(f.index, f.settings, saved, { ...f.port, verify: async () => false }, signal()), /supporting/);
  await assert.rejects(compareProject(f.index, f.settings, saved, { ...f.port, verify: async () => { f.index.revision++; return true; } }, signal()), /changed/);
  f.files.delete('P/A.md'); await f.rebuild(); await assert.rejects(compareProject(f.index, f.settings, saved, { ...f.port, verify: async () => { f.files.set('P/A.md', 'Appeared'); return true; } }, signal()), /appeared/);
  await assert.rejects(compareProject(f.index, f.settings, saved, { ...f.port, readText: async () => 'Different current bytes' }, signal()), /changed/);
});
test('transitive changed support cannot be replaced by matching old package payloads', async () => {
  const f = await fixture({ 'P/Root.md': 'Root evidence' });
  const root = await buildEvidence([{ path: 'P/Root.md', text: 'Root evidence', metadata: {}, modifiedAt: 1 }]);
  const a = { supported: true, answer: [{ text: 'Derived45', kind: 'interpretation' as const, sourceIds: ['S1'] }], gaps: [] };
  const middle = synthesisBlock('Middle', a, root, 'synthetic'); f.files.set('P/Middle.md', middle);
  const refs = await buildEvidence([{ path: 'P/Middle.md', text: middle, metadata: {}, modifiedAt: 1 }]);
  f.files.set('P/Final.md', synthesisBlock('Final', a, refs, 'synthetic')); await f.rebuild(); const saved = await f.capture();
  f.files.set('P/Root.md', 'Changed root'); await f.rebuild(); const result = await compareProject(f.index, f.settings, saved, f.port, signal());
  assert.ok(!result.rows.some(r => /Middle|Final/.test(r.path))); assert.ok(result.rows.some(r => r.path === 'P/Root.md' && r.state === 'changed'));
});
test('current candidate and display union coverage is bounded and omitted history stays explicit', async () => {
  const f = await fixture({ 'P/Old.md': 'Old' }), saved = await f.capture(); saved.package.manifest.omissions.unselected = 20;
  for (let i = 0; i < 105; i++) f.files.set(`P/New${String(i).padStart(3,'0')}.md`, 'Current'); await f.rebuild();
  const result = await compareProject(f.index, f.settings, saved, f.port, signal());
  assert.ok(result.rows.length <= 200); assert.equal(result.currentLimit, 7); assert.equal(result.omissions.unselected, 20);
  assert.ok(!result.rows.some(r => r.path === 'P/Old.md' && r.state === 'missing'), 'budget-omitted but existing is not removed');
});
test('raw collection locator metadata requires current permission even for excluded choices and older packages without manifest references', async () => {
  const { collectionMarkdown } = await import('../vault/collection-record.ts');
  const f = await fixture({ 'P/PrivateSource.md': 'Private supporting content45' }), hash = await contentHash(f.files.get('P/PrivateSource.md')!);
  const record = { schemaVersion: 1 as const, id: crypto.randomUUID(), title: 'Saved references45', createdAt: '2026-10-20T00:00:00.000Z', scope: 'project' as const, projectPath: 'P', projectIdentity: 'P', items: [{ source: { path: 'P/PrivateSource.md', heading: 'PRIVATE HEADING45', hash, noteHash: hash }, choice: 'exclude' as const, locator: { chunk: 0, offset: 0, length: 1 } }] };
  f.files.set('P/Collection.md', collectionMarkdown(record)); await f.rebuild(); const saved = await f.capture();
  assert.equal(saved.package.manifest.entries.find(e => e.path === 'P/Collection.md')!.references[0]!.path, 'P/PrivateSource.md');
  assert.ok((await compareProject(f.index, f.settings, saved, f.port, signal())).rows.some(r => r.path === 'P/Collection.md'));
  for (const e of saved.package.manifest.entries) e.references = []; // Legacy exports are still untrusted.
  f.settings.excludedPaths.push('P/PrivateSource.md'); await f.rebuild();
  const hidden = await compareProject(f.index, f.settings, saved, f.port, signal()); assert.ok(!hidden.rows.some(r => r.path === 'P/Collection.md')); assert.ok(!JSON.stringify(hidden).includes('PRIVATE HEADING45')); assert.ok(!JSON.stringify(hidden).includes('PrivateSource'));
  const currentExport = await f.capture(); assert.ok(!currentExport.package.manifest.entries.some(e => e.path === 'P/Collection.md'));
  f.settings.excludedPaths = []; f.files.set('P/PrivateSource.md', 'Changed support'); await f.rebuild();
  assert.ok(!(await compareProject(f.index, f.settings, saved, f.port, signal())).rows.some(r => r.path === 'P/Collection.md'));
});
test('retained collection metadata cannot disclose PDF-dependent locators after original consent is revoked', async () => {
  const { collectionMarkdown } = await import('../vault/collection-record.ts');
  const f = await fixture({}), binary = authoredPdf(['Authored collection PDF45']), hash = await byteHash(new Uint8Array(binary));
  f.settings.pdfPaths = ['P/Original.pdf']; f.binaries.set('P/Original.pdf', binary); f.index.binaries.set('P/Original.pdf', hash);
  const raw = await pdfSource({ totalPages: 1, pages: [{ page: 1, text: 'Authored collection PDF45', shortened: false }] }, 'P/Original.pdf', hash);
  f.files.set('P/Extract.md', raw);
  f.files.set('P/Collection.md', collectionMarkdown({ schemaVersion: 1, id: crypto.randomUUID(), title: 'PDF references45', createdAt: '2026-10-20T00:00:00.000Z', scope: 'project', projectPath: 'P', projectIdentity: 'P',
    items: [{ source: { path: 'P/Extract.md', heading: 'PDF page 1', hash: await contentHash('Authored collection PDF45'), noteHash: await contentHash(raw), pdf: { path: 'P/Original.pdf', hash, page: 1 } }, choice: 'pin', locator: { chunk: 0, offset: 0, length: 1 } }] }));
  await f.rebuild(); const saved = await f.capture();
  assert.ok((await compareProject(f.index, f.settings, saved, f.port, signal())).rows.some(r => r.path === 'P/Collection.md'));
  for (const entry of saved.package.manifest.entries) entry.references = [];
  f.settings.pdfPaths = []; await f.rebuild();
  const hidden = await compareProject(f.index, f.settings, saved, f.port, signal());
  assert.ok(!hidden.rows.some(r => /Collection|Extract|Original/.test(r.path)));
  assert.ok(!JSON.stringify(hidden).includes('PDF references45'));
  assert.ok(!(await f.capture()).package.manifest.entries.some(e => e.path === 'P/Collection.md'));
});
