import type { ThreadSettings } from "../settings/settings.ts";
import { readAction, actionProjection, actionLabels, type ActionRecord } from "./action-record.ts";
import { readMetadata, type Evidence, type EvidenceBundle } from "./evidence.ts";
import { contentHash } from "./scope.ts";
import { overviewIdentity } from "./project-overview.ts";
import type { LocalIndex } from "./index.ts";
import { selectContext } from "./workbench.ts";

export interface ActionCard { path: string; hash: string; record: ActionRecord; sources: Evidence[]; }
export interface ActionSnapshot { cards: ActionCard[]; bundle: EvidenceBundle; identity: string; unavailable: number; omitted: number; candidates: number; }
export interface ActionReadPort {
  read(path: string): Promise<string>;
  parse(yaml: string): unknown;
  current(): boolean;
  verify(bundle: EvidenceBundle): Promise<boolean>;
}
export async function actionSnapshot(index: LocalIndex, settings: ThreadSettings, port: ActionReadPort, signal: AbortSignal): Promise<ActionSnapshot> {
  const revision = index.revision, entries = index.entries;
  const check = () => {
    signal.throwIfAborted();
    if (!port.current() || !index.ready || revision !== index.revision || entries !== index.entries) throw Error("Action records changed. Refresh the current project.");
  };
  check();
  const identity = overviewIdentity(index, settings, settings.selectedProject);
  if (!settings.selectedProject || !identity.id) throw Error(identity.reason || "Select a permitted project first.");
  const graph = index.graph(settings);
  const candidates = index.projectRecords(settings, settings.selectedProject).filter(e => e.metadata.type === "action").sort((a, b) => a.path.localeCompare(b.path));
  const cards: ActionCard[] = [], hashes = { ...identity.hashes };
  let unavailable = 0;
  for (const entry of candidates.slice(0, 100)) {
    check();
    const freshness = graph.assess(entry.path);
    if (!freshness.usable || !entry.id || !index.idUnambiguous(entry.id)) { unavailable++; continue; }
    const raw = await port.read(entry.path); check();
    if (new TextEncoder().encode(raw).length > 1048576 || await contentHash(raw) !== entry.hash) throw Error("An action changed or exceeds 1 MiB. Refresh before continuing.");
    check();
    const metadata = readMetadata(raw, port.parse);
    let record: ActionRecord;
    try { record = readAction(raw, metadata); } catch { unavailable++; continue; }
    if (record.id !== entry.id || record.project !== identity.id) { unavailable++; continue; }
    const text = actionProjection(raw, metadata).text.replace(/\r\n/g, "\n"), last = record.history.at(-1)!;
    const latestHeading = `Action event (${last.day} - ${actionLabels[last.to]})`, latestMark = `## ${latestHeading}\n`;
    const recordedMark = "## Recorded action\n", recordedFrom = text.indexOf(recordedMark) + recordedMark.length;
    const sections = [
      { heading: "Recorded action", excerpt: text.slice(recordedFrom, text.indexOf("\n## Action event", recordedFrom)).trim() },
      { heading: latestHeading, excerpt: text.slice(text.lastIndexOf(latestMark) + latestMark.length).trim() }
    ];
    const sources: Evidence[] = [];
    for (const section of sections) sources.push({ ...section, id: "", path: entry.path, noteId: record.id, noteType: "action", noteStatus: record.status,
      contentHash: await contentHash(section.excerpt), excerptComplete: true, recordedDate: last.day, dateBasis: "user-reported action date; not independently verified" });
    check();
    cards.push({ path: entry.path, hash: entry.hash, record, sources });
    hashes[entry.path] = entry.hash; Object.assign(hashes, freshness.dependencies);
  }
  const bundle: EvidenceBundle = { sources: [], noteHashes: hashes, truncated: candidates.length > 100 };
  check();
  if (!await port.verify(bundle)) throw Error("Action support changed. Refresh before continuing.");
  check();
  return { cards, bundle, identity: identity.id, unavailable, omitted: Math.max(0, candidates.length - 100), candidates: candidates.length };
}
export function chosenActionContext(snapshot: ActionSnapshot, paths: readonly string[], general: EvidenceBundle): { cards: ActionCard[]; bundle: EvidenceBundle } {
  if (new Set(paths).size !== paths.length || paths.length > 5) throw Error("Select at most five distinct recorded actions.");
  const cards = paths.map(path => {
    const card = snapshot.cards.find(c => c.path === path);
    if (!card) throw Error("A selected action is no longer available. Refresh and select again.");
    return card;
  });
  const selected = cards.flatMap(c => c.sources);
  const sources = [...selected, ...general.sources.filter(s => s.noteType !== "action")].map((s, i) => ({ ...s, id: `S${i + 1}` }));
  const candidates = { sources, noteHashes: { ...general.noteHashes, ...Object.fromEntries(cards.map(c => [c.path, c.hash])) }, truncated: general.truncated };
  const bundle = selectContext(candidates, {});
  if (selected.some((_, i) => !bundle.sources.some(s => s.id === `S${i + 1}`))) throw Error("Selected action reports exceed the context budget. Choose fewer actions; nothing was silently omitted.");
  return { cards, bundle };
}
