# Feature: Project home and quick switching

**From build-plan:** feature 15
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/project-home-and-quick-switching`

## Goal

Make Thread a useful project home with direct switching among already permitted projects and current sessions, decisions, questions and pending review entry points.

## In scope

Scoped project discovery, deterministic bounded home snapshot, native project selector, grouped actions, refresh and guarded note opening; no-model native acceptance.

## Out of scope

New scope grants, project creation changes, automatic AI generation, global dashboards or the later dependency review queue.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Scoped project home data** - Discover projects from eligible indexed project/Overview notes and derive bounded sessions, decisions, recognized questions and safe proposal counts. *Done when:* Pure tests cover project membership, exclusions, stale outputs, legacy selection, ordering, empty states and hidden pending work; Verify passes.
- [x] **Step 2 - Native home and switcher** - Add direct project selection, current home cards with source links and grouped secondary actions while preserving Resume. *Done when:* Selection persists without expanding grants, clears old work, loads the selected home without inference and rejects stale source openings.
- [x] **Step 3 - Observed project switching** - Use multiple synthetic projects to demonstrate home cards, model-free switching, persistence and immediate exclusion. *Done when:* Native UI/keyboard acceptance, Verify and fresh independent review pass.

## Files / areas

src/vault/project-home.ts and tests, BriefingView and scoped styles/docs.

## Data / contracts

Project options come only from current eligible scoped index records, with a permitted selected legacy folder fallback. Switching changes selectedProject only and never allowed/excluded paths or role mappings. Home is a bounded current snapshot, not historical truth. Session dates are explicitly recorded or labeled modification dates. Decision status stays explicit. Questions are recognized recorded headings, not inferred resolved/accepted state. Pending counts require matching project context and all relevant paths still readable; excluded cached content is never rendered. Source opening uses current raw hashes and scope/lifecycle guards. Refresh uses current index and requests no inference.

## Testing

npm run verify per step; pure discovery/snapshot/scope/proposal tests; actual synthetic Obsidian project selector and home interactions including keyboard, no model calls, plugin reload selection persistence, native source opening, changed-source refusal and exclusion; fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed acceptance

- Verify passed 22 test files, typecheck and production build. Pure checks include bounded home results, project membership, exclusions, malformed/stale output, same-date ordering, no readable projects and hidden proposal source context.
- `.thread-local/evidence/feature-15-native.json`: five native synthetic scenarios passed: home records/source opening, project switching with no grant changes, persisted selection across actual plugin reload, excluded project removal and source-change invalidation. Pending proposals appeared only in their project; test proposal was rejected without creating a note. Model-call interception recorded zero calls.
- `.thread-local/evidence/feature-15-keyboard.json`: real CDP Enter opened the native More actions summary, and the project selector has its accessible label.
- `.thread-local/evidence/feature-15-home.png` and `feature-15-home-light.png`: actual native layouts inspected in dark and light themes.

## Try it now

With two explicitly readable project folders containing project notes, open Thread and select the other project from Project. The home changes immediately without inference or additional read grants. Open a listed session, then use More actions for the other tools.

## Remaining limits

Home lists at most five sessions, six decisions and six question passages. It is a current eligible-index snapshot; Refresh home reloads it after invalidation. Legacy projects without recognizable metadata or an Overview need explicit selection in Settings. Pending counts cover the current single proposal; the later project review queue is separate. Questions are quoted, never automatically resolved.

## Independent review repair

F-01 was confirmed and repaired on attempt 1: every invalidation releases the superseded home-loading state, including Resume preserving an existing snapshot. A committed actual-class test executes the view with a deferred index rebuild and a rendering stub; it verifies recorded Resume completes and controls remain released before and after the obsolete loader settles. `.thread-local/evidence/feature-15-repair-verify.log` passes all 23 test files, typecheck and build. `feature-15-native-race.json` demonstrates the same overlap in actual Obsidian with Project and Refresh home enabled. `feature-15-native-repaired.json` repeats all five home scenarios with zero model calls. Fresh independent confirmation is required before completion.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5690,"specSha256":"bb549c47241102fd3088fb5ea17901a0b92c60a7f34ffa16a936fcae9db62872","branch":"refs/heads/feature/project-home-and-quick-switching","head":"c34df46abf0e4ce92e980cce998287a5cd1243e1","baseRef":"refs/heads/main","baseCommit":"458a4e939196e44d3df389bef4c7baddb9b31004","sourceTree":"5768867feab7893a1d0bc4397d29b894beb05f6a","landing":"local-merge","absentOptional":[]} -->

## Findings

### 15/F-01 [P1] closed - Resume during home loading leaves project controls disabled

**File:** src/ui/briefing-view.ts:47
**Found:** 2026-10-15 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `loadHome()` sets `homeLoading = true` while awaiting an index rebuild (lines 115-118). Resume remains enabled during that wait (line 63). Clicking Resume calls `invalidate(..., true)` (line 206), which increments the shared revision but preserves `homeLoading`. The superseded home request then skips its revision-guarded cleanup (line 125), and Resume never clears that flag. Project selection and Refresh home both remain disabled (lines 59 and 68), preventing normal switching or refresh until another external invalidation or view reopening. This is reachable on a cold index, including with no project selected. An in-memory execution of the actual BriefingView with a deferred rebuild, native async methods and a render stub confirmed that `homeLoading` remains true after both calls settle.
**Suggested fix:** Clear the superseded home-loading state when Resume invalidates the home request, while retaining any completed snapshot, or prevent Resume from superseding an active home load. Add focused coverage for Resume during a deferred home rebuild, including an empty selection, and verify that Project and Refresh home recover.
**Resolution:** Closed by fresh independent full-delta review at c34df46abf0e4ce92e980cce998287a5cd1243e1. `invalidate()` now unconditionally clears `homeLoading` before the Resume path can return, including an empty selection. The actual-class deferred-rebuild regression passed in the reviewer-run Verify: Resume completed recorded context, the loading flag remained false before and after the obsolete loader settled, and the controller was released. Revision guards prevent the superseded loader from installing stale home state. Inspected native race evidence corroborates the released state. No new defect was found in the repair; native interactions were inspected from existing evidence, not rerun.

**Repair attempt 1:** Every invalidation now releases homeLoading, including the Resume path that preserves an existing snapshot. Actual-class deferred-rebuild regression and native race acceptance will verify the handoff; independently confirmed and closed in this review.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** c34df46abf0e4ce92e980cce998287a5cd1243e1
**Base commit:** 458a4e939196e44d3df389bef4c7baddb9b31004
**Base ref:** main
**Spec hash:** bb549c47241102fd3088fb5ea17901a0b92c60a7f34ffa16a936fcae9db62872
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-15T11:05:41.428880+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-15T11:06:53Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all 23 test files, production build; zero failures, skipped tests or todos.
- `git diff --check 458a4e939196e44d3df389bef4c7baddb9b31004 HEAD`: pass.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --short`: pass; exact target/base/spec binding and only permitted review-state changes.

