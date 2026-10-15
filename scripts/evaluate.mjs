import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {qualityCases,evaluateQuality} from '../src/evaluation/quality.ts';
import {buildEvidence} from '../src/vault/evidence.ts';
import {validateAnswer,answerPrompt,ANSWER_SCHEMA} from '../src/intelligence/answer.ts';
import {validateBriefing,briefingPrompt,SECTION_KEYS} from '../src/intelligence/briefing.ts';
import {recordedBriefing,composeBriefing} from '../src/intelligence/recorded.ts';
import {OllamaClient} from '../src/intelligence/ollama.ts';
import {frontmatter} from '../src/vault/workspace.ts';
const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);if(i<0)return undefined;const v=args[i+1];if(!v||v.startsWith('--'))throw new Error(`Missing value for ${flag}`);return v;};
const allowed=new Set(['--live','--strict','--endpoint','--model','--output','--export-vault']);
for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw new Error(`Unknown evaluation argument: ${args[i]}`);if(!['--live','--strict'].includes(args[i]))i++;}
const cases=qualityCases(JSON.parse(readFileSync(new URL('../evaluation/fixtures.json',import.meta.url),'utf8')));
const now=Date.parse('2026-10-15T12:00:00Z');
const exportPath=value('--export-vault');
if(exportPath){
 const project=resolve(fileURLToPath(new URL('..',import.meta.url))),local=join(project,'.thread-local'),target=resolve(exportPath);
 if(dirname(target)!==local||lstatSync(local).isSymbolicLink()||!lstatSync(local).isDirectory())throw new Error('Export only to a new direct child of the ordinary project .thread-local directory.');
 mkdirSync(target);const exported=[];
 for(const c of cases){
  const folder='Projects/Quality/'+c.id;mkdirSync(join(target,folder),{recursive:true});const map=new Map(c.notes.map(n=>[n.path,folder+'/'+basename(n.path)]));
  for(const n of c.notes)writeFileSync(join(target,map.get(n.path)),frontmatter(n.metadata)+n.text,{flag:'wx'});
  exported.push({...c,notes:c.notes.map(n=>({...n,path:map.get(n.path)})),requirements:c.requirements.map(r=>({...r,sourcePaths:r.sourcePaths.map(p=>map.get(p))})),folder});
 }
 mkdirSync(join(target,'Unshared'));writeFileSync(join(target,'Unshared','Excluded canary.md'),'THREAD_QUALITY_PRIVATE_CANARY: never include this ungranted note.\n',{flag:'wx'});
 writeFileSync(join(target,'.thread-quality-fixture.json'),JSON.stringify({schemaVersion:1,fixture:'thread-quality-v1',cases:exported},null,2),{flag:'wx'});
 console.log(JSON.stringify({exportedSyntheticVault:target,cases:cases.length}));
}else{
 const live=args.includes('--live');if(!live&&(value('--endpoint')||value('--model')))throw new Error('Use --live explicitly to request local inference.');
 const model=value('--model');if(live&&!model)throw new Error('Live evaluation requires the exact downloaded --model name.');
 const controller=new AbortController();process.once('SIGINT',()=>controller.abort());
 const client=live?new OllamaClient(value('--endpoint')??'http://127.0.0.1:11434',180000):null;
 const results=[];
 for(const c of cases){
  const bundle=await buildEvidence(c.notes,now);const start=performance.now();let result;
  try{
   let raw=JSON.stringify(c.reference);
   if(live){
    raw=c.mode==='answer'&&!bundle.sources.length?JSON.stringify({supported:false,answer:[],gaps:['No matching eligible passages.']}):await client.generate(model,c.mode==='answer'?answerPrompt(c.question,bundle):briefingPrompt('Synthetic quality project',bundle),controller.signal,c.mode==='answer'?ANSWER_SCHEMA:undefined);
   }
   const modelOutput=c.mode==='answer'?validateAnswer(raw,bundle):validateBriefing(raw,bundle);
   const output=live&&c.mode==='briefing'?composeBriefing(recordedBriefing(bundle,now),modelOutput).briefing:modelOutput;
   result={...evaluateQuality(c,output,bundle),output,...(live&&c.mode==='briefing'?{pipeline:'recorded-first-resume',modelOutput}: {})};
   if(!live){
    const wrong=c.mode==='answer'?c.knownWrong:{sections:Object.fromEntries(SECTION_KEYS.map(k=>[k,c.knownWrong[k]])),gaps:[]};
    if(evaluateQuality(c,wrong,bundle).passed)throw new Error('Evaluator failed to detect the curated negative control.');
   }
  }catch(e){result={id:c.id,passed:false,error:true,failures:[e instanceof Error?e.message:'Evaluation failed.']};}
  results.push({...result,durationMs:Math.round(performance.now()-start)});
  if(controller.signal.aborted)break;
 }
 const failures=results.filter(r=>!r.passed).length,errors=results.filter(r=>r.error).length;
 const report={schemaVersion:1,mode:live?'live-local-model':'reference-and-negative-control-self-check',model:live?model:null,collected:results.length,total:cases.length,passed:results.length-failures,failed:failures,errors,scope:'Committed authored synthetic fixtures only; curated checks are not a general semantic guarantee.',results};
 const output=value('--output');if(output)writeFileSync(resolve(output),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(report,null,2));
 if(errors||controller.signal.aborted||results.length!==cases.length||(!live||args.includes('--strict'))&&failures)process.exitCode=1;
}
