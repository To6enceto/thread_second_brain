import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DesktopAsk } from "./ask.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopProjects } from "./projects.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { VaultReader } from "./vault-reader.ts";
import type { AskRequest } from "./contracts.ts";

const options: AskRequest = { question: "orchid budget", selection: { folder: "Projects", project: "Projects/Demo" }, scope: "project", filters: {}, method: "keyword", embeddingModel: "", level: "standard" };
function provider() {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let hook: ((path: string, body: Record<string, unknown>) => Promise<Response | void>) | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname, body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    calls.push({ path, body }); const override = await hook?.(path, body); if (override) return override;
    let data: unknown;
    if (path === "/api/status") data = { cloud: { disabled: true } };
    else if (path === "/api/tags") data = { models: ["text:local", "embed:local"].map(name => ({ name, digest: "a".repeat(64) })) };
    else if (path === "/api/show") data = { capabilities: [body.model === "embed:local" ? "embedding" : "completion"], model_info: { architecture: "fixture" } };
    else if (path === "/api/embed") data = { model: "embed:local", embeddings: (body.input as string[]).map(() => [1, 0, 0]) };
    else if (path === "/api/chat") {
      const prompt = JSON.parse((body.messages as { content: string }[])[1]!.content);
      data = { message: { content: JSON.stringify({ supported: true, answer: [{ text: prompt.evidence[0].excerpt, kind: "fact", sourceIds: [prompt.evidence[0].id] }], gaps: [] }) } };
    }
    return new Response(JSON.stringify(data));
  };
  return { calls, fetcher, hook(fn: typeof hook) { hook = fn; } };
}
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), "thread-ask-")); t.after(() => rm(root, { recursive: true, force: true }));
  const notes = {
    "Projects/Demo/Overview.md": "---\ntype: project\nid: demo\n---\n## Budget\nOrchid budget is 20 euros.\n## Constraints\nLive voice is postponed.",
    "Projects/Demo/Decision.md": "---\ntype: decision\nstatus: proposed\ncreated: 2026-10-21\n---\n## Choice\nProposed orchid budget is 30 euros.",
    "Projects/Other/Overview.md": "---\ntype: project\n---\n## Objective\nOther orchid budget is 90 euros.",
    "Projects/Private/Secret.md": "Orchid budget secret 999 euros.",
  };
  for (const [path, text] of Object.entries(notes)) { await mkdir(join(root, path, ".."), { recursive: true }); await writeFile(join(root, path), text); }
  const reader = new VaultReader(); let ai: DesktopAI | undefined, ask: DesktopAsk | undefined;
  const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") { ai?.forget(); ask?.forget(); } });
  let info = await reader.select(root); info = reader.grant({ roots: ["Projects"], excluded: ["Projects/Private"] }, info.revision);
  const projects = new DesktopProjects(reader, evidence), p = provider();
  ai = new DesktopAI(projects, evidence, p.fetcher, 5000); ask = new DesktopAsk(reader, evidence, projects, ai);
  await evidence.refresh(info.revision);
  return { reader, evidence, projects, ai, ask, info, root, p, notes, configure: () => ai!.configure({ endpoint: "http://localhost:11434", model: "text:local" }) };
}

test("desktop Ask keyword scope, filters and omissions work without AI and cannot expand grants", async t => {
  const f = await fixture(t), before = f.reader.getInfo();
  const project = await f.ask.retrieve(options, f.info.revision);
  assert.ok(project.bundle.sources.length); assert.ok(project.bundle.sources.every(s => s.path.startsWith("Projects/Demo/")));
  const all = await f.ask.retrieve({ ...options, scope: "vault" }, f.info.revision);
  assert.ok(all.bundle.sources.some(s => s.path.startsWith("Projects/Other/")));
  assert.ok(all.bundle.sources.every(s => !s.path.startsWith("Projects/Private/") && !s.excerpt.includes("Orchid budget secret 999 euros.")));
  assert.ok(all.index.listing.paths.every(path => !path.startsWith("Projects/Private/")));
  const filtered = await f.ask.retrieve({ ...options, filters: { type: "decision", status: "proposed", path: "Projects/Demo", from: "2026-10-20", through: "2026-10-22" } }, f.info.revision);
  assert.equal(filtered.bundle.sources.length, 1); assert.equal(filtered.bundle.sources[0]!.noteStatus, "proposed");
  assert.equal(f.p.calls.length, 0); assert.deepEqual(f.reader.getInfo(), before);
  for (const patch of [{ question: "" }, { question: "x".repeat(1001) }, { method: "cloud" }, { filters: { path: "../Secret" } }, { filters: { from: "2026-02-30" } }, { filters: { type: 3 } }, { level: "unlimited" }, { embeddingModel: "foo:cloud" }, { selection: { folder: "Projects", project: "Projects/Private" } }]) await assert.rejects(f.ask.retrieve({ ...options, ...patch }, f.info.revision));
});

