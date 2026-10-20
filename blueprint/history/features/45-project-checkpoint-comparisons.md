# Feature: Project checkpoint comparisons

**From build-plan:** feature 45
**Build attempt:** 1
**Branch:** feature/project-checkpoint-comparisons
**Status:** verified
**Archive:** blueprint/history/features/45-project-checkpoint-comparisons.md

## Goal

Compare an explicitly selected retained project package with current permitted project content, showing actual snapshots and honest coverage without restoring notes or treating the package as permission.

## In scope

- Native read-only comparison dialog reached from command, Packages tools and full workspace. Explicit local package selection and Compare, cancellation, live status, themed native controls and safe text rendering.
- Existing strict schema1 package decoder, current project identity and export eligibility; historical raw provenance revalidation including retained history and current transitive/PDF dependencies.
- Same-path unchanged/changed, missing now (possible removal), and current-only (possible addition or previously unselected) entries with real hashes, bounded before/after text and explicit omissions/selection limits.

## Out of scope

Restoring/merging/importing notes, new snapshot format, automatic baseline selection, background comparisons, new grants, model calls, event chronology or rename inference. Existing import/export remain available separately.

## Build loop

Approved serial Continuous workflow, feature-level review and no step commits. Verify, actual synthetic Obsidian acceptance, fresh independent review and try guide; two repairs per same failure/finding. Normal push separately authorized after Complete.

## Build steps

- [x] **Step 1: Permission-safe snapshot comparison.** Reuse retained provenance validation and strict decoder; implement bounded current and historical comparison. Done when focused tests prove changed/missing/current-only/unchanged snapshots, forged/incomplete manifest references, stale historical/transitive sources, excluded paths, PDF consent, identity, limits and late cancellation/current checks.
- [x] **Step 2: Native read-only dialog.** Wire explicit package picker/compare/cancel and text-only results with source navigation, generic unavailable counts, before/after hashes and finite display. Done when typecheck and meaningful UI-handler tests prove input/package/source/settings/close invalidation and late result suppression, with no write or model action.
- [x] **Step 3: Native acceptance and verification.** Author and export a synthetic package, then edit/remove/add owned fixtures. Demonstrate real before/after, changed/missing/excluded/PDF-dependent cases, cancellation, invalidation and theme/keyboard navigation in actual Obsidian. Done when prior notes/history/grants stay unchanged, Verify passes, docs/try guide and verified immutable review packet are ready. Independent review gates completion.

## Files / areas

src/portability/compare.ts and tests; reuse export.ts retained private provenance reader, decode.ts and format.ts unchanged contracts. src/ui/compare-modal.ts and tests, main.ts package invalidation/open command, briefing-view.ts Packages and thread-workspace-view.ts navigation. README and spec/evidence. No dependencies or persistent state.

## Data / contracts

- Explicitly read one visible, nonexcluded vault-local .thread-project.json via existing bounded reader. Decoder validates exact fields, portable paths, bytes, hashes, UTF-8, metadata and inert PDF signatures. This explicit read grants no future note/PDF access. Never render package title/paths/content before current eligibility checks; show only generic count for unavailable entries.
- Package project path and ID must match the selected current permitted project identity. Require ready complete identity coverage. Freeze index revision/entries and settings/lifecycle for the operation. Existing current export inventory and budgets apply: at most100 candidates, 2 MiB per text,16 MiB per PDF,32 MiB expanded each side and48 MiB serialized package. Display at most200 same-path union rows. Yield during per-file work, abort on currentness loss and verify current/dependency hashes before publishing.
- Historical text requires current read permission for its original path even if now absent. Parse actual old bytes through index projection, strict managed-record validators and retained whole-note provenance checks, never trust manifest references alone. Check both manifest dependencies and references recovered from raw history against current permitted hashes/identities and transitive freshness. Missing/changed/excluded/ambiguous support makes the entire old row unavailable, not a cached excerpt. PDF-derived text requires exact present PDF consent and current original hash; no extraction. Binary rows show sizes/hashes only and require present consent; no PDF payload rendering.
- Current text uses the existing strict export path to omit unsafe copied historical content and verify raw hashes. Missing means original permitted path is absent now (not proof of deletion, time or cause); a present unindexed/unavailable file is unknown, not removed. Current-only means absent from this selected package, not proof the note was newly created. No rename or mtime history inference. Package omissions and current index/candidate limits remain visible.
- Before/after values are actual retained/current bytes, rendered as text. UI displays at most50000 characters per side and200000 total characters with explicit clipping notices; hashes/counts cover full validated bytes. Current source navigation uses existing guarded openIndexedSource. Historical-only data has no open/restore/write control.
- Source, settings, package replacement/rename/deletion, input change, cancel, close or plugin unload clears visible results immediately. Recheck package hash and current source/dependency snapshots after async work; recheck absent paths before publish. Package snapshot metadata outside current scope never appears in errors. Existing import/export checks remain unchanged.

