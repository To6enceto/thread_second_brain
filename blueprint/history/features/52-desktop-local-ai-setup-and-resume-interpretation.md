# Feature: Desktop local AI setup and Resume interpretation

**From build-plan:** feature 52
**Build attempt:** 1
**Branch:** feature/desktop-local-ai-setup-and-resume-interpretation
**Status:** verified

## Goal

Choose a compatible downloaded local text model in independent Thread and add clearly separated AI interpretations to a current recorded Resume, with recorded context available before inference and on local-model failure/cancellation.

## In scope

- Session-only local AI setup: loopback endpoint, compatible downloaded-model discovery/selection, explicit application, metadata-only connection test, actionable feedback and cancellation. Reuse existing Ollama cloud-disabled/local-capability validation. No automatic model/runtime downloads, cloud fallback, inherited settings or permission grants.
- Main-process finite typed IPC for model setup and interpretation. Main owns the exact bounded recorded bundle; an opaque prepared-briefing identity binds the interpretation request, not a renderer-supplied prompt or note bundle.
- Reuse briefingPrompt, validateBriefing and composeBriefing. Show recorded context first; optional inference adds a dashed periwinkle AI card with model/time, interpretations, suggested next actions, source chips and model-reported gaps. Keep recorded facts unchanged.
- Abort and invalidate on relevant scope/vault/project/model/source changes, window reload/close and explicit cancellation. Revalidate source/dependency bytes before transmitting context and after generation. Reject stale replies; preserve still-current recorded context when the model is unavailable or canceled.
- Bound setup/inference duration and local response bytes. Surface missing/incompatible/remote models, cloud-enabled status, malformed responses, timeout and invalid endpoint without leaking note contents.
- Actual Electron acceptance with real free local inference, synthetic notes and isolated profile, including keyboard/light/dark and no-model/offline paths.

## Out of scope

Ask/embeddings (53), persistent model settings or writes/history (54+), PDF access, plugin-state reads, launching/downloading runtimes automatically, hosted inference and packaged distribution (62).

## Build loop

Continuous authorization covers routine implementation/spec refinements, checkpoints, local Git lifecycle and separately authorized normal main pushes. Review per feature, no step checkpoint commits. Preserve completed archives and run records. Required native acceptance and fresh independent review precede completion. Two repairs per failing check/finding maximum.

## Build steps

- [x] 1. Implement main-owned model setup/recorded-snapshot interpretation with finite validated IPC, cancellation/current-source guards and existing local model/briefing contracts. Done when focused tests prove metadata-only discovery, rejected endpoints/cloud/remote/incompatible models, timeout/cancel, context identity and freshness before/after inference, malformed output and preserved recorded snapshots; typecheck and tests pass.
- [x] 2. Add accessible model setup and progressive recorded/AI Resume UI with distinct status/cancel controls and source navigation. Done when UI state never publishes stale AI, current recorded facts survive model failure/cancel, and Verify plus actual Electron happy/failure/revocation/external-edit paths pass with real local inference.
- [x] 3. Update desktop instructions and retain acceptance/verification/preservation evidence. Done when final Verify passes, the verified spec is ready for a fresh full independent review and all required review findings can be independently resolved before completion.

## Files / areas

src/standalone/{local-ai.ts,local-ai.test.ts,contracts.ts,main.ts,preload.ts,renderer.ts,project-view.ts,projects.ts,app.html,styles.css}; a focused setup renderer if useful; docs/desktop.md. Reuse src/intelligence/{ollama,briefing,recorded} and src/settings/settings. Shared behavior changes require actual isolated Obsidian regression.

## Data / contracts

Local setup is volatile, initially http://127.0.0.1:11434 with no model selected and 180-second bounded operations, using the existing settings defaults. Explicitly choose a downloaded completion model; discovery checks capability, not quality. Settings do not grant file access and reset with the vault/window session. Main validates input shapes, endpoint and model names; renderer cannot fetch network assets or send arbitrary prompts. Local response reading is bounded with an actionable failure if exceeded. Never display raw provider bodies/errors containing note content.

