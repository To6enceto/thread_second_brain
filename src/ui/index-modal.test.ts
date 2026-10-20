import {test} from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import type ThreadPlugin from "../main.ts";
import {defaultSettings} from "../settings/settings.ts";
const compiled=await build({entryPoints:[new URL('./index-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'index-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 const state=()=>globalThis.__indexForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;state().elements.push(this);}createEl(tag,options={}){const el=new Element(tag,options);this.children.push(el);return el;}createDiv(){return this.createEl('div');}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
 export class Setting {constructor(){}setName(){return this;}addDropdown(fn){const el=new Element('select');fn({selectEl:el,addOption(){return this;},setValue(value){el.value=value;return this;},onChange(fn){el.changed=fn;return this;}});return this;}}
 `}));}}]});
const {IndexModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./index-modal.ts');
interface Element {textContent:string;disabled:boolean;changed?:(value:string)=>void;onclick?:()=>Promise<void>|void;}
test('coverage profile handlers merge current grants, reflect cancellation/restart and detach listeners',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__indexForm',form);
 const plugin={active:true,settings:{...defaultSettings(),allowedPaths:['Old']},index:{ready:false,coverage:null},indexListeners:new Set<()=>void>(),indexProgress:{phase:'running',done:1,total:3,detail:'Work'},modals:new Set(),app:{},updateSettings:async(value:unknown)=>{plugin.settings=value as typeof plugin.settings;},cancelIndexing:()=>{cancels++;plugin.indexProgress.phase='canceled';for(const fn of plugin.indexListeners)fn();},rebuildIndex:async()=>{resumes++;},resetTextIndex:async()=>{rebuilds++;}};
 let cancels=0,resumes=0,rebuilds=0;const button=(text:string)=>{const el=form.elements.find(el=>el.textContent===text);assert.ok(el,text);return el;};
 const modal=new IndexModal(plugin as unknown as ThreadPlugin);plugin.modals.add(modal);modal.open();
 try{
  assert.equal(plugin.indexListeners.size,1);assert.equal(button('Resume indexing').disabled,true);assert.equal(button('Cancel current indexing').disabled,false);
  await button('Resume indexing').onclick!();assert.equal(resumes,0);await button('Cancel current indexing').onclick!();assert.equal(cancels,1);assert.equal(button('Resume indexing').disabled,false);
  form.fields.get('Index budget profile')!.changed!('conservative');plugin.settings={...plugin.settings,allowedPaths:['New'],excludedPaths:['New/Private']};await button('Save index budget profile').onclick!();assert.equal(plugin.settings.indexProfile,'conservative');assert.deepEqual(plugin.settings.allowedPaths,['New']);assert.deepEqual(plugin.settings.excludedPaths,['New/Private']);
  await button('Resume indexing').onclick!();await button('Rebuild text index').onclick!();assert.equal(resumes,1);assert.equal(rebuilds,1);
  modal.close();assert.equal(plugin.indexListeners.size,0);await button('Rebuild text index').onclick!();await button('Save index budget profile').onclick!();assert.equal(rebuilds,1);
 }finally{if(!modal.closed)modal.close();Reflect.deleteProperty(globalThis,'__indexForm');}
});
