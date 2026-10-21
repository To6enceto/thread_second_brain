# Feature: Desktop Ask evidence workbench

**From build-plan:** feature 53
**Build attempt:** 1
**Branch:** feature/desktop-ask-evidence-workbench
**Status:** verified

## Goal

Retrieve permitted evidence, inspect and choose exact model context, and generate cited answers inside independent Thread Desktop, with optional local hybrid retrieval and dependable keyword fallback.

## In scope

- Main-owned bounded retrieval using the existing index, project eligibility, filters, standard/broader/maximum budgets, evidence builder and include/pin/exclude selection. Native UI for question, project/all-permitted scope, type/status/path/date filters, method and budget.
- Explicit optional downloaded embedding-model selection; reuse cloud-disabled loopback validation and SemanticSearch. Keyword works without any model. Hybrid failures report keyword fallback, while cancellation/staleness never becomes fallback success.
- Opaque main-owned retrieval/context identities. Renderer supplies only validated query/options/choices, never arbitrary prompts or evidence. Exact selected source JSON preview is the evidence sent in answerPrompt. Main revalidates source and output-dependency hashes before embedding/chat after asynchronous model checks and after response.
- Shared answer schema, classification/citation validation and clear AI provenance/gaps. Source chips open current evidence inside Thread with return navigation. No saves or follow-ups yet.
- Session-only setup/cache; source/scope/vault/project/query/filter/method/model changes revoke obsolete results. Cancel suppresses late replies, preserving current candidate context when safe. No read grant changes, hidden-file access or plugin-state mutation.
- Actual Electron, real local text/embedding inference, controlled failure/cancel/race acceptance, keyboard and light/dark evidence.

## Out of scope

Conversation/corrections/saves/persistence (54), writes/recovery (55+), PDF access, plugin UI changes, external networking, runtime/model downloads in product, packaging (62).

## Build loop

Continuous authorization covers routine spec refinement and local Git lifecycle, with separate normal-main push authorization. Review per feature; step checkpoint commits disabled. Verify each step; actual native acceptance and fresh full independent review before archive/merge/push. Two repair attempts per failing check/finding. Preserve all prior archives and run records.

## Build steps

- [x] 1. Add main-owned Ask service, validated finite IPC and exact context snapshots with shared keyword/hybrid/answer logic. Done when meaningful tests prove scope/filters/bounds, choice validation/excluded text, identity binding, freshness before/after transmission, embedding fallback and cancellation; Verify passes.
- [x] 2. Add accessible native Ask workbench, optional embedding discovery/selection, source return navigation and input/model invalidation. Done when Verify passes and actual Electron demonstrates retrieval/choices/exact context/citations plus no-model operation, loading/empty/error/cancel states, with existing Resume/navigation intact.
- [x] 3. Demonstrate real text and embedding inference, keyword fallback, edits/revocation/model changes and native keyboard/light/dark behavior; update desktop instructions and preserve evidence. Done when final Verify and preservation checks pass, Try it now is documented, and the verified checkpoint is ready for fresh independent review.

- [x] 4. Repair independent F-01: require primitive strings for all IPC enum options and evidence choices. Done when array/object payload regressions fail closed, Verify and relevant actual Electron acceptance pass, and the verified checkpoint is ready for fresh full independent review of the repair.

## Files / areas

src/standalone/{ask.ts,ask.test.ts,ask-view.ts,contracts.ts,local-ai.ts,main.ts,preload.ts,renderer.ts,model-setup.ts,app.html,styles.css}; docs/desktop.md. Reuse src/{retrieval/{search,semantic,budget},vault/{index,evidence,workbench,freshness},intelligence/{ollama,answer,claims}} without changing shared behavior unless necessary and regression-tested in actual Obsidian.

## Data / contracts

Question 1-1000 characters; shared filter normalization and finite search budgets (20/35/50 results, 128/384/768 semantic windows, 350 characters each), conservative desktop index bounds and 16000-character evidence limit. Disclose omissions and incomplete enumeration. Project scope requires a currently permitted project; all-permitted scope never expands grants. Treat dates as recorded metadata with documented file-time fallback, not verified events.

