import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
const compiled=await build({entryPoints:[new URL('./health-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'health-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 const state=()=>globalThis.__healthForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}replaceChildren(...children){this.children=children;}add(option){this.children.push(option);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export function parseYaml(text){return Object.fromEntries(text.split(/\\r?\\n/).filter(l=>l.trim()&&!/^\\s*#/.test(l)).map(line=>{const colon=line.indexOf(':');const value=line.slice(colon+1).trim();let parsed;try{parsed=JSON.parse(value);}catch{parsed=value;}return[line.slice(0,colon),parsed];}));}
 export class TFolder {static [Symbol.hasInstance](value){return value?.fixtureFolder===true;}}
 export class TFile {static [Symbol.hasInstance](value){return value?.fixtureFile===true;}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {HealthRepairModal,HealthModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./health-modal.ts');
import { contentHash } from "../vault/scope.ts";
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('native repair preparation requires current bytes, inputs, identity and scope before creating one exact proposal',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__healthForm',form);const option=Reflect.get(globalThis,'Option');Reflect.set(globalThis,'Option',class{text:string;value:string;constructor(text:string,value:string){this.text=text;this.value=value;}});
 const raw='---\nid: "d"\ntype: "decision"\nrevisit_on: "invalid"\n---\n## Choice\nKeep',hash=await contentHash(raw),settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},index=new LocalIndex();index.replace([await indexNote({path:'P/D.md',text:raw,metadata:{id:'d',type:'decision',revisit_on:'invalid'},modifiedAt:1},()=>null)],settings);let read=async()=>raw,writable=true,opened=0;const proposals:unknown[]=[];
 const plugin={active:true,settings,index,modals:new Set(),app:{vault:{getAbstractFileByPath:(path:string)=>({fixtureFile:true,path,stat:{size:raw.length}}),read:()=>read()}},changePathAllowed:()=>writable,withDependencies:(bundle:unknown)=>bundle,evidenceCurrent:async()=>true,changeContext:()=>'',changes:{propose:async(ops:unknown,_context:string,current:()=>boolean)=>{assert.ok(current());proposals.push(ops);}},openChanges:()=>{opened++;}};
 const issue={kind:'invalid-date' as const,path:'P/D.md',hash,message:'Invalid date',effect:'Due handling unavailable',guidance:'Choose actual date',dateKey:'revisit_on'};
 const modal=new HealthRepairModal(plugin as unknown as ThreadPlugin,issue,structuredClone(settings));modal.open();const button=(label:string)=>{const el=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(el,label);return el;},input=(value:string)=>form.fields.get('Actual recorded date')!.changed!(value);
 try{
  for(let i=0;i<100&&button('Prepare exact repair proposal').disabled;i++)await tick();assert.equal(button('Prepare exact repair proposal').disabled,false);input('2000-01-01');await button('Prepare exact repair proposal').onclick!();assert.equal(proposals.length,1);assert.equal(opened,1);const op=(proposals[0] as {before:string;after:string}[])[0]!;assert.equal(op.before,raw);assert.equal(op.after,raw.replace('"invalid"','"2000-01-01"'));
  let release:(raw:string)=>void=()=>{},started:()=>void=()=>{};const begun=new Promise<void>(r=>started=r);read=()=>{started();return new Promise<string>(r=>release=r);};const pending=button('Prepare exact repair proposal').onclick!();await begun;input('2000-02-02');release(raw);await pending;assert.equal(proposals.length,1);read=async()=>raw;
  writable=false;await button('Prepare exact repair proposal').onclick!();assert.equal(proposals.length,1);writable=true;plugin.settings={...settings,excludedPaths:['P/D.md']};await button('Prepare exact repair proposal').onclick!();assert.equal(proposals.length,1);plugin.settings=settings;
  read=async()=>raw+' later';await button('Prepare exact repair proposal').onclick!();assert.equal(proposals.length,1);read=async()=>raw;modal.invalidate();assert.equal(button('Prepare exact repair proposal').disabled,true);modal.close();
 }finally{Reflect.set(globalThis,'Option',option);Reflect.deleteProperty(globalThis,'__healthForm');}
});
test('health scan reports no-grant empty coverage and native cancel clears derived diagnostics',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__healthForm',form);const index=new LocalIndex();index.replace([],defaultSettings());const plugin={active:true,settings:defaultSettings(),index,modals:new Set(),app:{},rebuildIndex:async()=>{},openChanges:()=>{}};const modal=new HealthModal(plugin as unknown as ThreadPlugin);modal.open();
 try{for(let i=0;i<100&&!modal.status!.textContent!.includes('Health snapshot ready');i++)await tick();assert.ok(modal.status!.textContent!.includes('Health snapshot ready'));assert.ok((modal.resultEl as unknown as Element).children.some(e=>e.textContent.includes('No diagnostics established')));const cancel=form.elements.find(e=>e.textContent==='Cancel health scan')!;await cancel.onclick!();assert.equal((modal.resultEl as unknown as Element).children.length,0);assert.ok(modal.status!.textContent!.includes('canceled'));modal.close();}finally{Reflect.deleteProperty(globalThis,'__healthForm');}
});
