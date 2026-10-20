# Feature: Validated local update previews

**From build-plan:** feature 47
**Build attempt:** 1
**Branch:** feature/validated-local-update-previews
**Status:** verified
**Archive:** blueprint/history/features/47-validated-local-update-previews.md

## Goal

Inspect an explicitly chosen local Thread release and installation, then produce a reviewable exact code/asset replacement preview without modifying the installation or vault data.

## In scope

Fedora/Node local helper with explicit package, install and host-version arguments; strict bounded ZIP/inventory/hash/identity/version/path/link validation; installed-code and known-data snapshots; compatibility and rollback eligibility; exclusive preview artifact outside the installation. Private0.4.0 package metadata and reproducible packaging/verification. Disposable-install acceptance plus actual Obsidian preserved-vault observation.

## Out of scope

Applying updates, rollback or recovery writes (feature48), downloads, discovery of user vaults, desktop/system installation, changing a running installation, migrations, note reads/writes, cloud services, signing/public release or dependency changes. Preview does not execute package code or assert publisher authenticity.

## Build loop

Approved serial Continuous workflow, feature-level review, no step commits or routine pauses. Verify, disposable/native acceptance, fresh independent review and try guide; two repairs per same failure/finding. Normal push separately authorized after Complete.

## Build steps

- [x] **Step 1: Release contract and strict package decoder.** Freeze runtime inventory and new compatibility metadata, extend reproducible packager/verifier, and produce private0.4.0 candidate. Done when focused tests prove exact inventory/hashes, corrupt/traversal/link/unexpected/duplicate/oversize ZIP rejection and supported identity/version/host/data declarations.
- [x] **Step 2: Read-only target preview.** Implement bounded regular-file/parent checks, target/data snapshots, explicit CLI and exact preview artifact. Done when meaningful tests prove symlink/hardlink/special-path refusal, incompatible/changed files and versions, preserved unrelated files and no installation writes.
- [x] **Step 3: Disposable/native acceptance.** Build and verify a reproducible package, exercise CLI on an owned disposable installation with actual package/data and failure cases, and confirm actual Obsidian's existing61 notes/settings/journals remain unchanged. Done when full Verify, docs/try guide and verified immutable review packet are ready. Independent review gates completion.

## Files / areas

src/desktop/update-package.ts, update-preview.ts, fixed release-files.json and adjacent tests; scripts/update-thread.mjs, package.mjs and verify-package.mjs; docs/local-updates.md, README and command documentation; package/lock/manifest private version. No Obsidian runtime behavior change.

## Data / contracts

- Runtime inventory is the existing191 files (main.js, manifest.json, styles.css and pinned pdfjs6.4.299 worker/resources/licenses), plus thread-update.json. A checked-in fixed name inventory bounds replacement authority; package metadata cannot authorize new paths. Preserve unrelated installed files. Every required runtime file is nonempty and present exactly once; no executable helper or personal content belongs in the ZIP.
- Reproducible ZIP STORE only, thread/ prefix, fixed timestamps/flags/order, ordinary regular-file attributes, no links/extras/comments/trailing bytes/encryption/compression/multipart. Bound archive40 MiB, total payload32 MiB, each file12 MiB and metadata256 KiB. Cross-check local and central records, lengths, offsets, CRC and full SHA-256. Malformed decoder errors use safe fixed guidance.
- New thread-update.json schema1 has exact id/thread version/minAppVersion/maxAppVersionExclusive/dataFormat/files fields. Files inventory excludes this self-describing metadata file, whose bytes are instead bound by archive/preview hashes. Each entry has path/bytes/sha256. Current private package becomes0.4.0; helper supports candidate0.4.x only, unchanged data contract thread-0.4-v1, host >=1.14.4 and <1.15.0. Manifest id thread, desktop-only and matching version/minimum required. Version components are bounded canonical unsigned decimal integers; prereleases/unknown series/downgrades refused. Same-version changed-code updates may be previewed explicitly.
- Installed target must be an explicitly named normalized absolute .../.obsidian/plugins/thread directory, with ordinary nonsymlink parents. Bounded regular files only; reject symlinks and multiple hardlinks for inputs/runtime/data. Verify file identity and ancestor chain around reads. Installation may be legacy0.3.0 (without update metadata) or declared compatible0.4.x; installed inventory/metadata must agree when present. Legacy code can be retained in48 but is not declared rollback-compatible. New compatible previous code can roll back only within the declared data contract/host range, never data migrations or note changes.
- Known plugin data files are data.json(schema1), changes.json(1), imports.json(1), renames.json(1), project-imports.json(1), index.json(2). Missing files are permitted; present ones require bounded regular JSON with expected schema. Read only these known local files, not notes; capture their hashes/size/absence without printing values. Max32 MiB each and64 MiB total. Unknown schemas refuse preview, never delete/rebuild caches or journals. Unrelated files are neither traversed nor rewritten.
- Preview schema1 contains normalized package/install paths, host version, package hash/size/version, target version/data contract/rollback eligibility, target ancestor identities, ordered old/new runtime hashes/sizes and known-data hashes/absence. Explicit labels distinguish add/replace/unchanged. Re-read package and target snapshots before publishing; changed files require a fresh preview. It is a bounded review artifact, not permission or executable input.
- CLI: npm run updater -- preview <package.zip> <installation-dir> <host-version> <new-preview.json>. Require an explicit local host version copied from Obsidian About; never guess it from the minimum. Write preview exclusively outside the installation after showing exact inventory; output full preview hash for48's approval binding. No process launch/stop, network, installation write or active-vault modification. Checksums detect changes, not a malicious publisher: use only locally trusted verified packages.

