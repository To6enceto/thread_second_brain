# Feature: Remembered desktop access

**From build-plan:** feature 63
**Build attempt:** 1
**Status:** verified
**Branch:** feature/remembered-desktop-access

## Goal

Let a person opt in to remembering one vault's access in Thread Desktop, so a later
launch shows exactly what was saved and continues with one click instead of
re-choosing the folder, retyping paths, refreshing projects and re-applying AI.

## In scope

- **Remember this access** (explicit button, enabled only after read access is
  approved). Main saves, from main-held state only: vault path, vault filesystem
  identity (the existing `reader.identity` hash), the approved read roots and
  exclusions, the project folder mapping supplied by the renderer (validated) and
  the applied local AI endpoint/model plus an optional embedding model name
  (validated). Saving again replaces the previous entry. One vault only.
- Storage: `access.json` under the desktop profile's private `thread-v1/` folder
  (Electron user data; the ignored project-local profile in development), written
  through the existing `ProfileFile` atomic, private, bounded writer. Never in the
  vault or repository.
- Launch: when saved access exists, the sidebar shows a **Saved access** card with
  the folder, allowed and excluded paths, project folder, AI model and saved time,
  plus **Continue with saved access** and **Forget saved access**. Nothing is read
  until Continue.
- Continue: main re-opens the saved path with the existing safe directory walk,
  refuses an unavailable path, a different filesystem identity (moved/replaced
  vault) or an invalid scope, then grants the saved scope through the existing
  validation and initializes desktop storage. The renderer fills the access fields,
  indexes, refreshes projects when a mapping was saved, and rechecks the saved model:
  discovery must list it as a downloaded local text (and embedding) model, then
  Apply and the existing cloud-disabled connection test must pass. Any AI failure
  leaves Thread working without AI with a plain message.
- Forget: removes the saved entry. An unreadable or invalid `access.json` is never
  used: the card says so, and Forget removes only that file.
- Docs: a "Remembered access" section in `docs/desktop.md`.

## Out of scope

- Remembering PDF consent, desktop writing/writer ownership, storage compatibility
  inspection, selected project, theme or open views. These stay per-session.
- Importing plugin grants. Several saved vaults. Automatic launch-time reads.
- Plain-language rewrite of existing copy (feature 64) and first-run flow (65).

## Build loop

Continuous Mode builds these steps serially with self-review and Verify after each.
Step checkpoint commits are disabled. Remembered read access is a security/privacy
boundary, so actual Electron acceptance with an isolated profile and synthetic vault
plus a fresh passing independent review are required before archive and local
merge. At most two repairs per failing check or finding; never weaken gates.

## Build steps

- [x] 1. Add `src/standalone/remembered-access.ts` (`RememberedAccess`) with the
  versioned state schema, validation, `status()`, `remember()`, `forget()` and
  `open()` (select saved path, identity check, grant), allow the `access.json`
  filename and an explicit single-file `remove()` in `ProfileFile`, and expose the
  applied AI settings from `DesktopAI`. Done when unit tests prove: only main-held
  scope/identity is saved; invalid project folder, model names and cloud models are
  refused; remembering without approved access is refused; PDF consent and writing
  are absent from the saved data; open refuses a missing path and a replaced
  directory and grants exactly the saved scope; an invalid file is reported, never
  used, and Forget removes it; and Verify passes.
- [x] 2. Wire IPC, preload and contracts (`savedAccess`, `rememberAccess`,
  `forgetSavedAccess`, `continueSavedAccess`) with argument counts, the folder-dialog
  guard and the same invalidation as choosing a vault. Done when typecheck and Verify
  pass and the contracts expose no raw path or file operation beyond these methods.
- [x] 3. Add the renderer card and controls (`saved-access-view.ts`), a shared
  vault-display helper in `renderer.ts`, and `ModelSetup.restore()`. Done when view
  tests prove the card shows exactly the saved values, Continue and Forget call only
  their bridge methods, Remember is disabled before approval, a failed continue keeps
  the card with the error, and restore marks AI usable only after discovery, apply
  and the connection test pass; and Verify passes.
- [x] 4. Document remembered access and collect native evidence in the actual Electron
  window (isolated profile, synthetic vault, project-owned Ollama): remember,
  restart, card shown with no reads, one-click continue with notes, projects and
  rechecked model; Ollama stopped gives notes without AI; a replaced vault folder is
  refused; Forget clears the card after restart; PDF consent is not restored. Done
  when evidence is recorded and Verify passes.
