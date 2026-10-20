# Thread - Project Overview

<!-- blueprint:source-hash 4a7f2ff2646034333389e159c00f13b69467a00556fbf4e7e3bd8ee6438f99bf -->

> A desktop Obsidian plugin that helps individuals resume projects, recover
> decision reasoning, and connect research through a local AI model.

## Problem

Project objectives, activity, decisions and questions are scattered across notes.
**Resume project** gathers sourced context so a user can return within minutes.
Recorded facts, AI interpretations, gaps and suggestions stay distinct; original
Markdown remains authoritative.

## Users

- Independent developers and solo founders returning to experiments and decisions.
- Students and researchers connecting evidence and unanswered questions.
- Writers and knowledge workers reusing accumulated research.

The initial release serves personal desktop use. No account is required. Codex
and Claude Code are development assistants, not runtime prerequisites.

## Usage model

Private local0.3.0 extends the baseline through the approved22-34 queue.
Exact verification and limits live in each immutable feature archive.

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

IDs remain stable; preserve features1-21 and their immutable archive bytes.
Questions precede review events; section indexing precedes broader retrieval/PDF
evidence; export precedes import. Each completion requires native evidence.

1. **Local project briefings** - Sourced Resume with facts, gaps, cancellation and local setup.
2. **Reusable project workspaces** - Map folders or preview starter notes without overwrites.
3. **Indexed evidence recall** - Current scoped text/link passages across edits, moves and exclusions.
4. **Ask your vault** - Scoped sourced answers, gaps and explicit new-note saves.
5. **Decision records** - Explicit choices, rationale, evidence, acceptance and revisit conditions.
6. **Inbox capture** - Capture thoughts/import Markdown or text with provenance and duplicate checks.
7. **Reviewed knowledge updates** - Preview source-based knowledge changes with hashes, originals, recovery and guarded undo.
8. **Decision evidence review** - Explicitly retain, annotate or supersede decisions after comparing selected evidence.
9. **Session wrap-up** - Save reviewed user-reported progress, questions and a suggested next step.
10. **Weekly project review** - On-demand sourced local-calendar project review with explicit save.
11. **Source freshness** - Conservative source/dependency freshness and reviewed new versions preserving old output.
12. **Offline release readiness** - Package and demonstrate actual synthetic Obsidian install, offline inference and recovery.
13. **Repeatable answer-quality evaluation** - Authored fixtures, negative controls and opt-in live-local quality evaluation.
14. **Dependable recorded briefings** - Sourced deterministic records before separate AI interpretation; usable without a model.
15. **Project home and quick switching** - Home with sessions/decisions/questions/proposals and switching inside current grants.
16. **Ranked evidence search** - Keyword ranking, aliases, phrases, filters, balanced context and coverage limits.
17. **Optional local semantic search** - Explicit bounded local hybrid embeddings with keyword-only operation and fallback.
18. **Editable change review** - Highlighted diffs, protected editable drafts, renewed exact approval and recovery guidance.
19. **Guided local setup** - Compatible downloaded model discovery, explicit scope preview and local diagnostics.
20. **Incremental dependency indexing** - Changed/dependency indexing with immediate exclusion removal and selective cancellation.
21. **Project review queue** - On-demand recorded-source, decision/date/condition, question and stale-output queue.
22. **Editor selection actions** - Native commands on permitted selections for Ask/related evidence and question/decision drafts.
23. **Evidence workbench** - Inspect/include/exclude/pin current passages before Ask; compare claims with their sources.
24. **Managed project questions** - Durable explicit question states, cited answers, optional conversion and reopening history.
25. **Review acknowledgements and snoozing** - Explicit snapshot-bound review/snooze records, follow-ups and resurfacing on new changes.
26. **Project timeline** - Chronology of recorded sessions, reviews, milestones and decision/supersession links.
27. **Multi-project overview** - Permitted project activity, questions, due reviews, proposals and explicitly chosen next actions.
28. **Vault health and compatibility** - On-demand note compatibility diagnostics and individually reviewed permitted repairs.
29. **Section-aware long-note indexing** - Bounded section indexing beyond the note prefix, with progress, cancellation and measurements.
30. **Broader hybrid retrieval** - Explicit wider hybrid candidate budgets and search-more, preserving keyword-only operation.
31. **Local PDF extraction** - Explicit local PDF reads/imports, preserved originals and previewed page-text extraction.
32. **PDF evidence and page citations** - Approved PDF evidence with page navigation, original hashes and transitive scope/freshness.
33. **Project exports and checkpoints** - Previewed local selected-project snapshots with a versioned inventory/hash manifest.
34. **Reviewed project package import** - Untrusted-package validation, exact new-copy import preview, collision refusal and recovery.

