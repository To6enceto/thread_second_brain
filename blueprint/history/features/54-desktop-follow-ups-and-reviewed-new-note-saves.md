# Feature: Desktop follow-ups and reviewed new-note saves

**From build-plan:** feature 54
**Build attempt:** 1
**Branch:** feature/desktop-follow-ups-and-reviewed-new-note-saves
**Status:** verified

## Goal

Continue bounded evidence-aware conversations, correct claims without losing original provenance, and explicitly save exact new Markdown notes from Thread Desktop with safe ownership and durable history.

## In scope

- Main-owned conversations using existing six-turn/4000-character history/24000-character prompt contracts. Explicit continuation, fresh evidence choices, omissions disclosed, corrections retained separately from original output. Scope/model/project/source changes revoke stale context and previews.
- Exact answer and selected conversation-note previews using existing readable schemas. Main owns model output, corrections and preview identities. Explicit saves only, current source/dependency validation, collisions refused, no existing-note modification.
- Versioned desktop preferences and save receipts outside the vault in the app profile. Read grants and PDF consent remain volatile and are never imported. Explicit preference/history import previews; copied plugin history is read-only provenance, never a shared mutable recovery journal. Corrupt/unknown/full state blocks writes without reset.
- A conservative cooperative single-writer policy before saves. A Linux abstract socket binds a hashed filesystem identity, without note content or lock files. The compatible plugin holds ownership until its Obsidian process exits (including after plugin disable, to cover in-flight work); desktop obtains it explicitly before writes, and releases after operations settle on close. No concurrent plugin/desktop writes; an active owner blocks the other. The kernel releases ownership on process exit; unresolved durable history still blocks writes. Compatibility inspection is explicitly consented and bounded; unresolved plugin changes/import recovery blocks desktop writes and remains intact. Legacy plugin installations need the compatible build before desktop writes; ordinary independent reading remains available.
- Durable intended-new-note receipt before exclusive creation, verified final bytes, preserved uncertain receipt on interruption, explicit reconciliation without deleting or overwriting notes. No automatic pruning of unresolved state.
- Native accessible controls, loading/empty/denied/error/cancel states, actual Electron and Obsidian regression acceptance, real local inference and preserved prior archives.

## Out of scope

Existing-note proposals, edits, undo and multi-file recovery UI (55); record/action/review/research/PDF/import/export features (56-61); runtime distribution (62); personal vault tests or everyday installation changes. No automatic permission migration, note editing, remote services or package publication.

## Build loop

Continuous Mode: feature-level review, no step checkpoint commits. Verify each coherent step, actual runtime acceptance and fresh full independent review before completion. Two repairs per same failing check/finding. User authorizes local lifecycle and separate normal verified main pushes. Preserve completed archives and earlier evidence.

## Build steps

- [x] 1. Establish versioned desktop profile state and cooperative cross-process ownership with meaningful filesystem tests. Done when corrupt/unknown state is preserved, settings never grant reads, ownership races fail closed and Verify passes; no note-writing UI is enabled yet.
- [x] 2. Integrate compatible plugin ownership and explicit desktop compatibility/setup controls, retaining plugin journals. Done when separate processes cannot overlap ownership, unresolved/legacy plugin state blocks desktop writing, explicit preference/history copies preserve originals, Verify and actual Obsidian regression pass.
- [x] 3. Add bounded main-owned follow-ups and claim corrections with native UI. Done when current-evidence-only context, turn/prompt limits, corrections/provenance, cancellation and invalidation tests and Verify pass.
- [x] 4. Add exact main-owned answer/conversation previews and durable non-overwriting saves. Done when collision, stale source/scope/choice/correction, path/identity races, interrupted receipt and explicit reconciliation tests pass; Verify passes.
- [x] 5. Demonstrate end-to-end actual Electron real inference, correction, follow-up, exact save/reload and failures; verify plugin-readable schemas and ownership, update instructions and retain acceptance. Done when final Verify, preservation checks and native evidence pass and the checkpoint is ready for fresh independent review.

- [x] 6. Repair independent F-01/F-02: invalidate configuration edits and in-flight setup/copy results, revoke writer ownership, and display exact proposed preferences before copying. Done when delayed UI regressions, actual Electron setup acceptance and Verify pass, then obtain a new full fresh review.

