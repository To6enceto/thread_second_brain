import { object } from "../settings/settings.ts";
import { vaultPath } from "../vault/scope.ts";
import type { SourceNote,EvidenceBundle } from "../vault/evidence.ts";
import type { Answer } from "../intelligence/answer.ts";
import { SECTION_KEYS,type Briefing,type Claim } from "../intelligence/briefing.ts";

export interface Requirement{section:string;terms:string[];sourcePaths:string[];alternatives?:string[];kind?:Claim["kind"];}
export interface QualityCase{id:string;mode:"answer"|"briefing";question:string;notes:SourceNote[];requirements:Requirement[];emptySections:string[];forbidden:string[];supported?:boolean;reference:unknown;knownWrong:unknown;}
export interface QualityResult{id:string;passed:boolean;failures:string[];}
const strings=(value:unknown):string[]=>{if(!Array.isArray(value)||!value.every(v=>typeof v==="string"))throw new Error("Expected a string list in the quality fixture.");return value;};
export function qualityCases(raw:unknown):QualityCase[]{
  const data=object(raw);if(data.schemaVersion!==1||!Array.isArray(data.cases)||!data.cases.length||data.cases.length>100)throw new Error("Invalid quality fixture collection.");
  const ids=new Set<string>();
  return data.cases.map(value=>{
    const c=object(value);if(typeof c.id!=="string"||!/^[a-z][a-z0-9-]{0,79}$/.test(c.id)||ids.has(c.id)||!(c.mode==="answer"||c.mode==="briefing")||typeof c.question!=="string"||!Array.isArray(c.notes)||!Array.isArray(c.requirements))throw new Error("Invalid or duplicate quality case.");ids.add(c.id);
    const mode=c.mode;const sections=mode==="answer"?["answer"]:[...SECTION_KEYS];
    const notes=c.notes.map(value=>{const n=object(value);if(typeof n.path!=="string"||vaultPath(n.path)!==n.path||typeof n.text!=="string"||!Number.isFinite(n.modifiedAt)||typeof n.metadata!=="object"||n.metadata===null||Array.isArray(n.metadata))throw new Error("Invalid synthetic source.");return {path:n.path,text:n.text,metadata:object(n.metadata),modifiedAt:n.modifiedAt as number};});
    if(new Set(notes.map(n=>n.path)).size!==notes.length)throw new Error("Duplicate synthetic source path.");
    const requirements=c.requirements.map(value=>{const r=object(value);if(typeof r.section!=="string"||!sections.includes(r.section)||r.kind!==undefined&&!["fact","interpretation","suggestion"].includes(String(r.kind)))throw new Error("Invalid expected section or kind.");const terms=strings(r.terms),sourcePaths=strings(r.sourcePaths),alternatives=r.alternatives===undefined?undefined:strings(r.alternatives);if(!terms.length||terms.some(t=>!t.trim())||!sourcePaths.length||sourcePaths.some(p=>!notes.some(n=>n.path===p))||alternatives&&(!alternatives.length||alternatives.some(t=>!t.trim())))throw new Error("Expected claim needs terms and known source paths.");return {section:r.section,terms,sourcePaths,...(alternatives?{alternatives}:{}),...(r.kind?{kind:r.kind as Claim["kind"]}:{})};});
    const emptySections=strings(c.emptySections);if(emptySections.some(s=>!sections.includes(s)))throw new Error("Invalid empty section.");
    if(c.supported!==undefined&&typeof c.supported!=="boolean")throw new Error("Invalid expected answer status.");
    if(c.reference===undefined||c.knownWrong===undefined)throw new Error("Missing reference or negative control.");
    return {id:c.id,mode,question:c.question,notes,requirements,emptySections,forbidden:strings(c.forbidden),...(typeof c.supported==="boolean"?{supported:c.supported}:{}),reference:c.reference,knownWrong:c.knownWrong};
  });
}
const normalized=(text:string)=>text.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g," ");
const contains=(text:string,term:string):boolean=>new RegExp(`(?<![\\p{L}\\p{N}])${normalized(term).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?![\\p{L}\\p{N}])`,"u").test(normalized(text));
export function evaluateQuality(c:QualityCase,result:Answer|Briefing,bundle:EvidenceBundle):QualityResult{
  const failures:string[]=[];const sections:Record<string,Claim[]>=c.mode==="answer"?{answer:(result as Answer).answer}:(result as Briefing).sections;
  if(c.supported!==undefined&&(result as Answer).supported!==c.supported)failures.push("Answer support status differs from the curated expectation.");
  const paths=new Map(bundle.sources.map(s=>[s.id,s.path]));
  for(const r of c.requirements){
    const found=(sections[r.section]??[]).some(claim=>r.terms.every(t=>contains(claim.text,t))&&(!r.alternatives||r.alternatives.some(t=>contains(claim.text,t)))&&(!r.kind||claim.kind===r.kind)&&r.sourcePaths.every(path=>claim.sourceIds.some(id=>paths.get(id)===path)));
    if(!found)failures.push(`Missing expected ${r.section} claim: ${r.terms.join(" / ")} with its expected sources.`);
  }
  for(const section of c.emptySections)if(sections[section]?.length)failures.push(`Unexpected claims in ${section}.`);
  for(const term of c.forbidden)if(Object.values(sections).flat().some(claim=>contains(claim.text,term)))failures.push(`Forbidden claim text: ${term}.`);
  return {id:c.id,passed:failures.length===0,failures};
}