test("desktop exact contexts bind current passage choices and exclude text from the main-owned prompt", async t => {
  const f = await fixture(t); f.configure(); const result = await f.ask.retrieve(options, f.info.revision);
  const [excluded, pinned] = result.bundle.sources; assert.ok(excluded && pinned);
  for (const choices of [{ X9: "pin" }, { [excluded.id]: "other" }]) await assert.rejects(f.ask.choose(result.id, choices, f.info.revision));
  await assert.rejects(f.ask.choose("forged", {}, f.info.revision));
  const first = await f.ask.choose(result.id, {}, f.info.revision);
  const selected = await f.ask.choose(result.id, { [excluded.id]: "exclude", [pinned.id]: "pin" }, f.info.revision);
  assert.equal(selected.bundle.sources[0]!.id, pinned.id); assert.ok(!selected.bundle.sources.some(s => s.id === excluded.id));
  await assert.rejects(f.ask.generate(first.id, f.info.revision), /will see changed/);
  // A renderer-side mutation must not change the main-owned prompt.
  selected.bundle.sources[0]!.excerpt = "forged renderer text";
  const answer = await f.ask.generate(selected.id, f.info.revision); assert.equal(answer.answer.supported, true);
  const chat = f.p.calls.find(c => c.path === "/api/chat")!;
  const prompt = JSON.parse((chat.body.messages as { content: string }[])[1]!.content);
  assert.equal(prompt.question, options.question); assert.equal(prompt.evidence[0].excerpt, pinned.excerpt);
  assert.ok(!JSON.stringify(prompt).includes(excluded.excerpt)); assert.ok(!JSON.stringify(prompt).includes("forged renderer"));
  const empty = await f.ask.choose(result.id, Object.fromEntries(result.bundle.sources.map(s => [s.id, "exclude"])), f.info.revision);
  await assert.rejects(f.ask.generate(empty.id, f.info.revision), /Include at least/);
});

test("desktop hybrid sends only scoped filtered current candidates and discloses keyword fallback", async t => {
  const f = await fixture(t);
  const hybrid = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local", filters: { type: "decision" }, level: "broader" }, f.info.revision);
  assert.equal(hybrid.bundle.hybridCoverage?.mode, "hybrid"); assert.equal(hybrid.bundle.searchCoverage?.level, "broader");
  const sent = f.p.calls.filter(c => c.path === "/api/embed").flatMap(c => c.body.input as string[]).join(" ");
  assert.match(sent, /30 euros/); assert.ok(!/999|90 euros|20 euros/.test(sent));
  const missing = await f.ask.retrieve({ ...options, method: "hybrid" }, f.info.revision);
  assert.equal(missing.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(missing.bundle.sources.length);
  f.p.hook(async path => path === "/api/embed" ? new Response("private body", { status: 503 }) : undefined);
  const failed = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision);
  assert.equal(failed.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(!JSON.stringify(failed).includes("private body"));
  f.p.hook(async path => path === "/api/embed" ? new Response("private invalid provider body") : undefined);
  const malformed = await f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision);
  assert.equal(malformed.bundle.hybridCoverage?.mode, "keyword-fallback"); assert.ok(!JSON.stringify(malformed).includes("private invalid"));
});

test("desktop Ask rechecks external edits after model metadata and before any evidence transmission", async t => {
  for (const mode of ["chat", "embed"] as const) {
    const f = await fixture(t); f.configure();
    const found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
    f.p.hook(async path => { if (path === "/api/show") await writeFile(join(f.root, "Projects/Demo/Overview.md"), "Changed externally."); });
    await assert.rejects(mode === "chat" ? f.ask.generate(chosen.id, f.info.revision) : f.ask.retrieve({ ...options, method: "hybrid", embeddingModel: "embed:local" }, f.info.revision));
    assert.ok(!f.p.calls.some(c => c.path === "/api/chat" || c.path === "/api/embed"));
  }
});

