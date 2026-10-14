# Feature: Session wrap-up

**From build-plan:** feature 9
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/session-wrap-up`

## Goal

Save a reviewed session record that preserves reported progress, sourced context, unresolved questions and a suggested next step for the next Resume.

## In scope

Explicit project wrap-up generation, user-reported progress, cited local summary and exact new-note preview/save; prioritize the latest recorded session baseline for Resume.

## Out of scope

Automatic saves, inferred acceptance of decisions, time tracking and session recording outside selected allowed projects.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Session record** - Add session Markdown/provenance and latest-session evidence priority with focused tests. *Done when:* Session has stable ID/project/local date, separates user report from source context and suggestions; latest baseline remains in bounded evidence even with long decisions.
- [x] **Step 2 - Wrap-up workflow** - Add native generation, cancellation, source links and exact save preview. *Done when:* Real Obsidian/local model produces a reviewed session, saves only on explicit action and next Resume uses the new baseline; Verify and fresh independent review pass.

## Files / areas

Session logic/tests, evidence selection/tests, native wrap-up modal and plugin/sidebar wiring.

## Data / contracts

Read selected eligible project notes only; snapshots, cancellation and source hashes guard model requests, presentation and save. User report is labeled as user input; source summary describes recorded context, never asserts older work happened in this session. Explicit decisions retain existing statuses; suggested next steps cannot become accepted decisions. New session UUID/type/session/project/recorded_on plus model/source provenance is saved under the selected project Sessions folder with no overwrite. Dates are local. Resume explicitly includes the latest session user report as reported progress and omits suggested/planned work from recorded activity. The latest valid session/review baseline is selected deterministically, using modification time to break same-date ties; its evidence is prioritized so a saved session can inform the next Resume under the fixed context budget.

## Testing

Pure Markdown contract and budget/baseline tests, actual native generation/preview/save, canceled generation and conflict/no-overwrite controls, reload then Resume baseline observation. Verify and fresh independent full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Verification observed

- `npm run verify` passed: strict typecheck, 16 test files and production build. Tests cover session fields/escaping/provenance, proposed decision status, forced suggestion labels, missing schema, bounded latest-baseline priority and local calendar eligibility just after midnight. Resume tests refuse suggested work as recorded activity and retain explicit user-reported progress.
- `.thread-local/test-09.js` / `.thread-local/evidence/feature-09.json`: actual Obsidian 1.14.4 + local qwen3:4b-instruct generated and explicitly saved a session with exact preview bytes. No auto-save; collision refused without changing saved content. Plugin reload and next Resume selected the saved session as baseline and included its reported correction-toggle progress with a real source ID. Cancellation saved no note.
- Live evaluation initially showed suggested next steps in last activity. The validator now omits planned/suggested work there and includes the latest session report as explicitly user-reported progress; the final runtime receipt confirms that behavior. Date-only baseline comparison now uses local calendar days, avoiding UTC exclusion just after midnight in Europe/Sofia.

## Try it now

In an allowed test project, run **Thread: Session wrap-up**. Enter a short progress report and a new session name, then generate. Expect user input, sourced recorded context, decision statuses, questions and suggestions to remain distinct. Choose **Preview session note**, inspect the exact Markdown and **Save previewed note**. Reopen Thread and choose **Resume project**: expect the saved session as baseline and its report labeled user-reported, with suggested work kept separate.

## Limits

A progress report is user input, not independently verified achievement. Context is bounded and may omit notes. Session save creates a new note only; existing paths are refused. Decision acceptance remains an explicit decision workflow. References identify sources, not proof of semantic support.

## Independent review repair

F-01 (P1), repair attempt 1: a model claim already citing the report could suppress its deterministic label. All model activity claims citing that passage are now replaced with the actual bounded report excerpt, explicitly labeled User-reported progress; an empty report cannot support an activity claim. Focused tests cover both cases.

Repair verification: Verify passed all 16 test files/typecheck/build. `.thread-local/test-09-reported.js` / `evidence/feature-09-reported.json` first uses actual local inference and confirms the report label. A separately disclosed controlled model response then reproduces the reviewer's already-cited fact claim through the native Resume UI; the result is replaced with the exact, explicitly labeled report. The original fetch is restored in finally. Normal save/cancel/collision/reload proof remains in feature-09.json.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5922,"specSha256":"708388e061bec04da0186f47820cdf14d218b80b1a9a2921978202f838550cfb","branch":"refs/heads/feature/session-wrap-up","head":"bfbe12571155e49926f78e8f9d8e7278d9f419fe","baseRef":"refs/heads/main","baseCommit":"a794313c314b03dc18b69940fcfe4508bdc54dc7","sourceTree":"2be90345b12c836516a6f48c70851e4fffba48c6","landing":"local-merge","absentOptional":[]} -->

## Findings

### 9/F-01 [P1] closed - Model-cited progress bypasses the user-report label

**File:** src/intelligence/briefing.ts:73
**Found:** 2026-10-14 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Resume must explicitly preserve the distinction between a user report and independently established achievement. The fallback labels reported progress only when no model claim cites the report source. A valid model response with `lastActivity: [{text: "The correction toggle is completed.", kind: "fact", sourceIds: ["S1"]}]`, where S1 is the latest session's `User-reported progress`, passes unchanged and suppresses the labeled fallback. The rendered activity consequently states completion as a fact with no user-report qualification. Prompt instructions do not enforce this provenance contract, and the new regression test exercises only the fallback case.
**Suggested fix:** Deterministically retain user-report qualification for activity derived from that source, including when the model already cites it. Prefer replacing or qualifying those claims with the explicit reported-progress entry rather than depending on model wording. Add a regression for an existing unlabeled fact citing the report, alongside the current absent-report/suggestion case.
**Resolution:** Closed by fresh independent full-delta review at bfbe12571155e49926f78e8f9d8e7278d9f419fe. Reviewed src/intelligence/briefing.ts and its callers/tests: all model lastActivity claims citing the latest report passage are removed, then nonempty report text is inserted with the deterministic User-reported progress prefix; empty reports cannot support an activity claim. npm run verify passed. An independent in-memory round trip generated session Markdown, extracted evidence, and supplied the original already-cited unlabeled fact for both nonempty and empty reports; exact labeled replacement and empty omission passed. Inspected the disclosed actual-local-inference and controlled-response native receipts. The original defect is gone and no new confirmed defect was found in the repair.


Builder repair attempt 1: always remove model activity claims citing the report passage, then insert its exact bounded excerpt with the deterministic User-reported progress prefix. Empty reports cannot support model activity claims. Direct already-cited-fact and empty-report regressions added; awaiting independent confirmation.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** bfbe12571155e49926f78e8f9d8e7278d9f419fe
**Base commit:** a794313c314b03dc18b69940fcfe4508bdc54dc7
**Base ref:** main
**Spec hash:** 708388e061bec04da0186f47820cdf14d218b80b1a9a2921978202f838550cfb
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T21:26:07.583549+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T21:27:36.647335+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed strict typecheck, all 16 test files, and production build; zero failed, canceled, skipped or todo test files.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: passed checkpoint, merge-base, exact spec hash and allowed-dirty-path checks.
- `git diff a794313c314b03dc18b69940fcfe4508bdc54dc7 bfbe12571155e49926f78e8f9d8e7278d9f419fe`: reviewed complete delta, excluding review/findings evidence from product scope.
- `node --experimental-strip-types --input-type=module` in-memory reproduction: passed independently constructed session Markdown -> evidence -> already-cited model fact round trips for nonempty and empty reports; no source/test edits.
- Targeted test searches: no skipped, focused or placeholder tests found in the relevant test files.

## Evidence

- Fresh isolated reviewer received the checkpoint handoff without builder transcript. Request fields preserved exactly. HEAD and merge base match the recorded full SHAs; active spec bytes match the recorded SHA-256. The spec is tracked; no Spec snapshot field applies.
- Reviewed every changed product/test file: src/intelligence/briefing.ts and briefing.test.ts; src/main.ts; src/ui/briefing-view.ts and session-modal.ts; src/vault/evidence.ts and evidence.test.ts; src/vault/session.ts and session.test.ts. Reviewed the complete active-spec delta against project overview, coding standards, AI interaction guidelines and configured workflow policy.
- Followed affected callers and dependencies through ThreadModal, NewNoteModal, new-note creation, workspace path/frontmatter helpers, evidence freshness and allowed-path reads, source opening, Markdown escaping/provenance, and Ollama local-only/cancellation handling. No added dependency or configuration delta.
- Quality: implementation reuses existing modal, note-save, citation and validation mechanisms; no confirmed quality defect. Security: selected-project read filtering, local model guard, escaped untrusted text, snapshot/hash checks, cancellation and explicit exact-preview/no-overwrite save boundaries reviewed; no confirmed security defect. Performance: bounded evidence and claims, baseline ordering, and added UI/request work reviewed; no confirmed performance defect.
- Tests: regression assertions cover report fallback, already-cited unlabeled fact, empty report, suggestion omission, same-date baseline priority, context bounds, local-calendar eligibility, and session properties/provenance/status/schema. Independent round trips additionally checked generated note extraction and deterministic report qualification.
- Inspected .thread-local/test-09.js and .thread-local/evidence/feature-09.json: recorded native Obsidian/local-model generation, explicit save with exact bytes, no auto-save, collision refusal, reload/Resume baseline and cancellation. These are prior recorded runtime observations, not a native runtime rerun by this reviewer.
- Inspected .thread-local/test-09-reported.js and .thread-local/evidence/feature-09-reported.json: first Resume uses actual local qwen3:4b-instruct inference and records the explicit report label. Second Resume substitutes only the model response to reproduce the already-cited unlabeled fact; output is deterministically replaced with the labeled exact report. Controlled response is disclosed and original window.fetch is restored in finally.
- Excluded node_modules, generated main.js/build output, ignored caches/activity and unrelated project areas from source review. Ignored native evidence was inspected as evidence only.

## Findings

- F-01 [P1] closed: deterministic user-report qualification confirmed against repaired code and independent reproduction. No new confirmed findings across the complete current delta and all four lenses. No remaining repair order.

## Remaining risk

- Native Obsidian/local-model acceptance was inspected through supplied scripts and recorded receipts; this reviewer did not rerun the interactive host, keyboard/theme checks or source-link navigation. Check was not required by this request.
- No configured lint, dedicated security scanner or performance profiler exists; no network vulnerability scan or performance benchmark was run. Static boundary/complexity inspection is not a current dependency vulnerability scan or latency proof.
- Source citations establish identity rather than semantic truth. Model support still needs human judgment, and bounded context can omit passages; a progress report remains explicitly user input.
