# Thread - Project Overview

<!-- blueprint:source-hash 723c0877501089ac994536a479ce57aeec6d169845b7fef774e4237bb5644b06 -->

> A desktop Obsidian plugin that helps individuals resume projects, recover
> decision reasoning, and connect research through a local AI model.

## Problem

Useful project context is scattered across notes: objectives, last activity,
decisions, reasons, sources, and open questions. Thread gathers relevant evidence
into a short briefing so a user can return to a project without rereading the
whole vault. It preserves original sources and reviewed derived knowledge.

The headline action is **Resume project**. Its output separates recorded facts,
interpretations, evidence gaps, and suggested next actions, with source links.

## Users

- Independent developers and solo founders returning to experiments and decisions.
- Students and researchers connecting evidence and unanswered questions.
- Writers and knowledge workers reusing accumulated research.

The initial release serves personal desktop use. No account is required. Codex
and Claude Code are development assistants, not runtime prerequisites.

## Usage model

- One user and one active vault per plugin instance; several projects per vault.
- Current development is on Linux. Target desktop Linux, macOS, and Windows;
  claim only platforms actually verified.
- Evaluate initially with hundreds of notes and several projects; no large-scale
  performance guarantee is established.
- Inference is local-only through a loopback Ollama endpoint. Cloud features and
  cloud models are outside scope; no hosted API fallback.
- Read scope is empty until the user selects allowed folders. Apply exclusions
  before indexing, retrieval, model context, and reuse of old results.
- Sources can contain sensitive content and untrusted imported text. Source text
  cannot grant permissions, change policy, or execute commands.
- No mobile inference, team collaboration, 24/7 service, enterprise tenancy,
  compliance certification, or autonomous background operations are required.
- Weekly reviews run on demand while Obsidian is available.

## Features

Build-plan IDs are stable. Read completion state from the build checklist and
feature history. Scaffold and Blueprint setup do not constitute completed product
features.

1. **Local project briefings** - Headline read-only Resume action over an allowed
   project folder, with local-model setup, cited facts, gaps, and cancellation.
2. **Reusable project workspaces** - Map existing folders or explicitly create
   starter notes/templates; retain selection and exclusions without overwrites.
3. **Indexed evidence recall** - Rebuildable local text/link retrieval that follows
   edits, renames, deletions, and scope changes.
4. **Ask your vault** - Scoped sourced answers, unsupported-answer handling, and
   explicit saving as new Markdown notes.
5. **Decision records** - Alternatives, rationale, evidence, acceptance, revisit
   conditions, and preserved superseded choices.
6. **Inbox capture** - Thoughts and Markdown/text imports with provenance,
   duplicate detection, and reviewed project suggestions.
7. **Reviewed knowledge updates** - Source-based note proposals with diffs, stale
   checks, recoverable partial failures, and guarded undo.
8. **Decision evidence review** - Suggest retaining, annotating, or superseding a
   choice when new evidence matters; user review remains required.
9. **Session wrap-up** - Save a reviewed progress record that informs later Resume.
10. **Weekly project review** - On-demand sourced activity review with an explicit
    save action.
11. **Source freshness** - Track changed/missing evidence and regenerate derived
    output through reviewed changes while retaining its history.
12. **Offline release readiness** - Package, document, and demonstrate the complete
    core workflow in an actual synthetic Obsidian vault.

13. **Repeatable answer-quality evaluation** - Reusable synthetic fixtures and an opt-in local evaluation command covering missing evidence, conflicts, decision status, section placement and cited support, with honest baseline reports.
14. **Dependable recorded briefings** - Show sourced recorded project context before inference, separate AI interpretation, expose supporting excerpts and keep recorded context usable without Ollama.
15. **Project home and quick switching** - Switch among permitted projects directly in Thread and show recent sessions, decisions, questions and pending reviews without silently granting read access.
16. **Ranked evidence search** - Improve keyword ranking, phrases/aliases and explicit filters, preserve relevance and source diversity in bounded context, and explain coverage limits.
17. **Optional local semantic search** - Offer explicit opt-in local embeddings and hybrid retrieval while preserving scoped keyword search without an embedding model or paid services.
18. **Editable change review** - Highlight changed lines, permit draft edits followed by renewed exact previews and validation, preserve dependent operation groups and give actionable recovery explanations.
19. **Guided local setup** - Guide local-only connection, compatible downloaded model selection, folder grants and an optional sample; show actionable diagnostics without installing services or downloading models silently.
20. **Incremental dependency indexing** - Reindex changed notes and affected dependencies, avoid unnecessary invalidation, and preserve immediate exclusion removal, cancellation and stale-source guards.
21. **Project review queue** - Connect changed sources, affected decisions, explicit revisit dates/conditions, questions and stale outputs in an on-demand review queue; changes and resolutions remain explicit.

