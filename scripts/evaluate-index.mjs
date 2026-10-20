import assert from 'node:assert/strict';
import {indexNote,hitsToNotes} from '../src/vault/index.ts';
import {indexBudget} from '../src/settings/index-budget.ts';
import {searchEntries} from '../src/retrieval/search.ts';
import {buildEvidence,MAX_CONTEXT} from '../src/vault/evidence.ts';
const raw='## Introduction\n'+'ordinary filler '.repeat(50000)+'\n## Later answer\nThe Amber router timeout is 47 seconds. TAIL_INDEX_EVAL\n';
const start=performance.now(),results=[];
for(const profile of ['conservative','standard','larger']){
 const entry=await indexNote({path:'Synthetic/Long.md',text:raw,metadata:{type:'source'},modifiedAt:1},()=>null,{budget:indexBudget(profile)});
 const hits=searchEntries([entry],'TAIL_INDEX_EVAL').hits,bundle=await buildEvidence(hitsToNotes(hits));
 assert.ok(hits.some(hit=>hit.heading==='Later answer'&&hit.excerpt.includes('47 seconds')));
 assert.ok(bundle.sources.some(source=>source.excerpt.includes('47 seconds')));
 assert.ok(JSON.stringify(bundle.sources).length<=MAX_CONTEXT);
 assert.ok(entry.chunks.reduce((sum,c)=>sum+c.excerpt.length,0)<=indexBudget(profile).maxNoteChars);
 const prefixOnly=await indexNote({path:entry.path,text:raw.slice(0,50000),metadata:{type:'source'},modifiedAt:1},()=>null);
 assert.equal(searchEntries([prefixOnly],'TAIL_INDEX_EVAL').hits.length,0);
 const edited=await indexNote({path:entry.path,text:raw.slice(0,400000)+'changed'+raw.slice(400000),metadata:{type:'source'},modifiedAt:2},()=>null,{budget:indexBudget(profile)});
 assert.notEqual(edited.hash,entry.hash);
 results.push({profile,passed:true,chunks:entry.chunks.length,contextChars:JSON.stringify(bundle.sources).length,coverage:entry.sectionCoverage});
}
console.log(JSON.stringify({fixture:'authored-long-introduction-and-later-heading',negativeControl:'old-prefix-only-cannot-find-tail',passed:results.length,total:3,elapsedMs:Math.round(performance.now()-start),results},null,2));
