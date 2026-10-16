import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex, type IndexEntry } from "./index.ts";
import { multiProjectOverview, nextActionMarkdown, overviewIdentity } from "./project-overview.ts";
import { reviewEventMarkdown, reviewSnapshot } from "./review-events.ts";
import { projectReviewQueue } from "./review-queue.ts";
import { readMetadata } from "./evidence.ts";

const settings={...defaultSettings(),allowedPaths:["Projects","Knowledge"],excludedPaths:["Projects/Private"],selectedProject:"Projects/A"};
settings.roles.projects="Projects";
const now=new Date("2000-01-20T12:00:00.000Z"),readQuestion=async()=>[];
const parse=(yaml:string)=>Object.fromEntries(yaml.split(/\r?\n/).map(line=>{const colon=line.indexOf(":");return[line.slice(0,colon),JSON.parse(line.slice(colon+1))];}));
const entry=(path:string,text:string,metadata:Record<string,unknown>={},modifiedAt=1)=>indexNote({path,text,metadata,modifiedAt},()=>null);
const project=(name:string,status?:string,id=name)=>entry(`Projects/${name}/Overview.md`,"## Objective\nTest",{type:"project",id,...(status?{status}:{})});
const setup=(entries:IndexEntry[])=>{const index=new LocalIndex();index.replace(entries,settings);return index;};
test("overview filters permitted explicit project states and separates recorded activity from edits and unknown chronology",async()=>{
 const entries=await Promise.all([project("A","active"),project("B","paused"),project("C","archived"),project("Legacy"),project("Private","active"),entry("Unshared/Overview.md","Secret",{type:"project"}),entry("Projects/A/Session.md","Recorded",{type:"session",recorded_on:"2000-01-10"},1),entry("Projects/A/Undated.md","No date",{type:"session"},9e11),entry("Projects/A/Invalid.md","Invalid",{type:"session",recorded_on:"2000-02-30"}),entry("Projects/A/Questions.md","## Open questions\n- First?\n- Second?",{type:"questions"})]);
 const index=setup(entries),result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);
 assert.deepEqual(result.cards.map(c=>[c.path,c.status]),[["Projects/A","active"],["Projects/B","paused"],["Projects/C","archived"],["Projects/Legacy","unknown"]]);
 assert.equal(result.permitted,4);assert.equal(result.cards[0]?.activity?.day,"2000-01-10");assert.equal(result.cards[0]?.activity?.dateBasis,"recorded_on");assert.equal(result.cards[0]?.questions,2);assert.ok(!JSON.stringify(result).includes("Private"));
 for(const status of ["active","paused","archived","unknown"] as const)assert.equal((await multiProjectOverview(index,settings,readQuestion,null,status,undefined,now)).cards.length,1);
});
test("overview uses hash-bound acknowledgements and snoozes for due counts, while keeping question candidates separate",async()=>{
 const entries=await Promise.all([project("A","active"),entry("Projects/A/Decision.md","## Choice\nKeep",{id:"d",type:"decision",status:"accepted",revisit_on:"2000-01-10"}),entry("Projects/A/Q.md","## Open questions\nWhy?",{type:"questions"})]),index=setup(entries),item=projectReviewQueue(index,settings,"2000-01-20").items.find(i=>i.kind==="revisit-date")!,snapshot=await reviewSnapshot(index,settings,item,readQuestion);
 const raw=reviewEventMarkdown("A",snapshot,item,"snoozed","Inspect next month","2000-02-10","2000-01-20"),event=await entry("Projects/A/Review.md",raw,readMetadata(raw,parse));index.replace([...entries,event],settings);
 let result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.cards[0]?.due,0);assert.equal(result.cards[0]?.questions,1);
 result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,new Date("2000-02-11T12:00:00.000Z"));assert.equal(result.cards[0]?.due,1);
 index.replace([...entries.map(e=>e.path.endsWith("Decision.md")?{...e,hash:"1".repeat(64)}:e),event],settings);assert.equal((await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now)).cards[0]?.due,1);
});
test("chosen action records preserve human selections, use explicit capture timestamps and refuse unsupported or ambiguous choices",async()=>{
 const raw=nextActionMarkdown("A","Test [one] <script>\n## not a heading",new Date("2000-01-15T12:00:00.000Z")),old=await entry("Projects/A/Old.md",raw,readMetadata(raw,parse),9e11),laterRaw=nextActionMarkdown("A","Later choice",new Date("2000-01-16T12:00:00.000Z")),later=await entry("Projects/A/Later.md",laterRaw,readMetadata(laterRaw,parse),1),base=[await project("A","active"),old,later],index=setup(base);
 let result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.cards[0]?.chosen?.path,later.path);assert.ok(raw.includes("\\[one\\] \\<script\\>"));assert.ok(!old.chunks.some(c=>c.heading==="not a heading"));assert.equal(old.hash,(await entry(old.path,raw,readMetadata(raw,parse))).hash);
 for(const bad of [{...later,metadata:{...later.metadata,project:"different-project"}},{...later,metadata:{...later.metadata,thread_next_action_version:"2"}},{...later,metadata:{...later.metadata,selected_at:"2000-02-30T12:00:00.000Z"}},{...later,metadata:{...later.metadata,selected_at:"2100-01-01T12:00:00.000Z"}}]){index.replace([base[0]!,old,bad],settings);result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.cards[0]?.chosen,null);assert.ok(result.cards[0]?.limits.some(l=>l.includes("indeterminate")));}
 index.replace([...base,{...later,path:"Projects/A/Tie.md",id:"different",metadata:{...later.metadata,id:"different"}}],settings);assert.equal((await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now)).cards[0]?.chosen,null);
 assert.throws(()=>nextActionMarkdown("A"," "),/1-1000/);assert.throws(()=>nextActionMarkdown("A","x".repeat(1001)),/1-1000/);
});
test("ambiguous project identity suppresses associations and invalidates selection rather than choosing a folder by duplicate ID",async()=>{
 const index=setup(await Promise.all([project("A","active","same"),project("B","paused","same")]));assert.equal(overviewIdentity(index,settings,"Projects/A").id,null);let result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.ok(result.cards.every(c=>c.questions===null&&c.chosen===null&&c.identity.reason.includes("duplicated")));
 index.replace(await Promise.all([project("A","active"),entry("Projects/A/Other.md","Project",{type:"project",id:"other",status:"paused"})]),settings);result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.cards[0]?.status,"unknown");assert.equal(result.cards[0]?.identity.id,null);
});
test("overview hides stale excerpts and scope-invalid proposals, with deterministic project and record budget limits",async()=>{
 const entries=await Promise.all([project("A","active"),entry("Projects/A/Stale.md","PRIVATE_STALE27",{type:"session",recorded_on:"2000-01-19",thread_sources:"broken"})]),index=setup(entries),proposal={id:"pending",createdAt:"now",status:"stale" as const,context:JSON.stringify({settings,noteHashes:{"Projects/A/Overview.md":"hash"}}),operations:[{path:"Projects/A/Draft.md",before:null,beforeHash:null,after:"PRIVATE_DRAFT27",afterHash:"hash"}]};
 let result=await multiProjectOverview(index,settings,readQuestion,proposal,"all",undefined,now);assert.equal(result.cards[0]?.proposal,1);assert.ok(!JSON.stringify(result).includes("PRIVATE"));
 result=await multiProjectOverview(index,settings,readQuestion,{...proposal,context:JSON.stringify({settings,noteHashes:{"Unshared/Secret.md":"hash"}})},"all",undefined,now);assert.equal(result.cards[0]?.proposal,0);
 const many=await Promise.all(Array.from({length:23},(_,i)=>project(`Project ${String(i).padStart(2,"0")}`,"active")));index.replace(many,settings);result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.matching,23);assert.equal(result.cards.length,20);assert.equal(result.cards[0]?.path,"Projects/Project 00");
 index.replace([entries[0]!,...Array.from({length:2000},(_,i)=>({...entries[0]!,id:undefined,path:`Projects/A/N${i}.md`,metadata:{}}))],settings);result=await multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);assert.equal(result.cards[0]?.records,2001);assert.equal(result.cards[0]?.questions,null);assert.ok(result.cards[0]?.limits.some(l=>l.includes("budget")));
});
test("overview cancellation and index replacement refuse partial snapshots",async()=>{
 const index=setup([await project("A","active")]),controller=new AbortController();controller.abort();await assert.rejects(multiProjectOverview(index,settings,readQuestion,null,"all",controller.signal,now),/abort/i);
 const pending=multiProjectOverview(index,settings,readQuestion,null,"all",undefined,now);index.clear();await assert.rejects(pending,/changed/);
});
