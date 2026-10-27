# Feature: Desktop local PDFs and page citations

**From build-plan:** feature 60
**Build attempt:** 1
**Branch:** feature/desktop-local-pdfs-and-page-citations
**Status:** verified

## Goal

Let the independent desktop window extract selectable text from explicitly consented local vault PDFs into reviewed Markdown sources, and use that text as evidence with page citations only while the consented original is current. Reuse the plugin's PDF.js worker, packaged assets, limits and record format without inheriting plugin consent.

## In scope

- Separate, volatile, exact-file PDF consent in the desktop: list permitted `.pdf` files inside current read roots/exclusions (bounded), grant/revoke individual files (at most 100), and clear consent on any read-scope change, vault change or close. Never read plugin settings for consent.
- Main-owned binary reads of consented originals: descriptor-relative, non-symlink, single-link regular files up to 16 MiB with identity rechecks and SHA-256; renderer never supplies an absolute path.
- Offline extraction: copy the existing hash-inventoried worker/resources/licenses into the desktop build, serve only inventory paths through a finite IPC method after size/hash checks, and run the existing `extractPdf` worker inside the sandboxed renderer. Preview bounded page text, progress, cancellation and encrypted/image-only/oversize/malformed/missing-resource failures.
- Exact reviewed save of a derived Markdown source (existing `thread_pdf` record, pages and limitations) into the mapped Sources folder through desktop change review. Main validates the extraction shape, rebinds it to the main-held original hash and rechecks consent/original before proposal and Apply. Collisions refused; re-extraction creates a new source; originals and earlier extractions unchanged.
- PDF evidence: verify consented originals during indexing within the existing per-operation budget (10 originals / 32 MiB), register current binaries so extracted pages are usable only with matching consented originals, and recheck those originals before Ask/Resume/review/knowledge model transmission, saves and citation opening. Changes, removal, exclusion or revoked consent invalidate dependent evidence immediately.
- Page citations open the derived note at its `PDF page N` section inside Thread after verifying the consented original is unchanged (user decision 2026-10-26: extracted page text, not rendered pages or an external viewer).
- Native accessible controls, finite IPC, keyboard/light/dark, stale/denied/empty/error states.

## Out of scope

OCR, encrypted PDFs, rendering original pages, launching external viewers, automatic re-extraction or provenance repair, persisted desktop PDF consent, importing plugin consent, PDFs outside the vault, portability/checkpoints (61), packaging (62), larger context budgets, changes to shared plugin behavior or limits.

## Build loop

Continuous Mode builds these steps serially with self-review and Verify after each. Step checkpoint commits are disabled. Actual Electron acceptance with authored synthetic PDFs and real local inference, plus a fresh passing independent review, are required before archive and local merge. At most two repairs per failing check/finding; never weaken gates. Preserve all previous evidence and archives.

## Build steps

- [x] 1. Add volatile desktop PDF consent and main-owned original reads: bounded permitted-PDF listing, grant/revoke within scope, consent cleared by scope/vault changes, descriptor-safe binary reads with size/identity/hash checks and a desktop scope that exposes `pdfPaths`. Done when filesystem tests prove listing bounds, exclusion precedence, unconsented/excluded/symlink/hardlink/oversize/changed-during-read refusal, consent revocation on regrant and no plugin-setting reads, and Verify passes.
- [x] 2. Package and serve PDF assets for the desktop and run extraction in the renderer: copy the verified inventory into the desktop build, finite inventory-only asset IPC with main-side size/hash checks, CSP and request filtering that admit only the hash-verified worker, and validated extraction handoff. Done when tests prove asset path/size/hash refusal, inventory failure messages and extraction validation, the desktop build contains the exact inventory, and Verify passes.
- [x] 3. Add exact reviewed derived-source saves: main-held original tokens, extraction rebinding to the original hash, consent/original/destination rechecks before proposal and Apply, collision refusal and re-extraction as a new source. Done when tests prove forged/oversized extractions, changed originals, revoked consent, collisions, cancellation and Undo leave originals and earlier sources unchanged, and Verify passes.
- [x] 4. Make PDF evidence current-original aware: index verification within budget, registered binaries, coverage text, immediate invalidation on original/consent/scope changes, binary rechecks before model transmission/saves, and verified `PDF page N` navigation. Done when tests prove unconsented/changed/missing/excluded originals fail closed in search, Ask, Resume and citation opening, budgets are reported and Verify passes.
- [x] 5. Wire the native PDF view, consent controls, extraction preview/cancel, Sources save and page links with lifecycle invalidation. Done when view tests reject late obsolete results, every planned action is reachable and Verify passes.
- [x] 6. Demonstrate actual isolated Electron with authored synthetic PDFs: consent/grant/revoke, extraction preview with progress and cancel, encrypted/image-only/oversize/malformed refusal, exact reviewed save and collision, re-extraction, page navigation, evidence in Ask/Resume with real local inference, invalidation after original change/exclusion/revocation, offline asset use, keyboard/light/dark and byte preservation. Done when native artifacts and Verify pass. Test actual Obsidian too if shared plugin behavior changes.
- [x] 7. Update docs, limitations and try instructions; self-review the full delta and prepare a verified immutable checkpoint. Done when final Verify passes and previous archive bytes remain intact. Completion additionally requires a fresh passing independent review with resolved findings.

