# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-50 [P3] open - Welcome step 1 and step 2 status lines are not announced to screen readers

**File:** src/standalone/app.html:138
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The F-49 repair writes "Choose your notes folder first (step 1)." into `#welcome-access-status`, and `#welcome-folder-status` (app.html:135) also changes live as the folder is chosen. Neither paragraph has `role="status"` or `aria-live`, unlike the step 3 and step 4 status lines (app.html:144,150) and every other panel status in the window. Focus stays on the step 2 button, so a keyboard or screen reader user who presses it before choosing a folder still gets no feedback, which is the problem F-49 set out to fix. AGENTS.md says simplicity never removes accessibility. No safeguard is affected.
**Suggested fix:** Add `role="status" aria-live="polite"` to `#welcome-access-status` (and `#welcome-folder-status`), matching the other welcome status lines. Markup only; no requirement would be lost.
**Resolution:**
