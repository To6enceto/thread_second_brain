# Local updates and recovery (Linux)

The Node helper inspects an explicitly selected local Thread ZIP and installation.
It never downloads or executes package code. Preview first, then explicitly apply
the exact approved result with Obsidian closed. Recovery and compatible previous
code rollback are explicit commands.
Use Node 22.15+ and a locally trusted, verified package. Checksums detect changed
bytes; they do not authenticate a publisher or make arbitrary code trustworthy.

Build a private candidate with `npm run package`. This runs Verify and packages
192 files: the 191 existing runtime/PDF assets plus `thread-update.json` with exact
hashes and declared compatibility. Earlier version packages remain separate.
To verify it against the current production build:

```bash
node --experimental-strip-types scripts/verify-package.mjs dist/thread-0.4.1.zip
```

Copy the actual Obsidian version from About. The current helper supports
Obsidian 1.14.4 through the 1.14.x series, candidate Thread 0.4.x, and installed
legacy 0.3.0 or declared-compatible 0.4.x. It refuses prereleases, unknown series,
ordinary downgrades and undeclared data compatibility. These are explicit
supported ranges, not a promise about untested future host versions.

From the repository, choose a new preview filename outside the installation:

```bash
npm run updater -- preview \
  /absolute/path/to/thread-0.4.1.zip \
  /absolute/path/to/Vault/.obsidian/plugins/thread \
  1.14.4 \
  /absolute/path/to/new-preview.json
```

Review each add/replace/unchanged runtime path and its before/after hash, target
path, versions and data-compatibility summary. The exclusive preview file includes
these exact snapshots and prints an approval SHA-256. An existing preview filename
is never overwritten. No installation files, notes or settings are changed.
A running vault can change snapshots and cause refusal; close it before a later
write workflow. The helper does not stop or launch Obsidian/Ollama.

The helper validates the fixed runtime inventory, ordinary nonsymlink parent
paths, regular non-hardlinked files, package ZIP records/CRC/hashes, and known
plugin data schemas. It bounds packages to 40 MiB, payloads to 32 MiB and individual
runtime files to 12 MiB. Known data inspection is bounded to 32 MiB/file and 64 MiB
total; values are not printed or copied into the preview. Settings, indexes,
change/recovery/import/project-import/rename journals and unrelated files stay
in place. Unknown or malformed data is a refusal, never an instruction to delete
it. Current-state hashes detect changed snapshots; no filesystem-wide atomicity
or protection from uncooperative external writes is claimed.

Legacy 0.3.0 has no declared new-data compatibility, so a preview marks previous
code rollback incompatible. Keeping old code alone does not prove it can read new
records. Declared 0.4.x uses `thread-0.4-v1`; compatible code rollback will never
reverse note changes or data migrations. This helper performs no migrations.

## Apply the reviewed preview

Close Obsidian yourself before applying. The helper requires `--obsidian-closed`
and refuses recognized Obsidian processes owned by your user. Keep it closed until
the helper completes or recovery finishes. It never stops or starts applications.
Linux `flock` (normally supplied by util-linux) must be available; absent tooling
or unavailable process inspection is a refusal. The process check is conservative:
an unrelated Obsidian window also blocks application. The acknowledgement remains
necessary because a renamed executable or an uncooperative process can evade name
checks; do not start another process that writes these files during an update.

Copy the exact **Approval SHA-256** from the preview command. Choose an unused
state-directory path outside the installation, on ordinary nonsymlink directories:

```bash
npm run updater -- apply \
  /absolute/path/to/new-preview.json \
  <approval-sha256> \
  /absolute/path/to/new-update-state \
  --obsidian-closed
```

The command rechecks package, code, data and directory identities. It saves
previous code, the candidate package and an immutable `intent.json` before any
code replacement. It prints a separate **Intent SHA-256** for recovery; retain
that value and the entire state directory. No settings, notes or journal contents
are copied into that directory. A declared compatible previous release also gets
a reproducible `previous.zip`. Legacy code is retained as individual files.

A persistent empty `.thread-update-lock` coordinates helpers using Linux file
locking. Its empty inode is valid immediately, even if the process stops during
initial creation. Existing compatible marker bytes remain untouched; other
nonempty contents are refused.
The temporary `.thread-update-pending` pointer prevents a different update while
one is unfinished. Intent, pending and completion records are also staged and
synced before atomic publication, so interruption cannot publish a partial final
coordinator record. Each runtime file is written and synced to an owned temporary
file, then individually renamed and the directory synced. This is not one atomic
transaction across the installation. Completion records and validates the final
code and data before removing the pending pointer. Settings, caches and journals
are preserved byte for byte by the helper; Obsidian may update caches normally
after it reopens.

## If interrupted

Keep Obsidian closed. Do not delete the state directory, pending pointer, journals
or unrecognized temporary files. Use the printed intent hash:

```bash
npm run updater -- recover \
  /absolute/path/to/new-update-state \
  <intent-sha256> \
  --obsidian-closed
```

Recovery validates retained artifacts and accepts only the exact before or after
bytes of each runtime file. It finishes the approved update, preserving data.
Repeating recovery for an unchanged completed operation is safe. Later edits,
changed data/directories, ambiguous state and altered staging are refusals.
Preserve those files and investigate the specific conflict; do not edit the
metadata or replace a changed file just to make validation pass.

If preparation failed before `intent.json` exists, no code replacement began.
Keep the incomplete artifacts and prepare a fresh preview and unused state path.
If the terminal was lost after intent creation, inspect `intent.json` and the
retained files before independently calculating its SHA-256 with `sha256sum`;
the digest is an approval of those exact bytes, not an authenticity certificate.
Interrupted temporary writes are retained. Recovery uses a new temporary file and
does not automatically delete unfamiliar or partial files.

## Compatible previous-code rollback

After a completed update, explicitly preview rollback:

```bash
npm run updater -- rollback-preview \
  /absolute/path/to/new-update-state \
  <intent-sha256> \
  1.14.4 \
  /absolute/path/to/new-rollback-preview.json
```

This requires the installed code still to match that completed update and the
previous code to declare the same data format. It validates current data and
captures new data hashes, so records made since the update stay in place.
Review the output, then use `apply` with this new preview, its new approval SHA,
and a new state directory. An interrupted rollback uses the same `recover`
command. Ordinary previews still refuse downgrades. Legacy 0.3.0 rollback is
unavailable because it has no compatibility declaration.

Rollback restores code only. It does not restore earlier notes, settings, actions,
decisions, journals or caches, and cannot reverse a data migration. Do not use a
previous package directly to bypass this check.

If refused, preserve the originals, check the exact chosen paths and actual host
version, obtain an unchanged compatible package, and prepare a new preview.
Do not remove journals/caches or alter metadata to make a check pass.
