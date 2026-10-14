# Feature: Reviewed knowledge updates

**From build-plan:** feature 7
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/reviewed-knowledge-updates`

## Goal

Turn selected sources into reviewed knowledge proposals with exact before/after previews, guarded writes, recoverable failures and bounded undo history.

## In scope

Local sourced synthesis, create or append to mapped Knowledge notes, optional reviewed project link, durable pending proposals/backups, before-content checks, rollback/recovery and guarded undo for the last20 applied batches.

## Out of scope

Autonomous edits, raw-source changes, model-chosen destinations, filesystem-wide atomicity and permanent history.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Guarded change engine** - Implement durable proposals/backups and checked create/update/apply/recovery/undo operations. *Done when:* Deterministic tests cover stale writes, partial failures, all-target backups before first write, rollback conflicts, undo conflicts, persistence failures and bounded history; Verify passes.
- [x] **Step 2 - Proposal and history review UI** - Show exact affected before/after contents, sources, apply/reject/stale/recovery and guarded undo controls. *Done when:* Real Obsidian applies reviewed multi-note batch, refuses conflicts and preserves later edits during undo; Verify passes.
- [x] **Step 3 - Source-to-knowledge workflow** - Generate grounded synthesis from selected allowed sources with user-chosen new or existing Knowledge target and optional project link. *Done when:* Actual local model produces a cited proposal, user preview/apply preserves sources and prior target content, recovery proof and Verify pass.

## Files / areas

src/vault/changes.ts and tests, durable plugin change store and Obsidian write adapter, native knowledge/change-review/history UI, main/sidebar entries.

## Data / contracts

Only explicit user-chosen mapped destinations, with exclusions and read permission before existing-target reads. Model controls prose only, never paths/operations/permissions. Update appends a dated, delimited reviewed synthesis preserving original properties/content, with machine-readable source provenance. New notes get stable UUIDs. Proposal pending/applied/rejected/stale/recovery-required lifecycle persists under plugin directory. Every target original is durably stored before the first batch write; revalidate each operation and its exact before content immediately before create/atomic Vault.process replacement. Failure attempts guarded rollback, lists unrecovered paths and leaves durable recovery. Never claim true filesystem atomicity. Undo previews exact reversal and checks all after hashes; later edits refuse erasure. Explicit undo can trash only unchanged notes created by that batch, using Obsidian local trash; automatic rollback only touches the batch's exact unchanged created content. Keep last20 settled applied batches, retaining unresolved recovery independently. Reviewed batches contain at most10 notes and 1MiB of UTF-8 note text, with bounded source context. Knowledge/review destinations need explicit read scope for conflict checks. A shared in-process lease and cache compare-and-swap prevent overlapping/reloaded instances from silently replacing history. Source notes remain unchanged.

## Testing

Pure engine tests with controlled fake storage/failures and real Obsidian/local-model proposal, multi-note apply, before-hash conflict, injected partial failure/recovery and after-hash undo conflict. Verify and required fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

Verify passes fourteen test files, typecheck and production build. Tests cover durable all-target originals, stale inputs, final source-state guards, rollback conflicts, interrupted reload, undo failure, later edits, persistence failure, last20 retention, canceled drafts, stale review IDs and identical-create collision ownership.

Actual Obsidian proved reviewed two-note apply, exact backups/history across reload, undo refusal after a later edit, successful undo of unchanged targets, and stale-write refusal. Injected second-write failures rolled back completed writes. A concurrent edit remained intact with durable recovery after reload; explicit synthetic-user resolution completed recovery. A failed create with an independent identical note preserved that note, with no automatic trash.

Real Ollama/qwen3:4b generated a cited new Knowledge note plus an optional project link, both matching the approved preview exactly. The link entered the index. Appending another synthesis kept every prior property and byte of human text as its prefix. Selected source notes remained unchanged. Cancel left no note or pending draft. Revoked source permission hid cached draft content and disabled Apply. Raw-source mutations were refused.

Synthetic receipts under `.thread-local/evidence/`: `feature-07-engine.json`, `feature-07-recovery.json`, `feature-07-recovery-repaired.json`, `feature-07-knowledge.json`, `feature-07-boundaries.json`, `feature-07-collision.json`. Recovery test actions affected only purpose-created synthetic notes. No personal notes were touched. Atomic replacement applies to one existing note through Vault.process; multi-file changes and trash are guarded recoverable operations, not a filesystem transaction.

## Try it now

Map Knowledge and allow it in read paths for conflict checks. Choose Knowledge, add source notes, enter a title, optionally choose an existing Knowledge note and a project note to link, then Generate knowledge proposal. In Changes inspect each Before/After and source; Apply or Reject. Applied history offers Preview undo. A later edit refuses undo; Open current note lets you compare it with the stored originals. Recovery required keeps exact paths and backups until resolved. Keep regular vault backups; Thread retains only the last20 applied batches.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6388,"specSha256":"7d52933aa290e2c4fd7cc508753693736785ddb092f4e9fdf2283ecb413b883b","branch":"refs/heads/feature/reviewed-knowledge-updates","head":"6312c3d850bc2df9145ca35105b644d22de4610c","baseRef":"refs/heads/main","baseCommit":"d08b3013b28c06161fc3684afd02da6c714ec705","sourceTree":"e4191123d973a247d3391baf7be586fb6a330a9f","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 6312c3d850bc2df9145ca35105b644d22de4610c
**Base commit:** d08b3013b28c06161fc3684afd02da6c714ec705
**Base ref:** main
**Spec hash:** 7d52933aa290e2c4fd7cc508753693736785ddb092f4e9fdf2283ecb413b883b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T20:59:48.372631+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T21:01:10.876120+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed; strict typecheck, all 14 test files, production build.
- `git diff --check d08b3013b28c06161fc3684afd02da6c714ec705..6312c3d850bc2df9145ca35105b644d22de4610c`: passed.
- HEAD, main merge-base, raw spec SHA-256, and working-tree freshness checks: passed.
- Targeted skipped/focused/placeholder test search in the added test files: none found.

## Evidence

- Fresh isolated reviewer context; full committed feature delta reviewed against main merge-base d08b3013b28c06161fc3684afd02da6c714ec705 through target 6312c3d850bc2df9145ca35105b644d22de4610c. Tracked current-feature bytes match the recorded hash; no spec snapshot is declared or needed.
- Reviewed src/main.ts wiring, write adapter and lifecycle, both new native modals, changes.ts and its tests, knowledge.ts and its tests, index.ts link changes, briefing-view.ts entry points, and current-feature.md. Followed existing scope, workspace, evidence, index, ThreadModal, source-link and model/answer contracts where reachable.
- Inspected all six feature-07 synthetic Obsidian receipt JSONs and matching test-07 scripts under .thread-local: engine, recovery, recovery-repaired, knowledge, boundaries, collision. Recorded checks cover native preview/apply, exact backups and reload, stale refusal, partial rollback, preserved later edits and explicit recovery, real qwen3:4b synthesis, source preservation, cancellation, scope revocation and identical-create collision ownership.
- Confirmed all-target durable originals before writes, before-content replacement guards through Vault.process, source/settings revision checks, bounded batch/history state, in-process shared lease and persisted-history compare-and-swap. Automatic apply rollback only visits writes reporting success; uncertain writes retain explicit recovery. Sources/Inbox mappings and type: source cannot be reviewed write targets.
- Checked project strict TypeScript, Obsidian API, explicit scope, local-only model, native UI, preserved content and guarded recovery conventions. No filesystem-wide atomicity is claimed. Generated bundles, dependencies and unrelated source areas excluded from code review.

## Findings

- None. No confirmed quality, security, performance or tests finding in the reviewed target delta. Findings ledger remains unchanged.

## Remaining risk

- Runtime acceptance is inspected evidence from the existing synthetic vault scripts and receipts; this reviewer did not rerun the Obsidian/local-model interactions or perform personal-vault actions.
- Multi-file changes and trash remain guarded recoverable operations rather than an atomic filesystem transaction. Native trash has no atomic content compare-and-delete API; preservation relies on checked current contents and observed vault revision immediately before trash.
- No dedicated security scanner or performance benchmark is configured. No unavailable declared verification command; Verify completed successfully. No cross-platform runtime claim beyond the recorded synthetic environment.
