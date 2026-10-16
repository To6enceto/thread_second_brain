# Feature: Evidence workbench

**From build-plan:** feature 23
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/evidence-workbench`

## Goal

Inspect and choose current retrieved passages before local Ask, then compare every answer claim with its cited excerpts.

## In scope

Two-phase Ask retrieval/review/generation, per-request include/exclude/pin choices, exact bounded context preview, paired claim/evidence rendering, tests and native acceptance.

## Out of scope

Durable pins, new search grants, retrieval expansion (30), new providers/dependencies, automatic writes or inferred confidence.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Context selection contract** - Add a pure bounded selector preserving source IDs/hashes and prioritizing included pinned passages without exceeding the existing 16000-character source-context budget. *Done when:* Tests prove excluded/pinned/empty/overflow behavior, preserved provenance and no mutation; Verify passes.
- [x] **Step 2 - Native Ask workbench** - Split retrieval from explicit generation, render editable inclusion/pin controls and exact final context, invalidate old answers/previews on input changes, pair claims with excerpts. *Done when:* No chat before explicit generation; choices survive only the current request; currentness/permission/cancellation/preview guards remain; Verify passes.
- [x] **Step 3 - Acceptance and documentation** - Exercise actual Obsidian retrieval, choices, real inference, claim/excerpt pairs, source opening, stale/exclusion races, preview/save and keyboard/themes. *Done when:* Synthetic native evidence and required independent review pass; sources/history unchanged; Try it now and README current.

## Files / areas

src/vault/workbench.ts/tests; src/ui/ask-modal.ts/tests; styles.css; README.md.

## Data / contracts

Workbench choices are ephemeral and operate only on currently eligible bounded retrieved passages. Original source IDs, excerpts, content hashes and full-note hashes are preserved; pins order included evidence first but cannot expand scope or context budget. Selected context lists exact supplied source objects and omissions. Generation is a separate user action. Every visible candidate remains watched for source/settings changes. Manual question/scope/filter/choice edits abort old generation and invalidate its result and save authority. Source changes/exclusions clear cached candidate DOM and refuse detached actions. Exact previews retain captured input revision plus existing independent source/settings/collision guards, including own-folder creation. Claims render beside their cited literal excerpts, with no fabricated confidence or semantic-support claim.

## Testing

npm run verify each step; pure selection/budget/provenance tests, real-handler cancellation/stale-preview regressions, actual isolated Obsidian with qwen3:4b-instruct inference, request canaries, source navigation, exclusions/races, explicit save/collision, keyboard/light/dark. No personal vault.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

Synthetic native Obsidian only; evidence in `.thread-local/continuous-22-34/evidence/`:

- `feature-23-native.json`: five passing cases. Actual Retrieve/choice/Generate controls demonstrate zero chat before generation, excluded passage absent, pinned source first, actual request evidence identical to inspected context, real qwen3:4b-instruct answers with paired excerpts and current source links, explicit save including own destination-folder creation, unchanged source/history, changed-choice preview refusal, held request cancellation, empty context no inference and immediate exclusion redaction/detached-action refusal. Four chat attempts: two real calls and two controlled held calls.
- `feature-23-extra.json`: real local answer, concurrent destination creation refuses overwrite, supporting-source edit clears candidates and refuses old navigation. One real call.
- `feature-23-visual.json`, light/dark and pair-light/pair-dark PNGs: one real answer, native rendering visually inspected; claim/excerpt grid is two columns at 1400x1000 (`feature-23-pair-layout.json`). Narrow dialogs wrap naturally. Visual setup invokes the same handlers programmatically, so its Question field is blank; native broad acceptance uses the actual filled field. `feature-23-keyboard.json`: actual native Enter activates Cancel, clears output; theme/settings restored.
- `feature-23-installed.json`: verified bundle matches installed synthetic plugin. `feature-23-step1.log` passes 34 test files/typecheck/build; `feature-23-step2-final-r1.log` passes 35 files/typecheck/build, including actual handler tests for selected requests, navigation, choice cancellation, old preview refusal, own-folder invalidation and cleared/detached DOM. Final checkpoint reruns Verify.

During acceptance, harness label matching was corrected for displayed section headings and the source-type filter was set so a newly saved answer would not accidentally become a third candidate in the empty-context fixture. Tests use explicit source fixtures. A handler now returns its already-caught async work so actual-handler tests can await completion; behavior is unchanged. No checks/findings were waived.

## Try it now

1. In a synthetic permitted project, open Thread Ask and enter a question. Choose **Retrieve evidence**; expect passages without AI text generation. Choose Exclude for one passage and Pin first for another, inspect **Exact source context sent to the model**, then choose **Generate from chosen evidence**.
2. Compare each claim with the adjacent cited excerpt, open its current source and inspect context/search omissions. Pins never bypass limits. Change a choice during generation; expect cancellation and a renewed context.
3. Preview an answer note, change its evidence choices and try the old preview; expect refusal. Generate again for a new exact preview. Save explicitly; existing destinations refuse overwrites. Edit/exclude a supporting source; expect cached evidence cleared and old actions refused. Native keyboard Cancel works in both themes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6561,"specSha256":"20dae85a16c8d3c60a45add08b5d8f328014bc1b16a3977dc04cf99a860271d8","branch":"refs/heads/feature/evidence-workbench","head":"20e615b2b2ec2b7a72dfb5acbf090da3760a4b54","baseRef":"refs/heads/main","baseCommit":"79368d6d668ce7accc66886ed9051e23b6e5dd2b","sourceTree":"fe6d7c4da79f02962a106df8474bd8efd8b7c2e4","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 20e615b2b2ec2b7a72dfb5acbf090da3760a4b54
**Base commit:** 79368d6d668ce7accc66886ed9051e23b6e5dd2b
**Base ref:** main
**Spec hash:** 20dae85a16c8d3c60a45add08b5d8f328014bc1b16a3977dc04cf99a860271d8
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T13:42:21.961703+00:00
**Workflow:** continuous
**Check required:** no


**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T13:45:10.148494+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed; strict typecheck, 35 test files, zero failures/skips/todos, production build.
- `git diff --check`: passed.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short --untracked-files=all`: passed; exact requested target/base and only permitted review evidence differs.
- `sha256sum blueprint/context/current-feature.md` and `git show HEAD:blueprint/context/current-feature.md | sha256sum`: passed; exact requested hash, tracked spec matches target.
- `sha256sum main.js`: passed; rebuilt bundle is 0adecad2f75b58ba85067d949d7e94afa431b0f8b5a10d049707e73fb5ab03d3, matching recorded installed acceptance artifact.
- Search for skipped/focused/placeholder tests in the added tests: none found.

