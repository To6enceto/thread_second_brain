# Feature: Independent desktop vault reader

**From build-plan:** feature 49
**Build attempt:** 1
**Branch:** feature/independent-desktop-vault-reader
**Base branch:** main
**Status:** verified

## Goal

Open a real Thread desktop window on Fedora, select an existing vault, explicitly
grant bounded read scope and read Markdown without running Obsidian. This is the
first stage of the user's approved standalone proposal, not desktop AI parity.

## In scope

- Separate Electron 45.0.0 target, native DOM/CSS and esbuild, project-local pinned
  dependency, documented desktop build/start commands. Existing plugin bundle and
  runtime behavior remain unchanged; Verify covers both TypeScript/build targets.
- Native vault directory picker; selecting root grants no file listing/content.
  Explicit read-root/exclusion draft, visible exact scope summary and Apply action.
  Empty scope reads nothing, dot means explicitly granting the selected vault,
  exclusions take precedence. Grants remain in memory and reset on restart.
- Bounded Markdown list with path filter, explicit Refresh and source reader of
  literal text. Switching/closing vault or applying scope clears old views and
  invalidates in-flight responses. No source editing, inference or model download.
- Sandbox/context isolation, no renderer Node, narrow validated IPC, trusted sender,
  fixed bundled assets, no navigation/popups/downloads/remote requests/permissions.
- Native synthetic Electron acceptance including picker, grants, reading, changed
  source on Refresh, revoke/switch, malicious Markdown and keyboard/light/dark.

## Out of scope

Markdown formatting/link interpretation, indexing/content search, file watchers,
persisted settings/grants, AI, writes, plugin-state import, journal migration,
desktop distribution/update/shortcut installation and other platform claims.
Those are later planned features. No hidden Obsidian/background service.

## Build loop

User approved the proposed staged desktop direction and proceeding with it on
2026-10-21. Routine reversible implementation proceeds without another permission
round. Efficient feature review, no step checkpoint commits. Final Verify plus
automatic fresh independent review required for new filesystem/IPC boundaries.
Use existing local Git lifecycle authorization, preserve all prior archive bytes.

## Build steps

- [x] Add desktop build/start and isolated runtime shell. Done when both targets
  typecheck/build, sandbox/preload load in actual Electron, no remote assets and
  plugin output remains identical to baseline.
- [x] Implement bounded scoped read service and tests. Done when empty/invalid/
  excluded/traversal/symlink/hardlink/oversize/change cases refuse safely, budget
  omissions are reported and only explicit permitted Markdown can be returned.
- [x] Connect native picker, scope preview/apply, note list/filter/reader and
  accessible themes/status/errors. Done when actual Electron demonstrates the
  permitted flow, empty/denied/missing states, refresh and revocation without
  altering synthetic notes/plugin state; closing cancels obsolete responses.
- [x] Document and verify the milestone. Done when npm run verify passes, native
  evidence retained and prior archive/plugin bytes match. Independent review is a
  separate required completion gate.
- [x] Repair F-01 access approval versus Refresh. Done when pending access changes
  cannot lose their successful revision to refresh/source requests, close/switch
  still revoke old replies, focused regressions and native reproduction pass.

## Files / areas

src/standalone/{main,preload,contracts,security,vault-reader,renderer}.ts and tests;
src/standalone/{app.html,styles.css}; scripts/{desktop-build,desktop-start}.mjs;
package manifests, README and docs/desktop.md; approved plans/overview/standards.

## Data / contracts

- Host state: one selected ordinary absolute Linux directory with pinned dev/ino;
  one revision, roots/excluded string arrays (max32 each, max512 characters/path).
  Portable relative segments, no dot-dot/backslashes/NUL/control chars/hidden
  components; '.' represents root. Hidden trees, including .obsidian, never listed
  or read. No automatic recursion outside selected roots. UTF-8 .md files only.
- Main validates every IPC input and sender/frame. Only selectVault, grantScope,
  listNotes, readNote, closeVault are exposed; no generic invoke/fs/shell. Responses
  are finite typed success/error values. Unknown failures show a generic actionable
  message, never raw OS stacks/content. Dialog cancellation preserves current state.
- Linux descriptor-relative traversal uses O_NOFOLLOW for every root/relative
  component; regular single-link note handles, bounded reads and before/after
  stat/path identity checks. Root replacement invalidates reads. No file writes.
  Permission/revision checked before return, including pending operations revoked
  by changed scope/vault. Ordinary external edits require explicit Refresh/reopen
  in this milestone; label source as a snapshot rather than live-synced content.
- Limits: 500 visible Markdown notes, 5000 visited directory entries, 16 levels,
  2 MiB per source, 10 seconds traversal budget; omitted/unsupported/unreadable
  files and limits reported without returning excluded path names. Path filter
  filters the returned list only, not content or omitted notes. Renderer textContent
  only; HTML/images/scripts/URLs in notes cannot execute or trigger network.