## Testing

Baseline host Verify passes278 tests/typecheck/build. New pure comparison and actual-handler tests plus full Verify. Use owned synthetic package/notes and authored PDF fixture in isolated Obsidian; preserve45 current prior synthetic notes and earlier reports. Native exclusions, source/package invalidation, readonly byte preservation, light/dark/keyboard checks. No model or browser runner needed.

## Notes for the AI

Package integrity is not permission or trusted provenance. Export validates retained raw synthesis/question/review history beyond the latest index projection; reuse this reader for old snapshots. Compare current permission against historical references even when the package includes matching old copies. Missing/omitted coverage is not complete project history. Do not modify retained archive bytes or the everyday installation.

## Acceptance evidence

- Host Verify passes289 tests/typecheck/build (`.thread-local/continuous-35-plus/evidence/45-final-verify.log`); focused comparison/export tests14 pass and actual native-handler tests cover explicit reads, cancellation, source/package/settings/close invalidation, final awaits and bounded text. One test-harness repair replaced assignment to LocalIndex's getter with an explicit incomplete-identity fixture; original failure retained. No dependencies or persistent schema added.
- Actual Obsidian1.14.4 exported eight authored text/PDF snapshots via the existing exact export preview/save. After explicit owned fixture edits, comparison showed actual changed before/after text, absent original path, current-only note and consented PDF rows. Excluded historical canary and stale copied inference were withheld. No model calls or write controls. All45 prior notes stayed byte-identical (`lab/evidence/45-native-comparison.json`).
- Native PDF consent revocation immediately clears results and prevents old extracted text/binary rows. Source modification and package replacement clear results; cancellation during a held real package read prevents late publication. Unsupported schema is refused. Restoring the original test package/settings leaves52 authored notes, unchanged PDF bytes, no proposals/recovery/modals (`45-native-lifecycle.json`, `45-native-final.json`).
- Native Tab reaches Open current source with solid focus and32px target; source navigation opens the current note. Final dark/light screenshots inspected (`45-final-dark.png`, `45-final-light.png`), including wrapped full hashes and spaced cards. Exact final build comparison rerun shows seven eligible rows (`45-final-native-check.json`).

- Review repair: retained provenance now includes all strict collection references, including excluded choices; both comparison sides and current exports withhold collections when source or PDF dependencies are no longer permitted/current. Decoder failures use fixed actionable text instead of raw parser messages. Full host Verify passes292 tests/typecheck/build (`45-repair-final-verify.log`), including legacy empty-manifest references and PDF-dependent collection regressions.
- Actual repaired Obsidian build exported and compared a new authored collection package. Source exclusion hides both old/current collection metadata, revoked PDF consent hides dependent records, malformed metadata never reaches status, and restoring grants/package restores eligible results. All52 prior notes plus four new fixtures stayed byte-identical; settings/package restored and modals closed (`lab/evidence/45-native-repair.json`). Both findings are fixed pending fresh full review.

## Limitations

Same-path comparison is within selected package/current candidate coverage; no rename, deletion cause/date or complete-history claims. Historical retained support must still match current permissions/hashes, so some old outputs are intentionally unavailable. Large displays are explicitly clipped. No restore, writes or model inference.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9952,"specSha256":"ac7338c01c39ccb8432e7f358e5e44d50e4469f23a480c21ce373067eb34560a","branch":"refs/heads/feature/project-checkpoint-comparisons","head":"0881271db752d1ce9d59b847631edb919e246d89","baseRef":"refs/heads/main","baseCommit":"ad18a60394ec74a0bad65bfa58582a2879e0bb7a","sourceTree":"25ab8c38ebd2b42b636f02203068f1afe2cc5ce0","landing":"local-merge","absentOptional":[]} -->

## Findings

### 45/F-01 [P1] closed - Collection references bypass historical comparison permission checks

