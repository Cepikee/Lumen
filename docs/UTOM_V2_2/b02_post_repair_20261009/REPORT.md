# B02 — source / quote recovery and sentence continuity

2026-10-09. Research-only, canonical projection OFF. No production changes,
external providers, paid AI, commit, push, deploy, build, preflight or full project suite.

## Root causes

1. Morphology-stage source selection reused a restricted actor selection rule.
   Explicit reporting subjects such as szóvivő / igazgató were consequently lost.
   The dependency gate recovered `szerint`, but not direct reporting subjects.
2. HuSpaCy can place a closing quote at the start of the following sentence.
   Quote coalescing included that whole parser sentence, then narrowed its
   semantic content to the quotation: the following independent sentence vanished.
3. Coalescing a second quotation could reuse the already-coalesced preceding
   quotation/reporting row and merge different speakers.

## Implemented research rules

- Isolate the closing delimiter before quote coalescing. Keep its following
  sentence as a separate row; discard punctuation-only rows, not semantic content.
- A completed quote row cannot become the preceding reporter of another quote.
  A following reporting clause requires an explicit dash bridge. A completed
  reporting sentence cannot retrospectively supply an unrelated quote's speaker.
- Recover direct source only with a unique nominative noun/proper noun `nsubj`
  governed by a recognized communication predicate, an explicit `hogy`
  complement with dependency linkage, or a bounded colon/hogy/dash quotation.
  Communication vocabulary alone and syntactic complement alone are insufficient.
- Do not resolve coordinated, pronominal, marked recipient or ambiguous source NPs.
  Dat/Ins/felé recipients have a separate role. Unknown speech predicates abstain.
- Re-run only the bounded inner proposition through the existing research core.
  Source remains distinct from action actor and numeric/temporal owner.
- Preserve denial and inner negation. Negative reporting does not become an
  asserted proposition. B01 compound rates still remain unresolved candidates.
- Preserve a dependency-proven outer `szerint` source as its own chain edge.
  Existing nested grammar remains authoritative for other unquoted chains.
- Recovered edges include raw source span, reporting predicate span, proposition
  span, dependency evidence, parent edge and target frame IDs, plus rule labels.
  The final dependency gate revalidates the source; no canonical writes occur.

## New regressions and limitations

31 new sentences annotated by the actual local HuSpaCy worker, plus a dependency
mutation negative control; **33 new tests**. Fixtures preserve the worker output.
Coverage: direct positive/negative/denial, quote-leading/trailing/colon/hogy,
`tette hozzá`, nested sources, Dat/Ins/felé recipients, absent speaker,
multiple speakers, unmatched delimiter, independent following reporting clause,
preceding unrelated report, following deadline/date/count/money/measurement/actor,
source+count/time, denied compound rate, and unsupported numeric correction.

All `tests/unit/v22-*.test.cjs`: **299/299 PASS, 0 FAIL**.
All original 266 tests remain unchanged. See `targeted-tests.txt`.

Explicit remaining limitations (not counted as successful resolutions):

- `nested`: actual parser marks the possessive speaker `szóvivője` as `obl`, not
  `nsubj`. Chain retains both candidates but stays unresolved; no flattening.
- `contrast`: actual `szerint` source attaches to the rejected numeric root;
  existing correction grammar does not resolve the generic counted head. Source
  and alternatives remain unresolved; rejected 14 never becomes resolved. A
  complete source+correction representation is not claimed. B03 was not repaired.
- `afterActor` / `afterDate`: the following sentence and values survive, but the
  parser attaches the person to the closing quote. Actor remains unresolved;
  the date candidate in `afterDate` also remains unresolved. Initial new assertions
  expecting actor resolution exposed this existing limitation; the final B02
  tests explicitly verify continuity and abstention, not a successful actor bind.
- Unknown reporting semantics, multiple possible subjects, more complex quote
  nesting and coreference remain conservative; this is not general discourse
  understanding or a complete reporting-predicate lexicon.

## Frozen corpus replay

The same seven **synthetic** raw texts and frozen annotations were replayed.
This is post-repair reassessment of a known corpus, **not a new independent blind
test**, not a new raw HuSpaCy run, and not general real-world precision.
The evaluator and implementation are not independently authored.

The selected 39-item denominator is unchanged. P and H output changed; E, A, S,
W and T remain identical at the persisted JSON contract. P's first nested frame
also remains identical. Reassessment retains all other labels.

| Selected item | B01 POST / B02 BEFORE | B02 POST |
|---|---|---|
| P6 | denied claim source missing | szóvivő source + claimOwner, denial preserved |
| H1 | quoted speaker missing | igazgató source + claimOwner, clinic actor still unresolved |
| H4 | following deadline sentence missing | separate October 17 boundary, year null, no source leakage |

| Metric | B02 BEFORE | B02 POST |
|---|---:|---:|
| Correct resolved | 25 | 28 |
| Wrong resolved | 0 | 0 |
| Correct unresolved | 2 | 2 |
| Missed defensible resolution | 12 | 9 |
| Resolved precision | 25/25 = 100% | 28/28 = 100% |
| Resolution rate | 25/39 = 64.10% | 28/39 = 71.79% |
| Exact raw evidence offsets | 302/302 | 343/343 |

Offset totals count all recursively represented `textSpan` occurrences, including
repeated references; they are not counts of unique claims. Zero failures.
No new WRONG_RESOLVED was found among the selected 39 decisions. This is not an
exhaustive adjudication of every newly emitted field or a universal safety proof.

`historical_integrity.json` verifies unchanged SHA-256 for all files in both
historical audit directories. `compound-rate-safety.cjs` is also hash-unchanged.
No BEFORE_REPAIR or B01 POST_REPAIR artifact was overwritten. The new replay
script uses exclusive output creation and refuses to overwrite its results.

## Files changed / added

- `scripts/experimental/role-scope-binder.cjs`: bounded quote coalescing.
- `scripts/experimental/source-scope-recovery.cjs`: new recovery stage.
- `scripts/experimental/real-text-a-binder.cjs`: research stage integration.
- `scripts/experimental/b02-post-repair-audit.cjs`: exclusive frozen replay.
- `tests/fixtures/real-text-a/source-recovery-annotations.json`.
- `tests/fixtures/real-text-a/source-recovery-boundaries.json`.
- `tests/unit/v22-source-scope-recovery.test.cjs`.
- This separate B02 artifact directory and `real_text_round_a/10_b02_checkpoint.md`.

## CURRENT POSITION / NEXT ACTION / RESUME FROM HERE

B02: **PARTIAL** overall; the original three selected corpus failures are repaired.
B01: unchanged. B03 code/architecture: untouched; its missing resolutions remain.

Next task: inspect the frozen `contrast` and `nested` cases in
`tests/fixtures/real-text-a/source-recovery-annotations.json` and the source
scope rules in `scripts/experimental/source-scope-recovery.cjs`. Determine whether
source-only attachment can be proved without inventing numeric/correction or
possessive-subject semantics. Keep abstention when it cannot. Do not silently
turn these documented misses into successful-resolution tests or start B03.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO
