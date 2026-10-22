# Thread Desktop preview

Thread has an independent Linux window with scoped vault browsing, keyword
evidence search, safe Markdown navigation, project home, recorded Resume, optional
local AI interpretation, an Ask evidence workbench, bounded follow-ups and reviewed
new-note saves, exact existing-note change review, guarded undo and interruption
recovery, decisions and managed questions. Obsidian can stay closed. Remaining
desktop workflows are tracked in items 58-62 of the build plan; the existing plugin remains available.

## Run from this checkout

Use Node.js 22.15 or newer in your normal Fedora graphical session:

```bash
cd /home/to6eto/Desktop/fresh_project/thread
npm ci
npm run desktop:setup
npm run desktop:start
```

`desktop:setup` explicitly downloads the pinned Electron runtime into local
dependencies (with its download cache under ignored `.thread-local/`). It needs
Internet the first time. `desktop:start` builds and opens Thread; it does not
launch Obsidian, Ollama or a web server, and does not download missing runtimes.
No sudo, system-wide installation or desktop shortcut is needed.

The development profile lives at `.thread-local/desktop/profile`, separate from
your vault and the plugin's settings/history. Access grants are held only in memory.
Closing/restarting or reloading Thread clears them. This is a development preview;
a distributable installer and persistent setup arrive in later planned features.

## Try it now

1. Choose **Choose vault folder** and select a folder containing your Markdown
   notes. This selection alone grants no content access.
2. In **Allowed paths**, enter a vault-relative folder such as `Projects` (or a
   particular note such as `Projects/Example/Overview.md`). Put any private paths
   in **Excluded paths**, one per line.
3. Inspect **Access after approval**, then choose **Approve read access**.
   Use `.` only when you explicitly intend to grant the entire vault. Hidden
   folders, including `.obsidian`, remain unavailable; exclusions take precedence.
4. Choose a listed note, or enter keywords or a quoted phrase in **Search note
   contents** and choose **Search evidence**. A result opens its current source
   near the cited heading. **Filter listed paths** filters names, not note text.
5. The formatted preview supports headings, simple emphasis, lists, quotes, code
   and internal wiki/Markdown links. HTML and embeds stay inert; no remote assets
   are loaded. Expand **Original Markdown source** to inspect the literal text.
   Ambiguous links offer explicit choices. Missing/repeated headings are explained.
6. External changes are checked every 2.5 seconds and before search/navigation.
   Changed sources clear old visible evidence and invalidate dependent outputs.
   Reopen or search again to see replacements. **Refresh** explicitly reconciles;
   **Cancel indexing** clears evidence and pauses monitoring until Refresh.
7. Clear Allowed paths and approve, or choose **Close vault and clear access**.
   The old source and list disappear. No note or plugin history is changed.

Use **Appearance** for light/dark/system. All controls support keyboard navigation;
source text can receive keyboard focus for scrolling and selection.

## Limits and troubleshooting

- Linux only in this milestone, using descriptor-relative `/proc/self/fd` reads.
  Symlinked vaults/paths and hardlinked notes are refused; select ordinary folders.
- Markdown `.md`, valid UTF-8, at most 2 MiB per source. Other formats are omitted.
- At most 500 notes, 5000 encountered entries, 16 directory levels and a 10-second
  traversal budget. Coverage reports omissions/limits. Narrow the granted roots
  to inspect other notes; the path filter searches only the returned list.
- The index uses the conservative profile: at most 1 MiB per admitted note, 8 MiB
  admitted raw text, 60,000 characters and 60 chunks per note, and 2 MiB serialized
  entries. Basic Search evidence returns at most 20 balanced passages; Ask offers explicit
  larger finite budgets described below. Coverage reports omitted
  notes and shortened sections; it does not establish exhaustive vault coverage.
- YAML 1.2 metadata uses the bundled ISC-licensed yaml parser. Invalid, duplicate,
  unknown-tag or aliased headers omit the note from evidence; its original source
  remains readable. Ordinary metadata is limited to 64 KiB. Supported action
  histories may exceed that header limit within their 256 KiB record and 1 MiB
  note bounds. No plugin metadata parser is required.
- The formatted preview is capped at 120,000 characters, 2,000 blocks and 5,000
  inline tokens. The literal source remains available. Parent traversal, hidden,
  external and attachment links are refused. Full Obsidian syntax is not emulated.
- The reader shows a snapshot. Polling has an observation delay and no atomic
  whole-vault snapshot guarantee. Changed hash-bearing evidence links refuse to
  open; search again. Modification dates do not establish recorded event dates.
