import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import type ThreadPlugin from '../main.ts';
import { LocalIndex, indexNote } from '../vault/index.ts';
import { defaultSettings } from '../settings/settings.ts';
import { buildProjectExport } from '../portability/export.ts';
const compiled = await build({ entryPoints: [new URL('./compare-modal.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'compare-native-host', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'host', namespace: 'stub' }));
  builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `
  export function parseYaml(){return {};}
  class Element {constructor(tag,opts={}){this.tagName=tag;this.textContent=opts.text??'';this.children=[];this.value='';this.disabled=false;globalThis.__comparisonElements.push(this);}
  createEl(tag,opts={}){const child=new Element(tag,opts);this.children.push(child);return child;}createDiv(opts={}){return this.createEl('div',opts);}addClass(){}add(option){this.children.push(option);}empty(){this.children=[];this.textContent='';}setText(text){this.textContent=text;}}
  export class Modal{constructor(app){this.app=app;this.contentEl=new Element('div');}}
  ` }));
} }] });
const { ProjectComparisonModal } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./compare-modal.ts');
interface Element { tagName: string; textContent: string; value: string; children: Element[]; onclick: () => Promise<void>; onchange: () => void; }
const render = (el: Element): string => el.textContent + el.children.map(render).join('\n');
async function fixture() {
  const elements: Element[] = []; Reflect.set(globalThis, '__comparisonElements', elements);
  Reflect.set(globalThis, 'Option', class { textContent: string; children: never[] = []; constructor(text: string) { this.textContent = text; } });
  const settings = { ...defaultSettings(), selectedProject: 'P', allowedPaths: ['P'] }, index = new LocalIndex();
  const raw = '## Objective\nSynthetic before45'; index.replace([await indexNote({ path: 'P/Overview.md', text: raw, metadata: {}, modifiedAt: 1 }, () => null)], settings);
  let content = raw, sourceOpens = 0, reads = 0, verifies = 0;
  const port = { current: () => true, parse: () => ({}), resolve: () => null, size: () => content.length, readText: async () => content, readPdf: async (): Promise<never> => { throw Error('Unexpected PDF'); } };
  const saved = await buildProjectExport(index, settings, 'P', ['P/Overview.md'], port, new AbortController().signal);
  let bytes = new TextEncoder().encode(saved.text), beforeRead = async () => {}, beforeVerify = async () => {};
  const plugin = { app: { vault: { getFiles: () => [{ path: 'Exports/one.thread-project.json' }], getAbstractFileByPath: (path: string) => path === 'P/Overview.md' ? {} : null } }, active: true, settings, index, modals: new Set(),
    rebuildIndex: async () => {}, readProjectPackage: async () => { reads++; await beforeRead(); return bytes; }, projectExportPort: (current: () => boolean) => ({ ...port, current }), snapshotCurrent: async () => { verifies++; await beforeVerify(); return true; }, openIndexedSource: async () => { sourceOpens++; } };
  const modal = new ProjectComparisonModal(plugin as unknown as ThreadPlugin); modal.onOpen();
  const pick = elements.find(e => e.tagName === 'select')!; pick.value = 'Exports/one.thread-project.json'; pick.onchange();
  const button = (label: string) => elements.find(e => e.textContent === label)!;
  return { modal, plugin, elements, pick, button, output: () => render(modal.resultEl as unknown as Element), counts: () => ({ reads, verifies, sourceOpens }), setBytes: (next: string) => { bytes = new TextEncoder().encode(next); }, beforeRead: (fn: () => Promise<void>) => { beforeRead = fn; }, beforeVerify: (fn: () => Promise<void>) => { beforeVerify = fn; }, saved };
}
test('actual comparison handler explicitly validates twice and renders readonly bounded real snapshots', async () => {
  const f = await fixture(); assert.equal(f.counts().reads, 0); await f.button('Compare selected checkpoint').onclick();
  assert.equal(f.counts().reads, 2); assert.ok(f.output().includes('Synthetic before45')); assert.ok(f.output().includes('Unchanged: P/Overview.md')); assert.ok(f.output().includes('not proven deletion'));
  await f.button('Open current source').onclick(); assert.equal(f.counts().sourceOpens, 1);
  assert.ok(!f.elements.some(e => /Save|Apply|Restore|Generate/.test(e.textContent) && e.tagName === 'button'));
  f.modal.packageChanged('Exports/one.thread-project.json', false); assert.equal(f.modal.comparison, null); assert.equal(f.output(), '');
});
test('input, package, source/settings invalidation, cancel and close discard async comparison results', async () => {
  for (const change of ['input', 'package', 'source', 'settings', 'cancel', 'close']) {
    const f = await fixture(); let release!: () => void, entered!: () => void;
    const started = new Promise<void>(r => { entered = r; }), held = new Promise<void>(r => { release = r; });
    f.beforeRead(async () => { entered(); await held; }); const running = f.button('Compare selected checkpoint').onclick(); await started;
    if (change === 'input') { f.pick.value = ''; f.pick.onchange(); }
    if (change === 'package') f.modal.packageChanged('Exports', true);
    if (change === 'source') f.modal.invalidatePaths(new Set(['P/New.md']));
    if (change === 'settings') { f.plugin.settings.allowedPaths = []; f.modal.invalidate(); }
    if (change === 'cancel') await f.button('Cancel comparison').onclick();
    if (change === 'close') f.modal.onClose();
    release(); await running; assert.equal(f.modal.comparison, null, change); assert.equal(f.output(), '', change);
  }
});
test('replaced package and final-await invalidation cannot publish results', async () => {
  const f = await fixture(); f.beforeRead(async () => { if (f.counts().reads === 2) f.setBytes(f.saved.text.replace('"unselected": 0', '"unselected": 1')); });
  await f.button('Compare selected checkpoint').onclick(); assert.equal(f.modal.comparison, null); assert.match(f.modal.status!.textContent!, /changed/);
  const late = await fixture(); late.beforeVerify(async () => { if (late.counts().verifies === 2) late.modal.invalidate(); });
  await late.button('Compare selected checkpoint').onclick(); assert.equal(late.modal.comparison, null); assert.equal(late.output(), '');
});
test('comparison display keeps full hash metadata but bounds large snapshot text and labels omissions', async () => {
  const f = await fixture();
  const rows = Array.from({ length: 4 }, (_, i) => ({ path: `P/${i}.md`, kind: 'markdown' as const, state: 'changed' as const, before: { hash: 'a'.repeat(64), bytes: 100000, text: 'b'.repeat(100000) }, after: { hash: 'c'.repeat(64), bytes: 100000, text: 'd'.repeat(100000) } }));
  const show = Reflect.get(f.modal, 'show') as (result: unknown, current: () => boolean) => void;
  show.call(f.modal, { rows, hashes: {}, missing: [], unavailable: 0, currentLimit: 0, omissions: { unavailable: 0, unselected: 1, candidateLimit: 0 }, capturedAt: '2026-10-20T00:00:00.000Z' }, () => true);
  const pre = f.elements.filter(e => e.tagName === 'pre'); assert.ok(pre.every(e => e.textContent.length <= 50000)); assert.equal(pre.reduce((n, e) => n + e.textContent.length, 0), 200000);
  assert.ok(f.output().includes('Text display shortened')); assert.ok(f.output().includes('a'.repeat(64))); assert.ok(f.output().includes('1 unselected'));
});
test('unvalidated package parser errors never display input fragments or historical metadata', async () => {
  for (const bytes of ['{"title":PRIVATE UNCHECKED45}', '{"private":"UNPERMITTED PATH45",', '\u0000RAW UNCHECKED45']) {
    const f = await fixture(); f.setBytes(bytes); await f.button('Compare selected checkpoint').onclick();
    assert.equal(f.modal.comparison, null); assert.equal(f.output(), ''); assert.match(f.modal.status!.textContent!, /unchanged version1/);
    assert.ok(!/PRIVATE|UNCHECKED|UNPERMITTED/.test(f.modal.status!.textContent!));
  }
  const late = await fixture(); late.beforeRead(async () => { if (late.counts().reads === 2) late.setBytes('{"title":LATE PRIVATE45}'); });
  await late.button('Compare selected checkpoint').onclick(); assert.equal(late.modal.comparison, null); assert.ok(!late.modal.status!.textContent!.includes('LATE PRIVATE45'));
});
