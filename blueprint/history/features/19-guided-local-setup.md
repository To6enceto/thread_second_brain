# Feature: Guided local setup

**From build-plan:** feature 19
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/guided-local-setup`

## Goal

Help a person connect a free local runtime, choose compatible downloaded models and understand explicit read grants before using Thread.

## In scope

Numbered native setup guidance, explicit downloaded-model discovery and capability-based selection, live pending read-scope preview, metadata-only actionable diagnostics, optional synthetic sample note through exact preview.

## Out of scope

Service installation, model downloads, cloud fallback, automatic read grants, automatic sample creation, hardware benchmarking or general answer-quality guarantees.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Downloaded model discovery** - Add bounded metadata-only local model enumeration and capability filtering using cloud-disabled checks. *Done when:* Transport tests reject cloud/remote/malformed models, respect cancellation and list bounds, and prove no inference or downloads; Verify passes.
- [x] **Step 2 - Scope and sample contracts** - Add pure validation/preview of pending read roots and exclusions plus a synthetic sample note constrained to mapped destinations. *Done when:* Tests cover empty/invalid/excluded grants, existing settings compatibility, unique sample paths, explicit synthetic marking, no overwrite/grant side effects; Verify passes.
- [x] **Step 3 - Guided native setup** - Guide connection, downloaded model selection, folder grants, Save and optional sample preview; show separate connection/capability/scope diagnostics. *Done when:* Discovery never changes saved settings; choosing models needs Save; pending grants are visible before Save; no note text is sent in diagnostics and no sample writes happen without exact approval.
- [x] **Step 4 - Observed setup and failure guidance** - Demonstrate real local model discovery, explicit grant preview, diagnostics, optional sample preview, unavailable/cloud-enabled runtime and cancellation in actual Obsidian. *Done when:* Native synthetic acceptance, keyboard/theme inspection, Verify and fresh independent review pass; README provides free local run instructions.

## Files / areas

src/intelligence/ollama.ts/tests; src/settings/setup.ts/tests; src/ui/settings-tab.ts; native optional sample via existing NewNoteModal; README.

## Data / contracts

No runtime/model installation or download. Discovery explicitly requested, capped at 40 downloaded models, no note text or inference. Cloud-enabled/unknown cloud status and remote aliases are rejected; downloaded compatibility means required capability, not answer quality. Manual exact model entry remains available. Generation/embedding revalidate current model rather than trusting discovery. Closing or changing endpoint cancels pending diagnostics/discovery and prevents stale choices/status. Settings remain backward compatible. Live preview shows allowed roots after Save including selected project, exclusions and newly added roots; exclusions still take precedence. Merely choosing/previewing a project or discovering/selecting models grants no access. Save is explicit. Optional sample is clearly synthetic, new UUID path inside mapped Projects and outside exclusions; NewNoteModal exact approval/collision/current-settings guards apply; sample creation does not grant read access. Diagnostic output contains no raw personal content and distinguishes connection/capability, scope and quality. Existing notes and durable journals are preserved.

## Testing

npm run verify per declared step; fake local transport discovery/cancel/remote/capability/no-inference tests and pure grant/sample tests; actual synthetic Obsidian discovery of installed qwen models, native selectors/save/grant preview, real status and model checks, controlled unavailable/cloud-enabled responses, cancel on close/endpoint edit, exact sample preview/no-write and explicit create, keyboard and both themes; fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Acceptance evidence

- Verify passes typecheck, all 28 test files and production build. Transport
  tests prove bounded metadata-only capability filtering, remote/cloud refusal
  and cancellation. Pure tests prove exact grant preview and synthetic sample
  destination/exclusion/identity checks.
- `.thread-local/evidence/feature-19-native.json`: actual Obsidian discovers
  installed qwen3 completion models and qwen3-embedding:0.6b separately, choosing
  leaves settings unchanged, native read preview matches explicit Save, real
  local metadata diagnostics pass without inference. Optional exact sample
  preview writes nothing until approval, then creates the synthetic note with
  no read grant. Controlled cloud-enabled/unknown/unavailable responses produce
  actionable guidance; endpoint edits and close cancel discovery. No inference,
  downloads or journal changes occur.
- `.thread-local/evidence/feature-19-keyboard.json`: real native Enter activates
  downloaded model discovery. Both feature-19-light.png and feature-19-dark.png
  are actual Obsidian screenshots, visually inspected for native controls,
  readable grant preview, labels and theme compatibility.

## Try it now

1. Open Thread setup. Enter your loopback endpoint, start cloud-disabled Ollama
   yourself and choose Find downloaded models. Select a local completion model;
   optionally select an embedding model under Optional local semantic search.
2. Choose a test project and read the resulting grant/exclusion preview before
   Save. Test local connection checks metadata only; it does not rate answers.
3. Optionally save a Projects mapping under advanced settings, then Preview
   optional sample. Review its exact new contents and approve only if wanted.
   The sample folder needs a separate explicit read grant before Resume/Ask.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6310,"specSha256":"0d4ebaa00e3839078187bc5dbf4806ca4f072e8c07fd676e983e4cb2981aa93b","branch":"refs/heads/feature/guided-local-setup","head":"9201fd13a353da72bda706fc33a0b67c5467883b","baseRef":"refs/heads/main","baseCommit":"f7858c596e92bf17a4da43f15bdaeecbd24cb5bd","sourceTree":"04a38a0ea3bc590b0a6cdf8b6b4d1c478fdc1bbb","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 9201fd13a353da72bda706fc33a0b67c5467883b
**Base commit:** f7858c596e92bf17a4da43f15bdaeecbd24cb5bd
**Base ref:** main
**Spec hash:** 0d4ebaa00e3839078187bc5dbf4806ca4f072e8c07fd676e983e4cb2981aa93b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T11:26:56.418055+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T11:28:44.451334+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `npm run verify`: passed; typecheck, all 28 test files, production build; no skipped, canceled or todo test files.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, `sha256sum blueprint/context/current-feature.md`: passed; exact requested target/base/spec, with only allowed review evidence changes.
- `git diff f7858c596e92bf17a4da43f15bdaeecbd24cb5bd..9201fd13a353da72bda706fc33a0b67c5467883b`: reviewed the complete seven-file delta, including README and verified spec.
- Focused `rg` search for skipped/focused/todo tests in changed and adjacent boundary tests: no matches.

## Evidence

- Reviewed all changed application files and tests: `src/intelligence/ollama.ts`, `src/intelligence/ollama.test.ts`, `src/settings/setup.ts`, `src/settings/setup.test.ts`, `src/ui/settings-tab.ts`; checked README and active spec against the approved range.
- Followed settings/scope/create/save/lifecycle callers through `src/settings/settings.ts`, `src/vault/scope.ts`, `src/vault/workspace.ts`, `src/vault/new-notes.ts`, `src/ui/new-note-modal.ts`, `src/ui/thread-modal.ts` and relevant `src/main.ts` methods, plus existing boundary tests. Checked installed AGENTS, config, overview, coding standards, interaction guidance and build-plan feature 19.
- Discovery is user initiated, limited to 40 metadata inspections, rejects cloud/remote/unconfirmed capability entries and never selects/saves models or requests inference/downloads. Generation and embedding retain current capability checks. Abort/controller/endpoint and view-lifecycle guards prevent canceled metadata results from populating controls or diagnostics.
- The same pending-scope function drives preview and explicit Save; exclusions precede reads, mappings grant no access, sample preview uses saved mappings and exact NewNoteModal approval with current-settings and collision guards. The sample adds no read grant and preserves existing notes/journals.
- Inspected recorded actual synthetic Obsidian acceptance in `.thread-local/evidence/feature-19-native.json` and `feature-19-keyboard.json`: separate completion/embedding choices, explicit scope Save, metadata diagnostics, sample approval/no grant, controlled cloud/unknown/down failures, cancellation, native Enter, zero inference/download calls.
- Visually inspected `.thread-local/evidence/feature-19-light.png` and `feature-19-dark.png`: native controls, readable scope preview, clear Save and sample actions in both themes.
- Scope covered quality, security, performance and tests under project-local standards; dependencies, generated bundle, caches, ignored runtime data beyond named acceptance artifacts, and unrelated source were excluded.

## Findings

- None. No confirmed reachable defect found across the complete target delta and affected boundary callers. Findings ledger records this pass; no IDs added, accepted or closed.

## Remaining risk

- Native acceptance JSON and screenshots were inspected as recorded evidence; this reviewer did not replay Obsidian or independently capture those interactions. The artifacts are local recorded assertions/screenshots, not a cryptographic binding to the target; screenshots cover the visible scrolled setup section rather than every control.
- No lint, dedicated security scanner, performance profiler or automated desktop/browser-test command is configured. Verify is not a vulnerability scan or runtime/answer-quality benchmark; the configured Check gate is not required and was not run.
- UI interaction coverage depends on recorded native synthetic acceptance plus static lifecycle review; no cross-platform or general answer-quality guarantee follows from this receipt.
