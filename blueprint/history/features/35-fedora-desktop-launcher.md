# Feature: Fedora desktop launcher

**From build-plan:** feature 35
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/fedora-desktop-launcher`

## Goal

Open a configured vault and Thread through a generated Fedora desktop shortcut,
with explicit optional local Ollama startup and useful failures. Keep the user's
everyday installation and processes untouched during development.

## In scope

- Node 22.15+ local helper using installed Flatpak or an explicit executable.
- Generate a previewable `.desktop` artifact beside an explicit JSON config;
  no automatic installation or registration.
- Vault-targeted Obsidian URI registered by Thread; reveal current Thread view
  after layout readiness without granting access or invoking inference.
- Detect the configured loopback Ollama server; optional startup only with
  explicit config consent, executable and model-directory paths. No downloads.
- Current-server cloud-disabled validation, bounded waiting, useful errors,
  visible terminal feedback, documented first use and verification.

## Out of scope

System services, global packages, model downloads, automatic read grants, desktop
installation in the user's account, updater, full-width view (37), web app,
process termination and any edit to personal notes/settings.

## Build loop

Continuous Mode, serial steps with Verify after each, native isolated acceptance,
then fresh independent review for launch/process/network boundaries. Routine
approvals and normal main pushes are already authorized. No step commits;
required review checkpoint and completion commits remain authorized.

## Build steps

- [x] **Step 1 - Safe launcher and artifact contracts** - Validate config, construct argv/URI and desktop entry, check bounded local cloud status and optionally start only the configured runtime. *Done when:* meaningful tests prove path/argument escaping, consent, unavailable/unsafe server handling, bounded failures, startup and non-overwriting artifact creation; Verify passes.
- [x] **Step 2 - Native vault route and instructions** - Register the lifecycle-safe Thread route, expose the CLI command and document setup, diagnostics and artifact-only installation guidance. *Done when:* actual isolated Obsidian reveals Thread in the selected synthetic vault with unchanged grants and no generation, including startup/layout readiness; Verify passes.
- [x] **Step 3 - Fedora/Flatpak acceptance** - Exercise the actual installed Flatpak in an isolated disposable profile with authored config and shortcut, plus existing and owned-started local Ollama cases. *Done when:* repeat launch preserves open notes/settings, offline recorded mode and cloud rejection are visible, owned startup reaches cloud-disabled readiness, no everyday installation/process is touched, and final Verify passes.
- [x] **Step 4 - Review repair F-01** - Default an omitted startup flag to false while rejecting present non-booleans. *Done when:* omission has no startup side effect, the real CLI opens recorded-only Thread and Verify passes. Fresh complete independent review remains required before completion.

## Files / areas

`src/desktop/launcher.ts`, focused adjacent tests, `scripts/launch-thread.mjs`,
`src/main.ts`, `package.json`, `README.md`, `docs/launcher.md`, current spec and
ignored `.thread-local/continuous-35-plus/` evidence. No runtime dependency.

## Data / contracts

- Version 1 JSON config, at most 16 KiB, exact known fields. `vaultPath` is an
  absolute existing vault directory; `vaultId` is the explicitly copied 16-character
  hexadecimal Obsidian vault ID. `obsidian` has `kind` flatpak/executable and
  absolute `executable`; optional absolute `profilePath` provides isolated test
  profile routing. No arbitrary shell command or interpolated shell evaluation.
- `ollama` has integer `port` (1-65535), boolean `startIfMissing` default false;
  startup requires absolute `executable` and `modelsPath`. Direct IPv4 loopback
  HTTP only, no redirects/proxy; bounded 64 KiB metadata, 1500 ms per check and
  20 seconds readiness. Only confirmed connection refusal permits startup.
- New runtime gets OLLAMA_HOST=127.0.0.1:port, OLLAMA_NO_CLOUD=1 and explicit
  OLLAMA_MODELS. Never terminate processes; report runtime failures and log path.
  Existing reachable but unsafe/unknown cloud status refuses launch with guidance.
  Unavailable server without startup consent still opens recorded-only Thread.
- `obsidian://thread?vault=<vault ID>&threadVault=<encoded absolute vault path>`
  invokes only view opening after checking the receiving vault path. The plugin
  does not interpret parameters as grants, commands or content.
- Shortcut uses safely escaped Desktop Entry Exec arguments, no shell; Terminal
  enabled, errors remain visible when run interactively. Artifacts refuse overwrite,
  config is local only and never copied into the vault. No automatic desktop install.
- Inspect installation presence and Thread plugin manifest before launching.
  Report disabled/missing plugin and unavailable Flatpak/executable access.
  No registry/settings writes by launcher; first vault registration is explicit in
  Obsidian. Current user config is not a test fixture.

## Testing

