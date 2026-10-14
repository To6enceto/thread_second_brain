# Feature: Source freshness

**From build-plan:** feature 11
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/source-freshness`

## Goal

Show when saved generated output loses current support, follow permitted source renames and create reviewed refreshed versions while preserving prior output.

## In scope

Validated source provenance, conservative whole-source hash freshness, stable-ID and observed legacy rename resolution, transitive derived-output eligibility, latest reviewed synthesis projection, native status/source links and explicit regenerated-version proposals.

## Out of scope

Rewriting original sources or old outputs automatically, permanent version storage, historical file reconstruction, semantic truth guarantees and sources outside explicit read scope.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Freshness and provenance contract** - Parse bounded validated output references and latest synthesis blocks, resolve identity/renames and assess transitive freshness with focused tests. *Done when:* Tests cover malformed records, ambiguous IDs, changed/missing/excluded sources, legacy renames, dependency chains and safe latest-version projection without old model prose.
- [x] **Step 2 - Scope-safe reuse** - Integrate freshness into index and every model evidence path, scrub unavailable/stale derived chunks and provenance excerpts from cache, preserve dependency hash guards and persist observed rename metadata. *Done when:* Verify passes; real note edits/renames/deletions/exclusions change freshness and stale or excluded-derived prose cannot reach recall, cached index or model requests.
- [x] **Step 3 - Reviewed regeneration** - Add native freshness inspection and explicit source selection to generate a new reviewed synthesis version. *Done when:* Actual Obsidian/local model creates an exact reviewed new version, old output/source notes stay unchanged, source links follow allowed rename, conflicts/cancel are guarded and Verify plus fresh full review pass.

## Files / areas

Freshness logic/tests, index/evidence/main integration and affected retrieval callers, native freshness modal/sidebar command.

## Data / contracts

Markdown remains authoritative. Source references are untrusted validated data and never grant read access. Assess source changes conservatively by full-note hash (including decision-status metadata), reporting that unrelated edits can also require refresh. Stable IDs resolve only uniquely within current allowed/excluded scope; legacy notes follow only observed permitted rename metadata, with ambiguity refusing reuse. Unknown or invalid provenance fails visibly. Generated notes with stale/unavailable dependencies, including transitive dependencies, are omitted from inference and their derived chunks are scrubbed from cache; raw originals and durable change backups stay intact. Latest delimited reviewed synthesis is used for inference while old generated versions remain in Markdown; prior generated prose must not leak through newly excluded sources. Manual decision review reasoning stays readable, while old AI-observation sections are not reused as authoritative evidence. Do not persist reference excerpts inside index metadata. Revalidate chosen/dependency hashes and settings before inference, display and writes. Regenerate from explicit current allowed sources as a new type-review synthesis in mapped, readable Reviews using ChangeManager exact preview/apply, UUID/provenance and a link to the original; original output is preserved byte-for-byte. No automatic writes or paid services.

## Testing

Pure provenance/graph/projection/identity tests and meaningful index/evidence integration tests; synthetic Obsidian source rename/edit/missing/exclusion/transitive-copy checks, actual local-model refreshed version preview/apply and unchanged originals, cancellation and before-hash conflict. Verify and fresh independent full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Verification observed

- `npm run verify`: strict typecheck, all 18 test files and production build passed. Focused cases cover malformed/unknown provenance, duplicate IDs, changed/missing/excluded sources, transitive dependencies, legacy rename cycles, latest-only synthesis, source metadata status fields, cache scrubbing, large frontmatter and cyclic arbitrary metadata. Index metadata retains only used string fields; reference excerpts are absent from the cache.
- `.thread-local/test-11-reuse.js` / `.thread-local/evidence/feature-11-reuse.json`: actual Obsidian controlled source/output fixtures. Stable and legacy renames resolve, including legacy metadata after plugin reload. A source edit propagates through two output levels, stale chunks are removed, and an old-style pending proposal without dependency hashes is refused. Exclusion removes copied text from actual index.json, recall, project context and model requests; explicit stale selection is refused. Latest synthesis is reusable without leaking an older excluded-source block. Markdown originals remain exact.
- `.thread-local/test-11-ui.js` / `.thread-local/evidence/feature-11-ui.json`: native freshness UI opens the renamed legacy source. Real qwen3:4b-instruct generates a new review from an explicit current replacement source; exact reviewed apply creates one new note and preserves old output/source bytes. A concurrent create is refused and preserved, changed/missing sources are visible, and cancellation creates nothing. The missing-source case trashes and recreates only the purpose-created legacy fixture; no personal source was touched. A preview refresh after a vault event is intentionally required before Apply.
- `.thread-local/test-11-guards.js` / `.thread-local/evidence/feature-11-guards.json`: dependency hashes are included and refuse later edits; a native allowed-source event outside the project clears the cached briefing. A held model boundary demonstrates cancellation/clearing when a transitive dependency is excluded. Controlled cached view/held-response signals are disclosed; this script does not claim model quality proof.
- `.thread-local/test-11-preview.js` / `.thread-local/evidence/feature-11-preview.json`: an old-style cached draft with an excluded transitive dependency hides its contents and disables Apply; rejection writes no note. Current public-source previews remain visible. Durable journals/backups are retained, not purged.

## Try it now

Run **Thread: Source freshness** in a test vault with a saved answer or knowledge synthesis. Change a supporting note, then refresh status: expect Changed and omission of the stale output from AI recall. Rename an unchanged stable-ID source within allowed paths: expect Renamed and a source button opening the real new path. Choose an output, inspect source status, select current sources or replacements and enter a new version name. Generate, inspect the exact change proposal and apply. Expect a new sourced review in mapped/readable Reviews and an unchanged original output.

## Limits

Freshness uses whole-note hashes, so unrelated source edits can also require regeneration. It verifies identity/content currency, not semantic truth. Legacy renames follow only observed permitted moves retained in bounded metadata; unknown moves, duplicate IDs, invalid/cyclic or overly deep provenance require explicit source selection. Context remains bounded. Only the latest delimited synthesis enters inference; original Markdown history stays intact. Decision AI-observation subsections are omitted from reuse while manual reasoning remains. Cached change previews with changed or unavailable source snapshots are hidden; validated batch originals preserve exact target provenance for undo/recovery, and unknown historical dependencies require manual recovery. wait for indexing/refresh or resolve source access. Durable changes.json remains available for manual recovery when context cannot be resolved. Before/after guards and last-20-batch history remain unchanged.

Resume now uses the same allowed project membership/link index as recall, including explicitly allowed associated sources. Allowed external-source events invalidate old briefings, and dependency hashes are rechecked before inference/display/save. Runtime test data stayed inside the ignored isolated synthetic vault.

Review repair F-01: exact recorded hashes now bind preview authorization at every dependency level. `.thread-local/test-11-preview-repair.js` / `.thread-local/evidence/feature-11-preview-repair.json`: actual native replacement-provenance regression verifies that an old draft stays hidden even after its generated source switches to public-only provenance. Exact validated original snapshots preserve applied-batch undo previews; journals are retained.

After repair, repeated native public/excluded preview checks and real-model refresh conflict/apply/cancel/missing-source checks passed. The repeat uses unique output names and waits for indexing after a vault event before refreshing the change review.

Review repair F-02: exact-snapshot permission checks memoize repeated dependencies per path/hash/depth, preserving cycle and depth refusal. A ten-note/eight-reference-per-level regression completes in fewer than 100 visits rather than exponential expansion.

Review repair F-03: generated-note prefixes with unknown historical provenance are omitted even when thread_sources is missing/invalid. Only pre-existing unmarked human prefixes remain eligible. New pure and `.thread-local/test-11-prefix.js` / `.thread-local/evidence/feature-11-prefix.json` checks cover actual cached index, recall and no-model unsupported Ask while preserving raw Markdown.

Nonblocking review repair F-04: assessment memoization now includes depth, with guards before cache lookup. Cold and source-first warm 36-note chains both refuse excessive depth while shallow chains remain usable. Verify and a fresh full review are required for this final checkpoint.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10412,"specSha256":"bc2c4aca87aed57411c49ac3eface9f34192e748915626993d1a0d500d0749ad","branch":"refs/heads/feature/source-freshness","head":"4441908267be8db93fdf8b2b271dd9dcb7f1e146","baseRef":"refs/heads/main","baseCommit":"601e46a9ab511cead79d2dddd2bcff0a49fce567","sourceTree":"e7704d6949e6065c73d76a45f1415591f636dd53","landing":"local-merge","absentOptional":[]} -->

## Findings

### 11/F-01 [P1] closed - Legacy preview authorizes historical draft using current provenance

**File:** src/ui/change-review-modal.ts:21
**Found:** 2026-10-15 by /audit independent (scope: current; lens: security, tests)
**Why it matters:** `contextAllowed` discards the values of `noteHashes` and resolves each context path through the current index graph. A legacy pending/history batch can name only generated output A at its old hash, with a cached draft derived from A's then-private source. If A is edited or gets a newer synthesis supported only by a public source, then the old private source is excluded, the current graph for A is scope-safe and this function returns true. The modal consequently renders the old cached `before`/`after` prose containing the excluded source's information. Apply's later hash validation does not protect preview, undo preview, or recovery preview. This violates the feature's fail-closed boundary for unavailable transitive cached source context.

Confirmed by executing the actual bundled `ChangeReviewModal.contextAllowed` and `preview` methods in memory with an Obsidian host stub and a real `FreshnessGraph`: the batch recorded A's old hash, current A had a different hash and public-only provenance, the old private source was excluded, and `contextAllowed` returned true while `preview` rendered the controlled historical draft marker. Existing `test-11-preview.js` covers an unchanged A with an excluded current dependency; it does not cover provenance replacement after the cached batch was created.

**Suggested fix:** Validate recorded hash values and require a trustworthy association between each legacy context snapshot and the provenance used to authorize its cached contents. When a legacy referenced generated note no longer matches its recorded hash and its historical dependencies cannot be proven, hide cached contents and disable actions, preserving the durable journal for manual recovery. Add a regression for a legacy cached draft whose generated source later switches to public-only provenance before its original dependency is excluded.
**Resolution:** Repair attempt 1: source-context hashes are now validated and bound to the exact provenance snapshots throughout the dependency graph. Hash-mismatched current sources cannot authorize cached historical prose. Validated batch originals supply exact historical target snapshots for undo/recovery; unavailable historical dependencies hide the preview while retaining the journal. Added pure and native regression coverage; awaiting fresh full review.

**Independent re-review:** Closed at e7bc2d71b6ddaf16d2e92ba30735d4d0d7252e74. Reviewed ChangeReviewModal.contextAllowed, FreshnessGraph.scopeAllows and ChangeManager backup-hash validation. Every referenced historical hash must match the exact current or validated original snapshot before its provenance can authorize cached contents, recursively. The passing pure replacement-provenance regression and inspected native test-11-preview-repair.js / feature-11-preview-repair.json establish that the old draft is hidden and Apply disabled after public-only provenance replacement, while exact own-source undo remains supported. The original substitution defect is repaired; the independent traversal-performance defect below has its own ID.

### 11/F-02 [P1] closed - Preview authorization expands repeated citations exponentially

**File:** src/vault/freshness.ts:104
**Found:** 2026-10-15 by /audit independent (scope: current; lens: performance, tests)
**Why it matters:** scopeAllows recursively authorizes every reference without deduplicating repeated source snapshots or reusing completed results. sourceReferences legitimately records multiple passages from the same note, so a short chain of generated outputs can multiply the same dependency traversal at every level. ChangeReviewModal.contextAllowed invokes this synchronously on Obsidian's UI thread for preview and action eligibility, repeatedly during a render and for history entries. The depth limit of 30 and per-note reference limit of 100 do not bound total work enough to prevent a frozen change-review UI.

Confirmed by an in-memory Node execution of the actual FreshnessGraph and outputProjection with nine allowed notes, valid parsed provenance and computed whole-note hashes. Each of eight derived notes cites eight distinct headings from the preceding note. One scopeAllows call returned true only after 19,173,961 recursive calls and 9,845 ms. Eight total notes already required 2,396,745 calls and 1,123 ms. These are small valid inputs within all configured bounds; larger legal chains grow exponentially. The ordinary suite covers correctness and cycles but has no regression for repeated or converging dependency work.

**Suggested fix:** Authorize each distinct resolved path/hash snapshot once per authorization traversal, retaining the exact-hash checks, an active traversal set for cycle rejection and safe depth handling. Deduplicate repeated passage references and reuse completed dependency checks across converging branches; do not rely on a depth limit alone. Add a deterministic bounded-work regression for repeated citations and converging dependencies, alongside the privacy, cycle and undo regressions.
**Resolution:**

F-02 repair attempt 1: memoize provenance authorization by exact path/hash/depth after cycle/depth/hash guards. Repeated citation fanout is bounded by distinct graph nodes, references and maximum depth. Regression asserts fewer than 100 visits for ten notes with eight references per derived level; cycles remain refused. Awaiting fresh full review.


**Independent re-review:** Closed at a8cdc170a2cf0b0f1f4769bde7e3cf41610d868b. Reviewed the complete feature delta and the exact snapshot/depth memoization in scopeAllows. The original repeated traversal defect is repaired: the committed ten-note/eight-reference regression passes, as do cycle and historical hash refusal cases. A separate in-memory exercise of actual FreshnessGraph/outputProjection/index modules with computed whole-note hashes, nine repeated-citation chain levels and a converging diamond completed in 106 visits (including a subsequent wrong-hash refusal) in approximately 1 ms, and refused an excluded transitive source. Guards execute before memo reuse. No new defect was found in this repair.

### 11/F-03 [P1] closed - Latest public synthesis authorizes an unknown generated prefix

**File:** src/vault/freshness.ts:59
**Found:** 2026-10-15 by /audit independent (scope: current; lens: security, tests)
**Why it matters:** outputProjection identifies generated notes using type plus any of thread_sources, thread_model or generated_on, but retains the text before the first synthesis block whenever thread_sources is absent. A legacy or edited generated answer with thread_model/generated_on but missing frontmatter provenance can contain old generated prose before a later valid synthesis. The latest block's public-only references then authorize the entire projection, including that unknown older prose. Excluding the old supporting source does not remove it from the index, recall or model evidence. This violates the explicit fail-closed unknown-provenance and latest-only inference contracts.

Confirmed by executing actual outputProjection, indexNote, LocalIndex and FreshnessGraph in memory. A type-answer note with thread_model and generated_on, no thread_sources, a controlled old-prose marker and a latest synthesis citing a computed-hash public source was assessed usable with the prior private source excluded. Its projection and recall still contained the old-prose marker. The ordinary tests cover an unknown generated body without a latest block and a latest block with thread_sources present, but miss their combination.

**Suggested fix:** Use the existing generated classification to avoid retaining an unvalidated generated prefix. Preserve human prefixes only when the note is demonstrably treated as user-authored; otherwise project only the validated latest synthesis or fail visibly. Add a regression with a generated note missing thread_sources, old private prose before the latest public-only block, and its former source excluded; assert that index, recall and evidence cannot reuse the old prose.
**Resolution:**

F-03 repair attempt 1: retain prefixes only for unmarked pre-existing human notes. Every recognized generated note drops its prior prefix when selecting a latest valid synthesis, even with missing/invalid thread_sources. Projection and native actual-index/recall/Ask regressions cover this legacy case; original Markdown is retained. Awaiting fresh full review.


**Independent re-review:** Closed at 7bf257d9f02d539d994d415391ca226f8847b0b8. Full-delta review confirmed outputProjection now uses the same generated classification to discard unknown prefixes even when thread_sources is missing or invalid. Only the latest validated synthesis enters index/evidence reuse; unmarked human prefixes remain supported and authoritative Markdown is unchanged. The pure missing/invalid-provenance prefix cases passed in npm run verify. Inspected native test-11-prefix.js and feature-11-prefix.json show actual index, persisted cache, recall and unsupported Ask omit the private prefix without a model request. No new defect was found in this repair. F-01 and F-02 remain closed.

### 11/F-04 [P2] closed - Freshness depth validation depends on assessment order

**File:** src/vault/freshness.ts:111
**Found:** 2026-10-15 by /audit independent (scope: current; lens: quality, tests)
**Why it matters:** assess caches by path before checking the active traversal depth, although its result depends on the remaining depth budget. A source-first index traversal reuses each shallow cached success and can classify a chain beyond the maximum depth as current. Conversely, assessing a deep root first caches depth-induced dependency failures on intermediate notes, which then incorrectly remain unavailable when assessed at their own valid depth. LocalIndex.replace and projectEntries assess many notes through one graph, so file iteration order affects cached chunks, recall and visible freshness. This contradicts the explicit overly-deep-provenance refusal contract. No excluded-source leak was demonstrated; this is a nonblocking correctness finding.

Confirmed in memory using actual indexNote, LocalIndex and FreshnessGraph with 35 Markdown notes, valid provenance records and computed whole-note SHA-256 hashes. A fresh top-first assessment refused P/34.md; source-first assessment allowed it, LocalIndex.replace retained its chunks, and recall returned it. P/6.md was usable in its own fresh graph but incorrectly remained unusable in the graph previously used to assess P/34.md. Existing tests cover cycles and scopeAllows fanout, but not assess order/depth interactions.

**Suggested fix:** Make assess memoization respect the remaining depth budget, keep depth/cycle guards ahead of cache reuse, and retain bounded repeated-dependency work. Add a regression that evaluates a valid over-limit chain in both source-first and root-first order and checks that shallow valid nodes remain usable while over-limit roots are refused in LocalIndex.replace/projectEntries. Preserve all current provenance and scope checks.
**Resolution:**

F-04 repair attempt 1: freshness memoization includes traversal depth and is consulted only after cycle/depth guards. Cold top-first and warmed source-first 36-note chain assessments both refuse excessive depth; a shallow valid chain remains usable. Awaiting fresh full review.


**Independent re-review:** Closed at 4441908267be8db93fdf8b2b271dd9dcb7f1e146. Fresh full-delta quality/security/performance/tests review confirmed assess now checks cycle/depth before memo reuse and keys memo entries by path and traversal depth. npm run verify passed all 18 test files, including the cold/warmed depth regression. An independent in-memory exercise used actual indexNote, FreshnessGraph and LocalIndex with computed whole-note hashes for 36 Markdown notes: both source-first and root-first assessment/replace/projectEntries/recall refused the excessive-depth root and retained the valid shallow P/6.md. The original order-dependent bypass and shallow-node poisoning are repaired; no new defect was found in this repair. F-01, F-02 and F-03 remain closed after re-examining their implementations and regression evidence.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 4441908267be8db93fdf8b2b271dd9dcb7f1e146
**Base commit:** 601e46a9ab511cead79d2dddd2bcff0a49fce567
**Base ref:** main
**Spec hash:** bc2c4aca87aed57411c49ac3eface9f34192e748915626993d1a0d500d0749ad
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T22:11:32.195614+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T22:13:00.301791+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git status --short`, `git rev-parse HEAD`, `git merge-base main HEAD`, and `sha256sum blueprint/context/current-feature.md`: passed; target/base/spec match, only permitted evidence differs.
- `git diff 601e46a9ab511cead79d2dddd2bcff0a49fce567 4441908267be8db93fdf8b2b271dd9dcb7f1e146 -- src`: reviewed complete product/test delta and relevant callers.
- `npm run verify`: passed strict typecheck, all 18 test files (zero failures/skips), and production build.
- `node --input-type=module` in-memory computed-hash depth/order regression using actual indexNote/FreshnessGraph/LocalIndex: passed both source-first and root-first assessment, replace, projectEntries and recall; over-limit root refused and shallow valid note retained.

