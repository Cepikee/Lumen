# Latest research checkpoint — SECOND blind measurement

2026-10-10. Measurement closure only; no engine/test edits, commit or push.

Report: `docs/UTOM_V2_2/second_blind_20261009/REPORT.md`.
Item-level adjudication: `human_item_audit.md` and `labels.json` in that directory.

- 15 new snippets / 15 domains; 35 editorial sentences / 40 NLP sentences.
- Frozen denominator: 90 selected decisions; CR 47, WR 6, CU 7, missed 30.
- Resolved precision: 47/53 (88.68%); resolution: 53/90 (58.89%).
- Raw evidence offsets: 903/903 exact occurrences, including repeated spans.
- V2.2 targeted tests before and after: 339/339 PASS, 0 FAIL.
- 386 frozen file hashes, tracked diff, HEAD, input hashes and first-pass
  integrity verified unchanged. 15 inference calls; no rerun.
- This is a synthetic text-disjoint holdout authored and evaluated by the same
  assistant, not externally independent validation. Preparation coverage gaps
  and strict qualifier-scoring sensitivity are documented in the report.
- SECOND_BLIND_CORPUS_RESULT: FAIL.
- NEXT_REAL_WORLD_BLIND_TEST_READY: NO.
- Canonical projection OFF; no production change or paid/external AI call.

## RESUME FROM HERE

Next action: owner/technical review of the three proposed blockers in
`docs/UTOM_V2_2/second_blind_20261009/failure_taxonomy.md`:

1. SB2-01: numeric dimension and comparison/reference compatibility.
2. SB2-02: upper-bound and possibility retention on positive edges.
3. SB2-03: attribution source composition and reporting/quote coverage.

Review the four strict qualifier classifications W5/T5/K2/K3 separately from
the categorical errors P1/W4. K2/K3 overlap one event and are not independent bugs.
Do not overwrite expected labels, journals or SECOND_BEFORE_REPAIR raw output.
No repair is authorized by this measurement task. A later authorized repair
must preserve this baseline and write separate POST artifacts.
