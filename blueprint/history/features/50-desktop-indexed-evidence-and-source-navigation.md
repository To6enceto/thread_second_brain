# Feature: Desktop indexed evidence and source navigation

**From build-plan:** feature 50
**Build attempt:** 1
**Branch:** feature/desktop-indexed-evidence-and-source-navigation
**Base branch:** main
**Status:** verified

## Goal

Find permitted evidence and navigate its actual Markdown sources in independent
Thread Desktop without Obsidian or an AI model.

## In scope

- Reuse indexNote, LocalIndex, section budgets, keyword ranking and dependency
  freshness via the desktop's descriptor-relative read adapter.
- Bounded in-memory incremental index, explicit Refresh and cancellation. Poll
  permitted file identities every 2.5 seconds instead of consuming file watchers.
  Reconcile before search/navigation; clear obsolete visible evidence on detection.
- Strict bounded YAML metadata parsing using pinned ISC-licensed yaml 2.9.1.
  Invalid/unsupported metadata omits a note from evidence with a coverage count;
  the original note remains available in the literal reader.
- Keyword search, source/hash/heading references, meaningful coverage, safe native
  Markdown subset and internal wiki/Markdown link navigation with ambiguity states.
- Synthetic actual Electron acceptance and unchanged plugin regressions/build.

## Out of scope

AI, semantic retrieval, project Home/Resume, writes, persistent settings/indexes,
PDF reads, external URL opening, attachment execution and full Obsidian Markdown
compatibility. These belong to later planned features.

## Build loop

Explicit Continuous invocation authorizes routine implementation, local feature
lifecycle and separately normal pushes of completed main commits. One feature
and branch at a time. Required independent review covers filesystem/IPC/evidence
boundaries. Preserve earlier history and run records.

## Build steps

- [x] Implement bounded index adapter, safe metadata/link resolution and tests.
  Done when scope, changed/renamed/deleted sources, dependencies, invalid metadata,
  cancellation and budget omissions are proven and npm run verify passes.
- [x] Connect finite IPC, incremental monitor, keyword UI and safe source rendering.
  Done when search opens current sections, ambiguous/unavailable links explain
  refusal, revoke/cancel/change clear stale content and npm run verify passes.
- [x] Demonstrate actual desktop acceptance, themes/keyboard and hostile sources;
  document limits. Done when synthetic native evidence and final Verify pass,
  plugin/history preservation is proven and the feature is ready for fresh review.

- [x] Repair independent review F-01/F-02 (attempt 1 of 2): preserve unknown
  Markdown identity coverage and bound malformed inline parsing. Done when new
  regressions, native acceptance and Verify pass, ready for a fresh full review.

- [x] Repair F-03/F-04 (attempt 1 of 2 for each): linear shared link parsing,
  full-source heading ambiguity checks, indexing cancellation and native desktop/
  Obsidian regressions. Done when Verify and acceptance pass for fresh review.

- [x] Repair F-05 (first finding attempt; second indexing-responsiveness repair):
  replace shared heading backtracking, preserve syntax, and prove bounded cancel
  with pathological headings in tests and actual Electron/Obsidian.

## Files / areas

src/standalone/{vault-reader,contracts,main,preload,renderer}.ts; new desktop index,
metadata, links and Markdown modules/tests; app.html/styles.css; package manifests;
docs/desktop.md and existing shared index/retrieval imports. Review repair also
changes shared linkTargets in src/vault/index.ts and shared sectionHeading in
src/vault/{sections,evidence}.ts with focused regression tests.

## Data / contracts

- Existing 500-note/5000-entry/16-level/2-MiB traversal bounds remain. Index uses
  the existing conservative profile: 1-MiB source admission, 8-MiB raw budget,
  60k retained characters/note, 60 chunks/note and 2-MiB serialized entries.
  At most 20 balanced keyword results; queries bounded to 1000 characters.
- Files are fingerprinted from their validated descriptor stat (dev/ino/size/
  mtime/ctime). Each scan validates selected root and current access revision.
  Cached entries are reused only while identity matches; changed entries and
  dependent outputs are invalidated before publishing replacements. Scan errors
  clear the index. Every final response checks vault revision and index generation.
- No persisted authority: index/cache reset on scope/vault changes and reload.
  Hidden paths and exclusions are filtered before reads; no PDF binary authority.
  A whole-vault grant maps to the already enumerated permitted paths for shared
  scope validation. Missing coverage never establishes global ID uniqueness.
