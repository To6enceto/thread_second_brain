# Feature: Editor selection actions

**From build-plan:** feature 22
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/editor-selection-actions`

## Goal

Use permitted saved editor selections directly as evidence for Ask, related-note discovery and explicitly reviewed question/proposed-decision drafts, without modifying the selected source or expanding grants.

## In scope

Four native editor commands and one selection-action dialog; bounded exact selection snapshots/current eligibility; selection-only local Ask and source-safe related search; manual question/proposed-decision drafts with new-note previews; focused tests, native acceptance and required review.

## Out of scope

Managed question lifecycle (24), evidence workbench (23), inline source replacement, automatic inference/save/acceptance, context menus, new dependencies/models/services or read grants.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Selection contract and commands** - Capture only nonempty saved permitted selections up to 4000 UTF-16 characters, verify offsets/full source hash/current eligible projection, and register four native editor commands. *Done when:* Pure and actual command-path tests reject empty/oversized/dirty/out-of-scope/stale selections, preserve Unicode/CRLF, exclude unselected model text; Verify passes.
- [x] **Step 2 - Explicit selection workflows** - Render source/selection and separate explicit Ask/related/question/decision controls; use guarded current bundles, native text rendering and exact new-note previews with proposed decisions only. *Done when:* Tests prove selected-only context, plain-token related query, protected draft metadata and explicit saves; cancellations/settings/source changes clear cached selection and invalidate old actions; Verify passes.
- [x] **Step 3 - Native acceptance and documentation** - Exercise all four editor commands and failure paths in actual synthetic Obsidian, including real local inference, safe previews/save and source preservation; document shortcuts and Try it now. *Done when:* Actual commands, local Ask, related sources, manual drafts, dirty/empty/size/scope/rename/exclusion races, cancellation, keyboard/themes and no-write-before-approval checks have evidence; Verify and fresh full independent review pass.

- [x] **Step 4 - Reviewed selection-range repair** - Address F-01/F-02 with exact retained raw-source ranges and editor-to-saved CRLF offsets. *Done when:* duplicate excluded occurrences and valid CRLF selections pass unit/native regressions, all affected native flows and Verify pass, and fresh full independent review closes findings.

## Files / areas

src/vault/selection.ts/tests; src/ui/selection-modal.ts; src/main.ts command wiring; native selection acceptance fixtures and README.

## Data / contracts

Editor commands use existing explicit read grants and exclusions before touching selection text or reading vault files. A saved source and editor text must match, allowing only native editor CRLF-to-LF normalization with exact offset mapping, offsets must identify the exact nonempty <=4000-character selection, and current index/graph/projection must permit reuse. Only selected text plus bounded identity/status/date metadata becomes Ask evidence; never inject unrelated note properties or earlier derived synthesis. Commands open drafts without inference or writes. Related discovery explicitly searches all currently allowed paths using normalized plain tokens, then verifies source hashes before rendering/opening. Question drafts use existing legacy type: questions/Open questions notes; feature 24 owns managed lifecycle. Manual decision drafts use existing decisionMarkdown with status proposed and user-entered choice/reasoning, never automatic acceptance. Every save uses NewNoteModal collision/currentness guards and shows destination/contents. Externally invalidated selection dialogs clear source fields/results and refuse old actions. Existing authoritative manual notes remain unchanged; no persistence until exact approval.

## Testing

npm run verify per step; pure selection/draft/query tests and actual native editor command tests. Synthetic native vault only, real qwen3:4b-instruct Ask with selected-only captured request, related search, explicit question/decision saves and unchanged source hashes. Empty/too-long/dirty/excluded/stale/renamed sources and settings/held-model cancellation; keyboard/light/dark. Required fresh independent review of complete feature before merge/push.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

All acceptance used the isolated synthetic vault marked thread-quality-v1. No personal vault was read. Evidence is under `.thread-local/continuous-22-34/evidence/`.

- `feature-22-native.json`: eight passing actual Obsidian cases for all four registered native editor commands, real selected-only qwen3:4b-instruct Ask/explicit answer save, related keyword search/current source navigation without inference, question preview/save/collision refusal, manually entered proposed decision preserving an accepted record, empty/size/dirty/excluded guards (zero excluded command reads), rename-during-read refusal, held-inference input-edit retry/exclusion redaction, and unchanged selected source/durable change history. Three chat attempts comprise one real inference and two controlled held requests. Request checks confirm selected text included and unselected body/property canaries absent.
- `feature-22-extra.json`: four passing current-build native cases: stale generated output/old model-observation selection refusal; literal selected HTML displayed as text; supporting-source change clears an exact preview and refuses save; supporting edit immediately cancels a held request, clears selection/path DOM and refuses detached old navigation. The one chat attempt is controlled, no real inference.
- `feature-22-keyboard.json`: actual native Enter activates Cancel. `feature-22-light.png` and `feature-22-dark.png` were visually inspected: readable native controls, source card, selected passage, manual input and explicit preview in both themes.
- `feature-22-installed.json`: final verified bundle hash matches the isolated installed main.js. Broad eight-case acceptance preceded only the final explanatory-copy refinement; the extra guard/keyboard/theme cases use that final build. No retrieval/model/write logic changed after broad acceptance.
- Verify passes all 33 test files, typecheck and production build: `.thread-local/continuous-22-34/feature-22-final-verify.log`. Pure tests cover permission-before-editor-access, ranges/limits/dirty/Unicode/CRLF/projection, unselected properties, query syntax and manual draft semantics. Actual-handler tests cover edit cancellation/retry, cleared source DOM, changed-input preview refusal, own-folder creation and the native Modal lifecycle behavior. Final review preparation reruns Verify.

Two distinct native defects were found and repaired before independent review, one repair attempt each: first-save destination-folder creation invalidated the parent display even though captured evidence remained valid; preview validation now independently checks captured input revision/settings/source hashes. Obsidian also overwrites its internal selection property after onOpen; Thread now stores data as sourceSnapshot, with the host behavior represented in the regression. No checks were waived. The ordinary two-attempt policy remains unchanged; the prior feature-16 override does not apply to this run.

## Try it now

1. In a synthetic vault, allow a project and select a saved passage such as `The project budget is 20 euros.` in its note. Open the command palette and choose **Thread: Ask about selected text**. Expect a source/selection dialog with no immediate inference or writes. Enter `What is the budget?`, choose **Ask locally about selection**, inspect the supported answer and optionally preview/save a new note in mapped Knowledge. Unselected paragraphs/properties must not be supplied as evidence.
2. Select that passage again and run **Thread: Find evidence related to selected text**. Choose **Find related allowed evidence**. Expect keyword results inside all current allowed paths without model calls, with working current source links.
3. Run **Thread: Draft a question from selected text** or **Draft a decision from selected text**. Enter your question and, for a decision, your choice/reasoning. Inspect the exact preview before Save. Questions stay open; decisions stay proposed; the original note stays unchanged. A reused filename refuses overwriting.
4. Edit/rename/exclude the supporting synthetic note while the dialog is open. Expect canceled affected work and cleared source text/path. Old actions must refuse reuse; choose a new saved selection. Empty or more-than-4000-character selections do not enable commands. Use native keyboard Cancel and both themes.


## Independent-review repair evidence

First independent review requested changes for F-01 (duplicate excluded occurrence) and F-02 (projected CRLF selection). Both are repaired on attempt 1, pending fresh complete-delta review. Projection now exposes retained raw-source ranges without changing existing projected text; selection offsets must fall wholly inside one retained interval. Native LF editor offsets map to exact saved CRLF bytes; other dirty contents still fail.

- `feature-22-ranges.json`: five passing native cases, including all four actions on current CRLF decisions and latest versioned blocks, refusal of identical text in removed observations/older versions, unchanged source bytes around every Thread action.
- `feature-22-host-crlf-control.json`: with Thread disabled, Obsidian 1.14.4 normalizes frontmatter-bearing CRLF notes to LF on switching files. The range harness separates this independently reproduced host behavior from Thread writes; versioned source bytes remain exact. Initial harness runs failed their whole-session CRLF-byte assertion because of this host behavior; no product check was waived.
- `feature-22-native-r2.json`: all eight broad cases rerun on repaired build, including real qwen3:4b-instruct Ask, saves, collisions, exclusions, races and source/history preservation. `feature-22-extra-r2.json`: all four stale/HTML/preview/cancellation cases rerun.
- `feature-22-range-verify.log`: Verify passes typecheck, 33 test files and production build, including real-projection duplicate-occurrence, CRLF decision/versioned native-offset, malformed provenance, fenced literal marker, dirty text and Unicode regressions.
- `feature-22-installed-r2.json`: repaired bundle identity; earlier evidence preserved.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11113,"specSha256":"ceb316766e795940d1e2475ca05b649e956e39db7efc8d17cfbc2dfdf4b2cf70","branch":"refs/heads/feature/editor-selection-actions","head":"2ee354646cf41991fdca95c7394646d0051e66fe","baseRef":"refs/heads/main","baseCommit":"6288d8b637c79e3a9fd61a72eae88740c2d77dab","sourceTree":"387d05061777a82c396ef9fe97e73e70e5f029de","landing":"local-merge","absentOptional":[]} -->

## Findings

### 22/F-01 [P1] closed - Eligibility is checked by matching text instead of the captured range

**File:** src/vault/selection.ts:23
**Found:** 2026-10-16 by /audit (scope: current; lens: security, quality, tests)
**Why it matters:** `eligible.includes(text)` does not prove that the selected source offsets are eligible. In a current decision note containing `Use local models.` in both the user Choice and a removed `### Local model observations (...)` block, selecting the latter passes `savedSelection` because the same text survives elsewhere. The native command then builds evidence from that prohibited occurrence. The same issue applies to repeated text in older generated versions. This violates the exact-selection/current-projection contract and the explicit refusal of model-observation/older-synthesis reuse. A read-only Node probe using the real outputProjection and savedSelection returned an accepted snapshot whose `from` was the removed observation offset. Existing tests and native guard evidence only use unique excluded text.
**Suggested fix:** Validate the original `[from,to)` range against retained source ranges from the projection, rather than searching the projected string for an equal substring. Add regressions for identical text in retained and dropped model-observation/older-output blocks, selecting each occurrence separately.
**Resolution:** Repair attempt 1: authoritative outputProjection now returns retained raw-source intervals; savedSelection checks the exact selected range and maps native LF editor offsets back to saved CRLF offsets without changing captured bytes. Real projection regressions and native decision/versioned-note duplicate/CRLF cases pass; full native flows, real inference and Verify pass. Fresh independent full-delta review at 2ee354646cf41991fdca95c7394646d0051e66fe confirmed the original defect is repaired with no new defect introduced by the repair. Exact retained ranges reject duplicate excluded occurrences; native LF offsets map to exact saved CRLF ranges. Real-projection regression tests, repaired native range/broad/guard evidence and reviewer-run Verify all pass. F-01 and F-02 explicitly closed.

