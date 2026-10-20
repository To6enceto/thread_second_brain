# Feature: Evidence-aware Ask follow-ups

**From build-plan:** feature 40
**Build attempt:** 1
**Branch:** `feature/evidence-aware-ask-follow-ups`
**Status:** verified

## Goal

Ask a follow-up using explicitly selected current passages, with bounded earlier
conversation context and visible provenance, without granting access or saving a
conversation implicitly.

## In scope

- Continue with follow-up and Start new conversation in the existing Ask modal.
  Keep prior completed turns visible, read-only and explicitly labelled AI context.
- Each turn retains question, chosen evidence/choices, source hashes, generation
  time/model, scope/project identity and explicit corrections in memory only.
- Retrieve fresh evidence or explicitly Reuse previous evidence for short follow-up
  questions. Reuse only the prior chosen passages; never restore excluded candidates.
- Show exact earlier context sent, omissions and finite budgets. Validate all
  retained dependencies before retrieval/reuse, generation, display and save.
- Invalidate affected conversation, in-flight requests and exact previews on source,
  scope/project/settings changes, cancellation and close. Keep existing single-answer
  correction/preview/save actions and collision guards.

## Out of scope

Conversation persistence/reopening (41), collections (42), automatic query expansion,
new permissions, model installs, cloud inference, changes to source notes or schema 1
answer records. No background saves or automatic model requests.

## Build loop

Continuous authority approves the spec and routine refinements. Feature-level review,
step checkpoints disabled. One feature/branch; meaningful focused tests per step,
final Verify, actual isolated Obsidian/local inference, fresh independent review,
then Complete and separately authorized normal push. Repair maximum two attempts
per finding/check. Archive: blueprint/history/features/40-evidence-aware-ask-follow-ups.md.

## Build steps

- [x] **Step 1 - Bounded conversation context.** Add pure in-memory turn snapshots,
  context selection/prompt bounds and dependency matching. Done when tests prove
  whole-turn omission (including oversized/unsupported turns), six-turn limit,
  current-evidence-only citation validation and no excluded prior content in prompts.
- [x] **Step 2 - Ask follow-up lifecycle.** Integrate explicit continuation, fresh
  retrieval/reuse, history display and revocation with existing cancellation,
  preview and source guards. Done when actual handler tests cover two turns,
  corrections, stale/source/settings/project/scope/close/cancel races, limits,
  detached handlers and unchanged single-answer exact-save behavior.
- [x] **Step 3 - Native acceptance and documentation.** Exercise actual Obsidian with
  real local inference, reusing/retrieving evidence, changed/excluded sources,
  cancellation, finite context and keyboard/theme inspection; preserve synthetic
  originals and restore settings. Update README and evidence. Done when acceptance
  succeeds and npm run verify passes without skipped tests.
- [x] **Step 4 - Prepare independent review.** Consolidate acceptance evidence and
  the exact checkpoint candidate, and prepare a safe Try it now guide. Done when
  evidence covers the approved contract and final Verify passes. Freeze the verified
  spec/checkpoint next; a fresh passing all-lens receipt and resolved findings remain
  mandatory gates before Complete. No product edits during review.

## Files / areas

src/intelligence/conversation.ts and .test.ts; src/ui/ask-modal.ts and .test.ts;
styles.css, README.md, this spec and required Blueprint evidence. Reuse answer,
answer-record, workbench, ThreadModal, NewNoteModal and plugin freshness APIs.
No runtime dependencies or changes to existing persistence required.

## Data / contracts

- At most six completed/current turns (five earlier plus current); regeneration
  replaces the current answer. Explicit continuation snapshots the final valid
  corrections and clears the question. A new conversation clears all memory.
- Current question <=1000 characters; existing answer/evidence limits unchanged
  (six claims, 1200 characters per claim, 16000 serialized evidence characters).
- Earlier context <=4000 serialized characters. Include newest whole turns that
  fit, then send in chronological order. Never clip a statement. Omit a turn unless
  every one of its chosen passages matches a currently included passage by path,
  heading, excerpt/content hash, full note hash and PDF identity. IDs may differ.
  Report omitted turn numbers and whether size or selection caused omission.
  This prevents excluded evidence returning through history and keeps a saved
  current answer's complete dependencies represented in its existing source refs.
