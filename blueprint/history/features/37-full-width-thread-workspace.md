# Feature: Full-width Thread workspace

**From build-plan:** feature 37
**Build attempt:** 1
**Branch:** `feature/full-width-thread-workspace`
**Status:** verified

## Goal

Open Thread in a native main tab with clear Home, Ask, Research, Actions and
Reviews navigation, while retaining the sidebar and every existing action.

## In scope

- Register a separate main-tab view and command; repeated opens reuse it. Add
  explicit links between the sidebar and main workspace. Preserve open notes
  and layout; source/target links from Thread open a new tab.
- Reuse BriefingView's Home, project selection, evidence, cancellation and stale
  output handling. Both view types receive all existing source/settings/index
  invalidation and plugin-unload cancellation notifications.
- Research, Actions and Reviews offer the current native action surfaces. Ask
  opens the existing evidence workbench only when clicked. No model request or
  write starts from navigation or restoration.
- Persist only a validated area enum (home/research/actions/reviews) in native
  view state. Missing/unknown state falls back to Home. Ignore supplied project,
  permission or content fields: current saved settings and permittedProjects
  remain authoritative; unavailable projects display guidance and read nothing.
- Preserve keyboard labels, focus and theme tokens. Navigation away cancels
  pending Home work and discards its transient output; navigating Home refreshes
  current records. Native views/modals keep their existing lifecycle boundaries.

## Out of scope

New research collections, action records/board, embedded Ask implementation,
conversation persistence, read grants, schemas, note writes, standalone web UI,
user installation updates or desktop shortcut installation.

## Build loop

Continuous Mode: feature review cadence, no step commits. Run Verify after each
step, native acceptance, final immutable checkpoint and fresh independent review;
then archive/squash locally and perform the separately authorized normal push.

## Build steps

- [x] **Step 1: Native view and lifecycle.** Register/reuse a main tab, share Home
  controls with the sidebar, validate restored area state and fan out all
  invalidations/cancellation. Open Thread note links in new tabs.
  **Done when:** lifecycle/state/source-routing regressions and `npm run verify`
  pass; no copied evidence or new grants enter persisted view state.
- [x] **Step 2: Workspace navigation and presentation.** Add Home/Ask/Research/
  Actions/Reviews navigation using current action surfaces, responsive theme
  styles, accessible controls, sidebar links and usage documentation.
  **Done when:** all existing actions remain reachable, native area changes are
  bounded/explicit and `npm run verify` passes.
- [x] **Step 3: Actual Obsidian acceptance.** Exercise repeated open, areas/actions,
  allowed/denied project switching, state restore, source opening, pending request
  cancellation, source/scope invalidation and unload in the synthetic vault.
  **Done when:** native evidence shows preserved note contents/open tabs, no new
  grants or automatic inference, real local Resume and Ask through reused
  surfaces, keyboard and light/dark layouts; final Verify passes.

## Files / areas

- src/main.ts; src/ui/briefing-view.ts; new src/ui/thread-workspace-view.ts and
  adjacent lifecycle/state tests; src/ui/health-modal.ts source navigation.
- styles.css, README.md and Blueprint evidence/history.

## Data / contracts

View type `thread-workspace`; native state `{ area: "home" | "research" |
"actions" | "reviews" }`. No personal content, project identity, grants or AI
output is stored in that state. Only current settings determine project/scope.
Source and target opening retain all existing hash/PDF-consent/access guards.
Source events, index reset/cancel, folder and settings changes invalidate both
view types. Close/unload abort pending requests; late results remain suppressed.
Text uses host DOM text helpers; no raw HTML or external assets/dependencies.

## Testing

Baseline: feature 36 final Complete Verify passed, 213 tests, strict typecheck and
production build; main 2a9c4f1513674b49c4b2e54b8403d6e77cdc0e90 is pushed.
Use existing Node/esbuild host seam for logic, actual isolated Obsidian/Ollama for
UI/inference. Preserve prior evidence and feature archives byte-for-byte. Do not
use mocks as native acceptance. Independent review covers shared lifecycle and
persisted state boundaries. Check gate is manual; native acceptance is explicitly
required by the user's approved run.

## Notes for the AI

First build: no feature 37 archive identity, exact archive filesystem/history use
or conflicting branch ref exists. Archive destination is
blueprint/history/features/37-full-width-thread-workspace.md. No unresolved
product decision. Keep later feature scope out and do not alter personal vaults.

Step 1 verification: npm run verify passed (217 tests, strict typecheck and
production build). State injection, pending Resume suppression, source/close
invalidation and unavailable-project regressions pass. Native routing proof
follows in step 3.

Step 2 verification: npm run verify passed (217 tests, typecheck/build). Step 3
native acceptance uses the existing isolated Flatpak Obsidian profile and Ollama:

- lab/evidence/37-open.json: one main view after repeated open; Home, sidebar,
  existing Welcome tab, settings and note contents preserved.
- 37-navigation.json: all 20 grouped native tools opened and closed without note
  saves; unknown restored state/denied project ignored; source opens another tab.
- 37-inference.json: real qwen3:4b-instruct Resume and Ask, cited synthetic
  objective, unchanged source/settings. Navigation/restoration did not generate.
- 37-lifecycle.json: navigation abort/late-result suppression, empty/allowed
  project switch without grants, source event/index reset/scope invalidation in
  both views, excluded project fail-closed, both requests aborted on unload.
  Authored synthetic source and settings restored. Initial immediate post-enable
  area was still being restored by Obsidian; this record does not claim saved
  Reviews. Separate settled persistence/restart evidence below proves restoration.
- 37-state-save.json and 37-restored.json: native workspace.json contains only
  the area; an actual isolated app quit/relaunch restores Reviews, preserves both
  original open note tabs/settings and contains no generated output.
