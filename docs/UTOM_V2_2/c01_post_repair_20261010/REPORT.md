# C01 — Numeric scope / comparison / modality safety

2026-10-10. Research only, current working tree, branch `develop/utom-recovery`,
HEAD `d145120c6e044b4f25d1d7b94e87846652ef80ba`.

**C01: PARTIAL-PASS (tested safety scope).**

**SECOND_BLIND_CORPUS_RESULT: FAIL.**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO.**

The five C01-related wrong decisions no longer have the original unsafe meaning.
This does not mean all five now satisfy their full gold expectation. W4 safely
abstains; T5 retains the bound and possibility but still lacks an explicit
per-carriage capacity relationship. Attribution P1 remains wrong and untouched.

## Six wrong decisions, independently checked

| Case | Frozen expected | Actual BEFORE | Root cause | C01 related | POST |
|---|---|---|---|---|---|
| P1 | Reggeli Hír → kormányszóvivő source chain | resolved source `értesülése` | nominal report head mistaken for a speaker; missing source composition | NO | WRONG_RESOLVED, unchanged |
| W4 | 4 degrees, nighttime comparison reference | resolved count, owner `fokhoz`, lemma `f` | generic count fallback trusts a defective lemma; comparison postposition lost | YES | MISSED; reference/dimension candidates retained, attachment unresolved |
| W5 | possible afternoon measurement of 9 degrees | resolved measurement without potential scope | finite `mérhetnek` tagged indicative; no independent wordform/scope guard | YES | CORRECT; possible qualified measurement, not observed equality |
| T5 | at most 240 passengers per carriage, capacity | resolved bare count without bound or possibility | quantity attachment omits `legfeljebb` and potential `vihet` | YES | MISSED; qualified bound is safe, complete capacity relation remains absent |
| K2 | 2030 is a possible beginning year | resolved year with asserted/reported event | `kezdődhet` potential wordform retained by parser but not interpreted | YES | CORRECT; year scoped to possible beginning |
| K3 | beginning is possible, not certain | same frame lacks possibility | same root cause/event as K2 | YES | CORRECT; explicit possible frame scope |

K2 and K3 are two frozen dimensions of one event, not two independent bugs.
W5/T5/K2/K3 are the four original strict qualifier-safety classifications. No
historical gold or label was changed. `six_wrong_cases.json` contains the exact
expectations and old/new adjudications.

## Root cause and repair

The existing dependency stage proves an attachment, not its entire semantic
scope. It can preserve a number and target while dropping a bound, comparison,
potential verb suffix or relative-change interpretation. The local parser also
sometimes gives indicative mood to a potential verb, and mislemmatizes an
inflected measurement unit as a counted noun.

A final research-only `numeric-scope-safety.cjs` gate now runs after dependency
binding and B01 compound-rate preservation. It never promotes an unresolved
attachment. No source-recovery, production, canonical or provider code was edited.

`numericArguments[].semanticScope` records:

- comparison: equal, greater/less, inclusive bounds, maximum/minimum,
  approximate, range, reference and typed change/resulting-level roles;
- modality evidence from governing predicate, local auxiliary/infinitive,
  morphology, potential wordform fallback and governing adverb;
- polarity, conditionality, contrast branch status, frame/clause/predicate,
  numeric dependency path and exact qualifier spans;
- `unconditionalEqualityAllowed`, `assertionStatus`, `projectionAllowed`.

`binding=resolved` continues to mean attachment resolution, not factual truth.
An otherwise proven attachment can carry `assertionStatus=qualified_only` and
`unconditionalEqualityAllowed=false`; its qualifier must not be discarded.
Projection is always OFF. Dimension/reference ambiguity and range target
uncertainty cause explicit unresolved attachment and bindingEvidence status.

Ranges retain endpoints and validity; endpoints are not independent equalities.
Negated comparison is preserved as operator + negation + modality rather than
algebraically inverted. Percentage change magnitude and resulting percentage
level use case plus governing change predicate. Source fields remain separate.
Unproven bounded contrasts retain each numeric qualifier candidate independently;
no accepted branch or shared operator is invented.

## Development and regression evidence

- 44 new development snippets, annotated by the existing local HuSpaCy worker.
  No SECOND sentences were copied into these development fixtures.