- No durable app schema yet. Electron profile separate from vault; tests/development
  explicitly use ignored .thread-local/desktop/profile. Existing plugin data,
  history, notes and permissions are untouched. No system-level integration.

## Testing

Baseline npm run verify: 327 tests, strict typecheck and plugin production build.
Add adjacent meaningful Node tests for service boundary/races/budgets and asset/IPC
policy. Test actual Electron using owned isolated display/profile and synthetic
vault. Capture visible UI, note/content integrity, revoked views, privilege/network
refusals and launch with no Obsidian child process. Browser mocks are insufficient.
No claim that feature49 verifies desktop AI, later write paths or full vault scale.

## Notes for the AI

Keep Node APIs out of the renderer bundle. Avoid arbitrary filesystem/URL IPC.
Use native file dialog and safe text rendering. Do not mutate plugin source logic
or archives. No blanket filesystem reads, unsafe sandbox flags, user-process
termination or personal-vault tests. Do not mark future desktop features complete.

## Verification evidence

- npm run verify passed: 337 tests, zero failures/skips, typecheck and both builds.
  .thread-local/desktop-49/evidence/final-verify.log
- Actual Electron45.0.0/Chromium156 window on owned Xvfb197, native GTK picker,
  empty initial grants, exact scope preview, excluded source denial, literal
  malicious Markdown, no renderer Node, denied remote fetch, external edit refresh,
  empty-scope/close/pending-read revocation and reload clearing grants.
  native-core.json, native-lifecycle.json, native-final.json under that evidence dir.
- Light/dark screenshots reader-final-light.png and reader-final-dark.png inspected;
  persistent visible status and keyboard Tab observed. Body contrast13.80/13.34,
  muted6.05/8.02, primary CTA8.27 in light/dark respectively.
- process-tree.json proves owned Electron process tree has no Obsidian process and
  no sandbox-disabling flags. preservation.json:52 prior history Markdown files,
  synthetic plugin state/private note unchanged. Plugin main.js/styles.css/manifest
  SHA comparison passes. Synthetic Overview external edit was authored by test.
- Native test driver initially pressed the GTK dialog's default Cancel button;
  corrected driver uses actual Open. Chromium development stylesheet cache was
  cleared before final screenshots. No product gates were weakened.

## Try it now

Run or do: npm run desktop:start, choose a vault, enter Projects in Allowed paths,
review the scope preview, approve read access, then choose one listed Markdown note.
Expected: a separate Thread window displays the note's literal source without
opening Obsidian or changing the note. Close vault clears the source and access.
This proves: independent launch and explicitly scoped read-only source browsing.

## F-01 repair evidence

A scope transition now excludes read/refresh requests until its new revision is
adopted. Closing/replacing the vault still invalidates pending replies. Two new
focused tests exercise deferred approval and close/switch invalidation. Native
native-race-repair.json proves three immediate Grant/Refresh repetitions (including
queued listener events), successful later Refresh/read and close during approval.
Required fresh independent review must close the finding before completion.

After repair, npm run verify passed339 tests, zero failures/skips, strict typecheck
and both builds: .thread-local/desktop-49/evidence/repair-verify.log.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9003,"specSha256":"f5449f6abdf9965ba88ca0d218b6187e439c80dca067864e3d5d66718b1420c9","branch":"refs/heads/feature/independent-desktop-vault-reader","head":"a5f116522bc285cc4285f9b67ed35804648d2ba7","baseRef":"refs/heads/main","baseCommit":"c8542be8f8fefa5d99a8d4f15b5211904cd0220d","sourceTree":"422a6df435a1e897bd1096d383fd712d2a7b75f5","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 49/F-01 [P1] closed - Refresh during access approval loses the active revision

**File:** src/standalone/renderer.ts:91
**Found:** 2026-10-21 by /audit independent (scope: current; lenses: quality, tests)
**Why it matters:** Access approval leaves Refresh enabled while awaiting
`grantScope`. Refresh calls `loadNotes`, which increments the shared `epoch`.
The main process successfully advances the access revision, but the approval
handler then discards its response at line 94 because that epoch changed.
The renderer retains the old revision, so subsequent Refresh and Approve actions
both fail and the reader cannot recover without reselecting/reloading the vault.
This breaks the required usable refresh/scope lifecycle.

Confirmed in the actual owned Electron window on CDP 9339 with its existing
synthetic vault: call the enabled Grant and Refresh buttons consecutively before
the grant response resolves, wait 300 ms, then retry Grant. Both the first result
and retry show `Vault or read access changed. Refresh before reading.` with zero
listed notes; both buttons remain enabled. No source or product file was changed.
The 337 passing tests do not cover this renderer interaction.