- 37-keyboard.json: native Tab Home -> Ask, visible solid outline, 32px target.
  37-workspace-dark.png and 37-workspace-light.png visually inspected: native
  navigation/cards, legible theme tokens and retained sidebar/open notes. Theme
  evidence uses the native theme classes, not an installed community theme suite.

All evidence is under .thread-local/continuous-35-plus/lab/evidence. No user
profile or personal vault was modified. No new dependencies or write formats.

Final npm run verify passed: 217 tests, zero failures/skips, typecheck and build.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7029,"specSha256":"acae0bfc893b9e5b3ba6e37e72a702e9b38173e9ea054522cb0263344da57046","branch":"refs/heads/feature/full-width-thread-workspace","head":"8368fbf17ca969108b101958ceb800a92ac35794","baseRef":"refs/heads/main","baseCommit":"2a9c4f1513674b49c4b2e54b8403d6e77cdc0e90","sourceTree":"5a6f9e159f685b823ab0c78e15f1a81201748e72","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 8368fbf17ca969108b101958ceb800a92ac35794
**Base commit:** 2a9c4f1513674b49c4b2e54b8403d6e77cdc0e90
**Base ref:** refs/heads/main
**Spec hash:** acae0bfc893b9e5b3ba6e37e72a702e9b38173e9ea054522cb0263344da57046
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T17:31:15.332938+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T17:32:31Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`: pass; exact requested target, base and tracked spec hash.
- `git diff 2a9c4f1513674b49c4b2e54b8403d6e77cdc0e90..8368fbf17ca969108b101958ceb800a92ac35794`: pass; complete eight-file delta reviewed, excluding review/findings workflow state.
- `npm run verify` (approved elevated execution for synthetic loopback tests): pass; strict typecheck, 217 tests, zero failures/cancellations/skips/todos, production build.
- `git diff --check 2a9c4f1513674b49c4b2e54b8403d6e77cdc0e90..8368fbf17ca969108b101958ceb800a92ac35794`: pass.
- `sha256sum main.js styles.css`: pass; both outputs match `37-installed-build.json`.
- `git status --short`, `git diff --cached --name-only`, `git ls-files --others --exclude-standard`, tracked-spec lookup and repeated merge-base/hash checks: pass; only permitted review evidence differs, no staged or untracked paths.
- Targeted source/test searches: pass; no focused, skipped or placeholder tests found in the reviewed delta.

## Evidence

- Fresh isolated Codex reviewer received only the project-local review handoff, without the builder conversation. Exact runtime model: `gpt-6.1-sol`.
- Complete current delta: `README.md`, tracked `blueprint/context/current-feature.md`, `src/main.ts`, `src/ui/briefing-view.ts`, `src/ui/health-modal.ts`, `src/ui/thread-workspace-view.ts`, its adjacent test file, and `styles.css`.
- Applied `AGENTS.md`, project config, coding standards, overview, AI interaction guidelines, feature 37 build-plan contract, Audit skill and independent-review reference. Followed nearby project-home permission checks, evidence freshness, source-link validation, modal lifecycle and build/test configuration as needed.
- Quality: workspace reuses the existing Home/project selector and native modal actions; validated area state contains no grants, project identity or generated content. No added dependency or unrelated product scope.
- Security: source/target routing changes preserve existing access/hash/PDF checks; restored state ignores supplied permission/content fields; both native view types receive settings/source/index/folder invalidation and unload cancellation. No new raw-HTML or external-network surface.
- Performance: bounded navigation and existing view lifecycle reviewed; navigation cancels pending Home work and suppresses late results. No new unbounded collection or background inference found.
- Tests: four new lifecycle/state tests exercise actual shared view code through the established host seam, including invalid restoration, pending cancellation, source/close revocation and denied-project settings preservation. Native layout/action behavior is supported by the separate recorded host evidence below.
- Inspected `.thread-local/continuous-35-plus/lab/workspace-open.js`, `workspace-navigation.js`, `workspace-inference.js` and `workspace-lifecycle.js`, plus their recorded `evidence/37-before.json`, `37-open.json`, `37-navigation.json`, `37-inference.json`, `37-lifecycle.json`, `37-state-save.json`, `37-restored.json` and `37-keyboard.json` outputs. Evidence covers tab reuse/preservation, all 20 native tools, unchanged grants/sources, actual local Resume/Ask, state injection, cancellation/invalidation, unload, and settled restart restoration.
- Visually inspected native `37-workspace-dark.png` and `37-workspace-light.png`: readable themed navigation/cards, visible Ask focus ring, retained sidebar and original note tabs. Installed bundle/style hashes match this review's production build.
- Generated bundles, PDF resources, caches, dependencies, old evidence/history and unrelated source were excluded from the code audit; current generated hashes were checked only to bind the native evidence to this product build.

## Findings

- None across quality, security, performance and tests. No findings added, updated or closed; the empty findings ledger remains unchanged. No repair order needed.

## Remaining risk

- Native Obsidian/Ollama acceptance was inspected from existing synthetic-vault records and screenshots; this reviewer did not rerun the desktop session. Check is not required by the request/configuration.
- No runtime performance profile, community-theme matrix or current network-backed dependency vulnerability scan was performed. No unavailable verification command or required failing check remains.

## Try it now

Run or do:

With the updated plugin enabled in Obsidian, use Ctrl/Cmd+P and run **Thread:
Open full workspace**. Click **Research**, then run the same command again.

Expected:

One Thread workspace tab remains open, Research shows Find and ask / Collect
knowledge cards, and your existing note tabs stay open. **Open sidebar** keeps
the compact view available.

This proves:

The main-tab entry, grouped navigation and repeat-open tab reuse. This guide is
not an additional verification or user-acceptance claim.