Node tests through existing runner: malformed configs, unsafe paths/arguments,
exact desktop escaping, status response bounds/redirect/invalid/cloud handling,
start consent, refused-versus-timeout distinction and artifact collision.
Use direct synthetic local HTTP servers and disposable helper processes.
Native acceptance: real Obsidian 1.14.4 and installed Fedora Flatpak, isolated
profiles/vaults, actual plugin route, repeated launch and read-scope invariance;
real owned Ollama startup/cloud status. Retain logs/screenshots under ignored run
storage. No mock webpage substitutes for native proof. Required independent
review covers complete branch delta and all four lenses.

## Notes for the AI

No AI attribution. Preserve old archive bytes. No personal vault reads or installs.
Use existing plugin lifecycle and local protocol API. Keep errors free of note
contents. A generated shortcut is not installed until the user explicitly approves
that concrete action; never claim end-to-end acceptance without its evidence.

## Verification evidence

- Step 1: npm run verify passed (208 tests, no failures/skips), including direct
  loopback status/redirect/size/timeout tests and an owned runtime argv/env check.
  Log: .thread-local/continuous-35-plus/evidence/35-step1-verify.log.
  The initial sandbox-only test lacked loopback binding permission; the authorized
  rerun passed with local networking available.

- Native acceptance found the initial URI incorrectly used an absolute path for
  Obsidian vault selection. Product repair 1 uses the documented explicit vault ID
  plus a receiving-vault path guard; schema, tests and instructions updated.
  Native headless launch had SIGTRAP after that invalid URI. Isolated Flatpak
  also requires its own private D-Bus session; no host desktop bus was used.

## Native acceptance and resolved environment blocker

- Final available automated gate: npm run verify passed, 208 tests, no failures
  or skips. Log: .thread-local/continuous-35-plus/evidence/35-cold-start-verify.log.
- Desktop artifact generation and desktop-file-validate passed; artifact remains
  local and is not installed. Tests also refuse a symlink log destination.
- Real owned Ollama 0.40.4 startup and subsequent reuse passed in an offline PID/
  network namespace. Exactly one process started; cloud.disabled was true.
  Evidence: .thread-local/continuous-35-plus/lab/evidence/35-owned-runtime.json.
  Cold-start status timeouts are retried only for the just-started owned process
  within the bounded deadline; an initial existing-server timeout still refuses.
- The first corrected Flatpak launch reached the synthetic vault but reported
  EMFILE: too many open files, watch '/mnt/vault/' before loading Thread.
  After the user freed resources, isolated first-use plugin trust and warm
  native launch passed. Thread opened exactly one view, retained the open Welcome
  note and its contents, preserved settings/read grants, and made no AI request.
  Repeated launch reused the view. Recorded-only Resume worked without Ollama.
  A deliberately mismatched receiving-vault path did not open Thread or change
  settings. Evidence: lab/evidence/35-native-launch.json,
  35-repeat-offline.json and 35-mismatch.json under this run.
- The actual CLI refused a cloud-enabled synthetic status before starting either
  application. Evidence: lab/evidence/35-cli-cloud-refusal.json.
- Desktop Entry argument handling also passed the native GLib launcher with
  spaces, percent signs, dollars, backticks and quotes in the script path, plus
  a literal backslash in the config argument. Evidence: desktop-escaping/result.json.
  The initial fixture put a literal backslash in the script directory; Node ESM
  rejected that filename before capture. This is not claimed as a passing path.
- The first cold restart also reported EMFILE before layout readiness. It was
  not accepted based on the warm checks.
- Host inotify max_user_instances is 128; ordinary file-descriptor limit is
  524288. After all owned app-test namespaces were stopped, a brief handle probe
  could allocate only 3 watcher instances before EMFILE; all were closed.
- On resumption, max_user_instances was still 128 and a brief probe found 9
  available instances; the cold launch exhausted them. A noninteractive attempt
  at the discussed temporary increase to 256 required the user's sudo password
  and changed nothing. The user was asked to run that exact command personally
  and retain 256 until testing finishes; no password is requested.
- No user process was stopped, system limit changed by the agent, daily
  installation modified, shortcut installed, or personal vault read.
  Native acceptance cannot be replaced by tests.
- The user then raised max_user_instances to 256 personally; the value was
  confirmed before retrying. Cold launch through the actual helper and installed
  Flatpak passed: layout ready, one Thread view, saved Welcome note still open
  with identical contents, exact settings unchanged, project home without
  automatic generation. Evidence: lab/evidence/35-cold-acceptance.json and
  35-cold-home.png. No production workaround or acceptance check was weakened.
- Final npm run verify passed: strict typecheck, 208 tests with no failures or
  skips, production build. Log: evidence/35-resumed-verify.log. git diff --check
  passed. Evidence paths above are relative to .thread-local/continuous-35-plus/.
