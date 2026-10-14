# Feature: Ask your vault

**From build-plan:** feature 4
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/ask-your-vault`

## Goal

Ask evidence-backed questions about a project or explicitly allowed vault paths, inspect gaps and save a selected answer as a new Markdown note.

## In scope

Cancelable local question generation, indexed scoped retrieval, cited claims/gaps/unsupported state, source links and reviewed collision-safe new answer saves with provenance.

## Out of scope

Hosted models, embeddings, unrestricted vault reads, editing existing notes or accepting decisions.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Answer contracts** - Validate grounded structured answers and serialize readable provenance-bearing Markdown safely. *Done when:* Tests reject invented citations/malformed claims, preserve unsupported states, and escape generated Markdown; Verify passes.
- [x] **Step 2 - Ask and save workflow** - Add native Ask modal, explicit scope and cancel, current-source validation and new-note preview/save. *Done when:* Real local model answers the synthetic question with correct evidence, unsupported query/cancel work, and exact previewed answer saves once; Verify passes.

- [x] **Step 3 - Review repair** - Enforce the synchronous current-state guard after the final async validation, immediately before creation. *Done when:* deterministic microtask/permission/partial-failure tests and actual Obsidian final-boundary proof refuse stale writes; Verify passes.

## Files / areas

src/intelligence/answer.ts, Ollama structured output support, native Ask/new-note modals, main/sidebar entries, adjacent tests.

## Data / contracts

All allowed paths means only explicit read scope, with exclusions first. Text recall returns at most 20 bounded passages, with full-note hashes retained. Question up to 1000 characters. Answers contain at most six fact/interpretation/suggestion claims with known source IDs, explicit supported flag and gaps. Empty retrieval never invents an answer. Check sources/settings before display and again before save. Saved answer gets UUID, type answer, generated date/model/project identity, serialized source references with full and passage hashes, readable evidence links. Model-generated Markdown is escaped. Save is explicit exact-content preview, new destination under selected project or mapped Knowledge, no overwrites. Form and approved content are immutable during writes.

## Testing

Deterministic validation/serialization tests plus actual Obsidian/local Ollama answer, unsupported query, cancellation, source opening, save preview/collision and invalidation. npm run verify and required fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

Verify passes nine test files, typecheck and build. Actual Obsidian/Ollama/qwen3:4b answered why live voice was postponed: budget constraints and testing text-guided exercises first, with valid references to the recorded accepted decision. Source opening worked. Saving wrote exact previewed Markdown with provenance; duplicate destination was refused. No-match questions produced unsupported state and Cancel cleared pending output. A source edit during a controlled pre-write delay refused the save; a scope change canceled generation; source restored. Receipts: `.thread-local/evidence/feature-04-runtime.json` and `feature-04-stale.json`.

The initial compound-question run was overly cautious about missing prototype naming. The prompt now explicitly requests supported partial answers with gaps; no validator bypass was added. Model quality still requires the user's judgment.

## Try it now

Open Thread and choose Ask. Ask a question using words from your notes, inspect the source buttons and gaps, then Preview answer note and Save previewed note. Choose all allowed paths only for the broader explicit scope. Editing supporting evidence clears the answer and invalidates a pending save. Nothing overwrites an existing note.

Review repair: final async-boundary rejection proved in `.thread-local/evidence/feature-04-boundary.json`; normal local Ask/save rerun passes in `feature-04-repaired-runtime.json`. Verify passes ten test files, including new write-state microtask, permission, collision and partial-failure regressions.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4743,"specSha256":"898845a296119a47e4edb92b71ed736459bd6edcefa79c489697cac635caf05c","branch":"refs/heads/feature/ask-your-vault","head":"609f5ddda8a6fb9b7a9cb6d98a7fc44369509732","baseRef":"refs/heads/main","baseCommit":"13845712bd5836253580515a9d06cd033f61073b","sourceTree":"5a35f7e3dff583db2f5478b6434f306b6d5c80a8","landing":"local-merge","absentOptional":[]} -->

## Findings

### 4/F-01 [P1] closed - Final note write omits the current-preview guard

**File:** src/main.ts:126
**Found:** 2026-10-14 by /audit independent (scope: current; lens: quality, security, tests)
**Why it matters:** `createNotes` checks `current()` before `ensureFolder`, then awaits another asynchronous validator and writes without checking `current()` again. A source/settings invalidation or modal close queued after that validator's last check can run before the awaiting caller resumes. The new note is still written even though the preview/source state is no longer current, violating the required save boundary. An in-memory bundle reproduction used a validator that queued `current=false` during the second validation: `vault.create` observed `currentAtWrite:false`; two validations completed and one write occurred. The supplied delayed-source-edit runtime evidence catches edits during validation, but does not exercise this final interleaving.
**Suggested fix:** Check `current()` again synchronously after the final `await validate()` and immediately before `vault.create`, retaining the destination check. Add a focused regression that invalidates the state between validator completion and write continuation and asserts no note is created; cover modal close/settings/source revision changes through that same predicate.
**Resolution:** Moved new-note orchestration to tested createNewNotes, checking synchronous state and current writable scope after each async validator and immediately before create. Regression tests cover final-validator microtasks, exclusions during folder creation, collision preflight and partial writes. Actual bundled Obsidian proof rejects the final-boundary write; normal Ask save/collision/cancel path still passes. `.thread-local/evidence/feature-04-boundary.json` and `feature-04-repaired-runtime.json`.


Independent re-review on 2026-10-14 at `609f5ddda8a6fb9b7a9cb6d98a7fc44369509732`: F-01 closed. Reviewed the complete feature delta and the repaired `src/vault/new-notes.ts`, `src/ui/new-note-modal.ts` and wiring in `src/main.ts`. Both asynchronous validation boundaries now resume into synchronous writable-path/current-state checks; the final check and `port.create` have no intervening await. The modal predicate binds closure, preview epoch, index revision and settings. The final-validator microtask regression passed with two validations and zero writes; permission, collision and partial-failure regressions passed. Inspected all four feature-04 Obsidian receipts and their harnesses, including final-boundary refusal and normal repaired save/collision/cancel behavior. No new findings across quality, security, performance or tests; `npm run verify` passed all ten test files, typecheck and build.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 609f5ddda8a6fb9b7a9cb6d98a7fc44369509732
**Base commit:** 13845712bd5836253580515a9d06cd033f61073b
**Base ref:** main
**Spec hash:** 898845a296119a47e4edb92b71ed736459bd6edcefa79c489697cac635caf05c
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T20:18:53.107634+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T20:21:20.951085+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all ten test files, production build.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`: pass; exact requested target, base and spec hash.
- `git diff 13845712bd5836253580515a9d06cd033f61073b..HEAD -- src` and complete delta file inventory: reviewed.
- `git status --porcelain=v1 --untracked-files=all` and target product/spec/config diff: pass; only permitted review evidence differs.
- Targeted skipped/focused/placeholder-test search: none found; suite reports zero skipped or todo tests.