**File:** src/portability/compare.ts:48; src/portability/export.ts:23
**Found:** 2026-10-20 by /audit (scope: current; lens: security, tests)
**Why it matters:** The comparison treats `retainedReferences` as the whole-note provenance reader, but a validated collection has `output.refs = []` because its AI projection deliberately contains no evidence. The reader never recovers `readCollection(...).items[].source`. A normally exported collection therefore has an empty manifest references list. After its referenced source is excluded, comparing that genuine package still publishes the collection's exact raw Before and After, including the excluded source path and heading. This violates current permission checks for retained machine source metadata. The current export side has the same reachable gap, so fixing only historical rows leaves the After side exposed. A host reproduction with a real `collectionMarkdown` record/export/decode, then source exclusion, confirms `hiddenPathInBefore`, `hiddenHeadingInBefore`, and `hiddenPathInAfter` are all true. Evidence: `.thread-local/continuous-35-plus/evidence/45-review-collection-repro.mjs` and `.log`.
**Suggested fix:** Reuse the strict collection reader to include every stored collection source reference in whole-note retained provenance validation for both historical comparison and the current export path. Omit the entire collection row when a referenced source is excluded, missing, changed, ambiguous, or transitively stale. Cover genuine packages with naturally empty manifest references and PDF-dependent collection sources in meaningful regression tests.
**Resolution:** Closed 2026-10-20 by fresh independent Phase B review at `0881271db752d1ce9d59b847631edb919e246d89`. Reviewed the complete feature delta, shared retained reader and both export/comparison callers. Strict collection parsing recovers every stored source reference, including excluded choices, before either side can publish. Regression tests cover genuine and legacy empty-manifest packages, source exclusions/changes and revoked PDF consent. Host Verify passes all292 tests/typecheck/build (`.thread-local/continuous-35-plus/evidence/45-review-r2-verify.log`); inspected actual repaired Obsidian script and `lab/evidence/45-native-repair.json`. Original defect is gone and no new defect found in the repair.

### 45/F-02 [P1] closed - Comparison errors render unchecked package contents

**File:** src/ui/compare-modal.ts:43
**Found:** 2026-10-20 by /audit (scope: current; lens: security, tests)
**Why it matters:** The comparison catches decoder failures and renders `error.message` verbatim before package project identity or entry eligibility can be established. `decodeProjectPackage` calls `JSON.parse` on untrusted package bytes; V8 SyntaxError messages can contain a raw input excerpt. The actual comparison handler given malformed package bytes `{"title":SECRET45}` displays that unchecked title in its status message even though no comparison is eligible. This breaks the explicit contract that package metadata outside current scope never appears in errors. Evidence: `.thread-local/continuous-35-plus/evidence/45-review-error-repro.mjs` and `.log`; the reproduction bundles and calls the actual modal handler.
**Suggested fix:** Convert decoder/parser errors that may contain untrusted bytes to a fixed, actionable validation message before displaying them. Preserve only known safe validation guidance. Add actual-handler coverage proving malformed metadata cannot appear in status or result text.
**Resolution:** Closed 2026-10-20 by fresh independent Phase B review at `0881271db752d1ce9d59b847631edb919e246d89`. Reviewed both decoder calls, the fixed actionable error wrapper and actual-handler regression assertions for initial/final malformed JSON and raw input canaries. Host Verify passes all292 tests/typecheck/build (`.thread-local/continuous-35-plus/evidence/45-review-r2-verify.log`); inspected the native malformed-package script and `lab/evidence/45-native-repair.json`. Unchecked parser messages no longer reach status; no new defect found in the repair.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 0881271db752d1ce9d59b847631edb919e246d89
**Base commit:** ad18a60394ec74a0bad65bfa58582a2879e0bb7a
**Base ref:** refs/heads/main
**Spec hash:** ac7338c01c39ccb8432e7f358e5e44d50e4469f23a480c21ce373067eb34560a
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T20:27:28.299124+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T20:29:50.078066Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `ad18a60394ec74a0bad65bfa58582a2879e0bb7a..0881271db752d1ce9d59b847631edb919e246d89` delta in a fresh isolated subagent without the builder conversation. Run all Audit lenses from scratch. Inspect native acceptance evidence named in the spec. Do not edit product code, accept findings, or reuse existing findings as the review scope.

## Commands

