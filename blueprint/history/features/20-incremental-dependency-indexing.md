# Feature: Incremental dependency indexing

**From build-plan:** feature 20
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/incremental-dependency-indexing`

## Goal

Reduce ordinary-edit work to changed notes and affected dependency closures while preserving immediate privacy and freshness protections.

## In scope

Dependency-aware invalidation and incremental read queues, full rebuild fallback for startup/scope/reset, relinking from retained bounded link tokens, snapshot guards and selective UI invalidation for known evidence, native read-count and lifecycle acceptance.

## Out of scope

Filesystem watchers outside Obsidian, persistent personal databases, background model inference, weakenings of source/write guards, content reconstruction from stale caches or arbitrary vault-scale performance claims.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Dependency and index updates** - Track bounded raw link targets and affected dependency/identity closures; immediately remove changed entries and scrub dependent cached text. *Done when:* Pure tests prove transitive/renamed/duplicate-ID dependency propagation, unchanged entry reuse, relinking and excluded/stale byte removal; Verify passes.
- [x] **Step 2 - Incremental queue lifecycle** - Coalesce Obsidian file edits into cancellable changed/dependency reads and merge only a current snapshot; retain full rebuilds for startup/scope/reset. *Done when:* Tests and native read counters show a one-note edit does not read unrelated notes, edits during reads cannot publish old data, and create/delete/rename and scope changes remain safe; Verify passes.
- [x] **Step 3 - Known evidence invalidation** - Track selected evidence/dependencies in read workflows and invalidate only intersecting changes; retain conservative unknown/write guards and revalidate after index settles. *Done when:* Known independent Ask/Resume work survives unrelated edits, affected sources cancel immediately, and before display/save source hashes/freshness/scope still pass; no excluded data survives.
- [x] **Step 4 - Observed incremental behavior** - Demonstrate real native edits, linked/generated dependencies, stale results, cancellation, exclusions and reset/history preservation in a synthetic vault. *Done when:* Actual Obsidian acceptance including held and real local inference, Verify and fresh independent review pass; README documents rebuild and conservative limits.

- [x] **Step 5 - Repair F-01 target tracking** - Include every known Knowledge destination/project-link target and refresh original/destination in selected dependencies. *Done when:* committed actual-handler regressions and native held-generation target edits/creation cancel immediately without proposals; rerun Verify and full acceptance, then fresh independent review closes F-01.

## Files / areas

src/vault/index.ts/tests and dependency helpers; src/main.ts index queue and guards; src/ui/thread-modal.ts, read workflow dependency tracking and briefing view; optional semantic cache invalidation; README.

## Data / contracts

Markdown remains authoritative; cache is derived and never substitutes for raw source hashes. On a changed allowed path, its indexed text is removed immediately and affected generated text/links scrubbed before async work. Startup, explicit reset and all scope/settings changes use a full eligible rebuild and immediate cache/vector clear. Incremental batches only read changed notes plus affected generated dependencies; link tokens can be re-resolved from bounded in-memory text metadata. Coalesced work retains pending paths through cancellation and rejects reads superseded by later events. New retrieval waits for a settled index; already captured known evidence can continue across unrelated changes only if final source hashes, settings and dependency freshness revalidate after queued work. Unknown dependencies and write/CAS contexts remain conservative. Source/target/identity/dependency changes cancel affected work, including transitive outputs and duplicate-ID changes discovered on indexing. Exclusions purge immediately and apply before every actual read and inference. Scope/model/plugin unload cancels requests and clears derived state. No user note or durable change/import/rename history is rewritten by indexing.

## Testing

npm run verify per declared step; dependency closure/reuse/relink/scope tests; actual synthetic Obsidian vault read counters for single edit and dependencies, rapid edits while read is held, create/delete/rename and stable/legacy references, unrelated vs supporting-source edits during held local inference, real qwen3:4b-instruct answer after unrelated edit, immediate exclusions/cache scrubbing and reset/history preservation; independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Acceptance evidence

- Verify passes typecheck, 30 test files and production build. Tests cover
  transitive/renamed/duplicate-ID closures, immediate scrubbing, unchanged entry
  reuse, source-ID rehydration, links, scope reset and superseded reads. Semantic
  cache tests confirm selective path purging and unrelated vector retention.
- `.thread-local/evidence/feature-20-native.json`: actual Obsidian with 54
  synthetic notes. Editing one source reads exactly that source and its two
  transitive outputs, with zero reads of 50 unrelated notes. Derived bytes are
  scrubbed before awaits. Rapid edits during a held read publish only the newest
  hash. Stable source rename, owned temporary create/delete and output freshness
  work. Real qwen3:4b-instruct Ask and Resume survive unrelated edits; supporting
  edits immediately cancel and clear both. Exclusion causes zero excluded reads
  and clears index/vectors; reset preserves durable change/import history.
- `feature-20-hybrid-regression.json` and `feature-20-review-regression.json`
  rerun real local hybrid retrieval/fallback/cancel/exclusion and grouped draft
  renewal/exact apply/undo/stale/recovery acceptance under the new index queue.

## Try it now

1. In a test vault, allow two projects and Resume or Ask about one. While local
   generation runs, edit an unrelated note in the other project; current
   supporting evidence can continue. Inspect its final source passages.
2. Edit a supporting note instead. The affected result clears immediately and
   generation cancels; run again to load its current contents.
3. Exclude that source in settings. It and stale derived text disappear; no
   excluded source is read on rebuild. Rebuild text index in settings if needed;
   note files and durable history are preserved.

## Repair evidence

F-01 repair attempt 1 includes selected/precomputed Knowledge and optional-link
paths, original refresh output and new Reviews destination in watched dependencies.
Weekly generation also tracks its precomputed Reviews destination. Committed
`src/ui/generation-targets.test.ts` executes actual native form/generation handlers
with held inference and verifies cancellation and zero proposal publication.
`.thread-local/evidence/feature-20-target-repair.json` confirms all five target
edit/creation cases in actual Obsidian, preserving later owned edits and journals.
Full native indexing/real inference, hybrid and review/recovery checks rerun on
the repaired build. Fresh review must independently close F-01.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7771,"specSha256":"0851486525ff6615f590af032f224c1e72844a1c1bc4012a9ce660946f16237d","branch":"refs/heads/feature/incremental-dependency-indexing","head":"5c5718e5b5402d1b7aa531bd9fe4d65a166d9e4a","baseRef":"refs/heads/main","baseCommit":"adf27214c82bfdd6167f0ab27d96e4bce0345b63","sourceTree":"303cf2b53a5a3ea3f517cb655eb06c17bb005d7e","landing":"local-merge","absentOptional":[]} -->

## Findings

### 20/F-01 [P1] closed - Selective generation omits known write and refresh targets

**File:** src/ui/knowledge-modal.ts:66; src/ui/freshness-modal.ts:62
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `watchBundle(bundle)` replaces conservative invalidation with only supporting-source paths. The selected existing Knowledge destination (`target`, line 59) and optional project-link destination (lines 75-78) are omitted unless also selected as evidence. Editing either target during local generation therefore leaves the controller and epoch current. Generation subsequently reads the edited destination and can prepare a proposal instead of canceling and requiring a refreshed selection. This violates the verified spec's explicit requirement that target changes cancel affected work. Later exact previews and CAS checks still protect against overwriting newer text; this is a missing lifecycle guard, not demonstrated data loss.
**Reproduction:** Executed the actual `KnowledgeModal.onOpen()` and its generate-button handler in an in-memory esbuild bundle with a minimal Obsidian host and held local-generation stub. Selected source `P/S.md` and Append destination `K/Existing.md`, started generation, then delivered `invalidatePaths(new Set(["K/Existing.md"]))`, the production notification entry point. Observed dependencies `["P/S.md"]`, `signalAborted: false`, and `epochChanged: false`. The new selective guard suppresses the invalidation that the previous conservative guard performed. The same omission is visible for the optional project-link target.
**Related confirmed instance:** Source Freshness captures an original output at `src/ui/freshness-modal.ts:56` and precomputes a new Reviews destination at line 58, but line 62 watches only selected current sources. Executed its actual `onOpen()`/generate handler with held generation and source `P/S.md`: editing original `P/Old.md` and creating destination `R/Old refreshed.md` each left `signalAborted: false` and `epochChanged: false`, with dependencies `["P/S.md"]`. The original output's cached project metadata/path can therefore be reused after that original changes or disappears. Knowledge's precomputed new destination and optional project-link destination have the same omission; the actual invalidation predicate ignores any path absent from the source-only set. Decision review includes its existing decision in its evidence bundle; final NewNote/ChangeReview save and CAS contexts retain conservative guards.
**Suggested fix:** Include all known selected/precomputed write targets, optional link targets, and the original output being refreshed in watched paths before generation, or preserve conservative invalidation for these write workflows. Add meaningful handler regressions for existing-target edits, optional-link edits, new-target creation, and original-output changes while generation is held, confirming immediate cancellation and no proposal publication.
**Resolution:** Closed by fresh independent full-delta review of checkpoint 5c5718e5b5402d1b7aa531bd9fe4d65a166d9e4a on 2026-10-16. Knowledge watches the selected existing or precomputed new destination plus optional project-link target before inference; Source Freshness watches the original output and new destination; Weekly watches its precomputed destination. Re-examined ThreadModal intersection cancellation and final epoch/signal/settings checks through proposal publication. The committed actual-handler regression executes all five original failing cases with held inference and now proves watched membership, immediate abort/epoch change and zero proposals. Independently reran npm run verify: typecheck, all 30 test files (including this regression) and production build passed. Inspected native feature-20-target-repair.json and its actual Obsidian harness: five target edit/creation cases pass, zero proposals, later edits and journal preserved. Inspected the rerun feature-20-native.json, feature-20-hybrid-regression.json and feature-20-review-regression.json and native indexing harness. The current production bundle and installed synthetic-lab bundle have identical SHA-256 3320e892ab40394c73ec25d4ab49b2ea191980f53e4c61c02207131f99701b8e. The original omission is removed; no new confirmed defect was found in the repaired paths or complete feature delta. Native reports are recorded builder evidence inspected here; this reviewer did not repeat interactive Obsidian execution.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 5c5718e5b5402d1b7aa531bd9fe4d65a166d9e4a
**Base commit:** adf27214c82bfdd6167f0ab27d96e4bce0345b63
**Base ref:** main
**Spec hash:** 0851486525ff6615f590af032f224c1e72844a1c1bc4012a9ce660946f16237d
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T11:47:25.233950+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T11:49:33.536165+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git status --short --untracked-files=all`, `git rev-parse HEAD`, `git merge-base main HEAD`, `git branch --show-current`, and `sha256sum blueprint/context/current-feature.md`: passed; immutable target/base/spec and dedicated branch match the request; only permitted evidence changes.
- `git diff adf27214c82bfdd6167f0ab27d96e4bce0345b63 5c5718e5b5402d1b7aa531bd9fe4d65a166d9e4a --stat` and complete scoped diffs/source/caller inspection: passed.
- `npm run verify`: passed; typecheck, 30 test files, zero failed/skipped/canceled/todo files, production build.
- `git diff --check adf27214 HEAD`: passed.
- `sha256sum main.js .thread-local/improvements-lab/vault/.obsidian/plugins/thread/main.js`: passed; matching SHA-256 3320e892ab40394c73ec25d4ab49b2ea191980f53e4c61c02207131f99701b8e.