- [x] 5. Repair independent-review findings F-11 and F-12: a failed AI recheck resets
  main to recorded-only, and Continue stops its remaining steps once the reopened vault
  is no longer current. Done when focused tests cover both, native Close-during-Continue
  leaves no model, projects or notes, the one-click Continue path still passes natively,
  and Verify passes.
- [x] 6. Repair independent-review findings F-13 and F-14: Cancel or a superseded
  remembered-model recheck returns main to recorded-only without undoing a newer explicit
  Apply, main resets AI after vault-switch awaits, and a refused Remember write reloads the
  saved file so Remember keeps working. Done when focused tests cover both, one-click
  Continue still passes natively, and Verify passes.

## Evidence

- Verify (`npm run verify`) passed after every step: 525, 525, 531, 531, 532 and 534 tests, 0 failed, both builds.
- Native acceptance in the actual Electron window on isolated Xvfb :198, profile
  `.thread-local/desktop-63-65/profile-63`, synthetic `vault-63`, project-owned
  cloud-disabled Ollama on 127.0.0.1:11439 (`qwen3:4b-instruct`); evidence in
  `.thread-local/desktop-63-65/evidence/63-*`:
  - Fresh profile: no card, Remember disabled. Vault chosen in the GTK dialog; access
    approved (Secret.md excluded), projects mapped, model applied and tested, Study.pdf
    granted, then Remember: `access.json` mode 0600 with only path, identity, scope,
    mapping, AI and time; no PDF.
  - Restart: card lists exactly the saved values; no vault details or notes; a direct
    `listNotes` is refused by main.
  - Continue (one click): access fields, notes, Projects/Demo, "Saved AI rechecked"
    with the connection test; Resume produced a real local AI interpretation; Study.pdf
    shows "Grant PDF read" (not restored).
  - Ollama stopped: Continue opens notes and projects, AI message ends "Thread is working
    without AI until you set it up again."
  - Missing folder and a replacement folder at the same path: plain refusals, card kept,
    vault details hidden, main holds no vault.
  - Forget via keyboard (Enter on the focused button): card hidden, `access.json` removed,
    no card after restart.
  - After the step 5 repairs: Close clicked as soon as Continue showed the vault leaves
    no AI model, projects, notes or "opened" message (`63-close-during-continue.json`);
    one-click Continue still restores notes, projects, the rechecked model and a real AI
    Resume (`63-continue-after-repair.json`). Native vault picks type the path without a
    trailing slash and delete GTK's inline completion before Open.
  - After the step 6 repairs, one-click Continue again restored notes, projects, the
    rechecked model and a real AI Resume (`63-continue-after-repair-2.json`).

## Files / areas

- New: `src/standalone/remembered-access.ts`, `remembered-access.test.ts`,
  `saved-access-view.ts`, `saved-access-view.test.ts`.
- Changed: `profile-file.ts`, `local-ai.ts`, `main.ts`, `preload.ts`, `contracts.ts`,
  `renderer.ts`, `model-setup.ts`, `app.html`, `styles.css` (if needed),
  `docs/desktop.md`.

## Data / contracts

`access.json` (UTF-8 JSON, at most 64 KiB, mode 0600 in a 0700 folder):

```json
{ "schemaVersion": 1,
  "saved": null | { "path": "/abs/normalized", "identity": "<64 hex>",
    "scope": { "roots": ["..."], "excluded": ["..."] }, "projectsFolder": "" | "<relative>",
    "ai": { "endpoint": "http://127.0.0.1:11434", "model": "", "embeddingModel": "" },
    "savedAt": "<ISO-8601>" } }
```

Exact keys only; `path` absolute, normalized, at most 4096 characters, no NUL;
scope via `scopeInput`; `projectsFolder` empty or `relativePath` and not `.`;
endpoint via `localEndpoint`; model names follow the existing local-model rule.
IPC results: `SavedAccessStatus { saved: SavedAccessSummary | null; warning: string }`
and `ContinuedAccess { vault: VaultInfo; projectsFolder: string; ai: { endpoint; model; embeddingModel } }`.
Errors use `DesktopError` plain messages.

## Testing

Focused tests next to sources with real temporary directories for the main store and
the fake-DOM pattern used by existing view tests. `npm run verify` after each step.
Native acceptance per step 4; plugin code is unchanged, so no Obsidian regression is
required beyond Verify building the plugin.

## Notes for the AI

- Keep reads lazy: `status()` reads only `access.json`, never the vault.
- Identity mismatch or missing path must close the reader, keep the saved entry and
  tell the user to choose the folder again or Forget.
