# Thread Desktop preview

Thread has an independent Linux window with scoped vault browsing, keyword
evidence search, safe Markdown navigation, project home and recorded Resume. Obsidian can stay closed. The
existing plugin also provides AI Resume, Ask and the other completed workflows;
remaining desktop features are tracked in items 52-62 of the build plan.

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
  entries. Search returns at most 20 balanced passages. Coverage reports omitted
  notes and shortened sections; it does not establish exhaustive vault coverage.
- YAML 1.2 metadata uses the bundled ISC-licensed yaml parser. Invalid, duplicate,
  unknown-tag, aliased or over-64-KiB headers omit the note from evidence; its
  original source remains readable. No plugin metadata parser is required.
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
leaves every plugin setting, journal and source unchanged. Later write features
must establish compatible persistence and cross-process coordination before use.

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
passages. A chip opens the current source inside Thread; **Project home** or
**Resume project** returns to the project view. No Ollama/model is required here.

Missing records remain explicit. Recorded dates and user-reported progress are not
independently verified events. Index and 16,000-character context limits remain
visible; generated records with stale or unavailable dependencies are withheld.
Plugin pending reviews are not loaded. Project membership follows existing schema:
folder contents, explicit links from those notes, and matching project IDs.

External edits, access changes and Cancel indexing clear the project output too.
Refresh projects and select again to rebuild it. Source bytes/dependencies are
checked before publication and citation navigation. Mapping and selection clear on
vault change/reload; all setup is still volatile and no notes/history are written.