## Evidence

- Complete current feature delta `13845712bd5836253580515a9d06cd033f61073b..609f5ddda8a6fb9b7a9cb6d98a7fc44369509732`, based on local `main`, reviewed independently across all four lenses.
- Reviewed `src/intelligence/answer.ts` and its tests, changes to briefing schema export and Ollama structured output, Ask/new-note modals, main plugin wiring and evidence validation, sidebar entry, and new-note orchestration/tests. Followed adjacent modal lifecycle, workspace creation, scope/settings, evidence/index retrieval and source-link boundaries.
- Checked AGENTS, project overview, active spec, coding standards, AI interaction rules and feature-4 build-plan contract. No source, test, configuration or dependency mutations were made.
- `.thread-local/evidence/feature-04-runtime.json` and `feature-04-stale.json`, with corresponding test harnesses: sourced local answer, source opening, exact-content preview/save, refused collision, unsupported query, cancellation, stale-source refusal and scope cancellation.
- `.thread-local/evidence/feature-04-boundary.json` and `test-04-boundary.js`: actual Obsidian plugin final-validator microtask invalidates revision after validation; two validations, rejected write, destination absent.
- `.thread-local/evidence/feature-04-repaired-runtime.json` and `test-04-repaired.js`: normal repaired local Ask/save rerun, exact saved contents, source opening, collision refusal, unsupported state and cancellation passed.
- F-01 independently closed: synchronous current-state and writable-path checks now follow the final awaited validator immediately before creation. Unit regressions exercise the actual microtask interleaving, permission changes, collisions and partial-failure reporting.
- Excluded generated bundles, dependencies, downloaded runtimes/model weights, caches and unrelated project code; ignored synthetic runtime receipts/harnesses inspected only as supporting evidence.

## Findings

- No new findings. F-01 closed after independent repair review. No open or fixed P0/P1 findings remain.

## Remaining risk

- Runtime acceptance receipts and their real-host CDP harnesses were inspected; this reviewer did not rerun mutating Obsidian acceptance actions. Check was not required.
- Citation identity and hashes cannot establish semantic support; local-model answers require user judgment. Synthetic runtime cases do not establish broad model quality or platform compatibility.
- No lint, security-scanner, performance-benchmark or browser-test command is configured; no vulnerability-scan or measured performance claim is made.
