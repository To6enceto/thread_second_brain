# Feature: Inbox capture

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/inbox-capture`

## Goal

Capture thoughts and import original Markdown/text with provenance, duplicate-input detection and explicitly reviewed project association.

## In scope

Native thought/import form, local file picker, preview/save to mapped Inbox or Sources, exact-input hash registry, explicit project suggestion acceptance and persisted import metadata.

## Out of scope

Web fetching, PDF/audio/OCR, attachment parsing, automatic associations or modifications to original sources.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Capture and dedup contracts** - Construct source records preserving exact original input, provenance/hash and deterministic project suggestions. *Done when:* Tests prove exact hash detection, source preservation, safe metadata and association opt-in; Verify passes.
- [x] **Step 2 - Native capture/import workflow** - Add text capture and local Markdown/text picker, duplicate checks and association review, exact preview/save and durable registry. *Done when:* Actual Obsidian thought/import saves preserve originals and provenance, refuse identical reimport, keep association optional and reject unsupported files/collisions; Verify passes.

## Files / areas

src/vault/capture.ts/tests, native capture modal, plugin-owned import registry, main/sidebar commands.

## Data / contracts

User-selected .md/.txt files or typed thoughts, max 2MB each; no network fetching or original-file edits. New note uses UUID/type source/captured_on/original name or URL/thread_import_hash, plus optional explicitly selected project ID. Original text appears unchanged after a fixed Original text heading; existing imported frontmatter is preserved as original body, not trusted plugin metadata. Suggestions match local project titles/text and never assign by themselves. Duplicate key is SHA256 of exact input UTF8; registry stores hash/path only in Thread plugin directory, recording successful imports. Existing matching import refuses duplicate with clear wording that the note may have changed; missing prior target allows reimport. Preview captures immutable note/settings/input hash and rechecks duplicate/permissions before creating. Registry persistence failure reports saved-note path rather than claiming no write; registry can be rebuilt from eligible source metadata.

## Testing

Hash/provenance/preservation/association logic tests plus real Obsidian thought capture, selected text-file import, duplicate/collision/type checks and explicit association. Verify and required fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed verification

Verify passes twelve test files, typecheck and production build. Actual Obsidian thought capture saved exact previewed content with no automatic project association. Native file input imported a synthetic UTF-8 Markdown file; BOM and CRLF text were preserved in the new source. Provenance, selected stable project ID and import hash were saved. Suggestion alone did not assign the project; explicit Use suggested project did. Identical reimport was refused and registry persisted across reload. Unsupported PDF selection and note-name collision were refused. Receipts: `.thread-local/evidence/feature-06-thought.json`, `feature-06-import.json`, `feature-06-errors.json`. Unit tests cover concurrent identical imports, missing targets, registry corruption and failures after creation.

## Try it now

Map Inbox and Sources folders in Settings, then choose Capture. Type a thought or select a UTF-8 .md/.txt file, optionally choose a project, and preview before saving. Suggest project never assigns by itself. Import the same text again to see duplicate detection. Add Sources/Inbox to allowed read paths only when you want their contents included in recall and local inference.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4343,"specSha256":"adf0dde9e97935a5e5e3b4092db0aa2314c3954210aff41f01b29468706ad0f1","branch":"refs/heads/feature/inbox-capture","head":"82602dfd9b10ce9bb815101927c2c7ad4381f5e5","baseRef":"refs/heads/main","baseCommit":"fccaa2b926707eb748358ac3eb9319fd60682b7a","sourceTree":"c9c7ad9b29e4e23e9df03e3536507bb0c3737869","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 82602dfd9b10ce9bb815101927c2c7ad4381f5e5
**Base commit:** fccaa2b926707eb748358ac3eb9319fd60682b7a
**Base ref:** main
**Spec hash:** adf0dde9e97935a5e5e3b4092db0aa2314c3954210aff41f01b29468706ad0f1
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T20:35:38.018910+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T20:37:03.855767+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: passed (typecheck, all 12 test files, production build).
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1 --untracked-files=all`: passed checkpoint, base, exact spec hash, and permitted-dirty-path checks.
- `git diff --check fccaa2b926707eb748358ac3eb9319fd60682b7a..HEAD`: passed.
- In-memory Node assertions importing capture.ts: passed different-hash concurrent registry persistence, rebuild exclusion, credential/non-HTTP URL rejection, 2 MB limit, BOM/CRLF preservation, and invalid UTF-8 refusal.
- Inspected feature-06 tests for skipped/focused/placeholder cases: none found.

## Evidence

- Complete seven-file base-to-target delta reviewed fresh across quality, security, performance, and tests: active spec; src/main.ts; src/ui/briefing-view.ts; src/ui/capture-modal.ts; src/ui/new-note-modal.ts; src/vault/capture.ts; src/vault/capture.test.ts.
- Followed nearby scope/index/project-identity, evidenceCurrent, ThreadModal lifecycle, workspace/frontmatter/path, and createNewNotes code to verify native capture and preview/save boundaries. Checked project identity ambiguity rejection, explicit association, settings and note-hash revalidation, collision refusal, exact original-body preservation, plugin-local registry persistence/rebuild, concurrent saves, and partial-failure wording.
- Inspected synthetic actual-Obsidian receipts .thread-local/evidence/feature-06-thought.json, feature-06-import.json, and feature-06-errors.json; all recorded expectations passed. Inspected .thread-local/test-06-thought.js, test-06-import.js, feature-06.json, and cdp.mjs to trace host execution and native file input selection. Independently compared the saved synthetic imported note suffix with import-fixture.md, including BOM and CRLF.
- Existing capture tests exercise opt-in association, deterministic input hashing, unsupported types/size, concurrent identical import refusal, durable restoration, missing-target reimport, corruption rejection, and post-create persistence failure. NewNoteModal extraction retains existing write guards.
- Applied AGENTS.md, coding-standards.md, project-overview.md, ai-interaction.md, blueprint/config.json, and installed Audit Phase B / independent-review contract. Excluded generated main.js, dependencies, third-party runtimes, and unrelated ignored runtime data from code review.

## Findings

- None. No ledger entries added or changed; no P0/P1 open or fixed findings exist.

## Remaining risk

- Runtime acceptance is the recorded Linux synthetic Obsidian evidence and inspected scripts; this review did not repeat interactive host acceptance. macOS/Windows host behavior and broader accessibility/theme acceptance are not established by these receipts.
- No network-backed dependency vulnerability scan was run; none is configured or required for this unchanged-dependency delta.
