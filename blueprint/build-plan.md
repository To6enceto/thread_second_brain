# Build Plan

Thread's first release follows the scope in `project-plan.md`. Each numbered
checkbox is one feature to spec and verify through Blueprint. Scaffold creation
and Blueprint installation are already performed setup, not completed features.
Keep these IDs stable. Features 1-12 preserve the completed 0.1.0 release;
features 13-21 preserve the completed 0.2.0 improvements; features 22-34 preserve
the completed 0.3.0 research and portability work. The approved usability and
research queue starts at 35. Larger proposals are split at independently
verifiable boundaries; no earlier feature is renumbered.

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
- [x] 17. **Optional local semantic search** - Offer explicit opt-in local embeddings and hybrid retrieval while preserving scoped keyword search without an embedding model or paid services.
- [x] 18. **Editable change review** - Highlight changed lines, permit draft edits followed by renewed exact previews and validation, preserve dependent operation groups and give actionable recovery explanations.
- [x] 19. **Guided local setup** - Guide local-only connection, compatible downloaded model selection, folder grants and an optional sample; show actionable diagnostics without installing services or downloading models silently.
- [x] 20. **Incremental dependency indexing** - Reindex changed notes and affected dependencies, avoid unnecessary invalidation, and preserve immediate exclusion removal, cancellation and stale-source guards.
- [x] 21. **Project review queue** - Connect changed sources, affected decisions, explicit revisit dates/conditions, questions and stale outputs in an on-demand review queue; changes and resolutions remain explicit.

## Milestone G - Work directly with evidence and follow-up

- [x] 22. **Editor selection actions** - Add native commands for asking about permitted selected text, finding related evidence and preparing question/decision drafts, retaining current source identity without changing notes or read grants implicitly.
- [x] 23. **Evidence workbench** - Inspect retrieved passages, include/exclude/pin current evidence before Ask, and compare generated claims with their supporting passages while showing context limits and preserving scope/freshness checks.
- [x] 24. **Managed project questions** - Create durable Markdown questions with explicit open/investigating/answered states, cited answers and preserved reopening history; optionally convert legacy questions through previews without automatic resolution.
- [x] 25. **Review acknowledgements and snoozing** - Record explicit reviewed/no-change or revisit-date actions against source snapshots, link follow-up questions and decision drafts, and resurface new changes without treating acknowledgement as freshness or decision acceptance.

## Milestone H - Understand projects and existing vaults

- [x] 26. **Project timeline** - Show recorded sessions, reviews, milestones and decision/supersession history chronologically with current source navigation, clear event-date versus modification-date labels and honest historical gaps.
- [x] 27. **Multi-project overview** - Summarize already permitted projects, recorded activity, questions, due reviews and proposals, with explicit next-action selection and active/paused/archived filtering; no read grants or inferred priority scores.
- [x] 28. **Vault health and compatibility** - Diagnose duplicate IDs, invalid dates, unresolved references, project associations and unrecognized record headings in permitted notes, explaining consequences and offering individual reviewed repairs only where writes are allowed.

## Milestone I - Expand local evidence coverage

- [x] 29. **Section-aware long-note indexing** - Index more than the existing note prefix through bounded section processing, with configurable budgets, progress, cancellation, meaningful coverage and measured synthetic performance while preserving incremental invalidation.
- [x] 30. **Broader hybrid retrieval** - Extend candidate coverage across eligible sections using explicit bounded search budgets, balanced selection and search-more controls; retain keyword-only operation, local embedding identity checks and immediate exclusions.
- [x] 31. **Local PDF extraction** - Explicitly import/select local PDFs, preserve originals, preview bounded page text and save non-overwriting source notes with extraction provenance; package required local assets, with no remote fetch, OCR or silent binary read grants.
- [x] 32. **PDF evidence and page citations** - Integrate approved extracted PDF text into retrieval, answers and reviews with verified page references, current original-file hashes and exclusions; changed/missing/excluded PDFs invalidate dependent cached evidence and outputs.

## Milestone J - Preserve and move project context

- [x] 33. **Project exports and checkpoints** - Preview and explicitly create portable local project packages of selected permitted notes and eligible supporting files, with a versioned hash manifest, clear omissions and no plugin secrets/caches/journal originals or implicit whole-vault backup claim.
- [x] 34. **Reviewed project package import** - Validate package types, paths, sizes and hashes, preview destinations/links/identities and collisions, then import new copies without overwriting notes or granting reads; prove recovery, portability and the final packaged offline workflow.

## Milestone K - Open Thread and find the next step

- [x] 35. **Fedora desktop launcher** - Generate an explicit user-level Launch Thread shortcut for a configured vault and installed Obsidian, with a plugin launch route, actionable failures and optional consented local Ollama startup. Verify actual isolated Fedora/Flatpak launching, existing-server detection and cloud-disabled loopback checks; never stop unrelated processes or install into the user's account automatically. Depends on 19 and 34.
- [x] 36. **Clear setup progress and feedback** - Separate sample and existing-note setup paths, show connection progress/results beside their controls, explain the read-access preview and offer useful next actions. Demonstrate first use, missing/offline models, cancellation and exact grants in native Obsidian without automatic downloads or permission expansion. Depends on 19 and 35.
- [x] 37. **Full-width Thread workspace** - Add a native main-tab interface for Home, Ask, Research, Actions and Reviews while retaining the compact sidebar and all existing actions. Demonstrate project switching, restoration, keyboard/theme access and preservation of existing open notes/layouts; use existing action surfaces until their later enhancements land. Depends on 36.

