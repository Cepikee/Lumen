# FRESH_BLIND_GENERALIZATION — immutable first-pass measurement

2026-10-12. Research only, current working tree on `develop/utom-recovery`, HEAD
`d145120c6e044b4f25d1d7b94e87846652ef80ba`. HEAD alone is **not** the tested engine:
the existing uncommitted C01/C02 and other research work is included and frozen.

**FRESH_BLIND_GENERALIZATION_RESULT: FAIL**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**

**MEASUREMENT INTEGRITY: PASS**

**REQUESTED LINGUISTIC SUBCASE COVERAGE: PARTIAL**

Five wrong numeric/scope decisions and one wrong source decision show that the
known-corpus safety gains do not yet generalize reliably. This is not a reason to
change the immutable first output or repair the engine within this measurement.

## Origin and design

- UNSEEN EXISTING RAW MATERIAL: **0**. Prior non-use could not be established.
- NEW SYNTHETIC MATERIAL: **20 snippets**, **20 domains**.
- **60 authored editorial sentences**; the existing NLP segmenter returned **64**.
  The difference is quotation segmentation, not an increase in authored material.
- **120 precommitted decisions**: 107 resolution goals, 13 abstention goals.
- **16 prelisted adversarial combination decisions**.
- No external internet/provider, no answer key given to the binder.
- Same assistant authored the sample/gold and manually assessed it: **not
  externally independent**, and not a published-article blind test.
- Exact normalized sentence collision screen: 0 against 88 prior text records
  in the real-text-a fixture directory and SECOND corpus. This limited screen is
  not proof that every abstract structure is novel. Wording and compositions are
  newly authored; standard contrasts necessarily share linguistic forms.

The core sample-size requirements are met. Some requested microcases are missing
(plain source `X szerint`, true morphological passive, a clean nested pair of
finite reporting verbs). See `coverage_and_errata.md`; no claim of 100% requested
linguistic coverage is made. No extra inference was added after observing outputs.

## Freeze and one-pass execution

`freeze.json` records the initial branch/HEAD/status, tracked binary diff hash and
104 experimental/fixture/test/protected file hashes before corpus authoring.
Its baseline field says PENDING because it was written before test execution;
the immutable completed result is `baseline.json` and `tests_before.txt`.
`freeze_intelligence_supplement.json` adds 64 V2/V22 library hashes before corpus
authoring. Total **168 unchanged files**.

`corpus.json`, `expected.json`, `selected_items.json` and `input_manifest.json`
were written before any fresh inference. The manifest contains their SHA-256s.
Only raw snippet text went to the local NLP worker, and only text plus its
annotation went to the existing research `bind` entrypoint. All 20 calls completed
once. Each result was immediately journaled using exclusive creation, followed by
exclusive creation of `FRESH_BLIND_BEFORE_REPAIR_raw.json`. No replays, repairs or
first-pass overwrites occurred. All journal records match the combined artifact.

First-pass SHA-256:
`061fbdcd504f1fcc9df5b8db6c5ce9a09773e0b1b5ada6862ab51f10efa3e0a2`

Tracked diff SHA-256 before = after:
`18d84da90199d39df00a2dbe10a9a5c94dab61cebcbfa97bddd144f1dfc6dc3c`

## Results against the original frozen gold

| Metric | Result |
|---|---:|
| Total decisions | 120 |
| CORRECT_RESOLVED | 40 |
| WRONG_RESOLVED | 6 |
| CORRECT_UNRESOLVED | 13 |
| MISSED_DEFENSIBLE_RESOLUTION | 61 |
| NOT_APPLICABLE | 0 |
| Resolved precision | 40/46 = **86.96%** |
| Resolution rate (correct + wrong resolved) | 46/120 = **38.33%** |
| Correct-resolution coverage | 40/120 = **33.33%** |
| Overall correct including abstention | 53/120 = **44.17%** |
| Wrong / resolved | 6/46 = **13.04%** |
| Wrong / total | 6/120 = **5.00%** |
| Exact output evidence offsets | **1684/1684**, 0 failures |
| Distinct snippet/start/end/text evidence spans | **473/473** exact |

These are descriptive results for this constructed sample, not statistical
estimates of general Hungarian-news performance. Several items share frames
(e.g. E3/E4 test separate qualifiers), so decisions are not independent trials.

