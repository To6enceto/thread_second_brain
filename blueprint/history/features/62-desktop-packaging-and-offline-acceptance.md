# Feature: Desktop packaging and offline acceptance

**From build-plan:** feature 62
**Build attempt:** 1
**Branch:** feature/desktop-packaging-and-offline-acceptance
**Status:** verified

## Goal

Produce a separately versioned, reproducible local Fedora desktop artifact for Thread Desktop with bundled runtime, assets and license notices, a launcher and plain instructions, and prove the complete desktop workflow from that artifact offline with real local inference, while preserving plugin behavior and existing data.

## In scope

- An explicit `npm run desktop:package` command that runs Verify, then builds `dist/thread-desktop-<version>-linux-x64.tar.gz` from the pinned project-local Electron runtime and the desktop build placed in `resources/app` (default app removed), plus a `thread-desktop` launcher script, an example `.desktop` entry that is not installed, a README with launch/update/limits text, and a hash inventory of every file.
- License notices: Electron and Chromium notices, PDF.js and its CMap/font licenses, and the license of every third-party package bundled into the desktop code (derived from the esbuild metafile).
- Separate desktop versioning (`thread-desktop` version independent of the plugin's) and clear update compatibility: manual replacement of the extracted folder, unchanged desktop profile formats, the profile location outside vaults and the repository, and the plugin updater refusing desktop archives.
- Reproducibility: two package runs from the same tree produce byte-identical archives (fixed file order, timestamps, ownership and compression metadata).
- Offline acceptance from a fresh extraction of the artifact: an isolated profile and synthetic vault inside a network namespace with loopback only, running the project-owned Ollama there for real inference; the full desktop workflow (grant/index/search, Resume and Ask with real inference, reviewed save and Undo, decisions or actions, capture/collection, PDF extraction with packaged assets, export/compare/import) with byte preservation; reuse of an existing desktop profile from earlier features.
- Plugin regression: the plugin package still verifies, and the packaged plugin ZIP loads and runs a core workflow in actual Obsidian with a synthetic vault.

## Out of scope

Installing into the user's account or system, desktop entries in `~/.local`, publishing, signing, auto-update, AppImage/Flatpak/RPM formats, other platforms, a public distribution license, bundling Ollama or model weights, changes to product behavior other than fixes found by acceptance.

## Build loop

Continuous Mode builds these steps serially with self-review and Verify after each. Step checkpoint commits are disabled. Actual packaged-app acceptance offline with real local inference, actual Obsidian plugin regression and a fresh passing independent review are required before archive and local merge. At most two repairs per failing check/finding; never weaken gates. Preserve all previous evidence and archives. Nothing is installed or published.

## Build steps

- [x] 1. Add the desktop packaging script and command: staged runtime plus `resources/app`, launcher, example desktop entry, README, license collection from the metafile and Electron, a full SHA-256 inventory, deterministic tar/gzip output and inventory validation. Done when tests prove inventory/license/version validation and refusal of missing or unexpected files, two package runs produce identical archive hashes, the plugin updater refuses the desktop archive, and Verify passes.
- [x] 2. Prove the packaged app offline: extract the artifact fresh, launch it in a loopback-only network namespace with the project-owned Ollama, and complete the full desktop workflow with real inference, packaged PDF assets, reviewed writes, portability and byte preservation; reuse an existing desktop profile without loss. Done when native artifacts and Verify pass.
- [x] 3. Run the plugin regression: verify the plugin package and run a core workflow with the packaged plugin ZIP in actual Obsidian on a synthetic vault. Done when native artifacts and Verify pass.
- [x] 4. Update desktop docs, README and AGENTS.md commands with launch, update, compatibility and limits text; self-review the full delta and prepare a verified immutable checkpoint. Done when final Verify passes and previous archive bytes remain intact. Completion additionally requires a fresh passing independent review with resolved findings.

## Files / areas

New scripts/desktop-package.mjs with a small testable inventory/license module (for example scripts or src/standalone package helpers with adjacent tests), package.json script, the launcher and desktop-entry templates, docs/desktop.md, README.md and the AGENTS.md Commands list. Reuse scripts/desktop-build.mjs, pdf-assets helpers and the plugin updater validation for the refusal test. No product source changes expected unless acceptance finds defects.

## Data / contracts

Desktop version comes from one place and appears in the archive name, inventory and README. The archive contains a single top-level `thread-desktop-<version>/` folder; the launcher runs the bundled runtime with the packaged app and never disables the Chromium sandbox. The desktop profile stays in the Electron user-data folder for "Thread Desktop" unless `--user-data-dir` is passed; its formats (desktop preferences, change, save and import journals) are unchanged. The plugin updater accepts only plugin ZIPs with its own metadata and must refuse the desktop archive. The project remains UNLICENSED: the artifact is for local use and states that no public distribution license is asserted. Ollama and models are not bundled.

## Testing

Baseline is local main 757dfc5be84266a8ccb88f1cface4969252a6794, whose tree passed 61-completion-verify.log (516 tests, typecheck, both builds). Unit-test inventory and license validation with temporary folders. Package twice and compare hashes. Use a new ignored vault-62/profile-62 and a copy of an earlier desktop profile for preservation; run offline in a loopback-only network namespace with the project-owned Ollama; drive the packaged window over loopback CDP from inside that namespace. Use actual Obsidian with an isolated profile and synthetic vault for the plugin regression.

## Notes for the AI

Keep packaging proportional: system tar/gzip on Fedora are acceptable; do not add packaging dependencies. Never install the artifact or create user desktop entries. If the loopback-only namespace cannot host the sandboxed Electron window, record the obstacle and use the strongest available offline proof instead of weakening the sandbox. The open F-08 [P3] ledger entry from feature 61 remains carried; new findings continue its ID sequence.

## Step evidence

- Step 1: npm run desktop:package runs Verify, then stages thread-desktop-0.1.0/ with the pinned Electron 45.0.0 runtime (default_app.asar removed), the desktop build in runtime/resources/app, a sandbox-preserving thread-desktop launcher that refuses root, an example desktop entry that is never installed, README.txt (run, profile, manual update, requirements, UNLICENSED local use), licenses for Electron/Chromium and every bundled package recorded from the esbuild metafiles (pdfjs-dist, yaml), and a SHA-256 inventory validated before archiving; the desktop version comes only from src/standalone/desktop-release.json. Deterministic tar (sorted, mtime 0, owner 0) and gzip -n produce dist/thread-desktop-0.1.0-linux-x64.tar.gz (126337950 bytes, 274 files); three runs including a fresh build give SHA-256 6925ea4782a5086858f03ccce1f3c3cb325e453216419ff9113ddd09d4eebb15 (62-package-run2.log, 62-step1-package-verify.log, 62-artifact.sha256). 62-step1-focused-r1.log passed 3 tests (inventory/license/version/executable/link refusal and plugin updater refusal of a desktop tar.gz) after one await placement fix; 62-step1-package-verify.log passed 519 tests and both builds.
- Step 2: the artifact was extracted fresh (62-extracted-inventory.json: 273 inventoried files, no hash/mode mismatch, nothing extra) and its own launcher ran inside a loopback-only namespace (unshare user+net+mount+pid, loopback up, then every capability dropped so Chromium's and GTK's nested sandboxes work; 62-offline-netns.txt shows only lo and an unreachable internet) together with the project-owned cloud-disabled Ollama. A first attempt without mount/pid namespaces crashed the GTK file dialog because its image loader sandbox could not start; that was a harness limitation and the hardened namespace fixed it without weakening any sandbox. Evidence 62-offline-workflow/compare/import JSON proves vault selection via the native dialog, grants, writer setup, keyword search, real qwen3:4b-instruct Resume and Ask, a reviewed capture applied and undone, a decision record, PDF extraction with the packaged worker/assets and a reviewed source, export, comparison and byte-exact import; the renderer has no Node globals and runs with seccomp-bpf and NoNewPrivs (62-offline-renderer-sandbox.txt). 62-offline-preservation.json verifies all bytes and files. A copy of the feature-61 desktop profile was reused offline: its saved Projects role and 3 completed import receipts were read and its journal files stayed byte-identical across two sessions (62-offline-profile-reuse.json, 62-reuse-profile-before/after.txt). 62-step2-verify.log records Verify.
- Step 3: scripts/package.mjs rebuilt dist/thread-0.4.2.zip byte-identically to the feature-60 check (SHA-256 c9d2f283ca092dbb6b9febb60285e67ebab7521a45ec9c15348324027784846e, 62-plugin-package.log), so desktop work left the plugin artifact unchanged. That exact ZIP was extracted into a fresh synthetic vault-62-plugin and loaded in actual isolated Obsidian 1.14.4 (first-open trust prompt accepted for this synthetic vault); Thread 0.4.2 rebuilt its index and Find evidence returned the expected passage (62-obsidian-regression.json). No source changed since 62-step2-verify.log (519 tests, both builds).
- Step 4: docs/desktop.md gains Packaged desktop build (command, reproducibility, contents, launch without installing, example desktop entry, profile location, manual updates and plugin-updater refusal, offline and Ollama/model notes, sandbox requirement, UNLICENSED local use, Linux x64 only); README.md and the AGENTS.md Commands list name npm run desktop:package. The default profile folder name was confirmed as Thread Desktop under a lab XDG_CONFIG_HOME (62-default-profile.json). Self-review found only the packaging script's intended summary output, no untyped escapes, network calls or Unicode punctuation. 62-step4-verify.log passed 519 tests, zero failures/skips, typecheck and both builds; blueprint/history is unchanged against main.
- Review repair: the first receipt (target 7c9ff93) passed with P3 F-09 (archive modes followed the packager's umask) and F-10 (refusal test did not assert tar success). One repair normalizes tar modes and tightens the test; archives under umask 0022, 0002 and 0077 are byte-identical to the recorded hash (62-package-umask*.log), 62-findings-repair-focused.log passed 3 tests and 62-findings-repair-verify.log records Verify. F-08 [P3] from feature 61 stays carried, outside this scope. Reviewer text is preserved in 62-independent-review-r1-output.md.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11311,"specSha256":"258f4dbf17abd90cf9af009f007509538b26eccaaf64678a26526d492a2452ff","branch":"refs/heads/feature/desktop-packaging-and-offline-acceptance","head":"3e2f7867969504706d7b1a631e7c3f84627e7866","baseRef":"refs/heads/main","baseCommit":"757dfc5be84266a8ccb88f1cface4969252a6794","sourceTree":"e7cabe1e476da36ca32ffe49a51cb7534a4a5205","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 62/F-08 [P3] open - A late save or import reply clears a newer preview, leaving its action button enabled but inert

**File:** src/standalone/portability-view.ts:72
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The 62/F-05 repair removed the `if (!current()) return;` guard from the save and import handlers so that `completed()` can report a finished write after the panel was reset. The handlers now run `this.exportPreview = null` (line 72) and `this.importPreview = null` (line 95) unconditionally after `completed()`. When the request is stale, those fields may already hold a newer preview built after the reset. Scenario: the user saves a large checkpoint. The 2.5-second monitor lists the new file and emits `invalidated` before the `writeExport` reply. `portabilityView.invalidate()` empties the panel and releases busy, which re-enables Refresh. The user refreshes, chooses files and clicks **Preview checkpoint**. That run finishes with `exportPreview = P2` and enables **Save previewed checkpoint**. The old save reply then arrives: `completed()` shows the old confirmation and `this.exportPreview = null` discards P2. `run()`'s `finally` skips `setBusy` because the request is stale, so the Save button stays enabled. Clicking it hits `if (!preview) return;` and silently does nothing, with no message, until the user previews again. The window is the create, fsync and readback time, which is short, so this is unlikely but reachable. The import handler has the same pattern, reachable only when Cancel lands after the importer's final check. No data is written, lost or overwritten; main still holds the newer preview.
**Suggested fix:** Clear only the preview that this request saved or imported, for example `if (this.exportPreview === preview) this.exportPreview = null;` (and the same for `importPreview`), or move the reset into the `current()` branch of `completed()`. Optionally extend the existing "survives a refresh that lands first" view test to build a second preview before the late reply resolves and assert that Save still works. Nothing would be lost.
**Resolution:**

### 62/F-09 [P3] closed - Desktop archive bytes depend on the packager's umask, so "byte-identical" holds only under one umask

**File:** scripts/desktop-package.mjs:59
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The tar call fixes order, mtime and ownership but not file modes. The staged `README.txt`, `thread-desktop.desktop.example`, `inventory.json` and every directory created by `mkdirSync` take their modes from the process umask, and tar records those modes. Reproduced: packaging the unchanged target under umask 0022 gives SHA-256 6925ea4782a5086858f03ccce1f3c3cb325e453216419ff9113ddd09d4eebb15 (126337950 bytes), and under umask 0002 (common for interactive Fedora user-private-group shells) it gives abe6dda7ee701dd7f067e681266e8b87f773149968737505798f48ff50634845 (126339996 bytes), with entries such as `drwxrwxr-x thread-desktop-0.1.0/` and `-rw-rw-r-- README.txt`. A user who runs `npm run desktop:package` from a terminal with a different umask gets a different archive from the recorded one, contradicting docs/desktop.md:636-637 ("packaging the same checkout again gives a byte-identical file"). The spec's listed determinism controls (order, timestamps, ownership, compression metadata) are met; this is a gap in the documented guarantee, not a data or security risk, since extraction by a normal user applies its own umask.
**Suggested fix:** Normalize modes in the archive, for example add `--mode=u+rwX,go+rX,go-w` to the GNU tar arguments (or `chmodSync` the written files to 0o644 and the directories to 0o755 before archiving). Optionally qualify the docs sentence. Nothing would be lost.
**Resolution:** The tar call now normalizes modes with --mode=u+rwX,go+rX,go-w, so files and directories are recorded as 0644/0755 (executables 0755) regardless of umask. Packaging under umask 0022, 0002 and 0077 produced the identical SHA-256 6925ea4782a5086858f03ccce1f3c3cb325e453216419ff9113ddd09d4eebb15 (62-package-umask0022/0002/0077.log), matching the documented reproducibility. Closed 2026-10-27 by /audit independent (target 3e2f786): the reviewer re-packaged the target under umask 0002, 0077 and 0022 and got the same 126337950-byte archive with SHA-256 6925ea4782a5086858f03ccce1f3c3cb325e453216419ff9113ddd09d4eebb15 each time, equal to 62-artifact.sha256. The listing shows only 0755 directories, 0644 files and 0755 executables (7, matching the inventory's executable flags because `X` follows existing execute bits), all 0/0, with no setuid bits. The repair introduced no new defect.

### 62/F-10 [P3] closed - The plugin-updater refusal test can pass without building a desktop archive

**File:** src/standalone/desktop-package.test.ts:40
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The test spawns `tar` but never asserts `tar.status === 0`. It only asserts the gzip status. If `tar` is missing or fails, `tar.stdout` is empty or null, gzip compresses empty stdin into a valid 20-byte stream, `decodeRelease` rejects it on the minimum-size check (src/desktop/update-package.ts:71), and `assert.throws` passes. The test then reports that the updater refuses a desktop tar.gz without having built one. In the current Fedora environment tar exists, so the real behavior is proven today. The assertion is vacuous only when the tool fails.
**Suggested fix:** Add `assert.equal(tar.status, 0)` and optionally assert that the gzip output is larger than a trivial size before calling `decodeRelease`. Nothing would be lost.
**Resolution:** The updater-refusal test now asserts tar succeeded and that a non-trivial archive was produced before calling decodeRelease (62-findings-repair-focused.log, 3 tests). Closed 2026-10-27 by /audit independent (target 3e2f786): src/standalone/desktop-package.test.ts:41 now asserts `tar.status === 0`, `gzip.status === 0` and an output larger than 200 bytes before `decodeRelease`, so a failed or missing tar can no longer pass vacuously. The test passed in the reviewer's `npm run verify` (519 tests, 0 failures, 0 skipped). The repair introduced no new defect.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 3e2f7867969504706d7b1a631e7c3f84627e7866
**Base commit:** 757dfc5be84266a8ccb88f1cface4969252a6794
**Base ref:** main
**Spec hash:** 258f4dbf17abd90cf9af009f007509538b26eccaaf64678a26526d492a2452ff
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T14:08:39Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T14:12:29Z
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

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only blueprint/context/review.md differs)
- `npm run verify`: pass (519 tests, 0 failures, 0 skipped; typecheck, plugin and desktop builds)
- `node --experimental-strip-types scripts/desktop-package.mjs` under umask 0002, 0077 and 0022: pass (identical 126337950-byte archive, SHA-256 6925ea4782a5086858f03ccce1f3c3cb325e453216419ff9113ddd09d4eebb15 each run)
- `tar -tvzf dist/thread-desktop-0.1.0-linux-x64.tar.gz`: pass (9 dirs 0755, 267 files 0644, 7 executables 0755, all 0/0, no setuid, no default_app.asar)

## Evidence

- Full delta 757dfc5..3e2f786 reviewed: scripts/desktop-package.mjs, scripts/desktop-build.mjs, src/standalone/desktop-package.ts and its test, src/standalone/desktop-release.json, package.json, docs/desktop.md, README.md, AGENTS.md and the spec. Callers and contracts checked: scripts/pdf-assets.mjs, src/standalone/main.ts (setName "Thread Desktop", enableSandbox) and scripts/desktop-start.mjs.
- The packaged archive is byte-identical to 62-artifact.sha256, so the offline acceptance artifact equals the current target's output.
- Ignored evidence in .thread-local/desktop-50-62/evidence/ was inspected and is consistent with the code. 62-offline-netns.txt shows loopback only with the internet unreachable. 62-extracted-inventory.json has 273 files with no mismatches. 62-offline-renderer-sandbox.txt shows Seccomp 2 and NoNewPrivs 1. 62-offline-workflow.json shows search, Resume and Ask with qwen3:4b-instruct, capture, undo, decision, PDF and export. 62-offline-preservation.json shows originals unchanged, byte-exact import and no unexpected files. 62-obsidian-regression.json shows plugin 0.4.2 on Obsidian 1.14.4 with hits.
- Security: the launcher refuses root, unsets ELECTRON_RUN_AS_NODE and never disables the sandbox. Bundled package names are validated before any license path is built. The staged-file walk refuses links and special files. The inventory refuses unexpected paths, extra app files, `..` and the default app.

## Findings

- F-09 [P3] closed: archive modes no longer depend on umask (verified under 0002/0077/0022)
- F-10 [P3] closed: the updater-refusal test asserts tar success and a non-trivial archive
- F-08 [P3] open: carried from feature 61 (src/standalone/portability-view.ts:72), outside this delta, unchanged
- No new findings

## Remaining risk

- Native offline packaged-app acceptance and the Obsidian plugin regression were not re-executed by the reviewer; their evidence logs were inspected against the code and the matching artifact hash only.
- License collection in scripts/desktop-build.mjs records only the outermost node_modules package of each input path, so a future nested bundled dependency would be missed. Today only pdfjs-dist and yaml are bundled, so this is a latent gap, not a current defect.
- Reproducibility was proven on this machine's GNU tar and gzip versions; other tar or gzip versions may produce different bytes.
- AGENTS.md:339-341 still names dist/thread-0.4.1.zip and "All192" while the plugin is 0.4.2. This text predates the delta and is outside this review's findings.
- The reviewer could not write dashboard activity state (blueprint/.state/run.json) because subagent file writes are blocked.
- Check was not required and was not run.
