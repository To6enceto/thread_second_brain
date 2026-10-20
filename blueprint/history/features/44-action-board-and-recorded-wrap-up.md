# Feature: Action board and recorded wrap-up

**From build-plan:** feature 44
**Build attempt:** 1
**Branch:** feature/action-board-and-recorded-wrap-up
**Status:** verified
**Archive:** blueprint/history/features/44-action-board-and-recorded-wrap-up.md

## Goal

Make current project actions easy to inspect and deliberately use selected recorded progress in Wrap up, without automatic status changes or claims of independent verification.

## In scope

- Lightweight native four-state board in full Thread workspace Actions, showing current permitted action records, reported dates/reasons, explicit open/review controls and empty/unavailable/coverage states.
- Shared bounded authoritative action snapshot reader for board and Wrap up, validating current raw bytes, canonical schema43, project/identity, scope and transitive source/PDF freshness.
- Wrap up checkboxes for explicitly selected current action progress, finite selected context, separately labelled user reports in exact saved session preview; preserve local model/source citations and save collision guarantees.
- Native keyboard/theme support, immediate invalidation, cancellation and parent/input/close guards for model output and exact save previews. Model suggestions remain reviewed text; recording any resulting action still goes through Project actions and its exact review.

## Out of scope

Drag-and-drop, automatic status changes, schedules, new action schema/migrations, automatic acceptance of suggestions, cloud services or new dependencies. No updates to existing action notes from Wrap up or board refresh; card transitions delegate to feature43.

## Build loop

Approved Continuous serial workflow; per-feature review with no routine approval pauses, no step commits. Host Verify, actual synthetic Obsidian acceptance with real local inference, fresh independent four-lens review and try guide. Maximum two repairs per same failure/finding. Normal push separately authorized after verified completion.

## Build steps

- [x] **Step 1: Current action snapshots.** Implement bounded shared snapshot/evidence selection logic and host read adapter. Done when focused tests prove project isolation, strict record/identity validation, stale/excluded/unsupported redaction, current-hash/cancel guards, bounded evidence and explicit selection only.
- [x] **Step 2: Native action board.** Integrate four labelled state columns into Thread workspace Actions with Refresh, Open and Review action controls; preserve other areas and contextual explicit transition form. Done when handler tests and typecheck prove lifecycle invalidation, stale async suppression and no automatic writes.
- [x] **Step 3: Explicit progress in Wrap up.** Add current action checkboxes (max5), selected report rendering and bounded source context, strengthen preview lifetime for selected inputs. Done when actual-handler tests prove chosen-only action context, no state writes, selected dependencies, source/input/cancel/close invalidation including final awaits, and exact save/collision behavior.
- [x] **Step 4: Native acceptance and verification.** Use real isolated Obsidian with authored actions in all states, keyboard/theme/empty/exclusion checks, a reviewed manual transition, real local wrap-up inference and exact session save. Done when action/prior-note bytes stay unchanged by board/generation/save, selected progress/citations are visible, stale previews refuse writes, Verify passes, documentation/try guide and immutable review packet are ready. Passing independent review separately gates Complete/push.

## Files / areas

New src/vault/action-board.ts and tests, current-read adapter in src/main.ts. src/ui/thread-workspace-view.ts and tests, src/ui/action-modal.ts contextual selection only. src/ui/session-modal.ts plus new handler tests, src/vault/session.ts/tests; styles.css scoped board primitives. README/spec/evidence only otherwise. Reuse action-record schema43, ThreadModal/NewNoteModal, source selection, existing changes and theme controls.

## Data / contracts

