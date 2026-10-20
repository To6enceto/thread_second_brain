# Launch Thread on Fedora

Thread runs inside Obsidian. This optional helper opens an already configured
vault and the Thread panel. It does not install Obsidian, Thread, Ollama or models,
grant note access, change settings, or generate an answer.

You need Node 22.15+ (already required for this checkout) and an installed Obsidian.
The default is Fedora's user-installed `md.obsidian.Obsidian` Flatpak. Open your
vault in that installation once, install/enable the current Thread build, and
close the setup dialogs before trying the shortcut. In Obsidian's vault switcher,
open the desired vault's context menu and choose **Copy vault ID**. The ID identifies
that exact registered vault, even if two vaults have the same name.

From the Thread checkout:

```bash
npm run launcher -- init "/absolute/path/to/your/vault" "/absolute/path/to/a/new-launcher-folder" "YOUR_16_CHARACTER_VAULT_ID"
```

The output folder must not already exist; its parent must exist. This creates
`launcher.json` and `thread.desktop` only. It does not install the desktop entry
into your account or start anything. Keep the folder and this checkout at their
current locations because the shortcut references their absolute paths.
Use a checkout directory without literal backslashes in its name: Node's ES
module loader cannot load the helper from that Linux filename.

Inspect `launcher.json`. For example:

```json
{
  "version": 1,
  "vaultPath": "/home/example/Documents/Thread-Vault",
  "vaultId": "0123456789abcdef",
  "obsidian": {
    "kind": "flatpak",
    "executable": "/usr/bin/flatpak"
  },
  "ollama": {
    "port": 11434,
    "startIfMissing": false
  }
}
```

Use your actual paths, not the example user's path. For an extracted executable,
set `kind` to `executable` and `executable` to its absolute path. An optional
`obsidian.profilePath` passes `--user-data-dir` for a separate profile; it is useful
for disposable testing. The vault must be registered and Thread enabled there.
No arbitrary command string is evaluated.

Check without starting any application:

```bash
npm run launcher -- check "/absolute/path/to/new-launcher-folder/launcher.json"
```

This checks the executable, vault plugin metadata and local Ollama cloud status.
It does not prove that the desktop session can open the application. Then launch:

```bash
npm run launcher -- run "/absolute/path/to/new-launcher-folder/launcher.json"
```

The helper sends `obsidian://thread?vault=<id>&threadVault=<path>` to the application.
Obsidian selects the registered vault; Thread reveals its panel after the layout
loads and checks that the vault path matches. Repeat launches reuse the application
and do not close existing notes.
If the server is absent and startup is off, recorded-only Thread still opens.
Use Thread Settings to choose the matching loopback endpoint and downloaded model.

## Optional local Ollama startup

Startup is disabled by default. To explicitly consent, edit your local config:

```json
"ollama": {
  "port": 11434,
  "startIfMissing": true,
  "executable": "/absolute/path/to/ollama",
  "modelsPath": "/absolute/path/to/existing/models"
}
```

The helper starts `serve` only after confirmed connection refusal at that port.
It sets `OLLAMA_HOST=127.0.0.1:port`, `OLLAMA_NO_CLOUD=1` and `OLLAMA_MODELS` to your
configured directory. Nothing is downloaded. A ready existing server is reused;
an unsafe, unknown or timed-out server produces an error instead of a competing
process. Readiness waits at most 20 seconds plus a bounded in-flight check.
The helper never stops any process. A process it starts remains running after
Obsidian closes, like an Ollama server you started in a terminal.

## Desktop shortcut and diagnostics

Inspect `thread.desktop` before installing it. It uses a terminal so connection
messages are visible; interactive failures wait for Enter. Once you approve that
concrete entry, you can copy it into your user applications directory using your
file manager. This helper never installs it or alters MIME/protocol registration.
To regenerate an entry after moving the checkout, choose a new output filename:

```bash
npm run launcher -- shortcut "/absolute/path/to/launcher.json" "/absolute/path/to/new-thread.desktop"
```

- **Executable missing / EACCES:** correct its absolute path and permissions.
  For Flatpak, confirm `flatpak info md.obsidian.Obsidian` succeeds.
- **Install and enable Thread:** open this vault once in the chosen Obsidian
  profile, install the current build and enable it under Community plugins.
  This helper currently expects the standard `.obsidian` configuration folder.
- **Wrong vault or welcome screen:** register the configured vault in that
  Obsidian profile and copy its ID; the helper does not edit the vault registry.
  Vault IDs belong to the chosen profile. A path mismatch refuses to open Thread.
- **Cloud status unavailable/unsafe:** use a compatible local Ollama, disable its
  cloud features yourself and retry. The helper does not restart an existing server.
- **Ollama absent:** use recorded-only mode, start Ollama yourself, or explicitly
  configure startup as above. A running server still needs a downloaded model.
- **Launch failure:** inspect `obsidian-launch.log` beside the config; check your
  graphical session and Flatpak vault access. Runtime startup logs go to
  `ollama-launch.log` in the same folder. No note text is sent by the helper.
- **Panel not visible with an older plugin:** update the disposable test install
  to a build with the `thread` protocol route, or use the Open Thread command.

Development acceptance uses synthetic vaults, separate profiles and owned runtime
processes. It does not authorize installing a shortcut into your account or
changing your everyday Obsidian installation.

Protocol and desktop integration references: [Obsidian URI](https://obsidian.md/help/uri),
[Flatpak conventions](https://docs.flatpak.org/en/latest/conventions.html),
[Desktop Entry Exec](https://specifications.freedesktop.org/desktop-entry-spec/latest/exec-variables.html).
