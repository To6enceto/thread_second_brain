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

Current verified baseline is private local 0.2.0 (features 1-21). The next queue
is 22-34; planning approval does not claim those features are implemented.

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

IDs remain stable. Features 1-21 and their immutable archives are complete;
22-34 are approved but pending. The ten proposals are retained, splitting retrieval,
PDF support and portability into two features each. Questions precede review events;
section indexing precedes broader retrieval/PDF evidence; export precedes import.

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
A local appropriately licensed PDF parser such as PDF.js is approved as a candidate,
subject to implementation verification. Bundle required workers/assets locally;
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
0.2.0 requires Obsidian 1.14.4 and ships main.js, manifest.json, styles.css in
dist/thread-0.2.0.zip to <vault>/.obsidian/plugins/thread/. Ollama/model setup is
separate and local-only; no silent install/download. Inference works offline after
setup. Preserve data.json, changes.json, imports.json and renames.json on upgrade.
Keep independent backups; writes are not atomic and the journal is bounded.
Existing Git push authorization does not authorize force pushes, public release/
license, deployment, paid services, system-wide installs or destructive actions.

## Open questions

- Measure new indexing/search/PDF/package budgets on synthetic workloads before
  promising scale or speed. Choose conservative routine defaults.
- Tested baseline: Linux, Obsidian 1.14.4, Ollama 0.40.4 and qwen3:4b-instruct.
  Other platforms/models need separate evidence. Personal vault grants and PDF
  consent remain explicit user choices.
- The next private version and exact dependency/package inventory are established
  during feature specs/release checks. Public licensing/distribution is deferred.

No unresolved product conflict blocks 22-34. The plans now explicitly approve local
PDF extraction; OCR/audio/web/cloud and the remaining deferrals still apply.

## Approved next-release data and contracts

Keep durable additions readable in Markdown; no forced legacy conversion. Freeze
exact validated namespaced schemas/compatibility in each spec before consumers
rely on them. Logical records derived from the plans:

| Planned record | Fields and relationship |
| --- | --- |
| Question (24) | id, type:question, project, status:open/investigating/answered, recorded/updated dates, question, optional answer/evidence/decision links; preserve prior answers/reasons when explicitly reopened. |
| Review event (25) | Stable identity, distinct review-event kind, project/date, reviewed/no-change or snoozed action, optional revisit date, target/source IDs and hashes, optional follow-up question. Never a generated review baseline. |
| Milestone/next action (26-27) | Explicit user-recorded project text, date/identity and source link as needed. Preview chosen next-action writes; no inferred event history/priority. |
| PDF extraction (31-32) | Original identity/path/binary hash, explicit read consent, extraction version, page/text mapping, limits and derived source identity. Pages retain original-file dependency. |
| Project package (33) | Versioned manifest, package/project identity, creation time, relative entry paths/types/byte lengths/hashes, safe provenance/link mapping, inventory and omissions. |
| Import preview (34) | Validated package entries bound to reviewed bytes, new destinations, identity/link mapping and collisions; imported copies receive no implicit read grants. |

- Editor selection is not a broader grant. Reconcile changed/unsaved text before
  durable citation/save. Evidence pins cannot override scope, freshness or context
  budgets. Show final included/omitted passages and actual claim support.
- Queue review/snooze is explicit and snapshot-bound. New relevant changes resurface
  even after snoozing; acknowledgement never accepts decisions, resolves questions
  or makes stale output current. No scheduler or automatic resolution.
- Timeline distinguishes recorded event dates from modification dates and leaves
  historical gaps unknown. Portfolio and health checks use permitted records,
  transparent counts/filters, no mandatory AI or fabricated priority/health scores.
  Repair one permitted note at a time via preview; protected sources get manual guidance.
- Current limits include 50000 body characters/note, 16000 context characters,
  128 semantic candidates and 512 vectors. Features 29-30 replace prefix/candidate
  coverage with explicit bounded section/search budgets, progress, cancellation,
  search-more and measured responsiveness/read/resource use, not unlimited work.
  Derived caches can rebuild; settings and durable journals stay compatible.
- Existing Markdown/text grants do not silently enable binary PDF reads. Explicit
  local selection/consent and exclusions apply before import/extraction/reuse.
  Preview bounded selectable text; handle image-only/encrypted/unsupported files
  visibly. Preserve originals; changes/removal/exclusions invalidate extracted
  text/dependent output. Re-extraction is explicit; page navigation checks current
  original hashes. No OCR or script execution.
- Export explicitly selected permitted files with inventory/omissions and recheck
  scopes/snapshots. Default to omitting scope-invalid/stale derived evidence.
  Do not enumerate excluded reference paths or automatically include settings,
  secrets, caches, recovery originals, models or runtime files. A selected
  checkpoint supplements an independent backup, not the last-20 recovery journal.
- Import treats packages as untrusted: validate version/types/relative paths,
  file counts, compressed/expanded sizes and hashes before writes. Refuse traversal,
  links/unsupported executable assets and malformed input. Preview new-folder copies,
  link/ID mapping and collisions; never overwrite notes or silently rewrite existing
  IDs. Revalidate destinations per write and preserve partial-failure recovery.
- All ten proposals keep the free local runtime. Larger indexes/PDFs/packages use
  storage, memory, CPU and power; labor/development assistant costs remain separate.
  No required hosted API, subscription or new system-wide service.
- Verify each feature with meaningful tests, required independent review and actual
  synthetic Obsidian acceptance. Use authored synthetic PDFs/packages for malformed
  inputs, limits, hashes, traversal, collisions and recovery. Extend quality fixtures
  when evidence/retrieval changes; use real local inference where relevant and
  prove cancellation, immediate exclusions and current source/page links.
- Preserve 1-21 archives and durable note/import/rename/change history. Package and
  install the exact final artifact after the queue passes; verify its actual inventory
  (including PDF assets), reproducibility, offline operation and stated platform/
  scale limits. Previous release evidence never proves untested new behavior.