**Suggested fix:** Prevent list refresh from overlapping a pending access
mutation, or give access mutations a separate identity so a list operation cannot
discard a successful new revision. Preserve close/switch invalidation. Add a
regression exercising Grant followed by Refresh before IPC completion and proving
the current revision remains usable afterward.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21 at
checkpoint a5f116522bc285cc4285f9b67ed35804648d2ba7. Re-examined
renderer.ts, reader-requests.ts and their tests: beginRead/beginScope refuse
overlap while approval settles, the successful revision is adopted before listing,
and close/switch still invalidate pending replies. Independently replayed
native-race-repair.js in the actual owned Electron window after selecting only the
existing synthetic vault: three Grant/Refresh repetitions, queued Refresh events,
later Refresh/source read and close during approval all passed. In-memory desktop
builds matched the running assets. Fresh typecheck and all 339 tests passed with
zero failures/skips. The original defect is gone; no new defect was found in the
repair or the complete reviewed delta.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** a5f116522bc285cc4285f9b67ed35804648d2ba7
**Base commit:** c8542be8f8fefa5d99a8d4f15b5211904cd0220d
**Base ref:** main
**Spec hash:** f5449f6abdf9965ba88ca0d218b6187e439c80dca067864e3d5d66718b1420c9
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T16:55:12.031457+00:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T16:58:13Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and complete c8542be8f8fefa5d99a8d4f15b5211904cd0220d..a5f116522bc285cc4285f9b67ed35804648d2ba7 delta from scratch in a fresh
isolated subagent. Read the installed Audit skill and independent-review reference.
All four lenses required. Inspect .thread-local/desktop-49/evidence, including
native-race-repair.json. Re-examine F-01 but do not use it as the review scope.
Only findings.md/review.md may change; no repairs, spec edits or commits.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --porcelain=v1 --untracked-files=all`, and `sha256sum blueprint/context/current-feature.md`: passed; exact target, base and spec hash match, with only permitted review evidence changes.
- `git diff --stat main...HEAD`, `git diff --name-status main...HEAD`, and complete changed-file inspection: passed; all four lenses covered the full checkpoint delta, excluding the findings/request records as code scope.
- `git diff --check main...HEAD`: passed.
- `npm run typecheck && npm test`: passed independently; strict typecheck and 339 tests, zero failures, cancellations, skips or todos.
- In-memory esbuild of main/preload/renderer (`write: false`) and byte comparisons of all desktop build assets: passed; actual native runtime matches checkpoint source, with no build artifacts written.
- `node .thread-local/desktop-49/cdp.mjs` native-state inspection, native picker invocation and `python3 .thread-local/desktop-49/xinput.py <existing synthetic vault>`: passed; closed initial vault, finite bridge, no renderer Node and selection alone lists no notes.
- `node .thread-local/desktop-49/cdp.mjs --script .thread-local/desktop-49/native-race-repair.js`: passed independently; three approval/Refresh repetitions, queued events, subsequent source read and close during approval.
- Focused standalone searches for skipped/focused/placeholder tests and TODO/FIXME: none found.
- Retained `npm run verify` in `.thread-local/desktop-49/evidence/repair-verify.log`: inspected; 339 passing tests, strict typecheck and plugin/desktop production builds passed.

## Evidence

- Reviewed every application/build/dependency change: `src/standalone/` contracts, main, preload, security, filesystem reader, renderer, request coordinator, HTML/CSS and all three adjacent test files; `scripts/desktop-{build,setup,start}.mjs`; `package.json` and lockfile. Followed the unchanged TypeScript configuration, test discovery and plugin build boundary.
- Reviewed changed `AGENTS.md`, README, desktop documentation, approved project/build plans, coding standards, project overview and exact active feature spec. Base ref `main`; merge base c8542be8f8fefa5d99a8d4f15b5211904cd0220d; complete range c8542be8f8fefa5d99a8d4f15b5211904cd0220d..a5f116522bc285cc4285f9b67ed35804648d2ba7.
- Checked project standards for strict/erasable TypeScript, proportional modules, narrow validated sender-bound IPC, sandbox/context isolation, empty explicit scope and exclusion precedence, descriptor-relative link refusal, bounded reads/traversal, stale-response revocation, literal source rendering and actionable errors.
- Inspected retained native-core.json, native-lifecycle.json, native-final.json, native-race-repair.json, process-tree.json and preservation.json. Visually inspected reader-final-light.png and reader-final-dark.png. Independent native repair replay returned all five success claims; window left with vault closed and access cleared.
- No committed changes to prior feature archives, plugin source/UI, plugin CSS or manifest. Retained preservation evidence covers 52 prior history files and synthetic plugin/private-source bytes.
- Dependencies, generated desktop/plugin bundles, profile/cache files and other ignored local data excluded from source review. Generated desktop assets were byte-checked only to bind runtime evidence to source. Existing findings did not define the review scope.

## Findings

- F-01 closed after code, focused regression and actual native replay re-examination. No new confirmed findings across quality, security, performance or tests; no repair order remains.

## Remaining risk

- Runtime evidence covers the owned isolated Linux Electron window and synthetic vault only; it does not establish other platforms, arbitrary vault scale, future AI/write workflows or distribution readiness.
- No lint, browser-test, dedicated security scanner or performance command is configured. Native evidence and targeted code review supply those relevant signals; dependency manifest inspection is not a current vulnerability scan. Check was not required by this request.
