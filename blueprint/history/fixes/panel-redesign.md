# Fix: Panel redesign

**Type:** Fix
**Status:** verified
**Branch:** fix/panel-redesign
**Authorization:** Complete visual design request and explicit OK to the implementation plan.

## The problem

Project home, Resume, Ask and change review lack the visual hierarchy shown in
the supplied design boards. Recorded context and generated interpretations need
distinct treatments without changing any application behavior.

## The fix

Restyle the three existing views using scoped theme tokens, offline font stacks,
Obsidian icons, native controls, cards and responsive layouts. References live
in `blueprint/reference/panel-redesign/`.

Preserve every action, tested label, existing aria-label, status/live region,
selection value, request guard, permission boundary, invalidation path and note
write path. Only the explicitly requested Refresh home and Settings text buttons
become icon buttons with those exact accessible names. Do not add mockup-only
data, connectivity claims or controls. Completed features 1-34 remain intact.

## Build steps

- [x] Add scoped theme tokens and shared primitives; Verify passed.
- [x] Restyle Project home with the native selector, timeline, review card,
  quick actions and all existing tools reachable; Verify passed.
- [x] Restyle Resume with recorded/AI progress and legend, source chips,
  distinct AI treatment and coverage limits; Verify passed.
- [x] Restructure Ask into evidence and context/answer columns that stack
  at narrow widths; Verify passed.
- [x] Restyle change previews with file bars, counts, line-number gutters
  and the existing exact contents, draft, renewal and apply controls; Verify passed.
- [x] Apply shared primitives to remaining dialogs and settings with minimal
  DOM/class changes; Verify passed.
- [x] Verify native Obsidian rendering, keyboard access, contrast, light/dark
  and theme-variable compatibility; final `npm run verify` passed.

## Verify

Use an isolated synthetic Obsidian vault. Capture all four redesigned surfaces.
Check narrow sidebar and modal layouts, every action label and aria-label,
unchanged live regions, evidence choices, generated answer invalidation,
renewed draft previews and disabled apply states. Inspect actual colors and
focus outlines in both themes. Use existing runtime and fixtures; preserve
previous acceptance evidence and personal vaults.

## Acceptance evidence

All evidence is in the ignored `.thread-local/panel-redesign/evidence/` directory.
The prior release archives, reports, packages and synthetic vault remain intact.

- `verify-1-primitives.log` through `verify-6-other-surfaces.log`: Verify after
  each requested stage. `verify-final.log`: typecheck, 60 passing test files,
  no failures/skips, production build.
- `home-check.json`: every existing home action, native Project selector,
  unchanged live region, no parsed HomeItem statuses, 420px/280px widths.
- `final-briefing.json`: recorded-only operation and real local qwen3:4b-instruct
  inference, separately rendered interpretations. No runtime/permission changes.
- `ask-final.json`, `ask-narrow.json`, `ask-invalidation.json`: real local
  answer generation, pin/exclude values, stacked 370px content, changed choices
  revoke the answer and exact context remains inspectable.
- `changes-check.json`, `changes-narrow.json`, `apply-undo.json`: previews
  and drafts do not write; editing locks Apply, renewal unlocks it; exact
  synthetic apply and undo restore original bytes. No pending/recovery state.
- `other-surfaces.json`: Capture, Decisions, Decision review, Knowledge,
  Freshness, Weekly, Session, Questions, Review queue, Workspace and the shared
  settings renderer checked in both themes.
- `keyboard.json`: real Tab/Enter events, native selector and CTA focus outlines
  (2px with 3px offset), Resume/Cancel, retained records and correct source opening.
- `theme-variables.json`: default themes and alternate community-style token
  overrides, no text contrast failures below 4.5:1 or horizontal overflow.
  This does not claim exhaustive testing of installed community themes.
- `narrow-cancel.json`: visible Cancel beside Resume at a 280px sidebar,
  without overlap between the button label and subtext.
- `unchanged-behavior-methods.json`: 23 non-rendering method blocks unchanged
  byte-for-byte. All product changes are limited to UI DOM/presentation and CSS.
- `final-*.png`: native screenshots of home, briefing/AI, Ask and changes.

## Intentional differences from the mockups

- HomeItem has no structured status field or session summary; retain its
  existing record/date text without parsing statuses or inventing excerpts.
  Structured statuses in the Decisions dialog use the requested pills.
- The model line shows the configured name with a neutral dot. It does not
  claim current connectivity or cloud state from settings alone.
- Proposal data has no uniformly exposed model/source-count display fields.
  Keep its actual timestamp/identity and source actions. Do not invent metadata.
- No safety checkmarks claim that backups or source-hash verification have
  already completed before Apply. Existing truthful guidance stays visible.
- Preserve tested action labels and native dropdown values. Existing explanatory
  text and variable real output make the screens taller than the sample boards.
- Keep Edit proposed body as the existing native details disclosure per
  operation; grouped Apply/Reject remains explicit for the entire proposal.

## Try it now