Local semantic search supersedes its initial deferral. Selectable-text PDF
extraction is approved in 31-32; OCR, audio, web/cloud, mobile/team services,
unattended agents and model training remain deferred. Keyword/recorded context
must stay usable without a model. Existing writes retain exact approval guards.

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
- Current source content is Markdown/plain text. Features 31-32 add explicitly
  consented PDF extraction and page provenance; do not imply unsupported files were read.

### Decision

- `id: string`, `type: "decision"`, `project: string` (Project ID).
- `status: "proposed" | "accepted" | "superseded"`, `decided_on: date`.
- Markdown: question, choice, alternatives, rationale, constraints, evidence,
  and conditions for revisiting the decision; optional explicit revisit_on date.
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

TypeScript, Obsidian desktop/Vault/storage APIs, native DOM/theme CSS and esbuild
CommonJS main.js with host modules external. Node >=22.15/npm and the exact lockfile
are development tooling. AI Blueprint 1.13.0 provides Codex/Claude development
adapters outside runtime; shared workflow instructions stay aligned.

Local cloud-disabled loopback Ollama supplies structured text and optional
embeddings. Models/runtime are separate downloads, never silently installed.
Use incremental text/link retrieval and bounded hybrid search with model-identity,
vector, cancellation and lifecycle checks. No mandatory vector database/backend.
PDF.js6.4.299 runs in an owned bounded local worker. Bundle required assets locally;
no CDN, remote fonts/links, document scripts or runtime fetch dependency.

Pipeline: current permitted sources -> bounded index/retrieval/explicit selection ->
optional generation -> validation -> render -> explicit save or reviewed update.
References do not establish semantic support. Diagnostics/PDF/package paths preserve
scope, provenance, source freshness and exact write boundaries.

Commands: npm ci, npm run dev (bundle watcher), npm run typecheck, npm test,
npm run build, npm run verify (typecheck/tests/build), npm run evaluate (offline
harness, live opt-in), npm run package. Node tests reject an empty suite; CI is
separate. Actual synthetic Obsidian evidence is required, not a build-only claim.

## Monetization

No accounts, ads, billing, hosted API/backend or required subscription/hosting/sync
charge. Hardware, storage, RAM/VRAM, electricity, downloads, labor and optional
development assistants remain costs. Obsidian is free to use, not open-source;
model/tool licenses remain their own. Thread stays private/UNLICENSED pending a
separate public license/distribution decision; Git pushes have separate authority.

## UI/UX

Use native Obsidian controls/theme variables, readable Markdown, keyboard access,
visible focus and text status labels. Separate facts/interpretations/gaps/suggestions,
with current source links and no invented confidence/priority scores. Existing
home, Resume/Ask/Capture, decisions, sessions/reviews, changes/recovery and setup
stay usable. New surfaces follow the feature map. Keep idle/loading/empty/canceled/
stale/failure states useful; model failure leaves recorded context/editing usable.
Known source/target changes invalidate affected work immediately; old results and
contextual dialogs must not leak excluded paths or cached excerpts.

## Deployment

Desktop plugin, no host/domain/remote database/cron/remote worker. Current private
0.3.0 requires Obsidian1.14.4 and ships191 inventoried files (main.js, manifest,
styles, PDF worker/CMaps/fonts/licenses) in dist/thread-0.3.0.zip to <vault>/.obsidian/plugins/thread/. Ollama/model setup is
separate and local-only; no silent install/download. Inference works offline after
setup. Preserve data.json, changes.json, imports.json, project-imports.json and
renames.json on upgrade.
Keep independent backups; writes are not atomic and the journal is bounded.
Existing Git push authorization does not authorize force pushes, public release/
license, deployment, paid services, system-wide installs or destructive actions.

## Open questions

- Measure new indexing/search/PDF/package budgets on synthetic workloads before
  promising scale or speed. Choose conservative routine defaults.
