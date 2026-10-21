import type { IndexBudget } from "../settings/index-budget.ts";

export interface SectionCoverage {availableChars:number;retainedChars:number;sections:number;includedSections:number;omittedSections:number;chunks:number;limited:boolean;}
export interface SectionChunk {heading:string;excerpt:string;}
function safeSlice(text:string,start:number,end:number):string{return text.slice(start,end).replace(/^[\uDC00-\uDFFF]/,"").replace(/[\uD800-\uDBFF]$/,"");}
/** Preserve ATX heading syntax without a lazy body/optional-space backtrack. */
export function sectionHeading(line:string):string|undefined {
  const title=/^#{1,6}\s+(.+)$/.exec(line)?.[1];
  if(title===undefined)return undefined;
  let end=title.length;while(title[end-1]==="#")end--;
  return end<title.length&&end>0&&/\s/.test(title[end-1]!)?title.slice(0,end).trimEnd():title;
}
/** Keep section boundaries before choosing bounded passages; a long introduction cannot consume every slot. */
export async function sectionChunks(text:string,budget:IndexBudget,signal?:AbortSignal):Promise<{chunks:SectionChunk[];coverage:SectionCoverage}> {
  signal?.throwIfAborted();
  const header=/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text),body=text.slice(header?.[0].length??(text.startsWith("\uFEFF")?1:0));
  const sections:{heading:string;prefix:string;length:number}[]=[];let heading="",prefix="",length=0,nonempty=false,fence="",availableChars=0,total=0,lines=0;
  const flush=()=>{if(!nonempty)return;total++;if(sections.length<budget.maxSections&&heading.length<=4000)sections.push({heading,prefix:prefix.trim(),length:prefix.length===length?prefix.trim().length:length});};
  for(const match of body.matchAll(/[^\n]*(?:\n|$)/g)){
    if(!match[0])continue;if(++lines%512===0){await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();}
    const line=match[0].replace(/\r?\n$/,""),marker=/^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];if(marker&&(!fence||marker[0]===fence[0]&&marker.length>=fence.length))fence=fence?"":marker;
    const title=!fence?sectionHeading(line):undefined;
    if(title!==undefined){flush();heading=title;prefix="";length=0;nonempty=false;continue;}
    nonempty||=Boolean(line.trim());
    const value=(length?"\n":"")+line;length+=value.length;availableChars+=value.length;
    if(prefix.length<budget.maxNoteChars)prefix+=value.slice(0,budget.maxNoteChars-prefix.length);
  }
  flush();signal?.throwIfAborted();
  const chunks:SectionChunk[]=[],included=new Set<number>(),covered=new Map<number,number>();let retainedChars=0;
  for(let round=0;chunks.length<budget.maxChunks&&retainedChars<budget.maxNoteChars;round++){
    if(round%8===0){await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();}
    let added=false;
    for(const [i,section]of sections.entries()){
      if(chunks.length>=budget.maxChunks||retainedChars>=budget.maxNoteChars)break;
      const start=round*1000;if(start>=section.prefix.length)continue;
      const excerpt=safeSlice(section.prefix,start,Math.min(start+1200,start+budget.maxNoteChars-retainedChars));if(!excerpt.trim())continue;
      chunks.push({heading:section.heading,excerpt});included.add(i);covered.set(i,Math.max(covered.get(i)??0,start+excerpt.length));retainedChars+=excerpt.length;added=true;
    }
    if(!added)break;
  }
  // Overlap consumes the retained-text budget too; completeness uses unique section coverage.
  const complete=sections.length===total&&sections.every((section,i)=>(covered.get(i)??0)>=section.length&&section.prefix.length>=section.length);
  return{chunks,coverage:{availableChars,retainedChars,sections:total,includedSections:included.size,omittedSections:Math.max(0,total-included.size),chunks:chunks.length,limited:!complete}};
}