- Strict YAML 1.2 mappings only, header limit 64 KiB, duplicate/unknown tags and
  aliases rejected. Errors do not expose contents or silently remove provenance.
- Navigation resolves only currently permitted listed Markdown paths. Relative,
  vault-relative and unique basename wiki links supported; ambiguous candidates
  are shown for explicit choice. No remote URLs, embeds or attachment launches.
  Unsafe/hidden/traversal paths refused. Hash-bearing evidence clicks refuse
  changed sources; missing/repeated headings are reported, not guessed.
- Native DOM rendering uses textContent only: bounded 120k-character/2000-block
  preview with headings, paragraphs, lists, quotes, code and simple emphasis/links.
  Literal original source remains available. No HTML insertion or remote assets.
- Polling is a bounded observation interval, not instant filesystem synchronization.
  Polls serialize with refresh; cancel pauses monitoring until explicit Refresh.
  Navigation/search refresh current metadata; later AI/writes must revalidate hashes.

## Testing

Baseline npm run verify: 339 tests plus strict typecheck and both builds. Focused
logic tests cover permissions/root grant, freshness/dependency invalidation, read
reuse, cancellation, malformed metadata, safe links/Markdown and finite budgets.
Native Electron synthetic vault: search and quoted phrase, heading navigation,
rename/edit/delete, exclusions, empty scope, cancel/reload, malicious Markdown,
ambiguity, keyboard, light/dark and no Obsidian in owned process tree.

## Notes for the AI

Preserve the feature49 security boundary. No personal vault acceptance. Do not
infer renamed identity from equal content. Record real coverage and poll limits.
Only complete after Verify, native acceptance and a current independent receipt.

## Verification evidence

- npm run verify passed 347 tests, zero failures/skips, strict typecheck and both
  builds. Logs: .thread-local/desktop-50-62/evidence/50-{step1,step2-final,final}-verify.log.
- Actual Electron45/Chromium156 on isolated Xvfb198/CDP9340: native directory
  picker, five scoped notes, quoted keyword search, heading navigation, explicit
  ambiguous choices, inert hostile Markdown, remote-fetch refusal, exclusions,
  cancel across poll ticks and three approval/Refresh race repetitions.
  50-native-final-core.json records the replay against final built UI assets.
- 50-native-edit.json, 50-native-rename.json, 50-native-headings.json prove hash
  refusal, four unchanged entries reused, external rename/deletion detection,
  cleared obsolete views, exclusion revocation and missing/repeated headings.
- Final light/dark screenshots inspected: 50-final-light.png, 50-final-dark.png.
  50-native-keyboard.json confirms real Tab reaches a source link with visible
  focus and the persistent status remains visible. Reload cleared all grants.
- 50-preservation.json proves every prior history byte and plugin bundle/styles/
  manifest unchanged; synthetic original/plugin-state bytes restored after test
  authored external edits. 50-process-tree.json confirms no Obsidian process or
  sandbox-disabling flag in the owned Electron tree.
- First visual review found coverage text pushing results below the viewport;
  compact summaries and expandable details now retain coverage while showing
  results. No behavior or safety checks were waived.

- Review repair attempt 1: F-01 now propagates unknown Markdown enumeration
  separately from known omissions and unsupported attachments; desktop identity
  reuse remains blocked without modifying shared plugin behavior. F-02 uses
  explicitly bounded delimiter scanning and keeps over-budget syntax literal.
- 50-repair1-verify.log: 349 tests passed, zero skips/failures, strict typecheck
  and both builds. Actual Electron core replay passed again.
- 50-repair1-native.json: omitted duplicate ID withheld generated output; malformed
  120k-bracket source opened in 25.7 ms with original bytes and working Cancel.
  50-repair1-identity-restored.json proves output returns after coverage is restored.
  50-repair1-preservation.json confirms prior archives, plugin artifacts and
  original synthetic fixture bytes remain unchanged. Fresh independent review
  must confirm both repairs before completion.

- Review repair round 2 (first attempt for F-03 and F-04): shared link-target
  extraction advances through failed delimiters without backtracking. Native
  source navigation now counts matching headings across the full permitted
  source before highlighting a bounded preview.