## Evidence

- Fresh automatic isolated reviewer, adapter codex and exact selected runtime model gpt-6.1-sol, without builder transcript. Read project-local AGENTS.md, Audit skill/independent-review contract, config, standards, overview, AI interaction, active verified spec and relevant build-plan entry. Full base-to-target delta covered quality, security, performance and tests; findings/request excluded as product scope.
- Inspected freshness provenance parsing/projection, scope/identity/rename resolution, depth/cycle and memo guards, index/cache scrubbing, evidence dependency/hash revalidation, model callers, change-preview exact historical snapshots, reviewed regeneration and native UI lifecycle. Pure suite includes scope exclusion/transitive refusal, malformed/unknown provenance, duplicate IDs, latest-only generated prefixes, historical substitution, bounded repeated citations, cycles, and depth-order repair.
- Inspected all named native scripts and corresponding recorded evidence: `.thread-local/test-11-reuse.js` / `.thread-local/evidence/feature-11-reuse.json`; `test-11-ui.js` / `feature-11-ui.json`; `test-11-guards.js` / `feature-11-guards.json`; `test-11-preview.js` / `feature-11-preview.json`; `test-11-preview-repair.js` / `feature-11-preview-repair.json`; `test-11-prefix.js` / `feature-11-prefix.json` (same respective directories). Recorded true results cover actual synthetic-vault rename/reload, changed/missing/excluded/transitive sources, cache/recall/model exclusion, real local-model refreshed exact apply/conflict/cancel, unchanged originals, historical preview refusal/own-source undo and unknown generated-prefix removal. Native scripts were inspected, not rerun by this reviewer. Guard evidence explicitly uses a controlled cached view and held model boundary; it does not establish model quality.
- Check policy is manual for continuous workflow and request records Check required: no. No fresh Check acceptance was performed or claimed.

## Findings

- F-04 [P2] closed: depth-aware assessment memoization and guard ordering repair iteration-order-dependent eligibility; independently exercised through the actual LocalIndex consumers with computed hashes.
- F-01, F-02 and F-03 remain closed; exact historical hash binding, bounded repeated provenance authorization and generated-prefix removal remain intact.
- No new confirmed findings across the full delta; no open/fixed P0 or P1 findings.

## Remaining risk

- Native Obsidian/local-model acceptance is recorded evidence inspected in this review, not a new execution at this checkpoint. Manual Check is not required. No configured lint, browser-test, security-scan or performance-profile command exists; none is claimed. The in-memory depth exercise supplies logic/integration evidence, not native UI proof.
- Whole-note freshness is intentionally conservative and does not establish semantic support. Legacy rename resolution relies on bounded observed metadata, and unknown historical dependencies require manual recovery while durable journals remain preserved.
