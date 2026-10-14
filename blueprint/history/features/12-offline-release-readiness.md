# Feature: Offline release readiness

**From build-plan:** feature 12
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/offline-release-readiness`

## Goal

Produce a private, installable desktop plugin package and prove its core workflow works with a real local model while external networking is disabled.

## In scope

Versioned three-file ZIP packaging, accurate installation/model/cost/recovery instructions, a settings index rebuild action, scoped native focus styling, final clean-vault install and offline integration acceptance.

## Out of scope

Publishing, pushing, community directory submission, paid or hosted inference, new AI features, bundled runtimes/models, mobile or untested platform compatibility claims.

## Build loop

Continuous Mode: serial steps, self-review, Verify, actual Obsidian acceptance, fresh independent review for personal-data boundaries, then authorized local completion. No paid runtime, publishing, or changes to raw sources.

## Build steps

- [x] **Step 1 - Local release package** - Create a validated version-consistent ZIP of main.js, manifest.json and styles.css with no vault/runtime data or new dependencies. *Done when:* Verify passes, an independent ZIP reader validates exact entry names/CRCs/bytes, and rebuilding produces the same package bytes.
- [x] **Step 2 - Setup and recovery usability** - Add an explicit derived-index rebuild in Settings, use the tested model example, scope visible keyboard focus styles, and replace the initial-slice README with complete setup, workflows, costs, safety and recovery instructions. *Done when:* Verify passes; native settings rebuild preserves notes and durable journals; installation and runtime instructions match actual tested behavior.
- [x] **Step 3 - Offline packaged workflow** - Install exact packaged bytes in a new synthetic three-project vault, run real Obsidian and Ollama inside an isolated loopback-only network namespace and demonstrate core model, write, recovery, lifecycle and keyboard/theme flows. *Done when:* Observed offline real-model briefing and supported/unsupported Ask, working source links and save, reviewed synthesis/apply/undo, controlled durable partial-failure recovery, cancellation/reload, light/dark keyboard evidence and free local runtime checks pass; then fresh full independent review passes.

## Files / areas

Release packaging script/package metadata, README/AGENTS commands, settings/index rebuild and scoped native modal styles; ignored isolated acceptance scripts/evidence.

## Data / contracts

Keep Markdown authoritative, explicit allowed/excluded scope, exact preview/write guards and existing recovery semantics. Rebuild resets only the derived text/link index and leaves notes, settings, imports, rename metadata and changes history intact. Package contains only thread/main.js, thread/manifest.json and thread/styles.css; no models, runtime data, secrets or account integration. Version 0.1.0 is a local private package, desktop-only with tested minimum Obsidian 1.14.4. Ollama and model remain separately installed/downloaded prerequisites; no mandatory paid runtime on suitable existing hardware. Test Linux/Obsidian 1.14.4/Ollama 0.40.4/qwen3:4b-instruct honestly; do not imply semantic correctness, permanent history, atomic multi-file writes or other-platform testing. Offline proof isolates only test processes, never changes host networking, and uses only synthetic notes. Controlled failure injection is disclosed separately from real model inference. Nothing is published or pushed.

## Testing

npm run verify after each step; npm run package; independent Python ZIP validation plus reproducibility hash; actual packaged installation and local inference inside loopback-only network namespace, native index rebuild/journal preservation, exact-save and before/after/undo/recovery checks, keyboard focus and theme screenshots, plugin disable/reload and cancellation. Fresh isolated full-delta independent review with all evidence recorded.

## Notes for the AI

Use native Obsidian controls and APIs. Explicit scope and exclusions apply before reads. Model text is untrusted; citation identity does not prove semantic support. Preserve notes and fail visibly on stale data or partial writes.

## Verification observed

Step 1: `npm run package` passed Verify (18 test files) and produced the version-consistent three-file ZIP. `.thread-local/test-package.py` / `.thread-local/evidence/feature-12-package.json` independently validated ZIP entry names, CRCs and exact bytes using Python zipfile, reproduced identical bytes, and proved inconsistent manifest/package versions fail before output.

Step 2: Verify passed. `.thread-local/test-12-settings.js` / `.thread-local/evidence/feature-12-settings.json` demonstrates the actual native settings rebuild replacing a deliberately corrupt derived index while all 61 synthetic Markdown notes and data/import/change/rename files stay byte-exact. The running existing host retained its cached 0.0.1 manifest metadata during plugin reload; the fresh packaged installation in step 3 must independently verify 0.1.0. Settings now show the tested instruct model and explicit rebuild behavior. README replaces the initial read-only slice with complete runtime/setup/cost/recovery limits.

Step 3: `npm run package` reran strict typecheck, all 18 test files and the production build. Final ZIP SHA-256 is `0dbe6927dc653f2ef23cfe755d1e5a54c0cbb68b9c43c9ae3fca6b10c7fe6c03` (136617 bytes). Independent ZIP validation and byte comparison show the exact same three files installed in the fresh vault and current build.

- `.thread-local/prepare-offline.py`, `offline-runner.mjs`, `offline-core.js`, `offline-changes.js`, `offline-usability.js` and `cdp.mjs` run real Obsidian 1.14.4 and Ollama 0.40.4 with existing qwen3:4b-instruct weights inside `bwrap --unshare-net`. Only loopback IPv4/IPv6 interfaces exist and an external HTTP attempt is blocked. No host networking was changed. First-open vault trust was explicitly granted only for our own synthetic vault/plugin.
- `.thread-local/offline-lab/evidence/core.json`: fresh installed manifest 0.1.0, initially empty read scope, native settings grants and connection confirmation, real briefings for Language App/Garden/Thesis, working source navigation and supported budget/voice answer. Exact answer-preview bytes save successfully. A unique unsupported question makes no model call. Excluded and ungranted sentinel text is absent from requests. Four real inference calls here plus one real knowledge synthesis below.
- `changes.json` in that evidence directory: actual local-model synthesis, exact reviewed Apply, guarded undo of its unchanged created note, injected second-write and rollback filesystem failures on only purpose-created notes, durable recovery across plugin reload, native Recover restoring both exact originals and explicit rejection of the recovered stale draft. Failure injection is controlled test evidence, not model behavior.
- `usability.json`: native Settings replaces a corrupt derived index while notes and durable files remain unchanged; generation cancellation, request abort on unload, clean reload and preserved change history pass.
- `keyboard.json`, `light.png`, `dark.png`: native CDP Tab moves from endpoint to model, and a complete native Enter key event activates focused Ask. The Question field has a solid visible focus outline. Both 1400x1000 real-host screenshots were visually inspected for readable native layouts, wrapping controls and theme colors. Keyboard/theme checks resumed in a new isolated namespace after a harness expression-quoting fix; all core receipts were already complete. The harness also sends Enter's text character to obtain native activation rather than a synthetic DOM click.
- `.thread-local/open-demo.sh` / `open-demo-inner.py` and `evidence/demo-launch.json`: the visible Wayland demo opens real packaged 0.1.0 with the selected Language App project, still isolated from external networking. The test mode closed only its own processes; the normal launcher waits while the user uses the synthetic vault.
- `.thread-local/evidence/feature-12-offline.json` aggregates the assertions: exact installed package hashes, all ten original synthetic notes byte-exact, five real offline model calls, recovery/lifecycle/keyboard/theme/visible-demo success. Model and runtime downloads remain ignored and separate from the package.

## Try it now

On this prepared Linux desktop run `bash .thread-local/open-demo.sh` from the project root. The visible demo uses only the synthetic vault and already downloaded local runtime/model. Close Obsidian or stop the launcher to end it. Open Thread and choose Resume project. Ask "Why postpone live voice conversations?" and inspect its budget/hosting citation; ask "orbital ZXQ9000 penguin" and expect an evidence gap. Preview and save a supported answer. Under Knowledge, select Sources/Teacher.md, generate a keyboard-navigation synthesis and inspect Changes before Apply. Preview undo and verify the unchanged created note can be removed while original sources remain. Settings offers the derived-index rebuild. Navigate settings with Tab, activate Ask with Enter, and switch Appearance between light and dark. For a personal installation, follow README and extract the ZIP into your vault's plugin folder, then explicitly grant read paths.

## Limits

This is a private local release, with no publishing or pushing. Linux/Obsidian 1.14.4/Ollama 0.40.4/qwen3:4b-instruct and Node 22.22.2 were actually tested; other systems/models and production-scale vault performance were not. The first offline briefing API call took about 44 seconds including local model startup; performance is hardware-dependent. The small model sometimes omitted an objective or placed facts in the wrong briefing section (observed on Thesis), so citation identity and schema validity do not establish semantic accuracy. The README says this explicitly. Text context remains bounded; no embeddings/PDF/OCR/audio/cloud/scheduling/mobile features were added. Last-20-batch history is not a vault backup and multi-file writes are not atomic. Runtime is free of required paid APIs/accounts/services on suitable existing hardware, with real download/storage/memory/power costs. All work and synthetic notes remain local.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10354,"specSha256":"5091fae584a75b694a9f23039f369d964624431b073c0b606d7fed158f267a81","branch":"refs/heads/feature/offline-release-readiness","head":"3b0a741631a6806113ae0c3ab8453e0908f74f25","baseRef":"refs/heads/main","baseCommit":"2ac5e4937fc182280d387fb299224ef14877dce2","sourceTree":"f175d5bcc14725ae2d454a711f94ba20ced6353e","landing":"local-merge","absentOptional":[]} -->

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 3b0a741631a6806113ae0c3ab8453e0908f74f25
**Base commit:** 2ac5e4937fc182280d387fb299224ef14877dce2
**Base ref:** main
**Spec hash:** 5091fae584a75b694a9f23039f369d964624431b073c0b606d7fed158f267a81
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-14T22:23:45.496012+00:00
**Workflow:** continuous
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-14T22:25:07.732628+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run verify`: pass; strict typecheck, all 18 test files, production build. No skipped, focused or placeholder tests encountered.
- `node scripts/package.mjs` (twice after Verify): pass; same 136617-byte package both times.
- Independent Python `zipfile`/`hashlib`/`subprocess` validation: pass; exact entry names and CRCs, exact built/dist/installed bytes, reproducible archive, and inconsistent version rejected before output in temporary fixture.
- `git rev-parse HEAD`, `git merge-base main HEAD`, raw SHA-256 and `git status --short`: pass; requested target, base and spec identity confirmed; only review evidence differs.
- Native acceptance scripts and receipts: inspected existing recorded results; not rerun during this independent review. Formal Check is manual/not required by this request.

