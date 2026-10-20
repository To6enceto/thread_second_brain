# Feature: Saved research collections

**From build-plan:** feature 42
**Build attempt:** 1
**Branch:** `feature/saved-research-collections`
**Status:** verified

## Goal

Save named evidence selections and include/pin/exclude intent as readable Markdown,
then explicitly reuse current permitted passages in Ask without treating a saved
collection as a permission grant or authoritative copy of old content.

## In scope

- Save research collection from the Ask workbench with a name and exact new-note
  preview. Persist references and selection intent, never cached excerpts.
- Open research collection from Ask after entering a question and choosing scope.
  List bounded permitted records in that scope; load one, inspect current source
  status/excerpts, reconfirm changed passages and explicitly use the selection.
- Stable-ID or observed rename resolution, current re-read/hash verification,
  generic unavailable rows for missing/excluded/ambiguous sources, current PDF
  consent and transitive freshness. Pins stay within existing context budgets.
- Reopened selection edits are request-local. Save an edited collection as a new
  named copy through the same exact preview, preserving the original record.
- Valid/invalid collection Markdown contributes no retrieval or editor-selection
  evidence. Loading a collection never generates or expands permissions.

## Out of scope

Overwriting or migrating collections, automatic refresh/save/generation, new read
permissions, external sync, cached excerpt persistence, action/checkpoint/update
features, resuming chats or changing other write paths. No new dependencies.

## Build loop

Continuous authority approves routine refinements and implementation. Review once
per feature; no step checkpoints. Focused logic and handler tests, actual owned
Obsidian/local inference, final Verify and fresh independent full review before
Complete and separately authorized normal push. Maximum two repairs per same
finding/check. Archive: blueprint/history/features/42-saved-research-collections.md.

## Build steps

- [x] **Step 1 - Collection record and resolution.** Add strict bounded versioned
  Markdown and index-locator contracts, fail-closed projection and pure capture/
  resolution helpers. Done when tests prove canonical LF/CRLF round trips,
  no excerpt persistence/projection, malformed/oversized refusal, choice intent,
  rename/change/missing/excluded/ambiguous handling and bounded current context.
- [x] **Step 2 - Reviewed save and reopen.** Add small collection dialogs and Ask
  integration. Re-read current source hashes before displaying or using indexed
  passages; save only after exact preview. Done when real-handler tests prove
  parent/name/selection/source/scope/cancel/close/late-result revocation, explicit
  changed-source consent, no automatic inference/write and existing Ask behavior.
- [x] **Step 3 - Actual host acceptance.** In actual isolated Obsidian, save a
  pinned/excluded collection, reopen/reuse with real local inference, handle
  renamed/changed/missing/excluded sources, exact copy save, collisions, limits,
  keyboard/themes and preservation. Document usage and limitations. Done when
  native evidence and npm run verify pass.
- [x] **Step 4 - Freeze for independent review.** Consolidate evidence and safe
  Try it now instructions, set verified, freeze exact checkpoint. Done when all
  acceptance contracts pass; a current passing independent receipt is still
  mandatory before Complete.

## Files / areas

src/vault/collection-record.ts and .test.ts; src/vault/freshness.ts;
src/ui/collection-modal.ts with actual-handler tests; src/ui/ask-modal.ts/tests;
README.md and required Blueprint state. Reuse IndexEntry/FreshnessGraph,
readableText/evidenceCurrent/withDependencies, selectContext, ThreadModal,
NewNoteModal, current native controls and theme primitives.

## Data / contracts

- Collection schemaVersion 1: UUIDv4 id, noteName title <=100, canonical UTC ISO
  createdAt, scope project|allowed, projectPath/projectIdentity strings. Project
  fields are normalized vault-relative path and current identity <=4096; wider
  scope has both empty. Saved association grants no access.
- One to 50 items. Each contains a strict SourceReference (path, heading, passage
  and note hashes, optional stable id/type/status/PDF page), choice include|pin|
  exclude, and an index locator {chunk,offset,length}. Locator indexes a current
  section chunk and UTF-16 substring, bounded to 50000/50000/4000 respectively.
  Capture only exact currently indexed passage matches; unsupported/omitted
  windows require fresh retrieval rather than saving an unresolvable selection.
