# C02 — Reporting nominal / source composition

2026-10-12. Research-only current working tree; no commit, push or deployment.

**C02: PASS in the tested scope.**

**SECOND_BLIND_CORPUS_RESULT: PARTIAL (post-repair assessment).**

**FRESH_BLIND_GENERALIZATION_READY: YES (research measurement only).**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO.**

The immutable original SECOND blind result remains FAIL. This POST is not a new
blind experiment and does not establish independent generalization.

## Root cause

P1's dependency according-to recovery attached the nominal head `értesülése`
to the predicate and promoted that head to source identity. A valid dependency
path did not establish that the head was a speaker or publisher. The possessor
and embedded speaker were not composed into a separate attribution chain.

## Structural rule

The final research gate identifies an event/evidence nominal under `szerint` or
`alapján`, using POS, productive nominal morphology, marker dependency and sentence
scope. Possessive morphology plus a unique nominal possessor licenses a source
NP. Flat names and nested possessive role phrases are retained; coordinated,
pronominal, disconnected or missing possessors abstain. This is not a blacklist
of P1 tokens and contains no publisher or spokesman name from P1.

Representation:

`SOURCE_ENTITY → possessive relation → REPORTING_NOMINAL → predicate/claim`

`reportingNominalRelations` preserves the nominal, marker, source and exact
dependency evidence separately. Existing source-bearing frame and chain fields
are sanitized. A human role such as `klinika vezetője` is not treated as an event
nominal. Non-attribution object use creates no source relation.

For nesting, a distinct local nsubj speaker and an explicit ccomp/hogy target
license ordered outer/inner chain edges. Negated reporting predicates do not
license a positive complete chain. Existing bounded-quote chains keep their
inner speaker; their outer nominal source is corrected separately. Unproven
nesting remains unresolved, without changing actor, recipient or numeric owner.

## P1 BEFORE / POST

- BEFORE: `értesülése` resolved as attribution source; wrong publisher/speaker
  composition.
- POST outer source: `Reggeli Hír`.
- POST reporting nominal: `értesülése`, relation evidence only.
- POST inner source: `kormányszóvivő`, separate nsubj speaker.
- Chain: outer source → inner speaker → `dependency:64:114` tárgyal proposition.
- Evidence: exact raw source NP/nominal/marker/predicate spans and explicit
  possessor, nsubj and complement links.
- Frozen P1 gold unchanged. P1 POST: CORRECT_RESOLVED.

## Tests and measurement

29 generalized development snippets were annotated with the existing local NLP
worker; none copies P1. 36 new regressions cover possessive reports, person and
institution sources, bare nominals, nested chains, recipient/actor/numeric-owner
separation, money/modality/negation/time/contrast, ambiguous possession, quotes,
non-reporting use, independent sentences, boundaries and exact evidence.

The 388 old targeted tests remain unchanged. All `tests/unit/v22-*.test.cjs`:
**424/424 PASS, 0 FAIL**. No B01/B02/B03 or C01 regression was observed.

The SECOND replay received only raw text and its unchanged local NLP annotations.
It did not receive gold labels. `C02_POST_REPAIR_raw.json` was created exclusively
and not overwritten. An initial in-memory comparison hit JavaScript undefined
properties omitted by JSON; verification then compared the saved JSON artifacts
without rerunning inference or changing the raw result.

All 90 selected labels were retained except P1. All 14 other snippets are
structurally identical to C01 after removing the new empty relation collection.
Across all 15 snippets, numeric arguments (including semanticScope), actors,
actions, polarity, modalities and recipients are identical to C01.

| Metric | SECOND BEFORE | C01 POST | C02 POST |
|---|---:|---:|---:|
| CORRECT_RESOLVED | 47 | 51 | 52 |
| WRONG_RESOLVED | 6 | 1 | 0 |
| CORRECT_UNRESOLVED | 7 | 7 | 7 |
| MISSED_DEFENSIBLE_RESOLUTION | 30 | 31 | 31 |
| Resolved precision | 88.68% | 98.08% | 100% (52/52) |
| Resolution rate | 58.89% | 57.78% | 57.78% (52/90) |
| Exact evidence offsets | 903/903 | 1244/1244 | 1268/1268 |

Offset counts include repeated span occurrences, not unique claims. Correct
offsets alone are not proof of semantic entailment. This synthetic corpus is
already known; zero wrong selected decisions is not a general accuracy claim.

## Changed files

- Existing entrypoint: `scripts/experimental/real-text-a-binder.cjs`.
- New gate: `scripts/experimental/source-composition-safety.cjs`.
- New annotation helper: `scripts/experimental/source-composition-development.cjs`.
- New inputs: `tests/fixtures/real-text-a/source-composition-annotations.json`
  and `source-composition-extra.json`.
- New tests: `tests/unit/v22-source-composition.test.cjs`.
- This audit directory and continuation checkpoint 14.

`freeze.json` and `verification.json` show that every pre-existing file except
the intended research entrypoint remains unchanged, including SECOND BEFORE,
C01 POST, earlier audits, old tests, AGENTS.md, CLAUDE.md and docs.zip.

## Limits and stop condition

Nominal recognition remains a bounded research construction grammar. Arbitrary
lexical nominalizations, coreference and every form of nested reporting are not
solved. Ambiguous composition deliberately abstains. The 31 misses remain;
numeric/rate/rank/capacity/temperature recall was not optimized.

WRONG_RESOLVED is now zero on the frozen selected decisions. Work stops here as
requested. The next milestone is **FRESH_BLIND_GENERALIZATION_CHECK**, with a
new frozen corpus and pre-inference expectations. Do not tune SECOND further.
Fresh research measurement is ready; real published-article blind readiness
remains NO until that fresh check provides evidence.

Production and canonical integration untouched; canonical projection OFF.
No paid/external AI provider, full project suite, build, preflight, commit, push
or deployment.
