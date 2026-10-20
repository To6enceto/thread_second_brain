import assert from 'node:assert/strict';
import {indexNote,hitsToNotes} from '../src/vault/index.ts';
import {SemanticSearch} from '../src/retrieval/semantic.ts';
import {searchEntries} from '../src/retrieval/search.ts';
import {buildEvidence,MAX_CONTEXT} from '../src/vault/evidence.ts';
import {OllamaClient} from '../src/intelligence/ollama.ts';
const args=process.argv.slice(2);if(args.some(arg=>arg!=='--live'))throw Error('Only optional --live is supported; it uses the exact downloaded local qwen3-embedding:0.6b model.');
const live=args.includes('--live'),model=live?'qwen3-embedding:0.6b':'controlled-fixture',signal=new AbortController().signal;
const port=live?new OllamaClient('http://127.0.0.1:11434',180000):{embeddingIdentity:async()=>({model,digest:'a'.repeat(64)}),embed:async(_identity,input)=>input.map(text=>/funding|budget/.test(text)?[1,0]:[0,1])};
const entry=await indexNote({path:'Synthetic/Sections.md',metadata:{type:'source'},modifiedAt:1,text:Array.from({length:140},(_,i)=>`## ${i===139?'Allocation':'Garden '+i}\n${i===139?'The project budget is 20 euros.':'Tomatoes need sunlight and regular watering. Plot '+i+'.'}`).join('\n')},()=>null),query='How much funding can we allocate at most?',cache=new SemanticSearch();
assert.equal(searchEntries([entry],query).hits.length,0,'The lexical negative control must have no match');
const results=[];
for(const level of ['standard','broader','maximum']){
 const start=performance.now(),result=await cache.search([entry],query,{},model,port,signal,()=>true,level);
 assert.equal(result.hybrid?.mode,'hybrid');const found=result.hits.some(hit=>hit.heading==='Allocation'&&hit.excerpt.includes('20 euros'));
 assert.equal(found,level!=='standard','Only wider candidate budgets should reach the last heading');
 const context=await buildEvidence(hitsToNotes(result.hits));assert.ok(JSON.stringify(context.sources).length<=MAX_CONTEXT);
 results.push({level,passed:true,found,contextChars:JSON.stringify(context.sources).length,elapsedMs:Math.round(performance.now()-start),coverage:result.hybrid});
}
console.log(JSON.stringify({mode:live?'real-local-embedding':'controlled-embedding',fixture:'140-authored-headings-with-semantic-only-last-answer',lexicalNegativeControl:true,defaultBudgetNegativeControl:true,passed:results.length,total:3,results},null,2));
