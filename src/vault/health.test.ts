import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSettings } from "../settings/settings.ts";
import { indexNote, LocalIndex } from "./index.ts";
import { healthHeadings, healthMetadata, inspectVaultHealth, repairHealthDate, repairHealthHeading } from "./health.ts";
import { questionMarkdown } from "./questions.ts";
import { frontmatter } from "./workspace.ts";
import { readMetadata } from "./evidence.ts";

const settings={...defaultSettings(),allowedPaths:["Projects","Knowledge","Sources"],excludedPaths:["Projects/Private"],selectedProject:"Projects/A"};settings.roles.projects="Projects";
const parse=(text:string)=>Object.fromEntries(text.split(/\r?\n/).filter(l=>l.trim()&&!/^\s*#/.test(l)).map(line=>{const colon=line.indexOf(":");if(colon<1)throw Error("Invalid fixture YAML");const key=line.slice(0,colon),raw=line.slice(colon+1).trim().replace(/\s+#.*$/,"");let value:unknown;try{value=JSON.parse(raw);}catch{value=raw.replace(/^'|'$/g,"");}return[key,value];}));
async function fixture(notes:Record<string,string>){const index=new LocalIndex();index.replace(await Promise.all(Object.entries(notes).map(([path,text])=>indexNote({path,text,metadata:readMetadata(text,parse),modifiedAt:1},()=>null))),settings);return{index,port:{read:async(e:{path:string},max:number)=>new TextEncoder().encode(notes[e.path]!).length>max?null:notes[e.path]!,resolve:(_path:string,link:string)=>notes[link]?link:null,parse}};}
test("health diagnoses practical scoped identity/date/reference/project/heading gaps without copying unavailable paths or note prose",async()=>{
 const notes={"Projects/A/Overview.md":frontmatter({id:"a",type:"project",status:"active"})+"## Project objectives\nOutcome","Projects/A/Bad.md":frontmatter({id:"duplicate",type:"session",recorded_on:"2000-02-30"})+"## Done\nPRIVATE_PROSE28\n[Secret](Projects/Private/Hidden.md)","Knowledge/Other.md":frontmatter({id:"duplicate",type:"decision",project:"unavailable-project",decided_on:"invalid"})+"## Choice\nKeep","Knowledge/Orphan.md":frontmatter({type:"question"})+"## Question\nWhy?","Projects/Private/Hidden.md":frontmatter({id:"duplicate",type:"project"})+"HIDDEN28","Sources/Generic.md":"# Research\nArbitrary source structure."},f=await fixture(notes),reads:string[]=[];
 const report=await inspectVaultHealth(f.index,settings,{...f.port,read:async(e,max)=>{reads.push(e.path);return f.port.read(e,max);}});
 assert.equal(report.examined,5);assert.equal(report.counts["duplicate-id"],2);assert.equal(report.counts["invalid-date"],2);assert.equal(report.counts.references,1);assert.equal(report.counts.project,2);assert.equal(report.counts.heading,1);assert.equal(reads.length,5);assert.ok(!reads.some(p=>p.includes("Private")));assert.ok(!JSON.stringify(report).includes("Hidden.md"));assert.ok(!JSON.stringify(report).includes("PRIVATE_PROSE"));assert.ok(!report.issues.some(i=>i.path==="Sources/Generic.md"));
});
test("health validates real calendars and reports malformed formats while respecting recognized properties and private evidence headings",async()=>{
 const q=questionMarkdown("Human question","a",{sources:[],noteHashes:{},truncated:false},"2000-01-01").replace("## Question","## Legacy human section").replace("No supporting notes selected.","## Question\nPRIVATE_QUESTION_HEADING28");
 const f=await fixture({"Projects/A/Overview.md":frontmatter({type:"project",id:"a",objective:"Property objective"})+"Plain body","Projects/A/Q.md":q,"Projects/A/Valid.md":frontmatter({type:"session",recorded_on:"2000-02-29T12:00:00.000Z",created:"2000-01-01T00:00:00.000Z"})+"## User-reported progress\nReport","Projects/A/Date.md":frontmatter({type:"decision",revisit_on:"2000-01-01T12:00:00.000Z",selected_at:"2000-02-30T12:00:00.000Z"})+"## Choice\nKeep","Projects/A/Broken.md":"---\nbroken\n---\nText"});
 const report=await inspectVaultHealth(f.index,settings,f.port);assert.equal(report.counts["invalid-date"],2);assert.ok(report.issues.some(i=>i.kind==="format"&&i.path.endsWith("Broken.md")));assert.ok(report.issues.some(i=>i.kind==="heading"&&i.path.endsWith("Q.md")));assert.ok(!JSON.stringify(report).includes("PRIVATE_QUESTION"));assert.ok(!healthHeadings(q,readMetadata(q,parse)).some(h=>h.heading==="Question"));assert.equal(healthMetadata("plain",parse).type,undefined);assert.throws(()=>healthMetadata("---\nunfinished",parse),/Incomplete/);
});
test("bounded health scans count omitted diagnostics, avoid oversized reads through the port and refuse stale or canceled snapshots",async()=>{
 const notes=Object.fromEntries(Array.from({length:510},(_,i)=>[`Knowledge/N${String(i).padStart(3,"0")}.md`,frontmatter({id:"duplicate",created:"invalid"})+"Text"]));notes["Knowledge/Huge.md"]="x".repeat(1048577);const f=await fixture(notes),progress:number[]=[];let reads=0;
 const report=await inspectVaultHealth(f.index,settings,{...f.port,read:async(e,max)=>{reads++;return f.port.read(e,max);}},undefined,done=>progress.push(done));assert.equal(report.available,511);assert.equal(report.examined,499);assert.equal(report.skipped,1);assert.equal(report.issues.length,200);assert.equal(report.counts["invalid-date"],499);assert.equal(reads,500);assert.equal(progress.at(-1),500);
 const controller=new AbortController();controller.abort();await assert.rejects(inspectVaultHealth(f.index,settings,f.port,controller.signal),/abort/i);
 await assert.rejects(inspectVaultHealth(f.index,settings,{...f.port,read:async()=>"changed"}),/changed/);
 const pending=inspectVaultHealth(f.index,settings,f.port);f.index.clear();await assert.rejects(pending,/changed/);
});
test("individual scalar date correction preserves exact other bytes including BOM/CRLF/comments and refuses complex/valid/ambiguous fields",()=>{
 const before='\uFEFF---\r\nid: "d"\r\ntype: "decision"\r\nrevisit_on: "not-a-date" # actual date needed\r\nother: "keep"\r\n---\r\n## Choice\r\nOriginal\r\n';
 const after=repairHealthDate(before,"revisit_on","2000-02-29",parse);assert.equal(after,before.replace('"not-a-date"','"2000-02-29"'));assert.throws(()=>repairHealthDate(before,"revisit_on","2000-02-30",parse),/actual/);assert.throws(()=>repairHealthDate(before,"id","2000-01-01",parse),/existing invalid/);assert.throws(()=>repairHealthDate(after,"revisit_on","2000-01-01",parse),/invalid simple/);
 for(const raw of [before.replace('other: "keep"','revisit_on: "not-a-date"'),before.replace('revisit_on:','"revisit_on":'),before.replace('other: "keep"','other: |\r\n  multiline'),before.replace('other: "keep"','  continuation')])assert.throws(()=>repairHealthDate(raw,"revisit_on","2000-01-01",parse),/manual|simple/);
 const managed=frontmatter({type:"question",thread_question_version:"2",recorded_on:"invalid"})+"## Question\nWhy?";assert.throws(()=>repairHealthDate(managed,"recorded_on","2000-01-01",parse),/Unsupported/);
});
test("heading corrections target one explicit projected unfenced line, preserve history/private bytes and constrain semantic choices",()=>{
 const before=questionMarkdown("Human question","a",{sources:[],noteHashes:{},truncated:false},"2000-01-01").replace("## Question","### Legacy question ###").replace("No supporting notes selected.","## Question\nPRIVATE28").replaceAll("\n","\r\n"),metadata=readMetadata(before,parse),headings=healthHeadings(before,metadata),target=headings.find(h=>h.heading==="Legacy question")!;
 const after=repairHealthHeading(before,target.at,"Question",parse);assert.equal(after,before.replace("### Legacy question ###","### Question ###"));assert.ok(after.includes("## Question\r\nPRIVATE28"));assert.throws(()=>repairHealthHeading(before,before.indexOf("## Question\r\nPRIVATE28"),"Question",parse),/private/);assert.throws(()=>repairHealthHeading(before,target.at,"Accepted choice",parse),/recognized/);
 const fenced='---\ntype: "session"\n---\n```md\n## Example\n```\n## Report\nMeasured';assert.deepEqual(healthHeadings(fenced,readMetadata(fenced,parse)).map(h=>h.heading),["Report"]);
});

test("cumulative byte budget refuses further large reads without implying full coverage",async()=>{
 const notes=Object.fromEntries(Array.from({length:10},(_,i)=>[`Knowledge/L${i}.md`,"x".repeat(900000)])),f=await fixture(notes);let physicalReads=0;const maxima:number[]=[];
 const report=await inspectVaultHealth(f.index,settings,{...f.port,read:async(e,max)=>{maxima.push(max);if(notes[e.path]!.length<=max)physicalReads++;return f.port.read(e,max);}});assert.equal(physicalReads,9);assert.equal(report.examined,9);assert.equal(report.skipped,1);assert.equal(report.bytes,8100000);assert.ok(maxima.at(-1)!<900000);
});

test("malformed IDs remain diagnostic and never become a repair opportunity",async()=>{
 const raw=frontmatter({type:"decision",revisit_on:"invalid"}).replace('type: "decision"','id: 42\ntype: "decision"')+'## Choice\nKeep',f=await fixture({"Knowledge/Numeric ID.md":raw}),report=await inspectVaultHealth(f.index,settings,f.port);assert.ok(report.issues.some(i=>i.kind==="format"&&i.message.includes("ID")));assert.throws(()=>repairHealthDate(raw,"revisit_on","2000-01-01",parse),/identities need manual/);assert.equal(f.index.entries[0]?.id,undefined);
});

test("Overview filenames never override explicit record types or force generic/source notes into project templates",async()=>{
 const notes={"Knowledge/Decision/Overview.md":frontmatter({type:"decision"})+"## Choice\nKeep", "Sources/Overview.md":frontmatter({type:"source"})+"## Research\nSource", "Knowledge/Generic/Overview.md":"## Notes\nGeneric note", "Projects/A/Overview.md":frontmatter({type:"project",id:"a"})+"## Goal\nOutcome"},f=await fixture(notes),report=await inspectVaultHealth(f.index,settings,f.port);assert.equal(report.counts.heading,0);
 for(const [path,raw]of Object.entries(notes).filter(([path])=>!path.startsWith('Projects/'))){const heading=healthHeadings(raw,readMetadata(raw,parse))[0]!;assert.throws(()=>repairHealthHeading(raw,heading.at,"Objective",parse),/recognized/);}
});
