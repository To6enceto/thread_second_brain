import type { Claim } from "./briefing.ts";
import type { Evidence, EvidenceBundle } from "../vault/evidence.ts";

export const CLAIM_GUIDANCE = "Use fact only for a complete statement quoted exactly from a known recorded source. When asked what the notes record, quote the relevant complete sentence or line instead of paraphrasing it. A recorded postponement or plan is a statement about the notes, not a new suggestion. Use interpretation for paraphrases, deductions and uncertain explanations; use suggestion only for a new proposed action, not a description of missing evidence. Never infer acceptance from decision wording: preserve each cited decision's noteStatus. A quotation or valid citation does not independently verify truth.";

export function claimLabel(kind: Claim["kind"]): string {
  return { fact: "Recorded statement", interpretation: "AI interpretation", suggestion: "Proposed action" }[kind];
}

function recordedSource(source: Evidence): boolean {
  if (source.noteType === "source" || source.noteType === "decision" || source.noteType === "question") return true;
  if (source.noteType === "session") return source.heading === "User-reported progress";
  const project = source.noteType === "project" || !source.noteType && /(?:^|\/)overview\.md$/i.test(source.path);
  return project && (source.property === "objective" || source.property === "goal"
    || /^(?:(?:project )?(?:objectives?|goals?)|constraints?|open questions?|planned work|decisions?)$/i.test(source.heading.trim()));
}

function normalized(text: string): string {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
}

/** Quote matching establishes a record, not entailment or independently verified truth. */
export function isRecordedStatement(claim: Pick<Claim, "text" | "sourceIds">, bundle: EvidenceBundle): boolean {
  const text = normalized(claim.text);
  if (!text) return false;
  return bundle.sources.some(source => {
    if (!claim.sourceIds.includes(source.id) || !recordedSource(source) || source.excerptComplete !== true) return false;
    const excerpt = source.noteType === "session" ? source.excerpt.split("\n\nThe report above is user input.")[0]! : source.excerpt;
    return excerpt.split(/\n+/u).some(line => {
      const plain = line.replace(/^\s*(?:>\s*|[-*+]\s+)/, "");
      return [plain, ...plain.split(/(?<=[.!?])\s+/u)].some(statement => normalized(statement) === text);
    });
  });
}

export function classifyClaim(claim: Claim, bundle: EvidenceBundle): Claim {
  const recorded = isRecordedStatement(claim, bundle);
  const kind = recorded ? "fact" : claim.kind === "fact" ? "interpretation" : claim.kind;
  return kind === claim.kind ? claim : { ...claim, kind, modelKind: claim.modelKind ?? claim.kind };
}

export function decisionContext(claim: Claim, bundle: EvidenceBundle): string {
  const sources = bundle.sources.filter(source => claim.sourceIds.includes(source.id) && source.noteType === "decision");
  return sources.length ? `Cited decision records: ${sources.map(source => `${source.id}: ${source.noteStatus ?? "status not recorded"}`).join("; ")}. These statuses do not verify the claim.` : "";
}
