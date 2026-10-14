# FB-01 — numeric qualifier bundle safety

2026-10-12. Research-only current working tree. No commit, push, production change,
paid provider, full project suite, build, preflight or deployment.

**FB-01: PARTIAL-PASS (specified safety cases closed; not complete numeric understanding).**

**FB-02: OPEN — unchanged. FB-03: OPEN — not repaired.**

**FRESH POST: PARTIAL. NEXT_REAL_WORLD_BLIND_TEST_READY: NO.**

The original FRESH first-pass FAIL remains immutable. This replay is a post-repair
measurement on known text, not a new blind/generalization experiment.

## Investigated root causes and changes

All five original expected items, labels, manual audit and raw numeric/token paths
were inspected before editing. `root_causes.md` preserves that investigation.

| Case | Root cause | POST |
|---|---|---|
| C2 | Scope handled premarkers/postpositions, not governing threshold predicate; potential suffix remained in NLP lemma | Connected predicate carries greater_than alongside possible. Correct resolved. |
| C4 | Change-verb family omitted bővül despite instrumental percentage and local predicate path | change_magnitude/increase distinct from resulting_level. Correct resolved. |
| E4 | Nominal esetén adjunct was absent from inherited finite-clause condition handling | Full nominal condition span and predicate path retained alongside possible/max11h. Correct resolved. |
| J5 | Range regex could not cross an intervening unit before között | Both endpoints carry shared range and abstain; full measurement target unresolved. Missed defensible resolution. |
| O2 | Denominator suffix handling omitted ónként; ignored Case=Dis and retained defective lemma | 412 HUF/kg compound candidate, no simple money equality. Missed defensible resolution. |

Shared failure: successful numeric attachment fell through to equality when a
dimension/operator/condition recognizer missed its structure. Attachment is not
proof of an unconditional fact.

## Representation and boundaries

Existing `compound` and `semanticScope` structures are extended, not replaced:

- Morphological distributive case plus bounded raw suffix fallback detects
  denominator evidence independently of a closed unit list.
- Slash dimensions survive split/mistagged tokens; a scaled denominator such as
  `liter/100 km` retains both `km` and scale `100`.
- Compound quantities remain unresolved candidates with numerator, denominator,
  path, qualifier and exact raw evidence. No guessed owner or canonical fact.
- Local predicate, dependency path, preverb, postposition and unit case distinguish
  thresholds, percentage change and resulting level. Instrumental comparative
  differences with unproven reference abstain rather than become thresholds.
- Explicit/inherited bounded conditions and nominal adjunct conditions retain
  evidence in numeric scope. Broken local scope becomes unresolved.
- Ranges support intervening units, dash, -tól/-ig and paired lower/upper bounds.
  Their endpoints cannot be independent positive equalities.
- No promotion of unproven numeric paths. Existing actor/source/rank recovery is
  unchanged. Projection remains OFF, including resolved qualified attachments.

## Changed and new files

Existing code modified (exactly two):

- `scripts/experimental/compound-rate-safety.cjs`
- `scripts/experimental/numeric-scope-safety.cjs`

New generalized development/regression material:

- `scripts/experimental/fb01-development.cjs`
- `tests/fixtures/real-text-a/fb01-annotations.json` — 42 actual local NLP snippets
- `tests/fixtures/real-text-a/fb01-simple-share.json` — one extra positive control
- `tests/unit/v22-fb01-numeric-bundle.test.cjs` — **53 new tests**

Measurement documentation/scripts are isolated in this directory. Continuation
checkpoint: `docs/UTOM_V2_2/real_text_round_a/15_fb01_checkpoint.md`.

## Validation

Baseline **424/424 PASS**, final **477/477 PASS**, **0 FAIL**.

The 53 new tests cover simple equality controls, ten denominator forms, denominator
scale, comparison/rate composition, four range forms, six conditional constructions,
potential/condition/limit composition, percentage delta/result, negated comparison,
bounded correction, owner/source separation, sibling isolation, multiple quantities,
broken dependencies/POS/lemmas/missing denominator token, and exact evidence.
No fresh-blind sentences are copied into the new regression fixtures.

- **B01 regression: NO in the existing suite.** New fallback closes the fresh kg case.
- **C01 regression: NO in the existing suite.** Simple money/count/share/measurement/
  year/date controls remain resolved where their original attachment is supported.
- **C02/source behavior changed: NO in measured coverage.** On all 20 replayed
  snippets, deep comparison of entities, source chains, nominal relations, per-frame
  source/recipient/claim-owner/evidence, actor/action/polarity/contrast is identical.
  Existing C02 tests remain green. This is bounded evidence, not universal proof.
- All original FRESH files unchanged. Only the two intended preexisting research
  source files differ from the task-start hash inventory.
- Canonical arrays empty and projection OFF on all 20 POST records.

## Same frozen 120-decision score

| Metric | BEFORE | POST |
|---|---:|---:|
| CORRECT_RESOLVED | 40 | 43 |
| WRONG_RESOLVED | 6 | 1 |
| CORRECT_UNRESOLVED | 13 | 13 |
| MISSED_DEFENSIBLE_RESOLUTION | 61 | 63 |
| Numeric WRONG_RESOLVED | 4 | 0 |
| Modality/scope WRONG_RESOLVED | 1 | 0 |
| Resolved precision | 86.96% | **97.73% (43/44)** |
| Resolution rate | 38.33% | **36.67% (44/120)** |
| Overall correct including abstention | 44.17% | 46.67% |
| Exact evidence offsets | 1684/1684 | **1731/1731** |

POST distinct evidence spans: **478/478**, failures **0**. More evidence spans reflect
added qualifiers, not additional decisions. No new numeric wrong-resolved item was
found in the frozen 120 decisions. All numeric slot differences were inspected;
unchanged source/actor/contrast labels retain their original assessment and errata.

J5/O2 becoming safe unresolved is **not** counted as correct resolved. Hence lower
resolution and two extra misses. The safety improvement is not a recall gain.

The single remaining selected wrong resolution is **O1 / FB-02**, the price-list
head used as source entity. It is unchanged and deliberately not repaired.

## Remaining limitations

- Full lossless compound owner/property resolution remains unsupported; ambiguous
  ranges and unsupported dimensions abstain.
- Morphology/dependency errors outside the tested forms may still escape detection;
  arbitrary semantic comparisons and every capacity formulation are not solved.
- The BEFORE appendix observation H frame2 (`két ember` attached to `állapotát`)
  remains outside the fixed denominator and unchanged. The reported numeric 0 is
  **0 selected wrong resolutions, not proof that every emitted numeric slot is safe**.
  No source/actor or general owner-recall extension was attempted in this task.
- The original corpus coverage gaps and two gold errata remain. No new external
  blind readiness is claimed.

These limits justify PARTIAL-PASS, not a claim of a generally complete numeric
interpreter. The requested five safety failures are eliminated; stopping here
preserves FB-02 as the next separately authorized blocker.

**FB-01: PARTIAL-PASS**

**FRESH POST: PARTIAL**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**