## Testing

Baseline host Verify302 tests/typecheck/build passed. Pure ZIP/version/compatibility tests and actual temporary-filesystem preview tests, then full Verify. Package reproducibility and strict current-build verifier. Owned disposable install receives only copied synthetic runtime/data; native acceptance observes existing61 notes and unchanged current plugin data. Feature48 will test actual application/recovery; no such completion claim here.

## Notes for the AI

This helper runs under Node outside the Obsidian bundle. Reuse the existing ZIP writer/verifier and pinned asset inventory; do not introduce a generic archive library. Preserve every prior report/package/archive, choose a fresh local package output directory, and never overwrite the user's everyday installation. Preview and Apply remain separate features and explicit actions.

## Acceptance evidence

- Host final Verify312 tests/typecheck/build passed (`.thread-local/continuous-35-plus/evidence/47-final-verify-r2.log`). Four package-contract and six real-filesystem/CLI tests cover reproducibility, exact inventory/hash/ZIP records, metadata/version/host compatibility, byte budgets, missing/extra/corrupt paths, symlinks/hardlinks/special files, unknown data, downgrades, target changes and revalidation immediately before preview publication. One typecheck repair annotated a general numeric metadata limit and a known test-buffer byte; no contract weakened.
- Two separately staged private0.4.0 packages are byte-identical. Verified192 runtime files against the current production build, including fixed PDF inventory and compatibility metadata. ZIP4224595 bytes, SHA-25679d13147cedb6676d4a1e5e0405d01da609dfbaf9e111ac8127d80f5b62d0f7d. Artifacts retained under package47-a and package47-b; detailed verifier output in `47-final-package-verified.json`.
- Actual helper CLI previewed an owned disposable copy of the synthetic installation: legacy0.3.0 to0.4.0,192 exact rows, legacy rollback explicitly incompatible. All197 runtime/data/unrelated/note files stayed unchanged. Unsupported host, corrupt ZIP, unknown settings schema and linked package were refused (`47-disposable-acceptance.json`, `47-final-preview.log`). Initial fixture lacked the PDF worker; the helper correctly refused it. Only that owned fixture was repaired using the exact matching worker hash from the retained verified0.3.0 artifact; original failure log preserved.
- Read-only actual Obsidian1.14.4 observations before/after the helper prove61 notes, six known plugin-data file/absence states, settings and active plugin unchanged, with no modals (`lab/evidence/47-native-before.json`, `47-native-after-r2.json`). No update/apply, migration, process control or personal-installation action occurred.

## Limitations

