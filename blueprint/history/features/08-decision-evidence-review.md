# Feature: Decision evidence review

**From build-plan:** feature 8
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/decision-evidence-review`

## Goal

Review later evidence against an existing project decision, keeping model observations separate from user choices and preserving earlier reasoning.

## In scope

Explicit decision/evidence selection, cited local assessment, retain or annotate by appended review, explicit user-authored supersession through the existing reviewed batch workflow.

## Out of scope

Automatic decision acceptance, proof of logical contradiction, automatic source discovery outside scope and rewriting complex legacy YAML.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Decision review records** - Implement review annotations and property-preserving status supersession with focused tests. *Done when:* Tests show retained choices, unchanged custom properties, explicit replacement and refusal of ambiguous frontmatter; Verify passes.
- [x] **Step 2 - Evidence review workflow** - Add native source/decision selection, local assessment and explicit retain/annotate/supersede proposals. *Done when:* Grounded observations cite selected evidence, inputs and sources invalidate pending generation, and only reviewed changes write notes.
- [x] **Step 3 - Runtime acceptance** - Demonstrate retain, annotate and supersede with synthetic notes in Obsidian. *Done when:* Real local inference flags uncertainty, original reasoning survives all actions, a replacement is explicitly accepted and Verify plus independent review pass.

## Files / areas

Decision review logic/tests, native decision evidence modal, main/sidebar commands.

## Data / contracts

Only explicitly selected readable project decisions and evidence enter inference. File modification/capture dates are clues, not proof of event dates. All AI observations are interpretations with valid source IDs; they do not change decision status. Retain and annotate append dated records. Supersede requires explicit replacement question, choice and rationale; creates a new accepted decision and updates only a conventional top-level scalar status on the old record, preserving its other bytes and linking the replacement. Ambiguous/complex YAML fails with an actionable message. All writes use exact before/after proposals, durable recovery and guarded undo from feature 7. Replacement is created before old decision update. Source/settings guards remain active through proposal persistence and apply.

## Testing

Focused status/annotation tests, real Obsidian with local qwen3:4b and synthetic later evidence, all three actions, source preservation and guarded undo. Verify and fresh full independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Verification observed

- `npm run verify` passed: strict typecheck, 15 test files and production build. Pure cases cover ambiguous/duplicate statuses, custom property and CRLF preservation, retained history and removal of prior model reviews from comparison evidence.
- `.thread-local/test-08.js` and `evidence/feature-08.json`: actual Obsidian 1.14.4 plus isolated Ollama 0.40.4, qwen3:4b-instruct. All three native actions matched exact previews; retain/annotate preserved all original bytes, supersede created an explicitly accepted replacement and preserved the old body, and selected source stayed unchanged. Observations identified the two-person voice preference, unchanged API budget and small-sample uncertainty. Citation existence does not prove semantic entailment.
- `.thread-local/test-08-boundaries.js` and `evidence/feature-08-boundaries.json`: cancellation leaves no assessment/proposal; undo refuses a later edit, which the synthetic test then explicitly restores.
- Candidate `qwen3:4b` gave inconsistent structured prose, including task echoes. The explicit `qwen3:4b-instruct` variant was downloaded under the user's isolated-model authorization and passed the semantic case. Earlier synthetic trial notes are retained; no personal vault was used.

## Try it now

In a test vault, select an allowed project and run **Thread: Review decision evidence**. Choose an accepted decision and a later evidence note, then **Assess selected evidence**. Expect labeled interpretations and gaps, with no file changes. Enter your reasoning and choose **Retain current choice**, then **Preview decision action**. Inspect exact Before/After text; applying appends a dated review while keeping the choice and properties. Supersede additionally requires your replacement fields and previews two notes.

## Limits

Selection is explicit; dates do not prove event order. Very large decision histories can exhaust the bounded evidence budget, requiring smaller input notes. Complex legacy status YAML requires manual normalization. Reviews, partial recovery and guarded undo use feature 7's documented boundaries and last-20-batch limit.

## Independent review repair

F-01 (P1), repair attempt 1: reject continued YAML status scalars, require native parsed domain status before supersession and verify exact parsed superseded result. Focused continuation/comment/blank-line regressions plus native Obsidian parser/preview proof required before fresh full review.

Repair verification: `npm run verify` passed. `.thread-local/test-08-yaml.js` / `evidence/feature-08-yaml.json` confirms actual native parsed `accepted pending validation`, refusal before proposal persistence and unchanged original; this parser regression bypasses model latency only. `.thread-local/test-08-repaired.js` / `evidence/feature-08-repaired.json` reran all three normal actions with real qwen3:4b-instruct, exact writes, uncertainty and source preservation; all passed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6142,"specSha256":"c329a6c611a01eba9bbccd8ec44a5b9d9d11790f4ec0d28e4a9ed119e117dd96","branch":"refs/heads/feature/decision-evidence-review","head":"0c80c4f52a1f7dd05b3138eff08b55353c7bacc3","baseRef":"refs/heads/main","baseCommit":"e8516cbe8ddb3697a5db27e1287b2c1914148c04","sourceTree":"4062337acedd0a75509d19ffeca9abb7fd2ee2fe","landing":"local-merge","absentOptional":[]} -->

## Findings

### 8/F-01 [P1] closed - Reject continued YAML status scalars before supersession

**File:** src/vault/decision-review.ts:39
**Found:** 2026-10-15 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `supersededStatus` checks only the first status line. A readable legacy decision with `status: accepted` followed by `  pending validation` is offered by the modal because selection checks `type: decision`, not status. The helper accepts this complex plain scalar and changes the first line to `status: superseded`, retaining the continuation. The resulting YAML status is `superseded pending validation`, rather than `superseded`. The reviewed batch can therefore create an accepted replacement without actually superseding the old record. This violates the explicit complex-YAML refusal and status-update contract. A direct invocation reproduced the rewrite; installed Python YAML parsed the original and result as `accepted pending validation` and `superseded pending validation` respectively.
**Suggested fix:** Reject a status scalar with continuation content and require manual normalization, preserving other bytes. Add a regression for plain multiline status, including blank/comment intervening lines, and verify accepted conventional statuses still preserve custom properties and CRLF. Validate the parsed status with the host YAML parser where available.
**Resolution:** Closed by fresh independent review at checkpoint `0c80c4f52a1f7dd05b3138eff08b55353c7bacc3`. The modal now checks native parsed accepted/proposed status before transformation and exact parsed superseded status afterward. The helper independently refuses indented continuations across blank/comment lines. Verify and separate inline Node probes passed continuation refusal and exact custom-property/CRLF preservation. Inspected native Obsidian parser/preview regression script and receipt confirm parsed `accepted pending validation`, refusal before persistence and unchanged source. The parser test discloses model bypass; the separately inspected repaired normal-flow script/receipt use real qwen3:4b-instruct for all three actions. No regression in the repaired code was confirmed.

## Latest independent audit

- Scope: current; complete `e8516cbe8ddb3697a5db27e1287b2c1914148c04..0c80c4f52a1f7dd05b3138eff08b55353c7bacc3`, base ref `main`, merge base and exact spec SHA-256 verified. All quality, security, performance and tests lenses covered the full delta from scratch.
- Ledger changes: closed F-01 after independent confirmation; no new findings. No remaining repair order.
- Reviewed: all five changed product/test files plus tracked active spec; existing findings/review records were context, not scope. Followed ThreadModal, knowledge modal, decision serialization, evidence construction/native metadata parsing, index/project eligibility, answer validation/escaping, Ollama boundaries, main source/settings guards and ChangeManager proposal/apply/recovery/undo contracts.
- Standards: strict TypeScript, native accessible controls, escaped model output, explicit scoped selection, bounded loopback inference and cancellation, explicit user action, property-preserving writes, exact previews, durable recovery and guarded undo. No confirmed additional quality, security, performance or test findings.
- Commands: `npm run verify` passed typecheck, all 15 test files (zero failed/skipped/todo) and production build. `git diff --check e8516cbe8ddb3697a5db27e1287b2c1914148c04..HEAD` passed. Separate inline `node --experimental-strip-types --input-type=module` assertions passed continuation refusal (including blank/comment lines) and exact accepted/proposed CRLF/custom-property preservation. Targeted test search found no focused, skipped or placeholder cases in the new tests.
- Evidence inspected: `.thread-local/test-08.js`, `test-08-boundaries.js`, `test-08-yaml.js`, `test-08-repaired.js` and all four matching `.thread-local/evidence/feature-08*.json` receipts. Inspected only named synthetic continued-YAML, repaired decision/replacement and later-evidence notes. Native parser wiring is actual `parseYaml` through plugin index and preview; the YAML regression bypasses model latency only. Repaired normal flow uses real qwen3:4b-instruct, reports exact applied contents, preserved reasoning, accepted replacement and unchanged evidence. Existing boundary proof covers cancellation and later-edit undo refusal.
- Excluded: dependencies, generated bundle, caches, unrelated artifacts and personal data. Synthetic scripts were inspected, not rerun, because they mutate the vault. This pass ran no live Obsidian/Ollama session and claims no new live host observation.
- Remaining signal limits: recorded runtime evidence rather than a fresh UI/model execution; Linux synthetic-vault coverage only. Model output can still echo questions in gaps or infer beyond passages; visible interpretation labels and human review remain necessary, and citation identity is not semantic proof. No configured standalone security scanner, performance profiler, lint or CI; source review and available Verify are the signals used. No verification command attempted was unavailable.
- Independent receipt: passed for `0c80c4f52a1f7dd05b3138eff08b55353c7bacc3`, codex / gpt-6.1-sol, actual automatic, fresh subagent without builder transcript. Check not required by the unchanged original request.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 0c80c4f52a1f7dd05b3138eff08b55353c7bacc3
**Base commit:** e8516cbe8ddb3697a5db27e1287b2c1914148c04
**Base ref:** main
**Spec hash:** c329a6c611a01eba9bbccd8ec44a5b9d9d11790f4ec0d28e4a9ed119e117dd96
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T21:15:52.487785+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T21:17:28.917077+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, `sha256sum blueprint/context/current-feature.md`: pass; exact target/base/spec and permitted-only dirty paths verified.
- `npm run verify`: pass; typecheck, all 15 test files (zero failed/skipped/todo), production build.
- `git diff --check e8516cbe8ddb3697a5db27e1287b2c1914148c04..HEAD`: pass.
- Inline `node --experimental-strip-types --input-type=module` assertions: pass; continued-scalar refusal across comments/blanks and exact conventional accepted/proposed CRLF/property preservation.
- Targeted `rg` and source/diff/evidence reads: completed; no focused/skipped/placeholder new tests found.

## Evidence

- Reviewed complete base-to-target delta, all changed product/test files, exact active spec, and relevant modal, decision, evidence, index, answer, inference, source/settings and reviewed-change dependencies. Findings/review records were context, not the review checklist.
- Inspected `.thread-local/test-08.js`, `test-08-boundaries.js`, `test-08-yaml.js`, `test-08-repaired.js` and matching `.thread-local/evidence/feature-08.json`, `feature-08-boundaries.json`, `feature-08-yaml.json`, `feature-08-repaired.json`.
- Independently inspected named synthetic continued-YAML, repaired original/replacement and later-evidence notes. Recorded native parser/preview regression confirms parsed continued status, refusal before persistence and original preservation. Model bypass is limited to the parser regression; repaired normal actions use real qwen3:4b-instruct and report exact previews/applied content, uncertainty, original reasoning and unchanged evidence.
- Fresh automatic isolated reviewer received only the handoff and project-local instructions, without builder transcript. Product/tests/spec/config stayed frozen; only findings/receipt and ignored helper activity written.

## Findings

- F-01 [P1] closed after independent repair confirmation. No new confirmed findings across quality, security, performance or tests.

## Remaining risk

- Runtime evidence inspected rather than rerun; synthetic scripts mutate the vault, and no fresh live host/model execution is claimed. Recorded runtime proof covers the Linux synthetic vault, not other platforms or independent keyboard/theme revalidation.
- Model semantics remain fallible: some recorded gaps echo task questions; interpretation labels, uncertainty and human review are still necessary. Valid citation identity alone does not prove semantic support.
- No configured standalone security scanner, performance profiler, lint or CI. No attempted verification command was unavailable. Dependencies/generated bundle/caches, unrelated local artifacts and personal data excluded.
