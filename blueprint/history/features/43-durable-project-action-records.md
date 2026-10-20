# Feature: Durable project action records

**From build-plan:** feature 43
**Build attempt:** 1
**Branch:** feature/durable-project-action-records
**Status:** verified
**Archive:** blueprint/history/features/43-durable-project-action-records.md

## Goal

Record deliberate project actions and every human status transition in readable Markdown without autonomous changes or loss of history.

## In scope

- Versioned action records with stable ID, project, title, Planned/In progress/Blocked/Done state and dated user transition history.
- Optional current source, managed-question and decision references; preserve provenance and apply existing permissions, transitive freshness and PDF consent.
- Reachable native action form for new records and transitions, exact reviewed previews, collision/conflict/recovery/undo guarantees and explicit cancellation.
- Preserve legacy chosen-next-action notes and unrelated properties. Unsupported or manually changed records fail closed with manual-edit guidance.

## Out of scope

- Feature 44 board and Wrap up integration; schedules, drag-and-drop, autonomous status selection, bulk migration, action deletion and title editing.
- New runtime dependencies, cloud calls, user-vault changes or model calls. Human-entered suggestions require the same review as any action.

## Build loop

Continuous authorization covers specs, routine choices, feature review checkpoints, local completion and separately normal pushes. Review once per feature; step checkpoint commits disabled. Verify, actual synthetic Obsidian acceptance, fresh independent review and try guide required. Maximum two repairs per identical failure/finding; preserve evidence.

## Build steps

- [x] **Step 1: Strict action records.** Implement schema, readable serialization, property-preserving transitions and safe evidence projection. Done when focused tests prove all statuses/history, validation, no lost custom properties, malformed/oversized/ambiguous rejection and stale dependency exclusion.
- [x] **Step 2: Explicit action workflow.** Wire command/sidebar/workspace entry and native form to existing new-note and change-review engines. Done when handler tests prove current scope/identity, explicit reviews, cancellation/input/close invalidation, delayed revalidation and no automatic writes.
- [x] **Step 3: Native acceptance.** In actual isolated Obsidian create a linked action, explicitly transition across all states, exercise original/history preservation, exact preview, collision/concurrent conflict, undo and stale/excluded refusal. Done when durable results, light/dark screenshots and keyboard evidence show usable forms and preserved synthetic notes; existing engine recovery regressions also pass.
- [x] **Step 4: Verify and handoff.** Update usage, run Verify and inspect final diff, freeze verified spec and product checkpoint, then request fresh full independent review. Done when automated/native evidence passes and the exact verified packet is ready for immutable review; passing review separately gates Complete, which archives the frozen spec/receipt and pushes verified main.

- [x] **Step 5: Repair independent F-01.** Replace only the anchored managed frontmatter line, never earlier lookalike text in a custom scalar/comment. Done when regression tests preserve both custom bytes and canonical action history, full native transition/conflict/undo/recovery acceptance repeats with the lookalike property, Verify passes and a new full independent checkpoint is ready.

## Files / areas

New src/vault/action-record.ts and tests; new src/ui/action-modal.ts and tests. Integrate src/vault/freshness.ts, src/main.ts, src/ui/briefing-view.ts and src/ui/thread-workspace-view.ts. Reuse NewNoteModal, ThreadModal, current index/scope/evidence services and ChangeManager. README and Blueprint evidence only otherwise.

## Data / contracts

- Schema 1 JSON in thread_action_record with thread_action_version string "1", type "action", UUIDv4 id, project identity, title, status, created and updated. Internal states exactly planned, in-progress, blocked, done; displayed Planned, In progress, Blocked, Done. Title 1-200 trimmed characters, single line; project 1-4096. New records start planned, with explicit initial reason. Filename separately uses existing noteName; destination selected project/Actions/name.md.
- Record: schemaVersion, id, project, title, status, createdAt ISO UTC timestamp, history. Each history entry: from (null only initially), to, day YYYY-MM-DD, recordedAt canonical ISO UTC, reason (1-2000 characters), sources (existing SourceReference shape without cached excerpts). Initial to planned; later from must match previous to, to must differ. Any different state may be explicitly selected, including reopening Done. History 1-64 entries, nondecreasing recordedAt and reported days, no future day on creation/transition; dates are user reports, never independently verified events. At most 100 reference snapshots total; record JSON 256 KiB and note 1 MiB. Refuse limits without trimming old history.
- Canonical readable body shows title/status, dated full transition reasons and source links/hashes; source refs and JSON are excluded from source evidence projection. Recognized malformed action formats project no text. Valid user history projects as recorded user statements with all historical references as transitive dependencies; changed/unavailable dependencies block reuse and transitions conservatively. Empty supporting references are valid. No source text caches, grants or autonomous AI writes.
- Creation requires a permitted, unambiguous current project identity; selected supporting notes must be current in saved grants. Managed question references require recognized managed metadata; decisions retain existing status. Form choices bounded to four notes; historical refs retained even when not selected again. Duplicate IDs or incomplete identity coverage block transitions.
- Transitions reread raw record and exact hash, validate canonical body/metadata, preserve unknown frontmatter bytes and prior history. Only unambiguous single-line managed fields are replaced; ambiguous/multiline/duplicate affected properties or edited canonical bodies are refused, never normalized automatically. Exact change proposal contains original before and full after; existing source/context hashes protect apply, backup, rollback and guarded undo.
- Every async completion rechecks active plugin, closed/input epoch, saved settings, project identity and source hashes. New-note own-folder index refresh is allowed only after revalidation of captured settings/identity/dependencies; parent edits/cancel/close revoke preview. Source invalidation clears choices/outputs immediately. Errors use live status and actionable refresh/manual-edit guidance. All actions use native labelled controls, theme primitives and focus outlines.

