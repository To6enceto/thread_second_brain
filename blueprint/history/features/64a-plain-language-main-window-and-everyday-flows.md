# Feature: Plain-language main window and everyday flows

**From build-plan:** feature 64a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/plain-language-main-window-and-everyday-flows
**Carries:** F-15 (storage panel copy) from feature 63

## Goal

Make the desktop window's main screen and everyday flows understandable without
technical knowledge: the most-used actions first, everyday wording, and technical
detail moved behind expandable Details, without changing any behavior or safeguard.

## In scope

- **Layout (projects area):** project picker, then a primary row with **Resume project**,
  **Ask your vault** and **Capture and research**, then **Project home**; the other
  tools (Decisions and questions, Actions and wrap-up, Project reviews, Review changes,
  Project portability) move into a **More tools** disclosure. Element IDs, order of
  focus inside each group and every action stay; More tools is a native `details`
  element reachable by keyboard.
- **Wording, sidebar:** intro, saved-access card, read access (labels "Folders Thread
  may read" and "Keep private"), Remember help, the saving setup (section renamed
  "Saving notes"; plain steps first, technical notes in a nested Details), local AI
  setup (labels "Ollama address", "Model", "Search model (optional)", buttons "Use
  this model", "Test connection", "Cancel").
- **Wording, library:** project mapping ("Where are your projects?"), note filter
  ("Find a note by name"), search ("Search inside your notes", button "Search"),
  "Stop reading notes" (was Cancel indexing), the visible coverage summary, and
  "What Thread read" Details holding the existing shared coverage text unchanged.
- **Messages:** status and feedback text in `renderer.ts`, `model-setup.ts`,
  `storage-view.ts`, `saved-access-view.ts`, and the index events in
  `evidence-index.ts`.
- **Common errors** these flows show, rewritten plainly with the same meaning and
  next action: `security.ts`, the vault/Markdown messages in `vault-reader.ts`,
  `local-ai.ts`, `projects.ts`, `evidence-index.ts`, `storage.ts`, `compatibility.ts`,
  `remembered-access.ts`.
- **Cross-references** anywhere in desktop code or docs to a renamed label
  (for example "Desktop storage", "Enable desktop writing", "Apply AI settings",
  "Search evidence") updated to the new names.
- Fix carried F-15: the saving section no longer says read access is never restored.
- Docs: `docs/desktop.md` updated to the new labels and wording.

## Out of scope

- Panel internals of Ask, capture/research, PDFs (64b) and decisions, actions, reviews,
  changes, portability (64c), except cross-references to renamed labels.
- Product terms that are part of the evidence contract: "Recorded statement",
  "AI interpretation", "Proposed action", source chips.
- Shared plugin text (`src/vault/index-coverage.ts`, plugin UI). No plugin change.
- Any change to permissions, limits, invalidation, validation, write safety or IPC.

## Build loop

Continuous Mode builds these steps serially with self-review and Verify after each.
Step checkpoint commits are disabled. The change is broad and rewrites privacy and
safety wording, so actual Electron acceptance (isolated profile, synthetic vault,
light and dark) and a fresh passing independent review are required before archive
and local merge. At most two repairs per failing check or finding.

## Build steps

- [x] 1. Rework `app.html` (layout, sidebar, library wording, Details) and `styles.css`
  (More tools group), fix F-15. Done when every previous element ID still exists exactly
  once, all previous buttons remain, and Verify passes.
- [x] 2. Rewrite renderer, model setup, storage view, saved-access view and index event
  messages; update tests that assert them. Done when focused tests pass with the new
  wording and Verify passes.
- [x] 3. Rewrite the common main-process errors and update cross-references to renamed
  labels in desktop code; update tests. Done when a scan finds no stale references to
  renamed labels in `src/standalone` or `docs/desktop.md`, and Verify passes.
- [x] 4. Update `docs/desktop.md` to the new labels and collect native evidence: light
  and dark screenshots of the main window and saving setup; keyboard Tab path into More
  tools and opening one tool; core flows unchanged (choose, approve, search, open a
  source, refresh projects, Resume with local AI, saved-access Continue, saving setup
  inspection and enable). Done when evidence is recorded and Verify passes.
- [x] 5. Repair independent-review findings F-16 to F-21: coverage completeness wording,
  the .obsidian privacy sentence, the project-choice note, the "plugin not installed"
  result, remaining in-scope messages and exact numbers, and narrowed test patterns.
  Done when focused tests pass, native flows and the keyboard path are re-recorded on the
  repaired build, and Verify passes.

## Evidence

- Verify (`npm run verify`) passed after every step: 534 tests each time, 0 failed, both builds.
- Step 1: all 145 previous element IDs remain exactly once (one new: `more-tools`); the
  same 55 buttons with the same IDs remain. F-15 fixed: the saving Details now say PDF
  permissions are never restored and read access returns only from saved access you chose.
- Step 3: a scan of `src/standalone` (code and HTML) and `docs/desktop.md` finds no
  reference to a renamed label. Test expectations were updated only where they matched
  rewritten text; no assertion was removed.
- Native acceptance in the actual Electron window (isolated profile `profile-63`,
  synthetic `vault-63`, project Ollama `qwen3:4b-instruct`), evidence
  `.thread-local/desktop-63-65/evidence/64a-*`:
  - `64a-flows.json`: saved-access Continue, search ("1 matching passage" wording fixed
    after this run), opening a source, Refresh projects, Resume with a real local AI
    briefing, saving check ("The Thread plugin is not installed in this settings folder"),
    Allow saving notes and Stop saving notes, all with the new wording. Main actions are
    Resume project, Ask your vault, Capture and research; five tools sit in More tools.
  - `64a-main-light.png`, `64a-main-dark.png`, `64a-saving-dark.png`: layout and Saving
    notes steps in both themes.
  - `64a-keyboard.json`: from Project home, Tab reaches the More tools summary, Enter
    opens it, Tab reaches Decisions and questions, Enter opens that panel.
- After step 5 (repaired build): `64a-flows-2.json` re-records every flow with the final
  wording ("1 matching passage", "every 2.5 seconds", "Changes take effect only when you
  approve"); `64a-keyboard-2.json` records each step (focus Project home, Tab to the More
  tools summary, Enter opens it, Tab to `open-records`, Enter opens the panel);
  `64a-copy-2.json` and `64a-coverage-3.json` show the repaired help, project note and
  coverage text ("1 other file skipped").
- Known out of scope, unchanged: the Resume briefing body ("Recorded context",
  "Not established in the available evidence", gap bullets) comes from the evidence
  contract and shared plugin text.

## Files / areas

`src/standalone/app.html`, `styles.css`, `renderer.ts`, `model-setup.ts`,
`storage-view.ts`, `saved-access-view.ts`, `evidence-index.ts`, `security.ts`,
`vault-reader.ts`, `local-ai.ts`, `projects.ts`, `storage.ts`, `compatibility.ts`,
`remembered-access.ts`, `saves.ts` and `ask-view.ts` (cross-references only), their
tests, `docs/desktop.md`.

## Data / contracts

No data, IPC or persisted format changes. Error classes and when they are thrown stay
the same; only message text changes. Tests that matched old text match the new text.

## Writing rules

- Say what happened and what to do next, in short everyday sentences.
- Prefer "notes folder" (vault), "folders Thread may read" (read roots), "keep
  private" (exclusions), "saving notes" (writing), "Ollama address" (endpoint),
  "passages" (evidence), "reading your notes" (indexing).
- Keep exact numbers and limits; move mechanism detail (descriptors, journals,
  revisions, hashes) behind Details or drop it from status lines.
- ASCII punctuation only.

## Testing

Focused tests next to sources; `npm run verify` after each step; native acceptance per
step 4. No plugin regression is needed because no shared or plugin file changes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8298,"specSha256":"c6b063353798ec6de7c0b044fe0e109d9f1f4ea2bd5f1d12848c024058228e7a","branch":"refs/heads/feature/plain-language-main-window-and-everyday-flows","head":"b0263e4dd58a87d2466cb7783413771ce7e82bf2","baseRef":"refs/heads/main","baseCommit":"751e04294e228e2407af1ba05e07e18a03f474d6","sourceTree":"97c9dd644cfc8353b35267f74575842aa2e4977d","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 64a/F-15 [P3] closed - Storage panel copy still says read access is never restored

**File:** src/standalone/app.html:48
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The "Desktop storage and writing" panel still reads "Read access and PDF consent are never restored or imported." Feature 63 now lets the user explicitly remember read access and restore it with Continue, and the same window's Remember help text says so. Two statements about the same privacy boundary contradict each other in the same window. `docs/desktop.md:165` ("read grants ... are never restored automatically") is technically still accurate but would read better with a pointer to Remembered access. No behavior or boundary is wrong; only the user-facing copy is stale.
**Suggested fix:** Change app.html:48 to something like "PDF consent is never restored or imported; read access is restored only from saved access you chose to remember." Optionally add "(see Remembered access)" after the docs/desktop.md:165 sentence. No requirement would be lost.
**Resolution:** Repaired in feature 64a step 1: the saving section text in `app.html` now says PDF permissions are never restored or imported, and read access returns only from saved access you chose to remember. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `src/standalone/app.html:60` now reads "PDF permissions are never restored or imported, and read access returns only from saved access you chose to remember." This matches `remembered-access.ts` (scope restored only after explicit Continue, PDF consent never saved) and the Remember help at app.html:44. The old contradictory sentence is gone and the repair introduced no new defect. `docs/desktop.md` still says read grants are "never restored automatically", which remains accurate. Closed.

### 64a/F-16 [P2] closed - Coverage details claim every allowed folder was checked when traversal was incomplete

**File:** src/standalone/renderer.ts:179
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The coverage text now prints "All allowed folders were checked." whenever `listing.limited` is false. `vault-reader.ts` (lines 166-189) sets `identityIncomplete` without `limited` when a directory cannot be opened, a symbolic link is skipped, or a path is invalid, so the claim is false in reachable states. In those states the same paragraph opens with "Not every note could be listed". The previous text ("Within the bounded listed scope.") made no completeness claim. The plan says this pass "removes no ... coverage report", and the spec requires the same meaning. This change overstates what Thread read in exactly the area the coverage report exists to make honest.
**Suggested fix:** Print "All allowed folders were checked." only when `!result.listing.limited && !result.listing.identityIncomplete`. When `identityIncomplete` is true and `limited` is false, use something like "Some folders or files could not be checked." No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the coverage sentence now says "Some folders or files could not be checked." when the listing is incomplete without hitting the limit, and "All allowed folders were checked." only when neither flag is set. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `src/standalone/renderer.ts:226` now selects `limited ? "Thread stopped at its listing limit..." : identityIncomplete ? "Some folders or files could not be checked." : "All allowed folders were checked."`, so the completeness claim appears only when neither flag is set and agrees with the paragraph's opening sentence. A string-masked diff confirms that no other logic changed. The incomplete branch has no unit test or native evidence (`64a-coverage-3.json` covers only the complete state); the code path itself is correct. Closed.

### 64a/F-17 [P2] closed - Read-access help says hidden folders such as .obsidian are never read

**File:** src/standalone/app.html:36
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The help under "Folders Thread may read" now says "Hidden folders such as .obsidian are never read." The Saving notes check (`vault-reader.ts` `pluginFiles`, line 110 onward) reads `<settings folder>/plugins/thread/manifest.json`, `data.json`, `changes.json` and `project-imports.json`, normally under `.obsidian`. The Details at app.html:61 say that history may contain earlier copies of notes. The previous wording ("Hidden folders are unavailable as note evidence.") was accurate. The new sentence overstates a privacy safeguard: it uses the single hidden folder Thread does read as its example. The brief explicitly forbids overstating a safeguard.
**Suggested fix:** Restore the precise meaning, for example "Hidden folders such as .obsidian are never read as notes. (Only the Saving notes check reads Thread's own plugin files there.)" No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the help now says hidden folders such as .obsidian are never read as notes, and that only the Saving notes check reads Thread's own plugin files there. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `src/standalone/app.html:36` now reads "Hidden folders such as .obsidian are never read as notes; only the Saving notes check reads Thread's own plugin files there." This matches `relativePath` (hidden segments refused for notes) and `VaultReader.pluginFiles` (only the four Thread plugin files, which are re-read by the same check before enable and owned saves). The safeguard is no longer overstated, and the repair introduced no new defect. Closed.

### 64a/F-18 [P3] closed - Project note implies saved access remembers the chosen project

**File:** src/standalone/app.html:110
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The text reads "Your project choice is not remembered unless you save access." `remembered-access.ts` stores only the folder, its identity, read scope, projects folder and AI settings (line 61). The selected project is never saved, so after Continue the user must still choose a project. The note promises persistence that does not exist. It does not affect privacy, but it misleads.
**Suggested fix:** Say, for example, "Your project choice is not remembered. Saved access remembers only the projects folder." No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the note now says the project choice is not remembered and saved access keeps only the projects folder. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `src/standalone/app.html:110` reads "Your project choice is not remembered; saved access keeps only the projects folder." This matches `accessState` in `remembered-access.ts`, which stores no selected project; `64a-copy-2.json` records the repaired text. The step-4 screenshots still show the old sentence because they predate the repair. Closed.

### 64a/F-19 [P3] closed - "Not installed" check result reassures without confirming the right settings folder

**File:** src/standalone/storage-view.ts:40
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** When no Thread plugin metadata is found, the result now says "That is fine: you can allow saving." The previous text stated only the fact. If the user typed the wrong settings folder, an installed plugin's unfinished changes or an incompatible plugin version would go undetected. The new sentence then tells the user it is safe to continue. The writer lock (an abstract socket keyed by vault identity) still protects against a compatible 0.4.2 plugin, so the effect is limited to missed plugin recovery or version checks.
**Suggested fix:** Keep the fact and add the condition, for example "The Thread plugin is not installed in this settings folder. If you use Thread in Obsidian, check that this is the right folder; otherwise you can allow saving." No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the result keeps the fact and adds "If you use Thread in Obsidian, check that this is the right folder; otherwise you can allow saving." Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `src/standalone/storage-view.ts:40` now states the fact and makes the reassurance conditional on the folder being correct, matching `docs/desktop.md` ("Inspecting the wrong configuration folder cannot certify another installation"). `64a-flows-2.json` records the repaired text in the native window. No new defect. Closed.

### 64a/F-20 [P3] closed - Some in-scope messages left unrewritten or made less exact

**File:** src/standalone/vault-reader.ts:119
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** (1) `vault-reader.ts:119` now says the plugin files "could not be read safely (missing or a link)". ENOENT (missing) is handled separately as absent, so this message fires for permission or other errors and names the wrong cause. (2) `renderer.ts:154` replaces "every 2.5 seconds" with "every few seconds", against the spec rule "Keep exact numbers and limits". (3) The spec lists `remembered-access.ts` errors as in scope, but they are unchanged ("Saved access has no read roots.", "Choose your vault folder.", "Map a named project folder...", while `projects.ts` now says "Enter a named projects folder"). `storage.ts:71` still throws "Desktop history unavailable." (4) `storage.ts` "Thread already keeps five copies..." dropped its next action. None of these affects behavior.
**Suggested fix:** Say "could not be read safely (not an ordinary file, a link, or permission denied)"; restore "every 2.5 seconds"; rewrite the `remembered-access.ts` and `storage.ts:71` messages in the same style; keep a next action on the five-copies message. No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the plugin-file message names "not an ordinary file, a link, or not permitted"; the source note restores "every 2.5 seconds"; all `remembered-access.ts` errors and `storage.ts` "Desktop history unavailable." are rewritten in the same style; the five-copies message keeps a next action. Singular/plural counts fixed in search and coverage text. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): confirmed at `vault-reader.ts:120`, `renderer.ts:209` ("every 2.5 seconds", also in `64a-flows-2.json`), `remembered-access.ts:15-37,56-75`, `storage.ts:71` and `storage.ts:133`. The five-copies message now matches the base's next action ("keep Thread's profile as it is"). The plural ternaries are correct. The four points are resolved. The other leftover wording found in this pass is tracked separately as 64a/F-25. Closed.

