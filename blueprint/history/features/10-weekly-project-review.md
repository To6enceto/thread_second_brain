# Feature: Weekly project review

**From build-plan:** feature 10
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/weekly-project-review`

## Goal

Generate an on-demand sourced review of the last seven local calendar days, with explicit project or allowed-vault scope and optional reviewed save.

## In scope

A seven-day period ending on a chosen date, activity in selected records, explicitly resolved questions, dated new/changed sources and suggested projects to revisit. Native cancellation, source links, exact new Markdown preview/save, including first-save folder creation shared with session previews.

## Out of scope

Scheduling, automatic saves, calendar integrations, inferred completion from absence and automatic project-status changes.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Weekly review contract** - Implement local calendar period validation, dated-source selection and structured review/Markdown with focused tests. *Done when:* Calendar/DST boundaries, invalid dates, out-of-period citations, suggestion labels and provenance pass focused tests and Verify.
- [x] **Step 2 - On-demand review workflow** - Add explicit project/all-allowed scope, local generation, rendering and save preview. *Done when:* Real local-model review distinguishes source modification/capture dates from events, resolves only explicitly answered questions, includes new source/project suggestions, saves exactly on request and passes Verify plus fresh review.

## Files / areas

Weekly review logic/tests, native weekly review modal, plugin/sidebar wiring.

## Data / contracts

Default scope is selected project; wider scope requires explicit all-allowed selection and remains filtered by exclusions. Period is seven local calendar days ending on a valid date no later than today. Read bounded eligible notes, keeping older context distinct from period records. Source dates and file modification dates are displayed as recorded metadata, not proof of events. AI claims have valid source references; projects to revisit are suggestions, never status changes. Resolved questions require explicit resolution evidence, never absence. New/changed source list is derived from eligible dates. Snapshot inputs/settings/sources through requests, presentation and save; cancel invalidates output. Explicit save creates a new UUID/type review/generated_on/model/source provenance and period fields in mapped Reviews, no overwrite. No scheduler or paid runtime.

## Testing

Pure date/claim/source filtering/Markdown tests and actual Obsidian/qwen3:4b-instruct review over two synthetic projects, explicit resolution and unknown gaps, source labels, save/cancel/no-autosave, Verify and fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

Implementation note: creating the first mapped Reviews/Sessions folder invalidates its parent generation dialog. New-note saves now use the established Ask/Decision preview pattern: the immutable preview owns its lifecycle guard and validates captured source hashes/settings independently of parent rendering. Before/after folder validation and immediate pre-create revision/path checks remain in NewNoteModal/createNewNotes; scope/source changes still refuse writes. Native regression covers both first folders.

## Verification observed

- `npm run verify`: typecheck, all 17 test files and production build passed. Pure tests cover seven local calendar days across year/DST boundaries, invalid/future dates, out-of-period citations, suggestion labels, provenance and the UTC/local-date difference just after midnight.
- `.thread-local/test-10.js` / `.thread-local/evidence/feature-10.json`: actual Obsidian 1.14.4 + qwen3:4b-instruct. Project scope excluded Beta; explicit All allowed included both projects and excluded the private sentinel from actual model requests. The review reported the explicit originals-preservation resolution, kept the Bulgarian-model question unanswered, and suggested revisiting paused Beta without changing it. No auto-save; approved review matched exact saved Markdown; original sources unchanged; cancellation passed. First nested Reviews save and first project Sessions folder save both passed.
- The first folder test exposed parent-dialog invalidation during directory creation. Session and weekly previews now follow the existing Ask/Decision pattern: the new-note preview independently guards its approved immutable content, own lifecycle, source hashes/settings, destination paths and immediate pre-create revisions. Parent rendering does not invalidate a legitimate owned folder creation. Source/scope checks remain active before and after preparation.
- `.thread-local/test-10-dates.js` / `.thread-local/evidence/feature-10-dates.json` on the final bundle: when every record is after the chosen end day, no model request occurs and saving is disabled. The current period generates successfully and stays unsaved until approval. Date-only boundaries use local dates; UTC fallback timestamps cannot include next-local-day file modifications in the previous day.

## Try it now

Run **Thread: Weekly project review** in a test vault. Keep Selected project or explicitly choose All allowed notes. Pick an end day, generate, and inspect activity, reported resolutions, dated source changes, suggestions and gaps. Each source shows its date basis. Choose **Preview weekly review note** and save only after reviewing the exact contents. Expect a new note in mapped Reviews, unchanged original notes and no project-status changes.

## Limits

The review considers at most 80 most recently modified eligible notes and a bounded inference context, with explicit gaps for omissions. Source dates do not prove event dates; historical reviews use current note contents and recorded dates rather than historical file versions. Only explicit recorded resolutions should be treated as answered; citation identity is not semantic proof. No scheduler is installed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6394,"specSha256":"42cbb4fdeec35550f2f9025fa9d9cf67aa97b366713fed867710cb78a580c58b","branch":"refs/heads/feature/weekly-project-review","head":"c94bb768966921ebcf6a927165079b828ebcde94","baseRef":"refs/heads/main","baseCommit":"d89f5478d069483383aa1dc14e7b1537eab09a9c","sourceTree":"76eeb5d615ccc3a1a21abaaf815ea12c99ed745d","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** c94bb768966921ebcf6a927165079b828ebcde94
**Base commit:** d89f5478d069483383aa1dc14e7b1537eab09a9c
**Base ref:** main
**Spec hash:** 42cbb4fdeec35550f2f9025fa9d9cf67aa97b366713fed867710cb78a580c58b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T21:35:08.906547+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T21:36:33.024371+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `npm run verify`: passed; TypeScript typecheck, all 17 test files (zero failures/skips/todos), production build.
- `git status --short`, `git rev-parse HEAD`, `git merge-base main HEAD`: passed; only review evidence differs, target and recorded merge base match.
- `sha256sum blueprint/context/current-feature.md`: passed; exact recorded spec hash.
- Full-range `git diff`, targeted source/contract reads, and skipped/focused-test search: completed; no skipped, focused, or placeholder tests found in the reviewed test paths. Search returned no matches.

## Evidence

- Fresh isolated reviewer received the project-local handoff without the builder transcript. Reviewed the complete d89f5478d069483383aa1dc14e7b1537eab09a9c..c94bb768966921ebcf6a927165079b828ebcde94 delta against the verified spec, with main as base ref.
- All changed source paths inspected: src/main.ts, src/ui/briefing-view.ts, src/ui/session-modal.ts, src/ui/weekly-modal.ts, src/vault/weekly.ts and src/vault/weekly.test.ts. Also inspected affected index/project membership, evidence date construction/currentness, answer citation/provenance, ThreadModal/NewNoteModal, new-note engine and its write-race/collision/partial-failure tests, workspace write wiring, and package/test runner configuration.
- Applied AGENTS.md, coding standards, overview, AI interaction rules, installed Audit skill and independent-review contract. Generated bundle, dependencies, caches, unrelated source and third-party code excluded from code review. No dependency/configuration changes in the delta.
- Weekly period logic uses local calendar arithmetic and rejects invalid/future dates; source filtering rejects records after the selected end date and limits activity/resolution citations to period records. Prompt distinguishes event dates, older context, explicitly answered questions and gaps; output forces interpretation/suggestion labels and preserves source provenance.
- Inspected .thread-local/test-10.js and .thread-local/evidence/feature-10.json: recorded actual Obsidian 1.14.4/qwen3:4b-instruct requests separate selected Alpha from explicit all-allowed Alpha/Beta and omit the excluded sentinel. Recorded output explicitly resolves originals preservation, retains the Bulgarian model question as unanswered and suggests revisiting paused Beta. Exact reviewed save, no autosave, unchanged original sources, cancellation, first nested Reviews folder and first Sessions folder save all pass in that evidence.
- Inspected .thread-local/test-10-dates.js and .thread-local/evidence/feature-10-dates.json: historical period with exclusively later records makes no inference request and disables save; current period generates without autosave. Pure tests exercise year/DST calendar boundaries, invalid dates, out-of-period claims and UTC/local fallback-date separation.
- Shared first-folder save change follows existing Ask preview ownership. NewNoteModal independently guards its own lifecycle and captured source/settings validation; createNewNotes validates before/after folder creation, then immediately checks revision/settings and destination before create. Parent rendering invalidation does not invalidate the approved immutable preview. No source repair or other product mutation performed.

## Findings

- None. No confirmed quality, security, performance or tests findings. Findings ledger unchanged; no IDs added, updated or closed. No repairs required.

## Remaining risk

- Native Obsidian/Ollama acceptance evidence was inspected, not rerun by this reviewer; Check was not required. This review does not independently establish additional platform, keyboard/theme or model robustness coverage beyond the recorded synthetic Linux evidence.
- Citation identity cannot guarantee semantic support for every model output. The recorded real-model case supports the explicit-resolution and unanswered-gap behavior; the UI labels activity/resolutions as interpretations and asks users to verify sources.
- Documented limits remain: at most 80 recent eligible notes and a bounded inference context; historical reviews use current note contents and recorded dates, not historical snapshots. No current vulnerability scanner or performance profiler is configured; no network audit was run.