## Files / areas

New focused standalone modules for PDF consent/originals and extraction saves, plus a native PDF view; integrate vault-reader (bounded PDF listing, binary reads), evidence-index (binary verification and registration), ask/projects/knowledge/reviews/records verification paths as needed, contracts/preload/main/renderer/app/styles, scripts/desktop-build.mjs and security asset allowance. Reuse src/pdf (record, parser, checks, scope, worker) unchanged. docs/desktop.md.

## Data / contracts

Keep `pdfjs-dist@6.4.299`, extraction `thread-pdf-1`, `thread_pdf_version: "1"` records and the PDF limits: 16 MiB input, 200 document pages, 40 examined pages, 8000 characters per page, 100000 characters, 30-second deadline, 200 asset requests and 8 MiB resource bytes per extraction. Index/evidence verification uses `PdfChecks` (10 distinct originals, 32 MiB per operation). Desktop consent is in-memory only, at most 100 exact vault-relative paths, each currently permitted and listed; it grants no Markdown reads and Markdown grants never imply PDF reads. No new persisted state or migration.

The renderer runs PDF.js because parsing untrusted PDFs stays out of the privileged main process (design choice recorded 2026-10-26). Main treats renderer-reported extractions as untrusted input: exact shape/limit validation, binding to a main-held original token and hash, and user review of the exact derived Markdown. Main reads assets only from the packaged inventory and refuses any path outside it. The worker is created from hash-verified bytes; no CDN, linked URL, remote font or document script is fetched.

## Testing

Baseline is local main b1f60568736f66e92755e52601cca05dde8644c0, whose tree passed 59-completion-verify.log (486 tests, typecheck, both builds). Use Node tests with real temporary files and the existing PDF test fixtures; delayed lifecycle responses for view tests. Create new ignored vault-60/profile-60 and authored synthetic PDFs (selectable text, multi-page, image-only, encrypted, malformed, oversize). Use actual sandboxed Electron and the existing isolated cloud-disabled Ollama for real inference. Check original byte hashes, exact reviewed outputs, collisions, exclusions, revoked consent, canceled/late work and offline asset loading.

## Notes for the AI

Prefer small modules and reuse src/pdf rather than re-implementing parsing or record formats. Never pass arbitrary paths, prompts or proposed Markdown over IPC. If the blob-worker CSP approach cannot be made to work under the renderer sandbox and request filter, keep parsing out of main and record the alternative used. Citation existence does not prove semantic truth.

## Step evidence

