# REAL_WORLD_ARTICLE_003 – Cross-Domain Semantic Hardening Round 2

## Frozen run identity

- Input SHA-256: `11541E921B4BE74139B7903D31BBAA2AB5995CBD0EAAA17FDC2281750FCBFD2E`
- Immutable first-pass SHA-256: `5041BED367359EE18D7E9576FC6F6383D962F2F7D2E2A72DF2D8A76B66FA96B6`
- Immutable after-foundation SHA-256: `778DDAE08F6A9DEFEE8219B6B0DFB775BEC46E195908AA7C7D4798DA34BCF2BB`
- Deterministic semantic layer SHA-256: `456004DBE83ABBAD63523C08B8047BA849089C91142E40F38264B75764126C72`
- Entity provider SHA-256: `88CAB2995E4EA5F3B01DB7CEAB59ED835C7ED24328E06D682750001EDD2AA14B`
- V2.2 provider SHA-256: `DEDE26749235C61D62E6C89E8F7F9F3214672139E5839DDED120CDFE89793D4E`
- Raw result: `003_after_cross_domain_hardening_round2.json`
- The output was created once with an exclusive-create guard. No intelligence code was changed after this run.

## General regression evidence before the single after-run

The Round 2 generalization set contains economy, sport, healthcare, energy,
education, weather, court, and corporate-attribution examples. It contains no
REAL_WORLD_ARTICLE_003 names, values, or sentences.

| Metric | Result |
|---|---:|
| Curated frame precision | 100% (12/12) |
| Curated frame recall | 100% (12/12) |
| Actor binding accuracy | 100% (12/12) |
| Numeric-subject binding accuracy | 100% (12/12) |
| Attribution regression cases | PASS |
| Conditional consistency regression cases | PASS |
| Duplicate-frame regression cases | PASS; 0 duplicate |
| Entity typing precision | 100% (6/6) |
| Entity typing recall | 100% (6/6) |
| Cross-domain targeted tests | 21/21 PASS |
| Complete offline suite | 490/490 PASS |

The frozen core benchmark retained exact evidence and semantic support with zero
truly unsupported predictions. Core entity precision/recall were 0.84/0.9130;
dense entity precision/recall were 0.76/0.95. The frozen held-out run retained
evidence accuracy 1.0, zero truly unsupported predictions, zero duplicate
projections, and false-conflict rate 0. Its lower coverage remains visible and
was not hidden by this round.

## Single after-run output

| Layer | After foundation | Round 2 after | Assessment |
|---|---:|---:|---|
| Entities | 40 | 25 | Metadata noise and repeated inflected identities reduced, but boundary/typing errors remain |
| Numeric mentions | 17 | 17 | Numeric extraction remained stable |
| Canonical claims | 0 | 0 | Conservative projection abstained |
| Relations | 0 | 0 | Conservative projection abstained |
| Events | 0 | 0 | Conservative projection abstained |
| Changes | 0 | 0 | No false scalar change |
| Conflicts | 0 | 0 | No false conflict |
| Semantic frames | 19 | 20 | Dedup improved, but important binding and attribution errors remain |
| Exact evidence offsets | 19/19 | 20/20 | PASS |

## Improvements confirmed on the real article

- Jair Bolsonaro and Flávio Bolsonaro inflected surface forms were merged into
  their same-article canonical identities while their raw forms were retained.
- Guardian and CNN are `media_source`; `rendőrség` is an `official_source`.
  Semantic role no longer replaces entity identity.
- The admission and denial sentence became two local proposition frames, with
  `affirmed` and `denied` polarity and without duplicate whole-sentence frames.
- The canonical frame key produced zero exact duplicate frames in this run.
- Byline and photo-credit material no longer appeared as extracted entities.
- All 20 frame evidence spans exactly slice the immutable raw article.
- No unsupported canonical claim, relation, event, change, or conflict was
  persisted.

## Remaining semantic failures

### HIGH – multi-subject binding still fails on unseen syntax

