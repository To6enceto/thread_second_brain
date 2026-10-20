import type { Answer } from "../intelligence/answer.ts";
import { escapeMarkdown, sourceReferences } from "../intelligence/answer.ts";
import type { Claim } from "../intelligence/briefing.ts";
import { claimLabel } from "../intelligence/claims.ts";
import type { EvidenceBundle } from "./evidence.ts";
import type { SourceRange, SourceReference } from "./freshness.ts";
import { frontmatter, localDay } from "./workspace.ts";

export interface ClaimCorrection { text: string; kind: Claim["kind"]; correctedAt: string; }
export interface ReviewedClaim {
  original: Pick<Claim, "text" | "kind" | "sourceIds">;
  classifiedKind: Claim["kind"];
  correction?: ClaimCorrection;
}
export interface AnswerRecord {
  schemaVersion: 1;
  question: string;
  generatedAt: string;
  model: string;
  sourceIds: string[];
  claims: ReviewedClaim[];
  gaps: string[];
}
export type ClaimCorrections = Record<number, ClaimCorrection>;
const startMarker = "<!-- thread:answer-record -->";
const endMarker = "<!-- /thread:answer-record -->";
const kind = (value: unknown): value is Claim["kind"] => typeof value === "string" && ["fact", "interpretation", "suggestion"].includes(value);
const text = (value: unknown, limit: number): value is string => typeof value === "string" && !!value.trim() && value.length <= limit;
const iso = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function fields(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid answer record object.");
  const result = value as Record<string, unknown>;
  if (required.some(key => !Object.hasOwn(result, key)) || Object.keys(result).some(key => !required.includes(key) && !optional.includes(key))) throw new Error("Unsupported answer record fields.");
  return result;
}

export function validateCorrection(value: unknown): ClaimCorrection {
  const correction = fields(value, ["text", "kind", "correctedAt"]);
  if (!text(correction.text, 1200) || !kind(correction.kind) || !iso(correction.correctedAt)) throw new Error("Use a nonempty correction of up to 1200 characters and a known classification.");
  return { text: correction.text, kind: correction.kind, correctedAt: correction.correctedAt };
}

export function validateAnswerRecord(value: unknown, refs: readonly SourceReference[]): AnswerRecord {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 65536) throw new Error("Answer record exceeds 64 KiB.");
  const record = fields(value, ["schemaVersion", "question", "generatedAt", "model", "sourceIds", "claims", "gaps"]);
  if (record.schemaVersion !== 1 || !text(record.question, 1000) || !iso(record.generatedAt) || !text(record.model, 500)) throw new Error("Unsupported answer record version or generation details.");
  if (!Array.isArray(record.sourceIds) || !record.sourceIds.length || record.sourceIds.length > 100 || record.sourceIds.length !== refs.length
    || !record.sourceIds.every(id => typeof id === "string" && /^S[1-9]\d{0,2}$/.test(id)) || new Set(record.sourceIds).size !== record.sourceIds.length) throw new Error("Invalid answer source mapping.");
  const sourceIds = record.sourceIds as string[];
  if (!Array.isArray(record.claims) || !record.claims.length || record.claims.length > 6) throw new Error("Save one to six supported claims.");
  const claims = record.claims.map(value => {
    const claim = fields(value, ["original", "classifiedKind"], ["correction"]);
    const original = fields(claim.original, ["text", "kind", "sourceIds"]);
    if (!text(original.text, 1200) || !kind(original.kind) || !kind(claim.classifiedKind) || !Array.isArray(original.sourceIds)
      || !original.sourceIds.length || !original.sourceIds.every(id => typeof id === "string" && sourceIds.includes(id))
      || new Set(original.sourceIds).size !== original.sourceIds.length) throw new Error("Invalid original claim or citations.");
    const correction = claim.correction === undefined ? undefined : validateCorrection(claim.correction);
    return { original: { text: original.text, kind: original.kind, sourceIds: [...original.sourceIds] as string[] }, classifiedKind: claim.classifiedKind, ...(correction ? { correction } : {}) };
  });
  if (!Array.isArray(record.gaps) || record.gaps.length > 12 || !record.gaps.every(gap => typeof gap === "string" && gap.length <= 1200)) throw new Error("Invalid answer gaps.");
  return { schemaVersion: 1, question: record.question, generatedAt: record.generatedAt, model: record.model, sourceIds: [...sourceIds], claims, gaps: [...record.gaps] as string[] };
}

export function createAnswerRecord(question: string, answer: Answer, bundle: EvidenceBundle, model: string, generatedAt: string, corrections: ClaimCorrections): AnswerRecord {
  if (!answer.supported || Object.keys(corrections).some(key => !/^(?:0|[1-5])$/.test(key) || Number(key) >= answer.answer.length)) throw new Error("Only current supported answer claims can be corrected.");
  return validateAnswerRecord({
    schemaVersion: 1, question, generatedAt, model, sourceIds: bundle.sources.map(source => source.id),
    claims: answer.answer.map((claim, index) => ({
      original: { text: claim.text, kind: claim.modelKind ?? claim.kind, sourceIds: [...claim.sourceIds] },
      classifiedKind: claim.kind, ...(corrections[index] ? { correction: corrections[index] } : {})
    })), gaps: [...answer.gaps]
  }, sourceReferences(bundle));
}

export function currentClaim(claim: ReviewedClaim): Claim {
  return { text: claim.correction?.text ?? claim.original.text, kind: claim.correction?.kind ?? claim.classifiedKind, sourceIds: [...claim.original.sourceIds] };
}

