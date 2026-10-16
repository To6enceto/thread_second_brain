import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";
import { buildEvidence } from "../vault/evidence.ts";
import { FreshnessGraph,type FreshNote,type SourceReference } from "../vault/freshness.ts";
import { readableText } from "../vault/scope.ts";

// Execute real form/generation handlers; the host and inference are controlled.
const compiled = await build({entryPoints:[new URL("./knowledge-modal.ts",import.meta.url).pathname,new URL("./freshness-modal.ts",import.meta.url).pathname],outdir:"unused",bundle:true,write:false,format:"esm",platform:"node",plugins:[{name:"host-and-held-model",setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:"host",namespace:"stub"}));
 builder.onResolve({filter:/intelligence\/ollama\.ts$/},()=>({path:"model",namespace:"stub"}));
 builder.onLoad({filter:/.*/,namespace:"stub"},args=>({contents:args.path==="model"?`
 export function validateVectors(){throw new Error("Unexpected embedding call in write-generation test");}
 export class OllamaClient { async generate(_model,_prompt,signal){globalThis.__threadHeld(signal);return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));} }
 `:`
 const state=()=>globalThis.__threadForm;
 class Element {
  constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.value='';this.children=[];this.disabled=false;this.attrs={...options.attr};state().elements.push(this);if(this.attrs['aria-label'])state().fields.set(this.attrs['aria-label'],this);}
  createEl(tag,options={}){const element=new Element(tag,options);this.children.push(element);return element;}
  createDiv(options={}){return this.createEl('div',options);} get options(){return this.children;} addClass(){} setAttribute(key,value){this.attrs[key]=value;if(key==='aria-label')state().fields.set(value,this);}
  setText(value){this.textContent=value;} empty(){this.children=[];this.textContent='';} replaceChildren(...values){this.children=values;} add(value){this.children.push(value);}
 }
 export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}}
 export class Setting {
  constructor(parent){this.parent=parent;}setName(){return this;}setDesc(){return this;}
  component(callback){const inputEl=new Element('input'),component={inputEl,selectEl:inputEl,setValue(value){inputEl.value=value;return this;},setPlaceholder(){return this;},addOption(){return this;},onChange(fn){inputEl.changed=fn;return this;}};callback(component);return this;}
  addText(callback){return this.component(callback);}addTextArea(callback){return this.component(callback);}addDropdown(callback){return this.component(callback);}
 }
 `}));
}}]});
const modules = await Promise.all(compiled.outputFiles.map(async file=>import(`data:text/javascript;base64,${Buffer.from(file.text).toString("base64")}`))) as [typeof import("./knowledge-modal.ts"),typeof import("./freshness-modal.ts")];
interface Control {value:string;disabled:boolean;textContent:string;changed?:(value:string)=>void;onchange?:()=>void;onclick?:()=>Promise<void>;}
test("contextual freshness renders only current resolved paths, including renamed references",async()=>{
 const previousOption=Reflect.get(globalThis,"Option");Reflect.set(globalThis,"Option",class {textContent:string;value:string;constructor(text:string,value:string){this.textContent=text;this.value=value;}});
 const form={elements:[] as Control[],fields:new Map<string,Control>()};Reflect.set(globalThis,"__threadForm",form);
 try{
  const settings={...defaultSettings(),allowedPaths:["P"],excludedPaths:["P/Private"]},hash="a".repeat(64);
  const ref=(path:string,id?:string):SourceReference=>({path,...(id?{id}:{}),heading:"CACHED_HEADING",hash,noteHash:hash});
  const refs=[ref("P/Source.md"),ref("P/Private/EXCLUDED.md"),ref("P/MISSING.md"),ref("P/Private/AMBIGUOUS.md","duplicate"),ref("P/Private/RETIRED.md","renamed")];
  const entries:(FreshNote&{title:string})[]=[{path:"P/Output.md",title:"Output",hash,metadata:{type:"answer"},output:{refs,invalid:false,title:"Output"}},
   ...["Source","Duplicate one","Duplicate two","Renamed"].map((title,i)=>({path:`P/${title}.md`,title,hash,metadata:{type:"source"},...(i===1||i===2?{id:"duplicate"}:i===3?{id:"renamed"}:{})}))];
  const opened:string[]=[];let inference=0;Reflect.set(globalThis,"__threadHeld",()=>{inference++;throw new Error("Unexpected inference");});
  const plugin={app:{vault:{getAbstractFileByPath:()=>null}},settings,modals:new Set(),
   index:{ready:true,entries,projectEntries:()=>entries.filter(e=>!e.output&&readableText(e.path,settings)),graph:()=>new FreshnessGraph(entries,settings)},rebuildIndex:async()=>{},
   openIndexedSource:async(path:string,currentHash:string,_heading:string,current:()=>boolean)=>{assert.equal(currentHash,hash);assert.equal(current(),true);opened.push(path);}};
  const modal=new modules[1].FreshnessModal(plugin as unknown as ThreadPlugin);modal.initialPath="P/Output.md";modal.onOpen();await new Promise(resolve=>setImmediate(resolve));
  type Node={textContent?:string;value?:string;children?:Node[]};
  const rendered=(node:Node):string=>[node.textContent??"",node.value??"",...(node.children??[]).map(rendered)].join("\n");
  const text=rendered(modal.contentEl as unknown as Node);
  assert.equal(form.fields.get("Output to refresh")?.value,"P/Output.md","Contextual selection must execute the real choose handler");
  for(const hidden of ["EXCLUDED.md","MISSING.md","AMBIGUOUS.md","RETIRED.md","CACHED_HEADING"])assert.equal(text.includes(hidden),false,hidden);
  assert.match(text,/unavailable: Supporting source unavailable/);assert.match(text,/ambiguous: Supporting source unavailable/);assert.match(text,/renamed: P\/Renamed.md/);
  const source=form.elements.find(element=>element.textContent==="Open current source: P/Renamed.md");assert.ok(source);await source.onclick?.();assert.deepEqual(opened,["P/Renamed.md"]);
  assert.equal(form.elements.filter(element=>element.textContent.startsWith("Open current source:")).length,2);assert.equal(modal.generateButton?.disabled,false);assert.equal(inference,0);
 }finally{Reflect.set(globalThis,"Option",previousOption);Reflect.deleteProperty(globalThis,"__threadForm");Reflect.deleteProperty(globalThis,"__threadHeld");}
});
test("actual Knowledge/refresh handlers cancel on existing, optional-link, new-target and original-output changes",async()=>{
 const previousOption=Reflect.get(globalThis,"Option");Reflect.set(globalThis,"Option",class {text:string;value:string;constructor(text:string,value:string){this.text=text;this.value=value;}});
 try{for(const target of ["K/Existing.md","P/Overview.md","K/New.md","P/Old.md","R/Old refreshed.md"]){
  const form={elements:[] as Control[],fields:new Map<string,Control>()};Reflect.set(globalThis,"__threadForm",form);
  let announce:(signal:AbortSignal)=>void=()=>{};const started=new Promise<AbortSignal>(resolve=>announce=resolve);Reflect.set(globalThis,"__threadHeld",announce);
  let proposals=0;const bundle=await buildEvidence([{path:"P/S.md",text:"Budget 20 euros.",metadata:{type:"source"},modifiedAt:1}]);
  const entries=[{path:"P/S.md",title:"S",hash:bundle.noteHashes["P/S.md"],metadata:{type:"source"}},{path:"K/Existing.md",title:"Existing",metadata:{type:"concept"}},{path:"P/Overview.md",title:"Overview",metadata:{type:"project"}},{path:"P/Old.md",title:"Old",hash:"a".repeat(64),metadata:{type:"review"},output:{refs:[],invalid:false}}];
  const plugin={app:{vault:{getAbstractFileByPath:()=>null}},settings:{...defaultSettings(),selectedProject:"P",allowedPaths:["P","K","R"],roles:{...defaultSettings().roles,knowledge:"K",reviews:"R"}},modals:new Set(),
   index:{ready:true,entries,projectEntries:()=>entries,graph:()=>({assess:()=>({state:"changed",reason:"Source changed.",references:[{ref:{path:"P/S.md"},path:"P/S.md",hash:bundle.noteHashes["P/S.md"]}]})})},rebuildIndex:async()=>{},changePathAllowed:()=>true,
   evidenceFromPaths:async()=>bundle,evidenceCurrent:async()=>true,projectIdentity:()=>"project",changes:{state:{pending:null,recovery:null},propose:async()=>{proposals++;}},openChanges:()=>{}};
  const refresh=target.startsWith("R/")||target==="P/Old.md";
  const modal=refresh?new modules[1].FreshnessModal(plugin as unknown as ThreadPlugin):new modules[0].KnowledgeModal(plugin as unknown as ThreadPlugin);
  modal.onOpen();await new Promise(resolve=>setImmediate(resolve));
  const set=(label:string,value:string)=>{const control=form.fields.get(label)!;assert.ok(control,label);control.value=value;if(control.changed)control.changed(value);else control.onchange?.();};
  const click=(label:string)=>{const control=form.elements.find(element=>element.textContent===label);assert.ok(control,label);return control.onclick?.();};
  if(refresh)set("Output to refresh","P/Old.md");else{
   set("Knowledge title","New");set("Synthesis source","P/S.md");await click("Add source to synthesis");
   if(target!=="K/New.md")set("Knowledge destination","K/Existing.md");if(target==="P/Overview.md")set("Optional project link",target);
  }
  const work=click(refresh?"Generate refreshed version":"Generate knowledge proposal");
  const signal=await Promise.race([started,new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error("Generation did not start")),1000);timer.unref();})]);
  try{assert.ok(modal.dependencies?.has(target),`Known target ${target} omitted`);const epoch=modal.epoch;modal.invalidatePaths(new Set([target]));assert.equal(signal.aborted,true,target);assert.ok(modal.epoch>epoch);await work;assert.equal(proposals,0);}finally{modal.controller?.abort();await work;}
 }}finally{Reflect.set(globalThis,"Option",previousOption);Reflect.deleteProperty(globalThis,"__threadForm");Reflect.deleteProperty(globalThis,"__threadHeld");}
});
