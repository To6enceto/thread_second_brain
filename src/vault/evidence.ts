import { contentHash } from "./scope.ts";

export interface SourceNote {
  path: string;
  text: string;
  metadata: Record<string, unknown>;
  modifiedAt: number;
  fullHash?: string;
}

export interface Evidence {
  id: string;
  path: string;
  noteId?: string;
  noteType?: string;
  noteStatus?: string;
  heading: string;
  excerpt: string;
  contentHash: string;
  recordedDate: string;
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
}

const MAX_CONTEXT = 16000;
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
  const ordered = [...notes].sort((a, b) => weight(b) - weight(a)
    || b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
  for (const note of ordered) {
    noteHashes[note.path] = note.fullHash ?? await contentHash(note.text);
    for (const section of noteSections(note.text)) {
      if (remaining < 100) { truncated = true; break; }
      const excerpt = section.excerpt.slice(0, Math.min(4000, remaining));
      truncated ||= excerpt.length !== section.excerpt.length;
      const source: Evidence = {
        id: `S${sources.length + 1}`, path: note.path, heading: section.heading,
        excerpt, contentHash: await contentHash(excerpt), ...recordedDate(note)
      };
      if (typeof note.metadata.id === "string") source.noteId = note.metadata.id;
      if (typeof note.metadata.type === "string") source.noteType = note.metadata.type.slice(0, 100);
      if (typeof note.metadata.status === "string") source.noteStatus = note.metadata.status.slice(0, 100);
      const changeDate = note.metadata.updated ?? note.metadata.captured_on;
      const hasChangeDate = typeof changeDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(changeDate) && Number.isFinite(Date.parse(changeDate));
      source.changedOn = hasChangeDate
        ? changeDate.slice(0, 10) : localDay(note.modifiedAt);
      source.changeBasis = hasChangeDate ? "recorded update/capture date" : "file modification date, not event date";
      const overhead = JSON.stringify({ ...source, excerpt: "" }).length + 2;
      if (overhead >= remaining) { truncated = true; break; }
      let low = 0;
      let high = excerpt.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        const cost = JSON.stringify({ ...source, excerpt: excerpt.slice(0, middle) }).length + 2;
        if (cost <= remaining) low = middle; else high = middle - 1;
      }
      source.excerpt = excerpt.slice(0, low).replace(/[\uD800-\uDBFF]$/, "");
      if (!source.excerpt) { truncated = true; break; }
      truncated ||= source.excerpt.length !== excerpt.length;
      source.contentHash = await contentHash(source.excerpt);
      remaining -= JSON.stringify(source).length + 2;
      sources.push(source);
    }
  }
  return { sources, truncated, noteHashes, ...(baseline ? { baseline } : {}),
    newEvidenceIds: baseline ? sources.filter((source) => source.path !== baseline.path
      && (source.changedOn ?? "") > baseline.date.slice(0, 10)).map((source) => source.id) : [] };
}
