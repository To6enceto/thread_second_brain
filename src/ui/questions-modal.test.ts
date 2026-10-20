import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
import { questionMarkdown } from "../vault/questions.ts";
const compiled=await build({entryPoints:[new URL('./questions-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'questions-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__questionsModel(prompt,signal);}}
 `:`
 export function parseYaml(text){return Object.fromEntries(text.split("\\n").map(line=>{const at=line.indexOf(": ");return[line.slice(0,at),JSON.parse(line.slice(at+2))];}));}
 const state=()=>globalThis.__questionsForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}add(value){this.children.push(value);}replaceChildren(...values){this.children=values;}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}}
 export class Setting {constructor(parent){}setName(){return this;}setDesc(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setPlaceholder(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {QuestionsModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./questions-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const rendered=(element:Element):string=>element.textContent+'\n'+element.children.map(rendered).join('\n');
test('actual question forms preserve legacy evidence and revoke stale previews/in-flight proposals',async()=>{
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__questionsForm',form);const previousOption=Reflect.get(globalThis,'Option');Reflect.set(globalThis,'Option',class{value:string;textContent:string;children:Element[]=[];constructor(text:string,value:string){this.value=value;this.textContent=text;}});
 const empty={sources:[],noteHashes:{},truncated:false},raw=questionMarkdown('Managed original?','project',empty,'2026-10-16'),meta=Object.fromEntries(raw.split('\n').filter(l=>/^\w+: /.test(l)).map(l=>{const at=l.indexOf(': ');return[l.slice(0,at),JSON.parse(l.slice(at+2))];}));
 const entries=await Promise.all([{path:'P/Q.md',text:raw,metadata:meta,modifiedAt:1},{path:'P/Legacy.md',text:'## Open questions\nLEGACY_ORIGINAL_QUESTION',metadata:{type:'questions'},modifiedAt:1}].map(n=>indexNote(n,()=>null)));
 const settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P'},created:unknown[]=[],proposed:unknown[]=[];let duringCreate=()=>{},started:()=>void=()=>{},release:()=>void=()=>{};const begun=new Promise<void>(r=>started=r),gate=new Promise<void>(r=>release=r);
 const index=new LocalIndex();index.replace(entries,settings);index.revision=1;
 const plugin={app:{},active:true,settings,index,modals:new Set(),rebuildIndex:async()=>{},evidenceCurrent:async()=>true,projectIdentity:()=>"project",withDependencies:(v:unknown)=>v,changePathAllowed:()=>true,readReviewedTarget:async()=>raw,changeContext:()=>"snapshot",openChanges:()=>{},
  createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);},
  changes:{propose:async(value:unknown,_context:string,current:()=>boolean)=>{started();await gate;if(!current())throw Error('Canceled inputs');proposed.push(value);}}};
 const button=(label:string)=>{const e=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(e,label);return e;},input=(label:string,value:string)=>{const e=form.fields.get(label);assert.ok(e,label);e.value=value;if(e.changed)e.changed(value);else (e as unknown as {onchange?:()=>void}).onchange?.();};
 const modal=new QuestionsModal(plugin as unknown as ThreadPlugin);modal.open();
 try{
  await new Promise(resolve=>setImmediate(resolve));input('Legacy question section','0');await button('Copy legacy section into new question').onclick!();input('Question note name','Copied');input('New question','USER_EDITED_QUESTION');await button('Preview question action').onclick!();
  let preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview);assert.ok(preview.note.content.includes('## Question\n\nUSER\\_EDITED\\_QUESTION'));assert.ok(preview.note.content.includes('LEGACY_ORIGINAL_QUESTION'),'Citation must retain original copied source, not edited question');
  input('New question','Changed again');await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,0);
  await button('Preview question action').onclick!();preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;duringCreate=()=>modal.invalidate();await preview.apply!.onclick!({} as PointerEvent);assert.equal(created.length,1);
  await button('Refresh questions').onclick!();await new Promise(resolve=>setImmediate(resolve));input('Question action','update');input('Managed question to update','P/Q.md');input('Question update reason','Investigate manually');input('Question event date','2026-10-17');const pending=button('Preview question action').onclick!();await begun;input('Question update reason','Changed during proposal');assert.equal(button('Preview question action').disabled,false);release();await pending;assert.equal(proposed.length,0);
  modal.invalidate();assert.equal(rendered(modal.contentEl as unknown as Element).includes('LEGACY_ORIGINAL_QUESTION'),false);assert.equal(button('Preview question action').disabled,true);
 }finally{release();Reflect.set(globalThis,'Option',previousOption);Reflect.deleteProperty(globalThis,'__questionsForm');}
});
