# Feature: Desktop project home and recorded Resume

**From build-plan:** feature 51
**Build attempt:** 1
**Branch:** feature/desktop-project-home-and-recorded-resume
**Status:** verified

## Goal

Resume a permitted Markdown project in the independent desktop app with sourced recorded context, without Obsidian or an AI runtime.

## In scope

- Volatile project-folder mapping and selection among current permitted projects. Mapping organizes already granted notes; it grants nothing and never imports plugin settings.
- Reuse shared project discovery, home records, evidence selection and deterministic recorded briefing logic. Show bounded sessions, decision statuses/dates and open questions with counts.
- Current-source citations, excerpts, explicit missing evidence, baseline/date qualifications and index/context coverage. Open citations in the existing safe reader.
- Clear obsolete home/briefing views on project changes, cancellation, access changes, vault changes and index invalidation. Revalidate hashes before publishing a briefing.
- Accessible native controls, loading/empty/invalid/denied/error states and standalone light/dark styling.

## Out of scope

AI/model configuration (52), Ask (53), persisted settings/history or writes (54+), PDF access, plugin journal access and automatic permission expansion.

## Build loop

Continuous Mode authorization covers spec/feature review, branches, commits, local squash merge and separately authorized normal push. Review once per feature; step checkpoint commits disabled. Run Verify, actual Electron acceptance and fresh independent review before completion. Preserve prior archives and reports; respect two repairs per failing check/finding.

## Build steps

- [x] 1. Add a bounded desktop project snapshot service and finite typed IPC that reuse existing project/evidence/recorded functions. Validate mapping/selection, current scope/revision and source hashes; keep read budgets, cancellation and identity protections. Done when meaningful tests prove discovery, records/dates, missing evidence, permission denial, external edits and canceled/stale requests, and Verify passes.
- [x] 2. Add project selection/home and recorded Resume UI with sourced sections, excerpts, coverage and safe internal citation navigation. Clear stale views on every relevant boundary; retain source browsing/search. Done when Verify passes and actual Electron demonstrates two projects, Resume without AI, citation navigation, empty/missing states, cancellation, revocation and external edits with keyboard/light/dark usability.
- [x] 3. Document the milestone and run final acceptance, Verify and fresh independent review. Done when native evidence and preserved-fixture/archive checks are recorded and the verified snapshot is ready for fresh independent review. Its passing receipt remains a separate completion gate.

- [x] 4. Repair F-01 by preventing mapping input from invalidating a pending scope reply, including queued input events. Done when repeated actual Electron grant/input overlaps retain the approved revision, Refresh/projects/Resume work, Verify passes and the repair is ready for fresh independent closure.

## Files / areas

src/standalone/{projects.ts,projects.test.ts,contracts.ts,main.ts,preload.ts,renderer.ts,app.html,styles.css}; a focused renderer module if useful; docs/desktop.md. Reuse src/vault/{project-home,evidence,index} and src/intelligence/recorded without importing Obsidian.

## Data / contracts

Project requests carry vault revision, a vault-relative projects-folder mapping and optional selected project. Main validates shape and membership against the current scoped index; renderer input cannot create grants. Mapping/selection remain session-only and clear on vault changes/reload. Project metadata and rendered text stay untrusted. Record dates describe notes, not verified events. Display missing or omitted evidence explicitly. Existing note types, statuses, link membership, identity-dependent output freshness and context bounds remain authoritative. Freshness checks cover the full selected project dependency set before returning a sourced result; later navigation rechecks hashes. A canceled index must be explicitly refreshed before project reads resume. No filesystem or plugin-state writes.

## Testing

Baseline: npm run verify passed 353 tests, strict typecheck and plugin/desktop builds. Add isolated filesystem tests with synthetic project/session/decision/question records, missing dates, stale derived outputs, excluded/changed sources and cancellation. Actual Electron acceptance uses the existing owned display/profile and synthetic vault, with original fixture hashes preserved. Shared behavior changes require isolated Obsidian regression; reuse alone retains plugin Verify/build parity. Store evidence under .thread-local/desktop-50-62/evidence/51-*.

## Notes for the AI

Do not claim pending plugin reviews: this milestone cannot read plugin state. No fabricated dates/statuses, complete-coverage claims, network/assets, writes or hidden AI. Preserve keyword-only reading. Launchable development build is not feature 62's packaged release.

## Acceptance evidence

