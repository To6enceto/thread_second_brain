# Feature: Desktop freshness and project reviews

**From build-plan:** feature 58
**Build attempt:** 1
**Branch:** feature/desktop-freshness-and-project-reviews
**Status:** verified

## Goal

Provide the existing on-demand project review workflows in the independent desktop window. Show current dependency states, keep explicit acknowledgements separate from evidence validity, and prepare every saved review or individual repair through exact change review.

## In scope

- Dependency-aware output freshness with redacted unavailable references and explicitly selected current sources for a separately saved refreshed version. Preserve every original output.
- Review queue with pending/handled categories, explicit reviewed/no-change or future-date snooze records, and managed follow-up question drafts. Acknowledgement applies only to its exact source snapshot; it never resolves a question, accepts a decision or makes output fresh.
- Recorded timeline with event/capture/modification distinctions and explicit user-reported milestone creation. Multi-project overview with existing status filters, bounded counts, source navigation, project switching and separately saved chosen next actions.
- Weekly local AI review for seven calendar days, selected-project default and explicit all-permitted-notes scope. Separate current evidence, reported activity, explicit resolutions, suggested revisits and gaps; non-overwriting Reviews destination.
- On-demand bounded health diagnostics and one explicit date or recognized-heading repair at a time. Preserve other fields, source hashes and original contents; unsupported/ambiguous/stale/protected notes remain manual.
- Native keyboard/light/dark interfaces, cancellation and stale/denied/empty/error states. Finite main-owned IPC, current source links and exact proposal/draft invalidation.

## Out of scope

Capture/collections (59), PDF access/extraction (60), portability/checkpoints (61), packaging (62), scheduling, inferred priority/health scores, bulk fixes, automatic state changes, remote fetching, new permissions or mutable plugin-journal sharing. No personal-note tests or everyday installation changes.

## Build loop

Continuous Mode: implement serially; feature-level review and step checkpoint commits disabled. The user approved these features and routine scope refinements, local Git lifecycle and verified normal pushes. Run Verify after each coherent step, actual Electron acceptance and fresh independent review before archival/merge/push. Preserve prior archives and reports. At most two repairs per failing check/finding; do not weaken a check to proceed.

## Build steps

- [x] 1. Add main-owned bounded snapshots for freshness, review queue, timeline, overview and diagnostics using existing shared modules. Done when filesystem tests prove scope/redaction, existing counts/limits, stale dependencies, cancellation and late-result rejection; Verify passes.
- [x] 2. Add explicit review/snooze/follow-up, milestone, chosen-action and individual diagnostic repair proposals. Bind review-sensitive proposals to current source/identity/catalog state through exact preview and Apply, including after restart; retain existing journals. Done when tests prove unchanged originals before Apply, explicit non-overwriting saves, snapshot changes/new dependencies/duplicates, conflicts, guarded Undo and unsupported repair refusal; Verify passes.
- [x] 3. Add local weekly and refreshed-output drafts with main-owned selected evidence, bounded context and reviewed saves. Done when tests prove dates/scope/support, no stale-source reuse, explicit source selection, model/input/scope cancellation, no autonomous states and exact non-overwriting proposals; Verify passes.
- [x] 4. Wire finite IPC and native review surfaces, grouped controls, keyboard/source navigation, accessible statuses and light/dark primitives. Done when UI lifecycle tests reject late results and obsolete proposals, every planned action is reachable, and Verify passes.
- [x] 5. Demonstrate actual Electron queue acknowledgement/snooze/follow-up and changed-snapshot reappearance, timeline/milestone/next action, overview switching/filtering, diagnostics and individual reviewed repair. Demonstrate real local weekly/refreshed generation, original preservation, exact saves/Undo/conflicts, cancellation/revocation, keyboard and both themes with synthetic vaults. Done when acceptance artifacts and preservation checks pass; Verify passes.
- [x] 6. Update docs, limitations and try instructions; self-review the complete delta and prepare the immutable independent-review checkpoint after final Verify. Done when evidence is current and previous archive bytes are intact. Completion additionally requires a fresh passing independent review of this exact checkpoint, with all findings resolved.

## Files / areas

New standalone reviews.ts main workflow and focused tests; native reviews-view.ts and lifecycle tests; contracts/preload/main/renderer/app/styles wiring. A small standalone catalog-fingerprint helper and changes.ts integration may bind review-sensitive proposals through durable preview/Apply; extend its focused tests. Reuse vault/review-events.ts, review-queue.ts, timeline.ts, project-overview.ts, health.ts, weekly.ts, knowledge.ts, questions.ts, freshness/index/evidence plus existing desktop reader/projects/AI/storage/changes. docs/desktop.md. No shared plugin behavior change expected; any such change requires actual Obsidian regression.

## Data / contracts

