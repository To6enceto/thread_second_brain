import { test } from "node:test";
import assert from "node:assert/strict";
import { actionSnapshot, chosenActionContext, type ActionReadPort } from "./action-board.ts";
import { actionMarkdown, newAction, transitionAction } from "./action-record.ts";
import { buildEvidence, readMetadata } from "./evidence.ts";
import { LocalIndex, indexNote } from "./index.ts";
import { defaultSettings } from "../settings/settings.ts";

const parse = (raw: string) => Object.fromEntries(raw.split(/\r?\n/).filter(l => /^\w+: /.test(l)).map(l => { const at = l.indexOf(": "); return [l.slice(0, at), JSON.parse(l.slice(at + 2))]; }));
const now = new Date("2026-10-20T12:00:00.000Z"), empty = { sources: [], noteHashes: {}, truncated: false };
async function fixture() {
  const source = { path: "P/Support.md", text: "## Budget\n20 euros", metadata: {}, modifiedAt: 1 }, support = await buildEvidence([source]);
  const raw = actionMarkdown(newAction("P", "Compare budget", "I choose a test", "2026-10-20", support, now));
  const progressed = transitionAction(raw, readMetadata(raw, parse), "done", "I report a completed test", "2026-10-20", empty, now);
  const files = new Map([["P/Actions/A.md", progressed], ["P/Support.md", source.text], ["Elsewhere/Other.md", actionMarkdown(newAction("Elsewhere", "Other", "Other", "2026-10-20", empty, now))]]);
  const entries = await Promise.all([...files].map(([path, text]) => indexNote({ path, text, metadata: readMetadata(text, parse), modifiedAt: 1 }, () => null)));
  const index = new LocalIndex(), settings = { ...defaultSettings(), allowedPaths: ["P", "Elsewhere"], selectedProject: "P" }; index.replace(entries, settings);
  const reads: string[] = [];
  const port: ActionReadPort = { read: async path => { reads.push(path); return files.get(path)!; }, parse, current: () => true, verify: async () => true };
  return { files, entries, index, settings, port, reads };
}
test("action snapshot reads canonical project records and only current state/latest report evidence", async () => {
  const f = await fixture(), snapshot = await actionSnapshot(f.index, f.settings, f.port, new AbortController().signal);
  assert.equal(snapshot.cards.length, 1); assert.deepEqual(f.reads, ["P/Actions/A.md"]);
  const card = snapshot.cards[0]!; assert.equal(card.record.status, "done");
  assert.equal(card.sources.length, 2); assert.ok(card.sources[1]!.excerpt.includes("I report a completed test"));
  assert.ok(!card.sources.some(s => s.excerpt.includes("I choose a test")));
  assert.equal(snapshot.bundle.noteHashes["P/Support.md"], f.entries.find(e => e.path === "P/Support.md")!.hash);
  const general = await buildEvidence([{ path: "P/Other.md", text: "## Objective\nCompare constraints.", metadata: {}, modifiedAt: 1 }]);
  const withUnchosen = { ...general, sources: [...general.sources, { ...card.sources[0]!, id: "OLD", path: "P/Unchosen.md" }] };
  const selected = chosenActionContext(snapshot, [card.path], withUnchosen);
  assert.equal(selected.cards.length, 1); assert.ok(selected.bundle.sources.every(s => s.path !== "P/Unchosen.md"));
  assert.ok(chosenActionContext(snapshot, [], withUnchosen).bundle.sources.every(s => s.noteType !== "action"));
  assert.throws(() => chosenActionContext(snapshot, [card.path, card.path], general));
  assert.throws(() => chosenActionContext(snapshot, ["P/Missing.md"], general));
  assert.throws(() => chosenActionContext({ ...snapshot, cards: [{ ...card, sources: [{ ...card.sources[0]!, excerpt: "x".repeat(16000) }] }] }, [card.path], general));
});
test("stale/excluded/ambiguous actions expose generic unavailable counts without reading their text", async () => {
  const f = await fixture(), settings = { ...f.settings, excludedPaths: ["P/Support.md"] };
  let snapshot = await actionSnapshot(f.index, settings, f.port, new AbortController().signal);
  assert.equal(snapshot.unavailable, 1); assert.equal(snapshot.cards.length, 0); assert.deepEqual(f.reads, []);
  f.index.replace([...f.entries, { ...f.entries[0]!, path: "P/Duplicate.md" }], f.settings);
  snapshot = await actionSnapshot(f.index, f.settings, f.port, new AbortController().signal);
  assert.equal(snapshot.cards.length, 0); assert.deepEqual(f.reads, []);
  f.index.replace(f.entries, f.settings);
  snapshot = await actionSnapshot(f.index, { ...f.settings, excludedPaths: ["P/Actions"] }, f.port, new AbortController().signal);
  assert.equal(snapshot.candidates, 0); assert.equal(snapshot.unavailable, 0);
});
test("action snapshots suppress late scope/index/hash/verification changes and cancellation", async () => {
  for (const change of ["scope", "index", "hash", "verify", "abort"] as const) {
    const f = await fixture(), controller = new AbortController();
    const read = f.port.read;
    f.port.read = async path => {
      const raw = await read(path);
      if (change === "scope") f.port.current = () => false;
      if (change === "index") f.index.revision++;
      if (change === "abort") controller.abort();
      return change === "hash" ? raw + "changed" : raw;
    };
    if (change === "verify") f.port.verify = async () => false;
    await assert.rejects(actionSnapshot(f.index, f.settings, f.port, controller.signal));
  }
});
test("action snapshot bounded scan reports omitted candidates and rejects incomplete project identity", async () => {
  const f = await fixture(), base = f.entries[0]!;
  f.index.replace(Array.from({ length: 103 }, (_, i) => ({ ...base, path: `P/Actions/${i}.md`, id: `duplicate` })), f.settings);
  const snapshot = await actionSnapshot(f.index, f.settings, f.port, new AbortController().signal);
  assert.equal(snapshot.candidates, 103); assert.equal(snapshot.unavailable, 100); assert.equal(snapshot.omitted, 3); assert.deepEqual(f.reads, []);
  Object.defineProperty(f.index, "identityComplete", { value: false, configurable: true });
  await assert.rejects(actionSnapshot(f.index, f.settings, f.port, new AbortController().signal), /coverage/);
});
