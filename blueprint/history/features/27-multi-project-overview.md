# Feature: Multi-project overview

**From build-plan:** feature 27
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/multi-project-overview`

## Goal

See recorded context across already permitted projects, choose an explicit next action and switch projects without widening read access or inventing priority scores.

## In scope

Model-free on-demand bounded project cards; active/paused/archived/unknown filtering; recorded activity date basis, open-question candidates, review dispositions/due-date counts and visible proposal counts; guarded source navigation and switching; exact new next-action record previews with preserved prior selections.

## Out of scope

Automatic ranking, inferred activity/health, task execution, scheduling, status changes, grants, bulk migration and automatic selection from model suggestions.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Overview and next-action contracts** - Add bounded permitted-project aggregation and readable versioned chosen-action records. *Done when:* Tests cover filtering/status ambiguity, recorded dates versus mtime, stale/excluded notes, acknowledged/snoozed review counts, proposal scope, current action chronology/schema, deterministic limits and cancellation; Verify passes.
- [x] **Step 2 - Native overview and explicit selection** - Add native command and home entry, filtering/refresh/cancel, safe switching/source actions and exact new-note next-action forms. *Done when:* Handlers guard changed inputs/settings/identity/source and destinations; no overwrite or automatic inference; Verify passes.
- [x] **Step 3 - Native acceptance and documentation** - Exercise multi-project lifecycle and privacy in actual synthetic Obsidian, themes/keyboard and document limits. *Done when:* Native evidence demonstrates filters, activity/questions/reviews/proposals, switching unchanged grants, chosen-action preservation/races and no AI; Verify and fresh independent full review pass.

## Files / areas

src/vault/project-overview.ts/tests; src/ui/project-overview-modal.ts/tests; src/vault/index.ts; src/main.ts; src/ui/briefing-view.ts; styles.css; README.md.

## Data / contracts

Discover only currently permitted usable project records using existing project discovery. Sort folders alphabetically, filter exact active/paused/archived or unknown status, examine at most 20 matching projects per refresh. Status is unknown for missing/conflicting root project metadata. No status mutation. Each card counts existing indexed project records; projects exceeding 2000 records expose unavailable detail counts rather than claim full coverage. Activity is the latest recognized session/review/milestone/decision record date with its exact date basis, never modification time. Open questions are recorded candidate lines, not inferred unresolved tasks; due reviews are unhandled revisit-date candidates after existing hash-bound dispositions, up to 200 candidates/category. Other review categories remain visible by count. Proposal counts reveal no drafts and require current read permission for every operation/source path. Coverage and bounds stay visible; stale/excluded excerpts never appear. Next action is explicitly user-authored text (1-1000 characters) in a NEW readable Markdown type next-action, thread_next_action_version "1", UUID id, project identity, selected_at exact UTC ISO capture timestamp, recorded_on/created local capture day and Chosen next action heading. All prior selections remain unchanged; the most recent valid selected_at among current permitted records with matching project identity determines the displayed choice, with ties, duplicate IDs or unsupported formats labeled indeterminate rather than selecting by mtime. This is a user choice, not completed work or an accepted decision. No automatic copied evidence or provenance. Save only after exact new-note preview, unchanged inputs/settings/root project identity/raw header hashes and write policy; protected sources get manual guidance. Switching rechecks current permitted discovery and preserves allowed/excluded paths. UI invalidates immediately on source/settings changes, clears derived cards and guards detached source/switch/save actions. No model needed.

## Testing

npm run verify per small step; pure aggregate/schema/status/date/disposition/proposal/coverage tests plus actual bundled modal handler tests. Native marked synthetic projects cover active/paused/archived/unknown/ambiguous IDs, excluded and stale records, due acknowledgement/snooze, a pending proposal, native source links and switching, exact selection/collision/concurrent identity/input/settings refusal, zero inference/excluded reads, both themes and keyboard.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

- `npm run verify`: typecheck, 43 test files and production build passed in `.thread-local/continuous-22-34/feature-27-final-verify-r2.log`. Step 2 needed one repair for unsupported constructor parameter properties; `feature-27-repairs.json` and passing repair log retain that history. No check was weakened.
- Actual Obsidian 1.14.4 final native run: `.thread-local/continuous-22-34/evidence/feature-27-native-r2.json` has 12 passing cases: recorded dates/questions/due counts/stale exclusion/native links; all status filters and switching with unchanged grants; project-associated proposal counts without draft text; hash-bound review acknowledgement and changed-source resurfacing; exact chosen-action saves across owned-folder invalidation with preserved prior choices; mismatched project selection refusal; edited inputs and collision preservation; concurrent project identity edits; immediate exclusion/detached switch and zero excluded reads; duplicate project IDs; protected-source manual guidance; home entry/original note preservation. Earlier native proofs are preserved.
- Current installed main.js/manifest/styles hashes: `.thread-local/continuous-22-34/evidence/feature-27-installed-r2.json`.
- `.thread-local/continuous-22-34/evidence/feature-27-visual-r2.json` and four `feature-27-r2-{overview,selection}-{light,dark}.png` captures prove the native surfaces; visually inspected readable labels, scrolling, wrapping and no horizontal overflow. `feature-27-r2-keyboard.json` proves native Tab to action text, Enter to exact preview, Enter cancellation and restored settings/theme. Earlier captures remain preserved.
- All acceptance used authored synthetic projects in the marked isolated test vault, an unavailable loopback endpoint, zero inference attempts and zero excluded reads. No personal notes or paid service involved. Fresh independent full-delta review is the next gate and its receipt is archived on completion.

## Try it now

With Thread enabled in a separate test vault, explicitly permit two project folders with `type: project` overview notes and active/paused statuses. Run `Thread: All permitted projects`, change the status filter, and open a project; expect alphabetical folders, recorded-context counts and unchanged allowed/excluded paths. Choose `Choose next action`, enter your own choice, inspect the exact new note and explicitly save it. Refresh the overview to see the latest permitted project selection. Save another choice under a different name and confirm the old note remains unchanged. No Ollama model is required; duplicate identities, stale previews and existing destinations refuse action saves.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7861,"specSha256":"b304162cfd804c502ff7ce6bc861a6bcf3de4c3e0fa88736002557a396b55219","branch":"refs/heads/feature/multi-project-overview","head":"5558ed1b4bc4c4446455a1a188bd66b9048bb683","baseRef":"refs/heads/main","baseCommit":"5728b9bba1a88ae1a5f1c286fa6526bfc9fbc994","sourceTree":"0fc5e76ddcc7e73ee84b9ec31530e980ea4b3233","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 5558ed1b4bc4c4446455a1a188bd66b9048bb683
**Base commit:** 5728b9bba1a88ae1a5f1c286fa6526bfc9fbc994
**Base ref:** main
**Spec hash:** b304162cfd804c502ff7ce6bc861a6bcf3de4c3e0fa88736002557a396b55219
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T15:44:48.120701+00:00
**Workflow:** continuous
**Check required:** no

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T15:46:37Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; strict typecheck, all 43 discovered test files (zero skipped/canceled/todo), production build.
- `git diff --check main...HEAD` and `git diff --check`: pass.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, and `sha256sum blueprint/context/current-feature.md`: pass; exact requested checkpoint, base and spec hash, with only the permitted review evidence path dirty before receipt writing.
- `sha256sum main.js manifest.json styles.css`: pass; all three freshly built artifacts match `feature-27-installed-r2.json` exactly.
- Focused searches for skipped/focused/placeholder tests in both added test files: none found.

## Evidence

- Complete `5728b9bba1a88ae1a5f1c286fa6526bfc9fbc994..5558ed1b4bc4c4446455a1a188bd66b9048bb683` delta reviewed from scratch through quality, security, performance and tests. Reviewed both new overview implementation/test pairs, index metadata additions, main command/modal registration, home entry, scoped CSS, README and spec changes. Request/findings excluded from product code scope.
- Applied AGENTS.md, coding standards, AI interaction guidance, project overview, approved plans, active verified spec, config and installed Audit/independent-review contract. Followed nearby discovery/membership, freshness graphs, timeline, queue/disposition snapshots, scope/path validation, modal invalidation, source navigation and new-note write/collision guards. No new dependencies, inference, permission expansion or raw HTML rendering introduced. The explicit project/record/category/excerpt limits and cancellation paths were examined.
- Inspected `.thread-local/continuous-22-34/evidence/feature-27-native-r2.json` and its actual synthetic Obsidian test driver: 12 passing cases cover recorded dates/counts/navigation, filters/switching, proposal privacy, hash-bound dispositions, preserved exact selections, malformed project association, input/collision/identity races, exclusion/detached actions, duplicate identities, protected-source guidance and home/original preservation; zero inference attempts and excluded reads recorded.
- Inspected `feature-27-visual-r2.json`, `feature-27-r2-keyboard.json` and the native CDP driver. Visually inspected all four `feature-27-r2-{overview,selection}-{light,dark}.png` images: readable labels, wrapping/scrolling and visible focus; native Tab/action entry, Enter/exact preview, Enter/cancel and settings/theme restoration recorded. This review inspected existing native evidence; it did not rerun Check, which the request does not require.
- Fresh bundle hash `c06bbcc8e2e163fb04963aa17322d75586b753760c9914743a81868bf95dad3a`; manifest hash `f12eebd3f7348ba65464fcf47a414688aa93bea15fb543e71c7f6567c07b256d`; styles hash `52daa1b466d310c3bea5984801edbbb647b9a8d722d9313f45bf50fa17c023ef`. All match the final installed-bundle evidence referenced by the exact spec.
- Excluded dependencies, unrelated source, generated build output from source-quality scope, and earlier superseded acceptance runs. Final generated artifacts were compared only as acceptance/bundle evidence. Findings ledger unchanged; no findings added, updated or closed. No repair order needed.

## Findings

- None.

## Remaining risk

- Runtime evidence is the recorded final synthetic Linux Obsidian 1.14.4 run, not a new reviewer-driven host session. Other platforms and large-vault performance are not established; bounded indexed coverage remains explicitly documented. No unavailable required verification command or blocking risk identified.