### 64a/F-21 [P3] closed - Changed test expectations accept a message the assertions cannot reach

**File:** src/standalone/changes.test.ts:33
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** `changes.test.ts:33`, `:35` and `:116` changed `/preview changed/` to `/preview changed|out of date/`. In each case `DesktopChanges.approved` (`changes.ts:168`) throws "Exact change preview changed" first. "Out of date" exists only in storage compatibility errors. The extra branch is unreachable, and it widens the assertion so that a storage-gate failure would also pass where the change-preview gate is under test. `ask.test.ts:270` (`/pending|unfinished/`) is similarly broad. The assertions still pass for the right reason today.
**Suggested fix:** Revert the three `changes.test.ts` patterns to `/preview changed/` (or `/Exact change preview changed/`) and narrow `ask.test.ts:270` to the exact expected message. No requirement would be lost.
**Resolution:** Repaired in 64a step 5: the three `changes.test.ts` patterns are back to `/preview changed/` and `ask.test.ts` matches `/resolve unfinished saves/`. Re-reviewed 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests): `git diff 751e042..b0263e4 -- src/standalone/changes.test.ts` now shows only the two intended pattern changes (`/unfinished changes/`, `/unfinished saves/`), both matching the thrown messages in `storage.ts:93,107`. `ask.test.ts:270` matches `/resolve unfinished saves/`, the exact phrase from `saves.ts:24`. The original defect is gone. The same pattern in other test files is tracked as 64a/F-26. Closed.

