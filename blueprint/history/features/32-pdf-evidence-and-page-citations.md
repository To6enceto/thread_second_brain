# Feature: PDF evidence and page citations

**From build-plan:** feature 32
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/pdf-evidence-and-page-citations`

## Goal

Reuse only validated local PDF page text with exact binary consent, full current-original verification and deterministic page citations, while preserving originals and prior extractions.

## In scope

Strict extraction-page indexing, volatile consented original snapshots, dependency-aware invalidation, current binary checks before model transmission/save/open, Find/Ask/Resume/review integration and actual original-page navigation. Explicit re-extraction creates a new source; keyword/facts remain available without Ollama.

## Out of scope

OCR, encrypted PDFs, automatic re-extraction or provenance repair, automatic permission migration, remote assets, larger context budgets and original edits.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Validated PDF evidence and freshness contracts** - Integrate canonical extraction validation and page metadata into index/evidence/citations; extend freshness with separate volatile binary snapshots and transitive source dependencies. *Done when:* Meaningful tests prove tampered/unsupported page records refuse, only approved matching originals enable chunks, page identities survive evidence/provenance, and original changes/revocation invalidate descendants; Verify passes.
- [x] **Step 2 - Current-original runtime checks and immediate invalidation** - Verify bounded consented originals during indexing, check transitive binaries before reuse/model/save/open, invalidate affected text/vectors/cache synchronously on binary events, and use exact native page navigation. *Done when:* Tests and native checks prove scope/no-read, finite verification budgets, original hash and held-read races, stale cache scrubbing, safe review contexts and explicit new-copy recovery; Verify passes.
- [x] **Step 3 - Native PDF retrieval, inference and review acceptance** - Demonstrate Find, Ask and Resume with actual authored pages, real local text/embedding inference and page2 navigation; verify offline/cancel/exclusion/re-extraction and theme/keyboard behavior, update documentation and obtain fresh independent review. *Done when:* Recorded actual Obsidian acceptance, reusable quality checks and Verify pass; full immutable independent review passes with no blockers before completion.

## Files / areas

src/pdf/ records/evidence tests; src/vault/index.ts/evidence.ts/freshness.ts/index-updates.ts/review-events.ts; src/main.ts; affected native citation/review controls and tests; evaluation and README.

## Data / contracts

No binary reads without ordinary allowed path AND exact pdfPaths consent; exclusions always win. Original binary trust is volatile only, cleared on reset and binary events; persisted text cannot restore authority. Indexing verifies at most10 distinct PDFs and32MiB original bytes per snapshot cycle, with existing16MiB per-file cap, cancellation and visible unavailable/limited guidance. Repeated sources sharing an original reuse only the current cycle check; omission/failure leaves pages unusable. Strict readPdfSource validates canonical page text and hashes before indexing; only actual page text is evidence, never extraction intro/coverage metadata. PDF refs carry deterministic original path/hash/page; generated source refs retain extraction note stable ID/full raw hash and validated page mapping. Binary dependencies participate transitively in freshness, review fingerprints and exact save contexts. Before inference/answer reuse/save/open recheck current full binary hashes with current settings/revision/object/path guards; never send PDF bytes to models. A binary modify/delete/rename synchronously clears its trust and affected text/vector caches before deferred work; exact consent never follows a rename. Missing/excluded/revoked/changed original disables extraction and descendants without altering notes. Re-extraction is explicit to a new destination and preserves old sources. Native source buttons open the original at validated page N after source+original checks; ordinary direct Markdown links remain readable archival citations and are not a freshness guarantee. No mandatory model: Find/recorded facts/reviews work locally without Ollama. Existing16000-character context limit remains.

## Testing

Verify each step. Pure strict-record/page/citation/freshness/index-invalidation/review binary regressions. Synthetic actual Obsidian authored PDF evidence: Find and Ask page selection, real local embeddings/text answer, Resume recorded facts before interpretations and offline use, actual original page2 viewer state, direct/transitive stale output and review, revoke/exclusion/missing/renamed original, held original read and tampered page, immediate cache/vector scrubbing, explicit new-copy re-extraction and original/history preservation. Native keyboard/light/dark, offline asset checks, exact installed inventory; fresh independent full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

Step1 evidence: feature-32-step1-verify-r2.log, 55 test files pass; strict PDF/page identity, original authority, transitive invalidation and review snapshots covered. Step2 interim Verify56 passed; final integration/native proof follows.

Step2 evidence: feature-32-step2-verify-final.log and health-verify.log,56 test files pass. Separate volatile binary map, bounded original checks, before-model/save/open verification, review fingerprints/contexts and synchronous dependency/vector/cache invalidation implemented. Native evidence follows in Step3.

## Acceptance evidence

- Verify: `.thread-local/continuous-22-34/feature-32-review-ready-verify.log`,56 test files pass. Offline answer-quality self-check11/11 including authored two-page support and negative controls: `feature-32-quality-final.log`.
- Actual isolated Obsidian1.14.4 / Ollama0.40.4: `evidence/feature-32-native-core-final.json`,4 native cases. Actual packaged PDF worker creates two-page source after explicit consent; Find opens actual original viewer page2; real qwen3-embedding:0.6b retrieval and qwen3:4b-instruct answer47 euros/Amber; exact answer preview/save records original hash/page citations and transitive original dependency; recorded Resume without text model. No external fetches.
- `evidence/feature-32-native-races.json`,5 native groups: synchronous original-change source/answer chunks, affected vectors and persisted text scrubbing; stale review queue with explicit review-note exact preview/save recognized binary snapshot; held binary read refuses old evidence; revoke/exclusion zero Thread binary reads; rename expires exact consent, page tampering refuses; actual worker re-extraction to new source preserves original/prior source/change history.
- `evidence/feature-32-native-cancel.json`:2 controlled held-embedding cancellation/exclusion cases abort and discard PDF context. Actual embeddings/text separately proved above.
- `evidence/feature-32-visual-keyboard.json`: native Enter retrieval, Tab to evidence choice and Enter original page2;8 screenshots `feature-32-{workbench,original-page2}-{dark,light}-{top,bottom}.png` inspected, readable native controls/wrapped text/themes. Viewer currentPageNumber and visible page input2 verified.
- Exact191 installed file hashes: `evidence/feature-32-installed-review.json`. Prior install/acceptance proofs retained separately. Lab has loopback-only network; local PDF assets/notes only.
- Repair ledger `feature-32-repairs.json`: each distinct failing check repaired once. Viewer observation corrected to actual nested PDFViewerApplication; correct existing Generate label; parsed escaped provenance; affected-vector diagnosis retains unrelated Overview vector; browser network-counter wrapper receiver corrected. No product check weakened, no failing gate waived. Full reruns above pass.

## Limits and recovery

Only strict canonical extraction pages enter evidence; general editor-selection projection continues to refuse managed PDF text (use Find/Ask/Resume). Binary verification is bounded10 originals/32MiB per operation with stat-before and post-read growth refusal; Vault reads are not streaming or atomic filesystem snapshots. Extractions beyond verification coverage remain unusable. Full SHA checks are conservative and can invalidate unchanged passages. PDF.js/font/layout/page/text limits from feature31 remain. No automatic re-extraction or note updates; choose a new source name explicitly and retain old notes. Plain Markdown links are archival navigation, not freshness validation.

## Try it now

In a synthetic test vault allow a folder containing a small selectable-text PDF. Run Thread: Extract local PDF, select that exact PDF and explicitly allow ongoing reads, extract and save a new source. Link it from the chosen project Overview. Find a page-specific phrase, open its result and observe the original page. Ask from retrieved evidence and inspect exact context/page citations before generating or saving. Resume without a text model to inspect recorded excerpts. Modify or rename the original and refresh: old extraction and dependent output require review. Restore access or explicitly extract to a new source; prior notes stay unchanged.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9731,"specSha256":"4cb8e6bb3db34045a255fc876b264ef9beab160d29299cd5496adf8b4ac7dfb9","branch":"refs/heads/feature/pdf-evidence-and-page-citations","head":"ddfcb93a0e30d03485408e93ad8fc29b8bc3c609","baseRef":"refs/heads/main","baseCommit":"ec4111328cf91674570e2e16d1f1314ea2f3aa67","sourceTree":"4cfa8991778fcd0389576988151ca4e5aa62d68a","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** ddfcb93a0e30d03485408e93ad8fc29b8bc3c609
**Base commit:** ec4111328cf91674570e2e16d1f1314ea2f3aa67
**Base ref:** main
**Spec hash:** 4cb8e6bb3db34045a255fc876b264ef9beab160d29299cd5496adf8b4ac7dfb9
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T11:56:09.780182+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T11:59:24.755854+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all 56 test files, production build. No failures, skips or todos; the CLI missing-model regression passed unchanged.
- `npm run evaluate`: pass; 11/11 reference and negative-control self-check cases, zero errors.
- `git diff --check ec4111328cf91674570e2e16d1f1314ea2f3aa67..ddfcb93a0e30d03485408e93ad8fc29b8bc3c609`: pass.
- `git rev-parse HEAD`, `git merge-base main HEAD`, exact spec SHA-256 and `git status --short`: pass; checkpoint/spec/base match and only allowed review evidence differs.
- Read-only Python SHA-256 comparison of all 191 unique inventory paths against current built files and `.thread-local/improvements-lab/vault/.obsidian/plugins/thread`: pass, zero mismatches.

## Evidence

- Reviewed the complete 26-file base-to-target delta from scratch, with nearby callers and regression tests, against the exact current-feature spec above and installed project-local Audit instructions. Checked README/evaluation fixtures, PDF record/scope/checks, main runtime integration, evidence/index/freshness/invalidation, health, review snapshots/provenance/queue and changed native controls. Dependencies, generated bundles, caches and prior feature archives were excluded from source review; generated build assets were checked against the installed inventory.
- Verified exact binary consent plus ordinary scope/exclusions before reads; volatile authority, bounded 10-original/32 MiB checks, full binary SHA revalidation before reuse/inference/save/open, object/path/settings/revision guards, page identity and transitive dependencies. Traced synchronous binary-event trust/text/vector invalidation and queued cache scrubbing, settings reset, rename behavior and unchanged managed/legacy Markdown safety.
- Inspected `.thread-local/continuous-22-34/evidence/feature-32-native-core-final.json` and its actual Obsidian harness: real packaged worker extraction, Find original page 2, real local embedding/text inference, exact saved page provenance and recorded Resume with no text model; zero external requests recorded.
- Inspected `feature-32-native-races.json`, `feature-32-native-cancel.json` and their native harness assertions: direct/transitive stale outputs, affected vector/cache scrubbing, explicit review preview/save, held original read, revoke/exclusion no-read, renamed original, tampered page, explicit worker re-extraction preserving old sources/history, and cancellation/exclusion during held embedding.
- Inspected `feature-32-visual-keyboard.json`, capture harness and all eight native workbench/original-page2 dark/light top/bottom screenshots. Page input 2 and authored Amber page are visible; workbench controls and long text remain readable and wrapped. Native Enter/Tab/page navigation evidence passes.
- `feature-32-installed-review.json`: all 191 unique installed asset hashes independently recomputed and matched after this review's build. Existing ZIP preserved; SHA-256 `91a93cea45deedd6f66907d15fc34bb5ac0bac38b18856e8e948ea9841fab35e`. No package command run.
- Configuration keeps Check manual and the request says no; native acceptance remains explicitly required by the active spec and was inspected separately. Existing acceptance/diagnostic logs, repair ledger and archives preserved. No source, test, configuration or spec edits; no finding waivers.

## Findings

- None. No confirmed quality, security, performance or tests findings in the complete reviewed delta; no existing finding IDs to update or close.

## Remaining risk

- Native flows were assessed from the preserved actual synthetic Obsidian acceptance artifacts, harness assertions and screenshots; this reviewer did not rerun their mutating fixture steps. Synthetic evidence does not establish behavior for every PDF layout or personal vault.
- The documented limits remain: non-streaming/non-atomic Vault reads, finite binary/page/text budgets, no OCR/encrypted-PDF support, explicit re-extraction and archival Markdown links without freshness guarantees. Citation identity is not a general semantic-support guarantee.
- No required command was unavailable. No blocking risk identified within the reviewed scope.