test("desktop Ask suppresses replies after cancel, model change, source edit, choices and access revocation", async t => {
  for (const change of ["cancel", "model", "edit", "choices", "revoke"] as const) {
    const f = await fixture(t); f.configure(); const found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
    let entered!: () => void, release!: () => void;
    const atChat = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    f.p.hook(async path => { if (path === "/api/chat") { entered(); await gate; } });
    const run = f.ask.generate(chosen.id, f.info.revision), rejected = assert.rejects(run); await atChat;
    if (change === "cancel") f.ai.cancel();
    if (change === "model") f.ai.configure({ endpoint: "http://localhost:11434", model: "other:local" });
    if (change === "edit") await writeFile(join(f.root, "Projects/Demo/Overview.md"), "Changed externally.");
    if (change === "choices") await f.ask.choose(found.id, { [found.bundle.sources[0]!.id]: "exclude" }, f.info.revision);
    if (change === "revoke") { f.reader.grant({ roots: [], excluded: [] }, f.info.revision); f.ask.forget(); f.evidence.reset(); }
    release(); await rejected;
    if (change === "cancel") { f.p.hook(undefined); assert.equal((await f.ask.generate(chosen.id, f.info.revision)).answer.supported, true); }
  }
});

test("desktop Ask invalid citations/malformed answers fail safely and missing text model leaves retrieval usable", async t => {
  const f = await fixture(t); let found = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(found.id, {}, f.info.revision);
  await assert.rejects(f.ask.generate(chosen.id, f.info.revision), /set up a model under Optional local AI/);
  f.configure(); await assert.rejects(f.ask.choose(found.id, {}, f.info.revision), /passages changed/);
  found = await f.ask.retrieve(options, f.info.revision); chosen = await f.ask.choose(found.id, {}, f.info.revision);
  f.p.hook(async path => path === "/api/chat" ? new Response(JSON.stringify({ message: { content: JSON.stringify({ supported: true, answer: [{ text: "Made up", kind: "fact", sourceIds: ["X99"] }], gaps: [] }) } })) : undefined);
  const result = await f.ask.generate(chosen.id, f.info.revision); assert.equal(result.answer.supported, false); assert.deepEqual(result.answer.answer, []);
  f.p.hook(async path => path === "/api/chat" ? new Response(JSON.stringify({ message: { content: "private invalid output" } })) : undefined);
  await assert.rejects(f.ask.generate(chosen.id, f.info.revision), error => error instanceof Error && /invalid JSON/.test(error.message) && !error.message.includes("private"));
});

test("desktop IPC rejects non-string scope, method, budget and evidence choice enums without coercion", async t => {
  const f = await fixture(t);
  for (const [key, valid] of [["scope", "project"], ["method", "keyword"], ["level", "standard"]]) {
    for (const invalid of [[valid], { value: valid }, null, 1, true]) {
      await assert.rejects(f.ask.retrieve({ ...options, [key!]: invalid, selection: { folder: "Projects", project: "" } }, f.info.revision), /Check the question/);
    }
  }
  const found = await f.ask.retrieve(options, f.info.revision), id = found.bundle.sources[0]!.id;
  for (const valid of ["include", "exclude", "pin"]) {
    for (const invalid of [[valid], { value: valid }, null, 1, true]) await assert.rejects(f.ask.choose(found.id, { [id]: invalid }, f.info.revision), /Passage choices are not valid/);
  }
  const excluded = await f.ask.choose(found.id, { [id]: "exclude" }, f.info.revision);
  assert.ok(!excluded.bundle.sources.some(source => source.id === id));
  assert.equal(f.p.calls.length, 0);
});

