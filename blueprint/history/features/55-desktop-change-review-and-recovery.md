# Feature: Desktop change review and recovery

**From build-plan:** feature 55
**Build attempt:** 1
**Branch:** feature/desktop-change-review-and-recovery
**Status:** verified

## Goal

Review, revise and explicitly apply existing-note changes in Thread Desktop, with durable originals, guarded undo and conservative interruption recovery while Obsidian stays closed.

## In scope

- Reuse ChangeManager, draftContent and lineDiff with a main-process filesystem port. Keep the shared schema 1, one pending batch, at most ten operations/1 MiB combined text and last twenty applied batches. The desktop journal is separate from plugin history; never migrate or reset either journal silently.
- Reuse private profile directory durability/identity/CAS checks for a separate changes-vault-identity JSON file. Load and validate before enabling writes; corrupt/unknown/unresolved state stays intact. No saved grants. New-note saves block while change review/recovery is pending; change writes block while new-note recovery is pending.
- Keep feature 54's cooperative kernel ownership and explicit chosen-folder plugin compatibility gate. Close unrelated editors; external writes are not atomic transaction participants. Recheck path/parent/file identity, exact expected bytes and permission immediately before each mutation, verify final bytes, and retain uncertain recovery. Do not claim filesystem-wide atomicity or protection against an uncooperative editor writing in the final syscall interval.
- Existing note body proposals start from a freshly read permitted note in a mapped writable role. Main owns before bytes, preserved frontmatter/provenance, dependency hashes and proposal IDs. Renderer supplies only bounded body edits. Current roles/scope, target identity and supporting sources remain bound to previews. Existing future record features may call the same main-owned batch port, without exposing generic filesystem IPC.
- Native Review changes surface: pending/empty/stale states, operation count and paths, bounded 500-line marked diff, full exact before/after, editable bodies requiring renewed preview, explicit Apply and Reject. Unapplied drafts disable Apply. Scope/external edits clear rendered note text and review authority. Source text never executes.
- Bounded history with retained originals, current-state comparison and exact explicit previews before Undo or recovery. Current after-hashes protect newer edits. Recovery remains blocked for inaccessible/conflicting paths, with useful guidance and originals retained. No autonomous note changes or deletion.
- Actual Electron synthetic acceptance: successful update/revise/apply/undo, external changes, permissions, interruption and restart/recovery, ownership coexistence, keyboard/light/dark. Preserve original fixture sources and all prior archive bytes.

## Out of scope

Decision/question/action/research generators (56-59), PDFs (60), portability (61), distribution (62), general Markdown editor features, personal vault writes, plugin journal migration, new dependencies or system changes.

## Build loop

Continuous Mode; one step at a time, feature-level review and no step checkpoints. Run Verify after each step; demonstrate actual runtime acceptance and obtain fresh full independent review before archiving/merging/pushing. Two repairs per same failing check/finding. User authorizes routine scoped refinement and normal completed-main pushes.

## Build steps

- [x] 1. Add separate validated durable change-journal storage and guarded filesystem update/removal ports. Done when corruption/preservation, identity/link, expected-byte, cancellation and concurrent-edit filesystem tests pass and Verify passes.
- [x] 2. Integrate main-owned ChangeManager workflows with ownership, role/read checks, explicit preview identities, dependencies, persistence and interlocked recovery. Done when propose/revise/stale/apply/undo/recover/restart and revoked-source/scope cases pass focused tests and Verify; no renderer-supplied before bytes are trusted.
- [x] 3. Add accessible native proposal/review/history/recovery controls and narrow IPC. Done when edited drafts invalidate Apply, exact previews and marked bounded diffs remain reachable, late responses cannot restore revoked content, UI tests and Verify pass.
- [x] 4. Demonstrate actual Electron update/revise/apply/undo, concurrent edits, interrupted recovery/restart, ownership and permission revocation; update documentation. Done when native evidence, fixture/archive preservation, final Verify pass and the checkpoint is ready for sensitive-change fresh independent review. Keep Try it now non-destructive unless the user explicitly chooses Apply in a disposable vault.

- [x] 5. Repair independent F-01: invalidation restores Refresh changes while stale replies remain suppressed. Done when delayed-response regression, native renderer check and Verify pass; obtain a fresh full review.

## Files / areas

src/standalone/{profile,storage,vault-writer,main,preload,contracts,renderer,app,styles}; new change journal/controller/view and focused tests; shared src/vault/{changes,change-draft} reused. docs/desktop.md and README.md. Plugin code changes only if a shared-core defect requires them and actual Obsidian regression proves compatibility.

