# Thread - Project Plan

Planning date: 2026-10-14. This is the product direction for a desktop Obsidian
plugin. The accompanying build plan is the ordered implementation checklist;
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

### Explicitly deferred capabilities

Mobile AI execution, cross-device inference, team collaboration, autonomous
background agents, cloud model APIs, semantic embeddings, model fine-tuning,
email/calendar integrations, a custom browser extension, audio transcription,
PDF extraction/OCR, arbitrary web browsing, billing, and hosted dashboards are
outside this release. Add them only after the core workflow is evaluated and a
separate scope decision is recorded. Weekly reviews run on demand; they do not
require a scheduler or a computer that stays on overnight.

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
domain, remote database, login server, worker, or cron job is required.

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
- The scaffold declares `minAppVersion: 1.8.0`; this is provisional until the
  selected APIs and actual compatibility checks establish the release minimum.
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


## Approved improvements - local 0.2.0 target

Approved on 2026-10-15. Preserve completed features 1-12 and their archives.
This follow-up supersedes the initial-release deferral of optional local semantic
search only; cloud inference, autonomous writes, publishing and paid services
remain outside scope. Features 13-21 follow the ordered build plan.

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
real costs; no mandatory paid runtime is introduced. Package the final private
0.2.0 build after the complete approved queue is verified.
