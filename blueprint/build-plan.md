# Build Plan

Thread's first release follows the scope in `project-plan.md`. Each numbered
checkbox is one feature to spec and verify through Blueprint. Scaffold creation
and Blueprint installation are already performed setup, not completed features.
Keep these IDs stable; all features are initially unimplemented.

## Milestone A - Resume a project with local evidence

- [x] 1. **Local project briefings** - Select an allowed project folder, connect a local Ollama model, and generate a read-only Resume briefing with validated source links, evidence gaps, cancellation, and setup errors.
- [x] 2. **Reusable project workspaces** - Map existing vault folders or explicitly create starter project notes and templates, persisting project selection and read exclusions without overwriting existing notes.

## Milestone B - Find information and preserve reasoning

- [x] 3. **Indexed evidence recall** - Find relevant eligible passages through a rebuildable local text/link index that updates on note edits, renames, deletions, and scope changes.
- [x] 4. **Ask your vault** - Answer project-scoped or explicitly vault-scoped questions with source references and unsupported-answer handling, and save selected answers as new Markdown notes.
- [x] 5. **Decision records** - Create and review project decisions with alternatives, rationale, supporting evidence, acceptance status, and revisit conditions while retaining superseded choices.

## Milestone C - Grow knowledge through reviewed changes

- [x] 6. **Inbox capture** - Capture thoughts and import Markdown/text sources with provenance, identical-import detection, and reviewed suggestions for project association.
- [ ] 7. **Reviewed knowledge updates** - Turn selected sources into proposed summaries and links, preview affected notes, and apply approved changes with before-hash checks, recoverable partial failures, and guarded undo.
- [ ] 8. **Decision evidence review** - Flag relevant or potentially conflicting new evidence for an existing decision and let the user retain, annotate, or supersede it through the reviewed-change workflow.

## Milestone D - Maintain continuity over time

- [ ] 9. **Session wrap-up** - Generate and save a reviewed project-session note with progress, open questions, and a suggested next step that informs the next Resume briefing.
- [ ] 10. **Weekly project review** - Generate an on-demand, sourced review of project activity, resolved questions, new evidence, and projects to revisit, with an explicit save action.
- [ ] 11. **Source freshness** - Mark generated outputs when supporting passages change or disappear, follow renamed notes, and regenerate through reviewed changes while preserving prior output.

## Milestone E - Finish the local release

- [ ] 12. **Offline release readiness** - Package the desktop plugin and demonstrate install, model setup, the core workflow, recovery, keyboard/theme usability, and offline inference in a synthetic Obsidian vault with accurate user instructions.

## Build discipline

The first feature includes only the connection and read boundaries necessary for
its briefing. It reads current notes directly; the reusable index arrives in
feature 3. Text-only imports keep the local release achievable without paid
services. Semantic search and advanced import formats remain deferred.

Introduce focused logic tests explicitly with the first logic-bearing feature,
then include the configured test command in Verify. Demonstrate UI behavior in
Obsidian; a passing bundle alone does not complete a feature. Do not mark any
item complete until its spec, verification evidence, and Blueprint completion
workflow support that state.