Main stores one prepared Ask bundle and one exact chosen context, with opaque UUIDs and revision/generation binding. Choice keys must refer to current source IDs and values must be include/exclude/pin. Renew context on every choice edit; generate only its current identity. Revalidate full source and dependency bytes before every request containing evidence and after generation; no arbitrary renderer context, paths or network destinations. Use existing local transport operation timeout (180 seconds) and response bound (2 MiB). Embedding failure returns disclosed keyword results only while sources/operation remain current; current checks take precedence. Clear session caches on invalidation. Selected model names are explicitly chosen, bounded, cloud names rejected and capabilities checked by Ollama. Rendering uses native text nodes, source navigation uses the existing hash-checked reader. No writes or persistent data compatibility changes in this feature.

## Testing

Clean baseline Verify passed 363 tests, strict typecheck and plugin/desktop builds (53-baseline-verify.log). Add real synthetic-filesystem service tests with controlled loopback responses and meaningful race assertions. Use owned isolated Electron with synthetic vault-53 and real free qwen3:4b-instruct/qwen3-embedding:0.6b; inspect helpers before reuse. Preserve source/archive hashes and prior evidence. Shared plugin source is expected unchanged; if changed, run relevant actual Obsidian acceptance.

## Notes for the AI

Keep explicit setup, current recorded Resume and source inspection usable. A model label/citation does not prove semantic support. Surface empty/unsupported/error/denied states honestly. No everyday installation changes, unrelated process stops or personal-note tests. User authorized continuing serially and normal verified pushes; no routine approval pause.

## Acceptance evidence

- Repair F-01: 53-repair1-verify.log passes all 370 tests and both builds; 53-f01-focused.log passes seven service tests. 53-native-f01.json proves six malformed enum arrays rejected through actual Electron IPC and valid string exclusions preserved. 53-repair1-native-core.json and 53-repair1-native-inference.json repeat normal keyword, choice, source navigation and real local text/embedding acceptance on the repaired build. Fresh independent review must confirm closure before completion.

- Final Verify (53-final-verify.log), step 1 and step 2 Verify passed strict typecheck, 369 tests and both builds. Focused Ask tests cover scope/filter validation, exact main-owned context, excluded text, unknown IDs/choices, model changes, cancellation, malformed output and freshness before/after context transmission. A random hash collision in an early exclusion assertion was corrected to inspect actual source paths/excerpts; earlier logs are retained.
- Actual isolated Electron: 53-native-core-final.json proves no-model keyword retrieval, filter/input/empty states, include/pin/exclude with renewed exact JSON, source navigation/return, recorded Resume and explicit missing-embedding fallback. 53-native-scope-budget.json proves project versus all-permitted scope and explicit broader budget.
- 53-native-inference-final.json proves real qwen3-embedding:0.6b retrieval and qwen3:4b-instruct answer generation with one selected budget passage, eight exclusions, source inspection during generation and valid citation return without regeneration. Classification remains conservative; the model budget statement was visibly labeled AI interpretation.
- 53-native-cancel.json proves cancel/question/choice/project/model invalidation and late-answer suppression. 53-native-edit.json and 53-native-revocation.json prove source edits and revoked grants clear obsolete evidence/output. The authored provider counted aborted transport requests.
- 53-native-malformed.json, 53-native-embedding-failure.json and 53-native-offline.json prove safe errors, explicit keyword fallback and preserved current evidence with an actually stopped provider. 53-native-embedding-cancel.json proves cancellation never publishes stale fallback. Controlled failure fixtures are separate from genuine local inference.
- 53-ask-light.png / 53-ask-dark.png were visually inspected. 53-keyboard.json records native Enter opening Overview.md at Budget with a solid focus outline. No remote assets or browser mock were used.
- 53-preservation.json confirms 53 prior archives, three completed run archives and all 12 synthetic-vault files unchanged. Shared plugin source and production bundle remain unchanged. Existing model files are mounted read-only in the owned isolated runtime.
- Limits: Linux preview, volatile setup/context/cache, conservative index bounds, finite search/context budgets, 180-second operations and 2 MiB provider responses. Polling has a 2.5-second observation delay; explicit operations revalidate sources. Citations/classification do not prove semantic support. No notes/history are written.

## Try it now

