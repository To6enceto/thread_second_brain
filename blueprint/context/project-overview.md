# Thread - Project Overview

<!-- blueprint:source-hash f166180d101c673cfc78c3133ceb7dbb808a3fb991568df1d98f550284ed6ccd -->

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

Private local 0.3.0 includes features 1-34 and the panel redesign. One user/vault
per plugin instance, several projects; desktop Linux first, other platforms need
verification. No large-vault performance guarantee. Loopback cloud-disabled Ollama
only; no hosted fallback. Empty initial read scope; exclusions before all reads,
retrieval, context and reuse. Imported text cannot grant access or execute code.
No account, mobile inference, collaboration, unattended service/agent or enterprise
requirements. Weekly reviews are on demand. OCR/audio/automatic web fetching remain
deferred; approved Clipper intake reads deliberately saved local notes only.

## Features

Build in order; 1-34 are complete and immutable, 35-48 are approved/pending.
Exact dependencies and acceptance live in the build plan; native evidence is required.

1. **Local project briefings** - Sourced local Resume, cancellation and gaps.
2. **Reusable project workspaces** - Previewed workspace mapping and starter notes.
3. **Indexed evidence recall** - Current scoped passage index.
4. **Ask your vault** - Sourced answers and explicit new-note saves.
5. **Decision records** - Explicit choices, status, rationale and revisit conditions.
6. **Inbox capture** - Reviewed text capture/import and provenance.
7. **Reviewed knowledge updates** - Exact proposed changes, recovery and guarded undo.
8. **Decision evidence review** - Sourced retain/annotate/supersede review.
9. **Session wrap-up** - Reviewed recorded progress and next-step suggestions.
10. **Weekly project review** - On-demand sourced review with explicit save.
11. **Source freshness** - Dependency freshness and reviewed regeneration.
12. **Offline release readiness** - Verified native offline package and instructions.
13. **Repeatable answer-quality evaluation** - Reusable fixtures and opt-in live quality evaluation.
14. **Dependable recorded briefings** - Deterministic sourced context before AI.
15. **Project home and quick switching** - Permitted project selector and recent records.
16. **Ranked evidence search** - Bounded ranked keyword search and honest coverage.
17. **Optional local semantic search** - Opt-in hybrid embeddings, keyword fallback.
18. **Editable change review** - Diffs, editable drafts and renewed exact previews.
19. **Guided local setup** - Local model discovery and explicit read grants.
20. **Incremental dependency indexing** - Changed/dependency indexing and immediate exclusions.
21. **Project review queue** - On-demand affected-record review queue.
22. **Editor selection actions** - Native commands on permitted current selections.
23. **Evidence workbench** - Inspect/include/pin/exclude and exact context.
24. **Managed project questions** - Explicit durable question states and history.
25. **Review acknowledgements and snoozing** - Snapshot-bound review/snooze and resurfacing.
26. **Project timeline** - Recorded chronology with unknown history visible.
27. **Multi-project overview** - Permitted project overview and chosen next actions.
28. **Vault health and compatibility** - Bounded diagnostics and individually reviewed repairs.
29. **Section-aware long-note indexing** - Bounded sections, progress and visible omissions.
30. **Broader hybrid retrieval** - Explicit wider candidate budgets and search-more.
31. **Local PDF extraction** - Consented PDFs, preserved originals and local extraction.
32. **PDF evidence and page citations** - Verified original hashes, page citations and invalidation.
33. **Project exports and checkpoints** - Previewed selected-project portable snapshots.
34. **Reviewed project package import** - Validated new-copy imports, collisions and recovery.
35. **Fedora desktop launcher** - Configured Fedora shortcut and consented local startup.
36. **Clear setup progress and feedback** - Visible checks and sample/existing-note setup paths.
37. **Full-width Thread workspace** - Native main-tab navigation retaining sidebar/layouts.
38. **Claim classification and quality regressions** - Recorded/interpretation/action quality regressions.
39. **Reviewed claim corrections** - Explicit corrections with original provenance.
40. **Evidence-aware Ask follow-ups** - Bounded turns using current evidence.
41. **Explicit conversation saves** - Explicit Markdown conversation preview/save.
42. **Saved research collections** - Revalidated named evidence selection intent.
43. **Durable project action records** - Explicit Markdown action states and history.
44. **Action board and recorded wrap-up** - Accessible board and selected recorded progress.
45. **Project checkpoint comparisons** - Actual checkpoint versus permitted current content.
46. **Reviewed Web Clipper intake** - Local clip templates, metadata and reviewed intake.
47. **Validated local update previews** - Strict package/compatibility and replacement preview.
48. **Recoverable local updates** - Guarded update/recovery/rollback and verified package.