- Do not restore a model as usable from the saved name alone.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9691,"specSha256":"fcd061342d8aa1802e307087b4f9766035889c0fe0db5dc6584969df0061279d","branch":"refs/heads/feature/remembered-desktop-access","head":"e1fdbac126008bbbd2e084bd466d0a23c1f5f826","baseRef":"refs/heads/main","baseCommit":"f1d62d24d61b3a880be2cee980974af4f37439cf","sourceTree":"488c1fd11b16d79e047c2451bb968327a1a4973a","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 63/F-11 [P3] closed - A failed restore connection test leaves the saved model applied in main

**File:** src/standalone/model-setup.ts:49
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** `ModelSetup.restore()` calls `configureAI` with the saved model before `checkAI`. If the connection test then fails, the catch at line 53 reports "Thread is working without AI until you set it up again." Only the renderer state is left unusable (`model()` returns ""). Main's `DesktopAI` configuration still holds the saved model. Actions "Generate session wrap-up" (`records.ts:214`) and Research synthesis (`knowledge.ts:74`) read main's configuration and are not gated on the renderer model, so they can still run the remembered model. This contradicts the spec ("Apply and the existing cloud-disabled connection test must pass. Any AI failure leaves Thread working without AI"). No cloud boundary is crossed, because `OllamaClient.generate` re-runs the capability and cloud-disabled check on every request.
**Suggested fix:** When restore fails after `configureAI` succeeded, call `bridge.configureAI({ endpoint, model: "" })` before rethrowing (and only while `current()` holds), so main matches the "without AI" message. Extend the check-failure case in `model-setup.test.ts` to assert the fallback configure call.
**Resolution:** Repaired in feature 63 step 5: when the recheck fails after `configureAI` succeeded and the restore is still current, `ModelSetup.restore()` configures main back to recorded-only before reporting. `model-setup.test.ts` asserts the fallback configure call on a failed connection test and no configure call for an unlisted model. Re-reviewed 2026-10-27 by /audit independent at cf191ee: a failed check or a failed apply while the restore is current now leaves main on recorded-only (model-setup.ts:56), and the test asserts the exact two configure calls. Closed. The superseded-restore path (user Cancel, Choose race) is a separate residual and is tracked as 63/F-13.

### 63/F-12 [P3] closed - Continue starts the AI recheck without confirming the continued vault is still current

**File:** src/standalone/renderer.ts:271
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The SavedAccessView `continued` callback awaits `storageView.refresh()` and `loadNotes()`, then calls `void modelSetup.restore(result.ai)` without checking that `vault?.revision` is still `result.vault.revision`. Close and Choose vault folder stay enabled during that indexing. Closing during indexing leaves "Saved AI rechecked" shown, with the model marked usable and main configured, while no vault is open. A Choose race can apply the remembered model to a different vault's session. That breaks the per-vault AI reset invariant and the coding standard to confirm view, scope and source state after async work. Impact is limited: the model is local, and the next vault choice or Continue resets both sides.
**Suggested fix:** Capture `result.vault.revision` and, after each await in the callback, return early unless `vault?.revision === result.vault.revision`, before refreshing projects and before starting `modelSetup.restore`. Add a view-level or renderer-level test that closing during Continue skips the restore.
**Resolution:** Repaired in feature 63 step 5: the Continue callback runs its steps through `continueSteps()`, which stops before storage, notes, projects or AI restore once the reopened vault revision is no longer current, and returns false so the view does not announce an opened vault. `saved-access-view.test.ts` covers the stop and the suppressed announcement; native evidence `63-close-during-continue.json` shows Close during Continue leaves no model, projects or notes. Re-reviewed 2026-10-27 by /audit independent at cf191ee: `continueSteps` (saved-access-view.ts:84) checks the revision before every step and at the end, and renderer.ts:272-277 passes `vault?.revision`. A Close, Choose or new approval before the restore starts now stops projects and AI. Close after the restore starts is also safe, because `resetVault()` bumps the ModelSetup epoch before `closeVault`. Closed. The remaining Choose window inside an already-started restore is tracked as 63/F-13.

### 63/F-13 [P3] closed - A superseded remembered-model recheck can leave main configured with the unchecked saved model

