import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeProjectExport,exportDestination,type ExportWritePort} from './write.ts';
test('explicit package writer refuses existing and concurrent destinations, rechecks after folders, and preserves errors',async()=>{
 let exists=false,current=true,writes=0,validated=0;const port:ExportWritePort={check:path=>{exportDestination(path,[]);},exists:()=>exists,prepare:async()=>{},validate:async()=>{validated++;},create:async()=>{writes++;},current:()=>current};
 await writeProjectExport('Exports/a.thread-project.json','bytes',port);assert.equal(writes,1);assert.equal(validated,1);
 exists=true;await assert.rejects(writeProjectExport('Exports/a.thread-project.json','bytes',port),/already exists/);assert.equal(writes,1);exists=false;
 await assert.rejects(writeProjectExport('Exports/a.thread-project.json','bytes',{...port,prepare:async()=>{exists=true;}}),/already exists/);exists=false;
 await assert.rejects(writeProjectExport('Exports/a.thread-project.json','bytes',{...port,validate:async()=>{current=false;}}),/changed/);current=true;
 await assert.rejects(writeProjectExport('Exports/a.thread-project.json','bytes',{...port,create:async()=>{throw Error('Injected local write failure');}}),/write failure/);assert.equal(writes,1);
 assert.throws(()=>exportDestination('P/Private/a.thread-project.json',['P/Private']));assert.throws(()=>exportDestination('.obsidian/secret.thread-project.json',[]));assert.throws(()=>exportDestination('Exports/a.zip',[]));
});