Run `npm run dev` from the repository. It rebuilds `main.js` locally.
For an existing 0.3.0 development installation, copy `main.js` and `styles.css`
into that vault's `.obsidian/plugins/thread/` folder (or use the existing linked
development installation), preserving settings, journals and PDF assets.
Reload Obsidian or disable/re-enable Thread, then inspect Home, Resume, Ask,
Changes and Settings in light and dark themes. No personal vault was installed
or modified during verification.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5980,"specSha256":"8652389c14781360b705709d3182167788ca5f777a555a411ebfa8a20075799a","branch":"refs/heads/fix/panel-redesign","head":"c42c7f805413512ce9d9ff9923be3197ca30327a","baseRef":"refs/heads/main","baseCommit":"3fc07d85471af5aa9efdfc2f996eaf17dee03265","sourceTree":"e97ae1e3451fe921e9b2bfad98f8eb8bbac57624","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** c42c7f805413512ce9d9ff9923be3197ca30327a
**Base commit:** 3fc07d85471af5aa9efdfc2f996eaf17dee03265
**Base ref:** main
**Spec hash:** 8652389c14781360b705709d3182167788ca5f777a555a411ebfa8a20075799a
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T13:57:32.960Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T14:00:06Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete 3fc07d85471af5aa9efdfc2f996eaf17dee03265..c42c7f805413512ce9d9ff9923be3197ca30327a delta in a fresh isolated subagent without the builder conversation. Run all Audit lenses from scratch. Run Check when required above. Do not edit product code, accept findings, or reuse the existing findings as the review scope.

## Commands

- `git status --porcelain=v1 --untracked-files=all`, `git branch --show-current`, `git rev-parse HEAD main` and `git merge-base main c42c7f805413512ce9d9ff9923be3197ca30327a`: passed; target and base match, non-default work branch, only permitted review evidence differs.
- `sha256sum blueprint/context/current-feature.md` and `git show c42c7f805413512ce9d9ff9923be3197ca30327a:blueprint/context/current-feature.md | sha256sum`: passed; both match the recorded spec hash.
- `git diff --stat`, `git diff --name-status` and complete `git diff 3fc07d8..c42c7f8`: passed; all 21 changed paths reviewed, including the tracked spec and five reference images.
- `git diff --check 3fc07d8..c42c7f8` and `git diff --check`: passed.
- `npm run verify`: passed; typecheck, 60 passing test files, zero failures/skips/todos, production build.
- Targeted `rg` search for skipped, focused and placeholder UI tests: no matches; exit 1 means no matches.
- Supplemental Node `execFileSync` method-comparison attempt: unavailable due to sandbox `EPERM`; equivalent read-only comparison through direct Git/file reads completed successfully, confirming all 23 listed non-rendering method blocks unchanged.

## Evidence

- Reviewed the whole base-to-target delta under the verified active spec, local coding standards, project overview and AI interaction rules. Read the installed Audit skill and independent-review contract in this fresh isolated reviewer context.
- Reviewed all changed `src/ui/` modules and both changed tests, `styles.css`, README, active spec and `blueprint/reference/panel-redesign/`. Followed nearby contracts in `thread-modal.ts`, `search-filters.ts`, `project-home.ts`, `workbench.ts` and `change-draft.ts` to assess reachable behavior.
- Quality: scoped theme tokens/native controls and grouped action wiring retain existing tools, descriptive names and live regions. Security: text continues through safe DOM text APIs, source-opening and source/scope guards remain, and apply/renew/recovery/undo handlers retain their boundaries. Performance: additional work is within existing bounded evidence, home and diff collections; no new network, dependency or unbounded render path was introduced. Tests: existing behavioral tests pass without weakened assertions; changes only extend host stubs for the added native rendering APIs.
- Inspected supplied native screenshots for Home, recorded/AI briefing, Ask, narrow Ask and change review against all five design references. Inspected `.thread-local/panel-redesign/evidence/` records: `home-check.json`, `final-briefing.json`, `ask-final.json`, `ask-narrow.json`, `ask-invalidation.json`, `changes-check.json`, `changes-narrow.json`, `apply-undo.json`, `keyboard.json`, `theme-variables.json`, `narrow-cancel.json`, `other-surfaces.json` and `unchanged-behavior-methods.json`.
- Existing native evidence covers light/dark rendering, alternate theme-variable values, 280px sidebar/370px Ask content, native selector and focus outlines, recorded-only and local inference paths, choice invalidation, draft locking/renewal and exact synthetic apply/undo. These were inspected as existing evidence, not rerun or modified by this reviewer.
- Dependencies, generated `main.js`/build assets, distribution output and unrelated features were excluded from source review. Existing ignored native evidence was read only. No product, test, spec or configuration changes were made.

## Findings

- None. No ledger finding IDs were added, updated or closed.

## Remaining risk

- Native Obsidian acceptance was not independently rerun in this review; conclusions use source review, fresh Verify and the supplied native evidence. Check was not required by this request.
- Theme evidence uses default themes and selected variable overrides on Linux; it does not establish exhaustive community-theme, macOS or Windows compatibility.
- The supplemental Node subprocess comparison was unavailable due to sandbox `EPERM`; the equivalent comparison succeeded through direct read-only tool calls, leaving no unresolved method-comparison gap.
- No security scanner or UI profiling command is declared; this review does not claim a current dependency vulnerability scan or runtime performance measurements.
