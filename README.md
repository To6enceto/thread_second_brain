# Thread

**Independent desktop preview:** `npm run desktop:setup` downloads the local
Electron runtime once; `npm run desktop:start` builds and opens Thread without
Obsidian. It includes scoped browsing, project home, recorded/local-AI Resume,
keyword/hybrid Ask, bounded follow-ups, reviewed new-note saves, existing-note
change review with guarded undo, decisions, questions, actions, project reviews,
capture and clip intake, research collections, knowledge synthesis, granted
local PDF extraction with page citations and portable project checkpoints. Explicit
writer setup, renewed exact previews and
durable originals govern every change. Further
desktop workflows remain in the build plan; the existing plugin is preserved.
See [desktop setup and limits](docs/desktop.md).

Open **Thread: Open full workspace**, then **Actions**, to inspect the current four-column action board. **Refresh action board** rereads permitted records; stale or unsupported records have generic unavailable counts. **Review action** selects a current record in the explicit transition form and does not move it automatically. In **Wrap up**, click **Refresh recorded actions**, select up to five records (none are selected by default), then generate locally. The preview separates those user reports from the model summary; saving the session never changes action statuses. Changing inputs, sources or selections revokes older save previews. Large selections that cannot fit the existing context budget must be reduced explicitly.


Project actions: use **Thread: Project actions** from the command palette, or **Project actions** in the sidebar's All tools / Routine group or the full workspace's Actions area. Choose a permitted project first. Enter a note name, title, reason and reported date, then **Preview action** and **Save previewed note** to create a Planned record. To change state, choose **Record a state transition**, select an action and a different state, enter your reason/date, then **Preview action** and review/apply the exact change in Changes. Every transition stays in the Markdown history; Done is your report, not independent verification. Supporting notes/questions/decisions are optional and never modified by this workflow. Stale references, duplicate IDs or edited/unsupported records require manual inspection before further transitions. History is bounded to 64 events/100 reference snapshots and never silently trimmed. Legacy chosen-next-action notes remain unchanged.


Thread is a desktop Obsidian plugin for returning to projects, finding evidence,
recording decisions and turning research into reviewed Markdown knowledge. A
local Ollama model supplies suggestions; your notes remain authoritative. No
account, API key, backend or paid model service is required.

This is a **private local 0.4.2 build**, not a published Community plugin. It is
tested on Linux with **Obsidian 1.14.4, Ollama 0.40.4 and
`qwen3:4b-instruct`**. The manifest requires Obsidian 1.14.4 or newer and desktop
use. Windows, macOS, other models and later versions need their own validation.

## Build and install

Development needs Node.js **22.15 or newer** and npm. Node is not needed to run
the packaged plugin. From this repository:

```bash
npm ci
npm run package
```

`package` runs the same typecheck, tests and production build as `npm run verify`,
then creates `dist/thread-0.4.2.zip` and version-specific staging `dist/thread-0.4.2/`. The ZIP contains
`thread/main.js`, `thread/manifest.json`, `thread/styles.css`, the local PDF
worker, `pdf-assets.json` and its explicitly listed CMap/font/license resources.
The inventory is verified by path, byte size and SHA-256 before packaging. No vault, model,
settings or recovery data is included. Repeated builds of the same source and
locked tools produce the same package bytes.

