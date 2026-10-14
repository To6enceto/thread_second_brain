# Feature: Indexed evidence recall

**From build-plan:** feature 3
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/indexed-evidence-recall`

## Goal

Find eligible passages quickly through a rebuildable local text and link index without sending excluded notes to indexing or inference.

## In scope

Scoped note/chunk/metadata/link/hash index, explicit allowed read paths, project/vault recall, rebuild and lifecycle invalidation, source-opening checks.

## Out of scope

Embeddings, cloud search, chat generation, original-note edits.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Index and ranking** - Build bounded heading chunks, stable source metadata, explicit links and deterministic text ranking. *Done when:* Tests prove relevance, scope/exclusion boundaries, missing/renamed entries and bounded excerpts; Verify passes.
- [x] **Step 2 - Recall workflow and lifecycle** - Persist rebuildable derived cache, rebuild on eligible vault/scope changes, add native Find modal and validated source buttons. *Done when:* Actual Obsidian recall, edit/rename/delete/scope/exclusion invalidation and rebuild work; Verify passes.

- [x] **Step 3 - Review repairs** - Invalidate on modal query/scope changes and bind asynchronous source opening to current host/source revision. *Done when:* pending-rebuild scope changes, concurrent source edits and unload refuse stale results/opens in real Obsidian, regression tests and Verify pass.

## Files / areas

src/vault/index.ts and tests, main.ts, settings and native recall UI, evidence contracts.

## Data / contracts

Index is derived and stored under Thread plugin directory only. Startup rebuilds current eligible notes rather than trusting persisted text. Exclusions apply before reads. Each entry records full-note hash, path/id/title/properties, bounded chunks and eligible outgoing links. Project membership uses containment, matching project metadata or an explicit link from a contained note; vault scope means explicitly allowed folders only. Any relevant change clears old cache immediately, cancels rebuilds and schedules a fresh rebuild. Results recheck note hash/scope before opening. Query is bounded and text matching only; empty/unsupported searches give evidence gaps.

## Testing

Pure ranking/link/scope regression tests plus real synthetic-vault UI search, source click, edit, rename, delete, exclusions and rebuild. npm run verify and fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

Verify passes seven test files, typecheck and production build. Actual Obsidian recall returns a relevant passage and its source button opens Overview.md. Create/edit/rename/delete events rebuild current results, remove old text and paths, and clear displayed results. Adding an exclusion purges the in-memory entry and serialized cache; private/outside sentinels never appear. `.thread-local/evidence/feature-03-runtime.json` records the synthetic run. Per-note indexing covers 50000 characters and displays that limit; larger vault performance is not yet measured.

## Try it now

Run “Thread: Find evidence”, enter a distinctive phrase, select project or all allowed paths, and choose Find passages. Open a source. Edit it, then search again; old results clear. Change Allowed read paths/exclusions in Settings and rebuild to inspect the new scope.

Review repair proof: `.thread-local/evidence/feature-03-races.json` confirms scopeChanged, editRejected, unloadRejected and sourceRestored. Verify now passes eight test files including controlled pending-source interleavings.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4033,"specSha256":"8d047972d2c7163f92c1d9352ab5dd07b723d4457590eb7c1b303a0ce287e2be","branch":"refs/heads/feature/indexed-evidence-recall","head":"0f20ace6b6541f4357c73af92bde4398d280d52d","baseRef":"refs/heads/main","baseCommit":"37a70313412b1d82c0aae4b08740bd16143ed6cd","sourceTree":"6c999ab2e7e2cca8b5a7fa4c1898f4492597e4d6","landing":"local-merge","absentOptional":[]} -->

## Findings

### 3/F-01 [P1] closed - Changed recall scope permits pending vault results to appear

**File:** src/ui/recall-modal.ts:9
**Found:** 2026-10-14 by /audit independent (scope: current; lens: quality, security, tests)
**Why it matters:** Search inputs remain editable while rebuilding. Their change handlers only assign local variables, while the operation captures `requestedQuery` and `requestedVault` and checks an epoch that these handlers never increment. An inline Node harness importing the actual RecallModal reproduced starting an all-allowed-paths search, selecting Selected project while rebuild was pending, then completing the rebuild: recall received null project scope and displayed an outside-project result under the newly selected project scope. Existing displayed results also remain when scope changes. This violates the scoped-recall and asynchronous-current-state contracts, although the global allowed-path/exclusion filter still applies.
**Suggested fix:** Invalidate the modal's epoch and displayed results whenever query or scope changes, and reject obsolete pending completion. Alternatively disable those inputs throughout the operation and clearly preserve the operation's scope. Add a regression for a scope change during a delayed rebuild.
**Resolution:** Query/scope changes invalidate the modal epoch and clear results, so pending rebuilds cannot display the old scope. Actual host race proof passes in `.thread-local/evidence/feature-03-races.json`. Independently closed on 2026-10-14 against 0f20ace6b6541f4357c73af92bde4398d280d52d after complete-delta review and an inline harness importing the actual RecallModal confirmed both query and scope changes suppress pending rebuild completion and leave results empty; Verify passed.

### 3/F-02 [P1] closed - Pending source opening survives note invalidation and unload

**File:** src/main.ts:86
**Found:** 2026-10-14 by /audit independent (scope: current; lens: quality, tests)
**Why it matters:** openIndexedSource awaits a read and hash but never checks an index/lifecycle revision before opening. The post-await guards only check file path and global read scope. An inline Node harness importing the actual method reproduced a read that captured original bytes, followed by a source edit and index invalidation before read completion; the old hash matched and the changed source still opened. A separate run called the actual onunload method while the read was pending, and the source still opened afterward. The hash/current-state and unload contracts therefore fail for reachable asynchronous interleavings.
**Suggested fix:** Capture and recheck an invalidation/lifecycle generation across read, hashing, and source opening; increment that generation on unload as well as relevant note/scope changes. Reject the pending open if it changed. Add delayed-read regressions for edit and unload.
**Resolution:** Source read/hash/open is guarded by captured index revision, current permission/path and caller lifecycle. Unload clears index revision. Controlled async tests and actual Obsidian races reject changed-note/unload opens; source restored. See `.thread-local/evidence/feature-03-races.json`. Independently closed on 2026-10-14 against 0f20ace6b6541f4357c73af92bde4398d280d52d after complete-delta review and an inline harness invoking actual ThreadPlugin methods confirmed edit invalidation and unload reject captured old reads without opening a source; Verify passed.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 0f20ace6b6541f4357c73af92bde4398d280d52d
**Base commit:** 37a70313412b1d82c0aae4b08740bd16143ed6cd
**Base ref:** main
**Spec hash:** 8d047972d2c7163f92c1d9352ab5dd07b723d4457590eb7c1b303a0ce287e2be
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T20:08:18.663600+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T20:10:16.585184+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed; typecheck, eight test files, production build; zero failed, skipped, or todo test files.
- `node --input-type=module` (independent inline harness importing actual RecallModal and ThreadPlugin through in-memory esbuild): passed query/scope pending-rebuild suppression and edit/unload pending-source rejection.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --short`: passed target/base/spec and allowed-dirty-path checks before receipt.

