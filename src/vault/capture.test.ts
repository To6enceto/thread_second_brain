import {test} from "node:test";
import assert from "node:assert/strict";
import {captureMarkdown,ImportRegistry,importFileName,suggestProject} from "./capture.ts";
import {indexNote} from "./index.ts";
test("capture preserves exact original text and opt-in association",async()=>{
 const original='---\nproject: untrusted\n---\n\n# Text\r\nKeep original bytes as text.\n';
 const a=await captureMarkdown(original,"source.md","","https://example.com",true);
 assert(a.content.endsWith(original));assert(!a.content.split('## Original text')[0]!.includes('project:'));
 const b=await captureMarkdown(original,"source.md","chosen-project","",true);assert.equal(a.hash,b.hash);assert.match(b.content,/project: "chosen-project"/);
 assert.notEqual((await captureMarkdown(original+"\n","source.md","","",true)).hash,a.hash);
 assert.throws(()=>importFileName("source.pdf",20));assert.throws(()=>importFileName("big.md",3000000));
 const entry=await indexNote({path:"P/Language/Overview.md",text:"Speaking practice",metadata:{type:"project"},modifiedAt:1},()=>null);assert.equal(suggestProject("speaking practice",[entry])?.path,entry.path);
});
test("identical imports serialize concurrent saves, retain history and permit missing-target reimport",async()=>{
 const r=new ImportRegistry();let release!:()=>void;let writes=0;
 const first=r.run("a".repeat(64),"Sources/a.md",()=>false,()=>new Promise<void>(resolve=>release=resolve),async()=>{writes++;});
 await assert.rejects(r.run("a".repeat(64),"Sources/b.md",()=>false,async()=>{},async()=>{}),/already being imported/);
 release();await first;assert.equal(writes,1);
 await assert.rejects(r.run("a".repeat(64),"Sources/b.md",()=>true,async()=>assert.fail("duplicate creation"),async()=>{}),/already imported/);
 await r.run("a".repeat(64),"Sources/b.md",()=>false,async()=>{},async()=>{});assert.equal(r.records["a".repeat(64)],"Sources/b.md");
 const restored=new ImportRegistry();restored.load({schemaVersion:1,records:r.records});assert.deepEqual(restored.records,r.records);
});
test("registry failures name the saved note and failed creation never records an import",async()=>{
 const r=new ImportRegistry();const hash="b".repeat(64);
 await assert.rejects(r.run(hash,"Sources/x.md",()=>false,async()=>{throw new Error("no disk")},async()=>{}),/no disk/);assert.equal(r.records[hash],undefined);
 await assert.rejects(r.run(hash,"Sources/x.md",()=>false,async()=>{},async()=>{throw new Error("no disk")}),/Saved Sources\/x.md/);
 assert.throws(()=>r.load({schemaVersion:1,records:{[hash]:"../private.md"}}));
});