- JSON <=128 KiB UTF-8, complete note <=512 KiB. Strict primitive fields, versions,
  normalized paths, identities, locators and references; refuse unknown fields,
  duplicate identical locators and oversize input visibly without silent dropping.
- Frontmatter type collection, id/title/created/project and thread_collection_version
  /thread_collection_record. Readable canonical reserved collection-record body
  lists references/hashes/intent only, no source excerpts or model text. Exact
  LF/CRLF body validation; conflicting managed formats fail closed. Valid records
  have zero reusable text/ranges and empty provenance dependencies: collection
  references describe a future selection, not a completed synthesis. Every reuse
  resolves each reference anew rather than trusting collection freshness alone.
- Resolve within the existing current-grant FreshnessGraph. Read current source
  bytes via evidenceCurrent before displaying indexed excerpts whose full hashes
  match; never rehydrate from saved text. Use existing bounded index chunks, with
  explicit coverage limits. Resolve stable IDs/rename mappings conservatively;
  duplicate IDs/incomplete identity or absent/excluded references are unavailable.
- Unchanged/renamed sources require exact locator/heading/passage hash. Changed
  sources offer a current same-heading chunk (same ordinal or unique match only),
  at most 4000 characters, initially unselected until explicit reconfirmation.
  If no unambiguous current passage exists, require fresh retrieval. Unavailable
  rows show only ordinal/intent/generic status, never old path, heading or excerpt.
- PDF page refs retain consent/validated original/extraction mapping; stale PDF
  extractions or other stale outputs stay unavailable, never offered as current.
- Reopen list is limited to 100 currently permitted indexed collection records,
  sorted by path with omitted count. Scope/project identity must match current
  Ask scope; changing project/scope revokes the dialog. Opening/selecting a file
  grants nothing. Names and full canonical records are only shown in exact new
  save previews while every referenced source is still currently readable.
- Only explicitly usable rows become candidates. Their current IDs are S1..Sn,
  choices preserved; selectContext retains 16000-character context budget. Each
  use includes collection file/hash and all current transitive dependencies and
  revalidates before/after generation. No unresolved row enters model context.
- Save destination selectedProject/Collections/name.md or mapped Knowledge/
  Collections/name.md for wider scope. Edits create a new named copy, no overwrite.
  Existing exact-preview/collision/own-folder-create guards remain. Capture inputs
  immutably; late async results, parent/draft changes, source/scope changes or
  close/cancel revoke previews. Applying own-folder index invalidation alone may
  finish only while captured inputs/settings/source bytes remain current.
- Native labelled controls, live status, keyboard/focus and both theme support;
  loading/empty/invalid/unavailable states offer refresh/retrieve guidance.
  Safe text/escaped Markdown, no remote assets or model request on reopen/save.

## Testing

Baseline npm run verify passed strict typecheck, 248 tests and production build:
.thread-local/continuous-35-plus/evidence/42-baseline-verify.log. Add meaningful
parser/resolution/handler boundaries; actual synthetic Obsidian acceptance and
real local qwen inference. Preserve prior archives and 19 current synthetic notes.

## Notes for the AI

Critique keeps persistence to references/intent and renewed reviewed copies.
Using currently re-read/hash-verified bounded index chunks avoids persisting
private excerpts or inventing unavailable sections. A changed source needs explicit
consent; missing/excluded states never reveal old paths/content. No unresolved
material product decision under the approved conservative implementation authority.

## Acceptance evidence

- Final npm run verify: strict typecheck, 259 tests, zero failures/cancellations/
  skips/todos, production build. evidence/42-verify-final.log under
  .thread-local/continuous-35-plus/. Matching final native bundle/style hashes:
  evidence/42-final-installed-build.json. git diff --check passed.
- Five record tests cover LF/CRLF canonical round trips, no cached excerpts or
  reusable projection, strict malformed/type/identity/bounds rejection, stable-ID
  and path renames, missing/excluded/ambiguous/incomplete identity redaction,
  changed-source reconfirmation, stale/PDF mapping refusal and context bounds.
- Actual Ask-handler tests cover exact save/reopen/choice intent, no automatic
  generation, parent/name/selection changes, late async checks, close/cancel,
  source exclusions, own-folder invalidation and opening during index refresh.
  Initial closed-DOM test used a rendering helper that always adds a newline;
  repaired to assert real empty children/text, with failure log preserved.
