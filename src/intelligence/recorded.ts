import { activeQuestion } from "../vault/questions.ts";
import { SECTION_KEYS, type Briefing, type Claim } from "./briefing.ts";
import type { Evidence, EvidenceBundle } from "../vault/evidence.ts";
import { localDay } from "../vault/workspace.ts";

function fact(source: Evidence, prefix = ""): Claim {
  return { text: `${prefix}${source.excerpt.slice(0, 1000)}`, kind: "fact", sourceIds: [source.id] };
}

/** A record is quoted note content, not an independent assertion of its truth. */
export function recordedBriefing(bundle: EvidenceBundle, now = Date.now()): Briefing {
  const sections = Object.fromEntries(SECTION_KEYS.map(key => [key, []])) as unknown as Briefing["sections"];
  const gaps: string[] = [];
  const decisions = new Set<string>();
  for (const source of bundle.sources) {
    const project = source.noteType === "project" || /(?:^|\/)overview\.md$/i.test(source.path);
    if (project && (source.property === "objective" || source.property === "goal"
      || /^(?:project )?(?:objective|goal)s?$/i.test(source.heading.trim()))) {
      if (sections.objective.length < 3) sections.objective.push(fact(source));
    }
    if (activeQuestion(source.noteType,source.noteStatus,source.heading) && sections.openQuestions.length < 6) {
      sections.openQuestions.push(fact(source, "Recorded question: "));
    }
    if (source.noteType === "decision" && !decisions.has(source.path)) {
      decisions.add(source.path);
      const preferred = bundle.sources.find(s => s.path === source.path && /^(?:choice|decision|chosen option)$/i.test(s.heading.trim())) ?? source;
      if (sections.decisions.length < 6) sections.decisions.push(fact(preferred, `${source.noteStatus ?? "status not recorded"}: `));
    }
  }
  const reports = bundle.sources.filter(source => source.noteType === "session" && source.heading === "User-reported progress"
    && source.dateBasis === "recorded_on" && Number.isFinite(Date.parse(source.recordedDate))
    && (source.recordedDate.length === 10 ? source.recordedDate <= localDay(new Date(now)) : Date.parse(source.recordedDate) <= now))
    .sort((a, b) => b.recordedDate.slice(0, 10).localeCompare(a.recordedDate.slice(0, 10))
      || (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0) || a.path.localeCompare(b.path));
  const report = reports[0];
  const reported = report?.excerpt.split("\n\nThe report above is user input.")[0]?.trim();
  if (report && reported && reported !== "Not reported.") {
    sections.lastActivity.push({ text: `User-reported progress: ${reported.slice(0, 1000)}`, kind: "fact", sourceIds: [report.id] });
  }
  const seen = new Set<string>();
  for (const source of bundle.sources) {
    if (!bundle.baseline || !bundle.newEvidenceIds?.includes(source.id) || seen.has(source.path) || sections.newEvidence.length >= 3) continue;
    seen.add(source.path);
    sections.newEvidence.push({ text: `New or changed source: ${source.path}, dated ${source.changedOn} (${source.changeBasis}).`, kind: "fact", sourceIds: [source.id] });
  }
  if (!sections.objective.length) gaps.push("No recognized project Objective/Goal heading or property was included. Other structure is not interpreted as an objective.");
  if (!sections.lastActivity.length) gaps.push("No dated session user-report was included. Plans and file modification times do not establish completed work.");
  if (!sections.decisions.length) gaps.push("No decision record was included; this does not establish that no decisions exist.");
  if (!bundle.baseline) gaps.push("No dated session or review comparison baseline is available.");
  else gaps.push(`New evidence compares source dates with ${bundle.baseline.date.slice(0, 10)}; these are source changes, not event dates.`);
  gaps.push("Recorded context quotes recognized fields in the selected evidence. Legacy structure, omitted passages and unrecorded changes may be missing; a note's statement is not independent verification.");
  if (bundle.truncated) gaps.push("Evidence was shortened. Recorded context does not cover every passage.");
  return { sections, gaps };
}

export function composeBriefing(recorded: Briefing, model: Briefing): { briefing: Briefing; interpretations: Claim[]; modelGaps: string[] } {
  return {
    briefing: { sections: { ...recorded.sections, nextActions: model.sections.nextActions.map(c => ({ ...c, kind: "suggestion" })) }, gaps: recorded.gaps },
    interpretations: SECTION_KEYS.filter(key => key !== "nextActions").flatMap(key => model.sections[key]
      .map(c => ({ ...c, kind: "interpretation" as const }))),
    modelGaps: model.gaps
  };
}
