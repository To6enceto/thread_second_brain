# Feature: Desktop capture and research collections

**From build-plan:** feature 59
**Build attempt:** 1
**Branch:** feature/desktop-capture-and-research-collections
**Status:** verified

## Goal

Bring deliberate source intake and reusable research into the independent desktop window, retaining original notes and imported snapshots. Reuse existing Markdown formats, revalidate current evidence, and route every created note or knowledge update through exact desktop change review.

## In scope

- Capture a typed thought into the mapped Inbox or an explicitly picked local UTF-8 Markdown/text snapshot into Sources. Show original name, optional validated provenance URL, exact imported text and optional explicit project association. Offer the existing keyword project suggestion without applying it automatically. Detect known exact imports from currently permitted source records; disclose bounded duplicate coverage.
- Review a permitted locally saved clip, its available title/author/URL, separate publication/capture/intake dates, chosen project and possible duplicates. Require explicit duplicate acknowledgement before a separate source copy. Preserve original local files; never fetch URLs, images or attachments.
- Save Ask's current passage references and Include/Pin/Exclude intent as a named collection. Reopen within explicitly selected scope/project, reread current references, redact unavailable paths/text and require reconfirmation for changed passages before Ask reuse. Edits save a separate reviewed copy; collection storage contains references and locators, not cached excerpts.
- Generate a local cited concept/comparison from up to five explicitly selected current sources. Create a new Knowledge note or append a synthesis block to an eligible existing Knowledge note; optionally append a link to an explicitly selected project note. Review every affected note; preserve properties, prior text and original sources.
- Native capture/research controls, finite main-owned IPC, accessible keyboard/light/dark surfaces, cancellation, source navigation and stale/denied/empty/error states. No new model/runtime dependency.

## Out of scope

PDF consent/extraction (60), portability/checkpoints (61), desktop packaging (62), URL crawling, remote assets, automatic project association or merge, changing original clips, bulk intake, autonomous note changes, plugin-journal mutation or silent permission inheritance. No personal-note tests or everyday installation changes.

## Build loop

Continuous Mode builds the following coherent steps serially, with Verify after each. User authority covers routine within-scope refinements, local lifecycle and normal pushes of verified completed main commits. Step checkpoint commits are disabled. Actual Electron acceptance and a fresh passing independent review are required before archive/merge/push. Preserve all previous reports/archive bytes. At most two repairs per failing check/finding; do not weaken gates.

## Build steps

- [x] 1. Add main-owned capture and explicitly chosen external text snapshots, current project suggestions and scoped exact-import checks. Done when filesystem tests prove bounded fatal UTF-8 decoding, unsupported/symlink/special-file refusal, retained original bytes, explicit associations, non-overwriting exact proposals, known duplicate refusal, input/source/permission cancellation and Verify passes.
- [x] 2. Add local clip metadata/association/duplicate review and exact new-source proposals using existing clip validators. Done when tests prove missing/ambiguous metadata, unchanged originals, no URL requests, required explicit duplicate acknowledgement, current project/source/catalog checks and Verify passes.
- [x] 3. Port named collections and trusted Ask handoff using existing collection schemas/resolvers. Done when tests prove no cached excerpts, scope/project identity matching, changed-reference reconfirmation, unavailable-reference redaction, bounded Include/Pin/Exclude behavior, current-source rechecks, new-copy saves, metadata round-trip compatibility and Verify passes.
- [x] 4. Add local knowledge concept/comparison proposals with new or append destinations and optional explicit project links. Done when tests prove bounded current evidence, source/target conflicts, preserved properties/text, current model/input/scope cancellation, exact multi-note preview/Apply, guarded Undo/recovery and Verify passes.
- [x] 5. Wire finite IPC, native Capture and research views, Ask collection save/reuse, lifecycle invalidation, source links and keyboard/theme primitives. Done when view lifecycle tests reject late obsolete results, every planned action is reachable and Verify passes.
- [x] 6. Demonstrate actual isolated Electron with authored synthetic vault notes and external local text files: capture/import/duplicate refusal; clip metadata/duplicate acknowledgement; collection save/reopen/current, changed and excluded references; real local Ask and knowledge inference; exact new/append/link writes, conflicts and Undo; cancellation/revocation, keyboard/light/dark and byte preservation. Done when native artifacts and Verify pass. Test actual Obsidian too if shared plugin behavior changes.
- [x] 7. Update docs, limitations and try instructions; self-review the full delta and prepare a verified immutable checkpoint. Done when final Verify passes and previous archive bytes remain intact. Completion additionally requires a fresh passing independent review with resolved findings.

