# Feature: Editable change review

**From build-plan:** feature 18
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/editable-change-review`

## Goal

Make reviewed updates easier to inspect and edit while preserving exact approval, related operation groups and conservative recovery.

## In scope

Bounded line diffs and full exact content views for proposals/undo/recovery; editable proposed Markdown bodies; renewed, revalidated proposal identity after edits; explicit batch/recovery guidance; native synthetic acceptance.

## Out of scope

Partial application of dependent groups, metadata/provenance editor, automatic conflict resolution, automatic note changes, unbounded diff algorithms or rewriting durable history.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Diff and protected draft logic** - Add bounded exact line comparison and body editing that preserves frontmatter and generated provenance markers. *Done when:* Focused tests reconstruct both exact inputs including CRLF, empty/new files, large fallback, protected metadata/markers and hostile text; Verify passes.
- [x] **Step 2 - Renew exact proposals** - Add guarded draft renewal preserving original snapshots, context, operation count/order and durable history; assign a new identity and hashes. *Done when:* Tests prove old approval cannot apply the new proposal, stale/source/target/scope conflicts and persistence failure write no notes, and batch apply/undo/recovery remain guarded; Verify passes.
- [x] **Step 3 - Native edit and recovery review** - Show highlighted textual diffs plus full exact views, body draft editors and a required Renew exact preview action; explain stale and recovery next actions. *Done when:* Editing disables Apply immediately; renewal shows exact revised contents for the entire group; exclusions hide draft/cache contents; keyboard and theme behavior work in actual Obsidian.
- [x] **Step 4 - Observed exact review lifecycle** - Demonstrate native multi-operation edit, renewed approval, guarded apply/undo, stale refusal and recovery guidance using a synthetic vault. *Done when:* Native acceptance, Verify and fresh full-delta independent review pass; README and plans/history describe actual behavior.

## Files / areas

src/vault/change-draft.ts and tests; src/vault/changes.ts/tests; src/ui/change-review-modal.ts; styles.css; README and authorized remote-workflow wording in project plan.

## Data / contracts

No draft edit changes a note. Only proposed Markdown bodies can be edited; exact frontmatter, generated provenance marker lines, paths, original before bytes, operation order and source context stay fixed. Related operations remain one whole batch. Every edit disables approval, even if reverted, until Renew exact preview validates current sources/targets/scope, recomputes hashes and persists a new proposal ID. Old IDs cannot approve a renewal. Limits remain 10 operations/1 MB, durable originals before writes, bounded last-20 history, guarded rollback/undo and no overwrites of newer user work. Full exact content remains reviewable when the bounded line diff is abbreviated or nonminimal. Source exclusions immediately hide cached preview/draft text, including while operations are running. Recovery remains explicit; guidance never automatically broadens grants or discards journals. Native text DOM only. Existing journal schema remains readable.

## Testing

npm run verify per declared step; exact diff/protected-body tests, renewal conflict/CAS/identity/persistence tests, existing recovery suite; actual Obsidian synthetic grouped update edits, renewed exact preview, old-ID refusal, apply/undo, stale-target and exclusion checks, keyboard and light/dark inspection; fresh independent review. No AI inference is needed for this human editing workflow.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Acceptance evidence

- Verify: typecheck, 27 test files and production build pass. Exact diff tests
  include empty/new files, CRLF, missing final newline, repeated lines, hostile
  text and 100000 short changed lines; metadata/marker edits are rejected.
- `.thread-local/evidence/feature-18-native.json`: actual Obsidian grouped edits
  disable approval; renewed ID refuses old approval; exact apply and undo restore
  both original notes. Later target edits cause stale refusal. An injected second
  write failure preserves a conflicting later edit, displays recovery guidance,
  refuses destructive recovery and succeeds after explicit synthetic human
  reconciliation. Exclusions hide preview/draft bytes. Prior history is preserved.
- `.thread-local/evidence/feature-18-keyboard.json`: native Enter activates Renew
  exact preview and produces the exact human-edited body without writing notes.
  `feature-18-light.png` and `feature-18-dark.png` show real native diff UI in
  both themes, visually inspected. Text markers supplement color highlighting.

## Try it now

1. In a synthetic test project, create a Knowledge update proposal and open
   Review changes and undo. Inspect highlighted lines and Full exact contents.
2. Open Edit proposed body, adjust the text and observe Apply become disabled.
   Renew exact preview, review the complete operation group, then apply explicitly.
3. Preview undo and compare the originals. If you edit a target outside Thread,
   Apply/Undo refuse to erase that newer work. Preserve recovery journals and
   follow the displayed comparison/reconciliation steps when a conflict occurs.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5917,"specSha256":"622dcd117aa8f651583a2562f8aa1d16742bb905bd523448dd47cf59113e79f4","branch":"refs/heads/feature/editable-change-review","head":"e38fe7284609317e12585b1f37323ab6ab0133c6","baseRef":"refs/heads/main","baseCommit":"f16ef3bb9df7d4685fbda6ccaa92ed750b37bb14","sourceTree":"502b81b56079626a787b9d10b05c8dfa9d3549c8","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** e38fe7284609317e12585b1f37323ab6ab0133c6
**Base commit:** f16ef3bb9df7d4685fbda6ccaa92ed750b37bb14
**Base ref:** main
**Spec hash:** 622dcd117aa8f651583a2562f8aa1d16742bb905bd523448dd47cf59113e79f4
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T11:19:07.498791+00:00
**Workflow:** continuous
**Check required:** no


**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T11:20:53.702250+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed; typecheck, all 27 test files, production build; no skipped or todo tests reported.
- `git diff --check f16ef3bb..e38fe728`: passed.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --porcelain=v1 --untracked-files=all`, `git ls-files --error-unmatch blueprint/context/current-feature.md`, and `sha256sum blueprint/context/current-feature.md`: passed; exact recorded target/base/spec and only permitted evidence changes. Spec is tracked; snapshot is not applicable.
- Focused skipped/focused-test search: no matches in changed tests.

