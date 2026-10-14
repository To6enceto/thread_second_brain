# Feature: Reusable project workspaces

**From build-plan:** feature 2
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/reusable-project-workspaces`

## Goal

Reuse an existing vault layout or explicitly create a previewed starter project without overwriting notes.

## In scope

Folder roles, persistent project selection/exclusions, starter project and three templates with stable IDs and local dates, collision and partial-failure feedback.

## Out of scope

Indexing, chat, decision lifecycle and AI updates (later features).

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Workspace contracts** - Validate role mapping and construct deterministic starter paths/content. *Done when:* Collision/scope/path tests and Verify pass.
- [x] **Step 2 - Native workspace setup** - Add role mapping and a starter-preview modal with explicit create action. *Done when:* Actual Obsidian creates previewed notes, refuses collisions, preserves mapped selection on reload; Verify passes.

- [x] **Step 3 - Review repair** - Capture the approved workspace batch and lock form mutation during writes. *Done when:* actual pending-write race proof selects only the approved project and Verify passes.

## Files / areas

src/settings, src/vault/workspace.ts, src/ui/workspace-modal.ts, main/settings UI, adjacent tests.

## Data / contracts

Roles projects/inbox/sources/knowledge/reviews/templates are empty until explicitly saved. They grant write destinations, not implicit model read access. Project selection explicitly grants its read folder. Starter creates Overview.md and Questions.md and Project/Decision/Session templates with fresh IDs, JSON-quoted YAML values, active project status and local dates. Exclusions prohibit creation. Existing targets refuse the complete batch. A mid-write failure names partial creations and never claims complete success or removes user notes.

## Testing

Focused path/template/collision logic tests; real isolated Obsidian preview, create, collision refusal and persistence. npm run verify and required fresh independent review. Inspect synthetic data only.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

`npm run verify` passes six test files, typecheck and production build. Actual Obsidian 1.14.4 created all five notes with contents equal to the preview, refused a duplicate project without overwrites, and retained selected project, folder mapping and exclusions across plugin reload. Runtime receipt: `.thread-local/evidence/feature-02-runtime.json`. No personal vault was touched.

## Try it now

In Thread Settings save Projects and Templates folder mappings. Run “Thread: Create project workspace”, enter a name, preview all notes and choose Create previewed notes. Open the new Overview and Questions. Repeat the same name to see collision refusal. Existing templates are kept.

Review repair proof: `.thread-local/evidence/feature-02-race.json` shows locked controls, unchanged preview, exact approved selection and no unauthorized read grant during delayed writes. Verify passes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3499,"specSha256":"312f81dce6b42630d9dcbd8cf676688267322b1dc65485a916525a55388c3af8","branch":"refs/heads/feature/reusable-project-workspaces","head":"765c6da46bb699a17a2206caeba2fb6dd0341109","baseRef":"refs/heads/main","baseCommit":"a364d8b13401c06d98ae52a67823774ccbd3b794","sourceTree":"3cf6347253580753496865f2e57525e710312178","landing":"local-merge","absentOptional":[]} -->

## Findings

### 2/F-01 [P1] closed - Workspace creation selects a mutable replacement preview

**File:** src/ui/workspace-modal.ts:30
**Found:** 2026-10-14 by /audit (scope: current; lenses: quality, security, tests)
**Why it matters:** Create disables only its own button. The name and Preview controls remain active during the awaited writes, and both replace `this.notes`. After writing the originally approved batch, the handler derives selectedProject and allowedPaths from the replacement preview. A deterministic in-memory run of the actual bundled modal wrote Projects/Approved notes, then selected and granted read access to Projects/Other after changing the name and previewing while the write was pending. Merely editing the name clears the array and instead produces an error after successful writes. Preview can also re-enable Create during the pending operation. This breaks the approved-batch and explicit project-selection contracts.
**Suggested fix:** Capture the approved batch and its project path before awaiting, keep a pending guard, and disable name, Preview and Create until the operation settles. Use the captured batch for creation, selection and result reporting. Cover an edited or replaced preview and a repeated Create while writes are pending with a focused regression test.
**Resolution:** Captured immutable approved batch and project path before awaiting writes. Disabled name and preview controls, guarded handlers while creating, and used captured paths/count afterward. Actual bundled Obsidian modal with a controlled write delay rejects form mutation; selects only approved project, grants no other path. Proof: `.thread-local/evidence/feature-02-race.json`.


Independent re-review (2026-10-14, codex / gpt-6.1-sol, checkpoint 765c6da46bb699a17a2206caeba2fb6dd0341109): F-01 closed. Reviewed the complete base-to-target delta and workspace modal repair. The Create handler clones approved notes and captures the project path before its first await, all mutation handlers guard creating, and name/Preview/Create controls are disabled during writes. Completion uses the captured batch and project path. feature-02-race.json independently inspected: locked=true, previewUnchanged=true, selected=Projects/Approved Race Test, unauthorized=false, approvedExists=true. No new defect found in this repair; Verify passes.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 765c6da46bb699a17a2206caeba2fb6dd0341109
**Base commit:** a364d8b13401c06d98ae52a67823774ccbd3b794
**Base ref:** main
**Spec hash:** 312f81dce6b42630d9dcbd8cf676688267322b1dc65485a916525a55388c3af8
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T19:58:48.711520+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T20:00:16.400033+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass (typecheck, six test files, production build).
- `git diff --check a364d8b13401c06d98ae52a67823774ccbd3b794 HEAD`: pass.
- HEAD, main merge-base, current and committed spec SHA-256, branch and working-tree preflight: pass.
- Focused test search: no skipped, focused or placeholder tests found.

## Evidence

- Complete `a364d8b13401c06d98ae52a67823774ccbd3b794..765c6da46bb699a17a2206caeba2fb6dd0341109` product delta reviewed across all four lenses: src/main.ts, src/settings/settings.ts, src/ui/settings-tab.ts, src/ui/workspace-modal.ts, src/vault/workspace.ts, src/vault/workspace.test.ts and styles.css. Reviewed active spec, project overview, coding standards, configuration and adjacent scope/settings contracts and tests. Review/findings state excluded from product-code scope. Dependencies, generated main.js and ignored local runtime state excluded from source scope.
- `.thread-local/evidence/feature-02-runtime.json`: all five created notes equal preview, complete-batch duplicate refusal, settings persisted. Inspected recorded synthetic Obsidian evidence; no personal-vault access.
- `.thread-local/evidence/feature-02-race.json`: locked controls and unchanged preview during delayed writes; approved project selected, unauthorized=false, approved notes exist.
- F-01 repaired code captures immutable approved batch and project path before awaits, guards every mutation handler and uses captured data for completion. Scope validation and exclusions remain applied before vault writes; role mappings do not grant reads. Creation is bounded to five notes, has collision rejection and named partial-creation feedback.

## Findings

- F-01 closed by independent re-review. No new confirmed findings across quality, security, performance or tests. No repairs required.

## Remaining risk

- Actual Obsidian runtime evidence was inspected from recorded synthetic receipts; this review did not rerun the host UI. Automated Verify does not exercise the modal or multi-file partial-failure path. No performance profiling or vulnerability scanner is configured; performance/security conclusions cover reachable code and local dependency configuration, without a current vulnerability-scan claim.
