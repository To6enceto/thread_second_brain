# Feature: Claim classification and quality regressions

**From build-plan:** feature 38
**Build attempt:** 1
**Branch:** `feature/claim-classification-and-quality-regressions`
**Status:** verified

## Goal

Separate recorded statements, AI interpretations and proposed actions, especially
when a recorded postponement is mistakenly labelled as a new suggestion.

## In scope

- Keep legacy kind values fact/interpretation/suggestion and existing saved
  output compatible. Display their meaning as Recorded statement, AI
  interpretation and Proposed action, with explicit limits on verification.
- Classify a complete quoted statement from known source metadata/recognized
  project/session structure as a recorded statement. Compare complete lines or
  sentences with whitespace/case normalization, never substring/token overlap
  that could remove negation. Unknown/generated source kinds are conservative.
  Unmatched model-labelled facts become interpretations; genuinely new suggested
  actions remain suggestions. Preserve the original model kind when changed.
- Known note metadata/status accompanies cited decision claims in Ask/save
  output; proposed/superseded records never become accepted merely by the label.
  Exact quotes establish what was recorded, not truth or semantic entailment.
- Strengthen Answer/Briefing prompts and validation. Recorded quotes must not be
  forced into Resume's proposed-action section. Preserve recorded-first Resume,
  current evidence IDs, scopes, context budgets, cancellation and source checks.
- Extend the existing synthetic evaluation fixtures for recorded postponements,
  accepted/proposed/superseded decision status, unsupported interpretations and
  genuine recommendations. Keep references/negative controls and model reports
  separate. Collect actual local quality results and report observed failures.

## Out of scope

User corrections, conversations, new saved-record schema/migrations, embeddings,
semantic truth verification, changed grants, autonomous writes or paid models.

## Build loop

Continuous Mode uses feature review cadence and no step commits. Verify after
steps, actual synthetic Obsidian/local inference acceptance, immutable checkpoint
and fresh independent review, then archive/local squash and authorized push.

## Build steps

- [x] **Step 1: Shared classification and validation.** Add bounded source-aware
  classification, original-kind retention, decision context, prompt guidance and
  Answer/Briefing validation without changing legacy kind values.
  **Done when:** exact postponement, paraphrase, negation, generated/unknown source,
  decision status and next-action placement regressions pass; Verify passes.
- [x] **Step 2: Labels and reusable quality cases.** Use clear labels in native
  claim surfaces and new answer Markdown; show recorded decision status alongside
  cited claims. Add independent curated references/negative controls and document
  the conservative classification limits.
  **Done when:** offline evaluator references pass and each negative control is
  rejected, existing saved-output compatibility checks pass, Verify passes.
- [x] **Step 3: Live quality and native acceptance.** Collect all synthetic cases
  through the real local model; inspect actual Ask/Resume classifications and
  decision labels in Obsidian, with source/exclusion invalidation unchanged.
  **Done when:** actual reports/screen evidence retained, reference validation and
  final Verify pass, any local-model limitations reported without waived checks
  or a claim of general factual/semantic correctness.

## Files / areas

src/intelligence/claims.ts and tests, answer.ts, briefing.ts and tests;
src/ui/ask-modal.ts, briefing-view.ts, selection-modal.ts; evaluation/fixtures.json,
evaluation/README.md and existing quality tests; README.md and Blueprint records.
No new dependencies or runtime services.

## Independent-review repair

- [x] **Step 4: F-01 repair attempt 1.** Require proof of complete original
  excerpt boundaries before quote promotion. Carry conservative partial-source
  information through search windows and selected-text evidence, and refuse
  promotion when evidence/context/index clipping or unknown boundaries apply.
  **Done when:** real evidence-builder regressions cover trailing question and
  qualifier clipping, leading focused windows, index windows and selections;
  complete original statements still classify correctly; Verify, offline
  evaluation and relevant actual Obsidian acceptance pass, then fresh review.

F-01 repair evidence: evidence/38-f01-repair-verify.log (226 tests, zero failures
or skips, typecheck/build), evidence/38-f01-offline-quality.log (15 references
and negative controls pass). lab/evidence/38-f01-native.json repeats real local
Ask/Resume and decision-status acceptance on the repaired build;
38-f01-boundary-native.json proves a model-labelled fact from clipped indexed
text becomes AI interpretation, with original kind retained, and records
restored scope and unchanged Welcome note. The conservative guard requires a
whole original section: it may reject valid interior quotes in partial passages
or selections. No context budgets, grants, persistence or write checks relaxed.
Affected boundary producers also include src/vault/evidence.ts, index.ts,
selection.ts, src/ui/decision-modal.ts and questions-modal.ts. The new Evidence
excerptComplete marker is transient context metadata, not a saved record schema.

