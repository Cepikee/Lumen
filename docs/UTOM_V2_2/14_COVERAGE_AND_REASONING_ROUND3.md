# UTOM V2.2 – Coverage and Reasoning Round 3

## Scope and checkpoint

Round 2 was reviewed and pushed as `c111f88` (`feat(v2.2): harden benchmark integrity and semantic precision`). Round 3 is intentionally local and has **not** been pushed. The V2.2 provider remains deterministic and gold-independent; production, payment and paid AI paths were not touched.

Round 3 closes the source-derivability gap in the controlled fixtures and adds precision-first coverage for explicit entities, relations, events, claims and conflicts. The benchmark now records semantic support separately from gold-manifest matching.

## Findings and fixes

| Finding | Area | Reproduction/root cause | Fix and regression |
|---|---|---|---|
| V22-INT-F013 | Entity coverage | Expected project, organisation, person, place and event names were absent from fixture text, so recall could not be source-grounded. | Added explicit local context sentences and context-aware entity typing. Covered by the 30-variant robustness test and dense source-derivability regression. |
| V22-INT-F014 | Relations | The benchmark adapter passed an empty entity list and had no explicit relation projection. | Added explicit high-confidence relation patterns, source evidence and namesake-safe object selection. Core relation recall is 1.0000. |
| V22-INT-F015 | Events | Event output was always empty and multi-event articles had no deterministic candidate model. | Added explicit event-name candidates, stable IDs and membership projection. V22-S20 remains two events. |
| V22-INT-F016 | Conflicts | No validated numeric, percentage or date conflict candidate was emitted. | Added same-predicate/value/unit/date preconditions, null winner and source evidence. Unit-equal and correction/change cases remain non-conflicts. |
| V22-INT-F017 | Claim coverage | Explicit role, status, denial, damage, identity, event and attribution phrases were not mapped to canonical predicates/values. | Added only text-local patterns for the listed predicates and modality states. Core claim recall is 0.6739; dense is 0.6333. |
| V22-INT-F018 | Dense fixture integrity | Source 2 changed expected numeric values by `+5` without changing the sentence. | Removed the hidden adjustment so every gold value is source-derived; regression checks every dense claim sentence. |
| V22-INT-F019 | Measurement | Gold coverage conflated with supported semantic output and dense facts had no importance metadata. | Added semantic support, extra-supported, information-coverage and critical-fact-recall metrics; dense expected facts are marked critical/supporting/minor. |
| V22-INT-F020 | Robustness | Round 2 exercised 20 perturbed variants only. | Expanded deterministic perturbation coverage to 30 variants. |
| V22-INT-F021 | Relation evidence integrity | Splitting sentences by the period in `Zrt.`/`Kft.`/`Nyrt.` could shift canonical evidence offsets; the new explicit relation branch could also repeat an ID-based relation already emitted by the legacy pattern. | Added an offset-preserving relation sentence scanner and relation deduplication. Regression asserts the original article slice and one relation result. |
| V22-INT-F022 | Generalized role-clause relation | Held-out role clauses such as `Kelemen Áron, a Vektor vezérigazgatója` did not expose both the person and full organisation. | Added source-local apposition extraction, longest organisation selection and a held-out relation regression. |
| V22-INT-F023 | Generalized event projection | Colon-labelled multi-event phrases could produce a combined title, while an event-entity context was misclassified as an event. | Normalize labelled titles, split explicit event lists, and ignore `eseményhez kapcsolódó entitás` context. |
| V22-INT-F024 | Canonical claim projection | Repeated source-local matches for the same predicate/value were projected more than once. | Deduplicate on predicate, value, unit, modality, polarity, conditionality, uncertainty and attribution while retaining distinct observations. |

## Manual adjudication

The deterministic top-50 report contains 29 `SUPPORTED_BUT_NOT_IN_GOLD`, 21 evaluator-normalization mismatches, and 0 duplicate or truly unsupported rows after the latest projection changes. A 30-row sample is recorded in `14_adjudication_sample.json` and was classified using exact source evidence:

| Adjudication | Count | Interpretation |
|---|---:|---|
| unquestionably supported | 16 | Canonical predicate/value with an exact source span; gold coverage candidate. |
| arguably supported | 0 | No row required this intermediate category in the deterministic sample. |
| too broad | 7 | Capitalised context word or title fragment without a complete canonical fact. |
| duplicate | 0 | Canonical projection deduplication removes repeated identities. |
| should be added to gold | 1 | Source-grounded namesake/context organisation needed by an explicit relation. |

Correct source-grounded output was retained; the gold coverage policy is now explicitly separate from hallucination/unsupported metrics.