## Files / areas

Add focused standalone capture/intake and research/collection controllers plus filesystem/lifecycle tests; native research-view.ts as needed. Integrate contracts/preload/main/renderer/app/styles and the existing Ask controller/view through finite trusted collection methods. A small external-text reader may hold native file-picker snapshots; it must never become a generic renderer file-read API. Reuse vault/capture.ts, clipper.ts, collection-record.ts, knowledge.ts and existing evidence/workbench/project identity/current-source guards. Reuse desktop changes/catalog/storage/AI. Extend standalone metadata admission only for a validated bounded collection record if required for shared format round trips; ordinary metadata limits and existing action-history support stay. docs/desktop.md. No shared plugin behavior change expected.

## Data / contracts

Keep current source-capture fields, thread_clip_version 1, collection record version 1 and generated synthesis/provenance formats. No migration or new mutable plugin state. Desktop import detection is rebuilt from current permitted indexed source metadata, with explicit omissions; it does not consult or expose excluded/plugin registry paths. An exact previously imported input is refused for ordinary file capture; clipped-note intake follows the existing explicit possible-duplicate review contract. New entries and changed sources invalidate guarded proposals via the existing version-2 catalog context. Unknown sources outside scope cannot be certified as unique.

External file authority comes only from an explicit native file dialog restricted to .md/.txt. Main reads one ordinary, non-symlink regular file with bounded stat/descriptor checks and fatal UTF-8 decoding, returning an opaque retained snapshot token, basename and preview text. No arbitrary path is accepted from renderer. That deliberately selected decoded snapshot is the imported source; no external-file watch, URL fetch or future implicit read is granted. A new picker operation/cancel/scope change invalidates obsolete snapshots. Original files are never modified. Local clip intake instead reads a current already permitted vault note and revalidates its hash through proposal/Apply.

Preserve the existing 2 MiB text-import/clip input bound. The desktop journal's stricter 1 MB combined before/after proposal budget still applies; oversized captures/append batches refuse without truncation or partially saving. All destination paths are main-computed from mapped Inbox/Sources/Knowledge or explicit project Collections subfolders, existing read grants/exclusions and validated note names. Roles grant no reads. Existing destinations never overwrite unless the user explicitly chooses an eligible knowledge append target and reviews its exact before/after. Project suggestion is optional and cannot change selection by itself.

Collections: existing 1-50 references, 128 KiB JSON record and 512 KiB note bounds; list at most 100 current permitted collections. Save from Ask's retained main snapshot and choices, not renderer-supplied excerpts/Markdown. Use project/allowed scope identity and source ID/heading/hash/locator. Reopen resolves only current permitted entries; unavailable rows expose only reference number/state/intent. Reconfirm changed passages; Pins remain inside the 16000-character context bound. Add collection and supporting dependency hashes to Ask's retained current context. No model call occurs on opening or reusing a collection; generation is explicit. Save edited choices as a new reviewed copy. Larger valid collection metadata needs a narrowly validated admission exception, not a general metadata-limit increase; prove serialize/read/index round trips at supported bounds.

Knowledge: up to five chosen current sources, existing 16000-character evidence bound and local model deadline. Validate structured claims/citations. Main owns evidence, target originals and generated operations. Appends preserve existing metadata/text and protect source/managed records; optional project-link target must be a current eligible project note distinct from the knowledge destination. Reject selected supporting targets that would create self-invalidating provenance or conflict with journal source/target separation. All targets and dependencies are revalidated before model transmission, proposal and exact Apply; no autonomous statuses or writes. Pending change/recovery remains explicit.

## Testing

Baseline is verified/pushed main 5ac4c4de2854f4531319b92c52e17919320e0d84, whose exact product tree passed 58-completion-verify.log: 455 tests, strict typecheck and both builds. Current spec was empty, overview source hash current, 59 first unchecked, no prior stable-ID 59 archive or branch/path-history collision. Preserve that proof and fresh run boundary from 49. Use current Node tests with real temporary files and delayed lifecycle responses; host listener access is needed for writer-ownership tests. Create new ignored vault-59/profile-59 and authored external fixture files, after inspecting reused helpers for feature/path assumptions. Use actual sandboxed Electron and existing isolated cloud-disabled Ollama for real text generation; preserve earlier vaults/reports. Check original byte hashes, exact reviewed outputs, collisions, exclusions, catalog changes, canceled/late work, unsupported formats and guarded Undo/recovery.

