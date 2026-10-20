import { contentHash } from "./scope.ts";
import type { HybridCoverage } from "../retrieval/semantic.ts";
import type { SearchCoverage } from "../retrieval/search.ts";
import { tokenSpans } from "../retrieval/tokens.ts";
import type { PdfRecord } from "../pdf/record.ts";
import type { PdfCitation } from "./freshness.ts";

export interface SourceNote {
  /** Selected/indexed text whose original statement boundaries are not known. */
  partial?: boolean;
  pdf?:PdfRecord;
  path: string;
  text: string;
  metadata: Record<string, unknown>;
  modifiedAt: number;
  fullHash?: string;
  relevance?: number;
  focusTerms?: string[];
  focusPhrases?: string[];
}

export interface Evidence {
  /** True only when excerpt selection preserved an entire original section. */
  excerptComplete?: boolean;
  pdf?:PdfCitation;
  id: string;
  path: string;
  noteId?: string;
  noteType?: string;
  noteStatus?: string;
  heading: string;
  property?: "objective" | "goal";
  excerpt: string;
  contentHash: string;
  recordedDate: string;
  modifiedAt?: number;
  dateBasis: string;
  changedOn?: string;
  changeBasis?: string;
}

export interface EvidenceBundle {
  sources: Evidence[];
  truncated: boolean;
  noteHashes: Record<string, string>;
  baseline?: { path: string; date: string };
  newEvidenceIds?: string[];
  coverage?: { availableNotes: number; includedNotes: number; availablePassages: number; includedPassages: number };
  searchCoverage?: SearchCoverage;
  hybridCoverage?: HybridCoverage;
}

export const MAX_CONTEXT = 16000;
const MAX_NOTE = 50000;

export function readMetadata(text: string, parse: (yaml: string) => unknown): Record<string, unknown> {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text.replace(/^\uFEFF/, ""))?.[1];
  if (!header) return {};
  try {
    const value = parse(header);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      item instanceof Date && Number.isFinite(item.getTime()) ? item.toISOString() : item]));
  } catch { return {}; }
}

function localDay(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function noteSections(text: string): { heading: string; excerpt: string }[] {
  const body = text.replace(/^\uFEFF/, "").replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  const sections: { heading: string; excerpt: string }[] = [];
  let heading = "";
  let lines: string[] = [];
  let fence = "";
  const flush = () => {
    const excerpt = lines.join("\n").trim();
    if (excerpt) sections.push({ heading, excerpt });
    lines = [];
  };
  for (const line of body.slice(0, MAX_NOTE).split(/\r?\n/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker && (!fence || marker[0] === fence[0] && marker.length >= fence.length)) {
      fence = fence ? "" : marker;
    }
    const match = !fence && /^#{1,6}\s+(.+?)(?:\s+#+)?$/.exec(line);
    if (match) { flush(); heading = match[1] ?? ""; } else lines.push(line);
  }
  flush();
  return sections;
}

function recordedDate(note: SourceNote): { recordedDate: string; dateBasis: string } {
  for (const key of ["recorded_on", "decided_on", "updated", "captured_on", "created"]) {
    const value = note.metadata[key];
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(Date.parse(value))) {
      return { recordedDate: value, dateBasis: key };
    }
  }
  return { recordedDate: new Date(note.modifiedAt).toISOString(), dateBasis: "file modification time; event date unknown" };
}

function priority(note: SourceNote): number {
  return /(?:^|\/)overview\.md$/i.test(note.path) ? 3
    : note.metadata.type === "decision" ? 2 : note.metadata.type === "session" ? 1 : 0;
}

