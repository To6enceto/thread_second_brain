# Local update preview (Linux)

The Node helper inspects an explicitly selected local Thread ZIP and installation.
It never downloads or executes package code. At this stage it produces a preview
only; applying updates and interruption recovery are a separate workflow.
Use Node22.15+ and a locally trusted, verified package. Checksums detect changed
bytes; they do not authenticate a publisher or make arbitrary code trustworthy.

Build a private candidate with `npm run package`. This runs Verify and packages
192 files: the191 existing runtime/PDF assets plus `thread-update.json` with exact
hashes and declared compatibility. Earlier version packages remain separate.
To verify it against the current production build:

```bash
node --experimental-strip-types scripts/verify-package.mjs dist/thread-0.4.0.zip
```

Copy the actual Obsidian version from About. The current helper supports
Obsidian1.14.4 through the1.14.x series, candidate Thread0.4.x, and installed
legacy0.3.0 or declared-compatible0.4.x. It refuses prereleases, unknown series,
ordinary downgrades and undeclared data compatibility. These are explicit
supported ranges, not a promise about untested future host versions.

From the repository, choose a new preview filename outside the installation:

```bash
npm run updater -- preview \
  /absolute/path/to/thread-0.4.0.zip \
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
plugin data schemas. It bounds packages to40 MiB, payloads to32 MiB and individual
runtime files to12 MiB. Known data inspection is bounded to32 MiB/file and64 MiB
total; values are not printed or copied into the preview. Settings, indexes,
change/recovery/import/project-import/rename journals and unrelated files stay
in place. Unknown or malformed data is a refusal, never an instruction to delete
it. Current-state hashes detect changed snapshots; no filesystem-wide atomicity
or protection from uncooperative external writes is claimed.

Legacy0.3.0 has no declared new-data compatibility, so a preview marks previous
code rollback incompatible. Keeping old code alone does not prove it can read new
records. Declared0.4.x uses `thread-0.4-v1`; compatible code rollback will never
reverse note changes or data migrations. This helper performs no migrations.

If refused, preserve the originals, check the exact chosen paths and actual host
version, obtain an unchanged compatible package, and prepare a new preview.
Do not remove journals/caches or alter metadata to make a check pass.
