# Feature: Vault health and compatibility

**From build-plan:** feature 28
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/vault-health-and-compatibility`

## Goal

Explain concrete compatibility problems in currently permitted notes and offer individual exact reviewed corrections without automatic cleanup or changing identities/read grants.

## In scope

On-demand bounded diagnostics for duplicate IDs, invalid dates, unavailable/ambiguous note references, missing/ambiguous project associations and missing recognized record headings. Native guarded navigation, cancellation/progress/coverage. One user-entered date correction or explicitly selected heading rename per existing reviewed-change proposal, with manual guidance for other/complex/protected/stale cases.

## Out of scope

Bulk cleanup, ID reassignment, migrations, automatic semantic repairs, whole-vault claims, read-grant expansion, original source writes, inference and new repair journal machinery.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Diagnostics and safe repair contracts** - Add bounded current-note inspection and conservative exact one-field/one-heading repair functions. *Done when:* Tests cover duplicates, real calendar validity, redacted unavailable references, project associations, recognized headings/private ranges, bounds/cancel, CRLF preservation and refusal of complex/ambiguous repairs; Verify passes.
- [x] **Step 2 - Native diagnostics and reviewed repairs** - Add command/home entry, current scoped reads/progress, diagnostic navigation and explicit one-at-a-time correction forms routed through existing change review. *Done when:* Native handlers preserve inputs/source/settings/hash guards, write policy and exact preview/recovery/undo contracts; Verify passes.
- [x] **Step 3 - Native acceptance and documentation** - Demonstrate useful diagnostics and individual repairs in actual synthetic Obsidian, both themes/keyboard, collision/concurrency/exclusion and recovery guards. *Done when:* Observed evidence and README/Try it now are current; Verify and fresh independent full review pass before completion.

## Files / areas

src/vault/health.ts/tests; src/ui/health-modal.ts/tests; src/main.ts; src/ui/briefing-view.ts; README.md; styles.css if needed.

## Data / contracts

Scan only currently permitted indexed text files, alphabetical order, at most 500 files, 1 MiB raw UTF-8 per file and 8 MiB cumulative raw text per scan, sequential reads; enforce stat size and read scope before reads, hash/scope/settings/index epoch afterwards. Report examined/omitted/oversized counts and progress; retain at most 200 diagnostics while counting all detected issues within the scan. No raw note contents or unavailable reference paths in diagnostics/cache/logs. Duplicate IDs and project resolution use current permitted index identities, never enumerate excluded notes. References inspect recognized output/decision/question/review provenance plus current projected text links; missing/excluded/ambiguous references have only aggregate counts and manual guidance. Invalid/missing structure has practical effect explanations, not a score. Recognized heading gaps apply only to known record types; generic/source notes are not forced into templates. Headings beyond current index coverage may remain unknown; private provenance blocks never become headings or repair targets. Individual repairs are user-entered canonical YYYY-MM-DD values for an existing invalid simple scalar date or explicit rename of one current allowed heading to a recognized heading for that record. Preserve all other bytes, property comments, CRLF and private markers. Complex YAML, missing properties, duplicate keys, unsupported/stale managed formats, duplicate identities and protected original sources require manual editing. Never reassign IDs or infer a date/meaning. Each repair re-reads its current raw target and verifies its full captured hash/settings/index/source dependencies, then proposes exactly one before/after operation through existing ChangeManager and highlighted exact Review changes. No writes until explicit Apply; normal concurrent-edit refusal, durable originals, rollback/recovery and guarded undo remain. Input edits during async preparation revoke the old request. Diagnostic source links recheck read scope/current full hash, even for unsupported records, and label that opening a raw note does not validate its evidence. Exclusions immediately clear derived diagnostics and detached actions refuse. No model needed.

## Testing

npm run verify after each step. Pure scanner and conservative repair tests plus actual bundled native handler tests. Actual marked synthetic vault: duplicate/malformed IDs/dates, unresolved/excluded refs with zero excluded reads, external records with bad associations, legacy headings, protected Sources, bounded/empty/canceled scans; single exact date/heading apply and guarded undo, concurrent source/inputs/settings refusal, preserved private blocks/CRLF, recoverable write failure, theme/keyboard and no inference.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

- Verify passes typecheck, 45 test files and production build. Initial pre-review log: `.thread-local/continuous-22-34/feature-28-review-prepare.log`; earlier passing Step 2 log: `feature-28-step2-repair-verify.log`.
- Actual Obsidian 1.14.4: `.thread-local/continuous-22-34/evidence/feature-28-native.json` records ten passing cases covering all diagnostic categories, redaction, private heading exclusion, oversized pre-read refusal, raw unsupported-note navigation, exact single date/heading proposals, highlighted diffs, CRLF/private-block preservation, explicit apply/undo, held-read input edits, concurrent target edits, injected uncertain write with durable originals and explicit recovery, later-edit undo refusal, immediate exclusions/detached navigation and empty/cancel/home flows. Zero excluded reads, zero oversized inspection reads and zero inference attempts.
- `.thread-local/continuous-22-34/evidence/feature-28-recovery-inspection.json` preserves direct observation of an earlier uncertain synthetic write: current bytes matched the proposed after state, durable before bytes remained, and explicit enabled recovery restored the original. Earlier native harness runs needed post-write index rebuild plus visible Review changes refresh before Undo/recovery became enabled. That harness precondition used two repairs, reached its configured limit and then passed; no disabled guard was bypassed. Other syntax/parser-guidance/handler-ready repairs and native date-segment focus adjustment are recorded in `feature-28-repairs.json`.
- Pre-F-01 bundle hashes: `.thread-local/continuous-22-34/evidence/feature-28-installed-final.json`; repaired current hashes are in `feature-28-installed-F01.json` below. Superseded install evidence is retained.
- `.thread-local/continuous-22-34/evidence/feature-28-visual-final.json`, four `feature-28-{diagnostics,repair}-{light,dark}.png` screenshots (visually inspected readable labels, wrapping, scrolling and no horizontal overflow), and `feature-28-keyboard.json` demonstrate native themes, date-segment Tab traversal, Enter to one exact highlighted repair proposal, explicit test rejection and Enter cancellation. Initial captures remain preserved.
- All work used authored notes in the marked isolated synthetic vault. Failed/injected operations preserved their durable journal and later note edits. No personal notes, paid services, AI calls or read-grant expansion were involved. Fresh full independent review is the next gate; its receipt is archived before completion.

## Try it now

In a separate synthetic test vault, explicitly permit a project with a decision containing `revisit_on: "invalid"` and a Choice heading. Run `Thread: Vault health and compatibility`. Expect a diagnostic explaining the calendar-date effect and limits. Choose `Prepare individual repair`, enter the actual YYYY-MM-DD date, prepare the proposal and inspect the highlighted exact diff in Review changes. The note stays unchanged until Apply. Apply, let indexing finish, refresh change review and inspect Undo; a later manual edit must refuse undo. Protected Sources notes show manual guidance. No model is required.


Independent review repair F-01: heading compatibility is determined only by explicit supported record type. An Overview.md filename never overrides a decision/source type or forces an untyped generic note into a project template. Existing untyped legacy discovery remains unchanged and outside this heading diagnostic's scope. Regressions cover typed decision, source and generic Overview filenames and refusal of incompatible Objective repairs.


F-01 acceptance: `feature-28-F01-verify.log` passes Verify45 files/typecheck/build. `.thread-local/continuous-22-34/evidence/feature-28-native-F01.json` reruns all ten native safety/recovery cases; `feature-28-overview-F01.json` proves decision/source/generic/session Overview filenames have zero incompatible heading diagnostics/repair controls and unchanged originals. `feature-28-installed-F01.json` binds the repaired bundle. Prior theme/keyboard evidence remains applicable because the visible controls/layout are unchanged; the native heading contract and complete lifecycle were rerun. The first changes-requested receipt is preserved in `.thread-local/continuous-22-34/feature-28-review-r1.md`. F-01 is fixed pending fresh independent closure, not self-closed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9953,"specSha256":"3e3c6083ccf80a0a76d6a59e9b815256421e2a9fe470f29998b93b5d29b1e12b","branch":"refs/heads/feature/vault-health-and-compatibility","head":"3753176fb003baf1632e88a627961e9ec216842b","baseRef":"refs/heads/main","baseCommit":"4b1c41f103317874f45a3adde99db8970af5f439","sourceTree":"4c4b96cff96f9ab945b55d09a0945550da679672","landing":"local-merge","absentOptional":[]} -->

## Findings

### 28/F-01 [P1] closed - Overview filename overrides explicit record type and offers incompatible heading repairs

**File:** src/vault/health.ts:33
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `recognizedHeadings` treats every `Overview.md` as a project before inspecting explicit record types. A writable `Knowledge/Overview.md` with `type: decision` and a valid nonempty `## Choice` receives a missing Objective/Goal diagnostic. Its repair dropdown offers only Objective/Goal, and `repairHealthHeading` accepts replacing Choice with Objective, removing the heading that decision consumers recognize. Session/question/milestone records named Overview have the same precedence problem. Generic and `type: source` Overview notes are also incorrectly forced into a project template, contrary to the active spec. A read-only Node reproduction confirmed all three false diagnostics and the exact Choice-to-Objective proposal; existing tests omit this filename/type collision.
**Suggested fix:** Let explicit recognized record types select their own heading contracts. Restrict any legacy Overview fallback to the same permitted project-discovery conditions used by the host, and do not apply it to generic/source notes or override another explicit type. Add regression cases for a decision named Overview.md retaining Choice, its allowed repair targets, and generic/source Overview notes receiving no project-heading diagnostic.
**Resolution:** Closed by fresh independent full-delta review at 3753176fb003baf1632e88a627961e9ec216842b on 2026-10-16. Reviewed the complete scanner/modal implementation and tests: recognizedHeadings now depends only on explicit supported type, so decision Choice and session progress semantics survive Overview filenames and generic/source notes receive no template contract. Scanner regression and incompatible Objective repair refusals pass in npm run verify (45 test files, typecheck, production build). Inspected native feature-28-overview-F01.json and its harness: decision/source/generic/session Overview cases report zero heading diagnostics/incompatible controls and preserve originals. Inspected the full ten-case feature-28-native-F01.json rerun and native harness; rebuilt and installed bundle hashes match feature-28-installed-F01.json. No new defect confirmed in the repair. Earlier implementation evidence: Removed basename-based heading classification; only explicit supported record types define repair meanings. Verify45 files/typecheck/build passes in feature-28-F01-verify.log; full native safety/recovery rerun feature-28-native-F01.json passes ten cases; feature-28-overview-F01.json demonstrates decision/source/generic/session Overview notes with zero heading diagnostics/incompatible repairs and unchanged originals.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 3753176fb003baf1632e88a627961e9ec216842b
**Base commit:** 4b1c41f103317874f45a3adde99db8970af5f439
**Base ref:** main
**Spec hash:** 3e3c6083ccf80a0a76d6a59e9b815256421e2a9fe470f29998b93b5d29b1e12b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T16:10:53.377386+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T16:12:56.369223+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; strict typecheck, all 45 test files, production build. No failures, skipped tests or todos in the runner summary.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`: pass; match the exact request target/base/spec.
- `git diff --stat main..HEAD`, complete scoped diff, targeted source/dependency reads and test searches: pass; complete feature delta reviewed across all four lenses. No skipped, focused or placeholder cases in the new tests.
- `git status --porcelain=v1 --untracked-files=all` and `git diff --name-only HEAD`: pass before receipt updates; only review.md differed from the target.
- `sha256sum main.js manifest.json styles.css` and corresponding `.thread-local/improvements-lab/vault/.obsidian/plugins/thread/` files: pass; both sets match feature-28-installed-F01.json.

## Evidence

- Fresh isolated reviewer with no builder transcript reviewed all of 4b1c41f103317874f45a3adde99db8970af5f439..3753176fb003baf1632e88a627961e9ec216842b. Product scope: README.md, src/main.ts, src/ui/briefing-view.ts, both new health modules and both tests; reviewed active spec and workflow metadata separately. Followed source projection/private ranges, metadata/heading parsing, project discovery/membership, index invalidation, freshness dependencies, source navigation and existing reviewed-change policy guards as required by reachable paths.
- Checked AGENTS.md, config, coding standards, project overview, project/build plans, active spec and independent-review contract. No added runtime dependency, network/model call, direct filesystem access, persisted diagnostic cache, write-policy expansion or automatic note mutation in the feature. Reviewed sequential scan budgets, cancellation/settings/index/hash guards, bounded retained diagnostics, redacted reference messages, exact repair byte preservation and async input revocation.
- Inspected current `.thread-local/continuous-22-34/evidence/feature-28-native-F01.json` and its native test-feature-28.js assertions: all ten diagnostic/navigation/repair/concurrency/recovery/undo/exclusion/empty/cancel/home cases pass; zero excluded reads, oversized inspection reads and inference attempts. Read prior feature-28-native.json as historical context.
- Inspected feature-28-overview-F01.json and test-feature-28-overview.js: decision/source/generic/session Overview filenames retain originals and establish no incompatible heading diagnostics/repair controls. Pure regression also rejects incompatible Objective repairs. F-01 explicitly closed after code and evidence re-review.
- Current generated and installed main.js SHA-256 is 632bc0c0248d40426614ddd64a4e2d8fe9e02f06eb00029840cf18ae75b1a10e; manifest and styles hashes also match feature-28-installed-F01.json. Earlier installed-final evidence is superseded for implementation identity.
- Inspected feature-28-visual-final.json, feature-28-keyboard.json and all four final diagnostics/repair light/dark screenshots: readable native controls, wrapping, scroll coverage and visible focus; recorded native Tab/Enter preparation and cancellation. F-01 changes only heading classification and its callers/tests, leaving layout/control evidence applicable.
- Inspected feature-28-recovery-inspection.json and feature-28-repairs.json: durable before bytes, observed uncertain after state and explicitly enabled recovery restored originals; native harness waits for post-write indexing and explicit review refresh without bypassing guards.
- Excluded generated bundles, dependencies, unrelated application areas and third-party code from source audit; generated bundle hashes used only to bind acceptance evidence. Check is explicitly not required.

## Findings

- F-01 [P1] closed: explicit supported types exclusively determine heading semantics; Overview filename collisions no longer offer incompatible repairs.
- No new confirmed findings in quality, security, performance or tests. No open or fixed P0/P1 findings remain.

## Remaining risk

- Native acceptance evidence was inspected with its harness and installed hashes, not re-executed during this reviewer pass. Recorded host/platform evidence is synthetic Obsidian 1.14.4 on Linux; it does not establish other desktop platforms or large-vault scale.
- No declared dedicated security scanner or performance benchmark command exists for this feature; no current vulnerability scan or runtime profiling claim is made. Bounded logic and native read counters were reviewed.
- The documented prefix/index, scan/file/byte/display limits remain; unexamined content and semantic correctness are not certified.