## Testing

Baseline host npm run verify: 259 tests, typecheck/build passed (43-baseline-verify.log). Use focused record and actual-handler tests, then full Verify. Native acceptance uses existing owned isolated Obsidian/Ollama namespace and synthetic vault only; no model inference is needed for this manual state feature. Preserve prior notes/evidence, inspect keyboard and both themes. Fresh independent reviewer covers quality/security/performance/tests. No configured browser runner/lint/scanner is invented.

## Notes for the AI

Existing questions and timeline workflows establish the integration patterns; action schema is frozen here for feature 44 consumers. Inspect renderer/index offset ranges and source-reference helper before implementation. Preserve free offline runtime, original notes and exact write guards. Do not treat a saved action or Done label as independently verified work.

## Verification evidence

- Host Verify passed typecheck, all 267 tests and production build: `.thread-local/continuous-35-plus/evidence/43-verify-final.log`. Focused records 4/4 and actual-handler 4/4 passed. Existing change-engine rollback/undo/recovery tests remain passing. No dependencies changed.
- Initial record fixture incorrectly parsed body `Status:` as JSON metadata. Restricted the test parser to frontmatter and reran meaningful bounds/round-trip assertions; retained first log and `43-record-tests-r2.log`. No production check weakened.
- Actual Obsidian1.14.4 in owned isolated namespace: `lab/actions-native.js` and `lab/evidence/43-native-create-transitions.json` show exact new Planned save, three current supporting notes (source, managed question, proposed decision), explicit In progress/Blocked/Done proposals and applies, full retained history and unchanged related notes. Command and Open selected action navigation verified.
- `lab/actions-lifecycle-native-r2.js` / `lab/evidence/43-native-lifecycle-r2.json`: collision and cancellation no writes; concurrent edit preserved; exact undo restored Blocked history; explicit completion reapplied; source change blocked transitions/evidence; exclusion cleared identities immediately. Synthetic post-write interruption retained recovery intent; full plugin reload recovered the journal and explicit Recover previewed batch restored the exact prior Done record, then rejected the stale proposal. No pending/recovery remains.
- First lifecycle script inspected collapsed exact undo details using visible text; expanded the real details before the same assertion and reran the complete lifecycle. Original failure and inspection retained, no product repair needed.
- `lab/evidence/43-actions-dark.png` and `43-actions-light.png` visually inspected. Native Tab moved to Action note name with solid focus outline and32px control height (`43-keyboard.json`). Shared theme primitives work without new CSS. `43-native-final.json`:27 prior notes byte-preserved,31 final synthetic notes, original settings/theme restored, no open modals, no pending/recovery.
- No model inference needed: action creation/transitions are explicit human operations. No board/Wrap up work pulled forward. Current action record and related notes remain as synthetic fixtures. Ordinary note content is not verified truth; stale or edited action records need manual inspection, and history limits refuse growth rather than prune.
- Generated guide: `.thread-local/continuous-35-plus/try-43.md`. Fresh independent review selected by sensitive state/write scope, all four lenses; Check gate not required by configuration. Complete must validate the fresh immutable passing receipt before archival.

### Independent review repair

Initial review of a81b560 requested changes for F-01: substring replacement could alter an earlier custom scalar/comment resembling the managed status line. The replacement now uses the validated column-zero line offset. Regression coverage proves exact custom-byte preservation, updated actual status, complete prior history and successful canonical parsing for LF/CRLF. Retained `43-review-first.md`, `43-f01-tests.log` (5/5). A new regression variable needed an explicit Record type; initial typecheck log retained, then `43-f01-verify-r2.log` passes268 tests/typecheck/build.

