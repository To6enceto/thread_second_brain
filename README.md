# Thread

Thread is a planned desktop Obsidian plugin that helps you resume projects,
understand past decisions, and connect research using a local AI model.

This repository currently contains the plugin scaffold and AI Blueprint setup.
Product features will be implemented from the ordered build plan.

## Development

Requires Node.js 22 or newer and npm.

```bash
npm ci
npm run verify
npm run dev
```

`verify` runs TypeScript checking and a production bundle. `dev` watches the
plugin source and rebuilds `main.js`.

## Planning

- `blueprint/project-plan.md`: product direction, architecture, UX, and costs.
- `blueprint/build-plan.md`: ordered features and release milestones.

## Obsidian smoke test

Use a separate test vault. After `npm run build`, copy `main.js` and
`manifest.json` into `<test-vault>/.obsidian/plugins/thread/`. Enable Thread in
Obsidian's Community plugins settings. The initial scaffold should load without
errors; it does not expose product UI yet. Keep personal notes outside this
source repository.

Obsidian and Ollama are runtime prerequisites for the planned local experience.
Codex and Claude Code are development assistants, not runtime requirements.
