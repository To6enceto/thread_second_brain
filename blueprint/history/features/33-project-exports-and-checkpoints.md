# Feature: Project exports and checkpoints

**From build-plan:** feature 33
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/project-exports-and-checkpoints`

## Goal

Explicitly select current permitted project notes and eligible supporting PDFs, inspect a bounded inventory, then save a non-overwriting portable local checkpoint with versioned hashes while preserving source bytes and permissions.

## In scope

Uncompressed self-contained version1 Thread project JSON format, strict portable paths/types/finite byte budgets, current-source eligibility including private provenance, explicit native checklist and exact package preview, dedicated non-overwriting local package destination and snapshot revalidation. Safe manifest links/identities, omissions and portability limitations.

## Out of scope

Whole-vault backups, automatic exports, remote storage, compression/ZIP project packages, arbitrary attachments, settings/cache/journal/model export, original edits, rewriting source IDs/links/provenance, package import before34.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Freeze bounded package format and export eligibility** - Define strict shared portable paths, types, manifest/hash/payload encoding and finite limits; build explicit-selection export service with private-provenance eligibility, filtered manifest links and stale/scope-invalid omissions. *Done when:* Pure tests prove exact bytes/hashes, eligible PDF consent, invalid paths/collisions/types/budgets, private stale-source omission without excluded manifest paths and source preservation; Verify passes.
- [x] **Step 2 - Native selection, exact inventory and local checkpoint save** - Add explicit project export dialog with current bounded candidate checkboxes, optional supporting PDFs, destination/name preview and dedicated non-overwriting Vault write broker. Recheck settings, source/dependency hashes and destinations on save; cancellation/changes discard previews. *Done when:* Handler/native tests prove only selected permitted data is read/exported, no overwrite/read-grant expansion/model calls, input/source/consent races refuse, clear failures/omissions and preserved source/history; Verify passes.
- [x] **Step 3 - Offline checkpoint acceptance, documentation and review** - Demonstrate actual authored project/PDF packages in isolated Obsidian, inspect byte/hash inventory, excluded/stale provenance, keyboard/themes and failures, document cost/limits and obtain independent full-delta review. *Done when:* Actual native evidence and meaningful tests/Verify pass, package contents independently validate and all required review findings close before completion and push.

## Files / areas

src/portability/ package format/export modules and tests; src/ui/export-modal.ts and handler tests; src/main.ts native command/dedicated package save; home/setup entry and README; no release version change until34.

## Data / contracts

Free offline runtime; no inference/network required. Version1 uncompressed UTF8 .thread-project.json with format/schema marker, manifest UUID/ISO creation/project path+identity/title, per-entry normalized original vault path/kind/byte length/SHA256/identity and safe links/provenance, base64 payloads and aggregate omissions. Only visible portable NFC vault-relative .md/.txt/.pdf paths, no traversal/hidden/absolute/backslash/colon/reserved platform names/case-equivalent or file-directory conflicts. Max100 entries,2MiB/text,16MiB/PDF,32MiB expanded,48MiB serialized; unsupported compression/archive types refused. Package contains selected exact source bytes, not re-rendered notes. Text candidates only current permitted project records, at most100 displayed with honest omissions; supporting PDFs only already exact-consented/current originals referenced by eligible records and explicitly selected (default off). Separate ordinary text grants and exact PDF grants/exclusions remain unchanged. Current source hashes and transitive dependencies checked before preview/save, binary operations retain32MiB/10-original verification bounds. Decisions/questions/review records with copied private provenance additionally require all recorded references/hashes current and permitted; unsupported/stale/scope-invalid copied provenance causes whole-note omission with generic count/reason, never enumerating excluded reference paths in manifest metadata. Original human note bytes can contain its own links; explicitly selected contents remain visible exact data, manifest link enumeration includes only current permitted targets. Hidden/config/runtime/cache/journal/model files never candidates. Dedicated explicit package write target defaults visible Thread Exports folder, needs no read grant, rejects exclusions and all existing output files and never modifies source notes or permissions. Folder creation and save revalidate snapshots; failed save preserves originals with actionable guidance and no automatic cleanup. Preview is revoked by selection/destination/settings/source changes or Cancel. Package is a selected checkpoint, not an exhaustive backup or permanent journal. Import34 will preserve exact bytes/IDs and preview mapping: fully qualified vault links and original-PDF provenance can need manual review/re-extraction after relocation; no automatic freshening promised.

## Testing

Verify per step, meaningful portable schema/path/hash/base64/count/byte tests and full private-provenance/current-scope export fixtures. Native marked synthetic project with authored PDF, current/stale generated output, decisions/questions/review snapshots, excluded canary and runtime files: default omissions no excluded manifest paths, exact explicit selection/checklist, package preview/creation/nonoverwrite, original/hash/settings/consent/destination races and cancellation, package inspection validates exact byte hashes and no runtime secrets/history. Zero model/remote calls, light/dark/native keyboard. Preserve all prior evidence, notes and history; fresh independent review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

Step1 evidence: feature-33-step1-verify-r1.log57 test files pass. Strict portable paths/types, exact Unicode/CRLF byte hashes and payloads, copied private-provenance omission, finite size-before-read, selection/scope/cancel/change guards proved. Step2 interim Verify58 passed; native acceptance follows after final handler wiring.

Step2 evidence: feature-33-policy-verify.log58 test files pass, including the dedicated write broker collision/concurrent destination/after-folder revalidation/cancel/failure regression. Native checklist and exact readable contents/package inventory, ordinary/PDF permissions and source checks wired; actual native acceptance in Step3.

## Acceptance evidence

- Verify: `.thread-local/continuous-22-34/feature-33-f01-verify-r1.log`,58 test files pass (typecheck/tests/production build). Export tests cover strict portable NFC/case/folder paths/types, exact Unicode/CRLF bytes and hashes, selection/consent/size-before-read/cancel/current snapshots, and whole-note omission of stale/excluded private decision/question/review provenance. Dedicated write broker tests cover existing/concurrent targets, after-folder revalidation, cancellation and write errors.
- Actual isolated Obsidian1.14.4: `evidence/feature-33-native.json`,7 native groups. Actual packaged PDF worker extracts authored Cedar/63-euro PDF to a new canonical source; native default text inventory has optional PDF unchecked, preview omits4 stale/scope-invalid copied records, explicit PDF selection changes exact preview, save creates a5-file/7747-byte checkpoint. Every payload length/SHA independently matches original bytes; Unicode/CRLF, original PDF, note bytes, read grants and durable change history preserved. Existing destinations, detached stale preview, held old read, Cancel and injected uncertain create are observed. Zero model/network calls and zero excluded/runtime Thread reads.
- `evidence/feature-33-native-races.json`,2 native groups: exact PDF consent revocation discards derived preview/detached save; a concurrent destination created during held validation remains byte-exact and save refuses.
- `evidence/feature-33-visual-keyboard.json`: real Space selects a native optional PDF checkbox, Tab reaches next item, Enter builds the exact preview with PDF included.8 screenshots `feature-33-{inventory,preview}-{dark,light}-{top,bottom}.png` inspected; no horizontal overflow, wrapped inventory paths, readable counts/limits/recovery/portability copy.
- Exact191 installed file hashes: `evidence/feature-33-installed-f01.json`. Earlier proofs/screenshots retained under before-keyboard names; final native safety/race runs use repaired bundle.
- Repairs in `feature-33-repairs.json`: Unicode byte assertion corrected once (latin1 decoder is Windows1252); native unchecked state observed from actual input; held-read harness repaired once to release only first of two validation reads, retaining prior concurrent file and stopping only owned client. Native checkbox keyboard repair2 replaces the host focusable toggle label with a true checkbox; Space/Tab/Enter and full safety reruns pass. No checks waived or repair limit exceeded.

## Limits and recovery

Uncompressed version1 JSON project packages only; no ZIP/compressed project packages or arbitrary attachments. Finite100 files/candidates,2MiB/text,16MiB/PDF,32MiB source bytes and48MiB serialized bytes. PDF current verification retains10-original/32MiB per-pass bounds with stat-before/post-growth checks; this is not streaming/atomic filesystem I/O. Selected bytes and IDs are preserved. Full vault-relative links and PDF original paths can need manual review/re-extraction after import under a new folder; no implicit identity/provenance rewriting. Default whole-note provenance omissions and generic counts protect copied scope-invalid evidence. Original human note bytes can contain their own links; only manifest enumeration is filtered. An uncertain create can leave a package/folder; inspect before retrying under a new name. No whole-vault backup or permanent journal claim.

## Try it now

In a synthetic permitted project add text and a small approved extracted PDF source. Run Thread: Export project checkpoint. Inspect current candidates; the supporting PDF starts unchecked. Select it explicitly, build a preview and inspect individual source contents/hashes and omissions, then save to a new package name. Check the .thread-project.json manifest and original bytes. Reusing that destination refuses overwrite. Change a source or revoke its PDF consent after preview: save requires a new current preview and originals remain unchanged.

Independent review F-01[P1] confirmed: raw export retained older synthesis blocks but validated only latest projected refs. Repair1 will validate all retained synthesis provenance, conservatively omit unverifiable appended model-observation history, add full-history regressions and native omission proof, then obtain fresh full-delta review. Prior checkpoint/review/evidence preserved.

## Independent review repair F-01

Confirmed P1 repaired at attempt1: export now validates every retained raw synthesis block, not only the latest AI projection. Only supported exact machine records are admitted, with100-block/2000-reference bounds. Any excluded, stale, ambiguous, invalid or unsupported historical source causes whole-note omission; latest-only AI indexing remains unchanged. Legacy appended decision observations with links but no complete source snapshots are omitted conservatively; no note history is edited.

Pure regressions reproduce latest-current human notes with older excluded/stale/unknown/inline records and history-count overflow, prove generic omission/no copied private payload, and prove fully current raw history stays byte-exact. A separate regression covers unverifiable legacy decision observations. The malformed-inline fixture initially had a canonical closing marker already rejected by latest projection; both old markers now inline so it reaches the exporter; regression-fixture repair1 passes.

Actual installed repair: `evidence/feature-33-native-history.json`4 native cases: latest-current indexed notes with older excluded/stale/unsupported blocks omitted; legacy observations omitted; fully current history exactly saved with old source hashes included; editing an older permitted source revokes the export preview. Omissions8 include4 baseline and4 added historical/legacy records. Raw historical notes preserved. `feature-33-native.json`, `feature-33-native-races.json` and real Space/Tab/Enter/theme capture rerun successfully on final191 hashes in `feature-33-installed-f01.json`. Earlier proofs retained with before-f01 suffix. All8 final screenshots re-inspected. Full Verify58 passes in `feature-33-f01-verify-r1.log`; fresh independent full-delta review is required to close F-01.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13357,"specSha256":"4fcb1ac5f0ce905ce8acad708a50745b95e94fb6993fca60110978a6803afb8b","branch":"refs/heads/feature/project-exports-and-checkpoints","head":"8dd2f1ce95308552285d552c983bf764e51ff08c","baseRef":"refs/heads/main","baseCommit":"01fdf02b0b914544df4482dadd55f4bd335cee8c","sourceTree":"c8c5e4d6a47b82bac73c2db6a55a8ad79c34c9e1","landing":"local-merge","absentOptional":[]} -->

## Findings

### 33/F-01 [P1] closed - Older copied synthesis blocks bypass whole-note export provenance checks

**File:** src/portability/export.ts:23
**Found:** 2026-10-20 by /audit independent (scope: current; lenses: security, tests)
**Why it matters:** `privateReferences` takes generated references from `entry.output.refs`, which intentionally represents only the latest `thread:output` block (`src/vault/freshness.ts:115`). Export subsequently encodes the entire raw note. Existing knowledge updates append synthesis blocks (`src/ui/knowledge-modal.ts:73`), so a permitted human note can retain an earlier block containing copied excluded evidence while its latest block references current permitted evidence. The earlier references are never checked. A read-only fixture with an old block referencing `P/Private/Secret.md` and a latest block referencing current `P/Source.md` exported the whole note, including `COPIED_PRIVATE_OLD_BLOCK`, with unavailable omissions equal to zero and only the current source in manifest references. This violates the spec's whole-note omission of stale/scope-invalid copied output provenance. Save revalidation calls the same builder and repeats the omission.
**Suggested fix:** Validate every retained managed synthesis block in the exact raw bytes, with bounded reference/schema checks, before admitting the whole note. Omit the entire note generically if any retained block has unsupported, stale, ambiguous or excluded provenance; preserve exact bytes for eligible notes. Add regression coverage for an existing human note with successive appended blocks, including excluded/stale/unsupported earlier blocks and fully current blocks. Keep the normal latest-only retrieval projection unchanged.
**Resolution:** Repair1 validates all retained raw synthesis records with supported schema/current scoped dependencies and100-block/2000-reference limits, omitting the whole note on any invalid historical reference. Legacy decision observations lacking complete snapshots are conservatively omitted. Latest-only AI projection and all note bytes remain unchanged. Pure regressions and final Verify58 pass (feature-33-f01-verify-r1.log); native history4 cases, baseline7 cases, races2 cases and actual Space/Tab/Enter/theme evidence rerun on final191 installed hashes. Closed by fresh automatic independent full-delta review at target 8dd2f1ce95308552285d552c983bf764e51ff08c (codex, gpt-6.1-sol, fresh subagent). Re-examined the repaired exporter and every changed product/test/documentation path across quality, security, performance and tests; no new confirmed findings. The raw-history scanner checks canonical and malformed retained markers, supported schema, bounded references, current permission/hash/identity and dependency snapshots before whole-note admission; legacy observations are omitted conservatively. Independently reran npm run verify: typecheck, all58 test files and production build pass with no skips/todos. Inspected native-history4, native7, races2, their harnesses and all8 final theme/keyboard screenshots. Independently verified all191 current build/installed hashes and the exact saved5-entry checkpoint against payload lengths/SHA256 and all original bytes (3501 source bytes;7747 serialized bytes), plus the saved6-entry historical checkpoint. No repair, waiver, source/history edit or new product change was made by this reviewer.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 8dd2f1ce95308552285d552c983bf764e51ff08c
**Base commit:** 01fdf02b0b914544df4482dadd55f4bd335cee8c
**Base ref:** main
**Spec hash:** 4fcb1ac5f0ce905ce8acad708a50745b95e94fb6993fca60110978a6803afb8b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:25:56.518455+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:29:55.977350+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: pass; exact target/base/spec match, only permitted receipt evidence differs.
- `git diff 01fdf02b0b914544df4482dadd55f4bd335cee8c..8dd2f1ce95308552285d552c983bf764e51ff08c`: complete delta reviewed across all four lenses.
- `npm run verify`: pass; typecheck,58 test files, production build;0 failures/skips/todos.
- Read-only Node filesystem/hash assertions: pass; all191 build and installed files match `feature-33-installed-f01.json`; saved checkpoint has exactly5 valid payloads matching original bytes,3501 expanded bytes and7747 serialized bytes; historical6-entry checkpoint payload hashes/lengths also validate.
- Targeted skipped/focused/placeholder test search: no matches in the new portability modules/tests or export modal.

## Evidence

- Complete range:01fdf02b0b914544df4482dadd55f4bd335cee8c..8dd2f1ce95308552285d552c983bf764e51ff08c; enforceable base ref `main`; exact spec SHA256:4fcb1ac5f0ce905ce8acad708a50745b95e94fb6993fca60110978a6803afb8b. Fresh isolated generic reviewer received the review handoff without builder transcript.
- Reviewed every changed product path: `src/portability/export.ts`, `format.ts`, `write.ts`, their tests, `src/ui/export-modal.ts`, `src/ui/briefing-view.ts`, `src/main.ts`, `styles.css`, `README.md`; reviewed spec changes and nearby scope, index/project membership, freshness, source-reference decoding, knowledge/decision/question/review records, PDF read/verification and modal/snapshot/write contracts. Applied AGENTS, project overview, coding standards, workflow configuration and approved33/34 scope.
- F-01 repaired and independently closed: every retained synthesis record in selected raw notes is validated, malformed/unsupported/stale/excluded/ambiguous histories omit the whole note, valid history remains exact, old dependencies join saved snapshot guards, and unverifiable legacy decision observations omit conservatively. Latest-only retrieval behavior is preserved.
- Recorded actual Obsidian evidence inspected under `.thread-local/continuous-22-34/evidence/`: `feature-33-native-history.json`4 passing groups, `feature-33-native.json`7, `feature-33-native-races.json`2, and `feature-33-visual-keyboard.json` real Space/Tab/Enter success. Inspected corresponding harness assertions and all8 final inventory/preview dark/light top/bottom screenshots: readable wrapped inventory, omissions, portability/recovery and native controls.
- `feature-33-installed-f01.json`: independently rehashed191 current production/installed files. Exact saved synthetic `Export33 54d118f9/Checkpoint.thread-project.json` contains the intended5 entries with each payload length/hash and current original matching; excluded targets absent from manifest. `Full history.thread-project.json` contains6 independently checked payloads. Prior before-f01/keyboard evidence and old release/archive artifacts preserved.
- Generated/minified build output, dependencies, PDF third-party resources and historical archives were excluded from source audit; packaged files were checked as evidence through exact hashes. No import/decoder or release0.3 work is part of this delta.

## Findings

- F-01 [P1] closed after repaired code, full delta and independent verification review. No new confirmed findings across quality, security, performance or tests; no open/fixed P0/P1 entries remain.

## Remaining risk

- Native behavior was assessed from the recorded actual Obsidian runs, inspected harnesses/screenshots and independently validated installed/package artifacts; this reviewer did not rerun native UI automation. Separate Check was not required by the request.
- Non-atomic Vault I/O and relocated links/PDF provenance retain the explicit documented limits. Import/decoder and final release packaging are approved feature34 work. No verification command was unavailable; no finding was accepted or waived.
