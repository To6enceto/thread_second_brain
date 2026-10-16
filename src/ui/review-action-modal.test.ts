import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
import { projectReviewQueue } from "../vault/review-queue.ts";
import { reviewSnapshot } from "../vault/review-events.ts";
const compiled=await build({entryPoints:[new URL('./review-action-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'review-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 const state=()=>globalThis.__reviewForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class TFile {static [Symbol.hasInstance](value){return value?.fixtureFile===true;}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {ReviewActionModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./review-action-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
test('actual review action inputs revoke old previews and held work, source invalidation clears derived data, own-folder save remains valid',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__reviewForm',form);
 const raw='## Open questions\nPRIVATE_TARGET_25 question?',entry=await indexNote({path:'P/Q.md',text:raw,metadata:{},modifiedAt:1},()=>null),settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index=new LocalIndex();index.replace([entry],settings);const item=projectReviewQueue(index,settings,'2026-10-16').items[0]!,snapshot=await reviewSnapshot(index,settings,item,async()=>[]),created:unknown[]=[];let duringCreate=()=>{},read=async()=>raw;
 const plugin={active:true,settings,index,modals:new Set(),app:{vault:{getAbstractFileByPath:(path:string)=>({fixtureFile:true,path}),read:()=>read()}},rebuildIndex:async()=>{},questionReviewReferences:async()=>[],projectIdentity:()=>"p",createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);}};
 const button=(label:string)=>{const el=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(el,label);return el;},input=(label:string,value:string)=>{const el=form.fields.get(label);assert.ok(el,label);el.value=value;el.changed!(value);};
 const modal=new ReviewActionModal(plugin as unknown as ThreadPlugin,{item,snapshot});modal.open();
 try{
  input('Review reason','Explicit reason');await button('Preview review action').onclick!();let preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview.note.content.includes('type: "review-event"'));
  input('Review reason','Changed reason');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);
  await button('Preview review action').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;duringCreate=()=>modal.invalidate('Owned new folder created');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);
  assert.equal(button('Preview review action').disabled,true);assert.equal((modal.resultEl as unknown as Element).children.length,0);modal.close();
  const next=new ReviewActionModal(plugin as unknown as ThreadPlugin,{item,snapshot});next.open();input('Review reason','Hold preparation');let release:(value:string)=>void=()=>{},started:()=>void=()=>{};const begun=new Promise<void>(r=>started=r);read=()=>{started();return new Promise<string>(r=>release=r);};const count=plugin.modals.size,pending=button('Preview review action').onclick!();await begun;input('Review reason','Changed during held read');release(raw);await pending;assert.equal(plugin.modals.size,count);assert.equal(button('Preview review action').disabled,false);
  read=async()=>raw;input('Review action','question');input('Review follow-up question','My explicit question?');await button('Preview review action').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview.note.content.includes('type: "question"'));assert.ok(preview.note.content.includes('status: "open"'));assert.ok(preview.note.content.includes('not supporting evidence'));
  next.invalidate();assert.equal((next.resultEl as unknown as Element).children.length,0);assert.equal(button('Preview review action').disabled,true);next.close();
 }finally{Reflect.deleteProperty(globalThis,'__reviewForm');}
});
