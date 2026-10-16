# Feature: Managed project questions

**From build-plan:** feature 24
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/managed-project-questions`

## Goal

Create and manage explicit project question records with readable states, preserved answers/reasons and optional source/decision references, while retaining legacy questions.

## In scope

Version-1 managed Markdown question records, explicit create/update/reopen/answer controls, optional previewed legacy-to-new-copy conversion, existing proposal/diff/apply/recovery flow, home/Resume/queue integration and acceptance.

## Out of scope

Automatic answers/resolution, bulk conversion, rewriting original sources, reminders/scheduler, AI-required lifecycle or changing accepted decisions.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Question record contracts** - Add validated creation/update/status parsing and recognition of active managed questions alongside legacy sections. *Done when:* Meaningful tests prove valid dates/states, required answer/reason, append-only history, safe status updates and unchanged legacy/answered exclusion; Verify passes.
- [x] **Step 2 - Explicit native question workflow** - Add command/home entry and native creation, optional evidence/decision association, explicit lifecycle updates through existing proposals and new-copy conversion previews. *Done when:* New records start open; all writes exact-previewed, collision/hash/scope guarded; protected sources receive guidance; input edits refuse in-flight proposals and revoke old new-note preview authority; Verify passes.
- [x] **Step 3 - Native acceptance and documentation** - Exercise creation, investigating/answer/reopen history, legacy new-copy conversion, home/Resume/queue behavior, conflicts, exclusions, recovery and no-Ollama operation. *Done when:* Actual synthetic Obsidian evidence, keyboard/themes, Verify and fresh independent review pass; README and Try it now current.

- [x] **Step 4 - Reviewed persisted-provenance boundary** - Repair F-01 by retaining machine-written references/snapshots in protected Markdown blocks excluded from derived question text/ranges. *Done when:* saved creation/event exclusions clear cached excerpts, paths, links and model/selection evidence while human question/answers remain; malformed blocks fail closed; draft editing preserves markers; native regressions, Verify and fresh full independent review pass.

- [x] **Step 5 - Missing-schema dispatch repair** - Address independently raised F-02 by recognizing Thread-managed question provenance even when its version field is missing, while preserving genuinely unmanaged question notes. *Done when:* missing/invalid/wrong-type managed schemas fail closed across cache/search/context/selection and refuse updates with guidance; unit/native regressions, Verify and fresh full review pass.

- [x] **Step 6 - Malformed-frontmatter namespace boundary** - Repair independently raised F-03 by recognizing reserved question provenance in raw text even when frontmatter decoding loses all metadata. *Done when:* broken/missing delimiters and malformed YAML cannot expose protected paths/excerpts through cache/search/context/selection; ordinary unmarked notes remain compatible; native/logic regressions, Verify and fresh full review pass.

## Files / areas

src/vault/questions.ts/tests; src/ui/questions-modal.ts/tests; src/main.ts; src/vault/project-home.ts; src/intelligence/recorded.ts; src/vault/review-queue.ts; selection draft compatibility; README.md.

## Data / contracts

New records use type question, thread_question_version "1", stable id, project identity, status open/investigating/answered, recorded_on event date and actual local created/updated capture dates and a Question heading. Create always starts open. Managed updates retain original question and every prior event/answer/reason; update only canonical single status/updated frontmatter lines and append dated human-readable events. Answer requires explicit user answer and reason; reopening requires explicit reason. Malformed/unsupported schemas or ambiguous frontmatter refuse mutation with manual guidance. Optional supporting evidence and related decision references use only current allowed indexed sources. Existing user-authored questions remain authoritative even when supporting evidence changes. Existing legacy sections remain visible; conversion creates a previewed new question copy without editing old notes. Existing managed changes use ChangeManager exact diff/proposal/collision/CAS/undo/recovery rather than direct writes. Default operations are model-free and never accept a decision. Scope/exclusion/target/input changes clear derived displays and stale actions; durably staged proposals remain explicit snapshots in central Review changes. Grants never expand.

## Testing

npm run verify per step; pure record/status/history/frontmatter/date/legacy tests; real-handler input/target cancellation tests; native synthetic Obsidian with Ollama unavailable, actual creation/update/answer/reopen proposals, exact previews, collision/concurrent change/undo/recovery guards, legacy conversion copies, source exclusion and home/recorded context/queue integration, keyboard/themes.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


Schema refinement: question events append a bounded JSON source-snapshot block (schemaVersion 1), with HTML/fence characters escaped inside JSON. Original question and earlier event text remain unchanged; properties retain stable identity. Selection question drafts now create the same open managed record; prior legacy notes and all archives remain unchanged.


## Acceptance evidence

All native acceptance used authored fixtures in the marked isolated synthetic vault, with an unavailable loopback Ollama endpoint and zero real inference. Evidence JSON/screenshots are in `.thread-local/continuous-22-34/evidence/`; Verify logs are in `.thread-local/continuous-22-34/`.

- `feature-24-native-final.json`: nine passing native cases on final build: registered question command, open creation with exact new-note preview and explicit save/current decision link; investigating/answered/reopen proposals through native exact diffs; prior working response, answer and reason preservation; answered exclusion from actual Home, recorded Resume and review queue while legacy remains; guarded exact undo; concurrent target edit refusal and preservation; edited legacy new-copy conversion retaining its original source citation; selection shortcut managed schema; immediate copied-text/path exclusion clearing. Zero chat attempts; actual Resume uses unavailable endpoint 127.0.0.1:11435 and retains recorded context.
- `feature-24-extra-final.json`: four passing final-build cases: protected Sources location refuses management with manual guidance; concurrent new-note collision preservation; native input edit cancels a controlled held read and refuses staging obsolete inputs; controlled uncertain write after fixture replacement retains durable recovery, then explicit native recovery preview restores exact original and requires rejecting the stale proposal. Controls/method wrappers/settings restored.
- `feature-24-visual.json`, `feature-24-light.png`, `feature-24-dark.png`: final-build native form, both themes visually inspected. `feature-24-keyboard.json`: actual Tab moves note-name input to question, actual Enter activates Cancel and disables obsolete action; theme/settings restored. Feature-specific visual helper was inspected and adapted from the earlier CDP pattern, including its output filenames and control assumptions.
- `feature-24-installed.json`: final verified main.js equals the installed isolated plugin. `feature-24-final-verify.log`: typecheck, 37 test files and build pass. Tests include pure status/date/frontmatter/history rules, real Home/recorded Resume/queue consumers, selection schema compatibility, original legacy citations despite edited copied question, revoked preview, own-folder invalidation, and canceled in-flight proposal handlers. The final independent-review checkpoint reruns Verify.
- `feature-24-history-before.json`: pre-acceptance synthetic journal preserved; original reports and feature 1-21 archives were not edited. Native lifecycle tests append ordinary synthetic reviewed batches under the existing last-20 policy; no personal vault or journal is accessed. Earlier passing native evidence is retained beside final reruns.

Harness corrections accounted for awaiting the actual controller, Markdown-escaped human reason canaries, and capturing an old apply control before the real host clears its preview on a target edit. Unit host fixtures added native parseYaml/Option behavior. No product check was waived and no independent finding has yet been raised for this feature.

## Try it now

1. In a synthetic permitted project, run **Thread: Project questions**. Enter a new note name and question, optionally add current evidence/a decision, inspect **Preview question action**, then explicitly Save. Expect an open Markdown record and an unchanged decision.
2. Choose **Update managed question**, select it, record Investigating and your reason, then review/apply the exact diff. Repeat with Answered and your explicit answer, then Open with a reopening reason. Expect all earlier answers/reasons retained. Answered questions disappear from active Home/Resume/queue lists; legacy questions still work without Ollama.
3. Optionally copy a recognized legacy section into a new question, edit its text and preview its new destination. Expect the original source/citation preserved. Existing destinations refuse overwrite.
4. Edit/exclude supporting records during a preview, or edit inputs during preparation. Expect refusal/cancellation and cleared affected cached data. Use guarded undo or the exact recovery preview when needed; preserve later edits and follow manual guidance for protected/unsupported records. Native keyboard Cancel works in both themes.


## Independent-review repair evidence

The first complete-delta independent review raised F-01: persisted machine snapshots/reference links bypassed subsequent source exclusions. The repair retains raw Markdown history while excluding protected `thread:question-evidence` blocks and managed frontmatter from derived body/ranges. Canonical version-1 question records reserve these markers; creation and every event write paired blocks. Human structural headings remain outside the block, preserving question/answer section placement. Unknown versions, unpaired/malformed/missing blocks fail closed with manual guidance; reviewed body drafts preserve marker lines and their CRLF bytes. No automatic migration or note rewriting occurs.

F-01 used two repair attempts. Attempt 1 passed the privacy regression but stripping the evidence heading moved a creation annotation under Question and the consumer regression caught an extra queue item. Attempt 2 keeps headings outside the protected blocks; all checks below pass. No check was weakened; the configured two-attempt limit is unchanged.

- `evidence/feature-24-privacy-r2.json`: actual saved creation and event with an automatic excerpt/path canary, followed by exclusion and rebuild. In-memory index, persistent index.json, links, keyword results and model source context contain neither canary; zero excluded source reads; authoritative question/event/source-reference bytes remain saved; manual answer and active Home question remain usable. Native selections of both frontmatter/body references and copied excerpts are refused, while manual response selection opens.
- `evidence/feature-24-native-r2.json`, `evidence/feature-24-extra-r2.json`: all nine lifecycle/legacy/selection/offline cases and four protected/collision/cancellation/uncertain-write recovery cases rerun on the repaired build.
- `evidence/feature-24-visual-r2.json`, `evidence/feature-24-r2-light.png`, `evidence/feature-24-r2-dark.png`, `evidence/feature-24-r2-keyboard.json`: repaired-build native visual inspection and actual Tab/Enter acceptance; original artifacts retained.
- `feature-24-repair-verify-r2.log`: Verify passes 37 files/typecheck/build. Added regression uses real question creation/event serialization, projection, indexing, scope, search, model evidence and saved-selection paths; checks raw history retained, human content usable and malformed/unknown blocks fail closed. Draft regression verifies protected marker refusal and CRLF restoration.
- `evidence/feature-24-installed-r2.json`: repaired bundle/installed equality. Final checkpoint reruns Verify before a fresh full independent review.


## Missing-schema review repair

Second independent review closed canonical F-01 and separately raised F-02: deleting the version property dispatched a still-marked managed question through ordinary-note projection. F-02 repair attempt 1 detects namespaced question metadata and question evidence markers before ordinary-note handling. Missing/invalid versions and mismatched managed record types fail closed; genuinely unmanaged type:question notes without Thread provenance remain readable. This is a separate schema-dispatch finding; F-01 remains closed at its recorded two attempts.

- `evidence/feature-24-schema-r1.json`: four passing actual native cases on the final repaired build. Repeats persisted canonical exclusion checks, then removes only the version field from an authored record: cache/disk/links/search/model/selection reuse fail closed, updates refuse with manual guidance, excluded reads remain zero and the malformed original is not rewritten.
- `evidence/feature-24-native-r3.json` and `evidence/feature-24-extra-r3.json`: all nine lifecycle/compatibility/offline cases plus four protected/collision/cancellation/recovery cases rerun on the final build.
- `feature-24-schema-verify.log`: Verify passes 37 files/typecheck/build. New real-serializer/index/scope/evidence/selection regressions cover missing schema with/without thread_sources, wrong managed type and ordinary authored question compatibility.
- `evidence/feature-24-installed-r3.json`: final installed bundle equality. Prior r2 theme/keyboard evidence remains applicable to unchanged form/layout code; this repair changes only projection dispatch and its tests/spec. All earlier evidence remains preserved. Fresh full-delta review required.


## Malformed-frontmatter review repair

Third independent review closed F-02 and raised F-03 for losing parsed metadata after a broken header delimiter. F-03 attempt 1 recognizes raw reserved question schema lines and evidence markers independently of decoded type/version. Missing or rejected headers fail closed; ordinary unmarked notes remain compatible. These private machine markers are reserved, including in malformed records; no authoritative bytes are changed or migrated.

- `evidence/feature-24-frontmatter-r1.json`: eight actual Obsidian cases pass. Canonical and missing-version cases repeat, plus broken opening/closing delimiters, rejected YAML and removed header delimiters. Memory/disk/search/model/selection paths refuse protected records; zero excluded reads; malformed originals retained.
- `evidence/feature-24-native-r4.json`, `evidence/feature-24-extra-r4.json`: nine native lifecycle/offline/legacy cases and four collision/cancellation/recovery cases pass again.
- `feature-24-frontmatter-verify.log`: typecheck, all 37 test files and build pass; real-serializer regressions cover all malformed variants and ordinary-note compatibility. `evidence/feature-24-installed-r4.json` records verified installed bundle identity. Earlier theme/keyboard evidence applies to unchanged form/layout code. A fresh complete-delta independent review is required.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":16165,"specSha256":"f367725f99601a992733f0252b55246ae73882c1b6726ddf88a460d5cb5c8f87","branch":"refs/heads/feature/managed-project-questions","head":"af1c0b0a70e5f54f6163b61f8fc025ef663c7dfe","baseRef":"refs/heads/main","baseCommit":"25d71c166c46cee9a6361994bdb018668335d088","sourceTree":"99fefef2c2ee572452523839c0b2583ec5e603ae","landing":"local-merge","absentOptional":[]} -->

## Findings

### 24/F-01 [P1] closed - Saved question event snapshots bypass later source exclusions

**File:** src/vault/questions.ts:42 (also generated reference links at lines 17 and 41)
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `updateQuestion` appends `sourceReferences(bundle)`, including copied source excerpts and paths, inside an ordinary fenced JSON block in the question body. `outputProjection` treats managed questions as user-authored records, so `indexNote` and `evidenceFromPaths` reuse this copied material without checking its original source. After the supporting source is excluded, the question correctly remains usable, but its copied source excerpts remain searchable, cached and eligible for model context. This violates the current scope/exclusion boundary without requiring inference. A read-only synthetic reproduction created a source with a canary, appended an investigating event using its evidence, rebuilt the index with that source excluded, then rebuilt evidence from the question. It reported `sourceExcluded=true`, `questionUsable=true`, `indexContainsExcludedExcerpt=true` and `modelEvidenceContainsExcludedExcerpt=true`. A second read-only reproduction with a newly created question, without any lifecycle update, confirmed that automatically generated evidence links also retain an excluded source path in question chunks, `linkTexts` and rebuilt model evidence (`cachedAutomaticReferenceContainsExcludedPath=true`, `cachedLinkTextsContainsExcludedPath=true`, `modelEvidenceContainsExcludedPath=true`). Both cases share the missing derived projection boundary; directly authored question/answer text should remain authoritative. The existing native exclusion case only excludes a copied legacy source while its form is open; it does not exercise persisted event provenance.
**Suggested fix:** Preserve the authoritative Markdown and original user question/answers/reasons, but exclude machine-copied event snapshot blocks and automatically generated reference links to unavailable sources from derived question text, or project those blocks only through validated current source permissions. Reuse the existing output-projection/range mechanism so indexing, retrieval, selection and model evidence share that boundary. Keep the user's question active when supporting evidence changes. Add a regression covering a saved event followed by source exclusion and rebuild, checking both cached/search text and model evidence while retaining question/history in Markdown. No current requirement needs to be removed.
**Resolution:** Two repair attempts recorded in the new run ledger. Protected evidence blocks and managed frontmatter are excluded by shared raw-range projection, preserving structural headings, user text and durable history. Unknown/malformed managed blocks fail closed; reviewed drafts protect markers. Creation and event canaries are absent from actual memory/disk/links/search/model context after exclusion, with zero excluded reads; private property/body selections refuse reuse and human response/Home remain usable. All broad native and recovery regressions plus Verify pass. Awaiting fresh complete-delta independent review.


**Independent re-review (2026-10-16):** Closed F-01 against a9206b8730bbc23299588c405b9d284cfc8f6582 after reviewing the entire feature delta. Canonical version-1 creation and event blocks now use the shared protected projection, including frontmatter exclusion and raw selection ranges; user question/response/history remain authoritative. Verify passed all 37 test files, typecheck and build. Inspected feature-24-privacy-r2.json and its actual-host helper: memory/disk/link/search/model canaries absent, zero excluded reads, protected selections refused and human response/Home preserved. Native lifecycle/recovery, keyboard and theme reruns pass and bundle SHA matches. A distinct malformed-schema dispatch defect is recorded separately as F-02.

### 24/F-02 [P1] closed - Missing question schema field exposes protected evidence as ordinary text

**File:** src/vault/freshness.ts:69 (ordinary-text fallback at line 83)
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Managed question projection runs only when `thread_question_version` is present. Removing that one property in an external Markdown edit leaves `type: question`, `thread_sources` and reserved evidence blocks intact, but the dispatcher treats the record as ordinary user text. After its supporting source is excluded and the question is rebuilt, automatic event excerpts and reference paths become eligible for caching, search, model context and editor selection again. This violates the spec's malformed-managed-format fail-closed and exclusion contracts. Two read-only synthetic Node reproductions used real creation/event serialization, projection, index, scope, evidence and selection code. Creation reported `questionUsable=true`, `indexContainsExcludedPath=true`, `modelEvidenceContainsExcludedPath=true`, `protectedSelectionAllowed=true`. The saved-event variant reported `indexContainsExcludedExcerpt=true`, `modelContainsExcludedExcerpt=true`, `searchReturnsExcludedExcerpt=true`. Neither reproduction reads the excluded original; the leak is from retained machine copies. Current regressions cover unknown versions and broken markers but omit a missing version field.
**Suggested fix:** Detect a managed question's retained reserved evidence markers/provenance before the ordinary-text fallback, and fail closed when its required schema field is absent. Preserve genuinely unmanaged `type: question` notes without managed evidence and preserve authoritative Markdown. Reuse the existing question projection and invalid-output result; no new subsystem is needed. Add a regression removing only the schema property from actual created/updated records, then excluding the source and checking cache/search/model/selection refusal plus unmanaged-note compatibility.
**Resolution:** Repair attempt 1 detects Thread question metadata/provenance before ordinary-note dispatch. Missing schema, invalid versions and mismatched managed types fail closed without rewriting originals; unmanaged authored questions remain compatible. Verify and native schema/canonical privacy/lifecycle/recovery regressions pass; zero excluded reads. Awaiting fresh full-delta independent review.


**Independent re-review (2026-10-16):** Closed F-02 against 81a38c29e46d8e83e575513db13d4ac2d9b5ec4a after fresh review of the complete feature delta. Removing only the schema property, including without thread_sources, now reaches invalid managed projection; wrong-type records retaining the schema also refuse reuse. The actual serializer/index/evidence/selection regressions pass, and feature-24-schema-r1.json records native memory/disk/search/context/selection/update refusal with zero excluded reads. Ordinary authored questions remain compatible. F-01 remains independently confirmed closed. A separate malformed-frontmatter dispatch path is recorded as F-03.

### 24/F-03 [P1] closed - Malformed frontmatter bypasses reserved question evidence protection

**File:** src/vault/freshness.ts:67 (also src/vault/evidence.ts:44-54)
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Reserved question evidence markers are recognized only when parsed metadata still says type: question, unless a parsed schema property survives. A single external edit changing the closing frontmatter delimiter from --- to -- makes readMetadata return an empty object. The retained managed evidence blocks then pass through ordinary-note projection. A read-only synthetic reproduction used real question creation and investigating-event serialization, changed only that delimiter, excluded the supporting source, and ran readMetadata, outputProjection, indexNote, LocalIndex, buildEvidence and savedSelection. It confirmed metadataEmpty=true, questionUsable=true, indexContainsExcludedPath=true, indexContainsExcludedExcerpt=true, searchReturnsExcludedExcerpt=true, protectedSelectionAllowed=true and modelContainsExcludedExcerpt=true. The YAML parser was never called, so this reproduction does not depend on a parser stub. Invalid YAML that the host parser rejects reaches the same empty-metadata fallback. No excluded original needs to be read. This violates malformed-managed-format fail-closed and source-exclusion contracts; canonical/missing-version regression success does not cover lost frontmatter recognition.
**Suggested fix:** Recognize reserved question evidence markers independently of successfully parsed type/schema metadata, then fail closed when the required managed identity/schema is unavailable. Reuse questionUserText's invalid result. Preserve ordinary unmanaged questions without reserved markers and raw Markdown. Add a real-serializer regression breaking the frontmatter delimiter and exercising cache/search/model/selection refusal; include parser-failure coverage and native acceptance when available.
**Resolution:** Fixed in repair attempt 1: reserved raw namespace detection is independent of parsed metadata. Real serializer logic and eight native privacy cases, plus full lifecycle/recovery reruns and Verify pass. Await fresh independent confirmation; reviewer must close.


**Independent re-review (2026-10-16):** Closed F-03 against af1c0b0a70e5f54f6163b61f8fc025ef663c7dfe after fresh review of the complete feature 24 delta across quality, security, performance and tests. Raw reserved schema/evidence detection now precedes ordinary-note fallback independently of parsed metadata. Read-only reviewer reproduction passed five malformed/missing-schema variants through real serializer, projection, indexing, search, evidence and saved-selection paths; canonical human responses and ordinary unmarked notes remain usable. Verify passed typecheck, all 37 test files and production build. Inspected actual-host helper and feature-24-frontmatter-r1.json (eight cases, zero excluded reads), native-r4/extra-r4 (nine lifecycle plus four guard/recovery cases), installed-r4 hashes and unchanged-form r2 light/dark screenshots/keyboard evidence. F-01 and F-02 remain closed; no new findings across the complete delta. Native acceptance artifacts were inspected, not rerun by this reviewer.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** af1c0b0a70e5f54f6163b61f8fc025ef663c7dfe
**Base commit:** 25d71c166c46cee9a6361994bdb018668335d088
**Base ref:** main
**Spec hash:** f367725f99601a992733f0252b55246ae73882c1b6726ddf88a460d5cb5c8f87
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T14:27:38.575539+00:00
**Workflow:** continuous
**Check required:** no

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T14:29:57.968438+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, all 37 test files, production build.
- `git diff --check 25d71c166c46cee9a6361994bdb018668335d088..HEAD`: pass.
- `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`: pass; exact target/base/spec and only permitted review evidence dirty.
- Read-only Node reproduction using real question serializer, projection, index/search, evidence and saved selection: pass for five malformed/missing-schema variants; canonical human text and ordinary-note compatibility retained.
- `sha256sum main.js manifest.json styles.css`: pass; all three rebuilt artifact hashes equal feature-24-installed-r4.json.
- Targeted skipped/focused/placeholder-test search: no matches; Verify reports zero skipped/todo.

## Evidence

- Complete `25d71c166c46cee9a6361994bdb018668335d088..af1c0b0a70e5f54f6163b61f8fc025ef663c7dfe` delta reviewed against the verified spec, AGENTS.md and coding standards: README, command/home wiring, native question form and handler tests, question schema/history and tests, shared freshness projection, change-draft marker protection, index, Home/recorded Resume/queue consumers, selection serialization and compatibility tests. Followed existing NewNoteModal/ThreadModal, evidence, scope and ChangeManager call boundaries. Review/findings excluded from product scope; dependencies, generated bundle and historical archives excluded from source review. Bundle used only for identity verification.
- `.thread-local/continuous-22-34/evidence/feature-24-frontmatter-r1.json` and actual-host helper `test-feature-24-frontmatter.js`: eight native persisted-provenance/missing-schema/malformed-header cases, memory/disk/search/context/selection refusal and zero excluded reads; authoritative history preserved.
- `evidence/feature-24-native-r4.json`, `evidence/feature-24-extra-r4.json` and actual-host helpers `test-feature-24.js` / `test-feature-24-extra.js`: nine native lifecycle/legacy/offline cases and four protected-source/collision/cancellation/uncertain-write recovery cases pass with no real inference.
- `evidence/feature-24-installed-r4.json`: rebuilt artifact hash identity confirmed. `evidence/feature-24-r2-light.png` / `feature-24-r2-dark.png` visually inspected; `feature-24-visual-r2.json`, `feature-24-r2-keyboard.json` and CDP helper inspected for native Tab/Enter and restored settings/theme. These prior layout artifacts apply to unchanged form/layout code.
- Security: reserved provenance fails closed before ordinary-note dispatch; raw source permissions and protected locations remain guarded, copied evidence stays out of derived text/ranges, user text is escaped, lifecycle writes use exact previews and existing CAS/recovery. Performance: existing context/index limits and bounded evidence selection retained; no new network/model work or dependencies. Tests exercise important consumer and cancellation boundaries rather than only serialization.

## Findings

- F-03 closed after independent code/evidence verification. F-01 and F-02 remain closed. No new findings; no open or fixed P0/P1 findings.

## Remaining risk

- Check was not required. Native Obsidian acceptance and keyboard/theme artifacts were inspected rather than rerun in this reviewer turn; no live inference or performance profiling was performed. The feature is explicitly model-free and this delta adds no model path.
