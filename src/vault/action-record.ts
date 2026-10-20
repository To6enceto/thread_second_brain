import { escapeMarkdown, sourceReferences } from "../intelligence/answer.ts";
import { readSourceReferences, type SourceReference, type SourceRange } from "./freshness.ts";
import { calendarDate } from "./decision.ts";
import { frontmatter, localDay } from "./workspace.ts";
import type { EvidenceBundle } from "./evidence.ts";

export const actionStates = ["planned", "in-progress", "blocked", "done"] as const;
export type ActionState = typeof actionStates[number];
export const actionLabels: Record<ActionState, string> = { planned: "Planned", "in-progress": "In progress", blocked: "Blocked", done: "Done" };
export interface ActionEvent { from: ActionState | null; to: ActionState; day: string; recordedAt: string; reason: string; sources: SourceReference[]; }
export interface ActionRecord { schemaVersion: 1; id: string; project: string; title: string; status: ActionState; createdAt: string; history: ActionEvent[]; }
const start = "<!-- thread:action-record -->", end = "<!-- /thread:action-record -->";
const bytes = (s: string) => new TextEncoder().encode(s).length;
const bounded = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v === v.trim() && v.length <= max;
const state = (v: unknown): v is ActionState => typeof v === "string" && actionStates.includes(v as ActionState);
const timestamp = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function fields(value: unknown, keys: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid action record object.");
  const v = value as Record<string, unknown>;
  if (keys.some(k => !Object.hasOwn(v, k)) || Object.keys(v).some(k => !keys.includes(k) && !optional.includes(k))) throw Error("Unsupported action record fields.");
  return v;
}
export function validateAction(value: unknown): ActionRecord {
  if (bytes(JSON.stringify(value)) > 262144) throw Error("Action history exceeds 256 KiB. Preserve it; no history will be removed.");
  const v = fields(value, ["schemaVersion", "id", "project", "title", "status", "createdAt", "history"]);
  if (v.schemaVersion !== 1 || typeof v.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.id)
    || !bounded(v.project, 4096) || !bounded(v.title, 200) || /[\r\n\0]/.test(v.title) || !state(v.status) || !timestamp(v.createdAt)
    || !Array.isArray(v.history) || !v.history.length || v.history.length > 64) throw Error("Invalid action identity, state or history. Preserve the original and inspect it manually.");
  const history: ActionEvent[] = [];
  let referenceCount = 0;
  for (const raw of v.history) {
    const h = fields(raw, ["from", "to", "day", "recordedAt", "reason", "sources"]), prior = history.at(-1);
    if (!state(h.to) || (prior ? h.from !== prior.to || h.to === prior.to : h.from !== null || h.to !== "planned")
      || typeof h.day !== "string" || !calendarDate(h.day) || !timestamp(h.recordedAt) || !bounded(h.reason, 2000)
      || (prior ? h.recordedAt < prior.recordedAt || h.day < prior.day : h.recordedAt !== v.createdAt)) throw Error("Invalid action transition history.");
    if (!Array.isArray(h.sources)) throw Error("Invalid action references.");
    for (const source of h.sources) fields(source, ["path", "heading", "hash", "noteHash"], ["id", "noteType", "noteStatus", "pdf"]);
    const sources = readSourceReferences(h.sources, true);
    referenceCount += sources.length;
    if (referenceCount > 100) throw Error("Action history exceeds 100 reference snapshots. Preserve it; no history will be removed.");
    history.push({ from: h.from as ActionState | null, to: h.to, day: h.day, recordedAt: h.recordedAt, reason: h.reason, sources });
  }
  if (history.at(-1)!.to !== v.status) throw Error("Action state does not match its history.");
  return { schemaVersion: 1, id: v.id, project: v.project, title: v.title, status: v.status, createdAt: v.createdAt, history };
}
export function actionReferences(record: ActionRecord): SourceReference[] {
  return [...new Map(record.history.flatMap(h => h.sources).map(ref => [JSON.stringify(ref), ref])).values()];
}
function body(record: ActionRecord): string {
  const e = escapeMarkdown;
  return `${start}\n# ${e(record.title)}\n\n## Recorded action\n\nStatus: **${actionLabels[record.status]}**. Project: ${e(record.project)}.\n\n`
    + "These are explicit user reports and choices, not independently verified events. AI output never changes this status. Earlier transitions are retained.\n\n"
    + record.history.map(h => `## Action event (${h.day} - ${actionLabels[h.to]})\n\nUser action: **${h.from ? actionLabels[h.from] : "New action"} to ${actionLabels[h.to]}**. Recorded at ${h.recordedAt}.\n\n${e(h.reason)}\n`).join("\n")
    + "\n## Supporting references\n\n"
    + record.history.map((h, i) => `Event ${i + 1}:\n\n` + (h.sources.length ? h.sources.map(ref =>
      `- [${e(ref.path)}](<${ref.path.split("/").map(encodeURIComponent).join("/")}${ref.heading ? "#" + encodeURIComponent(ref.heading) : ""}>)${ref.heading ? ` > ${e(ref.heading)}` : ""}${ref.id ? ` (ID ${e(ref.id)})` : ""}; note hash ${ref.noteHash}; passage hash ${ref.hash}.`
      + (ref.pdf ? ` PDF ${e(ref.pdf.path)}, page ${ref.pdf.page}; hash ${ref.pdf.hash}.` : "")).join("\n") : "No supporting references selected.")).join("\n\n")
    + `\n${end}\n`;
}
function properties(record: ActionRecord): Record<string, string> {
  return { id: record.id, type: "action", thread_action_version: "1", project: record.project, title: record.title, status: record.status,
    created: record.createdAt.slice(0, 10), updated: record.history.at(-1)!.recordedAt.slice(0, 10), thread_action_record: JSON.stringify(record) };
}
export function actionMarkdown(value: ActionRecord): string {
  const record = validateAction(value), raw = frontmatter(properties(record)) + body(record);
  if (bytes(raw) > 1048576) throw Error("Action note exceeds 1 MiB.");
  return raw;
}
export function hasAction(raw: string, metadata: Record<string, unknown>): boolean {
  return metadata.type === "action" || metadata.thread_action_version !== undefined || metadata.thread_action_record !== undefined
    || /^[\t ]*(?:thread_action_(?:version|record)|["']thread_action_(?:version|record)["'])\s*:/im.test(raw) || /<!--\s*(?:\/\s*)?thread\s*:\s*action-record/i.test(raw);
}
function headerOf(raw: string): string {
  const header = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0];
  if (!header || /^\s*<<\s*:/m.test(header)) throw Error("Ambiguous action properties need manual normalization.");
  return header;
}
/** Replace only a proven scalar; preserve unknown properties, comments and line endings. */
function scalar(header: string, key: string, expected: string, value: string): string {
  const lines = header.split(/\r?\n/), matches = lines.filter(line => new RegExp(`^\\s*(?:${key}|["']${key}["'])\\s*:`).test(line));
  const line = matches[0] ?? "", prefix = new RegExp(`^(${key}:[\\t ]*)`).exec(line)?.[1];
  if (matches.length !== 1 || !prefix) throw Error("Duplicate or complex action properties need manual normalization.");
  const remainder = line.slice(prefix.length), candidates = [JSON.stringify(expected), `'${expected.replace(/'/g, "''")}'`, expected];
  const original = candidates.find(v => remainder.startsWith(v) && /^[\t ]*(?:#.*)?$/.test(remainder.slice(v.length)));
  const index = lines.indexOf(line), next = lines.slice(index + 1).find(l => l.trim() && !/^\s*#/.test(l));
  if (original === undefined || next && /^\s/.test(next)) throw Error("Multiline action properties need manual normalization.");
  const position = header.search(new RegExp(`^${key}:`, "m"));
  return header.slice(0, position) + prefix + JSON.stringify(value) + remainder.slice(original.length) + header.slice(position + line.length);
}
export function readAction(raw: string, metadata: Record<string, unknown>): ActionRecord {
  if (bytes(raw) > 1048576 || metadata.type !== "action" || metadata.thread_action_version !== "1" || typeof metadata.thread_action_record !== "string"
    || bytes(metadata.thread_action_record) > 262144) throw Error("Unsupported action record. Preserve it and inspect it manually.");
  if (Object.keys(metadata).some(k => k.startsWith("thread_") && !["thread_action_version", "thread_action_record"].includes(k))) throw Error("Conflicting action record formats.");
  const record = validateAction(JSON.parse(metadata.thread_action_record)), header = headerOf(raw);
  for (const [key, value] of Object.entries(properties(record))) {
    if (metadata[key] !== value) throw Error("Action properties disagree with its retained history.");
    scalar(header, key, value, value);
  }
  const expected = "\n" + body(record), actual = raw.slice(header.length);
  if (actual !== expected && actual !== expected.replace(/\n/g, "\r\n")) throw Error("Action content was edited outside Thread. Preserve it and inspect it manually before updating.");
  return record;
}
function references(bundle: EvidenceBundle): SourceReference[] { return sourceReferences(bundle).map(({ excerpt: _excerpt, ...ref }) => ref); }
export function newAction(project: string, title: string, reason: string, day: string, bundle: EvidenceBundle, now = new Date()): ActionRecord {
  if (!calendarDate(day) || day > localDay(now)) throw Error("Choose a valid reported date no later than today.");
  return validateAction({ schemaVersion: 1, id: crypto.randomUUID(), project, title: title.trim(), status: "planned", createdAt: now.toISOString(),
    history: [{ from: null, to: "planned", day, recordedAt: now.toISOString(), reason: reason.trim(), sources: references(bundle) }] });
}
export function transitionAction(before: string, metadata: Record<string, unknown>, to: ActionState, reason: string, day: string, bundle: EvidenceBundle, now = new Date()): string {
  const record = readAction(before, metadata);
  if (!calendarDate(day) || day > localDay(now)) throw Error("Choose a valid reported date no later than today.");
  const next = validateAction({ ...record, status: to, history: [...record.history, { from: record.status, to, reason: reason.trim(), day, recordedAt: now.toISOString(), sources: references(bundle) }] });
  let header = headerOf(before);
  const original = properties(record), updated = properties(next);
  for (const key of ["status", "updated", "thread_action_record"]) header = scalar(header, key, original[key]!, updated[key]!);
  const after = header + ("\n" + body(next)).replace(/\n/g, header.includes("\r\n") ? "\r\n" : "\n");
  if (bytes(after) > 1048576) throw Error("Action note exceeds 1 MiB. History was not changed.");
  return after;
}
export function actionProjection(raw: string, metadata: Record<string, unknown>): { text: string; ranges: SourceRange[]; refs: SourceReference[] } {
  const record = readAction(raw, metadata), from = headerOf(raw).length, to = raw.indexOf("## Supporting references", from);
  return { text: raw.slice(from, to), ranges: [{ from, to }], refs: actionReferences(record) };
}
