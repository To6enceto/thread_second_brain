import { conversationContext, type ConversationTurn } from "../intelligence/conversation.ts";
import { escapeMarkdown, sourceReferences } from "../intelligence/answer.ts";
import { claimLabel } from "../intelligence/claims.ts";
import { createAnswerRecord, currentClaim, validateAnswerRecord, type AnswerRecord } from "./answer-record.ts";
import { readSourceReferences, type SourceReference } from "./freshness.ts";
import { vaultPath } from "./scope.ts";
import { frontmatter, noteName } from "./workspace.ts";

type SavedEvidence = SourceReference & { excerpt: string };
export interface SavedConversationTurn {
  number: number;
  supported: boolean;
  answer: AnswerRecord;
  evidence: SavedEvidence[];
  choices: ("include" | "pin")[];
  context: { included: number[]; omitted: { turn: number; reason: "evidence selection" | "character budget" }[] };
}
export interface ConversationRecord {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  scope: "project" | "allowed";
  projectPath: string;
  projectIdentity: string;
  turns: SavedConversationTurn[];
}
const maxRecordBytes = 262144, maxNoteBytes = 1048576;
const startMarker = "<!-- thread:conversation-record -->", endMarker = "<!-- /thread:conversation-record -->";
const bytes = (text: string) => new TextEncoder().encode(text).length;
const iso = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const text = (value: unknown, max: number): value is string => typeof value === "string" && !!value.trim() && value.length <= max;
function fields(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid conversation record object.");
  const result = value as Record<string, unknown>;
  if (required.some(key => !Object.hasOwn(result, key)) || Object.keys(result).some(key => !required.includes(key) && !optional.includes(key))) throw new Error("Unsupported conversation record fields.");
  return result;
}

function readEvidence(value: unknown): SavedEvidence[] {
  const refs = readSourceReferences(value);
  return refs.map((ref, i) => {
    const item = fields((value as unknown[])[i], ["path", "heading", "hash", "noteHash", "excerpt"], ["id", "noteType", "noteStatus", "pdf"]);
    if (!text(item.excerpt, 16000)) throw new Error("Invalid saved evidence excerpt.");
    return { ...ref, excerpt: item.excerpt };
  });
}

function strictReferences(value: unknown): SourceReference[] {
  const raw: unknown = typeof value === "string" ? JSON.parse(value) : value;
  const refs = readSourceReferences(raw);
  for (const item of raw as unknown[]) fields(item, ["path", "heading", "hash", "noteHash"], ["id", "noteType", "noteStatus", "pdf"]);
  return refs;
}

function unsupportedAnswer(value: unknown, refs: SourceReference[]): AnswerRecord {
  const answer = fields(value, ["schemaVersion", "question", "generatedAt", "model", "sourceIds", "claims", "gaps"]);
  if (answer.schemaVersion !== 1 || !text(answer.question, 1000) || !iso(answer.generatedAt) || !text(answer.model, 500)
    || !Array.isArray(answer.claims) || answer.claims.length || !Array.isArray(answer.sourceIds) || answer.sourceIds.length !== refs.length
    || !answer.sourceIds.every(id => typeof id === "string" && /^S[1-9]\d{0,2}$/.test(id)) || new Set(answer.sourceIds).size !== answer.sourceIds.length
    || !Array.isArray(answer.gaps) || answer.gaps.length > 12 || !answer.gaps.every(gap => typeof gap === "string" && gap.length <= 1200)) throw new Error("Invalid unsupported conversation answer.");
  return { schemaVersion: 1, question: answer.question, generatedAt: answer.generatedAt, model: answer.model,
    sourceIds: [...answer.sourceIds] as string[], claims: [], gaps: [...answer.gaps] as string[] };
}

export function conversationReferences(record: ConversationRecord): SourceReference[] {
  const distinct = new Map<string, SourceReference>();
  for (const turn of record.turns) for (const ref of readSourceReferences(turn.evidence)) distinct.set(JSON.stringify(ref), ref);
  const refs = [...distinct.values()];
  if (refs.length > 100) throw new Error("Selected turns exceed 100 distinct source references. Select fewer turns.");
  return refs;
}