- Step 1: 60-step1-focused.log passed 9 reader tests; 60-step1-verify.log passed 488 tests, zero failures/skips, typecheck and both builds. The listing records at most 200 permitted ordinary single-link PDFs with stamps while keeping them out of the text list and omitted counts unchanged; consent is exact, in memory, capped at 100, cleared by any read-scope change and never read from plugin data; binary reads are descriptor-relative with consent/scope rechecks, 16 MiB bound, identity rechecks and SHA-256; the evidence scope exposes only consented listed PDFs as pdfPaths.
- Step 2: the desktop build now builds its own minified worker, copies pdfjs resources/licenses and writes/verifies its own inventory (187 files) through the existing asset helpers given a base folder; plugin root outputs are unchanged. DesktopPdfAssets serves only inventory paths with main-side size/hash checks via one finite IPC method. CSP adds worker-src blob: only. 60-step2-focused.log passed 2 asset tests; 60-native-asset-probe.json shows a blob worker starting in the actual sandboxed window under the request filter, inventory bytes over IPC, path escape refusal and blocked network; 60-step2-verify.log passed 490 tests and both builds.
- Step 3: DesktopPdf lists permitted PDFs with consent state, reads only consented listed originals into main-held tokens, validates renderer-reported extractions with the shared validator, rebinds them to the main-read hash, rechecks the original before proposing a new Sources note and records the original as a supporting source; change review now rechecks consented PDF supporting sources by binary hash, so changed originals or revoked consent make Apply not ready. Consent changes keep the vault revision (bumping it invalidated writer ownership); main resets evidence instead. 60-step3-focused.log failed on that revision bump and a collision-message regex, 60-step3-focused-r1.log on an oldest-first history index in the Undo assertion; 60-step3-focused-r2.log passed 11 tests and 60-step3-verify.log passed 492 tests and both builds.
- Step 4: the desktop index verifies consented originals for extracted sources on every rebuild with PdfChecks (10 originals / 32 MiB), registers matching binaries before replace so unverified pages lose their chunks, adds consented PDF stamps to the rebuild signature and reports extracted/ungranted/verified/omitted counts. A reader currentHash helper rechecks consented PDF originals by binary hash in the Ask, Resume, records, reviews, collections, intake and knowledge verification loops (graph dependencies already carry the original's hash). Evidence opens of extracted notes require the consented original to match; ordinary note-list opens remain plain Markdown reads. 60-step4-focused.log failed two count expectations that hid ungranted PDFs, so coverage now states them; 60-step4-focused-r1.log passed 2 tests and 60-step4-verify.log passed 494 tests (one test typecheck fix) and both builds.
- Step 5: Capture and research gains an Extract a local PDF mode: permitted PDF list with exact grant/revoke buttons, granted-file selection, local extraction with progress through the shared extractPdf (constructor seam for tests), per-page preview, cancel that aborts extraction, and Preview PDF source into change review. Main adds finite load/consent/read/prepare IPC; consent keeps the vault revision, discards dependent work and starts an evidence rebuild whose ready event reloads the PDF list. Coverage shows PDF verification counts. 60-step5-focused.log passed 9 view tests including late read/extraction rejection; 60-step5-verify.log passed 496 tests and both builds.
- Step 6: Actual sandboxed Electron on owned Xvfb used new ignored vault-60/profile-60 with authored PDFs (vault picked through the native dialog). Evidence 60-native-setup/extract/refusals/evidence-r1/invalidation/revoke/changed-coverage/ui/theme JSON proves listing without the excluded PDF, exact grants, real PDF.js extraction in the renderer worker with progress and per-page preview, exact reviewed save with provenance, collision refusal and re-extraction as a separate source, image-only/encrypted/malformed/oversize refusal, an inert script/URI canary with no renderer fetches, the 100000-character examined-page limit, cancel mid-extraction, real qwen3:4b-instruct Ask and Resume citing PDF pages, page navigation to the extracted section, evidence removal after an original edit and return after restoring its bytes, revocation and exclusion clearing grants, keyboard focus and light/dark (60-pdf-light/dark.png). Native review found three feature defects: Resume (and knowledge/records/reviews) projected PDF extractions to empty text, PDF collisions showed the generic target-changed message, and coverage counted changed originals as verified. Repairs added a shared projectedSource helper (validated page text plus PDF record for usable entries), an explicit already-exists refusal and a changed-original count; 60-step6-repair-focused.log and -r1.log passed, native reruns confirmed them. 60-preservation.json verifies all original bytes, exact new sources and no pending proposal; 60-step6-verify.log passed 497 tests and both builds; 60-plugin-package-check.log shows the plugin package still verifies its PDF inventory. Shared plugin source is unchanged apart from the asset script's optional base folder, so no Obsidian acceptance was required.
- Step 7: docs/desktop.md documents per-file PDF grants, offline extraction, reviewed saves, evidence/citation behavior, invalidation and limits; README.md lists desktop PDF extraction. Full-delta self-review found no debug output, untyped escapes, network calls or Unicode punctuation. 60-step7-verify.log passed 497 tests, zero failures/skips, typecheck and both builds; blueprint/history is unchanged against main.
- Review repair: the first receipt (target dec8484) passed with P2 F-01 (Ask/changed-Resume fail-closed tests missing) and P3 F-02 (stale PDF preview after selection change) and F-03 (raw errors from prepare). One repair added Ask and Resume fail-closed tests, cleared/aborted stale extraction state on selection change with a view test, and limited prepare's verbatim messages to validation errors. 60-findings-repair-focused.log passed 16 tests and 60-findings-repair-focused-view.log 10; 60-findings-repair-verify.log records Verify. Reviewer text is preserved in 60-independent-review-r1-output.md and persisted verbatim by the builder because subagent writes are blocked.
- Second review repair: the second receipt (target ae2f167) passed, closed F-01..F-03 and raised P3 F-04 (concurrent consent updates used a stale list), F-05 (one extra byte charged per original) and F-06 (no changed-during-read test). One repair recomputes consent from the live selection after the file check, returns exactly sized PDF bytes and adds both tests; 60-findings-repair2-focused.log passed 17 tests and 60-findings-repair2-verify.log records Verify. Reviewer text is preserved in 60-independent-review-r2-output.md.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":15978,"specSha256":"59eaae9905397439a35c53f15ccf2aa2c3366da7ef5f3b42bc000ae2a1cbc656","branch":"refs/heads/feature/desktop-local-pdfs-and-page-citations","head":"8b0c6b30829154a5db9e11848d8d90a49d739a0e","baseRef":"refs/heads/main","baseCommit":"b1f60568736f66e92755e52601cca05dde8644c0","sourceTree":"acf7e202af2c56adaee58d95196ec6c033b2ae9e","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 60/F-01 [P2] closed - PDF fail-closed tests do not reach Ask or changed/revoked Resume verification

**File:** src/standalone/pdf-evidence.test.ts:31
**Found:** 2026-10-27 by /audit independent (scope: current; lens: tests)
**Why it matters:** Step 4's done criterion says tests prove unconsented, changed, missing and excluded originals fail closed in search, Ask, Resume and citation opening. The new tests cover search, citation opening and an ungranted Resume only. Nothing exercises the Ask pre-transmission recheck (src/standalone/ask.ts:64-67), the Resume recheck after an original changes or consent is revoked (src/standalone/projects.ts:43-44, 69-70), or a missing original. Failure scenario: a regression that drops the `listing.pdfs` fallback or the `currentHash` PDF branch in ask.ts would let page text from a just-edited or revoked original reach the local model between retrieval and transmission, and Verify would still pass. The native Ask run shows only the positive path.
**Suggested fix:** Extend pdf-evidence.test.ts with (a) a DesktopAsk case that retrieves PDF evidence, then edits or revokes the original before generation and asserts "Ask sources changed", and (b) a Resume case that edits, removes and revokes the original after a granted Resume and asserts the PDF pages leave the bundle or verification refuses. No product change needed.
**Resolution:** src/standalone/pdf-evidence.test.ts now drives DesktopAsk retrieve/choose and asserts refusal before model use after the original is edited and after its grant is revoked, and drives Resume after edit, restore, removal (rename away), return and revocation, asserting PDF pages leave and return only for exact bytes. Evidence: 60-findings-repair-focused.log. Closed 2026-10-27 by /audit independent re-review of ae2f167: pdf-evidence.test.ts:77-97 exercises DesktopAsk.choose (which runs the ask.ts:62-69 verify loop) with a throwing model stub, and Resume with edit/restore/move/return/revoke; the positive choose/Resume steps would fail if the `listing.pdfs` fallback or the currentHash PDF branch were dropped. npm run verify passed 500 tests. No new defect introduced.

### 60/F-02 [P3] closed - Changing the selected PDF keeps a stale extraction preview and enabled save action

**File:** src/standalone/research-view.ts:65
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality)
**Why it matters:** The "PDF to extract" select (src/standalone/research-view.ts:130) calls `changed()`. That bumps the epoch and tells main to drop the original token (DesktopPdf.draftChanged), but it does not clear `this.extracted`, the `research-pdf-preview` content or `this.controller`. Failure scenario: extract Study.pdf, then pick Other.pdf. Study.pdf's pages stay on screen as "Extracted text - not saved" and "Preview PDF source" stays enabled, but clicking it always fails with "Extract the current PDF again before saving." If the selection changes during an extraction, the PDF.js worker keeps running (up to the 30-second deadline) while a new extraction can start. Main fails closed, so no data is affected.
**Suggested fix:** In the PDF mode's select handler (or in `changed()`), set `this.extracted = null`, clear `research-pdf-preview`, abort and null `this.controller`, then call `setBusy(false)` so the needsExtraction button disables.
**Resolution:** The PDF select handler now clears the stored extraction and preview, aborts and drops any running extraction controller, then calls changed(), so Preview PDF source disables. research-view.test.ts covers a finished preview and a running extraction. Evidence: 60-findings-repair-focused-view.log. Closed 2026-10-27 by /audit independent re-review of ae2f167: research-view.ts:130 clears `extracted`, aborts/nulls `controller`, empties the preview and calls changed() (which runs setBusy(false)); the late extraction is dropped by the `current()`/controller identity check; research-view.test.ts:118-126 asserts both cases. No new defect introduced.