## Evidence

- Reviewed the complete base-to-target delta, excluding review/findings from product scope: README.md, current-feature spec, src/ui/briefing-view.ts and its test, src/vault/project-home.ts and its test, styles.css. Followed main.ts lifecycle/settings/index/source-opening callers and index.ts, freshness.ts, scope.ts, source-link.ts, changes.ts contracts.
- Quality: checked native controls, grouped actions, state cancellation, project persistence, bounded snapshots and documented limits against the active spec and coding standards. F-01 repair independently confirmed; no new finding.
- Security: checked eligible project discovery, current read scope/exclusions, freshness filtering, safe text rendering, proposal context/path visibility and hash/lifecycle guards before source reads/opening. No new finding.
- Performance: inspected bounded rendered lists, index/graph reuse contracts, concurrent home/Resume behavior and cancellation. No new confirmed defect within the established personal-vault scale.
- Tests: inspected discovery, project membership, exclusions, stale/malformed outputs, ordering, bounds, hidden proposal context and actual-class deferred-rebuild regression. Existing Verify passed all 23 files; no focused, skipped or placeholder tests found in the changed tests.
- Inspected .thread-local/evidence/feature-15-native.json and feature-15-native-repaired.json: five native scenarios recorded as passed, including source opening, switching without grant expansion, reload persistence, exclusion and changed-source invalidation; zero model calls.
- Inspected .thread-local/evidence/feature-15-native-race.json: Resume completed before the deferred home loader, homeLoading false. Corroborated with the actual-class regression executed in this reviewer session.
- Inspected .thread-local/evidence/feature-15-keyboard.json: native Enter opened More actions and selector label recorded. Visually inspected feature-15-home.png and feature-15-home-light.png: readable native home layouts in dark/light themes.
- Inspected .thread-local/evidence/feature-15-repair-verify.log: 23 passing test files, typecheck and build.
- Excluded dependencies, generated main.js/build outputs, unrelated source and historical workflow files. No product/spec/test/config files were edited by the reviewer.

## Findings

- F-01 [P1] closed: every invalidation releases homeLoading; Resume and the obsolete loader cannot leave Project/Refresh home locked. Independently confirmed by repaired source, passing actual-class regression and inspected native race evidence.
- No new findings across quality, security, performance or tests.

## Remaining risk

- Native Obsidian interactions and screenshots were inspected from the recorded synthetic acceptance evidence; they were not rerun by this reviewer. The committed regression stubs host rendering while executing the actual view class.
- No dedicated security scanner or performance benchmark is declared for this scope; security/performance conclusions are source review at the established personal-vault scale, without a vulnerability-scan or profiling claim.
