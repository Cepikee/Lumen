# NLP measurement pipeline checkpoint — 2026-10-13

CURRENT POSITION: infrastructure-only recovery and repeatability gate complete.
Supersedes checkpoint 16 only for infrastructure readiness; FB02 metrics unchanged.

- Targeted suite 548/548 PASS (533 baseline + 15 transport regressions).
- Ubuntu-24.04 WSL2; Python 3.12.3; spaCy 3.8.16;
  HuSpaCy 0.12.1 / hu_core_news_md 3.8.0.
- Fresh neutral text, independent process repetition, UTF-8, exact UTF-16 offsets,
  clean exit and live WorkerClient PASS.
- Golden annotations 4/4 identical; historical model hashes identical.
- 113 semantic file hashes unchanged; canonical projection still OFF.
- Fixed stale default /tmp environment path; diagnostic details retained.
- Historical WSL RPC failure not reproduced; underlying historical cause unknown.

NEW_UNSEEN_MEASUREMENT_READY: YES (measurement infrastructure only).
NEXT_REAL_WORLD_BLIND_TEST_READY: NO.

NEXT ACTION / RESUME FROM HERE: await a separately authorized unseen measurement
or blind-preparation task. No blind inference, FRESH tuning, FB03 or production
integration was started. If WSL fails again, preserve the new error diagnostics
and stop measurement; do not silently replace fresh annotation with fixtures.

Evidence: ../nlp_pipeline_recovery_20261013/REPORT.md and verification.json.
