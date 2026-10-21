# Feature: Recoverable local updates

**From build-plan:** feature 48
**Build attempt:** 1
**Branch:** `feature/recoverable-local-updates`
**Status:** verified
**Archive:** `blueprint/history/features/48-recoverable-local-updates.md`

## Goal

Apply an explicitly approved local package while preserving notes and plugin
data, recover interrupted code replacements, and offer compatible code rollback.

## In scope

- Linux Node helper with explicit paths, exact preview SHA approval and a closed
  Obsidian acknowledgement plus current-user process checks. Never stop apps.
- Durable immutable intent, retained previous code, staged candidate, conservative
  recovery and process-safe serialization. All code writes are explicit.
- Fresh rollback preview only for declared compatible previous code; no migration,
  data restoration, ordinary downgrade bypass or implied note undo.
- Disposable interruption/refusal tests, final actual offline Obsidian workflow
  with real local inference, reproducible verified private 0.4.1 package.

## Out of scope

Automatic updates, downloads, signatures/public release, everyday installation,
desktop shortcut installation, user process termination, data migrations, global
filesystem transactions and protection against uncooperative external writers.

## Build loop

Continuous Mode; feature review cadence, no step checkpoint commits. Run Verify
after each step. Fresh independent review follows final acceptance. Preserve
features 1-47, their archive bytes and prior evidence; normal main pushes remain
separately authorized.

## Build steps

- [x] **Step 1: Exact application and interruption recovery.** Add bounded
  immutable schema-1 intent and package/previous-code staging in an exclusively
  created external directory; fsync before writes. Require approved preview and
  unchanged code, data and directories. Linux flock serializes helpers, while a
  persistent pending pointer blocks a different operation. Recovery accepts only
  exact before/after bytes, preserves unknown files and finishes idempotently.
  Done when focused real-filesystem tests prove interruption, conflicts, data
  preservation, altered intent/staging, links and concurrent-helper refusal, and
  Verify passes.
- [x] **Step 2: Reviewed rollback and reachable CLI.** Extend the helper with
  apply, recover and rollback-preview commands; require approval digests and
  closed-host acknowledgement for mutation. Rollback snapshots current data,
  requires completed matching current code and compatible prior metadata, and
  uses the same guarded engine. Document retained artifacts, partial-write
  guidance, system flock requirement and limits. Done when actual CLI tests prove
  refusal and round trips, legacy rollback refusal, later-data preservation and
  Verify passes.
- [x] **Step 3: Native acceptance and final package.** Build 0.4.1 twice and
  strictly verify exact 192-file bytes. Update an owned stopped isolated actual
  Obsidian installation, demonstrate interrupted recovery and compatible code
  rollback on disposable installations, restart the owned native app and exercise
  Resume/Ask with local inference plus offline PDF handling. Preserve notes and
  durable journals before host restart; retain all acceptance evidence.
  Done when final Verify, native workflow and preservation evidence pass.
  Independent review remains the subsequent completion gate.

- [x] **Step 4: Repair F-01 atomic coordinator publication.** Publish pending,
  completion and intent records only after their temporary bytes are synced.
  Preserve partial temporary files and refuse foreign final records. Done when
  actual child-process SIGKILL tests at creation/publication recover without
  manual metadata edits, Verify passes and disposable native-package replay passes.

- [x] **Step 5: Repair F-02 initial lock interruption.** A newly created empty
  flock coordinator is valid immediately; compatible prior marker bytes remain
  untouched and nonempty foreign content refuses. Done when actual SIGKILL/retry,
  concurrent first-use and foreign/legacy lock preservation tests pass with
  Verify and disposable-installation replay.

## Files / areas

`src/desktop/update-apply.ts`, adjacent focused tests, `update-preview.ts`,
`scripts/update-thread.mjs`, `docs/local-updates.md`, README/AGENTS run guidance,
package/manifest versions, current spec and ignored run evidence.

## Data / contracts

- Existing fixed runtime inventory, 40 MiB archive/32 MiB payload/12 MiB file
  limits, 0.4.x packages, Obsidian >=1.14.4 <1.15.0 and thread-0.4-v1 remain.
- Explicit preview JSON stays bounded to 256 KiB. Rollback wraps a preview with
  the completed intent path and SHA; regular previews still refuse downgrades.
