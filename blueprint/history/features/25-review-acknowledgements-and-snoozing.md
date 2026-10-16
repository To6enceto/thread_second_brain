# Feature: Review acknowledgements and snoozing

**From build-plan:** feature 25
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/review-acknowledgements-and-snoozing`

## Goal

Record explicit review dispositions against exact current queue snapshots and resurface changed evidence without changing knowledge status.

## In scope

Versioned readable review-event notes; reviewed/no-change and dated snooze controls; bounded dependency fingerprints; follow-up question copies and existing decision-review drafts; explicit previews, native acceptance and documentation.

## Out of scope

Schedulers/notifications, automatic resolution or acceptance, regenerated output baselines, note cleanup and changes to existing question/decision status.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Snapshot and durable event contracts** - Add validated version-1 review events and bounded full-dependency snapshot fingerprints, keeping machine links outside derived evidence. *Done when:* Tests prove new hashes/identities/due dates resurface, malformed records fail closed, review baselines remain distinct, ordinary notes remain compatible; Verify passes.
- [x] **Step 2 - Explicit native queue actions** - Show pending and handled items, prepare exact new-note previews for acknowledgement/snooze and follow-up questions, link decision-review drafts and preserve stale/scope/collision guards. *Done when:* No action mutates targets or runs AI; edited inputs or sources revoke previews; model-free native happy/empty/denied/error states and focused handlers pass Verify.
- [x] **Step 3 - Native acceptance and review** - Demonstrate persisted dispositions, due dates, dependency changes, follow-up copies, exclusions, collisions and themes/keyboard in actual synthetic Obsidian. *Done when:* Acceptance evidence, README, Try it now, Verify and fresh full independent review pass.

- [x] **Step 4 - Reviewed identity and durable schema repairs** - Repair F-01 ambiguity and F-02 full-record validation without weakening existing privacy or preview guards. *Done when:* ambiguous dependencies cannot be acknowledged; malformed/missing/unknown bodies or required fields cannot suppress items; digested manifest data matches the exact current target/dependencies; native regressions, Verify and fresh full review pass.

- [x] **Step 5 - Mixed private namespace boundary** - Repair F-03 before either managed-record early return; preserve ordinary/single-format records. *Done when:* foreign paired/malformed review/question/synthesis blocks cannot enter cache, search, model context or selection ranges; raw notes remain preserved; logic/native evidence, Verify and fresh full independent review pass.

- [x] **Step 6 - Malformed duplicate marker recognition** - Repair F-04 with one reserved marker lexer used before dispatch and within protected block projection. *Done when:* extra cased, spaced, suffixed or inline same-format blocks cannot expose private data or suppress review; canonical single-format records still work, raw notes remain preserved, native/logic checks, Verify and fresh independent review pass.

## Files / areas

src/main.ts; src/vault/review-provenance.ts; src/vault/review-events.ts/tests; src/vault/review-queue.ts/tests; src/vault/freshness.ts; src/vault/index.ts; src/vault/change-draft.ts; src/ui/review-queue-modal.ts; src/ui/review-action-modal.ts/tests; README.md.

## Data / contracts

New type review-event with thread_review_version "1", stable UUID id, project, recorded_on actual local capture date, action reviewed/snoozed, optional future revisit_on, digest-only thread_review_key/thread_review_snapshot. Required human reason and explicit user save. Machine-readable target/current source identity and hashes retained in a reserved thread:review-evidence block; stripped with frontmatter from derived evidence/ranges, malformed/missing/unknown schema including rejected frontmatter fails closed. Reviewed marker preservation uses existing draft protections. Distinct from type review generated baselines. Snapshot key uses kind, target identity/path, heading and item text; snapshot includes target full hash and all reachable current reference identity/hash/state changes (not only five displayed sources), bounded 200 nodes; cannot establish snapshot means refusal, never acknowledgement. New or unavailable/ambiguous references resurface; snooze due on revisit date; acknowledgement never changes freshness/decision/question status. Screen at most 200 candidates per category before dispositions and show 20 pending/20 handled per category with honest omissions. A follow-up question is a new open managed question with manually entered text and protected origin link, not a claim of current evidence. Existing decision-review remains an explicit draft workflow. All creates use current exact previews and collision refusal in writable project folders; no changes to original notes or read grants. Input changes invalidate previews; complete snapshot revalidated before save.

## Testing

npm run verify per step, pure parser/dates/digests/dependency/queue/privacy tests and native handlers. Actual synthetic Obsidian with unavailable Ollama: save reviewed/snoozed records and follow-up questions, refresh/reload reuse, changed sixth/transitive dependency and identity resurfacing, due date, exclusion/malformed privacy, target race, input edit, collision, no implicit mutation, themes/keyboard.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


Snapshot refinement: managed-question creation and every event reference are read on demand from currently permitted raw records, hash-verified, without caching their private paths/excerpts. Reference traversal checks all branches after stale/missing evidence, with 200 notes/2000 references per snapshot and 1000 references per question. Invalid or oversized provenance cannot be acknowledged. Candidate processing yields and checks cancellation. Legacy unmarked notes retain their prior behavior.


## Acceptance evidence

All live checks use authored fixtures in the marked isolated Obsidian vault; zero AI calls and no personal notes. Evidence lives in `.thread-local/continuous-22-34/evidence/`.

- `feature-25-native.json`: nine native scenarios pass: exact explicit acknowledgement, unchanged accepted decision, Markdown persistence through plugin reload with unavailable Ollama, changed sixth non-displayed dependency resurfacing and existing decision-review draft access, future snooze then an authored valid historical due-date fixture, new open follow-up with protected origin, actual managed-question source dependency tracking, source/input race refusal and collision preservation, immediate exclusions with zero excluded reads. No automatic target or status writes occur.
- `feature-25-privacy-final.json`: six native scenarios pass: allowed review reasons remain usable while excluded target links are absent from memory/disk/model evidence, canonical private selection refusal, missing schema/broken delimiter/rejected YAML/unpaired-block cache/search/context/selection refusal with raw notes preserved. Zero excluded reads. The prior privacy artifact is retained; the final helper adds an explicit search assertion.
- `feature-25-visual.json`, `feature-25-action-light.png`, `feature-25-action-dark.png`, `feature-25-queue-light.png`, `feature-25-queue-dark.png`: actual native action and queue visually inspected in both themes; readable fields, controls, current target/context and scrollable queue. `feature-25-keyboard.json`: native Tab moves note name to reason, Enter Cancel closes only the action; theme/settings restored. The reused feature-24 CDP helper was inspected and adapted for feature-25 fields, modal selection, screenshots and close behavior.
- `feature-25-installed.json`: installed bundle/manifest/styles identity matches the verified files. `feature-25-step1-verify.log`, `feature-25-step2-verify.log`, `feature-25-final-verify.log` at the run root: typecheck, tests (38 then 39 files), build pass. Pure tests cover full/sixth/transitive references after a stale first reference, source/scope changes, identity duplicates, expiry, bounds, malformed projections, selection exclusion and candidate handling beyond 20. Actual handler tests cover changed inputs, held reads, exact-preview revocation and save across owned new-folder invalidation. Final checkpoint reruns Verify.

Question reference reads are on demand and confined to currently permitted hash-matched records; all automatic links remain outside derived text. Unknown provenance or snapshot bounds leave the item pending with manual guidance. Review actions are separate from generated review baselines and cannot make a saved output current. Original feature 1-24 archives, prior reports and evidence remain preserved.

## Try it now

1. In a synthetic allowed project, open **Thread: Project review queue**, choose **Record review or follow-up**, enter a name/reason and inspect the exact new-note preview. Save a reviewed/no-change record. Refresh: expect that exact snapshot under Handled, with the target unchanged.
2. Change a supporting source and refresh. Expect the item pending again, including changes to non-displayed sources. Snooze to a future date and inspect its readable record; refreshing on/after that date resurfaces it. No notification or scheduler runs.
3. Choose the follow-up question action, enter your question/reason and save the exact new copy. Expect an open question and protected origin link, with the original unresolved. Existing decision review remains explicit.
4. Edit inputs or a source during preview, exclude evidence, or create a competing destination. Expect refusal, cleared derived data and preserved notes. Refresh/reopen the queue; normalize unsupported records manually.


Final acceptance rerun: `evidence/feature-25-native-final.json` and `evidence/feature-25-privacy-verified.json` pass all nine lifecycle and six privacy cases on the exact bundle in `evidence/feature-25-installed-final.json`. The final code change uses generic invalid-question-provenance errors so parser messages cannot expose raw retained content; tests also protect review marker pairs under CRLF normalization. Earlier artifacts are preserved. Form/layout remains unchanged from the inspected theme/keyboard artifacts. `feature-25-review-prepare.log` records the final typecheck/39 files/build pass; fresh checkpoint preparation follows this evidence annotation.


## Independent-review repairs

First full independent review raised F-01 (ambiguous references omitted candidate changes) and F-02 (malformed evidence JSON still suppressed targets). Each uses repair attempt 1. Ambiguous target/source IDs or ambiguous legacy resolution now refuse snapshots and remain pending for manual review; no incomplete dependency acknowledgement is allowed. Full raw record validation now checks required versioned metadata (including created), nonempty bounded Reason, one paired canonical evidence block, supported JSON schema/kind, 1-200 normalized Markdown/text paths up to 4096 characters and SHA-256 hashes, plus the target link/hash relationship. Missing namespace markers/version with remaining reserved fields and rejected frontmatter fail closed. Indexed records retain only a canonical manifest digest; dispositions require that digest to match the exact current candidate and hashes. Invalid bodies remain outside all derived evidence/ranges. No raw private paths are added to derived metadata.

- `evidence/feature-25-repairs-verified.json`: twelve native cases pass on the final repaired bundle. Ambiguous-ID creation after preview refuses save, acknowledgement remains disabled after candidate content/type/transitive edits; invalid/missing JSON, removed markers/version with and without broken headers, unknown schema, missing Reason/created, unknown kind and invalid hashes leave the target pending with invalid records excluded. A structurally valid altered hash manifest cannot claim an older snapshot; restored canonical version-1 records remain compatible. Includes actual plugin reload for unknown schema.
- `evidence/feature-25-native-repaired.json`, `evidence/feature-25-privacy-repaired.json`: all nine lifecycle/race/snooze/follow-up cases and six exclusion/schema/selection privacy cases pass again, zero inference and zero excluded reads. `evidence/feature-25-installed-repaired.json` matches final verified installed bundle.
- `feature-25-repair-verified.log`: typecheck, all 39 test files and production build pass; regressions cover ambiguous candidates/targets, malformed schema/required fields and safe manifest digests. Earlier repair Verify logs and native artifacts retained. UI form/layout unchanged; previously inspected theme/keyboard evidence remains applicable.

Native harness refinement: the first repair helper timed out waiting for a queue invalidated by a late native metadata event. It now uses the visible Refresh control, at most three times, before asserting a ready snapshot; the initial helper is retained. Broad native helper adopts the same explicit refresh handling. This preserves the product's cancellation/current-source checks and does not relax assertions. Full fresh independent review must confirm these fixes before completion.


## Mixed-namespace review repair

Second independent review closed F-01/F-02 and raised F-03: question projection returned before checking a retained foreign review block. F-03 uses repair attempt 1. Projection now rejects conflicting question/review private namespaces before either return, in both directions, including malformed/cased foreign markers. A managed question/review combined with generated-synthesis markers also fails closed so it cannot bypass prior output protections. Raw records remain intact; ordinary single-format records remain compatible.

- `evidence/feature-25-mixed-r1.json`: eight native cases pass: paired/unpaired review blocks in a question, cased foreign markers, paired/unpaired question blocks in a review, synthesis blocks in either managed type, and restored single-format compatibility. Index/disk/search/model/native-selection paths refuse each mixed record, zero excluded reads, raw notes preserved.
- `evidence/feature-25-native-mixed.json`, `evidence/feature-25-privacy-mixed.json`, `evidence/feature-25-repairs-mixed.json`: all nine lifecycle, six privacy and twelve prior-finding cases pass again on the final bundle. `evidence/feature-25-installed-mixed.json` proves installed identity. Prior theme/keyboard artifacts apply to unchanged native controls/layout. All earlier artifacts retained.
- `feature-25-mixed-final-verify.log`: typecheck, all 39 test files and build pass. Added serializer/projection/index/search/model/selection regressions cover both directions, malformed foreign blocks and preserved ordinary records. The immutable checkpoint reruns Verify before fresh complete-delta review.


## Malformed duplicate marker review repair

Third independent review closed F-03 and raised F-04 for malformed duplicate same-namespace blocks ignored by line validation. F-04 uses repair attempt 1. A shared reserved-marker lexer now recognizes canonical and malformed/cased/spaced/suffixed/inline/multiline private comments. Raw body scanning validates standalone canonical boundaries before format-specific projection; all unsupported occurrences make derived text/ranges empty. Frontmatter already private to managed records is excluded from body marker scanning, preserving literal source examples there. Constant-size boundary checks avoid repeated whole-line scans; whitespace recognition avoids overlapping unbounded whitespace quantifiers. No authoritative note bytes are modified.

- `evidence/feature-25-markers-r1.json`: fifteen actual native cases pass: uppercase, comment/colon/slash whitespace, unsupported suffix, inline and multiline duplicate blocks in both review and question records; valid single-format compatibility. Cache, keyword search, direct model evidence and native selections refuse all malformed variants; zero excluded reads; raw notes preserved.
- `evidence/feature-25-native-markers.json`, `evidence/feature-25-privacy-markers.json`, `evidence/feature-25-repairs-markers.json`, `evidence/feature-25-mixed-markers.json`: final-bundle reruns pass all nine lifecycle, six privacy, twelve identity/schema and eight mixed-format cases. `evidence/feature-25-installed-markers.json` proves installed identity. Native controls/layout are unchanged from prior inspected theme/keyboard artifacts.
- `feature-25-marker-verified.log`: typecheck, all 39 test files and build pass. Added projection/index/search/model/selection regressions cover malformed own-format duplicates and preserved private-header literal examples. Earlier artifacts/logs retained. Final checkpoint reruns Verify and requires fresh full independent review.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":17334,"specSha256":"aa266b067d33a9c7364b70d05a1b2ea9cbbc2aa04ded61c7128203bd1fa41c5a","branch":"refs/heads/feature/review-acknowledgements-and-snoozing","head":"e726cc191e1a43d0da8d682d2e53bef4d59d75a0","baseRef":"refs/heads/main","baseCommit":"290b706cc03b0db2acd16e738101fd29c5e064e7","sourceTree":"febe558ecbee16ceb18789b92d1ff7e55ffe5d7f","landing":"local-merge","absentOptional":[]} -->

## Findings

### 25/F-01 [P1] closed - Ambiguous source identities lose all current candidate dependencies

**File:** src/vault/review-events.ts:55
**Found:** 2026-10-16 by /audit independent (scope: current; lens: quality, security, tests)
**Why it matters:** `FreshnessGraph.resolve` returns an ambiguous state without a path or hash when a referenced stable ID has multiple permitted candidates. The snapshot stores only that unchanged ambiguous label and never visits or fingerprints either candidate. Reproduction with a decision referencing ID `same` and two allowed source notes sharing that ID produced a valid snapshot whose hashes contained only the decision. After explicitly acknowledging it, editing one candidate left the digest unchanged and the decision remained handled (0 pending, 1 handled). Changes to current ambiguous evidence therefore do not resurface, violating the full-dependency snapshot contract and leaving the save revalidation blind to those source edits.
**Suggested fix:** Refuse snapshots whose ambiguous references cannot establish exact current dependencies, or fingerprint and traverse every permitted candidate under the existing node/reference budgets and watch/hash-check those dependencies before saving. Add a regression covering an acknowledged ambiguous reference followed by candidate content, identity and transitive changes.
**Resolution:** Closed by fresh independent full-delta review at 84a159b153cfa089417783190eb3b6e556194f29. The reviewed review-events.ts rejects duplicated target/source IDs and ambiguous graph resolution before producing any snapshot. Regression tests and the 12-case native repair evidence confirm candidate content/type/transitive edits and preview/save refusal.

### 25/F-02 [P1] closed - Malformed durable review evidence still suppresses queue items

**File:** src/vault/review-events.ts:76
**Found:** 2026-10-16 by /audit independent (scope: current; lens: quality, security, tests)
**Why it matters:** Event reuse validates only indexed frontmatter and the generic projection's marker pairing/version. Neither path parses the reserved review-evidence JSON or validates its schema and required snapshot data. Starting from a saved event, replacing its JSON with invalid JSON, deleting the JSON/schema entirely while keeping the marker pair, or changing schemaVersion from 1 to 999 each still resulted in 0 pending and 1 handled. Markdown is authoritative and the spec explicitly requires malformed/missing/unknown schemas to fail closed; a corrupted or unsupported durable record must not keep suppressing a review item.
**Suggested fix:** Validate the full version-1 review record at the raw-note indexing boundary (required reason, paired evidence, supported schema, kind and bounded identity/hash data), retain only a safe validity result/digest in derived state, and require that validity before applying dispositions. Keep private target/source paths out of derived metadata. Add reload/queue regressions for missing, malformed and unknown evidence schemas and required fields.
**Resolution:** Closed by fresh independent full-delta review at 84a159b153cfa089417783190eb3b6e556194f29. Reviewed review-provenance.ts, freshness.ts, index.ts and disposition reuse: full raw metadata/reason/block/schema/kind/path/hash validation precedes a digest-only indexed manifest; reuse requires the exact current manifest digest. Missing/invalid/unknown schemas and altered manifests resurface in regressions and native repair evidence. New mixed-record projection defect is separately recorded as F-03.


### 25/F-03 [P1] closed - Managed questions bypass review-block privacy validation

**File:** src/vault/freshness.ts:72
**Found:** 2026-10-16 by /audit independent (scope: current; lens: security, quality, tests)
**Why it matters:** Both reserved formats are detected, but the managed-question early return runs first and strips only question-evidence blocks. A valid managed question containing a retained review-evidence block consequently exposes its target link and complete hashes manifest as ordinary eligible body text. An independent inline reproduction created a question with questionMarkdown, appended the private block from reviewEventMarkdown, and used an allowed P/Q.md with Private excluded. outputProjection returned no invalid flag and included Private/EXCLUDED_TARGET25.md; indexNote retained that path, and savedSelection accepted the private target text using the returned ranges. The same projection feeds search/cache and evidenceFromPaths, so private review provenance can become derived/model evidence without reading the excluded target. This violates the reserved-block privacy and malformed-record fail-closed contract.
**Suggested fix:** Reject conflicting managed question/review namespaces before either projection branch, or strip and validate every detected reserved evidence namespace under a single projection boundary. Preserve the raw note and return no derived text/ranges for unsupported combinations. Add mixed-namespace regressions for index/search/context/selection, including paired and malformed foreign blocks and excluded targets; merely swapping branch order leaves the reverse combination unproven.
**Resolution:** Closed by fresh independent full-delta review at 24977db64640d757193744deaf576f169e7ee70a. Conflicting question/review/synthesis namespaces fail closed before either managed return, including cased and malformed foreign markers. Reviewed projection/index/search/context/selection regressions, eight native mixed cases and the nine lifecycle/six privacy/twelve prior-repair reruns. Verify passes. The distinct same-namespace malformed-marker defect is recorded as F-04.


### 25/F-04 [P1] closed - Additional malformed same-namespace blocks leak private review provenance

**File:** src/vault/freshness.ts:52
**Found:** 2026-10-16 by /audit independent (scope: current; lens: security, quality, tests)
**Why it matters:** Managed-record detection recognizes reserved markers case-insensitively and with flexible comment whitespace, but privateRecordText only recognizes the exact lowercase `<!-- thread:review-evidence` prefix. reviewProvenance counts only exact canonical blocks. Consequently, a valid version-1 review event plus an additional block delimited by `<!-- THREAD:REVIEW-EVIDENCE -->` / `<!-- /THREAD:REVIEW-EVIDENCE -->`, or by markers with two spaces after `<!--`, passes full-record validation and exposes that additional block as ordinary body text. An independent in-memory reproduction with P allowed and Private excluded retained a synthetic private path in outputProjection and index entries, returned a search hit, accepted savedSelection over the private text, and included the path in buildEvidence sources. The same projection feeds the actual evidenceFromPaths model boundary. No excluded source read is needed. This violates the specified malformed-private-block fail-closed guarantee; the F-03 cross-namespace guard does not address additional blocks of the same namespace.
**Suggested fix:** Recognize every reserved marker candidate using the same broad case/whitespace matching as namespace detection, then reject any noncanonical marker before collecting eligible text/ranges. Keep canonical pairing/schema validation and raw-note preservation. Cover both managed question and review formats with canonical-plus-cased/whitespace-malformed same-namespace blocks across index/cache/search/model/selection; include malformed closing-only markers as well.
**Resolution:** Closed by fresh independent full-delta review at e726cc191e1a43d0da8d682d2e53bef4d59d75a0. Shared reserved-marker recognition scans the raw body before dispatch and rejects noncanonical case, spacing, suffix, inline and multiline occurrences, including malformed closing-only markers. Private projection returns empty text/ranges for unsupported records. Independently executed ten additional review/question malformed-boundary cases and two canonical compatibility checks; all passed. Reviewed all changed source/tests, the fifteen-case actual Obsidian marker artifact and final nine lifecycle/six privacy/twelve identity-schema/eight mixed-format reruns, with zero excluded reads where instrumented. Verify passes all 39 test files, typecheck and build. No repair regression or new finding identified; F-01/F-02/F-03 remain closed.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** e726cc191e1a43d0da8d682d2e53bef4d59d75a0
**Base commit:** 290b706cc03b0db2acd16e738101fd29c5e064e7
**Base ref:** main
**Spec hash:** aa266b067d33a9c7364b70d05a1b2ea9cbbc2aa04ded61c7128203bd1fa41c5a
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T15:12:48.800424+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T15:15:00.275481+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all 39 test files, production build; no skipped/todo tests.
- Independent inline Node assertions using the actual projection/serializers: pass; ten malformed same-namespace cases (including closing-only markers) fail closed, two canonical formats remain usable.
- `git rev-parse HEAD`, `git merge-base main HEAD`, exact spec SHA-256 and `git status --porcelain=v1 --untracked-files=all`: pass; target/base/spec match and only permitted evidence paths differ.
- `sha256sum main.js manifest.json styles.css`: pass; exact match to feature-25-installed-markers.json.
- `git diff --check`: pass.
- UI/style comparison from first feature checkpoint 47b0fd7 through target: unchanged; prior theme/keyboard artifacts remain applicable.

## Evidence

- Complete 290b706cc03b0db2acd16e738101fd29c5e064e7..e726cc191e1a43d0da8d682d2e53bef4d59d75a0 product delta reviewed fresh against the verified spec: README; main wiring; review action/queue UI; review-events and review-provenance; queue, index, freshness and draft changes; all three changed test files. Followed existing question, freshness-graph, evidence, selection, modal and new-note write contracts. Findings/review documents excluded from product scope.
- Standards checked: AGENTS.md, blueprint/config.json, coding-standards.md, project-overview.md, ai-interaction.md, active spec and installed Audit/independent-review contract. Read scope, raw-note preservation, digest-only caches, exact preview/save revalidation, collision refusal, bounded traversal and cancelable lifecycle are preserved. No new dependencies or runtime model calls.
- Inspected actual synthetic Obsidian artifacts under .thread-local/continuous-22-34/evidence/: feature-25-markers-r1.json (15 passing cases), feature-25-native-markers.json (9), feature-25-privacy-markers.json (6), feature-25-repairs-markers.json (12), feature-25-mixed-markers.json (8). Reviewed native helper assertions, including real plugin reload, cache/search/model and native editor selection boundaries, raw-note preservation and zero excluded reads where instrumented; artifacts record zero real inference calls.
- feature-25-installed-markers.json matches freshly built main.js (d0a3bdad2909c00ed0160754e72812d0a568b489de30fdaeb9ce58b7c54277fe), manifest.json and styles.css hashes.
- Visually inspected all four feature-25-action/queue-light/dark.png screenshots. Inspected feature-25-visual.json, feature-25-keyboard.json and CDP helper: native Tab reaches reason, native Enter on Cancel closes only action, settings/theme restored. Native UI/layout/style code is unchanged since those artifacts.
- Reviewed meaningful dependency, sixth/transitive-source, ambiguity, durable-schema, snooze, queue-budget, mixed/private-marker, selection and handler-race tests. No focused, skipped or placeholder tests found in changed tests. Dependencies, generated bundles, caches, historical artifacts and unrelated features excluded from code scope; bundle identity and relevant recorded runtime artifacts were inspected as evidence.

## Findings

- No new findings across quality, security, performance or tests.
- F-04 closed after independent re-review and direct malformed-boundary assertions; F-01, F-02 and F-03 remain closed after fresh code/evidence review. No open/fixed P0 or P1 findings. No repair order remains.

## Remaining risk

- Native Obsidian acceptance was inspected from the recorded actual-host artifacts and helpers; this reviewer did not rerun the live host flows. Check is not required by this request.
- No dedicated performance profiler or network-backed vulnerability scan was run; performance assessment covers reachable bounded code paths, tests and recorded synthetic-host evidence. No large-vault or cross-platform performance claim is made.
