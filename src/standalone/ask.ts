import { randomUUID } from "node:crypto";
import { conversationContext, conversationPrompt, snapshotTurn, MAX_CONVERSATION_TURNS, type ConversationTurn } from "../intelligence/conversation.ts";
import { createAnswerRecord, reviewedAnswerMarkdown, validateCorrection } from "../vault/answer-record.ts";
import { createConversationRecord, conversationMarkdown } from "../vault/conversation-record.ts";
import { noteName } from "../vault/workspace.ts";
import { defaultSettings } from "../settings/settings.ts";
import { ANSWER_SCHEMA, validateAnswer } from "../intelligence/answer.ts";
import { searchBudget, searchLevels } from "../retrieval/budget.ts";
import { filterEntries, normalizeFilters, searchEntries, type SearchResult } from "../retrieval/search.ts";
import { SemanticSearch, semanticCandidates } from "../retrieval/semantic.ts";
import { buildEvidence } from "../vault/evidence.ts";
import { hitsToNotes, identityFromIndex, type IndexEntry } from "../vault/index.ts";
import { contentHash } from "../vault/scope.ts";
import { selectContext, type EvidenceChoice } from "../vault/workbench.ts";
import type { AskAnswer, AskContext, AskRequest, AskSnapshot, IndexSnapshot } from "./contracts.ts";
import type { DesktopAI } from "./local-ai.ts";
import type { DesktopProjects } from "./projects.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { VaultReader } from "./vault-reader.ts";
import { DesktopError } from "./security.ts";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Invalid Ask options. Retrieve evidence again.");
  return value as Record<string, unknown>;
}
function request(value: unknown): AskRequest {
  const input = record(value), filters = record(input.filters);
  if (Object.keys(input).sort().join(",") !== "embeddingModel,filters,level,method,question,scope,selection" ||
    typeof input.question !== "string" || !input.question.trim() || input.question.length > 1000 ||
    typeof input.scope !== "string" || !["project", "vault"].includes(input.scope) || typeof input.method !== "string" || !["keyword", "hybrid"].includes(input.method) ||
    typeof input.level !== "string" || !searchLevels.includes(input.level as AskRequest["level"]) || typeof input.embeddingModel !== "string" || input.embeddingModel.length > 200 ||
    /[\s\u0000-\u001f]/.test(input.embeddingModel) || /(?:[:/-])cloud(?:$|[:/])/i.test(input.embeddingModel) ||
    Object.entries(filters).some(([key, value]) => !["type", "status", "path", "from", "through"].includes(key) || typeof value !== "string" || value.length > 512)) {
    throw new DesktopError("Review the question (1-1000 characters), search filters, budget and local model selection.");
  }
  try { return { ...input, question: input.question.trim(), filters: normalizeFilters(filters) } as unknown as AskRequest; }
  catch { throw new DesktopError("Review filter paths and YYYY-MM-DD date range. Type/status filters allow 100 characters."); }
}

