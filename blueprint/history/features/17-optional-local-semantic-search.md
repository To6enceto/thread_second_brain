# Feature: Optional local semantic search

**From build-plan:** feature 17
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/optional-local-semantic-search`

## Goal

Offer explicitly enabled local hybrid retrieval for related wording, with dependable keyword search when no embedding model is available.

## In scope

Local embedding capability/digest/vector validation, bounded in-memory derived vectors, keyword/semantic rank fusion with filters and coverage, explicit settings and per-search method selection, real local model acceptance.

## Out of scope

Paid/cloud services, automatic downloads, persistent vector databases, background vault-wide inference, automatic note changes or general semantic accuracy guarantees.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Safe local embeddings** - Extend the local client for downloaded embedding model identity and bounded validated vectors, preserving cloud-disabled/loopback checks and cancellation. *Done when:* Tests reject remote/cloud/non-embedding models, malformed/zero/mismatched vectors, cancellation and invalid batches; Verify passes.
- [x] **Step 2 - Bounded hybrid retrieval** - Add a current-snapshot memory cache and conservative rank fusion for eligible filtered passages, with explicit coverage and keyword fallback. *Done when:* Tests prove cache identity/hash binding, cancellation/scope changes, candidate bounds, phrase/filter retention, source diversity and keyword fallback; Verify passes.
- [x] **Step 3 - Explicit native controls** - Add opt-in embedding settings and Keyword/Hybrid search selection; clear derived vectors on invalidation and unload. *Done when:* Existing settings remain keyword-only by default; no download or scope expansion occurs, and Find/Ask retain provenance and staleness guards.
- [x] **Step 4 - Observed local hybrid search** - Use the downloaded free embedding model to demonstrate related-wording retrieval, local inference, keyword fallback and immediate exclusion in actual Obsidian. *Done when:* Native acceptance with real local embeddings and generation, Verify and fresh independent review pass; costs and limits are documented.

## Files / areas

Ollama client/tests; retrieval semantic cache/ranking/tests; settings and native Find/Ask controls; main wiring; docs and approved semantic-deferral wording correction.

## Data / contracts

Semantic search is off by default. The user selects an already downloaded embedding model and chooses Hybrid for a search. No model installation, model download, background inference or permission expansion. All text remains on the validated cloud-disabled loopback Ollama server. Model identity includes local model digest; source vectors bind full-note hash and exact projected passage. Derived vectors stay in bounded memory and are cleared on scope/index/model changes and unload. Only current allowed, freshness-usable, filtered passages reach embedding requests; lifecycle/scope checks run immediately before requests and after awaits. Query/source vectors use the same model/dimension; malformed, nonfinite and zero vectors fail. Keyword results remain available on embedding failure. Hybrid similarity is a heuristic, not truth or citation support. Candidate/coverage limits are visible. Exact source hashes and reviewed-save safeguards remain unchanged; durable journals are preserved.

## Testing

npm run verify per step; local embedding transport/model/digest/vector tests; pure bounded cache/fusion/fallback/staleness/filter/phrase tests; native opt-in setup and real qwen3-embedding:0.6b retrieval plus qwen3:4b-instruct generation in a synthetic vault, unavailable model fallback, cancellation, exclusions and unchanged notes/history; fresh full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Acceptance evidence

- Verify passes typecheck, all 26 test files, and production build. Local
  embedding transport tests reject cloud/remote/non-embedding models, digest
  changes, malformed vectors and scope changes during preflight.
- `.thread-local/evidence/feature-17-native.json`: actual Obsidian synthetic
  vault, explicit native opt-in with no scope expansion, real
  qwen3-embedding:0.6b retrieval of a 20-euro budget for different wording with
  zero keyword matches, repeat-query vector reuse, real qwen3:4b-instruct answer
  and exact new-note preview with hybrid provenance. Missing model preserves
  keywords; cancel and in-flight exclusion clear results/cache; notes and
  durable change history remain unchanged.
- Test model is free Apache-2.0 Qwen3-Embedding-0.6B. Downloaded only into the
  user-authorized ignored test environment. No project dependency added.

## Try it now

1. In a test vault, allow one project containing a short budget note. Select a
   downloaded text model and optionally qwen3-embedding:0.6b in Thread settings.
2. Enable Optional semantic search, save, then run Thread: Find evidence.
   Keyword remains the default. Choose Hybrid (local) and ask about the funding
   limit using different wording. Inspect the returned passage and coverage.
3. Use Ask with Hybrid and inspect its source link and answer preview. No note
   is saved without explicit approval. Choose a missing embedding model to see
   the keyword fallback; exclude the source to see results and vectors clear.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5754,"specSha256":"0375b38427c7cc2ac1931924fa618e8e5ba9fc4b78a694d5764b878dbb85f87b","branch":"refs/heads/feature/optional-local-semantic-search","head":"53f8b59d9bea177b3d8d24615bd3afc6d8855613","baseRef":"refs/heads/main","baseCommit":"18e578765cacd2c090374a2df73e323610492ef2","sourceTree":"214edc5a4e72e395d34ce52a004d20c68ac20b5e","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 53f8b59d9bea177b3d8d24615bd3afc6d8855613
**Base commit:** 18e578765cacd2c090374a2df73e323610492ef2
**Base ref:** main
**Spec hash:** 0375b38427c7cc2ac1931924fa618e8e5ba9fc4b78a694d5764b878dbb85f87b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T09:14:04.900761+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T09:16:25.481089+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git status --short`, `git rev-parse HEAD`, `git merge-base main HEAD`, and `sha256sum blueprint/context/current-feature.md`: pass; exact requested target/base/spec and only permitted evidence changes.
- `git diff --stat main...HEAD`, `git diff --name-only main...HEAD`, and complete feature source/documentation diff inspection: pass; all 18 changed files reviewed.
- `npm run verify`: pass; typecheck, all 26 test files, and production build. No failed, skipped, canceled, or todo test files.
- Independent inline Node/TypeScript probes: pass; 128-of-140 candidate bound, batches of at most eight, source diversity, bounded Ask context, cancellation after identity await, and stale/excluded source eligibility.
- Targeted skipped/focused-test and TODO/FIXME search in changed logic/UI modules: no matches.