- 50-repair2-final-verify.log: 352 tests passed, strict typecheck and both builds.
  50-repair2-core.json and 50-repair2-native.json replay prior desktop cases.
  50-repair2-headings.json proves no wrong highlight when the duplicate lies
  past the preview limit. 50-repair2-cancel.json: 100.7 ms timer, 121.3 ms
  cancel response with a changed malformed source and paused index.
- Shared parser changes update the plugin bundle. Actual isolated Obsidian1.14.4
  regression (50-repair2-obsidian.json) confirms malformed-source indexing,
  100.3 ms timer, ordinary wiki links, keyword results and source navigation.
  Initial automation targeted the vault document while Obsidian opened its
  first-run Settings window; closing that test window and focusing the vault
  corrected the test target. No product checks were changed or waived.
- 50-repair2-preservation.json proves all earlier history and original desktop
  fixture bytes unchanged, plugin styles/manifest unchanged, and the actual
  regression plugin bundle matches this build.

- Review repair round 3: F-05 uses the same linear heading parser for indexing
  and evidence sections, preserving ordinary title/closing-hash syntax. This
  is the first F-05 repair and second indexing-responsiveness repair; a further
  failure of that check must respect the configured limit.
- 50-repair3-verify.log: 353 tests, zero failures/skips, typecheck and both builds.
  50-repair3-desktop.json proves a fresh index with 120k heading whitespace
  responds to Cancel in 121.1 ms. 50-repair3-core.json passes all prior core cases.
  Actual Obsidian forced rebuild (50-repair3-obsidian.json) handles long headings
  with a 100.2 ms timer while retaining ordinary links, search and navigation.
  50-repair3-preservation.json proves prior history and original desktop fixture
  bytes unchanged and installed native plugin bytes match this build.

## Try it now

Run npm run desktop:start, choose a test vault, approve its Projects folder, and
search for a phrase present in a note. Open a result: the source and cited heading
appear in Thread with Obsidian closed. Edit the test source externally: the old
view clears after detection, and searching again uses its updated content. Cancel
indexing pauses monitoring; Refresh resumes it. No note is written by Thread.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11548,"specSha256":"f9cbc05565ee5e75aab715648135df420ae81ab7a28e5a79ac50ac57cc7ada2b","branch":"refs/heads/feature/desktop-indexed-evidence-and-source-navigation","head":"eae381c035c3824750b3efd80a5da53a0c0187bc","baseRef":"refs/heads/main","baseCommit":"5a17a9e399daff98c5ab3633e743abc417f70759","sourceTree":"fbfe54443f6f5c563d8df4dfe0bfae6bb3d79470","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 50/F-01 [P1] closed - Reader omissions incorrectly establish complete stable-ID coverage

**File:** src/standalone/evidence-index.ts:103
**Found:** 2026-10-21 by /audit independent (scope: current; lens: security, tests)
**Why it matters:** Coverage uses only `listing.paths.length` and the traversal
`limited` flag. `VaultReader.list` puts oversized (over 2 MiB), unreadable or
otherwise unavailable permitted Markdown files/directories in `listing.omitted`
without necessarily setting `limited`. Consequently `LocalIndex.identityComplete`
can be true when a permitted Markdown note was never inspected. A duplicate ID in
such a note is invisible, yet `FreshnessGraph.resolve` accepts the one indexed
candidate and permits generated output depending on that ID to appear as current
search evidence. This violates the spec's explicit prohibition on inferring global
ID uniqueness from missing coverage.

An independent in-memory reader reproduction with an ordinary indexed source,
an answer referring to its stable ID, and `omitted: 1, limited: false` returned
`listingOmitted=1`, `indexOmitted=0`, `identityComplete=true` and an `Answer.md`
search hit. The real reader reaches that listing shape at
`src/standalone/vault-reader.ts:109-119` for an oversized Markdown file or a read
failure. Existing tests cover the 1 MiB index-admission omission but not the
reader's separate omission channel.

**Suggested fix:** Carry an explicit incomplete-text/identity-coverage signal from
the reader for unavailable permitted Markdown and uninspected directories, and
include it in index freshness/coverage before `LocalIndex.replace`. Ordinary
unsupported attachments need not count as missing Markdown identity coverage.
Add a regression with an omitted duplicate-ID Markdown source and an ID-dependent
answer; the answer must not be eligible for evidence reuse.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21.
`VaultReader.list` now distinguishes omitted Markdown and unknown enumeration;
`DesktopIndex.identityComplete` requires enumeration completeness in addition to
shared coverage. Re-examined the reader, index, inherited freshness graph and
regressions for oversized duplicate-ID sources, unavailable directories, ordinary
attachments and restored coverage. Focused tests and the full 349-test suite
passed; retained actual Electron repair/identity-restoration evidence agrees.
No missing-coverage uniqueness assertion remains in this path.