Reuse existing Markdown schemas for review-event version 1, managed questions, milestones, next actions and generated review/knowledge. Keep source snapshots and user reports readable. Main owns snapshot IDs, source bytes, original hashes, proposed content and exact save capabilities; renderer submits only bounded labeled values and current snapshot choices. No generic filesystem, shell, IPC or arbitrary Markdown-write method.

Reuse existing review bounds: 200 candidates per category inspected, 20 pending and 20 handled shown; 200 dependency notes/2000 references and managed-question 1000-reference budget. The journal's 100-source/10-operation/1 MB combined text limits still apply; oversized snapshots must refuse an acknowledgement rather than truncate provenance. Timeline: 200 events/2000 records. Overview: 20 matching projects/2000 records per card, no inferred priority. Health: 500 indexed permitted files, 1 MiB/file, 8 MiB total and 200 displayed diagnostics. Weekly: up to 80 eligible notes, seven valid local calendar days; refreshed output: up to five explicitly selected current notes. Existing 16000-character evidence, index and local model bounds remain.

Review/milestone/choice writes use project subfolders; generated weekly/refreshed versions use the explicitly mapped Reviews folder. Writable roles never grant reads. Health repairs require current permitted writable notes, usable provenance, unambiguous identity and the existing conservative scalar/heading validators. Current target and supporting bytes must be rechecked; no overwrite of a new-note destination. Acknowledgements and follow-ups require a recomputed matching review snapshot before proposal.

Durable review-sensitive proposals must also reject changes to the permitted note catalog that can alter missing-source resolution or ID uniqueness without changing existing supporting bytes. Use a bounded main-computed catalog fingerprint, excluding changed targets whose own identity/bytes are already checked. If extending the desktop opaque change context, use a new explicit version for guarded proposals; retain version-1 reading and recovery without rewriting existing journals. Older desktop code must refuse the unknown guarded context, not silently omit its checks. Recovery/Undo preserve existing originals and must not require obsolete evidence to be made current merely to recover the owned write. No widening of grants or journal limits.

## Testing

Baseline: 57-completion-verify.log passes 434 tests, strict typecheck and both builds; landed main ab11381d0baf7c376f9897fe5d7f14e790d9f41e has exactly that product tree plus proven bookkeeping and is pushed. Add deterministic real-filesystem/controller and delayed-view regressions using existing Node tests. Inspect any reused native helpers for 57 assumptions before creating new ignored vault-58/profile-58 and evidence. Use actual sandboxed Electron, freely licensed local model inference and authored synthetic notes only. Retain previous fixtures and reports. Test new dependency appearance, duplicate identity, source edits, scope revocation, canceled scans/generation, wrong snapshots, date/heading refusals, collisions, exact saves and guarded recovery.

## Notes for the AI

Prefer the existing pure validators and native controls; no forms framework, database or scheduler. Split this broad port into the coherent steps above while preserving feature ID 58. Keep read-only overview/health available without a selected project; selected-project actions require current project identity. Report current index coverage and unavailable counts. Model claims remain interpretations, and citation validation does not prove semantic support. Empty, missing-date and unsupported records need honest guidance, never invented chronology or automatic repairs.

## Acceptance evidence

- Step 1: 58-step1-focused-r1.log passes five filesystem snapshot cases; 58-step1-verify.log passes 439 tests, typecheck and both builds. Covers stale dependencies, redacted unavailable references, explicit chronology/status filters, bounded health diagnostics and cancellation/revocation. Original notes and journal remain unchanged. The first coverage fixture assumed a file-count index omission; it now includes an actual over-size source to prove reported index omissions separately from the health scan's 500-file bound. No product limit was changed.

- Step 2: 58-step2-focused-r1.log passes 18 review/change cases; 58-step2-verify.log passes 445 tests, typecheck and both builds. Explicit review/snooze/follow-up, milestone/next-action and individual date/heading repair proposals preserve sources and require exact Apply; collisions, new duplicate identities, external edits and canceled preparation refuse changes. Guarded desktop context version 2 retains a bounded catalog fingerprint across restart and requires fresh explicit grants; newly appearing notes block old proposals, while guarded Undo preserves later unrelated edits. Existing version-1 contexts remain supported. One fixture edit was moved outside the Open questions section so it tests snapshot invalidation without also adding a new recorded question; no product behavior was weakened.

- Step 3: 58-step3-focused.log passes 15 controller cases; 58-step3-verify.log passes 450 tests, typecheck and both builds. Weekly project/default and explicit all-permitted scopes honor dates and the 80-note budget, preserve user-report distinctions and save only exact new notes. Refreshed versions use explicitly chosen current evidence without sending stale original text and retain the original. Tests prove source verification before model transmission, input/cancel/source/revocation/model invalidation, discarded save capabilities, collision refusal and guarded Undo.