- Earlier context contains question, reviewed claim text/kind/user-corrected flag
  and gaps, not prior citation IDs or executable instructions. Label it untrusted
  conversational context only. The model may cite only current bundle IDs; prior
  AI never becomes a source. Total serialized prompt <=24000 characters; refuse
  oversized requests visibly rather than silently truncating. Character bounds
  are not claimed to be token counts. Ollama truncate:false remains unchanged.
- Clone finalized turns; UI cannot modify original model output or earlier turns.
  Unsupported answers may continue with question/gaps and no corrected claims.
  Invalid current correction blocks continuation as well as preview.
- Reuse previous evidence revalidates its chosen snapshot and dependencies, removes
  old query search coverage, keeps only existing choices for those passages, and
  requires explicit Generate. New retrieval may select other passages; omitted
  history remains visible only while all its sources stay permitted/current.
- Capture settings and project identity after index readiness. Compare them on
  every reuse/request and around awaits. Watch prior/current dependencies and
  project-root record changes; clear history immediately on relevant invalidation.
- Existing single-answer preview saves only the current reviewed answer, not the
  conversation. Revalidate captured history and current bundle before save while
  preserving the existing own-folder-creation invalidation guard. Manual edits,
  cancel, new conversation and close revoke earlier exact previews.
- All text uses native safe DOM helpers; labelled native controls, existing status
  live region and focus outlines retained. Empty/loading/limit/invalid/unavailable
  states give next actions. No network assets; scoped theme variables only.

## Testing

Baseline npm run verify: passed 232 tests, typecheck/build; log
.thread-local/continuous-35-plus/evidence/40-baseline-verify.log.
Pure boundary and actual-handler tests; final Verify; owned isolated actual
Obsidian/local qwen3:4b-instruct evidence, light/dark and keyboard checks.
No configured browser runner or lint. Prior archive bytes remain unchanged.

## Notes for the AI

Critique tightened excluded-history matching, own-save invalidation and project
identity handling. Context omission conservatively preserves current source-only
save provenance without introducing conversation persistence ahead of feature 41.
User selected routine conservative defaults; no unresolved product decision.

## Acceptance evidence

- npm run verify passed 239 tests, zero failures/skips/todos, strict typecheck and
  production build: evidence/40-implementation-verify.log (run directory below).
  Focused real Node run passed 9 tests: evidence/40-focused-tests-native.log.
- Actual Obsidian with local qwen3:4b-instruct completed follow-up generation and
  exact new-answer save, six real turns and visible 3990/4000-character context
  with whole-turn omissions, source/scope/exclusion revocation, cancellation,
  all-passages-excluded refusal, source navigation and close/reopen clearing.
  Reports: lab/evidence/40-native-followups-save.json, 40-native-lifecycle.json
  and 40-native-final.json. The first report captures a null post-save current
  answer because own-folder invalidation clears the view; exact saved bytes and
  later real outputs are retained and checked in the final report.
- Native screenshots 40-followups-dark.png and 40-followups-light.png inspected:
  readable history/context and reachable controls. Native Tab reaches Answer
  scope from Question with solid focus outline (40-keyboard.json).
- All 15 previous synthetic notes preserved byte for byte. Authored source restored,
  initial test settings restored. Only explicitly previewed synthetic answer added.
- The first native empty-context assertion incorrectly assumed one passage after
  saving an answer; retrieval correctly included the saved note too. Corrected the
  test to exclude every selected passage, retained its failing report, reran the
  unchanged product and all lifecycle assertions passed. Repair/check attempt 1.
- Run directory: .thread-local/continuous-35-plus/. Previous reports retained.
  No user vault, profile, desktop integration or runtime process was modified.
- Mechanical spec correction made Step 4 review preparation rather than a passing
  receipt: the independent receipt must follow the frozen verified spec. Review
  remains mandatory and cannot be self-performed or waived.

## Review repair

- [x] **Step 5 - Reused pin display (F-01).** Initialize the native evidence
  dropdown from the retained choice. Done when the real-handler regression with
  browser-like select defaults, actual Obsidian retained-pin check and Verify pass.
  Obtain fresh independent review of the entire repaired checkpoint before Complete.

