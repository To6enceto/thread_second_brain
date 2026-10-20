# Feature: Section-aware long-note indexing

**From build-plan:** feature 29
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/section-aware-long-note-indexing`

## Goal

Index eligible later sections of longer notes with explicit finite work/storage budgets, progress, cancellation and honest coverage while preserving immediate invalidation and freshness/identity guarantees.

## In scope

Three explicit local index budget profiles; bounded section-aware chunks across headings beyond the former 50000-character prefix; per-note/raw/read/file/serialized-entry bounds and aggregate coverage; incremental integration, native progress/cancel/rebuild controls and measured synthetic performance. Preserve existing scoped keyword retrieval/context limits.

## Out of scope

Unbounded whole-vault indexing, background embeddings, new database, PDF reads, changing notes/history, broad hybrid search-more (feature30), arbitrary vault-size performance guarantees and silent scope widening.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Bounded section processing and settings** - Define validated finite budget profiles and cancelable section-balanced chunk extraction with coverage, full raw hashes and preserved private projection. *Done when:* Tests cover later headings, long introductions/fences/Unicode, private/stale records, exact bounds/settings compatibility/cancellation and unchanged context budget; Verify passes.
- [x] **Step 2 - Incremental bounded publication and cancellation** - Integrate deterministic file/raw/entry budgets, current coverage and progress into native incremental indexing with safe cancellation/restart and scope scrubbing. *Done when:* Tests prove bounded retention, source/dependency/duplicate invalidation, cancellation without stale publication, zero excluded reads and conservative identity handling when permitted notes are omitted; Verify passes.
- [x] **Step 3 - Native coverage and profile controls** - Expose explicit profile selection, current progress/coverage and cancel/rebuild through native UI; update current coverage copy across consumers. *Done when:* Native handlers keep settings/history compatible, narrowing budgets immediately removes old chunks/vectors, and all freshness/identity/write guards remain conservative; Verify passes.
- [x] **Step 4 - Measured native acceptance and documentation** - Exercise larger authored synthetic notes, later-section search/context/native links, edit/exclusion/budget/cancel races, real local inference where relevant, themes/keyboard and benchmark read/time/budget observations. *Done when:* Actual evidence documents fixture sizes, wall times/read counts/derived bytes and limits; Verify, reusable eval and fresh independent full review pass.

## Files / areas

src/settings/index-budget.ts/settings.ts/tests; src/vault/sections.ts/tests; src/vault/index.ts/index-updates.ts/tests; src/vault/freshness.ts/tests and current identity consumers as needed; src/main.ts; src/ui/index-modal.ts/tests/settings-tab.ts; coverage text/README/evaluation fixtures where needed.

## Data / contracts

Free local text indexing only. Offer conservative/standard/larger profiles with finite per-file raw UTF-8 size, cumulative read bytes, file count, per-note retained character/chunk/section limits and serialized entry bytes. Standard initially targets 2 MiB raw/file, 16 MiB read/run, 2000 files, 200000 retained characters/200 chunks per note and 8 MiB serialized entries; profile values may be refined with measurement within approved scope. Current scope/exclusions apply before all reads and reuse. Parse the full bounded permitted projection by headings outside fences; reserve initial passages across bounded nonempty sections before extras, so a long introduction does not consume the entire note budget. Later sections beyond 50000 can be indexed; omitted sections/characters remain counted or explicitly unknown. Full raw note SHA-256 stays authoritative, including edits outside retained passages. Never index private machine evidence blocks or stale generated copies. Deterministic alphabetical file/entry admission, no inferred priority. Visible coverage distinguishes eligible/read/indexed/omitted files, actual indexed/available text, truncated sections, bytes/read/entry limits and canceled/unready states. Cancellation aborts current work without publishing the incomplete snapshot; pending work survives and restart is explicit or a later ordinary vault event, not an automatic retry of canceled work. Existing incremental reads and dependency closure remain; budget narrowing clears old chunks/vectors/cache before awaits. Derived caches may rebuild; settings schema1 and durable journal/import/rename/Markdown history are preserved. If permitted files/identity metadata are omitted by budgets, do not claim globally unique stable IDs: fail closed for ID-dependent source resolution/project identity/review or mutation checks until complete coverage is restored, with actionable guidance. Read-only keyword results from current retained originals remain available and coverage-limited. Keep the 16000-character model context limit; larger indexing does not imply every workflow/context includes every section. No silently widened read grants.

## Testing

Verify per step; deterministic logic/regression tests for section placement/coverage/private projections, all finite limits, profile loading/old settings, incremental affected-note reads and canceled/stale publication, omitted-source identity ambiguity and source guards. Actual synthetic Obsidian: long introduction followed by later recognized headings, large generated fixtures, native tail source navigation/Ask context and relevant real inference, edit outside retained passages, exclusion and narrower profile immediate scrubbing/vectors, cancel held reads/restart, unchanged notes/history, both themes/keyboard; record measured runtime/read counts/cache bytes and no arbitrary scalability claim.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

- Verify: `.thread-local/continuous-22-34/feature-29-progress-final-verify.log`, typecheck, 48 test files and production build pass.
- Reusable `npm run evaluate:index`: three profiles preserve later-heading retrieval and bounded context; the old-prefix negative control misses the answer and raw-only changes change hashes. `npm run evaluate`: all authored reference/negative controls pass. Logs: feature-29-evaluate-index.log and feature-29-evaluate.log in the same run directory.
- Actual Obsidian 1.14.4, Ollama 0.40.4, real qwen3:4b-instruct: `evidence/feature-29-native-final.json` in that directory records eight passing cases, synthetic root and timings/read/byte counts. Final full scan: 122 files, 1765809 raw bytes, 108 ms elapsed, 1512145 serialized entry bytes, all 124 nonempty sections represented and one long section shortened. Incremental source/dependent edit: two Thread reads, 741000 raw bytes; a separately traced Obsidian renderer call makes three total host reads. Timings vary and are not a scalability guarantee.
- Native Find navigates to the late Amber router heading; Ask sends the exact 501-character source JSON context, performs one real local text generation, answers 47 seconds and explicitly saves a new answer. Raw-only edit outside retained text stales and scrubs that answer; unrelated notes are not reread.
- Narrowing profiles immediately clears text/vectors, scrubs old deep text from cache and preserves grants; conservative indexing still reaches the late heading. Oversized permitted note is skipped before reading and disables project identity authority; retained keyword remains usable with omitted-file guidance.
- Native Cancel during held read aborts both joined callers without partial completion/automatic retry; explicit Resume finishes. Exclusion scrubs original/derived copies and vectors with zero excluded Thread reads. The still-open original is independently reread by Obsidian cachedRead; call stacks are retained in evidence and are not attributed to Thread. All authored originals remain intact except the deliberate synthetic edit.
- Native dark/light top/bottom screenshots and Tab/Enter Save: `evidence/feature-29-final-{dark,light}-{top,bottom}.png` and feature-29-final-visual-keyboard.json. Inspected all four screenshots; controls, focus, scope and coverage guidance remain usable. Installed artifact hashes: feature-29-installed-final.json.
- Repair ledger: feature-29-repairs.json. Old QuestionsModal test stub replaced with real LocalIndex; native exclusion harness repaired within two attempts after tracing host cachedRead, preserving zero-Thread-read assertion; visual driver temporary variables isolated after one CDP lexical scope failure. Product safety checks were not weakened. Prior evidence remains preserved.

## Try it now

1. Open Thread's More actions > Index coverage, or run Thread: Text index coverage and budgets. Inspect the saved finite profile, omitted files/sections and byte limits.
2. In a permitted synthetic long note put a unique phrase under a later heading. Run Find evidence for that phrase, inspect the result and open its heading. Ask can retrieve the same passage into its exact bounded context before explicit generation.
3. Select Conservative and Save index budget profile. Inspect narrower coverage. If a permitted note is omitted, restore complete coverage with a larger profile or your own explicit scope narrowing before identity-dependent actions. Notes and read grants stay intact.
4. During indexing choose Cancel current indexing. Evidence remains unready until explicit Resume/Rebuild or a later ordinary vault event starts work. No model context is automatically enlarged.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10167,"specSha256":"25284aa9e026a75ea1f18b3c3a9d10128ee34380160b011f6e3774091eb1fbaf","branch":"refs/heads/feature/section-aware-long-note-indexing","head":"faa97982799dba8aafaaf24fe76518b3413a9b11","baseRef":"refs/heads/main","baseCommit":"0ab2f67e50c67814157d60f2da3414d41772bafd","sourceTree":"db71d1201d528b886070caf1bd43192405ac03d5","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** faa97982799dba8aafaaf24fe76518b3413a9b11
**Base commit:** 0ab2f67e50c67814157d60f2da3414d41772bafd
**Base ref:** main
**Spec hash:** 25284aa9e026a75ea1f18b3c3a9d10128ee34380160b011f6e3774091eb1fbaf
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T10:23:24.792276+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T10:25:40.689456+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all 48 test files, production build; no failed, canceled, skipped or todo test files.
- `npm run evaluate:index`: pass; all three profiles preserve later-heading retrieval, bounded source context, raw-hash invalidation and old-prefix negative control.
- `npm run evaluate`: pass; 10 authored reference/negative-control cases.
- `git diff --check main...HEAD`: pass.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, Git status and untracked-path checks: pass; exact request target/base/spec and only allowed review evidence differs.
- `sha256sum main.js manifest.json styles.css`: pass; all three freshly built artifact hashes match `feature-29-installed-final.json`.

## Evidence

- Independently reviewed the complete `0ab2f67e50c67814157d60f2da3414d41772bafd..faa97982799dba8aafaaf24fe76518b3413a9b11` delta: README, package script, reusable index evaluation, all changed source/settings/native UI and adjacent tests; followed relevant scope, evidence, provenance, semantic invalidation, project identity and source/write guard callers. No builder transcript was supplied. Existing findings did not define scope.
- Checked project AGENTS, configuration, current spec, overview, coding standards and interaction rules: native Obsidian controls, no new dependencies, explicit scope before reads, private/stale projection, full raw hashes, finite file/read/section/chunk/entry admission, immediate profile/exclusion scrubbing, incremental dependency invalidation, cancellation and conservative omitted-file stable identity behavior.
- Inspected `.thread-local/continuous-22-34/test-feature-29.js` and `evidence/feature-29-native-final.json`: eight recorded passing native cases, 122-file/1765809-byte full scan (108 ms observed, 1512145 serialized entry bytes), 124 represented sections, late-heading Find/navigation, exact 501-character Ask context with real local inference and explicit save, raw-only edit invalidation, profile/cache/vector scrub, omitted identity refusal, joined cancellation/explicit resume and zero excluded Thread reads. Host renderer reads were explicitly traced separately.
- Inspected `evidence/feature-29-final-visual-keyboard.json` and all four `feature-29-final-{dark,light}-{top,bottom}.png` screenshots: native controls, visible focus, coverage and omission guidance, scrolling and recorded Tab/Enter Save in both themes.
- Inspected `evidence/feature-29-installed-final.json`; production `main.js`, manifest and styles match those recorded native artifacts exactly.
- Meaningful logic coverage includes section/fence/Unicode bounds, long introduction/later headings, old settings, private projection, serialized metadata admission, incomplete identity guards, dependent omission, cancellation and native profile handlers. No focused, skipped or placeholder tests found in the changed tests. Generated bundles, dependencies, caches and unrelated source were excluded from code scope; ignored synthetic native evidence was inspected as acceptance evidence.

## Findings

- None. No new confirmed quality, security, performance or test defect; ledger remains without findings. No finding was accepted or waived. No repair order is required.

## Remaining risk

- Native Obsidian and real local inference were evidenced by the recorded synthetic run, harness, screenshots and exact installed artifact hashes; this reviewer did not rerun host interaction or live inference. Check was not required by the request.
- Timings establish only the authored Linux synthetic fixture observation, not arbitrary vault scalability or other-platform behavior. Whole-file host reads retain the documented external-growth race limitation; bounded admission is not streaming or an atomic filesystem guarantee.
- No configured lint, security scanner or profiling command exists; no current dependency vulnerability scan or broad runtime profile is claimed. All declared requested local verification commands ran successfully.