Recorded Resume retains the existing evidence/context bounds, index generation and vault revision. Main retains only one prepared snapshot and validates its opaque identity, model state and source/dependency hashes before/after inference. Project/source/access/model invalidation cancels obsolete work. Abort guards run immediately before sending evidence after asynchronous model checks. Current recorded context remains separate from validated AI interpretations/suggestions, which never become recorded facts or note changes. No filesystem persistence, plugin permission/settings imports, paid services or external URLs.

## Testing

Baseline npm run verify passed 356 tests, strict typecheck and both builds. Use real synthetic filesystem fixtures plus controlled local responses for provider/freshness/cancellation tests; no model required by ordinary unit suite. Reuse inspected owned Electron/Ollama helpers and free downloaded test models only. Prove actual Electron model discovery/check, genuine inference/citations, recorded-first display, unavailable/malformed/canceled inference, project/model change, external edits and revoked grants. Retain screenshots and reports under .thread-local/desktop-50-62/evidence/52-*. Preserve original fixture and archive bytes.

## Notes for the AI

Keep existing keyword/home/recorded-only workflows usable. Model selection never silently chooses or downloads a model. Inspect test helpers for prior-feature assumptions. No everyday app changes or unrelated process termination. The user already authorized serial implementation and normal verified pushes; no routine permission round.

## Acceptance evidence

- Final npm run verify passed strict typecheck, 363 tests and both builds (52-final-verify.log). Shared plugin behavior/source is unchanged; plugin bundle SHA256 remains 7c29ac19e4a13d372f68a2b7441b6454c97fa23d36ecfb191450a2fa11e84cf3.
- Actual isolated Electron plus cloud-disabled Ollama on loopback11439 used real qwen3:4b-instruct inference. 52-native-inference-final.json proves explicit compatible discovery, recorded-only use, recorded-first rendering, unchanged recorded text, model provenance, source inspection during inference, AI citations and Back to project without regeneration.
- 52-native-cancel.json proves explicit cancel, project switching and model changes suppress delayed replies. 52-native-edit.json and 52-native-revocation.json prove source edits and read-access revocation during inference clear obsolete content. Controlled local provider recorded aborted requests, not completed stale responses.
- 52-native-malformed.json and 52-native-offline.json prove invalid JSON and an actually stopped loopback runtime retain current recorded context with safe diagnostics. 52-native-setup-cancel.json proves metadata-check cancellation and suppression of late discovery.
- 52-ai-light.png and 52-ai-dark.png were visually inspected; 52-keyboard.json records native Enter opening the cited Objective with a visible focus outline.
- 52-preservation.json verifies all 53 prior history files, completed features 50/51 and the 12-file synthetic test vault. Owned Ollama mounts existing models read-only, with its own ignored home/profile; no user installation or notes were changed.
- Limits: setup remains volatile, response cap 2 MiB, operation cap 180 seconds, index/context bounds and 2.5-second observation delay remain. Structured/citation validation is not proof of semantic correctness; AI labels remain explicit.

## Try it now