1. Run `npm run desktop:start`, select a synthetic vault and explicitly grant read roots/exclusions. Refresh projects and select one.
2. Choose Ask your vault, enter a question, choose project/all-permitted scope and filters, then Retrieve evidence. Keyword needs no model.
3. Include, Pin first or Exclude passages. Inspect Exact source context sent to the model; each choice renews it. Open a source and Back to Ask.
4. In Optional local AI, discover downloaded models, explicitly choose text and optional embedding models, then Apply AI settings. Retrieve again; choose Hybrid for embeddings.
5. Generate from chosen evidence. Inspect model/time, claim classifications, supporting excerpts and gaps. Citations open inside Thread. Cancel or edit the query to suppress old replies.
6. Stop only your own test provider or edit a synthetic source: keyword stays usable without inference; changed evidence requires retrieval again. No notes are changed by Ask.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10592,"specSha256":"e21bc6d6849890d8ce10ee28e5ce22df4affd3468f0bf00e2f679da32f6fcfb1","branch":"refs/heads/feature/desktop-ask-evidence-workbench","head":"1292404cf7fae81a3f550f1dc9489d9ff58eaec4","baseRef":"refs/heads/main","baseCommit":"20f9263adebea9e1dd6ecf5b7a4cb451d63cab5c","sourceTree":"3c30c3b28e7d00a0e49b48b5236479cf462da590","landing":"local-merge","absentOptional":[]} -->

## Findings

# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### 53/F-01 [P2] closed - Reject non-string Ask enum values at the IPC boundary

**File:** src/standalone/ask.ts:25; src/standalone/ask.ts:103
**Found:** 2026-10-21 by /audit independent (scope: current; lenses: quality, security, tests)
**Why it matters:** The enum checks use `String(value)` for scope, method and evidence choices, but retain the original value. Structured-cloned arrays therefore pass validation and fail the later strict string comparisons. In the actual isolated Electron runtime, a request with `scope: ["project"]`, `method: ["keyword"]` and an empty project was accepted and returned six permitted note paths, bypassing the selected-project requirement. A subsequent choice `{ S1: ["exclude"] }` was accepted but S1 remained in the chosen context. The normal controls send strings, and explicit read grants remain enforced; this is a nonblocking finite-payload contract defect rather than a demonstrated permission escape.
**Suggested fix:** Require primitive strings before checking scope/method/choice membership, retaining the existing enum sets. Add regressions rejecting array-valued scopes, methods and choices, including the empty-project and exclusion cases.
**Resolution:** Closed by fresh independent codex/gpt-6.1-sol review on 2026-10-21 at target 1292404cf7fae81a3f550f1dc9489d9ff58eaec4. Re-examined the complete feature delta and repaired ask.ts checks: scope, method, level and evidence choices now require primitive strings before membership validation. The new regression exercises arrays, objects, null, numbers and booleans for all enum fields, plus a valid exclusion. Independent typecheck and all 370 tests passed. Actual owned Electron IPC rejected six malformed enum arrays, did not bypass the empty-project requirement, and preserved valid string exclusion. Real text/embedding inference passed again after that probe. The original defect is gone and no new defect was found in the repair. No findings accepted.

## Independent review coverage