### 64a/F-22 [P3] open - Two buttons now share the accessible name "Refresh"

**File:** src/standalone/app.html:58
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `storage-refresh` was renamed from "Refresh desktop state" to "Refresh", the same accessible name as the notes `refresh` button at app.html:112. Both are visible at the same time when Saving notes is open (`64a-saving-dark.png`). A screen-reader button list shows two "Refresh" entries with no context. Several rewritten messages tell the user to "Choose Refresh" without saying which one (`evidence-index.ts:53,58,68,81`, `vault-reader.ts:78`, and the cancel-index status in `renderer.ts:264`). All of these mean the notes Refresh; the Saving notes Refresh only reloads saving status. The behavior is unchanged, but the distinct name was lost and the next action became ambiguous.
**Suggested fix:** Give `storage-refresh` a distinct visible label or `aria-label`, for example "Refresh saving status". Optionally say "choose Refresh next to Your notes" in the index messages. No requirement would be lost.
**Resolution:**

### 64a/F-23 [P3] open - AI setup messages lost exact limits

**File:** src/standalone/model-setup.ts:31
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The discovery result says models were skipped because they are "online-only, unsuitable or too large to check". In `src/intelligence/ollama.ts:82-96`, `omitted` counts remote models, models that fail inspection, and every entry beyond the first 40 listed (`tags.models.slice(0, 40)`). No size check exists, so "too large" names a cause that does not exist and drops the 40-model limit (the plugin text says "beyond the 40-model limit"). A user with more than 40 models whose model is missing would look for the wrong fix. The spec says "Keep exact numbers and limits". (2) `local-ai.ts:14` replaces "Use an HTTP loopback URL ..., without paths or credentials" with "... with nothing after the port". `localEndpoint` also rejects `https:` and `user@` credentials, which the new text no longer mentions. Neither change affects the loopback-only safeguard itself.
**Suggested fix:** Say, for example, "... skipped because they are online-only, could not be checked, or come after the first 40 listed"; for the address, add "starting with http:// and without a user name". No requirement would be lost.
**Resolution:**

