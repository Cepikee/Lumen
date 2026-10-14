# Latest research checkpoint — C01 numeric scope safety

2026-10-10. Current working tree, no commit/push. Supersedes checkpoint 12 as
the continuation position, without changing historical audit artifacts.

Report: `docs/UTOM_V2_2/c01_post_repair_20261010/REPORT.md`.

- C01: PARTIAL-PASS in tested safety scope.
- 49 new targeted tests; all V2.2 tests: 388/388 PASS, 0 FAIL.
- SECOND frozen 90 decisions: CR 51, WR 1, CU 7, missed 31.
- Precision 51/52 = 98.08%; resolution 52/90 = 57.78%.
- C01-related WR: 5 → 0. Remaining P1 attribution WR untouched.
- W4 safe unresolved, T5 incomplete per-carriage capacity (not full successes).
- Evidence 1244/1244 exact occurrences. Canonical projection OFF.
- SECOND_BLIND_CORPUS_RESULT: FAIL.
- NEXT_REAL_WORLD_BLIND_TEST_READY: NO.

## RESUME FROM HERE

Review C01 POST report and its exact 90-item adjudication. Next separate blocker
is SB2-03/P1 attribution source composition/reporting/quote recovery, only under
a subsequent scoped task. Preserve all SECOND_BEFORE_REPAIR inputs, gold,
journals and output. Do not broaden this task to all misses or production.
