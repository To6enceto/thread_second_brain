import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("../../scripts/evaluate.mjs",import.meta.url));
const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
const run=(...args:string[])=>{const r=spawnSync(process.execPath,["--experimental-strip-types",script,...args],{stdio:"ignore",timeout:10000,env:childEnv});assert.ifError(r.error);return r.status;};
const dir=mkdtempSync(join(tmpdir(),"thread-quality-"));try{
 // Inspect the CLI's explicit report file, independently of runner stdout.
 const path=join(dir,"report.json");assert.equal(run("--output",path),0);const report=JSON.parse(readFileSync(path,"utf8"));assert.equal(report.mode,"reference-and-negative-control-self-check");assert.equal(report.passed,10);assert.equal(report.failed,0);assert.equal(report.model,null);
 assert.notEqual(run("--live"),0);
 assert.notEqual(run("--endpoint","http://192.0.2.1"),0);
 assert.notEqual(run("--unknown"),0);
 assert.notEqual(run("--export-vault","/tmp/thread-quality-refused"),0);
 const keep=join(dir,"keep.json");writeFileSync(keep,"Existing report must survive.");assert.notEqual(run("--output",keep),0);assert.equal(readFileSync(keep,"utf8"),"Existing report must survive.");
}finally{rmSync(dir,{recursive:true});}