function recordParts(record: AnswerRecord, refs: readonly SourceReference[]): { current: string; body: string } {
  const escape = escapeMarkdown;
  const current = `# ${escape(record.question)}\n\nGenerated locally at ${record.generatedAt} using ${escape(record.model)}.\n\n`
    + "## Reviewed answer\n\nRecorded statements and user classifications are not independently verified facts. Compare each claim with its sources.\n\n"
    + record.claims.map(claim => {
      const value = currentClaim(claim);
      const decisions = value.sourceIds.flatMap(id => {
        const ref = refs[record.sourceIds.indexOf(id)]!;
        return ref.noteType === "decision" ? [`${id}: ${ref.noteStatus ?? "status not recorded"}`] : [];
      });
      return `- **${claim.correction ? "User correction - " : ""}${claimLabel(value.kind)} (${value.kind}):** ${escape(value.text)} (${value.sourceIds.join(", ")})`
        + (claim.correction ? `\n  Corrected by you at ${claim.correction.correctedAt}. Classification does not verify truth.` : "")
        + (decisions.length ? `\n  Cited decision records: ${escape(decisions.join("; "))}. These statuses do not verify the claim.` : "");
    }).join("\n")
    + `\n\n## Evidence gaps\n\n${record.gaps.length ? record.gaps.map(gap => `- ${escape(gap)}`).join("\n") : "None recorded."}\n\n`;
  const history = "## Original model output and correction history\n\n"
    + record.claims.map((claim, i) => `### Claim ${i + 1}\n\nOriginal model (${claim.original.kind}): ${escape(claim.original.text)} (${claim.original.sourceIds.join(", ")})\n\n`
      + `Initial display classification: ${claim.classifiedKind}.\n\n`
      + (claim.correction ? `Your correction (${claim.correction.kind}) at ${claim.correction.correctedAt}: ${escape(claim.correction.text)}.\n` : "No user correction.\n")).join("\n")
    + "\n## Evidence and provenance\n\nReferences identify supporting passages, not verified truth. Source snapshots remain in thread_sources.\n\n"
    + refs.map((ref, index) => `- ${record.sourceIds[index]}: [${escape(ref.path)}${ref.heading ? ` > ${escape(ref.heading)}` : ""}](<${encodeURI(ref.path).replace(/#/g, "%23")}${ref.heading ? `#${encodeURIComponent(ref.heading)}` : ""}>)`
      + (ref.pdf ? ` - PDF [${escape(ref.pdf.path)}, page ${ref.pdf.page}](<${encodeURI(ref.pdf.path).replace(/#/g, "%23")}#page=${ref.pdf.page}>), original hash ${ref.pdf.hash}` : "")).join("\n") + "\n";
  return { current, body: `${startMarker}\n${current}${history}${endMarker}\n` };
}

export function reviewedAnswerMarkdown(record: AnswerRecord, bundle: EvidenceBundle, project = ""): string {
  const refs = sourceReferences(bundle);
  const validated = validateAnswerRecord(record, refs);
  if (validated.sourceIds.some((id, i) => id !== bundle.sources[i]?.id)) throw new Error("Answer evidence mapping changed. Generate a new preview.");
  const result = frontmatter({ id: crypto.randomUUID(), type: "answer", generated_on: localDay(), thread_model: record.model,
    ...(project ? { project } : {}), thread_answer_version: "1", thread_answer_record: JSON.stringify(validated), thread_sources: JSON.stringify(refs) })
    + recordParts(validated, refs).body;
  if (result.length > 1048576) throw new Error("Managed answer exceeds the note size limit.");
  return result;
}

export function hasAnswerRecord(text: string, metadata: Record<string, unknown>): boolean {
  return metadata.thread_answer_version !== undefined || metadata.thread_answer_record !== undefined
    || /^[\t ]*(?:thread_answer_(?:version|record)|["']thread_answer_(?:version|record)["'])\s*:/im.test(text)
    || /<!--\s*(?:\/\s*)?thread\s*:\s*answer-record/i.test(text);
}

export function answerRecordProjection(raw: string, metadata: Record<string, unknown>, refs: readonly SourceReference[]): { text: string; ranges: SourceRange[] } {
  if (raw.length > 1048576 || metadata.type !== "answer" || metadata.thread_answer_version !== "1" || typeof metadata.thread_answer_record !== "string"
    || new TextEncoder().encode(metadata.thread_answer_record).length > 65536) throw new Error("Unsupported managed answer record.");
  if (["thread_question_version", "thread_review_version", "thread_review_key", "thread_review_snapshot"].some(key => metadata[key] !== undefined)) throw new Error("Conflicting managed answer format.");
  const record = validateAnswerRecord(JSON.parse(metadata.thread_answer_record), refs);
  if (metadata.thread_model !== record.model) throw new Error("Answer model provenance changed.");
  const header = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0];
  if (!header) throw new Error("Missing answer frontmatter.");
  const parts = recordParts(record, refs), body = raw.slice(header.length);
  const eol = body === "\n" + parts.body ? "\n" : body === ("\n" + parts.body).replace(/\n/g, "\r\n") ? "\r\n" : null;
  if (!eol) throw new Error("Managed answer contents changed. Create a new reviewed answer.");
  const from = header.length + eol.length + startMarker.length + eol.length;
  return { text: parts.current, ranges: [{ from, to: from + parts.current.replace(/\n/g, eol).length }] };
}
