import assert from "node:assert/strict";
import { FreshnessGraph,outputProjection,loadRenames,type FreshNote } from "./freshness.ts";
const h="a".repeat(64),b="b".repeat(64),c="c".repeat(64);const scope={allowedPaths:["P"],excludedPaths:[]};
const ref={path:"P/Source.md",id:"source",heading:"Facts",excerpt:"PRIVATE_OLD_COPY",hash:h,noteHash:h};
const source:FreshNote={path:ref.path,id:"source",hash:h,metadata:{type:"source"}};
const output:FreshNote={path:"P/Output.md",id:"output",hash:b,metadata:{type:"answer"},output:outputProjection("Body",{type:"answer",thread_sources:JSON.stringify([ref])}).output!};
assert.equal(new FreshnessGraph([source,output],scope).assess(output.path).usable,true);
assert.equal(new FreshnessGraph([{...source,path:"P/Renamed.md"},output],scope).assess(output.path).state,"renamed");
assert.equal(new FreshnessGraph([{...source,hash:c},output],scope).assess(output.path).state,"changed");
assert.equal(new FreshnessGraph([output],scope).assess(output.path).state,"unavailable");
assert.equal(new FreshnessGraph([source,output],{...scope,excludedPaths:[source.path]}).assess(output.path).usable,false);
assert.equal(new FreshnessGraph([source,{...source,path:"P/Duplicate.md"},output],scope).assess(output.path).state,"ambiguous");
const second:FreshNote={path:"P/Second.md",hash:c,metadata:{},output:{refs:[{...ref,path:output.path,id:"output",noteHash:b}],invalid:false,title:""}};
assert.equal(new FreshnessGraph([source,output,second],{...scope,excludedPaths:[source.path]}).assess(second.path).state,"dependency");
const old={...ref,id:undefined};const legacy={...output,output:{refs:[old],invalid:false,title:""}};
assert.equal(new FreshnessGraph([{...source,id:undefined,path:"P/Moved.md"},legacy],scope,{"P/Source.md":"P/Moved.md"}).assess(output.path).state,"renamed");
assert.equal(new FreshnessGraph([{...source,path:"P/Moved.md"},legacy],scope,{"P/Source.md":"P/Moved.md","P/Moved.md":"P/Source.md"}).assess(output.path).usable,false);
const block=(title:string,body:string)=>`<!-- thread:output ${JSON.stringify({schemaVersion:1,title,sources:[ref]})} -->\n${body}\n<!-- /thread:output -->`;
const projected=outputProjection("Human prefix\n"+block("old","PRIVATE_OLD_COPY")+"\n"+block("latest","CURRENT_SYNTHESIS"),{});
assert.ok(projected.text.includes("Human prefix")&&projected.text.includes("CURRENT_SYNTHESIS")&&!projected.text.includes("PRIVATE_OLD_COPY"));assert.ok(!JSON.stringify(projected.output).includes("PRIVATE_OLD_COPY"));
assert.equal(outputProjection("Old generated body\n"+block("latest","CURRENT_SYNTHESIS"),{type:"answer",thread_sources:JSON.stringify([ref])}).text,"CURRENT_SYNTHESIS");
for(const text of ["<!-- thread:output {broken} -->\nbody",block("latest","body").replace('"schemaVersion":1','"schemaVersion":99')])assert.equal(outputProjection(text,{}).output?.invalid,true);
assert.equal(outputProjection("Body",{type:"answer",thread_sources:"not-json"}).output?.invalid,true);
const decision=outputProjection("# Choice\nKeep human reasoning.\n## Evidence review · today\nUser action: retain.\n### Local model observations (interpretations)\nPRIVATE_OLD_COPY\n### Gaps\nAI gap\n## Human addition\nPreserved human addition.",{type:"decision"});assert.ok(decision.text.includes("Preserved human addition")&&!decision.text.includes("PRIVATE_OLD_COPY"));
assert.deepEqual(loadRenames({schemaVersion:1,paths:{"P/Old.md":"P/New.md"}}),{"P/Old.md":"P/New.md"});assert.throws(()=>loadRenames({schemaVersion:1,paths:{"../secret":"P/New.md"}}));

