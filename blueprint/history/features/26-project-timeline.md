# Feature: Project timeline

**From build-plan:** feature 26
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/project-timeline`

## Goal

Navigate recorded project chronology without implying a complete history or inferring event dates from file edits.

## In scope

On-demand model-free timeline for sessions, generated and explicit reviews, milestones and decision/review/supersession records; native source navigation; explicit new milestone previews; keyboard/themes and safety acceptance.

## Out of scope

Historical file reconstruction, inferred activity/priority, scheduling/notifications, bulk migration and changes to decisions or sessions.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Chronology and milestone contracts** - Add pure deterministic timeline entries with precise date bases, visible unknown chronology and current permissible replacement links, plus validated user-authored milestone notes. *Done when:* Tests cover recorded/capture/modification dates, invalid/missing dates, current decision status, supersession relations, bounds, stale/excluded notes and milestone validation; Verify passes.
- [x] **Step 2 - Native timeline and milestone action** - Register command and project-home entry, render bounded chronology with source guards and explicit milestone fields/new-note previews. *Done when:* Native controls support loading/empty/error/cancel, current source navigation, source/input invalidation and exact non-overwriting creates; focused tests and Verify pass.
- [x] **Step 3 - Native acceptance and documentation** - Exercise chronology, current links, milestones, unavailable AI, exclusions, conflicting previews and both themes/keyboard in synthetic Obsidian. *Done when:* Actual acceptance evidence, README, Try it now, Verify and fresh full independent review pass.

## Files / areas

src/vault/timeline.ts/tests; src/ui/timeline-modal.ts/tests; src/main.ts; src/ui/briefing-view.ts; src/vault/index.ts; README.md.

## Data / contracts

New milestone type uses thread_milestone_version "1", stable UUID id, project identity, event_on (explicit user-reported milestone date on/before today), recorded_on/created actual local capture date, a Milestone heading/title and user Detail; no automatic supporting excerpts or links. Milestones are user records, not verified achievements. Timeline uses currently permitted indexed project records; no raw history reconstruction. Session recorded_on, review generated_on, explicit review-event recorded_on, decision decided_on and recognized dated Evidence review headings label their exact record-date basis. A milestone event_on is explicitly user-reported, not inferred. Capture/created/generated dates and file modification dates display separately; missing/invalid event/record dates are grouped under unknown chronology rather than assigned a false event date. Decision rows show current status and do not claim it was the status on the original date. Only recognized exact replacement-link lines within dated decision review sections can produce related navigation, and only when the current target is permitted/unambiguous/usable; unavailable paths are hidden. Generated stale records may show safe metadata/constant labels and Source freshness guidance without stale excerpts. At most 200 displayed events, per-note index coverage limits and unknown/omitted counts visible. Stable ordering by known date descending then path/heading. Refresh reads current records on demand, never AI or automatic note edits; exclusions clear derived displays and detached navigation rechecks hashes. New milestone saves require unchanged inputs/settings/project identity and exact new-note preview, no overwrites, original notes untouched; source and folder changes preserve existing preview/CAS/recovery guarantees.

## Testing

npm run verify per step; pure chronology/date/link/scope/status/schema/limit tests and real modal handlers for revoked input previews/own-folder saves. Actual synthetic Obsidian fixtures include date versus mtime contrast, unknown/invalid dates, superseded/replacement relations, stale generated records, explicit milestones, no Ollama calls, source edit/exclusion races, collisions and keyboard/themes.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


Implementation refinement: examine at most the 2000 most recently modified project records before sorting recognized events by explicit chronology; display 200 events and report all examined/omitted/unknown counts. Repeated dated headings combine entries, with only the first indexed passage used for replacement navigation. This avoids interpreting continuation fragments or fenced examples as complete events; long reasons can omit later links, which the coverage limits disclose. Legacy replacement links contain no archived ID/hash; navigation explicitly opens a current permitted note at the recorded path and does not prove historical identity. Source or identity ambiguity hides replacement paths.


## Acceptance evidence

- `npm run verify`: typecheck, 41 test files and production build passed; `.thread-local/continuous-22-34/feature-26-final-verify.log`. The initial Step 1 test fixture had one syntax repair, recorded in `feature-26-repairs.json`; no failing check was waived.
- Actual isolated Obsidian 1.14.4: `.thread-local/continuous-22-34/evidence/feature-26-native.json` records nine passing cases: date bases/unknown dates/current status/stale-content separation; current replacement navigation and freshness guidance; exact milestone creation across owned-folder invalidation; edited-input and competing-destination refusal; concurrent project identity edit; immediate exclusion and detached navigation; empty project; protected source destination; project-home entry and unchanged original fixture notes. Zero inference attempts and zero excluded reads.
- Installed verified bundle hashes: `.thread-local/continuous-22-34/evidence/feature-26-installed.json`.
- Native light/dark form and timeline screenshots: `.thread-local/continuous-22-34/evidence/feature-26-{milestone,timeline}-{light,dark}.png`, visually inspected for readable fields, date labels, source controls, scrolling and no horizontal overflow. `feature-26-visual.json` records dimensions; `feature-26-keyboard.json` proves native Tab focus and Enter cancellation, with settings and theme restored.
- All acceptance used marked synthetic vaults, an unavailable local endpoint and no paid service. User notes were not involved. Independent review is the next gate; the receipt travels with the archive.

## Try it now

In a separate test vault with Thread enabled and a permitted project selected, run `Thread: Project timeline`. Expect recorded chronology with each date basis, capture and file modification dates labeled separately, and missing/invalid dates under unknown chronology. Expand `Record a user-reported milestone`, enter a title, detail and past/today event date, then choose `Preview milestone note`. Review the exact new Markdown and destination before saving; an existing destination or changed input/source/settings refuses the old preview. Open a source from the timeline to verify native navigation. No model is required.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7635,"specSha256":"d69e82b365eb1dd5544039dc3584773f21b28ef14e0ca792201e3c2afbe08e3f","branch":"refs/heads/feature/project-timeline","head":"7751986b5d6337e528e6e691d5c98bab972d7f9d","baseRef":"refs/heads/main","baseCommit":"ae38f0533899938ffe244aea40a550a71952e56d","sourceTree":"80877712837a0168fb3e4832036b7bd1197928f4","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 7751986b5d6337e528e6e691d5c98bab972d7f9d
**Base commit:** ae38f0533899938ffe244aea40a550a71952e56d
**Base ref:** main
**Spec hash:** d69e82b365eb1dd5544039dc3584773f21b28ef14e0ca792201e3c2afbe08e3f
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T15:32:02.449655+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T15:33:32.413240+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `npm run verify`: pass; strict typecheck, all 41 test files, production build; zero failed, canceled, skipped or todo test files.
- `git diff --check ae38f0533899938ffe244aea40a550a71952e56d..HEAD`: pass.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, `sha256sum blueprint/context/current-feature.md`: pass; exact requested checkpoint, base and spec hash; only review evidence differs from target.
- `sha256sum main.js manifest.json styles.css`: pass; all three rebuilt artifact hashes match recorded installed-artifact evidence.

## Evidence

- Fresh complete review of `ae38f0533899938ffe244aea40a550a71952e56d..7751986b5d6337e528e6e691d5c98bab972d7f9d`: all nine changed files, including README, active spec, command/home wiring, timeline logic/modal and both test files, and the index metadata extension. Request/findings files excluded from code scope.
- Followed relevant existing contracts in index/project membership, freshness graph, note section parsing, date/Markdown helpers, source navigation, modal invalidation, exact-preview new-note persistence and path/write policy. Applied AGENTS.md, coding standards, project overview, AI interaction guidelines and feature 26 project/build plans.
- Reviewed chronology/unknown-date sorting and bounds, current replacement eligibility and exact-path links, stale-content separation, exclusion guards, keyboard/native control construction, modal lifecycle, input/settings/project-identity races and non-overwriting milestone creation. No focused, skipped or placeholder tests found in the new tests.
- Inspected `.thread-local/continuous-22-34/test-feature-26.js`, CDP harness and `evidence/feature-26-native.json`: nine actual synthetic Obsidian cases passed, with zero inference attempts and excluded reads. Inspected installed hashes, keyboard proof and all four native timeline/milestone light/dark screenshots; readable controls and date labels, native scrolling and no horizontal overflow visible.
- Review exclusions: dependencies, generated bundle/build output as source, caches and unrelated historical features; generated artifact hashes were checked solely to bind recorded host evidence to this build.

## Findings

- None. Findings ledger unchanged; no findings added, updated, accepted or closed. No repair order needed.

## Remaining risk

- Native host acceptance was inspected from recorded synthetic Obsidian evidence rather than rerun by this reviewer; Check was explicitly not required.
- Documented coverage remains 200 displayed events from at most 2000 examined project records and indexed note prefixes. Repeated headings combine records, long sections can omit replacement links, and legacy replacement paths cannot prove historical identity.
- No dedicated security scanner or performance profiler is configured; those lenses used code, bounded-work contracts and existing tests. No required verification command was unavailable.
