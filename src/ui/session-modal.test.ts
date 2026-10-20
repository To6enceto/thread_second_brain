import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
import { actionMarkdown, newAction } from "../vault/action-record.ts";
const compiled=await build({entryPoints:[new URL('./session-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'session-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__sessionModel(prompt,signal);}}
 `:`
 export function parseYaml(text){return Object.fromEntries(text.split("\\n").map(line=>{const at=line.indexOf(": ");return[line.slice(0,at),JSON.parse(line.slice(at+2))];}));}
 const state=()=>globalThis.__sessionForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createSpan(options={}){return this.createEl('span',options);}createDiv(options={}){return this.createEl('div',options);}add(value){this.children.push(value);}replaceChildren(...values){this.children=values;}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}}
 export class Setting {constructor(parent){}setName(){return this;}setDesc(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setPlaceholder(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {SessionModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./session-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];checked?:boolean;onchange?:()=>void;changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const rendered=(element:Element):string=>element.textContent+'\n'+element.children.map(rendered).join('\n');


import { buildEvidence, readMetadata } from "../vault/evidence.ts";
import { actionSnapshot } from "../vault/action-board.ts";
const parse=(raw:string)=>Object.fromEntries(raw.split("\n").filter(l=>/^\w+: /.test(l)).map(l=>{const at=l.indexOf(': ');return[l.slice(0,at),JSON.parse(l.slice(at+2))];}));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(){
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__sessionForm',form);
 const empty={sources:[],noteHashes:{},truncated:false},now=new Date('2026-10-20T12:00:00.000Z');
 const files=new Map([['P/Chosen.md',actionMarkdown(newAction('P','Chosen action','CHOSEN USER REPORT','2026-10-20',empty,now))],['P/Unchosen.md',actionMarkdown(newAction('P','Unchosen action','UNCHOSEN PRIVATE REPORT','2026-10-20',empty,now))]]);
 const settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P',model:'local-test'},index=new LocalIndex();index.replace(await Promise.all([...files].map(([path,text])=>indexNote({path,text,metadata:readMetadata(text,parse),modifiedAt:1},()=>null))),settings);index.revision=1;
 const snapshot=await actionSnapshot(index,settings,{read:async path=>files.get(path)!,parse,current:()=>true,verify:async()=>true},new AbortController().signal);
 const general=await buildEvidence([{path:'P/Overview.md',text:'## Objective\nCompare local results.',metadata:{type:'project'},modifiedAt:1},{path:'P/Unchosen.md',text:'## Action\nUNCHOSEN PRIVATE REPORT',metadata:{type:'action'},modifiedAt:1}]);
 const created:unknown[]=[];let duringCreate=()=>{},prompts:Record<string,unknown>[]=[];
 Reflect.set(globalThis,'__sessionModel',async(prompt:string)=>{const data=JSON.parse(prompt);prompts.push(data);return JSON.stringify({progress:[],decisions:[],openQuestions:[],nextActions:[{kind:'suggestion',text:'Review the recorded constraints.',sourceIds:[data.evidence[0].id]}],gaps:[]});});
 const plugin={app:{},active:true,settings,index,modals:new Set(),rebuildIndex:async()=>{},actionSnapshot:async()=>snapshot,evidence:async()=>general,evidenceCurrent:async()=>true,withDependencies:(v:unknown)=>v,projectIdentity:()=>"P",openIndexedSource:async()=>{},
 createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);}};
 const button=(label:string)=>{const e=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(e,label);return e;};
 const input=(label:string,value:string)=>{const e=form.fields.get(label);assert.ok(e,label);e.value=value;e.changed?.(value);};
 const choose=(title:string,value:boolean)=>{const e=form.fields.get(`Use recorded action ${title}`);assert.ok(e);e.checked=value;e.onchange!();};
 const modal=new SessionModal(plugin as unknown as ThreadPlugin);modal.open();
 const generate=async(selected=true)=>{input('Session note name','Recorded wrap-up');await button('Refresh recorded actions').onclick!();if(selected)choose('Chosen action',true);await button('Generate session wrap-up').onclick!();assert.equal(button('Preview session note').disabled,false,modal.status!.textContent!);};
 const preview=async()=>{await button('Preview session note').onclick!();const result=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(result);return result;};
 return{form,plugin,modal,files,snapshot,created,prompts,button,input,choose,generate,preview,setDuringCreate:(fn:()=>void)=>duringCreate=fn,cleanup:()=>{modal.onClose();Reflect.deleteProperty(globalThis,'__sessionForm');Reflect.deleteProperty(globalThis,'__sessionModel');}};
}
test('wrap-up sends only explicitly selected action reports and saves an exact separate user-record section',async()=>{
 const f=await fixture();try{
  await f.generate();assert.ok(JSON.stringify(f.prompts).includes('CHOSEN USER REPORT'));assert.ok(!JSON.stringify(f.prompts).includes('UNCHOSEN PRIVATE REPORT'));
  const preview=await f.preview();assert.ok(preview.note.content.includes('## Explicitly selected action reports'));assert.ok(preview.note.content.includes('Chosen action'));assert.ok(!preview.note.content.includes('Unchosen action'));assert.ok(preview.note.content.includes('changes no action status'));
  assert.equal(f.created.length,0);f.setDuringCreate(()=>{f.modal.invalidate();f.plugin.index.ready=false;});f.plugin.evidenceCurrent=async()=>{f.plugin.index.ready=true;return true;};await preview.apply!.onclick!({} as PointerEvent);assert.equal(f.created.length,1);assert.match(preview.status!.textContent!,/^Saved /);
  assert.equal(f.files.size,2);for(const card of f.snapshot.cards)assert.equal(card.record.status,'planned');
 }finally{f.cleanup();}
});
test('wrap-up leaves action selection empty by default and preserves ordinary project context',async()=>{
 const f=await fixture();try{await f.generate(false);assert.ok(!JSON.stringify(f.prompts).includes('USER REPORT'));assert.ok(!JSON.stringify(f.prompts).includes('UNCHOSEN PRIVATE REPORT'));assert.ok(JSON.stringify(f.prompts).includes('Compare local results.'));const p=await f.preview();assert.ok(p.note.content.includes('No action records explicitly selected.'));}finally{f.cleanup();}
});
test('wrap-up selection/name/report/cancel/close and final-await changes revoke saved previews',async()=>{
 for(const change of ['selection','name','report','cancel','close','late-selection','excluded'] as const){const f=await fixture();try{
  await f.generate();const preview=await f.preview();
  if(change==='selection')f.choose('Chosen action',false);
  if(change==='name')f.input('Session note name','Different');
  if(change==='report')f.input('Reported progress','Different report');
  if(change==='cancel')await f.button('Cancel wrap-up').onclick!();
  if(change==='close')f.modal.onClose();
  if(change==='excluded')f.plugin.evidenceCurrent=async()=>false;
  if(change==='late-selection')f.plugin.evidenceCurrent=async()=>{f.choose('Chosen action',false);return true;};
  await preview.apply!.onclick!({} as PointerEvent);assert.equal(f.created.length,0,change);
 }finally{f.cleanup();}}
});
test('wrap-up clears selected identities and refuses late model output after source invalidation',async()=>{
 const f=await fixture();try{
  let start!:()=>void,release!:()=>void;const begun=new Promise<void>(r=>start=r),gate=new Promise<void>(r=>release=r);
  Reflect.set(globalThis,'__sessionModel',async()=>{start();await gate;return JSON.stringify({progress:[],decisions:[],openQuestions:[],nextActions:[],gaps:[]});});
  await f.button('Refresh recorded actions').onclick!();f.choose('Chosen action',true);const pending=f.button('Generate session wrap-up').onclick!();await begun;f.modal.invalidate();release();await pending;
  assert.equal(f.button('Preview session note').disabled,true);assert.ok(!rendered(f.modal.contentEl as unknown as Element).includes('Chosen action'));assert.equal(f.created.length,0);
 }finally{f.cleanup();}
});
