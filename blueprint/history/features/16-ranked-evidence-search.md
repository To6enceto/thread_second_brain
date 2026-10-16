# Feature: Ranked evidence search

**From build-plan:** feature 16
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/ranked-evidence-search`

## Goal

Find stronger evidence through bounded lexical ranking, exact phrases, note aliases and explicit filters, then preserve source diversity and relevance in model context with honest coverage.

## In scope

Deterministic keyword scoring and coverage, type/status/path/record-date filters shared by Find and Ask, alias indexing, balanced ranked evidence construction and native acceptance.

## Out of scope

Semantic embeddings, automatic synonym expansion, exhaustive corpus guarantees, new read grants or historical event reconstruction.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Ranked scoped search** - Implement token-aware weighted relevance, required quoted phrases, bounded aliases and explicit validated filters with coverage data. *Done when:* Meaningful tests cover false substrings, aliases, phrase constraints, ranking, scope/freshness, malformed filters, dates and long-note diversity; Verify passes.
- [x] **Step 2 - Balanced context** - Preserve retrieval relevance and rotate selected passages across notes under the complete serialized evidence budget, prioritizing recorded project fields for Resume. *Done when:* Tests demonstrate relevant evidence and multiple notes survive long distractors; coverage counts identify omitted notes/passages and existing source hashes/briefing fixtures remain valid.
- [x] **Step 3 - Native evidence controls** - Add filters and coverage explanations to Find and Ask, demonstrate native filtered search and real sourced inference, and document limits. *Done when:* Actual synthetic Obsidian acceptance plus Verify, quality fixtures and fresh independent review pass.

## Files / areas

src/retrieval/search.ts and tests; index/evidence contracts and tests; shared native search filters; RecallModal, AskModal and docs.

## Data / contracts

Search applies current explicit scope, project membership and freshness before candidate scoring. Quoted phrases are required; other terms are weighted token matches with no hidden semantic expansion. Aliases are bounded explicit note metadata. Filters never expand scope. Date filters describe recorded metadata or labeled modification-date fallback, not underlying event dates. Keyword search requires no model. Evidence remains bounded to 16000 serialized source-array characters, raw-note hashes and transitive provenance guards. Relevance and source diversity guide selection; omitted/truncated coverage is visible and no exhaustive-answer claim is made. No writes or new runtime dependencies.

## Testing

npm run verify per step; ranking/filter/phrase/alias/date/scope/staleness/source-diversity/context-budget regressions; default quality self-check and real local fixture run; actual synthetic Obsidian Find filters, scoped no-model keyword results, Ask with real local inference, source opening and invalidation; fresh full-delta review.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Observed acceptance

- Verify passed all 24 test files, typecheck and build after each step (`.thread-local/evidence/feature-16-final-verify.log`). Tests cover exact tokens, bounded aliases, phrase boundaries including separate aliases, filters and invalid dates, scope/freshness, source diversity, relevance retained in context, latest report/objective priority, full source hashes and complete serialized context budget.
- `feature-16-self-check.log`: all ten authored references pass and wrong controls are rejected. `feature-16-live.json`: real local qwen3:4b-instruct run passes 10/10 curated checks with zero operational errors. Reports retain raw model output for briefing cases; this is not a general accuracy guarantee.
- `.thread-local/evidence/feature-16-native-final.json`: six actual synthetic Obsidian scenarios pass: model-free alias phrase search, numeric/date/type filters, proposed decision status filter, scope and invalid-range refusal, real filtered inference/native source opening, and exclusion clearing the answer. Exactly one model request was made; the excluded canary never reached it.
- `feature-16-keyboard.json`: native CDP Enter activates Find passages; record-date controls are native date inputs. `feature-16-search.png`: actual filters and results inspected.

## Try it now

In a synthetic readable project, add `aliases: [research budget]` to a budget source note. Open Find evidence, search `"research budget"`, then narrow Search filters to note type `source` and a record-date range. Results show selected passages and coverage without a model. Ask can use the same filters for a sourced local answer.

## Remaining limits

Keyword matching uses Unicode word tokens, required normalized phrases and explicit aliases, with no automatic synonym expansion. Default retrieval returns at most 20 passages (hard maximum 50), up to three per note. Only the first 50000 body characters are indexed. Model context has a separate shared 16000-character serialized evidence budget. Coverage describes selected current notes rather than historical or exhaustive vault knowledge; model claims and classifications still require judgment.

## Independent review repair

F-01 was confirmed and repaired on attempt 1. Ranked source notes now carry query tokens into context construction; cropped excerpts select windows retaining matching text rather than an unconditional prefix. The feasible serialized-budget check evaluates the actual chosen window, and hashes are recomputed from the final excerpt. A window too short to contain a matched token is omitted. Committed regressions cover all twelve tail-position matches, escaped/Unicode content and the full serialized budget. `.thread-local/evidence/feature-16-repaired-final-verify.log` passes 24 files/typecheck/build. `feature-16-native-tail.json` demonstrates twelve tail-position sources retaining the grant sentence in actual Obsidian (15618 serialized characters), with real local inference correctly answering 20 euros. `feature-16-native-repaired.json` repeats all six other native scenarios successfully. Prior curated live fixtures do not carry query focus and remain valid evidence for that unchanged path. Fresh independent confirmation is required before completion.

## Final configured cropping repair

F-01 attempt 2 carries normalized required phrases as source spans, prioritizes complete phrase matches over separated tokens, and keeps surrounding context on score ties. A body phrase span that cannot fit is omitted without blocking other fitting evidence. Regression checks cover the reviewer's twelve required-phrase tails, stop-word-only phrases and an over-wide span alongside fitting notes, as well as the original tail and Unicode cases. F-02 attempt 1 restores tolerant bounded prose tokenization for Capture suggestions, keeping strict quote parsing only at actual search entry points; quoted measurements, unmatched prose and quoted project bodies are covered. `.thread-local/evidence/feature-16-repair-2-final-verify.log` passes all 24 files/typecheck/build. `feature-16-native-phrase-repair.json` shows all twelve phrase/answer sentences retained in 15666 serialized characters, correct real local inference, and quoted Capture suggestions without saving a note. `feature-16-native-tail-repair-2.json` and `feature-16-native-repaired-2.json` repeat the prior tail and all six search scenarios successfully. A new full independent review must confirm both findings closed; no further repair attempt for F-01 is authorized by the configured limit.

## User-authorized additional repair

On 2026-10-16 the user explicitly authorized one additional F-01 repair attempt (attempt 3 total) and supplied the GitHub remote for pushing completed main commits. The default two-attempt configuration remains unchanged for other findings/features. This supersedes the earlier stop for this finding only. Shared Unicode normalization and original-offset spans must pass affected verification, native acceptance and a fresh full independent review before completion.

## Additional repair acceptance

The user-authorized attempt 3 replaces the divergent raw-span regex with a shared normalization/token module. Search uses NFKC and locale-independent default Unicode lowercasing; span mapping retains original grapheme ranges through composition, compatibility expansion and case-length expansion. Mapping inconsistencies fail visibly instead of supplying irrelevant prefixes. New tests cover decomposed accents, ligatures, full-width words, compatibility fractions/symbols, Hangul composition, Greek sigma and dotted I, including twelve-source word/phrase retrieval-to-context checks and original excerpt hashes. `.thread-local/evidence/feature-16-authorized-repair-verify.log` passes all 25 test files/typecheck/build. `feature-16-authorized-unicode-proof.json` retains all twelve answer-bearing passages for composed queries over decomposed source text. `feature-16-native-authorized-unicode.json` proves real native local inference from twelve original decomposed-accent sources in 15690 serialized characters. `feature-16-native-authorized-phrase.json`, `feature-16-native-authorized-tail.json` and `feature-16-native-authorized-search.json` repeat all prior affected native scenarios successfully. Fresh independent confirmation remains required. Completed main through feature 15 was pushed to the user-supplied GitHub origin; unfinished feature 16 remains local.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9955,"specSha256":"4513fcbec04b30f6cd64c2f7865ba23bf00f9a0baa19c71f60610faf9589856d","branch":"refs/heads/feature/ranked-evidence-search","head":"dad864d80f0012300cd24664cfabea937131e71f","baseRef":"refs/heads/main","baseCommit":"b5203e1c8dc3550948bcfc89b4c0876a4c73c39b","sourceTree":"b12a61a017aca28ab489cef47d7d7ea30fdd4fb0","landing":"local-merge","absentOptional":[]} -->

## Findings

### 16/F-01 [P1] closed - Context shortening removes the matching evidence

**File:** src/vault/evidence.ts:102
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** The new per-passage budget takes only the prefix of each retrieved passage, without preserving the terms or phrase that made it relevant. This violates Step 2's relevance-preservation contract and can remove every answer-bearing sentence before Ask contacts the model. A read-only integration reproduction creates 12 source notes, each with `"x ".repeat(475) + "The grant is 20 euros."`, then calls `index.search("grant", scope, "P")` and `buildEvidence(hitsToNotes(result.hits))`. Search returns 12 passages containing `grant`; context returns 12 excerpts of 916 characters, none containing `grant` or the amount. The serialized array is 15234 characters, so the matching sentences were removed by the new per-passage cap. Find can display the answer while Ask receives none of it. Existing relevance tests use short relevant passages and miss this integration case.
**Suggested fix:** Preserve a window containing the matched terms/required phrase when shortening retrieved passages, carrying match information through the retrieval-to-context boundary as needed. Keep whole passages when they fit, preserve diversity and the complete serialized budget, and add a search-to-context regression with matches late in passages from multiple notes. Keep Resume's recognized-field prioritization.
**Resolution:** Reopened by fresh independent review of 97c11b744b772b0ea372650c0607776518fb2440. Verify independently passes the twelve-tail-match and escaped/Unicode regressions, and the native tail evidence retains all twelve grants within 15618 serialized characters. However, the required-phrase branch of the original relevance-preservation contract remains broken. With twelve notes containing `"research x budget " + "x ".repeat(460) + "The research budget is 20 euros."`, search for `'"research budget"'` returns twelve passages containing the required phrase; `buildEvidence(hitsToNotes(hits))` returns twelve 916-character excerpts, none containing the phrase or `20 euros`, in 15006 serialized characters. Window scoring counts distinct tokens and retains the earliest tie, so separated prefix words displace the actual phrase. Required phrase information is not carried through hitsToNotes. Preserve phrase spans as well as tokens when selecting a feasible window, and add this search-to-context regression. No product or test edits were made by the reviewer.

**Repair attempt 1:** Carry matched tokens into bounded context selection and choose a matching excerpt window at each tested budget length. Preserve full-note and excerpt hashes. Added the reviewer's twelve-tail-match reproduction and an escaped/Unicode variant; independent confirmation pending.

### 16/F-02 [P1] closed - Search syntax validation breaks plain-text project suggestions

**File:** src/vault/index.ts:47
**Found:** 2026-10-16 by /audit independent (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** `queryTerms` now delegates to `parseQuery`, which rejects unmatched double quotes and more than eight quoted phrases. Its existing `suggestProject` caller uses it for arbitrary captured text and indexed project prose, not search syntax. A read-only reproduction of `suggestProject('Research budget for a 27" monitor', [project])` throws `Close each quoted search phrase.` instead of returning the matching project. Plain captured `Research budget` also throws when an eligible project's body contains the quoted measurement. CaptureModal's Suggest project click does not catch this error, so normal notes can make the existing suggestion action fail without an actionable status. Truncating ordinary prose to 1000 characters can also turn balanced quotes into an unmatched quote.
**Suggested fix:** Keep tolerant bounded token extraction for plain-text callers, reusing the shared token normalizer and stop-word filtering. Apply phrase syntax validation only at explicit search entry points. Cover quoted measurements, unmatched prose quotes and quoted project bodies through suggestProject tests.
**Resolution:** Closed by fresh independent full-delta review of e3fdd61b08803f7945ab44051b8624bfe75d7f22. queryTerms now uses bounded tolerant keywordTerms rather than parseQuery. Verify passes the captured measurement, unmatched quote, repeated quoted prose and quoted project-body regressions. Native feature-16-native-phrase-repair.json records a successful quoted-measurement Capture suggestion. The strict parser remains confined to explicit search. No product or test edits by reviewer.

**Latest repairs:** F-01 attempt 2 carries required phrases through retrieval and preserves their actual source spans before token-only scoring; body phrases that cannot fit are omitted rather than cropped away. F-02 attempt 1 separates tolerant prose token extraction from explicit query syntax validation. New phrase-tail, stop-word-phrase and captured/project-prose quote regressions await verification and fresh independent confirmation.

**F-01 final configured attempt re-review:** Still open at e3fdd61b08803f7945ab44051b8624bfe75d7f22. The ASCII phrase-tail, stop-word-only phrase, twelve grant tails and over-wide-span/fitting-note regressions pass, and native phrase evidence retains twelve answers in 15666 serialized characters. However, focusedExcerpt at src/vault/evidence.ts:102 extracts word spans before NFKC normalization, whereas search tokens at src/retrieval/search.ts:12 normalizes the whole string before extracting words. Ordinary decomposed accents therefore match retrieval but lose their source focus. Read-only Node integration reproduction: create twelve P/Accent-N.md notes with `"x ".repeat(475) + "The cafe\u0301 is 20 euros."` (the escape represents U+0301 in the source string), index them, search `café` or `"café"`, then buildEvidence(hitsToNotes(hits)). Both queries return twelve hits containing the answer, but all twelve 916-character context excerpts omit `20 euros` and the accented match; the serialized sources occupy 15030 characters. The span parser sees `cafe` rather than normalized `café`, so no focus match is recognized and line 115 returns the irrelevant prefix. This is the original relevance-preservation defect for normalized Unicode, not a waived repair. Use consistent normalized tokenization with offsets mapped to the original excerpt and add decomposed-accent search-to-context regressions, preserving raw excerpt hashes and the serialized budget. No further repair is performed or authorized by this review.

**User-authorized repair attempt 3:** Search and source focus now share NFKC/default Unicode case normalization and tokenization. Grapheme-derived ranges map normalized tokens back to original text, including decomposed marks and compatibility expansions. Mapping inconsistencies fail visibly rather than falling back to irrelevant prefixes. Added shared-token and twelve-source end-to-end regressions. Verification and fresh review are pending.

**Independent closure after authorized attempt 3:** Closed by fresh full-delta review of dad864d80f0012300cd24664cfabea937131e71f against b5203e1c8dc3550948bcfc89b4c0876a4c73c39b. Shared NFKC/default-lowercase tokenization and original grapheme ranges now agree across retrieval and excerpt focus. Independent read-only twelve-source reproductions retain all answer sentences for the original grant-only query, required ASCII phrase, stop-word phrase, and both word/phrase queries over decomposed accents, ligatures, full-width words, Hangul composition, Greek sigma and dotted I. Raw excerpts remain actual original-text substrings; excerpt SHA-256 and full-note hashes independently match, with serialized arrays at 15006 or 15030 characters. Verify passes all 25 files, including compatibility fraction/symbol, escaped text and over-wide required-span/fitting-note regressions. Inspected native authorized Unicode report retains twelve original combining-mark sources in 15690 characters and records real local inference answering 20 euros; authorized phrase/tail/search reports also pass. No new confirmed findings across the full quality/security/performance/tests review. Native/live execution was inspected from recorded evidence rather than rerun; no product, test, spec or config edits by reviewer. F-02 remains closed after fresh re-examination of tolerant prose token extraction and passing Capture regressions.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** dad864d80f0012300cd24664cfabea937131e71f
**Base commit:** b5203e1c8dc3550948bcfc89b4c0876a4c73c39b
**Base ref:** main
**Spec hash:** 4513fcbec04b30f6cd64c2f7865ba23bf00f9a0baa19c71f60610faf9589856d
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-16T09:02:48.479742+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-16T09:05:27.359516+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --short`: pass; immutable target/base/spec match, only permitted review files differ.
- `git diff b5203e1c8dc3550948bcfc89b4c0876a4c73c39b dad864d80f0012300cd24664cfabea937131e71f -- src README.md`: complete product/test/documentation delta reviewed across all four lenses.
- `npm run verify`: pass; typecheck, all 25 test files, production build; zero failures/skips/todos.
- `npm run evaluate`: pass; all ten reference and negative-control self-checks.
- Read-only `node --experimental-strip-types --input-type=module` integration reproductions: pass; original twelve grant tails, required phrase tails, stop-word phrases, and twelve-source word/phrase cases for six Unicode forms, with original substring and excerpt/full-note SHA-256 assertions and serialized-budget checks.
- `git diff --check`: pass. Targeted skipped/focused-test search: none found in changed tests.

