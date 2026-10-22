# Feature: Desktop decisions and managed questions

**From build-plan:** feature 56
**Build attempt:** 1
**Branch:** feature/desktop-decisions-and-managed-questions
**Status:** verified

## Goal

Create and review project decisions and maintain question history in independent Thread Desktop, with current evidence, explicit user choices and exact reviewed writes.

## In scope

- Native project records surface listing current permitted decisions (including superseded status), managed questions and recognized legacy question sections. Open original sources by current hash. Disclose bounded index coverage and unsupported records. No AI required for manual creation or question updates.
- Decision creation reuses decisionMarkdown: question, choice, alternatives, rationale, constraints, revisit condition/date, explicit decision date and proposed default. Accepted requires explicit user selection. Destinations remain selected-project/Decisions/name.md, refuse collisions.
- Question creation reuses questionMarkdown in selected-project/Questions/name.md. Open is the initial state. Optional individual legacy-section copy remains a new editable question with its original source dependency; never rewrites the legacy note. Existing managed questions use updateQuestion with explicit investigating/answered/open transitions, answer/working response, reason and event date. Preserve previous answers and reopening history; reject unsupported metadata or ambiguous IDs.
- Current evidence selection: up to ten notes for a new decision, four for questions and decision review. Main process owns indexed choices, project identity, source hashes/dependencies, bounded evidence and output. No renderer-provided Markdown, metadata, before bytes or arbitrary operations. Revalidate all dependencies before model context and proposal creation.
- Decision review reuses decisionComparison, ANSWER_SCHEMA, validateAnswer and reviewObservations with the existing local bounded/cancelable AI transport. Require a selected decision plus one to four distinct evidence notes and represented passages for both. Interpretations and gaps are separate from explicit retain/annotate/supersede actions. Preserve prior reasoning; supersede requires explicit replacement fields and a two-note reviewed batch, never overwriting a replacement.
- All creations/updates enter feature 55's pending changes journal and exact preview, edited-draft renewal, Apply/Reject, guarded undo/recovery and cooperative ownership. No automatic note or status change. Scope, source, project, model, input and writer-setup changes revoke affected transient output/authority; obsolete replies never restore content.
- Accessible native controls, labels/status/live messages, source chips, recorded/AI distinctions and light/dark styles. Clear loading/empty/invalid/denied/canceled/stale/failure states. Finite validated IPC; sandbox remains intact.

## Out of scope

Action boards/session wrap-up (57), aggregate freshness/reviews (58), capture/collections (59), PDF access (60), portability (61), packaging (62), freeform vault editing, autonomous decisions, personal notes or plugin history migration.

## Build loop

Continuous Mode: serial small steps, feature-level self-review and no step checkpoints. Verify after each step. Required actual Electron acceptance and fresh full independent sensitive-change review before exact archive, squash merge and authorized normal push. Two repairs per same failed check/finding. Preserve all previous archive bytes.

## Build steps

- [x] 1. Add main-owned records snapshot and manual decision/question proposal methods using existing schemas and feature 55. Done when real filesystem tests prove explicit statuses/history, bounded validated input, identity/scope/dependency checks, collisions and no writes before Apply; Verify passes.
- [x] 2. Add bounded cancelable decision evidence assessment and explicit retain/annotate/supersede proposals. Done when tests prove structured observations, stale/canceled/revoked rejection, exact original/replacement preservation and guarded multi-note application; Verify passes.
- [x] 3. Wire finite IPC and accessible native records forms/listing/assessment with exact review navigation. Done when delayed-response/input invalidation tests pass, every action is reachable and Verify passes.
- [x] 4. Demonstrate actual Electron creation, explicit acceptance, question investigation/answer/reopen history, legacy-copy preservation, decision review with real local inference, cancellation/staleness/permissions, exact application/undo, keyboard and both themes. Update docs and preserve fixture/archive evidence. Done when all acceptance, final Verify and self-review pass; freeze for fresh independent review.

## Files / areas

New src/standalone/records.ts and records-view.ts with focused tests; contracts/preload/main/renderer/app/styles integration. Reuse src/vault/{decision,decision-review,questions,index,evidence,workspace}, standalone projects/evidence/local-ai/changes/storage. docs/desktop.md. No shared plugin changes expected; if needed, prove relevant actual Obsidian regression.

## Data / contracts

