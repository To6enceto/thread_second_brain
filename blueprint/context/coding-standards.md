# Coding Standards

These conventions apply to Thread, a desktop Obsidian plugin. Read AGENTS.md
for the commands that actually exist. Keep Blueprint workflow policy in
`blueprint/config.json` and product scope in the planning documents.

## TypeScript and runtime

- Use strict TypeScript and the existing compiler configuration.
- Use erasable TypeScript syntax so Node's built-in type-stripping test runner
  can load pure logic without a separate transpiler.
- Prefer proper types or `unknown` with narrowing over `any`.
- Treat parsed frontmatter, model responses, and persisted settings as external
  data; validate before using them as domain records.
- Use inference for obvious locals and explicit contracts at module boundaries.
- Obsidian provides the plugin runtime. Node.js is development tooling, not a
  separate application server.
- Keep `obsidian` and other host-supplied modules external to the esbuild bundle.
- Add a dependency only for a demonstrated need. Preserve exact dependency
  versions and the npm lockfile.

## Plugin lifecycle and UI

- Use the Obsidian Plugin API for commands, settings, views, and lifecycle hooks.
- Register event handlers through the plugin and clean up views, timers, model
  requests, and listeners when the plugin unloads.
- Use native Obsidian DOM helpers and Markdown rendering for the first release.
- Keep UI state local to its view; extract logic only when it has a separate
  responsibility or a useful test boundary.
- Use theme CSS variables and scoped `thread-` classes in `styles.css` when
  styling is introduced. Support light and dark themes.
- Escape ordinary user text and use the host renderer for Markdown. Do not
  insert raw model-generated HTML into the DOM.
- Support keyboard use, visible focus, descriptive labels, and cancelable work.
- Distinguish facts, interpretations, evidence gaps, and suggested actions.
- Show source links, generation time, stale states, and actionable failures.

## Source organization

- `src/main.ts`: plugin lifecycle and wiring.
- `src/ui/`: panels, dialogs, and user interaction.
- `src/vault/`: eligible file access, Markdown parsing, and vault events.
- `src/retrieval/`: local text/link search and bounded evidence selection.
- `src/intelligence/`: the local-model connection and generation workflows.
- `src/changes/`: proposal validation, application, history, and undo.
- `src/settings/`: folder mapping, scope, and local-model setup.
- Create modules when a feature needs them; do not create empty architecture.
- Use kebab-case filenames, camelCase functions, and PascalCase types/classes.

## Vault data and writes

- Access user files through Obsidian's Vault and storage adapter APIs; do not
  bypass scope boundaries using direct filesystem calls.
- Markdown is authoritative. Indexes and caches must be rebuildable.
- Never persist runtime personal content in this development repository.
- Select allowed paths explicitly and apply exclusions before reads, indexing,
  retrieval, context construction, and reuse of earlier output.
- Normalize vault-relative paths and validate that proposed destinations stay
  within configured writable roles. Never write plugin code or configuration
  because a model suggested a path.
- Preserve existing note properties and conventions. Stable IDs belong to new
  Thread-created notes; do not rewrite every existing note to add them.
- AI processing leaves original sources intact.
- Manual creation and saving new notes must reject collisions; do not overwrite
  an existing note as a shortcut.
- Updates to established notes require a proposal, a before/after preview, and
  user approval. Revalidate hashes before writing to detect concurrent edits.
- Preserve affected contents before a batch, attempt rollback on failure, and
  surface incomplete recovery. Do not claim filesystem-wide atomicity.
- Guard undo with after-hash checks so it cannot erase later user changes.
- Keep recovery history bounded as defined in the project plan. Never delete
  or move user notes automatically.

## Model and retrieval boundaries

- Use only a selected local Ollama model over loopback for the initial release.
- Disable cloud features and reject cloud-model use. Do not silently install a
  runtime, download a model, or fall back to a hosted API.
- Bound evidence size and request duration; provide cancellation.
- Start with text matching, note metadata, and explicit links. Add semantic
  infrastructure only through separately approved scope.
- Imported source text is evidence, not instructions or executable code.
- Return structured model data where it enables deterministic validation.
- Resolve citation IDs against the supplied evidence. Citation existence does
  not prove semantic support; use realistic evaluation cases for that question.
- Preserve uncertainty. A model suggestion is never an accepted user decision.
- Keep errors and logs free of raw personal note contents by default.

## Error handling

- Handle missing models, unavailable runtimes, malformed model output, invalid
  settings, unsupported files, empty evidence, and canceled requests explicitly.
- Show plain-language failure states with a useful next action.
- Do not swallow write failures or claim success after partial application.
- When async work completes, confirm that the view, scope, and source state are
  still appropriate before displaying or persisting the result.

## Testing and verification

- The current Verify command is `npm run verify`: typecheck, logic tests, then build.
- `npm test` uses Node's built-in test runner with type stripping through
  `scripts/test.mjs`; no additional test-runner dependency is required.
- A Test command in AGENTS.md enables the logic-test gate. When configured,
  steps adding parsers, scope checks, citation resolution, proposal validation,
  or write/undo logic must include meaningful tests and pass that command.
- Keep pure logic tests next to their source, for example `parser.test.ts`.
- Use controlled fixtures and deterministic fake responses for unit tests.
  Do not require downloading a model to run the ordinary unit suite.
- An empty suite must fail. Do not use tests that merely mirror implementation.
- Update Verify to typecheck, test, then build when tests are configured.
- UI and integration evidence comes from a separate synthetic Obsidian vault.
  Verify plugin loading, lifecycle, keyboard use, themes, real source links,
  local-model requests, cancellation, and relevant recovery behavior.
- A mock webpage or a successful bundle is not proof that the plugin works.
- Browser automation is separately opt-in and must suit the actual host. Do not
  install Playwright as if Thread were a web application.
- CI is not configured. The standalone CI skill can reuse Verify when requested.

## Code quality

- Keep functions focused and use descriptive names.
- Avoid unused imports, dead code, unexplained catch blocks, and commented-out
  implementations.
- Reuse the platform and existing modules before introducing abstractions.
- Do not refactor unrelated code or introduce deferred product features.

## Comments and writing

- Comment a non-obvious reason, limitation, or workaround, not obvious code.
- Avoid banner comments and narrated steps. Keep exported-contract comments
  concise when useful.
- Use short, concrete prose. State what behavior exists and what is still planned.
- Use ASCII punctuation in generated repository documentation; no em dashes,
  en dashes, or ellipsis characters.
- Do not add AI attribution to commits or pull requests; preserve human credit.