- Fresh Phase B review of the complete main merge-base 20f9263adebea9e1dd6ecf5b7a4cb451d63cab5c through target 1292404cf7fae81a3f550f1dc9489d9ff58eaec4; current scope, all quality, security, performance and tests lenses. Closed 53/F-01 explicitly; no new findings or unverified defect leads. Repair order: none.
- Reviewed every changed product source: src/standalone/{ask.ts,ask-view.ts,ask.test.ts,contracts.ts,local-ai.ts,main.ts,model-setup.ts,preload.ts,renderer.ts,app.html,styles.css}, docs/desktop.md, and the active spec. Followed relevant project/index/reader/security, shared search/semantic/budget, evidence/workbench/freshness and answer/classification contracts.
- Checked AGENTS.md, coding standards, overview, configuration, interaction conventions, build order and independent-review contract. Confirmed finite IPC, main-owned contexts/prompts, explicit read scope, cloud-disabled loopback capability checks, pre-transmission and post-response source/dependency revalidation, cancellation/stale suppression, safe native DOM and bounded retrieval/context/transport.
- Independent signals: checkpoint/base/spec-hash/status and diff checks passed; npm run typecheck passed; npm test passed 370/370, zero failures/cancellations/skips/todos. No focused, skipped or placeholder tests found in the Ask additions.
- In-memory esbuild compilation (write:false) passed for main.cjs, preload.cjs, renderer.js, plugin main.js and pdf-extract-worker.js, exactly matching frozen assets. Copied desktop HTML/CSS matched source. Desktop dependency/import separation checks passed. No build artifacts were written.
- Independently executed native-53-f01.js through owned actual Electron CDP9340 with no output-artifact path, then native-53-inference.js against cloud-disabled loopback11439 and real qwen3-embedding:0.6b/qwen3:4b-instruct. Explicit model selection, hybrid retrieval, one exact chosen passage, exclusions, source inspection during generation, real answer, citations and return without regeneration passed.
- Inspected retained 53 native cancel/edit/revocation/embedding-failure/embedding-cancel/malformed/offline/scope-budget/keyboard/preservation evidence and visually inspected 53-ask-light.png and 53-ask-dark.png. Failure fixtures were not restarted. Shared plugin sources remained unchanged; no new Obsidian acceptance was needed.
- Excluded dependencies, generated assets, prior archives and ignored runtime/evidence from source scope; compared generated bundles in memory and used relevant evidence as signals. No configured security scanner or separate performance profiler; no network-backed audit or large-vault benchmark was run.
- Independent receipt passed; Check was not required and no separate Check acceptance was recorded. Limits remain Linux-only preview, finite index/search/context budgets, 180-second operation/2 MiB response bounds, 2.5-second polling observation delay, volatile state, and citations/classification do not prove semantic support. Retained evidence/53-repair1-verify.log also confirms typecheck, 370 passing tests and both builds. No unavailable verification commands.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 1292404cf7fae81a3f550f1dc9489d9ff58eaec4
**Base commit:** 20f9263adebea9e1dd6ecf5b7a4cb451d63cab5c
**Base ref:** main
**Spec hash:** e21bc6d6849890d8ce10ee28e5ce22df4affd3468f0bf00e2f679da32f6fcfb1
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T22:18:42.108937+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T22:20:48Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, complete range diff and SHA-256 of current-feature.md: passed; target/base/spec match and only permitted review evidence differs.
- `git diff --check 20f9263adebea9e1dd6ecf5b7a4cb451d63cab5c..HEAD`: passed.
- `npm run typecheck`: passed.
- `npm test` with host access for synthetic filesystem/loopback fixtures: passed 370 tests; zero failed, canceled, skipped or todo.
- In-memory esbuild `write:false` builds using the existing production/desktop options, frozen-byte comparison and copied HTML/CSS comparison: passed; no generated assets written.
- `env -u THREAD_CDP_OUTPUT_PATH THREAD_CDP_TIMEOUT_MS=240000 node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-53-f01.js`: passed.
- `env -u THREAD_CDP_OUTPUT_PATH THREAD_CDP_TIMEOUT_MS=240000 node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-53-inference.js`: passed after the F-01 probe.
- Targeted Ask test search for focused/skipped/placeholder cases: none found.
- Inspected `.thread-local/desktop-50-62/evidence/53-repair1-verify.log`: retained Verify passed typecheck, 370 tests and both builds.

## Evidence

- Complete current-feature delta reviewed fresh across every changed src/standalone file, docs/desktop.md and spec, with relevant shared retrieval, evidence, freshness, project, reader, transport and answer contracts. Standards and build order checked; dependencies/generated/archive paths excluded from source scope.
- F-01 primitive string guards and regression verified independently. Actual Electron returned malformedEnumsRejected:6, emptyProjectNotBypassed:true and validStringExclusion:true. The repair introduced no new finding.
- Real cloud-disabled owned local inference returned explicitSelection:true, hybrid:true, exactChosenPassages:1, excludedNotInContext:true, sourceInspectionDuringInference:true, realAnswer:true, citations:true and returnWithoutRegeneration:true with qwen3-embedding:0.6b and qwen3:4b-instruct.
- Retained .thread-local/desktop-50-62/evidence/53-native-{cancel,edit,revocation,embedding-failure,embedding-cancel,malformed,offline,scope-budget}.json, 53-keyboard.json and 53-preservation.json inspected. Light/dark screenshots visually inspected. Failure fixtures remained stopped. Shared plugin sources unchanged.
- In-memory desktop main/preload/renderer and production plugin/PDF bundles match the frozen files; no host imports in desktop, no renderer external imports, copied HTML/CSS match.

## Findings

- F-01 [P2] closed. No new findings, open/fixed blocking findings or accepted findings.

## Remaining risk

- Linux preview and small synthetic fixture acceptance; no large-vault benchmark, separate performance profiler or configured security scanner. No network-backed vulnerability scan was run.
- Session-only state; finite index/search/context budgets; 180-second operations and 2 MiB provider responses; external-change polling can take 2.5 seconds, while explicit evidence operations revalidate current bytes.
- Citation/classification validity does not prove semantic support or model answer quality.
- No unavailable verification commands. Normal build commands were deliberately replaced by equivalent write:false comparisons to preserve frozen assets; the retained repair Verify log also passed both normal builds.