No new persisted format. Shared readable decision and thread_question_version 1 Markdown remains authoritative. Use identityFromIndex and idUnambiguous with complete permitted identity coverage; duplicates/omissions block identity-dependent updates. Main-owned snapshot and assessment IDs are volatile, bound to revision/generation/settings. Revalidate source hashes and transitive dependencies, exclude stale derived text and enforce read exclusions. Raw targets are preserved separately from supporting evidence; targets retain exact before-byte checks in the change journal.

Bound input strings using shared limits: decision/reason/answer fields 5000 characters, question 1000; names use noteName; dates use calendarDate; strict object keys, enum primitives and array limits at IPC boundary. Evidence uses existing 16000-character context budget, explicit coverage and current local model settings. Superseded/unsupported targets cannot silently become accepted. Updates append history and only conservatively rewrite recognized status/date scalars. The existing 10-operation/1 MiB batch bound and 20 retained applied batches remain unchanged.

## Testing

Baseline 55-completion-verify.log: 409 tests pass, strict typecheck and plugin/desktop production builds, same product tree after bookkeeping squash. Add deterministic controller/filesystem and delayed native-view tests without model downloads in the normal suite. Use ignored fresh vault-56/profile-56 and existing owned Electron/Ollama helpers after inspecting their feature/path assumptions. Authored notes only; preserve prior sources/reports. Actual local qwen3:4b-instruct review acceptance does not imply universal answer quality.

## Notes for the AI

Reuse shared logic; do not build a general forms engine, editor or new persistence layer. Main owns authority; renderer only sends explicit bounded actions. Keep offline manual flows useful and AI interpretations distinct. No grants from project selection or saved preferences. Preserve unresolved recovery, plugin compatibility and ordinary-filesystem concurrency limitations. Routine spec refinements are authorized within this scope.

## Acceptance evidence

- Step 1: 56-step1-focused.log passes four real filesystem/controller cases; 56-step1-verify.log passes 413 tests, strict typecheck and both production builds. Proved no pre-Apply note writes, proposed/accepted creation, collisions, answer/reopening preservation, legacy originals, stale/revoked/canceled sources and duplicate/unsupported question metadata.

- Step 2: 56-step2-focused.log passes seven controller cases, including real filesystem retain/annotate/supersede/undo and fake-model cancellation/source revalidation; 56-step2-verify.log passes 416 tests, strict typecheck and both builds. No model observation changes a decision until explicit reviewed action.

- Step 3: 56-step3-final-focused.log passes twelve host controller/view cases; 56-step3-final-verify.log passes 421 tests, typecheck and both builds. UI input/evidence invalidation rejects delayed replies and restores Refresh. Self-review added an isolation regression so idle records cancellation cannot revoke an unrelated exact change capability.

- Step 4: actual sandboxed Electron 45, isolated profile-56/vault-56, proves manual proposed/explicit accepted decisions with no model, non-overwriting legacy-copy questions, investigating/answered/reopened history, and source links opening the current preserved record. Native evidence: 56-native-{setup,manual,source}.json. Light/dark screenshots: 56-records-{light,dark}.png.
- Real local qwen3:4b-instruct assessment completed (56-native-ai.json). Exact two-note supersession was applied with native Enter; original reasoning remained. A synthetic external edit invalidated Undo and was preserved. After removing only that authored test suffix, a renewed exact Undo restored original bytes and removed the unchanged created replacement (56-native-review-preview.json, 56-native-external-edit.json, 56-native-undo.json).
- Actual cancellation and permission revocation during local assessment cleared transient records/changes and rejected late content; empty grants redacted durable history (56-native-cancel-revoke.json). Main/renderer sandbox isolation remained active. 56-preservation.json verifies original synthetic sources and every previous archive unchanged.
- 56-final-verify.log: 421 tests passed, zero failures/skips, strict typecheck and both production builds. Self-review covered finite IPC, explicit user statuses, main-owned dependencies and before bytes, ownership/recovery reuse, cancellation and stale UI. No shared plugin modules changed; plugin tests/build passed.
- Acceptance helper corrections: case-sensitive applied-status wait and settlement before renewed Undo were corrected without product changes. Source-navigation helper expected six notes instead of five; corrected to the actual fixture count and passed. These were test-driver errors, not waived product checks.

## Limitations

Local model output is interpretation, not verified support. The native sample produced an unsupported inference about memory constraining hosted APIs; citation validation checks references and structure, not semantic truth. User judgment remains necessary. No new atomic filesystem guarantee: concurrent edits are checked conservatively through the existing journal. Evidence/index bounds remain disclosed. Unsupported/ambiguous managed records are preserved and refused for automated updates.

## Try it now

