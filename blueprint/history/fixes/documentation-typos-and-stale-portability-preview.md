# Fix: Documentation typos and stale portability preview

**Type:** Fix
**Status:** verified
**Branch:** fix/documentation-typos-and-stale-portability-preview
**Fixes:** F-08
**Authorization:** User approved clean-up item D (F-08, stale AGENTS.md package line, missing "Try it now" guides) with standing local workflow approval on 2026-10-27.

## The problem

- F-08 [P3]: in `src/standalone/portability-view.ts`, the save and import handlers clear
  `exportPreview` / `importPreview` unconditionally after a reply. A late reply from a
  request that was overtaken by a panel refresh discards a newer preview, so
  **Save previewed checkpoint** or **Import as new copies** stays enabled but does nothing
  until the user previews again. No data is written or lost.
- AGENTS.md names `dist/thread-0.4.1.zip`; the current plugin package is 0.4.2.
- About twenty places in AGENTS.md, README.md, docs/local-updates.md and the clipper
  guide have a number glued to the preceding word or comma ("at most100", "All192",
  "PDF,32 MiB").

## The fix

- Clear a preview only when it is still the one this request saved or imported:
  `if (this.exportPreview === preview) this.exportPreview = null;` and the same for
  `importPreview`. Confirmation messages, busy handling and main-held tokens stay as they are.
- Correct the AGENTS.md package path to `dist/thread-0.4.2.zip`, and insert the missing
  spaces. Change no wording, numbers or links beyond spacing.
- Deliver the "Try it now" guides for features 59-62 as read-only `/check guide`
  output in chat. Completed feature archives stay byte-for-byte unchanged.

## Build steps

- [x] Guard both preview resets and add a view test where a newer preview built after a
  refresh survives a late save reply and still saves. Done when the test fails before
  the change, passes after, and `npm run verify` passes.
- [x] Apply the documentation spacing and package-path corrections. Done when a scan for
  letters or commas glued to digits finds only legitimate tokens (`qwen3`, `x64`, paths)
  and the diff contains only those spacing/path changes.

## Verify

Verified 2026-10-27: `npm run verify` passed (520 tests, 0 failed, both builds); the focused view test failed before the repair and passed after; docs scan found only legitimate tokens. Try guide skipped for the code change: the race needs a sub-second reply delay that cannot be produced safely by hand. Guides for features 59-62 are delivered in chat as read-only `/check guide` output.


- `npm run verify` passes.
- Focused test: `node --test --experimental-strip-types src/standalone/portability-view.test.ts`.
- Docs diff review: only spacing and the 0.4.2 path change.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2680,"specSha256":"612cbee850d161ac06f5d5ed9cdafd6670dc3cdd2f6398bdf5aa77223c838354","branch":"refs/heads/fix/documentation-typos-and-stale-portability-preview","head":"321a492bc53e76037ac5a6a415af663aa430044e","baseRef":"refs/heads/main","baseCommit":"37cec1f329941c41b58ec6ab3410d0aa5cabd698","sourceTree":"eccd34d8142e0b65811a54d8e557fb2050139f17","landing":"local-merge","absentOptional":[]} -->

## Findings

### documentation-typos-and-stale-portability-preview/F-08 [P3] closed - A late save or import reply clears a newer preview, leaving its action button enabled but inert

**File:** src/standalone/portability-view.ts:72
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The documentation-typos-and-stale-portability-preview/F-05 repair removed the `if (!current()) return;` guard from the save and import handlers so that `completed()` can report a finished write after the panel was reset. The handlers now run `this.exportPreview = null` (line 72) and `this.importPreview = null` (line 95) unconditionally after `completed()`. When the request is stale, those fields may already hold a newer preview built after the reset. Scenario: the user saves a large checkpoint. The 2.5-second monitor lists the new file and emits `invalidated` before the `writeExport` reply. `portabilityView.invalidate()` empties the panel and releases busy, which re-enables Refresh. The user refreshes, chooses files and clicks **Preview checkpoint**. That run finishes with `exportPreview = P2` and enables **Save previewed checkpoint**. The old save reply then arrives: `completed()` shows the old confirmation and `this.exportPreview = null` discards P2. `run()`'s `finally` skips `setBusy` because the request is stale, so the Save button stays enabled. Clicking it hits `if (!preview) return;` and silently does nothing, with no message, until the user previews again. The window is the create, fsync and readback time, which is short, so this is unlikely but reachable. The import handler has the same pattern, reachable only when Cancel lands after the importer's final check. No data is written, lost or overwritten; main still holds the newer preview.
**Suggested fix:** Clear only the preview that this request saved or imported, for example `if (this.exportPreview === preview) this.exportPreview = null;` (and the same for `importPreview`), or move the reset into the `current()` branch of `completed()`. Optionally extend the existing "survives a refresh that lands first" view test to build a second preview before the late reply resolves and assert that Save still works. Nothing would be lost.
**Resolution:** Fixed on 2026-10-27 by fix/documentation-typos-and-stale-portability-preview: both handlers now clear only the preview they saved or imported (`if (this.exportPreview === preview)` / `if (this.importPreview === preview)`). The new view test "a late save reply leaves a newer preview built after a refresh intact and saveable" failed before the change and passes after; `npm run verify` passed with 520 tests. Closed by /audit current (scope: current; lens: quality, tests) after reviewing the two-line diff.
