# Feature: Plain-language Ask, capture, research and PDFs

**From build-plan:** feature 64b
**Build attempt:** 1
**Status:** verified
**Branch:** feature/plain-language-ask-capture-research-and-pdfs
**Carries:** F-22, F-23, F-24, F-25, F-26 (P3, from feature 64a)

## Goal

Rewrite the Ask workbench and the Capture and research panel (capture, saved clips,
collections, summary notes, PDFs) and the errors they show in the same everyday style
as 64a, without changing any behavior or safeguard, and close the five carried P3s.

## In scope

- `app.html` Ask and research panel text; `ask-view.ts`, `research-view.ts` messages and
  labels; errors in `ask.ts`, `intake.ts`, `collections.ts`, `knowledge.ts`, `pdf.ts`,
  `pdf-assets.ts`, `text-import.ts` and the PDF messages in `vault-reader.ts` and
  `evidence-index.ts`.
- Renamed labels: "Retrieve evidence" becomes **Find passages** (every reference updated,
  including earlier main-window messages); "Hybrid (local embeddings)" becomes
  **Keywords and meaning (search model)**; "Knowledge synthesis" becomes **Write a
  summary note**; research buttons keep distinct names ("Refresh research",
  "Cancel research").
- Kept on purpose: evidence-contract terms ("Recorded statement", "AI interpretation",
  "Proposed action"), the PDF buttons "Grant PDF read" / "Revoke PDF read", and every
  number and limit.