- New external state directory is exclusive, ordinary and outside the install;
  immutable schema-1 intent binds the approved preview, original/next digests,
  directory identities and retained artifacts. Recovery requires its SHA.
  Preparation failure before intent makes no code changes; preserve artifacts
  and use a new directory. Unknown/inconsistent state is a refusal.
- Stage previous fixed runtime files separately from data, retaining legacy code
  even when rollback is incompatible. Candidate package and previous code are
  revalidated before recovery. No settings/note/journal values enter intent.
- A reserved installation lock file uses Linux flock without deletion. A pending
  pointer identifies the exact state directory and intent digest. Ordinary files
  use same-directory temporary writes, fsync and individual atomic rename.
  Unexpected files/partial temporary files are retained, never blindly removed.
- Revalidate current before/after bytes, known data hashes and nested directory
  identities before replacement. A pending operation requires explicit recovery.
  Completed recovery repeats safely; later changes require investigation rather
  than overwriting. Rollback requires a new preview of current compatible data.
- No new dependencies. Existing Linux util-linux `flock` is required for writes;
  missing process inspection or flock fails closed with guidance.

## Testing

Node real-filesystem and CLI tests with authored packages and injected interruption
boundaries; no package code executed in logic tests. Verify at every build step.
Actual isolated Obsidian/Ollama and synthetic vault only, including packaged PDF
assets, original note/data hashes, real inference and repeatable package hashes.
Fresh reviewer must inspect recovery, rollback, locking and preserved-data claims.

## Notes for the AI

No raw private data in logs, no runtime auto-download, no weakened permission,
freshness, write-preview, cancellation or recovery contracts. Approval covers
routine implementation details, commits, local merges and verified main pushes.

## Acceptance evidence

- Final `npm run verify`: typecheck, 327 tests and production build passed
  (`.thread-local/continuous-35-plus/evidence/48-lock-repair-verify.log`).
- Real filesystem tests cover interrupted writes/staging/completion, current
  data/code conflicts, altered artifacts, links, directory identities, Linux
  flock contention, incompatible rollback, later-data preservation and CLI gates.
- Actual CLI inside the owned namespace: legacy0.3.0 to0.4.0, process SIGKILL
  after manifest replacement, mixed-version observation, changed-file refusal,
  explicit and repeat recovery, compatible0.4.1 to0.4.0 rollback and return to0.4.1.
  All74 non-runtime files stayed byte-identical before host restart. See
  `48-interruption-acceptance.json`, `48-round-trip.json`, `48-preserved-before.json`.
- Running actual Obsidian rejects apply before state creation. Native1.14.4 loads
  Thread0.4.1, all61 prior notes and settings, and all9 prior change-history entries.
  Real qwen3:4b-instruct Resume/Ask pass in a loopback-only namespace. No paid or
  external request; generated interpretations still need human judgment.
- Packaged PDF worker extracts authored selectable text offline after explicit
  consent; exact new-source save and PDF page1 citation pass. One new authored
  source note (62 total) and two authored PDF fixtures retained; original notes,
  PDF bytes and original settings preserved. Evidence in
  `lab/evidence/48-native-inference.json`, `48-native-pdf-r2.json`,
  `48-native-final.json`, `48-final-home.png`.
- Two private192-file ZIPs match: 4224595 bytes, SHA-256
  `e9e9a3c27b475f241ec4b78b5b9ad996ea52dca2677b8e42ba0b5adb22af12ba`.
  Strict current-build verifier passed; artifacts `package48-a` and `package48-b`.
- Test fixture corrections retained: nested CMaps directory path corrected once;
  hidden PDF excerpt assertion uses textContent once. The old isolated installation
  lacked its worker; restored that owned fixture from the retained verified legacy
  package before baseline update. No product check was weakened.

- Independent review1 found F-01: partially written final coordinator marker
  blocked recovery. Repaired with atomic publication; nine real-process SIGKILL
  creation/publication boundaries and foreign-marker preservation now pass.
  Actual native-installation pending/completion interruption replay recovered
  without metadata edits, preserving all270 existing files, then native restart
  retained original61 notes, settings and9 change-history entries. See
  `evidence/48-repair-native-installation.json` and
  `lab/evidence/48-native-repaired-restart.json`. Package bytes are unchanged and
  strictly reverified. Fresh whole-delta independent review is required.