Fresh native fixture preserves all31 prior notes: `lab/actions-native-f01.js`, `lab/evidence/43-f01-native-transitions.json`, `43-f01-native-lifecycle.json`, `43-f01-native-final.json`. Custom single-quoted value and comment both remain byte-identical through all four states, collision/cancel/conflict, undo and full plugin-reloaded interruption recovery. Related notes unchanged;35 final notes; settings restored; no pending/recovery/modal. Original screenshots/keyboard remain representative because repair changes no DOM/CSS. Updated installed hashes: `evidence/43-f01-installed-build.json`. F-01 marked fixed, pending fresh full independent review; no finding accepted or waived.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11827,"specSha256":"e9f017e2964235c01e7323b15e7cac4bfd6d391eaa9eedfe827f5365df5f5036","branch":"refs/heads/feature/durable-project-action-records","head":"37cc46723a443bbc3200df3a4259cdd898a82c13","baseRef":"refs/heads/main","baseCommit":"af3c02fe3c8d5b234cbfab7accb7321daab90630","sourceTree":"7be443d276030ca360f4f21d98f3047936d2a02c","landing":"local-merge","absentOptional":[]} -->

## Findings

### 43/F-01 [P1] closed - Transition replaces a lookalike substring in unrelated frontmatter

**File:** src/vault/action-record.ts:87
**Found:** 2026-10-20 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `scalar()` validates the managed property's full line, but `header.replace(line, ...)` replaces the first occurrence of that text anywhere in the header. A valid action with an earlier `custom: 'status: "planned"'` property, or `# example status: "planned"` comment, passes `readAction()`. Transitioning it to Done changes that unrelated property/comment, leaves the actual `status` property Planned, and updates the retained JSON/body to Done. `transitionAction()` returns this content for the normal exact-review/apply path; `readAction()` subsequently rejects it because properties and history disagree. This violates the explicit unknown-property/comment preservation contract and makes the saved action unavailable for later transitions and evidence reuse. The existing preservation test uses unrelated values without managed-line lookalikes, so all 267 tests pass despite this reachable defect.
**Suggested fix:** Replace the exact validated line at its recorded offset or line index, preserving every other header byte and its line ending. Add regressions with earlier single-quoted custom values and comments containing the managed status line; require unchanged unrelated bytes, updated real status, retained prior history, and successful `readAction()` of the result. Revalidate the repaired checkpoint through the normal workflow.
**Resolution:** Confirmed by independent read-only Node reproduction for both a custom YAML scalar and a comment. Both initially parsed as Planned; both transitions changed the earlier unrelated text, kept actual metadata Planned, set JSON history to Done, and produced the expected `Action properties disagree with its retained history` rejection. No repair or finding acceptance performed.

Builder repair: replaced only the anchored validated managed line by offset, preserving all other header bytes. New LF/CRLF regressions cover custom single-quoted values and comments. Host Verify passes268 tests; native fresh Actions43Reviewed fixture repeats all transitions/conflict/undo/exclusion/reloaded recovery with custom bytes preserved. Awaiting independent re-review for closure.