- An unavailable/moved/replaced vault requires selecting its current location and
  approving access again. An invalid scope never silently becomes a whole-vault grant.
- If the runtime is missing, run `npm run desktop:setup`. If startup fails, use a
  normal graphical Linux session. Do not disable Electron's sandbox to work around
  launch errors; preserve the terminal error for diagnosis.
- `npm run dev` still watches the **Obsidian plugin** only. It does not open this
  window. `npm run verify` typechecks/tests both targets and builds both.

The standalone UI cannot load Obsidian community plugins/themes. It currently
leaves plugin settings and journals unchanged. New-note saves and existing-note
updates require the explicit desktop storage setup below.

A failed or bounded Markdown enumeration leaves stable-ID uniqueness unproven.
Known omitted Markdown files are counted separately from unsupported attachments;
uninspected directories have an unknown file count. Identity-dependent generated
outputs stay out of search until coverage is restored or scope is explicitly
narrowed. Formatted Markdown also bounds failed delimiter parsing; remaining
syntax stays literal with a limit notice. Original Markdown is still available.

Source heading navigation checks the full permitted note before highlighting a
shortened preview. Repeated headings, including those beyond the display limit,
require manual inspection of the original source. Shared link indexing scans
malformed delimiters without repeated backtracking so cancellation stays usable.

The shared heading parser also avoids whitespace backtracking in both indexing
and evidence construction; oversized headings remain explicitly omitted by the
existing section budget.

## Project home and recorded Resume

After read access is approved, choose **Refresh projects**. Notes with `type:
project` discover their containing project folder. For existing Overview.md notes
without that metadata, expand **Project folder mapping**, enter `Projects` (or your
own named folder), then **Refresh projects**. This only organizes already permitted
notes; it never grants access. Root-level projects are not supported in this milestone.

Select **Project** to see recent sessions, decision status/date summaries and open
questions. Choose **Resume project** for deterministic quoted context and source
chips. Expand **Supporting excerpt** or **Evidence used** to inspect the supporting
passages. A chip opens the current source inside Thread; **Back to project** returns to
the current briefing without regeneration. **Project home** and **Resume project**
explicitly rebuild their views. No Ollama/model is required here.

Missing records remain explicit. Recorded dates and user-reported progress are not
independently verified events. Index and 16,000-character context limits remain
visible; generated records with stale or unavailable dependencies are withheld.
Plugin pending reviews are not loaded. Project membership follows existing schema:
folder contents, explicit links from those notes, and matching project IDs.

External edits, access changes and Cancel indexing clear the project output too.
Refresh projects and select again to rebuild it. Source bytes/dependencies are
checked before publication and citation navigation. Mapping and selection clear on
vault change/reload. Desktop preference drafts can be restored explicitly as described
below; read grants and live model selection are never restored automatically.

## Optional local AI

1. Start your existing Ollama runtime with cloud disabled (`OLLAMA_NO_CLOUD=1`).
   Download a free text model separately if needed. Thread never starts services,
   downloads models, uses a hosted fallback or selects one automatically.
2. Expand **Optional local AI** in Thread's left sidebar. Enter the loopback
   endpoint for your runtime, normally `http://127.0.0.1:11434`.
3. Choose **Find downloaded models**, select a compatible text model, then
   **Apply AI settings** and **Test local connection**. Discovery inspects at most
   40 entries and checks local capability, not answer quality. The isolated test
   model is `qwen3:4b-instruct`; your installed model names may differ.
4. Choose **Resume project**. Recorded context appears first. If an applied model
   is selected, a separate dashed AI card adds interpretations and suggested
   actions, with model/time and source chips. Those suggestions do not alter the
   recorded facts or any notes.
5. **Cancel AI interpretation** stops the optional inference while keeping the
   current recorded context. Model/setup edits clear AI output; apply the draft
   before using it. **Recorded only (no model)** disables automatic interpretation.

Connection failure, malformed output or cancellation leaves still-current recorded
context available. Changing projects/read access, external edits or vault closure
invalidates obsolete snapshots. Context is main-owned and revalidated before
transmission after model checks and after generation. Renderer content cannot
supply arbitrary prompts or network URLs. Operations are bounded to 180 seconds
and provider responses to 2 MiB; try a smaller model if these limits are reached.

Active model setup resets on vault change/reload. Saved preference drafts require
explicit restoration and Apply AI settings. Selecting a model never
grants note access. Cloud status must be explicitly disabled and a fully local
completion capability confirmed; remote aliases and enabled/unknown cloud status
are refused. The downloaded runtime/model work offline once installed, with no
account, subscription or hosted API cost.

