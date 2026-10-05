# V2.2 Precision Hardening Round 2

## Scope

Round 2 first corrected benchmark integrity, then applied only safe precision
fixes. No production provider, paid AI, payment, production database or
deployment was activated.

## Findings and fixes

### V22-INT-F005 – ungrounded official attribution

The direct-denial fixture named an official speaker only in gold. The source
now contains the natural attribution, fixtures are regenerated, and the
deterministic helper derives the label from the sentence. Status: `FIXED`.

### V22-INT-F006 – headline generic attribution duplicated a body claim

The generated article title contains a generic “közlemény szerint” headline.
The extractor treated it as a second injury claim. Generic headline
attributions are now ignored when they do not identify a source. Status:
`FIXED`.

### V22-INT-F007 – negated claim evidence bound to the speaker phrase

For a non-numeric denial, evidence selection preferred `mentőszolgálat szerint`
over the denied proposition. The extractor now binds evidence to the local
negated predicate (`nem történt sérülés`, etc.). Status: `FIXED`.

### V22-INT-F008 – repeated entity mentions inflated scenario predictions

The same canonical entity appeared once per source variant even when its
normalized identity and type were identical. The provider now collapses that
identity while retaining distinct namesake contexts. Status: `FIXED`.

### V22-INT-F009 – dense temporal gold values were not source-derived

The five dense `changesOverTime` records contained old/new values that were
not both present in the source variants. The fixture now carries explicit
historical and updated statements for each change, and the date parser accepts
Hungarian day suffixes. Status: `FIXED`.

### V22-INT-F010 – ISO date unit was evaluator-inconsistent

Some gold date observations omitted an explicit unit while the text extractor
correctly emitted `unit: "date"` for the same ISO value. The evaluator treated
the two forms as different claim identities. Claim-key normalization now
derives the canonical `date` unit from an ISO `YYYY-MM` or `YYYY-MM-DD`
value when the field is omitted. Status: `FIXED`.

### V22-INT-F011 – context-free engineer assessment

The generic engineer token produced an ENGINEER_ASSESSMENT claim from a
document sentence that contained no expert proposition. The predicate now
requires local expert wording (szerint, a state, or a safety assessment).
Status: `FIXED`.

### V22-INT-F012 – evidence-backed categorical claim misclassified as unsupported

Valid categorical claims such as OPENING_EVENT and INCIDENT_CAUSE carried
source evidence but no numeric or boolean value. The integrity metric now
counts a canonical predicate with non-empty evidence as semantically
supported; missing gold coverage remains a separate metric. Status: `FIXED`.

## Round 2 current scorecard after integrity correction

| Metric | Core | Dense |
|---|---:|---:|
| Predictions | 39 | 117 |
| Entity TP / FP / FN | 4 / 0 / 19 | 4 / 4 / 16 |
| Entity precision / recall | 1.0000 / 0.1739 | 0.5000 / 0.2000 |
| Relation TP / FP / FN | 0 / 0 / 2 | 0 / 0 / 5 |
| Relation precision / recall | N/A / 0.0000 | N/A / 0.0000 |
| Claim TP / FP / FN | 18 / 13 / 28 | 57 / 43 / 63 |
| Claim precision / recall | 0.5806 / 0.3913 | 0.5700 / 0.4750 |
| Attribution accuracy | 0.8333 (18) | 0.7719 (57) |
| Evidence grounding / accuracy | 1.0000 | 1.0000 |
| Negation accuracy | 1.0000 | 1.0000 |
| Conditional/modality accuracy | 0.7778 | 0.9123 |
| Conflict TP / FP / FN | 0 / 0 / 3 | 0 / 0 / 0 |
| Conflict precision / recall | N/A / 0.0000 | N/A / N/A |
| False-conflict rate | N/A | N/A |
| Temporal change precision / recall | 1.0000 / 1.0000 | 1.0000 / 1.0000 |
| Omission precision / recall | 0.5000 / 0.3333 | 1.0000 / 0.8000 |
| Legacy unsupported prediction rate | 0.3590 | 0.4017 |
| Truly unsupported count / rate | 0 / 0.0000 | 0 / 0.0000 |
| Gold coverage precision | 0.6410 | 0.5983 |
| Extra supported prediction rate | 0.3590 | 0.4017 |

## False-positive integrity taxonomy

The reviewed top-50 contains 0 true unsupported, 48 supported-but-not-in-gold,
0 semantic mismatch, 2 duplicate, and 0 evaluator mismatch rows. The result
is why gold coverage and text support are reported separately.

## Robustness and abstention

The targeted suite now perturbs 20 source variants by paragraph reordering and
whitespace normalization. All retain finite numeric values and exact evidence
substrings. The provider emits only structured, explicit temporal/omission
projections and abstains on unsupported relation/event fields.

The deterministic slice now detects explicit temporal change (`2/2` core,
`5/5` dense) and cross-source omission (`1/3` core, `4/5` dense). It does not infer a missing
source field from an isolated sentence; omission is emitted only when the same
predicate is present in at least two other source variants.

## Reproduction and gates

```text
npm run benchmark:v22:generate
npm run benchmark:v22:deterministic
npm run benchmark:v22:fp
node --test tests/unit/v22-precision-hardening.test.cjs tests/unit/v2-conflict-history.test.cjs
```

The benchmark integrity report is `12_BENCHMARK_INTEGRITY_AUDIT.md`; the JSON
score and frozen hashes are in `10_deterministic_baseline.json`.
The current local Round 2 identity is benchmark `v22.benchmark.1`, articles
SHA-256 `88902a77704386dfcb8f4440cf20df40e92eb8e5131ac636bc7943b6804019c3`,
gold SHA-256
`966526ae2759c2c5b09df4345365fe3033bd3928dc33ec3b5df620416ef06125`,
evaluator `v22.evaluator.3`, provider
`deterministic-text-v1/gold-independent-semantic-helper-round2`.

The full targeted semantic suite is 28/28 PASS; `npm run check` is PASS with
TypeScript PASS, offline 446/446 PASS, import check PASS, ESLint 0 errors,
production build 75/75 PASS, and npm audit 0 high vulnerabilities.

The isolated MySQL 8.0.46 canonical suite is 55 PASS / 0 FAIL; the V21
canonical raw-input E2E and standalone M13 HTTP smoke both pass. The
FFmpeg-only capability test remains the single environment skip in the
canonical run. The auth and legacy PIN/premium HTTP lifecycle tests also pass
when their explicit opt-in is enabled; the combined multi-server runner has a
known rate-limit ordering interference and is not used as the canonical gate.

Round 2 status: `PARTIAL` against the aspirational maximum-coverage target.
The scoped integrity, entity-deduplication, source-derived temporal baseline,
and robustness work is complete; relation/event/conflict recall remains
conservative and is intentionally not expanded in this precision-first slice.
