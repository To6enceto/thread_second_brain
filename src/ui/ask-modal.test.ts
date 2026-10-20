import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote } from "../vault/index.ts";
const compiled=await build({entryPoints:[new URL('./ask-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'workbench-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__workbenchModel(prompt,signal);}}
 `:`
 const state=()=>globalThis.__workbenchForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();this.modalEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}close(){this.onClose();}}
 export class Setting {constructor(parent){}setName(){return this;}setDesc(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setPlaceholder(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {AskModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./ask-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const rendered=(element:Element):string=>element.textContent+'\n'+element.children.map(rendered).join('\n');
test('actual workbench handlers require reviewed generation and revoke changed choices/previews',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__workbenchForm',form);
 const settings={...defaultSettings(),model:'local',allowedPaths:['P'],selectedProject:'P'},created:unknown[]=[],opened:string[]=[];
 const entries=await Promise.all(['FIRST_CANARY','SECOND_CANARY'].map((text,i)=>indexNote({path:`P/${i}.md`,text,metadata:{type:'source'},modifiedAt:1},()=>null)));
 let calls=0,signal:AbortSignal|undefined,duringCreate=()=>{};const levels:string[]=[];
 const plugin={app:{},active:true,settings,index:{ready:true,revision:1},modals:new Set(),rebuildIndex:async()=>{},evidenceCurrent:async()=>true,projectIdentity:()=>"project",withDependencies:(v:unknown)=>v,
  searchEvidence:async(_q:unknown,_v:unknown,_f:unknown,_h:unknown,_s:unknown,_signal:unknown,_current:unknown,_watch:unknown,level:string)=>{levels.push(level);return {hits:entries.map(entry=>({entry,heading:'',excerpt:entry.chunks[0]!.excerpt,score:1})),coverage:{eligibleNotes:2,filteredNotes:2,matchedNotes:2,matchedPassages:2,returnedPassages:2,truncatedNotes:0,limited:false,queryTruncated:false}};},
  openIndexedSource:async(path:string,_hash:string,_heading:string,current:()=>boolean)=>{assert.ok(current());opened.push(path);},
  createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);}};
 const button=(label:string)=>{const e=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(e,label);return e;};
 const input=(label:string,value:string)=>{const e=form.fields.get(label);assert.ok(e,label);e.changed!(value);};
 const modal=new AskModal(plugin as unknown as ThreadPlugin);modal.open();
 try{
  let evidence:unknown[]=[];
  Reflect.set(globalThis,'__workbenchModel',(prompt:string)=>{calls++;evidence=JSON.parse(prompt).evidence;const id=(evidence[0] as {id:string}).id;return Promise.resolve(JSON.stringify({supported:true,answer:[{kind:'fact',text:'Chosen evidence.',sourceIds:[id]}],gaps:[]}));});
  await modal.run('What is recorded?',false);assert.equal(calls,0);assert.match(rendered(modal.contentEl as unknown as Element),/FIRST_CANARY/);
  input('Evidence choice S1','exclude');input('Evidence choice S2','pin');await button('Generate from chosen evidence').onclick!();
  assert.equal(calls,1);assert.equal(JSON.stringify(evidence).includes('FIRST_CANARY'),false);assert.equal((evidence[0] as {id:string}).id,'S2');assert.match(rendered(modal.contentEl as unknown as Element),/Claims and supporting passages/);
  await button('Open evidence S2').onclick!();assert.deepEqual(opened,['P/1.md']);
  await button('Preview answer note').onclick!();let preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview);
  input('Evidence choice S1','include');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);assert.match(preview.status!.textContent!,/changed/);
  await button('Generate from chosen evidence').onclick!();await button('Preview answer note').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;
  duringCreate=()=>modal.invalidate();await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1,'Own folder invalidation must allow unchanged captured context');
  await modal.run('What is recorded?',false);
  Reflect.set(globalThis,'__workbenchModel',(_prompt:string,s:AbortSignal)=>{calls++;signal=s;return new Promise((_resolve,reject)=>s.addEventListener('abort',()=>reject(new Error('Canceled')),{once:true}));});
  const work=button('Generate from chosen evidence').onclick!();await new Promise(resolve=>setImmediate(resolve));assert.ok(signal);input('Evidence choice S1','exclude');assert.ok(signal.aborted);await work;assert.equal(modal.answer,null);
  const old=button('Generate from chosen evidence'),before=calls;modal.invalidate();const text=rendered(modal.contentEl as unknown as Element);assert.equal(text.includes('FIRST_CANARY'),false);assert.equal(text.includes('SECOND_CANARY'),false);await old.onclick!();assert.equal(calls,before);
  Reflect.set(globalThis,'__workbenchModel',(prompt:string)=>{calls++;const source=JSON.parse(prompt).evidence[0];return Promise.resolve(JSON.stringify({supported:true,answer:[{kind:'fact',text:'Chosen evidence.',sourceIds:[source.id]}],gaps:[]}));});
  input('Question','What is recorded?');await modal.run('What is recorded?',false);await button('Generate from chosen evidence').onclick!();await button('Preview answer note').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;const savedBefore=created.length,chatsBefore=calls;
  await button('Search more').onclick!();assert.equal(modal.answer,null);for(let n=0;modal.controller&&n<100;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(levels.at(-1),'broader');assert.equal(calls,chatsBefore);await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,savedBefore,'Search more must revoke the earlier exact answer preview');
  await button('Search more').onclick!();for(let n=0;modal.controller&&n<100;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(levels.at(-1),'maximum');assert.equal(button('Search more').disabled,true);
  input('Search note type','source');assert.equal(button('Search more').disabled,false);await modal.askButton!.onclick!({} as PointerEvent);for(let n=0;modal.controller&&n<100;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(levels.at(-1),'standard');
  const detachedMore=button('Search more'),requestCount=levels.length;modal.close();await detachedMore.onclick!();assert.equal(levels.length,requestCount);
 }finally{modal.controller?.abort();Reflect.deleteProperty(globalThis,'__workbenchForm');Reflect.deleteProperty(globalThis,'__workbenchModel');}
});