export function validateConversationRecord(value: unknown): ConversationRecord {
  if (bytes(JSON.stringify(value)) > maxRecordBytes) throw new Error("Conversation record exceeds 256 KiB. Select fewer turns.");
  const record = fields(value, ["schemaVersion", "id", "title", "createdAt", "scope", "projectPath", "projectIdentity", "turns"]);
  if (record.schemaVersion !== 1 || typeof record.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(record.id)
    || !text(record.title, 100) || noteName(record.title) !== record.title || !iso(record.createdAt) || record.scope !== "project" && record.scope !== "allowed"
    || typeof record.projectPath !== "string" || typeof record.projectIdentity !== "string") throw new Error("Unsupported conversation identity or scope.");
  if (record.scope === "project" ? !text(record.projectPath, 4096) || vaultPath(record.projectPath) !== record.projectPath || !text(record.projectIdentity, 4096)
    : record.projectPath !== "" || record.projectIdentity !== "") throw new Error("Invalid saved project association.");
  if (!Array.isArray(record.turns) || !record.turns.length || record.turns.length > 6) throw new Error("Select one to six conversation turns.");
  let previous = 0;
  const turns: SavedConversationTurn[] = record.turns.map(value => {
    const turn = fields(value, ["number", "supported", "answer", "evidence", "choices", "context"]);
    if (typeof turn.number !== "number" || !Number.isInteger(turn.number) || turn.number <= previous || turn.number > 6 || typeof turn.supported !== "boolean") throw new Error("Invalid conversation turn order.");
    previous = turn.number;
    const evidence = readEvidence(turn.evidence);
    const answer = turn.supported ? validateAnswerRecord(turn.answer, evidence) : unsupportedAnswer(turn.answer, evidence);
    if (!Array.isArray(turn.choices) || turn.choices.length !== evidence.length || !turn.choices.every(choice => choice === "include" || choice === "pin")) throw new Error("Invalid chosen evidence intent.");
    const context = fields(turn.context, ["included", "omitted"]);
    if (!Array.isArray(context.included) || !Array.isArray(context.omitted) || context.included.length + context.omitted.length !== turn.number - 1) throw new Error("Invalid earlier-context coverage.");
    const included = context.included.map(n => {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n >= Number(turn.number)) throw new Error("Invalid earlier-context turn.");
      return n;
    });
    const omitted = context.omitted.map((item): SavedConversationTurn["context"]["omitted"][number] => {
      const v = fields(item, ["turn", "reason"]);
      if (typeof v.turn !== "number" || !Number.isInteger(v.turn) || v.turn < 1 || v.turn >= Number(turn.number)
        || v.reason !== "evidence selection" && v.reason !== "character budget") throw new Error("Invalid earlier-context omission.");
      return { turn: v.turn, reason: v.reason };
    });
    if (new Set([...included, ...omitted.map(v => v.turn)]).size !== turn.number - 1) throw new Error("Duplicate earlier-context turns.");
    return { number: turn.number, supported: turn.supported, answer, evidence, choices: [...turn.choices] as ("include" | "pin")[], context: { included, omitted } };
  });
  const result: ConversationRecord = { schemaVersion: 1, id: record.id, title: record.title, createdAt: record.createdAt,
    scope: record.scope as "project" | "allowed", projectPath: record.projectPath, projectIdentity: record.projectIdentity, turns };
  conversationReferences(result);
  return result;
}