## Data / contracts

A distinct changes-<vault identity>.json under the private thread-v1 profile directory stores the shared schema-1 ChangeState with original text/hashes. Existing vault-<identity>.json bytes/schema remain compatible. Bounded 24 MiB serialized journal; fail closed on unknown/corrupt/oversized input. No imported plugin recovery is written by desktop. Existing last-20 completed-batch retention remains explicit; pending/recovery data is never pruned.

Reuse validated descriptor-relative profile commits with fsync, exclusive temporary files and before-content compare. Use nofollow ordinary single-link note handles and parent identity checks; no O_TRUNC before validation. Capture durable originals before any note mutation. Compare actual bytes both before and after, and preserve recovery when a syscall may have changed data. Conditional removal is limited to explicit guarded undo/recovery of a Thread-created note whose bytes still equal the recorded result.

All note operations require explicit scope/exclusion checks and at least one configured writable folder role. Journal snapshots redact inaccessible operation content/paths; after restart fresh grants and explicit compatibility/ownership are needed. UI approval capabilities are volatile, bound to exact journal/state/targets/context and renewed after edits; persistent pending proposals are not automatic write authority. History previews show originals and current result before any explicit restore. Invalidating a view never deletes durable recovery.

## Testing

Baseline current-session Verify: 396 passing tests, strict typecheck and both production builds (54-completion-verify.log), same product tree after logging-only squash. Add deterministic real filesystem and main-controller tests for current requirements; no skipped checks. Actual Electron acceptance uses new ignored vault-55/profile-55, with controlled failure injection only in disposable fixtures and no personal installation changes. Retain logs/screenshots and exact-byte comparisons. Shared changes, if any, require relevant actual Obsidian acceptance.

## Notes for the AI

Do not generalize a cross-platform transaction layer. Keep Linux-first cooperative ownership limitations explicit. Preserve prior archive/report bytes, exact-preview/cancellation boundaries and local offline runtime. Use existing local CSS tokens and native controls. All user-visible errors must identify the next safe action without exposing out-of-scope note text.

## Acceptance evidence

- Step 1: 55-step1-repaired-focused.log passes all eleven focused filesystem/profile/journal tests. The initial fixture incorrectly included proposal-only status in a recovery batch; corrected to the shared batch shape without changing production checks. 55-step1-verify.log passes strict typecheck, 400 tests and both production builds. No plugin source change.

- Step 2: 55-step2-complete-focused.log passes 24 main-owned workflow/storage/Ask tests. These prove exact revised previews, dirty-approval refusal, protected markers, deferred edit cancellation, scope/source/identity staleness, save interlocks, rollback preserving concurrent edits, retained interrupted originals and explicit restart recovery. 55-step2-verify.log passes 406 tests, strict typecheck and both builds.

- Step 3: 55-step3-focused-host.log passes eight delayed native-view cases, including revoked edit/preview replies and immediate dirty-Apply disabling. 55-step3-verify.log passes 408 tests, strict typecheck and both production builds. Finite IPC and source/review navigation are wired; actual Electron acceptance follows.

- Step 4: 55-checkpoint-verify.log passes strict typecheck, 409 tests with no failures/skips and plugin/desktop builds. The additional controller test proves reviewed creation refuses foreign collisions and explicit Undo removes only its unchanged creation. Final self-review removed two unused view fields; 55-checkpoint-renderer.json proves the rebuilt renderer reloads in actual Electron with no vault/grants or Node globals.
- Actual Electron 45 on isolated display 198/profile-55: 55-native-preview.json proves mapped scope, preserved frontmatter, dirty-Apply blocking and exact renewed diff. 55-native-undo.json and exact file checks prove native Enter applies and undoes precisely; 55-native-external-edit.json proves later edits remove old Undo authority. 55-change-light.png and 55-change-dark.png were inspected; native controls, marked line numbers and focus are readable.
- 55-native-interruption.json records a filesystem write notification, verified durable pre-write recovery and SIGKILL of only the owned synthetic Electron process. The written bytes match the exact preview and durable originals survive. 55-native-recovery.json proves actual restart without inherited grants/ownership, redacted history, explicit compatibility setup and exact confirmed restoration. This is a real process interruption, not power-loss fault injection.
- 55-native-limits.json proves the 500-line diff cap with complete exact content still available, immediate grant-revocation clearing, redacted pending history and rejection without writing the large proposal. 55-native-plugin-pending.json proves explicitly inspected authored pending plugin metadata blocks writing. A separate compatible process was refused while actual Electron held writer ownership. The unchanged ownership protocol's actual Obsidian coexistence evidence from 54 remains applicable; no shared plugin source changed here.
- 55-preservation.json confirms all four original synthetic notes (including excluded text), authored plugin metadata and every prior archive remain unchanged after explicit undo/recovery. Runtime logs show expected isolated DBus/X warnings, not uncaught renderer errors. README/docs describe the current 0.4.2 source build, separate journals and conservative filesystem/recovery limits. No personal vault, everyday installation or remote service was altered by acceptance.

