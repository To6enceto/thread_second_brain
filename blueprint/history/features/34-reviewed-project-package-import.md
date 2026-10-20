# Feature: Reviewed project package import

**From build-plan:** feature 34
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/reviewed-project-package-import`

## Goal

Validate untrusted local project packages, review exact new-copy destinations and identities, import outside read grants with durable partial-write recovery, and verify the final offline0.3.0 package.

## In scope

Strict bounded version1 JSON decoder; explicit package-file read consent; exact import inventory/link/identity mapping; new-folder-only byte-preserving writes with non-overwrite guards and durable reviewed recovery. Native final packaged offline roundtrip, PDF/local inference, documentation and release inventory.

## Out of scope

Destructive restore, merges/overwrites, archive compression, arbitrary attachments/executables, ID/link/provenance rewriting, automatic read grants, paid/network services, distribution.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Validate untrusted packages and durable new-copy engine** - Implement strict schema/path/type/size/hash/payload validation, exact preview mapping and bounded persistent import receipts with resumable uncertain writes. *Done when:* Meaningful malicious-input/byte-exact/collision/current-state/cancel/reload/partial recovery tests pass Verify.
- [x] **Step 2 - Native reviewed import and recovery** - Explicitly read selected package, show exact new root/mappings/duplicates/collisions and readable contents, require renewed preview on changes; save outside all grants, expose explicit recovery and keep-partial actions. *Done when:* Actual Obsidian synthetic import and races preserve notes/history/grants with no AI; keyboard/theme acceptance and Verify pass.
- [x] **Step 3 - Verify final portable offline release** - Prepare private0.3.0 assets with version-specific staging, inspect all inventory/licenses/hashes and reproducibility; install tested candidate in fresh isolated Obsidian and demonstrate export/import/PDF/local inference/recovery, update docs and independent review. *Done when:* All required checks/native acceptance/review pass; verified final ZIP and preserved earlier evidence/archive bytes, ready to complete and push.

## Files / areas

src/portability/{decode,import}.ts and tests; src/ui/import-modal.ts; src/main.ts/native menu; scripts/package.mjs and package validation; README/AGENTS/version metadata/project overview; ignored native acceptance.

## Data / contracts

Uncompressed .thread-project.json version1 only, max100files/48MiBserialized/32MiBexpanded/2MiBtext/16MiBPDF. Exact keys/types/canonicalbase64/SHA256/strictUTF8/portable paths and metadata consistency before writes. Explicit selected-package read includes embedded PDF bytes but grants no ongoing access. New folder outside all allowed/excluded text and PDF paths; preserve exact payload bytes/IDs, show links/duplicate IDs and unknown existing coverage. Untrusted contents never rendered as HTML or executed. No provenance freshening or link rebasing. Plugin-local version1 project-imports.json max100receipts, invalid/full history blocks new imports, no silent pruning; package SHA+destinations+hashes+created/inFlight persisted before writes, current-state checks and rereads, one app lease. Nonatomic Vault failures preserve partial files; explicit recovery revalidates unchanged package and created/inFlight hashes, refuses later edits/foreign conflicts, only missing files created. Explicit keep-partial closes recovery without deleting notes. Model-free/offline. Release0.3.0 inventory191files, prior0.2artifact and features1-21archive bytes preserved.

## Testing

Malicious schema/path/type/size/hash/encoding tests, byte exact BOM/CRLF/Unicode/PDF roundtrip, races/journal failure/cancel/reload/uncertain-write recovery tests. Actual Obsidian authored packages/PDFs outside grants, collisions/partial failure and explicit recovery, no unexpected reads/network/model, keyboard/light/dark. Fresh packaged install and actual offline PDF page navigation + real text/embedding inference, all assets/reproducibility checked, independent full delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Implemented schema and boundaries

Version1 uncompressed Thread JSON only, strict exact fields,1-100entries,48MiB
serialized/32MiB expanded/2MiB text/16MiB PDF. Preflight aggregate/path/case/folder
validation before payload allocation; canonical base64/full SHA256 and strict UTF8.
Identity metadata agrees with actual frontmatter; PDF signature and empty identity/
link/reference metadata required. No scripts, Markdown rendering, archive extraction,
URL resolution or model calls. Text/BOM/CRLF/PDF bytes are copied through Vault binary
APIs. Manifest metadata is integrity information, not provenance/claim verification.

Selected-package read is explicit and includes embedded PDFs, but adds no text/PDF
read grants. New top-level root is wholly outside every grant and exclusion. Full
old-to-new file and informational link mapping, hashes/text/IDs/duplicates are
previewed with honest permitted-index coverage. Exact bytes/IDs/provenance remain;
fully qualified links/project associations may need manual review and copied PDF
originals need explicit consent/new extraction. No existing roots/files are reused.

project-imports.json version1 has up to100receipts,16MiB metadata, schemaVersion and
receipts. Each receipt binds id/packageHash/source/root/startedAt/status(pending,
complete,left)/rootCreated/entries(path,bytes,sha256)/created/inFlight. Strict loader
preserves invalid history and blocks writes; no automatic pruning/reset. Intent is
persisted before folders/files, inFlight before create, full hash verified before
completion. CAS against original journal text and one app-wide lease across dialogs/
plugin reloads. Existing destinations, parent blockers, case/NFC aliases and changed
package/settings/index-identity snapshots refuse. Immediate source-package events
apply outside ordinary read grants. Created files are never changed by recovery.
Explicit recovery reselects exact package, rechecks created/inFlight hashes and can
adopt matching uncertain files without ownership claims; later edits and foreign
collisions refuse. Explicit keep-partial marks left, preserving copies/history.
Folder-before-journal-failure uncertainty can require keep-partial/new root.

## Verification and actual acceptance

- npm run verify: typecheck,60 test files and production build pass;0 skipped/todo.
  Meaningful cases cover strict malicious schemas/paths/unsupported assets/aliases,
  serialized/expanded/file limits, canonical encoding/SHA/UTF8/identity lies,
 1.5MB payload parser behavior, exact BOM/CRLF/Unicode, initial/concurrent collisions,
  persistent reload/uncertain adoption/later-edit refusal, cancellation, full/invalid
  history and failures before/after a successful write.
- npm run evaluate:11/11 authored quality cases; evaluate:index3/3 and
  evaluate:retrieval3/3 controls pass. Logs feature-34-{evaluate,index,retrieval}.log.
- Actual original isolated Obsidian acceptance: evidence/feature-34-native.json,
 8passing groups, five-entry package7747serialized/3501expanded bytes, explicit
  validation, granted/existing-root refusal, traversal rejection, held source change,
  uncertain write/reload/adoption, later edit, Cancel/keep-partial and concurrent
  foreign destination. Original notes/PDF/change history/settings unchanged;0models/
  network. Original lab browser closed only after tests to free inotify resources.
- Final candidate installed in a SECOND fresh marked synthetic vault/profile,
  Obsidian1.14.4; startup defaults had allowedPaths=[]/pdfPaths=[]. Main-loopback
  namespace has no external interface; Ollama0.40.4 cloud disabled. Fresh browser
  initially hit per-user inotify allocation failure; closing only the owned prior
  headless browser then reloading resolved it without system-limit changes.
- Final repaired candidate native evidence: feature-34-fresh-native.json8groups
  (picker metadata only, exact five-file copy outside grants, existing root/traversal,
  held package edit, reload/recovery/later-edit refusal, Cancel/keep-partial, foreign
  file conflict, original package/history/settings unchanged), native-extra.json2
  (two-dialog app lease/Cancel and immediate exclusion during held apply).
- feature-34-packaged-offline.json6groups: explicit text grant resolves current
  byte-identical source by stable ID while relocated old PDF provenance stays blocked
  with0binary reads; explicit copied-PDF consent plus new packaged offline extraction
  preserves old source; actual original viewer page2; real local qwen3-embedding:0.6b
  (2embedding calls) and qwen3:4b-instruct(1text) answer63euros/Cedar; exclusion revokes
  dependent evidence, model-free recorded Resume, explicit re-export omits stale
  relocated PDF history.0external fetch calls. No prior notes/history were rewritten.
- Native Tab reaches destination, Enter builds exact preview, Space opens readable
  contents. Duplicate IDs against current permitted copies are shown. Eight final
  selection/preview top/bottom light/dark screenshots inspected, no horizontal
  overflow. feature-34-visual-keyboard.json and feature-34-*.png. A1x1native Settings
  popout caused initial capture visibility failures; two allowed harness repairs
  identified ownerDocument and focused the main window. Visibility gate then passed.
  A separate real preview overflow from long hashes/paths was repaired once with
  scoped wrapping, then full final candidate/native tests and all screenshots passed.
  Earlier evidence/candidates preserved; repair ledger feature-34-repairs.json.
- Candidate .thread-local/continuous-22-34/candidate-0.3.0-layout-r1/thread-0.3.0.zip:
 4047629bytes, SHA25674bb33b52789205dce128cc63deed13513092a57431ad85eabd802f12b9d09be.
  Candidate-layout-r1.json, repeat-layout.json and fresh-installed.json independently
  bind all191 ZIP/installed files; strict ZIPSTORE/local+central/CRC/path/inventory/
  production SHA checks and a second package byte comparison pass. PDF188assets
  include all parser/worker/CMap/font/license files; no runtime personal data.
  Final dist artifact is generated only after passing independent review and must
  equal this native-tested candidate. Old0.2ZIP/staging/completion-report preserved.
- feature-34-preserved-history.json proves all21 old archive bytes match43c39b19.
  Updated overview under20000bytes, metadata/private version0.3.0 and package docs.

## Known limits

Linux desktop only validated. No OCR, ZIP/compressed projects, arbitrary attachments,
ID/link rewriting, destructive restore or claim of complete vault backup. Large
workloads/models/platforms need their own evidence. Import is non-atomic, history
bounded and retained; explicit recovery can refuse uncertain folders or later edits.
Text read grants and original PDF consent remain explicit user choices. Final
package remains private/UNLICENSED, with no paid API/backend/subscription runtime.

## Try it now

Use a separate synthetic vault, enable the verified0.3.0 package and add a selected
checkpoint exported with Thread. Run Import project package and recovery, choose
a new top-level root outside grants, Validate, inspect mappings/identities/contents,
then Import previewed new copies. Verify exact source bytes and unchanged read
grants. Explicitly permit only the chosen imported project. Old copied PDF sources
remain unavailable until exact new original consent and explicit extraction; keyword
and recorded Resume still work without a model. For controlled interrupted import,
reopen the command, inspect recovery against the unchanged package and either resume
hash-matching missing copies or keep partial files. Never delete history to retry.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12227,"specSha256":"d719af5bfdeb1e5cdcc4ba37b582ddb373bb7aa1f2ad4008d50d3ae73a6b5ed9","branch":"refs/heads/feature/reviewed-project-package-import","head":"5b73d2fd4484e9d158f89635da96f989c6490f34","baseRef":"refs/heads/main","baseCommit":"449c11638a7ef2dc91b18746802f61012461c356","sourceTree":"1c39f12a6206b605f77f294417695927f9526828","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 5b73d2fd4484e9d158f89635da96f989c6490f34
**Base commit:** 449c11638a7ef2dc91b18746802f61012461c356
**Base ref:** main
**Spec hash:** d719af5bfdeb1e5cdcc4ba37b582ddb373bb7aa1f2ad4008d50d3ae73a6b5ed9
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T12:55:46.227533+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T12:59:06.518200+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: pass; exact request target, permitted base, tracked spec bytes and allowed dirty paths verified before and after review.
- `npm run verify`: pass; strict typecheck, all 60 test files, zero failures/skips/todo, production build.
- `git diff --check main...HEAD`: pass.
- `node scripts/verify-package.mjs .thread-local/continuous-22-34/candidate-0.3.0-layout-r1/thread-0.3.0.zip`: pass; 191 files, 4047629 bytes, SHA-256 74bb33b52789205dce128cc63deed13513092a57431ad85eabd802f12b9d09be.
- Read-only Python `zipfile`/SHA-256 byte comparisons: pass; ZIP CRC, unique inventory, all 191 final installed/staged/current-production files, recorded per-file hashes, identical layout-r1/layout-repeat archives, all 21 archived features against git 43c39b19 and old ZIP recorded hash; all three old dist/thread staging files equal old ZIP.

## Evidence

- Reviewed the complete 449c11638a7ef2dc91b18746802f61012461c356..5b73d2fd4484e9d158f89635da96f989c6490f34 delta: decoder, durable import engine/tests/fixtures, native modal and main lifecycle/event/settings/port wiring, Home action, scoped CSS, packaging/verifier, version/lock metadata, README, AGENTS, current spec and overview. Followed adjacent package format/export/path scope, metadata, index identity/provenance and ThreadModal cancellation contracts. Applied installed Audit/independent-review contract, project coding standards and configuration. Excluded unrelated source and third-party/dependency implementation; generated production assets were compared as release bytes.
- Fresh code review found no confirmed quality/security/performance/tests defects. Tests cover malformed packages, byte preservation, limits, collisions, cancellation, persistent uncertain-write adoption, later edits and journal failures. No focused/skipped/placeholder portability tests found. The ordinary test runner reports 60 files rather than an invented inner-case coverage percentage.
- Independently read raw `.thread-local/continuous-22-34/evidence/feature-34-{native,fresh-native,native-extra,packaged-offline,visual-keyboard,fresh-installed,candidate-layout-r1,repeat-layout,preserved-history,package-negative-controls}.json`, repair ledger and native/capture harnesses. Final evidence records 8 native groups, 2 lease/exclusion groups and 6 packaged offline groups, including real local text/embedding inference, original PDF page 2, stale copied-PDF refusal, explicit grants/extraction, re-export and preserved history. Inspected actual assertions and instrumentation, not only success labels.
- Personally inspected all eight final feature-34 selection/preview top/bottom light/dark screenshots: readable consent/inventory/identity/link text, visible native controls and wrapping. Retained earlier evidence and candidates were present. Native screenshot visibility repairs retained the gate; the real preview overflow repair is included in the reviewed CSS and final candidate.
- Checked full final ZIP/installed inventory including PDF worker/parser resources, CMaps, fonts and required licenses. Both existing independently staged archives equal the current production bytes and each other. Final standard dist artifact is intentionally deferred until after review and must match the candidate hash. Features 1-21 match original Git bytes, old 0.2 ZIP/staging remain intact, and original completion report remains present (10287 bytes, SHA-256 f4b566d0c0798bf6f1bf96b86c508f547c257a30ca6fa17046729ae0a8098ebc).
- Inspected recorded feature-34 evaluate/index/retrieval logs: 11/11, 3/3 and 3/3 authored offline controls. These were recorded runs; reviewer reran Verify and package checks, not native automation or local inference.

## Findings

- None. Findings ledger unchanged; no finding added, accepted, waived or closed. No repair order required.

## Remaining risk

- Native Obsidian automation, screenshots and real local inference were inspected from recorded final-candidate evidence and harnesses; they were not rerun in this independent review. Linux desktop is the validated environment; other platforms, models and larger workloads retain the stated limits.
- Import remains non-atomic with bounded retained recovery metadata. Folder creation immediately before journal failure may require explicit keep-partial/new-root recovery, as documented. No destructive recovery or provenance freshening was inferred.
- No lint, browser-test, CI or live vulnerability-scanner command is configured; no current dependency vulnerability scan was claimed. Old completion report existence/hash was checked, but no pre-run report hash was supplied for a historical byte-equality claim.