export function createConversationRecord(title: string, turns: readonly ConversationTurn[], selected: readonly number[], id = crypto.randomUUID(), createdAt = new Date().toISOString()): ConversationRecord {
  if (!turns.length || turns.length > 6 || !selected.length || new Set(selected).size !== selected.length
    || selected.some(n => !Number.isInteger(n) || n < 1 || n > turns.length)) throw new Error("Select current completed turns before previewing.");
  const first = turns[0]!;
  if (turns.some(turn => turn.vault !== first.vault || turn.projectIdentity !== first.projectIdentity || JSON.stringify(turn.settings) !== JSON.stringify(first.settings))) throw new Error("Conversation scope changed. Start again.");
  return validateConversationRecord({
    schemaVersion: 1, id, title: noteName(title), createdAt, scope: first.vault ? "allowed" : "project",
    projectPath: first.vault ? "" : first.settings.selectedProject, projectIdentity: first.vault ? "" : first.projectIdentity,
    turns: [...selected].sort((a, b) => a - b).map(number => {
      const turn = turns[number - 1]!, context = conversationContext(turns.slice(0, number - 1), turn.bundle);
      if (!turn.answer.supported && (turn.answer.answer.length || Object.keys(turn.corrections).length)) throw new Error("Unsupported turns cannot contain claims or corrections.");
      const answer = turn.answer.supported
        ? createAnswerRecord(turn.question, turn.answer, turn.bundle, turn.settings.model, turn.generatedAt, turn.corrections)
        : { schemaVersion: 1, question: turn.question, generatedAt: turn.generatedAt, model: turn.settings.model, sourceIds: turn.bundle.sources.map(s => s.id), claims: [], gaps: turn.answer.gaps };
      return { number, supported: turn.answer.supported, answer, evidence: sourceReferences(turn.bundle),
        choices: turn.bundle.sources.map(source => turn.choices[source.id] === "pin" ? "pin" : "include"),
        context: { included: context.turns.map(turn => turn.turn), omitted: context.omitted } };
    })
  });
}

function conversationBody(record: ConversationRecord): string {
  const escape = escapeMarkdown, saved = new Set(record.turns.map(turn => turn.number));
  const earlier = (n: number) => `${n}${saved.has(n) ? "" : " (not included in this save)"}`;
  const link = (ref: SavedEvidence) => `[${escape(ref.path)}${ref.heading ? ` > ${escape(ref.heading)}` : ""}](<${encodeURI(ref.path).replace(/#/g, "%23")}${ref.heading ? `#${encodeURIComponent(ref.heading)}` : ""}>)`;
  return `${startMarker}\n# ${escape(record.title)}\n\nSaved explicitly at ${record.createdAt}.\n\n`
    + "This is a conversation record. AI output and user corrections are not verified facts. Thread does not reuse this transcript or its copied excerpts as source evidence. Opening it does not resume inference.\n\n"
    + (record.scope === "project" ? `Project: ${escape(record.projectPath)} (${escape(record.projectIdentity)}).\n\n` : "Scope at generation: explicitly allowed paths. Saved scope grants no read access.\n\n")
    + record.turns.map(turn => {
      const answer = turn.answer;
      return `## Turn ${turn.number}\n\n### Question\n\n${escape(answer.question)}\n\nGenerated locally at ${answer.generatedAt} using ${escape(answer.model)}.\n\n`
        + `Earlier AI context used: ${turn.context.included.map(earlier).join(", ") || "none"}. Context is not evidence.\n\n`
        + `Earlier turns omitted from the model: ${turn.context.omitted.map(v => `${earlier(v.turn)} - ${v.reason}`).join("; ") || "none"}.\n\n`
        + "### Reviewed response\n\n"
        + (turn.supported ? answer.claims.map(claim => {
          const current = currentClaim(claim);
          return `- **${claim.correction ? "User correction - " : ""}${claimLabel(current.kind)}:** ${escape(current.text)} (${current.sourceIds.join(", ")})`
            + (claim.correction ? `\n  Corrected at ${claim.correction.correctedAt}; not independently verified.` : "");
        }).join("\n") : "The chosen evidence did not establish an answer.")
        + `\n\n### Evidence gaps\n\n${answer.gaps.map(gap => `- ${escape(gap)}`).join("\n") || "None recorded."}\n\n`
        + "### Original output and corrections\n\n"
        + (answer.claims.map((claim, i) => `- Claim ${i + 1}, original model (${claim.original.kind}): ${escape(claim.original.text)} (${claim.original.sourceIds.join(", ")}).\n`
          + `  Initial display classification: ${claim.classifiedKind}.\n`
          + (claim.correction ? `  User correction (${claim.correction.kind}) at ${claim.correction.correctedAt}: ${escape(claim.correction.text)}.` : "  No user correction.")).join("\n") || "No supported model claims.")
        + "\n\n### Chosen evidence and provenance\n\n"
        + turn.evidence.map((ref, i) => `- ${answer.sourceIds[i]} (${turn.choices[i]}): ${link(ref)}; note hash ${ref.noteHash}; passage hash ${ref.hash}.`
          + (ref.noteType ? ` Record type: ${escape(ref.noteType)}; status: ${escape(ref.noteStatus ?? "not recorded")}.` : "")
          + (ref.pdf ? ` Original PDF: [${escape(ref.pdf.path)}, page ${ref.pdf.page}](<${encodeURI(ref.pdf.path).replace(/#/g, "%23")}#page=${ref.pdf.page}>); hash ${ref.pdf.hash}.` : "")
          + `\n\n${escape(ref.excerpt).split("\n").map(line => `> ${line}`).join("\n")}\n`).join("\n") + "\n";
    }).join("\n") + `${endMarker}\n`;
}

