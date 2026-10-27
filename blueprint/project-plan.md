# Thread - Project Plan

Planning date: 2026-10-14. This is the product direction for a desktop Obsidian
plugin, extended by the approved independent desktop application below.
The accompanying build plan is the ordered implementation checklist;
individual feature specs will define the exact changes and acceptance evidence.

## 1. Problem - What problem are we solving?

People save useful information in Obsidian but lose the context needed to use it.
A project can have good notes and still be difficult to resume: the last action,
accepted decisions, reasons, unresolved questions, and relevant new evidence are
scattered across files. Maintaining summaries and connections becomes another
task, and knowledge stops helping when the user forgets where to look.

Thread helps a person return to a project, recover their reasoning, and choose a
useful next step. Its central promise is: "Open a project after two weeks away
and understand where you left off within a few minutes."

The product uses the AI-maintained wiki pattern: preserve original sources,
derive connected knowledge from them, and keep those connections useful over
time. Its distinctive workflow is project continuity and decision history.
Chat, retrieval, and generated summaries serve that workflow.

### Example of the core experience

A user is building a language-learning app. Their vault holds interview notes,
research articles, prototype sessions, and a decision to postpone live voice
conversations. They select the project and choose **Resume project**. Thread
returns a short briefing with links to the passages it used:

- Objective: test whether beginners benefit from short speaking exercises.
- Last activity: compared two ways to present corrections.
- Recorded decision: postpone live voice features because of prototype cost.
- Open question: whether corrections should appear during or after an exercise.
- New evidence: an interview added since the previous project review.
- Suggested next action: test both correction styles with three participants.

Recorded facts, the model's interpretations, and suggestions are visually
distinct. If the notes do not establish the last activity or a decision's
reason, the briefing says that information is missing.

### Outcomes and success measures

- A project can be resumed without manually rereading all its notes.
- Important factual claims in generated output have working source references.
- An unsupported question produces an explicit evidence gap rather than a guess.
- Decisions preserve the reasons and constraints that made sense at the time.
- Approved generated knowledge remains useful after Thread is disabled.
- The released core workflow runs without API keys or paid services.

Evaluate the first release with a small synthetic vault, at least three realistic
projects, and a repeatable question set. A proposed usability target is a useful
briefing within two minutes on the user's chosen hardware. Actual performance
must be measured; this target is not a hardware-independent promise.

## 2. Users - Who is this for?

The first user is an individual builder or researcher who already uses Obsidian
or is willing to use a folder of Markdown notes. Initial use is personal, on one
desktop computer, with multiple projects in a vault.

| User | Need |
| --- | --- |
| Independent developer or solo founder | Resume experiments and recover product decisions without repeated setup. |
| Student or researcher | Connect sources, find evidence, and preserve unanswered questions. |
| Writer or other knowledge worker | Recover a project's thread and reuse prior research. |

No account or login is required. Users control their files, select which folders
Thread may read, and approve changes to durable knowledge. Codex and Claude Code
help develop the plugin; users do not need either assistant to run the app.

## 3. Features - What does the MVP need?

- **Local project briefings:** summarize a selected project's objective, last activity, decisions, questions, and suggested next action with source links.
- **Reusable project workspaces:** map existing vault folders or create project notes and templates without forcing a vault migration.
- **Indexed evidence recall:** retrieve relevant passages using local text search, note metadata, and explicit links, keeping the index current.
- **Ask your vault:** answer scoped questions with evidence, uncertainty, and an option to save a useful answer as a new note.
- **Decision records:** capture alternatives, reasoning, evidence, and explicit conditions for revisiting a choice.
- **Inbox capture:** save a thought or import Markdown and text with provenance, duplicate detection, and suggested project association.
- **Reviewed knowledge updates:** preview AI-proposed summaries and links, then apply approved changes with conflict checks and recovery.
- **Decision evidence review:** flag potentially conflicting or relevant new evidence without silently replacing accepted decisions.
- **Session wrap-up:** save a reviewed record of progress, unresolved questions, and a proposed next step for the next briefing.
- **Weekly project review:** generate and optionally save a sourced summary of activity, resolved questions, and projects to revisit.
- **Source freshness:** show changed or missing supporting passages and regenerate derived output without erasing its history.
- **Offline release readiness:** provide installable plugin artifacts, setup guidance, and demonstrated end-to-end operation in Obsidian.

### Scope and build strategy

The first vertical slice is a read-only project briefing. It includes the minimum
local-model connection, explicit folder scope, and citation checks needed to
make the feature usable. It does not depend on a global semantic index or an
AI writer. Later slices reuse this connection and evidence contract.

For the initial release, import Markdown and plain text, including articles
already saved with Obsidian Web Clipper. Other file types may remain attachments
and open in Obsidian, but Thread must not claim to have read their contents.

Save generated answers and briefings as new notes only after a user action.
Edits to established notes always use the reviewed-change workflow. During an
early feature that cannot safely persist an output yet, keep it in the panel.

### Initial-release deferrals and approved follow-ups

Mobile AI execution, cross-device inference, team collaboration, autonomous
background agents, cloud model APIs, semantic embeddings, model fine-tuning,
email/calendar integrations, a custom browser extension, audio transcription,
PDF extraction/OCR, arbitrary web browsing, billing, and hosted dashboards are
outside this release. Add them only after the core workflow is evaluated and a
separate scope decision is recorded. Weekly reviews run on demand; they do not
require a scheduler or a computer that stays on overnight. The approved follow-up
sections below supersede only the local semantic-search deferral (features
13-21) and selectable-text PDF extraction/import (features 31-32). OCR, audio,
remote fetching and the other deferred capabilities still require separate scope.

