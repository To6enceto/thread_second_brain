import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
const compiled=await build({entryPoints:[new URL('./project-overview-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'overview-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 const state=()=>globalThis.__overviewForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class TFolder {static [Symbol.hasInstance](value){return value?.fixtureFolder===true;}}
 export class TFile {static [Symbol.hasInstance](value){return value?.fixtureFile===true;}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {NextActionModal,ProjectOverviewModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./project-overview-modal.ts');
import { multiProjectOverview } from "../vault/project-overview.ts";
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('native chosen-action handlers revoke edited inputs and identity/settings/folder races while preserving owned-folder saves',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__overviewForm',form);
 const raw='---\ntype: project\nid: "p"\n---\n## Objective\nA',entry=await indexNote({path:'P/Overview.md',text:raw,metadata:{type:'project',id:'p'},modifiedAt:1},()=>null),settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index=new LocalIndex();index.replace([entry],settings);const created:unknown[]=[];let duringCreate=()=>{},read=async()=>raw,folder=true,writable=true;
 const card=(await multiProjectOverview(index,settings,async()=>[])).cards[0]!;
 const plugin={active:true,settings,index,modals:new Set(),app:{vault:{getAbstractFileByPath:(path:string)=>path==='P'?(folder?{fixtureFolder:true,path}:null):{fixtureFile:true,path},read:()=>read()}},rebuildIndex:async()=>{},changePathAllowed:()=>writable,createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);}};
 const button=(label:string)=>{const el=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(el,label);return el;},input=(label:string,value:string)=>{const el=form.fields.get(label);assert.ok(el,label);el.value=value;el.changed!(value);};
 const modal=new NextActionModal(plugin as unknown as ThreadPlugin,card,structuredClone(settings));modal.open();
 try{
  input('Selection note name','Record');input('Your chosen next action','Test the next action');await button('Preview next-action record').onclick!();let preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview.note.content.includes('thread_next_action_version: "1"'));
  input('Your chosen next action','Changed after preview');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);
  await button('Preview next-action record').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;duringCreate=()=>modal.invalidate('Owned folder created');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);duringCreate=()=>{};
  writable=false;const before=plugin.modals.size;await button('Preview next-action record').onclick!();assert.equal(plugin.modals.size,before);assert.ok(modal.status!.textContent!.includes('mapped write destinations'));writable=true;
  let release:(value:string)=>void=()=>{},started:()=>void=()=>{};const begun=new Promise<void>(r=>started=r);read=()=>{started();return new Promise<string>(r=>release=r);};const pending=button('Preview next-action record').onclick!();await begun;input('Your chosen next action','Edited during held read');release(raw);await pending;assert.equal(plugin.modals.size,before);
  read=async()=>raw;await button('Preview next-action record').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;folder=false;await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);folder=true;
  await button('Preview next-action record').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;plugin.settings={...settings,excludedPaths:['P/Overview.md']};await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);plugin.settings=settings;
  read=async()=>raw+' later edit';await button('Preview next-action record').onclick!();assert.equal(created.length,1);assert.ok(modal.status!.textContent!.includes('identity'));modal.close();
 }finally{Reflect.deleteProperty(globalThis,'__overviewForm');}
});
test('overview filter, cancel and detached switch handlers clear derived cards and preserve grants',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__overviewForm',form);
 const settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index=new LocalIndex();index.replace([await indexNote({path:'P/Overview.md',text:'Project',metadata:{type:'project',id:'p',status:'paused'},modifiedAt:1},()=>null)],settings);let switches=0;
 const plugin={active:true,settings,index,modals:new Set(),changes:{state:{pending:null}},app:{vault:{getAbstractFileByPath:()=>({fixtureFolder:true})}},rebuildIndex:async()=>{},questionReviewReferences:async()=>[],updateSettings:async()=>{switches++;},openThread:async()=>{}};
 const modal=new ProjectOverviewModal(plugin as unknown as ThreadPlugin);modal.open();
 const ready=async()=>{for(let i=0;i<100;i++){if(modal.status!.textContent!.includes('overview ready'))return;await tick();}assert.fail(modal.status!.textContent!);};
 const button=(label:string)=>{const el=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(el,label);return el;};
 try{
  await ready();const old=button('Open project: P');const filter=form.fields.get('Project status filter')!;filter.changed!('active');await ready();const output=modal.resultEl as unknown as Element;assert.ok(output.children.some(e=>e.textContent.includes('No permitted projects match')));filter.changed!('paused');await ready();assert.ok(output.children.some(e=>e.textContent.includes('1 of 1')));
  await button('Cancel overview refresh').onclick!();assert.equal(output.children.length,0);await old.onclick!();await tick();assert.equal(switches,0);assert.deepEqual(plugin.settings.allowedPaths,['P']);modal.close();
 }finally{Reflect.deleteProperty(globalThis,'__overviewForm');}
});