export function conversationMarkdown(record: ConversationRecord): string {
  const valid = validateConversationRecord(record);
  const raw = frontmatter({ id: valid.id, type: "conversation", title: valid.title, created: valid.createdAt.slice(0, 10),
    ...(valid.scope === "project" ? { project: valid.projectIdentity } : {}), thread_conversation_version: "1",
    thread_conversation_record: JSON.stringify(valid), thread_sources: JSON.stringify(conversationReferences(valid)) }) + conversationBody(valid);
  if (bytes(raw) > maxNoteBytes) throw new Error("Conversation note exceeds 1 MiB. Select fewer turns.");
  return raw;
}

export function hasConversationRecord(raw: string, metadata: Record<string, unknown>): boolean {
  return metadata.type === "conversation" || metadata.thread_conversation_version !== undefined || metadata.thread_conversation_record !== undefined
    || /^[\t ]*(?:thread_conversation_(?:version|record)|["']thread_conversation_(?:version|record)["'])\s*:/im.test(raw)
    || /<!--\s*(?:\/\s*)?thread\s*:\s*conversation-record/i.test(raw);
}

export function readConversationRecord(raw: string, metadata: Record<string, unknown>): ConversationRecord {
  if (bytes(raw) > maxNoteBytes || metadata.type !== "conversation" || metadata.thread_conversation_version !== "1"
    || typeof metadata.thread_conversation_record !== "string" || bytes(metadata.thread_conversation_record) > maxRecordBytes) throw new Error("Unsupported conversation record.");
  if (Object.keys(metadata).some(key => /^thread_(?:answer|question|review|pdf)(?:_|$)/.test(key))) throw new Error("Conflicting managed conversation format.");
  const record = validateConversationRecord(JSON.parse(metadata.thread_conversation_record));
  if (metadata.id !== record.id || metadata.title !== record.title || metadata.created !== record.createdAt.slice(0, 10)
    || metadata.project !== (record.scope === "project" ? record.projectIdentity : undefined)
    || JSON.stringify(strictReferences(metadata.thread_sources)) !== JSON.stringify(conversationReferences(record))) throw new Error("Conversation identity or source mapping changed.");
  const header = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0];
  const body = header ? raw.slice(header.length) : "", expected = "\n" + conversationBody(record);
  if (!header || body !== expected && body !== expected.replace(/\n/g, "\r\n")) throw new Error("Conversation contents changed. Preserve this note and save a new reviewed record.");
  return record;
}