## 4. Data - What are we storing?

### Storage ownership

Markdown notes and their supporting files are authoritative. Keep original
imported source content intact during AI processing. A user may intentionally
edit a source in Obsidian; Thread then treats it as changed evidence.

Settings, rebuildable indexes, and pending changes live under the installed
plugin's own directory, `<vault>/.obsidian/plugins/thread/`, through the Obsidian
storage adapter. Exclude that directory from retrieval. Runtime data must never
be written to the development repository by default.

Persist approved summaries, decisions, sessions, and reviews as readable notes.
Do not require a separate cloud database. A plugin cache is never the only copy
of an accepted decision or an approved answer.

### Suggested vault layout

```text
My Vault/
  Home.md
  Inbox/
  Projects/
    Language Learning App/
      Overview.md
      Questions.md
      Decisions/
      Sessions/
  Sources/
    Articles/
    Interviews/
    Documents/
  Knowledge/
    Concepts/
    Comparisons/
  Reviews/
  Templates/
  Attachments/
  Archive/
```

Folder names are defaults, not required migrations. A user can map an existing
layout to these roles. Project membership can use a stable project ID in note
properties, containment in a mapped project folder, or explicit linked sources.
Do not read a linked source outside the configured allowed scope.

### Durable note contracts

Use YAML frontmatter for machine-readable identity and Markdown for content.
Existing notes remain eligible without custom frontmatter; do not rewrite a
whole vault to add it. New Thread-created notes get an `id` that survives rename.
Prefer namespaced `thread_*` metadata for settings specific to the plugin.

| Record | Core fields and content |
| --- | --- |
| Project | `id`, `type: project`, `status: active\|paused\|archived`, `created`, `updated`; objective, constraints, and linked project notes. |
| Source | Optional stable `id`, `type: source`, `captured_on`, original URL/path when known, content hash in the index; original text and local attachments. |
| Decision | `id`, `type: decision`, `project`, `status: proposed\|accepted\|superseded`, `decided_on`; question, choice, alternatives, reasoning, evidence, revisit conditions, optional superseding decision link. |
| Session | `id`, `type: session`, `project`, `recorded_on`; progress, explicit decisions, unresolved questions, and suggested next step. |
| Knowledge note | `id`, `type: concept\|comparison`, `updated`, source references; synthesis that separates evidence from interpretation. |
| Saved output | `id`, `type: briefing\|answer\|review`, optional `project`, `generated_on`, model identifier, evidence references; generated text with visible provenance. |

Generated suggestions must not become accepted decisions automatically. The user
explicitly accepts a decision. Superseding a decision preserves its text and
links it to the replacement. Record event dates and capture dates separately
when they differ. Use the user's local timezone for dates they see.

### Internal records

- **Evidence reference:** note ID when present, vault-relative path, heading or
  block anchor, excerpt, and content hash. The ID helps locate renamed notes;
  the hash detects a changed passage. Re-resolve the current path before opening.
- **Index entry:** path, note ID, title, relevant properties, parsed headings,
  outgoing links, eligible text chunks, and content hash. Rebuild from the vault
  and invalidate changed, renamed, deleted, or newly excluded notes.
- **Change proposal:** ID, creation time, target paths, operation (`create` or
  `update`), expected before-hashes, proposed content, and source references.
  Lifecycle is pending, applied, rejected, stale, or recovery-required.
- **Change history:** proposal ID, time, target paths, original content needed
  for recovery, and after-hashes. Keep a bounded local history of the last 20
  applied batches for the MVP; do not imply permanent version history.
- **Plugin settings:** selected local model, loopback endpoint, folder mapping,
  allowed/excluded paths, request timeout, and selected project. No API keys.

### Data integrity rules

- Read only eligible user-selected Markdown/text; filter excluded paths before
  indexing, retrieval, and model-context construction.
- Project-wide and vault-wide scope are explicit choices. First-use scope is
  empty until the user selects folders; never read the entire vault implicitly.
- Validate target paths, record shapes, and citation existence in application
  code. The model cannot grant itself access or run shell commands.
- A source document's instructions are evidence text, not application policy.
- Before applying an update, compare the current content with the proposal's
  before-hash. A concurrent user edit makes that proposal stale.
- Before a multi-note update, preserve every affected note's original content.
  Revalidate before each write, attempt rollback on failure, and surface any
  incomplete recovery with the exact affected paths. Do not promise a truly
  atomic filesystem transaction through the Obsidian API.
- Undo restores an applied change only if current contents still match the
  recorded after-hash. Otherwise offer a comparison to avoid erasing newer work.
- Never delete or move user notes automatically. A cache reset affects only
  Thread's derived data and offers a clear confirmation.

## 5. Tech - What stack are we using?

### Current scaffold and intended architecture

| Technology | Role |
| --- | --- |
| TypeScript | Plugin source, typed data contracts, retrieval, and validation. |
| Obsidian plugin API | Desktop UI, commands, settings, Markdown rendering, vault events, and file access. |
| Native Obsidian DOM helpers and CSS variables | A theme-compatible interface without a separate frontend framework. |
| esbuild | Bundle `src/main.ts` into the CommonJS `main.js` loaded by Obsidian. |
| Node.js 22+ and npm | Development tooling; exact dependency versions are recorded in `package-lock.json`. |
| Ollama with a downloaded local model | Local generation; no cloud fallback in the release scope. |
| Local text and link index | Deterministic evidence retrieval; no required embedding service or vector database. |
| AI Blueprint 1.13.0, Codex and Claude Code adapters | Development planning and verification, outside the app runtime. |