- Independent review2 closed F-01 and found F-02: an interrupted initial lock
  could block fresh retries. The lock is now valid empty on creation, preserving
  compatible old bytes and refusing foreign content. Real SIGKILL/retry and
  simultaneous first-use regressions pass. Actual verified-package CLI replay
  updates0.4.0 to0.4.1 after lock-creation SIGKILL, preserving all5 authored data/note
  files (`evidence/48-lock-native-acceptance.json`). Verify327 tests passes;
  fresh whole-delta review remains required.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10090,"specSha256":"96bcb5cc77e3717982a9f05d067f52e9df1578fc876c9f15fc0fc6f7a17a3376","branch":"refs/heads/feature/recoverable-local-updates","head":"168631043048f95c059ca0bfc6922e1520c00c16","baseRef":"refs/heads/main","baseCommit":"be36e19646f197145c8275226e3232754b337f75","sourceTree":"44ac6cad0d2cd23e26a312905d1d6c671c896f8c","landing":"local-merge","absentOptional":[]} -->

## Findings

### 48/F-01 [P1] closed - Interrupted completion marker permanently blocks recovery

**File:** src/desktop/update-apply.ts:200
**Found:** 2026-10-20 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `writeExclusive(completedPath, completion)` creates the final
`completed.json` name before writing its bytes. A process interruption after
`openSync(... O_CREAT | O_EXCL ...)` but before the write leaves an empty marker
after all runtime replacements have completed. Subsequent recovery reaches lines
174-175 and always refuses with `Completion record is ambiguous`; the pending
pointer remains, so neither another apply nor a rollback preview can proceed.
This is updater-created interruption state, with unchanged intent, retained code,
directories and plugin data, rather than an unknown external edit. The same direct
publication pattern is used for the pending pointer before replacement begins.
**Suggested fix:** Publish coordinator markers from a fully written and fsynced
same-directory temporary file through an atomic rename, preserving the existing
refusal for a foreign or inconsistent final marker. An interruption before
publication should leave the final marker absent and retain any partial temporary
file. Add a real-process interruption test at marker creation/publication, including
completion after all code writes, and require explicit recovery to finish and
clear the pending pointer without editing or deleting metadata manually.
**Resolution:** Confirmed against target
`001d22a4a1e29cc92be7a7fafc26a94444cac188` using only an owned authored installation.
`/tmp/thread-feature48-review-crash.mjs` instruments the child process's builtin
`openSync` to send SIGKILL immediately after creating `completed.json`, before its
write. The child exited with SIGKILL, the marker was zero bytes, installed code
was the exact 0.4.1 candidate, plugin data was unchanged, and recovery with the
exact retained intent SHA refused while leaving the pending pointer in place.
Result: `/tmp/thread-feature48-review-crash.log`. No native vault or prior
acceptance artifact was changed.

Repair attempt1: coordinator records now publish from synced same-directory
owned temporary files via rename; foreign final records still refuse. Nine real
SIGKILL creation/before-publication/after-publication regression cases cover
intent, pending and completion, plus foreign-marker refusal. Verify324 tests
passed. Actual owned-installation SIGKILL at pending/completion temporary creation
recovered without manual metadata edits and preserved all270 existing files;
native restart retains61 prior notes, original settings and9 history records.
Evidence: `.thread-local/continuous-35-plus/evidence/48-repair-verify.log`,
`48-repair-native-installation.json`, and
`lab/evidence/48-native-repaired-restart.json`. Awaiting fresh independent review.

Fresh independent review2 against `beb80d6fe19f4960babaf37855be90f73678bc04`
closed F-01. Inspected `publishRecord` and all three call sites: intent, pending
and completion use fully written/fsynced same-directory temporary files, validate
bytes/parents and final absence before rename, and retain interrupted temporaries.
Real host `npm run verify` passed all324 tests, including nine actual SIGKILL
creation/before-publication/after-publication cases and foreign completion refusal.
Inspected `48-repair-native-installation.json`: actual pending/completion SIGKILL
recovery preserved270 existing files. The new lock-initialization defect below
has a separate code path and finding ID.

### 48/F-02 [P1] closed - Interrupted initial lock creation permanently blocks updates

