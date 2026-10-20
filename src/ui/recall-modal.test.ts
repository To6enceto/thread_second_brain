import {test} from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import type ThreadPlugin from "../main.ts";
import {defaultSettings} from "../settings/settings.ts";
import {indexNote} from "../vault/index.ts";
const compiled=await build({entryPoints:[new URL('./recall-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'recall-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__workbenchModel(prompt,signal);}}
 `:`
 const state=()=>globalThis.__recallForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}setDesc(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setPlaceholder(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {RecallModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./recall-modal.ts');

interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
test('Find native budget handlers advance explicitly, reset on edits and refuse detached results or closed actions',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__recallForm',form);
 const entry=await indexNote({path:'P/A.md',text:'budget 20 euros',metadata:{type:'source'},modifiedAt:1},()=>null),levels:string[]=[],opened:string[]=[],signals:AbortSignal[]=[];let hold=false;
 const plugin={active:true,settings:{...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index:{ready:true},app:{},modals:new Set(),rebuildIndex:async()=>{},resetTextIndex:async()=>{},searchEvidence:async(_q:unknown,_v:unknown,_f:unknown,_h:unknown,_s:unknown,signal:AbortSignal,_current:unknown,_watch:unknown,level:string)=>{levels.push(level);signals.push(signal);if(hold)await new Promise<void>((_r,j)=>signal.addEventListener('abort',()=>j(new DOMException('Canceled','AbortError')),{once:true}));return{hits:[{entry,heading:'',excerpt:'budget 20 euros',score:1}],coverage:{eligibleNotes:1,filteredNotes:1,matchedNotes:1,matchedPassages:1,returnedPassages:1,truncatedNotes:0,limited:false,queryTruncated:false}};},openIndexedSource:async(path:string,_hash:unknown,_heading:unknown,current:()=>boolean)=>{assert.ok(current());opened.push(path);}};
 const button=(label:string)=>{const el=[...form.elements].reverse().find(el=>el.textContent===label);assert.ok(el,label);return el;},input=(label:string,value:string)=>{const el=form.fields.get(label);assert.ok(el,label);el.changed!(value);},settled=async()=>{for(let n=0;n<100&&modal.controller;n++)await new Promise(r=>setImmediate(r));assert.equal(modal.controller,null);};
 const modal=new RecallModal(plugin as unknown as ThreadPlugin);modal.open();
 try{
  input('Search text','budget');await button('Find passages').onclick!();await settled();assert.equal(levels.at(-1),'standard');const old=button('P/A.md');
  await button('Search more').onclick!();await settled();assert.equal(levels.at(-1),'broader');await old.onclick!();assert.equal(opened.length,0);await button('P/A.md').onclick!();assert.deepEqual(opened,['P/A.md']);
  await button('Search more').onclick!();await settled();assert.equal(levels.at(-1),'maximum');assert.ok(button('Search more').disabled);input('Search status','accepted');assert.equal(button('Search more').disabled,false);await button('Find passages').onclick!();await settled();assert.equal(levels.at(-1),'standard');
  hold=true;await button('Search more').onclick!();await new Promise(r=>setImmediate(r));await button('Cancel').onclick!();assert.ok(signals.at(-1)!.aborted);await settled();hold=false;
  const detached=button('Search more'),before=levels.length;modal.close();await detached.onclick!();assert.equal(levels.length,before);
 }finally{if(!modal.closed)modal.close();Reflect.deleteProperty(globalThis,'__recallForm');}
});
