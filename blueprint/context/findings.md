# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-39 [P3] open - Review queue headings read as if pending items are hidden

**File:** src/standalone/reviews-view.ts:84
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The category heading changed from "<kind> (N shown; M candidates)" to "<kind> (N shown of M)". `rows` holds only pending items. M is `queue.candidateCounts[kind]`, which comes from `queue.counts` before disposition (`src/vault/review-events.ts:87`), so it also counts items already reviewed or snoozed. Those items appear under "Already handled". For example, with one pending item and one handled item, the heading says "1 shown of 2", which suggests one pending item is hidden by a limit when none is. The plugin keeps the two counts apart ("N pending shown of P; M total candidates", `src/ui/review-queue-modal.ts:31`). This is user-visible drift in a count; no safeguard or behavior is affected.
**Suggested fix:** Text-only, for example `${rows.length} to review; ${candidateCounts} found, including already handled`, or keep the old separation: `${rows.length} shown; ${candidateCounts} found`. No requirement would be lost.
**Resolution:**

### F-40 [P3] open - Portability intro says Thread never overwrites or restores notes, without limiting it to portability

**File:** src/standalone/app.html:141
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The repaired intro says "Thread never overwrites or restores notes, and never lets itself read a new folder unless you allow it." In the portability panel this is true of checkpoints. Taken literally, it is not true of Thread as a whole: after the user approves, Review changes replaces note text (`VaultWriter.replace` via `changes.ts:108`), undo writes the original back, and "Restore reviewed recovery" restores originals. The old wording ("Nothing is overwritten, restored or granted automatically.") did not make a global claim. The brief asks that "no overwrite or restore" wording is not overstated. The panel context limits the risk, so this is P3.
**Suggested fix:** Limit the claim to portability, for example: "Exporting, comparing and importing never overwrite or restore your notes, and an imported folder stays unread until you allow it." No requirement would be lost.
**Resolution:**

### F-41 [P3] open - Import preview line still uses the old technical wording

**File:** src/standalone/portability-view.ts:90
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `portability-view.ts` is in scope, and the import field above it was renamed to "New folder for the copies (at the top, not one Thread may read)". The preview summary below it still reads "${n} files. ${m} uncertain copies verified for adoption. Existing files are never overwritten and IDs are never rewritten. The imported folder stays outside read access until you grant it explicitly; links and PDF original paths may need manual review." So the same flow mixes the old "read access/grant" vocabulary with the new "folders Thread may read" one, and "verified for adoption" is unexplained. It also lacks the singular/plural choice added to the export preview ("1 files"). The meaning is correct and no safeguard is misstated.
**Suggested fix:** Rewrite in the same style and keep every safeguard, for example: "${n} files. ${m} copies from the interrupted import match and will be kept. Existing files are never overwritten and IDs are never changed. Thread cannot read the new folder until you add it to Folders Thread may read; links and PDF paths may need checking by hand." No requirement would be lost.
**Resolution:**

### F-42 [P3] open - Two change-history errors name the wrong thing

**File:** src/standalone/changes.ts:48
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "Thread cannot use this saved review. Keep its history as it is." replaces "Unsupported guarded review context." It fires for any schema-version-2 change context, and those come from both Project reviews (`reviews.ts:216,284`) and Research summary/knowledge notes (`knowledge.ts:123`). A user whose summary-note change is unusable is told about a "saved review". Separately, `change-journal.ts:7` now says "Thread's change history is from an unknown version." The check fails for any unexpected key set, including a damaged file, not only another version. Both messages keep the correct next action ("keep it as it is"), so no safeguard is affected.
**Suggested fix:** Use "Thread cannot use this saved change. Keep its history as it is." at `changes.ts:48`, matching lines 46-47, and update the `/saved review/` expectation in `changes.test.ts`. At `change-journal.ts:7`, use for example "Thread does not recognize its change history. Keep it as it is and restore a known backup." No requirement would be lost.
**Resolution:**