## Round 3 scorecard

| Metric | Core | Dense |
|---|---:|---:|
| Entity precision / recall | 0.8400 / 0.9130 | 0.7600 / 0.9500 |
| Relation precision / recall | 1.0000 / 1.0000 | 1.0000 / 1.0000 |
| Claim precision / recall | 0.6078 / 0.6739 | 0.7273 / 0.6000 |
| Event matching accuracy | 1.0000 | 1.0000 |
| Conflict precision / recall | 1.0000 / 1.0000 | N/A / N/A |
| False-conflict rate | 0.0000 | N/A |
| Attribution accuracy | 0.8387 | 0.7895 |
| Modality accuracy | 0.9032 | 0.9474 |
| Evidence grounding / accuracy | 1.0000 / 1.0000 | 1.0000 / 1.0000 |
| Negation accuracy | 1.0000 | 1.0000 |
| Temporal change precision / recall | 1.0000 / 1.0000 | 1.0000 / 1.0000 |
| Source-omission precision / recall | 1.0000 / 0.6667 | 1.0000 / 0.8000 |
| Information coverage score | 0.7821 | 0.7125 |
| Critical fact recall | 0.8750 | 0.6705 |
| Gold coverage precision | 0.7241 | 0.7639 |
| Extra supported rate | 0.2759 | 0.2361 |
| Truly unsupported count / rate | 0 / 0.0000 | 0 / 0.0000 |

## Frozen quality floor

- Evidence grounding: `1.0000` in both tiers.
- Negation: `1.0000` in both tiers.
- Truly unsupported predictions: `0`.
- Temporal change precision/recall: `1.0000 / 1.0000` in both tiers.
- False conflicts: `0`; automatic conflict winner remains `null`.
- Namesake safety: preserved by pécsi/szegedi identity context and relation object filtering.
- Unit conversion safety: preserved; equal kilometre/metre values do not create a conflict.
- Gold leak: none; the provider imports no benchmark or gold manifest.

## Robustness

The targeted regression suite now runs 30 paragraph-order/whitespace perturbations. All variants retain finite numeric values, exact evidence substrings and valid structured output. The Round 3 focused file passes 14/14, including namesake safety, denial polarity, relation/event/conflict coverage, organization-suffix evidence offsets and dense source derivability.

## Canonical scenarios and showcase

The deterministic Round 3 regression covers the three required reasoning shapes:

1. Numeric conflict: two different project-cost values produce an unresolved conflict with a null winner.
2. Temporal change: an explicit earlier/later plan produces a change projection without being treated as an unresolved source conflict.
3. Multi-event: V22-S20 produces separate `Programbejelentés` and `Próbaüzem indulása` event candidates with independent evidence and membership.

The existing canonical V2/V2.1 raw-input → persistence → read-model and `/dev/v2-demo` gates remain the integration authority. The owner showcase continues to render structured claims, source comparison, omissions and unresolved uncertainty; no direct derived-table seed was introduced by Round 3.

## Reproduction and gates

```text
npm run benchmark:v22:generate
npm run benchmark:v22:deterministic
npm run benchmark:v22:fp
node --test tests/unit/v22-precision-hardening.test.cjs tests/unit/v22-deterministic-provider.test.cjs tests/unit/v22-intelligence-benchmark.test.cjs
```

The deterministic identity for this local Round 3 run is recorded in
`10_deterministic_baseline.json` (benchmark `v22.benchmark.1`, evaluator
`v22.evaluator.3`, provider `deterministic-text-v1`).

## Local quality gate

- `npm run benchmark:v22:generate`: PASS (20 core, 5 dense scenarios).
- `npm run benchmark:v22:deterministic`: PASS.
- `npm run benchmark:v22:fp`: PASS (0 true unsupported, 0 semantic mismatch, 21 evaluator-normalization mismatches).
- Targeted precision suite: 15/15 PASS; full offline suite: 450/450 PASS.
- TypeScript: PASS; local import check: PASS; ESLint: 0 errors / 402 warnings; `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities; `npm run check`: PASS; production build: 75/75 PASS.
- MySQL 8.0.46 canonical integration: 57 PASS / 0 FAIL / 1 SKIP on a freshly initialized disposable loopback `_test` database at dedicated port 33306 with a temporary user; the single skip is the FFmpeg executable capability test. Auth/reset and PIN/premium HTTP lifecycle gates were explicitly enabled and passed.

Round 3 status: `PARTIAL`: the MySQL 8 canonical gate is now green, but the
held-out recall target remains incomplete. No Round 3 commit or push has been made.