## Evidence

- Reviewed the complete ten-file base-to-target delta and related callers: `src/vault/change-draft.ts` and tests, `src/vault/changes.ts` and tests, `src/ui/change-review-modal.ts`, `src/ui/thread-modal.ts`, relevant `src/main.ts` context validation/storage/CAS/lifecycle/scope handlers, `src/vault/freshness.ts`, `src/vault/knowledge.ts`, scoped CSS, README, spec and plan/overview changes.
- Checked project coding standards, explicit scope/exclusion and original-source boundaries, untrusted text DOM rendering, bounded line comparison, unchanged journal schema and 10-operation/1 MB/last-20 limits. Dependencies, generated build output, other historical features and unrelated source were excluded.
- Renewal preserves ordered whole operation groups, original bytes/hashes, source context and existing history; generates a new approval identity and hashes; checks source/target/scope and cancellation before durable persistence. Apply still requires exact pending identity, writes durable originals first and uses existing source/target/CAS guards. Failure/undo/recovery retain conservative newer-edit checks.
- Draft edits immediately disable approval, including edits reverted to original text. Invalidation clears draft text and preview even while running; epoch/revision guards cancel renewal. Protected frontmatter and marker lines are compared, with CRLF marker restoration for native textareas. Text uses native text DOM, not HTML interpretation.
- Inspected `.thread-local/evidence/feature-18-native.json` and its actual-host acceptance script `.thread-local/test-feature-18.js`: grouped draft renewal, old-ID refusal, exact apply/undo, stale refusal, partial-write recovery conflict preservation and explicit reconciliation, exclusion removal and unchanged prior history are recorded as passing.
- Inspected `.thread-local/evidence/feature-18-keyboard.json` and visually inspected both `feature-18-light.png` and `feature-18-dark.png`: native diff, readable added/removed text markers, full-content/editor disclosures, renewal/apply controls and visible focus in both themes.

## Findings

- None. No confirmed quality, security, performance or test defect found in the complete reviewed delta; findings ledger records this pass.

## Remaining risk

- Native acceptance is recorded evidence inspected in this review, not a live Obsidian rerun by this reviewer. Screenshots show one proposal in each theme; grouped operations and recovery are supported by JSON/script evidence and logic tests.
- Check was not required by the configured continuous gate/request and was not run. No standalone lint, browser-test, security scanner or performance profiling command is configured; no such scan or measured runtime performance is claimed. The diff algorithm's bounded-work behavior was reviewed and exercised by the existing large-input tests.
- Exact adapter/model and fresh-subagent identity are runtime declarations, not cryptographic proof. No server, network-backed audit, external action or product repair was performed.