## Ask evidence workbench

1. Choose **Ask your vault**, enter a question (up to 1000 characters) and choose
   **Selected project** or **All permitted notes**. All permitted notes still
   respects the explicit read roots and exclusions; it grants no additional access.
2. Optionally expand **Search filters** for type, status, relative path and date
   range. Dates use recorded fields with a file-modification fallback, not verified
   events. **Search budget** explicitly chooses 20, 35 or 50 result passages.
3. Choose **Retrieve evidence**. Keyword works without any model or running Ollama.
   Read the coverage limits and inspect source chips. Include, Pin first or Exclude
   passages; each change renews the exact context and discards the old answer.
4. Expand **Exact source context sent to the model**. It shows the exact chosen
   evidence JSON used in the answer prompt, bounded to 16,000 characters. Pins
   go first inside that bound; excluded passages are not sent for answer generation.
5. With an applied local text model, choose **Generate from chosen evidence**.
   The separate AI card gives model/time, classified claims, supporting excerpts
   and gaps. Classification and valid citations do not establish semantic truth.
   Open citations inside Thread and use **Back to Ask** without regenerating.
6. **Cancel Ask** suppresses obsolete replies; current chosen context remains
   usable when available. Question/filter/project/model/scope changes and external
   edits invalidate old results. Source/dependency bytes are rechecked after model
   metadata calls immediately before transmission, and after generation.

For optional hybrid search, use **Find downloaded models**, explicitly select an
**Optional embedding model**, then **Apply AI settings**. Choose **Hybrid (local
embeddings)** in Ask. Text and embedding models are separate choices; the tested
local embedding model is `qwen3-embedding:0.6b`. Model discovery never selects or
downloads one automatically. Hybrid sends a bounded set of current permitted
candidate passages to the local embedding model before you choose answer context.
The standard/broader/maximum budgets consider at most 128/384/768 candidate windows
of 350 characters, with balanced note/heading selection. Coverage discloses the
actual pool and heuristic matches; it does not promise exhaustive recall.

Missing/incompatible/unavailable embeddings produce an explicit keyword fallback.
Canceled or stale requests cannot become a fallback success. A missing text model
disables generation while retrieval remains useful. Invalid answers/connection
failures retain current evidence with safe feedback. Embedding vectors and all
workbench state remain session-only; invalidation clears the cache. Explicit saves
use the reviewed flows below; nothing is saved automatically.


## Follow-ups and corrections

Expand **Correct claim N** to edit its text/classification, then **Apply correction**.
The original model output, model name, generation time and citations remain intact.
Corrections express your judgment, not independently verified truth. Unapplied
correction drafts block saving and continuing; apply or explicitly revert them.

Enter a **Follow-up question** and choose **Continue with current evidence**.
This explicitly reuses the retrieval; review Include/Pin/Exclude again and choose
**Generate from chosen evidence**. Inspect **Exact earlier conversation context
(not evidence)** for included/omitted turns. Earlier output is never new evidence.
The shared bounds are six turns, 4000 earlier-context characters and 24000 total
prompt characters. Excluding a prior turn's supporting passages omits that turn
from model context. **New conversation** or a new retrieval resets the conversation.
Source/project/model/scope changes invalidate it. Reload does not resume inference.

## Enable reviewed desktop saves

1. Close the Obsidian process and other editors of this vault. Open **Desktop
   storage and writing** in Vault settings. Read the compatibility consent text,
   enter the actual Obsidian configuration folder (normally `.obsidian`), then
   **Read plugin settings and recovery files**. This explicitly reads only Thread's manifest,
   settings, changes and project-import journals, up to 40 MiB. Stored originals
   may include formerly permitted content. They are never indexed or sent to AI.
2. An installed plugin must be the compatible Thread 0.4.2 build. Unsupported,
   malformed or unresolved plugin journals block desktop writing; resolve them in
   the compatible plugin and close Obsidian first. An absent plugin is allowed.
   Inspecting the wrong configuration folder cannot certify another installation.
3. Choose **Enable desktop writing**. The compatible plugin and desktop use a
   kernel-held exclusive writer handle for the same vault filesystem identity.
   The plugin retains it until its Obsidian process exits, including after plugin
   disable, to cover pending operations. Desktop releases after its operation
   settles on close or explicit release. Coordination requires the same Linux
   host, user and network namespace; isolated containers/Flatpak namespaces and
   unrelated editors are not covered. Keep them closed during saves.
