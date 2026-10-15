# Feature: Repeatable answer-quality evaluation

**From build-plan:** feature 13
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/repeatable-answer-quality-evaluation`

## Goal

Make local AI quality repeatable and inspectable through committed synthetic fixtures, curated checks and honest local-model baseline reports.

## In scope

Approved plan extension, synthetic answer/briefing cases, pure quality evaluator, deterministic harness checks, opt-in real local-model CLI and reusable native Obsidian smoke tools.

## Out of scope

Fixing model behavior, automatically judging unrestricted semantic truth, reading personal vaults, paid/cloud evaluation or bundling test runtimes/models.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Synthetic expectations** - Add small manually authored fixture cases and a validated quality evaluator for missing evidence, conflicts, statuses, section placement and cited support. *Done when:* Pure tests prove reference outputs pass and known wrong/unsupported/misclassified outputs fail; Verify passes.
- [x] **Step 2 - Repeatable local evaluation** - Add a documented fixture-only evaluation command with deterministic harness checks, explicit live mode and synthetic vault/native test helpers. *Done when:* Default evaluation makes no network request; live mode uses existing local-only checks and reports failures honestly; no runtime/model/private notes enter Git.
- [x] **Step 3 - Observed baseline** - Run real local-model fixture evaluation and native synthetic Obsidian briefing/Ask checks, record known weaknesses separately from successful harness operation. *Done when:* Repeatable reports and native evidence show supported/unsupported and section-placement outcomes honestly; final Verify and fresh independent review pass.

## Files / areas

src/evaluation, scripts/evaluate.mjs, committed evaluation fixtures/native harness, package scripts and documentation; approved plans and overview.

## Data / contracts

Fixtures contain only authored synthetic notes. Evaluation is opt-in and never scans a user vault or downloads a model. Expected phrases/sections/source identities are curated checks, not a general semantic judge. Default mode validates the evaluator with known pass/fail examples without inference. Live reports include observed failures; strict mode can fail on quality, normal collection mode reports completion without disguising quality. Reuse Ollama loopback/cloud-disabled/text-model boundaries and cancellation/timeouts. Native smoke tools require an explicit synthetic fixture marker before running. Preserve original 0.1.0 archives and all user data.

## Testing

npm run verify; deterministic evaluator good/bad/error cases; npm run evaluate default harness-only mode; opt-in live fixture baseline against qwen3:4b-instruct; marker-guarded native Obsidian supported/unsupported/briefing acceptance and fresh full-delta independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

Step 1 observed: `npm run verify` passed typecheck, 19 test files and build. All ten authored reference cases pass curated checks and all ten negative controls fail those checks. Source paths/collection identity and expectations are validated. Numeric terms match whole tokens (20 does not match 200). Negative controls exercise the evaluator independently because product validation can already remove or repair them.

Step 2 observed: Verify passes with 19 test files; the default CLI self-check passes without a live flag or server requirement. Fixture export creates only a new direct child of ordinary ignored .thread-local, rejects collisions and traversal, and includes an ungranted canary. Native collection requires the synthetic marker, fixed case folders and no pending work; it restores settings and checks scope and model requests. Developer CDP accepts only a numeric loopback port. Live collection and strict quality failure are explicitly different modes.


## Verification observed

- Final `npm run verify` passes strict typechecking, all 20 test files and build. CLI tests run the actual command using explicit output files, reject invalid arguments/export locations and preserve existing reports. Child process errors are checked; the managed environment disallows captured spawnSync pipes, so tests use ignored stdio and inspect the explicit report file.
- Default `npm run evaluate` validates ten reference outputs and rejects ten negative controls without model inference. `feature-13-export.json` records a successful fresh synthetic export; canary and marker are present. Export refuses existing targets and uses fixed ordinary ignored storage.
- `.thread-local/evidence/feature-13-live-baseline.json` initially reported 7/10 curated passes. Inspection showed the conflict answer was substantively correct across separate claims; the initial one-claim requirement was a false positive. The corrected rubric requires each recommendation with its own source plus a cited disagreement interpretation, and a new regression covers separate claims.
- `.thread-local/evidence/feature-13-live-curated.json` is the repeated real qwen3:4b-instruct baseline: 8/10 passes, two visible failures (briefing section placement and planned work in lastActivity). These are observed model limitations to improve in feature 14, not a claimed passing quality gate. Live collection mode and strict quality gating are documented distinctly.
- `.thread-local/evidence/feature-13-missing-model.json`: deliberately nonexistent local model produces nine operational errors and a failing exit status; missing-evidence handling still succeeds without inference. No model was downloaded.
- `.thread-local/evidence/feature-13-native.json`: actual Obsidian in a separate loopback-only namespace, using the exported synthetic marker. Five native briefing/Ask scenarios collect real results. Supported budget output is present, missing evidence is unsupported with zero model calls, scope remains inside the selected fixture folder and the ungranted canary never enters a request. Settings are restored after collection. This is native collection proof, not a semantic pass assertion for all five outputs.
- `.thread-local/improvements-lab/evidence/network.json` records only loopback interfaces. Runtimes/weights/vaults/reports stay ignored. Original features 1-12 archives are unchanged. No user vault, paid service, push or publishing was used.

## Try it now

Run `npm run evaluate` and expect ten passing reference/negative-control harness checks with mode `reference-and-negative-control-self-check` and no model. Follow evaluation/README.md to collect an opt-in local baseline or export a fresh marked synthetic vault and collect actual native Obsidian results. Read failed cases and outputs; a curated pass is not unrestricted semantic proof. Use a new report/export path each time. Add --strict when failures should produce a failing exit status.

## Limits

Ten small synthetic cases are not a broad model benchmark or a general semantic judge. Curated wording can require refinement when a valid answer uses an equivalent formulation; preserve negative controls and report such corrections honestly. The current model still misclassifies briefing facts/plans. Live model and native tools are optional and not ordinary Verify prerequisites. Only the existing Linux/Obsidian/Ollama local environment was exercised.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7827,"specSha256":"9d17e05795d257c9e3ba39fab40faa3d6c5d0982a5a5016fd4cb105fdedaa2ab","branch":"refs/heads/feature/repeatable-answer-quality-evaluation","head":"4230d6e999b96203802b4ce17e2cf6358884ad6f","baseRef":"refs/heads/main","baseCommit":"38302b5fd30c2e1d4690245680565ee8f7d5f892","sourceTree":"9e66c95f682764ac827d7a1b7432dbbdb0862e91","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 4230d6e999b96203802b4ce17e2cf6358884ad6f
**Base commit:** 38302b5fd30c2e1d4690245680565ee8f7d5f892
**Base ref:** main
**Spec hash:** 9d17e05795d257c9e3ba39fab40faa3d6c5d0982a5a5016fd4cb105fdedaa2ab
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-15T10:41:36.089236+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-15T10:43:21.672588+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `git status --short`, `git rev-parse HEAD`, `git merge-base main HEAD`: pass; only review evidence differs from target.
- `sha256sum blueprint/context/current-feature.md` and raw-byte comparison with `HEAD:blueprint/context/current-feature.md`: pass; tracked verified spec matches the request.
- `git diff --stat main...HEAD`, complete changed-file reads and focused caller/validator reads: pass; complete target delta reviewed.
- `npm run verify`: pass; strict typecheck, all 20 test files, production build; zero skipped, todo or failed test files.
- `npm run evaluate`: pass; ten reference outputs pass and ten negative controls are rejected, without inference.
- Focused skipped/focused/placeholder search in added evaluation source, scripts and fixtures: no matches.
- `git diff --check main...HEAD`: pass.

## Evidence

- Complete range: `38302b5fd30c2e1d4690245680565ee8f7d5f892..4230d6e999b96203802b4ce17e2cf6358884ad6f`, base ref `main`. Fresh isolated reviewer received the handoff without the builder conversation and used the installed project-local Audit contract.
- Reviewed all 15 changed paths: `AGENTS.md`, `README.md`, `blueprint/build-plan.md`, `blueprint/project-plan.md`, `blueprint/context/current-feature.md`, `blueprint/context/project-overview.md`, `evaluation/README.md`, `evaluation/fixtures.json`, `package.json`, `scripts/evaluate.mjs`, `scripts/obsidian-cdp.mjs`, `scripts/evaluation/obsidian-quality.js`, and the three files in `src/evaluation/`.
- Followed existing `OllamaClient`, evidence construction, answer/briefing prompts and validators, scope/settings helpers and test runner to assess local-only requests, bounded work, validation and test integration. Checked project strict typing, synthetic-only data, explicit inference, cloud-disabled loopback checks, cancellation, collision-safe creation and native-vault boundaries. No new dependency or runtime product change.
- `.thread-local/evidence/feature-13-live-baseline.json`: inspected all outputs; initial 7/10 included a valid conflict answer split across claims. Current fixture and regression correctly accept separate sourced recommendations plus cited disagreement.
- `.thread-local/evidence/feature-13-live-curated.json`: inspected all outputs; repeated qwen3:4b-instruct baseline is 8/10, with visible decisions-section pollution and planned work in lastActivity. The spec accurately treats this as a reported baseline, not a passing model-quality gate.
- `.thread-local/evidence/feature-13-missing-model.json`: inspected nine operational errors and the unsupported empty-evidence result; current CLI makes operational errors fail even in collection mode.
- `.thread-local/evidence/feature-13-native.json`: inspected five actual native briefing/Ask outputs; supported budget, unsupported missing evidence with zero chat calls, and visible native section-placement limitations agree with the spec. Native collector code guards the marker, scopes each fixed fixture folder, checks indexed paths and canary requests, refuses pending work and restores settings in finally.
- `.thread-local/evidence/feature-13-export.json` and exported `.thread-quality-fixture.json`: ten synthetic cases, expected marker and ungranted canary are present. `.thread-local/improvements-lab/evidence/network.json` records only loopback interfaces.
- Excluded generated `main.js`, dependencies, distributions, runtime/model/vault contents and unrelated source from code scope; inspected only the specifically referenced ignored evidence/marker files. Review and findings state were excluded from product code scope. Original feature archives are absent from the delta. No finding IDs added, updated or closed; no repair order needed.

## Findings

- None across quality, security, performance and tests; findings ledger remains unchanged.

## Remaining risk

- Ten curated synthetic cases are limited phrase/section/source/status checks, not a broad semantic benchmark. Existing 8/10 model baseline and native section classification errors remain visible; fixing model behavior is outside feature 13.
- Native Obsidian and live model runs were inspected from the recorded evidence, not rerun by this reviewer. The review independently reran Verify and offline evaluation. Check was not required; no attempted verification command was unavailable.
- Linux/Obsidian/Ollama evidence does not establish other-platform/model compatibility or large-vault performance. No network-backed vulnerability scan or runtime profiling was performed; neither is declared as an existing required command for this delta.
