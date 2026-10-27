# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-15 [P3] open - Storage panel copy still says read access is never restored

**File:** src/standalone/app.html:48
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The "Desktop storage and writing" panel still reads "Read access and PDF consent are never restored or imported." Feature 63 now lets the user explicitly remember read access and restore it with Continue, and the same window's Remember help text says so. Two statements about the same privacy boundary contradict each other in the same window. `docs/desktop.md:165` ("read grants ... are never restored automatically") is technically still accurate but would read better with a pointer to Remembered access. No behavior or boundary is wrong; only the user-facing copy is stale.
**Suggested fix:** Change app.html:48 to something like "PDF consent is never restored or imported; read access is restored only from saved access you chose to remember." Optionally add "(see Remembered access)" after the docs/desktop.md:165 sentence. No requirement would be lost.
**Resolution:**