- Step 4: 58-step4-focused.log passes five delayed native-view lifecycle cases; 58-step4-verify.log passes 455 tests, typecheck and both builds. Finite IPC and native queue/freshness/timeline/overview/health/weekly controls retain explicit scopes, empty source selection, exact proposal IDs and cancellation. Input edits, revoked access and canceled work reject late drafts or review navigation. No plugin/shared behavior changed.

- Step 5: Actual sandboxed Electron used new ignored vault-58/profile-58 on owned Xvfb, without starting Obsidian. Evidence 58-native-setup/reviewed/manual/health/conflict-r1/cancel-revoke/catalog JSON proves explicit grants and writer ownership, queue acknowledgement and changed-snapshot reappearance, future snooze, separate open follow-up, unknown timeline dates, milestone, paused filtering/project switching, chosen action, individual date/heading repair, guarded Undo, external edit preservation, new-catalog conflict, cancellation, revocation/regrant and current source navigation. No personal notes were tested.
- Real local qwen3:4b-instruct through owned cloud-disabled loopback Ollama generated the weekly and refreshed outputs (58-native-weekly-r1.json, 58-native-refreshed-r1.json; provider requests retained in 53-ollama.log). Seven new notes match their exact reviewed bytes; six untouched original notes remain byte-identical, while the two intentionally edited fixtures match their recorded external/approved edits. 58-preservation.json proves ten retained batches, no pending proposal and no canceled/revoked/conflicting note creations. Original stale output is unchanged; refreshed output is current.
- Native acceptance fixture corrections preserved initial failed logs: the first conflict observation raced expected index invalidation, so the same no-write check was repeated after the index settled; a premature weekly attempt correctly refused missing applied model settings. The refreshed provenance assertion now checks the existing URL-encoded prior-version link rather than an unencoded path; the same retained model draft was inspected and saved, not replaced. No product check or bound was weakened.
- 58-overview-light.png and 58-overview-dark.png were visually inspected in actual Electron. No horizontal body overflow; native review buttons exceed 32 px. 58-native-keyboard-tab.json confirms native Tab navigation, a solid 2 px focus outline and role=status; native Enter triggered Refresh. Source navigation opens the current Method section. Shared plugin code was unchanged; full Verify continues to cover its tests and production build.

## Try it now

1. Run `npm run desktop:start` in a normal Fedora graphical session. Choose a synthetic vault, explicitly grant its project/source/review paths, inspect compatibility and enable desktop writing with other editors closed. Map Projects and Reviews without expanding read grants.
2. Refresh projects, select a project, then Project reviews. Inspect queue categories and handled snapshots. Record a reason and preview one acknowledgement, future snooze or follow-up question. Review changes -> Preview pending change -> Apply exact change is always explicit. Edit a supporting fixture externally and refresh to see its changed snapshot return.
3. Switch Review view to Project timeline, All projects or Vault health. Try a manual milestone, chosen next action or one eligible date/heading repair through exact review. Inspect preserved originals and guarded Undo in Review changes. Project status filters never change statuses.
4. Apply an already downloaded local model. Weekly review defaults to Selected project; inspect its generated reports, interpretations and sources before Preview weekly review note. In Source freshness, choose an old output plus one to five current replacement sources, then Generate refreshed and preview its separate note. Cancel or change inputs to discard an obsolete draft. No generation saves a note automatically.

