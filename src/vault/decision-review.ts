import type { Answer } from "../intelligence/answer.ts";
import { escapeMarkdown,evidenceMarkdown } from "../intelligence/answer.ts";
import type { EvidenceBundle } from "./evidence.ts";
import { localDay } from "./workspace.ts";

export function decisionComparison(bundle:EvidenceBundle,path:string):EvidenceBundle{
  let priorReview=false;
  const sources=bundle.sources.filter(s=>{
    if(s.path!==path)return true;
    if(/^Evidence review [·-]/.test(s.heading))priorReview=true;
    return !priorReview;
  });
  return {...bundle,sources};
}

export function reviewObservations(answer:Answer,bundle:EvidenceBundle,decisionPath:string):Answer{
  const newIds=new Set(bundle.sources.filter(s=>s.path!==decisionPath).map(s=>s.id));
  const claims=answer.answer.filter(c=>c.sourceIds.some(id=>newIds.has(id))).map(c=>({...c,kind:"interpretation" as const}));
  return {supported:claims.length>0,answer:claims,gaps:[...answer.gaps,...(!claims.length?["No cited observation connects the selected evidence to this decision."]:[])]};
}

export function decisionReviewBlock(action:"retain"|"annotate"|"supersede",note:string,assessment:Answer,bundle:EvidenceBundle,replacement=""):string{
  if(!note.trim()||note.length>5000)throw new Error("Enter your review reasoning (up to 5000 characters).");
  return `\n\n## Evidence review · ${localDay()}\n\nUser action: **${action}**.\n\n${escapeMarkdown(note.trim())}\n`
    +(replacement?`\nReplacement decision: [Open replacement](<${encodeURI(replacement).replace(/#/g,"%23")}>)\n`:"")
    +`\n### Local model observations (interpretations, potentially conflicting evidence)\n\n`
    +(assessment.answer.map(c=>`- ${escapeMarkdown(c.text)} (${c.sourceIds.join(", ")})`).join("\n")||"No supported model observation; the review reasoning above is user input.")
    +`\n\n### Gaps\n\n${assessment.gaps.map(g=>`- ${escapeMarkdown(g)}`).join("\n")||"None recorded."}\n\n### Reviewed evidence\n\n${evidenceMarkdown(bundle)}`;
}

// Preserve every byte except a conventional top-level status scalar. Complex YAML needs manual editing.
export function supersededStatus(text:string,parsedStatus:unknown):string{
  if(parsedStatus!=="accepted"&&parsedStatus!=="proposed")throw new Error("The parsed decision status must be accepted or proposed. Normalize complex YAML manually before supersession.");
  const header=/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if(!header)throw new Error("This legacy decision needs a conventional YAML status property before supersession.");
  const lines=header[1]!.split(/\r?\n/);
  const keys=lines.filter(line=>/^(?:status\s*:|["']status["']\s*:|<<\s*:)/.test(line));
  const line=keys[0]??"";
  const match=/^(status\s*:\s*)(?:accepted|proposed|"accepted"|"proposed"|'accepted'|'proposed')(\s*(?:#.*)?)$/.exec(line);
  if(keys.length!==1||!match||lines.some(l=>/^(?:\{|\s*[^#\s][^:]*:\s*[|>])/.test(l)))throw new Error("Status is missing, superseded or uses complex YAML. Edit it manually before creating a replacement through Thread.");
  const statusLine=lines.indexOf(line);
  for(const following of lines.slice(statusLine+1)){
    if(!following.trim()||/^\s*#/.test(following))continue;
    if(/^\S/.test(following))break;
    throw new Error("Multiline status scalars require manual normalization before supersession.");
  }
  const position=header[0].search(/^status\s*:/m);
  return text.slice(0,position)+match[1]+"superseded"+match[2]+text.slice(position+line.length);
}