function focusedExcerpt(text: string, limit: number, terms?: string[], phrases?: string[]): string {
  if (!(terms?.length || phrases?.length) || text.length <= limit) return text.slice(0, limit).replace(/[\uD800-\uDBFF]$/, "");
  const wanted = new Set(terms ?? []);
  const words = tokenSpans(text);
  const matches = words.filter(word => wanted.has(word.term)).map(word => ({ key: `term:${word.term}`, start: word.start, end: word.end }));
  const bodyPhrases = new Set<string>();
  for (const phrase of phrases ?? []) {
    const parts = phrase.split(" ");
    for (let index = 0; index + parts.length <= words.length; index++) {
      if (!parts.every((part, offset) => words[index + offset]!.term === part)) continue;
      matches.push({ key: `phrase:${phrase}`, start: words[index]!.start, end: words[index + parts.length - 1]!.end });
      bodyPhrases.add(phrase);
    }
  }
  if (!matches.length) return text.slice(0, limit).replace(/[\uD800-\uDBFF]$/, "");
  const clamp = (start: number) => Math.max(0, Math.min(text.length - limit, start));
  const phraseSpans = matches.filter(match => match.key.startsWith("phrase:"));
  const anchors = phraseSpans.length ? phraseSpans : matches;
  const first = anchors.reduce((position, span) => Math.min(position, span.start), text.length);
  const last = anchors.reduce((position, span) => Math.max(position, span.end), 0);
  const preferred = clamp(Math.floor((first + last - limit) / 2));
  const starts = [...new Set([preferred, ...matches.flatMap(match => [clamp(match.start - Math.floor(limit / 3)), clamp(match.start), clamp(match.end - limit)])])].sort((a, b) => a - b);
  const spans = matches.map((match, id) => ({ ...match, id }));
  const byStart = [...spans].sort((a, b) => a.start - b.start), byEnd = [...spans].sort((a, b) => a.end - b.end);
  let left = 0, right = 0, best = 0, bestScore = -1, phraseCount = 0, termCount = 0, bestPhrases = 0;
  const active = new Set<number>();
  const counts = new Map<string, number>();
  const update = (key: string, delta: number) => {
    const before = counts.get(key) ?? 0, after = before + delta;
    if (after) counts.set(key, after); else counts.delete(key);
    const difference = Number(after > 0) - Number(before > 0);
    if (key.startsWith("phrase:")) phraseCount += difference; else termCount += difference;
  };
  for (const start of starts) {
    while (right < byEnd.length && byEnd[right]!.end <= start + limit) {
      const span = byEnd[right++]!;
      if (span.start >= start) { active.add(span.id); update(span.key, 1); }
    }
    while (left < byStart.length && byStart[left]!.start < start) {
      const span = byStart[left++]!;
      if (active.delete(span.id)) update(span.key, -1);
    }
    const score = phraseCount * 100 + termCount;
    if (score > bestScore || score === bestScore && Math.abs(start - preferred) < Math.abs(best - preferred)) {
      best = start; bestScore = score; bestPhrases = phraseCount;
    }
  }
  if (bestScore === 0 || bestPhrases < bodyPhrases.size) return "";
  return text.slice(best, best + limit).replace(/^[\uDC00-\uDFFF]/, "").replace(/[\uD800-\uDBFF]$/, "");
}

