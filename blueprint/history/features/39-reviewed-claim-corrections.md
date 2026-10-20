# Feature: Reviewed claim corrections

**From build-plan:** feature 39
**Build attempt:** 1
**Branch:** `feature/reviewed-claim-corrections`
**Status:** verified

## Goal

Let a person correct an Ask claim's text or classification before explicitly
saving it, while retaining original model output and current evidence provenance.

## In scope

- Native per-claim text/classification editors in the current Ask answer. Keep
  original model wording/type and automatic classification immutable. Label user
  corrections clearly; a human-selected kind is not independent verification.
- Preserve current limits: at most six claims, 1200 characters per claim, known
  fact/interpretation/suggestion values and unchanged citation IDs. Blank/invalid
  edits block preview. Editing never calls the model or modifies source notes.
- Every draft edit, including destination name, revokes earlier previews. Fresh
  previews freeze exact corrected bytes and captured draft revision, with all
  existing settings, dependency, source freshness, collision and write checks.
  Scope/project/source changes, close and cancel discard the affected draft.
- New Ask saves use readable version 1 answer records, including original model
  text/kind, automatic kind, optional final user correction with ISO timestamp,
  generation timestamp/model, gaps, source-ID mapping and existing references.
  Intermediate unsaved keystrokes are not durable history; earlier notes are
  never rewritten. New uncorrected Ask saves use the same versioned format.
- Validate managed answer records before reuse. Unknown/malformed metadata,
  mismatched source IDs, changed canonical managed body or conflicting formats
  fail closed, including altered note type. Index only the current answer/gaps;
  original model/correction history stays readable but out of retrieved text.
  Generated/corrected answers remain AI-derived evidence with dependency checks.
- Preserve legacy answer Markdown/frontmatter compatibility without conversion.

## Out of scope

Conversation/follow-up UI, resaving or editing existing answers, corrections to
Resume, source modification, autonomous saves, semantic truth guarantees, new
permissions, dependencies, services or model downloads.

## Build loop

Continuous Mode, feature review cadence, no step checkpoint commits. Verify each
step. Actual isolated Obsidian/local inference acceptance and fresh independent
review precede archive, local squash merge and separately authorized normal push.

## Build steps

- [x] **Step 1: Versioned correction records and projection.** Add bounded pure
  correction validation and new answer record serialization/parsing. Preserve
  source-ID mapping and model originals; validate reserved record metadata/body
  before other output dispatch. Exclude original-history text from projection.
  **Done when:** round trips, malformed/unknown versions, type changes, citation
  tampering, Markdown injection, CRLF, stale/excluded dependency and legacy
  compatibility regressions pass with Verify.
- [x] **Step 2: Explicit correction controls and renewed previews.** Add native
  Ask editors, clear user labels, draft validation, preview revocation and new
  versioned save output; preserve originals and existing lifecycle behavior.
  **Done when:** actual handlers demonstrate no model call on edit, immutable
  originals, invalid draft blocking, exact renewed preview, prior preview
  refusal, close/cancel/scope/evidence invalidation and collision protection;
  Verify passes.
- [x] **Step 3: Actual Obsidian acceptance and documentation.** Generate with
  real local inference in a new synthetic fixture; correct text/type, inspect
  exact preview, revoke it through edits and source/exclusion changes, then
  explicitly save a fresh preview and confirm bytes and reusable projection.
  **Done when:** native evidence and visible editor capture retained, source and
  prior record bytes preserved, README updated, final Verify passed and complete
  evidence prepared for fresh independent review.

## Files / areas

src/vault/answer-record.ts and tests, src/vault/freshness.ts and tests,
src/ui/ask-modal.ts and tests, existing intelligence answer/types reused;
README.md, scoped styles only if existing primitives are insufficient, Blueprint
records. No dependencies or services.

## Independent-review repair

- [x] **Step 4: F-01/F-02 repair attempt 1.** Require primitive string
  classifications at every stored claim boundary. Correct metadata mutation
  fixtures to preserve exact valid body bytes and require an unchanged passing
  control. Add original/automatic/corrected enum-array rejection regressions.
  **Done when:** Verify and actual Obsidian malformed-record checks pass with
  valid controls; final build/evidence frozen for a fresh full independent review.

## Data / contracts

