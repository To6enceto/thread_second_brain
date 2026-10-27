# Thread - Project Overview

<!-- blueprint:source-hash c4cf6bcebf2e7803f35ade78867a54931e27e316709f47558abdb95b3fa63ae6 -->

> Local project memory and sourced research, available as an Obsidian plugin
> and an approved independent Electron desktop application sharing Markdown.

## Problem and users

Help individual builders, students, researchers and writers resume projects,
recover decision reasoning and connect evidence. Recorded facts, user reports,
AI interpretations, gaps and suggestions stay distinct. Personal desktop use,
multiple projects, one active vault per instance. No account, backend or paid API.

## Current implementation and build order

Plugin features 1-48 are complete (private 0.4.2); archives contain exact schemas,
verification and limits. Desktop 49-62 is complete; 63-65 improve everyday desktop use.
Preserve prior archive bytes and all notes/history. Implement one feature at a time.

1. **Local project briefings**
2. **Reusable project workspaces**
3. **Indexed evidence recall**
4. **Ask your vault**
5. **Decision records**
6. **Inbox capture**
7. **Reviewed knowledge updates**
8. **Decision evidence review**
9. **Session wrap-up**
10. **Weekly project review**
11. **Source freshness**
12. **Offline release readiness**
13. **Repeatable answer-quality evaluation**
14. **Dependable recorded briefings**
15. **Project home and quick switching**
16. **Ranked evidence search**
17. **Optional local semantic search**
18. **Editable change review**
19. **Guided local setup**
20. **Incremental dependency indexing**
21. **Project review queue**
22. **Editor selection actions**
23. **Evidence workbench**
24. **Managed project questions**
25. **Review acknowledgements and snoozing**
26. **Project timeline**
27. **Multi-project overview**
28. **Vault health and compatibility**
29. **Section-aware long-note indexing**
30. **Broader hybrid retrieval**
31. **Local PDF extraction**
32. **PDF evidence and page citations**
33. **Project exports and checkpoints**
34. **Reviewed project package import**
35. **Fedora desktop launcher**
36. **Clear setup progress and feedback**
37. **Full-width Thread workspace**
38. **Claim classification and quality regressions**
39. **Reviewed claim corrections**
40. **Evidence-aware Ask follow-ups**
41. **Explicit conversation saves**
42. **Saved research collections**
43. **Durable project action records**
44. **Action board and recorded wrap-up**
45. **Project checkpoint comparisons**
46. **Reviewed Web Clipper intake**
47. **Validated local update previews**
48. **Recoverable local updates**
49. **Independent desktop vault reader**
50. **Desktop indexed evidence and source navigation**
51. **Desktop project home and recorded Resume**
52. **Desktop local AI setup and Resume interpretation**
53. **Desktop Ask evidence workbench**
54. **Desktop follow-ups and reviewed new-note saves**
55. **Desktop change review and recovery**
56. **Desktop decisions and managed questions**
57. **Desktop actions and session wrap-up**
58. **Desktop freshness and project reviews**
59. **Desktop capture and research collections**
60. **Desktop local PDFs and page citations**
61. **Desktop project portability**
62. **Desktop packaging and offline acceptance**
63. **Remembered desktop access**
64. **Plain-language desktop interface**
    64a. Main window and everyday flows; 64b. Ask, capture, research and PDFs; 64c. Decisions, actions, reviews, changes and portability.
65. **Desktop first run and new projects**

## Data and safety

Markdown and original attachments are authoritative; indexes/caches rebuildable.
New records have stable IDs and readable YAML/Markdown, with namespaced thread_*
fields. Legacy notes need no forced conversion. Properties/headings/explicit links
establish project membership, never read permission. Explicit read roots start
empty; exclusions precede reading/indexing/retrieval/context and reuse. PDF original
bytes need separate exact-file consent. Imported content and model output are
untrusted data, never commands, permissions or raw executable HTML.

Projects: id/type/project status active|paused|archived, dates, objective/constraints.
Sources: optional identity/type/capture date/original URL or path and original text.
Decisions: choice, alternatives, rationale, evidence, proposed|accepted|superseded,
explicit decided/revisit dates and supersession. Sessions: dated user-reported
progress, decisions, questions and suggested next action. Knowledge: concept or
comparison with dated sources. Outputs: briefing/answer/review, generated time,
model, evidence and readable content. Never infer verified events from file mtime.
Questions, actions, corrections, conversations, collections and review events use
the versioned schemas in their feature archives; retain historical provenance.

Evidence binds path/stable note ID, heading/block, excerpt and full content hash.
Resolve identities under present scope; changed/missing/excluded dependencies
invalidate outputs/previews. Citations validate identity, not semantic truth.
Model prompts are bounded structured requests over selected current evidence.

Writes require explicit approval of exact previews. Creates refuse collisions;
updates revalidate before hashes and source context. Preserve affected originals
before the first write; recheck each operation and expose partial recovery.
Undo checks after hashes to preserve later user changes. Last-20-batch change
history is bounded recovery, not an independent vault backup. Never auto-delete,
move or silently expand grants. Unknown/invalid journals fail closed and survive.

