# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-08 [P3] open - A late save or import reply clears a newer preview, leaving its action button enabled but inert

**File:** src/standalone/portability-view.ts:72
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The F-05 repair removed the `if (!current()) return;` guard from the save and import handlers so that `completed()` can report a finished write after the panel was reset. The handlers now run `this.exportPreview = null` (line 72) and `this.importPreview = null` (line 95) unconditionally after `completed()`. When the request is stale, those fields may already hold a newer preview built after the reset. Scenario: the user saves a large checkpoint. The 2.5-second monitor lists the new file and emits `invalidated` before the `writeExport` reply. `portabilityView.invalidate()` empties the panel and releases busy, which re-enables Refresh. The user refreshes, chooses files and clicks **Preview checkpoint**. That run finishes with `exportPreview = P2` and enables **Save previewed checkpoint**. The old save reply then arrives: `completed()` shows the old confirmation and `this.exportPreview = null` discards P2. `run()`'s `finally` skips `setBusy` because the request is stale, so the Save button stays enabled. Clicking it hits `if (!preview) return;` and silently does nothing, with no message, until the user previews again. The window is the create, fsync and readback time, which is short, so this is unlikely but reachable. The import handler has the same pattern, reachable only when Cancel lands after the importer's final check. No data is written, lost or overwritten; main still holds the newer preview.
**Suggested fix:** Clear only the preview that this request saved or imported, for example `if (this.exportPreview === preview) this.exportPreview = null;` (and the same for `importPreview`), or move the reset into the `current()` branch of `completed()`. Optionally extend the existing "survives a refresh that lands first" view test to build a second preview before the late reply resolves and assert that Save still works. Nothing would be lost.
**Resolution:**
