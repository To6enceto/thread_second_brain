# Feature: Desktop first run and new projects

**From build-plan:** feature 65
**Build attempt:** 1
**Status:** verified
**Branch:** feature/desktop-first-run-and-new-projects
**Carries:** F-39, F-40, F-41, F-42 (P3, from feature 64c)

## Goal

Help a new person get started in Thread Desktop without documentation: a skippable,
reopenable welcome that walks through choosing a folder, choosing what Thread may read,
optional local AI and an optional sample project, plus a **New project** action that
creates the shared starter notes through the existing reviewed new-note flow.

## In scope

- **Welcome panel** (`welcome-view.ts`, reader area): shown at launch when no saved access
  exists; **Skip** hides it for this session; a **Welcome guide** button in the header
  reopens it. Four steps, each with a live status line:
  1. Choose your notes folder (runs the existing Choose vault folder action).
  2. Choose what Thread may read (focuses the existing read-access fields; approval stays
     the existing Approve read access button).
  3. Optional local AI: the exact commands to run yourself, as selectable text
     (`OLLAMA_NO_CLOUD=1 ollama serve`, `ollama pull qwen3:4b-instruct`), and **Test the
     Ollama connection**, which runs the existing local discovery for the address in
     Optional local AI and reports the result. Thread never installs or downloads.
  4. Start a project: **Preview sample project** and **New project** (name field). Both
     need saving allowed and folders set under Saving notes; refusals say so plainly.
- **New project** button in the projects area that opens the welcome panel at step 4.
- Review changes apply: a new note may extend another new note's parent folder chain only
  with folders created earlier in the same apply run (`changes.ts`); any other folder change
  is still refused. Needed because a new project creates two notes in one new folder.
- Main `new-project.ts` (`DesktopNewProject.prepare(kind, name, revision)`): builds notes
  with the shared `starterNotes` (Overview, Questions and three templates) or
  `sampleNote`, skips template notes that already exist, refuses an existing project note
  or folder, and creates one exact reviewed proposal through `DesktopChanges.propose`
  (create-only, collisions refused, nothing written before Apply). The renderer then
  opens Review changes.
- IPC/preload/contracts: `prepareNewProject(kind, name, revision)`.
- Carried P3 fixes F-39 to F-42 (text only).
- `docs/desktop.md`: "First run and new projects" section.

## Out of scope

- Remembering that the welcome was skipped across launches (saved access already hides it).
- Installing Ollama, downloading models, clipboard writes (renderer permissions stay denied),
  any automatic save, changing the shared starter-note or sample content (plugin parity).

## Build loop

Continuous Mode, self-review and Verify after each step, checkpoint commits disabled. The
feature creates notes in the user's vault, so actual Electron acceptance and a fresh passing
independent review are required. At most two repairs per failing check or finding.

## Build steps

- [x] 1. Add `new-project.ts` with tests (real temporary vault, storage and changes): sample
  and project proposals contain exactly the shared notes; nothing is written before Apply;
  Apply creates them; existing templates are skipped; an existing project is refused;
  missing folder settings, invalid kind or name, and saving not allowed are refused
  plainly. Wire IPC, preload and contracts. Apply the carried F-39 to F-42 text fixes.
  Done when focused tests and Verify pass.
- [x] 2. Add `welcome-view.ts`, its markup and styles, the header Welcome guide button and
  the projects-area New project button, with view tests (shown without saved access,
  Skip hides, reopen works, step statuses update, Test the Ollama connection reports
  success and failure, both start actions call only `prepareNewProject` and open Review
  changes). Done when focused tests and Verify pass.
- [x] 3. Docs and native evidence in the actual window with a fresh isolated profile and a
  synthetic vault: welcome shown on first launch; Skip and reopen; folder chosen and access
  approved from the steps; Ollama connection test (project Ollama); saving allowed and
  folders set; sample project previewed, applied and listed; a New project created and
  applied; creating the same project again refused; keyboard path; light and dark. Done
  when evidence is recorded and Verify passes.
- [x] 4. Repair review findings F-41 and F-43 to F-47: `VaultWriter.create` returns the parent
  chain it verified, and Apply counts only those folders as made by the run and requires
  the fresh state to match that chain and hold the written note; any existing project
  folder is refused; project names get their own message; welcome steps no longer block
  each other silently; the import preview mentions interrupted copies only when
  recovering; tests cover a folder swapped in between creates, saving switched off, and
  existing folders without readable notes. Done when tests and Verify pass and the repaired
  paths are checked natively.
