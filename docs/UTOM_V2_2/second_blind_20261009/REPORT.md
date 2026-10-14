# SECOND_BEFORE_REPAIR — frozen holdout measurement

2026-10-09. Measurement only; no binder, research test or production code changes.

**SECOND_BLIND_CORPUS_RESULT: FAIL**

**NEXT_REAL_WORLD_BLIND_TEST_READY: NO**

The wider, differently worded corpus exposes a false source, a numeric dimension
error and repeated loss of explicit modal/bound scope. Perfect raw offsets and
passing regressions do not establish semantic entailment on unseen language.

## Freeze and method

- Branch `develop/utom-recovery`; HEAD `d145120c6e044b4f25d1d7b94e87846652ef80ba`.
- Pre-run test log: 339/339 PASS, 0 FAIL.
- `freeze.json`: git status, tracked binary diff hash and 386 file SHA-256 hashes,
  covering research modules, relevant libraries/tests/fixtures and historical audits.
- `corpus.json`, `expected.json`, `input_manifest.json` were written before any
  snippet was annotated or bound. Manifest froze 90 selected items: 83 positive
  expectations and 7 abstention expectations. No expected label was edited later.
- 15 first-pass calls, one per new snippet, using the actual local HuSpaCy worker
  and unchanged `bind`. Runtime received raw text and ordinary NLP annotation only.
  It did not import expected labels or this audit's scoring decisions.
- Each result was saved immediately with exclusive creation in `first_pass_journal`.
  Aggregate `SECOND_BEFORE_REPAIR_raw.json` was also created exclusively.
  No rerun or hand-edit of raw inference output occurred.
- Raw artifact SHA-256:
  `5999830f83c17cf9944d66418ab4caba6df1c610b9eb7b5cd78a236013fb923e`.
- Only after raw output was saved was it read for item-level semantic adjudication.
  `review_view.json` is a derived inspection view, not a replacement raw result.
- Post-run test log: 339/339 PASS, 0 FAIL. All frozen hashes, HEAD and tracked diff
  are unchanged. Historical BEFORE/B01/B02/B03 files were not overwritten.

## Independence and coverage limitations

This is a new, text-disjoint **synthetic news-like holdout**. It is not a corpus of
published news and not externally independently authored: the same assistant knew
the prior engine and authored/evaluated these snippets. There was no gold leakage
into runtime, but this does not remove author/evaluator bias. An externally
independent blind validation cannot honestly be claimed from this experiment.

15 domains: politics, municipal affairs, economy, company news, police, accident,
sport, weather, transport, technology, health, education, energy, science, prices.
35 editorial sentences; the actual NLP annotation split them into **40 sentences**.
Differences include quote/report and abbreviation handling. No count is fabricated
from a simple period regex.

The corpus covers actor/source/recipient/possessor separation, nested and quoted
attribution, count/money/share/change/temperature/rate/age/capacity, multiple time
roles, partial dates/years/clock/deadline/duration, ordinals and ranks, correction,
denial, conditions, possibility, boundaries and multilingual-length proper names.

It does **not** exhaust every requested subtype. There is no dedicated source-only
correction, full year+month+day date, population-ratio or namesake item, nor a
standalone previous-clause implicit-rank gold. These were coverage omissions in
preparation. They are documented rather than added after observing results: the
90-item denominator remains frozen. Also, selected bundles vary in complexity and
are correlated; this is not a statistically representative population estimate.

## Results

| Metric | Result |
|---|---:|
| Snippets / domains | 15 / 15 |
| Editorial / NLP sentences | 35 / 40 |
| Selected semantic decisions | 90 |
| CORRECT_RESOLVED | 47 |
| WRONG_RESOLVED | 6 |
| CORRECT_UNRESOLVED | 7 |
| MISSED_DEFENSIBLE_RESOLUTION | 30 |
| Resolved precision | 47/53 = 88.68% |
| Resolution rate | 53/90 = 58.89% |
| Correct decisions including abstention | 54/90 = 60.00% |
| WRONG_RESOLVED / resolved | 6/53 = 11.32% |
| WRONG_RESOLVED / total | 6/90 = 6.67% |
| Exact raw evidence offsets | 903/903 = 100%, 0 failures |

