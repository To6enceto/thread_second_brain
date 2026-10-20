# Feature: Explicit conversation saves

**From build-plan:** feature 41
**Build attempt:** 1
**Branch:** `feature/explicit-conversation-saves`
**Status:** verified

## Goal

Explicitly select and save conversation turns as a new readable Markdown record,
retaining evidence and corrections without treating earlier AI as authoritative
retrieval content or bypassing current permissions.

## In scope

- Save conversation opens a draft dialog from Ask when completed turns exist.
  Select one or more completed turns with labelled checkboxes, name the new note,
  inspect its exact destination/contents, then explicitly save through NewNoteModal.
- Versioned readable records preserve original turn numbers, questions, local
  model/time, original/automatic/corrected claims, gaps, chosen evidence/IDs,
  include/pin choices and earlier-context inclusion/omission provenance.
- Current per-turn dependencies, scope/project identity, source hashes and edits
  are revalidated before preview and save. All relevant invalidation/close/cancel
  paths revoke draft previews; collisions never overwrite notes.
- Strict validation and canonical rendering fail closed for unknown/malformed or
  altered records. Valid conversations remain readable in Obsidian, with source
  freshness tracking, but contribute no AI prose or private evidence to retrieval
  or editor-selection evidence. Opening the Markdown never resumes inference.

## Out of scope

Resuming saved chats, autonomous saving, replacing existing conversation notes,
new read grants, collections/actions/updates, source-note changes or migrations.
No automatic persistence of all open Ask state, endpoint settings or read grants.

## Build loop

Continuous authority approves routine scope refinements and the spec. Feature-level
review, no step checkpoints. Focused tests per step; final Verify and actual owned
Obsidian/local inference; fresh independent full review before Complete, then the
separately authorized normal push. Maximum two repairs per same finding/check.
Archive: blueprint/history/features/41-explicit-conversation-saves.md.

## Build steps

- [x] **Step 1 - Versioned conversation record.** Implement strict serializer/parser
  and fail-closed projection, with bounded provenance and original corrections.
  Done when logic tests prove readable round trips, subset numbering, unsupported
  answers, PDF page refs, escaping, malformed metadata/body rejection, freshness
  dependency checks and no conversation prose in index/editor-selection ranges.
- [x] **Step 2 - Explicit selected-turn save flow.** Add the Ask entry and small
  draft modal, using immutable captured turns and existing exact new-note writes.
  Done when real-handler tests prove selection/name/correction renewal, no writes
  before approval, exact bytes, stale/excluded/scope/close/cancel revocation,
  valid own-folder creation, collision refusal and existing Ask behavior.
- [x] **Step 3 - Native acceptance and documentation.** In isolated actual Obsidian,
  generate follow-ups locally, select/correct/save turns, reopen readable Markdown,
  verify blocked editor/retrieval reuse and source-change/exclusion invalidation,
  collisions and note preservation. Inspect keyboard/themes, document limits and
  usage. Done when actual evidence and final npm run verify pass.
- [x] **Step 4 - Prepare fresh review.** Consolidate evidence and safe Try it now
  instructions, set verified and freeze the exact checkpoint candidate. Done when
  the complete contract has passing evidence. The subsequent passing independent
  receipt and resolved findings remain mandatory gates before Complete.

## Files / areas

src/vault/conversation-record.ts and .test.ts; src/vault/freshness.ts;
src/ui/conversation-save-modal.ts and focused handler tests; src/ui/ask-modal.ts
and .test.ts; README.md and required Blueprint evidence. Reuse conversation,
answer-record, sourceReferences, NewNoteModal and existing index/selection/freshness
APIs. Shared native controls and scoped styles only if needed; no new dependencies.

## Data / contracts

- schemaVersion 1 record, crypto.randomUUID ID, title <=100 characters (existing
  noteName rules), canonical UTC ISO createdAt; scope project or allowed paths.
  Project scope records normalized vault-relative projectPath and projectIdentity
  (<=4096 characters); wider scope records both empty. No saved grants are honored.
- One to six selected turns, strictly increasing original numbers 1-6. Per-turn
  payload retains schema 1 answer fields (question <=1000, model <=500, canonical
  generatedAt, <=6 original/corrected claims <=1200 each, <=12 gaps <=1200, unique
  source IDs matching the chosen references). Supported answers use existing strict
  AnswerRecord validation; unsupported answers have zero claims and no corrections.
- Each turn stores only its chosen passages and include/pin intent. Excluded
  candidates are not copied into the saved record. Evidence references preserve
  path/identity/heading/full-note and passage hashes, known type/status, excerpt
  and optional original PDF/page citation. Current context/evidence budgets remain
  unchanged. No persisted settings, permission scope lists or model requests.
- Record earlier-context included numbers and omission reasons from the existing
  bounded conversation selection. When a referenced earlier turn is not selected
  for this save, say so in readable Markdown rather than inventing its contents.
- Bound serialized record JSON to 256 KiB UTF-8, complete note to 1 MiB UTF-8 and
  combined distinct source references to the existing 100-reference limit. Refuse
  oversized selections visibly; never silently drop turns/evidence. All saved
  metadata is treated as untrusted input with exact fields/types/versions/bounds.
