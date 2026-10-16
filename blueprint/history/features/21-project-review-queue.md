# Feature: Project review queue

**From build-plan:** feature 21
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/project-review-queue`

## Goal

Give a project one explicit on-demand view of changed recorded sources, decisions to revisit, open questions and stale outputs, without making decisions or note changes automatically.

## In scope

Validated decision source references and optional explicit revisit date, bounded pure project queue with scope-safe links and coverage limits, native project-home entry point and actions into existing review workflows, final private 0.2.0 packaging and integration acceptance.

## Out of scope

Automatic question resolution or status changes, inferred calendar dates/condition satisfaction, notifications/schedulers, paid services, autonomous source edits, full-vault change-feed claims or new review databases.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Recorded review metadata** - Retain validated decision reference descriptors without source excerpts, and add optional explicit revisit_on date to new decision/replacement previews. *Done when:* Tests prove reference validation, empty/legacy compatibility, no excluded/arbitrary property caching, strict calendar dates and unchanged statuses; Verify passes.
- [x] **Step 2 - Bounded project queue** - Build deterministic categories from current project records, recorded reference changes and latest saved review baseline, with explicit missing/invalid/ambiguous evidence limits. *Done when:* Pure tests cover changed/renamed/excluded sources, affected accepted/proposed decisions, overdue vs future/invalid dates, human-only conditions, unchecked questions, stale transitive outputs, deterministic ordering and category caps; Verify passes.
- [x] **Step 3 - Native explicit review** - Add Project review queue command and project-home action, safe source navigation and links to existing decision/freshness/change review flows; queue stays read-only. *Done when:* Actual Obsidian shows all applicable categories, no excluded path or cached excerpt leaks, source links require current hashes, refresh/invalidation/cancellation work, no model or note/status changes occur.
- [x] **Step 4 - Final private local release** - Demonstrate full queue acceptance and updated core workflows, package private version 0.2.0, preserve original history and accurately document costs/run instructions. *Done when:* Verify, curated quality evaluation, native synthetic acceptance with relevant real local inference, deterministic three-file ZIP and fresh independent review pass. No remote publication, paid runtime or personal-vault access occurs.

- [x] **Step 5 - Review repair F-01/F-02** - Redact excluded, missing, ambiguous and retired reference paths in the contextual freshness dialog; retain current allowed source navigation and explicit replacement selection. Correct the release limits documentation. *Done when:* Actual-handler regressions and native queue-to-freshness exclusion/missing/rename checks pass without inference or writes; Verify and updated deterministic ZIP checks pass, followed by fresh full independent review.

## Files / areas

src/vault/freshness.ts/index.ts and dependency hooks; src/vault/decision.ts/tests and native decision forms; src/vault/review-queue.ts/tests; src/ui/review-queue-modal.ts; main/briefing home wiring; README, manifest/package/lock and current run commands.

## Data / contracts

The queue is explicitly opened/refreshed and never runs inference, resolves questions, changes decision statuses, accepts proposals or writes source notes. Changed sources mean differences from recorded decision/output references or the most recent readable saved review baseline, not an exhaustive uncited-file change feed. Absence of a baseline is explicit. Decisions remain authoritative user records even when evidence needs review; proposed never means accepted and superseded records are omitted from active revisit items. Optional revisit_on is a validated YYYY-MM-DD local calendar date; free-text Revisit when remains a condition for human judgment and never inferred as satisfied. Recognized open/unresolved-question sections omit checked completed tasks but do not infer resolution from prose. Stale outputs remain excluded from AI retrieval; queue can show their allowed path/status without stale excerpts. Scope and freshness checks precede all index/retrieval/reuse; excluded/unavailable source paths and cached excerpts are redacted. Every source-opening uses current allowed full hashes and lifecycle guards. Category lists cap at 20 with counts and explicit 50000-character index/coverage limits. Existing decision/save/proposal/undo/recovery flows remain explicitly approved and exact. No new acknowledgement persistence or read grants. First twelve archives/history stay unchanged. Final version 0.2.0 remains private, unlicensed and free to run locally; no dependency/service install, model download or deployment added.

## Testing

npm run verify per declared step; metadata/reference/date and queue fixture tests; actual synthetic Obsidian all queue categories, current source opening, explicit new-decision revisit date preview, excluded/unavailable reference redaction, source invalidation and refresh, no inference/no source writes/status changes; native keyboard and both themes. Final real hybrid/recorded/answer/draft recovery regressions, curated live quality report and deterministic ZIP/install checks; fresh independent review before serial completion. User separately authorizes pushes of completed main commits; no public release/deployment.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

All observations used the isolated synthetic vault marked `thread-quality-v1`, never personal notes. The final installed plugin reported version 0.2.0. Independent review remains a separate completion gate against this verified checkpoint; its receipt is archived at completion.

- `npm run verify` passes: typecheck, 31 test files and production build. New metadata/date/queue fixtures cover the Step 1–2 cases. Final packaging also ran Verify; `.thread-local/evidence/feature-21-package.log` records the result.
- `.thread-local/evidence/feature-21-native.json`: six native Obsidian cases pass, covering all six categories, excluded/cached-content redaction, safe text rendering, current-hash source navigation, contextual review entry points, stale-button refusal/explicit refresh, and an explicitly previewed/saved new decision with a revisit date. Existing accepted/proposed statuses and sources remain unchanged; queue inspection makes zero inference calls.
- `.thread-local/evidence/feature-21-keyboard.json`: native Enter activates Refresh. `feature-21-light.png` and `feature-21-dark.png` show the final installed queue, all category counts and collapsed coverage limits; both screenshots were visually inspected.
- Initial 0.2.0 candidate integration regressions (their logic is unchanged by the subsequent focused freshness-display repair): `feature-21-hybrid-regression.json` (seven cases, actual local embedding and text inference); `feature-21-review-regression.json` (five exact-draft/apply/undo/recovery cases); `feature-21-setup-regression.json` (eight discovery/diagnostic/scope/cancel cases without inference or downloads); `feature-21-index-regression.json` (nine incremental/rename/exclusion/inference cases, three affected reads among 54 notes); `feature-21-target-regression.json` (five immediate source/target cancellation cases, zero published proposals). All are in `.thread-local/evidence/` and pass.
- `feature-21-core-native.json` records five native answer/Resume outputs before the focused freshness-display repair: supported budget, no-evidence refusal without inference, correct objective/question placement, planned work not treated as completed, and proposed decisions not treated as accepted. These collected outputs were inspected; the collector itself does not claim general semantic correctness.
- Strict curated evaluation with the actual free local `qwen3:4b-instruct` model passes 10/10 authored fixtures, zero errors: `feature-21-live-quality.json`. This covers missing/conflicting evidence, decision status, section placement and support checks; it is not a guarantee for arbitrary notes or models. The native hybrid regression also uses `qwen3-embedding:0.6b`.
- `feature-21-repair-package-proof.json`: two post-repair builds produce the same three-file `dist/thread-0.2.0.zip` (194619 bytes), SHA-256 `91a93cea45deedd6f66907d15fc34bb5ac0bac38b18856e8e948ea9841fab35e`. The earlier `feature-21-package-proof.json` remains historical evidence for the initial candidate, not the repaired ZIP. It contains only `thread/main.js`, `thread/manifest.json`, `thread/styles.css`; its installed bundle matches the final build. README documents manual installation, safe upgrade, local runtime costs and coverage limits. No dependencies, services or downloads were added for this feature.

### Review repair evidence

Independent review F-01 confirmed that the new contextual freshness handoff inherited a renderer that displayed unavailable original reference paths, even though queue rows were redacted. Repair attempt 1 now renders only current allowed resolved paths, with generic guidance for unavailable/ambiguous sources and no historical path arrow. F-02 corrects the README embeddings contradiction. Both findings remain `fixed` pending the fresh full review.

- The committed actual-handler regression in `src/ui/generation-targets.test.ts` uses the real FreshnessGraph with excluded, missing, duplicated-ID and renamed references. It exercises contextual auto-selection, redacted DOM/options, usable current-hash navigation and replacement controls without inference. The initial new test fixture omitted its output title; that fixture was corrected before passing the focused test and full Verify. No check was waived.
- `.thread-local/evidence/feature-21-privacy-repair.json`: four passing cases in actual Obsidian on the installed repaired ZIP, through the queue handoff. Excluded/missing/ambiguous/historical paths and cached headings/excerpts stay hidden; the current renamed allowed source opens; a new exclusion clears the display and remains redacted after refresh. Zero inference, note writes, reference-file creations or durable-history changes.
- `.thread-local/evidence/feature-21-repair-target-regression.json`: all five known Knowledge/Freshness target cancellation cases still pass on the repaired package; zero proposals published.
- `feature-21-repair-package.log` records passing typecheck, all 31 test files and production build. `feature-21-repair-package-proof.json` records byte-for-byte reproducibility, exact three-file contents and installed-bundle equality. Earlier broad native/inference evidence is retained; only the freshness renderer, regression and release documentation changed after that collection.

## Try it now

1. Follow README to install the private 0.2.0 ZIP into a synthetic Obsidian vault; reload Obsidian, enable Thread, explicitly select read roots and a project. The queue works without Ollama or an embedding model.
2. Use **Thread: Project review queue** or **Review queue** on the project home. Expand categories and **Coverage and review limits**. With recorded source references, due `revisit_on` dates, human revisit conditions, question sections or stale outputs, inspect the relevant items and supporting current source links. Missing categories/baselines describe only recorded coverage.
3. Open a decision/freshness review from an item. Verify that it only prefills the existing explicit workflow. Close without generating or saving to leave notes unchanged. For a new synthetic decision, set an optional valid revisit date, inspect the exact preview, and save only if desired; its selected status remains authoritative.
4. Edit a supporting synthetic source or exclude it in Settings. The old queue clears; refresh explicitly. Excluded paths/excerpts must disappear and stale buttons must refuse navigation. Inspection never resolves a question, accepts a proposal or changes a decision automatically.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12631,"specSha256":"fd5648fcede0fa6b2bc872c9755f5967d84f29497c3f57c889bba0841ace9e10","branch":"refs/heads/feature/project-review-queue","head":"0fa47cd6f9de164bc22996647f539d5eb81387de","baseRef":"refs/heads/main","baseCommit":"20eaa72624043999857d9c7ccd92e54327901391","sourceTree":"b8e6406a6fcdb75c60a879a654b93cf03e09289e","landing":"local-merge","absentOptional":[]} -->

## Findings

### 21/F-01 [P1] closed - Contextual freshness review reveals unavailable reference paths

**File:** src/ui/freshness-modal.ts:35 (new contextual entry at line 48; src/ui/review-queue-modal.ts:36)
**Found:** 2026-10-16 by /audit independent (scope: current; lens: security)
**Why it matters:** The queue correctly hides excluded/missing reference paths, but its new Open Source freshness action supplies initialPath, and the new load branch immediately calls choose(). That existing renderer interpolates ref.ref.path for every reference, including unavailable references. An allowed saved review referring to an excluded P/Private/SYNTHETIC_HIDDEN.md therefore exposes that excluded path as soon as the offered contextual workflow opens. FreshnessGraph.resolve deliberately retains the original descriptor while omitting the resolved path for unavailable sources; it is not a safe display object. This violates the active spec's unavailable/excluded path redaction contract. The same row can expose a historical disallowed path even when an allowed renamed note resolves.
**Suggested fix:** Build freshness rows from a currently allowed resolved path, and show a generic unavailable-reference label when identity cannot safely be displayed; never interpolate the original reference path without current scope validation. Preserve usable current-source navigation and explicit replacement selection. Add a regression covering queue-to-freshness navigation after source exclusion, as well as missing/renamed sources, and rerun affected native acceptance.
**Resolution:** Confirmed against target 910d281c37ee2f363efa3a20062a1aee97c5ae27. A read-only Node reproduction using real index/queue/graph modules proved queue JSON omits the synthetic hidden basename while the exact freshness row expression emits `unavailable: P/Private/SYNTHETIC_HIDDEN.md`. This was a logic reproduction and source trace, not a rerun of native Obsidian.


**Independent re-review:** Closed on 2026-10-16 against 0fa47cd6f9de164bc22996647f539d5eb81387de after a fresh full-delta review. FreshnessModal.choose displays only ref.path resolved by the scoped graph and checked by readableText; unavailable/ambiguous rows use generic labels. Original ref.ref.path and cached heading/excerpt are absent from displayed rows/options, including stable-ID renames. Graph reasons were inspected and contain no unavailable original identities. The real-handler regression with actual FreshnessGraph passes under Verify; current-hash navigation and replacement controls remain usable. Inspected feature-21-privacy-repair.json (four native passing cases, no inference/writes/history changes) and feature-21-repair-target-regression.json (five cancellations, zero proposals). These are inspected native artifacts, not native reruns in this review. No repair regression found.

### 21/F-02 [P3] closed - Release limits incorrectly exclude optional embeddings

**File:** README.md:179
**Found:** 2026-10-16 by /audit independent (scope: current; lens: quality)
**Why it matters:** The final private 0.2.0 release documentation says this release does not include embeddings, although its later optional semantic-search instructions, approved feature 17, current setup, and recorded hybrid regression demonstrate supported opt-in local embeddings. The contradictory release limit misstates a shipped capability.
**Suggested fix:** Update the limits sentence to distinguish default keyword/link retrieval from optional local embeddings, preserving the listed genuinely unsupported formats and runtime features.
**Resolution:** Confirmed against README and feature-21-hybrid-regression.json. No documentation was repaired in this reviewer context.


**Independent re-review:** Closed on 2026-10-16 against 0fa47cd6f9de164bc22996647f539d5eb81387de. README release limits now explicitly include optional local embeddings and agree with the existing optional setup instructions and inspected hybrid evidence.

## Builder repair evidence

F-01 repair attempt 1 displays only currently allowed resolved paths and generic unavailable labels, never an original historical descriptor path. The actual-handler regression uses real freshness resolution for excluded/missing/ambiguous/renamed references and checks current navigation/replacement controls. Native `feature-21-privacy-repair.json` passes four handoff/exclusion/no-write cases on the repaired installed 0.2.0 ZIP; `feature-21-repair-target-regression.json` passes five target cancellations with zero proposals. Full Verify passes 31 files/typecheck/build, and the repaired ZIP reproduces exactly (`feature-21-repair-package-proof.json`). F-02 corrects the release-limit sentence to include optional local embeddings. Both findings are fixed, awaiting fresh independent confirmation; the builder does not close them.

## Independent review result

Fresh full base-to-target review on 2026-10-16 covered quality, security, performance and tests. F-01 and F-02 are closed; no new findings. Builder repair evidence above records its earlier pending state. See review.md for exact checkpoint, verification, inspected artifacts and limits.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 0fa47cd6f9de164bc22996647f539d5eb81387de
**Base commit:** 20eaa72624043999857d9c7ccd92e54327901391
**Base ref:** main
**Spec hash:** fd5648fcede0fa6b2bc872c9755f5967d84f29497c3f57c889bba0841ace9e10
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T12:15:34.649123+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T12:17:48.379097+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git status --short`, `git rev-parse HEAD`, `git merge-base main HEAD`, and `sha256sum blueprint/context/current-feature.md`: pass; exact target, recorded base and spec hash; only permitted review evidence differs from checkpoint.
- `git diff --stat main..HEAD`, `git diff --name-only main..HEAD`, full product/documentation delta reads and targeted adjacent source reads: pass; entire current feature reviewed, excluding findings/review as product scope.
- `npm run verify`: pass; strict typecheck, 31 test files, zero failures/skips/todos reported, production build.
- `npm run evaluate`: pass; offline reference/negative-control self-check 10/10, zero errors; no live model run.
- `git diff --check main..HEAD` and `git diff --check`: pass.
- Python read-only ZIP inspection: pass; 194619 bytes, SHA-256 `91a93cea45deedd6f66907d15fc34bb5ac0bac38b18856e8e948ea9841fab35e`; exactly thread/main.js, thread/manifest.json, thread/styles.css; all three equal current files after Verify.
- Targeted skipped/focused/placeholder test search: no matches in changed test files. An initial combined inspection command named nonexistent src/vault/index-cache.ts and exited 2; cache persistence was subsequently inspected at its actual location in src/main.ts. A no-match search also ended a command chain before its diff check; both diff checks were subsequently run explicitly and passed. No verification was waived.