Linux Node helper only; exact supported inventory/versions/host range and known data schemas. Preview is read-only and Apply/recovery belongs to48. Checksums are not signatures. Legacy previous-code rollback is not declared safe. The helper neither inspects notes nor claims filesystem-wide atomicity or protection against uncooperative external writers. New private package remains local and unpublished; older artifacts are preserved.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9758,"specSha256":"99e68d93573ebed0360387d2a5f95b75f741e6d4ae914b9fbc3d4b0e608f790b","branch":"refs/heads/feature/validated-local-update-previews","head":"b2cab68c503516fb423cf919931cc1222b66bd31","baseRef":"refs/heads/main","baseCommit":"ed7c502f10e30847361efa5d61732515a6c706f4","sourceTree":"e2ec0500e934c5ead2c8eae73aeeda3066f0cca7","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** b2cab68c503516fb423cf919931cc1222b66bd31
**Base commit:** ed7c502f10e30847361efa5d61732515a6c706f4
**Base ref:** refs/heads/main
**Spec hash:** 99e68d93573ebed0360387d2a5f95b75f741e6d4ae914b9fbc3d4b0e608f790b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T20:53:51.530521+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T20:56:17.690530+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main b2cab68c503516fb423cf919931cc1222b66bd31`, exact spec SHA-256, and `git status --porcelain=v1`: passed checkpoint/freshness checks.
- `git diff ed7c502f10e30847361efa5d61732515a6c706f4 b2cab68c503516fb423cf919931cc1222b66bd31` and `git diff --check` for the same range: complete delta reviewed; whitespace check passed.
- `npm run verify` on the real host: passed typecheck, 312 tests, and production build; zero failed, skipped, canceled, or todo tests. Log: `.thread-local/continuous-35-plus/evidence/47-review-verify.log`.
- `node --experimental-strip-types scripts/verify-package.mjs .thread-local/continuous-35-plus/package47-a/thread-0.4.0.zip` on the real host: passed all 192 packaged files against the freshly built production files. Evidence: `.thread-local/continuous-35-plus/evidence/47-review-package-verified.json`.
- `sha256sum` on retained package47-a/package47-b ZIPs: passed identical bytes/hash, `79d13147cedb6676d4a1e5e0405d01da609dfbaf9e111ac8127d80f5b62d0f7d`.
- Read-only real-host Node replay using `previewUpdate` and before/after SHA-256 snapshots of the owned disposable vault: passed; exact retained preview matched and all 197 files remained unchanged. Evidence: `.thread-local/continuous-35-plus/evidence/47-review-disposable.json`.
- Targeted desktop test search: no focused, skipped, todo, or placeholder tests found.

## Evidence

- Reviewed the complete 16-file target delta: `AGENTS.md`, `README.md`, active verified spec, `docs/local-updates.md`, manifest/package/lock versions, three packaging/updater scripts, fixed release inventory, package/preview modules, fixture, and both adjacent test files. Followed the existing PDF inventory helper, test runner, compiler settings, applicable settings schemas, project overview, build plan, coding standards, and AI interaction rules.
- Quality: checked scope, reuse of the existing reproducible ZIP format, fixed inventory agreement, version/documentation consistency, and absence of bundled updater behavior. Security: traced ZIP bounds/records/CRC/hash/identity declarations, static path authority, ordinary-file/link/ancestor checks, bounded known-data reads, safe JSON errors, exclusive artifact creation, and repeated pre-publication validation. Performance: checked finite entry counts and archive/file/runtime/data/metadata budgets for the explicit one-shot helper. Tests: reviewed the four package-contract and six real-filesystem/CLI tests and the passing complete host suite.
- Inspected `.thread-local/continuous-35-plus/evidence/47-disposable-acceptance.json`, `47-final-preview.log`, `47-final-package-verified.json`, and `47-final-verify-r2.log`; independently rechecked candidate hashes, production-byte agreement, retained preview consistency, and disposable-file preservation.
- Inspected retained actual Obsidian observations `.thread-local/continuous-35-plus/lab/evidence/47-native-before.json` and `47-native-after-r2.json`: reports record the active legacy plugin, 61 preserved notes, six preserved known-data file/absence states, settings preservation, and zero modals. No native/profile writes were performed by this review.
- Excluded dependency implementation, generated bundles/PDF assets, ignored lab/profile contents, historical unrelated work, and build outputs from source review; retained package and acceptance outputs were inspected as evidence. No product repair, commit, install, network access, Apply, rollback, or recovery action was performed.

## Findings

- None. No confirmed quality, security, performance, or tests findings in the complete target delta. Findings ledger unchanged; no IDs added, updated, or closed. No repair order required.

## Remaining risk

- Native preservation was assessed from retained before/after summary reports; no fresh native Check was run. Check is not required by this request.
- Runtime assurance remains limited to the specified Linux helper and supported inventory/version/data contracts. Checksums do not authenticate a publisher, and snapshot validation does not claim filesystem-wide atomicity against uncooperative external writers.
- No configured lint, security scanner, or performance benchmark exists; the declared Verify command and targeted code review completed successfully. Apply/recovery belongs to feature 48 and was outside this review.

## Try it now

1. Use a disposable complete Thread installation and an unchanged locally verified0.4.x package. Copy the actual Obsidian version from About; this helper supports1.14.4 through1.14.x.
2. Run `npm run updater -- preview <absolute-package.zip> <absolute-vault/.obsidian/plugins/thread> 1.14.4 <new-preview.json>` with the output outside the installation.
3. Inspect every add/replace/unchanged code path, before/after hash, installation/version and compatibility summary. Notes, settings, journals and unrelated files remain unchanged. Retain the approval SHA-256 with the exact artifact.
4. A corrupt ZIP, symlink, missing runtime file, unknown data schema or unsupported host must refuse the preview. Preserve originals and prepare a fresh verified package/preview; never remove journals to bypass a check.

Applying updates and recovery are not available in this preview-only feature. See docs/local-updates.md. Package hashes detect changes, not publisher authenticity.