Use a small model-provider boundary for connection and generation; implement
only the Ollama provider now. Model selection should be configurable rather
than hardcoded. Benchmark candidate small quantized models on summaries,
evidence gaps, and conflicting statements before recommending one. No model
weights or inference server are bundled with the plugin.

Ollama connections are loopback-only for this release, with cloud features
disabled (`OLLAMA_NO_CLOUD=1` or the documented equivalent). The setup flow checks
availability and model selection, rejects cloud-model use, and gives actionable
instructions when the model is missing. Model downloads require internet;
normal inference after setup does not. The plugin does not silently install
Ollama, pull multi-gigabyte models, or change the computer's services.

### Repository structure

```text
thread/
  src/
    main.ts
    ui/                 # Briefing, ask, capture, and change-review views.
    vault/              # Eligible reads, parsing, events, and validated writes.
    retrieval/          # Text/link index and bounded evidence selection.
    intelligence/       # Ollama connection and explicit generation workflows.
    changes/            # Proposals, stale checks, apply, and undo.
    settings/           # Folder mapping, scope, and local-model setup.
  templates/            # Added when project/decision creation needs them.
  blueprint/            # Plans, generated context, and workflow history.
  .agents/skills/        # Codex adapter.
  .claude/skills/        # Claude Code adapter.
  manifest.json
  package.json
  package-lock.json
  esbuild.config.mjs
  tsconfig.json
```

Only `src/main.ts` exists in the source tree at setup. Add other directories as
their feature needs them; this diagram is an intended boundary map, not a demand
to create empty abstractions.

### Evidence and generation pipeline

1. Resolve the selected project or explicit vault scope and remove excluded paths.
2. Read eligible files, parse Markdown, and retrieve relevant passages.
3. Select a bounded bundle using titles, project membership, text matches, links,
   and recorded dates. File modification time is a fallback, not event truth.
4. Send only this evidence and the requested output contract to the local model.
5. Validate output shape and resolve source IDs to real passages; mark invalid
   or missing citations rather than presenting unsupported text as verified.
6. Render facts, interpretations, gaps, and suggestions distinctly.
7. Save a new output on request, or review a proposed update before applying it.

Persist synthesized knowledge for reuse, while retaining direct retrieval of
original evidence. Do not assume a generated summary captures every detail or
that adding a citation proves semantic support. Review and evaluation remain
necessary for contradiction detection and other interpretive tasks.

### Commands and verification

The scaffold has `npm ci`, `npm run dev`, `npm run typecheck`, `npm run build`,
and `npm run verify`. Verify runs typechecking, focused logic tests through Node's built-in TypeScript
test runner, and the production build. It does not launch Obsidian. The runner
discovers adjacent `*.test.ts` files and rejects an empty suite.

The first feature explicitly configures the Node test runner for parsing, scope
validation, and citation logic. Cover real
failure cases, including unsupported questions, malformed model output,
exclusions, renamed/missing sources, concurrent edits, and partial write failure.
Once configured, add its command to Verify and the project agent instructions.
Do not add an empty passing suite or tests that merely repeat implementation.

UI and integration proof comes from a separate synthetic Obsidian test vault.
Test cancellation, model-not-running errors, plugin unload, theme compatibility,
and keyboard access. A green build does not prove the Obsidian experience.

## 6. Monetize - How will this make money?

The initial release is a personal-use project with no monetization requirement.
Do not build accounts, subscriptions, ads, license enforcement, or payment flows.
Keep a complete local experience available without paid APIs.

| Cost item | Required cost for the local release |
| --- | --- |
| Obsidian app | $0 in required subscription fees. |
| AI Blueprint and build tools | $0 in required license fees. |
| Ollama and an appropriately licensed downloadable model | $0 in required runtime service fees. |
| Database, hosting, domain, and server | $0; none is needed. |
| Sync or Publish | Optional; neither is a runtime prerequisite. |
| Electricity, storage, and existing hardware | Real costs; depend on the user's equipment and usage. |
| Developer time | Real effort; hiring or paid development assistants are optional costs. |

Codex and Claude Code adapters do not include free access to the underlying
assistant services. Any development subscription or usage payment is separate
from Thread's runtime costs. A plugin with no API bills is not a claim that all
development labor and hardware are free.

Before recommending a model or distributing an app bundle, verify the model's
own license and dependency redistribution terms. Obsidian is free to use but is
not open-source. Blueprint being open-source does not determine Thread's license.
The scaffold remains private with `license: UNLICENSED` until the user chooses
whether to publish and under what license.

## 7. UI/UX - How should this look and feel?

Thread should feel like part of Obsidian: compact panels, readable Markdown,
native controls, and the current theme's colors and typography. Prioritize
useful summaries and clear evidence over a decorative knowledge graph.

| Surface | Primary behavior |
| --- | --- |
| Thread sidebar | Choose a project and run Resume, Ask, Capture, or Review. |
| Project briefing | Objective, last recorded activity, accepted decisions, open questions, new evidence, and a suggested next action. |
| Ask panel | Scope selection, question input, sourced answer, missing evidence, and explicit save action. |
| Capture dialog | Text/Markdown input, provenance, project suggestion, and import review. |
| Decision editor | Choice, alternatives, reasoning, evidence, and revisit conditions. |
| Change review | Before/after comparison, affected notes, source links, apply, reject, and stale-state explanations. |
| Settings | Local-model connection, folder mapping, exclusions, and derived-data reset. |

### Interaction rules

- The first useful action is **Resume project**; setup asks only for what that
  action needs. A returning user lands on their selected project.
- Existing vaults can be mapped in place. Creating a starter structure is an
  explicit option with a preview of the new paths and no overwrites.
- Every briefing displays when it was generated and the latest recorded activity.
- Relevant source links open the actual note near its supporting passage.
- New evidence means material added or changed since a recorded session/review.
  If there is no baseline, say so instead of inventing a comparison.