test("claim correction handlers retain originals and require renewed exact previews",async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__workbenchForm',form);
 const settings={...defaultSettings(),model:'local',allowedPaths:['P'],selectedProject:'P'};
 const entry=await indexNote({path:'P/Source.md',text:'Voice is proposed.',metadata:{type:'source'},modifiedAt:1},()=>null);
 let calls=0,fresh=true;const created:import('../vault/workspace.ts').NewNote[][]=[];
 const plugin={app:{},active:true,settings,index:{ready:true,revision:1},modals:new Set(),rebuildIndex:async()=>{},evidenceCurrent:async()=>fresh,projectIdentity:()=>'project',withDependencies:(v:unknown)=>v,
  searchEvidence:async()=>({hits:[{entry,heading:'',excerpt:entry.chunks[0]!.excerpt,score:1}]}),
  createNotes:async(notes:import('../vault/workspace.ts').NewNote[],validate:()=>Promise<void>,current:()=>boolean)=>{await validate();assert.ok(current());created.push(structuredClone(notes));}};
 const button=(label:string)=>{const found=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(found,label);return found;};
 const input=(label:string,value:string)=>{const field=form.fields.get(label);assert.ok(field,label);field.changed!(value);};
 Reflect.set(globalThis,'__workbenchModel',()=>{calls++;return Promise.resolve(JSON.stringify({supported:true,answer:[{text:'ORIGINAL_MODEL_CANARY',kind:'fact',sourceIds:['S1']}],gaps:[]}));});
 const modal=new AskModal(plugin as unknown as ThreadPlugin);modal.open();
 const preview=()=>[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;
 try{
  await modal.run('What is recorded?',false);await button('Generate from chosen evidence').onclick!();
  const original=JSON.stringify(modal.answer);assert.equal(modal.answer!.answer[0]!.modelKind,'fact');
  await button('Preview answer note').onclick!();const old=preview(),oldBytes=old.note.content;
  input('Claim text 1','Compare a text-first alternative.');input('Claim classification 1','suggestion');
  assert.equal(calls,1,'Editing must not invoke AI');assert.equal(JSON.stringify(modal.answer),original,'Original model result stays immutable');
  assert.equal(old.apply!.disabled,true);await old.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);assert.equal(old.note.content,oldBytes,'Existing preview bytes are frozen');
  input('Claim text 1',' ');assert.equal(button('Preview answer note').disabled,true);
  const count=plugin.modals.size;await button('Preview answer note').onclick!();assert.equal(plugin.modals.size,count,'Invalid draft cannot preview');
  input('Claim text 1','Compare a text-first alternative.');assert.equal(button('Preview answer note').disabled,false);
  await button('Preview answer note').onclick!();const renamed=preview();
  input('New answer note name','Reviewed answer');assert.equal(renamed.apply!.disabled,true);
  await button('Preview answer note').onclick!();let latest=preview();const approved={...latest.note};
  assert.match(approved.content,/User correction - Proposed action/);assert.match(approved.content,/Original model \(fact\): ORIGINAL/);assert.match(approved.content,/thread_answer_version: "1"/);
  assert.equal(approved.path,'P/Answers/Reviewed answer.md');await latest.apply!.onclick!({} as PointerEvent);assert.deepEqual(created,[[approved]]);
  await button('Preview answer note').onclick!();latest=preview();fresh=false;await latest.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);assert.match(latest.status!.textContent!,/changed/);
  fresh=true;await button('Preview answer note').onclick!();latest=preview();await button('Cancel').onclick!();assert.equal(modal.answer,null);assert.equal(latest.apply!.disabled,true);assert.equal(created.length,1);
  await modal.run('What is recorded?',false);await button('Generate from chosen evidence').onclick!();
  assert.ok(!rendered(modal.contentEl as unknown as Element).includes('Compare a text-first alternative.'));
  await button('Preview answer note').onclick!();latest=preview();modal.close();await latest.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1,'Closing Ask revokes its preview');
 }finally{modal.controller?.abort();Reflect.deleteProperty(globalThis,'__workbenchForm');Reflect.deleteProperty(globalThis,'__workbenchModel');}
});