## Notes for the AI

Prefer small separate responsibilities over a general workflow framework. Reuse main-owned Ask/evidence lifecycle and pure domain functions; never pass arbitrary prompts, filesystem paths or proposed Markdown over IPC. No imported URL requests. Existing conservative bounds may reject large captures or histories; describe that limit instead of widening the journal or truncating authoritative records. Split oversized steps while keeping feature 59 and its dependencies. Read-only collection reopening must not claim authority from old cached text. Citation validity still does not establish semantic truth.

## Step evidence

- Step 1: 59-step1-focused.log passed 9 tests. 59-step1-verify.log passed 464 tests, no failures/skips, strict typecheck and both production builds. Self-review confirmed native-pick-only external paths, retained snapshots, exact proposals and current catalog/source checks.
- Step 2: 59-step2-focused.log passed 19 tests; 59-step2-verify.log passed 467 tests, no failures/skips, typecheck and both builds. Verified BOM/CRLF original preservation, missing/ambiguous metadata, no URL requests, duplicate acknowledgement, stale identities/sources/catalog, cancellation and revoked access. Desktop note decoding now retains a leading BOM in source/conflict hashes; plugin metadata reading and shared plugin behavior are unchanged.
- Step 3: 59-step3-focused-r1.log passed 19 collection/Ask tests; 59-step3-verify.log passed 472 tests, zero failures/skips, typecheck and both builds. Proven reference-only shared records, separate copies, current/renamed/changed/excluded resolution, scope identities, main-owned Ask handoff without inference, current collection/source/catalog checks and large valid metadata round trips. Initial malformed-version test used quoted YAML keys unlike the serializer and did not mutate its fixture; one repair corrected the mutation and asserts changed bytes, preserving the failure log and strict rejection assertion.
- Step 4: 59-step4-focused-r1.log passed 15 knowledge/change tests; 59-step4-verify.log passed 479 tests, zero failures/skips, typecheck and both builds. Proven explicit bounded context, target/source validation before transmission, exact new/append/link review, BOM/CRLF/properties preservation, external edits, late cancellation/model/revocation, guarded Undo and interrupted-append recovery. Initial synthetic provider omitted required local model_info; one fixture repair supplies that metadata without weakening the real local-model gate.
- Step 5: 59-step5-focused.log passed 27 research/collection/knowledge/view lifecycle tests; 59-step5-verify.log passed 485 tests, zero failures/skips, typecheck and both builds, with no source changes after that run. Self-review confirmed finite typed IPC with main-owned paths and evidence, opaque picker tokens, renderer epoch/access guards plus main epochs for late results, research invalidation on scope/project/model/writer/vault changes, proposal survival when opening change review (changes are invalidated only while a prepare is in flight) and reachable controls for every planned capture, clip, collection, Ask save/reuse and knowledge action.
- Step 6: Actual sandboxed Electron on owned Xvfb used new ignored vault-59/profile-59 and authored external-59 files; vault and file selection went through the real native GTK dialogs. Evidence 59-native-setup/thought/import/duplicate/invalid/picker-cancel/clip/collection-save/collection-reopen/collection-copy/knowledge/conflict/append-undo/cancel-revoke/ui/theme JSON proves explicit grants/exclusions and writer roles, suggestion-only project association, exact CRLF-preserving import, known-duplicate refusal, fatal UTF-8 refusal, picker cancel, unknown clip metadata, required duplicate acknowledgement, no renderer fetches, reference-only collections, changed-passage reconfirmation (unconfirmed passages never enter Ask), redaction of a newly excluded reference, a reviewed collection copy, real qwen3:4b-instruct Ask and knowledge inference on the project-owned cloud-disabled Ollama, exact new/link/append writes, external-edit Apply refusal, guarded Undo to exact prior bytes, cancellation/revocation without output, source navigation, keyboard focus and light/dark (59-research-light/dark.png). 59-preservation.json verifies all vault/external bytes, absent refused outputs and no pending proposal. Native review found three small feature defects (stale picker label after a refused file, collection-scope label visible outside collections mode, multi-line URL field); one repair fixed them with a focused test, 59-step6-repair-focused.log passed 7 view tests, 59-native-ui-repair.json confirmed them natively and 59-step6-verify.log passed 486 tests, typecheck and both builds. Shared plugin code is unchanged, so no Obsidian regression run was required. The GTK dialog shows the real home folder on the isolated display; no dialog screenshots were retained.
- Step 7: docs/desktop.md documents capture, clip review, collections, knowledge synthesis, their limits and the collection metadata bound; README.md lists the current desktop workflows. Full-delta self-review found no debug output, untyped escapes, network calls or Unicode punctuation. 59-step7-verify.log passed 486 tests, zero failures/skips, typecheck and both builds; blueprint/history is unchanged against main.
- Review repair: the first independent receipt (target 736a121) passed with two P3 findings. One repair disclosed that collection copies keep only available/reconfirmed references (F-01) and stopped offering Thread-managed records for clip review (F-02); 59-findings-repair-focused.log first failed one assertion because its managed-note fixture used an unretained index key; the fixture was changed to a realistic Thread capture and 59-findings-repair-focused-r1.log passed 14 intake/collection tests. The isolated reviewer's text is preserved in 59-independent-review-r1-output.md; the harness blocked subagent file writes, so the builder persisted that reviewer-authored receipt and ledger text verbatim.
- Second review repair: the second receipt (target 3659ed7) passed, closed F-01/F-02 and raised P3 F-03 (clip coverage text overstated the filter). The wording now says known Thread records are skipped and others are refused on review; 59-findings-repair2-focused.log and 59-findings-repair2-verify.log record the evidence. Reviewer text is preserved in 59-independent-review-r2-output.md and persisted verbatim by the builder.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":17451,"specSha256":"e46f519c4b987d4521ba52ab3ca2ad6e904349537e0b9d9faff6ab75582cc53b","branch":"refs/heads/feature/desktop-capture-and-research-collections","head":"aaee6c2c9608fa9fe4c91fa4308385f19552e1e3","baseRef":"refs/heads/main","baseCommit":"5ac4c4de2854f4531319b92c52e17919320e0d84","sourceTree":"4da437fd2904d3161d170e8750625b6a67507175","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 59/F-01 [P3] closed - Collection copies silently drop unavailable and unconfirmed references