thread_answer_version "1" plus bounded thread_answer_record JSON and reserved
thread:answer-record body markers distinguish new records. JSON stores
schemaVersion, question, generatedAt, model, ordered sourceIds, claims (original
text/kind/sourceIds, classifiedKind, optional correction text/kind/correctedAt)
and gaps. Source references remain in thread_sources with existing hashes/PDF
provenance. Max 100 unique source IDs, six claims, 12 gaps (1200 characters each),
1000-character question, 500-character model name, 64 KiB record JSON, 1 MiB whole
managed note. ISO timestamps are UTC. Original claims and citations cannot be
edited by the correction UI. Record validation requires canonical rendered body
and exact recognized fields; unsupported manual alterations need a new explicit
save, never an automatic repair. Recognized records project only current reviewed
answer content; stored originals do not become new evidence. Corrected records
still have note type answer and transitive dependency freshness requirements.

## Testing

Baseline main 7f66359ab6b2ff424d0376b3e77a65062a3e201d: final Complete Verify
passed 226 tests, typecheck/build; feature 38 independent review passed. Reuse that
current observed baseline. Logic tests cover the new durable data boundary and
real UI handler tests; actual synthetic Obsidian and local Ollama prove acceptance.
Check is manual by config; independent review selected for durable user data and
write previews. No personal vault access.

## Notes for the AI

First-build identity, archive absence/history and branch availability proven.
Exact archive: blueprint/history/features/39-reviewed-claim-corrections.md.
The approved plan delegates routine format details; no material product decision
is unresolved. Keep scope on a single current Ask answer; do not implement 40/41.

Step 1 Verify: 230 tests, zero failures/skips, typecheck and build passed.
Evidence: .thread-local/continuous-35-plus/evidence/39-step1-verify.log.
SourceReferences now has its actual typed reference/excerpt contract; no runtime
reference format changed for legacy callers.

Step 2 Verify: 231 tests, zero failures/skips, typecheck/build passed. The
existing mocked Ask fixture now specifies its local model name, matching real
inference. Retained initial failure and successful rerun in evidence/39-step2-
verify.log and 39-step2-rechecked-verify.log.

Step 3 actual Obsidian evidence under the ignored run lab/evidence:
- 39-native-edit.json: real qwen3:4b-instruct answer, text/type correction,
  immutable model original and old preview bytes; disabled stale preview wrote
  nothing. Existing action labels preserved.
- 39-claim-editor-visible.png and 39-claim-editor-dark.png visually inspected:
  native controls, readable labels, original output and corrected claim.
  39-keyboard.json records Tab from claim text to note name with solid focus
  outline. Initial unscrolled screenshot retained separately.
- 39-native-save.json: source change and exclusion revoke correction/save
  previews; renewed exact save matched 2124 preview bytes, canonical record
  indexed successfully with history excluded, collision refused, source bytes
  and all nine prior synthetic notes preserved. Original saved scope restored.

Limitations: corrections express user judgment, not verified facts. Only the
final unsaved correction per claim is retained at explicit save; no edit to an
existing answer, no correction workflow in Resume and no conversation yet.
Manual changes to canonical managed record content fail closed for reuse.

Final Verify: 231 tests, zero failures/skips, strict typecheck and production
build passed (evidence/39-final-verify.log). Final installed assets match the
verified build (lab/evidence/39-installed-build.json).

Review repair attempt 1 for F-01/F-02: primitive string enum checks and exact
unchanged metadata-test control; array/object/null cases for all three stored
classifications now tested. Verify passed 232 tests, typecheck/build, zero
failures/skips (evidence/39-review-repair-final-verify.log). Actual Obsidian
lab/evidence/39-malformed-native.json shows valid control reuse and rejection
of all three array-enum records with zero indexed chunks, unchanged original
answer and restored scope. Repaired assets match 39-repaired-installed-build.json.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9155,"specSha256":"3712770eeea7cb8b18b586969a4c16d6a803000fdcf4f93954c98665738b118e","branch":"refs/heads/feature/reviewed-claim-corrections","head":"d1dd1c69d0a462a4f6a75c54cd7abe47363471c4","baseRef":"refs/heads/main","baseCommit":"7f66359ab6b2ff424d0376b3e77a65062a3e201d","sourceTree":"ef6390bf8bd012f6c178bd7e9bd6209ee3eff964","landing":"local-merge","absentOptional":[]} -->

## Findings

### 39/F-01 [P1] closed - Reject non-string claim classifications before durable record reuse

