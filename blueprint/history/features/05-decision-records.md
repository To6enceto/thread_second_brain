# Feature: Decision records

**From build-plan:** feature 5
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/decision-records`

## Goal

Record project choices as explicit proposals or accepted decisions, preserving alternatives, rationale, evidence and revisit conditions in Markdown.

## In scope

Manual decision editor with explicit status, selected eligible evidence, stable identity/provenance, exact new-note preview/save and read-only review of proposed/accepted/superseded records.

## Out of scope

Automatic acceptance, rewriting old decisions, and evidence-driven retain/annotate/supersede updates (features 7/8).

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Decision contracts** - Construct safe durable decision notes and reusable project membership selection. *Done when:* Tests cover required fields, statuses, identity, alternatives/revisit fields and current eligible membership; Verify passes.
- [x] **Step 2 - Create and review decisions** - Add native decision editor/list, checked evidence selection and explicit preview/save. *Done when:* Actual Obsidian saves exact proposed and explicitly accepted decisions, lists retained superseded records and opens sources safely; Verify passes.

- [x] **Step 3 - Review repair** - Require completed current indexing before resolving project identity or enabling decision preview. *Done when:* pending-index UI refuses preview, completed index uses existing UUID, legacy fallback remains correct, and Verify passes.

## Files / areas

src/vault/decision.ts and tests, index membership helper, native decision modal, main/sidebar commands.

## Data / contracts

New records have UUID, type decision, project identity, proposed/accepted status and local decided_on date. Proposed is default; user explicitly selects Accepted. Evidence is optional with a visible missing-evidence note; selected references are eligible current notes and retain full/passage hashes. Required question/choice/rationale, optional alternatives/constraints/revisit conditions are readable Markdown. Preview and save create only a fresh project Decisions/name.md and reject collisions/stale references. Review includes all recorded statuses and never deletes or hides superseded notes. Existing-record changes use the later reviewed-change workflow rather than overwriting here.

## Testing

Decision record validation and membership tests, real Obsidian form/preview/save/status/list/collision checks, Verify and fresh independent review. No model needed for manual recording.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

Verify passes eleven test files, typecheck and build. Real Obsidian UI created proposed and explicitly accepted decision notes exactly matching previews, with stable project identity, selected source references and revisit conditions. Proposed is the default. Duplicate name refused. An existing synthetic superseded decision remained byte-identical, appeared with its status and opened from the review list. Receipts: `.thread-local/evidence/feature-05-runtime.json` and `feature-05-collision.json`. Existing-note status changes remain reserved for the reviewed updates in features 7/8.

## Try it now

Choose Decisions in Thread, fill a question, choice and rationale, optionally add alternatives and supporting evidence, then preview. Proposed is the default; select Accepted explicitly for a choice you accept. Save the exact new note. Refresh the review list to inspect every recorded status and open original notes.

Review repair proof: `.thread-local/evidence/feature-05-identity.json` confirms disabled preview and refused identity while loading, no pending child preview, and the correct existing project UUID once ready. Verify passes with pending/legacy/conflicting identity regressions.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4238,"specSha256":"aba49c6f4499c6edaf3737f9a63c110a703c91ee280fb65ef8d4069c1e91d5c3","branch":"refs/heads/feature/decision-records","head":"f083f69b778a66a5a61fcbb7e86276800d2aa2cc","baseRef":"refs/heads/main","baseCommit":"784fced711c9caafcd5f8b21948e3afefcb9596f","sourceTree":"3024f173e193a488c4d3ec1c6862b302e0b356ea","landing":"local-merge","absentOptional":[]} -->

## Findings

### 5/F-01 [P1] closed - Decision preview records a folder as project identity during index rebuild

**File:** src/ui/decision-modal.ts:39
**Found:** 2026-10-14 by /audit independent (scope: current; lenses: quality, tests)
**Why it matters:** Preview is immediately enabled while the initial `load()` awaits `rebuildIndex()`, and remains enabled after invalidation clears the index. With optional empty evidence, `evidenceCurrent()` can pass before indexing completes. `projectIdentity()` then falls back to the folder path because the existing project record is absent from the temporary empty index. A project with an established UUID can therefore receive a durable new decision whose `project` is `Projects/A` rather than that UUID. The new-note validator checks evidence/settings but never resolves the identity again. This violates the stable project identity contract and prevents property-based membership outside folder containment after moves.
**Suggested fix:** Require a completed current index before resolving decision identity, disable preview while decision/evidence loading or invalidation is pending, and fail visibly if indexing is unavailable. Retain fallback only when a completed eligible index establishes that the mapped legacy project has no ID. Cover preview during a pending/restarted rebuild, including empty evidence, and verify the adjacent shared identity caller remains safe.
**Resolution:** Independently closed on 2026-10-14 against f083f69b778a66a5a61fcbb7e86276800d2aa2cc after a fresh full-delta review. Preview starts disabled, invalidation disables it again, the handler checks readiness, and `identityFromIndex` refuses pending state even after asynchronous evidence validation. Completed-index lookup preserves the existing project ID, rejects conflicting IDs, and retains the legacy fallback only with a completed index. The adjacent Ask save caller catches identity failure visibly. `npm run verify` passed, including pending, legacy, nested-folder, and conflicting-ID regressions. Inspected `.thread-local/test-05-identity.js` and its real-host receipt `.thread-local/evidence/feature-05-identity.json`: identity refusal, disabled loading preview, no pending child preview, and correct ready-state identity all pass. The deployed synthetic-vault bundle exactly matches the newly verified production bundle. The original race is removed; no new defect was found in the repair.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** f083f69b778a66a5a61fcbb7e86276800d2aa2cc
**Base commit:** 784fced711c9caafcd5f8b21948e3afefcb9596f
**Base ref:** main
**Spec hash:** aba49c6f4499c6edaf3737f9a63c110a703c91ee280fb65ef8d4069c1e91d5c3
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T20:27:21.739246+00:00
**Workflow:** continuous
**Check required:** no

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T20:28:57Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed typecheck, all 11 test files, and production build; zero failed, skipped, or todo test files.
- `git diff --check 784fced711c9caafcd5f8b21948e3afefcb9596f..f083f69b778a66a5a61fcbb7e86276800d2aa2cc`: passed.
- `git rev-parse HEAD`, `git merge-base main f083f69b778a66a5a61fcbb7e86276800d2aa2cc`, `sha256sum blueprint/context/current-feature.md`, and `git status --short`: target, merge base, exact tracked spec hash, and permitted evidence-only differences confirmed.
- `sha256sum main.js .thread-local/test-vault/.obsidian/plugins/thread/main.js`: identical production and deployed synthetic-vault bundles.

## Evidence

- Reviewed the complete base-to-target product delta: decision editor and serializer/tests, shared project membership and identity/tests, extracted evidence rendering, plugin command, and sidebar action. Followed adjacent settings/scope, index rebuild/invalidation, evidence construction/freshness, NewNoteModal/createNewNotes, source opening, and Ask identity caller. Checked project coding standards and active spec; current feature explicitly reserves existing-note updates for features 7/8.
- Quality: native controls and existing preview/save infrastructure reused; required fields, explicit status, UUID, date, provenance, and preserved statuses match the spec. Security: eligible reads, excluded paths, escaped user Markdown, destination validation, collision refusal, exact preview approval, stale-state checks, and source-opening checks inspected.
- Performance: selected evidence is capped at 10 notes and uses bounded indexed excerpts/evidence; review performs local index filtering. No new model/network path or material unbounded-work regression found at the project's stated scale.
- Tests: reviewed decision/status/date checks, membership regression, ready/pending/legacy/conflicting identity tests, and nearby freshness, collision, write-race, partial-failure, and source-invalidation coverage. No focused, skipped, or placeholder tests encountered.
- Inspected all feature-05 runtime receipts: `.thread-local/evidence/feature-05-runtime.json` records exact proposed/explicitly accepted saves and retained/openable superseded decision; `feature-05-collision.json` records default Proposed and collision refusal; `feature-05-identity.json` records identity refusal, disabled preview while loading, no pending child preview, and correct ready-state identity. Inspected the creation and controlled pending-index scripts and the resulting synthetic Markdown records, including UUID, project ID, source full/passage hashes, alternatives, and revisit conditions.
- Excluded dependencies, generated production bundle as source, downloaded runtimes/models, unrelated synthetic-vault content, and the findings/request files from product-code review. Generated bundle hashes and named synthetic artifacts were inspected only as runtime evidence.

## Findings

- F-01 [P1] closed independently: pending indexing can no longer generate a legacy project identity in decision preview. No new findings.

## Remaining risk

- Runtime acceptance was assessed from existing actual Obsidian receipts, scripts, saved synthetic notes, and matching bundle hashes; this reviewer did not repeat host interactions. No cross-platform host acceptance or profiling is established. No lint, dedicated security scan, or performance command is configured. Check was not required by the request.