## Evidence

- Fresh isolated review of the entire `79368d6d668ce7accc66886ed9051e23b6e5dd2b..20e615b2b2ec2b7a72dfb5acbf090da3760a4b54` delta on `feature/evidence-workbench`, base ref `main`: README.md, tracked current-feature.md, src/ui/ask-modal.ts and added handler tests, src/vault/evidence.ts, added src/vault/workbench.ts and tests, styles.css. Existing findings did not define the scope.
- Followed affected callers and safeguards in src/main.ts (retrieval/watch dependencies, source/settings invalidation, currentness, navigation, note creation), src/ui/thread-modal.ts, src/ui/new-note-modal.ts, src/ui/search-filters.ts, src/vault/index.ts, src/vault/new-notes.ts and tests, src/vault/source-link.ts and tests, src/intelligence/answer.ts and src/intelligence/ollama.ts. Checked native DOM text rendering, local-only model checks, bounded selection, provenance preservation, all-candidate watches, cancellation/revision guards and revalidated exact preview/save paths.
- Applied AGENTS.md, valid blueprint/config.json, project overview, coding standards, active feature 23 spec, AI interaction guidance, build-plan ordering, installed Audit Phase B and independent-review contract.
- Inspected `.thread-local/continuous-22-34/evidence/feature-23-native.json`, feature-23-extra.json, feature-23-visual.json, feature-23-keyboard.json, feature-23-pair-layout.json and feature-23-installed.json. Reviewed their native acceptance harnesses in `.thread-local/continuous-22-34/`: test-feature-23.js, test-feature-23-extra.js, show-feature-23.js and cdp-feature-23.mjs. Results record real local inference, exact request context, choice cancellation, empty context, scoped exclusions, current links, explicit saves, collision refusal, unchanged sources/history and source-edit redaction.
- Opened and visually inspected all four native screenshots: feature-23-light.png, feature-23-dark.png, feature-23-pair-light.png and feature-23-pair-dark.png. Both themes are readable and claim/excerpt pairs render in two columns at the recorded viewport. Blank visual-fixture Question field is explicitly explained in the spec and harness; native acceptance fills the actual field.
- Excluded generated bundle/build output, dependencies, unrelated product features and third-party files from code audit; inspected generated main.js hash only to bind recorded installation evidence. No new dependency or configuration delta.

## Findings

- None. No confirmed quality, security, performance or tests findings in the complete target delta; findings.md remains unchanged with no open entries. No repair order required.

## Remaining risk

- Actual synthetic Obsidian evidence was inspected, not rerun by this reviewer. Required Check was explicitly no. Evidence covers Linux/recorded Obsidian/local qwen3 configuration, not other operating systems/models or a new performance profile.
- The active spec names feature-23-step1.log and feature-23-step2-final-r1.log under its evidence directory; those historical logs are absent there. Current independent Verify passed and the rebuilt bundle hash matches the installed evidence, so this missing historical signal does not block this review.
- Narrow-dialog wrapping follows the responsive CSS; the supplied screenshots demonstrate the recorded 1400x1000 viewport only. No separate narrow-viewport screenshot was supplied.
- No network vulnerability scan or large-vault runtime profiling was run; no such local command is declared. Manifest/dependency inspection is not a current vulnerability scan.