Feature 1 reads current notes directly. Feature 3 adds the reusable index. New
note creation must reject collisions; changing established notes uses feature
7's proposal workflow. Saved answers, briefings, and reviews require user action.

Optional local embeddings/hybrid retrieval is approved for feature 17.
Deferred: cloud APIs, mobile AI, team features,
unattended agents, email/calendar, custom web clipping, audio, PDF extraction/OCR,
model training, arbitrary web browsing, billing, and hosted dashboards.

## Data model

These contracts derive from the project plan. Prefer YAML frontmatter plus
readable Markdown; do not require retrofitting every existing note. New
Thread-created notes receive a stable `id`; plugin-specific metadata uses a
`thread_*` namespace. Dates shown to users use their local timezone.

### Project

- `id: string`, `type: "project"`.
- `status: "active" | "paused" | "archived"`.
- `created: date`, `updated: date`.
- Markdown: objective, constraints, linked decisions/sessions/questions/sources.
- Folder mapping associates a project ID with its vault-relative directory.
- Membership can come from project properties, folder containment, or explicit
  links; links never bypass allowed read scope.

### Source

- Optional `id: string`, `type: "source"`, `captured_on: date`.
- Optional original URL or path records provenance when known.
- Markdown/text and attachments preserve the original material.
- Index records a content hash to detect identical imports and later edits.
- Event/publication dates, when known, are distinct from capture dates.
- Initial AI-supported source content is Markdown/plain text only. Other files
  can remain attachments; do not imply their contents were processed.

### Decision

- `id: string`, `type: "decision"`, `project: string` (Project ID).
- `status: "proposed" | "accepted" | "superseded"`, `decided_on: date`.
- Markdown: question, choice, alternatives, rationale, constraints, evidence,
  and conditions for revisiting the decision.
- Optional superseding decision reference links old and new records.
- Only explicit user action accepts or supersedes a choice; preserve old text.

### Session and knowledge note

- Session: `id: string`, `type: "session"`, `project: string`,
  `recorded_on: date`; progress, decisions, open questions, next-step suggestion.
- Knowledge: `id: string`, `type: "concept" | "comparison"`, `updated: date`,
  source references; evidence and interpretation remain distinguishable.

### Saved output

- `id: string`, `type: "briefing" | "answer" | "review"`.
- Optional `project: string`, `generated_on: timestamp`, model identifier.
- Evidence references and generated Markdown with visible provenance.
- New evidence means added/changed material since a recorded session or review;
  absence of a baseline must be visible.

### Evidence reference and index entry

- Evidence: optional note ID, current vault-relative path, heading/block anchor,
  excerpt, content hash.
- Index: path, optional note ID, title, relevant properties, headings, outgoing
  links, eligible text chunks, content hash.
- Stable IDs help resolve renames. Changed hashes and missing notes mark evidence
  stale. Re-resolve the current path when opening a citation.
- Build the index from eligible files; invalidate edits, deletes, renames, and
  newly excluded entries. The index is disposable, never authoritative.

### Change proposal and history

- Proposal: ID, creation timestamp, target paths, operation (`create` or
  `update`), before-hashes, proposed contents, and source references.
- Lifecycle: `pending | applied | rejected | stale | recovery-required`.
- History: proposal ID, time, target paths, before-content, after-hashes.
- Retain the last 20 applied batches locally for bounded recovery; do not claim
  permanent version history.
- Compare before-hashes before application and again before each write. Preserve
  affected contents first; attempt rollback on failure and report incomplete
  recovery paths. The storage API is not a multi-file atomic transaction.
- Undo requires current contents to match recorded after-hashes; otherwise show
  a comparison so newer work is not erased.

### Settings and storage

- Settings: local model identifier, loopback endpoint, folder-role mapping,
  allowed paths, excluded paths, request timeout, selected project.
- Authoritative content: notes in the vault.
- Settings, pending proposals, history, and rebuildable index: plugin-local
  storage under `<vault>/.obsidian/plugins/thread/`, using Obsidian APIs.
- Exclude plugin-local storage from retrieval. Never default runtime data to the
  development repository, and never delete/move user notes automatically.

## Tech stack

- **TypeScript and Obsidian API**: desktop plugin, commands, settings, views,
  Markdown rendering, vault events, and file/storage access.
- **Native DOM helpers and Obsidian CSS variables**: theme-compatible UI.
- **esbuild**: `src/main.ts` to CommonJS `main.js`, with host modules external.
- **Node.js 22.15+ and npm**: development tooling and a committed exact lockfile.
- **Ollama**: downloaded local model over loopback; use documented local-only
  configuration such as `OLLAMA_NO_CLOUD=1`. No model weights are bundled.