## Evidence

- Reviewed all changed source/tests: `src/retrieval/search.ts`, shared `tokens.ts`, `src/vault/index.ts`, `evidence.ts`, Capture regressions, `src/ui/search-filters.ts`, Recall/Ask/Briefing views, `src/intelligence/answer.ts` and README. Followed existing scope/freshness/dependency checks, request cancellation, source opening and saving callers. Checked AGENTS, project overview, coding standards, AI interaction, active spec/config and local independent-review contract.
- Independent original grant/ASCII phrase/stop-word cases retain 12/12 answer-bearing sources at 15006 serialized characters. Six Unicode cases each pass word plus phrase queries, retain original raw sentences and hashes in 12/12 sources at 15030 characters. Committed tests additionally cover fraction/symbol expansion and over-wide required spans omitted without blocking fitting notes.
- Inspected `.thread-local/evidence/feature-16-authorized-repair-verify.log`, `feature-16-authorized-unicode-proof.json`, `feature-16-native-authorized-unicode.json` (twelve original combining-mark sources, 15690 serialized characters, real local answer), `feature-16-native-authorized-phrase.json`, `feature-16-native-authorized-tail.json` and `feature-16-native-authorized-search.json`.
- Inspected recorded `feature-16-live.json` (10/10 curated local-model checks), native final/search reports, `feature-16-keyboard.json` and actual `feature-16-search.png`; native filters, coverage, keyboard activation, source opening, scope refusal and exclusion invalidation are supported by recorded evidence.
- Excluded generated bundles, node_modules, third-party code and unrelated product areas; local synthetic evidence inspected as supporting inputs. No dependencies, product code, tests, spec or config changed by reviewer.

## Findings

- F-01 closed after independent confirmation of the original defect and ASCII/phrase/stop-word/Unicode repairs, original offsets/hashes, budget and over-wide regressions.
- F-02 remains closed; tolerant prose tokenization and quoted Capture/project-body regressions re-examined.
- No new confirmed findings. No open or fixed P0/P1 blockers remain. No repair order required.

## Remaining risk

- Native Obsidian interaction and real local inference were inspected from recorded evidence, not rerun in this reviewer session. Curated quality results do not establish general semantic accuracy.
- No dedicated security scanner or performance profiling command is declared; review covered reachable scope/data boundaries and bounded lexical/context algorithms statically, without a current vulnerability scan or large-vault runtime profile.
- No unavailable required verification commands. Check is not required by the request. Documented 50000-character indexing, result/diversity and 16000-character serialized-context limits remain explicit.