/** One volatile workbench. All prompts and contexts are assembled in main. */
export class DesktopAsk {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private projects: DesktopProjects;
  private ai: DesktopAI;
  private semantic = new SemanticSearch();
  private prepared: { value: AskSnapshot; version: number; hashes: Record<string, string> } | null = null;
  private context: AskContext | null = null;
  private epoch = 0;
  private answer: AskAnswer | null = null;
  private turns: ConversationTurn[] = [];
  private choices: Record<string, EvidenceChoice> = {};
  constructor(reader: VaultReader, evidence: EvidenceIndex, projects: DesktopProjects, ai: DesktopAI) {
    this.reader = reader; this.evidence = evidence; this.projects = projects; this.ai = ai;
  }
  forget(): void { this.epoch++; this.prepared = null; this.context = null; this.answer = null; this.turns = []; this.choices = {}; this.semantic.clear(); this.ai.cancel(); }
  private hashes(entries: IndexEntry[]): Record<string, string> {
    const graph = this.evidence.index.graph(this.evidence.scope()), hashes: Record<string, string> = {};
    for (const entry of entries) Object.assign(hashes, graph.assess(entry.path).dependencies, { [entry.path]: entry.hash });
    return hashes;
  }
  private async verify(snapshot: IndexSnapshot, hashes: Record<string, string>, current: () => void): Promise<void> {
    current(); await this.evidence.refresh(snapshot.revision); current(); this.evidence.assertCurrent(snapshot);
    for (const [path, hash] of Object.entries(hashes)) {
      current(); this.evidence.assertCurrent(snapshot);
      const file = snapshot.listing.files[path];
      if (!file || await contentHash((await this.reader.read(path, snapshot.revision, file.bytes)).text) !== hash) throw new DesktopError("Ask sources changed. Retrieve evidence again.");
    }
    await this.evidence.refresh(snapshot.revision); current(); this.evidence.assertCurrent(snapshot);
  }
  async retrieve(input: unknown, revision: unknown): Promise<AskSnapshot> {
    const options = request(input); this.forget(); const epoch = this.epoch, version = this.ai.version;
    return this.ai.run(async (_settings, signal, current, client) => {
      const guard = (): void => { current(); if (epoch !== this.epoch || version !== this.ai.version) throw new DesktopError("Ask changed. Retrieve again."); };
      const home = await this.projects.home(options.selection, revision); guard();
      if (options.scope === "project" && !home.home) throw new DesktopError("Choose a permitted project, or explicitly select all permitted notes.");
      const snapshot = home.index, entries = this.evidence.index.projectEntries(this.evidence.scope(), options.scope === "vault" ? null : options.selection.project);
      const budget = searchBudget(options.level); let search: SearchResult;
      if (options.method === "hybrid" && options.embeddingModel) {
        const selection = await semanticCandidates(filterEntries(entries, options.filters), options.question, options.level, signal, () => { guard(); return true; });
        const hashes = this.hashes([...new Map(selection.candidates.map(hit => [hit.entry.path, hit.entry])).values()]);
        const verify = () => this.verify(snapshot, hashes, guard);
        await verify();
        search = await this.semantic.search(entries, options.question, options.filters, options.embeddingModel, client(verify), signal,
          () => { guard(); this.evidence.assertCurrent(snapshot); return true; }, options.level, selection);
        await verify();
        // Provider JSON parser errors can contain response fragments. Never echo them.
        if (search.hybrid?.mode === "keyword-fallback") search.hybrid.reason = "Local embeddings unavailable or incompatible. Check the downloaded embedding model and local connection.";
      } else {
        try { search = searchEntries(entries, options.question, options.filters, budget.results); }
        catch { throw new DesktopError("Invalid search. Close quoted phrases and use at most eight phrases."); }
        if (options.method === "hybrid") search.hybrid = { mode: "keyword-fallback", model: "", candidatePassages: 0, availablePassages: 0, semanticMatches: 0,
          returnedPassages: search.hits.length, level: options.level, reason: "No embedding model selected." };
      }
      search.coverage = { ...search.coverage, level: options.level, indexOmittedNotes: snapshot.coverage.omittedFiles };
      const hashes = this.hashes([...new Map(search.hits.map(hit => [hit.entry.path, hit.entry])).values()]);
      await this.verify(snapshot, hashes, guard);
      const bundle = { ...await buildEvidence(hitsToNotes(search.hits)), searchCoverage: search.coverage, ...(search.hybrid ? { hybridCoverage: search.hybrid } : {}) };
      guard(); this.evidence.assertCurrent(snapshot);
      const result: AskSnapshot = { id: randomUUID(), request: options, index: snapshot, bundle, history: [] };
      this.prepared = { value: result, version, hashes }; return structuredClone(result);
    });
  }
  private active(identity: unknown, revision: unknown) {
    const prepared = this.prepared;
    if (!prepared || typeof identity !== "string" || identity !== prepared.value.id || revision !== prepared.value.index.revision || prepared.version !== this.ai.version) throw new DesktopError("Ask context changed. Retrieve evidence again.");
    this.evidence.assertCurrent(prepared.value.index); return prepared;
  }
  async choose(identity: unknown, input: unknown, revision: unknown): Promise<AskContext> {
    const prepared = this.active(identity, revision), choices = record(input);
    if (Object.keys(choices).length > prepared.value.bundle.sources.length || Object.entries(choices).some(([id, choice]) =>
      !prepared.value.bundle.sources.some(s => s.id === id) || typeof choice !== "string" || !["include", "exclude", "pin"].includes(choice))) throw new DesktopError("Invalid evidence choices. Use current passage IDs and Include, Pin first or Exclude.");
    this.context = null; this.answer = null; const epoch = ++this.epoch;
    return this.ai.run(async (_settings, _signal, current) => {
      const guard = (): void => { current(); if (epoch !== this.epoch || this.active(identity, revision) !== prepared) throw new DesktopError("Ask choices changed. Preview again."); };
      await this.verify(prepared.value.index, prepared.hashes, guard);
      const bundle = selectContext(prepared.value.bundle, choices as Record<string, EvidenceChoice>);
      const result = { id: randomUUID(), retrievalId: prepared.value.id, bundle, conversation: conversationContext(this.turns, bundle) };
      guard(); this.choices = { ...choices } as Record<string, EvidenceChoice>; this.context = result; return structuredClone(result);
    });
  }
  async generate(identity: unknown, revision: unknown): Promise<AskAnswer> {
    const context = this.context;
    if (!context || typeof identity !== "string" || identity !== context.id) throw new DesktopError("Exact context changed. Review the renewed source context before generating.");
    const prepared = this.active(context.retrievalId, revision), epoch = this.epoch; this.answer = null;
    return this.ai.run(async (settings, signal, current, client) => {
      const guard = (): void => { current(); if (epoch !== this.epoch || this.context !== context || this.active(context.retrievalId, revision) !== prepared) throw new DesktopError("Ask context changed. Retrieve again."); };
      if (!settings.model) throw new DesktopError("Apply a downloaded text model in Optional local AI to generate an answer. Keyword retrieval remains available.");
      if (!context.bundle.sources.length) throw new DesktopError("Include at least one passage before generating.");
      const verify = () => this.verify(prepared.value.index, prepared.hashes, guard);
      await verify();
      const raw = await client(verify).generate(settings.model, conversationPrompt(prepared.value.request.question, context.bundle, this.turns).prompt, signal, ANSWER_SCHEMA);
      guard(); const answer = validateAnswer(raw, context.bundle); await verify();
      const result = { id: randomUUID(), turnNumber: this.turns.length + 1, corrections: {}, contextId: context.id, answer, model: settings.model, generatedAt: Date.now() };
      this.answer = result; return structuredClone(result);
    });
  }
  private answered(identity: unknown, revision: unknown): { answer: AskAnswer; context: AskContext; prepared: NonNullable<DesktopAsk["prepared"]> } {
    const answer = this.answer, context = this.context;
    if (!answer || typeof identity !== "string" || answer.id !== identity || !context || answer.contextId !== context.id) throw new DesktopError("Answer or correction changed. Review the current answer again.");
    return { answer, context, prepared: this.active(context.retrievalId, revision) };
  }
  private turn(answer: AskAnswer, context: AskContext, prepared: NonNullable<DesktopAsk["prepared"]>): ConversationTurn {
    const input = prepared.value.request, settings = defaultSettings(); settings.model = answer.model; settings.selectedProject = input.selection.project;
    const scope = this.reader.getInfo()!.scope; settings.allowedPaths = [...scope.roots]; settings.excludedPaths = [...scope.excluded];
    settings.roles.projects = input.selection.folder; settings.embeddingModel = input.embeddingModel;
    const projectIdentity = input.scope === "vault" ? "" : identityFromIndex(this.evidence.index.entries, input.selection.project, this.evidence.index.ready, this.evidence.index.identityComplete);
    return snapshotTurn({ question: input.question, answer: answer.answer, corrections: answer.corrections, bundle: context.bundle, choices: this.choices,
      generatedAt: new Date(answer.generatedAt).toISOString(), settings, vault: input.scope === "vault", projectIdentity }, this.turns.length);
  }
  async correct(identity: unknown, index: unknown, text: unknown, kind: unknown, revision: unknown): Promise<AskAnswer> {
    const { answer, context, prepared } = this.answered(identity, revision), epoch = this.epoch;
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= answer.answer.answer.length || !answer.answer.supported) throw new DesktopError("Choose a current supported claim to correct.");
    let correction;
    try { correction = validateCorrection({ text, kind, correctedAt: new Date().toISOString() }); }
    catch { throw new DesktopError("Use a nonempty correction of up to 1200 characters and a known classification. Sources remain unchanged."); }
    const corrections = { ...answer.corrections, [index as number]: correction };
    return this.ai.run(async (_settings, _signal, current) => {
      const guard = (): void => { current(); if (epoch !== this.epoch || this.answered(identity, revision).answer !== answer) throw new DesktopError("Answer changed. Review again."); };
      await this.verify(prepared.value.index, prepared.hashes, guard);
      createAnswerRecord(prepared.value.request.question, answer.answer, context.bundle, answer.model, new Date(answer.generatedAt).toISOString(), corrections);
      guard(); this.answer = { ...answer, id: randomUUID(), corrections }; return structuredClone(this.answer);
    });
  }
  async continue(identity: unknown, question: unknown, revision: unknown): Promise<AskSnapshot> {
    const { answer, context, prepared } = this.answered(identity, revision), epoch = this.epoch;
    if (typeof question !== "string" || !question.trim() || question.length > 1000) throw new DesktopError("Enter a follow-up question of 1-1000 characters.");
    if (this.turns.length >= MAX_CONVERSATION_TURNS - 1) throw new DesktopError("Six-turn conversation limit reached. Start a new conversation.");
    return this.ai.run(async (_settings, _signal, current) => {
      const guard = (): void => { current(); if (epoch !== this.epoch || this.answered(identity, revision).answer !== answer) throw new DesktopError("Answer changed. Start again."); };
      await this.verify(prepared.value.index, prepared.hashes, guard);
      const turn = this.turn(answer, context, prepared); guard(); this.turns.push(turn);
      const value: AskSnapshot = { ...prepared.value, id: randomUUID(), request: { ...prepared.value.request, question: question.trim() },
        history: this.turns.map(({ question, answer, corrections }) => structuredClone({ question, answer, corrections })) };
      this.prepared = { ...prepared, value }; this.context = null; this.answer = null; this.epoch++; return structuredClone(value);
    });
  }

  artifact(identity: unknown, kind: unknown, title: unknown, selected: unknown, revision: unknown): { content: string; project: string; assert: () => void; validate: () => Promise<void> } {
    const { answer, context, prepared } = this.answered(identity, revision), epoch = this.epoch;
    if (kind !== "answer" && kind !== "conversation" || typeof title !== "string" || title !== noteName(title) || !Array.isArray(selected)
      || selected.length > 6 || selected.some(n => typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > answer.turnNumber) || new Set(selected).size !== selected.length) throw new DesktopError("Choose a valid new note name and current completed turns.");
    const turn = this.turn(answer, context, prepared), turns = [...this.turns, turn];
    const content = kind === "answer"
      ? reviewedAnswerMarkdown(createAnswerRecord(turn.question, turn.answer, turn.bundle, answer.model, turn.generatedAt, answer.corrections), turn.bundle, turn.projectIdentity)
      : conversationMarkdown(createConversationRecord(title, turns, selected as number[]));
    const hashes = { ...prepared.hashes };
    // A saved transcript may contain earlier evidence omitted from the latest prompt.
    if (kind === "conversation") for (const n of selected as number[]) Object.assign(hashes, turns[n - 1]!.bundle.noteHashes);
    const assert = (): void => { if (epoch !== this.epoch || this.answered(identity, revision).answer !== answer) throw new DesktopError("Answer or evidence changed. Renew the exact save preview."); };
    return { content, project: turn.vault ? "" : turn.settings.selectedProject, assert,
      validate: () => this.verify(prepared.value.index, hashes, assert) };
  }

}
