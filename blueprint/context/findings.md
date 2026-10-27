# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-27 [P3] open - Coverage text calls notes left out of the index "could not be read"

**File:** src/standalone/collections.ts:67
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The collections coverage ("... ${omittedFiles} notes could not be read") and the summary-note coverage at `knowledge.ts:61` ("... ${omittedFiles} could not be read") replace "omitted from indexing". `omittedFiles` is `availableFiles - indexed entries` (`src/vault/index-coverage.ts:23`), which counts notes left out by the index limits, not unreadable files. Unreadable notes are counted separately as `invalid`, which `intake.ts:54` shows as "unreadable" next to "skipped" for the same number. The main window also says "skipped" (`renderer.ts:178`). So the same count gets two different names, and "could not be read" points the user at broken files rather than at the index limits. The rule to keep the same meaning is not met. No safeguard is affected.
**Suggested fix:** Use the same word as the main window and capture screen, for example "${omittedFiles} skipped (not indexed)" in `collections.ts:67` and `knowledge.ts:61`. No requirement would be lost.
**Resolution:**

### F-28 [P3] open - Shared messages shown in the desktop still use renamed labels and repeat the new advice

**File:** src/standalone/ask.ts:88
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The desktop Ask shows `hybridCoverageText` from the shared `src/retrieval/semantic.ts:18`, which wraps the reason as "Keyword fallback: <reason> Choose a compatible downloaded embedding model in settings, or use Keyword. ...". 64b rewrote the desktop reasons (`ask.ts:88` and `ask.ts:92`) to carry their own next action ("... Choose one under Optional local AI, or search by keywords."). The window now gives the advice twice, in two vocabularies, and names "Keyword", an option renamed "Keywords" in this feature. The shared `src/vault/collection-record.ts:55` error "A passage is no longer locatable in the current index. Retrieve evidence again." is still forwarded verbatim from `collections.ts:109,124` into the Ask status when a collection preview fails, so it names the removed "Retrieve evidence" button. `docs/desktop.md:210` also still says "Keyword works without any model". The shared files are out of scope for 64b, and these paths are uncommon. The spec's scan covered only `src/standalone` literals, so it missed this stale text, which users can still see.
**Suggested fix:** Keep the desktop reasons to the cause only ("No search model chosen." and "The search model is not available or does not work.") so the shared sentence supplies the single next action. Or, when shared wording is next in scope, update `semantic.ts:18` and `collection-record.ts:55` to the new labels. Change the docs to "Keywords works without any model". No requirement would be lost.
**Resolution:**

### F-29 [P3] open - Empty collections message says none exist when the scope hides some

**File:** src/standalone/research-view.ts:95
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The empty state changed from "No matching collections." to "No saved collections yet. In Ask, ... save them as a collection." `collections.ts` lists only collections whose recorded scope and project identity match the chosen "Collections from" value, so a user who has saved collections under the other scope sees "yet" and is sent to create a new one. The coverage line above it does say "Collections from other scopes are not shown". So the risk is a misleading next action, not data loss.
**Suggested fix:** Say, for example, "No saved collections for this choice. Try the other Collections from option, or in Ask choose Find passages, pick passages and save them as a collection." No requirement would be lost.
**Resolution:**