## Milestone L - Understand and continue sourced answers

- [x] 38. **Claim classification and quality regressions** - Distinguish recorded statements, AI interpretations and proposed actions using existing structured source metadata, prompts and validation. Extend reusable fixtures for recorded postponements, decision status, unsupported interpretations and proposed actions; demonstrate real local inference without claiming citation checks prove truth. Depends on 13, 14 and 23.
- [ ] 39. **Reviewed claim corrections** - Let users explicitly correct an answer's classification or text before saving, retaining model output, correction provenance and evidence in a renewed exact preview. Demonstrate source changes/exclusions revoke corrections and save previews; corrections do not edit source notes or imply independent factual verification. Depends on 38.
- [ ] 40. **Evidence-aware Ask follow-ups** - Add bounded in-memory follow-up turns with current evidence selection and revalidation for every turn. Treat earlier AI as conversation context only; demonstrate cancellation, scope/project changes, stale evidence and finite context with real local inference. Depends on 23 and 39.
- [ ] 41. **Explicit conversation saves** - Preview and explicitly persist selected conversation turns as readable Markdown with per-turn provenance, evidence and corrections. Refuse collisions and stale/excluded dependencies; reopening or reusing saved text must not turn prior AI into authoritative evidence. Demonstrate new-note save and invalidation in actual Obsidian. Depends on 40.
- [ ] 42. **Saved research collections** - Preview named Markdown collections of bounded evidence references and include/pin/exclude intent. Revalidate sources on reopen/use, show changed or unavailable references without leaking excluded content, and preserve request budgets. Demonstrate rename/change/missing/exclusion cases and collection reuse in Ask. Depends on 23 and 41.

## Milestone M - Turn reviewed research into explicit project progress

- [ ] 43. **Durable project action records** - Add readable Markdown action records with stable IDs, source/question/decision links and explicit Planned, In progress, Blocked and Done transitions. Preserve dated transition history through exact previews, conflict checks and recovery; AI suggestions never change status. Depends on 24 and 27.
- [ ] 44. **Action board and recorded wrap-up** - Show permitted action records in a lightweight board inside Thread and allow Wrap up to use explicitly selected recorded progress. Demonstrate keyboard access, reviewed suggestions, manual transitions and exclusions; distinguish user reports from independently verified events. Depends on 37 and 43.
- [ ] 45. **Project checkpoint comparisons** - Explicitly select a retained project package and compare permitted current content with real before/after snapshots, additions, removals and limits. Demonstrate changed/missing/excluded/PDF-dependent cases without inventing history or bypassing present grants; comparisons remain read-only. Depends on 33 and 34.
- [ ] 46. **Reviewed Web Clipper intake** - Supply compatible Obsidian Web Clipper templates and review deliberately saved local clipped notes, retaining title/author/URL and separate publication/capture dates. Preview project association and possible duplicates without overwriting originals or automatically fetching sites. Demonstrate synthetic clipped-note intake, metadata gaps and exact reviewed writes. Depends on 6 and 28.

## Milestone N - Update the local installation safely

- [ ] 47. **Validated local update previews** - Validate an explicitly selected local Thread package, exact inventory/hashes, supported versions and host/data compatibility, then preview code/assets to replace without touching notes, settings or journals. Demonstrate malformed/corrupt/unexpected-file/version rejection on disposable installations. Depends on 34.
- [ ] 48. **Recoverable local updates** - Apply an exact approved update to a disposable installation with durable interruption recovery and compatible previous-code rollback, preserving settings, caches where appropriate and all journals. Detect changed targets and unsupported data compatibility; never imply code rollback undoes migrations. Demonstrate interrupted updates, refusal paths, final native offline workflow and verified local package. Depends on 35-47.

## Build discipline

The first feature includes only the connection and read boundaries necessary for
its briefing. It reads current notes directly; the reusable index arrives in
feature 3. Text-only imports keep the local release achievable without paid
services. Optional local semantic search is approved in feature 17. Selectable-text
PDF import is now approved in features 31-32; scanned-document OCR, audio and
arbitrary web fetching remain deferred.

Questions precede review acknowledgements because follow-up records need stable
identities. Section-aware indexing precedes broader hybrid search and PDF
retrieval. Export precedes import; a checkpoint is a user-selected project
snapshot, not a replacement for an independent vault backup. Keep completed
features 1-34, their IDs, archives and durable history unchanged. New features
remain unchecked until individually implemented, demonstrated and reviewed.

Introduce focused logic tests explicitly with the first logic-bearing feature,
then include the configured test command in Verify. Demonstrate UI behavior in
Obsidian; a passing bundle alone does not complete a feature. Do not mark any
item complete until its spec, verification evidence, and Blueprint completion
workflow support that state.

Run 35-48 serially in this order. Preserve the reviewed panel redesign and all
previous run evidence. Use a fresh run boundary and audit reused helpers for old
feature numbers and paths. Native testing uses synthetic vaults and disposable
profiles/installations only. Actual user desktop integration and everyday-install
updates require separate approval of the concrete result. Normal pushes of
verified completed main commits have separate current-session authorization;
public releases, deployment, paid services and destructive user-data operations
do not. See the project plan for the new durable-data and launcher/update contracts.
