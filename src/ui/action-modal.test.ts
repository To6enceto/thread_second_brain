import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "../vault/index.ts";
import { actionMarkdown, newAction, readAction } from "../vault/action-record.ts";
const compiled=await build({entryPoints:[new URL('./action-modal.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'actions-host',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'host',namespace:'stub'}));builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:'model',namespace:'stub'}));
 builder.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:args.path==='model'?`
 export function validateVectors(){throw new Error("Unexpected embedding call");}
 export class OllamaClient {generate(_model,prompt,signal){return globalThis.__actionsModel(prompt,signal);}}
 `:`
 export function parseYaml(text){return Object.fromEntries(text.split("\\n").map(line=>{const at=line.indexOf(": ");return[line.slice(0,at),JSON.parse(line.slice(at+2))];}));}
 const state=()=>globalThis.__actionsForm;
 class Element {constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.value='';state().elements.push(this);if(options.attr?.['aria-label'])state().fields.set(options.attr['aria-label'],this);}
 createEl(tag,options={}){const child=new Element(tag,options);this.children.push(child);return child;}createDiv(options={}){return this.createEl('div',options);}add(value){this.children.push(value);}replaceChildren(...values){this.children=values;}addClass(){}empty(){this.children=[];this.textContent='';}setText(value){this.textContent=value;}setAttribute(key,value){if(key==='aria-label')state().fields.set(value,this);}}
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();this.selection={win:{},range:null,focusEl:null,focusVisible:false};}}
 export class Setting {constructor(parent){}setName(){return this;}setDesc(){return this;}addDropdown(fn){return this.component(fn);}addText(fn){return this.component(fn);}addTextArea(fn){return this.component(fn);}component(fn){const inputEl=new Element('input');fn({inputEl,selectEl:inputEl,addOption(){return this;},setPlaceholder(){return this;},setValue(value){inputEl.value=value;return this;},onChange(callback){inputEl.changed=callback;return this;}});return this;}}
 `}));
}}]});
const {ActionModal}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString('base64')}`) as typeof import('./action-modal.ts');
interface Element {textContent:string;value:string;disabled:boolean;children:Element[];changed?:(value:string)=>void;onclick?:()=>Promise<void>;}
const rendered=(element:Element):string=>element.textContent+'\n'+element.children.map(rendered).join('\n');

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const empty={sources:[],noteHashes:{},truncated:false};
function metadata(raw:string):Record<string,unknown>{return Object.fromEntries(raw.split(/\r?\n---(?:\r?\n|$)/)[0]!.split("\n").filter(l=>/^\w+: /.test(l)).map(l=>{const at=l.indexOf(': ');return[l.slice(0,at),JSON.parse(l.slice(at+2))];}));}
async function fixture(){
 const form={elements:[] as Element[],fields:new Map<string,Element>()};Reflect.set(globalThis,'__actionsForm',form);
 const originalOption=Reflect.get(globalThis,'Option');Reflect.set(globalThis,'Option',class{value:string;textContent:string;children:Element[]=[];constructor(text:string,value:string){this.value=value;this.textContent=text;}});
 const raw=actionMarkdown(newAction('P','Managed action','Initial choice','2026-10-20',empty,new Date('2026-10-20T00:00:00.000Z'))),path='P/Actions/Original.md';
 const entry=await indexNote({path,text:raw,metadata:metadata(raw),modifiedAt:1},()=>null),settings={...defaultSettings(),allowedPaths:['P'],selectedProject:'P',roles:{...defaultSettings().roles,projects:'P'}};
 const index=new LocalIndex();index.replace([entry],settings);index.revision=1;
 const created:unknown[]=[],proposed:{path:string;before:string;after:string}[][]=[];let duringCreate=()=>{},read=raw;
 const plugin={app:{},active:true,settings,index,modals:new Set(),rebuildIndex:async()=>{},evidenceCurrent:async()=>true,projectIdentity:()=>"P",withDependencies:(v:unknown)=>v,changePathAllowed:()=>true,readReviewedTarget:async()=>read,changeContext:()=>"snapshot",openChanges:()=>{},
 createNotes:async(notes:unknown,validate:()=>Promise<void>,current:()=>boolean)=>{duringCreate();await validate();assert.ok(current());created.push(notes);},
 changes:{propose:async(value:{path:string;before:string;after:string}[],_context:string,current:()=>boolean)=>{if(!current())throw Error('Canceled');proposed.push(value);}}};
 const button=(label:string)=>{const e=[...form.elements].reverse().find(e=>e.textContent===label);assert.ok(e,label);return e;};
 const input=(label:string,value:string)=>{const e=form.fields.get(label);assert.ok(e,label);e.value=value;if(e.changed)e.changed(value);else(e as unknown as{onchange?:()=>void}).onchange?.();};
 const modal=new ActionModal(plugin as unknown as ThreadPlugin);modal.open();await settle();
 const draft=async()=>{input('Action note name','New action');input('Action title','Plan a test');input('Action reason','Reviewed human choice');input('Reported action date','2026-10-20');await button('Preview action').onclick!();const preview=[...plugin.modals].at(-1) as unknown as import('./new-note-modal.ts').NewNoteModal;assert.ok(preview);return preview;};
 return{plugin,modal,input,button,draft,created,proposed,entry,raw,path,form,setRead:(v:string)=>read=v,setDuringCreate:(fn:()=>void)=>duringCreate=fn,cleanup:()=>{modal.onClose();Reflect.set(globalThis,'Option',originalOption);Reflect.deleteProperty(globalThis,'__actionsForm');}};
}
test('action form requires exact save, preserves planned state and allows own-folder revalidation',async()=>{
 const f=await fixture();try{
  const preview=await f.draft();assert.equal(f.created.length,0);assert.equal(readAction(preview.note.content,metadata(preview.note.content)).status,'planned');
  f.setDuringCreate(()=>{f.modal.invalidate();f.plugin.index.ready=false;});f.plugin.evidenceCurrent=async()=>{f.plugin.index.ready=true;return true;};
  await preview.apply!.onclick!({} as PointerEvent);assert.equal(f.created.length,1);assert.match(preview.status!.textContent!,/^Saved /);
 }finally{f.cleanup();}
});
test('action edits, cancel, close and final-await revisions revoke every old new-note preview',async()=>{
 for(const operation of ['edit','cancel','close','late-edit','excluded'] as const){const f=await fixture();try{
  const preview=await f.draft();
  if(operation==='edit')f.input('Action reason','New reason');
  if(operation==='cancel')await f.button('Cancel action').onclick!();
  if(operation==='close')f.modal.onClose();
  if(operation==='excluded')f.plugin.evidenceCurrent=async()=>false;
  if(operation==='late-edit')f.plugin.evidenceCurrent=async()=>{f.input('Action reason','Edited during validation');return true;};
  await preview.apply!.onclick!({} as PointerEvent);assert.equal(f.created.length,0,operation);
 }finally{f.cleanup();}}
});
test('transitions propose full before/after with retained history; conflicts and ambiguous identities refuse proposals',async()=>{
 const f=await fixture();try{
  f.input('Action operation','transition');f.input('Action to update',f.path);f.input('Action state','done');f.input('Action reason','I recorded completion');f.input('Reported action date','2026-10-20');
  await f.button('Preview action').onclick!();assert.equal(f.created.length,0);assert.equal(f.proposed.length,1);
  const proposal=f.proposed[0]![0]!;assert.equal(proposal.before,f.raw);const record=readAction(proposal.after,metadata(proposal.after));assert.equal(record.status,'done');assert.equal(record.history.length,2);assert.deepEqual(record.history[0],readAction(f.raw,metadata(f.raw)).history[0]);
  f.setRead(f.raw+'Concurrent edit');await f.button('Preview action').onclick!();assert.equal(f.proposed.length,1);assert.match(f.modal.status!.textContent!,/changed/);
  f.setRead(f.raw);f.plugin.index.entries.push({...f.entry,path:'P/Duplicate.md'});await f.button('Preview action').onclick!();assert.equal(f.proposed.length,1);assert.match(f.modal.status!.textContent!,/ambiguous/);
 }finally{f.cleanup();}
});
test('late proposal validation respects cancel; stale scopes clear selectable action identities',async()=>{
 const f=await fixture();try{
  let start!:()=>void,release!:()=>void;const begun=new Promise<void>(r=>start=r),gate=new Promise<void>(r=>release=r);
  f.plugin.changes.propose=async(value,_context,current)=>{start();await gate;if(current())f.proposed.push(value);};
  f.input('Action operation','transition');f.input('Action to update',f.path);f.input('Action reason','Change');f.input('Reported action date','2026-10-20');
  const pending=f.button('Preview action').onclick!();await begun;await f.button('Cancel action').onclick!();release();await pending;
  assert.equal(f.proposed.length,0);assert.equal(f.button('Preview action').disabled,true);assert.ok(!rendered(f.modal.contentEl as unknown as Element).includes(f.path));
 }finally{f.cleanup();}
});