**File:** src/standalone/model-setup.ts:50
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** `restore()` configures main with the saved model before the connection test. It resets main only `if (configured && current())` (line 56) and returns silently on `!current()` after configure (line 50). Pressing "Cancel checks" (line 23) during the apply or the connection test bumps the epoch and aborts the check, so neither path resets main. Main's `DesktopAI` keeps the saved model while the renderer shows "Local checks canceled." and `model()` returns "". "Generate session wrap-up" (records.ts:214) and knowledge generation (knowledge.ts:74) gate only on main's `settings.model`, so the remembered model can run although the spec says it is usable only after the connection test passes ("Do not restore a model as usable from the saved name alone"). A narrower race does the same with Choose vault folder while a restore is in flight. If the restore's `configureAI` reaches main during `await storage.initialize` in the select-vault handler (main.ts:110, after `ai.reset()`), the model applies to the newly chosen vault's session. The renderer's later `modelSetup.reset()` then makes the restore non-current, so nothing undoes it. Impact is low: the model was discovered as a downloaded local model at a validated loopback endpoint, and `OllamaClient.generate` rechecks capability and cloud-disabled status on every request.
**Suggested fix:** Track an unconfirmed restored configuration in `ModelSetup` (set after the restore's configure, cleared on a passing check or a later explicit Apply). Have the Cancel handler and the restore's non-current exits reset main to `{ endpoint, model: "" }` while that flag is still set. In main, refuse `thread:configure-ai` while `choosing` is true, or repeat `ai.reset()` after the final await in the select-vault handler. Add a `model-setup.test.ts` case for Cancel during the check that asserts the recorded-only configure call.
**Resolution:** Repaired in feature 63 step 6: `ModelSetup` counts configurations sent to main and records a restored model as unconfirmed until its connection test passes. Cancel, a failed recheck or a superseded restore revert main to recorded-only only while that model is still the latest configuration, so a newer explicit Apply is never undone. Main resets AI again after the final await when choosing or continuing a vault. `model-setup.test.ts` covers Cancel during the check (revert, and a late pass ignored) and an Apply during an in-flight restore (no revert). Re-reviewed 2026-10-27 by /audit independent at e1fdbac: traced Cancel during apply (the post-configure `!current()` exit calls `revert()` because the serial is still latest), Cancel during the check (the handler's `revert()` sends recorded-only), user edits or Discover during the restore (non-current exit reverts), Apply before or after the restore's configure resolves (Apply clears `unconfirmed` and bumps the serial, so no revert; main processes the IPCs in send order), and Close/Continue (`reset()` runs synchronously before the main IPC, and main `clearVault` resets AI). Main's select-vault and continue handlers now call `ai.reset()` after their last await (main.ts:111, 219). The original defect is gone and no new defect was introduced. Closed. Residual: a restore whose discovery resolves in the renderer after main finished select-vault but before the renderer handles that reply can still configure the new session. That is a single IPC round-trip coincidence and is recorded as remaining risk, not a finding.

### 63/F-14 [P3] closed - A failed Remember write disables Remember for the rest of the session with a misleading message

**File:** src/standalone/remembered-access.ts:62
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** `remember()` calls `ProfileFile.store()`, which sets `loaded = false` on any failure (profile-file.ts:75). That includes the `current()` revision guard firing when Close or Approve read access lands during the write, and transient write errors. Every later Remember then fails at profile-file.ts:60 with "Desktop history is unavailable or busy. Reopen and inspect it before writing." That message is about history, not saved access. The only in-session recovery is Forget, which deletes the still-valid previous entry, or restarting Thread. The existing saved entry is not damaged, and no access is widened.
**Suggested fix:** In `RememberedAccess.remember`, catch a store failure, re-run `this.load()` (which reads only `access.json` and restores `loaded` when the file is still valid or absent), then rethrow the original error. Add a test that a refused store (revision changed inside `current()`) still allows a later Remember.
**Resolution:** Repaired in feature 63 step 6: `RememberedAccess.remember` reloads `access.json` after a refused or failed write and rethrows a saved-access message, so the previous entry stays and a later Remember works. `remembered-access.test.ts` forces the in-store revision guard and then remembers successfully. Re-reviewed 2026-10-27 by /audit independent at e1fdbac: remembered-access.ts:59-63 catches every store failure, `load()` itself never throws (it records the unreadable warning instead), and the test proves the file bytes are unchanged, no warning is set, and the next Remember succeeds. The original defect is gone. Store errors that are already `DesktopError` (for example "Desktop history changed in another process") still pass through with history wording. That is cosmetic and does not block Remember. Closed.

### 63/F-15 [P3] open - Storage panel copy still says read access is never restored

**File:** src/standalone/app.html:48
**Found:** 2026-10-27 by /audit independent (scope: current; lens: quality, security, performance, tests)
**Why it matters:** The "Desktop storage and writing" panel still reads "Read access and PDF consent are never restored or imported." Feature 63 now lets the user explicitly remember read access and restore it with Continue, and the same window's Remember help text says so. Two statements about the same privacy boundary contradict each other in the same window. `docs/desktop.md:165` ("read grants ... are never restored automatically") is technically still accurate but would read better with a pointer to Remembered access. No behavior or boundary is wrong; only the user-facing copy is stale.
**Suggested fix:** Change app.html:48 to something like "PDF consent is never restored or imported; read access is restored only from saved access you chose to remember." Optionally add "(see Remembered access)" after the docs/desktop.md:165 sentence. No requirement would be lost.
**Resolution:**

## Independent review

# Independent Review

**Status:** passed
**Target commit:** e1fdbac126008bbbd2e084bd466d0a23c1f5f826
**Base commit:** f1d62d24d61b3a880be2cee980974af4f37439cf
**Base ref:** main
**Spec hash:** fcd061342d8aa1802e307087b4f9766035889c0fe0db5dc6584969df0061279d
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-27T19:13:31Z
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-27T19:17:43Z
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

- `git rev-parse HEAD`: pass (e1fdbac126008bbbd2e084bd466d0a23c1f5f826 equals Target commit)
- `git merge-base main HEAD`: pass (f1d62d24d61b3a880be2cee980974af4f37439cf equals Base commit)
- `sha256sum blueprint/context/current-feature.md`: pass (matches Spec hash)
- `git status --porcelain`: pass (only blueprint/context/findings.md and blueprint/context/review.md differ, before and after Verify)
- `git diff f1d62d24d61b3a880be2cee980974af4f37439cf..e1fdbac126008bbbd2e084bd466d0a23c1f5f826`: reviewed (16 files, +715/-28)
- `npm run verify`: pass (typecheck, 534 tests with 0 failed and 0 skipped, plugin production build and desktop build)

## Evidence

- Full delta reviewed against current-feature.md and project-plan.md "Approved improvements - everyday desktop use (63-65)": remembered-access.ts, profile-file.ts, local-ai.ts, main.ts, preload.ts, contracts.ts, renderer.ts, saved-access-view.ts, model-setup.ts, app.html, styles.css, docs/desktop.md and the three new test files; callers inspected in vault-reader.ts, storage.ts, profile.ts.
- No vault read before Continue: launch calls only `remembered.load()` (reads `access.json`) and `thread:saved-access` returns in-memory status; `reader.select` runs only inside `thread:continue-saved-access`.
- Renderer influence bounded: `remember-access` takes only project folder (relativePath, not "."), embedding name (local-model rule) and revision (must equal current); path, identity and scope come from `VaultReader`, endpoint and model from main `DesktopAI.settings()`; `continue-saved-access` takes zero arguments.
- Refusals: Continue runs `clearVault()` before reopening. A missing path or an identity mismatch calls `reader.close()` and keeps the saved entry. Tests and native `63-refuse-missing.json` / `63-refuse-replaced.json` show main holds no vault afterwards.
- PDF consent and writing: `accessState` accepts exact keys only; `grant` clears `pdfs`; `storage.initialize` takes no writer ownership; native `63-continue*.json` shows "Grant PDF read"; synthetic profile `access.json` holds only path, identity, scope, mapping, AI and time, mode 0600 in a 0700 folder, Git-ignored.
- `ProfileFile.remove()` unlinks only this filename, tolerates ENOENT, syncs the folder, and resets state; test proves a sibling profile file survives.
- ModelSetup configuration serial: traced Cancel, edit, Discover, Apply, Close, Continue and Choose against the restore's configure and check awaits (see F-13 resolution).
- `continueSteps` checks the revision before each step and at the end; native `63-close-during-continue.json` and `63-continue-after-repair-2.json` match the code paths.
- Tests are behavioral, use real temp directories for the store and fake DOM for views; no skipped, focused or placeholder tests found in the delta.

## Findings

- F-13 closed (re-reviewed at e1fdbac)
- F-14 closed (re-reviewed at e1fdbac)
- F-15 [P3] open - Storage panel copy still says read access is never restored
- F-11 and F-12 remain closed

## Remaining risk

- Choose race: a remembered-model restore whose discovery resolves in the renderer after main finished select-vault but before the renderer handles that reply can still configure the newly chosen session with the discovered, not-yet-tested model. This needs a single IPC round-trip coincidence. The model is local and loopback-only, and generation rechecks cloud-disabled status.
- If `storage.initialize` throws inside Continue (folder replaced in the instant between the identity check and profile loading), main keeps a selection whose reads all fail the dev/ino check; renderer shows no vault.
- Main IPC handlers for Continue and Remember have no unit tests; coverage relies on native evidence and the RememberedAccess/view tests.
- Native Electron acceptance was not re-run by this reviewer (constraint); evidence files were inspected against the code only.
- No lint, browser-test or security-scanner command is configured for this project.
