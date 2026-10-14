import type { Answer } from "../intelligence/answer.ts";
import { escapeMarkdown,evidenceMarkdown,sourceReferences } from "../intelligence/answer.ts";
import type { EvidenceBundle } from "./evidence.ts";
import { frontmatter,localDay } from "./workspace.ts";

export function synthesisBlock(title:string,answer:Answer,bundle:EvidenceBundle,model:string,project=""):string{
  if(!answer.supported||!answer.answer.length)throw new Error("The supplied sources do not support a knowledge proposal.");
  const record={schemaVersion:1,id:crypto.randomUUID(),generated_on:localDay(),model,project,title,sources:sourceReferences(bundle)};
  const encoded=JSON.stringify(record).replace(/</g,"\\u003c").replace(/>/g,"\\u003e");
  return `\n\n<!-- thread:output ${encoded} -->\n## Reviewed synthesis: ${escapeMarkdown(title)} · ${localDay()}\n\n`
    +answer.answer.map(c=>`- **${c.kind}:** ${escapeMarkdown(c.text)} (${c.sourceIds.join(", ")})`).join("\n")
    +`\n\n### Evidence gaps\n\n${answer.gaps.length?answer.gaps.map(g=>`- ${escapeMarkdown(g)}`).join("\n"):"None recorded."}\n\n### Sources\n\n${evidenceMarkdown(bundle)}\n<!-- /thread:output -->\n`;
}
export function knowledgeMarkdown(title:string,type:"concept"|"comparison",answer:Answer,bundle:EvidenceBundle,model:string,project=""):string{
  return frontmatter({id:crypto.randomUUID(),type,updated:localDay(),generated_on:localDay(),thread_model:model,thread_sources:JSON.stringify(sourceReferences(bundle)),...(project?{project}:{})})
    +`# ${escapeMarkdown(title)}\n`+synthesisBlock(title,answer,bundle,model,project);
}