### 64a/F-24 [P3] open - Save-history text understates that a full history blocks saving

**File:** src/standalone/app.html:70
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The text now says Thread "keeps at most five copies and twenty save records, and stops adding new ones when full." Save receipts are never pruned (`saves.ts:55,57,84`), and `saves.ts:25` refuses every new-note save once 20 records exist. The base said "full history blocks new entries". The new wording reads as if saving continues without a record, so it understates the consequence of the limit. The numbers are unchanged and no write safeguard is weakened.
**Suggested fix:** Say, for example, "Thread keeps at most five history copies and twenty save records; when either is full, it does not copy or save any more." No requirement would be lost.
**Resolution:**

### 64a/F-25 [P3] open - Some in-scope text keeps the old wording

**File:** src/standalone/saved-access-view.ts:56
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** (1) The saved-access card still lists "Embedding model: <name>". The control it refers to was renamed "Search model (optional)", and the model-setup messages now say "search model". This is a stale reference to a renamed label in `src/standalone`, which step 3 was meant to remove. (2) `evidence-index.ts:155` still appends "Markdown enumeration is incomplete; ... Stable-ID uniqueness is unproven and identity-dependent output cannot be reused." to the search coverage text. The renderer's equivalent coverage sentence was rewritten in plain language, so the same window now states one fact in two styles. The text is desktop-owned, not shared plugin text, and it sits inside the "What this search covered" Details. No meaning is wrong.
**Suggested fix:** Change the card line to "Search model: <name>". Reuse the renderer's sentence ("Not every note could be listed, so these counts cover only the notes Thread found, and saved results that depend on note IDs are not reused.") in `evidence-index.ts:155`. No requirement would be lost.
**Resolution:**