- Step 1 and final Verify: 356 tests, strict typecheck and both builds passed. Final layout rechecked in actual isolated Electron after reload.
- Native evidence: .thread-local/desktop-50-62/evidence/51-native-final.json covers two projects, mapping without grants, recorded/unknown dates, proposed decisions, deterministic Resume, current-source headings, switching, missing evidence and cancellation during Resume/across the poll interval.
- .thread-local/desktop-50-62/evidence/51-external-edit.json proves external-edit invalidation, saved stale citation refusal, refreshed content, revocation, empty projects and invalid IPC rejection.
- Final light/dark screenshots were visually inspected; 51-keyboard.json confirms native Enter opens Objective and gives its heading a visible focus outline.
- 51-preservation.json proves 53 prior archives plus feature 50, both synthetic fixture trees, shared plugin sources and plugin bundle preservation. No Obsidian API or shared behavior changes in this feature.
- Limits: read-only, volatile session setup, named-folder projects, existing bounded index/context and 2.5-second monitoring. No AI or plugin pending-review loading yet.

## Try it now

1. Run `npm run desktop:start` in your graphical Fedora session and choose a synthetic vault.
2. Preview/approve `Projects` read access with private folders excluded. Set Project folder mapping to `Projects`, then Refresh projects.
3. Select a project, inspect its sessions/decisions/questions, then Resume project. Open a source chip or Supporting excerpt.
4. Switch projects or edit a synthetic source externally; old recorded output clears. Cancel indexing pauses monitoring until Refresh.
5. Close vault and clear access. Notes and plugin history remain unchanged.

- F-01 repair attempt 1: project mapping uses the existing guarded read-ticket entry point, which cannot invalidate an access transition, and is disabled while approval settles. Native 51-repair-scope-race.json records three exact grant/input overlaps followed by successful Refresh/project selection/Resume. 51-repair-core.json reruns the complete native core. Fresh independent closure remains required.
- Repair Verify passed: 356 tests, strict typecheck and both builds. No shared plugin code changed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7453,"specSha256":"207cfadf09e3fbe9ef50440622f9e7cc9df99d5846610c178f3512e01f3a8dfd","branch":"refs/heads/feature/desktop-project-home-and-recorded-resume","head":"c0a508830d681270625e128400d6b612831861aa","baseRef":"refs/heads/main","baseCommit":"bd597df439582c6c93eeeb3f8079baa6976e3b9d","sourceTree":"23134e1e3405d86b3fffcda6d0068fd6e4ff818c","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 51/F-01 [P1] closed - Project mapping edits can discard an approved access transition

**File:** src/standalone/renderer.ts:249
**Found:** 2026-10-22 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The project-folder input remains editable while `grantScope` is pending and unconditionally calls `requests.invalidate()`. This invalidates the scope ticket, so the grant handler at lines 197-199 discards the successful reply after main has advanced the vault revision. The renderer retains the old revision: Refresh fails with "Vault or access changed. Refresh before using evidence.", no notes return, and project controls remain disabled. Reapplying access also uses that obsolete revision; the user must close/reselect the vault. This bypasses the existing `ReaderRequests.beginRead()` protection for pending access transitions. Confirmed in the actual isolated Electron window using synthetic vault-51; no notes were changed.
**Suggested fix:** Keep mapping edits from invalidating an active scope ticket, for example by disabling that input while access is changing or guarding its request invalidation during `scoping`. Preserve genuine vault-close/replacement invalidation. Add a regression covering mapping input between scope request and response, checking that the returned revision is retained and subsequent reads/projects succeed.
**Resolution:** Fixed in repair attempt 1. Mapping input uses `requests.beginRead()` and returns when scope approval is pending; the field is disabled until approval settles. This retains explicit close/replacement invalidation. Actual Electron regression repeats the exact queued input interleaving three times and then proves Refresh, project selection and Resume succeed (51-repair-scope-race.json). Full native core passed again (51-repair-core.json). Awaiting fresh independent closure; builder does not close this finding.

Independent closure at c0a508830d681270625e128400d6b612831861aa by codex gpt-6.1-sol, fresh subagent, 2026-10-21T21:16:51Z: reviewed the complete feature delta across all four lenses, including renderer mapping/scope handlers and ReaderRequests. `beginRead()` returns without changing the epoch during scope approval; disabling the field also prevents ordinary input. Explicit close/replacement still invalidates requests. Independently reran the inspected native scope-race script on owned Electron CDP9340 with vault-51: all three grant/input overlaps retained the approved revision and Refresh/project selection/Resume succeeded. The complete native core also passed, alongside strict typecheck and all 356 tests. 51/F-01 is explicitly closed; no repair regression or new finding identified.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** c0a508830d681270625e128400d6b612831861aa
**Base commit:** bd597df439582c6c93eeeb3f8079baa6976e3b9d
**Base ref:** main
**Spec hash:** 207cfadf09e3fbe9ef50440622f9e7cc9df99d5846610c178f3512e01f3a8dfd
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T21:14:15.002042+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T21:16:51Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and complete bd597df439582c6c93eeeb3f8079baa6976e3b9d..c0a508830d681270625e128400d6b612831861aa delta from scratch in a fresh subagent, using every Audit lens. Do not limit review to F-01; independently confirm its repair. Do not edit product code/spec/config, accept findings or perform external actions. Actual Electron is on owned CDP9340/display198 with synthetic vault-51 selected; .thread-local/desktop-50-62/native-51-core.js and native-51-scope-race.js are reusable UI-only tests after inspecting their assumptions. Evidence is under that run's evidence/51-* paths. Write the normal Phase B receipt.