- [x] 5. Repair round-2 findings F-47 to F-49: template existence is checked on disk per
  target instead of from the bounded note listing; tests cover a vault past the listing
  limit with existing templates, a run-made folder swapped before the next note (refused,
  nothing written there, nothing applied; a weakened rule makes this test fail), and a
  blocked next note rolling back the first; welcome step 2 explains when no folder is chosen.
  Done when tests and Verify pass.

## Evidence

- Verify (`npm run verify`) passed after every step: 538, 541, 541, 544 and 546 tests, 0 failed, both builds.
- `new-project.test.ts` (real temporary vault, storage and Review changes): project and sample
  proposals contain exactly the shared notes; nothing is written before Apply; Apply creates
  them; existing templates are skipped; an existing project folder is refused, including an
  empty one, one with only non-Markdown files and one left by Undo; invalid kind, unsafe
  names, missing folder settings, stale access and saving switched off are refused; a project
  folder created outside the run before Apply is refused before any write; and a folder
  swapped in right after the first note is written is refused, leaving the outside folder
  without notes and the moved note untouched.
- `welcome-view.test.ts`: open, hide-others, statuses, Skip and reopen, New project focus,
  Ollama test success/none/failure, start actions gated on approved access, calling only
  `prepareNewProject` and opening Review changes.
- Native acceptance in the actual window with a fresh isolated profile (`profile-65`),
  synthetic `vault-65` and the project Ollama, evidence `.thread-local/desktop-63-65/evidence/65-*`:
  - `65-first-launch-light.png`: welcome shown on first launch with focus on the panel.
  - `65-skip-reopen.json` and `65-skip-reopen-2.json`: Skip hides it and focuses Choose vault
    folder; Welcome guide (click or Enter) reopens it. The folder was then chosen from step 1 through the GTK dialog.
  - `65-flows.json`: step 2 focused the read-access field; access approved; Ollama test
    "2 text models"; sample refused plainly before folders were set; after allowing saving
    and setting Projects and Templates, the sample (one note) and "Pilot study" (Overview,
    Questions and three templates) were prepared, previewed and applied in Review changes;
    both appear in the project list; creating "Pilot study" again is refused. The vault
    contains exactly those files plus the fixture note.
  - `65-welcome-dark.png`, `65-keyboard.json`: dark theme and Tab order through every step.
  - `65-flows-2.json` (after step 4): existing "Pilot study", an empty "Empty folder" and the
    name ".hidden" are refused with the new messages; "Field notes" (two notes in a new
    folder, templates skipped) is previewed and applied under the tightened check.
  - `65-launch-with-saved-access.json`: after Remember this access, a relaunch shows the saved
    card and no welcome.

## Data / contracts

`prepareNewProject(kind: "project" | "sample", name: string, revision: number)` returns the
existing `ChangesSnapshot`. Notes use the shared `starterNotes` / `sampleNote` content
unchanged. No new persisted state.

## Testing

Focused tests next to sources; `npm run verify` after each step; native acceptance per
step 3. The shared starter-note functions are reused unchanged, so no plugin regression.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8571,"specSha256":"48d628ee0081ba6b2c761170855c71ba3f8c0d2fadb5c044449b093c5d4a9162","branch":"refs/heads/feature/desktop-first-run-and-new-projects","head":"a2a7035d4db6228020c9ee3b0d261ad28bf1f708","baseRef":"refs/heads/main","baseCommit":"9cf6f9911c516293875f6be0775173008039d417","sourceTree":"d0daaafff245f0c2ebba277a91e7a9b0a694784e","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 65/F-39 [P3] closed - Review queue headings read as if pending items are hidden

**File:** src/standalone/reviews-view.ts:84
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The category heading changed from "<kind> (N shown; M candidates)" to "<kind> (N shown of M)". `rows` holds only pending items. M is `queue.candidateCounts[kind]`, which comes from `queue.counts` before disposition (`src/vault/review-events.ts:87`), so it also counts items already reviewed or snoozed. Those items appear under "Already handled". For example, with one pending item and one handled item, the heading says "1 shown of 2", which suggests one pending item is hidden by a limit when none is. The plugin keeps the two counts apart ("N pending shown of P; M total candidates", `src/ui/review-queue-modal.ts:31`). This is user-visible drift in a count; no safeguard or behavior is affected.
**Suggested fix:** Text-only, for example `${rows.length} to review; ${candidateCounts} found, including already handled`, or keep the old separation: `${rows.length} shown; ${candidateCounts} found`. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 1: the heading reads "N to review; M found, including already handled". Re-reviewed 2026-10-27 by independent review of 9cf6f99..02aca15: reviews-view.ts:84 now separates the pending count from the total that includes handled items; the misleading "shown of" wording is gone and no new defect was introduced. Closed.