- Actual Obsidian 1.14.4/local qwen3:4b-instruct: reference-only exact new save,
  pin/exclude reopen, one-source real answer, new copy and original preservation:
  lab/evidence/42-native-save-reuse-r2.json. First native run exposed own-folder
  index readiness; fixed by validating current source bytes before project
  identity, with an explicit regression and fresh destination rerun.
- Native lifecycle: stable-ID rename, stale preview revoked, changed 20-to-40-euro
  passage requires confirmation and real AI uses 40, edited new copy, immediate
  exclusion redaction, deleted/restored owned synthetic source, collision refusal:
  lab/evidence/42-native-lifecycle-r2.json. First lifecycle run exposed opening
  during post-save index refresh; new open waits for current index and cancels
  on changed question/scope. Regression and full lifecycle rerun passed. Both
  failures, scripts, repair logs and prior copies remain preserved.
- Actual cancel/reuse, source restoration, three exact saved copies, prior 21
  notes, original settings and no open modals: lab/evidence/42-native-final.json.
  A fourth copy from the first lifecycle attempt is separately proven unchanged.
- Native Tab to Refresh collections with solid outline: lab/evidence/42-keyboard.json.
  Visually inspected lab/evidence/42-collection-dark.png and 42-collection-light.png.
  No everyday profile/vault or user process changed. 27 synthetic notes now retained.
- Reuse is bounded by current index coverage and existing context limits; no
  collection grants access or makes cached past excerpts authoritative. No
  configured lint/browser runner. Safe guide: try-42.md in this run. Fresh full
  independent review of the frozen target remains mandatory before completion.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11422,"specSha256":"829cc0b711d7f224d58ab7bc6ec2b3c48c2cc6f1f677e20d604288b398026665","branch":"refs/heads/feature/saved-research-collections","head":"919059d9cffeac9f2fadb7aafd65f903eaea44ad","baseRef":"refs/heads/main","baseCommit":"4e91032b33fc84ae6a79d4e2dc20041eddb47f8b","sourceTree":"03487650cb18029f610db5b21b6a2b0775182f07","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 919059d9cffeac9f2fadb7aafd65f903eaea44ad
**Base commit:** 4e91032b33fc84ae6a79d4e2dc20041eddb47f8b
**Base ref:** refs/heads/main
**Spec hash:** 829cc0b711d7f224d58ab7bc6ec2b3c48c2cc6f1f677e20d604288b398026665
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T19:21:57.426648+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T19:24:25.146999+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify` (host Node, escalated): passed strict typecheck, 259 tests, production build; zero failures, cancellations, skips or todos. Log: `.thread-local/continuous-35-plus/evidence/42-independent-verify.log`.
- `git diff --check 4e91032b33fc84ae6a79d4e2dc20041eddb47f8b..919059d9cffeac9f2fadb7aafd65f903eaea44ad` and `git diff --check`: passed.
- `git rev-parse HEAD refs/heads/main`, `git merge-base refs/heads/main 919059d9cffeac9f2fadb7aafd65f903eaea44ad`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1 --untracked-files=all`: passed freshness checks. HEAD equals target, main and merge base equal the recorded base, exact spec bytes match the recorded hash, and only the permitted review path differed before this receipt.
- `sha256sum main.js styles.css .thread-local/continuous-35-plus/lab/vault/.obsidian/plugins/thread/main.js .thread-local/continuous-35-plus/lab/vault/.obsidian/plugins/thread/styles.css`: passed; rebuilt and installed hashes equal `42-final-installed-build.json`.
- Targeted skipped/focused/placeholder searches in both changed test files: none found; inspected the real test runner, which rejects an empty suite and propagates child failure.

## Evidence