## Data model

Markdown is authoritative; use frontmatter plus readable content, no forced legacy
conversion. New records have stable `id`; Thread metadata uses `thread_*`.
Displayed dates use the local timezone. Freeze new exact versioned schemas in each
spec before later consumers depend on them; reject invalid external metadata.

- Project: id, type project, status active/paused/archived, created/updated dates;
  objective, constraints and linked records. Folder mapping, project properties or
  explicit links establish membership but never read access.
- Source: optional id/type source/captured_on/original URL or path; preserve raw
  Markdown/text. Publication/event and capture dates stay distinct. PDFs require
  exact binary consent and verified derived page provenance (contracts below).
- Decision: id, type decision, project ID, proposed/accepted/superseded status,
  decided_on, choice, alternatives, rationale, evidence, constraints/revisit
  conditions, optional revisit_on and superseding reference. Acceptance explicit.
- Session: id, type session, project ID, recorded_on; user-reported progress,
  decisions, questions and suggested next step. Knowledge: concept/comparison,
  updated date, sources and distinguishable interpretation.
- Saved output: id, briefing/answer/review, optional project, generated_on/model,
  evidence and Markdown. New-evidence comparisons require actual recorded baseline.
- Evidence: optional note ID, current path, heading/block, excerpt, full hash.
  Index: path/ID/title/properties/headings/links/chunks/hash. Re-resolve identity
  within current scope; changed/missing/excluded dependencies invalidate output.
  Caches are rebuildable, never authoritative. Settings/caches/journals excluded
  from retrieval; no personal runtime data in the development repository.
- Proposal: ID/time, create/update targets, before hashes, proposed content and
  source refs. Pending/applied/rejected/stale/recovery-required. Retain last 20
  applied batches with originals and after hashes; not permanent version history.
  Preserve originals before first write, recheck before each write, attempt rollback
  on failure and expose incomplete recovery. Undo requires matching after hashes;
  no filesystem-wide atomicity or automatic deletion/move of user notes.
- Settings: local model/endpoint, role mappings, allowed/excluded paths, timeout,
  selected project and opt-in semantic/PDF settings; plugin-local Obsidian storage.
  Preserve existing data.json and changes/imports/project-imports/renames journals.
- Planned versioned records: corrections retain original model text/type and
  user/time/evidence; conversations retain finite per-turn provenance; collections
  hold ID/name/scope and bounded identity/heading/hash/choice refs without cached
  excerpts; actions hold ID/project/title, explicit status and transition history.
  See queue contracts below; exact schemas freeze in specs before consumers.

## Tech stack

Strict TypeScript, Obsidian Vault/storage/native DOM/theme APIs and esbuild CommonJS
with host modules external. Node >=22.15/npm lockfile are tooling, not a server.
AI Blueprint 1.13.0 Codex/Claude adapters are outside runtime. Local cloud-disabled
Ollama for structured text/optional embeddings; no mandatory vector database.
PDF.js 6.4.299 owned local worker and bundled assets, no CDN/document scripts/fetch.
Pipeline: current permitted sources -> bounded retrieval/selection -> optional
model -> validation -> render -> explicit save/reviewed update. Citation identity
is not semantic support. Reuse services; no unrelated architecture or dependencies.
Commands: npm ci, npm run dev (watcher only), typecheck, test, build, verify,
evaluate (live opt-in), package. Verify = typecheck/tests/build; CI separate.

## Monetization

No required account/API/subscription/hosting fees. Hardware, storage, power,
downloads and development assistants still cost resources. Obsidian is free, not
open-source; model/tool licenses remain separate. Thread is private/UNLICENSED.

## UI/UX

