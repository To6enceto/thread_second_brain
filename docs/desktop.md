# Thread Desktop preview

Thread now has an independent Linux window. Obsidian can stay closed. Feature 49
is a read-only vault browser/source reader; the existing plugin still provides
Resume, Ask and the other completed workflows. Desktop parity is tracked in
features 50-62 of the build plan.

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
4. Choose a listed note. Its original Markdown is shown literally, including
   formatting characters. Nothing is edited, rendered as HTML or fetched remotely.
5. Edit a test note in another editor, then **Refresh** and reopen it to see the
   changed text. This milestone does not yet monitor external changes automatically.
6. Clear Allowed paths and approve, or choose **Close vault and clear access**.
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
- The reader shows a snapshot. Refresh/reopen after external edits; modification
  dates do not establish when a recorded event happened.
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
