import { frontmatter, localDay } from "./workspace.ts";
import { escapeMarkdown, sourceReferences, evidenceMarkdown } from "../intelligence/answer.ts";
import type { EvidenceBundle } from "./evidence.ts";

export interface DecisionInput {
  question:string;choice:string;alternatives:string;rationale:string;constraints:string;revisit:string;
  status:"proposed"|"accepted";date:string;revisitOn?:string;
}
export function decisionMarkdown(input:DecisionInput,project:string,bundle:EvidenceBundle): string {
  if(!project)throw new Error("Select a project first.");
  for(const key of ["question","choice","rationale"] as const)if(!input[key].trim())throw new Error(`Enter the decision ${key}.`);
  if(Object.values(input).some(value=>typeof value==="string"&&value.length>5000))throw new Error("Keep each decision field within 5000 characters.");
  if(!["proposed","accepted"].includes(input.status))throw new Error("Choose proposed or explicitly accepted status.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw new Error("Enter a valid decision date.");
  if(input.revisitOn&&!calendarDate(input.revisitOn))throw new Error("Enter a valid optional revisit date (YYYY-MM-DD).");
  const fields=[['Question',input.question],['Choice',input.choice],['Alternatives',input.alternatives],['Reasoning',input.rationale],['Constraints',input.constraints],['Revisit when',input.revisit]];
  return frontmatter({id:crypto.randomUUID(),type:"decision",project,status:input.status,decided_on:input.date,created:localDay(),...(input.revisitOn?{revisit_on:input.revisitOn}:{}),thread_sources:JSON.stringify(sourceReferences(bundle))})
    +`# Decision\n\nRecorded by the user as **${input.status}**.\n\n`
    +fields.map(([heading,text])=>`## ${heading}\n\n${text?.trim()?escapeMarkdown(text.trim()):"Not recorded."}\n`).join("\n")
    +`\n## Evidence\n\n${bundle.sources.length?evidenceMarkdown(bundle):"No supporting notes selected; this record contains user input.\n"}`;
}

export function calendarDate(value:string):boolean {
  const date=new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
