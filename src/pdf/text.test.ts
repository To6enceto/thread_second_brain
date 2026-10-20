import{test}from'node:test';
import assert from'node:assert/strict';
import{pageText}from'./text.ts';
test('bounded text retention drains queued PDF page chunks without cancel-to-closed-controller races',async()=>{
 let next=0,canceled=false;const chunks=[{items:[{str:'First\u0000line',hasEOL:true}]},{items:[{type:'marked-content'},{str:'overflow '.repeat(100),hasEOL:false}]},{items:[{str:'later queued chunk',hasEOL:true}]}];
 const stream=new ReadableStream<{items:unknown[]}>({pull(controller){if(next===chunks.length){controller.close();return;}controller.enqueue(chunks[next++]!);},cancel(){canceled=true;throw Error('Synthetic queued enqueue-to-closed-controller race');}}),result=await pageText(stream,16);
 assert.equal(next,3);assert.equal(canceled,false);assert.equal(result.shortened,true);assert.equal(result.text,'First�line\noverf');assert.ok(result.text.length<=16);assert.equal(stream.locked,false);
});
test('empty pages, line boundaries and Unicode/control handling preserve bounded exact text',async()=>{
 const stream=(items:unknown[])=>new ReadableStream<{items:unknown[]}>({start(controller){controller.enqueue({items});controller.close();}});
 assert.deepEqual(await pageText(stream([]),8000),{text:'',shortened:false});assert.deepEqual(await pageText(stream([{str:'A',hasEOL:true},{str:'B 🧠'}]),8000),{text:'A\nB 🧠',shortened:false});assert.deepEqual(await pageText(stream([{str:'🧠'}]),1),{text:'',shortened:true});
});
