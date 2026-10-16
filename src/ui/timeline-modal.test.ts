import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
const compiled=await build({entryPoints:[new URL('./timeline-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'timeline-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 const state=()=>globalThis.__timelineForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class TFolder {static [Symbol.hasInstance](value){return value?.fixtureFolder===true;}}
 export class TFile {static [Symbol.hasInstance](value){return value?.fixtureFile===true;}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {TimelineModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./timeline-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
test('native timeline milestone handlers revoke inputs and identity races while allowing owned folder creation',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__timelineForm',form);
 const raw='---\ntype: project\nid: "p"\n---\n## Objective\nA',entry=await indexNote({path:'P/Overview.md',text:raw,metadata:{type:'project',id:'p'},modifiedAt:1},()=>null),settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index=new LocalIndex();index.replace([entry],settings);const created:unknown[]=[];let duringCreate=()=>{},read=async()=>raw,folder=true,writable=true;
 const plugin={active:true,settings,index,modals:new Set(),app:{vault:{getAbstractFileByPath:(path:string)=>path==='P'?(folder?{fixtureFolder:true,path}:null):{fixtureFile:true,path},read:()=>read()}},rebuildIndex:async()=>{},projectIdentity:()=>"p",changePathAllowed:()=>writable,createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);}};
 const button=(label:string)=>{const el=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(el,label);return el;},input=(label:string,value:string)=>{const el=form.fields.get(label);assert.ok(el,label);el.value=value;el.changed!(value);};
 const modal=new TimelineModal(plugin as unknown as ThreadPlugin);modal.open();
 try{
  await new Promise(resolve=>setImmediate(resolve));assert.ok(modal.status!.textContent!.includes('Timeline ready'));input('Milestone note name','Record');input('Milestone title','Explicit milestone');input('Milestone detail','User-reported detail');input('Milestone event date','2000-01-01');await button('Preview milestone note').onclick!();let preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview.note.content.includes('event_on: "2000-01-01"'));
  input('Milestone detail','Changed detail');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);
  await button('Preview milestone note').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;duringCreate=()=>modal.invalidate('Owned folder created');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);assert.equal(button('Preview milestone note').disabled,true);
  await button('Refresh timeline').onclick!();await new Promise(resolve=>setImmediate(resolve));writable=false;const before=plugin.modals.size;await button('Preview milestone note').onclick!();assert.equal(plugin.modals.size,before);assert.ok(modal.status!.textContent!.includes('mapped write destinations'));writable=true;
  let release:(value:string)=>void=()=>{},started:()=>void=()=>{};const begun=new Promise<void>(r=>started=r);read=()=>{started();return new Promise<string>(r=>release=r);};const pending=button('Preview milestone note').onclick!();await begun;input('Milestone title','Changed during held identity read');release(raw);await pending;assert.equal(plugin.modals.size,before);
  read=async()=>raw;await button('Preview milestone note').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;folder=false;await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);folder=true;modal.invalidate();assert.equal((modal.resultEl as unknown as Element).children.length,0);modal.close();
 }finally{Reflect.deleteProperty(globalThis,'__timelineForm');}
});