Native controls/theme variables, readable Markdown, keyboard/focus and text statuses.
Separate recorded statements, interpretations, gaps and actions; current source
links, no invented confidence/health. Preserve all actions. Useful idle/loading/
empty/canceled/stale/error states; unavailable model leaves recorded work usable.
Relevant source/target/scope changes immediately revoke unsafe content/previews.

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

## Limits and open questions

Tested Linux, Obsidian 1.14.4, Ollama 0.40.4, qwen3:4b-instruct. Measure actual
budgets and platform/model support; no scale promises. Personal scope/PDF consent
remain explicit. No unresolved product decision blocks 35-48. Public license and
distribution deferred; current private version uses ZIP/CRC/SHA/resource checks.

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

## Approved queue contracts (35-48)

Build serially in plan order; dependencies and acceptance are in the build plan.
35-37 improve launch/setup/native navigation; 38-41 classification/corrections and
conversations; 42 collections; 43-44 actions; 45 comparisons; 46 clip intake;
47-48 validated/recoverable updates. Preserve all earlier histories and reports.

- Launcher: generate a user-level Fedora shortcut for explicitly configured
  installed Obsidian/vault; safe argv, no shell interpolation. Plugin route grants
  nothing and starts no inference. Optional Ollama startup requires setup consent;
  detect existing server, loopback/cloud-disabled checks and actionable errors.
  Never silently install/download or stop unrelated processes. Test actual Flatpak
  against isolated profiles and owned processes. Shortcut installation in the
  user's account and everyday installation updates need separate concrete approval.
- Setup/workspace: native visible status beside controls, sample/existing paths,
  explicit Save grants and exclusions. Main-tab view preserves sidebar, actions,
  open notes/layouts, valid view state and lifecycle cancellation. Unknown projects
  fail closed; current services back all surfaces.
- Claims: recorded postponements are not new suggestions. Use known metadata,
  structured validation and fixtures for status/support/recommendations; never
  infer factual truth from citation validity. Human corrections keep original
  model output and provenance, require renewed exact preview and change no source.
- Follow-ups: finite turn/character/evidence budgets, visible omissions, current
  evidence each turn. Prior AI is labelled context only. Revalidate all reused
  dependencies before display/generate/save. Relevant source/scope/project/settings
  changes and cancellation revoke outputs/previews. Persistence explicitly chosen,
  readable versioned Markdown, no overwrites or stale history promoted to evidence.
- Collections: resolve references within current grants, re-read/reconfirm changed
  sources; missing/excluded references show generic unavailable status without
  exposing paths/content. Pins never bypass context budgets, PDF consent or hashes.
- Actions: reviewed creation and every human transition retain dated history;
  AI can propose only. Board/Wrap up use current permitted explicitly selected
  progress, not fabricated completion or automatic state changes.
- Comparisons: validated real project export plus current permitted snapshots.
  Current scope includes historical/transitive dependencies; packages grant no
  access to excluded content or PDFs. Label omissions/selection differences and
  unknown history. Read-only, no mtime-based reconstruction or restoration.
- Clipper: compatible templates and reviewed local intake, title/author/URL and
  separate publication/capture dates when available. Missing metadata unknown.
  Associations/possible duplicates reviewed, no automatic merges or source writes.
  Imported text/URLs are data, never instructions or automatic network requests.
- Updates: explicitly selected package/install, strict identity/inventory/hashes/
  sizes/path/link/version/host/data validation. Exact preview and current target
  checks before writes. Preserve notes/settings/caches where appropriate/journals
  and unrelated files. Owned staging, previous code and durable intent enable
  conservative interruption recovery; refuse ambiguous or changed targets.
  Compatible code rollback never claims to undo data migrations or note changes.
  Never update a running everyday install or stop user processes. Test disposable
  installs with interruptions and concurrent edits; freeze exact schemas in specs.

Fresh Continuous boundary, required Verify and independent reviews per feature,
actual synthetic Obsidian and real inference where relevant. Respect repair limits;
never claim completion with failed gates. No mandatory paid services; local
hardware/download/storage/power costs remain. Normal pushes to the existing origin
are separately authorized; no force push, remote change, public release, deployment,
paid service, system-wide install or destructive user-data operation is authorized.
Package the next private version only after verification, with measured limits.