## Evidence

- Reviewed the entire verified feature 17 spec and `18e578765cacd2c090374a2df73e323610492ef2..53f8b59d9bea177b3d8d24615bd3afc6d8855613` delta across quality, security, performance, and tests. Applied AGENTS.md, coding standards, project overview, workflow config, and interaction boundaries.
- Reviewed new embedding identity/capability/digest/vector validation and tests; bounded memory, candidate selection, filter/phrase retention, rank fusion, fallback, and cancellation logic/tests; settings opt-in; Find/Ask integration; saved-output coverage; docs and plan wording.
- Followed surrounding LocalIndex/FreshnessGraph eligibility, vault-event and settings invalidation, source hash revalidation, evidence/context construction, source opening, modal lifecycle, and answer preview/save validation. Derived vectors remain local memory; existing note-write/history machinery is unchanged.
- Inspected `.thread-local/evidence/feature-17-native.json` and `.thread-local/test-feature-17.js`: recorded actual synthetic Obsidian acceptance includes six embedding requests and one generation request, real related-wording retrieval with zero keyword matches, source-vector reuse, native opt-in without scope expansion, hybrid answer/preview provenance, missing-model keyword fallback, cancellation, in-flight exclusions, and unchanged notes/history.
- Scope excluded dependencies, generated bundle/build output, unrelated application areas, real personal notes, and external/network activity. Native acceptance harness was read, not executed.

## Findings

- None. No confirmed quality, security, performance, or test defect found in this complete feature review. Findings ledger updated to record this pass.

## Remaining risk

- Actual Obsidian/local-model acceptance was reviewed as recorded evidence and harness code; it was not independently replayed under this review's no-server/no-network boundary. Check was not required.
- No lint, security-scanner, performance-profiler, or browser-test command is configured. Static review and deterministic probes do not establish runtime performance across arbitrary vault sizes or semantic accuracy across embedding models.
- Hybrid retrieval intentionally examines a bounded candidate set and uses a fixed heuristic threshold; relevant evidence can be outside that set and similarity does not prove factual support. These limits are disclosed in UI/docs and the spec.