4. Optionally **Copy previewed plugin preferences and history** after inspecting the exact
   copy. This saves preference drafts and a separate immutable history snapshot;
   plugin files/live journals, read grants and PDF consent never migrate. **Use
   preference drafts** still requires explicit Apply AI settings and project refresh.
   **Save desktop preferences** retains the current model drafts and folder roles;
   neither action grants reads. All-permitted-notes saves require a mapped Knowledge
   folder and separate read permission for that destination.

The desktop profile stores versioned per-vault JSON under `thread-v1/` in Electron's
application user-data folder, outside the vault. Development launch uses the ignored
local profile configured by the launcher. Do not reset an invalid/unknown profile:
reading remains available, while writing fails closed. Preserve it for recovery.
At most twenty save receipts, five imported-history copies and 64 MiB total state
are retained; full history blocks new entries instead of pruning unresolved state.

## Exact new-note saves and interrupted saves

In Ask, enter **New note name** and choose the current reviewed answer or selected
conversation turns. Choose **Preview new note** and review the exact path and
Markdown. Project notes go under `Answers/` or `Conversations/` inside the selected
project; all-permitted-notes saves use the explicitly mapped Knowledge role. Missing
ordinary destination subfolders are created only after Save. **Save exact new note**
creates exclusively; existing files, case/normalization collisions, links, changed
sources/choices/corrections or revoked access are refused. Saves are bounded to 1 MiB.
The Markdown uses the same answer/conversation schemas as the plugin. Open it in
Obsidian normally after releasing desktop writing; transcripts do not become
source evidence or resume a conversation automatically.

Before any vault creation, a durable receipt stores the exact intended bytes in
the separate desktop profile. Confirmed bytes mark it complete. Interrupted or
unconfirmed saves keep their pending receipt and block further note saves. Reopen
Thread, select the vault, explicitly restore read grants and writer ownership,
then **Refresh desktop state** and **Inspect pending save**. Review the intended
bytes and whether the current file matches. **Confirm completed save** is available
only for matching bytes; it does not prove which process created those bytes.
**Keep files and close recovery** acknowledges the unresolved result while retaining
its receipt. Both actions recheck the target and modify only the receipt; neither
removes, rewrites or rolls back vault files. Inspect any partial note or empty
folders yourself before deciding what to keep. Unsupported/oversized targets require
manual inspection. No whole-filesystem transaction or lock against unrelated editors
is claimed. Existing-note changes use the separate reviewed flow below.


## Review existing-note changes and recovery

1. Enable desktop writing as above. In **Folder preference drafts**, map the
   existing Projects or another writable role, then **Save desktop preferences**.
   This mapping never grants reads; the target must also be inside current allowed
   paths and outside exclusions.
2. Open a current note and choose **Propose body change**. Edit the body and choose
   **Preview proposed change**. Frontmatter and Thread provenance markers stay
   protected. This creates a durable pending proposal, without changing the note.
3. Inspect **Exact before**, **Exact after** and the numbered diff. The diff displays
   at most 500 lines; the complete bounded text remains in the exact sections.
   **Edit proposed body** disables Apply until **Renew exact preview** succeeds.
4. **Apply exact change** explicitly commits the shown bytes. Changed targets,
   supporting sources, permissions, roles, folder/file identities or ownership
   refuse old approval. **Reject proposal** discards pending review only, without
   changing notes. A stale proposal must be rejected and regenerated.
5. **Review changes** shows the last twenty applied batches. **Preview undo** shows
   the exact restore before **Undo exact change**. Later edits block Undo; no
   force-overwrite option exists. Undo of a reviewed newly created note removes
   only that unchanged creation, after explicit approval.

A separate `thread-v1/changes-<vault identity>.json` in the desktop profile stores
schema-1 proposals, original content and recovery. Existing preferences/receipts
remain in `vault-<vault identity>.json`. Plugin `changes.json` is never migrated or
shared. The change journal is bounded to 24 MiB, ten notes and 1 MiB combined
before/after text per batch, with the last twenty applied batches retained. It is
recovery history, not a complete vault backup. Unknown, corrupt or oversized state
blocks writing without resetting files. Pending changes/recovery block ordinary
new-note saves; pending new-note receipts block note updates.

After interruption, select the vault again, explicitly approve read access, inspect
plugin compatibility and enable writing. **Review changes > Inspect recovery**
shows the exact intended restore and current content. **Restore reviewed recovery**
rechecks every target and preserves conflicting later edits. If the current note
matches neither known version, automatic restore is unavailable: compare the retained
originals with your files and resolve the conflict manually. Keep the journal until
resolved. A recovered apply leaves its proposal stale; reject it explicitly before
making another. Without current grants, history paths and content are redacted.