Independent re-review 2026-10-20 (codex / gpt-6.1-sol, fresh isolated subagent): closed F-01 after reviewing the complete af3c02f..37cc467 feature delta across quality, security, performance and tests. The validated column-zero managed line is replaced at its anchored offset; earlier custom scalar/comment lookalikes remain untouched. LF/CRLF regressions verify exact unrelated bytes, actual status, prior history and successful readAction parsing. Independent host npm run verify passed typecheck, all 268 tests (zero skipped/todo) and production build; log: .thread-local/continuous-35-plus/evidence/43-independent-r2-verify.log. Inspected native repair scripts, all three 43-f01-native JSON records, original light/dark/keyboard evidence and final installed-build hashes; the rebuilt main.js/styles.css match those installed hashes. No new defect found in the repair or complete feature delta. No new findings, repairs or acceptances.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 37cc46723a443bbc3200df3a4259cdd898a82c13
**Base commit:** af3c02fe3c8d5b234cbfab7accb7321daab90630
**Base ref:** refs/heads/main
**Spec hash:** e9f017e2964235c01e7323b15e7cac4bfd6d391eaa9eedfe827f5365df5f5036
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T19:43:48.173260+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T19:46:41.155329+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify > .thread-local/continuous-35-plus/evidence/43-independent-r2-verify.log 2>&1` (host, require_escalated): passed; typecheck, 268 tests, production build; zero failed, skipped or todo tests.
- `git diff --check`: passed.
- `git rev-parse HEAD refs/heads/main`, `git merge-base refs/heads/main 37cc46723a443bbc3200df3a4259cdd898a82c13`, `sha256sum blueprint/context/current-feature.md`, and `git status --short --untracked-files=all`: passed freshness checks; only permitted ledger/receipt changes.
- `sha256sum main.js styles.css`: passed; rebuilt artifacts equal the built/installed hashes in `.thread-local/continuous-35-plus/evidence/43-f01-installed-build.json`.

## Evidence

- Entire `af3c02fe3c8d5b234cbfab7accb7321daab90630..37cc46723a443bbc3200df3a4259cdd898a82c13` delta reviewed fresh: README, verified active spec, `src/main.ts`, action modal and handler tests, briefing/workspace entry points, action record and logic tests, and freshness dispatch. Findings and review records excluded as product code. Followed affected callers through ThreadModal/NewNoteModal, project identity/index membership, evidence construction/provenance, scope, change context and existing write guards. Generated output, dependencies, unrelated features and personal vault/profile excluded.
- Checked AGENTS.md, config, project overview, coding standards, AI interaction guidelines, build-plan feature 43 and frozen spec. All four lenses covered full delta: strict schema/history/size bounds, exact custom-property preservation, explicit write/review and cancellation guards, current scope/identity/transitive/PDF dependencies, bounded records/choices and meaningful logic/handler coverage. No focused, skipped or placeholder tests identified in changed tests; full suite reports zero skips/todo.
- F-01 independently closed: anchored exact managed-line replacement preserves earlier quoted custom scalars/comments; LF/CRLF regressions assert actual status, successful canonical parsing and unchanged prior history. New full review found no additional findings.
- Inspected `.thread-local/continuous-35-plus/lab/actions-native.js`, `actions-lifecycle-native.js`, `actions-lifecycle-native-r2.js`, and `actions-native-f01.js`; original and repaired `43-native-create-transitions.json`, `43-native-lifecycle-r2.json`, `43-native-final.json`, and `43-f01-native-{transitions,lifecycle,final}.json`. Exact create/transition previews, all four states, collision/cancel/conflict refusal, guarded undo, stale/excluded support, reloaded interruption recovery, unchanged related notes and all 31 prior notes, restored settings and no residual modal/pending/recovery are supported by their assertions/results.
- Inspected original record-test parse failure and corrected frontmatter parser, native undo assertion failure and revised script that opens exact-content details, and regression typecheck failure followed by passing repaired Verify; retained failure evidence was not discarded or bypassed.
- Visually inspected `lab/evidence/43-actions-dark.png` and `43-actions-light.png`; inspected `43-keyboard.json` (Action note name, solid outline, 32px height). Repair changes no UI. Current rebuilt main.js SHA-256 is `817f1e4e74e4963280ac900811eeb28c28fabf73abae9d6a179636cb6529743a`; styles.css is `18e8257c0c232805d4c98ad49df42194e1e87095142c3ad110394b48e633816a`; both equal declared installed hashes.
- Fresh generic Codex reviewer context received the project-local handoff without builder transcript. Requested and actual identity: codex / gpt-6.1-sol; automatic execution, fresh subagent. Tracked spec requires no local snapshot.

## Findings

- F-01 [P1]: closed after independent re-review. No new findings; no open or fixed P0/P1 findings. No repair order required.

## Remaining risk

- Native acceptance was inspected from retained synthetic Obsidian scripts, results and images; this reviewer did not rerun or mutate a vault/profile. Check is not required by this request.
- No lint, dependency security scanner or performance profiling gate is configured. Security/performance conclusions are based on code and existing runtime evidence, not a current vulnerability scan or load profile. No required verification command was unavailable.

## Try it now

1. In a synthetic vault, select a permitted project and run **Thread: Project actions** from the command palette (also in All tools / Routine and the full workspace Actions area).
2. Choose **Create Planned action**. Enter a new note name, title, your reason and a reported date no later than today. Optionally add current source/question/decision notes, then click **Preview action**. Review the full destination/content before **Save previewed note**. An existing destination is refused.
3. Open Project actions again, choose **Record a state transition**, select the action, choose a different state and enter your reason/date. Click **Preview action**; in Changes inspect full before/after and click **Apply previewed changes**. Reopen the note to see dated history. No AI/status change occurs without this review.
4. In Changes, use **Preview undo** and inspect exact contents before **Undo previewed batch**. Later edits must be preserved, so undo can be refused. If support changes or is excluded, refresh: the action is unavailable for transition/evidence until inspected; do not broaden grants to bypass it.

Done and dates are user reports. Legacy chosen-next-action notes stay unchanged. Use only disposable notes for conflict/recovery experiments.