## Evidence

- Fresh generic isolated reviewer handoff, without builder transcript; codex/gpt-6.1-sol identity and automatic execution match the request. HEAD `0fa47cd6f9de164bc22996647f539d5eb81387de`; main merge base `20eaa72624043999857d9c7ccd92e54327901391`; full review range `20eaa72624043999857d9c7ccd92e54327901391..0fa47cd6f9de164bc22996647f539d5eb81387de`. Tracked spec hash matches the unchanged request; no snapshot field or snapshot required.
- Quality: reviewed all changed product paths: src/main.ts; src/ui/briefing-view.ts, decision-modal.ts, decision-review-modal.ts, freshness-modal.ts, generation-targets.test.ts and review-queue-modal.ts; src/vault/decision.ts and test, freshness.ts, index-updates.ts, index.ts and test, review-queue.ts and test; styles.css. Reviewed AGENTS.md, README.md, manifest.json, package.json/package-lock.json, project-overview change and active feature contract/build-plan. Queue logic remains pure, contextual actions reuse explicit existing workflows, and version/documentation changes agree.
- Security: traced scope-filtered index records, validated bounded reference descriptors, freshness resolution/reasons, queue related links and unavailable redaction, text-only native rendering, lifecycle invalidation and full-hash source navigation. Adjacent callers inspected: ThreadModal, main rebuildIndex/resolveIndexLink/persistIndex/openIndexedSource/updateSettings/invalidatePath/notifySources, decision-review.ts and source-link.ts. Queue performs no inference or source/status mutation; reviewed freshness repair closes the reachable historical/unavailable path leak.
- Performance: reviewed bounded per-note indexing, at most 100 reference descriptors, six categories capped at 20 visible items with five related links, graph memoization/depth/cycle handling and incremental invalidation propagation including decision references. Queue work still scales with eligible project/index records on explicit refresh; no large-vault benchmark claim made and no new confirmed performance defect found.
- Tests: reviewed metadata/date/queue tests and actual-handler generation-targets test, plus the affected index/update/freshness/source-navigation contracts. Fixtures exercise excluded/missing/ambiguous/renamed identity, current-hash navigation, unchanged decision status, due/future/invalid dates, conditions, completed questions, stale outputs, deterministic caps/order and invalid scopes. Real-handler repaired test uses actual FreshnessGraph rather than a precomputed resolution stub.
- Inspected .thread-local/evidence/feature-21-native.json (six passing queue cases), feature-21-keyboard.json (native Enter refresh), feature-21-light.png and feature-21-dark.png (visually inspected native queue in both themes). These broad screenshots and initial acceptance precede the focused freshness-display repair and are not fresh proof of that repair.
- Inspected feature-21-hybrid-regression.json (seven cases including real local text/embedding inference), feature-21-review-regression.json (five apply/draft/undo/recovery cases), feature-21-setup-regression.json (eight cases), feature-21-index-regression.json (nine cases, three affected reads among 54 notes), feature-21-target-regression.json (five cancellation cases), feature-21-core-native.json (five collected native outputs; inspected outputs, not a general semantic claim) and feature-21-live-quality.json (10/10 curated live-local-model fixtures, zero errors). These broad artifacts predate the focused display repair, whose affected native behavior has separate current evidence.
- Inspected feature-21-privacy-repair.json: four passing repaired installed-ZIP cases covering queue contextual redaction, allowed renamed navigation, immediate exclusion/refresh redaction, and zero inference/note writes/history changes. Inspected feature-21-repair-target-regression.json: five passing cancellations, zero proposals. Inspected feature-21-repair-package-proof.json and feature-21-repair-package.log: reproducible repaired three-file ZIP and passing Verify; independently checked current ZIP hash/content equality. The older feature-21-package-proof.json is historical pre-repair evidence, not current-package proof.
- Standards: checked installed AGENTS.md and coding-standards.md requirements for strict types, native UI/lifecycle, text rendering, explicit read scope, authoritative notes, guarded navigation/writes, proportional design and configured tests. Used installed Audit/independent-review contract. Dependencies/generated main.js, node_modules, dist and ignored runtime artifacts were excluded from source review; ZIP and named evidence were inspected as validation inputs. No dependency, install, external action, product/spec/test/config edit, commit or push was performed.

## Findings

- F-01 [P1] closed: repaired contextual freshness display independently re-reviewed, real-handler regression passes and affected current native evidence inspected; no original unavailable/historical reference paths are displayed.
- F-02 [P3] closed: release limits now accurately include optional local embeddings.
- No new findings across quality, security, performance or tests. No repair order remains.

## Remaining risk

- Native Obsidian interactions, package installation/reproducibility rebuild and live inference were not rerun by this reviewer. Inspected recorded synthetic native/inference artifacts and independently checked the current package against current build files. Check was not required by the request/configuration.
- Recorded broad acceptance/screenshots/live-quality evidence precedes the narrow freshness-display repair; fresh repair-specific native evidence covers the changed behavior and cancellation cases. Curated quality checks do not establish arbitrary-model semantic correctness.
- No current dependency vulnerability scan or large-vault/runtime profiling was performed. No such local command was declared; this receipt does not claim those signals. Linux synthetic evidence does not validate other platforms, personal vaults or production scale.