## Commands

- `git rev-parse HEAD`, `git merge-base main c0a508830d681270625e128400d6b612831861aa`, `git status --short`, and `sha256sum blueprint/context/current-feature.md`: passed; target/base/spec match the unchanged request, with only permitted review evidence dirty.
- `git diff bd597df439582c6c93eeeb3f8079baa6976e3b9d..HEAD` and `git diff --check bd597df439582c6c93eeeb3f8079baa6976e3b9d..HEAD`: passed; complete delta reviewed, no whitespace errors.
- `npm run typecheck`: passed.
- `npm test`: passed, 356 tests, zero failures, cancellations, skips or todos.
- In-memory esbuild using the existing desktop and production plugin/PDF build options with `write: false`: passed. All three desktop bundles and both plugin bundles exactly match existing build assets; desktop HTML/CSS match their source. Desktop contains no Obsidian host import and renderer has no external imports. Product assets were not rewritten.
- `node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-51-scope-race.js`: passed independently; three queued grant/mapping overlaps, approved revision retained, subsequent Refresh/project/Resume succeed.
- `node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-51-core.js`: passed independently in actual isolated Electron; discovery, exclusions, dates/statuses, deterministic Resume, citations, project switching, missing evidence, cancel across polling and during Resume, and renderer Node isolation.
- Targeted skipped/focused-test search and adjacent test review: passed; no focused/skipped/placeholder additions. Existing ReaderRequests tests cover pending-scope guards and explicit close/replacement invalidation.
- Read-only fixture SHA-256 comparison and Git archive/shared-source comparison: passed; all 12 vault-51 fixture hashes preserved, no archive or shared-plugin source delta. Plugin bundle SHA-256 remains 7c29ac19e4a13d372f68a2b7441b6454c97fa23d36ecfb191450a2fa11e84cf3.

## Evidence

- Complete current scope: main merge base bd597df439582c6c93eeeb3f8079baa6976e3b9d through target c0a508830d681270625e128400d6b612831861aa. Reviewed docs/desktop.md and every changed standalone source, template, stylesheet and test: contracts.ts, evidence-index.ts, main.ts, preload.ts, project-view.ts, projects.ts, projects.test.ts, renderer.ts, app.html, styles.css. Read the active verified spec and related plan requirement. Review/findings files were excluded from product-code scope.
- Followed affected contracts through standalone security, reader, request tickets, index, project home/membership, freshness projection/graph, evidence bounds and recorded briefing logic. Checked AGENTS.md, coding standards, project overview, AI interaction rules and configuration. No dependencies, generic IPC/fs access, persistence, hidden inference or plugin-state reads were added.
- Quality/security: request shape, relative paths, selected-project membership, revision/generation checks, full dependency hashes, scope revocation, cancellation and text-only DOM rendering reviewed. Performance: existing conservative index/read and 16,000-character context bounds retained; source/dependency collection is bounded and checks cancellation/currentness between reads.
- Tests: new real-filesystem service tests cover discovery/mapping, record dates/statuses, missing evidence, malformed/out-of-scope inputs, revocation, paused work, dependency edits, edits during collection and cancellation. Native tests were inspected before reuse and ran only through the existing isolated synthetic session.
- Inspected preserved 51-external-edit.json, 51-keyboard.json, 51-preservation.json, 51-native-final.json and repair reports. External edits/stale citation refusal, revocation, empty/invalid states and native keyboard heading focus have prior actual-Electron evidence. Visually inspected 51-final-light.png and 51-final-dark.png.
- Excluded dependency/vendor trees, generated bundles, runtime profiles and unrelated source from code scope; generated bundle bytes were compared only to establish native asset parity. No shared plugin behavior changed, so no new Obsidian acceptance was needed.

## Findings

- No new findings across quality, security, performance or tests.
- F-01 explicitly closed after repaired-code inspection and independent actual-Electron reproduction of the original grant/mapping overlap. No P0/P1 finding remains open or fixed; no repair order remains.

## Remaining risk

- No blocking risk identified. Read-only, session-only setup, named-folder project discovery, bounded index/context and 2.5-second source monitoring remain documented milestone limits.
- No configured lint, dedicated security scanner, performance benchmark or browser-test command exists. This review uses code inspection, the declared logic suite, in-memory compilation and actual Electron evidence; no vulnerability scan or benchmark result is claimed.
- Check was not required. The exact asset-writing `npm run verify` wrapper was not rerun by this read-only reviewer; its typecheck/test stages passed independently and corresponding production builds passed in memory with byte-for-byte asset parity. Prior full Verify evidence remains preserved in the verified spec.