### 60/F-03 [P3] closed - DesktopPdf.prepare surfaces raw internal error messages

**File:** src/standalone/pdf.ts:62
**Found:** 2026-10-27 by /audit independent (scope: current; lens: security)
**Why it matters:** The catch turns every `Error` into a `DesktopError`, which `publicFailure` then shows verbatim. That bypasses the generic message that normally hides unexpected failures. Failure scenario: the PDF is removed or renamed between the descriptor read and the identity reopen in `readPdf` (src/standalone/vault-reader.ts:248). The raw Node error (`ENOENT: no such file or directory, open '/proc/self/fd/NN/...'`) appears in the research status instead of the guided PDF message. Other internal errors on this path would surface the same way.
**Suggested fix:** Convert only the expected validation errors (the noteName, validateExtraction, pdfSource and metadata calls) into DesktopError, and rethrow everything else unchanged so publicFailure keeps its generic fallback.
**Resolution:** DesktopPdf.prepare converts only the name/extraction/record/metadata validation errors to DesktopError; reads, rechecks and proposal errors propagate unchanged so publicFailure keeps its generic message for unexpected failures. Evidence: 60-findings-repair-focused.log. Closed 2026-10-27 by /audit independent re-review of ae2f167: pdf.ts:210-211 wraps only noteName/validateExtraction/pdfSource/metadata; the outer try now has only a finally, so raw readPdf/propose errors reach publicFailure (security.ts:38-40) and show the generic message. Forged-extraction and name tests in pdf.test.ts still reject. No new defect introduced.