## Data / contracts

Claim.kind keeps fact/interpretation/suggestion. An optional in-memory modelKind
retains the original validated model classification when normalization changes it;
text and sourceIds remain original except existing section/status formatting.
No new stored correction record is introduced until feature 39. Known source
metadata and recognized heading/property context limit recorded classification;
previous generated answers never acquire recorded authority just by quotation.
Quoted records, citation identity and decision status are not verified truth.
Interpretations/proposals still require supporting citations; semantic support
needs human review and the curated evaluation cannot establish it generally.
Existing saved notes/frontmatter and raw kind values remain readable/usable.

## Testing

Baseline main 0556a7033877f203721d87612c404f6afcc5fe01: 217 tests, typecheck/build,
feature 37 review and Complete passed. Before-change live qwen3:4b-instruct
collection: 11/11 existing curated cases passed, no infrastructure errors;
.thread-local/continuous-35-plus/evidence/38-before-quality.json. This is one
synthetic sample, not a claim about unseen notes or deterministic model quality.
Use the ordinary offline Verify/evaluation harness and actual isolated synthetic
Obsidian/Ollama. No personal vault scanning. Independent review selected because
claims/structured output feed durable saves; native acceptance required by user.

## Notes for the AI

First build/archive/ref collision checks passed for feature 38. Exact archive:
blueprint/history/features/38-claim-classification-and-quality-regressions.md.
Keep model-quality findings distinct from software gate failures; never change a
curated expectation merely to make a model pass. No material product questions.

Step 1 Verify passed after updating two old tests that expected forced suggestion
labels. Both now assert that repeated records are omitted and genuinely proposed
steps remain, including Session's shared Briefing validator. This changes the
approved classification behavior, not the source/write contract. Retained logs:
38-step1-verify.log (old expectations failed), 38-step1-rechecked-verify.log (222
passed, zero failures/skips, typecheck/build). Session test is an affected caller.

Step 2: npm run verify passed (223 tests, typecheck/build); npm run evaluate
passed all 15 authored references and rejected all negative controls. Legacy
kind values and source provenance remain; decision/model context Markdown tested.

Step 3 evidence and limits (all paths relative to the ignored run directory):

- evidence/38-after-quality.json: first expanded live run 13/15, no infrastructure
  errors. Exact two-sentence quotes were too restrictive; complete-line matching
  was repaired with a regression. The decision fixture also exposed paraphrases.
- evidence/38-refined-quality.json: real qwen3:4b-instruct 14/15, no infrastructure
  errors; all 11 original cases pass. One new exact-recorded-decision fixture
  still fails because two model paraphrases remain interpretations. The fixture
  expectation was not relaxed. Model collection is a report, not the offline
  harness acceptance gate or a claim of complete semantic correctness.
- Later self-review preserved question punctuation during exact matching and
  added a regression against turning a recorded question into an assertion.
  Session matches exclude generated context after the user-report delimiter.
- evidence/38-final-verify.log: strict typecheck, 224 tests, zero failures/skips,
  production build. evidence/38-final-offline-quality.log: all 15 references and
  negative controls pass with the final validator.
- lab/evidence/38-fixtures.json: newly authored synthetic notes, no automatic
  grant from creating them. 38-native-inference.json and 38-native-labels.png:
  real local Ask/Resume; postponement shown as a record, no repeated postponement
  in nextActions, original decision statuses beside claims. Screenshot inspected.
- 38-native-save.json: source change revoked answer and exact preview; a fresh
  explicit save exactly matches preview bytes; exclusion revoked the answer.
  Source bytes restored and one new synthetic answer retained as acceptance data.
- 38-final-native.json: final build real local Ask/Resume acceptance repeated
  after punctuation refinement. Explicit native type filters select original
  authored project/decision records, excluding the earlier saved answer from
  this fixture. 38-final-restored.json confirms original scope, Welcome bytes and
  open note tabs preserved. 38-installed-build.json binds final assets.