F-01 repair evidence: 239 tests pass with browser-like native-select defaults and
retained-pin assertion (evidence/40-repaired-final-verify.log). Actual Obsidian
with local inference confirms pin in both dropdown and context after reuse;
17 synthetic notes unchanged and settings restored (lab/evidence/40-native-pin-repair.json).
Fresh independent review is required for this new checkpoint.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10052,"specSha256":"d406c29eb1ed54af82c3c2ce74cf1cbc4692194e145795ff2e87b39badb7b179","branch":"refs/heads/feature/evidence-aware-ask-follow-ups","head":"576173964ffa103a8c1ae7a63463d6a5c1fd2f41","baseRef":"refs/heads/main","baseCommit":"7cbb21d2ba0408462a37232d6a3a7cb9de970c76","sourceTree":"088e6e3c2bb060991527aa20ad5b584e97488c4b","landing":"local-merge","absentOptional":[]} -->

## Findings

### 40/F-01 [P2] closed - Reused pinned passages display Include in their choice controls

**File:** src/ui/ask-modal.ts:174
**Found:** 2026-10-20 by /audit (scope: current; lens: quality)
**Why it matters:** Reuse correctly restores the previous chosen passage's `pin` choice at lines 139-140, but the workbench creates every dropdown with Include as its first option and never initializes it from `prepared.choices`. After pinning a passage, generating, continuing and reusing evidence, the dropdown says Include while the context summary says one passage is pinned. The visible control therefore misrepresents the current selection intent. This does not restore excluded passages or bypass the context limit.
**Suggested fix:** Initialize each evidence dropdown with `prepared.choices[source.id] ?? "include"` after adding its options. Extend the reuse handler test to assert the displayed value for a retained pin, using select behavior that defaults to the first option.
**Resolution:** Closed by fresh independent all-lens review on 2026-10-20 against 576173964ffa103a8c1ae7a63463d6a5c1fd2f41. Re-examined src/ui/ask-modal.ts:130-181: reuse copies only the chosen sources and retained choices, and every dropdown explicitly initializes with the retained value after adding options. The actual-handler regression uses browser-like first-option defaults, asserts the displayed retained pin, excludes the other source from the next prompt, and passed in the reviewer's independent Verify run (239 tests, zero failures/skips/todos, strict typecheck and build). Inspected actual Obsidian/qwen evidence showing displayed/internal pin and one pinned passage, preserved 17 notes and restored settings. Freshly built main.js/styles.css hashes match both the installed synthetic-vault files and 40-repaired-installed-build.json. No new repair defect found. Evidence under .thread-local/continuous-35-plus/: evidence/40-independent-r2-verify.log, lab/evidence/40-native-pin-repair.json and lab/evidence/40-repaired-installed-build.json. Native scenarios were inspected, not rerun by this reviewer.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 576173964ffa103a8c1ae7a63463d6a5c1fd2f41
**Base commit:** 7cbb21d2ba0408462a37232d6a3a7cb9de970c76
**Base ref:** refs/heads/main
**Spec hash:** d406c29eb1ed54af82c3c2ce74cf1cbc4692194e145795ff2e87b39badb7b179
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T18:39:02.611839+00:00
**Workflow:** continuous
**Check required:** no

## Handoff

Review the exact full 7cbb21d2ba0408462a37232d6a3a7cb9de970c76..576173964ffa103a8c1ae7a63463d6a5c1fd2f41 feature delta in a fresh isolated subagent with all four lenses. Validate F-01 repair independently and close only if confirmed. No product, test or spec changes.

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T18:40:48Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD refs/heads/main`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1 --untracked-files=all`: pass; exact target/base/spec match, with only permitted review evidence dirty.
- `git diff --stat <base> <target>` and full target diff/file reads: pass; reviewed the complete feature delta and affected nearby contracts.
- `git diff --check <base> <target>`: pass.
- `npm run verify` with elevated loopback access: pass; strict typecheck, 239 tests, zero failures/cancellations/skips/todos, production build. Log: .thread-local/continuous-35-plus/evidence/40-independent-r2-verify.log.
- `sha256sum` of built and installed `main.js` and `styles.css`: pass; both match lab/evidence/40-repaired-installed-build.json.
- Targeted searches for skipped/focused/placeholder tests and unsafe rendering: no skipped, focused or placeholder tests in affected suites; changed UI uses native text helpers.