test("desktop follow-ups preserve original provenance and corrected context, using current evidence only", async t => {
  const f = await fixture(t); f.configure(); let found = await f.ask.retrieve(options, f.info.revision);
  const first = await f.ask.choose(found.id, {}, f.info.revision), original = await f.ask.generate(first.id, f.info.revision);
  const corrected = await f.ask.correct(original.id, 0, "Treat the recorded budget as a proposed limit.", "suggestion", f.info.revision);
  assert.notEqual(corrected.id, original.id); assert.deepEqual(corrected.answer, original.answer); assert.equal(corrected.generatedAt, original.generatedAt); assert.equal(corrected.model, original.model);
  assert.equal(corrected.corrections[0]!.kind, "suggestion");
  await assert.rejects(f.ask.continue(original.id, "What does that mean?", f.info.revision), /answer or a correction changed/);
  found = await f.ask.continue(corrected.id, "What does that mean?", f.info.revision);
  assert.equal(found.history.length, 1); found.history[0]!.corrections[0]!.text = "FORGED RENDERER HISTORY";
  const next = await f.ask.choose(found.id, {}, f.info.revision);
  assert.equal(next.conversation.turns[0]!.claims[0]!.text, "Treat the recorded budget as a proposed limit."); assert.equal(next.conversation.turns[0]!.claims[0]!.userCorrected, true);
  const answer = await f.ask.generate(next.id, f.info.revision); assert.equal(answer.turnNumber, 2);
  const chat = f.p.calls.filter(call => call.path === "/api/chat").at(-1)!;
  const prompt = JSON.parse((chat.body.messages as { content: string }[])[1]!.content);
  assert.deepEqual(prompt.earlierConversation, next.conversation.turns); assert.deepEqual(prompt.evidence, next.bundle.sources); assert.ok(!JSON.stringify(prompt).includes("FORGED RENDERER"));
});

test("desktop evidence exclusions omit earlier response text, and six-turn limit prevents unbounded continuation", async t => {
  const f = await fixture(t); f.configure(); let found = await f.ask.retrieve(options, f.info.revision);
  let context = await f.ask.choose(found.id, {}, f.info.revision), answer = await f.ask.generate(context.id, f.info.revision);
  found = await f.ask.continue(answer.id, "Continue with only one passage", f.info.revision);
  const excluded = found.bundle.sources[0]!.id;
  context = await f.ask.choose(found.id, { [excluded]: "exclude" }, f.info.revision);
  assert.equal(context.conversation.turns.length, 0); assert.deepEqual(context.conversation.omitted, [{ turn: 1, reason: "evidence selection" }]);
  answer = await f.ask.generate(context.id, f.info.revision);
  const chat = f.p.calls.filter(call => call.path === "/api/chat").at(-1)!;
  assert.deepEqual(JSON.parse((chat.body.messages as { content: string }[])[1]!.content).earlierConversation, []);
  for (let number = 3; number <= 6; number++) {
    found = await f.ask.continue(answer.id, `Follow-up ${number}`, f.info.revision);
    context = await f.ask.choose(found.id, { [excluded]: "exclude" }, f.info.revision);
    answer = await f.ask.generate(context.id, f.info.revision); assert.equal(answer.turnNumber, number);
  }
  const count = f.p.calls.length; await assert.rejects(f.ask.continue(answer.id, "Turn seven", f.info.revision), /six-question limit/); assert.equal(f.p.calls.length, count);
  const reset = await f.ask.retrieve(options, f.info.revision); assert.deepEqual(reset.history, []);
});

test("desktop correction and follow-up identities reject invalid input and stale sources, models and revoked grants", async t => {
  const f = await fixture(t); f.configure(); const found = await f.ask.retrieve(options, f.info.revision), context = await f.ask.choose(found.id, {}, f.info.revision);
  const answer = await f.ask.generate(context.id, f.info.revision);
  for (const [index, text, kind] of [["0", "valid", "fact"], [0, " ", "fact"], [0, "x".repeat(1201), "fact"], [0, "text", ["fact"]], [9, "text", "fact"]]) await assert.rejects(f.ask.correct(answer.id, index, text, kind, f.info.revision));
  for (const question of ["", ["question"], "x".repeat(1001)]) await assert.rejects(f.ask.continue(answer.id, question, f.info.revision));
  await writeFile(join(f.root, "Projects/Demo/Overview.md"), f.notes["Projects/Demo/Overview.md"] + "\nExternal edit");
  const requestsBeforeEdit = f.p.calls.length;
  await assert.rejects(f.ask.correct(answer.id, 0, "changed", "interpretation", f.info.revision), /AI canceled/);
  await assert.rejects(f.ask.continue(answer.id, "Next", f.info.revision), /answer or a correction changed/);
  assert.equal(f.p.calls.length, requestsBeforeEdit);
  const second = await f.ask.retrieve(options, f.info.revision), chosen = await f.ask.choose(second.id, {}, f.info.revision), fresh = await f.ask.generate(chosen.id, f.info.revision);
  f.configure(); await assert.rejects(f.ask.continue(fresh.id, "Next", f.info.revision), /changed/);
  f.reader.grant({ roots: [], excluded: [] }, f.info.revision);
  await assert.rejects(f.ask.correct(fresh.id, 0, "text", "fact", f.info.revision), /changed/);
});

