# Repeatable local quality evaluation

These are authored synthetic fixtures. References and negative controls are
human test data, not recorded model responses. Curated phrase, section, status
and source-path checks expose regressions; they cannot judge every claim's
meaning. A pass is not a semantic correctness guarantee.

Classification fixtures also cover recorded postponements, accepted/proposed/
superseded decisions, unsupported interpretations and genuinely new actions.
The runtime conservatively labels complete quoted statements from known records
as recorded statements; paraphrases and model-labelled facts without that match
remain interpretations. A quoted statement is still only a record, not verified
truth. Quotes from unknown/generated source kinds are not promoted to records.
The matcher also requires a whole original section: clipped passages, partial
index/search windows, selected text and missing boundary provenance do not
promote model claims. This deliberately rejects some complete interior quotes.
This deliberately misses some valid paraphrases and unusual Markdown structure.
Human review of excerpts remains necessary; valid citations and kind labels do
not prove support. The legacy fact/interpretation/suggestion values are retained.

During feature 38, a local `qwen3:4b-instruct` collection on 2026-10-20 passed
14 of 15 cases after the complete-line matching refinement (zero infrastructure
errors). All 11 pre-existing cases passed. The remaining decision-classification
case expected exact recorded statements; the model paraphrased two statuses, so
the app conservatively showed interpretations with the original recorded statuses
alongside them. The earlier 13/15 report and subsequent report are retained in
the ignored run evidence. Expectations were not weakened to make the model pass.
Scores describe these synthetic runs, not unseen notes or guaranteed future runs.

```bash
npm run evaluate
```

The default mode makes no network request. It checks every reference through
the product validator and confirms the evaluator rejects each negative control.
This validates the harness, not a model. Ordinary `npm run verify` includes the
pure evaluator tests without requiring Ollama or Obsidian.

To collect a real model baseline, start an existing local Ollama with cloud
features disabled and use the exact name of a downloaded local text model:

```bash
npm run evaluate -- --live --model qwen3:4b-instruct \
  --endpoint http://127.0.0.1:11434 \
  --output .thread-local/quality-baseline.json
```

Only these committed synthetic cases are sent. Thread's existing loopback,
cloud-disabled and local-completion checks apply. No vault scan, account, model
download or paid service is introduced. Output creation is exclusive: use a new
filename for every report. Ctrl+C cancels. Live collection reports each observed
failure while completing normally; add `--strict` to fail the command when any
curated check fails. Infrastructure/model errors are reported separately and make the command fail even in collection mode. Read
both the counts and the individual outputs before deciding a model is useful.
The fixed fixture clock makes reference checks repeatable; real native Obsidian
uses its actual clock and file metadata.

## Native Obsidian smoke collection

Export only to a new direct child of this repository's ordinary ignored
`.thread-local` directory:

```bash
npm run evaluate -- --export-vault .thread-local/quality-vault
```

Install the current three plugin files in that synthetic vault, enable Thread,
configure its local model and open Obsidian with loopback CDP on port 9223.
Use a separate profile and synthetic vault, never your personal vault.

```bash
THREAD_CDP_OUTPUT_PATH=.thread-local/native-quality.json \
  node scripts/obsidian-cdp.mjs --script scripts/evaluation/obsidian-quality.js
```

The smoke collector requires the exported synthetic marker. It scopes five
native briefing/Ask scenarios to their fixture folders, collects actual output,
then restores settings. It refuses to run with open Thread dialogs or pending
changes/recovery. It does not save or modify notes and is not a semantic pass
claim. The CDP helper is developer tooling, never bundled into the plugin.
Test runtimes, weights and collected reports stay ignored.

Live briefing cases evaluate the recorded-first Resume composition. Reports retain `modelOutput` separately so model mistakes remain inspectable. Default reference/negative-control self-checks continue to exercise the curated evaluator directly.

The `pdf-page-support` quality case checks answer support across two authored
page excerpts. It is a text-quality fixture, not binary consent or parser proof.
PDF binary/page/hash/freshness regressions run in Verify; native PDF acceptance
uses the packaged worker, authored PDFs, exact consent and the actual viewer.