- Schema43 remains authoritative and unchanged. On explicit refresh inspect at most100 sorted permitted action candidates for the selected current project. Strictly parse current raw Markdown and match indexed full hashes, unambiguous IDs, canonical status/history and project identity. Malformed/stale/ambiguous/unavailable candidates produce generic counts without old title/reason/path text. Excluded candidates are not read. Index omissions remain explicit; no mtime-based progress or health inferred.
- Snapshot contains only current validated records and existing bounded source dependencies. Recheck captured index revision/entries, saved settings, plugin/view/input lifecycle, project identity and all support hashes before display and before reuse. Host reads use Obsidian Vault, pre/post permission/path/byte checks, max1MiB per note. Async refresh canceled by scope/project/source/close changes cannot repopulate stale cards or selections.
- Board columns exactly Planned, In progress, Blocked, Done from schema43. Cards show title, last user-reported day, recorded timestamp and a bounded reason excerpt, status text and native labelled buttons. Empty columns remain visible. Native keyboard controls and existing theme/focus primitives; grid stacks at narrow widths. A card's Review action opens feature43 with a currently eligible target selected; no proposal is created until the user chooses state/reason/date and previews.
- Wrap up selects zero to5 visible current records, none by default. Use actual current Recorded action and latest Action event excerpts, title/status/dated report from validated records, and note hashes with transitive dependencies. Keep selected record passages ahead of optional general project context under existing16000-character budget; refuse if any selected record cannot fit, never silently claim it was included. Default project context excludes action records not selected by the user. Other project evidence remains bounded and labelled existing context.
- New session Markdown adds a separate Explicitly selected action reports section (title/status/reported date/latest reason and current source IDs). These are recorded user statements, not proof of when work happened. Source provenance includes every selected action and current supporting context. No new persisted schema or grants. Existing session format, user report and model sections remain supported. Saving/generating never changes action status, resolves a question or accepts a decision.
- Any name/report/selection edit, explicit refresh/cancel/close revokes generated result and prior NewNote previews; source/settings invalidation clears current record choices and output immediately. Save revalidates captured inputs before and after async evidence checks; own destination-folder refresh is tolerated only when captured inputs/settings/project and dependencies remain valid. Errors announce actionable refresh/selection/model guidance in live status. Native checkboxes/buttons/selects only; all note text rendered as text.

## Testing

Baseline host Verify passes268 tests/typecheck/build (`44-baseline-verify.log`). Focused pure snapshot/context and actual UI-handler tests, full Verify, and actual isolated Obsidian with real qwen3:4b-instruct inference. Preserve all35 earlier synthetic notes, previous reports and archives. Check no action writes during board or Wrap up; exercise one explicit reviewed transition separately. Inspect dark/light screenshots, native Tab focus and source navigation. No configured browser runner or dedicated scanner is invented.

## Notes for the AI

SessionModal currently validates old child previews against evidence only; bind them to selected inputs/lifecycle for this feature. Existing action records can become unavailable when historical support changes; preserve that conservative policy. Shared action snapshot is justified by the two current consumers; no general task framework. Use synthetic owned fixtures only and do not change the user's Obsidian/profile/watchers.

## Acceptance evidence

- Host `npm run verify`: 278 tests, typecheck and production build pass (`.thread-local/continuous-35-plus/evidence/44-final-verify.log`). Focused actual-handler and snapshot tests pass; no dependencies added.
- Actual Obsidian 1.14.4 with authored Board44 fixtures: six current actions across four states, excluded seventh absent, native source navigation, contextual review and one exact manually approved transition. All 35 earlier synthetic notes preserved. Dark/light screenshots and native Tab focus inspected (`lab/evidence/44-board-*.png`, `44-board-keyboard.json`). Three columns fit the tested central pane; Done wraps below without losing its controls.
- Real qwen3:4b-instruct Wrap up: no default selections, five-selection limit, only the one explicitly chosen action supplied as two current passages, separately labelled Done/date/reason/source IDs in exact session Markdown. Exact new session save preserved all 44 existing notes (`44-native-wrap-r2.json`).
- Native collisions refuse overwrite; changing the name revokes an open child preview. Changed/excluded support immediately clears board/choices and yields six generic unavailable records; restoring owned support restores availability. Cancel during a real local request produces no late output. Empty project retains all four columns. Original lab settings/theme restored, 45 notes (one new session), no pending changes/recovery/modals (`44-native-lifecycle.json`, `44-native-final.json`).
- Harness-only repairs retained: source canary assertion matched escaped Markdown, initial workspace navigation awaited host restoration, and request capture corrected from `/api/generate` to the actual `/api/chat`. Each uses one repair; no product checks weakened. All original failures remain in ignored evidence.

## Limitations

At most 100 sorted action candidates are inspected and five explicitly selected for a bounded summary. Stale historical support makes an action unavailable until reviewed; index omissions remain labelled. Dates and Done remain user reports, not verification. No drag-and-drop or automatic transitions.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10207,"specSha256":"94805e4ad7e7dae17d697e4419d944308e3e3d5d975c0de8ae97a135d424b592","branch":"refs/heads/feature/action-board-and-recorded-wrap-up","head":"f23c3e53a3ab849e934b4f93f051658c3319a932","baseRef":"refs/heads/main","baseCommit":"8d3dff24f2b6662bba7edad9b090fb4107fb67f2","sourceTree":"6fcc9b8c45c8977e4f21c2650e117002b8202720","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** f23c3e53a3ab849e934b4f93f051658c3319a932
**Base commit:** 8d3dff24f2b6662bba7edad9b090fb4107fb67f2
**Base ref:** refs/heads/main
**Spec hash:** 94805e4ad7e7dae17d697e4419d944308e3e3d5d975c0de8ae97a135d424b592
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T20:04:02.435844+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T20:06:57Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `8d3dff24f2b6662bba7edad9b090fb4107fb67f2..f23c3e53a3ab849e934b4f93f051658c3319a932` delta in a fresh isolated subagent without the builder conversation. Run all Audit lenses from scratch. Inspect native acceptance evidence named in the spec. Do not edit product code, accept findings, or reuse existing findings as the review scope.