- Suggested actions remain suggestions until the user records a choice.
- Provide idle, loading, streaming, empty, canceled, stale, and failure states.
  Long local generation must be cancelable and must not freeze the editor.
- Avoid fabricated confidence percentages. Explain uncertainty in plain language.
- Support keyboard navigation, visible focus, descriptive controls, and both
  light and dark themes. Do not communicate status through color alone.
- Show clear setup instructions when Ollama is unavailable. Keep ordinary note
  editing usable when inference fails.

## 8. Deployment - Where and how will this ship?

This is a desktop Obsidian plugin installed on the user's computer. No web host,
domain, remote database, login server, remotely hosted worker, or cron job is required.

- Build command: `npm run build`.
- Output: `main.js` in the repository root; ship it with `manifest.json` and
  `styles.css` when styling is introduced.
- Plugin destination: `<test-vault>/.obsidian/plugins/thread/` for development,
  then a chosen user vault after release checks.
- Start: enable Thread in Obsidian Community plugins. `npm run dev` is a bundle
  watcher, not a web server and not a command that launches Obsidian.
- Model prerequisite: a separately installed Ollama runtime and downloaded local
  model. Document local-only configuration; no secret environment variables.
- Storage: notes in the vault, derived plugin data in the plugin directory.
- Health check: a user-triggered local connection/model test in Settings.
- Packaging: validate manifest/version consistency and test the exact packaged
  artifacts on a clean synthetic vault before declaring release readiness.

Start with manual local installation. Community-plugin submission, public Git
hosting, release publication, automatic updates, and a public software license
require later user decisions. Do not publish or deploy as part of setup.

## 9. Usage model and constraints

### Confirmed constraints

- Personal desktop use, one user and one active vault per plugin instance.
- Linux is the current development environment; target desktop Obsidian on
  Linux, macOS, and Windows. Claim support only for platforms actually verified.
- The completed 0.2.0 manifest requires Obsidian 1.14.4, its tested minimum.
  New APIs or platforms require evidence before changing compatibility claims.
- No Internet-facing inference endpoint. Local inference must use loopback.
- Original notes may contain sensitive personal information and imported text.
  Eligibility filtering and reviewed writes are required boundaries.
- Start evaluation with hundreds of notes and several projects. This is an
  evaluation scale, not a stated maximum or a performance guarantee.
- RAM, GPU capability, Ollama installation, preferred model, and the user's real
  vault structure are not yet known. They do not block planning or scaffolding.
- No compliance certification, multi-tenant isolation, 24/7 availability, or
  autonomous operations are required for this release.

### Release acceptance

1. Resume a realistic project with working links for recorded facts and visible
   gaps for missing information.
2. Answer an evidence-backed question and refuse to invent an absent answer.
3. Keep excluded notes out of the index and model requests, including after
   settings change or an old result is reused.
4. Preserve accepted decisions when new evidence disagrees; propose a review.
5. Import a source without modifying its original content or duplicating an
   identical import silently.
6. Reject stale edits, recover from interrupted multi-note updates, and protect
   later user changes during undo.
7. Detect renamed, changed, and deleted supporting notes and report stale output.
8. Run core inference with internet disconnected after initial model setup.
9. Keep saved decisions, summaries, and reviews readable with Thread disabled.
10. Install the packaged artifacts in a clean test vault and complete the core
    workflow using documented commands and UI actions.

### Decisions to resolve when they become necessary

- Choose and benchmark a local model on the user's actual hardware before
  promising acceptable generation speed or reasoning quality.
- Choose a real synthetic test-vault path and confirm Obsidian availability
  before the first integration demonstration.
- Map the user's existing vault only when they explicitly select its folders.
- Choose licensing and distribution before a public release.

## Research references

These informed the product direction; no existing implementation is a mandatory
runtime dependency. Recheck versions and terms when implementing integrations.