- Repair F-01: changes-view delayed edit/preview regressions pass; 55-r1-verify.log passes 409 tests, typecheck and both builds. 55-r1-native-refresh.json proves actual Electron disables Refresh during a pending request, immediately restores it on scope invalidation, suppresses stale content and accepts a fresh retry. Empty grants and no note mutations were used. Fresh full review follows.

## Try it now

Run or do:

Run `npm run desktop:start`, choose a disposable Markdown vault and approve only its test folder. Enable writing after compatibility review, map that folder in a writable role and save preferences. Open a test note, choose Propose body change, edit its body and Preview proposed change. Expand Edit proposed body and type another change, without choosing Apply.

Expected:

The exact before/after and numbered diff appear. Editing the draft disables Apply exact change until Renew exact preview succeeds. No note is modified by these preview steps; Reject proposal discards only the pending proposal.

This proves:

Existing-note updates require renewed exact review and explicit application. To observe actual Undo safely, apply only in that disposable vault, then use Review changes, Preview undo and Undo exact change.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12531,"specSha256":"0d919d195b43a2f5011f353b2d6775f6793b83e034e37a2cdfa7b90ca83a7703","branch":"refs/heads/feature/desktop-change-review-and-recovery","head":"631ffeb91f2997754557d930f8d088c2effff400","baseRef":"refs/heads/main","baseCommit":"c5003ed17a4b09c0c8b749ab44bbb093332f5b97","sourceTree":"1487ce516af181a4b975e0492837ee4511b88d3b","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 55/F-01 [P2] closed - Invalidating an active change request leaves Refresh disabled

**File:** src/standalone/changes-view.ts:28
**Found:** 2026-10-21 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `run()` disables `changes-refresh`, but `invalidate()` advances the epoch without clearing that busy state. The obsolete request then skips `busy(false)` in its `finally` block. A source/access invalidation during a pending snapshot, edit or preview request therefore clears the review safely but leaves its Refresh changes button disabled, even though the message tells the user to refresh. Reopening Review changes works around this; no note mutation or stale approval is enabled.
**Suggested fix:** Clear the view's busy state when invalidating it, while retaining the epoch guard so obsolete replies cannot render content or alter a newer request. Extend the existing delayed-response view test to assert that Refresh changes is available after invalidation and settlement.
**Resolution:** Independently reproduced against target `239de0d328a65553fdcbcd5e657ea57303763e10` using an in-memory delayed `changesSnapshot` reply: start `view.refresh()`, assert Refresh disabled, call `view.invalidate()`, resolve the snapshot and await settlement. The review content remains empty and Refresh remains disabled. No repair or acceptance was performed in this review.

**Builder repair:** Invalidation now clears controls and restores busy state while retaining epoch guards. Delayed edit/preview regression assertions, 55-r1-verify.log (409 passes) and actual Electron 55-r1-native-refresh.json pass. Awaiting fresh independent closure.