### 65/F-40 [P3] closed - Portability intro says Thread never overwrites or restores notes, without limiting it to portability

**File:** src/standalone/app.html:141
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The repaired intro says "Thread never overwrites or restores notes, and never lets itself read a new folder unless you allow it." In the portability panel this is true of checkpoints. Taken literally, it is not true of Thread as a whole: after the user approves, Review changes replaces note text (`VaultWriter.replace` via `changes.ts:108`), undo writes the original back, and "Restore reviewed recovery" restores originals. The old wording ("Nothing is overwritten, restored or granted automatically.") did not make a global claim. The brief asks that "no overwrite or restore" wording is not overstated. The panel context limits the risk, so this is P3.
**Suggested fix:** Limit the claim to portability, for example: "Exporting, comparing and importing never overwrite or restore your notes, and an imported folder stays unread until you allow it." No requirement would be lost.
**Resolution:** Repaired in feature 65 step 1: the intro limits the claim to portability: "Exporting, comparing and importing never overwrite or restore your notes, and an imported folder stays unread until you allow it." Re-reviewed 2026-10-27 by independent review of 9cf6f99..02aca15: app.html (portability panel intro, now line 167) makes the claim only about export, compare and import, which is accurate (import is create-only, compare does not write, the import root stays outside read scope). Closed.

### 65/F-41 [P3] closed - Import preview line still uses the old technical wording

**File:** src/standalone/portability-view.ts:90
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `portability-view.ts` is in scope, and the import field above it was renamed to "New folder for the copies (at the top, not one Thread may read)". The preview summary below it still reads "${n} files. ${m} uncertain copies verified for adoption. Existing files are never overwritten and IDs are never rewritten. The imported folder stays outside read access until you grant it explicitly; links and PDF original paths may need manual review." So the same flow mixes the old "read access/grant" vocabulary with the new "folders Thread may read" one, and "verified for adoption" is unexplained. It also lacks the singular/plural choice added to the export preview ("1 files"). The meaning is correct and no safeguard is misstated.
**Suggested fix:** Rewrite in the same style and keep every safeguard, for example: "${n} files. ${m} copies from the interrupted import match and will be kept. Existing files are never overwritten and IDs are never changed. Thread cannot read the new folder until you add it to Folders Thread may read; links and PDF paths may need checking by hand." No requirement would be lost.
**Resolution:** Round-2 repair (feature 65 step 4): the interrupted-copy sentence is shown only for a recovery preview, with "copy"/"copies". Repaired in feature 65 step 1: the import preview line is rewritten in the new style with a singular/plural choice, keeping every safeguard. Re-reviewed 2026-10-27 by independent review of 9cf6f99..02aca15: the old "read access/grant" and "verified for adoption" wording is gone and the file count now has a singular/plural choice. The repair still adds a new wording defect, so this stays open. The sentence "${preview.adopted.length} copies from the interrupted import match and will be kept." is shown on every import preview, but `adopted` can be non-empty only when an interrupted import is being recovered (`src/portability/import.ts:27`, where only a pending receipt has `created`/`inFlight` entries). So every first import says "0 copies from the interrupted import match and will be kept", which suggests an import was interrupted when none was, and one adopted copy reads "1 copies". Suggested repair: show that sentence only when `preview.recovery` (or `adopted.length > 0`), with a singular/plural choice. Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: portability-view.ts:90 now adds the interrupted-copy sentence only when `preview.recovery` is set, with a "copy"/"copies" choice, and keeps every safeguard ("never overwritten", "IDs are never changed", the new folder stays unreadable until added). A first import no longer mentions an interrupted import. No new defect found. Closed.

### 65/F-42 [P3] closed - Two change-history errors name the wrong thing

