# Feature: Plain-language decisions, actions, reviews, changes and portability

**From build-plan:** feature 64c
**Build attempt:** 1
**Status:** verified
**Branch:** feature/plain-language-decisions-actions-reviews-changes-and-portability
**Carries:** F-27, F-28, F-29 (P3, from feature 64b)

## Goal

Finish the plain-language pass: rewrite the Decisions and questions, Actions and wrap-up,
Project reviews, Review changes and Project portability panels, their status messages and
the errors their main-process modules show, in the same style as 64a and 64b, without
changing any behavior or safeguard, and close the three carried P3s.

## In scope

- `app.html` text of the five panels; messages and labels in `records-view.ts`,
  `actions-view.ts`, `reviews-view.ts`, `changes-view.ts`, `portability-view.ts`.
- Errors in `records.ts`, `reviews.ts`, `changes.ts`, `portability.ts`, `saves.ts`,
  `vault-writer.ts`, `vault-files.ts` and `change-journal.ts`.
- Carried: F-27 (use "skipped (not indexed)" for index-omitted counts in collections and
  summary-note coverage), F-28 (desktop search-model reasons state only the cause so the
  shared sentence gives the one next action; docs say "Keywords"; the shared
  `collection-record.ts` text stays out of scope and is recorded as remaining), F-29
  (empty collections message points to the other scope too).
- `docs/desktop.md` updated to any renamed label.

## Out of scope

- Shared plugin files under `src/` outside `src/standalone` (their text is shared with the
  Obsidian plugin). Evidence-contract terms ("Recorded statement", "AI interpretation",
  "Proposed action"), record field names stored in notes (status values, headings written
  into Markdown) and every number and limit. Any behavior change.

## Build loop

Continuous Mode, self-review and Verify after each step, checkpoint commits disabled.
Wording about saving, undo, recovery and portability safeguards must keep its exact
meaning, so actual Electron acceptance and a fresh passing independent review are
required. At most two repairs per failing check or finding.

## Build steps

- [x] 1. Decisions/questions and Actions/wrap-up: panel text, view messages, `records.ts`
  errors; update tests. Done when IDs are unchanged, focused tests pass, Verify passes.
- [x] 2. Project reviews: panel text, `reviews-view.ts`, `reviews.ts`; update tests. Done
  when focused tests pass and Verify passes.
- [x] 3. Review changes, saves and portability: panel text, `changes-view.ts`,
  `portability-view.ts`, `changes.ts`, `portability.ts`, `saves.ts`, `vault-writer.ts`,
  `vault-files.ts`, `change-journal.ts`; carried F-27 to F-29; update tests. Done when a
  scan finds no stale renamed label in `src/standalone` or `docs/desktop.md` and Verify
  passes.
- [x] 4. Update `docs/desktop.md` and collect native evidence: each panel opened with the
  new wording; a decision recorded through Review changes with Undo; a project review
  view; a portability export preview; light and dark screenshots. Done when evidence is
  recorded and Verify passes.
- [x] 5. Repair independent-review findings F-30 to F-35: the Review changes intro states
  the 20-change and later-edit limits on undo; new-note write errors name both recovery
  places; the session error asks for a usable note; remaining in-scope technical strings
  rewritten; small meaning drift corrected; broadened test patterns anchored to exact
  messages. Done when focused tests pass, the repaired text shows natively, and Verify passes.
- [x] 6. Repair round-2 findings F-35 to F-38: the portability intro states Thread never
  overwrites or restores notes; the reviews intro says reviews load on open or Refresh;
  two refusals regain their next action; small drift corrected. Done when tests pass, the
  repaired intros show natively and Verify passes.

## Evidence

- Verify (`npm run verify`) passed after every step: 534 tests, 0 failed, both builds.
- app.html element IDs unchanged; the five panel intros and the note placeholder were
  rewritten in step 4 after native review showed they were still technical.
