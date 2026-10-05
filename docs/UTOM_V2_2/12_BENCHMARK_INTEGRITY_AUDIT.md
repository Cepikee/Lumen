# V2.2 benchmark integrity audit

## Frozen contract

The benchmark contract is `v22.benchmark.1`. Reports record the SHA-256 hash of
the generated article fixture and gold manifest, `v22.evaluator.3`, and the
provider name/configuration. The provider remains gold-independent and reads
only article text.

## Source derivability

`V22-S08` previously assigned the official speaker `mentőszolgálat` to a body
sentence that did not name that speaker. The fixture now says
`A mentőszolgálat szerint a balesetben nem történt sérülés.`; the gold sentence,
attribution and evidence are generated together from that source. The
deterministic helper recognizes the official institution and keeps the denial
evidence local to the proposition. This closes `V22-INT-F005`; it is no longer
an accepted measurement limitation.

## Top-50 integrity classification

The machine-generated report is `11_false_positives_top50.json`. Each row has
exactly one integrity class, selected after checking the source substring and
the semantic fields against the nearest gold observation:

| Class | Count | Meaning |
|---|---:|---|
| TRUE_UNSUPPORTED | 0 | no source-grounded evidence/mention |
| SUPPORTED_BUT_NOT_IN_GOLD | 48 | grounded prediction with no gold observation |
| SEMANTIC_MISMATCH | 0 | grounded mention with conflicting semantic field |
| DUPLICATE | 2 | repeated canonical identity in one scenario |
| EVALUATOR_MISMATCH | 0 | same semantic fields, evidence normalization differs |

The previous `unsupportedPredictionRate` remains in reports for historical
comparison. It is explicitly the gold-unmatched prediction rate; it is not a
text-support or hallucination rate. The new `trulyUnsupportedPredictionRate`
counts only predictions that fail source grounding or the supported semantic
contract. `goldCoveragePrecision` is matched predictions divided by grounded,
semantically supported predictions. `extraSupportedPredictionRate` is
grounded, semantically supported predictions missing from gold divided by all
predictions.

## Measured integrity

The deterministic report currently shows grounded prediction rate
`1.0000` for both core and dense. After the categorical-claim contract fix,
truly unsupported prediction rate is `0.0000` in both tiers (`0/39` core and
`0/117` dense); the remaining unmatched predictions are source-grounded
observations that are absent from the gold manifest or duplicate projections.

## Reproducible commands

```text
npm run benchmark:v22:generate
npm run benchmark:v22:deterministic
npm run benchmark:v22:fp
```

The fixture and report hashes in `10_deterministic_baseline.json` are the
reviewed measurement identity for this run.