**File:** src/standalone/changes.ts:48
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "Thread cannot use this saved review. Keep its history as it is." replaces "Unsupported guarded review context." It fires for any schema-version-2 change context, and those come from both Project reviews (`reviews.ts:216,284`) and Research summary/knowledge notes (`knowledge.ts:123`). A user whose summary-note change is unusable is told about a "saved review". Separately, `change-journal.ts:7` now says "Thread's change history is from an unknown version." The check fails for any unexpected key set, including a damaged file, not only another version. Both messages keep the correct next action ("keep it as it is"), so no safeguard is affected.
**Suggested fix:** Use "Thread cannot use this saved change. Keep its history as it is." at `changes.ts:48`, matching lines 46-47, and update the `/saved review/` expectation in `changes.test.ts`. At `change-journal.ts:7`, use for example "Thread does not recognize its change history. Keep it as it is and restore a known backup." No requirement would be lost.
**Resolution:** Repaired in feature 65 step 1: "Thread cannot use this saved change." (`changes.ts:48`, test updated) and "Thread does not recognize its change history." (`change-journal.ts:7`). Re-reviewed 2026-10-27 by independent review of 9cf6f99..02aca15: changes.ts:48 now matches lines 46-47, change-journal.ts:7 no longer claims an unknown version, and changes.test.ts:138 asserts the new text; the check logic is unchanged. Closed.

### 65/F-43 [P2] closed - A folder swapped in during Apply can be counted as created by this run

**File:** src/standalone/changes.ts:116
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The new rule lets a new note's parent chain grow only with "folders created earlier in the same apply run", and the spec says "any other folder change is still refused". But `createdFolders` is filled from a fresh `writer.inspect` taken after `VaultWriter.create` returns (changes.ts:115-116), not from the folder chain that `create` itself made and verified. `port.create` also never checks that this inspect still finds the note it just wrote. If the new project folder is renamed away and a new folder of the same name appears between `create`'s final check and that inspect, the new folder's identity is recorded as created by this run. The next note in it passes `grownByThisRun` and is written into the outside folder, and the batch is recorded as applied with no recovery entry. Reproduced with a scratch test outside the repository, using the real VaultReader, DesktopStorage, DesktopChanges and DesktopNewProject on a temporary vault, with the private `writer.create` wrapped so that after the first create it renamed `Projects/Swap` to `Projects/Moved` and made a new `Projects/Swap`. The result: `confirm` succeeded, history 1, pending null, recovery none; `Projects/Moved` = [Overview.md] and `Projects/Swap` = [Questions.md]. Before this change, the same state was refused with "The note changed". This weakens a stated concurrent-change guarantee in a write path, and the 63-65 plan says these features change no write-safety rule. No note is overwritten or lost: writes stay create-only (O_EXCL, case-insensitive collision checks), and Undo then refuses because Overview.md is missing. It is reachable only through a very short race that needs two outside folder operations, so P2 rather than P1. The feature's outside-folder test refuses at the pre-write read before any create, so it does not cover this case (see 65/F-47).
**Suggested fix:** Derive `createdFolders` only from folders this create provably made, and require the post-create state to contain the note. For example, have `VaultWriter.create` return the chain it verified in its final `check()` (folders past `expected.parents.length` are already ones it made, because EEXIST is refused there). In `port.create`, require the following inspect to have exactly those parents and `file.hash === hashText(content)`, else throw so the existing rollback or recovery runs. Add only the returned identities beyond `before.parents.length`. Add a test that swaps the folder between the first and second create and expects refusal with rollback or a recovery entry, and the moved note left untouched. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 4: `VaultWriter.create` returns the chain it verified (folders past the expected depth are ones it made, since EEXIST there is refused). `port.create` re-inspects and requires the same parents and the written note's hash, else throws "Folders moved while writing..." so rollback or recovery runs; only identities from that verified chain enter `createdFolders`. `new-project.test.ts` swaps the folder right after the first create and asserts refusal, no note in the outside folder and the moved note untouched. Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: vault-writer.ts:83 returns the chain that its post-write `check()` matched, and changes.ts:113-118 requires the fresh inspect to equal that chain and hold the written note's hash before adding only `made.slice(before.parents.length)` to `createdFolders`. Scratch probes outside the repository using the real modules confirmed: (a) the original swap after create is refused ("Folders moved while writing"), nothing is written into the swapped-in folder and the moved note is untouched; (b) a swap just before the second note's pre-write inspect is refused by `grownByThisRun`, with a recovery entry for the first note and nothing written into the outside folder; (c) an outside subfolder inside a run-made folder is refused and the first note is rolled back; (d) a collision on the second note rolls back the first and leaves the outside file untouched; (e) single-note creates (nested new folders, CRLF and BOM content) still apply; (f) a failed Undo still re-creates removed notes through the new post-create check; (g) a folder appearing before Apply makes the preview not ready, so the relaxed rule is never used at preview. No overwrite, concurrent-edit or rollback guarantee is weakened, and the only other `VaultWriter.create` caller (saves.ts:56) ignores the new return value. Closed. The residual gap between `mkdir` and `open` inside `create` predates this feature and is recorded as remaining risk.