## Evidence

- Fresh review covered the complete feature delta against main, independently of the findings ledger: index dependency closure/scrubbing/relinking, coalesced queue/reset/unload and superseded reads, raw-read scope/settings/signal guards, cached-vector invalidation, selected UI dependencies, final freshness/raw-hash checks and nearby conservative preview/proposal/CAS/undo paths. Reviewed all changed source/tests, README and verified spec; inspected relevant existing freshness, evidence, scope, retrieval and write contracts. Request/findings are excluded from product scope; dependencies, generated bundles and unrelated ignored/runtime data are excluded except the named synthetic evidence and bundle comparison.
- `src/vault/index-updates.test.ts` covers transitive/renamed/duplicate identities, unchanged object reuse, changed/dependent text removal, superseded reads, missing-source rehydration, link relinking and excluded reads. `src/retrieval/semantic.test.ts` verifies selective vector purging. `src/ui/generation-targets.test.ts` executes real Knowledge/Freshness handlers and asserts cancellation before proposals for all five repaired target cases. No skipped, focused or placeholder cases found in the added/changed tests.
- Inspected actual `.thread-local/evidence/feature-20-target-repair.json`: all five existing/new Knowledge, optional-link and original/new refresh target cases passed; zero proposals. Its native harness asserts immediate cancellation, retained later edits and unchanged durable history.
- Inspected actual `.thread-local/evidence/feature-20-native.json` and native harness: one changed source plus two transitive outputs read, 50 unrelated notes untouched; immediate scrub, held-read supersession, stable rename, create/delete, real local Ask/Resume across unrelated edits, supporting cancellation, zero excluded reads and reset/history preservation passed.
- Inspected actual `.thread-local/evidence/feature-20-hybrid-regression.json` and `feature-20-review-regression.json`: local hybrid/fallback/cancel/exclusion and grouped draft renewal/exact apply/undo/stale/recovery acceptance report all cases passing. Native evidence was regenerated during the repair sequence; installed lab bundle equals the independently rebuilt checkpoint bundle. These reports were inspected, not newly executed by this reviewer.
- Applied AGENTS.md, coding standards, project overview, active verified feature and Blueprint independent-review contract. Check is not selected by the request or configured gate.

## Findings

- F-01 [P1] closed: independently confirmed the known-target omission is repaired, the actual-handler regression passes, and native repair evidence covers the original cases. No new confirmed findings across quality, security, performance or tests.

## Remaining risk

- Interactive Obsidian acceptance and live local inference were not rerun in this reviewer context; native runtime conclusions rely on inspected synthetic native reports/harnesses and matching installed bundle. Reports do not embed immutable build attestations.
- No lint, formatter, browser-test, CI, dedicated security scanner or performance benchmark command is configured; none was installed or represented as passing. Local manifest/code review is not a current vulnerability scan.
- Performance proof concerns bounded synthetic note-read behavior, not arbitrary vault scale or measured CPU/memory limits. Dependency/link recomputation and serialized derived-cache writes remain proportional to eligible index size as documented.
