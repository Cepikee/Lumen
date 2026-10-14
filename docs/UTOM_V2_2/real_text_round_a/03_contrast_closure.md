# Contrast correction research checkpoint — 2026-10-08

## Resume audit

Found and preserved the unfinished `contrast-correction.cjs`, its wiring in `real-text-a-binder.cjs`, and ten local HuSpaCy annotations in `contrast-annotations.json`. No contrast regression file existed. Older production/research working-tree edits were not reset or changed.

The unfinished implementation masked the rejected branch while preserving UTF-16 offsets, then rebound the accepted proposition. Two remaining failures were observed: the masked year-leading sentence was discarded as metadata by the legacy segmenter, and signing (`írta alá`) retained a false reporting source.

## Completed behavior

- One finite predicate, one nem/hanem pair, and structurally compatible alternatives are required.
- Explicit `contrasts` contain binding state, rule reason, semantic slot, rejected/accepted values and raw evidence spans, sentence scope and linked frame ID.
- Slots: actor, number, amount, date/time, attribution source, and matching accusative object.
- Rejected values are excluded from positive numeric/actor/object slots. Focus negation does not negate the event.
- Shared currency/magnitude is applied to a bare rejected amount. An explicitly supplied rejected magnitude is retained.
- Numeric slot resolution is separate from entity ownership: semantic_role never claims an unsupported person owner. Attributed quantities preserve their independent source.
- Year-frame recovery uses only the original explicit predicate; no invented predicate is added.
- Signing no longer creates a reporting source in a corrected clause.
- Incompatible alternatives, repeated corrections, multiple finite predicates, passive and quoted/nested constructions abstain conservatively.

## Targeted evidence

Six new regression tests over ten recorded local model annotations cover all six requested examples, object correction, rejected-value exclusion, positive polarity, attribution/quantity separation, ambiguous patterns, exact original offsets and disabled canonical projection. Two previous Round A abstention assertions were updated to check now-supported actor and numeric corrections.

Targeted command: `node --test tests/unit/v22-contrast-correction.test.cjs tests/unit/v22-real-text-a-research.test.cjs tests/unit/v22-role-scope-research.test.cjs tests/unit/v22-role-scope-evaluator.test.cjs tests/unit/v22-morph-clause-research.test.cjs`

Result: 96/96 PASS, 0 FAIL. No full suite, build, preflight or database integration was run. No commit, push, deployment or production changes.

## Scope and remaining limits

CONTRASTIVE NEGATION: PASS for the specified single-predicate acceptance scope, not a general Hungarian-language accuracy claim.

Remaining unsupported variants: quoted/nested correction, cross-clause predicate ellipsis, word-form numbers, arbitrary calendar dates and unsupported units. These remain unresolved; no discourse or entailment expansion was attempted. Morphology/NER quality still limits actor/source resolution.

- ACTOR ROLE: PARTIAL
- ATTRIBUTION SOURCE: PARTIAL
- NUMERIC OWNERSHIP: PARTIAL
- LOGICAL / CONDITIONAL SCOPE: PARTIAL (specified correction scope completed)
- ENTITY BOUNDARY: PARTIAL
- EVIDENCE: PASS on targeted fixtures
- SEMANTIC ENTAILMENT: NOT YET VERIFIED

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Next single blocker: represent nested attribution source chains without merging the quoted actor, original speaker and secondary reporting source. Do not begin that work automatically in this session.