**File:** src/desktop/update-apply.ts:60
**Found:** 2026-10-20 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The first `withUpdateLock` call writes the final persistent
`.thread-update-lock` directly through `writeExclusive`. SIGKILL after its
exclusive open but before its write leaves a zero-byte final lock. Every later
apply catches EEXIST and then refuses the bytes as unrelated data at line61.
No state directory or intent exists yet, so `recover` cannot help; the documented
fresh-preview/fresh-state retry also fails. This is a reachable updater-created
interruption state, with unchanged package, code, directories and plugin data,
that requires manually deleting or editing a reserved coordinator file to escape.
**Suggested fix:** Publish the initialized lock bytes atomically without replacing
an existing lock inode, preserving exclusion between concurrent initializers and
retaining refusal for foreign contents. A fully written/fsynced same-directory
temporary file plus an exclusive atomic link/publication, followed by cleanup of
only the known completed temporary name, is one option; do not use an overwriting
rename that could split competing helpers onto different lock inodes. Add real
SIGKILL coverage before/during initial lock publication and concurrent first-use
coverage. Retry after interrupted preparation must work without metadata edits.
**Resolution:** Independently confirmed on a fresh authored disposable0.4.0
installation and0.4.1 package by `/tmp/thread-feature48-r2-lock-probe.mjs`.
The child died with SIGKILL immediately after opening the final lock; its size
was0, two subsequent applies with distinct fresh state paths both refused
`Reserved updater lock already contains unrelated data`, all code and data bytes
were unchanged, and no recovery intent existed. Full output:
`/tmp/thread-feature48-r2-lock-probe.log`; retained fixture:
`/tmp/thread-feature48-r2-lock-aI0MJN`. No native vault or old evidence was edited.

F-02 repair attempt1: the flock coordinator is a valid empty inode immediately
on exclusive creation; existing compatible marker bytes stay unchanged and
foreign nonempty contents refuse. Real SIGKILL-before-initialization, simultaneous
first-use process contention, legacy/empty/foreign preservation regressions pass.
Verify327 tests passed (`evidence/48-lock-repair-verify.log`). Actual CLI on a
verified0.4.0 disposable installation survived the lock-creation SIGKILL and
fresh approved0.4.1 retry, preserving all5 authored data/note files; see
`evidence/48-lock-native-acceptance.json`. Native app relaunched unchanged.
Awaiting fresh independent review; F-01 remains closed from review2.

Fresh independent review3 against `168631043048f95c059ca0bfc6922e1520c00c16`
closed F-02. Re-reviewed the complete feature delta, including
`src/desktop/update-apply.ts:58-79` and all updater tests. Exclusive initial
creation now yields a complete empty flock inode without a later initialization
write; EEXIST opens that same inode, preserves empty/legacy marker bytes, rejects
foreign nonempty contents, checks inode identity and link count, and acquires
nonblocking flock before entering the operation. No inode replacement or split
lock path was introduced. Real host `npm run verify` passed327 tests with zero
skips/todos, including actual SIGKILL immediately after first lock creation,
unchanged code/data followed by a successful fresh approved retry, simultaneous
first-use exclusion, and legacy/foreign preservation. The nine coordinator
publication SIGKILL cases also passed, so F-01 remains closed. Inspected
`48-lock-native-acceptance.json`: actual verified-package CLI SIGKILL/retry
preserved all5 authored data/note files. New reviewer log:
`.thread-local/continuous-35-plus/evidence/48-review3-verify.log`.
No new findings were identified across quality, security, performance or tests.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 168631043048f95c059ca0bfc6922e1520c00c16
**Base commit:** be36e19646f197145c8275226e3232754b337f75
**Base ref:** refs/heads/main
**Spec hash:** 96bcb5cc77e3717982a9f05d067f52e9df1578fc876c9f15fc0fc6f7a17a3376
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T13:13:48.127682+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T13:17:59.400316+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, raw SHA-256,
  committed-spec byte comparison, `git diff --name-only HEAD` and
  `git ls-files --others --exclude-standard`: passed. Exact request bindings
  match; only findings/review differ from the target; no untracked files.
- `git diff be36e19646f197145c8275226e3232754b337f75 168631043048f95c059ca0bfc6922e1520c00c16`:
  reviewed the complete11-file feature delta and affected adjacent contracts.
- Real host `npm run verify`: passed typecheck,327 tests and production build;
  zero failures, cancellations, skips or todos. Node22.22.2/npm10.9.7.
  New log: `.thread-local/continuous-35-plus/evidence/48-review3-verify.log`.
