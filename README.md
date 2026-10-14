# Thread

Thread is a planned desktop Obsidian plugin that helps you resume projects,
understand past decisions, and connect research using a local AI model.

Development follows the AI Blueprint build plan. The first implemented slice
provides a local, sourced project briefing inside Obsidian.

## Development

Requires Node.js 22 or newer and npm.

```bash
npm ci
npm run verify
npm run dev
```

`verify` runs TypeScript checking, focused logic tests, and a production bundle. `dev` watches the
plugin source and rebuilds `main.js`.

## Planning

- `blueprint/project-plan.md`: product direction, architecture, UX, and costs.
- `blueprint/build-plan.md`: ordered features and release milestones.

## Obsidian smoke test

Use a separate test vault. After `npm run build`, copy `main.js` and
`manifest.json`, and `styles.css` into `<test-vault>/.obsidian/plugins/thread/`.
Enable Thread in Obsidian's Community plugins settings. Keep personal notes
outside this source repository.

## Resume a project

1. Install Ollama separately and download a local text model.
2. Start Ollama with cloud features disabled, for example `OLLAMA_NO_CLOUD=1 ollama serve`
   on Linux. Restart an already running service after applying the
   setting. Thread requires the `/api/status` API to confirm local-only mode.
3. Open **Thread: Open Thread** from Obsidian's command palette.
4. Choose **Settings**, set the local endpoint and exact model name, select your
   project folder, and add exclusions. Save and test the connection.
5. Choose **Resume project**. Follow source buttons to the supporting notes.

The briefing separates facts, interpretations, and suggestions. Cancellation,
missing evidence, model errors, and source changes are visible. This initial
slice does not write notes; later features add reviewed saving and editing.

The Linux test setup uses Obsidian 1.14.4, Ollama 0.40.4, and qwen3:4b. On the
available RTX 5070 laptop GPU, the first synthetic-project briefing took about
38 seconds including model loading. This is a test observation, not a speed or
quality guarantee for other hardware or vaults.

Obsidian and Ollama are runtime prerequisites for the planned local experience.
Codex and Claude Code are development assistants, not runtime requirements.
