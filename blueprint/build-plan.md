# Build Plan

Thread's first release follows the scope in `project-plan.md`. Each numbered
checkbox is one feature to spec and verify through Blueprint. Scaffold creation
and Blueprint installation are already performed setup, not completed features.
Keep these IDs stable. Features 1-12 preserve the completed 0.1.0 release;
features 13-21 are the approved local improvements.

## Milestone A - Resume a project with local evidence

- [x] 1. **Local project briefings** - Select an allowed project folder, connect a local Ollama model, and generate a read-only Resume briefing with validated source links, evidence gaps, cancellation, and setup errors.
- [x] 2. **Reusable project workspaces** - Map existing vault folders or explicitly create starter project notes and templates, persisting project selection and read exclusions without overwriting existing notes.

## Milestone B - Find information and preserve reasoning

- [x] 3. **Indexed evidence recall** - Find relevant eligible passages through a rebuildable local text/link index that updates on note edits, renames, deletions, and scope changes.
- [x] 4. **Ask your vault** - Answer project-scoped or explicitly vault-scoped questions with source references and unsupported-answer handling, and save selected answers as new Markdown notes.
- [x] 5. **Decision records** - Create and review project decisions with alternatives, rationale, supporting evidence, acceptance status, and revisit conditions while retaining superseded choices.

## Milestone C - Grow knowledge through reviewed changes

- [x] 6. **Inbox capture** - Capture thoughts and import Markdown/text sources with provenance, identical-import detection, and reviewed suggestions for project association.
- [x] 7. **Reviewed knowledge updates** - Turn selected sources into proposed summaries and links, preview affected notes, and apply approved changes with before-hash checks, recoverable partial failures, and guarded undo.
- [x] 8. **Decision evidence review** - Flag relevant or potentially conflicting new evidence for an existing decision and let the user retain, annotate, or supersede it through the reviewed-change workflow.

## Milestone D - Maintain continuity over time

- [x] 9. **Session wrap-up** - Generate and save a reviewed project-session note with progress, open questions, and a suggested next step that informs the next Resume briefing.
- [x] 10. **Weekly project review** - Generate an on-demand, sourced review of project activity, resolved questions, new evidence, and projects to revisit, with an explicit save action.
- [x] 11. **Source freshness** - Mark generated outputs when supporting passages change or disappear, follow renamed notes, and regenerate through reviewed changes while preserving prior output.

## Milestone E - Finish the local release

- [x] 12. **Offline release readiness** - Package the desktop plugin and demonstrate install, model setup, the core workflow, recovery, keyboard/theme usability, and offline inference in a synthetic Obsidian vault with accurate user instructions.

## Milestone F - Improve everyday local project continuity

- [x] 13. **Repeatable answer-quality evaluation** - Reusable synthetic fixtures and an opt-in local evaluation command covering missing evidence, conflicts, decision status, section placement and cited support, with honest baseline reports.
- [x] 14. **Dependable recorded briefings** - Show sourced recorded project context before inference, separate AI interpretation, expose supporting excerpts and keep recorded context usable without Ollama.
- [x] 15. **Project home and quick switching** - Switch among permitted projects directly in Thread and show recent sessions, decisions, questions and pending reviews without silently granting read access.
- [x] 16. **Ranked evidence search** - Improve keyword ranking, phrases/aliases and explicit filters, preserve relevance and source diversity in bounded context, and explain coverage limits.
- [ ] 17. **Optional local semantic search** - Offer explicit opt-in local embeddings and hybrid retrieval while preserving scoped keyword search without an embedding model or paid services.
- [ ] 18. **Editable change review** - Highlight changed lines, permit draft edits followed by renewed exact previews and validation, preserve dependent operation groups and give actionable recovery explanations.
- [ ] 19. **Guided local setup** - Guide local-only connection, compatible downloaded model selection, folder grants and an optional sample; show actionable diagnostics without installing services or downloading models silently.
- [ ] 20. **Incremental dependency indexing** - Reindex changed notes and affected dependencies, avoid unnecessary invalidation, and preserve immediate exclusion removal, cancellation and stale-source guards.
- [ ] 21. **Project review queue** - Connect changed sources, affected decisions, explicit revisit dates/conditions, questions and stale outputs in an on-demand review queue; changes and resolutions remain explicit.

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