## Files / areas

src/standalone/{contracts,main,preload,renderer,ask,ask-view,vault-reader,security,app,styles}; new profile/ownership/write modules and tests; src/main.ts for plugin ownership lifecycle; manifest compatibility declaration; docs/desktop.md. Reuse intelligence/conversation, vault/{answer-record,conversation-record,new-notes,workspace,changes} and portability/import validation. Shared ownership is coordination metadata only; plugin note contents continue through Obsidian APIs.

## Data / contracts

Desktop profile JSON schema 1: validated preferences, bounded save receipts and immutable imported-history copies. No note text in general logs. Persist before a vault write and refuse further writes with unresolved receipts. New-note bytes bounded to 1 MiB; receipt history bounded, full history blocks rather than silently discarding. Profile writes use exclusive temporary files and atomic rename plus flush; unknown/corrupt state stays untouched. Vault association uses canonical filesystem identity; selecting/restoring preferences never restores grants. Preferences remain drafts until explicit Apply/approval.

Ownership is cooperative between compatible Thread builds on the same host/user. Acquire a kernel-held abstract socket atomically; release the owned handle only, with no time-based lock stealing. Incompatible plugin builds cannot be certified for desktop writing. Other editors are not cooperative transaction participants: close concurrent editing before writes; exclusive new-file creation never overwrites a pre-existing path. Do not promise atomic multi-file writes or global editor locks. Both current sources and targets are revalidated at commit boundaries; pending recovery survives process termination.

Plugin compatibility inspection requires explicit consent to a chosen vault-relative configuration folder; reads only known bounded Thread settings/history/manifest files, with no symlink traversal. A missing plugin is allowed, malformed/unknown/legacy journals are not discarded. Pending/recovery imports or changes block writes. Explicit import copies only compatible preferences/history into the separate profile; read/PDF grants and live journal ownership never transfer.

Main owns conversation/answer/preview IDs and generation provenance. Renderer sends bounded question/correction/turn-selection/name inputs only. Corrections use current source IDs and server timestamps, do not establish truth, and renew the exact preview. Reuse shared Markdown escaping, record validation and source dependency hashes. Existing notes and personal installations remain unchanged.

## Testing

Baseline Verify: 370 tests, strict typecheck, plugin/desktop builds. Add real temporary-filesystem boundary/race/persistence tests and deterministic AI service tests. Native acceptance uses a new synthetic vault-54/profile, preserving earlier evidence. Real local qwen text inference; native Obsidian regression for plugin ownership/shared records. Include cancellation, revoked grants, source/target edits, collisions, interruption/reload and exact preview proof. No automated writes to personal notes.

## Notes for the AI

Keep source inspection and recorded Resume usable. No automatic changes or model-driven destinations. Invalid setup/history is actionable and preserved. Split oversized steps without changing feature identity. Report cooperative writer limits honestly; no claim that hashes alone serialize other applications. The user approved this persistence/interoperability prerequisite before writes; routine schema details stay within these contracts.

## Acceptance evidence

