import type { ThreadSettings } from "../settings/settings.ts";
import { object } from "../settings/settings.ts";
import type { ChangeProposal } from "./changes.ts";
import { LocalIndex, type IndexEntry } from "./index.ts";
import { isWithin, readableText } from "./scope.ts";
import { localDay } from "./workspace.ts";

export interface HomeItem { path: string; hash: string; heading: string; text: string; }
export interface ProjectHome {
  project: string;
  sessions: HomeItem[];
  decisions: HomeItem[];
  questions: HomeItem[];
  counts: { sessions: number; decisions: number; questions: number };
  pendingReviews: number;
}

export function permittedProjects(index: LocalIndex, settings: ThreadSettings): string[] {
  if (!index.ready) return [];
  const graph = index.graph(settings);
  const eligible = index.entries.filter(entry => readableText(entry.path, settings) && graph.assess(entry.path).usable);
  const projects = new Set(eligible.filter(entry => entry.metadata.type === "project"
    || settings.roles.projects && isWithin(entry.path, settings.roles.projects) && /(?:^|\/)overview\.md$/i.test(entry.path))
    .map(entry => entry.path.slice(0, entry.path.lastIndexOf("/"))).filter(Boolean));
  if (settings.selectedProject && eligible.some(entry => isWithin(entry.path, settings.selectedProject))) projects.add(settings.selectedProject);
  return [...projects].sort((a, b) => a.localeCompare(b));
}

function dateLabel(entry: IndexEntry, key: string): string {
  const value = entry.metadata[key];
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? `recorded ${value}`
    : `modified ${localDay(new Date(entry.modifiedAt))}; event date unknown`;
}

function recent(key: string): (a: IndexEntry, b: IndexEntry) => number {
  return (a, b) => {
    const day = (entry: IndexEntry) => typeof entry.metadata[key] === "string" && Number.isFinite(Date.parse(entry.metadata[key] as string))
      ? (entry.metadata[key] as string).slice(0, 10) : "";
    return day(b).localeCompare(day(a)) || b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path);
  };
}

function visiblePending(pending: ChangeProposal | null, settings: ThreadSettings): number {
  if (!pending || !settings.selectedProject) return 0;
  try {
    const context = object(JSON.parse(pending.context));
    if (object(context.settings).selectedProject !== settings.selectedProject || !context.noteHashes
      || typeof context.noteHashes !== "object" || Array.isArray(context.noteHashes)) return 0;
    if (!pending.operations.every(op => readableText(op.path, settings))
      || !Object.keys(context.noteHashes).every(path => readableText(path, settings))) return 0;
    return 1;
  } catch { return 0; }
}

export function projectHome(index: LocalIndex, settings: ThreadSettings, pending: ChangeProposal | null = null): ProjectHome {
  if (!index.ready) throw new Error("Project evidence is still loading. Refresh home.");
  if (!settings.selectedProject || !permittedProjects(index, settings).includes(settings.selectedProject)) {
    throw new Error("Select a project visible within your current read permissions.");
  }
  const entries = index.projectEntries(settings, settings.selectedProject);
  const sessions = entries.filter(entry => entry.metadata.type === "session").sort(recent("recorded_on"));
  const decisions = entries.filter(entry => entry.metadata.type === "decision").sort(recent("decided_on"));
  const questions = entries.flatMap(entry => entry.chunks.filter(chunk => /^(?:open|unresolved) questions?$/i.test(chunk.heading.trim()))
    .map(chunk => ({ path: entry.path, hash: entry.hash, heading: chunk.heading, text: chunk.excerpt.slice(0, 500) })));
  return {
    project: settings.selectedProject,
    sessions: sessions.slice(0, 5).map(entry => ({ path: entry.path, hash: entry.hash, heading: "", text: dateLabel(entry, "recorded_on") })),
    decisions: decisions.slice(0, 6).map(entry => ({ path: entry.path, hash: entry.hash, heading: "", text: `${String(entry.metadata.status ?? "status not recorded")} - ${dateLabel(entry, "decided_on")}` })),
    questions: questions.slice(0, 6),
    counts: { sessions: sessions.length, decisions: decisions.length, questions: questions.length },
    pendingReviews: visiblePending(pending, settings)
  };
}