- Full recorded base-to-target delta reviewed from scratch: `README.md`, the complete active spec, `src/ui/ask-modal.ts`, `src/ui/ask-modal.test.ts`, `src/ui/collection-modal.ts`, `src/vault/collection-record.ts`, `src/vault/collection-record.test.ts`, and `src/vault/freshness.ts`. No changed product, test, documentation or configuration path was omitted. Request and findings files were excluded from product-code scope.
- Reviewed affected contracts in `src/main.ts`, `src/ui/thread-modal.ts`, `src/ui/new-note-modal.ts`, `src/vault/index.ts`, `src/vault/workbench.ts`, `src/vault/workspace.ts`, and `src/intelligence/answer.ts`. Checked strict persisted-input validation, canonical LF/CRLF records, no excerpt persistence or collection evidence projection, bounded locator resolution and context selection, consent/freshness/transitive dependencies, redaction, exact new-note previews and collisions, lifecycle revocation and explicit generation.
- Applied `AGENTS.md`, project-local Audit and independent-review contract, valid `blueprint/config.json`, overview, coding standards, AI-interaction rules, active verified spec and build-plan dependencies 23/41. Runtime handoff declares this generic Codex child was started with `fork_turns: none`, model `gpt-6.1-sol`, high reasoning, without the builder conversation; requested reviewer and model match.
- Inspected exact retained native scripts `lab/collections-native.js`, `lab/collections-native-r2.js`, `lab/collections-lifecycle-native.js`, and `lab/collections-lifecycle-native-r2.js` under `.thread-local/continuous-35-plus/`. Inspected matching initial failure logs `evidence/42-native-save-reuse.log` and `evidence/42-native-lifecycle.log`, successful r2 logs and JSON results, and final preservation/cancel summary `lab/evidence/42-native-final.json`.
- Retained failures show own-folder index readiness and opening during post-save refresh. Reviewed the corresponding current source fixes, meaningful handler regressions, `42-verify-folder-repair.log` (258 passing tests), `42-verify-open-repair.log` (259 passing tests), and complete native lifecycle rerun. Reviewed initial closed-DOM assertion failure in `42-handler-tests.log` and repaired passing `42-handler-tests-r2.log`; final independent run passes all assertions.
- Native Obsidian evidence reports local `qwen3:4b-instruct` inference using the pinned budget alone; renamed-source resolution, changed 20-to-40-euro reconfirmation, immediate exclusion and missing-source redaction, rejected stale save/collision, new copies, preserved original/prior attempt, restored sources/settings and zero final modals. The final preservation summary records 27 retained synthetic notes. Reviewed the safe `try-42.md` guide.
- Visually inspected exact `lab/evidence/42-collection-dark.png` and `42-collection-light.png`: readable current passages/intent controls, finite coverage, native controls and visible focus. Inspected `42-keyboard.json` reporting Tab focus on Refresh collections with solid outline.
- Final rebuilt/installed `main.js` SHA-256: `15e02dfaff69f1b4fdb34bd9b4f9533d8332ef941eb99f034cd3d8caad18dbcb`; `styles.css`: `18e8257c0c232805d4c98ad49df42194e1e87095142c3ad110394b48e633816a`. Both match the frozen installed-build evidence.
- Excluded unrelated source, dependencies, generated bundles, profiles/caches and prior feature evidence from code review; inspected generated bundle hashes and the specified synthetic native evidence only. No network-backed scanner, installation, repair, spec/config edit, commit or external action performed.

## Findings

- None. No confirmed quality, security, performance or tests finding across the complete target delta. Existing ledger has no entries; no finding was accepted, closed or waived.
- Repair order: none.

## Remaining risk

- Native lifecycle/inference was inspected through the retained scripts, failure/repair/rerun results and screenshots; this independent pass did not rerun the synthetic Obsidian lifecycle. Check is explicitly not required by this request/configuration.
- No configured lint, dedicated security/performance scanner or browser test runner. Review does not claim a vulnerability scan, large-vault profile, or independent proof of model semantic correctness. Reuse remains bounded by the existing index coverage and 16000-character context limit.

## Try it now

Run or do:
1. In a permitted test project, Ask a question and Retrieve evidence. Pin one passage and exclude another.
2. Choose Save research collection, enter a unique name and preview its exact Markdown. Save only if wanted.
3. Enter a question and Open research collection. Select the saved record and Review selected collection.
4. Inspect current passages and choices, Use collection in Ask, then Generate from chosen evidence.
5. To preserve revised choices, save a new named collection copy.

Expected:
- Markdown stores references and choices, without cached excerpts. Opening/reusing does not itself generate.
- Changed passages need explicit confirmation; missing/excluded references show generic unavailable status.
- Pins remain bounded by context limits. Existing filenames are refused and originals stay unchanged.

This proves:
- Evidence selections are reusable only through current permission, freshness and explicit-review checks.