## Evidence

- Reviewed the complete 37a70313412b1d82c0aae4b08740bd16143ed6cd..0f20ace6b6541f4357c73af92bde4398d280d52d delta against the active verified spec across all four lenses. Base ref: main. All nine changed source/test files reviewed: src/main.ts; src/ui/recall-modal.ts; src/ui/settings-tab.ts; src/ui/thread-modal.ts; src/vault/evidence.ts; src/vault/index.ts; src/vault/index.test.ts; src/vault/source-link.ts; src/vault/source-link.test.ts.
- Followed adjacent scope, metadata/evidence, settings, workspace, and test-runner contracts; checked AGENTS.md, project overview, coding standards, AI interaction policy, config and build plan. Excluded review/findings state from product scope, and dependencies, generated main.js, caches and synthetic runtime data from code scope.
- Inspected .thread-local/evidence/feature-03-runtime.json and its host harness .thread-local/test-03.js: synthetic Obsidian recall/source opening, create/edit/rename/delete, exclusion cache purge, displayed-result invalidation, and index readiness recorded as successful.
- Inspected .thread-local/evidence/feature-03-races.json and .thread-local/test-03-races.js: pending scope change, edit rejection, unload rejection and restored source recorded as successful. Independently exercised the actual repaired methods with controlled interleavings without changing product or vault files.
- No focused, skipped, or placeholder tests found in the reviewed target tests. No dependencies, network calls, or configuration changes were introduced by the delta.

## Findings

- F-01 [P1] closed: actual query and scope handlers invalidate epoch/results; obsolete pending completion cannot recall or display old scope.
- F-02 [P1] closed: actual source opening rechecks captured index revision, path, permission and caller lifecycle after reading/hashing; edit and unload invalidate that revision.
- No new confirmed findings; no open or fixed P0/P1 findings remain. No repair required.

## Remaining risk

- Actual Obsidian evidence was inspected, not rerun by this reviewer; independent race verification used an in-memory host harness. Check was not required by this request.
- Large-vault performance remains unmeasured. Indexing reads/hashes each eligible full note and search scans bounded chunks; UI discloses the 50000-character text limit per note. No scale guarantee is established.