- One step 2 rewrite was reverted on purpose: the weekly review gap sentence ("Only the 80
  most recently modified eligible notes were considered.") is written into saved review
  notes, so its text stays as stored-note content.
- AI prompt text (records.ts and reviews.ts) is unchanged.
- Changed test expectations match the new messages. Step 3 had widened nine `/Target changed/` patterns to `/note changed/`; step 5 anchored them to the exact destination messages (F-33).
- Native acceptance in the actual window (`profile-63`, `vault-63`), evidence
  `.thread-local/desktop-63-65/evidence/64c-*`:
  - `64c-flows.json`: allowed saving, set Projects under "Where Thread saves each kind of
    note" ("Settings saved..."), opened and refreshed Actions, Reviews, Portability, Review
    changes and Decisions with the new statuses; created a decision, previewed it in Review
    changes ("Check every change before confirming..."), applied it ("Done. Choose Refresh
    next to Your notes...") and undid it; the Decisions folder is empty afterwards. An
    earlier attempt without the folder setting got the plain refusal "Thread may not change
    this note: it is outside the folders Thread may read or save in, or kept private."
  - `64c-flows-3.json`: project timeline review and a portability export preview with the
    final wording ("2 notes Thread may read; 0 skipped (not indexed)...", "1 file").
  - `64c-portability-light.png`, `64c-changes-dark.png`: both themes.
- After step 5: `64c-repaired-copy.json` shows the corrected Review changes and Project reviews intros and the plain export summary in the actual window.
- After step 6: `64c-repaired-copy-2.json` shows the corrected portability and reviews intros natively.
- Carried F-27 to F-29 repaired as recorded in the ledger. The shared
  `src/vault/collection-record.ts` message "Retrieve evidence again." remains (shared with
  the plugin, out of scope).

## Writing rules

Same as 64a and 64b: what happened and what to do next in everyday words; keep numbers,
limits and contract terms; ASCII punctuation.

## Testing

Focused tests next to sources; `npm run verify` after each step; native acceptance per
step 4. No plugin or shared file changes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6322,"specSha256":"2510d8556f4d2c5176ffec2c41d59948882dc37f70412ef5e08438365fa0a845","branch":"refs/heads/feature/plain-language-decisions-actions-reviews-changes-and-portability","head":"cd615dfdd08ad79bbfd155e30b962885a6f3f49d","baseRef":"refs/heads/main","baseCommit":"be0c258f78f171de0633b7632b9dcc6216f1bcdf","sourceTree":"60586dd7b6bd5dd74c2b61bf80973de06e9e05b3","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 64c/F-27 [P3] closed - Coverage text calls notes left out of the index "could not be read"

**File:** src/standalone/collections.ts:67
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The collections coverage ("... ${omittedFiles} notes could not be read") and the summary-note coverage at `knowledge.ts:61` ("... ${omittedFiles} could not be read") replace "omitted from indexing". `omittedFiles` is `availableFiles - indexed entries` (`src/vault/index-coverage.ts:23`), which counts notes left out by the index limits, not unreadable files. Unreadable notes are counted separately as `invalid`, which `intake.ts:54` shows as "unreadable" next to "skipped" for the same number. The main window also says "skipped" (`renderer.ts:178`). So the same count gets two different names, and "could not be read" points the user at broken files rather than at the index limits. The rule to keep the same meaning is not met. No safeguard is affected.
**Suggested fix:** Use the same word as the main window and capture screen, for example "${omittedFiles} skipped (not indexed)" in `collections.ts:67` and `knowledge.ts:61`. No requirement would be lost.
**Resolution:** Repaired in 64c: collections and summary-note coverage now say "skipped (not indexed)" for index-omitted counts, matching the main window; record and review coverage use the same wording. Re-review 2026-10-27 (independent, fresh subagent): confirmed `collections.ts:67`, `knowledge.ts:61`, `records.ts:110` and `reviews.ts:108` use "skipped (not indexed)" for `omittedFiles`, and `reviews.ts:108` keeps "could not be read" only for `invalid`. No new defect introduced. Closed.

### 64c/F-28 [P3] closed - Shared messages shown in the desktop still use renamed labels and repeat the new advice

**File:** src/standalone/ask.ts:88
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The desktop Ask shows `hybridCoverageText` from the shared `src/retrieval/semantic.ts:18`, which wraps the reason as "Keyword fallback: <reason> Choose a compatible downloaded embedding model in settings, or use Keyword. ...". 64b rewrote the desktop reasons (`ask.ts:88` and `ask.ts:92`) to carry their own next action ("... Choose one under Optional local AI, or search by keywords."). The window now gives the advice twice, in two vocabularies, and names "Keyword", an option renamed "Keywords" in this feature. The shared `src/vault/collection-record.ts:55` error "A passage is no longer locatable in the current index. Retrieve evidence again." is still forwarded verbatim from `collections.ts:109,124` into the Ask status when a collection preview fails, so it names the removed "Retrieve evidence" button. `docs/desktop.md:210` also still says "Keyword works without any model". The shared files are out of scope for 64b, and these paths are uncommon. The spec's scan covered only `src/standalone` literals, so it missed this stale text, which users can still see.
**Suggested fix:** Keep the desktop reasons to the cause only ("No search model chosen." and "The search model is not available or does not work.") so the shared sentence supplies the single next action. Or, when shared wording is next in scope, update `semantic.ts:18` and `collection-record.ts:55` to the new labels. Change the docs to "Keywords works without any model". No requirement would be lost.
**Resolution:** Repaired in 64c: the two desktop search-model fallback reasons now state only the cause ("No search model chosen." / "The search model is not available or does not work."), so the shared sentence gives the single next action; docs say "Searching by Keywords works without any model". The shared `src/vault/collection-record.ts` "Retrieve evidence again." text is shared with the plugin and remains out of scope. Re-review 2026-10-27 (independent, fresh subagent): confirmed `ask.ts:88,93` carry only the cause, so the advice is no longer duplicated, and `docs/desktop.md:210` is corrected. The in-scope defect is gone. Remaining by spec scope: shared `semantic.ts:18` still says "use Keyword", and `collection-record.ts:55` still says "Retrieve evidence again."; both are recorded under Remaining risk in the receipt. Closed.

### 64c/F-29 [P3] closed - Empty collections message says none exist when the scope hides some

**File:** src/standalone/research-view.ts:95
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The empty state changed from "No matching collections." to "No saved collections yet. In Ask, ... save them as a collection." `collections.ts` lists only collections whose recorded scope and project identity match the chosen "Collections from" value, so a user who has saved collections under the other scope sees "yet" and is sent to create a new one. The coverage line above it does say "Collections from other scopes are not shown". So the risk is a misleading next action, not data loss.
**Suggested fix:** Say, for example, "No saved collections for this choice. Try the other Collections from option, or in Ask choose Find passages, pick passages and save them as a collection." No requirement would be lost.
**Resolution:** Repaired in 64c: the empty state says "No saved collections for this choice. Try the other Collections from option, or in Ask choose Find passages, pick passages and save them as a collection." Re-review 2026-10-27 (independent, fresh subagent): confirmed the text at `research-view.ts:95`, and that "Collections from" matches the real control label (`app.html:133`). No new defect introduced. Closed.

### 64c/F-30 [P2] closed - Review changes intro promises undo and a copy of every original without limits

**File:** src/standalone/app.html:176
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The panel intro changed from "Inspect exact changes and retained originals. Nothing applies automatically." to "See each change before it is applied, and undo it later. Thread keeps a copy of every original." The shared journal keeps only the last 20 applied batches (`src/vault/changes.ts:144`, `history...slice(-20)`), and their original text is stored inside those batches, so older originals are dropped. Undo also refuses when a note was edited later (`changes-view.ts:127`, and docs/desktop.md:337 "shows the last twenty applied batches"). The headline now states an unconditional undo and permanent retention guarantee. The spec explicitly requires that undo, recovery and retained-originals wording keep its exact meaning and never overstate a safeguard. The native screenshot `64c-changes-dark.png` shows this text, with "1 of 20 kept for undo" below it.
**Suggested fix:** Qualify the intro, for example: "See each change before it is applied. Thread keeps a copy of each original for its last 20 changes, so you can undo them unless the note was edited since. Allow saving under Saving notes and close other editors before confirming." Text-only change; no requirement would be lost.
**Resolution:** Repaired in 64c step 5: the intro now says Thread keeps a copy of the originals for its last 20 changes, so you can undo them unless a note was edited since (`64c-repaired-copy.json`). Re-review 2026-10-27 (independent, fresh subagent, round 2): confirmed `app.html:176` states both the 20-change limit and the later-edit block, matching `src/vault/changes.ts` (last 20 history entries; undo finds only non-undone batches) and the confirm-area text in `changes-view.ts` ("If you edit a note later, undo and recovery stop rather than overwrite your edit."). `64c-repaired-copy.json` shows the text natively. No new defect introduced. Closed.

### 64c/F-31 [P2] closed - New-note write failures during Review changes send the user to Saving notes

**File:** src/standalone/vault-writer.ts:74
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `VaultWriter.create` is used both by Saving notes (`saves.ts:56`) and by Review changes when applying any proposal that creates a note: new decisions, questions, actions, session and review notes (`changes.ts:107`). Its rewritten recovery errors at `vault-writer.ts:74` ("Folders moved while saving. Keep the unfinished save and look at it under Saving notes.") and `vault-writer.ts:81` ("The saved note changed right away. Keep the unfinished save and look at it under Saving notes.") pass through unchanged to the Review changes status (`changes.ts:118`). On that path no save receipt exists. The recovery record is under Review changes, as **Inspect recovery**. The old text, "Preserve the pending receipt and inspect recovery.", was neutral about where to look. The new text sends the user to the wrong panel in exactly the failure where recovery guidance matters. `vault-writer.ts:57` ("Choose fewer answers.") has the same save-only assumption.
**Suggested fix:** Use wording that is correct for both callers, for example "Folders moved while writing. Keep any note it created and open the unfinished work under Saving notes or Review changes > Inspect recovery." Alternatively, let the caller supply the recovery hint. Use a neutral size message such as "The new note would be larger than 1 MiB." No requirement would be lost.
**Resolution:** Repaired in 64c step 5: both create-path recovery errors name "Saving notes or with Inspect recovery in Review changes", and the size error is neutral ("Make it smaller."). Re-review 2026-10-27 (independent, fresh subagent, round 2): confirmed `vault-writer.ts:74,81` name both recovery places and `vault-writer.ts:57` is neutral. `VaultWriter.create` callers are only `saves.ts:56` and `changes.ts:107`. `replace` and `removeCreated` are used only by Review changes (`changes.ts:108-109`), so their "Choose Inspect recovery in Review changes" text is correct. "Inspect recovery" matches the real action label in `changes-view.ts`. No new defect introduced. Closed.

### 64c/F-32 [P2] closed - Empty session context error asks for progress text that never becomes a source

**File:** src/standalone/records.ts:224
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "Add current project notes or select action reports before generating a sourced session." became "Describe your progress or choose action updates before writing a session summary." The guard fires when `bundle.sources` is empty. Those sources come only from the project resume bundle and the chosen action cards (`chosenActionContext`, `src/vault/action-board.ts:61-71`). The **Reported progress** text goes into the saved markdown (`sessionMarkdown`), not into the sources. A user who follows the new advice and types progress gets the same error again. The feature requires rewritten messages to keep the same next action. The case is uncommon: it needs a project with no usable non-action notes and no chosen actions.
**Suggested fix:** Restore the original next action in plain words, for example "This project has no notes Thread can use yet. Add a project note or choose action updates before writing a session summary." No requirement would be lost.
**Resolution:** Repaired in 64c step 5: the error now reads "This project has no notes Thread can use yet. Add a project note or choose action updates before writing a session summary." Re-review 2026-10-27 (independent, fresh subagent, round 2): confirmed at `records.ts:224`. The next action again matches where `bundle.sources` come from (project resume bundle plus chosen action cards). No new defect introduced. Closed.

### 64c/F-33 [P3] closed - Several changed test expectations now match many more messages

**File:** src/standalone/records.test.ts
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** About nine assertions changed from `/Target changed/` (or `/target changed/`) to `/note changed/`: `records.test.ts` (prepare and decision review), `actions.test.ts` (prepareAction, prepareSession), `intake.test.ts:31`, `reviews.test.ts` (queue prepare, prepareDraft) and `ask.test.ts:277`. `/Target changed/` matched only the destination-guard messages. `/note changed/` also matches the source-guard messages added in this feature: "A chosen note changed." (`records.ts:143`), "A supporting note changed..." (`records.ts:127`, `changes.ts:108`), "A note for this review changed." (`reviews.ts:89,158`), and others. A regression where a different guard fires would still pass. The file-content assertions next to them still prove nothing was written. The spec evidence says "none were broadened", which is not accurate for these.
**Suggested fix:** Anchor each assertion to the exact destination message, for example `/The note changed before the change was prepared/` or `/The note changed since the preview/`. Test-only change; no requirement would be lost.
**Resolution:** Repaired in 64c step 5: the nine patterns are anchored to `/The note changed before the change was prepared/` (records, actions, intake, reviews) and `/The note changed\. Look at it again; no files were changed/` (ask); all pass, so each hits the destination guard. Re-review 2026-10-27 (independent, fresh subagent, round 2): confirmed every changed assertion in the full test delta. The destination patterns match only `changes.ts:62` and `saves.ts:79` respectively. The other rewritten expectations (for example `/Choose a state for the action/`, `/cannot tell which question/`, `/Accept the new decision before replacing/`, `/one to five different notes/`, `/appeared at that place/`) each match one message on the exercised path. `npm run verify` passes (534 tests). Closed.

### 64c/F-34 [P3] closed - Some text in in-scope files was left in the old technical style

**File:** src/standalone/portability.ts:90
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The spec puts messages in `portability.ts`, `portability-view.ts`, `vault-writer.ts`, `saves.ts` and `reviews-view.ts` in scope. Several user-visible strings were not rewritten:
- The export coverage line "current permitted project files and granted PDFs offered; ... beyond the 100-file candidate budget ... change journal" (`portability.ts:90`). It sits directly under the new plain status in `64c-portability-light.png`.
- The comparison counts "unavailable under current access ... candidate budget ... not evidence or a read grant" (`portability-view.ts:102`).
- `portability.ts:140` ("Invalid import destination.") and `portability.ts:178` ("Partial copies are preserved; choose the same package to inspect recovery.").
- `saves.ts:63` ("Preserve the profile ...").
- `vault-writer.ts:63,68,70,94,99,102,103,109`, for example "Target folders moved during writing. Inspect retained recovery."
- `reviews-view.ts:107` ("Evidence is unavailable or stale. Inspect the original ...").

The panels now mix both styles. No safeguard is misstated.
**Suggested fix:** Rewrite these in the same style, keeping the 100-file limit and the not-a-backup and no-read-grant meaning. No requirement would be lost.
**Resolution:** Repaired in 64c step 5: the export coverage, comparison counts, import destination and interrupted-import messages, the save-start error, the remaining vault-writer target messages and the review evidence line are rewritten, keeping the 100-file limit and the not-a-backup and no-read meaning. Re-review 2026-10-27 (independent, fresh subagent, round 2): confirmed all listed strings are rewritten. The 100-file limit, "not a full backup", "does not let Thread read anything" and "Copies already made are kept" meanings are preserved (`portability.ts:90,178`, `portability-view.ts:102`). `64c-repaired-copy.json` shows the new export coverage natively. No new defect introduced in these strings; a separate portability intro issue is recorded as 64c/F-36. Closed.

### 64c/F-35 [P3] closed - Small meaning drift in a few rewritten labels and messages

**File:** src/standalone/app.html:151
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:**
- The Project reviews intro "Reviews only run when you open them." is inaccurate: opening the panel shows "Choose Refresh reviews to start." and nothing runs until Refresh reviews is chosen. The old text was "Review never runs automatically."
- The records coverage "Up to 100 questions from older notes shown." (`records.ts:110`) changes the unit of the limit. The limit is 100 "Open questions" sections (`slice(0, 100)` over chunks), and each section can hold several questions.
- The renamed select "Question from an older note" still offers "No legacy copy" (`records-view.ts:91`).
- The collision message "A note with the same name but different capital letters or accents already exists." (`vault-files.ts:74`) also fires for folder path parts.

All are minor; no safeguard is affected.
**Suggested fix:** Use "Reviews only run when you choose Refresh reviews.", "Up to 100 open-question sections from older notes shown.", "No copy" for the option, and "A file or folder with the same name but different capital letters or accents already exists." No requirement would be lost.
**Resolution:** Repaired in 64c step 5: "Reviews only run when you choose Refresh reviews.", "Up to 100 open-question sections from older notes shown.", the option "No copy", and "A file or folder with the same name but different capital letters or accents already exists." Re-review 2026-10-27 (independent, fresh subagent, round 2): bullets 2 to 4 are correctly repaired (`records.ts:110`, `records-view.ts:91`, `vault-files.ts:74`). Bullet 1 was based on a wrong premise, and the repair made the intro inaccurate. `ReviewsView.open()` calls `refresh()` (`reviews-view.ts:34`), and changing Review view or the status filter also refreshes (`reviews-view.ts:24`). So opening the panel does load the review immediately; the builder's own evidence shows `"open-reviews": "Ready. ..."` (`64c-flows.json`). The new intro "Reviews only run when you choose Refresh reviews." (`app.html:151`) is therefore false. The original "Reviews only run when you open them." was close to correct. Loading is read-only and nothing is acknowledged, saved or sent to AI, so this stays P3. Suggested fix: "Reviews load when you open this panel or choose Refresh reviews; nothing is marked reviewed, fixed or saved unless you choose it." Kept open. Round-2 repair (64c step 6): the reviews intro now says "Reviews load when you open this panel or choose Refresh reviews; nothing is marked reviewed, fixed or saved unless you choose it." (`64c-repaired-copy-2.json`). Re-review 2026-10-27 (independent, fresh subagent, round 3): confirmed `app.html:151` now matches the code: `ReviewsView.open()` calls `refresh()`, Refresh reviews reloads, and loading is read-only; acknowledging, repairing and saving each still need an explicit preview and approval. Changing Review view or the status filter also reloads; the intro does not say so, but it is not inaccurate. Bullets 2 to 4 remain correct (`records.ts:110`, `records-view.ts:91`, `vault-files.ts:74`). `64c-repaired-copy-2.json` shows the intro natively. No new defect introduced. Closed.

### 64c/F-36 [P2] closed - Portability intro implies overwrite and restore can happen if the user chooses

**File:** src/standalone/app.html:141
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The Project portability intro changed from "... Nothing is overwritten, restored or granted automatically." to "... Nothing is overwritten, restored or allowed unless you choose it." The new wording says overwriting and restoring are things the user can opt into. Neither exists. Export refuses an existing destination ("That package destination already exists. Choose a new name; no file was overwritten.", `portability.ts:186`, and "Saving never overwrites an existing file."). Import only creates new copies under a new top-level folder ("Existing files are never overwritten", `portability-view.ts:89`). Comparison states "nothing was restored". So the panel headline understates the no-overwrite and no-restore safeguards and contradicts the panel's own later text. The spec requires safeguard wording to keep its exact meaning, and the brief lists "no overwrite" as a safeguard that must not be under- or overstated. The text is visible natively in `64c-portability-light.png`.
**Suggested fix:** Text-only, for example: "A checkpoint is a package of the project files you choose, to move or compare them. It is not a full backup of your notes or their history. Thread never overwrites or restores notes, and never lets itself read a new folder unless you allow it." No requirement would be lost.
**Resolution:** Repaired in 64c step 6: the intro now says "Thread never overwrites or restores notes, and never lets itself read a new folder unless you allow it." (`64c-repaired-copy-2.json`). Re-review 2026-10-27 (independent, fresh subagent, round 3): confirmed `app.html:141` no longer presents overwrite or restore as something the user can opt into. It agrees with export (`writeExport` refuses an existing destination), import (create-only under a new top-level folder; uncertain copies are adopted only on matching bytes) and comparison (read-only, "nothing was restored"). It keeps the not-a-full-backup meaning and the new-folder-stays-unread meaning (`importScope`/`importRoot`). `64c-repaired-copy-2.json` shows the intro natively. The original understatement is gone. The repair phrases the claim for all of Thread rather than for portability; that is a smaller, separate wording issue recorded as 64c/F-40 (P3), not a worse defect. Closed.

### 64c/F-37 [P3] closed - Two write-refusal messages lost their next action

**File:** src/standalone/changes.ts:41
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "The note is outside permitted writable folders. Review read access, exclusions and folder roles explicitly." became "Thread may not change this note: it is outside the folders Thread may read or save in, or kept private." Likewise `vault-writer.ts:18` changed "Destination is outside current read access or excluded. Review access explicitly before saving." to "Thread may not save there: it is outside the folders Thread may read, or kept private." Both now state only the cause and drop where to fix it. The spec requires rewritten messages to keep the same next action. The builder's native run hit the first refusal, and the fix was to set a folder under "Where Thread saves each kind of note" (`64c-flows.json`), which the new text does not mention. No safeguard is misstated.
**Suggested fix:** Append the next action, for example "... Check What Thread may read and, under Saving notes, Where Thread saves each kind of note." for `changes.ts:41`, and "... Check What Thread may read." for `vault-writer.ts:18`. No requirement would be lost.
**Resolution:** Repaired in 64c step 6: `changes.ts:41` adds "Check What Thread may read and, under Saving notes, Where Thread saves each kind of note."; `vault-writer.ts:18` adds "Check What Thread may read." Re-review 2026-10-27 (independent, fresh subagent, round 3): confirmed both messages. Both named places exist as real UI labels: `app.html:32` (summary "What Thread may read"), and `app.html:65` ("Where Thread saves each kind of note"), which is inside the `app.html:47` "Saving notes" section. `changes.ts:41` checks both read scope and folder roles, so it correctly points to both places. `vault-writer.ts:18` checks only read scope, so "Check What Thread may read." is correct for both callers (Saving notes and Review changes). No new defect introduced. Closed.

### 64c/F-38 [P3] closed - A few more rewritten messages drift slightly from what the code checks

**File:** src/standalone/records.ts:250
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:**
- `records.ts:250` "The decision's supporting notes are not available. Check them in Project reviews." fires when the decision note itself is not among the readable project entries (`!context.entries.some(e => e.path === target.entry.path)`), not when its supporting notes are missing. The old text, "Decision evidence is unavailable.", referred to the decision as evidence.
- `changes-view.ts:66` "Applied changes · N of 20 kept for undo" counts every history entry, including batches already undone (shown with status "undone", and not undoable again because `src/vault/changes.ts:157` skips `undone`). The old "retained batches" was accurate.
- `vault-writer.ts:59` and `saves.ts:53` "Something appeared at that place since the preview." also fire when the destination folders changed or moved, and `vault-writer.ts:59` also fires when a file already existed at preview. The old "Destination changed since preview." covered all cases.
- `saves.ts:42` "Something or your folder settings changed. Preview again." is ungrammatical.

All are minor and no safeguard is affected.
**Suggested fix:** "This decision is not available to Thread right now. Check it in Project reviews."; "Applied changes · N of the last 20 kept"; "The destination changed since the preview. Look at it and preview a new name."; "Your choices or folder settings changed. Preview again." No requirement would be lost.
**Resolution:** Repaired in 64c step 6: "This decision is not available to Thread right now. Check it in Project reviews."; "Applied changes · N of the last 20 kept"; "The destination changed since the preview..." in `vault-writer.ts:59` and `saves.ts:53`; "Your choices or folder settings changed. Preview again." Re-review 2026-10-27 (independent, fresh subagent, round 3): confirmed `records.ts:250` now refers to the decision itself, matching the `context.entries` guard. `changes-view.ts:66` now reads "of the last 20 kept" and no longer claims undo for undone batches. `vault-writer.ts:59` and `saves.ts:53` now use the neutral "The destination changed since the preview", which covers new files, changed folders and moved folders. `saves.ts:42` is grammatical. The test anchor `/destination changed since the preview/` (`vault-writer.test.ts`) and the native-unchanged ask test still pass under `npm run verify`. These four repairs were checked in code and tests only; no post-step-6 native capture shows them. No new defect introduced. Closed.

### 64c/F-39 [P3] open - Review queue headings read as if pending items are hidden

**File:** src/standalone/reviews-view.ts:84
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The category heading changed from "<kind> (N shown; M candidates)" to "<kind> (N shown of M)". `rows` holds only pending items. M is `queue.candidateCounts[kind]`, which comes from `queue.counts` before disposition (`src/vault/review-events.ts:87`), so it also counts items already reviewed or snoozed. Those items appear under "Already handled". For example, with one pending item and one handled item, the heading says "1 shown of 2", which suggests one pending item is hidden by a limit when none is. The plugin keeps the two counts apart ("N pending shown of P; M total candidates", `src/ui/review-queue-modal.ts:31`). This is user-visible drift in a count; no safeguard or behavior is affected.
**Suggested fix:** Text-only, for example `${rows.length} to review; ${candidateCounts} found, including already handled`, or keep the old separation: `${rows.length} shown; ${candidateCounts} found`. No requirement would be lost.
**Resolution:**

### 64c/F-40 [P3] open - Portability intro says Thread never overwrites or restores notes, without limiting it to portability

**File:** src/standalone/app.html:141
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The repaired intro says "Thread never overwrites or restores notes, and never lets itself read a new folder unless you allow it." In the portability panel this is true of checkpoints. Taken literally, it is not true of Thread as a whole: after the user approves, Review changes replaces note text (`VaultWriter.replace` via `changes.ts:108`), undo writes the original back, and "Restore reviewed recovery" restores originals. The old wording ("Nothing is overwritten, restored or granted automatically.") did not make a global claim. The brief asks that "no overwrite or restore" wording is not overstated. The panel context limits the risk, so this is P3.
**Suggested fix:** Limit the claim to portability, for example: "Exporting, comparing and importing never overwrite or restore your notes, and an imported folder stays unread until you allow it." No requirement would be lost.
**Resolution:**

### 64c/F-41 [P3] open - Import preview line still uses the old technical wording

**File:** src/standalone/portability-view.ts:90
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `portability-view.ts` is in scope, and the import field above it was renamed to "New folder for the copies (at the top, not one Thread may read)". The preview summary below it still reads "${n} files. ${m} uncertain copies verified for adoption. Existing files are never overwritten and IDs are never rewritten. The imported folder stays outside read access until you grant it explicitly; links and PDF original paths may need manual review." So the same flow mixes the old "read access/grant" vocabulary with the new "folders Thread may read" one, and "verified for adoption" is unexplained. It also lacks the singular/plural choice added to the export preview ("1 files"). The meaning is correct and no safeguard is misstated.
**Suggested fix:** Rewrite in the same style and keep every safeguard, for example: "${n} files. ${m} copies from the interrupted import match and will be kept. Existing files are never overwritten and IDs are never changed. Thread cannot read the new folder until you add it to Folders Thread may read; links and PDF paths may need checking by hand." No requirement would be lost.
**Resolution:**

### 64c/F-42 [P3] open - Two change-history errors name the wrong thing

**File:** src/standalone/changes.ts:48
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "Thread cannot use this saved review. Keep its history as it is." replaces "Unsupported guarded review context." It fires for any schema-version-2 change context, and those come from both Project reviews (`reviews.ts:216,284`) and Research summary/knowledge notes (`knowledge.ts:123`). A user whose summary-note change is unusable is told about a "saved review". Separately, `change-journal.ts:7` now says "Thread's change history is from an unknown version." The check fails for any unexpected key set, including a damaged file, not only another version. Both messages keep the correct next action ("keep it as it is"), so no safeguard is affected.
**Suggested fix:** Use "Thread cannot use this saved change. Keep its history as it is." at `changes.ts:48`, matching lines 46-47, and update the `/saved review/` expectation in `changes.test.ts`. At `change-journal.ts:7`, use for example "Thread does not recognize its change history. Keep it as it is and restore a known backup." No requirement would be lost.
**Resolution:**

## Independent review

# Independent Review

**Status:** passed
**Target commit:** cd615dfdd08ad79bbfd155e30b962885a6f3f49d
**Base commit:** be0c258f78f171de0633b7632b9dcc6216f1bcdf
**Base ref:** main
**Spec hash:** 2510d8556f4d2c5176ffec2c41d59948882dc37f70412ef5e08438365fa0a845
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T21:07:39Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T21:14:20Z
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

- `git rev-parse HEAD` / `git merge-base main HEAD` / `sha256sum blueprint/context/current-feature.md`: pass (HEAD, merge base and spec hash match the request)
- `git status --short`: pass (only `blueprint/context/findings.md` and `blueprint/context/review.md` differ from the target)
- `git diff --stat be0c258..cd615df`: pass (30 files; outside `src/standalone` only `docs/desktop.md` and the spec changed)
- `npm run verify`: pass (typecheck; 534 tests, 534 pass, 0 fail, 0 skipped; plugin production bundle and desktop build)
- Token-level comparison of all 17 changed non-test `src/standalone/*.ts` files with string text masked (scratchpad lexer; TypeScript 7 has no JS API): pass (16 files identical in structure; the only non-string change is the added singular/plural choice in `portability-view.ts`)
- Tag and attribute comparison of `src/standalone/app.html` with text content masked: pass (all IDs, attributes and aria-labels unchanged)
- Repo-wide `grep` for old renamed labels: pass (no stale label in `src/standalone` or `docs/desktop.md`; remaining hits are plugin `src/ui`, README and history only)

## Evidence

- Full delta reviewed: every changed line in `app.html`, `records.ts`, `records-view.ts`, `actions-view.ts`, `reviews.ts`, `reviews-view.ts`, `changes.ts`, `changes-view.ts`, `change-journal.ts`, `portability.ts`, `portability-view.ts`, `saves.ts`, `vault-writer.ts`, `vault-files.ts`, `ask.ts`, `collections.ts`, `knowledge.ts`, `research-view.ts`, all changed tests and `docs/desktop.md`.
- Saved-note and prompt text: no changed line touches a markdown builder, frontmatter, `gaps.push` or prompt call. The changed `ask.ts` fallback reasons reach `hybridCoverageText` only in display: the desktop answer save uses `reviewedAnswerMarkdown`, which omits hybrid coverage, and no prompt includes it. The weekly-review gap sentence stays as it was.
- Safeguard wording checked against code: undo limited to the last 20 changes and blocked by later edits (`app.html:176`, `changes-view.ts`), originals kept before writing, multi-note changes not all-or-nothing, both recovery places (`vault-writer.ts:74,81`), plugin history separation (`changes-view.ts` refresh status, `reviews.ts:122`), the 100-file limit and per-file checksum (`PackageEntry.sha256` in `src/portability/format.ts`), imports staying unread, actions changed only by the user, the AI never accepting decisions.
- Referenced UI labels exist: "What Thread may read" (`app.html:32`), "Folders Thread may read" (`app.html:34`), "Saving notes" (`app.html:47`), "Where Thread saves each kind of note" (`app.html:65`), "Refresh" next to "Your notes" (`app.html:112`), "Renew exact preview" and "Inspect recovery" (`changes-view.ts`), "Optional local AI", "Collections from", and the refresh buttons of every panel.
- Native evidence inspected (not relaunched): `.thread-local/desktop-63-65/evidence/64c-flows.json` (record preview, apply and undo through Review changes; panel statuses), `64c-flows-3.json` (timeline coverage and export preview with "1 file"), `64c-repaired-copy.json` and `64c-repaired-copy-2.json` (final Review changes, reviews and portability intros), `64c-changes-dark.png` (pre-repair rendering), `64c-step6-verify.log` (534 pass).
- Changed test expectations: each is anchored to one message on its exercised path (`/not actions/`, `/different name/`, `/comparison changed/`, `/different supporting notes/` and the destination-guard patterns are unique in `src/standalone`).

## Findings

- F-27, F-28, F-29, F-30, F-31, F-32, F-33, F-34: closed (unchanged)
- F-35, F-36, F-37, F-38: re-reviewed and closed this pass
- F-39 [P3] open - Review queue headings read as if pending items are hidden
- F-40 [P3] open - Portability intro says Thread never overwrites or restores notes, without limiting it to portability
- F-41 [P3] open - Import preview line still uses the old technical wording
- F-42 [P3] open - Two change-history errors name the wrong thing
- No P0, P1 or P2 finding is open or fixed.

## Remaining risk

- The reviewer did not launch Electron, Xvfb, Ollama or any GUI, as instructed. Native proof relies on the builder's recorded evidence, and its screenshots predate the step 5 and step 6 repairs. The F-37 and F-38 message repairs and the "of the last 20 kept" heading were verified in code and tests only, not in the actual window.
- Shared plugin text shown in the desktop remains out of scope: `src/retrieval/semantic.ts:18` still says "use Keyword", and `src/vault/collection-record.ts:55` still says "Retrieve evidence again."
- No lint, format, browser-test or CI command is configured; those signals were unavailable.
- Check was not required for this request and was not run.