- Frontmatter type conversation, id/title/scope association, thread_conversation_version
  and JSON thread_conversation_record; thread_sources is the exact deduplicated
  union of selected turn refs, used by the existing transitive freshness graph.
  Canonical reserved thread:conversation-record body markers and exact LF/CRLF
  body matching protect dispatch. Unknown versions, mixed formats or changed
  canonical content produce invalid provenance, no reusable text/ranges.
- Valid saved conversations also expose no reusable text/ranges: original AI,
  corrections and copied evidence remain readable Markdown, not ordinary source
  notes or model evidence. Current provenance still participates in Source freshness.
  User opening a note in Obsidian does not grant Thread access or request inference.
- New destination: selected project/Conversations/name.md, or mapped Knowledge/
  Conversations/name.md for explicit wider scope. Existing mapped-destination,
  exclusion, collision, double-validation and exact-preview guards remain active.
- Capture immutable turns when opening the save draft. Default all captured turns
  checked, visibly selectable; empty selection refuses preview. Name/selection
  changes revoke old previews. Parent Ask changes and invalidation revoke the
  dialog; closing either parent or draft revokes pending child saves.
- Preserve own-folder-creation behavior: exact applying preview may finish when
  captured inputs/settings/sources remain unchanged despite index invalidation
  caused by creating its destination folder. Never bypass actual source or scope
  changes. No test manipulates a personal vault or user's running application.
- Safe DOM/escaped Markdown, real labelled checkboxes/buttons, existing live status,
  keyboard focus and theme primitives. Empty/invalid/stale/error states explain
  how to renew the preview. No network fonts/assets.

## Testing

Baseline npm run verify passed 239 tests, typecheck/build:
.thread-local/continuous-35-plus/evidence/41-baseline-verify.log.
Boundary tests, actual-handler tests, final Verify, actual Obsidian/local qwen
inference and preservation checks. No configured browser runner or lint.
Previous feature archives and run evidence remain unchanged.

## Notes for the AI

Critique keeps persistence separate from inference: saved conversations are readable
records, not a new source of model authority. Subset numbering and missing earlier
context are explicit. Strict combined references and own-save invalidation are
required; do not weaken bounds or tests to continue. User authorized conservative
routine details; no unresolved material product decision.

## Acceptance evidence

- Final npm run verify: strict typecheck, 248 tests, zero failures/cancellations/
  skips/todos, production bundle. Log: .thread-local/continuous-35-plus/evidence/
  41-verify-final.log. git diff --check passed. Installed final main.js/styles.css
  hashes match evidence/41-final-installed-build.json.
- Logic/real-handler tests cover canonical LF/CRLF records, subset numbering,
  original/corrected provenance, unsupported turns, PDF refs, field/type/size
  rejection, no retrieval/editor projection, collision/refusal and late draft
  edits at both early and final asynchronous validation. Earlier failing test
  fixtures/type checks and their repairs remain in the ignored run evidence.
- Actual Obsidian 1.14.4 and local qwen3:4b-instruct: two real answers, explicit
  corrections, pin intent, only turn 2 selected, old-name preview revoked, exact
  save including own-folder creation, readable reopen, zero indexed chunks and
  editor-selection rejection. lab/evidence/41-native-save.json.
- Actual source change/exclusion, stale saved dependencies, collision, draft
  close, Ask cancel/close and empty selection: lab/evidence/41-native-lifecycle.json.
  All 17 prior synthetic notes and the source preserved; exact saved note and
  prior settings restored: lab/evidence/41-native-final.json.
- Native Tab focuses Save turn 1 with solid outline: lab/evidence/41-keyboard.json.
  Final dark/light screenshots visually inspected: lab/evidence/
  41-conversation-dark-final.png and 41-conversation-light-final.png. A scoped
  checkbox min-height override preserves native sizing with the 32px label target;
  lab/evidence/41-theme-final.json confirms final 15px checkbox.
- No everyday vault/profile or user processes modified. Readable saved chats do
  not resume inference; their excerpts/transcripts are deliberately not evidence.
  Existing six-turn and context bounds remain. No configured lint/browser runner.
- Safe guide prepared at .thread-local/continuous-35-plus/try-41.md. Independent
  review of this frozen complete target is required before archival/landing.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10538,"specSha256":"6985cd01bc6b2e475cd8a6b4a97ead2fe7cc4ca69178852051d07288ff412786","branch":"refs/heads/feature/explicit-conversation-saves","head":"0c7ba300e6afaa82046a0c89327943a1a7ce6865","baseRef":"refs/heads/main","baseCommit":"7bedeb544d66ccba171b710c08eca596b7336179","sourceTree":"1dfeafc7f776fce4c2f8b7dd932e12e2661e4e83","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 0c7ba300e6afaa82046a0c89327943a1a7ce6865
