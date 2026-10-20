# Feature: Broader hybrid retrieval

**From build-plan:** feature 30
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/broader-hybrid-retrieval`

## Goal

Offer wider explicit local retrieval budgets and Search more across current eligible indexed sections while retaining bounded chosen model context and keyword-only operation.

## In scope

Request-local standard/broader/maximum candidate/result levels, section- and note-balanced local embedding candidates, cancelable candidate inspection, visible coverage and native Search more in Find/Ask. Reuse digest-bound finite vector cache and source preflight.

## Out of scope

Automatic scope widening, unattended embeddings, vector database, mandatory embedding models, PDF reads, larger model context or automatic generation/save.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Bounded balanced candidate selection** - Define validated request-local levels; balance candidate windows across notes and distinct headings, yield during bounded index scanning, preserve quoted phrases and bound vector cache. *Done when:* Logic tests prove later-note/heading coverage increases, prefix determinism, all caps, cancellation, digest invalidation and usable keyword fallback; Verify passes.
- [x] **Step 2 - Integrate search budgets and native Search more** - Carry an optional request-local level through current source preflight and keyword/hybrid retrieval. Find/Ask expose budget choice and explicit Search more with honest coverage, revoking prior context/answer/previews on every new request. *Done when:* Handler tests cover budget advancement, reset on edited inputs, no inference on keyword retrieval, cancellation/detached actions and old preview refusal; Verify passes.
- [x] **Step 3 - Native inference and retrieval evaluation** - Demonstrate broader actual local embedding search across authored sections/notes, keyword fallback, Ask chosen context, source/exclusion/cancel/digest guards, themes/keyboard and reusable evaluation. *Done when:* Actual synthetic Obsidian evidence includes real local embedding inference and bounded chosen context, meaningful negative controls, no excluded transmission and source preservation; Verify and evaluation pass.
- [x] **Step 4 - Documentation and independent review** - Document candidate/result/heading coverage limits and explicit cost/performance; obtain immutable full-delta independent review. *Done when:* All acceptance evidence is recorded, required reviews pass, and only then feature is completed and pushed.

## Files / areas

src/retrieval/budget.ts/semantic.ts/search.ts and tests; src/main.ts searchEvidence; src/ui/ask-modal.ts/recall-modal.ts/search-filters.ts and handler tests; scripts/evaluation/README as needed.

## Data / contracts

Three request-local levels: standard128 candidate windows/20 returned hits, broader384/35, maximum768/50. Each embedding window stays <=350 characters and batches <=8. Keyword matching still scans the current finite text index; result budgets only change returned results (three passages/note). Semantic candidate inspection scans only current bounded index entries, yields/checks cancellation/current state, and balances notes then distinct headings before extra windows; repeated equal heading names share heading coverage and must not be represented as exact section identities. Candidate order is deterministic and wider levels extend its prefix. Coverage distinguishes all available unique windows/notes/headings, considered windows/headings/notes, omitted index files and unknown text; no complete-support guarantee. Vectors remain finite (1024 entries max), keyed to model digest/path/full raw hash/heading/excerpt; embedding request identity/dimension checks remain. Main preflight verifies exactly selected candidate notes before sending text. No background job/download/remote use. Keyword fallback preserves the requested result budget and safety guards. Finite work/memory additionally derives from selected finite index profile; yield every bounded chunk batch. Native Search more explicitly advances to next level and retrieves again, clearing old context/choices/answer/preview validity before awaits; maximum has no further advancement. Editing query/filter/scope/method resets standard; budget selectors never change read grants or saved settings. Ask still requires explicit Generate and exact chosen context <=16000 characters. Selection actions keep standard defaults; raw notes/history stay intact.

## Testing

Verify each step; candidate diversity/prefix/caps/phrase/cancel/cache/fallback logic; real native handlers and preview revocation; authored wider-than128 windows with semantic-only evidence and keyword negative control; actual Obsidian/qwen3-embedding:0.6b real inference, explicit Ask workbench/local answer where relevant, exclusions/cancellation and current-source preflight, bounded model context, source/navigation preservation, themes and native keyboard. Record measured candidate counts and timings without arbitrary coverage or semantic-support promises.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.


## Acceptance evidence

- Verify: `.thread-local/continuous-22-34/feature-30-final-verify.log` typecheck, 49 test files and production build pass. Step1/step2 logs in the same directory preserve their separate checks. New logic covers balanced heading/note candidates, deterministic widening prefixes/caps, cancellation/current state, missing/malformed/digest vectors and all keyword fallback result budgets.
- Ask/Find actual native handler tests cover explicit budget advancement, maximum stop, reset on edited inputs, no automatic generation, old preview invalidation, cancellation and detached/closed actions. One test-host repair added native Modal.close -> onClose after new close-state regression exposed the missing stub method; ledger feature-30-repairs.json, attempt1; no weakened product checks.
- Reusable `npm run evaluate:retrieval`: three levels pass with lexical/default-budget negative controls and bounded chosen context. `-- --live` passes with real local qwen3-embedding:0.6b. Logs feature-30-evaluate-retrieval.log / feature-30-evaluate-retrieval-live.log. Existing quality 10/10 and index 3/3 evaluations pass (feature-30-evaluate-quality.log / feature-30-evaluate-index.log).
- Actual Obsidian1.14.4/Ollama0.40.4: `evidence/feature-30-native.json` records eight passing synthetic cases. Default128/140 windows misses the last Allocation heading, keyword finds zero matches; explicit Broader140/140 finds the budget through real semantic inference (17 initial embedding requests, three additional wider requests, 3183 ms initial fixture observation). Native source opens the Allocation heading. Ask retrieves without generation, then explicitly generates a supported 20-euro answer via qwen3:4b-instruct with 483-character exact chosen context; Search more revokes the old save preview and query edit resets Standard.
- Native missing model retains Maximum keyword results with fallback; cancel held Maximum embedding aborts with no retained results/vectors; wider in-flight exclusion aborts and scrubs with no excluded canary transmission; source edit during candidate full-hash preflight sends no embeddings; changed model digest refuses source-vector reuse. Authored notes and durable history preserved, original settings restored. Total 26 embedding requests includes real/injected cancellation/digest probes and one explicit real text generation.
- Actual Find/Ask dark/light top/bottom screenshots: evidence/feature-30-{find,ask}-{dark,light}-{top,bottom}.png, all eight inspected. Native Tab from Search budget reaches Search more; Enter advances to Broader and retrieves without answering or changing grants in both views; evidence/feature-30-visual-keyboard.json. Installed hashes in feature-30-installed.json match the final build.
- No PDF access, remote inference, model download, background embedding job or new read grants. Wider candidate work is finite through selected index bounds, windows<=350, batches<=8, cache<=1024; model context stays16000. Matching IDs/similarity do not certify support.

## Try it now

1. Open Find evidence in a selected permitted project and search normally. Inspect the current finite Search budget and coverage.
2. Choose Search more to advance to Broader, then Maximum. It retrieves again; Maximum disables further advancement. Query/filter/scope/method edits reset Standard. Keyword remains usable with Ollama stopped.
3. With optional semantic search enabled and an already downloaded local embedding model selected, choose Hybrid and repeat. Inspect considered windows/notes/headings and current source links; omitted index text stays omitted.
4. In Ask, inspect the renewed exact context before Generate. Search more clears an existing answer and makes its previous save preview unusable; it never generates or writes automatically.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9355,"specSha256":"191a9173dac3041cc16427cd13f57a04374a6d84b61a5278996d7b3cb87ef586","branch":"refs/heads/feature/broader-hybrid-retrieval","head":"39837f07e91008dbc99643a48bf9963bedf750ca","baseRef":"refs/heads/main","baseCommit":"47ce1820a8f1cece3d8fbc5a17bc53923b9ae19f","sourceTree":"61d3995c5382a6020c6aa452c0702f145d762b29","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 39837f07e91008dbc99643a48bf9963bedf750ca
**Base commit:** 47ce1820a8f1cece3d8fbc5a17bc53923b9ae19f
**Base ref:** main
**Spec hash:** 191a9173dac3041cc16427cd13f57a04374a6d84b61a5278996d7b3cb87ef586
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T10:36:18.334360+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T10:38:42.640548+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Fresh isolated full-delta review under project-local Audit and independent-review contract, all quality/security/performance/tests lenses. Run Verify; inspect the recorded synthetic Obsidian acceptance evidence named in the spec. Write only findings and review receipt; no product/spec/test/config edits, commits, external actions. Exact runtime model gpt-6.1-sol, adapter codex, actual automatic, context fresh subagent.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, and `git status --porcelain=v1`: pass; exact target/base/spec and permitted evidence-only differences confirmed before and after review.
- `git diff main...HEAD` and `git diff --check main...HEAD`: pass; complete 14-file delta reviewed with no whitespace errors.
- `npm run verify`: pass; typecheck, all 49 test files (zero failures/skips/todos), production build.
- `npm run evaluate:retrieval`: pass; three levels, lexical and default-budget negative controls, bounded context.
- `npm run evaluate`: pass; 10/10 authored quality cases.
- `npm run evaluate:index`: pass; 3/3 finite index profiles and prefix negative control.
- `sha256sum main.js manifest.json styles.css`: pass; all three rebuilt artifact hashes exactly match the recorded native installed hashes.
- Targeted test search for skipped, focused, todo and placeholder cases: none found in the reviewed retrieval and Find/Ask tests.

## Evidence

- Complete range `47ce1820a8f1cece3d8fbc5a17bc53923b9ae19f..39837f07e91008dbc99643a48bf9963bedf750ca` against local `main`; reviewed README, active spec, package script, retrieval evaluation, all changed retrieval modules/tests, main search wiring, Find/Ask modules/tests and shared search controls. Followed index/scope, evidence/workbench, local model and modal lifecycle contracts where relevant.
- Checked installed AGENTS, coding standards, project overview, AI interaction, config, build-plan feature 30 and Audit independent-review contracts. No dependency/configuration changes beyond the declared evaluation package script.
- `.thread-local/continuous-22-34/evidence/feature-30-native.json` and its `test-feature-30.js` harness inspected: eight passing native cases, real qwen3-embedding:0.6b default/wider negative/positive control, explicit qwen3:4b-instruct generation with 483-character context, source navigation, missing-model keyword fallback, cancellation, exclusion, full-hash preflight, digest refusal and source/history preservation.
- `.thread-local/continuous-22-34/evidence/feature-30-visual-keyboard.json` and all eight `feature-30-{find,ask}-{dark,light}-{top,bottom}.png` screenshots inspected: native controls/results usable in both themes, recorded Tab/Enter Search more advances without generation or scope changes.
- `.thread-local/continuous-22-34/evidence/feature-30-installed.json` matches the final rebuilt artifact hashes. Recorded real inference and native interaction were inspected, not rerun by this reviewer.
- Quality: request-local budget logic and shared native controls remain proportionate. Security: current scope/settings/source checks precede selected candidate transmission and old answers/previews are revoked on explicit retrieval. Performance: finite index scan yields, deterministic note/heading candidate prefixes, 350-character windows, batches of eight, 1024-vector cap and 16000-character context remain bounded. Tests cover widening, cancellation, fallback, digest/cache and actual handlers with native acceptance evidence.
- Excluded generated bundle/build/package output, dependencies, unrelated source and older feature evidence from code audit; rebuilt bundle hashes were used only to bind native evidence. Existing findings ledger was empty and remains unchanged.

## Findings

- None. No confirmed P0/P1/P2/P3 finding; no ledger additions, closures or waivers. No repair order required.

## Remaining risk

- Real inference/native acceptance was assessed from the recorded synthetic evidence rather than repeated in a live Obsidian session by this reviewer. Other platforms/models and arbitrary vault scale remain unproven; similarity and fixture success do not establish semantic support or complete retrieval coverage.
- No standalone lint, security scanner, performance benchmark, browser-test or CI command is configured; none was installed or run. Boundedness was assessed from code and the recorded fixture timing, not a general performance profile. No required verification command was unavailable.