## Commands

- `git rev-parse HEAD refs/heads/main`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain=v1 --untracked-files=all`, and `git ls-files --stage -- blueprint/context/current-feature.md`: pass; exact target/base/spec matched, the spec is tracked, and only allowed review evidence differed.
- `git diff 8d3dff24f2b6662bba7edad9b090fb4107fb67f2..HEAD` with targeted source/caller reads: pass; all 12 changed files reviewed across all four lenses.
- `npm run verify > .thread-local/continuous-35-plus/evidence/44-review-verify.log 2>&1` with host execution: pass; typecheck, 278 tests and production build; zero failed, canceled, skipped or todo tests.
- `git diff --check 8d3dff24f2b6662bba7edad9b090fb4107fb67f2..HEAD` and `git diff --check`: pass.

## Evidence

- `.thread-local/continuous-35-plus/evidence/44-review-verify.log`: independent host verification of the exact checkpoint. No dependencies installed or product/test/config/spec changes made by this review.
- Complete delta: README, tracked active spec, `src/main.ts`, contextual ActionModal selection, SessionModal and handler tests, ThreadWorkspaceView and lifecycle tests, shared action snapshot/context logic and tests, session Markdown/prompt, and scoped styles. Affected contracts checked in ThreadModal, NewNoteModal, new-note creation, LocalIndex/IndexUpdates, action-record schema43, freshness/PDF dependencies, context selection and project identity. Generated bundles, dependencies and unrelated source were excluded from the code scope.
- `.thread-local/continuous-35-plus/lab/evidence/44-native-board-r2.json`, `44-board-keyboard.json`, `44-native-wrap-r2.json`, `44-native-lifecycle.json` and `44-native-final.json` inspected alongside the actual native wrap-up/lifecycle harnesses: four states, explicit contextual transition, exclusions, chosen-only real qwen3:4b-instruct context, five-selection bound, exact session save, collision refusal, invalidation, cancellation, empty board, preserved notes and restored settings.
- `.thread-local/continuous-35-plus/lab/evidence/44-board-top-dark.png` and `44-board-light.png` visually inspected: readable themed cards/buttons, visible native keyboard focus and Done column wrapping below at the recorded pane width.
- Standards checked: strict typed contracts, canonical action validation, permitted current raw-byte reads, hash and transitive dependency checks, bounded records/context, escaped note text, explicit reviewed writes, cancel/close/input lifetime guards and meaningful tests. No focused, skipped or placeholder tests found in the changed tests.

## Findings

- None. No finding accepted, waived or closed by this review.

## Remaining risk

- Native Obsidian/local-model acceptance was inspected from the recorded synthetic-vault evidence and harnesses; this reviewer did not repeat the live host session. Check was not required, and no verification command was unavailable.
- The documented 100-candidate board, five-action selection and 16000-character context limits apply. Native evidence covers the recorded Linux/Obsidian host, not other platforms or large-vault performance.

## Try it now

1. Open **Thread: Open full workspace**, choose a permitted synthetic project with Project actions records, then select **Actions**. Inspect Planned, In progress, Blocked and Done; use **Refresh action board** after changes. **Open action** opens the note; **Review action** selects the record in the existing explicit transition form without proposing a change automatically.
2. Choose **Wrap up**, then **Refresh recorded actions**. Select up to five records (none are selected by default), optionally enter your reported progress, and click **Generate session wrap-up** with a downloaded local model selected.
3. Inspect the separate **Explicitly selected action reports**, their reported dates/states and source IDs, and the model summary. Click **Preview session note**, verify the exact destination/body, then **Save previewed note**. Existing notes are never overwritten and saving changes no action state.
4. To see stale protection safely, change or exclude support in a disposable synthetic vault: board/choices/output clear and old previews cannot save. Refresh current records instead of broadening permissions. Done and dates describe user reports, not independently verified events.