## Stack and source boundaries

Strict TypeScript, npm lockfile, esbuild, Node >=22.15 for tools. Plugin entry
src/main.ts uses Obsidian Vault/storage/native DOM/theme APIs, with host modules
external. UI src/ui; vault parsing/scope/records src/vault; retrieval src/retrieval;
AI src/intelligence; portability src/portability; offline extraction src/pdf.
Plugin-only updater/launcher src/desktop. Local cloud-disabled loopback Ollama
for chosen downloaded text/optional embedding models, no hosted fallback or silent
install/download. PDF.js owned worker/assets, no CDN/document scripts/network.

Standalone src/standalone uses Electron main process, narrow typed preload and
sandboxed context-isolated renderer without Node access. Direct filesystem adapter
validates paths/identities/scope; never emulate Obsidian or import its runtime in
the desktop bundle. Reuse pure domain logic, native DOM and esbuild; no web server.
The plugin remains available. Desktop features do not imply Obsidian plugin/theme
compatibility. Electron is a separate dependency/build/distribution target.

## Desktop contracts (49-62)

Selecting a vault grants no note access. Native picker selects the root, followed
by explicit preview/approval of relative read roots/exclusions. Bound traversal,
bytes and output; reject links/escapes and report omissions. Feature 49 is a literal
Markdown source reader with volatile grants, no AI/writes and no plugin-state read
or mutation. Restart requires fresh permission. Feature 50 adds safe formatting,
links, shared index/search and external-change invalidation. Then home/recorded
Resume (51), model setup/AI Resume (52), Ask/hybrid search (53), conversations and
reviewed new saves (54), changes/recovery (55), records/actions/reviews/research
(56-59), PDFs (60), portability (61), and distribution/offline acceptance (62).

Everyday use (63-65): opt-in remembered access for one vault (folder + identity,
roots, exclusions, project mapping, AI selection) in the profile outside the vault;
launch shows it and reads nothing until one click, then revalidates vault, paths and
loopback cloud-disabled model (no AI if unavailable). Moved/replaced vaults refused;
PDF consent and writing stay per-session; Forget clears it. 64 rewrites desktop text
plainly (detail behind Details; Resume/Ask/Capture first) without removing actions,
limits or safety. 65 adds a skippable welcome (folder, access, Ollama commands +
connection test, synthetic sample) and New project via shared starter notes, all
exact reviewed new-note saves after explicit writing enablement.

Keep desktop profile settings/caches/history outside vault/repository by default;
explicit ignored local profiles are allowed for development/tests. Before writes,
freeze compatible versioned persistence and cross-process ownership policy. Never
silently inherit grants/PDF consent, migrate/reset/share plugin journals or erase
pending plugin recovery. Hash checks alone are not a multi-process transaction.
Current file reads and source revalidation precede reuse/saves. Exact reviewed
writes and all existing recovery/undo boundaries persist in the new adapter.
No note copy/sync database: both applications use the same Markdown files.

Desktop has its own light/dark local CSS/fonts and source navigation; no automatic
external links/attachment launch. UI tests run actual Electron with synthetic vaults
and isolated profiles, not a webpage mock. Keep Obsidian evidence for plugin
behavior changes and shared-core regressions. Package desktop separately; the
plugin-only updater cannot install desktop binaries. Fedora first, other platforms
only after verification. No system-wide/user desktop installation by default.

## UX, costs and deployment

Serif headings, amber recorded context, dashed periwinkle AI, source chips, native
accessible controls, visible focus, keyboard/light/dark support. Useful idle, busy,
empty, canceled, stale, denied and failure states. Relevant async changes revoke
obsolete outputs; cancellation/unload cleans tasks. Non-AI work stays useful offline.

No required hosting/account/API/subscription. Hardware, downloads, storage, power,
time and optional development assistants cost resources. Private UNLICENSED;
public license/distribution deferred. Obsidian is free, not open source. Model and
dependency licenses remain separate. No mobile AI, team/collaboration, autonomous
agent, OCR/audio, automatic web fetching, billing or cloud service scope.

Plugin package dist/thread-0.4.2.zip has 192 inventoried files including PDF resources;
install into a separate test vault's .obsidian/plugins/thread. npm run dev only
rebuilds the plugin. Verify = npm run verify (typecheck, tests, production build).
Separate desktop build/start commands arrive with 49; shipping package arrives in 62.
Do not substitute artifact success for runtime acceptance. No CI configured.

Known verified plugin environment: Linux, Obsidian 1.14.4, Ollama 0.40.4,
qwen3:4b-instruct. No universal scale/model-quality promises; live evaluation38
retains14/15 with one proposed-decision paraphrase conservatively interpreted.
Normal pushes to existing origin are separately authorized; no force push,
remote changes, public release, deployment, paid services, system-wide install,
user-process termination or destructive user-data operations. Preserve reports.

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