- `git status --short`, `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `git branch --show-current`: pass; exact target/base and non-default feature branch; only findings/review differ.
- `sha256sum blueprint/context/current-feature.md`: pass; exact pending spec hash. Spec is tracked; no snapshot field applies.
- `git diff --stat`, `git diff --name-only`, and complete `git diff ad18a60394ec74a0bad65bfa58582a2879e0bb7a..0881271db752d1ce9d59b847631edb919e246d89`: pass; all11 changed paths covered.
- `git diff --check ad18a60394ec74a0bad65bfa58582a2879e0bb7a..0881271db752d1ce9d59b847631edb919e246d89`: pass.
- `npm run verify` on the real host via explicit sandbox escalation: pass; typecheck,292 tests, production build. No failed, canceled, skipped or todo tests. Log: `.thread-local/continuous-35-plus/evidence/45-review-r2-verify.log`.
- Targeted searches of changed tests: no focused, skipped or placeholder tests found.

## Evidence

- Complete current scope reviewed from scratch across quality, security, performance and tests; existing findings were context only. Changed paths: `README.md`, `blueprint/context/current-feature.md`, `src/main.ts`, `src/portability/compare.ts`, `compare.test.ts`, `export.ts`, `src/ui/compare-modal.ts`, `compare-modal.test.ts`, `briefing-view.ts`, `thread-workspace-view.ts`, and `styles.css`.
- Followed affected contracts through package decode/format, export inventory/raw provenance, index projection/project membership/identity, freshness graph, collection strict reader, PDF record/scope, metadata/read scope, ThreadModal lifecycle, package reading, snapshot revalidation, source navigation, settings/source/package invalidation and plugin unload.
- Quality: existing native UI/services reused; no new dependencies, persistent schema, restore/write/model actions or speculative abstraction. Security: explicit package read; current project identity; raw retained provenance independent of manifest; collection/PDF/transitive permissions; text-only rendering and safe decoder errors. Performance: finite entry/byte/display budgets, yielding, cancellation and final revalidation. Tests: meaningful pure and actual-handler coverage of positive, rejected, missing, current-only, malformed, excluded, stale, PDF, boundary and late async cases.
- Standards checked: `AGENTS.md`, installed Audit/independent-review contract, `blueprint/config.json`, project overview, coding standards, AI interaction guidelines, active verified spec and relevant build-plan order.
- Inspected native acceptance reports under `.thread-local/continuous-35-plus/lab/evidence/`: `45-native-comparison.json`, `45-native-lifecycle.json`, `45-native-final.json`, `45-native-keyboard.json`, `45-final-native-check.json`, and `45-native-repair.json`. Inspected actual Obsidian scripts `compare45-native-body.js` and `compare45-repair-body.js`; reports cover real export/snapshots, current source navigation, exclusions/PDF revocation, source/package/cancel invalidation, malformed errors, preserved notes/settings/package and closed modals.
- Visually inspected `45-final-dark.png` and `45-final-light.png`: actual before/after text, full wrapped hashes, readable spacing and current-source control. Keyboard report records solid focus and32px button.
- Excluded dependencies, vendored PDF assets, generated bundles/build/package output and unrelated source from audit scope. Ignored native evidence was inspected as acceptance input; it was not treated as application-code delta.

## Findings

- No new findings in any of the four lenses.
- F-01 closed: all strict collection references now participate in whole-note validation on historical/current comparison and current export; legacy empty manifest references and PDF-dependent records are covered.
- F-02 closed: both decoder calls convert raw parser failures to fixed actionable status; initial/final malformed-input regression and native evidence confirm no unchecked metadata reaches status.
- No open or fixed P0/P1 findings remain. No repair order required.

## Remaining risk

- Native Obsidian acceptance was inspected from the named scripts/reports/screenshots rather than rerun in this reviewer session. Check was explicitly not required. Automated handler tests were rerun through host Verify.
- No unavailable verification command. No new security/performance concern identified within the complete target delta and affected contracts; package/index/display coverage limits remain explicit product limitations.

## Try it now

1. In a disposable synthetic project, use **Export checkpoint** to preview and explicitly save selected notes. Keep the `.thread-project.json` in the vault. Edit one authored source, add another and optionally remove only a disposable authored note.
2. Run **Thread: Compare project checkpoint**, select that package and click **Compare selected checkpoint**. Expand Changed, Missing now and Current only rows to inspect actual before/after text and full hashes. Missing/current-only are observations, not complete history or inferred events.
3. Exclude an authored historical note or revoke consent to its supporting PDF. Visible results clear. Recompare: unavailable history is withheld even though old bytes remain in the package. Restore only your intended grants afterward.
4. Use **Open current source** with keyboard Tab/Enter; source edits, package edits and **Cancel comparison** clear results. This dialog never restores or writes notes. Importing reviewed new copies remains a separate command.