### 50/F-02 [P1] closed - Unterminated inline syntax blocks the renderer for seconds

**File:** src/standalone/markdown.ts:13
**Found:** 2026-10-21 by /audit independent (scope: current; lens: performance, tests)
**Why it matters:** The inline regex repeatedly scans the remaining line at each
opening bracket when no closing bracket exists. The 5,000-token guard runs only
after a successful match, so it does not bound this work. A valid permitted note
containing a single 120,000-character line of `[` fits the preview limit but
`markdownPreview` took 10,016 ms synchronously on this host and returned
`limited: false`. Smaller runs took 119 ms at 10,000 characters, 446 ms at 20,000,
and 1,342 ms at 40,000. `renderMarkdown` calls this parser synchronously from
`src/standalone/renderer.ts:59`, blocking the Electron UI, navigation and cancel
controls while opening that source. Existing hostile-Markdown tests verify inert
HTML but do not cover adversarial unmatched delimiter runs.

**Suggested fix:** Use a linear inline scanner or another demonstrably bounded
parsing strategy, retaining unmatched/over-budget syntax as literal text and
reporting any preview limitation. Add regressions for long unmatched bracket and
other delimiter runs; keep the original-source reader available.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21.
Re-examined the complete bounded inline scanner and its renderer caller. Direct
120,000-bracket preview took 6.3 ms on this host; malformed delimiter and token
budget regressions, focused tests and the full 349-test suite passed. Retained
actual Electron repair evidence records responsive original-source display and
Cancel. The original synchronous preview defect is gone. 50/F-03 records a distinct
main-process indexing defect in shared link extraction, outside this repair.


### 50/F-03 [P1] closed - Desktop indexing blocks the main process on malformed links

**File:** src/standalone/evidence-index.ts:96
**Found:** 2026-10-21 by /audit independent (scope: current; lens: performance, tests)
**Why it matters:** The new desktop adapter invokes shared `indexNote` in
Electron's main process. Its `linkTargets` regex at `src/vault/index.ts:30` still
backtracks heavily over unmatched opening brackets in each retained chunk.
The conservative 1,200-character chunk bound does not make the aggregate work
responsive: an independent in-memory `indexNote` run took 1,907 ms for 10,000
brackets, 7,763 ms for 40,000 and 9,722 ms for 120,000. The latter is a valid
120-KB permitted note, below source admission limits.

A separate reproduction called actual `EvidenceIndex.refresh(1)` with a reader
returning this one note and scheduled `index.cancel(1)` after 100 ms. Cancellation
could run only at 9,717 ms, when refresh finally rejected with AbortError. During
this synchronous work the real main process likewise cannot service IPC,
including Cancel, vault close or grant revocation. The preview-only repair and
its tests never exercise this indexing path.

**Suggested fix:** Make link extraction bounded for malformed delimiters at the
shared parser or an equally complete desktop boundary, and preserve existing
link syntax and ranking behavior. Add an end-to-end EvidenceIndex regression
with unmatched bracket runs and an event-loop/cancellation responsiveness
assertion, including aggregate work over retained chunks. If shared logic
changes, verify relevant plugin behavior as required by project standards.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21.
Re-examined shared `linkTargets`, `indexNote`, section budgets and desktop refresh/
cancellation callers. An independent in-memory 120,000-bracket `indexNote` run
completed in 15.8 ms; actual `EvidenceIndex.refresh` with the same source allowed
its 100 ms cancellation timer at 101.0 ms, then left the index empty and paused.
The repaired scanner advances through failed delimiters without repeated scans.
Focused 29-test review suite and full 352-test suite passed with no failures or
skips. Inspected actual Electron/Obsidian repair evidence and the isolated running
hosts. In-memory current-source builds exactly match all desktop assets and the
regression plugin bundle. Original blocking defect is gone; no new defect was
confirmed in the repair.

### 50/F-04 [P1] closed - Truncated previews can navigate to the wrong repeated heading