**File:** src/standalone/collections.ts:109
**Found:** 2026-10-26 by /audit independent (scope: current; lens: quality)
**Why it matters:** `saveEdited` builds the copy from `selected()` (line 91), which uses `collectionCandidates`. That keeps only rows that are available and, when changed, reconfirmed. If a user reopens a 10-reference collection where one reference is temporarily excluded by scope and one changed passage is not reconfirmed, then edits one choice and chooses Preview collection copy, the new note holds 8 references. The coverage text (line 81) and docs/desktop.md say only "Edits save a new copy". The original collection stays unchanged and exact review shows the reduced list, so no data is lost. The omission is still undisclosed.
**Suggested fix:** State in the review coverage text and docs/desktop.md that copies keep only currently available and reconfirmed references. Code that keeps the omitted references would also be acceptable. Disclosure removes no current requirement.
**Resolution:** Collection review coverage text and docs/desktop.md now state that copies contain only currently available and reconfirmed references and that the original collection stays unchanged. Evidence: 59-findings-repair-focused-r1.log. Closed 2026-10-27 by /audit independent re-review of 5ac4c4d..3659ed7: src/standalone/collections.ts:81 and docs/desktop.md:519 now disclose the omission; saveEdited behavior is unchanged and the original collection is never a target (before: null, new path). No new defect introduced.

### 59/F-02 [P3] closed - Clip review offers the first 100 notes by path, including records it will refuse