The central result sentence still emits one frame whose actor is the shortened
`Bolsonaro` entity and whose two numeric arguments are both bound to that same
subject. The second percentage is not bound to Lula. The later two-candidate
sentence similarly binds both percentages to Renan Santos instead of splitting
Ronaldo Caiado and Renan Santos. The general fixture patterns passed, but the
real article's title/name/context and relative-clause syntax exposed an unclosed
generalization gap.

### HIGH – attribution scope still leaks a clause

The sentence containing `CNN szerint` produced attribution label
`ő reménysége a CNN`. This violates the rule that a source label cannot be a
pronoun-led clause. Other media/official attribution cases were correct, so the
failure is syntax-specific but generalizable.

### HIGH – entity boundary and typing remain unsafe

- `Freitast São Paulo` was emitted as one person span, combining a person suffix
  with a location.
- `São Paulót` and `Minas Gerais-t` were typed as persons rather than locations.
- `Donald Trumppal`, `Brazíliavárosban`, `Kínában`, and `Európában` retained
  inflected canonical forms because no safe same-article base mention was found.
- `Lula Munkáspártja` and `Munkáspártot` remain separate organization identities.

### HIGH – frame qualifier consistency is not fully closed

One election/result frame has `conditionality: true` and conditional modality,
but `status: observed`. This is the inverse of the originally targeted
contradiction and is still internally inconsistent. A CNN report frame also
attaches the population percentage to CNN as numeric subject, showing that
source attribution and proposition subject can still be conflated.

### Coverage limitation

The safe canonical boundary emitted no claims, relations, events, timeline
items, changes, or conflicts. This prevents unsafe persistence but means the
article still does not yield a useful canonical election read model.

## Safety gates

`TEXTUAL GROUNDING SAFETY: PASS`

`SEMANTIC ENTAILMENT SAFETY: FAIL`

`MULTI-SUBJECT NUMERIC SAFETY: FAIL`

`ENTITY BOUNDARY SAFETY: FAIL`

`ENTITY TYPING: FAIL`

`ATTRIBUTION SAFETY: FAIL`

`FRAME DEDUPLICATION: PASS`

`CONDITIONAL CONSISTENCY: FAIL`

`EVIDENCE SAFETY: PASS`

`FALSE CONFLICT SAFETY: PASS`

`OLD BENCHMARK REGRESSION: PASS`

`MYSQL 8 FULL GATE: PASS`

## Quality and integration gates

- TypeScript: PASS
- Import validation: PASS
- ESLint: 0 errors; 405 existing warnings
- Offline: 490/490 PASS
- `npm run check`: PASS
- Production build: PASS; 75/75 pages generated
- MySQL 8.0.46 full wrapper: 59 PASS / 0 FAIL / 1 environment SKIP
- MySQL skip: real FFmpeg executable unavailable
- Production dependency audit: 0 vulnerabilities
- Full dependency audit: 5 high findings in the development lint dependency
  chain (`braces` via `micromatch`/`fast-glob`); the offered fix is breaking and
  was not forced
- Paid AI calls: 0
- External AI/provider calls: 0
- Production and production DB: untouched

## Architecture decision

`RECOMMENDATION: C – MÉG NINCS ELÉG BIZONYÍTÉK`

The deterministic path remains the current production-safe option. A local NLP
layer may improve Hungarian morphology, NER, and dependency-based binding, but
no concrete model has yet demonstrated better frozen-set quality, bounded CPU,
RAM and cold-start cost, acceptable licensing, reliable Node/Next.js packaging,
offline operation, or maintainable failure behaviour. No model was integrated.

## Final classification

`CROSS-DOMAIN SEMANTIC HARDENING ROUND 2: PARTIAL`

The round materially improved deduplication, evidence preservation, source-role
separation, byline/caption filtering, admission/denial splitting, and selected
same-article inflection normalization. It cannot be classified PASS because the
single immutable real-world run still contains multiple HIGH semantic
misclassifications. These results are preserved for owner/technical review; no
post-result intelligence tuning was performed.
