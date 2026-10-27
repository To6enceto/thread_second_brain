# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-22 [P3] open - Two buttons now share the accessible name "Refresh"

**File:** src/standalone/app.html:58
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `storage-refresh` was renamed from "Refresh desktop state" to "Refresh", the same accessible name as the notes `refresh` button at app.html:112. Both are visible at the same time when Saving notes is open (`64a-saving-dark.png`). A screen-reader button list shows two "Refresh" entries with no context. Several rewritten messages tell the user to "Choose Refresh" without saying which one (`evidence-index.ts:53,58,68,81`, `vault-reader.ts:78`, and the cancel-index status in `renderer.ts:264`). All of these mean the notes Refresh; the Saving notes Refresh only reloads saving status. The behavior is unchanged, but the distinct name was lost and the next action became ambiguous.
**Suggested fix:** Give `storage-refresh` a distinct visible label or `aria-label`, for example "Refresh saving status". Optionally say "choose Refresh next to Your notes" in the index messages. No requirement would be lost.
**Resolution:**

### F-23 [P3] open - AI setup messages lost exact limits

**File:** src/standalone/model-setup.ts:31
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The discovery result says models were skipped because they are "online-only, unsuitable or too large to check". In `src/intelligence/ollama.ts:82-96`, `omitted` counts remote models, models that fail inspection, and every entry beyond the first 40 listed (`tags.models.slice(0, 40)`). No size check exists, so "too large" names a cause that does not exist and drops the 40-model limit (the plugin text says "beyond the 40-model limit"). A user with more than 40 models whose model is missing would look for the wrong fix. The spec says "Keep exact numbers and limits". (2) `local-ai.ts:14` replaces "Use an HTTP loopback URL ..., without paths or credentials" with "... with nothing after the port". `localEndpoint` also rejects `https:` and `user@` credentials, which the new text no longer mentions. Neither change affects the loopback-only safeguard itself.
**Suggested fix:** Say, for example, "... skipped because they are online-only, could not be checked, or come after the first 40 listed"; for the address, add "starting with http:// and without a user name". No requirement would be lost.
**Resolution:**

### F-24 [P3] open - Save-history text understates that a full history blocks saving

**File:** src/standalone/app.html:70
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The text now says Thread "keeps at most five copies and twenty save records, and stops adding new ones when full." Save receipts are never pruned (`saves.ts:55,57,84`), and `saves.ts:25` refuses every new-note save once 20 records exist. The base said "full history blocks new entries". The new wording reads as if saving continues without a record, so it understates the consequence of the limit. The numbers are unchanged and no write safeguard is weakened.
**Suggested fix:** Say, for example, "Thread keeps at most five history copies and twenty save records; when either is full, it does not copy or save any more." No requirement would be lost.
**Resolution:**

### F-25 [P3] open - Some in-scope text keeps the old wording

**File:** src/standalone/saved-access-view.ts:56
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The saved-access card still lists "Embedding model: <name>". The control it refers to was renamed "Search model (optional)", and the model-setup messages now say "search model". This is a stale reference to a renamed label in `src/standalone`, which step 3 was meant to remove. (2) `evidence-index.ts:155` still appends "Markdown enumeration is incomplete; ... Stable-ID uniqueness is unproven and identity-dependent output cannot be reused." to the search coverage text. The renderer's equivalent coverage sentence was rewritten in plain language, so the same window now states one fact in two styles. The text is desktop-owned, not shared plugin text, and it sits inside the "What this search covered" Details. No meaning is wrong.
**Suggested fix:** Change the card line to "Search model: <name>". Reuse the renderer's sentence ("Not every note could be listed, so these counts cover only the notes Thread found, and saved results that depend on note IDs are not reused.") in `evidence-index.ts:155`. No requirement would be lost.
**Resolution:**

### F-26 [P3] open - Changed test patterns keep alternatives that can no longer match

**File:** src/standalone/vault-reader.test.ts:25
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** This is the same pattern as F-21, in other files. `vault-reader.test.ts:25` accepts `/not allowed to read|outside/`, but `VaultReader.read` now throws only "Thread is not allowed to read this note...". `storage.test.ts:75` accepts `/changed|out of date/`, but after `release()` both the inspect and enable phases fail through the epoch check with "The check is out of date." `projects.test.ts:82` accepts `/canceled|stopped/`, where `assertCurrent` now throws "...reading was stopped...". In each case the old alternative cannot match, and keeping it lets an unrelated failure satisfy the assertion. The assertions still pass for the right reason today.
**Suggested fix:** Narrow the three patterns to `/not allowed to read/`, `/out of date/` and `/stopped/`. No requirement would be lost.
**Resolution:**