**File:** src/vault/answer-record.ts:27
**Found:** 2026-10-20 by /audit (scope: current; lenses: quality, security, tests)
**Why it matters:** The new persisted-data boundary tests classifications through `String(value)`. JSON arrays such as `["fact"]` and `["suggestion"]` therefore pass as known classifications and are returned unchanged by `validateAnswerRecord` and `validateCorrection`. Replacing the original, automatic and correction classifications in a saved note's JSON with these arrays leaves the canonical body byte-for-byte unchanged, so `outputProjection` still returns `invalid: false` and reusable answer text. This violates the feature's explicit requirement that malformed managed metadata fail closed and creates durable values outside the declared version 1 scalar schema. The independent read-only probe confirms this with real frontmatter parsing; see `.thread-local/continuous-35-plus/evidence/39-independent-validation.json`.
**Suggested fix:** Require `typeof value === "string"` before testing the three literal values. Add persisted-note regressions for array/object/null classifications in original, automatic and correction fields; keep the canonical body unchanged and verify reuse is refused.
**Resolution:** Closed on 2026-10-20 by fresh independent Codex gpt-6.1-sol review of d1dd1c69d0a462a4f6a75c54cd7abe47363471c4. The shared kind guard now requires a primitive string before checking literal values, covering original, automatic and correction classifications. Full Verify passed 232 tests. An independent probe reconstructed the retained valid native record byte for byte, then changed only metadata for all nine array/object/null classification cases; every case returned invalid provenance, empty text/ranges and zero indexed chunks. Inspected native valid/malformed controls independently confirm valid reuse and rejection of all three enum-array records. Evidence: .thread-local/continuous-35-plus/evidence/39-independent-r2-validation.json and lab/evidence/39-malformed-native.json. No defect introduced by this repair was found.

### 39/F-02 [P2] closed - Preserve the canonical body in metadata mutation tests

**File:** src/vault/answer-record.test.ts:53
**Found:** 2026-10-20 by /audit (scope: current; lens: tests)
**Why it matters:** The extracted `body` retains the blank line after the closing frontmatter delimiter, while `frontmatter(...)` already emits that blank line. Recombining them at line 63 adds an extra newline before the managed record. Every metadata-mutation case is consequently rejected for changed canonical contents, even if its intended metadata validation is broken. A control reconstruction with no mutation also returns `invalid: true`; removing the extra newline returns `invalid: false`. The suite therefore does not establish its advertised end-to-end rejection of unknown versions, changed types, source mapping, conflicting formats or model provenance. The independent probe records both control results in `.thread-local/continuous-35-plus/evidence/39-independent-validation.json`.
**Suggested fix:** Replace only the intended frontmatter field, or extract the body without duplicating the separator newline. Add an unchanged reconstruction control that must remain valid before running the mutation cases.
**Resolution:** Closed on 2026-10-20 by fresh independent Codex gpt-6.1-sol review of d1dd1c69d0a462a4f6a75c54cd7abe47363471c4. The extracted body now removes the single separator newline before frontmatter reconstruction. The unchanged control asserts exact original bytes and valid projection before metadata mutation cases; classification cases separately assert an unchanged managed body. Full Verify passed 232 tests. An independent reconstruction from the retained native valid record also passed with identical bytes, and metadata-only malformed cases failed as intended. Evidence: .thread-local/continuous-35-plus/evidence/39-independent-r2-validation.json and 39-independent-r2-verify.log. No defect introduced by this repair was found.

Repair evidence for both findings: primitive string validation; nine malformed
array/object/null cases across all three classification fields; unchanged valid
control reconstructs identical bytes. Verify passed 232 tests, typecheck/build
(evidence/39-review-repair-final-verify.log). Actual Obsidian accepts the valid
control and refuses all three enum-array records with no indexed chunks
(lab/evidence/39-malformed-native.json); prior answer preserved, scope restored.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** d1dd1c69d0a462a4f6a75c54cd7abe47363471c4
**Base commit:** 7f66359ab6b2ff424d0376b3e77a65062a3e201d
**Base ref:** refs/heads/main
**Spec hash:** 3712770eeea7cb8b18b586969a4c16d6a803000fdcf4f93954c98665738b118e
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T18:18:51.489827+00:00
**Workflow:** continuous
**Check required:** no


