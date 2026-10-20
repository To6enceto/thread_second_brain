import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import type ThreadPlugin from '../main.ts';
import { LocalIndex, indexNote } from '../vault/index.ts';
import { defaultSettings } from '../settings/settings.ts';
import { frontmatter } from '../vault/workspace.ts';
import { readMetadata } from '../vault/evidence.ts';
import { readClip, clippedSource } from '../vault/clipper.ts';
import { contentHash, readableText } from '../vault/scope.ts';
import { createNewNotes } from '../vault/new-notes.ts';
const compiled = await build({ entryPoints: [new URL('./clipper-modal.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{ name: 'clipper-host', setup(builder) {
  builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'host', namespace: 'stub' }));
  builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `
  export function parseYaml(raw){return Object.fromEntries(raw.split("\\n").map(line=>{const i=line.indexOf(": ");return[line.slice(0,i),JSON.parse(line.slice(i+2))];}));}
  const state=()=>globalThis.__clipperForm;
  class Element{constructor(tag='div',opts={}){this.tagName=tag;this.textContent=opts.text??'';this.value='';this.disabled=false;this.children=[];state().elements.push(this);if(opts.attr?.['aria-label'])state().fields.set(opts.attr['aria-label'],this);}
  createEl(tag,opts={}){const e=new Element(tag,opts);this.children.push(e);return e;}createDiv(opts={}){return this.createEl('div',opts);}createSpan(opts={}){return this.createEl('span',opts);}addClass(){}add(v){this.children.push(v);}replaceChildren(...v){this.children=v;this.value='';}empty(){this.children=[];this.textContent='';}setText(v){this.textContent=v;}}
  export class Modal{constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
  ` }));
} }] });
const { ClipperModal } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./clipper-modal.ts');
interface Element { tagName: string; textContent: string; value: string; checked: boolean; disabled: boolean; children: Element[]; onchange?: () => void; oninput?: () => void; onclick: () => Promise<void>; }
const render = (el: Element): string => el.textContent + '\n' + el.children.map(render).join('\n');
const parse = (raw: string) => Object.fromEntries(raw.split('\n').map(line => { const i = line.indexOf(': '); return [line.slice(0, i), JSON.parse(line.slice(i + 2))]; }));
async function fixture(duplicate = false) {
  const state = { elements: [] as Element[], fields: new Map<string, Element>() }; Reflect.set(globalThis, '__clipperForm', state);
  Reflect.set(globalThis, 'Option', class { textContent: string; value: string; children: never[] = []; constructor(label: string, value: string) { this.textContent = label; this.value = value; } });
  const raw = frontmatter({ title: 'Authored46', source: 'https://example.invalid/research', published: '2025-01-02', created: '2026-10-20' }) + 'Original clip46';
  const files = new Map([['Clippings/A.md', raw], ['P/Overview.md', frontmatter({ type: 'project' }) + 'Project']]);
  if (duplicate) files.set('P/Prior.md', clippedSource(await readClip(raw, parse), 'Clippings/A.md', 'P'));
  const settings = { ...defaultSettings(), selectedProject: 'P', allowedPaths: ['P', 'Clippings'] }, index = new LocalIndex();
  const rebuild = async () => { index.replace(await Promise.all([...files].map(([path, text]) => indexNote({ path, text, metadata: readMetadata(text, parse), modifiedAt: 1 }, () => null))), settings); };
  await rebuild(); let reads = 0, beforeRead = async () => {}, beforeCreate = async () => {}, folders = 0;
  const plugin = { app: {}, active: true, settings, index, modals: new Set(), rebuildIndex: rebuild, projectIdentity: () => 'P', withDependencies: <T>(v: T) => v,
    projectExportPort: (current: () => boolean) => ({ readText: async (path: string) => { reads++; await beforeRead(); if (!current()) throw Error('changed'); return files.get(path)!; } }),
    evidenceCurrent: async (bundle: { noteHashes: Record<string, string> }, saved: unknown) => { if (JSON.stringify(saved) !== JSON.stringify(settings)) return false; for (const [path, hash] of Object.entries(bundle.noteHashes)) if (!readableText(path, settings) || !files.has(path) || await contentHash(files.get(path)!) !== hash) return false; return true; },
    createNotes: async (notes: { path: string; content: string }[], validate: () => Promise<void>, current: () => boolean) => createNewNotes(notes, { exists: path => files.has(path), checkPath: () => {}, ensureFolder: async () => { folders++; modal.invalidate(); await beforeCreate(); }, create: async (path, content) => { files.set(path, content); } }, validate, current)
  };
  const modal = new ClipperModal(plugin as unknown as ThreadPlugin); modal.onOpen();
  const field = (name: string, value: string) => { const el = state.fields.get(name)!; assert.ok(el, name); el.value = value; if (el.tagName === 'select') el.onchange!(); else el.oninput!(); };
  const button = (label: string) => { const e = state.elements.find(e => e.textContent === label && e.tagName === 'button'); assert.ok(e, label); return e; };
  const review = async () => { await button('Refresh clips').onclick(); field('Saved clip', 'Clippings/A.md'); field('Clip project association', 'P'); field('New clipped source name', 'Reviewed clip'); await button('Review selected clip').onclick(); };
  const preview = async () => { await button('Preview clipped source').onclick(); return [...plugin.modals].at(-1) as import('./new-note-modal.ts').NewNoteModal | undefined; };
  return { plugin, modal, files, state, reads: () => reads, folders: () => folders, field, button, review, preview, rendered: () => render(modal.resultEl as unknown as Element), beforeRead: (f: () => Promise<void>) => { beforeRead = f; }, beforeCreate: (f: () => Promise<void>) => { beforeCreate = f; } };
}
test('clip intake explicitly reads and saves exact new copy while own folder invalidation preserves valid save', async () => {
  const f = await fixture(); assert.equal(f.reads(), 0); await f.review(); assert.equal(f.reads(), 1); assert.ok(f.rendered().includes('Publication date (source claim): 2025-01-02'));
  const original = f.files.get('Clippings/A.md'), preview = await f.preview(); assert.ok(preview); assert.equal(f.files.size, 2);
  await preview.apply!.onclick!({} as PointerEvent); assert.equal(f.files.get('P/Sources/Reviewed clip.md'), preview.note.content); assert.equal(f.files.get('Clippings/A.md'), original); assert.equal(f.folders(), 1); assert.match(preview.status!.textContent!, /^Saved/);
});
test('possible duplicates require explicit acknowledgement, and collisions preserve all bytes', async () => {
  const f = await fixture(true); await f.review(); assert.ok(f.rendered().includes('Exact original text hash: P/Prior.md')); assert.equal(await f.preview(), undefined); assert.match(f.modal.status!.textContent!, /acknowledge/);
  const ack = f.state.fields.get('I reviewed possible duplicates')!; ack.checked = true; ack.onchange!(); const preview = await f.preview(); assert.ok(preview);
  f.files.set(preview.note.path, 'Concurrent note'); await preview.apply!.onclick!({} as PointerEvent); assert.equal(f.files.get(preview.note.path), 'Concurrent note'); assert.ok(!preview.status!.textContent!.startsWith('Saved'));
});
test('clip name, association, duplicate acknowledgement, cancel, close and late input changes revoke exact save', async () => {
  for (const change of ['name', 'project', 'ack', 'cancel', 'close', 'late-name', 'source', 'settings']) {
    const f = await fixture(); await f.review(); const preview = await f.preview(); assert.ok(preview);
    if (change === 'name') f.field('New clipped source name', 'Other');
    if (change === 'project') f.field('Clip project association', '');
    if (change === 'ack') f.state.fields.get('I reviewed possible duplicates')!.onchange!();
    if (change === 'cancel') await f.button('Cancel clip intake').onclick();
    if (change === 'close') f.modal.onClose();
    if (change === 'late-name') f.beforeCreate(async () => f.field('New clipped source name', 'Other'));
    if (change === 'source') f.files.set('Clippings/A.md', 'Changed');
    if (change === 'settings') f.plugin.settings.excludedPaths = ['Clippings'];
    await preview.apply!.onclick!({} as PointerEvent); assert.ok(!f.files.has(preview.note.path), change);
  }
});
test('late reads cannot publish after input, source, cancel, close or settings invalidation', async () => {
  for (const change of ['input', 'source', 'cancel', 'close', 'settings']) {
    const f = await fixture(); let entered!: () => void, release!: () => void; const start = new Promise<void>(r => entered = r), gate = new Promise<void>(r => release = r);
    f.beforeRead(async () => { entered(); await gate; }); const running = f.review(); await start;
    if (change === 'input') f.field('Saved clip', ''); if (change === 'source') f.modal.invalidate(); if (change === 'cancel') await f.button('Cancel clip intake').onclick(); if (change === 'close') f.modal.onClose(); if (change === 'settings') { f.plugin.settings.allowedPaths = []; f.modal.invalidate(); }
    release(); await running; assert.equal(f.rendered(), '\n', change); assert.equal(f.button('Preview clipped source').disabled, true); assert.equal(f.plugin.modals.size, 0);
  }
});
test('duplicate hints disclose only current permitted bounded candidates and state coverage limits', async () => {
  const f = await fixture(true); f.plugin.settings.excludedPaths = ['P/Prior.md'];
  const original = await readClip(f.files.get('Clippings/A.md')!, parse);
  for (let i = 0; i < 105; i++) f.files.set(`P/Duplicate${String(i).padStart(3, '0')}.md`, clippedSource(original, 'Clippings/A.md', 'P'));
  await f.plugin.rebuildIndex(); await f.review();
  assert.ok(!f.rendered().includes('P/Prior.md')); assert.ok(f.rendered().includes('100 matches among 100')); assert.ok(f.rendered().includes('5 omitted'));
  assert.ok(!f.rendered().includes('Duplicate104'));
});