Limitations: exact quote classification is deliberately conservative; valid
paraphrases remain interpretations, unusual Markdown may not match, and no
citation/quote/status check verifies truth. Native Resume can still produce
uncertain deductions; its AI block stays separate from recorded context. No
user correction or write authority was added. Original reports remain intact.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10485,"specSha256":"b51fb020246245a2812572ad5f3a1e7cdcc0ad4a464e9853557183f6df775ff4","branch":"refs/heads/feature/claim-classification-and-quality-regressions","head":"2403c348022ed0082d76b0ecd17681fa0bc555f3","baseRef":"refs/heads/main","baseCommit":"0556a7033877f203721d87612c404f6afcc5fe01","sourceTree":"496844c218126c1c991c143498275f064eadf11f","landing":"local-merge","absentOptional":[]} -->

## Findings

### 38/F-01 [P1] closed - Clipped excerpt boundaries can promote an incomplete question to a recorded statement

**File:** src/intelligence/claims.ts:29
**Found:** 2026-10-20 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The matcher treats every excerpt boundary as a complete line/sentence boundary, but `buildEvidence` can clip a passage at an arbitrary character (`src/vault/evidence.ts:196` and `:221`). A direct reproduction with a known `source` note containing `'x'.repeat(3980) + '\nVoice is affordable?'` produces a truncated 4000-character excerpt ending in `Voice is affordable`, with its question mark omitted. `classifyClaim({text:'Voice is affordable',kind:'suggestion',sourceIds:['S1']}, bundle)` then returns `kind:'fact', modelKind:'suggestion'`. This contradicts the complete-statement and question-punctuation contract, displays the assertion as a Recorded statement in Ask, and can carry that label into a saved answer. The existing punctuation regression uses an untruncated excerpt and misses this path.
**Suggested fix:** Require evidence that a candidate's start and end are original line/sentence boundaries before promoting it. Conservatively keep candidates touching potentially clipped excerpt edges as interpretations or suggestions; a small boundary marker retained during excerpt selection can preserve complete interior quotes without increasing context budgets. Cover trailing question/qualifier clipping and leading clipping in a regression using real `buildEvidence`, while retaining the current exact complete-statement cases.
**Resolution:** Repair attempt 1: require explicit complete-excerpt provenance
from the evidence builder. Context clipping and raw-note bounds mark excerpts
incomplete; index windows require a whole retained section, and selected/copied
fragments remain partial. Unknown boundary provenance cannot promote a model
claim. Conservative refusal includes complete interior quotes of partial
passages, documented as a limitation. Real builder/index/selection regressions
cover this reproduction, trailing qualifiers, raw-note limits, focused windows,
leading negation clipping and merged chunks, while complete sections still work.
Verify passed 226 tests, typecheck/build; offline evaluation passed. Actual
Obsidian/local inference reproduced the model's clipped "Voice is affordable"
fact and showed it as AI interpretation with original model kind retained.
Evidence: ignored continuous-35-plus/evidence/38-f01-repair-verify.log,
38-f01-offline-quality.log and lab/evidence/38-f01-native.json,
38-f01-boundary-native.json. Awaiting full fresh independent review.