### 22/F-02 [P1] closed - Projected notes reject valid multiline CRLF selections

**File:** src/vault/selection.ts:23
**Found:** 2026-10-16 by /audit (scope: current; lens: quality, tests)
**Why it matters:** outputProjection normalizes decision text (and versioned-output text) with split(/\r?\n/).join("\n"), while savedSelection takes the exact CRLF substring from the saved editor text. Consequently a valid saved decision selection `Use local models.\r\nKeep data local.` fails the eligibility check and none of the four actions opens. A read-only Node probe reproduces the error with equal saved/editor contents and valid offsets. The explicit preserve-CRLF acceptance criterion is covered only by an unprojected raw-string unit fixture, so Verify misses this real caller combination.
**Suggested fix:** Preserve original line endings/ranges when establishing projected eligibility, keeping the captured text and hash exact. Add a regression passing real outputProjection output for a current CRLF decision/versioned note into the selection validation path.
**Resolution:** Repair attempt 1: authoritative outputProjection now returns retained raw-source intervals; savedSelection checks the exact selected range and maps native LF editor offsets back to saved CRLF offsets without changing captured bytes. Real projection regressions and native decision/versioned-note duplicate/CRLF cases pass; full native flows, real inference and Verify pass. Fresh independent full-delta review at 2ee354646cf41991fdca95c7394646d0051e66fe confirmed the original defect is repaired with no new defect introduced by the repair. Exact retained ranges reject duplicate excluded occurrences; native LF offsets map to exact saved CRLF ranges. Real-projection regression tests, repaired native range/broad/guard evidence and reviewer-run Verify all pass. F-01 and F-02 explicitly closed.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 2ee354646cf41991fdca95c7394646d0051e66fe
**Base commit:** 6288d8b637c79e3a9fd61a72eae88740c2d77dab
**Base ref:** main
**Spec hash:** ceb316766e795940d1e2475ca05b649e956e39db7efc8d17cfbc2dfdf4b2cf70
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T13:31:51.257575+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T13:33:50.318122+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`: pass; exact target/base match and only permitted review evidence differs.
- `sha256sum blueprint/context/current-feature.md` and `git show HEAD:blueprint/context/current-feature.md | sha256sum`: pass; tracked checkpoint and current spec bytes match recorded hash. No snapshot field applies.
- `git diff --stat`, `git diff --name-only`, complete feature diff and targeted caller/test reads: pass; all four lenses cover the complete application/docs delta in 6288d8b637c79e3a9fd61a72eae88740c2d77dab..2ee354646cf41991fdca95c7394646d0051e66fe.
- `npm run verify`: pass; typecheck, 33 passing test files, zero failures/skips/todos, production build.
- `git diff --check 6288d8b637c79e3a9fd61a72eae88740c2d77dab..HEAD` and `git diff --check`: pass.
- `sha256sum main.js`: pass; d1936e48914c8eb7f432a2aaba49d9520c3b001527d0af759d4bf48fbe4abf2e matches repaired installed-bundle evidence.
- Focused search of added tests for skipped/focused/placeholder cases: none found.

## Evidence

- Fresh generic isolated reviewer with no builder transcript; installed project-local Audit/independent-review contract, AGENTS.md, configuration, overview, coding standards, interaction rules, active spec and build-plan item 22 inspected.
- Reviewed README.md; src/main.ts command registration/capture/currentness; all src/vault/selection.ts and its tests; all src/ui/selection-modal.ts and its actual-handler tests; entire src/vault/freshness.ts delta. Followed ThreadModal, NewNoteModal, evidence construction/parsing, answer prompt/rendering, decision creation, new-note collision/write guards, scope/index/search/dependency/invalidation callers. Request/findings are workflow evidence, not code review scope. Dependencies, generated main.js, build output and unrelated source excluded from code audit; bundle hash checked as runtime identity evidence.
- Re-examined retained raw-source intervals, duplicated retained/dropped passages, native LF-to-saved-CRLF offsets, malformed provenance, fenced markers, dirty text, Unicode, selection-only metadata, query tokenization and manual/proposed draft boundaries. F-01 and F-02 repairs confirmed and explicitly closed without a new defect introduced by these changes.
- Inspected .thread-local/continuous-22-34/evidence/feature-22-native-r2.json (eight passing actual native command cases, one real qwen3:4b-instruct inference plus controlled cancellation requests) and feature-22-extra-r2.json (four passing stale/HTML/preview/cancellation cases), along with their native harnesses. Selected-only request assertions, scope-before-read, explicit saves/collisions, source/history preservation and immediate redaction recorded.
- Inspected feature-22-ranges.json and its harness: all four actions on exact CRLF decision/latest-version selections, identical excluded observations/older versions refused, per-action source bytes unchanged. feature-22-host-crlf-control.json independently records frontmatter CRLF-to-LF normalization with Thread disabled; final harness distinguishes that host behavior from plugin writes.
- Inspected original feature-22-native.json, feature-22-extra.json, feature-22-installed.json, feature-22-keyboard.json, repaired feature-22-installed-r2.json, and final/range Verify logs. Viewed feature-22-light.png and feature-22-dark.png: readable native selection controls and visible focus in both themes. Earlier evidence remains historical; repaired native reruns and matching rebuilt bundle establish current logic identity.

## Findings

- F-01 [P1] closed: selected source offsets must be wholly within a retained raw interval; equal text elsewhere cannot authorize a removed occurrence.
- F-02 [P1] closed: real projected CRLF decision/versioned selections retain exact saved text and offsets despite native editor LF normalization.
- No new confirmed quality, security, performance or tests findings in the complete feature delta. No open/fixed blocking findings remain.

## Remaining risk

- Native acceptance and real inference were inspected as existing synthetic-host evidence, not rerun by this reviewer. Check was not required by the pending request.
- Runtime evidence is limited to the documented Linux/Obsidian/local-model pair; other platforms/models and large-vault performance are not established.
- No dedicated local security scanner or profiler is declared for this feature; security/performance conclusions derive from code, bounded paths and available tests/evidence, not a vulnerability scan or profiling run.