- Independent review follows this verified checkpoint. No shortcut is installed
  in the user's account; desktop-launcher parser testing used Terminal=false
  only for the authored capture fixture. The generated user artifact retains
  Terminal=true. The 2-repair policy remains unchanged.
- Independent review found F-01 [P2]: omitted startIfMissing did not use the
  specified false default. Repair attempt 1 defaults only omission to false;
  null and other non-booleans remain rejected. Regression tests prove absent
  consent never starts a server. Verify passed all 208 tests again
  (evidence/35-f01-verify.log). Actual isolated CLI opened recorded-only Thread
  with the flag omitted, preserving the view, note and settings; Ollama remained
  absent (lab/evidence/35-f01-native.json and 35-f01-no-start.json).
  The original review is retained in evidence/35-review-r1.md; a fresh complete
  checkpoint review must close F-01 before it can be archived as resolved.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11622,"specSha256":"5d95af911d7f844b742dc6e72c40ba75bf8d8603a55c5e4953214bf7340a31cb","branch":"refs/heads/feature/fedora-desktop-launcher","head":"318b9f825984c87d245ba6f36169c0d3342efcf8","baseRef":"refs/heads/main","baseCommit":"d9c8c066707e62b9de4e7f2dab60e2a324448a95","sourceTree":"f4053a4a117be2332e43bac173b94759242fd5ff","landing":"local-merge","absentOptional":[]} -->

## Findings

### 35/F-01 [P2] closed - Optional startup flag does not use its specified false default