- **Text/link retrieval**: local index, metadata, bounded context; no server,
  embedding API, vector database, or external search installation is required.
- **AI Blueprint 1.13.0**: Codex `.agents/skills/` and Claude Code
  `.claude/skills/`; shared state and Efficient feature-level review.

Runtime pipeline: eligible scope -> read/parse -> retrieve bounded passages ->
local generation -> validate output/citations -> render -> save a new note on
request or review an established-note update. A generated summary supplements
original evidence; it does not replace it. A valid citation does not guarantee
that the passage semantically supports a claim.

The initial scaffold starts at `src/main.ts`. Add `ui`, `vault`, `retrieval`,
`intelligence`, `changes`, and `settings` modules as each feature needs them.

Commands: `npm ci`, `npm run dev`, `npm run typecheck`, `npm run build`, and
`npm run verify`. Dev watches the bundle; it does not launch a web server.
Verify means typecheck, focused logic tests through Node's built-in TypeScript
runner, then build. Test is declared in AGENTS.md; the runner rejects an empty
suite. CI remains an optional separate setup.
Evaluate parsing, scope, evidence gaps, malformed output, stale references,
concurrent edits, partial failure, and guarded undo with controlled fixtures.
UI/integration acceptance requires actual Obsidian evidence in a synthetic
vault; a passing bundle is insufficient.

## Monetization

No monetization in the initial release. No accounts, ads, billing, or license
enforcement. Obsidian, Blueprint, build tools, Ollama, and appropriately licensed
local weights can support a complete runtime without required subscription,
hosting, or API fees. Electricity, storage, hardware, labor, and development
assistant usage can still cost money. Sync/Publish are optional.

The source is private and UNLICENSED until the user decides distribution and
license. Verify model and dependency terms before any public release. Obsidian
itself is free to use and is not open-source.

## UI/UX

- Thread sidebar: selected project and Resume, Ask, Capture, Review actions.
- Briefing: objective, last activity, decisions, questions, new evidence, next
  action, generation time, and working source links.
- Ask: explicit scope, input, sourced answer, evidence gaps, save action.
- Capture: text/Markdown, provenance, association suggestion, import review.
- Decision editor: choices, reasons, alternatives, evidence, revisit conditions.
- Change review: before/after comparison, affected paths, apply/reject, stale
  explanations, and guarded undo.
- Settings: connection/model test, folder roles, exclusions, cache reset.

Use the current theme, readable Markdown, keyboard navigation, visible focus,
and text labels for status. Support idle/loading/streaming/empty/canceled/stale/
failure states. Model failures must leave ordinary note editing usable. Do not
invent confidence percentages or present AI suggestions as recorded choices.
Existing vaults can be mapped in place; creating a structure is an explicit,
non-overwriting action with a path preview.

## Deployment

Desktop plugin, no hosting/domain/backend/remote database/cron. Build with
`npm run build`; package `main.js`, `manifest.json`, and `styles.css` when added.
Install into `<test-vault>/.obsidian/plugins/thread/` and enable in Obsidian.
Ollama and a downloaded local model are separate runtime prerequisites. Do not
silently install or download them. Model setup requires internet; the core
runtime must work offline afterward.

A connection/model test is the health check. Release proof includes a clean
vault install, sourced briefing/answer, exclusions, decision preservation,
reviewed updates, failure recovery, reference freshness, and offline inference.
Saved knowledge must remain readable after Thread is disabled.

Community submission, a public repository/release, license selection, and
publication are later user decisions. No publication is authorized by setup.
The released local 0.1.0 manifest requires Obsidian 1.14.4, the tested minimum.

## Open questions

- Hardware and candidate local model: resolve and benchmark before making speed
  or reasoning-quality promises. Two minutes is a proposed briefing target,
  not a guaranteed performance claim.
- Obsidian availability and synthetic test-vault path: resolve before the first
  integration demonstration.
- Real vault mapping: obtain only when the user explicitly selects folders.
- License and public distribution: resolve before a public release.

No contradictions were found between the two plans. These deferred decisions
remain in the project plan and do not block the current setup.

## Approved follow-up contracts

Features 13-21 target a private local 0.2.0 build. Recorded facts precede AI interpretation, project switching never grants access, optional semantic search preserves keyword fallback, editable proposals require renewed exact approval, and indexing retains immediate privacy/freshness guards. The project review queue is on demand and never resolves questions or changes decisions automatically. Quality evaluations report observed strengths and failures rather than treating citations as semantic proof. Preserve original Markdown, durable history and the completed first-release archives.
