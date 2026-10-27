import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { DesktopProjects } from "./projects.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { DesktopIntake } from "./intake.ts";
import { hashText } from "./profile.ts";
import { metadata } from "./metadata.ts";
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-intake-")), vault = join(root, "vault"), profile = join(root, "profile");
  for (const path of ["Projects/Demo", "Inbox", "Sources", "Private"]) await mkdir(join(vault, path), { recursive: true }); await mkdir(profile);
  const original = '---\ntype: project\nid: demo\nstatus: active\n---\n## Objective\nCompare local research citations.\n';
  await writeFile(join(vault, "Projects/Demo/Overview.md"), original); await writeFile(join(vault, "Private/Secret.md"), "PRIVATE FIXTURE");
  const reader = new VaultReader(); let info = await reader.select(vault); info = reader.grant({ roots: ["Projects", "Inbox", "Sources"], excluded: ["Private"] }, info.revision);
  const index = new EvidenceIndex(reader), projects = new DesktopProjects(reader, index), storage = new DesktopStorage(reader, profile); await storage.initialize(info.revision); const compat = await storage.inspect(".obsidian", info.revision); await storage.enable(compat.id, info.revision);
  const preferences = storage.status(info.revision).preferences; preferences.roles.projects = "Projects"; preferences.roles.sources = "Sources"; preferences.roles.inbox = "Inbox"; await storage.savePreferences(preferences, info.revision);
  const changes = new DesktopChanges(reader, storage), intake = new DesktopIntake(reader, index, projects, storage, changes), selection = { folder: "Projects", project: "Projects/Demo" };
  const load = () => intake.load(selection, info.revision), read = (path: string) => readFile(join(vault, path), "utf8"), put = (path: string, raw: string) => writeFile(join(vault, path), raw);
  const apply = async () => { const preview = await changes.preview("apply", changes.snapshot(info.revision).pending!.id, info.revision); assert.equal(preview.ready, true); await changes.confirm(preview.id, info.revision); return preview; };
  t.after(async () => { await storage.close(); await rm(root, { recursive: true, force: true }); }); return { root, vault, reader, info, index, projects, storage, changes, intake, selection, load, read, put, original, apply };
}
const thought = { kind: "thought", name: "Thought", text: "Compare local citations in research.", file: "", url: "", project: "" };
test("typed capture suggests without assigning and saves only through exact non-overwriting review", async t => {
  const f = await fixture(t), snapshot = await f.load(); assert.equal(f.intake.suggest(snapshot.id, { kind: "thought", text: thought.text, file: "" }, f.info.revision), "Projects/Demo");
  await f.intake.capture(snapshot.id, thought, f.info.revision); await assert.rejects(f.read("Inbox/Thought.md"), { code: "ENOENT" }); const preview = await f.apply(); const saved = await f.read("Inbox/Thought.md"); assert.equal(saved, preview.operations[0]!.after); assert.equal(metadata(saved).project, undefined); assert.ok(saved.endsWith(thought.text)); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
  const next = await f.load(); await assert.rejects(f.intake.capture(next.id, thought, f.info.revision), /The note changed before the change was prepared/); assert.equal(await f.read("Inbox/Thought.md"), saved);
});
test("explicit project capture binds current identity, metadata URL and supporting snapshot", async t => {
  const f = await fixture(t), snapshot = await f.load(); await f.intake.capture(snapshot.id, { ...thought, project: "Projects/Demo", url: "https://example.invalid/original" }, f.info.revision);
  const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); assert.equal(preview.ready, true); assert.equal(metadata(preview.operations[0]!.after!).project, "demo");
  await f.put("Projects/Demo/Overview.md", f.original + "External edit\n"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed|stale|conflict/i); await assert.rejects(f.read("Inbox/Thought.md"), { code: "ENOENT" });
});
test("picked imports retain an exact snapshot and detect known duplicates from permitted source records", async t => {
  const f = await fixture(t), path = join(f.root, "Authored.txt"), raw = "\uFEFFExact external source\r\n"; await writeFile(path, raw); let snapshot = await f.load(); const picked = await f.intake.pick(snapshot.id, f.info.revision, async () => path); assert.ok(picked); assert.equal(picked.text, raw);
  await writeFile(path, "A later external version"); const command = { ...thought, kind: "import", name: "Imported", text: "", file: picked.id, project: "Projects/Demo" }; await f.intake.capture(snapshot.id, command, f.info.revision); const preview = await f.apply(), saved = await f.read("Sources/Imported.md"); assert.equal(saved, preview.operations[0]!.after); assert.ok(saved.endsWith(raw)); assert.equal(metadata(saved).thread_import_hash, hashText(raw)); assert.equal(await readFile(path, "utf8"), "A later external version");
  await writeFile(path, raw); snapshot = await f.load(); const duplicate = await f.intake.pick(snapshot.id, f.info.revision, async () => path); await assert.rejects(f.intake.capture(snapshot.id, { ...command, name: "Duplicate", file: duplicate!.id }, f.info.revision), /already saved at Sources\/Imported/); await assert.rejects(f.read("Sources/Duplicate.md"), { code: "ENOENT" });
  const undo = await f.changes.preview("undo", f.changes.snapshot(f.info.revision).history[0]!.id, f.info.revision); assert.equal(undo.ready, true); await f.changes.confirm(undo.id, f.info.revision); await assert.rejects(f.read("Sources/Imported.md"), { code: "ENOENT" });
});
test("capture validates finite fields, input bytes, original URL, project and the existing journal bound", async t => {
  const f = await fixture(t), snapshot = await f.load();
  for (const input of [{ ...thought, arbitrary: "path" }, { ...thought, kind: "remote" }, { ...thought, name: "../outside" }, { ...thought, project: "Private" }, { ...thought, url: "https://user:pass@example.invalid" }, { ...thought, url: "file:///etc/passwd" }, { ...thought, text: "界".repeat(800000) }, { ...thought, kind: "import", text: "", file: "forged" }, { ...thought, text: "x".repeat(1100000) }]) await assert.rejects(f.intake.capture(snapshot.id, input, f.info.revision));
  assert.equal(f.changes.snapshot(f.info.revision).pending, null); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
});
test("canceled picker, changed inputs and revoked scopes cannot publish or prepare stale captured content", async t => {
  const f = await fixture(t), path = join(f.root, "File.md"); await writeFile(path, "External source"); let snapshot = await f.load(); const chosen = await f.intake.pick(snapshot.id, f.info.revision, async () => path); assert.ok(chosen);
  assert.equal(await f.intake.pick(snapshot.id, f.info.revision, async () => null), null); await assert.rejects(f.intake.capture(snapshot.id, { ...thought, kind: "import", text: "", file: chosen.id }, f.info.revision));
  const pending = f.intake.capture(snapshot.id, thought, f.info.revision), rejected = assert.rejects(pending, /changed|canceled/); f.intake.draftChanged(); await rejected; assert.equal(f.changes.snapshot(f.info.revision).pending, null);
  let finish!: (value: string) => void; const dialog = new Promise<string>(r => { finish = r; }); const picked = f.intake.pick(snapshot.id, f.info.revision, () => dialog), refused = assert.rejects(picked, /changed|Refresh/); f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset(); f.intake.invalidate(); finish(path); await refused;
});
test("new permitted duplicates and catalog changes block an already-previewed import without overwrites", async t => {
  const f = await fixture(t), path = join(f.root, "Unique.txt"), raw = "Unique original input"; await writeFile(path, raw); const snapshot = await f.load(), picked = await f.intake.pick(snapshot.id, f.info.revision, async () => path);
  await f.intake.capture(snapshot.id, { ...thought, kind: "import", text: "", file: picked!.id }, f.info.revision); const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); assert.equal(preview.ready, true);
  await f.put("Sources/Elsewhere.md", `---\ntype: source\nthread_import_hash: ${hashText(raw)}\n---\nEarlier import snapshot\n`); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed|stale|conflict/i); await assert.rejects(f.read("Sources/Thought.md"), { code: "ENOENT" });
});

