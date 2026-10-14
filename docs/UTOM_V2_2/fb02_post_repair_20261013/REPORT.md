# FB-02 — source artifact / originating entity safety

Date: 2026-10-13. Branch: develop/utom-recovery.
HEAD: d145120c6e044b4f25d1d7b94e87846652ef80ba. Existing dirty tree preserved.

## Scope and root cause

Only FB-02 was repaired. See root_cause.md for the pre-edit O1 audit and frozen
artifact references. The dependency fallback resolved árjegyzéke as source.
C02's NOUN -ás/-és and beszámoló classification did not recognize árjegyzék.
Its protective source composition therefore never ran on O1.

## Representation and assertion gate

The existing reportingNominalRelations remains the single composition model.
source is the originating entity; sourceArtifact/reportingNominal is exact
document evidence; markerSpan, predicateSpan, claimFrameIds and
dependencyEvidence retain the path. Frames and existing chain edges are
sanitized through the same relation. No canonical schema or projection changed.

A positive information-artifact class extends the old productive nominal class.
Lexical recognition alone cannot resolve a source: it also requires a supported
NOUN/POS reading, evidential attachment, a unique claim frame (direct or linked
through an existing reporting chain), possessive morphology and one defensible
entity-bearing possessor NP. Bare documents, pronouns, multiple possessors,
detached dependencies, recipient case and missing claim targets abstain.
Nested possessor NPs retain the immediate owner plus its qualification.
Proper publication names are not rejected merely for an artifact-like lemma.

An outer according-to source followed by an artifact's evidential clause has
ordered outer/inner edges. Artifact origin and explicit inner speaker stay
separate. Actor and numeric ownership are not repaired or inferred here.

## Regression evidence and limitations

- Baseline V2.2 targeted suite: 477/477 PASS.
- New FB02 tests: 56/56 PASS, using 47 controlled dependency fixtures.
- Final tests/unit/v22-*.test.cjs: **533/533 PASS, 0 FAIL**.
- Existing C02: 36/36 PASS; C01/FB01 included in final suite, no regression.
- Cases include all 12 requested artifact types, bare types, generic/media/person
  sources, nested possessors, speaker/recipient separation, ordered sources,
  negation, modality, contrast, numeric/actor separation, boundaries, independent
  sources, malformed parser attachments, missing/duplicate claim targets,
  proper names, non-reporting objects and exact offsets.

**These are binder tests, not 47 fresh NLP measurements.** New raw-sentence
annotation generation failed: WorkerClient reported worker_exit; a direct WSL
probe reported Wsl/Service/RPC_S_CALL_FAILED. No provider/library was altered.
The offline fixtures are transparently marked controlled_dependency_fixture:
lexical substitutions of prior real parser annotations with remapped offsets;
the outer double-evidential topology is explicitly hand-authored. The generator
and its substitutions are checked in the working tree for inspection. The 40
sentences in fb02-development.cjs remain an unexecuted live-parser validation
set, not counted as passes. No general live-parser coverage is claimed.

## Same frozen FRESH120 POST replay

This is a repair replay, **not a new blind test**. Original expected labels and
input are untouched. No correct-resolved credit was awarded for missed targets.

| Measure | Original blind | FB01 POST | FB02 POST |
|---|---:|---:|---:|
| CORRECT_RESOLVED | 40 | 43 | 44 |
| WRONG_RESOLVED | 6 | 1 | 0 |
| CORRECT_UNRESOLVED | 13 | 13 | 13 |
| MISSED_DEFENSIBLE_RESOLUTION | 61 | 63 | 63 |
| Attribution WRONG_RESOLVED | 1 | 1 | 0 |
| Resolved precision | 86.96% | 97.73% | 100% |
| Resolution rate | 38.33% | 36.67% | 36.67% |

Exact evidence: **1796/1796 span occurrences**, 484/484 unique spans, 0 failures.
O1 alone changes label. J gains unresolved artifact metadata, not an asserted
source. All other source identities, claim owners, recipients, reporting actors,
attributions and chains compare equal to FB01. Relation metadata changes were
reviewed across C/D/E/H/J/K/M/N/O/S. The complete numeric arguments, actors,
actions, entities, polarity, modality, conditions, contrasts and semantic scope
are deep-equal across all 20 snippets to FB01; see invariance.json.

POST SHA-256: 124aef9385ea75862764ccdc383d593b470221021918bd45a8843778198188e2.
Full persisted output: FB02_POST_REPAIR_raw.json (exclusive creation; no overwrite).
Scoring: metrics.json, labels.json, human_item_audit.md (assistant adjudication,
not independent human assessment). Previous gold errata remain unchanged.

## Files

Only one pre-existing file changed during this session:
`scripts/experimental/source-composition-safety.cjs`.

New research/test files:
- scripts/experimental/fb02-controlled-fixtures.cjs
- scripts/experimental/fb02-development.cjs (live-parser validation pending)
- tests/fixtures/real-text-a/fb02-controlled-annotations.json
- tests/unit/v22-fb02-source-artifact.test.cjs
- docs/UTOM_V2_2/fb02_post_repair_20261013/ (freeze, audit, replay, score,
  raw output, labels, metrics, invariance, source deltas, test logs, verification)
- docs/UTOM_V2_2/real_text_round_a/16_fb02_checkpoint.md

verification.json compares all pre-existing file hashes: unexpected changes 0;
original FRESH and FB01 unchanged; AGENTS.md/CLAUDE.md/docs.zip unchanged.
No production change, paid/external AI call, full project suite, build/preflight,
commit, push or deploy. Canonical projection remains disabled_research_only.

## Stop gate / readiness

FB-02: **PASS — scoped binder regressions and selected FRESH120 repair gate**.
FRESH_POST_SAFETY_STATUS: **PASS — selected 120 decisions only**.
NEW_UNSEEN_MEASUREMENT_READY: **NO** — live local NLP worker failed this session;
fresh annotation capability must be demonstrated before an unseen end-to-end run.
NEXT_REAL_WORLD_BLIND_TEST_READY: **NO**.

Zero selected WRONG_RESOLVED is not proof of general semantic safety. FRESH was
used for repairs; unselected H2 owner concerns and recall gaps were not repaired.
No additional optimization of the 63 misses was performed. Further unseen input
and independent measurement remain necessary; unseen artifact vocabulary,
ambiguous syntactic attachments and wider discourse chains are not certified.

## RESUME FROM HERE

Stop after FB02. Do not start FB03/recall or tune these 63 misses. On a separately
authorized next measurement, first verify the existing local NLP worker can
annotate a neutral input; preserve this POST and the original blind artifacts.
Then prepare new unseen generalization measurement / external-style blind input.
The pending live-parser development set is not unseen measurement evidence.
