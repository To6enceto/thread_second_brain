import { frontmatter,localDay } from "./workspace.ts";
import { calendarDate } from "./decision.ts";
import { escapeMarkdown,evidenceMarkdown,sourceReferences } from "../intelligence/answer.ts";
import type { EvidenceBundle } from "./evidence.ts";
import { outputProjection } from "./freshness.ts";

export type QuestionStatus="open"|"investigating"|"answered";
export interface QuestionUpdate{status:QuestionStatus;answer:string;reason:string;day:string;}
export function activeQuestion(type:unknown,status:unknown,heading:string):boolean{
  return type==="question"?["open","investigating"].includes(String(status))&&/^question$/i.test(heading.trim()):/^(?:open|unresolved) questions?$/i.test(heading.trim());
}
export function questionRecord(metadata:Record<string,unknown>):{id:string;project:string;status:QuestionStatus}{
  if(metadata.type!=="question"||metadata.thread_question_version!=="1"||typeof metadata.id!=="string"||!metadata.id.trim()||metadata.id.length>200||typeof metadata.project!=="string"||!metadata.project.trim()||metadata.project.length>4096||!["open","investigating","answered"].includes(String(metadata.status)))throw new Error("This question has unsupported or invalid metadata. Preserve it and normalize it manually; Thread will not convert it in place.");
  return{id:metadata.id,project:metadata.project,status:metadata.status as QuestionStatus};
}
export function questionMarkdown(question:string,project:string,bundle:EvidenceBundle,day=localDay()):string{
  if(!project||!question.trim()||question.length>1000||!calendarDate(day))throw new Error("Choose a project, enter a question of up to 1000 characters and a valid date.");
  return frontmatter({id:crypto.randomUUID(),type:"question",thread_question_version:"1",project,status:"open",recorded_on:day,created:localDay(),updated:localDay(),thread_sources:JSON.stringify(sourceReferences(bundle))})
    +`# Project question\n\n## Question\n\n${escapeMarkdown(question.trim())}\n\n## Evidence and related decisions\n\n<!-- thread:question-evidence -->\n${bundle.sources.length?evidenceMarkdown(bundle):"No supporting notes selected.\n"}\n<!-- /thread:question-evidence -->\n\nInitially recorded as an open user question. Later states, answers and reasons appear below. No decision acceptance is implied.\n`;
}
function scalar(text:string,key:string,expected:string,value:string):string{
  const header=/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if(!header)throw new Error("Normalize this question's frontmatter manually before updating.");
  const lines=header[1]!.split(/\r?\n/),keys=lines.filter(line=>new RegExp(`^(?:${key}\\s*:|["']${key}["']\\s*:|<<\\s*:)`).test(line));
  const line=keys[0]??"",match=/^(\w+\s*:\s*)([^#]*?)(\s*(?:#.*)?)$/.exec(line);
  if(keys.length!==1||!match||![expected,JSON.stringify(expected),`'${expected}'`].includes(match[2]!)||lines.some(l=>/^(?:\{|\s*[^#\s][^:]*:\s*[|>])/.test(l)))throw new Error("Ambiguous or complex question properties need manual normalization before updating.");
  for(const following of lines.slice(lines.indexOf(line)+1)){
    if(!following.trim()||/^\s*#/.test(following))continue;if(/^\S/.test(following))break;
    throw new Error("Multiline question properties need manual normalization before updating.");
  }
  const position=header[0].search(new RegExp(`^${key}\\s*:`,'m'));
  return text.slice(0,position)+match[1]+JSON.stringify(value)+match[3]+text.slice(position+line.length);
}
export function updateQuestion(before:string,metadata:Record<string,unknown>,input:QuestionUpdate,bundle:EvidenceBundle):string{
  const record=questionRecord(metadata);
  if(outputProjection(before,metadata).output?.invalid)throw new Error("Question evidence blocks need manual normalization before updating. Preserve the original history.");
  if(!["open","investigating","answered"].includes(input.status)||!calendarDate(input.day)||typeof metadata.updated!=="string"||!calendarDate(metadata.updated))throw new Error("Choose a valid question state/date and normalize its updated date if needed.");
  if(!input.reason.trim()||input.reason.length>5000||input.answer.length>5000)throw new Error("Enter your update reason; keep answer and reason within 5000 characters.");
  if(input.status==="answered"&&!input.answer.trim())throw new Error("Enter your answer explicitly before marking this question answered.");
  const after=scalar(scalar(before,"status",record.status,input.status),"updated",metadata.updated,localDay());
  return after+`\n\n## Question event (${input.day} - ${input.status})\n\nUser action: **${record.status} to ${input.status}**. Recorded locally on ${localDay()}.\n\n### Reason\n\n${escapeMarkdown(input.reason.trim())}\n`
    +(input.answer.trim()?`\n### ${input.status==="answered"?"Recorded answer":"Working response (unresolved)"}\n\n${escapeMarkdown(input.answer.trim())}\n`:"")
    +`\n### Evidence and related decisions\n\n<!-- thread:question-evidence -->\n${bundle.sources.length?evidenceMarkdown(bundle):"No additional supporting notes selected.\n"}\n`
    +(bundle.sources.length?`Source snapshots for this event (JSON):\n\n\`\`\`json\n${JSON.stringify({schemaVersion:1,sources:sourceReferences(bundle)}).replace(/[<>`]/g,c=>"\\u"+c.charCodeAt(0).toString(16).padStart(4,"0"))}\n\`\`\`\n`:"")
    +"<!-- /thread:question-evidence -->\n";
}