export async function buildEvidence(notes: SourceNote[], now = Date.now()): Promise<EvidenceBundle> {
  const sources: Evidence[] = [];
  const noteHashes: Record<string, string> = {};
  let remaining = MAX_CONTEXT;
  let truncated = notes.some((note) => note.text.length > MAX_NOTE);
  const baselines = notes.flatMap((note) => {
    const date = note.metadata.type === "session" ? note.metadata.recorded_on
      : note.metadata.type === "review" ? note.metadata.generated_on : undefined;
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)
      && Number.isFinite(Date.parse(date)) && (date.length===10?date<=localDay(now):Date.parse(date)<=now)
      ? [{ path: note.path, date,modifiedAt:note.modifiedAt }] : [];
  }).sort((a, b) => b.date.slice(0,10).localeCompare(a.date.slice(0,10))||b.modifiedAt-a.modifiedAt||a.path.localeCompare(b.path));
  const latest=baselines[0];
  const baseline = latest?{path:latest.path,date:latest.date}:undefined;
  const weight=(note:SourceNote)=>note.path===baseline?.path?10:priority(note);
  const ordered = [...notes].sort((a, b) => (b.relevance ?? -1) - (a.relevance ?? -1) || weight(b) - weight(a)
    || b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
  const groups: { note: SourceNote; sections: { heading: string; excerpt: string; property?: "objective" | "goal" }[] }[] = [];
  for (const note of ordered) {
    noteHashes[note.path] = note.fullHash ?? await contentHash(note.text);
    const properties: { heading: string; excerpt: string; property: "objective" | "goal" }[] = [];
    if (note.metadata.type === "project") for (const property of ["objective", "goal"] as const) {
      const value = note.metadata[property];
      if (typeof value === "string" && value.trim()) properties.push({ heading: "", excerpt: value.trim(), property });
    }
    const sectionWeight = (section: { heading: string; property?: string }) => section.property ? 5
      : note.metadata.type === "session" && section.heading === "User-reported progress" ? 5
      : (note.metadata.type === "project" || /(?:^|\/)overview\.md$/i.test(note.path)) && /^(?:project )?(?:objective|goal)s?$/i.test(section.heading) ? 4
      : note.metadata.type === "decision" && /^(?:choice|decision|chosen option)$/i.test(section.heading) ? 3 : 0;
    const sections = [...properties, ...noteSections(note.text)].sort((a, b) => sectionWeight(b) - sectionWeight(a));
    groups.push({ note, sections });
  }
  const availablePassages = groups.reduce((sum, group) => sum + group.sections.length, 0);
  const rounds = groups.reduce((maximum, group) => Math.max(maximum, group.sections.length), 0);
  const passageLimit = Math.min(4000, Math.max(400, Math.floor(11000 / Math.max(1, Math.min(groups.length, 12)))));
  passages: for (let round = 0; round < rounds; round++) {
    for (const { note, sections } of groups) {
      const section = sections[round]; if (!section) continue;
      if (remaining < 100) { truncated = true; break passages; }
      const excerpt = focusedExcerpt(section.excerpt, Math.min(passageLimit, remaining), note.focusTerms, note.focusPhrases);
      truncated ||= excerpt.length !== section.excerpt.length;
      const source: Evidence = {
        id: `S${sources.length + 1}`, path: note.path, heading: section.heading,
        excerpt, excerptComplete: false, contentHash: await contentHash(excerpt), modifiedAt: note.modifiedAt, ...recordedDate(note)
      };
      if(note.pdf){const page=Number(/^PDF page (\d+)$/.exec(section.heading)?.[1]);if(!note.pdf.pages.some(p=>p.page===page))continue;source.pdf={path:note.pdf.path,hash:note.pdf.hash,page};}
      if (section.property) source.property = section.property;
      if (typeof note.metadata.id === "string") source.noteId = note.metadata.id;
      if (typeof note.metadata.type === "string") source.noteType = note.metadata.type.slice(0, 100);
      if (typeof note.metadata.status === "string") source.noteStatus = note.metadata.status.slice(0, 100);
      const changeDate = note.metadata.updated ?? note.metadata.captured_on;
      const hasChangeDate = typeof changeDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(changeDate) && Number.isFinite(Date.parse(changeDate));
      source.changedOn = hasChangeDate
        ? changeDate.slice(0, 10) : localDay(note.modifiedAt);
      source.changeBasis = hasChangeDate ? "recorded update/capture date" : "file modification date, not event date";
      const overhead = JSON.stringify({ ...source, excerpt: "" }).length + 2;
      if (overhead >= remaining) { truncated = true; break passages; }
      let low = 0;
      let high = excerpt.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        const cost = JSON.stringify({ ...source, excerpt: focusedExcerpt(section.excerpt, middle, note.focusTerms, note.focusPhrases) }).length + 2;
        if (cost <= remaining) low = middle; else high = middle - 1;
      }
      source.excerpt = focusedExcerpt(section.excerpt, low, note.focusTerms, note.focusPhrases);
      if (!source.excerpt) { truncated = true; continue; }
      truncated ||= source.excerpt.length !== excerpt.length;
      source.excerptComplete = !note.partial && note.text.length <= MAX_NOTE && source.excerpt === section.excerpt;
      source.contentHash = await contentHash(source.excerpt);
      remaining -= JSON.stringify(source).length + 2;
      sources.push(source);
    }
  }
  truncated ||= sources.length < availablePassages;
  return { sources, truncated, noteHashes, ...(baseline ? { baseline } : {}),
    coverage: { availableNotes: notes.length, includedNotes: new Set(sources.map(source => source.path)).size, availablePassages, includedPassages: sources.length },
    newEvidenceIds: baseline ? sources.filter((source) => source.path !== baseline.path
      && (source.changedOn ?? "") > baseline.date.slice(0, 10)).map((source) => source.id) : [] };
}

export function contextCoverageText(bundle: EvidenceBundle): string {
  const coverage = bundle.coverage;
  return coverage ? `Context includes ${coverage.includedPassages} of ${coverage.availablePassages} selected passages from ${coverage.includedNotes} of ${coverage.availableNotes} selected notes. Excerpts and source details share a 16000-character context limit.${bundle.truncated ? " Some selected text or passages were omitted." : ""}`
    : "Context is limited to the supplied passages; it does not cover the entire vault.";
}