In an ordinary synthetic vault, run `npm run desktop:start`, choose the vault and explicitly grant its project folder. Inspect compatibility, enable desktop writing and save the Projects mapping. Select a project and open **Decisions and questions**. Create a proposed decision, inspect **Preview record action**, then renew and apply its exact pending change. Create an open question, record an answer, then explicitly reopen it with a reason; its original answer remains in history. With a downloaded local model, assess a decision against a separate current source, inspect interpretations and choose Retain/Annotate/Supersede explicitly. Preview/Apply is always required; canceling or revoking read access removes transient output without changing notes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11458,"specSha256":"21dabf1194683a6849017c2f655bab377603eac43fa974073b7cb087a704d3af","branch":"refs/heads/feature/desktop-decisions-and-managed-questions","head":"849dd50cbc27da2998ad40b8c3cf773a2ac51694","baseRef":"refs/heads/main","baseCommit":"9f3f3864c5626029e221d0afac7956fcbcfe46b7","sourceTree":"8d1956bb4263a59a8925eea53088477424ea2b8d","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 849dd50cbc27da2998ad40b8c3cf773a2ac51694
**Base commit:** 9f3f3864c5626029e221d0afac7956fcbcfe46b7
**Base ref:** main
**Spec hash:** 21dabf1194683a6849017c2f655bab377603eac43fa974073b7cb087a704d3af
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-22T00:23:05.622207+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-22T00:26:09Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `9f3f3864c5626029e221d0afac7956fcbcfe46b7..849dd50cbc27da2998ad40b8c3cf773a2ac51694` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, and `sha256sum blueprint/context/current-feature.md`: pass; exact target, base and spec hash match this request.
- `git diff --check 9f3f3864c5626029e221d0afac7956fcbcfe46b7..849dd50cbc27da2998ad40b8c3cf773a2ac51694`: pass.
- `npm run typecheck`: pass.
- `npm test` in the restricted environment: unavailable; launcher test execution failed and the runner stopped producing useful output, then was interrupted. The complete host retry below passed.
- `node --experimental-strip-types --test src/standalone/records.test.ts src/standalone/records-view.test.ts src/standalone/changes.test.ts src/standalone/evidence-index.test.ts src/standalone/projects.test.ts src/standalone/local-ai.test.ts` on the host: pass; 37 tests, zero failures/skips.
- `npm test` on the host: pass; 421 tests, zero failures/skips, 50.5 seconds. Review log: `/tmp/thread-feature56-review-host-tests.log`.

## Evidence

- Fresh isolated reviewer received the project-local handoff without the builder conversation. Reviewed the complete 12-file base-to-target delta, including the tracked spec, docs, HTML/CSS, IPC/contracts/preload, main/renderer integration, both records modules and both new test files.
- Followed adjacent project selection/identity, indexing/freshness/projection, evidence construction, decision/question serializers, local AI transport and change journal/writer/preview contracts. Checked strict input shapes, explicit acceptance/transitions, current hashes/transitive dependencies, cancellation, collision refusal, preservation/undo, finite context/work bounds, safe DOM rendering and sandbox/sender checks against AGENTS.md and coding standards.
- Inspected saved actual Electron evidence under `.thread-local/desktop-50-62/evidence/56-*`: native setup/manual/source, local AI assessment, exact supersession preview, external-edit conflict, guarded undo, cancel/revoke and preservation JSON, plus light/dark screenshots. These are existing acceptance artifacts, not a new reviewer runtime run.
- Existing tests meaningfully cover filesystem Apply boundaries, question history, stale/revoked/canceled/model-changed results, explicit replacement acceptance, collisions, delayed view replies and independence from unrelated change capabilities. No skipped, focused or placeholder tests found in the added suites; the full test run reports zero skips.
- Excluded generated build output, dependencies and unrelated source from code review; inspected only the specified ignored native acceptance artifacts. No product, spec, configuration, runtime or native fixture changes made.

## Findings

- None. No findings added, updated, accepted or closed; no repair order applies.

## Remaining risk

- Restricted-environment `npm test` was unavailable and interrupted; the same full existing command passed on the host. This receipt does not claim the restricted run passed.
- Native interactions and real local inference were inspected through saved acceptance artifacts, without rerunning or mutating the preserved Electron/vault/profile fixtures. Check was not required by the prepared request.
- The documented real-model sample includes an unsupported inference about memory constraining hosted APIs. Outputs remain labeled interpretations with explicit user review; citation validation proves reference structure, not semantic truth or general model quality.
- Existing bounded index/context coverage and conservative non-atomic filesystem concurrency limits remain as documented. No independent production build or performance profile was run in this read-only review.