### 64a/F-26 [P3] open - Changed test patterns keep alternatives that can no longer match

**File:** src/standalone/vault-reader.test.ts:25
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** This is the same pattern as 64a/F-21, in other files. `vault-reader.test.ts:25` accepts `/not allowed to read|outside/`, but `VaultReader.read` now throws only "Thread is not allowed to read this note...". `storage.test.ts:75` accepts `/changed|out of date/`, but after `release()` both the inspect and enable phases fail through the epoch check with "The check is out of date." `projects.test.ts:82` accepts `/canceled|stopped/`, where `assertCurrent` now throws "...reading was stopped...". In each case the old alternative cannot match, and keeping it lets an unrelated failure satisfy the assertion. The assertions still pass for the right reason today.
**Suggested fix:** Narrow the three patterns to `/not allowed to read/`, `/out of date/` and `/stopped/`. No requirement would be lost.
**Resolution:**

## Independent review

# Independent Review

**Status:** passed
**Target commit:** b0263e4dd58a87d2466cb7783413771ce7e82bf2
**Base commit:** 751e04294e228e2407af1ba05e07e18a03f474d6
**Base ref:** main
**Spec hash:** c6b063353798ec6de7c0b044fe0e109d9f1f4ea2bd5f1d12848c024058228e7a
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T19:47:49Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T19:52:51Z
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