### 60/F-04 [P3] closed - Concurrent PDF consent updates can lose a change or resurrect a revoked grant

**File:** src/standalone/vault-reader.ts:71
**Found:** 2026-10-27 by /audit independent (scope: current; lens: security)
**Why it matters:** `consentPdf` captures `selected` and computes `pdfs` from `selected.pdfs` before awaiting `openPath`/`stat` (line 65-67), then writes `{ ...selected, pdfs }` after the await. `this.current(revision)` only proves the revision is unchanged, and consent changes deliberately keep the revision. Failure scenario: B is granted; a grant of A is awaiting its file check; a revoke of B (which has no await) commits `pdfs: []`; the grant of A then commits `[A, B]` from its stale copy, so B's binary consent returns without the user granting it. Two concurrent grants likewise lose one. Main does not serialize `thread:consent-pdf` (main.ts:182); only the renderer busy guard prevents overlap, so the shipped UI is not known to reach it and a compromised renderer could grant directly anyway. Severity stays P3.
**Suggested fix:** After the await, recompute from the live selection: `const now = this.current(revision); this.selection = { ...now, pdfs: [...now.pdfs.filter(item => item !== path), path].sort(...) }` (and recheck the 100 cap against `now.pdfs`). No new machinery needed.
**Resolution:** consentPdf now rechecks the cap and recomputes the consent list from the live selection after the file check, so concurrent grants/revokes are never lost or undone. vault-reader.test.ts reproduces a grant awaiting its check while a revoke commits. Evidence: 60-findings-repair2-focused.log. Closed 2026-10-27 by /audit independent re-review of 8b0c6b3: vault-reader.ts:70-73 re-reads `now = this.current(revision)` after the await, rechecks the cap against `now.pdfs` and builds the list from `now`, so a revoke that commits during the grant's file check survives; a concurrent scope change, vault change or close bumps the revision or clears the selection and makes `current` throw, so no grant is committed against a newer scope. vault-reader.test.ts:155-161 discriminates: with the old code the grant would commit [A, B] and the assertion would fail. npm run verify passed 501 tests. No new defect introduced.