**File:** src/desktop/launcher.ts:32
**Found:** 2026-10-20 by /audit (scope: current; lens: quality, tests)
**Why it matters:** The active feature's version 1 config contract says
`ollama.startIfMissing` defaults to `false`. `launcherConfig` instead requires a
boolean and rejects an otherwise valid config containing only `ollama.port`.
A direct Node invocation confirmed the omission produces the unsupported-config
error. Generated configs include the field, so the documented first-use path
works and startup still fails closed; this is a nonblocking schema mismatch.
**Suggested fix:** Default an absent flag to `false` while continuing to reject
present non-booleans. Add an assertion that omission yields recorded-only startup
policy. No new abstraction or dependency is needed.
**Resolution:** Repair attempt 1 defaults omission to false while rejecting
present non-booleans. Regression tests cover omitted consent, no server startup
and null rejection. Verify passes all 208 tests; actual isolated CLI with the flag
omitted opens recorded-only Thread and leaves Ollama absent. Evidence:
`.thread-local/continuous-35-plus/evidence/35-f01-verify.log` and
`lab/evidence/35-f01-native.json`, `35-f01-no-start.json` under that run.
Closed by fresh independent automatic review on 2026-10-20 against
`318b9f825984c87d245ba6f36169c0d3342efcf8`. The complete feature delta was
reviewed across quality, security, performance and tests, including this file's
parser and startup callers. Omission now becomes false; present null/non-boolean
values remain rejected. The exercised absent-server path records no start call.
Reviewer-run `npm run verify` passed strict typecheck, all 208 tests with no
failures/skips, and production build. Inspected native omitted-consent and
no-start evidence above confirms recorded-only launch. No new defect was found
in the repair; no finding was accepted or waived.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 318b9f825984c87d245ba6f36169c0d3342efcf8
**Base commit:** d9c8c066707e62b9de4e7f2dab60e2a324448a95
**Base ref:** refs/heads/main
**Spec hash:** 5d95af911d7f844b742dc6e72c40ba75bf8d8603a55c5e4953214bf7340a31cb
**Prepared by:** codex
**Builder model:** unknown (runtime did not expose exact model)
**Requested reviewer:** codex
**Requested model:** gpt-6.1-sol
**Requested execution:** automatic
**Requested at:** 2026-10-20T16:54:50.005039+00:00
**Workflow:** continuous
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T16:56:18.748124+00:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `d9c8c066707e62b9de4e7f2dab60e2a324448a95..318b9f825984c87d245ba6f36169c0d3342efcf8` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main 318b9f825984c87d245ba6f36169c0d3342efcf8`, `sha256sum blueprint/context/current-feature.md`: passed; exact request target, base and spec identity verified. Current spec bytes also equal the tracked target blob.
- `git status --short`, `git diff --name-only HEAD`, `git diff --cached --name-only`, `git ls-files --others --exclude-standard`: passed; before review writes only review.md differed, with no staged or untracked paths.
- `git diff d9c8c066707e62b9de4e7f2dab60e2a324448a95 318b9f825984c87d245ba6f36169c0d3342efcf8 -- <reviewed paths>`: passed; complete feature delta inspected, excluding generated findings/request history from product-code scope.
- `git diff --check d9c8c066707e62b9de4e7f2dab60e2a324448a95 318b9f825984c87d245ba6f36169c0d3342efcf8`: passed.
- `npm run verify`: passed with temporary loopback binding permission; strict typecheck, 208 tests passed, 0 failed/cancelled/skipped/todo, production build passed. No sandbox-denial result was treated as a product failure.
- Targeted `rg` search for skipped/focused/placeholder tests in src/desktop and the launcher script: no matches.

## Evidence

- Generic fresh Codex child started without the builder transcript; supplied runtime model gpt-6.1-sol matches the request. Installed project-local Audit and independent-review contract applied. Product/spec/config remained frozen; reviewer edits are confined to findings.md and review.md.
- Complete reviewed range: `d9c8c066707e62b9de4e7f2dab60e2a324448a95..318b9f825984c87d245ba6f36169c0d3342efcf8`, base refs/heads/main, branch feature/fedora-desktop-launcher. Reviewed README.md changes, docs/launcher.md, package.json, scripts/launch-thread.mjs, src/desktop/launcher.ts and launcher.test.ts, src/main.ts changes and adjacent lifecycle/openThread callers, and the active spec. Checked AGENTS.md, configured gates, overview, coding standards and feature 35 build-plan contract. Existing test/build configuration and installed Obsidian API declarations were inspected where relevant.
- Quality: config/default validation, exclusive artifact writes, diagnostics and repository patterns checked. Security: literal argv/no shell, Desktop Entry escaping, bounded direct IPv4 loopback status, redirect/cloud refusal, explicit startup consent/environment, regular non-symlink log leaf and receiving-vault guard checked. Performance: bounded metadata/status/readiness and lifecycle handling checked. Tests: six launcher tests exercise schema/preflight, escaping/collisions, live HTTP refusal/timeout/size/status cases, startup policy and a real child argv/environment boundary; full Verify passed.
- Native evidence inspected under `.thread-local/continuous-35-plus/lab/evidence/`: 35-native-launch.json, 35-repeat-offline.json, 35-mismatch.json, 35-cli-cloud-refusal.json, 35-owned-runtime.json, 35-cold-acceptance.json, 35-f01-native.json and 35-f01-no-start.json. These record real isolated Obsidian/Flatpak cold/warm launch, one reused Thread view, preserved open note/settings, offline recorded mode, mismatched-vault refusal, cloud refusal before application startup, and one owned cloud-disabled Ollama startup followed by reuse.
- Visually inspected 35-cold-home.png: native Obsidian shows the retained Welcome note beside Thread project home. `.thread-local/continuous-35-plus/desktop-escaping/result.json` records successful native Gio Desktop Entry parsing of special-character arguments and its fixture limitations. Native evidence was inspected, not independently rerun in this review.
- Exclusions: node_modules/dependency internals except relevant API declarations; generated bundles/PDF resources, dist, caches, historical features and unrelated product areas. Ignored native reports/screenshots were evidence inputs, not authored product code. No dependency or configuration change was introduced by the feature.

## Findings

- F-01 [P2] closed after independent re-examination of the defaulting repair and its exercised startup path. Omitted consent becomes false, null/non-booleans fail, and absence causes recorded-only operation with no start call. No findings added or accepted; no remaining open/fixed P0/P1 findings. No repair order remains.
- No new findings across quality, security, performance or tests for the complete target delta.

## Remaining risk

- Native acceptance is retained builder-run evidence inspected by this reviewer; the reviewer did not relaunch the graphical host or real Ollama. Check is manual in Continuous configuration and was not required by this request.
- The desktop parsing capture used Terminal=false; generated user artifacts retain Terminal=true. The shortcut was not installed into the user's account. Interactive terminal integration was not independently rerun. Literal backslashes in the helper checkout directory are documented as unsupported by Node ESM; the passing parser capture covers a backslash in the config argument.
- Native cold launch previously exhausted host inotify instances; the inspected passing cold acceptance followed the user's temporary increase to 256. No general guarantee is made for an exhausted desktop environment or other platforms/host versions.
- No dedicated lint, security scanner, performance profiler, browser harness or CI command is configured. Security/performance conclusions come from source review, bounded-work tests and retained runtime evidence, not a vulnerability scan or load benchmark. No attempted verification command remained unavailable.

## Try it now

Run or do:

From this checkout, inspect the generated synthetic launcher configuration:

```bash
cat .thread-local/continuous-35-plus/launcher-artifact/launcher.json
```

Expected:

Version is 1, the vault path ends in this run's `lab/vault`, the Obsidian kind is
`flatpak`, and `ollama.startIfMissing` is `false`. This artifact is for inspection;
it has not been installed into your account.

This proves:

The generated configuration names its vault explicitly and leaves runtime startup
opt-in. It does not prove a desktop launch. To configure your own vault, follow
`docs/launcher.md`; copy its real vault ID from Obsidian first.