- [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian pricing](https://obsidian.md/pricing.html)
- [Obsidian Web Clipper](https://obsidian.md/help/web-clipper)
- [Ollama local operation and configuration](https://docs.ollama.com/faq)
- [AI Blueprint](https://github.com/aiblueprinthq/ai-blueprint)


## Approved improvements - completed local 0.2.0

Approved on 2026-10-15. Preserve completed features 1-12 and their archives.
This follow-up supersedes the initial-release deferral of optional local semantic
search only; cloud inference, autonomous writes, publishing and paid services
remain outside scope. Features 13-21 follow the ordered build plan and are now
complete; their verified specs and review receipts remain in immutable history.

- Evaluate answer quality with tracked synthetic notes/questions, explicit known
  expectations and opt-in real local-model runs. Baselines may disclose model
  weaknesses; format/citation checks do not prove unrestricted semantic truth.
- Present deterministic recorded context before AI generation. Recognized
  headings/properties and user reports remain sourced; missing/ambiguous legacy
  structure is visible. AI interpretations do not replace recorded facts.
- Add a native project home and quick selector restricted to existing grants.
- Improve keyword ranking/filtering and allocate bounded context across relevant
  sources and roles. Show truncation/omission without claiming full-vault coverage.
- Add opt-in local embeddings/hybrid retrieval. Keyword search remains available
  when disabled or the embedding model is missing. Use the existing loopback and
  cloud-disabled checks; scope/freshness filtering precedes embedding/retrieval.
  Additional model weights are a separate explicit download, never bundled.
- Improve review with real line diffs, editable drafts and renewed exact preview
  approval. Keep related operations together and preserve hash/conflict guards,
  durable originals, last-20-batch history and conservative recovery behavior.
- Guide setup using compatible downloaded local models, explicit folder grants
  and useful diagnostics. Connection and quality checks are different signals.
- Index changed notes/dependencies incrementally; scope changes immediately scrub
  unavailable content. Unrelated changes should not cancel safe independent work.
- Offer an on-demand project review queue. Revisit dates are explicit; free-text
  conditions and possible answers/conflicts need human judgment. No automatic
  status changes, question resolution, notifications or scheduled services.

Use native Obsidian views/controls and theme variables. Keep settings and durable
history compatible; derived caches are disposable and must fail closed when
invalid or unavailable. Source Markdown remains authoritative and raw originals
stay unchanged. This is still a private local product; no public licensing,
paid API, system-wide install or deployment is introduced. The user separately
authorized Git pushes to their supplied repository on 2026-10-16.

The tested baseline is Linux, Obsidian 1.14.4, Ollama 0.40.4, Node 22.22.2 and
qwen3:4b-instruct on the available laptop. Development requires Node 22.15+.
The 0.1.0 release uses minAppVersion 1.14.4. Other platforms/models and large
vault performance require their own evidence. Test only synthetic vaults.
Local model and optional embedding downloads, storage, memory and power remain
real costs; no mandatory paid runtime is introduced. Features 1-21 form the
verified private 0.2.0 baseline for the next approved queue.

## Approved improvements - daily research and project portability

The user approved all ten additional proposals on 2026-10-16. Build-plan features
22-34 retain them all. The larger retrieval, PDF and portability proposals are
each split into two serial features. Features 22-34 are now complete in the
private local 0.3.0 baseline. Exact verification, schemas, budgets and limitations
remain in their immutable archives; preserve their bytes.

### Everyday evidence and follow-up (22-25)

- **22. Editor selection actions:** Offer native commands for Ask about this,
  Find related evidence, and preparing question/decision drafts from permitted
  selected text. Carry source identity and a current snapshot into the workflow.
  Selection does not silently authorize the rest of a note or widen grants;
  changed/unsaved source text must be reconciled before durable citation/save.
  A draft never accepts a decision or edits the original selection implicitly.
- **23. Evidence workbench:** Show retrieved passages together before Ask; let
  users include, exclude or pin evidence for that request and inspect the final
  bounded context. Compare answer claims with cited passages side by side. Pins
  cannot bypass scope, current hashes, stale-output filtering or context budgets.
  Show omissions and uncertainty rather than fabricated support/confidence scores.
- **24. Managed project questions:** Store optional new question records as
  readable Markdown with stable ID, project, explicit open/investigating/answered
  state, recorded dates, question, optional answer and evidence. Answering and
  reopening require a user action; preserve prior answers/reasons and link
  related decisions. Existing question sections continue to work. Conversion is
  optional and previewed; never bulk-rewrite a vault or automatically resolve prose.
- **25. Review acknowledgements and snoozing:** Save explicit reviewed/no-change
  or revisit-date records linked to current target/source snapshots. Offer
  follow-up question and decision-review drafts. New relevant hashes/identities
  resurface an item even if an older snapshot was reviewed or snoozed. These
  actions do not make derived output current, validate a claim, accept a decision
  or resolve a question. No scheduler, notifications or autonomous actions.

### Project context and vault compatibility (26-28)

- **26. Project timeline:** Combine recorded sessions, saved reviews, explicit
  milestones and decision/supersession links in chronological order. Distinguish
  event dates from capture/modification dates, label unknown chronology and open
  only currently permitted sources. Never reconstruct unsaved earlier note
  contents or imply a complete historical event log. Milestones are user records.
- **27. Multi-project overview:** Aggregate recorded activity, questions, due
  reviews and visible proposals across already permitted projects. Filter
  active/paused/archived records, switch projects without new grants and allow
  explicit next-action selection through a previewed record change. Display
  counts/coverage and transparent sorting, not inferred priority/health scores.
  The default overview needs no model and does not silently launch inference.
- **28. Vault health and compatibility:** On demand, diagnose duplicate IDs,
  invalid dates, unresolved references, missing project associations and headings
  that recorded-context parsing cannot recognize. Explain each practical effect
  and coverage limit. Offer one reviewed repair at a time only within existing
  write policy; give manual guidance for protected original sources. No automatic
  cleanup, migrations, ID reassignment or widening of read permissions.

### Broader local evidence (29-32)

- **29. Section-aware long-note indexing:** Replace silent prefix-only coverage
  with bounded section processing, configurable limits, visible indexed/omitted
  coverage, progress and cancellation. Preserve immediate exclusions, incremental
  dependency invalidation and source hashes. Measure responsiveness, read counts
  and memory-related budgets on larger synthetic fixtures; do not promise an
  arbitrary vault size or remove bounds. Derived cache upgrades may rebuild;
  authoritative records and durable journals/settings must remain compatible.
- **30. Broader hybrid retrieval:** Build on section indexing to examine a wider,
  explicitly budgeted candidate set, with balanced selection and a user-triggered
  search-more action when relevant evidence may be omitted. Keep bounded model
  context, finite memory/work and honest coverage. Keyword-only retrieval remains
  usable without embeddings. Reuse local model-digest/vector checks, cancellation
  and scope guards; no mandatory vector database, remote service, automatic model
  download or unattended whole-vault embedding job.
- **31. Local PDF extraction:** Read only explicitly selected local PDFs with
  explicit binary-read consent; existing Markdown/text grants alone must not
  silently turn on PDF reads. Enforce current exclusions and preview import/copy
  destinations. Preserve originals and reject collisions. Preview bounded page
  text before saving a derived Markdown source with original identity/hash,
  extraction version, page mapping and limitations. Start with selectable text;
  image-only, encrypted or unsupported files need clear handling, not guessed
  content. A local appropriately licensed parser such as PDF.js is an approved
  dependency candidate; verify compatibility/license at implementation. Bundle
  required worker/assets locally in an explicitly verified package inventory;
  never fetch a CDN, linked URL, remote font or document script at runtime.
- **32. PDF evidence and page citations:** Make approved extracted text useful
  to Find, Ask, Resume and explicit review workflows, with page references and
  current original-file verification before opening/reusing evidence. Preserve
  extraction provenance and distinguish extracted text from a model summary.
  Changes, removal or exclusions of original PDFs invalidate their extracted
  evidence/dependent output immediately; cached copies must not bypass consent
  or scope. Re-extraction is explicit and must preserve originals and prior
  approved notes. Demonstrate actual PDF page navigation and offline packaged use.

### Portable project context (33-34)

- **33. Project exports and checkpoints:** Explicitly select a project and its
  permitted records/supporting files, inspect an inventory and omissions, then
  create a non-overwriting local package. A versioned manifest records package
  identity, creation time, project identity and vault-relative entries with type,
  byte length and hash, plus safe provenance/link information. Recheck scope and
  snapshots before export. Omit scope-invalid/stale derived evidence by default
  and do not enumerate excluded reference paths in manifests. Never include
  plugin settings/secrets, caches, recovery originals, models or runtime files
  automatically. Markdown remains readable without Thread; document that this
  selected checkpoint is not a full vault backup or permanent change journal.
- **34. Reviewed project package import:** Treat every package as untrusted input.
  Validate version, supported types, normalized relative paths, file counts,
  compressed/expanded sizes and hashes before any writes. Refuse path traversal,
  links/unsupported executable assets and malformed packages. Preview new-copy
  destinations, link/identity mapping, duplicate identities and all collisions.
  Default to a new folder; never overwrite existing notes or silently rewrite
  their IDs. Changes to imported copies require the exact reviewed preview.
  Revalidate destinations during apply, preserve partial-failure recovery and
  leave imported folders outside Thread read grants until explicitly selected.
  No destructive restore mode. Demonstrate offline export/import round trips,
  source/provenance safety, collision/concurrent-edit refusal and recovery.

### Shared contracts, costs and verification

Keep new durable questions, review events, milestones and chosen next actions in
readable Markdown. Review-event records must be distinguishable from AI-generated
review baselines so acknowledgement is never mistaken for new evidence. Derived
indexes, candidate vectors and diagnostics remain rebuildable. Freeze exact
validated schemas and namespace choices in each feature spec, with compatibility
tests before later consumers depend on them. No forced conversion of legacy notes.

All ten proposals must remain usable with no required API/hosting/subscription
charge. Non-AI surfaces work without Ollama; AI uses the existing cloud-disabled
loopback provider. Larger indexes, PDFs and project packages use real storage,
memory, CPU time and electricity. Development assistant costs are separate.
No mobile inference, audio/OCR, web fetching, collaboration, background agents,
paid model provider or public distribution is introduced by this approval.

Use project-local appropriately licensed dependencies only where justified.
Run Verify, meaningful logic tests and required independent reviews for each
feature. Native Obsidian acceptance must use synthetic vaults, including real
local text/embedding inference where relevant, direct keyboard/theme checks,
current source/page links, cancellation, exclusions and stale-data races. Use
authored synthetic PDFs/packages for extraction, malformed-input, traversal,
resource-limit, collision and partial-write cases; never test on personal notes.
Extend reusable quality fixtures when retrieval/evidence formats change.

Preserve features 1-21, their archive bytes, note conventions and durable import,
rename and change history. Keep raw sources unchanged and require exact renewed
approval before writes. Package and install the final new version only after its
feature queue passes; record the actual artifact inventory, reproducibility,
offline behavior, model/runtime versions and platform/scale limits. Previous
release artifacts/history are evidence, not permission to claim new support.

## Approved improvements - usability and continued research (35-48)

Approved on 2026-10-20. All ten proposals are retained in the serial build plan.
The reviewed panel redesign is part of the baseline. Features 35-48 are planned,
not claims of implemented behavior. Preserve features 1-34, their IDs, immutable
archives, prior reports and all durable user history. No standalone web app,
hosted service, mandatory subscription or autonomous note changes are introduced.

### Launch, setup and workspace (35-37)

Provide a Fedora-first user-level launcher and generated desktop shortcut for an
explicitly configured installed Obsidian and vault. Support the installed Flatpak
path and document verified alternatives. A plugin URI route opens Thread without
changing read grants or running inference. Validate launcher configuration and
pass arguments without shell interpolation of vault names or executable paths.
Detect an existing local Ollama server; optional startup requires explicit setup
consent and a configured local executable/model directory. Bind only loopback,
disable cloud features, validate the detected server and report actionable errors.
Never silently download models, install services or stop unrelated processes.
The shortcut is an artifact until the user explicitly approves installation.

Improve the existing setup flow rather than replace its permission model. Show
stage and next action, distinct sample versus existing-note paths, and visible
inline progress/results for connection checks. Preserve explicit model choice,
cancelable checks, read-access previews, exclusions and Save semantics. A sample
preview or model discovery grants no read access. Native first-use acceptance
must cover unavailable Ollama, missing models and successful local generation.

Add a full-width native Obsidian main-tab view while retaining the sidebar.
Home, Ask, Research, Actions and Reviews reuse current domain services and action
surfaces, with later features enhancing Actions and Research. Project switching
does not expand scope. Do not close or replace the user's existing notes or
layouts. Restore only validated view state; unavailable projects fail closed.
Keep keyboard access, theme compatibility, cancellation and unload cleanup.

### Claim classification, corrections and conversations (38-41)

Distinguish a sourced recorded statement, an AI interpretation and a proposed
action. A recorded postponement is not a newly proposed action merely because
it mentions future work. Reuse known note metadata and recognized structure;
do not turn arbitrary quoted prose or a model label into independently verified
truth. Strengthen structured output validation and reusable quality fixtures for
postponements, accepted/proposed/superseded decisions, missing support and genuine
recommendations. Preserve compatibility with existing saved output. Report actual
local-model evaluation results and limits; citation identity alone proves neither
semantic support nor factual correctness.

Allow explicit classification/text corrections before saving an answer. Preserve
original model wording/type, the user's correction, time and evidence provenance
in a readable versioned record; never silently rewrite sources or earlier saved
answers. A correction does not waive source freshness or access checks. Any edit
requires a renewed exact save preview. Unknown or invalid persisted correction
metadata must not be treated as verified evidence.

Add finite in-memory follow-up conversations to Ask. Freeze conservative turn,
character and evidence budgets in the spec and show omissions. Each turn has its
own current question, evidence choices, source hashes and generation provenance.
Earlier questions/answers may supply clearly labelled conversation context, never
authoritative evidence or new permissions. Revalidate all reused dependencies
before generation, display and save. Relevant note/project/scope/settings changes,
closing and cancellation revoke affected outputs and previews. Do not persist
conversations automatically; explicit preview/save creates readable Markdown
without overwrites. Versioned saved conversations retain per-turn evidence and
corrections; reopening cannot bypass current scope or stale-output protections.

### Research collections and project actions (42-44)

Persist named research collections as readable versioned Markdown with a stable
ID, project/scope identity, bounded evidence references and include/pin/exclude
intent. References use current source identity/heading/hash, not an authoritative
copy of formerly permitted text. Do not persist cached excerpts solely for reuse.
On reopen, resolve identities within current grants, re-read current content and
show changed/missing/unavailable status conservatively. Excluded paths and text
must not leak through collection display or model context. Reconfirm changed
selections; pins never bypass budgets, exclusions, PDF consent or stale-source
checks. Creating or editing a collection requires an exact reviewed preview.

Project actions are durable versioned Markdown records with stable ID, project,
title, explicit status and dated transition history. Internal status values
represent Planned, In progress, Blocked and Done; freeze exact schema in feature
43 before consumers. Optional source, managed-question and decision references
remain subject to scope/freshness checks. New actions and every transition require
human review and the existing exact-preview/write/recovery boundaries. AI may
prepare suggestions, never accept them or change status automatically. Retain
earlier transitions and distinguish recorded dates from independently verified
events. Legacy chosen-next-action notes remain supported without bulk migration.

Expose a lightweight accessible board using current permitted records, including
empty and unavailable states. Wrap up may use explicitly selected recorded
progress and current supporting evidence. A saved session or AI interpretation
must not itself move a card or establish that work was completed.

### Checkpoints and clipped research (45-46)

Compare an explicitly selected retained project export with current permitted
project content. Reuse strict package validation, finite budgets and original
manifest/hash snapshots. Show additions, removals and changed before/after content
only where current access allows it. A package is not permission to redisplay
excluded historical content; revalidate transitive dependencies and PDF consent.
Unknown history, omitted files and differences in selection must remain visible.
Do not infer earlier contents from mtime, silently restore notes or call a partial
checkpoint a complete project backup.

Support deliberately saved Obsidian Web Clipper notes through documented/importable
compatible templates and reviewed local intake. Preserve available source title,
author and URL; distinguish published/event dates from capture dates. Missing or
ambiguous metadata stays unknown. Preview associations to existing permitted
projects and possible duplicates; never automatically merge, overwrite originals
or infer that similar titles prove duplicate identity. Imported text and URLs
are untrusted data; Thread does not fetch, crawl, execute or follow them.
Use authored synthetic clipped notes for offline native acceptance.

### Safe explicit local updates (47-48)

Build a local helper for explicitly chosen Thread installation/package paths.
Validate package identity/version, exact supported code/asset inventory, sizes,
hashes and host/data compatibility before a destination preview. Reject traversal,
links, malformed metadata, corrupt assets, unexpected files and unsupported
versions. Preserve every note, settings file, cache where appropriate, durable
proposal/original/import/rename journal and unrelated installation file.

Applying an update requires the exact reviewed package and target snapshots and
an explicit action; concurrent changes require a new preview. Never replace code
in a running everyday installation or stop a user's Obsidian/Ollama. Keep owned
staging and previous code separate from data. Record enough intent to recover
interruptions conservatively, refusing changed or ambiguous files rather than
overwriting them. Previous-code rollback is offered only when declared data
compatibility permits it; it is not a reversal of note changes or data migrations.
Freeze exact inventory, version ranges, limits and recovery schema in the specs.
Test only disposable installations, including interrupted writes and later edits.

### Execution, verification and costs

Each feature needs meaningful tests, Verify, required independent review and
actual synthetic Obsidian acceptance. Use real local text/embedding inference
where relevant, actual Fedora/Flatpak launch evidence, first-use/keyboard/theme
checks, exclusions, cancellation, stale sources, collision refusal and recovery.
Do not replace native acceptance with mocks or weaken checks to continue. Respect
configured repair limits. Preserve earlier run records and inspect reused helpers.

Routine choices and plan/spec refinements within this scope are approved, as are
the local feature lifecycle and normal pushes of verified completed main commits
to the existing origin. No force push or remote change. Actual desktop integration
in the user's account, modifying their everyday installation, stopping their
processes, public releases, deployment, paid services, system-wide installation
and destructive actions on user data require separate approval. Prepare concrete
reviewable artifacts before seeking any such approval.

There is no mandatory paid runtime. Hardware, downloads, local storage, memory,
power and optional development assistants remain real costs. Models/runtime stay
separate downloads. Package the next private version after the queue passes and
report measured platform, model and scale limits rather than universal support.

## Approved direction - independent Thread Desktop (49-62)

Approved on 2026-10-21 after reviewing the standalone application proposal. Give
Thread its own Fedora-first desktop window and launch command while Obsidian can
remain completely closed. Keep the existing plugin as an optional interface to
the same Markdown vault. This section supersedes the plugin-only stack/runtime
restrictions for the new desktop target only; prior features and archives remain
intact. It does not authorize embedding Obsidian, claiming compatibility with its
community plugins/themes, or replacing its entire editor feature set.

### Runtime and implementation

Use Electron, TypeScript, native DOM/CSS and the existing esbuild toolchain. Share
the existing pure retrieval, evidence, AI, records, validation and proposal logic
where it fits. Supply a separate main-process filesystem adapter, narrow typed
preload bridge and sandboxed/context-isolated renderer without Node privileges.
The desktop renderer cannot read arbitrary paths, spawn processes or fetch remote
assets. Imported Markdown/model output is untrusted text. Keep explicit read
roots/exclusions, local-only Ollama, no account/backend and no paid fallback.

The first stage is independently launchable scoped vault reading; the second
ports project home, recorded Resume, AI setup/interpretation and Ask; the third
ports reviewed saves/changes, records, research, PDFs and portability, then ships
a verified desktop package. Build-plan items 49-62 divide those stages into
reviewable features. Current plugin functionality is not proof of desktop parity.

### Files, permissions and coexistence

Notes/attachments remain in the same ordinary vault folder. Selecting a vault
does not grant content access. Preview explicit vault-relative read roots and
exclusions before approval; exclusions always win. Do not automatically import
the plugin's read permissions, settings or PDF consent. PDF bytes still require
explicit per-file consent. Reject path traversal, symlink escapes and unsupported
file types. Bound traversal, bytes and displayed results; report omissions.

Desktop settings/caches/journals belong to a separate app profile, outside the
vault and repository by default. Development/testing may explicitly use ignored
project-local profiles. In the first read-only feature, access grants are volatile
and must be reapproved after a restart. No note editing or plugin-state writes.
Before desktop saves ship, define versioned persistence and explicit import of
compatible settings/history where requested. Never silently copy, reset, migrate
or share a mutable plugin journal; preserve unresolved plugin recovery state.

Reuse existing readable Markdown schemas. Outside edits invalidate stale evidence
and previews. All new-note saves refuse collisions. Existing-note updates require
exact renewed approval, current source/target validation, retained originals and
guarded recovery/undo. Before enabling concurrent writers, prove an explicit
ownership/coordination policy; hashes alone are not a cross-process transaction.
Do not promise atomic multi-file writes. No autonomous note changes or deletions.

### Desktop experience, distribution and evidence

Retain Thread's serif headings, amber recorded context, periwinkle AI distinction,
source chips and accessible native controls. Define standalone light/dark tokens
without depending on Obsidian-injected CSS or network fonts. Start with a literal
Markdown source reader; add safe formatting/link navigation in feature 50. Later
citations open inside Thread. No automatic attachment launch or external browsing.

Preserve plugin build/package commands; add separately named desktop commands and
build output, then a separately versioned local Linux distribution at feature 62.
Do not feed desktop binaries to the plugin-only updater. Runtime updates require
their own reviewed compatibility/packaging procedure. Test the actual Electron
window, not a mock webpage, in an isolated synthetic profile with Obsidian absent
from that process tree. Reuse owned local model fixtures when relevant; retain
Verify, independent sensitive-change review and plugin regression evidence.

There are no mandatory hosting/subscription/API fees. Models and runtime are local;
downloads, storage, RAM, electricity and development time remain real resources.
Do not install system-wide software, modify everyday installations or personal
notes, publish releases or deploy services as part of this approval.

## Approved improvements - everyday desktop use (63-65)

Approved on 2026-10-27 after the completed desktop milestone. These features
reduce repeated setup and make the desktop window understandable to non-technical
users. They change no note format, plugin behavior, cost boundary or write-safety
rule, and add no hosted service.

Remembered access (63) supersedes, for the desktop app only and only when the user
opts in, the rule that desktop read grants are volatile. The saved scope covers one
vault: its folder location and filesystem identity, read roots, exclusions, project
folder mapping and local AI endpoint/model selection. It lives in the desktop
profile outside the vault and repository. A launch shows the saved scope and reads
nothing until the user chooses to continue. Continuing revalidates the vault
identity, every path under the existing scope rules, and the local model's
loopback and cloud-disabled status; an unavailable model leaves Thread usable
without AI. A moved, replaced or invalid vault is refused and asks for a fresh
selection. PDF consent and desktop writing stay per-session and explicit; plugin
grants are still never imported. Forget saved access removes the saved scope.

The plain-language pass (64) covers the desktop window: everyday labels and
messages, technical detail behind expandable Details, Resume/Ask/Capture first and
advanced tools grouped. It removes no action, limit, coverage report or
accessibility path. The first-run flow (65) is skippable and reopenable. It guides
folder choice, read approval, optional Ollama setup by showing commands and testing
the connection (never installing services or downloading models), an optional
synthetic sample project and a New project action reusing the shared starter-note
contract. Every created note goes through exact reviewed new-note saves that refuse
collisions; desktop writing must be enabled explicitly first. Prove each feature in
the actual Electron window with an isolated profile and synthetic vault.

