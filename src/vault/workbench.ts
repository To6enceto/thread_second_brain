import { MAX_CONTEXT,type EvidenceBundle } from "./evidence.ts";

export type EvidenceChoice="include"|"exclude"|"pin";

/** Choose from an already eligible snapshot; callers must still verify freshness. */
export function selectContext(candidates:EvidenceBundle,choices:Record<string,EvidenceChoice>):EvidenceBundle{
  if(Object.keys(choices).some(id=>!candidates.sources.some(source=>source.id===id)))throw new Error("Evidence choices changed. Retrieve passages again.");
  const ordered=candidates.sources.filter(source=>choices[source.id]!=="exclude");
  ordered.sort((a,b)=>Number(choices[b.id]==="pin")-Number(choices[a.id]==="pin"));
  const sources:EvidenceBundle["sources"]=[];let remaining=MAX_CONTEXT;
  for(const source of ordered){
    const cost=JSON.stringify(source).length+2;
    if(cost>remaining)continue;
    sources.push({...source});remaining-=cost;
  }
  const paths=new Set(sources.map(source=>source.path));
  return {sources,noteHashes:Object.fromEntries(Object.entries(candidates.noteHashes).filter(([path])=>paths.has(path))),
    truncated:candidates.truncated||sources.length<candidates.sources.length,
    coverage:{availableNotes:candidates.coverage?.availableNotes??new Set(candidates.sources.map(source=>source.path)).size,
      availablePassages:candidates.coverage?.availablePassages??candidates.sources.length,includedNotes:paths.size,includedPassages:sources.length},
    ...(candidates.searchCoverage?{searchCoverage:candidates.searchCoverage}:{}),...(candidates.hybridCoverage?{hybridCoverage:candidates.hybridCoverage}:{})};
}