### 65/F-44 [P3] closed - An existing project folder without a readable note is not refused

**File:** src/standalone/new-project.ts:28
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The spec says `prepare` "refuses an existing project note or folder", and docs/desktop.md:26 says "an existing project folder with the same name is refused". The check only looks for listed paths under the folder, and `VaultReader.list` lists only readable Markdown files. A folder that is empty, holds only non-Markdown files (images, PDFs), or holds only notes Thread may not read is accepted, and the Overview and Questions notes are added into it. Scratch probes outside the repository confirmed three cases. An empty `Projects/Pilot study` was accepted. A folder holding only `a.png` was applied and now holds Overview.md, Questions.md and a.png. After an applied project was undone (Undo leaves the folder), the same name was accepted again. Nothing is overwritten and every path is shown in Review changes, so this is spec and docs drift rather than a safety break.
**Suggested fix:** Decide which behavior is intended. Either refuse when the project folder already exists (for example, when the Overview target's inspected `parents` already reach the project folder depth). That would also refuse re-creating into a folder left by Undo, which is a behavior choice for the user. Or keep the behavior and change the spec and docs/desktop.md to "a project folder that already holds notes Thread can read is refused". Neither change makes Thread overwrite anything; the docs-only change would lose no requirement.
**Resolution:** Repaired in feature 65 step 4: `prepare` inspects the Overview target and refuses whenever the project folder exists, including empty folders, folders with only non-Markdown files and folders left by Undo (tested, and natively `65-flows-2.json`); docs explain removing the empty folder or using a new name. Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: new-project.ts:32-33 refuses when the inspected Overview parents reach the project folder depth, independent of the listing; new-project.test.ts:88-95 covers empty, image-only and post-Undo folders, and a scratch probe showed a folder differing only in case is also refused by the writer's collision check. docs/desktop.md matches the behavior. Closed. (The listing is still used for template skipping; that separate defect is 65/F-48.)

### 65/F-45 [P3] closed - Invalid project names get advice to check the folders

**File:** src/standalone/new-project.ts:36
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `shared()` adds "Check the folders under Saving notes." to every error from the shared builders, including `noteName`'s "Use a note name without path separators or special link characters (up to 100 characters)." A project name such as "Bad/name" or ".hidden" therefore gets advice to check folder settings, which is the wrong fix, and "note name" is the wrong noun for the project name field. new-project.test.ts:51 asserts this combined message. This is a plain-language defect; no safeguard is affected.
**Suggested fix:** Check the name with the shared `noteName` before building notes and show its own message, adapted for a project name (for example "Use a project name without / \\ : * ? \" < > | [ ] # ^, and not starting with a dot."). Keep the folder advice only for destination or exclusion errors, and update the test expectation. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 4: names are checked with the shared `noteName` first and refused with "Use a project name without / \\ : * ? \" < > | [ ] # ^, and not starting with a dot."; the test asserts it for three names. Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: new-project.ts:27 validates with the unchanged shared `noteName` before `starterNotes`, so the folder advice in `shared()` now only follows destination or exclusion errors; new-project.test.ts:52 asserts the new message for "Bad/name", ".hidden" and "a#b", and native `65-flows-2.json` shows it. Closed.

### 65/F-46 [P3] closed - Welcome start buttons do nothing while the Ollama test runs

**File:** src/standalone/welcome-view.ts:45
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** One `busy` flag guards Test the Ollama connection, Preview sample project and New project. `run()` returns silently when busy, without changing the start status line or disabling buttons. Discovery uses the AI operation timeout (`local-ai.ts:52`, default `timeoutMs` 180000), so a slow or hung local endpoint can leave both start actions doing nothing, with no feedback, for up to three minutes. A first-time user may conclude the button is broken.
**Suggested fix:** Use a separate busy flag for each status line, or write "Wait for the current check to finish." to the target status when busy, and disable the action buttons while their work runs. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 4: each status line has its own busy state; a repeated click says "Wait for the current step to finish." and the start actions work while the Ollama test runs (tested). Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: welcome-view.ts:11,44-48 keys busy state by status line and reports a repeated click on that line; welcome-view.test.ts:62-68 holds the Ollama test open and proves the sample action still calls `prepareNewProject`. Closed.

### 65/F-47 [P3] closed - New-project tests do not exercise the relaxed apply rule's refusal or partial rollback

**File:** src/standalone/new-project.test.ts:63
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The spec's Evidence says a folder created outside the apply run "is refused and the batch rolls back with nothing left in Projects or Templates". In the test, the outside folder exists before `confirm`, so `ChangeManager.apply` refuses during its pre-write `matches()` read. No note is ever written, `createdFolders` is empty, and no rollback happens. The refusal branch of `grownByThisRun` when this run has already created folders is untested, and so is partial rollback after one created note (the gap that hid 65/F-43). Separately, the "saving not allowed" case (line 59) uses empty roles and a regex that accepts either message, so it proves the missing-Projects refusal, not the saving-off refusal.
**Suggested fix:** Add a test that changes the folder between creates (for example by wrapping the writer, as with the existing fault-injection style) and asserts refusal, rollback of the first note or a recovery entry, and untouched outside files. Make the saving-off test set the roles and assert the "allow saving" message exactly. Correct the spec Evidence wording to what the tests prove. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 4: tests now cover a folder swapped in between creates and a true saving-off case (roles set, writing released, "allow saving" asserted); the spec evidence states what each test proves. Re-reviewed 2026-10-27 by independent review of 9cf6f99..d64af46: the saving-off case (new-project.test.ts:61-62) and the spec Evidence wording are fixed. The new swap test (lines 74-86) swaps right after the first `create` returns, so it is caught by the new post-create check in `port.create`; the first note is then "uncertain", so nothing is rolled back, and the test does not assert the journal state (it also accepts either error message). The two gaps this finding names therefore remain: the `grownByThisRun` refusal when `createdFolders` is non-empty is never reached by a test (a mutation such as replacing `createdFolders.has(parent)` with `createdFolders.size > 0` passes the whole suite), and rollback of a fully written first note under the relaxed rule is not asserted. Scratch probes show both behaviors are correct today, so this stays a P3 test gap. Suggested repair: add a test that swaps or adds a folder after the first note's post-create inspect (for example by wrapping `writer.inspect` for the second path, or by creating `Projects/<name>/Sub` for a nested second target) and asserts refusal, `history` empty, the first note removed or listed under recovery, and the outside folder empty. Round-2 repair (feature 65 step 5): a test swaps a run-made folder just before the second note's pre-write inspect and asserts refusal, no note in the swapped-in folder and empty history (verified to fail if the rule is weakened to `createdFolders.size > 0`); a second test blocks the next note with an outside file and asserts the first note is rolled back, the outside file untouched and history empty. Re-reviewed 2026-10-27 by independent review of 9cf6f99..a2a7035: new-project.test.ts:106-123 swaps `Projects/Swap later` from a wrapped `writer.inspect` only after the first create, so the second note's `prepare` reaches `grownByThisRun` with a non-empty `createdFolders` and is refused; the test asserts the swapped-in folder stays empty and history is empty. A scratch mutation outside the repository (`createdFolders.has(parent)` replaced by `createdFolders.size > 0`) makes exactly this test fail. The blocked-note half writes an outside `Questions.md` after the first create, and asserts the folder then holds only that untouched file (so the fully written Overview was rolled back through `removeCreated`) and history is empty. Both gaps named here are covered; no new defect found. Closed.

### 65/F-48 [P1] closed - Existing templates are missed in vaults past the listing limit, so New project is refused with a misleading message

**File:** src/standalone/new-project.ts:29
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** `prepare` decides which templates "already exist" with `listed = new Set((await this.reader.list(revision)).paths)` and keeps every template not in that set (line 35). `VaultReader.list` stops at `READ_LIMITS.notes` (500 notes), 5000 entries or 10 seconds (`vault-reader.ts:11,142`) and silently omits the rest. In any vault where the Templates notes fall past that cutoff (for example, more than 500 readable notes under Projects listed first, or a "." scope in a larger vault where directory order is arbitrary), an existing `Templates/Thread Project.md` is proposed again with `before: null`. `DesktopChanges.propose` then inspects the real file and refuses the whole request with "The note changed before the change was prepared. Open it again." That message gives the user no usable next step. Reproduced with a scratch test outside the repository: real VaultReader, DesktopStorage, DesktopChanges and DesktopNewProject, the three Thread templates present, 520 notes in `Projects/Bulk`; `prepare("project", "Large vault")` was refused with that message, and the existing template was left unchanged. The spec says New project "skips template notes that already exist", and the docs say "templates that already exist are kept and skipped". In such a vault every New project after the first fails. A user who already has these templates from the Obsidian plugin (the same `starterNotes` creates them) cannot create even the first one. Nothing is overwritten (propose and the writer refuse), so there is no data loss, but a core action of this feature is broken for realistic vault sizes. The native evidence used a vault with a handful of notes.
**Suggested fix:** Decide existence per target instead of from the bounded listing. For each starter note outside the project folder, call `this.writer.inspect(note.path, revision)` and skip it when `file !== null`; that call already refuses case-variant collisions and links plainly. The listing is then unnecessary: the project-folder check at line 33 is already covered by the inspected Overview parents. Add a test with more than `READ_LIMITS.notes` notes listed before Templates and existing templates, expecting a proposal with only Overview and Questions. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 5: `prepare` no longer uses the note listing; it inspects each template target on disk and skips it when a file exists. A test with 520 notes listed before Templates and existing templates proposes only Overview and Questions and leaves the templates unchanged after Apply. Re-reviewed 2026-10-27 by independent review of 9cf6f99..a2a7035: new-project.ts:35-36 no longer calls `reader.list`; every starter note outside the project folder is kept only when `writer.inspect(...).file === null`, and the project folder check (line 33) still uses the inspected Overview parents. new-project.test.ts:97-104 asserts a proposal of only Overview and Questions in a vault with 520 notes in `Projects/Bulk`, and that the existing template text is unchanged after Apply. Running that test against the d64af46 listing-based `prepare` in a scratch copy fails, so it reaches the defect. Further scratch probes: partially present templates propose only the missing ones; missing Projects and Templates folders (nested under `Work/`) are all created in one apply through the relaxed rule; a Templates folder outside read scope is refused plainly before any proposal. Existing templates are never overwritten (create-only proposal, O_EXCL writer). No new defect found. Closed.

### 65/F-49 [P3] closed - Welcome step 2 does nothing before a folder is chosen

**File:** src/standalone/renderer.ts:284
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** "Go to What Thread may read" runs `focusAccess`, which opens `#access` and focuses `#roots`. Both live inside `#vault-details` (app.html:30-36), which stays hidden until a folder is chosen. A first-time user who clicks step 2 before step 1 sees nothing happen and gets no message. The status line only says "Thread cannot read anything yet." The welcome flow exists to guide non-technical users without documentation, and the coding standards ask for plain failure states with a useful next action. No safeguard is affected.
**Suggested fix:** When no folder is chosen, write "Choose your notes folder first (step 1)." to `welcome-access-status` instead of focusing the hidden field, for example by having `focusAccess` return whether it could focus and letting `WelcomeView` report it. Add a view test for that case. No requirement would be lost.
**Resolution:** Repaired in feature 65 step 5: `focusAccess` returns whether it could focus; with no folder chosen, step 2 says "Choose your notes folder first (step 1)." (view test). Re-reviewed 2026-10-27 by independent review of 9cf6f99..a2a7035: renderer.ts:284 returns false when no vault is chosen (the same condition that keeps `#vault-details` hidden, since `showVault` unhides it), and welcome-view.ts:18 then writes the step 1 hint into the step 2 status line; welcome-view.test.ts:35 asserts it. The visible no-feedback defect is gone. The status line it writes to is not a live region, so a screen reader user still hears nothing; that is recorded separately as 65/F-50. Closed.

### 65/F-50 [P3] open - Welcome step 1 and step 2 status lines are not announced to screen readers

**File:** src/standalone/app.html:138
**Found:** 2026-10-27, `/audit independent (scope: current; lens: quality, security, performance, tests)`
**Why it matters:** The 65/F-49 repair writes "Choose your notes folder first (step 1)." into `#welcome-access-status`, and `#welcome-folder-status` (app.html:135) also changes live as the folder is chosen. Neither paragraph has `role="status"` or `aria-live`, unlike the step 3 and step 4 status lines (app.html:144,150) and every other panel status in the window. Focus stays on the step 2 button, so a keyboard or screen reader user who presses it before choosing a folder still gets no feedback, which is the problem 65/F-49 set out to fix. AGENTS.md says simplicity never removes accessibility. No safeguard is affected.
**Suggested fix:** Add `role="status" aria-live="polite"` to `#welcome-access-status` (and `#welcome-folder-status`), matching the other welcome status lines. Markup only; no requirement would be lost.
**Resolution:**

## Independent review

# Independent Review

**Status:** passed
**Target commit:** a2a7035d4db6228020c9ee3b0d261ad28bf1f708
**Base commit:** 9cf6f9911c516293875f6be0775173008039d417
**Base ref:** main
**Spec hash:** 48d628ee0081ba6b2c761170855c71ba3f8c0d2fadb5c044449b093c5d4a9162
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T21:53:05Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T21:57:36Z
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

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: pass (HEAD, merge base and spec hash match the request; only review.md and findings.md differ)
- `npm run verify` (typecheck, tests, production build): pass (546 tests, 0 failed, plugin and desktop builds)
- `node --experimental-strip-types --test` on new-project and changes tests in a scratch copy outside the repository with mutations: pass as probes (old listing-based `prepare` fails the large-vault test; `createdFolders.size > 0` fails the swap test; removing the post-create parent or hash check in `port.create` leaves the suite green)
- Scratch probe tests outside the repository (real VaultReader, DesktopStorage, DesktopChanges, DesktopNewProject): pass (nested missing Projects/Templates created in one apply; partial templates; Templates outside read scope refused; folder swap after first create refused with recovery and nothing in the outside folder)
- Lint: unavailable (no lint command configured)

## Evidence

- Full delta 9cf6f99..a2a7035 reviewed: changes.ts, vault-writer.ts, new-project.ts and tests, welcome-view.ts and tests, renderer.ts, app.html, styles.css, main.ts, preload.ts, contracts.ts, saved-access-view.ts, carried F-39 to F-42 text files, docs/desktop.md, spec, build-plan item 65, project-plan section 63-65.
- Relaxed apply rule: `createdFolders` holds only identities from the chain `VaultWriter.create` returned past the pre-write depth (EEXIST refused there), re-checked against a fresh inspect and the written note's hash; any other folder growth or a file at the target is still refused; create-only O_EXCL writes, collision checks, rollback via `removeCreated` and recovery entries are unchanged; saves.ts:56 ignores the new return value.
- new-project.ts: renderer supplies only kind, name and revision; paths come from saved roles via the unchanged shared `starterNotes`/`sampleNote`; kind, name (noteName) and revision validated; any existing project folder refused via inspected parents; templates checked per target on disk; one create-only proposal through `DesktopChanges.propose`, nothing written before Apply; an existing pending proposal blocks a new one.
- IPC `thread:prepare-new-project` uses the trusted-sender and arity-checked `handle` wrapper.
- Native evidence `.thread-local/desktop-63-65/evidence/65-*` inspected (first-launch light and dark screenshots, skip/reopen, flows, flows-2, keyboard tab order, launch with saved access); no GUI launched by the reviewer.

## Findings

- F-47 closed, F-48 closed, F-49 closed (re-reviewed against a2a7035)
- F-50 [P3] open - Welcome step 1 and step 2 status lines are not announced to screen readers

## Remaining risk

- Native evidence predates step 5; the on-disk template check and the step 2 `focusAccess` change are proven by tests and Verify only, not re-run in the actual Electron window.
- The post-create parent and hash check in `port.create` is not distinguished by any test (removing it keeps the suite green); safety is still held by `grownByThisRun` using the chain returned by `create`.
- Pre-existing race between `mkdir` and `open` inside `VaultWriter.create` could let an outside folder identity enter the verified chain; under the relaxed rule a second create-only note could follow it into that folder. Needs two outside folder operations within microseconds; no overwrite or loss.
- Folder identities are dev:ino strings; inode reuse within one apply run is theoretical and not guarded.
- A failed Apply or Undo leaves created folders, so the same project name is refused until the user removes the empty folder (docs mention Undo only).
- Lint: unavailable (no lint command configured).