- 49 new tests: comparison operators, bounds, range, approximation, potential,
  capacity-like possibility, conditional, future auxiliary, obligation, money,
  percentages, rates, source/modal separation, negation, bounded correction,
  measurement reference, malformed range and sibling-clause controls.
- One direct gate unit test uses deliberately constructed dependency input to
  isolate cross-clause leakage; it is not presented as a live parser measurement.
- The prior 339 tests were unchanged. Final V2.2 suite: **388/388 PASS, 0 FAIL**.
- Existing B01 denominator, B02 attribution, B03 actor/correction tests PASS.
- On all 15 POST snippets, actor/source/recipient/action/polarity/structural role
  projections are identical to BEFORE. No attribution fix was smuggled in.
- `reproduction.json` replays selected new snippets with only the new gate
  disabled in process, showing the previous unqualified outputs. Files were not
  altered for this reproduction.

## SECOND POST replay and scoring

`C01_POST_REPAIR_raw.json` was written separately with exclusive creation. The
binder received only raw text and unchanged local NLP annotations from the
frozen run. This is a deterministic annotation replay, not a second blind
experiment or a newly independent corpus. Gold did not enter runtime.

All 90 expectations stay fixed. `human_item_audit.md` covers all 90 decisions.
Changed fields were reviewed; unchanged roles retain the original adjudication.

| Metric | BEFORE | POST |
|---|---:|---:|
| Selected decisions | 90 | 90 |
| CORRECT_RESOLVED | 47 | 51 |
| WRONG_RESOLVED | 6 | 1 |
| CORRECT_UNRESOLVED | 7 | 7 |
| MISSED_DEFENSIBLE_RESOLUTION | 30 | 31 |
| Resolved precision | 47/53 = 88.68% | 51/52 = 98.08% |
| Resolution rate | 53/90 = 58.89% | 52/90 = 57.78% |
| Correct decisions incl. abstention | 54/90 = 60% | 58/90 = 64.44% |
| C01-related wrong decisions | 5 | 0 |
| Evidence exact offsets | 903/903 | 1244/1244 |

Evidence counts are recursive span occurrences, including repeated references,
not unique claims. Increased span count comes from qualifier/path evidence.
Exact offsets alone do not prove semantic entailment.

W5/K2/K3 become correct; W4 becomes a miss through safe abstention; T5 becomes a
miss through strict incomplete-bundle scoring. E3 incidentally becomes correct
through the required general percentage-change rule; no E3-specific repair was
made. No new WRONG_RESOLVED was found among the 90 selected decisions.

## Files

Modified existing research entrypoint:
`scripts/experimental/real-text-a-binder.cjs`.

Added research modules/tools:
`scripts/experimental/numeric-scope-safety.cjs`,
`scripts/experimental/numeric-scope-development.cjs`,
`scripts/experimental/c01-measurement.cjs`.

Added regression inputs/tests:
`tests/fixtures/real-text-a/numeric-scope-annotations.json`,
`tests/unit/v22-numeric-scope-safety.test.cjs`.

Evidence is confined to this new audit directory and a new continuation
checkpoint. `verification.json` records code hashes, 177 pre-existing frozen
files, the single intended existing-file change, and 29 unchanged SECOND files.
AGENTS.md, CLAUDE.md, docs.zip and old V2.2 tests remain unchanged.

## Remaining limits and next action

- W4's actual degree/reference binding is still unresolved; no temperature
  canonicalization is claimed.
- T5's per-carriage capacity relationship remains incomplete.
- Complex modal embedding, arbitrary lexical ambiguity and full semantic
  entailment are not solved. Potential suffix fallback is a scoped research
  safeguard, not a complete Hungarian morphological analyzer.
- Ambiguous bounded contrasts remain unresolved; no generic shared-target or
  operator inheritance has been added.
- New consumers must honor semanticScope; no production consumer was integrated.
- The original corpus was synthetic and assistant-authored/evaluated. This replay
  cannot establish externally independent generalization or global readiness.

**RESUME FROM HERE:** review this C01 POST checkpoint. The separate remaining
attribution blocker is SB2-03/P1 (source composition and reporting/quote coverage).
Do not change SECOND_BEFORE_REPAIR or optimize all remaining misses. Any further
repair is a separate scoped task; do not start real-world blind testing yet.

No full project suite, build, preflight, MySQL suite, production change, paid AI,
external provider call, commit, push or deployment occurred.