Compatible Thread processes still use exclusive ownership. Close unrelated editors:
ordinary Linux files do not provide an atomic compare-and-write syscall. Descriptor,
identity and exact-byte checks detect observed changes, but cannot exclude a separate
editor writing during the final write syscall interval. Multi-note writes are not
atomic. Completed operations are rolled back on failure where safe; uncertain writes
retain durable originals for explicit recovery. Process-interruption acceptance was
performed in an isolated synthetic vault; power-loss recovery is not claimed.

## Decisions and managed questions

Choose a project, then **Decisions and questions**. **Refresh records** reads only
current permitted notes. The expandable list opens original decisions/questions;
status is recorded metadata, never model acceptance. Index/identity limits may
require a narrower explicit scope before record changes are available.

Enable writing and map Projects as described above before preparing proposals.
Every action opens **Review changes**. Use **Preview pending change**, inspect the
exact before/after and diff, then choose **Apply exact change** or **Reject
proposal**. Preparing or assessing never changes a note. The same guarded Undo
and recovery rules apply to these records.

- **Create decision:** enter a new name, question, choice and rationale; record
  alternatives, constraints, dates and revisit conditions when known. Proposed
  is the default. Choose **Accepted - I accept this choice** only for your own
  explicit acceptance. The destination is the project's `Decisions` folder.
- **Create open question:** enter a new name and question. Optionally select a
  legacy question section and choose **Copy legacy section into new question**,
  then edit the copy. The original remains unchanged and is linked as evidence.
  The destination is the project's `Questions` folder; new questions start open.
- **Update managed question:** select a version-1 question, choose Investigating,
  Answered or Open/reopen, and record your reason and event date. Answered also
  requires your answer. Each event appends to the note; reopening preserves
  previous answers and reasons. Unsupported/ambiguous properties or duplicate
  IDs require manual resolution; Thread does not normalize them automatically.
- **Review decision evidence:** select an accepted/proposed decision and one to
  four other evidence notes. Configure a downloaded local text model, then choose
  **Assess selected decision evidence**. Inspect interpretations, gaps and cited
  excerpts. Enter your reasoning and choose Retain, Annotate or Supersede.
  Supersede also requires a distinct replacement name and fields with explicit
  Accepted status; its exact preview contains both the preserved original and
  new replacement. No existing destination is overwritten.

The evidence selector supports Ctrl/Shift selection: up to ten notes for new
manual decisions, four for question actions/review, plus an explicitly copied
legacy source. Context stays bounded to 16000 characters and discloses omissions.
Manual decisions and questions need no model. Cancel, source/access changes,
project switching and changed inputs invalidate affected pending results; refresh
and review again. Existing durable pending proposals remain available separately
in Review changes. Citation presence identifies a passage, not independent proof
of its claim. Other editors must remain closed during writes.


## Actions and session wrap-up

Choose a permitted project, then **Actions and wrap-up**. The board groups current
records into Planned, In progress, Blocked and Done. Counts disclose unavailable
or omitted records. Dates and completion states are user reports; legacy chosen
next-action notes remain readable in Your notes and are not migrated.

To create an action, enter its note name, title, reason and reported date. New
actions always start Planned. Optionally select up to four current supporting
notes with Ctrl/Shift. Choose **Preview action**, inspect the pending change and
its exact renewed preview, then Apply explicitly. To change a state, use a card's
**Record transition** button, choose the new state and enter a reason/date. Earlier
transitions and references stay in the same readable Markdown record. Unsupported,
externally edited, stale or ambiguous records are preserved and require manual
inspection before they can be updated. These manual flows work without Ollama.
Histories retain at most 64 events and 100 reference snapshots without truncation.
The existing 1 MB reviewed-batch budget still applies to the combined before/after
text, so very large histories can remain readable while refusing another update.

For a wrap-up, enter a session note name and optional reported progress, then
explicitly check up to five current action reports. None are selected by default.
With a downloaded local text model applied, choose **Generate session wrap-up**.
Inspect the user report, selected recorded progress, local summary and current
supporting passages. A Done record does not prove the work happened in this session;
model claims still need judgment. **Preview session note** sends the exact new
note to Review changes. Saving refuses an existing destination and never changes
any action status or accepts a decision. Input, scope, source, model or writer
changes discard stale drafts; refresh or generate again. The existing guarded
Undo/recovery workflow applies to these reviewed writes too.