**File:** src/standalone/renderer.ts:77
**Found:** 2026-10-21 by /audit independent (scope: current; lens: quality, tests)
**Why it matters:** Heading uniqueness is inferred only from rendered preview
blocks. A matching heading may repeat after the 120,000-character or 2,000-block
preview limit. A keyword hit can come from that later occurrence because the
shared index samples sections independently. `renderMarkdown` sees one earlier
heading, focuses it and reports successful source loading, directing the user
to the wrong passage rather than explaining the repeated heading as specified.

An independent reproduction indexed `# Repeat`, unrelated first-section text,
120,000 filler characters, then another `# Repeat` containing `secondorchid`.
Searching `secondorchid` returned the later excerpt with heading `Repeat`.
Executing the actual renderer function, transpiled in memory with a minimal DOM,
reported `Source loaded. No files were changed.` and applied
`thread-heading-target` to the first heading. The source contained two matching
headings, but its limited preview contained one. The generic preview-limit notice
does not prevent this incorrect navigation or explain the ambiguity.

**Suggested fix:** Establish heading identity/ambiguity against the whole
bounded source before focusing a displayed heading, or conservatively decline
heading navigation when preview truncation prevents that determination. Explain
repeated/omitted headings and retain the original-source reader. Add regressions
for hits in a repeated heading beyond each preview bound and for valid unique
headings in limited notes.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21.
Re-examined full-source heading counting and actual `renderMarkdown` navigation.
Independently transpiled the actual renderer function in memory and exercised
repeated headings beyond both the 120,000-character and 2,000-block bounds: each
reported a repeated heading and applied zero target highlights. A visible unique
heading in a limited source highlighted correctly; an omitted unique heading
reported its absence without a highlight. Focused and full tests passed, including
full-source ambiguity regressions. Retained native `50-repair2-headings.json`
confirms refusal and original-source availability in actual Electron. Original
wrong-passage navigation is gone; no new defect was confirmed in the repair.


### 50/F-05 [P1] closed - Heading whitespace blocks desktop indexing and cancellation

**File:** src/vault/sections.ts:15
**Found:** 2026-10-21 by /audit independent (scope: current; lens: performance, tests)
**Why it matters:** The desktop adapter calls shared `indexNote` in Electron's
main process at `src/standalone/evidence-index.ts:96`. `sectionChunks` detects
headings with `/^#{1,6}\s+(.+?)(?:\s+#+)?$/`, whose lazy heading capture and
optional trailing-whitespace group repeatedly rescan a long whitespace suffix.
The asynchronous line-yield and chunk-round cancellation points occur after
this synchronous match, so they cannot keep the main process responsive.

Independently indexing `# Title` followed by 50,000 spaces and `\nbody` took
959.9 ms; 100,000 spaces took 3,815.4 ms. Both are valid ordinary notes below the
1 MiB conservative admission limit. An independent actual `EvidenceIndex.refresh`
reproduction with the latter source scheduled `index.cancel(1)` for 100 ms; the
callback ran only at 3,910.0 ms and refresh then rejected with AbortError. During
that time the real Electron main process cannot service Cancel, vault close or
scope-revocation IPC. 50/F-03's link scanner repair removes its original delimiter
case, but the shared section parser leaves another reachable synchronous stall.
Current regression tests cover malformed brackets, not this heading suffix.