### 60/F-05 [P3] closed - PDF verification charges one extra byte per original against the 32 MiB budget

**File:** src/standalone/evidence-index.ts:122
**Found:** 2026-10-27 by /audit independent (scope: current; lens: performance)
**Why it matters:** `readPdf` returns `buffer.subarray(0, count)` of `Buffer.alloc(before.size + 1)` (vault-reader.ts:246, 252), so `original.bytes.buffer` is size+1 bytes (confirmed with node). `PdfChecks.verify` charges `result.bytes.byteLength - length` as post-read growth (src/pdf/checks.ts:12), adding 1 byte per original. Failure scenario: consented originals totalling exactly 32 MiB leave the last one unverified and its extracted pages out of evidence, and coverage text reports "bytes read/reserved" one byte too high per original.
**Suggested fix:** Pass an exactly sized ArrayBuffer, for example `original.bytes.buffer.slice(original.bytes.byteOffset, original.bytes.byteOffset + original.bytes.byteLength)`, or allocate only the bytes read. Nothing is lost.
**Resolution:** readPdf returns an exactly sized copy of the bytes read, so PdfChecks charges only real bytes; vault-reader.test.ts asserts the backing buffer length equals the file size. Evidence: 60-findings-repair2-focused.log. Closed 2026-10-27 by /audit independent re-review of 8b0c6b3: vault-reader.ts:255 returns `new Uint8Array(buffer.subarray(0, count))`, a copy with its own exactly sized ArrayBuffer, so `original.bytes.buffer as ArrayBuffer` at evidence-index.ts:122 has byteLength equal to the bytes read and checks.ts:12 adds no growth. The hash is computed over the same bytes, and pdf.ts read and the renderer `buffer()` helper are unaffected. vault-reader.test.ts:158 would fail with the old size+1 buffer. Peak memory is a transient second copy of at most 16 MiB per read, which is acceptable. No new defect introduced.

### 60/F-06 [P3] closed - No test proves a PDF that changes during a binary read is refused

**File:** src/standalone/vault-reader.test.ts:121
**Found:** 2026-10-27 by /audit independent (scope: current; lens: tests)
**Why it matters:** Step 1's done criterion lists "changed-during-read refusal", and the guard exists at src/standalone/vault-reader.ts:250 (count, handle stamp and reopened identity stamp). No test reaches the "PDF moved or changed during reading" message; the reader test covers cancel, oversize, missing, link and exclusion only. Failure scenario: a regression that drops the reopen/stamp comparison would let bytes from a file swapped or appended mid-read be hashed and bound as the consented original, and Verify would still pass.
**Suggested fix:** In vault-reader.test.ts, call `readPdf` with a `current` callback that appends to or renames/replaces the file on its first invocation after the open, and assert rejection with /moved or changed during reading/. No product change needed.
**Resolution:** vault-reader.test.ts appends to the PDF from the current callback after the open and asserts the moved-or-changed-during-reading refusal. Evidence: 60-findings-repair2-focused.log. Closed 2026-10-27 by /audit independent re-review of 8b0c6b3: vault-reader.test.ts:159 appends on the third `allowed()` call (after the open and before stat, inside the read loop before the first read), so the read sees size+1 bytes and changed stamps and is refused at vault-reader.ts:252 with the asserted message; the test passes in this session's Verify. This meets the done criterion and the suggested fix. Residual (not a defect): an append is also caught by the byte-count check alone, so a same-size rename swap, which only the reopen identity stamp catches, has no isolating test. Recorded under Remaining risk in the receipt.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 8b0c6b30829154a5db9e11848d8d90a49d739a0e
**Base commit:** b1f60568736f66e92755e52601cca05dde8644c0
**Base ref:** main
**Spec hash:** 59eaae9905397439a35c53f15ccf2aa2c3366da7ef5f3b42bc000ae2a1cbc656
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T12:35:37Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T12:39:08Z
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