1. Run `npm run desktop:start`, select a synthetic vault and explicitly grant its project read roots/exclusions.
2. Refresh projects, select a permitted project and Resume project with no model to see recorded context.
3. Start cloud-disabled local Ollama separately. In Optional local AI, Find downloaded models, select a text model, Apply AI settings and Test local connection.
4. Resume project again. Recorded context appears first; optional AI interpretations appear separately. Open a source chip and use Back to project to return without regenerating.
5. Cancel AI interpretation, or stop your test runtime and Resume again: current recorded context remains. External edits/access revocation clear obsolete evidence.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8856,"specSha256":"985e73cbfcf74e2a3d43beca849af18a8aea303ea150c88af35c75c07139c0f4","branch":"refs/heads/feature/desktop-local-ai-setup-and-resume-interpretation","head":"48a2ac7a266ba7997f4ab7499574086a7b36f33a","baseRef":"refs/heads/main","baseCommit":"a0ddb202d314238223f10cca1526904f0ac6dda4","sourceTree":"a27746263e1b5dd79934063fcbe1d62259a63a65","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 48a2ac7a266ba7997f4ab7499574086a7b36f33a
**Base commit:** a0ddb202d314238223f10cca1526904f0ac6dda4
**Base ref:** main
**Spec hash:** 985e73cbfcf74e2a3d43beca849af18a8aea303ea150c88af35c75c07139c0f4
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-21T21:35:58.089436+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-21T21:39:42.253324+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and complete a0ddb202d314238223f10cca1526904f0ac6dda4..48a2ac7a266ba7997f4ab7499574086a7b36f33a delta from scratch in a fresh isolated subagent with all Audit lenses. Do not change product/spec/config/assets or perform external actions. Actual isolated Electron is on owned CDP9340/display198 with synthetic vault-52 selected. Owned cloud-disabled real Ollama is loopback11439; existing model files mounted read-only. UI currently has a canceled model-discovery draft. Evidence is .thread-local/desktop-50-62/evidence/52-*. Inspect native helpers before reuse; native-52-inference.js supports real inference and accepts only this synthetic vault. Controlled failure fixture11440 is stopped; retained native failure evidence is available. Use the installed independent-review contract for the receipt.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, raw spec SHA-256, and `git status --porcelain --untracked-files=all`: passed; exact requested checkpoint, base, spec and permitted dirty paths.
- `git diff --check a0ddb202d314238223f10cca1526904f0ac6dda4..48a2ac7a266ba7997f4ab7499574086a7b36f33a`: passed.
- `npm run typecheck`: passed.
- `npm test` with host access: passed, 363 tests, zero failures/skips. Initial restricted-sandbox attempt failed environment-sensitive launcher/updater cases; the unrestricted rerun passed every case.
- In-memory esbuild of desktop main/preload/renderer using `scripts/desktop-build.mjs` options, with byte comparison against owned runtime bundles and source assets: passed; no build artifacts written.
- In-memory production plugin build using `esbuild.config.mjs` options: passed; SHA-256 remains `7c29ac19e4a13d372f68a2b7441b6454c97fa23d36ecfb191450a2fa11e84cf3`.
- `THREAD_CDP_TIMEOUT_MS=240000 node .thread-local/desktop-50-62/cdp.mjs --script .thread-local/desktop-50-62/native-52-inference.js` with host loopback access: passed against the owned synthetic vault and real local model. Initial restricted CDP access returned EPERM; host replay passed.
- Focused skipped/only-test search in standalone and reused local-model/briefing tests: none found.

## Evidence

- Reviewed the complete base-to-target delta: spec, desktop instructions, app markup/styles, typed contracts/preload, main lifecycle/IPC, local AI service/tests, model setup, renderer, project rendering and source revalidation. Followed relevant existing endpoint, Ollama, briefing/composition, evidence/index, filesystem/scope and sender-validation contracts. Dependency/generated/build/cache directories were excluded from code review; owned generated bundles were compared only as runtime evidence.
- Fresh native replay returned all assertions true: recorded-only use, compatible discovery, explicit model selection, cloud-disabled check, recorded-first rendering, source inspection during inference, unchanged recorded context, model provenance, AI citation navigation and return without regeneration using `qwen3:4b-instruct` on loopback 11439. Confirmed the window was on `.thread-local/desktop-50-62/vault-52` before execution.
- Inspected retained `52-native-{cancel,edit,revocation,malformed,offline,setup-cancel}.json` plus their native helpers/controlled provider implementation for cancellation, project/model changes, edits, access revocation, late-reply suppression and safe failure behavior. Failure fixture 11440 remained stopped.
- Visually inspected `52-ai-light.png` and `52-ai-dark.png`; inspected `52-keyboard.json` for native citation activation and visible heading focus. Inspected `52-preservation.json` for prior archive, plugin and synthetic-vault preservation.
- Main owns one opaque prepared briefing and the bounded evidence snapshot. Freshness checks re-read source/dependency bytes before context transmission after asynchronous model validation and after generation. Abort/epoch guards reject obsolete work; renderer state independently guards publication. AI text uses native text nodes and validated source identities, with recorded facts retained separately.

## Findings

- None. No confirmed quality, security, performance or test finding across the complete feature delta; findings ledger remains unchanged.

## Remaining risk

- Structured citation validation does not establish semantic correctness. Local inference speed/quality varies by model and hardware; the explicit 180-second operation and 2 MiB response limits remain.
- Source observation between explicit operations retains the documented 2.5-second polling delay. Setup is volatile and resets with the vault/window session.
- Failure/theme/keyboard cases were reviewed through retained actual-Electron evidence and current code; the independent native rerun covered real inference and navigation. No verification command remained unavailable after host-access reruns. Check was not required by this request.
