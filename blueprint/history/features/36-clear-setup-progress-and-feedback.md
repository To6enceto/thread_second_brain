# Feature: Clear setup progress and feedback

**From build-plan:** feature 36
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/clear-setup-progress-and-feedback`

## Goal

Make first use understandable: choose sample or existing notes, see local checks
beside their controls, inspect exact read grants, save explicitly and open Thread.
Recorded-only operation remains useful when no model/server is available.

## In scope

- Reuse the shared settings tab/setup modal with visible stage and next-action
  guidance, distinct sample and existing-note instructions, and folder refresh.
- Inline model-discovery and connection progress/results, explicit cancellation,
  and stale-result suppression when drafts change or the surface closes.
- Explain exact allowed roots, newly added roots and exclusions beside Save;
  preserve all current labels, actions, explicit selection and Save semantics.
- Existing sample/new-note preview path, no automatic sample save or read grant.
- Native synthetic first-use, offline/missing-model/cancel/success acceptance.

## Out of scope

Model/runtime installation, downloads, grants from discovery or sample creation,
new persisted settings fields, new write paths, full-width workspace (37), and
classification/conversation features. No everyday installation or personal vault.

## Build loop

Continuous Mode with serial steps, Verify after each, actual isolated Obsidian
acceptance, and fresh independent review for read-scope/settings boundaries.
Routine decisions, checkpoints, local completion and normal main pushes are
already authorized; no routine approval pauses.

## Build steps

- [x] **Step 1 - Visible local checks** - Place discovery and connection status next to their controls, manage busy/cancel states and reject late results after edits, closure or replacement. *Done when:* meaningful handler tests cover pending/canceled/stale/failed/successful checks without saving drafts; Verify passes.
- [x] **Step 2 - Guided note selection and exact access preview** - Add sample/existing-note instructions, clear stage/next-action guidance and folder refresh; explain exact current-versus-after-Save roots and exclusions beside Save. *Done when:* draft selection and sample preview grant nothing, exclusion and empty-scope guidance are accurate, existing actions/labels remain available, and Verify passes.
- [x] **Step 3 - Native first-use acceptance** - Exercise both setup paths in the isolated synthetic Obsidian, including first-use empty grants, unavailable/missing models, cancellation, visible success and real local Resume. *Done when:* exact explicit grants, unchanged notes outside authored samples, useful offline operation and successful local generation are observed; light/dark keyboard controls work, final Verify passes and evidence is retained for independent review.

## Files / areas

src/ui/settings-tab.ts, focused settings handler tests using the existing esbuild
host-test seam, src/settings/setup.ts and setup.test.ts where preview wording or
pure guidance needs coverage, scoped styles.css, README.md and this active spec.
No dependency or runtime/schema change.

## Data / contracts

- All setup guidance and check results are transient per settings surface. Draft
  field edits cancel in-flight local checks and mark prior results stale. Closing
  the tab/modal aborts checks; late completion never revives feedback or choices.
- One active local check per surface. Busy controls prevent accidental duplicate
  requests; cancellation and completion restore controls only for their current
  operation. Existing localEndpoint/OllamaClient validation remains authoritative.
- Discovery enumerates capability metadata only; successful diagnostics say what
  was checked, never imply answer quality or infer model identity. No inference
  runs from setup checks. Model choice remains explicit.
- Existing labels and aria-labels remain usable. Existing live status elements
  remain; new inline statuses are polite and associated with their controls.
  Progress describes actual draft/saved/check state, not invented completed work.
- Setup path selection changes instructions only. Sample creation still uses the
  existing exact new-note preview/save and mapped destination. Newly created
  folders can be refreshed from vault metadata without changing selection/grants.
- pendingScope remains the exact authority for save previews and saved roots.
  Selected project is added only by explicit Save; exclusions take precedence.
  Show current roots as well as after-Save roots and explain no notes are read
  by merely selecting a folder. Empty/excluded choices receive actionable text.
- Save keeps current schema, timeout/model/role validation and plugin update flow.
  No background services, file overwrites, automatic sample save or read grant.

## Testing

Reuse the Node/esbuild native-handler seam to exercise asynchronous check races,
cancellation/closure, field invalidation and explicit Save. Pure preview tests
cover empty and excluded scopes without mutating current grants. Verify includes
strict typecheck, all tests and production bundle. Native evidence comes from
real isolated Obsidian/Flatpak and synthetic vaults with an owned cloud-disabled
Ollama/model, never a mock web page. Inspect both themes and native keyboard use.

## Notes for the AI

Use the existing local typography/tokens and native Obsidian controls. Keep
feedback visible without moving focus unexpectedly. A test host is logic proof,
not native acceptance. Preserve prior archives and reports and add no attribution.

## Baseline verification

Feature 35 completion Verify passed immediately before this feature: typecheck,
208 tests without failures/skips, production build. Local main and origin/main
match f986806f47784ddf81df08046d0c2af1b10e3625. No prior feature 36 archive or
branch exists. Native watcher limit is temporarily 256 as set by the user.

## Verification evidence

- Step 1: Verify passed strict typecheck, 211 tests (no failures/skips) and production build. Handler regressions cover cancellation, late responses, replacement checks, missing-model errors, capability success and settings-tab redisplay. Evidence: .thread-local/continuous-35-plus/evidence/36-step1-ui-races-verify.log. No draft or discovery result was saved automatically.

- Step 2: Verify passed 212 tests, strict typecheck and build (evidence/36-step2-verify.log under this run). Guidance, current/after-Save roots, empty/excluded scope and explicit sample/Save boundaries have focused coverage. Native first-use remains pending.

- Native first-use in actual isolated Flatpak Obsidian passed: empty grants,
  empty-model guidance, unavailable Ollama feedback beside the button, pending
  progress, cancellation without late overwrite, sample preview without save,
  explicit sample save without a read grant, folder refresh, and exact explicit
  grants/exclusions. Recorded-only Resume then showed the sample objective.
  Evidence: lab/evidence/36-first-use.json and 36-offline-setup.json.
- Real cloud-disabled Ollama discovery returned three compatible local models
  without selecting or saving one. A deliberately missing model produced the
  actionable missing-model response; explicitly chosen qwen3:4b-instruct passed
  capability checks, and only Save persisted it. A real local Resume generated
  two sourced interpretations in about 36 seconds without changing notes.
  Evidence: 36-runtime.json, 36-live-setup.json and 36-generated-briefing.json
  under lab/evidence, plus the owned runtime log. These demonstrate local
  operation, not general answer accuracy.
- Native testing exposed that Save cleared completed diagnostics. The small
  in-scope correction preserves completed feedback and cancels only pending
  checks; a handler regression and 36-saved-feedback.json confirm the result.
  Verify after the correction passed strict typecheck, all 212 tests with no
  failures/skips, and build (evidence/36-native-feedback-verify.log).
- The existing-note path explicitly replaced the synthetic read scope after its
  exact preview; the existing Overview and unrelated Welcome note stayed byte
  identical, and stale AI output cleared. Evidence: 36-existing-path.json.
- Native Tab moved from Setup path to Local Ollama endpoint with a solid focus
  outline (36-keyboard.json). Inspected 36-setup-light.png and
  36-inline-feedback-dark.png; the latter shows status directly beneath the
  connection controls. Dark rendering used Obsidian's theme-dark class. The owned
  headless window was resized to 1400x1000 for usable native geometry; no user
  window was resized. 36-diagnostics-dark.png also records the exact access card.
- Acceptance helper correction: BriefingView stores AI interpretations and
  generatedAt separately, not result.ai. The initial helper assertion used the
  wrong field; the corrected evidence reads the actual successful fields and UI.
  No product check was weakened and the generated result was not rerun to hide
  an output failure. All evidence paths are within this run's ignored storage.

- Final self-review added a Save-race regression: edits made while persistence is
  pending stay visibly unsaved when the earlier Save completes. Only guidance
  tracks the draft revision; the settings write flow is unchanged. Final Verify
  passed 213 tests, typecheck and build (evidence/36-final-verify.log). The final
  installed bundle passed native connection/Save/grant/next-action checks again
  (lab/evidence/36-final-save.json and 36-installed-build.json).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9570,"specSha256":"d7c6645c9d2271009221c0f4b8685c5afc515539e9a7af84bdf83f46d9af23e0","branch":"refs/heads/feature/clear-setup-progress-and-feedback","head":"626bd19e60b812ad6409a26b74d9284e7a34f941","baseRef":"refs/heads/main","baseCommit":"f986806f47784ddf81df08046d0c2af1b10e3625","sourceTree":"db3f35cb6d3ddcf224aa20e5ea6e728d33c1b4e1","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 626bd19e60b812ad6409a26b74d9284e7a34f941
**Base commit:** f986806f47784ddf81df08046d0c2af1b10e3625
**Base ref:** refs/heads/main
**Spec hash:** d7c6645c9d2271009221c0f4b8685c5afc515539e9a7af84bdf83f46d9af23e0
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T17:16:14.532081+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T17:17:42Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD refs/heads/main`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1 --untracked-files=all`: pass before review and again after verification. HEAD equals the target, main resolves to the recorded base, the merge base and exact spec hash match, and only review.md differs from the target before this receipt.
- `git diff --stat`, complete `git diff f986806f47784ddf81df08046d0c2af1b10e3625 626bd19e60b812ad6409a26b74d9284e7a34f941`, and `git diff --check` for both the range and worktree: pass; all seven changed files reviewed without whitespace errors.
- `npm run verify`: pass in this fresh reviewer context with escalation for synthetic loopback test binding. Strict typecheck, 213 tests passed, zero failures/cancellations/skips/todos, and production build passed.
- Targeted `rg` searches for skipped, focused and placeholder tests in the changed test files: no matches. Inspected the existing test runner and handler-host seam.
- `sha256sum main.js styles.css`: pass; both hashes equal 36-installed-build.json, binding the final native acceptance record to the independently rebuilt target bundle and styles.

## Evidence

- Complete current scope: `f986806f47784ddf81df08046d0c2af1b10e3625..626bd19e60b812ad6409a26b74d9284e7a34f941`, base ref `refs/heads/main`, branch `feature/clear-setup-progress-and-feedback`. Reviewed README.md, current-feature.md, src/settings/setup.ts, setup.test.ts, src/ui/settings-tab.ts, settings-tab.test.ts and styles.css. No product/test/spec/config changes occurred during review.
- Read project-local AGENTS.md, Audit skill and independent-review contract, config, project overview, coding standards, AI interaction guidance, and feature 36's build-plan entry. Applied strict types, native host/lifecycle/accessibility patterns, scoped theme styles, explicit Save, exclusion-first read scope, local-only model checks, unchanged schema and proportional implementation requirements.
- Quality: reviewed stage/next-action truthfulness, distinct instructions, folder refresh, exact current/after-Save roots, validation and Save-during-edit guidance. No confirmed findings.
- Security: followed pendingScope through vaultPath/mayRead and updateSettings/loadSettings, and sample preview through sampleNote/NewNoteModal/createNotes. Discovery and draft selection grant nothing; sample writes retain explicit preview/save and exclusion checks. Ollama checks use the existing loopback/cloud-disabled capability boundary and send no note content. No confirmed findings.
- Performance: reviewed single-operation guards, abort/current-controller identity checks, close/redisplay handling, bounded discovery transport and metadata-only folder refresh. Old completions cannot restore current controls or results. No confirmed findings; no runtime scale claim is made.
- Tests: reviewed all five new native-handler regressions and the expanded pure preview test. Coverage meaningfully exercises duplicate-check prevention, replacement/cancellation/stale responses, errors/success, closure/redisplay, sample/Save boundaries and edits during pending Save. The host seam remains logic evidence; native evidence is assessed separately. No skipped, focused or placeholder tests found in scope. No confirmed findings.
- Inspected retained native JSON under `.thread-local/continuous-35-plus/lab/evidence/`: 36-first-use.json, 36-offline-setup.json, 36-runtime.json, 36-live-setup.json, 36-generated-briefing.json, 36-saved-feedback.json, 36-existing-path.json, 36-keyboard.json, 36-final-save.json and 36-installed-build.json. These record empty first-use grants, missing/offline/canceled/successful checks, sample creation without grants, exact explicit roots/exclusions, recorded-only and real local Resume, preserved existing/unrelated notes, cleared stale output and final Save feedback.
- Visually inspected 36-setup-light.png, 36-inline-feedback-dark.png and 36-diagnostics-dark.png. The retained native screenshots show readable setup guidance, visible focus, connection status adjacent to its controls and the exact access card beside Save. Inspected final Verify log as supporting prior evidence; the independent Verify above passed separately.
- Excluded dependency/vendor code, generated bundle internals, caches, unrelated prior feature history and unrelated product areas from code review. Ignored native evidence was inspected as evidence, not treated as application source. No external actions or product repairs performed; findings ledger unchanged because no findings were added, updated or closed. Repair order: none.

## Findings

- None across quality, security, performance and tests. No ledger changes.

## Remaining risk

- Native Obsidian/Ollama acceptance was inspected from retained synthetic records and screenshots, not rerun by this reviewer. Check is not required by this request and the Continuous config; Check result is not-required. Keyboard evidence demonstrates the recorded Tab/focus transition, not exhaustive assistive-technology coverage. Dark evidence uses the recorded theme-dark class.
- No lint, dedicated security-scan, performance-benchmark or browser-test command is configured. No vulnerability scan, profiling or broad platform/large-vault performance result is claimed. All attempted verification commands completed successfully.

## Try it now

Open Thread Settings and choose **Try a synthetic sample** under **Setup path**.
Leave the preview and Save buttons untouched.

Expected: the sample instructions explain explicit preview/save, **Refresh project
folders**, and that creating a sample grants no read access. The saved read scope
remains unchanged. Switch back to **Use existing notes** to see its guidance.

This demonstrates that choosing a setup path changes guidance without saving
settings or granting access. These are instructions for human review, not an
additional acceptance claim.