| Dimension | Total | Correct resolved | Wrong resolved | Correct unresolved | Missed |
|---|---:|---:|---:|---:|---:|
| Actor | 13 | 3 | 0 | 6 | 4 |
| Attribution | 15 | 8 | 1 | 0 | 6 |
| Numeric | 19 | 5 | 3 | 0 | 11 |
| Temporal | 8 | 6 | 1 | 0 | 1 |
| Ordinal/rank | 10 | 7 | 0 | 1 | 2 |
| Contrast/negation | 16 | 10 | 1 | 0 | 5 |
| Entity boundary | 9 | 8 | 0 | 0 | 1 |
| **Total** | **90** | **47** | **6** | **7** | **30** |

## What the scores mean

An exact span is not semantic proof. Offset checks recursively visit every
textSpan occurrence, including repeated source/owner references; 903 is not a
count of distinct claims. Manual semantic adjudication checks the original text,
target, role, qualification and local scope separately.

Frame `binding=unresolved` is not treated as blanket abstention when a contained
numeric/source edge has `binding/resolutionStatus=resolved`. Those positive edges
are still assessed. Correct partial fields do not satisfy a full selected bundle.
Unresolved correct-looking candidates remain misses unless abstention was the gold.

All 90 decisions have references and reasons in `human_item_audit.md` / `labels.json`.
The 47 supported positive decisions are not inferred from test PASS or span equality.
Some retained legacy correct source fields (E4/K5) provide exact source/report
evidence but no stored explicit dependency path. That evidence-quality limitation
is noted, not treated as invented meaning.

Adjudication notes, without altering the gold:

- M2: the title refers to the right person, but a title/name identity edge is
  missing; scored incomplete, not an invented different speaker.
- S2: stored rank owner is head token Nagy; it points into the unique full Nagy
  Emese entity and matches the same frame's full actor/nsubj. Accepted as locally
  unambiguous, with head-only output limitation retained.
- B5 and I1 are composite expectations; a correct negative boundary or correct
  speaker alone does not satisfy the missing generic-human/possessor part.
- Four strict WRONG_RESOLVED items (W5,T5,K2,K3) concern missing qualifications
  around positive edges. They are not evidence of canonical fact persistence.
  K2 and K3 overlap the same event in two preselected dimensions. If an external
  reviewer instead classifies these four as omissions, a separate sensitivity
  tally would have 47 correct, 2 wrong, 34 missed, 7 correct abstentions and
  47/49 = 95.92% precision. The frozen strict labels are not overwritten, and
  categorical source/dimension errors would still block readiness.

## Generalization and safety

The engine transfers useful structure: explicit multilevel source chains, several
quote corrections, separate date/time roles, ordinal targets, multiple names,
safe coordinated-actor abstention and compound denominator retention.

The first known corpus's 34/39 cannot be compared as an equivalent benchmark to
this corpus's 47/90: wording, complexity, selected bundles and domain mix differ.
It does not justify further tuning of that first corpus.

No selected actor/rank over-resolution or rejected-alternative positive leak was
observed. B01 rate fallback remained safe but unresolved. B02 showed new source
composition/verb-coverage gaps. B03's old positive actor/correction fixtures still
pass, but the broader engine is sensitive to parser lemma and modality shapes.

Only three proposed blockers; details in `failure_taxonomy.md`:

1. **SB2-01:** numeric dimension and comparison/reference compatibility.
2. **SB2-02:** upper-bound and possibility preservation on positive edges.
3. **SB2-03:** attribution source composition and reporting/quote coverage.

No blocker was repaired in this measurement task. No production, paid provider,
full project suite, build, preflight, commit, push or deploy occurred.

## RESUME FROM HERE

Preserve SECOND_BEFORE_REPAIR and its expected labels. The next action is owner /
technical review of the three blockers and the strict qualifier adjudications.
Do not start automatic tuning or production integration. A later repair must use
a separate POST artifact and retain this first-pass result unchanged.