- Carried fixes: F-22 distinct "Refresh saving status" name; F-23 exact discovery limit
  (first 40 listed) and address rules (http://, no user name); F-24 full history blocks
  saving; F-25 "Search model" on the saved-access card and plain search-coverage text;
  F-26 narrowed test patterns.
- `docs/desktop.md` updated to the renamed labels.

## Out of scope

- Decisions, actions, reviews, changes and portability panels (64c), except
  cross-references to renamed labels. Plugin and shared files. Any behavior change.

## Build loop

Continuous Mode, self-review and Verify after each step, checkpoint commits disabled.
Wording about privacy, saving and AI must keep its exact meaning, so actual Electron
acceptance and a fresh passing independent review are required. At most two repairs
per failing check or finding.

## Build steps

- [x] 1. Rewrite the Ask and research panel markup and view messages, rename the labels
  above with all references, and apply the carried F-22 to F-25 text fixes. Done when all
  previous element IDs remain, focused view tests pass with updated expectations, and
  Verify passes.
- [x] 2. Rewrite the main-process errors listed above, narrow the F-26 patterns, update
  tests. Done when a scan finds no stale renamed label in `src/standalone` or
  `docs/desktop.md`, and Verify passes.
- [x] 3. Update `docs/desktop.md` and collect native evidence in the actual window:
  Ask with Find passages, choices and a real local answer; capture of a typed thought to
  preview; PDF allow, extract and preview; collections and summary-note screens open with
  the new wording; light and dark screenshots. Done when evidence is recorded and Verify
  passes.

## Evidence

- Verify (`npm run verify`) passed after every step: 534 tests, 0 failed, both builds.
- All app.html element IDs unchanged. Research labels made distinct from the main
  window's ("Project for this note (optional)", "Project for this clip", "Summary note
  title") so no two controls share an accessible name.
- Scan of `src/standalone` and `docs/desktop.md`: no remaining "Retrieve evidence",
  "Hybrid (local embeddings)", "Knowledge synthesis", "Research workflow", "Collection
  scope", "Search budget", "Answer scope", "Refresh research context", "Cancel research
  work" or "Optional embedding" label references.
- Changed test expectations match the exact new messages; F-26 patterns narrowed.
- Native acceptance in the actual window (`profile-63`, `vault-63`, project Ollama
  `qwen3:4b-instruct`), evidence `.thread-local/desktop-63-65/evidence/64b-*`:
  `64b-flows-3.json` shows Find passages ("Passages ready. Check what the AI will see,
  then ask it."), the renamed context sections, a real local answer ("Answer ready.
  Compare each point with the passages it cites."), each research screen's new summary
  line (capture, clips, collections, summary note, PDFs), Grant PDF read, reading the PDF
  ("Text ready. Check each page, then preview the new note.") and the plain refusal to
  preview without a Sources folder. `64b-research-light.png` and `64b-ask-dark.png` show
  both themes.
- Carried F-22 to F-26 repaired as recorded in the ledger.

## Writing rules

Same as 64a: what happened and what to do next; "find passages" (retrieve evidence),
"notes Thread may read" (permitted), "search model" (embedding model), "saved
clip"/"new source note"; keep numbers and limits; ASCII punctuation.

## Testing

Focused tests next to sources; `npm run verify` after each step; native acceptance per
step 3. No plugin or shared file changes, so no Obsidian regression is needed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4962,"specSha256":"2b4ccc0ab2a0d840cf1ef2faebee8a94456eb8e4b393aebdae58417cec7cae7e","branch":"refs/heads/feature/plain-language-ask-capture-research-and-pdfs","head":"701e2d57c6044588fe895063d5911e665ec58737","baseRef":"refs/heads/main","baseCommit":"4a648b5f510a851b2874d8dd0fb6aac66f29fc7f","sourceTree":"0e073dfffb53c78b50f41307eb9ef1da927e2c63","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 64b/F-22 [P3] closed - Two buttons now share the accessible name "Refresh"

**File:** src/standalone/app.html:58
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `storage-refresh` was renamed from "Refresh desktop state" to "Refresh", the same accessible name as the notes `refresh` button at app.html:112. Both are visible at the same time when Saving notes is open (`64a-saving-dark.png`). A screen-reader button list shows two "Refresh" entries with no context. Several rewritten messages tell the user to "Choose Refresh" without saying which one (`evidence-index.ts:53,58,68,81`, `vault-reader.ts:78`, and the cancel-index status in `renderer.ts:264`). All of these mean the notes Refresh; the Saving notes Refresh only reloads saving status. The behavior is unchanged, but the distinct name was lost and the next action became ambiguous.
**Suggested fix:** Give `storage-refresh` a distinct visible label or `aria-label`, for example "Refresh saving status". Optionally say "choose Refresh next to Your notes" in the index messages. No requirement would be lost.
**Resolution:** Repaired in 64b: `storage-refresh` is now "Refresh saving status", so the notes Refresh is the only button named "Refresh"; research buttons are "Refresh research" and "Cancel research". Re-review 2026-10-27 (independent, fresh subagent, 701e2d5): confirmed app.html:58 reads "Refresh saving status" and app.html:112 is the only control named exactly "Refresh" in src/standalone; research messages name "Refresh research" explicitly. No new defect. Closed.

### 64b/F-23 [P3] closed - AI setup messages lost exact limits

**File:** src/standalone/model-setup.ts:31
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The discovery result says models were skipped because they are "online-only, unsuitable or too large to check". In `src/intelligence/ollama.ts:82-96`, `omitted` counts remote models, models that fail inspection, and every entry beyond the first 40 listed (`tags.models.slice(0, 40)`). No size check exists, so "too large" names a cause that does not exist and drops the 40-model limit (the plugin text says "beyond the 40-model limit"). A user with more than 40 models whose model is missing would look for the wrong fix. The spec says "Keep exact numbers and limits". (2) `local-ai.ts:14` replaces "Use an HTTP loopback URL ..., without paths or credentials" with "... with nothing after the port". `localEndpoint` also rejects `https:` and `user@` credentials, which the new text no longer mentions. Neither change affects the loopback-only safeguard itself.
**Suggested fix:** Say, for example, "... skipped because they are online-only, could not be checked, or come after the first 40 listed"; for the address, add "starting with http:// and without a user name". No requirement would be lost.
**Resolution:** Repaired in 64b: discovery now says models were skipped because they are "online-only, could not be checked, or come after the first 40 listed", and the address error says "starting with http://, without a user name and with nothing after the port". Re-review 2026-10-27 (independent, fresh subagent, 701e2d5): model-setup.ts:31 and local-ai.ts:14 match the `slice(0, 40)` limit in ollama.ts:82 and the http-only, no-credentials, no-path rules. No new defect. Closed.

### 64b/F-24 [P3] closed - Save-history text understates that a full history blocks saving

**File:** src/standalone/app.html:70
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The text now says Thread "keeps at most five copies and twenty save records, and stops adding new ones when full." Save receipts are never pruned (`saves.ts:55,57,84`), and `saves.ts:25` refuses every new-note save once 20 records exist. The base said "full history blocks new entries". The new wording reads as if saving continues without a record, so it understates the consequence of the limit. The numbers are unchanged and no write safeguard is weakened.
**Suggested fix:** Say, for example, "Thread keeps at most five history copies and twenty save records; when either is full, it does not copy or save any more." No requirement would be lost.
**Resolution:** Repaired in 64b: the history note says "when either is full, it does not copy or save any more". Re-review 2026-10-27 (independent, fresh subagent, 701e2d5): app.html:70 now states that a full history stops copying and saving; numbers unchanged. No new defect. Closed.

### 64b/F-25 [P3] closed - Some in-scope text keeps the old wording

**File:** src/standalone/saved-access-view.ts:56
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The saved-access card still lists "Embedding model: <name>". The control it refers to was renamed "Search model (optional)", and the model-setup messages now say "search model". This is a stale reference to a renamed label in `src/standalone`, which step 3 was meant to remove. (2) `evidence-index.ts:155` still appends "Markdown enumeration is incomplete; ... Stable-ID uniqueness is unproven and identity-dependent output cannot be reused." to the search coverage text. The renderer's equivalent coverage sentence was rewritten in plain language, so the same window now states one fact in two styles. The text is desktop-owned, not shared plugin text, and it sits inside the "What this search covered" Details. No meaning is wrong.
**Suggested fix:** Change the card line to "Search model: <name>". Reuse the renderer's sentence ("Not every note could be listed, so these counts cover only the notes Thread found, and saved results that depend on note IDs are not reused.") in `evidence-index.ts:155`. No requirement would be lost.
**Resolution:** Repaired in 64b: the saved-access card says "Search model:", and the search coverage text reuses the plain sentence from the main coverage details. Re-review 2026-10-27 (independent, fresh subagent, 701e2d5): saved-access-view.ts:56 says "Search model:"; evidence-index.ts:155 uses the plain sentence and keeps the same meaning (incomplete listing, ID-dependent results not reused); evidence-index.test.ts asserts the new text. No new defect. Closed.

### 64b/F-26 [P3] closed - Changed test patterns keep alternatives that can no longer match

**File:** src/standalone/vault-reader.test.ts:25
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** This is the same pattern as 64b/F-21, in other files. `vault-reader.test.ts:25` accepts `/not allowed to read|outside/`, but `VaultReader.read` now throws only "Thread is not allowed to read this note...". `storage.test.ts:75` accepts `/changed|out of date/`, but after `release()` both the inspect and enable phases fail through the epoch check with "The check is out of date." `projects.test.ts:82` accepts `/canceled|stopped/`, where `assertCurrent` now throws "...reading was stopped...". In each case the old alternative cannot match, and keeping it lets an unrelated failure satisfy the assertion. The assertions still pass for the right reason today.
**Suggested fix:** Narrow the three patterns to `/not allowed to read/`, `/out of date/` and `/stopped/`. No requirement would be lost.
**Resolution:** Repaired in 64b: the three patterns are narrowed to `/not allowed to read/`, `/out of date/` and `/stopped/`. Re-review 2026-10-27 (independent, fresh subagent, 701e2d5): confirmed at vault-reader.test.ts:25, storage.test.ts:75 and projects.test.ts:82; `npm run verify` passes 534/534. No new defect. Closed.

### 64b/F-27 [P3] open - Coverage text calls notes left out of the index "could not be read"

**File:** src/standalone/collections.ts:67
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The collections coverage ("... ${omittedFiles} notes could not be read") and the summary-note coverage at `knowledge.ts:61` ("... ${omittedFiles} could not be read") replace "omitted from indexing". `omittedFiles` is `availableFiles - indexed entries` (`src/vault/index-coverage.ts:23`), which counts notes left out by the index limits, not unreadable files. Unreadable notes are counted separately as `invalid`, which `intake.ts:54` shows as "unreadable" next to "skipped" for the same number. The main window also says "skipped" (`renderer.ts:178`). So the same count gets two different names, and "could not be read" points the user at broken files rather than at the index limits. The rule to keep the same meaning is not met. No safeguard is affected.
**Suggested fix:** Use the same word as the main window and capture screen, for example "${omittedFiles} skipped (not indexed)" in `collections.ts:67` and `knowledge.ts:61`. No requirement would be lost.
**Resolution:**

### 64b/F-28 [P3] open - Shared messages shown in the desktop still use renamed labels and repeat the new advice

**File:** src/standalone/ask.ts:88
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The desktop Ask shows `hybridCoverageText` from the shared `src/retrieval/semantic.ts:18`, which wraps the reason as "Keyword fallback: <reason> Choose a compatible downloaded embedding model in settings, or use Keyword. ...". 64b rewrote the desktop reasons (`ask.ts:88` and `ask.ts:92`) to carry their own next action ("... Choose one under Optional local AI, or search by keywords."). The window now gives the advice twice, in two vocabularies, and names "Keyword", an option renamed "Keywords" in this feature. The shared `src/vault/collection-record.ts:55` error "A passage is no longer locatable in the current index. Retrieve evidence again." is still forwarded verbatim from `collections.ts:109,124` into the Ask status when a collection preview fails, so it names the removed "Retrieve evidence" button. `docs/desktop.md:210` also still says "Keyword works without any model". The shared files are out of scope for 64b, and these paths are uncommon. The spec's scan covered only `src/standalone` literals, so it missed this stale text, which users can still see.
**Suggested fix:** Keep the desktop reasons to the cause only ("No search model chosen." and "The search model is not available or does not work.") so the shared sentence supplies the single next action. Or, when shared wording is next in scope, update `semantic.ts:18` and `collection-record.ts:55` to the new labels. Change the docs to "Keywords works without any model". No requirement would be lost.
**Resolution:**

### 64b/F-29 [P3] open - Empty collections message says none exist when the scope hides some

**File:** src/standalone/research-view.ts:95
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The empty state changed from "No matching collections." to "No saved collections yet. In Ask, ... save them as a collection." `collections.ts` lists only collections whose recorded scope and project identity match the chosen "Collections from" value, so a user who has saved collections under the other scope sees "yet" and is sent to create a new one. The coverage line above it does say "Collections from other scopes are not shown". So the risk is a misleading next action, not data loss.
**Suggested fix:** Say, for example, "No saved collections for this choice. Try the other Collections from option, or in Ask choose Find passages, pick passages and save them as a collection." No requirement would be lost.
**Resolution:**

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 701e2d57c6044588fe895063d5911e665ec58737
**Base commit:** 4a648b5f510a851b2874d8dd0fb6aac66f29fc7f
**Base ref:** main
**Spec hash:** 2b4ccc0ab2a0d840cf1ef2faebee8a94456eb8e4b393aebdae58417cec7cae7e
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T20:11:13Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T20:14:56Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `<base>..<target>` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`: pass (equals Target commit)
- `git merge-base HEAD main`: pass (equals Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (equals Spec hash)
- `git status --short`: pass (only blueprint/context/findings.md and blueprint/context/review.md differ, before and after Verify)
- `npm run verify`: pass (typecheck; 534 tests, 534 pass, 0 fail, 0 skipped, 0 todo; plugin production build and desktop build)
- `git diff 4a648b5..701e2d5` (full delta, 31 files): reviewed
- app.html element-ID comparison base vs target: pass (identical set, no duplicates)
- string-stripped code comparison of non-test src/standalone changes: pass (only string text and one singular/plural expression changed)
- stale-label scan of src/standalone and docs/desktop.md for the renamed labels: pass for desktop-owned literals; shared-file text noted in F-28
- docs bold-label cross-check against src/standalone UI text: pass (only section headings and templated labels unmatched)

## Evidence

- Delta touches only src/standalone (24 files), docs/desktop.md and blueprint/context/current-feature.md; no plugin or shared file changed.
- .thread-local/desktop-63-65/evidence/64b-flows-3.json: Find passages status, renamed context labels, real local answer status, plain summary lines for capture, clips, collections, summary note and PDFs, PDF text-ready status and the Sources-folder refusal; diff against 64b-flows.json shows only the intended coverage-text rewrites.
- .thread-local/desktop-63-65/evidence/64b-research-light.png: Capture and research panel in light theme with "Refresh research", "Cancel research", "Revoke PDF read: ..." and the new PDF text.
- .thread-local/desktop-63-65/evidence/64b-ask-dark.png: Ask panel in dark theme with "Search in", "Search by", "How many passages", "Filters" and "Find passages".
- Changed test expectations are equal or narrower than before (for example `/offered/` to `/from the list/`, `/Review/` to `/Check the chosen clip again/`, F-26 patterns).
- Kept on purpose and confirmed: "AI interpretation - notes unchanged" heading, "Grant PDF read" / "Revoke PDF read" buttons, the "Grant at most N PDFs" limit message, and all numbers and limits (1000, 20/35/50, six turns, 4000/24000, 16000, 2 MiB, 16 MiB, 200 PDFs, 1 MB journal, five sources, 100-character names).

## Findings

- F-22, F-23, F-24, F-25, F-26: closed (carried P3 repairs confirmed)
- F-27 [P3] open: coverage text calls index-omitted notes "could not be read"
- F-28 [P3] open: shared messages in the desktop still use renamed labels and repeat the new advice
- F-29 [P3] open: empty collections message says none exist when the scope hides some

## Remaining risk

- Electron, Xvfb and Ollama were not launched by this reviewer; native behavior relies on the builder's recorded evidence. Check was not required.
- The recorded evidence does not show a typed-thought capture reaching preview, a summary-note draft written by the AI, or extracted PDF page text; those paths are covered only by focused tests and code reading.
- Shared plugin text (src/retrieval/semantic.ts, src/vault/collection-record.ts) still uses old vocabulary in rare desktop paths (F-28).
- The reviewer did not write blueprint/.state/run.json dashboard activity because the handoff forbade repository writes.