assert.equal(new FreshnessGraph([{...source,hash:c},output],scope).scopeAllows(output.path,b),false);
assert.equal(new FreshnessGraph([source,output,second],{...scope,excludedPaths:[source.path]}).scopeAllows(second.path,c),false);
assert.equal(new FreshnessGraph([source,output],{...scope,excludedPaths:[source.path]}).scopeAllows(output.path,b),false);
assert.equal(outputProjection("Unknown generated body",{type:"answer",thread_model:"local"}).output?.invalid,true);

// Historical cached prose cannot borrow a newer output's public provenance.
const publicSource={...source,path:"P/Public.md",id:"public"};
const publicOutput={...output,hash:c,output:{refs:[{...ref,path:publicSource.path,id:"public"}],invalid:false,title:""}};
const replaced=new FreshnessGraph([publicSource,publicOutput],{...scope,excludedPaths:[source.path]});
assert.equal(replaced.scopeAllows(output.path,b),false);
assert.equal(replaced.scopeAllows(output.path,c),true);
assert.equal(replaced.scopeAllows(output.path,"invalid"),false);
// Validated original snapshots preserve undo context after a batch changes its source.
assert.equal(new FreshnessGraph([source,output],scope).scopeAllows(output.path,b),true);
assert.equal(new FreshnessGraph([source,{...publicOutput,output:undefined}],scope).scopeAllows(output.path,b),false);

// Multiple cited passages must not multiply work at every generated level.
const fanout:FreshNote[]=[source];
for(let i=0;i<9;i++){
 const parent=fanout.at(-1)!;
 fanout.push({path:`P/Fanout ${i}.md`,hash:b,metadata:{},output:{invalid:false,title:"",refs:Array.from({length:8},(_,n)=>({...ref,path:parent.path,id:parent.id,heading:`Passage ${n}`,noteHash:parent.hash}))}});
}
const bounded=new FreshnessGraph(fanout,scope);const originalScopeAllows=bounded.scopeAllows.bind(bounded);let visits=0;
bounded.scopeAllows=(...args)=>{visits++;return originalScopeAllows(...args);};
assert.equal(bounded.scopeAllows(fanout.at(-1)!.path,b),true);
assert.ok(visits<100,`Repeated provenance expanded to ${visits} visits.`);
const cyclic={...output,output:{invalid:false,title:"",refs:[{...ref,path:output.path,id:"output",noteHash:b}]}};
assert.equal(new FreshnessGraph([cyclic],scope).scopeAllows(output.path,b),false);

// Recognized generated prefixes have unknown historical provenance even when
// their thread_sources field is missing. A public latest block cannot grant it.
for(const metadata of [{type:"answer",thread_model:"local"},{type:"concept",generated_on:"2026-10-15"},{type:"review",thread_sources:"invalid"}]){
 const projected=outputProjection('PRIVATE_UNVALIDATED_PREFIX\n'+block('latest','PUBLIC_CURRENT'),metadata);
 assert.equal(projected.text,'PUBLIC_CURRENT');assert.equal(projected.output?.invalid,false);
}

// Warming assessment from leaf to root must not bypass the depth contract.
const deep:FreshNote[]=[source];for(let i=0;i<35;i++){
 const parent=deep.at(-1)!;
 deep.push({path:`P/Deep ${i}.md`,hash:b,metadata:{},output:{invalid:false,title:"",refs:[{...ref,path:parent.path,id:parent.id,noteHash:parent.hash}]}});
}
const cold=new FreshnessGraph(deep,scope),warm=new FreshnessGraph(deep,scope);
assert.equal(cold.assess(deep.at(-1)!.path).usable,false);
for(const note of deep)warm.assess(note.path);
assert.equal(warm.assess(deep.at(-1)!.path).usable,false);
assert.equal(warm.assess(deep[10]!.path).usable,true);
