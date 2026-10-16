# Thread

Thread is a desktop Obsidian plugin for returning to projects, finding evidence,
recording decisions and turning research into reviewed Markdown knowledge. A
local Ollama model supplies suggestions; your notes remain authoritative. No
account, API key, backend or paid model service is required.

This is a **private local 0.1.0 build**, not a published Community plugin. It is
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
then creates `dist/thread-0.1.0.zip` and `dist/thread/`. The ZIP contains exactly
`thread/main.js`, `thread/manifest.json` and `thread/styles.css`. No vault, model,
settings or recovery data is included. Repeated builds of the same source and
locked tools produce the same package bytes.

Start with a separate test vault. Extract the `thread` directory from the ZIP
into `<vault>/.obsidian/plugins/`, so `main.js` is directly inside
`<vault>/.obsidian/plugins/thread/`. If you use a custom Obsidian configuration
folder, substitute it for `.obsidian`. In Obsidian, open **Settings > Community
plugins**, allow Community plugins, reload Obsidian and enable **Thread**.
[Obsidian's plugin settings guide](https://obsidian.md/help/community-plugins)
explains where to find the plugins folder. Thread is not in the Browse directory.

For an update, disable Thread, preserve its existing `data.json`, `changes.json`,
`imports.json` and `renames.json`, replace only the three package files and enable
it again. Keep an independent vault backup; the bounded change journal is not a
complete backup system.

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

Open **Thread: Open Thread** from the command palette (`Ctrl/Cmd+P`), then choose
**Settings** in the Thread panel.

1. Set the endpoint and exact downloaded model name. Choose **Test local
   connection**; expect confirmation that the model is available and cloud is
   disabled.
2. Select one project folder. Saving explicitly grants read access to that folder.
   Add other folders or notes under **Allowed read paths**, one vault-relative
   path per line. Add **Excluded paths** before generation. Exclusions win.
3. Map Projects, Inbox, Sources, Knowledge, Reviews and Templates to your existing
   folders. Mapping a destination does not grant model read access. Knowledge
   edits and refresh saves also need their destination inside allowed paths.
4. Save settings, close the dialog and choose **Resume project**.

First-use read scope is empty. Thread reads only permitted `.md` and `.txt` files.
Hidden configuration folders are excluded. Project evidence uses containment,
project IDs and explicit links, always within read scope. **All allowed paths**
is an explicit wider scope, not permission to read the entire vault. Legacy notes
need no migration. **Preview a new workspace** optionally creates UUID-tagged
starter notes/templates without overwriting existing files.

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

This release has bounded text context and local keyword/link retrieval. It does
not include embeddings, PDF/OCR, audio, web fetching, mobile inference, cloud
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

Thread opens to a **Project home** with recent sessions, explicit decision statuses, recorded questions and visible pending proposals. The Project selector switches among already permitted projects without changing read grants. Refresh home reloads its bounded snapshot without AI. Resume, Ask and Wrap up stay directly available; other tools are under More actions.

Find and Ask rank keyword matches using titles, headings, explicit note aliases and passage text. Use double quotes for required phrases and Search filters for type, status, path and record dates. Filters only narrow your permitted scope. Keyword search works without a model. Results balance notes, keep relevance in bounded AI context and show omitted coverage; only the first 50000 body characters per note are indexed. Record dates can fall back to modification dates and never establish when an event happened.


Optional local semantic search is off by default. In Thread settings, enable
Optional semantic search and select the exact name of an already downloaded
embedding model, such as `qwen3-embedding:0.6b`. Save, open Find evidence or Ask,
and choose Hybrid (local). Keyword is always the initial method and works
without any model. If embeddings are unavailable or invalid, Hybrid shows an
explicit keyword fallback. Thread never downloads models or runs background
embedding jobs. The local runtime and embedding model are free; downloads need
disk space and inference uses your hardware and electricity.

Hybrid combines keyword and cosine similarity ranks. It considers at most 128
350-character passages, cycling through eligible notes before taking extras;
filters and required quoted phrases still apply. Results and saved answers show
candidate counts, model digest and coverage limits. The fixed 0.45 similarity
threshold is a conservative heuristic tested with the example model, not a
universal relevance score. Large vaults can have relevant passages outside this
bounded candidate set. Missing evidence and incorrect matches remain possible.

At most 512 source vectors stay in memory, keyed by local model digest, full
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
