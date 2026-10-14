# Round A semantic safety continuation — 2026-10-08

Research-only. No canonical projection, production changes, commit or push.

## Current implementation inventory

- `scripts/experimental/real-text-a-binder.cjs`: active safety wrapper.
- `scripts/experimental/role-scope-binder.cjs`: underlying clause, attribution, numeric and condition logic; unchanged.
- `scripts/experimental/morph-clause-binder.cjs`: entity fusion and clause segmentation; unchanged.
- `scripts/experimental/morph-worker.py` and `morph-worker-client.cjs`: local HuSpaCy annotations and raw-offset validation; unchanged. Worker exports morphology/NER, NOT dependency edges.
- Four directly relevant test files: real-text-a research, role-scope research, role-scope evaluator, morph-clause research.

Existing rules: unique nominative actor candidate; finite predicate and number agreement; immediate possessive/postposition exclusion; reporting-verb recipient valency; explicit szerint attribution; quote/report separation; local predicate negation; conditional antecedent/consequent propagation with contrast boundary; typed units, year, tariff, threshold, population and property numeric owners.

Existing fixtures cover non-acting possessors/targets, implicit and multiple actors, reporting recipients, quoted versus narrative sentences, age/duration, money, counts, percentages, measurements, years, predicate negation and conditional boundaries. Before changes all 84 targeted tests passed.

Gaps reproduced this session: age inherited the payer rather than the modified referent; ambiguous nominal number retained a person owner; nested attribution exposed a single source despite unresolved chain. Additional boundary checks found that the safety wrapper did not explicitly exclude passive subjects or non-name tokens inside a PERSON candidate.

## Changes and evidence

1. `Márton a 38 éves Eszternek 6400 forintot fizetett.`: prior output resolved age 38 to Márton. Live HuSpaCy labeled Eszternek LOC. Now age is unresolved; amount still belongs to Márton. A separately labeled PER mutation verifies that correct person recognition binds age to Eszternek, not the actor. This mutation is a controlled unit input, not a model-quality result.
2. Age ownership requires an adjacent person head with only adjective/determiner modifiers in between. Duration property handling remains separate.
3. Untyped/adjectival nominal numeric attachment cannot retain the actor as a fabricated owner. Numeric uncertainty propagates to frame binding state.
4. Nested/multiple reporting predicates clear the resolved source and expose the prior candidate only as a candidate, with attribution_chain_unresolved.
5. Actor support rejects passive voice and possessive heads across adjective/determiner/adverb/number modifiers.
6. PERSON candidates containing non-name lexical tokens are excluded conservatively; no guessed replacement name is manufactured.
7. Resolved actor/source/numeric bindings expose rule and raw-span evidence. Canonical output remains empty and projection disabled.

## Validation

New fixture: `tests/fixtures/real-text-a/safety-closure-annotations.json`, ten fresh local HuSpaCy annotations. Existing fixture files were not overwritten.

Six new targeted tests cover recipient age versus payer amount, nested/direct attribution, nominal amount ownership, contrast/conditional scope, title/person/organization boundaries and exact evidence, passive/bad-boundary abstention.

Command:

`node --test tests/unit/v22-real-text-a-research.test.cjs tests/unit/v22-role-scope-research.test.cjs tests/unit/v22-role-scope-evaluator.test.cjs tests/unit/v22-morph-clause-research.test.cjs`

Result: 90/90 PASS, 0 FAIL. No full suite, build, preflight or MySQL suite run.

## Remaining limitations / next point

- ACTOR ROLE: PARTIAL — local morphology supported, dependency attachment not available; broad real-text role accuracy not established.
- ATTRIBUTION SOURCE: PARTIAL — direct source/actor separated; nested attribution conservatively unresolved, full source chain not represented.
- NUMERIC OWNERSHIP: PARTIAL — demonstrated age misbinding fixed; ambiguous nominal attachment abstains; complete date/day and dependency-based amount-role coverage remains unverified.
- LOGICAL / CONDITIONAL SCOPE: PARTIAL — existing scoped negation/conditions retained; nem X/hanem Y focus and rejected-versus-accepted number structure remain unresolved rather than positively interpreted.
- ENTITY BOUNDARY: PARTIAL — observed separate title/person/organization spans preserved and malformed mixed name abstains; incorrect NER type and adjacent proper-name fusion remain model limitations.
- EVIDENCE: PASS FOR TARGETED FIXTURES — all traversed raw spans match input slices; this is not a general quality claim.
- SEMANTIC ENTAILMENT: NOT YET VERIFIED.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Next research step: explicitly model contrast alternatives and nested source chains, then validate ownership/actor attachment against independently annotated unseen clauses. Do not enable canonical projection from this result.
