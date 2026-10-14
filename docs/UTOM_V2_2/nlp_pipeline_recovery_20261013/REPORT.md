# Local NLP / WSL measurement recovery — 2026-10-13

Branch develop/utom-recovery; HEAD d145120c6e044b4f25d1d7b94e87846652ef80ba.
Existing dirty working tree retained; status_before.txt and semantic_freeze.json
record the starting state. Scope: transport/environment only, no semantic tuning.

## Diagnosis and minimal repair

Historical failure: worker_exit and Wsl/Service/RPC_S_CALL_FAILED during FB02.
The historical Windows RPC failure **did not recur** in this session. Its host
root cause is unknown; it must not be relabeled as a Python/model error.
The exact active collector invocation already succeeded on the first minimal
probe, without installing anything or restarting WSL. See reproduction.txt for
the exact command, cwd, complete stdout/stderr, exit 0 and input response.

A separate, current repository defect was reproduced: WorkerClient's default
PYTHONPATH pointed at /tmp/utom-morph-research, which no longer exists. This
produced exit 1 and ModuleNotFoundError: hu_core_news_md. Current collectors
already use the persistent /home/mark/.local/share/utom-morph-research directory.
The default was aligned with that existing environment. No package upgraded.

The client also discarded process stderr and exit codes. It now preserves an
8192-character diagnostic tail and exit details on hard failures, retaining the
existing message strings. Non-object JSON and empty/invalid full-worker
annotations are rejected. Explicit safeRequest fallback remains labeled
deterministic-only with annotation:null; it is not a successful NLP annotation.
Measurement validation uses request and requires clean EOF/exit 0.

The first strict-validation attempt affected shared partial-clause validation
and caused 143 test failures. That attempt is retained in
targeted-tests-first-attempt.txt. The shared validAnnotation function was restored
to its original contract; the stricter validWorkerAnnotation runs only at the
worker protocol boundary. Final suite is green; no semantic module changed.

## Environment and invocation

- Windows cwd: F:\Projekt2025\Lumen.
- WSL: Ubuntu-24.04, WSL2; wsl.exe --status and distro list captured.
- Windows → wsl.exe -d Ubuntu-24.04 → env with persistent PYTHONPATH →
  python3 /mnt/f/Projekt2025/Lumen/scripts/experimental/morph-worker.py.
- Python: /usr/bin/python3, 3.12.3; prefix /usr; pip 24.0.
- spaCy 3.8.16; HuSpaCy 0.12.1; hu_core_news_md 3.8.0.
- Model directory: /home/mark/.local/share/utom-morph-research/hu_core_news_md.
- Locale C.UTF-8 for character handling; Python stdin/stdout UTF-8.
- wslpath conversion verified: /mnt/f/Projekt2025/Lumen.
- Protocol: newline-delimited UTF-8 JSON; ready record followed by request-ID
  correlated annotation/error responses. Raw offsets are UTF-16 for Node.
- No HTTP/provider/paid API call is involved.

Full environment, model hashes and commands: environment.json. Old version
record: ../morph_clause/07_model_environment.json. All recorded old model-file
hashes match; versions match. There is a model-root relocation, no model drift.

## Acceptance evidence

Fresh neutral smoke text contains all nine Hungarian accented characters,
inflected words, Hungarian quotes, em dash, date, percentage, number and an emoji
to exercise Python-codepoint → Node-UTF16 offsets. It is a transport probe, not a
blind semantic corpus and was not passed to the semantic binder.

Two independent worker processes annotate it identically; both exit 0. A live
WorkerClient then reproduces the same annotation. Final repaired client repeats
it twice with strict schema validation and clean EOF/exit 0. Sentence count 3,
token count 19. All token/sentence/entity raw slices exact. UTF-8 PASS.

Four golden raw inputs (institution, nested, modal, nested_possessor) were
annotated in both fresh processes. Token text/offsets, lemma, POS, morphology,
dependency/headStart, sentence segmentation and entities are deep-equal to the
frozen annotations: **4/4**, no unexplained drift. Metadata latency/RSS excluded.
Evidence: live_runs.json, golden_comparison.json, reproducibility.json,
client_live.json and verification.json.

New transport regressions: **15**. Missing executable, model-like startup error,
nonzero exit, malformed/non-object JSON, rejected request, empty-success payload,
invalid offsets/heads/dependencies, duplicate tokens, persistent default and valid
UTF-16 annotation. Existing crash/timeout/out-of-order tests also pass.

Final tests/unit/v22-*.test.cjs: **548/548 PASS, 0 FAIL**.
Semantic freeze: **113 files, 0 hash changes**. No binder execution or FRESH replay
was needed. The previous FRESH/FB01/FB02 artifacts, gold and user-owned files are
unchanged under the all-pre-existing-files hash comparison.

## Files changed

Pre-existing files:
- scripts/experimental/morph-worker-client.cjs — default path, diagnostics,
  strict full-response validation, non-object JSON rejection.
- tests/unit/v22-morph-clause-research.test.cjs — simulated normal worker now
  emits explicit ROOT/headStart fields required by the actual worker contract.

New:
- tests/unit/v22-nlp-transport-recovery.test.cjs.
- This checkpoint directory: environment/probe/reproduction/root cause,
  validation scripts and outputs, hashes, test logs, verification and report.
- ../real_text_round_a/17_nlp_pipeline_checkpoint.md.

Python annotation worker, semantic rules, package files, gold labels and prior
artifacts unchanged. No production changes, commit, push, deploy, full project
suite, build/preflight or new blind inference.

## Gate / next position

LOCAL NLP PIPELINE: PASS in the observed session.
NEW_UNSEEN_MEASUREMENT_READY: YES — infrastructure acceptance only.
NEXT_REAL_WORLD_BLIND_TEST_READY: NO — semantic/generalization readiness is a
separate decision; this task supplies no new blind semantic quality evidence.

Historical RPC intermittency is not proven permanently eliminated. If it recurs,
the measurement must hard-fail and retain diagnostics; never substitute frozen
annotations and describe the result as fresh NLP inference.

Stop here. The next separately authorized step may prepare a new unseen
measurement from this frozen semantic state. Do not tune FRESH120 or start FB03.