## Evidence

- Complete current delta reviewed from main merge base `2ac5e4937fc182280d387fb299224ef14877dce2` through `3b0a741631a6806113ae0c3ab8453e0908f74f25`: AGENTS.md, README.md, active spec, manifest.json, package.json/package-lock.json, scripts/package.mjs, src/main.ts, src/ui/settings-tab.ts, src/ui/thread-modal.ts and styles.css. Followed adjacent index lifecycle, recall, native settings/modal and build/test contracts. Applied AGENTS.md, coding-standards.md, project-overview.md, ai-interaction.md, config and the independent-review contract. All four lenses cover the complete feature delta; this is not a full-project audit.
- Generated build output, dist, dependencies, vendored runtime/model files and unrelated source excluded from source audit. Package contents independently inspected as release artifacts. No dependency changes, extra runtime, recursive vault inclusion or hosted fallback introduced.
- ZIP SHA-256 `0dbe6927dc653f2ef23cfe755d1e5a54c0cbb68b9c43c9ae3fca6b10c7fe6c03`; exact thread/main.js, thread/manifest.json and thread/styles.css bytes match current production output and `.thread-local/offline-lab/vault/.obsidian/plugins/thread/`.
- Inspected `.thread-local/test-package.py`, `.thread-local/evidence/feature-12-package.json`, `.thread-local/test-12-settings.js`, `.thread-local/evidence/feature-12-settings.json`, `.thread-local/prepare-offline.py`, `offline-runner.mjs`, `offline-core.js`, `offline-changes.js`, `offline-usability.js`, `cdp.mjs`, `open-demo.sh` and `open-demo-inner.py`.
- Inspected `.thread-local/offline-lab/evidence/{network,package,core,changes,usability,keyboard,demo-launch}.json`, local Ollama runtime log and `.thread-local/evidence/feature-12-offline.json`. Real Ollama 0.40.4 local weights/cloud-disabled logs and four core inference requests plus one synthesis support the real offline model claim. Runner checks loopback-only interfaces/external request failure; launcher uses bwrap --unshare-net. Existing host metadata 0.0.1 is disclosed separately from exact-package fresh installation 0.1.0.
- Native evidence covers initial empty scope, explicit grants, sentinel exclusion, three project briefings, supported Ask, unsupported no-model Ask, source navigation, exact preview save, reviewed synthesis Apply/undo, durable recovery/reload, index rebuild preserving notes/journals, cancellation/unload, native Tab/Enter. Recovery uses explicitly injected filesystem failures on synthetic notes; it is not an inferred model capability. The successful unsupported question is a retrieval evidence-gap case.
- Independently visually inspected `.thread-local/offline-lab/evidence/light.png` and `dark.png`: readable native 1400x1000 layouts, wrapping controls, themed colors, Question-field and Ask-button focus. Keyboard evidence records resumed checks after harness correction, without claiming core rerun.
- Reviewer started as an isolated generic child with only this handoff and project-local instructions, without builder transcript. Exact selected runtime identity: codex / gpt-6.1-sol; automatic / fresh subagent. Identity is declared metadata under the local contract.

## Findings

- None. No confirmed quality, security, performance or tests findings; ledger unchanged. No repair order required.

## Remaining risk

- Native Obsidian/Ollama acceptance was inspected from existing scripts, receipts, logs and screenshots rather than independently rerun; no new native runtime observation is claimed by this reviewer.
- Small synthetic Linux/Obsidian 1.14.4/Ollama 0.40.4/qwen3:4b-instruct evidence does not establish other-platform/model compatibility or production-scale performance. Small-model omissions and misplaced facts are visible in the Thesis receipt and honestly documented; valid citations/schema do not establish semantic correctness.
- Controlled recovery injection establishes tested recovery paths, not every filesystem failure. Multi-file writes remain non-atomic and bounded journal history is not a permanent vault backup.
- No lint, browser-test, CI, current vulnerability-scan or dedicated performance command is configured. Native acceptance is the integration signal; no vulnerability-scan or broad performance guarantee is asserted.