Start with a separate test vault. Extract the `thread` directory from the ZIP
into `<vault>/.obsidian/plugins/`, so `main.js` is directly inside
`<vault>/.obsidian/plugins/thread/`. If you use a custom Obsidian configuration
folder, substitute it for `.obsidian`. In Obsidian, open **Settings > Community
plugins**, allow Community plugins, reload Obsidian and enable **Thread**.
[Obsidian's plugin settings guide](https://obsidian.md/help/community-plugins)
explains where to find the plugins folder. Thread is not in the Browse directory.

For an update, use the [explicit local update helper](docs/local-updates.md):
preview the verified package, close Obsidian, and apply the exact approved
preview. It preserves settings, caches, journals and notes, retains previous code
and supports interruption recovery and compatible code rollback. The Linux helper
supports the standard `.obsidian/plugins/thread` location; do not point it at a
custom config directory. Keep an independent vault backup; the bounded change
journal and retained code are not complete vault backups.

## Set up the local model

Install [Ollama](https://ollama.com/download) separately. Thread never installs a
server or downloads models. After starting the server with cloud features
**disabled**, download the model while internet is available:

```bash
# Linux foreground server, in one terminal:
OLLAMA_NO_CLOUD=1 ollama serve

# In another terminal, using that server:
ollama pull qwen3:4b-instruct
ollama list
```

If Ollama is already running as an app or service, configure that instance and
restart it first. Starting a second server on an occupied port will fail. Follow
[Ollama's environment and cloud-disable instructions](https://docs.ollama.com/faq#how-do-i-disable-ollamas-cloud-features)
for your installation. Keep it bound to loopback. Thread accepts only literal
loopback HTTP endpoints such as `http://127.0.0.1:11434`; it refuses remote hosts,
redirects, cloud models and a server that cannot confirm cloud is disabled.

The tested [Qwen3 4B instruct model](https://ollama.com/library/qwen3:4b-instruct)
is about 2.5 GB to download. Use this exact **instruct** tag as the starting point;
the generic `qwen3:4b` tag was less reliable in our structured-output trials.
Leave space for Ollama, Obsidian, model working memory and your vault. Smaller or
other local text-completion models are configurable but are not validated here.
After installation/download, inference works offline while the local server runs.

## Choose folders and start

For a full-width main tab, run **Thread: Open full workspace** from the command
palette (`Ctrl/Cmd+P`), or click **Open full workspace** in the sidebar. Home
retains Resume and all tools; Ask opens the evidence workbench. Research, Actions
and Reviews group the existing tools. **Open sidebar** returns to the compact
view. Repeated workspace opens reuse its tab. Thread source links open new tabs
to preserve existing notes. Obsidian restores only the selected area; current
saved project permissions still apply and restoration never generates AI output.

Answer claims distinguish **Recorded statement**, **AI interpretation** and
**Proposed action**. Recorded statements quote complete statements from known
records; they do not certify truth. Paraphrases are conservatively shown as
interpretations. Clipped passages, partial search windows and selected text
cannot promote model claims to recorded statements; full original sections are
required for that automatic classification. A recorded postponement is not a new proposed action. Decision
claims show the cited records' statuses, and adjusted model classifications stay
visible. Earlier saved notes and their fact/interpretation/suggestion values
remain compatible. Always compare claims with their supporting excerpts.

In Ask, expand **Edit claim 1** (or another claim) to change its text or
classification. Your correction is labelled separately and keeps the original
model wording/type and citations. Editing or changing the note name revokes
earlier previews: choose **Preview answer note** again, inspect the exact text,
then **Save previewed note**. Corrections do not modify source notes or verify
truth, and stale/excluded evidence still blocks saving.

New Ask saves use versioned Markdown records. They retain original output,
automatic classification, the final user correction and timestamp, generation
details and evidence. Intermediate unsaved edits are not a history log. Only the
current reviewed answer is indexed; original model/correction history stays
readable in the note. Unsupported metadata or manual changes to the managed
record block reuse; create a new reviewed answer instead. Earlier answers remain
compatible without conversion. Existing filenames are never overwritten.

After an answer, choose **Continue with follow-up** and enter the next question.
Choose **Reuse previous evidence** to revalidate the previous chosen passages, or
**Retrieve evidence** to search again. Inspect Include/Exclude/Pin first and the
exact context, then explicitly generate. Earlier turns remain read-only and
labelled as AI conversation context; they never become authoritative sources.

Conversations allow six turns. Earlier context uses at most 4000 serialized
characters, keeping whole recent turns only when all their supporting passages
are still selected. The workbench shows omitted turns and reasons; excluded
passages cannot return through history. Current evidence retains its 16000-character
budget; the whole prompt is limited to 24000 characters. These are character,
not token, limits. **Start new conversation**, Cancel, close, relevant source
changes and scope/project/settings changes revoke affected conversation outputs.

**Preview answer note** still saves only the current reviewed answer and its
provenance. **Save conversation** opens a separate draft where you choose completed
turns and a new note name. All captured turns start selected. Choose **Preview
conversation note**, inspect its destination and exact Markdown, then **Save
previewed note**. Project conversations go under `Project/Conversations/`; wider
scope uses the mapped Knowledge folder. Changing the selection, name or parent
answer requires a renewed preview. Existing filenames are never overwritten.

Saved conversations retain original turn numbers, questions, model/time, original
claims, corrections, gaps, chosen source excerpts and provenance. An earlier turn
used as context but omitted from the save is explicitly identified. Records are
limited to six selected turns, 100 distinct references, 256 KiB of structured
metadata and 1 MiB per complete note; choose fewer turns if a limit is reached.
Nothing is saved automatically.

Open the saved Markdown normally in Obsidian to read it. This does not resume a
model request. Thread tracks its source freshness but keeps conversation prose
and copied excerpts out of retrieval and selection-as-evidence. Unknown versions
or manual changes to managed records fail closed; preserve the note and create a
new reviewed conversation. Saved project information never grants read access.

To keep a reusable evidence selection, choose **Save research collection** in the
Ask workbench. Name it, choose **Preview collection note**, inspect the exact
destination/content, then **Save previewed note**. Collections preserve references
and Include/Pin/Exclude intent without copying source excerpts. Project records
go in `Project/Collections/`; wider-scope records use `Knowledge/Collections/`.

Later, enter a question in Ask, select the matching answer scope and choose
**Open research collection**. Select a record, then **Review selected collection**.
Thread rereads source hashes and shows current permitted indexed passages.
Renamed sources can resolve by stable identity or observed rename; changed
passages require the labelled confirmation checkbox. Missing, excluded,
ambiguous or stale references remain unavailable without showing their old
paths or text. PDF originals still require consent and current extraction.

Inspect choices and coverage, choose **Use collection in Ask**, then explicitly
**Generate from chosen evidence**. Nothing generates on open. To retain edited
choices, save a newly named collection copy; originals are never overwritten.
Source, collection, permission or question changes revoke pending reuse/previews.
Records contain at most 50 references, 128 KiB of metadata and 512 KiB total;
the picker shows at most 100 permitted indexed collections. Reuse keeps the
16000-character context limit. Index omissions or changed passage locations may
require fresh retrieval; a collection is neither complete coverage nor a read
grant. Collection notes themselves are excluded from retrieval/editor evidence.

Open **Thread: Open Thread** from the command palette (`Ctrl/Cmd+P`), then choose
**Settings** in the Thread panel.

1. Choose **Use existing notes** or **Try a synthetic sample** at the top.
   For a sample, first save a Projects folder mapping under advanced settings.
   Choose **Preview optional sample**, inspect its destination and explicitly save
   it. Then choose **Refresh project folders** to find the new sample folder.
   Creating a sample does not grant read access.
2. For optional AI, set the endpoint and choose a downloaded model. **Find
   downloaded models** and **Test local connection** show progress/results beside
   their controls. Expect confirmation of model capability and disabled cloud
   features; this does not measure answer quality. **Cancel local checks** stops
   a pending check. Recorded context and Keyword work without a model.
3. Select one project folder. Inspect **Read access preview**: current saved roots,
   roots after Save, newly added roots and exclusions. Saving explicitly grants
   read access to that folder; changing the dropdown grants nothing.
   Add other folders or notes under **Allowed read paths**, one vault-relative
   path per line. Add **Excluded paths** before generation. Exclusions win.
4. Map Projects, Inbox, Sources, Knowledge, Reviews and Templates to your existing
   folders. Mapping a destination does not grant model read access. Knowledge
   edits and refresh saves also need their destination inside allowed paths.
5. Choose **Save settings**, then **Open project home** and **Resume project**.
   The setup card shows the next action for the current draft. Editing a draft
   clears older check results; checks and discovery never save settings for you.

First-use read scope is empty. Text indexing reads permitted `.md` and `.txt` files.
PDF bytes additionally require explicit exact-file consent as described below.
Hidden configuration folders are excluded. Project evidence uses containment,
project IDs and explicit links, always within read scope. **All allowed paths**
is an explicit wider scope, not permission to read the entire vault. Legacy notes
need no migration. **Preview a new workspace** optionally creates UUID-tagged
starter notes/templates without overwriting existing files.

For a Fedora desktop shortcut, see [Launch Thread](docs/launcher.md). The optional
Node helper generates a local shortcut artifact for a configured Obsidian vault;
it never installs desktop integration automatically. Ollama startup is off unless
you explicitly configure it. `npm run dev` remains a bundle watcher, not a launcher.

## Use Thread

- **Resume project:** six sourced sections show objective, last recorded activity,
  decisions, open questions, new evidence and suggested next actions. Follow
  source buttons to inspect the current note. The briefing itself stays in the
  panel. **Cancel** stops generation.
- **Find evidence / Ask:** local text/link matching retrieves eligible passages.
  Ask defaults to the selected project; wider scope is explicit. Questions
  without matching evidence report a gap. Preview a supported answer and choose
  **Save previewed note** to create a new Markdown answer.
- **Decisions / Review decisions:** record your choice, rationale, alternatives
  and revisit conditions. Acceptance is explicit. Review evidence to retain,
  annotate or supersede a decision; inspect the proposed changes before Apply.
  Superseding preserves the old record and links a new accepted choice.
- **Capture:** type a thought into Inbox or import UTF-8 `.md`/`.txt` up to 2 MB
  into Sources. Imported original text and provenance are preserved. Identical
  imports are detected. Project suggestions require your selection; no URL is
  fetched.
- **Knowledge:** choose up to five sources and generate a concept/comparison or
  append a synthesis to existing knowledge. **Changes** shows exact before/after
  contents. Apply only after reading them. Raw source and Inbox notes cannot be
  AI update targets.
- **Wrap up / Weekly review:** create a session note or an on-demand seven-day
  local-calendar review. Inspect and explicitly save the new note. Your reported
  progress is labeled; interpretations and suggested actions remain distinct.
  Weekly reviews use current note contents and dates, not reconstructed history.
- **Source freshness:** inspect changed, renamed, missing or ambiguous support.
  Select current replacement sources and a new version name, generate, review and
  apply a new review note. The prior output stays unchanged. Stale derived output
  is omitted from AI recall; only the latest delimited synthesis is reused.

New-note previews never overwrite. Existing-note updates preserve all originals
before their first write and refuse conflicts. Model text is untrusted: it cannot
run tools, change access or accept a decision for you. Valid citation IDs identify
passages; they do not establish that every claim follows from them.

## Recovery, index rebuild and local data

Thread stores local state in `<vault>/.obsidian/plugins/thread/`:

| File | Purpose |
| --- | --- |
| `data.json` | Folder grants, mappings, selected project and local model settings. |
| `index.json` | Rebuildable allowed text/link cache; may contain eligible note excerpts. |
| `imports.json` | Import hashes and saved paths for duplicate detection. |
| `renames.json` | Bounded observed allowed-path rename metadata. |
| `changes.json` | Pending proposals, originals, recovery records and last 20 applied batches. |

**Settings > Rebuild text index** replaces only the derived index from current
allowed files. It preserves notes and the other files above. It is also available
through **Find evidence**. A missing/corrupt cache can be rebuilt; the journal
must be preserved. Changes/settings invalidate in-flight outputs. Wait for indexing
and refresh the relevant dialog before reviewing again.

After a partial failure, open **Changes**, inspect **Recovery required**, then
choose **Recover previewed batch**. Thread attempts to restore the prior stable
state while preserving unrelated later edits. If a conflict remains, compare the
exact named paths and the durable originals in `changes.json` manually. Copy the
journal before manual repair. Do not delete it to dismiss recovery. Cached
previews with changed/unavailable source snapshots are hidden; original validated
batch snapshots support undo, but unknown historical dependencies may require
manual recovery. No journal is automatically purged on exclusion.

**Preview undo > Undo previewed batch** works only while affected notes still
match the applied contents. A created note moves to Obsidian's local trash only
if unchanged. Later edits cause refusal. Multi-file filesystem updates are not
atomic; the last-20-batch history does not promise permanent versioning.

If model setup fails, check server availability, exact model name, cloud-disabled
status and available memory. Update Ollama if `/api/status` is unavailable. The
request timeout is configurable from 1-600 seconds. Unchanged legacy renames need
to have been observed within allowed scope; duplicate IDs or unresolved provenance
require explicit source selection. Whole-note hashes conservatively flag even
unrelated edits. Rebuild does not restore deleted original sources.

## Cost, limits and development

There is **no mandatory API, hosting, account, subscription or sync charge** for
this runtime on suitable existing hardware. Downloads need an internet connection;
storage, RAM/VRAM, electricity and any hardware upgrades remain real costs.
[Optional Obsidian services](https://obsidian.md/pricing) and development assistants such as Codex or Claude Code
are separate. They are not required to use Thread. This private source currently
uses `UNLICENSED`; no public distribution license is asserted. Obsidian, Ollama
and model weights retain their own licenses/terms and are not bundled.

This release has bounded text context, local keyword/link retrieval and optional
local embeddings. It does not include PDF/OCR, audio, web fetching, mobile inference, cloud
fallback, autonomous background edits, scheduling, collaboration or cross-device
sync. Small-model trials sometimes omitted objectives or put facts in the wrong briefing section. A blank section does not prove the notes lack that information. Model quality and speed vary; review important claims yourself. Testing
covers a small synthetic vault, not production-scale vault performance or other
operating systems. Generated Markdown remains readable when Thread is disabled.

Developer commands: `npm run dev` watches/rebuilds `main.js`; `npm run typecheck`,
`npm test`, `npm run build`, `npm run verify` and `npm run package` run locally.
Tests use Node's built-in runner. No CI or publishing workflow is configured.
Product direction, ordered implementation and per-feature verification/try guides
live in `blueprint/project-plan.md`, `blueprint/build-plan.md` and
`blueprint/history/features/`.

## Quality evaluation

Run `npm run evaluate` for the synthetic reference/negative-control self-check.
Opt-in real local-model evaluation and native Obsidian fixture collection are
documented in [evaluation/README.md](evaluation/README.md). These curated checks
report observed weaknesses and do not establish unrestricted semantic accuracy.

Resume loads **Recorded context** before contacting Ollama. Recognized Objective/Goal headings or project properties, decision statuses, open questions and the latest dated session user-report remain available without a selected or running model. Supporting excerpts and source links accompany records. Legacy structure remains unknown rather than inferred. AI interpretations and suggestions appear separately; a quoted record is not independent verification.

Thread opens to a **Project home** with recent sessions, recorded decision text, questions and visible pending proposals. The Project selector switches among already permitted projects without changing read grants. Refresh home reloads its bounded snapshot without AI. Resume, Ask, Capture and Wrap up stay directly available; Review queue is in Needs your review, Settings is in the header, and remaining tools are grouped under All tools. In a completed briefing, expand Project controls to reach the home controls.

Find and Ask rank keyword matches using titles, headings, explicit note aliases and passage text. Use double quotes for required phrases and Search filters for type, status, path and record dates. Filters only narrow your permitted scope. Keyword search works without a model. Results balance notes, keep relevance in bounded AI context and show omitted coverage; indexing reserves passages across nonempty sections within the selected finite profile, including later headings beyond 50000 characters. Inspect Text index coverage for omitted notes and sections. Record dates can fall back to modification dates and never establish when an event happened.


Optional local semantic search is off by default. In Thread settings, enable
Optional semantic search and select the exact name of an already downloaded
embedding model, such as `qwen3-embedding:0.6b`. Save, open Find evidence or Ask,
and choose Hybrid (local). Keyword is always the initial method and works
without any model. If embeddings are unavailable or invalid, Hybrid shows an
explicit keyword fallback. Thread never downloads models or runs background
embedding jobs. The local runtime and embedding model are free; downloads need
disk space and inference uses your hardware and electricity.

Hybrid combines keyword and cosine similarity ranks. The request budget selects
128/384/768 candidate windows (Standard/Broader/Maximum), each at most 350
characters, with at most 20/35/50 returned passages. It cycles through notes
and initial windows across distinct headings before taking extra windows;
filters and required quoted phrases still apply. Results and saved answers show
candidate counts, model digest and coverage limits. The fixed 0.45 similarity
threshold is a conservative heuristic tested with the example model, not a
universal relevance score. Large vaults can have relevant passages outside this
bounded candidate set. Missing evidence and incorrect matches remain possible.

At most 1024 source vectors stay in memory, keyed by local model digest, full
note hash, path and exact passage. They clear on index/scope/model changes and
plugin unload; no vector database or persistent embedding files are created.
All embedding calls use the same cloud-disabled loopback checks as generation.
References and semantic similarity do not establish factual support: inspect
the quoted source before relying on an answer.


Review knowledge changes highlights added and removed lines, with full exact
before/after contents under a disclosure. Large comparisons use a bounded bulk
diff and show at most 500 relevant lines; always inspect full contents when the
diff says it was shortened. Related operations stay one batch.

Open Edit proposed body to adjust a proposal. Note properties and Thread
provenance markers stay fixed. Editing immediately disables Apply. Renew exact
preview checks current targets, supporting sources and scope, preserves original
backups and replaces the approval ID. Review the renewed entire batch before
applying. Unsaved edits disappear on close or source/scope changes; no draft
alone modifies a note. Citation support remains your responsibility after edits.

For stale proposals, preserve any draft text you need, reject the proposal,
refresh evidence and generate again. For interrupted changes, keep changes.json
and copies of current notes, compare each exact recovery preview, and use Recover
only when contents match a stored batch state. Later edits are preserved; reconcile
conflicts manually before retrying. Do not delete recovery history to bypass a
conflict. Undo still checks every applied hash and retains the last 20 batches.


Thread setup now guides four steps: local connection, downloaded model selection,
read access preview, then trying the project. Find downloaded models reads only
Ollama status/tags/model metadata, inspecting at most 40 listed models. Separate
selectors show local completion and embedding capabilities; remote/incompatible
or uninspectable entries are omitted. Nothing is selected or saved automatically.
Manual exact model names remain available. Model capabilities do not guarantee
answer quality or available memory.

Before Save, Read access preview lists the resulting allowed roots, newly added
roots and exclusions. Saving a selected project explicitly grants that folder;
exclusions always win. Folder mappings are new-note destinations, not read grants.
Test local connection checks the unsaved local endpoint/models without sending
note text or running inference; model generation still rechecks local-only status
later. Cancel checks, editing the endpoint and closing setup cancel pending work.

Optional sample preview creates one invented project note only after you approve
its exact new path/content. It requires a saved Projects mapping under advanced
settings, refuses collisions/exclusions, and grants no read access. Select its
folder separately and review the grants if you want to try Resume or Ask on it.
Install Ollama and download free models yourself; Thread never starts services,
installs system software, downloads weights or switches to a paid/cloud model.


Ordinary allowed-note edits now coalesce into incremental indexing. Changed
entries disappear immediately; generated outputs depending on them have cached
text and links scrubbed before queued reads. Only changed notes and affected
output/identity dependencies are reread. Current link targets are resolved from
bounded retained link tokens, without rereading unrelated note bodies. New
retrieval waits for the queue to settle, including edits arriving during reads.

Find, Ask, Resume and selected generation workflows track known supporting paths.
Unrelated edits can leave captured work running; supporting-source or dependency
changes clear/cancel it. Before display or saving, actual raw hashes, current
scope and dependency freshness are checked after indexing settles. Unknown
selections and write/CAS contexts stay conservative. New identity collisions can
invalidate additional work once the changed metadata is read.

Startup, folder changes, scope/settings edits and explicit index resets still
rebuild the eligible index in full. Scope changes immediately clear in-memory
entries/vectors and queue a scrubbed derived cache write; excluded notes are
never read. Incremental changes purge affected vectors and retain unrelated
ones. Index reset preserves notes and durable import/rename/change history.
This reduces note reads; it still recomputes dependency/link state across the eligible index and writes a
derived cache snapshot. It is not a large-vault benchmark or a
persistent vector database. Rebuild explicitly from settings if indexing fails.


Open **Review queue** from project home or run **Thread: Project review queue**.
Its six bounded categories connect changed recorded sources, decisions needing
evidence review, due revisit dates, human-only revisit conditions, recorded open
questions and stale saved outputs. Expand a category to inspect its records,
open a current source, or enter Decision evidence review / Source freshness with
the relevant record selected. Opening or refreshing the queue runs no inference
and writes no notes, statuses, resolutions or review acknowledgements.

New decisions and explicit replacement decisions can include an optional
**Revisit date**, saved as `revisit_on: YYYY-MM-DD`. Proposed remains proposed
unless you explicitly choose Accepted. Existing notes can use that same property;
free-text Revisit when stays separate and is never interpreted as a satisfied
condition. Superseded records are omitted from active date/condition reminders.
Checked completed tasks are omitted from recognized Open/Unresolved questions;
prose is not automatically treated as proof of resolution.

Source-change items compare recorded decision/output references, with the latest
readable saved review as a visible baseline when it has a valid nonfuture date.
Uncited changes and unrecognized structure can be absent. Each category shows
at most 20 items with total counts; each item shows at most five related sources.
The selected finite index profile can omit notes or sections. Missing/excluded
reference paths and stale excerpts are hidden. Older retained stale outputs can
remain listed: review is explicit and there is no automatic dismissal or history
rewrite. The queue works with Ollama stopped; optional AI review flows still need
your downloaded local text model.

The private 0.4.1 package has no hosted runtime charge, subscription or API key.
Obsidian, local Ollama and the tested Qwen models can run without a paid service.
You supply storage, memory, hardware and electricity; initial downloads need
internet. Synthetic Linux acceptance covers the documented runtime/model pair;
large vaults, other models and other operating systems need their own validation.

## Editor selection actions

Select 1-4000 characters in a saved, currently permitted Markdown/text note and
use the command palette for **Thread: Ask about selected text**, **Find evidence
related to selected text**, **Draft a question from selected text**, or **Draft a
decision from selected text**. Empty/oversized selections and excluded notes do
not enable these editor commands. Save unsaved edits first; stale generated
sources and older synthesis/model-observation blocks cannot be reused.

The command opens a dialog without inference or writes. Ask sends only selected
text plus source identity/status/date metadata after you enter a question and
choose Ask locally. Related search explicitly searches all allowed paths using
keyword matching without a model. Source links verify current hashes. Source or
permission changes clear the selection dialog; select current text again.

Question/decision shortcuts require a selected project and your own question;
decisions also need your choice and reasoning and remain **proposed**. Inspect
and explicitly save the exact new-note preview. Existing notes and original
selections remain untouched; collisions refuse saving. Supported selection
answers can be previewed as new notes under the mapped Knowledge folder.

### Evidence workbench

**Ask your vault** now starts with **Retrieve evidence**, without text generation. Inspect the passages, choose Include/Exclude/Pin first for this request, and expand **Exact source context sent to the model**. Pins order eligible passages within the existing context budget; they do not add omitted search results or bypass permissions. Choose **Generate from chosen evidence** when ready. Each claim appears beside its cited excerpts; inspect their support before previewing a new answer note. Question, scope, filter or choice changes cancel older answers and invalidate their previews. Source changes or exclusions clear affected workbench data. Nothing is saved without the exact new-note preview.

### Managed project questions

Open **Thread: Project questions** (also under Project home's More actions). Create an open question with optional current evidence or decision links, then review and save the new note. New records use readable `type: question`, `thread_question_version: "1"`, stable IDs, project, state and dates. To investigate, answer or reopen, select **Update managed question**, enter your reason and optional working response/required answer, and review the exact diff in Review changes before applying. Original questions, earlier answers and reasons remain in the note. Event dates are separate from actual capture/update dates.

Home, recorded Resume and the review queue show open/investigating managed questions alongside recognized legacy question sections. Answered records remain available in Project questions and Markdown. Legacy conversion is optional: copy a recognized section into a new question, edit the question, inspect its original source citation and approve its new destination. The old note remains unchanged. Selection question drafts use the same new open record format. Lifecycle actions work without Ollama, never accept a decision and retain the existing conflict, undo, recovery and protected-source rules. Unsupported or complex metadata needs manual editing; no bulk migration occurs.

Machine-written question reference/snapshot blocks remain in the authoritative Markdown but are excluded from indexing, search, AI context and editor-selection evidence. Human questions, working responses and answers remain usable after a supporting source is excluded. Preserve Thread evidence marker lines when editing records; malformed or unsupported managed formats require manual normalization. Select current permitted sources explicitly when you want their contents used again.

### Explicit review acknowledgements and snoozing

In **Thread: Project review queue**, choose **Record review or follow-up** on a pending item. Save an explicit reviewed/no-change record, snooze to a future calendar date, or draft a new open follow-up question. Enter your own reason, inspect the exact destination/content and explicitly save. Existing decision-evidence review controls still prepare reviewed drafts; no acceptance or question resolution happens automatically. All actions work without Ollama.

Saved `type: review-event` notes are separate from generated `type: review` comparison baselines. Handled snapshots stay inspectable in the queue. Refresh to resurface a due snooze or a changed target/dependency/identity; acknowledgements never make a stale output current. At most 200 candidates per category are inspected before showing 20 pending and 20 handled items per category. Unsupported or oversized provenance requires manual review (200 dependency notes/2000 references per item; 1000 references per managed question). Dates are checked on refresh; there is no scheduler or notification service.

Private `thread:review-evidence` blocks retain links and snapshot hashes in authoritative Markdown while remaining outside derived text, AI evidence and editor-selection ranges. Keep the private markers/version intact; malformed records fail closed and are not silently migrated. Human reasons remain usable independently of source freshness. Review notes and follow-up questions never overwrite an existing destination, expand read grants or alter the target note.

Review acknowledgements require valid version-1 metadata, a nonempty Reason and one complete versioned target/hash manifest. Unsupported JSON, missing required fields or ambiguous source identities cannot suppress an item; review those records manually. Derived caches retain only a manifest digest, and reuse requires it to match the current target and dependency snapshot.

Do not combine question, review-event and generated-synthesis private formats inside one managed record. Conflicting private namespaces fail closed until manually normalized; Thread preserves the raw note. Ordinary single-format questions and review events remain supported.

Private marker prefixes are reserved even with malformed capitalization, spacing, suffixes or inline/multiline placement. Extra malformed blocks make the managed record unusable for derived evidence until manually normalized. Literal examples inside already private frontmatter remain private; canonical question/review records remain compatible.

### Recorded project timeline

Open **Thread: Project timeline**, also under Project home's More actions. It shows recognized sessions, generated reviews, explicit review events, milestones and decisions with dated evidence-review headings. Each row labels its source date field, capture date and file modification date separately. Decision status is the current status, not a reconstructed past status. Unknown chronology is explicit; stale generated contents are hidden with Source freshness guidance. The timeline works without Ollama and changes nothing on open/refresh.

Expand **Record a user-reported milestone** to enter your title, detail and event date on/before today. Inspect the exact new note before saving. New `type: milestone` / `thread_milestone_version: "1"` records keep stable identity, project, `event_on` and separate capture dates. They are user reports, not independently verified achievements. Collisions, changed inputs/project identity, excluded paths and protected write locations refuse saving.

Coverage is bounded to 200 events from the 2000 most recently modified project records and indexed sections (section-balanced passages within the selected finite index profile). Repeated dated headings combine entries; later replacement links after long reasons may be omitted. A replacement button opens a current permitted decision at the recorded path. Legacy links do not archive replacement identities/hashes, so they cannot prove historical identity or follow renames reliably. No unsaved earlier note contents or complete historical event log is reconstructed.

### All permitted projects

Open **Thread: All permitted projects**, or **All projects** on Project home. The model-free overview sorts already permitted project folders alphabetically and filters exact active/paused/archived statuses; missing/conflicting status is unknown. Opening a project or its review queue changes only the selected project and preserves read grants. It shows recognized recorded activity dates, open-question candidate lines, unhandled due-date/review candidates and visible proposal counts. Dates are not inferred from edits, and proposal counts do not certify that a draft is ready to apply.

Choose **Choose next action** for a project, enter your own choice, and inspect the exact new Markdown/destination before saving. New `type: next-action` / `thread_next_action_version: "1"` notes store stable identity, project, `selected_at` UTC capture time and local capture dates. The latest valid capture timestamp among currently permitted project selections determines the displayed choice; prior choices stay unchanged. Equal timestamps, duplicate identities or unsupported selection formats make the choice indeterminate. It does not complete tasks, change statuses or accept decisions. Changed inputs/settings/project identity, collisions and protected sources refuse the preview/save.

Each refresh summarizes at most 20 matching projects; projects above 2000 associated records show unavailable details. Review disposition counts examine at most 200 candidates per category; omitted candidates can remain. Questions count recorded candidate lines before acknowledgements. Chosen-action excerpts show at most 600 indexed characters. Current index coverage and legacy structure can omit content. All limits are visible; there are no priority/health scores, background inference, scheduling or automatic read grants.

### Vault health and compatibility

Open **Thread: Vault health and compatibility**, also under Project home's More actions. The on-demand diagnostic reports duplicate IDs, unsupported dates, unavailable/ambiguous references, project associations, missing recognized record headings and malformed formats. Each diagnostic explains its practical effect and manual guidance. Unavailable reference paths and copied evidence stay hidden; opening an explicitly permitted raw note does not validate its evidence.

The diagnostic pass examines at most 500 indexed permitted files in alphabetical order, 1 MiB UTF-8 per file and 8 MiB cumulative text; it displays at most 200 diagnostics with detected counts and visible omissions. Oversized inspection reads are skipped. Heading checks use current indexed coverage and nonempty recognized sections; unexamined files, arbitrary prose and semantic correctness are not certified. Scanning runs no inference and changes no notes.

For eligible writable, unambiguous and current notes, **Prepare individual repair** accepts your actual date for an existing invalid simple scalar property, or your explicit choice of one heading and its recognized meaning. Review the highlighted exact before/after proposal and apply separately. All other bytes and private evidence markers remain intact. IDs, associations, complex frontmatter, protected originals and unsupported/stale records require manual editing. No bulk cleanup or read-grant expansion occurs. After a write, let the index finish and use **Refresh change review** before opening scope-guarded Undo or recovery controls; stored originals and conflict checks preserve later edits.


Run **Thread: Text index coverage and budgets** (also in project home's More
actions or advanced setup) to inspect local work and choose a finite profile.
Standard permits 2000 files, 2 MiB raw/file, 16 MiB raw reads/run, 200000 retained
characters/200 passages and 2000 section prefixes per note, and 8 MiB serialized
entries. Conservative uses 500 files, 1/8 MiB raw limits, 60000 characters/60
passages/500 section prefixes and 2 MiB entries; Larger uses 5000 files, 8/64 MiB
raw limits, 500000 characters/500 passages/5000 section prefixes and 32 MiB
entries. File and entry admission is alphabetical. Overlapping passages consume
the character budget. No model or PDF access is added by a profile change.

Indexing considers headings outside fences across each bounded permitted note
and reserves initial passages across retained nonempty sections before extras.
Coverage shows omitted files, represented sections, retained text, unknown
omitted-file text, actual serialized bytes, read work and elapsed time. If a
permitted file is omitted, stable-ID uniqueness is unproven: identity-dependent
reuse, project identity, review snapshots and related writes require restored
complete coverage. Retained current originals remain searchable. Choose a larger
profile or explicitly narrow allowed scope and rebuild; Thread never does this
for you. Cancellation leaves work pending and evidence unready; Resume/Rebuild
is explicit, though a later ordinary vault event can start fresh work.

Full raw hashes still detect changes outside retained passages. Profile/scope
changes clear derived text and vectors immediately and scrub the derived cache;
settings schema 1 and durable histories remain intact. Raw reads use Obsidian's
whole-file API with stat-before and size/hash-after checks, not streaming or an
atomic filesystem size guarantee. Index limits do not enlarge the 16000-character
model context; direct raw-note briefing context retains its separate 50000 body
character limit. Search and other views have additional result limits.

The authored Linux/Obsidian 1.14.4 fixture measured 122 eligible notes, 1765809 raw
bytes and all 124 nonempty sections represented in 107 ms (1512145 serialized
entry bytes); one long section was shortened. An edit outside retained text
caused two Thread reads (the source and dependent answer); a separate host
renderer read is counted separately in native evidence. These are observations
on this computer, not a guarantee for arbitrary vaults. Run `npm run evaluate:index`
for the reusable synthetic long-introduction/later-heading regression and prefix
negative control; `npm run evaluate` checks the authored answer-quality fixtures.


Find and Ask include a **Search budget** selector and **Search more** button.
Search more explicitly advances Standard -> Broader -> Maximum and retrieves
again. At Maximum it is disabled. Editing the query, filters, scope or method
returns to Standard. These choices apply only to the request and never modify
read grants, saved settings, index profiles or the 16000-character chosen model
context. Search more clears old candidates, choices and answers and invalidates
old answer-save previews. Ask still requires explicit Generate after inspecting
the renewed exact context. Retrieval alone never generates or saves an answer.

Keyword search examines current bounded indexed text with three passages/note
and the selected result cap, even without an embedding model. Hybrid inspects
unique windows from that same finite index, yielding during candidate scanning,
and reports considered/available windows, notes and distinct note/heading groups.
Repeated equal heading names share a group; counts do not prove exact section
identity, semantic support or complete vault coverage. Source hashes are checked
before selected candidate text is sent locally. Larger budgets can use more
CPU/time and up to 1024 in-memory source vectors; no background embeddings or
model download starts. Search cannot recover text omitted by index/scope limits.

An authored 140-heading fixture placed the only related-wording answer at the
last heading. Actual local qwen3-embedding:0.6b searched 128 headings in 3183 ms
and missed it; explicit Broader inspected 140 and retrieved the budget with
three additional embedding calls, reusing prior vectors. Keyword had no match.
A real qwen3:4b-instruct answer used a reviewed 483-character source context.
These fixture observations do not guarantee relevance or latency elsewhere.
Run `npm run evaluate:retrieval` for deterministic positive/negative controls,
or `npm run evaluate:retrieval -- --live` to explicitly use that already
downloaded local embedding model at loopback port 11434. Both retain the same
context/candidate limits; no model is downloaded by the command.


Run **Thread: Extract local PDF**, or choose **Local PDF extraction** in project
home's More actions / advanced setup. Add external PDFs through Obsidian first;
Thread selects existing local vault PDFs and writes only a new Markdown source.
It never replaces, moves or silently copies the original binary. The picker
shows at most 500 current permitted PDF names from metadata without reading
PDF bytes; excluded names are hidden.

Select a PDF inside ordinary allowed paths and choose **Allow ongoing binary
reads** for that exact displayed path. This separate consent permits extraction
and later original-file hash checks; text grants alone never enable PDF reads.
It is stored compatibly in settings schema1 with at most 100 exact paths.
Exclusions always win. Revoke any grant in the same dialog; unavailable grants
hide their paths. Changing/revoking scope clears previews immediately. Check
write-access errors before reopening if a grant change could not be persisted.

Choose a source note name, then **Extract page text**. Inspect individual page
text, examined/omitted/empty/shortened coverage and **Preview new PDF source
note** before Save. The exact new destination is under your mapped Sources
folder; existing notes are refused. Original PDF full SHA-256, exact page text
hashes, parser/extraction version and page mappings are recorded with a new UUID
in readable canonical Markdown. Saving rechecks original bytes, consent, inputs
and settings; PDF changes during an in-flight save revoke its preview. Sources,
import/rename/change history and original PDFs remain unchanged. Managed PDF
text is reused only with current-original verification; raw Markdown remains
readable independently.

Selectable-text extraction uses the pinned Apache-2.0
[PDF.js 6.4.299 release](https://github.com/mozilla/pdf.js/releases/tag/v6.4.299)
and its [license](https://github.com/mozilla/pdf.js/blob/v6.4.299/LICENSE).
Worker code, CMaps, fonts and all required license notices are packaged locally.
No CDN, document URL, remote font, document script, XFA/annotation rendering or
OCR runs. No model, Ollama server or paid service is needed. Parser resource
reads are restricted to the verified plugin inventory. Dev-only optional Node
canvas support is not part of the browser plugin package.

Limits are 16 MiB PDF input, at most 200 document pages accepted, first 40 pages
examined, 8000 retained characters/page, 100000 total retained characters and a
30-second owner-worker deadline. Cancel terminates that worker and discards
late results. The current page stream drains without retaining overflow, then
extraction stops before additional pages when the total cap is reached. These
limits do not certify a hard internal parser heap limit or streaming filesystem
read. Text order, missing glyphs/fonts, complex layouts, off-page text and limits
can omit content; inspect the original. Image-only/encrypted/malformed/oversized
files get explicit guidance rather than guessed text.

Synthetic Obsidian acceptance used the actual packaged worker/fonts offline:
two authored pages preserved their order/text, document action/link canaries
remained inert, and image-only/encrypted/malformed documents were refused.
Bound tests examined 40/45 pages, retained 100000 characters over 13 shortened
pages, and terminated an injected stalled actual worker at 30001 ms. Eight
native workflow cases verified consent/no-read, exact saves, collisions, held
save concurrency, worker cancellation, revocation, exclusions and unchanged
originals/history with zero model calls. These measurements are fixture
observations on this computer.

Run `npm run fixtures:pdf` to create authored synthetic PDFs in a new
`.thread-local/pdf-fixtures` folder, or pass `-- --output .thread-local/new-name`.
Existing output folders are refused. Add copies to a separate Obsidian test
vault and repeat the native workflow; do not substitute personal documents for
automated acceptance. `npm run verify` includes consent, strict record/page
hashes, parser resource boundaries, stream draining, cancellation and actual
PDF modal-handler regressions. `npm run build` generates the explicit PDF
asset inventory; preserve every listed asset when installing.

Encryption refusal also checks the parser encryption filter after opening: an
encrypted PDF with an empty user password is refused even when PDF.js opens it
without prompting. A valid authored encrypted regression fixture is included.

PDF evidence in Find, Ask, Resume and reviews carries the extraction note ID and
full hash, original PDF hash and actual page number. Source buttons verify both
files, then open the original at that page. Saved Markdown also links the
original page; opening an ordinary Markdown link is not a freshness check.
Only extracted page text enters evidence; extraction metadata is not a fact.

Indexing and evidence operations verify at most 10 distinct PDF originals and
32 MiB of binary data per operation (16 MiB/file). The index status reports PDF
verification coverage; omitted or unavailable originals leave their extractions
unusable. Binary authority is never restored from cached text. Changes, missing
files, renames, exclusions or revoked consent invalidate extracted evidence,
dependent outputs and vectors. Exact consent does not follow renamed PDFs.
Use Extract local PDF explicitly with a new source name to restore evidence;
old extractions, notes and original PDFs are preserved. Keyword search, recorded
Resume context and explicit review remain usable without a model.

Use **Thread: Export project checkpoint** (also under More actions) to choose a
permitted project and current text files. Already-consented supporting PDF
originals are optional and start unchecked. Preview the inventory, omissions,
readable note contents, hashes and exact new destination, then explicitly save.
The default destination is a new `.thread-project.json` file in `Thread Exports`;
no read permission is added. Existing or concurrently created files are refused.
Sources, settings and durable change/import history are preserved. Cancel or
source/scope/input changes revoke the preview. An uncertain write can leave a
folder or package file: inspect it and choose a new name before retrying.

Project packages are uncompressed UTF-8 JSON version1 with a manifest and base64
payloads, not ZIP archives. The manifest identifies the checkpoint and project,
original paths, file types, byte lengths, SHA-256, identities and permitted
links/provenance. Only visible portable NFC paths with `.md`, `.txt` or `.pdf`
files are supported. Case-equivalent/file-folder conflicts and common reserved
platform names are refused. Limits:100 candidates/entries,2 MiB per text file,
16 MiB per PDF,32 MiB expanded file bytes and48 MiB serialized package bytes.
Explicit original-PDF verification keeps its existing finite per-pass limits.
No model or network is needed, and there is no service charge.

Whole notes with stale, unsupported or unavailable copied decision/question/
review/output provenance are omitted by default, with generic counts. Every
retained synthesis block is checked (at most100 blocks/2000 references), including
older blocks omitted by AI recall. Legacy appended decision model observations
without complete source snapshots are conservatively omitted; local notes remain
unchanged. Manifest
link/provenance metadata does not enumerate excluded targets. Selected original
note bytes can contain their own links. Hidden configuration, plugin secrets,
caches, recovery journals and originals, models and runtime files are never
selected automatically. This is a selected project checkpoint, not an exhaustive
vault backup or permanent journal.

Files and IDs remain byte-exact. The manifest retains original-path mappings;
relocating copies can leave fully qualified vault links and PDF original paths
needing manual review or explicit re-extraction. Checkpoints never silently
rewrite identities, source hashes or provenance to declare moved evidence fresh.

## Import a project checkpoint

Add a `.thread-project.json` file to a visible, non-excluded vault location using
Obsidian. Run **Thread: Import project package and recovery** (also in Home's
More actions). The picker lists at most200 names without reading contents.
**Validate selected package and preview** explicitly reads that package, including
any embedded PDF bytes. This grants no continuing access to the package or PDFs.
No AI or network is involved.

Only version1 uncompressed Thread JSON is accepted:1-100 Markdown/plain-text/PDF
files,2 MiB/text,16 MiB/PDF,32 MiB expanded and48 MiB serialized. Compression,
ZIP project packages, extra schema fields, unsupported assets, traversal, hidden,
absolute, nonportable or colliding paths, noncanonical base64, invalid UTF-8,
incorrect lengths/hashes and identity metadata inconsistent with note properties
are rejected before writes. Integrity does not establish that a package is honest,
that a claim is supported, or that copied evidence is current.

Choose a new **top-level folder outside all text/PDF grants and exclusions**.
Review every old-to-new destination, file size/hash, preserved ID/properties,
readable text, link mapping and duplicate-ID warning. Existing identity coverage
is limited to the permitted index; unpermitted identities remain unknown.
Import creates byte-exact copies (including BOM/CRLF) and refuses existing roots,
files, parent-file conflicts and case/Unicode collisions. Package, settings or
indexed identity changes require a new preview. Writes are explicit; permissions
and source notes never change. After inspection, explicitly grant only the project
folders and PDFs you want to use.

Links, project associations, IDs and provenance are not rewritten. Fully qualified
links may still name original paths. Stable text IDs can resolve moved exact
sources after a grant if unique. PDF provenance deliberately stays unavailable
until you explicitly consent to the copied original and create a new extraction.
Keep old extracted/output notes as history; importing never freshens them.

Vault I/O is not atomic. A bounded plugin-local `project-imports.json` journal
records intent, file hashes, completed copies and an uncertain write before each
create. It retains up to100 receipts without automatic pruning; full or invalid
history blocks imports with instructions to preserve it. One import/recovery can
run at a time. Cancel, reload or disk failure can leave folders/files; nothing is
automatically deleted. Reopen the command and validate the exact unchanged package
to review recovery. Matching uncertain files can be explicitly adopted without
claiming who created them; only missing reviewed copies are created. Later edits,
foreign files or changed packages are refused. **Keep partial files and close
recovery** preserves copies/history and permits a different new import. A folder
created just before a journal failure may require this conservative path. Restore
invalid journals only from your own known good backup; never reset history to
force a retry. This is a new-copy import, not a destructive vault restore.

Release0.4.1 includes192 explicitly inventoried files and preserves earlier build
artifacts in version-specific staging. `node --experimental-strip-types scripts/verify-package.mjs dist/thread-0.4.2.zip` checks exact paths, ZIP records/CRC, production bytes,
PDF resources/licenses and SHA-256. Development/evaluation tools remain separate
from the installed plugin. This private build has no API/hosting subscription;
local storage, compute and electricity still apply.

## Compare a retained checkpoint

Use **Thread: Compare project checkpoint**, **Compare checkpoint** in the sidebar
Packages tools, or the full workspace's package controls. Select a saved local
`.thread-project.json` for the currently selected permitted project, then click
**Compare selected checkpoint**. No model runs and no notes or permissions change.

Expand a row to inspect actual retained/current text, full-byte SHA-256 and sizes.
Missing means absent at the original permitted path now, not proven deletion.
Current-only may have been unselected in the earlier export. The dialog reports
checkpoint omissions and current limits; it never invents history from file dates
or infers renames. PDF rows compare hashes/sizes only. Historical PDF-derived text
still requires exact current original consent and matching supporting snapshots.
Excluded or stale historical evidence is withheld even if the package contains
matching old copies. Package integrity alone does not establish permission.

Existing package budgets apply to each side, with at most100 current candidates
and200 comparison rows. Text display is limited to50000 characters per side and
200000 total, with explicit clipping notices; full-byte hashes remain visible.
Source/package/input/settings changes or Cancel clear results. Recompare current
content; importing copies is a separate explicit workflow, not a restore button.

## Reviewed web clips

Use **Review web clip** in Research (or **Thread: Review saved web clip**) to review a deliberately saved local clip, explicitly choose its project, inspect metadata and possible duplicates, then preview a new source copy. Publication, capture and intake dates stay separate; missing or ambiguous metadata stays unknown. The original clip is never overwritten, URLs are not fetched and no AI model is used. Changes require a fresh preview.

Importable article/selection templates and detailed steps are in [the Web Clipper guide](integrations/clipper/README.md). Intake accepts original permitted local text up to2 MiB including saved provenance. The picker covers up to200 indexed notes; duplicate hints cover up to100 current permitted imported sources and do not establish complete coverage or duplicate identity. Browser-extension use remains a separate explicit user action.

## Local updates and recovery

The Linux helper validates a locally selected private Thread package and produces an exact code/asset replacement preview while preserving the installation and vault. It checks fixed inventory/hashes, paths/links, versions, host compatibility and known data schemas. See [local update instructions](docs/local-updates.md). Explicit application, durable interruption recovery and freshly previewed compatible code rollback require closed Obsidian and exact approval hashes. Notes and data stay in place; code rollback does not undo note changes or migrations. Packages are local artifacts, not a published release; checksums are not publisher signatures.