async function saving(t: TestContext) {
  const f = await fixture(t); f.configure();
  const { DesktopStorage } = await import("./storage.ts"), { DesktopSaves } = await import("./saves.ts");
  const profile = await mkdtemp(join(tmpdir(), "thread-save-profile-")); t.after(() => rm(profile, { recursive: true, force: true }));
  const storage = new DesktopStorage(f.reader, profile); await storage.initialize(f.info.revision); t.after(() => storage.close());
  const compatibility = await storage.inspect(".obsidian", f.info.revision); await storage.enable(compatibility.id, f.info.revision);
  const saves = new DesktopSaves(f.reader, storage, f.ask);
  const found = await f.ask.retrieve(options, f.info.revision), context = await f.ask.choose(found.id, {}, f.info.revision), answer = await f.ask.generate(context.id, f.info.revision);
  return { ...f, profile, storage, saves, found, context, answer };
}

test("desktop exact answer and selected conversation saves retain correction provenance and refuse overwrites", async t => {
  const { readFile } = await import("node:fs/promises"), { metadata } = await import("./metadata.ts");
  const f = await saving(t), revision = f.info.revision;
  const corrected = await f.ask.correct(f.answer.id, 0, "Reviewed orchid budget: 20 euros.", "interpretation", revision);
  const first = await f.saves.prepare(corrected.id, "answer", "Reviewed budget", [1], revision);
  assert.match(first.content, /User correction/); assert.match(first.content, /Original model/); assert.ok(first.content.includes(corrected.model));
  const exact = first.content; first.content = "renderer forged"; first.path = "Projects/Private/forged.md";
  const saved = await f.saves.save(first.id, revision); assert.equal(await readFile(join(f.root, saved.path), "utf8"), exact);
  assert.equal(metadata(exact).type, "answer");
  const { answerRecordProjection } = await import("../vault/answer-record.ts"), { readSourceReferences } = await import("../vault/freshness.ts");
  assert.match(answerRecordProjection(exact, metadata(exact), readSourceReferences(metadata(exact).thread_sources)).text, /Reviewed orchid budget/);
  assert.equal(f.storage.status(revision).saves[0]!.status, "complete");
  // A new index generation is required after creation; retrieve starts a fresh conversation.
  await f.evidence.refresh(revision);
  const found = await f.ask.retrieve(options, revision), chosen = await f.ask.choose(found.id, {}, revision), answer = await f.ask.generate(chosen.id, revision);
  await assert.rejects(f.saves.prepare(answer.id, "answer", "Reviewed budget", [1], revision), /already exists/);
  const next = await f.ask.continue(answer.id, "What is deferred?", revision), context = await f.ask.choose(next.id, {}, revision), second = await f.ask.generate(context.id, revision);
  const conversation = await f.saves.prepare(second.id, "conversation", "Selected discussion", [2], revision);
  assert.match(conversation.content, /Turn 2/); assert.match(conversation.content, /not included in this save/);
  const result = await f.saves.save(conversation.id, revision); assert.equal(await readFile(join(f.root, result.path), "utf8"), conversation.content);
  assert.equal(metadata(conversation.content).type, "conversation");
  const { readConversationRecord } = await import("../vault/conversation-record.ts");
  assert.equal(readConversationRecord(conversation.content, metadata(conversation.content)).turns[0]!.number, 2);
});