| Dimension | Total | Correct resolved | Wrong resolved | Correct unresolved | Missed |
|---|---:|---:|---:|---:|---:|
| Actor | 16 | 3 | 0 | 6 | 7 |
| Attribution | 23 | 5 | 1 | 2 | 15 |
| Numeric | 23 | 4 | 4 | 1 | 14 |
| Temporal | 9 | 5 | 0 | 0 | 4 |
| Ordinal/rank | 10 | 5 | 0 | 2 | 3 |
| Contrast/negation | 21 | 8 | 0 | 1 | 12 |
| Entity boundary | 7 | 4 | 0 | 1 | 2 |
| Modality/scope | 11 | 6 | 1 | 0 | 4 |

Every item is listed with original expectation, label, explanation and raw JSON
pointers in `labels.json` and `human_item_audit.md`. “Human” in the requested
filename means human-readable; this is assistant manual adjudication, not an
independent human-expert sign-off. Two gold wording ambiguities (L1/R3) are separately
documented as errata without changing gold, denominator or labels. Neither is one
of the six wrong-resolved decisions.

We assess explicit slots even when the enclosing frame is unresolved. In
particular, `numericArguments[].binding=resolved` or
`sourceEvidence.resolutionStatus=resolved` is not excused by a frame-level unresolved
flag. Conversely, incomplete **unresolved** candidates are misses, not wrong facts.
Safety-only items can be satisfied by explicit denial/block evidence (e.g. N5).

## Prior family transfer

“Regresszált” here means a failure to transfer the earlier family guarantee to new
wording; it does **not** mean old regression tests became red. All 424 remain green.

| Family | Finding | Fresh evidence and limits |
|---|---|---|
| B01 compound measurement | **regresszált** | E2/J4/K2/L4/S2 preserve compound units conservatively, but O2 loses kg denominator and resolves plain money. |
| B02 quote/source recovery | **generalizált, limited tested safety scope** | I6/Q3 recover quote source (Q3 recipient too); F1 preserves intermediary but misses original source. A2/G3 are misses. No wrong quote-source identity observed; no claim of full recall. |
| B03 conservative recall | **regresszált in recall transfer** | All 13 abstention gold items safe, but only 3/10 defensible actor goals resolved; explicit actor/source forms still frequently missed. Safety aspect partially transfers. |
| C01 numeric scope/modality | **regresszált** | Bounds/possibility work in E3/H3 and conditions K3/S5, but C2/C4/E4/J5 lose operator, change, condition or range. |
| C02 source composition | **regresszált** | C1/E1/S1 recover possessive nominal source; O1 promotes árjegyzéke to source. K1 also misses propagation to the admission clause. |

No family is labeled not exercised: all five have direct cases. This does not
override the narrower coverage gaps listed above. SECOND's 52 CR / 0 WR / 100%
precision was a tuned post-repair corpus, not an independent benchmark. Its
denominator and difficulty differ; do not infer a causal percentage-point change
from SECOND versus this corpus.

## At most three next blockers — no repairs performed

1. **FB-01 HIGH — numeric dimension/operator/condition loss:** C2/C4/E4/J5/O2.
   Safety defect; likely numeric-scope, compound-rate and dependency binding.
2. **FB-02 HIGH — source head versus originating entity:** O1.
   Safety defect; likely source-composition gate and dependency source fallback.
3. **FB-03 MEDIUM — compositional recall:** source chains, explicit actors,
   rank ownership, complex corrections. Recall defect; multiple research stages.

See `failure_taxonomy.md` for exact patterns and bounded root-cause hypotheses.
The two HIGH safety groups suffice for NO readiness regardless of gold errata or
unexercised microcases. Evidence offset correctness alone is not semantic correctness.

## Validation and boundaries

- Before: **424/424 PASS, 0 FAIL** (25 V2.2 test files).
- After: **424/424 PASS, 0 FAIL**.
- Frozen files unchanged: **168/168**.
- Original corpus/gold/selected hashes unchanged; journal/composite agreement PASS.
- Existing working-tree status outside this new directory unchanged.
- Canonical projection **OFF** on all 20 results; canonical arrays empty.
- Engine edits **0**, test edits **0**, paid AI/provider calls **0**.
- Production/production DB untouched; no full project suite, build, preflight,
  commit, push or deploy.

**FRESH_BLIND_GENERALIZATION_RESULT: FAIL**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**

Stop here for owner/technical review. Do not tune SECOND or this frozen sample in
this measurement. Future repairs require a separately scoped task.