**Independent closure:** 2026-10-21, codex/gpt-6.1-sol, fresh isolated subagent, exact target `631ffeb91f2997754557d930f8d088c2effff400`. Reviewed the complete base-to-target delta across quality, security, performance and tests. `ChangesView.invalidate()` clears controls and calls `busy(false)` after advancing the epoch; obsolete responses still fail `current()` and cannot restore content or change a newer request's busy state. The delayed edit/preview regression passed in the independent host `npm test` run (409 passes, no failures/skips). Inspected actual Electron repair evidence `55-r1-native-refresh.json` covering pending, invalidated, settled and successful retry states, and independently read the running isolated renderer over CDP: empty grants, empty review content, Refresh enabled and Node globals absent. Original defect is gone; no new issue found in the repair. 55/F-01 closed.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 631ffeb91f2997754557d930f8d088c2effff400
**Base commit:** c5003ed17a4b09c0c8b749ab44bbb093332f5b97
**Base ref:** main
**Spec hash:** 0d919d195b43a2f5011f353b2d6775f6793b83e034e37a2cdfa7b90ca83a7703
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T23:55:04.823871+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T23:57:46Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`, and `git ls-files --others --exclude-standard`: passed; exact target/base/spec matched, no untracked paths, and only permitted review evidence differed. Rechecked before receipt creation.
- `git diff --stat`, `git diff --name-only`, full targeted `git diff c5003ed17a4b09c0c8b749ab44bbb093332f5b97..631ffeb91f2997754557d930f8d088c2effff400`, and relevant source/test/caller reads: passed; complete feature delta inspected from scratch.
- `npm run typecheck`: passed independently.
- `npm test` in the restricted sandbox: unsuccessful launcher-suite execution, then stalled without further output; interrupted reviewer-owned run. Superseded by the successful authorized host run below.
- `npm test` on the host with authorized descriptor/local-socket access: passed independently, exit 0; 409 tests, 0 failures, 0 cancelled, 0 skipped, 0 todo; duration 49268.937122 ms.
- `git diff --check c5003ed17a4b09c0c8b749ab44bbb093332f5b97..HEAD`: passed. Targeted skipped/focused/placeholder-test search in changed tests found none.
- Read-only `node .thread-local/desktop-50-62/cdp.mjs <DOM-state-expression>` against existing `127.0.0.1:9340`: passed; actual isolated Electron page complete, grants empty, review text empty, Refresh enabled, `require`/`process` undefined. No interactions, mutations, grants or ownership changes performed.
- Inspected retained `.thread-local/desktop-50-62/evidence/55-r1-verify.log`: passed strict typecheck, 409 tests and both production builds. Build was not repeated by the reviewer to preserve the running acceptance app.

## Evidence

- Scope is the entire `c5003ed17a4b09c0c8b749ab44bbb093332f5b97..631ffeb91f2997754557d930f8d088c2effff400` feature delta, including the verified active spec, README and desktop documentation; all changed `src/standalone/` controller, journal/profile, storage/save, filesystem writer, IPC contracts/preload/main, renderer/view, HTML/CSS and test files. Followed shared `src/vault/changes.ts`, `change-draft.ts`, reader/security and save callers as needed. Existing findings did not define review scope.
- Checked installed Audit/independent-review contracts, AGENTS, config, overview, coding standards, AI interaction guidelines and feature order. Quality: no new findings; extraction reuses profile durability without changing schemas. Security: no new findings; main-owned before bytes, exact volatile capabilities, scope/roles, identity/CAS/ownership and narrow IPC remain enforced. Performance: no new findings; operation/text/history/diff bounds and shared diff fallback inspected. Tests: no new findings; real filesystem/controller cases cover revised/stale apply, create collisions, guarded undo, revoke, interlocks, rollback and retained restart recovery; delayed UI cases cover obsolete replies and dirty Apply.
- Inspected retained actual Electron artifacts `55-native-preview.json`, `55-native-undo.json`, `55-native-external-edit.json`, `55-native-interruption.json`, `55-native-recovery.json`, `55-native-limits.json`, `55-native-plugin-pending.json`, `55-preservation.json` and `55-r1-native-refresh.json`. These cover explicit mapped access/ownership, exact revise/apply/undo, foreign-edit preservation, real process kill after durable recovery, fresh-grant restart/restoration, redaction, 500-line display bound, pending plugin refusal and fixture/archive preservation. No mutation helpers rerun.
- Visually inspected retained `55-change-light.png` and `55-change-dark.png`: native controls, marked numbered diffs, exact-content sections and visible keyboard focus are readable in both themes.
- Excluded generated bundles, dependencies, caches and prior archives from source review; request/findings files were workflow evidence rather than application code. Inspected retained generated runtime evidence only for acceptance. No dependency installation, rebuild, code/spec/config/test changes, commits or external actions performed.

## Findings

- No new findings across quality, security, performance or tests. F-01 [P2] explicitly closed after independent code review, passing delayed-response regressions, retained native repair evidence and read-only current runtime inspection. No open or fixed P0/P1 finding remains. No repair order required.

## Remaining risk

- Cooperative Linux writer ownership cannot exclude unrelated editors during the final syscall interval; the reviewed implementation and docs explicitly retain this limitation. Real process-interruption recovery was demonstrated, not power-loss recovery.
- Native mutation/theme/restart acceptance and production-build results were inspected from retained evidence; this reviewer performed independent typecheck/tests and read-only live Electron inspection, preserving synthetic fixtures and the running app. No unavailable verification command remains after the authorized host test rerun; Check was not required by the pending request.
