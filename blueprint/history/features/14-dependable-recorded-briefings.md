# Feature: Dependable recorded briefings

**From build-plan:** feature 14
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/dependable-recorded-briefings`

## Goal

Resume with a useful cited record before inference, preserve it when Ollama is unavailable, and keep model interpretations distinct from recorded facts.

## In scope

Deterministic recognized objective/property, decision status, question and latest user-report extraction; recorded-first Resume UI and supporting excerpts; composed quality evaluation and synthetic native acceptance.

## Out of scope

Automatic truth or completion inference, rewriting legacy notes, changing session/weekly generation, broader retrieval ranking or offline AI.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Recorded context** - Extract bounded verbatim recorded fields with source IDs and explicit decision statuses; compose model-only interpretations separately. *Done when:* Pure tests cover headings/properties, absent/ambiguous fields, future plans, status, reports and model misclassification; Verify passes.
- [x] **Step 2 - Recorded-first Resume** - Read and display current scoped records before local model checks, retain them on model failure or cancellation, and show cited excerpts beside records. *Done when:* The view separates records and model interpretation; scope/source invalidation clears stale context; no model is required to read records.
- [x] **Step 3 - Observed dependable Resume** - Exercise native model-down, delayed generation, real inference, cancellation and invalidation; evaluate the composed briefing with raw model diagnostics retained. *Done when:* Synthetic native acceptance and curated composed cases pass; Verify and fresh independent review pass.

## Files / areas

src/intelligence/recorded.ts and tests, evidence metadata passage support, BriefingView, quality runner and documentation.

## Data / contracts

Recorded means verbatim note content, not externally verified truth. Only recognized objective/goal headings or project objective/goal string properties populate objectives. Decision records require type decision and retain explicit proposed/accepted/superseded/unknown status. Latest dated session user-report stays labeled user-reported; future plans never become recorded activity. Unrecognized structure remains unknown. Model classifications cannot populate recorded sections. Model interpretation/suggestions remain cited and visibly labeled. Existing scope, graph freshness, actual source hashes, cancellation and lifecycle guards apply before display and source opening. No writes, downloads or permission expansion.

## Testing

npm run verify per step; deterministic extraction/composition tests; quality self-check plus real local inference with raw model outputs retained; actual synthetic Obsidian evidence before inference and with unavailable model, cancellation, source/exclusion invalidation and source opening; fresh full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed acceptance

- Verify passed all 21 test files, typecheck and production build after each step. No new dependencies.
- `.thread-local/evidence/feature-14-native.json`: six actual Obsidian scenarios passed: no-model records/native source opening, unavailable runtime, records visible before delayed inference plus cancellation, real local inference with separated interpretations, source-edit invalidation and immediate exclusion. Only the marker-guarded synthetic vault was used; modified probe text and settings were restored.
- `.thread-local/evidence/feature-14-live.json`: real qwen3:4b-instruct evaluation passed 10/10 curated checks with zero operational errors. Briefing reports retain raw model output separately from recorded-first composition. This is a small curated run, not a general accuracy guarantee.
- `.thread-local/evidence/feature-14-recorded.png`: native recorded-context UI captured and inspected.

## Try it now

In a synthetic project with an Objective heading and an Open questions heading, leave the model empty in Thread settings, then choose Resume project. Recorded context and supporting excerpts appear without a model request. Select a downloaded local model and Resume again to see interpretations separately.

## Remaining limits

Only recognized fields populate recorded sections. Legacy structure and bounded-out passages can be missing. Latest activity is a dated session user-report, not proof of completion. Quoted notes can be mistaken. Model interpretations can still be wrong; no note is changed by Resume.

## Independent review repairs

F-01 and F-02 were independently reproduced and repaired on attempt 1. Date-only reports now use local-calendar eligibility, and same-calendar-date ordering uses source modification time and path consistently with the evidence baseline. Regression coverage includes Europe/Sofia at 00:30, same-date sessions with inverse filename ordering, future-day exclusion, and an overall review baseline with latest session selection. `.thread-local/evidence/feature-14-repaired-final-verify.log` passes all 21 files/typecheck/build. `.thread-local/evidence/feature-14-native-repaired.json` repeats all six native scenarios successfully; `feature-14-native-order.json` demonstrates the later same-date report in actual Obsidian. `feature-14-live-repaired.json` repeats the real model run at 10/10 with zero operational errors. Fresh independent review must confirm closure before completion.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5923,"specSha256":"8e21594fff8a79d74edfcf8c5293b74778438af00471efb7985e092573f7871a","branch":"refs/heads/feature/dependable-recorded-briefings","head":"f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc","baseRef":"refs/heads/main","baseCommit":"024a760cf8dd797848f0351b26394dd601a2feef","sourceTree":"5c7d6868cc90cc52916c6d7dfdd1428b8126e6a6","landing":"local-merge","absentOptional":[]} -->

## Findings

### 14/F-01 [P1] closed - Current local-day session reports disappear after midnight

**File:** src/intelligence/recorded.ts:29
**Found:** 2026-10-15 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The new recorded extractor parses date-only `recorded_on` as UTC midnight, unlike the established local-calendar eligibility in `buildEvidence`. Reproduced with `TZ=Europe/Sofia`, local 2026-10-15 00:30 and a session dated 2026-10-15: the bundle correctly selects that session as its baseline, but recorded `lastActivity` is empty. A current session is incorrectly treated as future evidence until 03:00 locally, violating the latest dated user-report contract and local-date convention.
**Suggested fix:** Apply the existing date-only local-calendar rule when filtering recorded reports, while comparing timestamps as instants. Add a focused regression at local midnight in a positive UTC offset and retain the future-day exclusion check.
**Resolution:** Closed by fresh independent review on 2026-10-15 at target f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc. Re-examined src/intelligence/recorded.ts, src/vault/evidence.ts and recorded.test.ts: date-only eligibility compares local calendar days while timestamps compare instants. The Europe/Sofia 00:30 regression passes, alongside future-day exclusion; the original midnight defect is gone. npm run verify passes all 21 files, typecheck and build. No repair regression identified.

### 14/F-02 [P1] closed - Same-day reports can show older progress instead of the latest session

**File:** src/intelligence/recorded.ts:30
**Found:** 2026-10-15 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** For reports sharing a date, the extractor sorts by path and discards the established latest-session ordering. Reproduced with `P/A-early.md` modified one hour before `P/Z-latest.md`, both dated 2026-10-15. `buildEvidence` correctly selects Z-latest as baseline and supplies it first, but recorded `lastActivity` quotes A-early. This regresses the prior briefing behavior, which reads the baseline session, and can present superseded progress as the latest report during ordinary multiple-session days.
**Suggested fix:** Preserve the evidence builder's same-date latest-session ordering (or use its session baseline when applicable) instead of reordering tied reports alphabetically. Keep selection among session reports correct when the overall baseline is a review. Add a regression with an alphabetically earlier old session and a later current session on the same date.
**Resolution:** Closed by fresh independent review on 2026-10-15 at target f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc. Re-examined src/intelligence/recorded.ts, src/vault/evidence.ts and recorded.test.ts: recorded sessions sort by calendar date, descending source modification time and path, consistently with the baseline. Regressions pass for inverse filename ordering and latest session selection when the overall baseline is a review. Inspected feature-14-native-order.json showing Z-latest.md and Latest report. npm run verify passes. No repair regression identified.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc
**Base commit:** 024a760cf8dd797848f0351b26394dd601a2feef
**Base ref:** main
**Spec hash:** 8e21594fff8a79d74edfcf8c5293b74778438af00471efb7985e092573f7871a
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-15T10:55:44.030308+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-15T10:56:56Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: pass; exact target/base/spec confirmed and only permitted review evidence differs.
- `git diff --stat`, `git diff --name-only`, and full source/documentation delta from 024a760cf8dd797848f0351b26394dd601a2feef to f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc: reviewed.
- `npm run verify`: pass; typecheck, all 21 test files, production build; zero failed, skipped or todo files.
- `npm run evaluate`: pass; offline reference and negative-control self-check.
- `git diff --check 024a760cf8dd797848f0351b26394dd601a2feef f971c4c87f7fe6fa5eb6c62612ff3b5b47f77ebc`: pass.
- Targeted file reads and test searches: pass; no focused, skipped or placeholder tests found in reviewed tests.

## Evidence

- Complete current feature delta reviewed across all four lenses: README.md, evaluation/README.md, scripts/evaluate.mjs, src/intelligence/recorded.ts, src/intelligence/recorded.test.ts, src/ui/briefing-view.ts, src/vault/evidence.ts, and active spec. Findings/review are workflow evidence, excluded from product-code scope.
- Followed relevant callers and contracts in src/main.ts, src/intelligence/briefing.ts, src/vault/evidence.test.ts, src/evaluation/cli.test.ts, and src/vault/workspace.ts local-day usage. Checked project-local AGENTS.md, Audit/independent-review contract, config, overview, coding standards and interaction conventions.
- Extraction preserves recognized verbatim records and explicit statuses; model sections become interpretations or suggestions. Native DOM text rendering, existing scoped read/hash/dependency guards, revision cancellation, invalidation and source-opening checks remain intact. Evidence and rendered content remain bounded; no dependencies or write permissions added.
- F-01 confirmed repaired: Europe/Sofia local 2026-10-15 00:30 regression and future-date exclusion pass. F-02 confirmed repaired: inverse filename ordering and review-baseline/session ordering regressions pass; source modification time is carried into evidence.
- Inspected .thread-local/evidence/feature-14-native-repaired.json: all six recorded native scenarios pass, including no-model source opening, unavailable runtime, delayed inference/cancellation, separated real inference, edit invalidation and exclusion invalidation.
- Inspected .thread-local/evidence/feature-14-native-order.json: later same-day Z-latest.md report selected in native Obsidian.
- Inspected .thread-local/evidence/feature-14-live-repaired.json and feature-14-live-repaired.log: qwen3:4b-instruct, 10/10 curated cases, zero operational errors. Briefing cases retain modelOutput separately; raw model classifications remain visibly distinct from composed recorded sections.
- Visually inspected .thread-local/evidence/feature-14-recorded.png: actual Obsidian recorded context, source button and supporting-excerpt control shown without a model.
- Inspected spec-referenced step-1/step-2/step-3, repair-verify and repaired-final-verify logs, original native/live evidence and repaired acceptance records. Verify logs report 21 passing files and zero skips/todos.
- Excluded dependencies, generated main.js/dist/cache files and unrelated unchanged product areas. This is a complete current-delta review, not a full-project audit.

## Findings

- No new findings across quality, security, performance or tests.
- F-01 closed: original local-midnight defect confirmed gone.
- F-02 closed: original latest-session ordering defect confirmed gone, including an overall review baseline.
- No open or fixed P0/P1 findings remain. Repair order: none.

## Remaining risk

- Native Obsidian scenarios and live Ollama inference were inspected from recorded synthetic evidence, not rerun by this reviewer. Required Check was no; no required verification command was unavailable.
- The small curated model run does not establish general semantic accuracy. Model interpretations can remain wrong; bounded evidence and unrecognized legacy structure can omit records, as disclosed in the product/spec.
- No current vulnerability scanner or performance profiling run was claimed; security/performance conclusions cover reachable code and existing bounds in the reviewed delta.