- `git rev-parse HEAD`: pass (b0263e4dd58a87d2466cb7783413771ce7e82bf2 equals Target commit)
- `git merge-base main HEAD`: pass (751e04294e228e2407af1ba05e07e18a03f474d6 equals Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (equals Spec hash)
- `git status --short`: pass (only blueprint/context/findings.md and blueprint/context/review.md differ)
- `npm run verify`: pass (typecheck; 534 tests, 534 pass, 0 fail, 0 skipped; plugin production build and desktop build)
- `git diff --stat 751e042 b0263e4`: pass (only src/standalone, docs/desktop.md and the spec changed; no plugin or shared file)
- String-literal-masked diff of every changed src/standalone source file (scratchpad script): pass (only text inside existing conditionals differs, plus the F-16 condition and plural ternaries)
- Element ID, button and aria-label comparison of base and target app.html: pass (145 IDs kept exactly once, 1 new `more-tools`; 55 buttons kept with the same IDs; aria-labels renamed, none removed)
- Stale-label scan (`grep -rnE` over src/standalone and docs/desktop.md): pass with one stale label recorded as F-25; remaining hits are 64b/64c panel internals out of scope

## Evidence

- Full delta 751e042..b0263e4 (commits 6785445 and b0263e4) reviewed against current-feature.md, build-plan item 64a and the project-plan section on everyday desktop use (63-65)
- Behavior preservation: no event wiring, IPC, validation, limit, permission or write-path logic changed; More tools is a native details element; panels focus themselves on open, so no code focuses a button inside the collapsed disclosure
- Message claims checked against code: loopback-only endpoint (`src/settings/settings.ts:28`), Keep private and hidden-folder rules (`security.ts`, `vault-reader.ts` pluginFiles), saved access fields (`remembered-access.ts`), writer lock and plugin check (`storage.ts`, `compatibility.ts`), save limits (`saves.ts`), discovery omission count (`src/intelligence/ollama.ts:75-96`)
- Native evidence inspected, not re-run: `.thread-local/desktop-63-65/evidence/64a-flows-2.json`, `64a-keyboard-2.json` (Project home, Tab to More tools summary, Enter opens it, Tab to open-records, Enter opens the panel), `64a-copy-2.json`, `64a-coverage-3.json`, `64a-main-light.png`, `64a-saving-dark.png`
- Changed test expectations reviewed one by one; each still asserts the rejection under test; leftover alternatives that can no longer match are recorded as F-26

## Findings

- Closed this pass: F-16 [P2], F-17 [P2], F-18 [P3], F-19 [P3], F-20 [P3], F-21 [P3] (F-15 was already closed)
- New open: F-22 [P3], F-23 [P3], F-24 [P3], F-25 [P3], F-26 [P3]
- No P0, P1 or P2 finding is open or fixed

## Remaining risk

- The reviewer did not launch Electron, Xvfb or Ollama, as instructed; native acceptance relies on builder-recorded evidence
- Screenshots 64a-main-light.png, 64a-main-dark.png and 64a-saving-dark.png predate step 5 and show the old project note; the repaired copy is evidenced only in JSON
- The F-16 incomplete-listing branch ("Some folders or files could not be checked.") has no unit test or native evidence; it was verified by reading the code (renderer.ts has no unit test harness)
- No lint, format, browser-test or CI command is configured for this project
- Check was not required by the request and was not run