const clipInput = { path: "Inbox/Clip.md", project: "Projects/Demo", name: "Reviewed clip" };
const clipOriginal = '\uFEFF---\r\ntitle: Original title\r\nauthor: [Alice, Bob]\r\nsource: https://example.invalid/article\r\npublished: 2025-03-01\r\ncaptured: 2025-03-02T12:00:00Z\r\n---\r\n# Clipped text\r\nExact local body with ``` fences.\r\n';
test("clip review retains exact BOM/CRLF original, separate metadata and explicit association without fetching", async t => {
  const f = await fixture(t); await f.put(clipInput.path, clipOriginal); t.mock.method(globalThis, "fetch", () => { throw Error("No URL may be fetched during intake"); });
  const snapshot = await f.load(), reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision);
  assert.equal(reviewed.original, clipOriginal); assert.equal(reviewed.hash, hashText(clipOriginal)); assert.deepEqual(reviewed.metadata, { title: "Original title", author: "Alice, Bob", url: "https://example.invalid/article", published: "2025-03-01", captured: "2025-03-02T12:00:00Z" }); assert.deepEqual(reviewed.matches, []);
  await f.intake.prepareClip(snapshot.id, reviewed.id, false, f.info.revision); await assert.rejects(f.read("Sources/Reviewed clip.md"), { code: "ENOENT" }); const preview = await f.apply(), saved = await f.read("Sources/Reviewed clip.md");
  assert.equal(saved, preview.operations[0]!.after); assert.ok(saved.includes(clipOriginal)); const fields = metadata(saved); assert.equal(fields.project, "demo"); assert.equal(fields.thread_clip_published, "2025-03-01"); assert.equal(fields.thread_clip_captured, "2025-03-02T12:00:00Z"); assert.match(String(fields.thread_clip_intake_at), /^\d{4}-\d\d-\d\dT/); assert.equal(fields.thread_import_hash, hashText(clipOriginal)); assert.equal(await f.read(clipInput.path), clipOriginal); assert.equal(await f.read("Projects/Demo/Overview.md"), f.original);
  const next = await f.load(), second = await f.intake.reviewClip(next.id, { ...clipInput, name: "Separate copy" }, f.info.revision); assert.equal(second.matches[0]!.reason, "Exact original text hash");
  await assert.rejects(f.intake.prepareClip(next.id, second.id, false, f.info.revision), /tick the box for a separate copy/); await f.intake.prepareClip(next.id, second.id, true, f.info.revision); await f.apply(); assert.equal(await f.read(clipInput.path), clipOriginal);
});
test("ambiguous or missing clip metadata stays unknown, same-URL matches require acknowledgement and excluded matches stay hidden", async t => {
  const f = await fixture(t); await f.put(clipInput.path, '---\ntitle: [not, text]\nauthor: [Alice, 12]\nsource: https://example.invalid/a\nurl: https://example.invalid/b\npublished: 2025-02-30\ncaptured: 2025-01-01\ncreated: 2025-01-02\n---\nOriginal body.'); let snapshot = await f.load(); const ambiguous = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision); assert.ok(Object.values(ambiguous.metadata).every(value => value === null));
  await f.put(clipInput.path, clipOriginal); await f.put("Sources/Related.md", '---\ntype: source\nthread_import_hash: different\nthread_original_url: https://example.invalid/article\n---\nDifferent imported text'); await f.put("Private/Secret.md", `---\ntype: source\nthread_import_hash: ${hashText(clipOriginal)}\n---\nPrivate duplicate`);
  snapshot = await f.load(); const reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision); assert.equal(reviewed.matches.length, 1); assert.match(reviewed.matches[0]!.reason, /Same recorded URL/); assert.ok(!JSON.stringify(reviewed).includes("Private/Secret")); await assert.rejects(f.intake.prepareClip(snapshot.id, reviewed.id, false, f.info.revision), /tick the box for a separate copy/);
  for (const input of [{ ...clipInput, project: "" }, { ...clipInput, project: "Private" }, { ...clipInput, path: "Private/Secret.md" }, { ...clipInput, name: "../Escape" }, { ...clipInput, arbitrary: "input" }]) await assert.rejects(f.intake.reviewClip(snapshot.id, input, f.info.revision));
  await f.put("Inbox/Managed.md", '---\ntype: source\ncaptured_on: 2026-10-01\nthread_capture_kind: thought\n---\nManaged record'); snapshot = await f.load(); assert.ok(!snapshot.clips.some(clip => clip.path === "Projects/Demo/Overview.md")); assert.ok(snapshot.clips.some(clip => clip.path === clipInput.path)); assert.ok(!snapshot.clips.some(clip => clip.path === "Inbox/Managed.md")); assert.match(snapshot.coverage, /Thread's own notes are skipped, and other record notes are refused when you check them/); await assert.rejects(f.intake.reviewClip(snapshot.id, { ...clipInput, path: "Inbox/Managed.md" }, f.info.revision), /from the list/);
  await f.put("Inbox/Hidden marker.md", 'Ordinary note with an inline <!-- thread:output --> marker'); snapshot = await f.load(); await assert.rejects(f.intake.reviewClip(snapshot.id, { ...clipInput, path: "Inbox/Hidden marker.md" }, f.info.revision), /managed/);
});
test("clip proposals reject new catalog matches, stale sources/project identities, cancellation and revocation", async t => {
  const f = await fixture(t); await f.put(clipInput.path, clipOriginal); let snapshot = await f.load(), reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision);
  f.intake.draftChanged(); await assert.rejects(f.intake.prepareClip(snapshot.id, reviewed.id, true, f.info.revision), /Check the chosen clip again/);
  reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision); await f.put(clipInput.path, clipOriginal + "External addition"); await assert.rejects(f.intake.prepareClip(snapshot.id, reviewed.id, false, f.info.revision), /changed|Refresh/);
  snapshot = await f.load(); reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision); await f.put("Projects/Demo/Overview.md", f.original.replace("id: demo", "id: replacement")); await assert.rejects(f.intake.prepareClip(snapshot.id, reviewed.id, false, f.info.revision), /changed|Refresh/);
  snapshot = await f.load(); reviewed = await f.intake.reviewClip(snapshot.id, clipInput, f.info.revision); await f.intake.prepareClip(snapshot.id, reviewed.id, false, f.info.revision); const preview = await f.changes.preview("apply", f.changes.snapshot(f.info.revision).pending!.id, f.info.revision); assert.equal(preview.ready, true); await f.put("Sources/New.md", "New permitted source"); await assert.rejects(f.changes.confirm(preview.id, f.info.revision), /changed|stale|conflict/i);
  snapshot = await f.load(); const delayed = f.intake.reviewClip(snapshot.id, clipInput, f.info.revision), canceled = assert.rejects(delayed, /changed|canceled/); f.intake.draftChanged(); await canceled;
  const revoked = f.intake.reviewClip(snapshot.id, clipInput, f.info.revision), denied = assert.rejects(revoked, /changed|Refresh/); f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.index.reset(); f.intake.invalidate(); await denied; await assert.rejects(f.read("Sources/Reviewed clip.md"), { code: "ENOENT" });
});
