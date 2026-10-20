# Feature: Local PDF extraction

**From build-plan:** feature 31
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/local-pdf-extraction`

## Goal

Select an existing local vault PDF with explicit per-file binary consent, preview bounded offline page text and save a new derived Markdown source without altering the original.

## In scope

Exact-file PDF consent separate from text grants; native selection of existing vault PDF metadata, licensed local PDF.js worker/assets, finite cancelable selectable-text extraction, honest page preview/limitations and exact non-overwriting new source save. Package inventory and authored offline PDF acceptance.

## Out of scope

External filesystem ingestion (add a PDF through Obsidian first), OCR/audio, password entry/decryption, document scripts/annotations/rendering, remote fetch/fonts, automatic all-PDF indexing or AI reuse before feature32 current-original verification, original replacement or binary copy writes.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Freeze consent and extraction record contracts** - Define strict exact-path consent, finite extraction/page metadata and canonical readable source format, compatibility settings and fail-closed index projection until verified-original integration. *Done when:* Logic tests prove old settings default no binary access, exclusions/revocation, paths/schema/page/content validation, untrusted text handling and unsupported PDF records cannot become ordinary indexed evidence; Verify passes.
- [x] **Step 2 - Implement isolated offline PDF parser and package assets** - Pin licensed compatible PDF.js, build a local owned worker and required assets/license inventory, enforce file/page/text/time limits and cancel/deadline termination, no network/document execution. *Done when:* Authored selectable/image-only/encrypted/malformed/script-URI fixtures verify extraction order/page text, clear failures/limits, cancellation and denied remote access; Verify and package inventory checks pass.
- [x] **Step 3 - Native consent, preview and exact new source save** - Add native PDF selection/consent/revoke/Extract/Cancel controls and bounded page preview, destination/name and exact NewNoteModal save rechecking consent/file hash/settings/source and collision guards. *Done when:* Handler and actual Obsidian cases prove no binary read before consent, exact per-file grants/revocation, original preservation, new-note collision/concurrent edit/closed-state refusal and no inference; Verify passes.
- [x] **Step 4 - Offline native acceptance, documentation and review** - Demonstrate authored PDFs with networking disabled, worker cancellation, local package inventory, previews/new save/page mappings, themes/keyboard and required independent review. *Done when:* Recorded real Obsidian evidence and reusable PDF checks pass, documented limitations are truthful, immutable full-delta review passes before completion and push.

## Files / areas

src/pdf/ new record/parser/worker modules and tests; src/settings/settings.ts; src/vault/freshness.ts/index handling; src/main.ts; src/ui/pdf-modal.ts and tests/home/setup as appropriate; esbuild.config.mjs/scripts/package.mjs/inventory tests; pinned package.json/lockfile and licenses/README.

## Data / contracts

Runtime stays free/local. Existing-vault PDF selection only: user adds external PDFs with Obsidian first; Thread never traverses external files. Original PDF is selected by normalized exact visible vault-relative path, remains unmodified, and is read only after explicit ongoing per-file binary consent. Settings schema1 adds exact pdfPaths defaultempty capped100; malformed paths/invalid exclusions fail closed, both an ordinary allowed folder/file path and exact PDF consent are required; text grants alone do not grant PDF reads, current exclusions always win. Native consent clearly names path and ongoing hash checks, exposes revoke and never changes allowedPaths. Stat-before/post-size/full SHA256 via Vault binary APIs; no direct filesystem or silent copies. Initial finite extraction limits: 16MiB input, 200 total document pages accepted, first40 pages examined, 8000 text characters/page, 100000 total text characters, 30s worker deadline; refine only conservatively with actual measurement within scope. Preview actual total/examined/saved/shortened/empty page counts and page order/font/text limitations, never guess image content. No OCR/encrypted support; clear failures. Owned worker can terminate on cancel/deadline; parser uses byte data, no document URL, no document actions/XFA/annotation rendering, no runtime network/eval/font fetching; all required parser code/resources/license notices packaged locally with explicit inventory. Strict version1 PDF extraction source is ordinary readable Markdown with stable UUID/type source, original vault path/full binary hash, parser/extraction version, page numbers/text hashes/limits and actual text in canonical quoted per-page sections. Treat page text as untrusted and preserve it without converting it into executable markup or machine provenance. Unknown/malformed/conflicting schemas fail closed. Until feature32 current-original validation is installed, managed PDF sources must be excluded from AI/retrieval caches rather than treated as unchecked original prose. Only derived note is written via exact new-note preview into mapped Sources role, with collision refusal and current consent/settings/PDF full-hash guards before save; original/stored notes/history untouched. Imports mean selectable local existing PDF -> new source note, not destructive restore or binary replacement.

## Testing

Verify per step and strict schema/scope/parser/handler regressions. Authored synthetic PDF fixtures and reusable offline extraction tests, including selectable text/page order, image-only, encrypted, malformed and script/URI canaries; deny external fetch/document execution; native Obsidian actual packaged worker/assets, consent/no-read/revoke/exclusion, progress/cancel/deadline, preview/save destination/collision/concurrent original change, source format/guard and history preservation. Real PDF parsing (no model needed for extraction), light/dark and native keyboard. Record exact dependency license/engine/inventory and measured limits; no semantic completeness guarantee.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Parser step evidence

Verify `.thread-local/continuous-22-34/feature-31-step2-drain-final-verify.log`: 52 test files, typecheck and worker/main build pass. Actual offline Obsidian parser evidence: `evidence/feature-31-parser-native-drain.json` (six authored PDF outcomes, page order, local packaged Liberation font, script/URI canaries inert, zero parent remote fetches, seven workers created/terminated including progress cancellation); `evidence/feature-31-parser-limits-native-r2.json` (first40/45 pages, 100000 retained chars/13 shortened pages from20, oversize before assets, injected stalled actual Worker deadline30001ms with termination). Inventory188 files plus main/manifest/styles installed191, hashes feature-31-installed-parser-drain.json. All prior evidence preserved.

PDF.js streams must drain the current page without retaining overflow: canceling its reader at a text limit caused an actual queued enqueue-to-closed-controller exception. A pure stream-drain regression and actual dense-text rerun confirm the repair. Entire owner-worker cancellation and deadline remain immediate; input/page/retained text limits stay unchanged. These are finite work/retention bounds, not a hard internal PDF parser heap limit or streaming filesystem promise. Authored dense text uses small-font rows within page bounds; off-page source text can be omitted by PDF.js itself. Repair ledger feature-31-repairs.json records all failing checks and fixes, native limit check passed on final allowed repair2.


## Final acceptance evidence

- Verify: `.thread-local/continuous-22-34/feature-31-encryption-verify.log` typecheck, 54 test files and production worker/main build pass. Strict tests cover exact PDF consent and settings compatibility, stat-before binary reads, held read identity/scope/size/abort changes, canonical page hashes/untrusted escaping, unknown/mixed record refusal, local inventory/path/hash guards, retained-text stream draining and native PDF modal grant/revoke/collision/preview/cancel/detached handlers.
- Actual Obsidian1.14.4 in loopback-only isolated lab: `evidence/feature-31-native-ui-encryption.json` eight cases pass. Metadata-only list reads no PDF bytes before exact grant, excludes private names and preserves text grants; actual two-page worker preview and exact source save through owned folder creation preserve original full SHA256/page mapping. Existing source refuses overwrite; a held old PDF read cannot save after original modification (revision guard); native Cancel during packaged local font read discards late worker work; revocation/exclusion clear previews/refuse old saves and excluded reads. Image-only/encrypted/malformed errors are actionable. Home entry works; authored originals/approved source/durable history preserved; modelCalls0.
- Parser/bounds evidence above remains current: final installed worker/resources hashes match `feature-31-installed-encryption.json`. Parser source/worker current-page draining prevents observed PDF.js enqueue race while maintaining identical finite text/page/input/deadline/cancellation bounds; final native limit check passed repair2. No automatic repair beyond configured limits.
- `evidence/feature-31-r1-visual-keyboard.json` records real Tab/Enter: consent saves one exact path with zero binary reads, then explicit keyboard Extract reads/validates and previews two real pages. Eight native consent/pages dark/light top/bottom screenshots feature-31-r1-{consent,pages}-{dark,light}-{top,bottom}.png all inspected. Initial long option overflow repaired by scoped native Setting flex sizing; final driver asserts no horizontal overflow. Exact long path remains readable on wrapped grant button and grant record.
- Full installed191-file SHA256 inventory: evidence/feature-31-installed-encryption.json. Local PDF inventory188 verified files includes worker, manifest, CMaps/fonts and root/Foxit/Liberation/CMap license files; current package excludes Node canvas binaries, notes, settings, models and journals. Existing0.2 ZIP preserved; final new-version ZIP is deferred to feature34. No package publication/deployment.
- `npm run fixtures:pdf` exports nine authored fixture PDFs to a new ignored folder. Existing-folder and outside-project refusal plus all fixture hashes preserved: evidence/feature-31-fixtures-inventory.json. Fixture source src/pdf/test-fixtures.ts and scripts/pdf-fixtures.mjs are reusable; no personal PDFs are used.
- Exact dependency pdfjs-dist6.4.299 Apache2/Node>=22.13||>=24 verified from upstream registry and installed source/types; optional installed Node canvas1.0.11 MIT is not packaged. Primary release/license links and complete installation inventory instructions in README. No document URL/CDN/font fetch, scripting/XFA/annotations/OCR or model needed. Current raw reads use stat-before/post-size/full-hash guards; no hard internal parser heap/streaming-IO or semantic completeness claim.
- Repair ledger feature-31-repairs.json preserves canonical formatter boundary/escaping expectation, pinned public types, deterministic worker-start fixture, real PDF.js stream race and long-path native layout repairs, with prior reports/proofs retained. No checks were waived. PDF evidence is intentionally fail-closed pending feature32 current-original integration.

## Try it now

1. Add an authored selectable PDF to a separate Obsidian vault inside a folder you explicitly allow. Run Thread: Extract local PDF; inspect metadata-only listing and exact source path.
2. Choose Allow ongoing binary reads for that exact file, then Extract page text. No model runs; inspect each numbered page and coverage, including unknown omissions. Cancel stops the owner worker.
3. Choose a source note name and Preview new PDF source note. Inspect destination/provenance/page text, then explicitly Save. Existing destinations refuse overwrite; original PDF is unchanged.
4. Revoke the PDF grant or exclude the original and verify previews clear. Add/change an original only deliberately; old save previews cannot bypass current hashes or consent. Image-only/encrypted/unsupported files give guidance. Install the complete local worker/resources inventory, not only the former three plugin files.


## Encryption self-review repair F-01

A valid authored RC4-128 PDF with an empty user password was reproduced as incorrectly accepted by the old worker: evidence/feature-31-empty-encryption-before.json. Checking only the password callback was insufficient. The current worker requires the pinned parser's EncryptFilterName field to be present and null before extracting pages, refusing encrypted files even if the library opens them without prompting. F-01 is fixed pending independent confirmation, never waived. Verify54 files passes (feature-31-encryption-verify.log). Fresh actual worker7 authored cases including valid empty-password encryption and native8 grant/save cases pass (feature-31-parser-native-encryption.json, feature-31-native-ui-encryption.json). Current installed191-file hashes: feature-31-installed-encryption.json; main/styles are unchanged from the inspected final UI screenshots, worker/inventory updated and retested.

The valid fixture was authored from our own Selectable PDF using ignored project-local pypdf6.21.1 (BSD-3-Clause, license/engine metadata retained), not a runtime dependency. Its fixed bytes are included in the reusable fixture helper; the ordinary suite/build needs no Python. `npm run fixtures:pdf -- --output .thread-local/pdf-fixtures-v2` exported nine authored cases without overwriting earlier eight-case fixtures. Prior evidence, pending checkpoint and installed proof are retained.

Final repaired worker bounds rerun: evidence/feature-31-parser-limits-encryption.json confirms 40/45 pages, 100000 chars and a real30001ms stalled-worker deadline. Nine-case fixture export/collision proof: feature-31-fixtures-v2-inventory.json. F-01 awaits independent closure; all code and native checks pass.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14759,"specSha256":"9f5f77145399c45124db5f47b3fdedeb9152958bb9e0fd4641b923198863900d","branch":"refs/heads/feature/local-pdf-extraction","head":"015a7ce2c136cd2d35a787b83c9e93cc10e187e6","baseRef":"refs/heads/main","baseCommit":"52a951a20424fb0708dacb9b098c62d08dae99e0","sourceTree":"5bd211120412c8db1cc3fd10a7fb74e3d295059e","landing":"local-merge","absentOptional":[]} -->

## Findings

### 31/F-01 [P1] closed - Empty-user-password encrypted PDF bypasses encryption refusal

**Location:** src/pdf/worker.ts, document-open validation.
**Source:** Builder self-review before independent review; confirmed in actual Obsidian.
**Evidence:** `.thread-local/continuous-22-34/evidence/feature-31-empty-encryption-before.json`: a valid authored RC4-128 document is encrypted, opens with an empty user password and was incorrectly extracted by the old worker without the password callback.
**Impact:** The documented/spec encryption refusal was incomplete. No extra read grant was obtained; the explicitly supplied synthetic file was processed contrary to the no-encrypted-PDF contract.
**Required fix:** Inspect the pinned parser's actual EncryptFilterName after opening and refuse encrypted files including empty passwords; preserve all normal PDF/page/text/time/cancel and original-save guarantees.
**Repair:** The pinned parser EncryptFilterName must be present and null before extracting pages; encrypted/empty-user-password files are refused. No password entry or decrypted page output is offered.
**Validation:** Verify54 test files pass; actual installed worker core7 authored cases (including valid empty-password encryption) and native8 consent/save cases pass: feature-31-parser-native-encryption.json and feature-31-native-ui-encryption.json in the ignored run evidence directory. Fresh independent full review must confirm before closure.

**Independent resolution:** Closed on 2026-10-20 by fresh isolated codex/gpt-6.1-sol review of the complete main..015a7ce2c136cd2d35a787b83c9e93cc10e187e6 delta. Reviewed src/pdf/worker.ts and pinned PDF.js documentInfo: EncryptFilterName derives from xref.encrypt and is null only for unencrypted documents. The worker requires the property and null before any page extraction. Inspected valid authored empty-password fixture, before/after native reports (old worker accepted; repaired worker refuses), native UI regression and final bounds evidence. All 191 current artifact hashes match the installed acceptance inventory. Verify passes all 54 test files and production build. Original defect is repaired without a new confirmed defect; no new findings.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 015a7ce2c136cd2d35a787b83c9e93cc10e187e6
**Base commit:** 52a951a20424fb0708dacb9b098c62d08dae99e0
**Base ref:** main
**Spec hash:** 9f5f77145399c45124db5f47b3fdedeb9152958bb9e0fd4641b923198863900d
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T11:29:43.127025+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T11:31:59.167302+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; typecheck, 54 test files, zero failures/skips/todos, production worker/main build.
- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, `sha256sum blueprint/context/current-feature.md`: pass; exact request target/base/spec, only permitted evidence changes.
- `git diff --check main...HEAD`: pass.
- Node read-only `verifiedPdfPackageFiles()` and SHA-256 comparison against feature-31-installed-encryption.json: pass; all 188 PDF files and all 191 installed artifact hashes match, including root/CMap/Foxit/Liberation license notices.
- Targeted skipped/focused/placeholder test search in changed PDF/modal tests: none found.

## Evidence

- Complete 52a951a20424fb0708dacb9b098c62d08dae99e0..015a7ce2c136cd2d35a787b83c9e93cc10e187e6 delta reviewed from scratch, with relevant unchanged callers: src/pdf/*, src/ui/pdf-modal.ts and tests, src/main.ts, settings, vault freshness/index projection, ThreadModal/NewNoteModal/createNewNotes, home/setup wiring, styles, README, build/package/fixture scripts, package manifests/lock and ignore rules. Request/findings were context, not the code-review scope.
- Checked installed AGENTS.md, coding standards, overview, active verified spec, workflow config and independent-review contract. Reviewed exact-file consent/exclusion/revocation; binary stat/scope/identity/hash gates; worker ownership/local resource path/hash budgets; strict canonical source/page provenance and inert escaping; fail-closed AI cache projection; exact collision-free new-note save and concurrent original changes.
- Inspected `.thread-local/continuous-22-34/evidence/feature-31-empty-encryption-before.json` and `feature-31-parser-native-encryption.json`: valid authored empty-user-password encrypted PDF accepted before repair and refused after repair; seven actual installed-worker authored outcomes, progress cancellation, eight worker terminations, local font requests and inert script/URI canaries. Confirmed pinned upstream documentInfo EncryptFilterName implementation and guard before pages.
- Inspected `feature-31-parser-limits-encryption.json`: 40/45 pages, 100000 retained characters, oversize refusal before assets, injected actual stalled-worker deadline at 30001 ms. Inspected underlying native parser and deadline assertion drivers; deadline fixture is deliberately a stalled worker, not a claimed 30-second real-document parse.
- Inspected `feature-31-native-ui-encryption.json`: eight native Obsidian consent/read/save/collision/concurrent-change/cancel/revoke/exclusion/error cases, preserved original/history and zero model calls. Inspected native assertion driver for actual plugin command/modal handlers and actual packaged worker/resource use.
- Inspected `feature-31-r1-visual-keyboard.json` and all eight feature-31-r1-{consent,pages}-{dark,light}-{top,bottom}.png images: native controls, wrapped exact long consent path, readable coverage and page text, both themes; recorded Tab/Enter grants without binary reads followed by explicit extraction.
- Inspected full 191-file installed inventory, pinned pdfjs-dist6.4.299 license/engine metadata and reusable authored fixtures. Generated bundles/assets were checked by inventory/hash; third-party implementation was inspected only where needed for parser/security contracts. Dependency trees, unrelated source and preserved prior dist ZIP are excluded from authored-code review. Final new-version ZIP verification belongs to feature34; package command was intentionally not run.

## Findings

- F-01 [P1] closed: independently confirmed the empty-user-password encryption refusal repair. No new confirmed findings across the four lenses; no open/fixed P0/P1 remains. Repair order: none required.

## Remaining risk

- Native reports/screenshots were inspected against matching current built asset hashes; the reviewer did not rerun the interactive Obsidian flows. Check is not required by this request.
- Extraction retains bounded text and terminates the owned worker, but does not establish a hard internal parser heap limit or semantic completeness. Complex layouts/fonts and omitted content remain documented limitations; current-original evidence reuse remains intentionally disabled until feature32.
- No network vulnerability scan was run; local dependency/license inspection is not a current vulnerability scan. No required verification command was unavailable.
