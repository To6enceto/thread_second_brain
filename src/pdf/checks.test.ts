import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PdfChecks} from './checks.ts';
const signal=new AbortController().signal;
test('original checks bound distinct binary reads and bytes, share one operation and do not trust failures',async()=>{
 let calls=0;const checks=new PdfChecks(),read=async()=>{calls++;return{hash:'a'.repeat(64),bytes:new ArrayBuffer(1)};};
 for(let i=0;i<12;i++)await checks.verify('P/'+i+'.pdf',()=>1,read,signal);assert.equal(calls,10);assert.equal(checks.limited,2);assert.equal(await checks.verify('P/0.pdf',()=>1,read,signal),'a'.repeat(64));assert.equal(calls,10);
 const bytes=new PdfChecks(),large=async()=>({hash:'b'.repeat(64),bytes:new ArrayBuffer(16*1048576)});await bytes.verify('a',()=>16*1048576,large,signal);await bytes.verify('b',()=>16*1048576,large,signal);assert.equal(await bytes.verify('c',()=>1,read,signal),null);assert.equal(calls,10);assert.match(bytes.summary,/32 MiB/);
 const failures=new PdfChecks();assert.equal(await failures.verify('bad',()=>1,async()=>{throw Error('unavailable');},signal),null);assert.equal(await failures.verify('bad',()=>1,read,signal),null);
 const controller=new AbortController();controller.abort();await assert.rejects(checks.verify('x',()=>1,read,controller.signal),/abort/i);
});