**File:** src/standalone/intake.ts:52
**Found:** 2026-10-26 by /audit independent (scope: current; lens: quality)
**Why it matters:** The clip list holds every usable, non-output, non-PDF note, sorted by path and cut to 100. Thread-captured sources and other notes with `thread_` metadata are listed, but `readClip` always refuses them. In a permitted scope where more than 100 notes sort before the user's clip folder, real clips cannot be selected and there is no filter. The limit is disclosed in the coverage text and docs, so this is a usability limit, not a broken contract.
**Suggested fix:** Before the 100 cap, filter out entries that `readClip` would refuse: `thread_` metadata keys, or `type: source` records created by Thread. This uses existing index metadata only. No current requirement is lost.
**Resolution:** Clip review now skips notes with retained Thread metadata, Thread captures (type source with captured_on) and Thread-managed record types before the 100-note cap, using existing index metadata only; readClip still refuses any remaining managed record. intake.test.ts proves the filter and coverage text. Evidence: 59-findings-repair-focused-r1.log. Closed 2026-10-27 by /audit independent re-review of 5ac4c4d..3659ed7: `clipCandidate` (src/standalone/intake.ts:30) is applied before `slice(0, 100)` (line 54), so Thread-created captures, clipped sources, outputs and versioned records no longer consume the cap; readClip remains the authoritative refusal. The remaining disclosure imprecision is tracked separately as 59/F-03.

### 59/F-03 [P3] closed - Clip coverage text and docs overstate that Thread-managed notes are never offered

**File:** src/standalone/intake.ts:55
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality)
**Why it matters:** `clipCandidate` (line 30) can only see metadata keys the index retains (src/vault/index.ts:65), so a note whose only Thread key is unretained, for example `thread_capture_kind: thought` with no `type`, is still listed for clip review and then refused by `readClip` with "Choose an original clip, not a Thread managed record or output." The coverage text at line 55 says "Thread-managed records are not offered" and docs/desktop.md:536 says "notes with Thread metadata are not offered". The first repair run (59-findings-repair-focused.log, test 13) failed on exactly this case before the fixture was changed to a realistic Thread capture. Real Thread-created records are filtered and readClip still refuses the rest, so nothing unsafe happens. The disclosure is still inaccurate.
**Suggested fix:** Change the coverage text and docs to say that known Thread records are skipped and any other managed record is refused on review. No code change or current requirement is lost.
**Resolution:** Coverage text, its intake test assertion and docs/desktop.md now say known Thread records are skipped and any other managed record is refused on review. No behavior change. Evidence: 59-findings-repair2-focused.log. Closed 2026-10-27 by /audit independent re-review of 5ac4c4d..aaee6c2: the coverage string at src/standalone/intake.ts:94 and docs/desktop.md:536-537 now match the actual behavior (`clipCandidate` at line 69 skips known Thread records before the cap; `readClip` refuses any other managed record on review); the intake.test.ts assertion checks the new wording; 3659ed7..aaee6c2 changes only that text, its test and the docs, so no new defect was introduced.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** aaee6c2c9608fa9fe4c91fa4308385f19552e1e3
**Base commit:** 5ac4c4de2854f4531319b92c52e17919320e0d84
**Base ref:** main
**Spec hash:** e46f519c4b987d4521ba52ab3ca2ad6e904349537e0b9d9faff6ab75582cc53b
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T11:44:50Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T11:49:27Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `<base>..<target>` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npm run verify` (typecheck, 486 tests with 0 failures/skips/todo, plugin and desktop production builds): pass
- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`, `git diff 5ac4c4d..aaee6c2`: pass (HEAD, merge base and spec hash match the request; only blueprint/context/review.md differs)

## Evidence

- Full 5ac4c4d..aaee6c2 delta reviewed across all four lenses: src/standalone intake, text-import, collections, knowledge, research-view and tests; ask/ask-view handoff; main/preload/contracts IPC; metadata collection admission; vault-reader BOM retention; renderer/app.html/styles.css; docs/desktop.md and README.md. No shared plugin source outside src/standalone changed.
- Spot-checked native evidence .thread-local/desktop-50-62/evidence/59-native-collection-reopen.json, 59-findings-repair2-focused.log (9/9 pass) and 59-findings-repair2-verify.log (486/486 pass) against the code.

## Findings

- F-03 [P3] closed this pass; F-01 and F-02 [P3] remain closed; no new findings.

## Remaining risk

- No lint, browser-test or CI command is configured.
- The reviewer did not re-run actual Electron acceptance; it relies on stored native evidence that predates text-only repairs and the re-reviewed F-02 filter.
- The desktop reader now retains a leading BOM in note hashes, so earlier recorded hashes for BOM notes appear changed; the effect is fail-safe refusal or reconfirmation, not data loss.
- Proposals needing more than 100 supporting source references are refused rather than partially saved.