- Step 1: 54-step1-focused.log passes seven real filesystem/kernel ownership tests, including separate-process exclusion, abrupt child termination, corrupt/unknown history preservation, link/path replacement refusal and canceled durable commits. 54-step1-verify.log passes strict typecheck, 377 tests and plugin/desktop builds. Ownership uses Linux abstract sockets documented by Node.js (https://nodejs.org/download/release/latest-v20.x/docs/api/net.html#ipc-support); no filesystem lock files or note data are exchanged.

- Step 2: 54-step2-repair1-verify.log passes 380 tests and both builds. The existing 60 ms timeout test now prepares filesystem fixtures outside its transport deadline and explicitly proves both requests abort; the original failed log is retained. Native Electron core still passes. Actual Obsidian 1.14.4 loads compatible Thread 0.4.2, renders recorded Resume and opens a cited source. Native writer-blocked, plugin-writer-blocked, plugin-reload and disabled-plugin-ownership evidence proves mutual exclusion and safe handoff, including keeping ownership through plugin disable until process exit. Explicit preference/history copy leaves read scope unchanged; all fixture note bytes remain unchanged (54-step2-preservation.json). A native helper wait was corrected to await fresh inspection completion instead of retained text; no product check was weakened.

- Step 3: 54-step3-verify.log passes strict typecheck, 383 tests and both builds. Ten Ask tests cover main-owned corrections and immutable provenance, six-turn limits, omitted earlier context after exclusions, source edits and revoked/model-changed state. The repaired test expects the intentional cancellation raised by source invalidation; no production freshness check changed.

- Step 4: 54-step4-verify.log passes 388 tests and both builds. Focused filesystem/save checks prove exclusive UTF-8 creation, normalized-name collisions, links, parent replacement, source/choice/correction/draft/preference/access invalidation, durable pending intent, restart and explicit reconciliation without overwrites. An added reconciliation/schema check passes in 54-step4-reconciliation.log; final Verify will include it. The initial save-flow fixture was corrected to refresh the index after its own successful creation, as the UI instructs.

- Step 5: 54-checkpoint-verify.log passes strict typecheck, 389 tests and plugin/desktop builds. Native real inference and restarted-inference evidence uses qwen3:4b-instruct and qwen3-embedding:0.6b over isolated loopback. 54-native-conversation.json proves explicit corrections, blocked unapplied drafts, renewed previews, real follow-up and conversation save. Exact preview JSON and 54-native-save-preservation.json prove both saved Markdown files match their native previews byte-for-byte; the answer was saved with a native Enter key.
- Native interruption/recovery evidence proves a controlled synthetic folder-permission failure leaves a pending durable receipt; restarting preserves it, hides paths before fresh grants, refuses confirming a missing note and explicitly closes recovery while preserving the receipt. This tests failure/restart, not power-loss fault injection. Unit tests also cover matching-byte confirmation, later external edits and full history. Native cancel/revoke evidence suppresses late answers and clears output after read revocation. The sandboxed renderer has no Node globals. Runtime logs contain isolated DBus/X keyboard warnings, without a product crash.
- Actual Obsidian 1.14.4 with Thread 0.4.2 indexes the desktop-created answer and opens the conversation with version 1 metadata, no change/import warnings (54-native-plugin-saved-records.json). A helper call was corrected from a nonexistent refreshIndex to the inspected rebuildIndex API; no product change or assertion was waived. Light/dark screenshots 54-save-light.png and 54-save-dark.png were inspected; native controls and text remain readable. New checkbox and sidebar history styles keep selection and long recovery text usable.
- 54-final-preservation.json confirms all completed archive bytes and all eleven original synthetic notes remain unchanged. No personal vault or everyday runtime was modified. docs/desktop.md and README.md now describe the independent flows and conservative limits, including cooperative ownership, profile/history bounds and explicit recovery.

- Step 6: 54-repair1-verify.log passes strict typecheck, all 396 tests and both production builds. 54-repair1-ui-focused-host.log independently passes all six delayed-response UI cases. 54-native-review-repair.json proves late inspection/enable suppression, released main-process ownership, exact proposed preferences distinct from saved preferences, both previews cleared together, and no added grants/history copies. 54-repair-preferences.png was inspected in actual Electron; exact preference values are readable before copying. F-01 and F-02 are repaired pending fresh independent review.

## Try it now

Run or do:

Run `npm run desktop:start` from this checkout. In a configured disposable vault's Ask answer, expand Correct claim 1, edit its text, and observe Preview new note and Continue with current evidence. Choose Apply correction, then Preview new note after enabling writing in Desktop storage. Inspect the exact destination and Markdown without choosing Save.

Expected:

Unapplied edits disable saving/continuing. Applied corrections retain the original output, model/time and citations in the exact preview. Editing the new note name immediately removes that preview and disables Save exact new note.

This proves:

The correction and exact-preview controls require renewed review before a new note can be saved; this observation itself does not write a note.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14388,"specSha256":"b2b049bfe62806a0d5f7d2782ab4e3042937b1de3258492d0ffa8d7dfa3f0dad","branch":"refs/heads/feature/desktop-follow-ups-and-reviewed-new-note-saves","head":"4b23aa6edc70a891a33960df507e3880504f9541","baseRef":"refs/heads/main","baseCommit":"5312c9cc5af72873164621e5b66786776e4d5f1a","sourceTree":"50256e89f60a547bb7274fa0d4000734c5201075","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 54/F-01 [P1] closed - A changed configuration folder accepts an older compatibility result

**File:** src/standalone/storage-view.ts:28
**Found:** 2026-10-21 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Editing `plugin-config` clears the visible preview but does not advance the operation epoch. If compatibility inspection is awaiting IPC, its old-folder response still passes `current()`, restores that preview and enables writing. Enable then submits its old preview ID while the field shows the new folder. The main process consequently rechecks the old folder, which can be absent/compatible while the intended folder contains unsupported or unresolved plugin recovery. This violates the required compatibility gate before desktop writes. The existing backend tests do not cover this renderer ordering.
**Suggested fix:** Keep configuration edits and asynchronous inspection acceptance consistent: invalidate pending results when the folder changes and require the accepted preview folder to match the chosen folder before enabling/copying. Prevent edits from making an in-flight enable/import look current. Add a delayed-result regression for these boundaries.
**Resolution:** Confirmed at 1fc01d4edf69be9ddf45f0d7ba33d52bed0b2c0f with an inline Node DOM harness importing the real `StorageView`: start inspection for `.old-config`, dispatch input changing it to `.actual-config`, resolve the old response, and click Enable. The input remained `.actual-config`, Enable became available, and the bridge received `preview-of-old-config`. No vault or evidence files were changed.

**Repair:** Configuration input advances the view epoch, clears inspection displays, releases main-process ownership, and rejects mismatched folder replies. Deferred UI and backend tests plus native Electron evidence pass (54-repair1-verify.log, 54-native-review-repair.json). Repair attempt 1.

**Independent re-review:** Closed at 4b23aa6edc70a891a33960df507e3880504f9541 on 2026-10-21 by fresh codex/gpt-6.1-sol review across the complete feature delta. Re-examined StorageView input/run/chosenInspection and DesktopStorage release/inspect/enable/owned guards. Independently ran the full host suite (396 passing), including delayed inspection, enable and import replies, mismatched folder replies and real backend release/enable races. The input advances the renderer epoch, clears both previews and revokes main ownership; stale work cannot restore the old folder's accepted state. Retained actual Electron repair evidence confirms main ownership release. No new defect found in the repair.

### 54/F-02 [P2] closed - Plugin preferences are copied without showing their proposed values

**File:** src/standalone/storage-view.ts:32
**Found:** 2026-10-21 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** Compatibility inspection returns `preview.preferences`, but the view displays only `preview.history` and compatibility status. Saved preference drafts continue showing the existing desktop preferences. Copy previewed plugin preferences and history therefore replaces persistent endpoint/model/folder drafts without presenting those proposed preference values first, despite the spec requiring explicit preference/history import previews. Grants remain protected and later AI application is explicit, so this is not a read-permission bypass.
**Suggested fix:** Display the exact proposed plugin preferences alongside the history before enabling Copy, clearly identifying the saved desktop preferences they will replace. Invalidate both displays together when the inspection changes.
**Resolution:** Confirmed by source review and an inline harness importing the real `StorageView`: inspection returned a distinct model and Knowledge role; neither value appeared in any displayed field before Copy, yet Copy was enabled and submitted the inspection ID successfully.

**Repair:** Exact proposed plugin preferences are displayed separately from saved drafts before Copy, and clear with the history preview. Six focused UI cases and native Electron preview evidence pass; screenshot 54-repair-preferences.png inspected. Repair attempt 1.

**Independent re-review:** Closed at 4b23aa6edc70a891a33960df507e3880504f9541 on 2026-10-21. Source review and independently passing UI tests confirm exact preview.preferences are rendered separately before Copy becomes available, and preferences/history clear together. Read-only CDP inspection of the actual Thread Desktop window on localhost:9340 confirmed the proposed Knowledge role is empty while the saved role is Knowledge, both shown in their respective previews. Independently inspected 54-repair-preferences.png for readable native presentation. No copy or fixture note mutation was performed by this review.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 4b23aa6edc70a891a33960df507e3880504f9541
**Base commit:** 5312c9cc5af72873164621e5b66786776e4d5f1a
**Base ref:** main
**Spec hash:** b2b049bfe62806a0d5f7d2782ab4e3042937b1de3258492d0ffa8d7dfa3f0dad
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T23:20:15.240617+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T23:22:41Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active verified spec and the complete 5312c9cc5af72873164621e5b66786776e4d5f1a..4b23aa6edc70a891a33960df507e3880504f9541 delta in a fresh isolated subagent without the builder conversation. Run all Audit lenses from scratch using the installed project-local skill. Re-examine the fixed findings, but do not limit scope to them. Do not edit product code, accept findings, or reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1`: passed; exact target, base and spec match, with only permitted review evidence dirty.
- `git diff 5312c9cc5af72873164621e5b66786776e4d5f1a 4b23aa6edc70a891a33960df507e3880504f9541` and targeted source/caller/test inspection: passed across the complete feature delta and all four lenses.
- `npm run typecheck`: passed independently.
- `npm test` (authorized host execution): passed independently; 396 tests, zero failures, cancellations, skips or TODOs. Full output: `/tmp/thread-feature54-independent-tests.log`.
- `git diff --check 5312c9cc5af72873164621e5b66786776e4d5f1a 4b23aa6edc70a891a33960df507e3880504f9541`: passed.
- Read-only `node .thread-local/desktop-50-62/cdp.mjs <inspection-expression>` against localhost:9340: passed; actual Electron UI shows distinct proposed/saved preferences, disabled Copy/Save before ownership and no renderer Node globals.
- Read-only Node byte/hash comparison of `54-notes-before.json` and both `54-native-*-exact.json` previews against `vault-54`: passed; all eleven original notes unchanged, both saved notes exactly match their native previews.

## Evidence

- Reviewed the verified active spec, build/project plans, persistence and interoperability contracts, and every changed product/configuration/documentation area. Followed main/preload/renderer paths, plugin initialization, shared conversation/record validation, filesystem access and operation invalidation. Scope includes quality, security, performance and tests over the full feature delta, rather than only F-01/F-02.
- Independent tests exercise real filesystem descriptors, exclusive creation, normalized collisions, parent replacement, corruption/history limits, canceled commits, process ownership/crash release, plugin compatibility, main-owned provenance, bounded conversation, stale sources and durable reconciliation. No focused, skipped or placeholder tests found in changed suites.
- Inspected retained `54-repair1-verify.log`: typecheck, all 396 tests and plugin/desktop production builds passed. Builds were inspected from retained evidence rather than regenerated by the reviewer.
- Inspected actual Electron/Obsidian evidence `54-native-review-repair.json`, `54-native-conversation.json`, `54-native-save-preservation.json`, `54-native-recovery-restart.json`, `54-native-interruption.json`, `54-native-cancel-revoke.json`, `54-native-plugin-saved-records.json`, writer-blocked/disabled-plugin evidence, and `54-final-preservation.json`. These cover real local inference, corrections/follow-up, exact saves, interruption/restart, permission revocation, plugin-readable records, writer handoff and preservation.
- Read-only live Electron inspection independently confirmed the exact proposed preference values are distinct from saved drafts; inspected `54-repair-preferences.png` for readable native presentation. No save helper was run and no acceptance fixture note was altered.

## Findings

- F-01 [P1]: closed after independent code, delayed-result test and retained native evidence confirmation.
- F-02 [P2]: closed after independent code/tests, live Electron inspection and screenshot confirmation.
- No new findings. No open or fixed P0/P1 findings remain.

## Remaining risk

- Ownership coordinates compatible writers only within the same Linux host/user/network namespace; unrelated editors and isolated namespaces require the documented closed-editor policy. Exclusive creation still refuses overwrites.
- Retained native interruption evidence tests controlled filesystem failure and restart, not power-loss fault injection. Native saves and inference were not repeated during this read-only review; their retained exact-byte and actual runtime evidence was inspected, with saved bytes independently rechecked.
- No verification command was unavailable. Check was not required by this request.