**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T18:21:48.363491+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; strict typecheck, 232 tests, zero failures/skips/todos, production build. Loopback test permission enabled. Log: `.thread-local/continuous-35-plus/evidence/39-independent-r2-verify.log`.
- `git diff --check 7f66359ab6b2ff424d0376b3e77a65062a3e201d..d1dd1c69d0a462a4f6a75c54cd7abe47363471c4`: pass.
- Target/base/spec and working-tree preflight: pass; exact HEAD, refs/heads/main merge base and raw spec SHA-256 match the request. Only review/findings differ from the target.
- Independent Node persisted-record probe: pass; exact valid reconstruction plus nine metadata-only malformed classification cases rejected, with no reusable text/ranges or indexed chunks.
- SHA-256 comparison of rebuilt and installed native `main.js`/`styles.css`: pass; matches `39-repaired-installed-build.json`.
- Focused search of changed tests: no skipped, focused or placeholder tests found.

## Evidence

- Complete feature delta reviewed from `7f66359ab6b2ff424d0376b3e77a65062a3e201d` through `d1dd1c69d0a462a4f6a75c54cd7abe47363471c4`, against the verified active spec and repository standards. Reviewed every changed product/test/documentation path: `README.md`, `src/intelligence/answer.ts`, `src/ui/ask-modal.ts`, `src/ui/ask-modal.test.ts`, `src/vault/answer-record.ts`, `src/vault/answer-record.test.ts`, `src/vault/freshness.ts`, `styles.css`.
- Followed affected lifecycle, save, retrieval and freshness boundaries in `src/main.ts`, `src/ui/thread-modal.ts`, `src/ui/new-note-modal.ts`, `src/vault/new-notes.ts`, `src/vault/workspace.ts`, `src/vault/evidence.ts`, `src/vault/index.ts`, `src/vault/selection.ts`, `src/intelligence/claims.ts` and nearby regression tests. Reviewed strict persisted validation, immutable originals, escaped rendering, exact body/source mapping, history exclusion, bounded record work, stale/settings/scope/cancel revocation and collision checks.
- Inspected retained actual Obsidian/local qwen3:4b-instruct reports under `.thread-local/continuous-35-plus/lab/evidence/`: `39-native-edit.json`, `39-native-save.json`, `39-keyboard.json`, `39-malformed-native.json`, `39-installed-build.json`, `39-repaired-installed-build.json`. Reports cover correction without inference, frozen/revoked previews, source/exclusion revocation, exact 2124-byte save, history exclusion, collision refusal, preservation and restored scope. Repaired native control indexes three chunks; all three enum-array controls index zero.
- Visually inspected native `39-claim-editor-visible.png` and `39-claim-editor-dark.png`: readable correction/original labels, native editor controls and visible keyboard focus in both themes.
- Independent probe retained at `.thread-local/continuous-35-plus/evidence/39-independent-r2-validation.json`; uses the actual retained native valid fixture and proves the managed body is unchanged in all nine classification mutations.
- Applied `AGENTS.md`, coding standards, verified spec and project-local Audit/independent-review contracts. Dependencies, generated bundle/output, unrelated source and previous features were excluded from code scope; installed generated assets were inspected only as runtime evidence. Review/findings records were excluded from product-code review.

## Findings

- No new findings across quality, security, performance or tests in the complete current feature delta.
- F-01 closed: primitive string classifications independently proven at all three persisted boundaries, with exact-body malformed controls and native evidence.
- F-02 closed: unchanged reconstruction control is byte-identical and valid; metadata mutations no longer fail because of an extra body newline.
- No open or fixed P0/P1 findings remain. No findings accepted or checks waived. Suggested repair order: none.

## Remaining risk

- Native UI/local inference acceptance was inspected from retained synthetic-vault reports and screenshots, rather than replayed in this reviewer session. The rebuilt repaired assets match the installed native assets, and the malformed persisted-data boundary was independently rerun.
- No lint, browser-test, dedicated security scanner or performance benchmark command is configured. No network-backed dependency audit or large-vault profiling was performed; source and bounded-work review is not a vulnerability scan or performance guarantee.
- User classifications remain judgments, not independent factual verification. Only the final correction is durable, as specified.

## Try it now

Run or do:
1. In an already permitted synthetic project, open Ask, retrieve evidence and generate a supported local answer.
2. Expand Edit claim 1, change its wording or classification, and inspect the original model text beside the correction.
3. Choose Preview answer note. Inspect the exact Markdown and original-output provenance, then Cancel to leave notes unchanged.

Expected:
- The corrected claim is labelled User correction. Original text, model classification and citations remain available.
- The preview contains the reviewed answer and its provenance. Editing the draft revokes an older preview and requires a new one.

This proves:
- Explicit correction is separate from model generation and does not silently save or verify a claim.