## Evidence

- Fresh isolated automatic reviewer context, supplied the handoff without the builder transcript; declared runtime identity codex / gpt-6.1-sol, high reasoning. Parent froze application code during this review.
- Range: 7cbb21d2ba0408462a37232d6a3a7cb9de970c76..576173964ffa103a8c1ae7a63463d6a5c1fd2f41; base ref refs/heads/main. Complete current-feature scope across all four lenses, not only the existing finding.
- Reviewed src/intelligence/conversation.ts and its tests, src/ui/ask-modal.ts and its tests, README.md, styles.css and the exact active spec. Reviewed affected nearby ThreadModal/NewNoteModal lifecycle, answer validation/prompt, answer-record correction/provenance, evidence/workbench selection and plugin dependency, identity, source invalidation, freshness, retrieval and save callers in src/main.ts.
- Checked project AGENTS.md, coding-standards.md, project-overview.md, ai-interaction.md, config and feature 40 build-plan contract. Quality: existing abstractions and bounded in-memory state; security: current-evidence-only matching, full dependency/settings/project checks, safe text rendering, revoked previews and existing local model boundary; performance: six turns, 4000-character earlier context, existing evidence bounds and 24000-character prompt refusal; tests: pure boundaries and real-handler lifecycle/race assertions with the full suite passing.
- Inspected native scripts and reports under .thread-local/continuous-35-plus/: lab/evidence/40-native-followups-save.json, 40-native-lifecycle.json, 40-native-final.json, 40-native-pin-repair.json, 40-installed-build.json and 40-repaired-installed-build.json. Real qwen3:4b-instruct results, exact current-answer save, six-turn limit, 3990/4000 context with whole-turn omissions, cancellation, source/scope/exclusion revocation, source navigation, close clearing and preservation/restoration are represented. The null post-save answer in the first report is explained by own-folder invalidation; saved bytes and later real outputs are separately checked.
- Inspected the retained failing evidence/40-native-lifecycle.log and passing evidence/40-native-lifecycle-r2.log plus the corrected script: the initial assertion excluded only one passage after a saved answer added candidates; the rerun excludes every chosen passage and checks history omission plus disabled empty-context generation. No product change or waived failure was used to obtain that pass.
- Visually inspected lab/evidence/40-followups-dark.png and 40-followups-light.png: readable history/context and native controls; inspected 40-keyboard.json showing Answer scope focus with a solid outline. Styles are unchanged by the pin repair and match the repaired installed build.
- Excluded dependencies, generated bundles/resources, caches, unrelated project paths and earlier archives from source audit; generated bundles were used only for reproducibility/install hash comparison. Findings/request files were workflow evidence, not application review scope. No product, spec, tests, configuration or Git state was changed by the reviewer.

## Findings

- F-01 [P2] closed after independently reviewing the repaired dropdown initialization, browser-like native-select regression, native pin report and matching installed build hashes.
- No new confirmed findings across quality, security, performance or tests. No open or fixed P0/P1 findings. No repair order remains.

## Remaining risk

- Native Obsidian/local inference, theme and keyboard acceptance was inspected from retained scripts, reports and screenshots; this reviewer did not execute a fresh native scenario. Verify and built/installed hash comparison were independently executed.
- No configured browser runner, lint command, security scanner or performance benchmark exists for this scope. No new tool was installed and no current vulnerability scan or large-vault performance guarantee is claimed. Required Check was not selected by the pending request.

## Try it now

Run or do:
1. In an already permitted test project, Ask a question, retrieve evidence and generate.
2. Choose Continue with follow-up. Enter a related question, then Reuse previous evidence.
3. Inspect the earlier-context details and current evidence before Generate from chosen evidence.
4. Choose Cancel when finished; no conversation is saved automatically.

Expected:
- The earlier turn stays labelled AI conversation context. Reuse does not generate until you choose Generate.
- Each answer cites current passages. Six turns and context omissions are visible.

This proves:
- Follow-up context is explicit and bounded, with separate current evidence and no automatic note writes.
