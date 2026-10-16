import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { savedSelection,selectionEvidence } from "../vault/selection.ts";

const compiled=await build({entryPoints:[new URL('./selection-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'selection-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__selectionModel(prompt,signal);}}
 `:`
 const state=()=>globalThis.__selectionForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}}
 export class Setting {constructor(parent){}setName(){return this;}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {SelectionModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./selection-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const rendered=(element:Element):string=>element.textContent+'\n'+element.children.map(rendered).join('\n');
test('actual selection handlers abort edited requests, clear invalidated source DOM and refuse stale previews',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__selectionForm',form);
 const settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'};
 const selection=await savedSelection('P/SOURCE_PATH.md','SELECTED_PASSAGE','SELECTED_PASSAGE',0,16,settings,[{from:0,to:16}]);
 const bundle=await selectionEvidence(selection,{type:'source'},1);const created:unknown[]=[];let duringCreate=()=>{};let receivedQuery='';
 const plugin={app:{},active:true,settings,index:{revision:1},modals:new Set(),evidenceCurrent:async()=>true,projectIdentity:()=>"project",withDependencies:(value:unknown)=>value,
  searchEvidence:async(query:string)=>{receivedQuery=query;return {hits:[],coverage:{eligibleNotes:1,filteredNotes:1,matchedNotes:0,matchedPassages:0,returnedPassages:0,truncatedNotes:0,limited:false,queryTruncated:false}};},
  createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.equal(current(),true);created.push(notes);}};
 const open=(action:'ask'|'question'|'related')=>{const modal=new SelectionModal(plugin as unknown as ThreadPlugin);modal.sourceSnapshot=selection;modal.bundle=bundle;modal.action=action;modal.open();return modal;};
 const button=(label:string)=>{const element=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(element,label);return element;};
 const input=(label:string,value:string)=>{const element=form.fields.get(label);assert.ok(element,label);element.changed!(value);};
 try{
  let started:(signal:AbortSignal)=>void=()=>{};const pending=new Promise<AbortSignal>(resolve=>started=resolve);let calls=0;
  Reflect.set(globalThis,'__selectionModel',(_prompt:string,signal:AbortSignal)=>{calls++;started(signal);return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Canceled')),{once:true}));});
  const ask=open('ask');input('Selection question','What does it say?');const run=button('Ask locally about selection');const work=run.onclick!();const signal=await pending;
  input('Selection question','A new question?');assert.equal(signal.aborted,true);assert.equal(run.disabled,false);await work;assert.equal(ask.resultEl?.textContent,'');
  ask.invalidate();assert.equal(rendered(ask.contentEl as unknown as Element).includes('SELECTED_PASSAGE'),false);assert.equal(rendered(ask.contentEl as unknown as Element).includes('SOURCE_PATH'),false);await run.onclick!();assert.equal(calls,1);
  const question=open('question');input('Selection question','What should we test?');input('Selection note name','Question draft');await button('Preview selection draft').onclick!();
  const preview=[...plugin.modals][0] as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview);assert.equal(created.length,0);assert.match(preview.note.content,/type: "questions"/);
  input('Selection question','Changed after preview?');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);assert.match(preview.status!.textContent!,/changed/);
  assert.equal(question.closed,false);
  const fresh=open('question');input('Selection question','A current question?');input('Selection note name','New folder question');await button('Preview selection draft').onclick!();
  const next=[...plugin.modals].reverse()[0] as unknown as import('./new-note-modal.ts').NewNoteModal;duringCreate=()=>fresh.invalidate();await next.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1,'Own folder invalidation must not invalidate current captured evidence');
  const related=open('related');await button('Find related allowed evidence').onclick!();assert.equal(receivedQuery,'selected passage');assert.match(related.status!.textContent!,/Found 0/);
 }finally{Reflect.deleteProperty(globalThis,'__selectionForm');Reflect.deleteProperty(globalThis,'__selectionModel');}
});