**Suggested fix:** Replace the shared heading extraction with a demonstrably
bounded scan that preserves existing heading and closing-hash semantics. Add a
regression through actual `EvidenceIndex.refresh` with long heading whitespace
and an event-loop/cancellation assertion, plus section-heading semantic cases.
Verify relevant shared plugin behavior and actual desktop responsiveness.
**Resolution:** Closed by fresh independent full-delta review on 2026-10-21.
Re-examined shared sectionHeading, sectionChunks, noteSections, desktop refresh
and cancellation, and the semantic/timer regressions. Independent in-memory
indexNote with a 120,000-space heading completed in 3.0 ms; actual EvidenceIndex
refresh allowed its 100 ms cancellation timer at 100.4 ms and left an empty,
paused index. The unmatched-bracket case also remained bounded (25.4 ms indexing,
101.2 ms timer). Fresh typecheck and all 353 tests passed with no failures/skips.
Inspected retained repair3 actual Electron and Obsidian long-heading evidence;
replayed the actual Electron core checks successfully and confirmed the isolated
Obsidian plugin is loaded. In-memory current-source builds match every desktop
asset and the production plugin bundle; the installed Obsidian bundle matches.
Original whitespace backtracking is gone; no new defect was confirmed in the
repair. No finding was waived.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** eae381c035c3824750b3efd80a5da53a0c0187bc
**Base commit:** 5a17a9e399daff98c5ab3633e743abc417f70759
**Base ref:** main
**Spec hash:** f9cbc05565ee5e75aab715648135df420ae81ab7a28e5a79ac50ac57cc7ada2b
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T20:50:52.505625+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T20:55:06.612062+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --short`: passed; target, base, spec and permitted dirty paths match the request, rechecked before receipt.
- `git diff 5a17a9e399daff98c5ab3633e743abc417f70759 eae381c035c3824750b3efd80a5da53a0c0187bc`: reviewed the complete delta, excluding the request/findings from product scope, and followed affected callers/contracts.
- `npm run typecheck`: passed in this reviewer context.
- `npm test`: initial sandbox run failed in three existing desktop test files; rerun with host permissions passed all 353 tests, zero failures/cancellations/skips. Log: `/tmp/thread-50-r4-tests-host.log`.
- `npm run verify`: inspected passing retained `.thread-local/desktop-50-62/evidence/50-repair3-verify.log` (typecheck, 353 tests, plugin production build and desktop build); did not rewrite current assets.
- In-memory `esbuild.build` with the existing build options and `write:false`: passed; all three desktop bundles, HTML/CSS and production plugin bundle exactly match current source/build bytes.
- Independent in-memory `indexNote` and actual `EvidenceIndex.refresh`/100 ms cancellation reproductions: passed for 120 KB unmatched brackets and long-heading whitespace.
- `node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-50-core.js`: passed against actual isolated Electron on CDP9340 after granting required loopback access.
- Read-only CDP inspection of isolated Obsidian on CDP9341 and SHA-256 comparison of its installed plugin to `main.js`: passed. The first target-title selection found no matching page; selecting its actual synthetic Research window succeeded.

## Evidence

- Complete feature50 delta reviewed afresh across quality, security, performance and tests: descriptor-relative enumeration/read changes, coverage/identity omissions, index/cache/freshness dependencies, finite IPC and revision/generation checks, renderer cancellation/scope races, safe Markdown/link/heading navigation, shared parser repairs, tests, pinned dependency and documentation.
- F-01 through F-04 repairs remain sound on re-examination. F-05's shared heading parser avoids the prior lazy-capture/optional-whitespace backtracking while retaining covered ordinary title and closing-hash behavior.
- Independent 120,000-bracket indexing: 25.4 ms; cancel timer: 101.2 ms. Independent 120,000-space heading indexing: 3.0 ms; cancel timer: 100.4 ms. Both cancellation checks left no ready entries.
- Fresh full test suite: 353 passed, zero failed/skipped; strict typecheck passed. Retained Verify includes both builds, independently matched without writing artifacts.
- Live Electron replay confirms five-note scoped index, quoted search, heading navigation, explicit ambiguous choices, inert hostile Markdown/embeds, blocked remote fetch, exclusions, cancellation across a poll tick and three scope-approval/Refresh race repetitions. Renderer Node access remains unavailable.
- Retained `50-repair3-desktop.json`: long-heading rebuild timer 100.4 ms, Cancel response 121.1 ms and paused index. `50-repair3-obsidian.json`: forced long-heading rebuild timer 100.2 ms plus preserved wiki links, keyword results and actual source navigation. `50-repair2-headings.json` confirms no wrong highlight for a full-source repeated heading.
- Live isolated Obsidian1.14.4 has Thread loaded; installed plugin and current production bundle share SHA-256 `7c29ac19e4a13d372f68a2b7441b6454c97fa23d36ecfb191450a2fa11e84cf3`. Retained `50-repair3-preservation.json` records prior archive and original desktop fixture preservation.

## Findings

- F-05 closed after independent confirmation; F-01, F-02, F-03 and F-04 remain closed.
- No new confirmed findings in the complete target delta across all four lenses. No P0/P1 finding remains open or fixed; none was accepted or waived.

## Remaining risk

- Polling retains the documented 2.5-second observation delay and does not provide an atomic whole-vault snapshot. Search/index/preview limits and the supported Markdown subset are explicit product constraints.
- No verification command remains unavailable after permissioned reruns. No dependency vulnerability scan is configured; local dependency/lockfile inspection is not a current vulnerability scan. Check was not required by this request.