test("desktop save previews revoke on source, choice, correction, draft, preferences and permission changes", async t => {
  const { readFile } = await import("node:fs/promises");
  for (const change of ["source", "choice", "correction", "draft", "preferences", "permission", "target"] as const) {
    const f = await saving(t), revision = f.info.revision, preview = await f.saves.prepare(f.answer.id, "answer", "Current answer", [1], revision);
    if (change === "source") await writeFile(join(f.root, "Projects/Demo/Overview.md"), "Externally changed");
    if (change === "choice") await f.ask.choose(f.found.id, {}, revision);
    if (change === "correction") await f.ask.correct(f.answer.id, 0, "Updated correction", "suggestion", revision);
    if (change === "draft") f.saves.revoke();
    if (change === "preferences") await f.storage.savePreferences({ ...f.storage.status(revision).preferences, model: "other:local" }, revision);
    if (change === "permission") f.reader.grant({ roots: [], excluded: [] }, revision);
    if (change === "target") { await mkdir(join(f.root, "Projects/Demo/Answers")); await writeFile(join(f.root, preview.path), "external note"); }
    await assert.rejects(f.saves.save(preview.id, revision));
    if (change === "target") assert.equal(await readFile(join(f.root, preview.path), "utf8"), "external note");
    else await assert.rejects(readFile(join(f.root, preview.path)), { code: "ENOENT" });
    if (change !== "permission") assert.equal(f.storage.status(revision).saves.length, 0);
  }
});

test("desktop interrupted receipt survives restart, blocks further saves and resolves without altering files", async t => {
  const { chmod, readFile } = await import("node:fs/promises"), { DesktopStorage } = await import("./storage.ts"), { DesktopSaves } = await import("./saves.ts");
  const f = await saving(t), revision = f.info.revision;
  await mkdir(join(f.root, "Projects/Demo/Answers"));
  const preview = await f.saves.prepare(f.answer.id, "answer", "Interrupted", [1], revision);
  await chmod(join(f.root, "Projects/Demo/Answers"), 0o500);
  try { await assert.rejects(f.saves.save(preview.id, revision), /unfinished save/); }
  finally { await chmod(join(f.root, "Projects/Demo/Answers"), 0o700); }
  const pending = f.storage.status(revision).saves[0]!; assert.equal(pending.status, "pending");
  await assert.rejects(f.saves.prepare(f.answer.id, "answer", "Another", [1], revision), /resolve unfinished saves/);
  await f.storage.close(); const restarted = new DesktopStorage(f.reader, f.profile); t.after(() => restarted.close());
  await restarted.initialize(revision); const compatibility = await restarted.inspect(".obsidian", revision); await restarted.enable(compatibility.id, revision);
  const saves = new DesktopSaves(f.reader, restarted, f.ask), recovery = await saves.inspectRecovery(pending.id, revision);
  assert.equal(recovery.present, false); assert.equal(recovery.content, preview.content);
  await assert.rejects(saves.resolveRecovery(recovery.id, "confirm", revision));
  await writeFile(join(f.root, preview.path), "later external note");
  await assert.rejects(saves.resolveRecovery(recovery.id, "leave", revision), /target changed/);
  const updated = await saves.inspectRecovery(pending.id, revision); await saves.resolveRecovery(updated.id, "leave", revision);
  assert.equal(restarted.status(revision).saves[0]!.status, "left"); assert.equal(await readFile(join(f.root, preview.path), "utf8"), "later external note");
});

test("desktop reconciliation confirms exact intended bytes only and preserves durable receipt limits", async t => {
  const { hashText } = await import("./profile.ts"), { readFile } = await import("node:fs/promises");
  const f = await saving(t), revision = f.info.revision;
  const path = "Projects/Demo/Interrupted.md", content = "# Intended exact bytes\n";
  await f.storage.owned(revision, (profile, current) => profile.store({ ...profile.state, saves: [{ id: "interrupted", path, content, hash: hashText(content), createdAt: new Date().toISOString(), status: "pending" }] }, current));
  await writeFile(join(f.root, path), content);
  const preview = await f.saves.inspectRecovery("interrupted", revision); assert.equal(preview.matches, true);
  preview.content = "forged renderer content"; await f.saves.resolveRecovery(preview.id, "confirm", revision);
  assert.equal(await readFile(join(f.root, path), "utf8"), content); assert.equal(f.storage.status(revision).saves[0]!.status, "complete");
  await f.storage.owned(revision, (profile, current) => profile.store({ ...profile.state, saves: Array.from({ length: 20 }, (_, n) => ({ ...profile.state.saves[0]!, id: `retained-${n}` })) }, current));
  await assert.rejects(f.saves.prepare(f.answer.id, "answer", "More", [1], revision), /Twenty/);
  assert.equal(f.storage.status(revision).saves.length, 20);
});