- `git rev-parse HEAD` / `git merge-base main HEAD` / `git status --porcelain --untracked-files=all` / `sha256sum blueprint/context/current-feature.md`: pass (target, base and spec hash match the request; only review.md differs from the target; rechecked before writing the receipt)
- `git diff b1f6056..8b0c6b3` (30 files) and `git show 8b0c6b3`: pass (full source, test, script and doc delta reviewed)
- `npm run verify`: pass (typecheck clean; 501 tests, 501 pass, 0 fail/cancelled/skipped/todo; plugin and desktop builds ready; tree unchanged afterwards)
- `grep` delta scans for Unicode punctuation, `console.`, `any`, `.only`/`.skip`/`todo` and `debugger`: pass (none found)

## Evidence

- Full delta reviewed fresh: vault-reader PDF listing (lstat through the directory descriptor, 200 cap, hidden paths refused by relativePath), consentPdf, readPdf and currentHash; pdf.ts load/read/prepare; pdf-assets.ts; evidence-index PdfChecks verification, binaries registration (cleared by index.clear on every rebuild), rebuild signature, coverage text, scope pdfPaths and the source() citation gate; ask/projects/records/reviews/collections/intake/knowledge/changes recheck loops and projectedSource; main/preload/contracts IPC (sender and argument-count validation through handle()); app.html CSP; renderer indexReady wiring; research-view PDF mode; desktop-build and pdf-assets scripts; docs/desktop.md; README.md; and the six new or changed test files.
- Security boundaries confirmed in code: every binary read path (DesktopPdf.read, evidence verification, currentHash rechecks, changes.sources, the source() gate) goes through readPdf, which requires live exact consent and permitted scope at every chunk. Reads are descriptor-relative with O_NOFOLLOW, single-link, 16 MiB bound, with handle and reopen stamp checks. Asset IPC serves only validated inventory paths after size and SHA-256 checks. CSP adds only `worker-src blob:`. prepare validates the extraction, rebinds it to the hash held in main, rereads the original and records it as a supporting source that change review rechecks by binary hash.
- Repair commit 8b0c6b3 re-examined: consentPdf recomputes from the live selection after its await and rechecks the cap, while scope, vault or close changes still invalidate through the revision (F-04). readPdf returns an exactly sized copy, so PdfChecks charges only real bytes (F-05). The new test reaches the changed-during-read refusal (F-06). Both new assertions would fail against the pre-repair code.
- 60-findings-repair2-focused.log (17 pass) and 60-findings-repair2-verify.log (501 pass) agree with this session's Verify run. Native evidence 60-preservation, -native-revoke, -native-changed-coverage and -native-asset-probe is consistent with the reviewed code paths.

## Findings

- F-01 [P2] closed: PDF fail-closed tests do not reach Ask or changed/revoked Resume verification (unchanged)
- F-02 [P3] closed: Changing the selected PDF keeps a stale extraction preview and enabled save action (unchanged)
- F-03 [P3] closed: DesktopPdf.prepare surfaces raw internal error messages (unchanged)
- F-04 [P3] closed this pass: Concurrent PDF consent updates can lose a change or resurrect a revoked grant
- F-05 [P3] closed this pass: PDF verification charges one extra byte per original against the 32 MiB budget
- F-06 [P3] closed this pass: No test proves a PDF that changes during a binary read is refused
- No new findings.

## Remaining risk

- No lint, browser-test or CI command is configured; those signals are unavailable.
- Check was not required and was not run from this session. Native Electron and real-inference evidence (60- files) predates repair commits ae2f167 and 8b0c6b3; the 8b0c6b3 consent and buffer changes are covered by unit tests only, not a fresh native run.
- The changed-during-read test appends to the file, which the byte-count check alone also catches; a same-size rename swap, caught only by the reopen identity stamp, has no isolating test.
- Desktop pre-transmission rechecks (ask, projects, records, reviews, collections, intake, knowledge) and citation opens reread consented originals through currentHash without their own PdfChecks budget. They are bounded only indirectly by the evidence bundles and the 16 MiB per-file cap; not profiled.
- Every evidence rebuild, including those triggered by unrelated Markdown edits, rehashes up to 10 consented originals / 32 MiB; acceptable by spec but not profiled.