**Base commit:** 7bedeb544d66ccba171b710c08eca596b7336179
**Base ref:** refs/heads/main
**Spec hash:** 6985cd01bc6b2e475cd8a6b4a97ead2fe7cc4ca69178852051d07288ff412786
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T19:00:50.796133+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T19:02:51Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and complete 7bedeb544d66ccba171b710c08eca596b7336179..0c7ba300e6afaa82046a0c89327943a1a7ce6865 delta in a fresh isolated subagent without builder context. Run all Audit lenses from scratch. Required native acceptance evidence is in .thread-local/continuous-35-plus/evidence/41-* and lab/evidence/41-*. Do not edit product code, tests or spec, accept findings, commit, or perform external actions.

## Commands

- `npm run verify`: pass on the actual host with escalation; strict typecheck,
  248 tests passed, zero failures/cancellations/skips/todos, production build.
  Log: `.thread-local/continuous-35-plus/evidence/41-independent-verify.log`.
- `git diff --check 7bedeb544d66ccba171b710c08eca596b7336179..HEAD`
  and `git diff --check`: pass.
- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`,
  `sha256sum blueprint/context/current-feature.md`, and full porcelain status:
  pass; exact target, base and spec hash match; only permitted evidence paths
  differ. The spec is tracked and unchanged from the checkpoint.
- SHA-256 comparison of rebuilt and lab-installed `main.js`/`styles.css`:
  pass; both match `41-final-installed-build.json`.
- Focused skipped/only/todo/placeholder searches in changed tests: no matches.

## Evidence

- Runtime spawn metadata confirms Codex `gpt-6.1-sol`, high reasoning,
  `fork_turns: none`, canonical child `/root/review_feature_41`; no builder
  transcript inherited.
- All nine changed paths in the complete recorded base..target delta reviewed:
  `README.md`, active spec, `src/ui/ask-modal.ts` and its tests,
  `src/ui/conversation-save-modal.ts`, `src/vault/conversation-record.ts` and its
  tests, `src/vault/freshness.ts`, and `styles.css`.
- Followed affected contracts through conversation snapshots/context, answer
  record validation, evidence/ref serialization, index projection, selection
  eligibility, ThreadModal/NewNoteModal lifecycle, `createNewNotes`, writable
  destinations, source/settings revalidation and project identity in `src/main.ts`.
  Checked installed AGENTS, Audit/review contract, config, overview, coding
  standards, AI interaction guidelines, and build-plan feature 41.
- Quality: existing new-note flow reused; no new dependency or unrelated product
  changes. Security: strict bounded records, canonical-body rejection, current
  scope/dependencies, escaped Markdown, explicit writes, and transcript/evidence
  exclusion inspected. Performance: finite six-turn, byte and combined-reference
  bounds inspected. Tests: parser/projection/freshness and real-handler async
  revocation cases reviewed; no focused, skipped or placeholder tests found.
- Native scripts inspected, not rerun: `.thread-local/continuous-35-plus/lab/`
  `conversation-native.js`, `conversation-lifecycle-native.js`, and
  `conversation-theme-native.js`. Their assertions exercise real local answers,
  subset turn numbering/corrections/pin intent, no premature writes, renewed
  name preview, exact save and own-folder creation, readable reopen, zero index
  chunks, editor rejection, source/exclusion invalidation, collision and close/
  cancel refusal, empty selection, and preservation.
- Inspected `.thread-local/continuous-35-plus/lab/evidence/41-native-save.json`,
  `41-native-lifecycle.json`, `41-native-final.json`, `41-keyboard.json`,
  `41-theme-final.json`, associated native logs, and final installed-build proof.
  Final evidence records 17 prior notes/source/exact saved note preserved,
  restored settings, no open modals, and a focused native 15px checkbox.
- Visually inspected final `41-conversation-dark-final.png` and
  `41-conversation-light-final.png`: labelled selection, visible keyboard outline,
  readable status and native controls in both themes.
- Generated bundles, dependencies, caches, unrelated prior feature evidence and
  personal/runtime data excluded from code scope. Generated bundle hashes and
  the explicit synthetic native evidence were inspected only as verification.

## Findings

- None. No ledger IDs added, updated or closed; no repair order required.

## Remaining risk

- No configured lint, dedicated browser runner, security scanner or performance
  benchmark; none was installed or represented as run. Native acceptance was
  inspected against the final installed hashes, not repeated by this reviewer.
  Linux/Obsidian evidence does not establish other-platform or large-vault behavior.

## Try it now

Run or do:
1. In a permitted test project, Ask a question and generate from reviewed evidence.
2. Continue with a follow-up, review its evidence and generate again. Optionally edit a claim.
3. Choose Save conversation, uncheck turn 1, and give the new note a unique name.
4. Choose Preview conversation note. Inspect turn 2, its correction/history and destination.
5. Choose Save previewed note only if wanted, then open the Markdown in Obsidian.

Expected:
- Only selected turns are saved. Missing earlier context is labelled, with local model/time and citations retained.
- Name/selection/source changes require a new preview; an existing filename is refused.
- Opening a saved conversation does not generate or resume AI, and its transcript is excluded from Thread evidence.

This proves:
- Conversation persistence is explicit, readable and separate from authoritative source notes.