Independent re-review on 2026-10-20 (Codex gpt-6.1-sol, fresh automatic
subagent) reviewed the complete 0556a7033877f203721d87612c404f6afcc5fe01..
2403c348022ed0082d76b0ecd17681fa0bc555f3 delta across all four lenses,
including claims.ts, evidence.ts, index.ts and every affected partial-text
producer. The original real buildEvidence reproduction returns a 4000-character
excerpt with excerptComplete false and classifies the model fact as
interpretation with modelKind fact. A complete question still matches only with
its punctuation. The repair's real builder/index/selection regressions pass;
whole sections remain eligible and unknown/partial boundaries fail closed.
No new defect was found in the repair. Independently rerun Verify passed all
226 tests (zero failures/skips), typecheck and production build; offline
evaluation passed all 15 references and rejected negative controls. Inspected
38-f01-native.json and 38-f01-boundary-native.json confirm actual Obsidian/local
inference behavior. F-01 is explicitly closed. Independent command logs:
.thread-local/continuous-35-plus/evidence/38-r2-independent-verify.log and
38-r2-independent-evaluate.log. Final 38-boundary-quality.json reports 14/15
with zero infrastructure errors; one decision paraphrase remains an
interpretation, a disclosed model-quality limitation rather than the repaired
clipping defect.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 2403c348022ed0082d76b0ecd17681fa0bc555f3
**Base commit:** 0556a7033877f203721d87612c404f6afcc5fe01
**Base ref:** refs/heads/main
**Spec hash:** b51fb020246245a2812572ad5f3a1e7cdcc0ad4a464e9853557183f6df775ff4
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T17:57:46.219376+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T18:00:32.012696+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, 226 tests, zero failures/skips, production build. Existing loopback test binding ran with escalation. Log: .thread-local/continuous-35-plus/evidence/38-r2-independent-verify.log.
- `npm run evaluate`: pass; 15 authored references passed and curated negative controls rejected. Log: .thread-local/continuous-35-plus/evidence/38-r2-independent-evaluate.log.
- `node --experimental-strip-types --input-type=module` (inline independent F-01 reproduction): pass; real buildEvidence clips the question to 4000 characters but marks it incomplete; model fact becomes interpretation/modelKind fact. Complete question retains recorded classification only with punctuation.
- `git diff --check 0556a7033877f203721d87612c404f6afcc5fe01 HEAD`: pass.
- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1`: pass; exact target/base/spec match and only permitted review/ledger differences.

## Evidence

- Complete base-to-target feature delta reviewed fresh across quality, security, performance and tests, excluding review/findings from product scope. Reviewed all changed intelligence validators/prompts/tests, native UI labels/context, evidence/index/selection boundary producers, session caller regression, evaluation fixtures/docs and README. Followed affected callers in main.ts, recorded.ts, workbench.ts, sections.ts, freshness.ts and the quality evaluator. Applied AGENTS.md, coding standards, overview, active spec and AI interaction rules.
- Claims retain legacy kinds and original modelKind on classifier adjustment; known source/structure checks and complete-excerpt provenance gate promotion. Citation/status checks do not claim semantic truth. Source text and decision statuses use native text DOM or Markdown escaping. Existing bounded source/context/search loops remain; no new dependency, network endpoint, read grant, persistence schema or write authority.
- F-01 repair independently confirmed in real builder reproduction and builder/index/selection regressions, including leading/trailing clipping, missing provenance and complete-section positive cases. No new repair defect found. No skipped, focused or placeholder tests found in changed test files; Verify reports zero skips/todos.
- Inspected ignored .thread-local/continuous-35-plus/lab/evidence/38-f01-native.json and 38-f01-boundary-native.json: actual qwen3:4b-instruct Ask/Resume, recorded postponement, decision statuses and clipped model fact displayed as AI interpretation with original fact kind; restored scope/Welcome content retained.
- Inspected 38-native-labels.png, 38-native-save.json and 38-final-restored.json in that native evidence directory: actual Obsidian labels/status text, changed-source preview/answer revocation, exact fresh save, exclusion revocation and restored scope/open notes. Native acceptance was inspected from retained artifacts rather than rerun by this reviewer.
- Inspected retained live reports 38-before-quality.json (11/11), 38-after-quality.json (13/15), 38-refined-quality.json (14/15), and final repaired-validator 38-boundary-quality.json (14/15), all with zero infrastructure errors. Final report preserves the remaining voice/proposed paraphrase failure; expectations were not relaxed.
- Generated bundles/assets, node_modules, unrelated source and earlier feature implementation were excluded from product review. Ignored synthetic artifacts were inspected only as evidence. Check is not required by the request/configuration.

## Findings

- F-01 [P1] closed: independently confirmed complete-excerpt provenance prevents the reported clipped question/qualifier promotion; repair and complete-section behavior pass.
- No new confirmed findings across the complete feature delta. No findings accepted and no checks waived.

## Remaining risk

- Exact line/sentence matching is conservative: valid paraphrases, unusual Markdown, partial passages and selections may remain interpretations. Quotes, citations and decision statuses do not establish truth or entailment.
- The final real local-model collection passed 14/15 curated cases with zero infrastructure errors; a voice/proposed status paraphrase remains an interpretation. This observed model-quality failure is retained and disclosed, with native status context visible; it is not represented as a passing semantic-quality case.
- Native acceptance evidence was retained/inspected; this reviewer did not launch another native session or inference collection. No new runtime performance profile or current dependency vulnerability scan was run; none is configured/required for this delta. No required verification command was unavailable.

## Try it now

Run or do:
In an already permitted project containing the sample Overview, open Ask and
ask what the notes record about the hosting budget and live voice. Retrieve
evidence, inspect the Constraints passage, then Generate from chosen evidence.

Expected:
An exact complete quote is labelled Recorded statement; paraphrases are labelled
AI interpretation. Compare the claim against its supporting excerpt. The sample
postponement is a record, not a new proposed action. Local model wording can vary.

This proves:
The visible distinction and source comparison, not independent factual truth
or general answer quality. Do not save anything to try this observation.