- Real host `node --experimental-strip-types scripts/verify-package.mjs .thread-local/continuous-35-plus/package48-a/thread-0.4.1.zip`
  and the equivalent `package48-b` command: both passed against the fresh build.
  New results: `evidence/48-review3-package-a.json` and
  `evidence/48-review3-package-b.json` under the same run directory.
- Test-source search for focused/skipped/placeholder cases: none in updater tests.
  Raw comparison of both retained ZIPs: identical,192 files,4224595 bytes,
  SHA-256 `e9e9a3c27b475f241ec4b78b5b9ad996ea52dca2677b8e42ba0b5adb22af12ba`.

## Evidence

- Fresh isolated Codex reviewer received the project-local handoff without the
  builder transcript. Reviewed all lenses from the recorded main merge base;
  the existing ledger did not limit the review scope. The spec is tracked in the
  exact target and its raw hash matches the request; no snapshot is required.
- Reviewed every changed file: `src/desktop/update-apply.ts` and its tests,
  `src/desktop/update-preview.ts`, `scripts/update-thread.mjs`,
  `docs/local-updates.md`, `README.md`, `AGENTS.md`, manifests/package versions,
  lockfile and active spec. Followed adjacent package validation, file-reading,
  preview, fixture, package-verifier and test-runner contracts. Excluded unrelated
  runtime source, dependencies and generated output from code review; inspected
  retained package/native artifacts solely as evidence.
- Checked repository strict TypeScript and dependency rules; bounded external
  metadata/files, exact approval and before/after hashes, ordinary paths/link
  refusal, data preservation, durable staging, closed-host checks, flock/pending
  serialization, repeat recovery and freshly approved compatible code rollback.
  Fixed inventory/budgets bound work; no unbounded updater collection/network
  path or new dependency was introduced.
- Real tests exercised nine SIGKILL coordinator creation/publication boundaries,
  first-lock SIGKILL/retry, real competing helper processes, altered
  code/data/intent/staging/directories, foreign records, legacy compatibility,
  later-data-preserving rollback and CLI refusal gates.
- Read supplied `evidence/48-interruption-acceptance.json`, `48-round-trip.json`,
  `48-repair-native-installation.json`, `48-lock-native-acceptance.json` and
  `48-history-integrity.json`: actual CLI interruption/recovery/rollback,
  preserved74 non-runtime files, repair replay preserving270 existing files,
  lock retry preserving5 authored files, and35 unchanged prior archives.
- Read `lab/evidence/48-native-inference.json`, `48-native-pdf-r2.json`,
  `48-native-final.json`, `48-native-repaired-restart.json`, and visually
  inspected `48-final-home.png`, all under
  `.thread-local/continuous-35-plus/`: actual Obsidian1.14.4/Thread0.4.1,
  local qwen3:4b-instruct Resume/Ask, offline packaged PDF extraction/save/page
  citation,61 prior notes/settings and9 history entries preserved. Reviewer
  inspected these retained reports without modifying the native installation.

## Findings

- No new confirmed findings in quality, security, performance or tests.
- F-02 closed in this pass after code and real-process regression verification.
- F-01 remains closed; atomic intent/pending/completion publication and all nine
  SIGKILL cases were re-reviewed. No open/fixed P0 or P1 findings remain.
- Repair order: none.

## Remaining risk

- Check is not required by this request; no separate Check acceptance was run.
  Native workflow evidence was inspected rather than rerun by this reviewer.
- Current verification remains Linux/Obsidian1.14.4/local tested-model specific.
  No cross-platform or large-installation performance guarantee is established.
- SIGKILL tests prove process-interruption paths; physical power-loss behavior
  was not tested. Individual-file rename/fsync does not provide a global
  transaction or protection against uncooperative external writers. These
  documented boundaries remain explicit.

## Try it now

Run or do:

From the Thread checkout, run `npm run updater -- apply` without arguments.

Expected:

The helper prints usage for preview, apply, recover and rollback-preview, exits
with a nonzero status, and changes no installation or recovery files. An actual
write requires the exact preview, its approval SHA, a new state directory and
`--obsidian-closed`; full instructions are in docs/local-updates.md.

This proves:

The write command refuses incomplete instructions before touching an installation.
It does not demonstrate a completed update or replace the recorded recovery tests.