- Tested baseline: Linux, Obsidian 1.14.4, Ollama 0.40.4 and qwen3:4b-instruct.
  Other platforms/models need separate evidence. Personal vault grants and PDF
  consent remain explicit user choices.
- Private0.3.0 uses version-specific staging and ZIP/CRC/SHA/resource/license
  verification. Public licensing/distribution is deferred.

No unresolved product conflict blocks 22-34. The plans now explicitly approve local
PDF extraction; OCR/audio/web/cloud and the remaining deferrals still apply.

## Implemented contracts (22-34)

Exact schemas, budgets, evidence and limitations are frozen in feature archives.
Keep records readable in Markdown and preserve raw history. No forced conversion.

- Editor selections:1-4000 UTF-16 units, saved-buffer/raw-hash/range identity,
  permission and dirty/stale-output checks. Selection grants no new access.
- Workbench: retrieve, explicitly include/pin/exclude, inspect exact bounded context,
  then Generate. Evidence/input changes revoke answers and save previews.
- Questions: thread_question_version1 with explicit open/investigating/answered
  states, append-only cited answers and reopening history. Exact scalar/CAS writes.
- Review events: thread_review_event_version1, explicit reviewed/snoozed snapshots
  and follow-ups. Acknowledgement never accepts decisions or freshens output.
  Traverse all dependencies, including private history and PDF original hashes.
- Timeline: event/capture/modified dates and current decision status are distinct.
  Bound200 events/2000 records. Milestones/next actions need explicit new-note save.
- Multi-project:20 projects/2000 records, permitted unique IDs, explicit status
  filters; no inferred priority. Health:500 files,1 MiB/file,8 MiB total,200 results;
  individual exact reviewed date/heading repairs retain CAS/undo/recovery guarantees.
- Index profiles conservatively bound files/read bytes/sections/characters/chunks/
  serialized metadata. Stat before reads and retain full raw SHA. Honest coverage,
  cancellation/unready states, incremental unaffected retention and immediate
  invalidation. Broader hybrid request budgets128/20,384/35,768/50; explicit
  Search more never generates. Keyword stays usable without a model.
- PDF schema thread_pdf_version1 binds full original SHA, parser/extraction version
  and quoted pages. Exact pdfPaths consent never follows rename; exclusions win.
  Offline owned PDF.js worker rejects encryption, malformed/image-only PDFs,
  document URLs/scripts/XFA/Wasm/system fonts and corrupt assets. Limits16 MiB,
  200 total accepted pages,first40 examined,8000 chars/page,100000 chars,30 seconds;
  current-source verification10 originals/32 MiB. Cancel terminates/discards. All
  source/page reuse and review snapshots verify transitive extraction/original
  hashes. Original trust is volatile, never restored from persisted caches.
- Export version1 uncompressed .thread-project.json:100 files,2 MiB/text,
 16 MiB/PDF,32 MiB expanded,48 MiB serialized. Portable NFC paths with case/folder
  collision refusal. PDFs explicitly selected/off by default. Exact bytes/IDs.
  All retained copied provenance must be supported/current/permitted, including
  older synthesis blocks; whole-note omission otherwise. Manifest omissions are
  generic; no excluded reference paths/settings/caches/journal originals/models.
- Import validates exact schemas/types/paths/base64/UTF8/counts/sizes/SHA/identity
  before writes. Explicit package read includes embedded PDF bytes but grants
  nothing ongoing. Exact destination/ID/link mapping, duplicate IDs and limited
  current-index coverage. New top-level folder outside all text/PDF grants and
  exclusions. Preserve bytes/IDs/links/provenance; refuse all existing/concurrent
  destinations and aliases. Changed package/settings/identities need renewed preview.
  One app-wide lease; plugin-local project-imports.json version1 retains up to100
  receipts (package SHA/destinations/hashes/created/inFlight intent before writes).
  Invalid/full history blocks; no auto-pruning. Explicit recovery verifies unchanged
  package/copies, can adopt matching uncertain files without ownership claims,
  refuses later edits/foreign files. Keep-partial closes recovery without deletion.
  No destructive restore, link rebasing or provenance freshening.

Verify is npm run verify. Offline evaluation/index/retrieval fixtures and opt-in
live-local inference supplement actual synthetic Obsidian/PDF/package acceptance,
keyboard/themes, permission/staleness/cancel/conflict/recovery races. Preserve
prior artifacts/reports, notes and durable history. No public release is implied.