- Step 6: 58-final-verify.log passes all 455 tests with zero failures/skips, strict typecheck and both production builds. Self-review checked finite IPC, explicit scopes, current source guards, version-2 catalog checks, retained version-1 recovery, journal bounds, cancellation, keyboard controls and theme primitives. docs/desktop.md documents workflows, compatibility and finite coverage. All pre-run archives and completed features 50-57 retain their recorded SHA-256 bytes. This verified spec and full feature delta are ready for the required fresh independent review; its receipt remains a completion gate.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":15881,"specSha256":"df640549cc830d8eed7461f40106413a7e03d186040e8985e315bf29adb330ed","branch":"refs/heads/feature/desktop-freshness-and-project-reviews","head":"767533c095f0183969c14ef025d71aa2889f0e80","baseRef":"refs/heads/main","baseCommit":"ab11381d0baf7c376f9897fe5d7f14e790d9f41e","sourceTree":"25cc6dba154ea3f3d6ad2215d2b210c6586148e9","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 767533c095f0183969c14ef025d71aa2889f0e80
**Base commit:** ab11381d0baf7c376f9897fe5d7f14e790d9f41e
**Base ref:** main
**Spec hash:** df640549cc830d8eed7461f40106413a7e03d186040e8985e315bf29adb330ed
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-22T01:41:25.613013+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-22T01:44:56Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD main`, `git merge-base main HEAD`, and `sha256sum blueprint/context/current-feature.md`: pass before and after review; exact target, base and spec match, with only permitted review evidence dirty.
- `git diff --check ab11381d0baf7c376f9897fe5d7f14e790d9f41e..767533c095f0183969c14ef025d71aa2889f0e80`: pass.
- `npm run typecheck`: pass independently.
- `node --experimental-strip-types --test src/standalone/reviews.test.ts src/standalone/reviews-view.test.ts src/standalone/changes.test.ts`: pass independently with host listener access; 28 tests, zero failures/skips. The initial sandbox attempt could not acquire writer-ownership listeners; a direct run identified that environment limitation.
- `npm test`: pass independently with host listener access; 455 tests, zero failures/skips/todos.
- `npm run verify`: inspected retained `.thread-local/desktop-50-62/evidence/58-final-verify.log`; strict typecheck, 455 tests, plugin production build and desktop build passed. Builds were not rerun by this reviewer because they write generated assets outside the two permitted evidence files.
- Read-only loopback CDP inspection of the existing Electron page at port 9340: pass; actual desktop file URL, expected finite bridge, ready review status and no horizontal body overflow.
- Read-only Python SHA-256 and exact-text comparisons against native evidence: pass; six untouched originals match, the two intentional edits match their recorded contents, and weekly/refreshed saves equal exact reviewed drafts.
- `node --experimental-strip-types --test --test-isolation=none --test-reporter=spec ...`: unavailable; Node 22.22.2 does not support that isolation option. The normal project-supported test command subsequently passed.

## Evidence

- Complete 15-file `ab11381d0baf7c376f9897fe5d7f14e790d9f41e..767533c095f0183969c14ef025d71aa2889f0e80` delta reviewed from scratch: active spec, desktop docs, HTML/styles, catalog fingerprint, changes implementation/tests, contracts, main/preload/renderer wiring, review controller/view and both new test files. Followed relevant existing reader, index, project, AI, storage/change, freshness, evidence, queue, review-event, timeline, overview, weekly and conservative repair contracts. No builder transcript was supplied.
- Checked repository standards for strict TypeScript, finite untrusted renderer inputs, main-owned reads/writes, explicit grants and roles, text-only rendering, bounded local inference, cancellation, source/catalog identity guards, original preservation, non-overwriting proposals, guarded Undo/recovery and native accessibility. No skipped, focused or placeholder tests found in the changed tests.
- Inspected `58-native-setup.json`, `58-native-reviewed.json`, `58-native-manual.json`, `58-native-health.json`, `58-native-conflict-r1.json`, `58-native-catalog.json` and `58-native-cancel-revoke.json` under `.thread-local/desktop-50-62/evidence/`; these cover explicit grants, exact acknowledgements and reappearance, future snooze, separate open follow-up, unknown chronology, milestone, status filter/project switching, chosen action, individual date/heading repairs, Undo, external-edit/catalog conflicts, cancellation/revocation and current source navigation. Inspected relevant native automation assertions as supporting evidence, without executing mutations in the acceptance vault.
- Inspected real-local-model `58-native-weekly-r1.json` and `58-native-refreshed-r1.json`, including actual saved Markdown/provenance, source selection and exact draft comparisons. Independently compared both saved files to `exactAfter` and checked original hashes from `58-originals.json` plus the two explicit edit artifacts; results support `58-preservation.json`.
- Visually inspected `58-overview-light.png` and `58-overview-dark.png`; native controls, legible themes and bounded layout are present. Inspected `58-native-keyboard-tab.json` for actual Tab focus, 2 px solid focus outline, live status and successful refresh. Live Electron inspection was read-only.
- Generated output, dependencies, existing archives and unrelated product areas were excluded from code scope. Existing generated/native evidence was read where needed to assess this feature. No product, test, spec, config, acceptance vault or archive was changed by the reviewer.

## Findings

- None. No confirmed quality, security, performance or tests finding across the complete target delta. No finding IDs added, updated, accepted or closed; the ledger records this no-findings pass.

## Remaining risk

- The initial focused sandbox run was unavailable because local writer-ownership listeners were blocked; the same tests and the full configured suite subsequently passed with host access. The unsupported `--test-isolation=none` diagnostic command was also unavailable on Node 22.22.2; the supported runner passed without it. Neither leaves an unresolved verification gap.
- Builds were assessed from retained final Verify evidence rather than rerun; this preserved the Phase B restriction to editing only findings/review files. Native write/inference acceptance was assessed from retained artifacts, exact current synthetic-file comparisons and read-only live inspection; no acceptance mutations or fresh model generation were performed.
- Configured Check is manual and not required for this request. Evidence bounds and citation validation do not establish exhaustive vault coverage or semantic truth of model claims; the documented UI and Markdown retain those limitations. No additional risk identified.
