# REAL_WORLD_ARTICLE_003 – Cross-Domain Semantic Foundation After Report

## Test identity and immutability

- Input: `docs/UTOM_V2_2/real_world/003_source_article.txt`
- Input SHA-256: `11541E921B4BE74139B7903D31BBAA2AB5995CBD0EAAA17FDC2281750FCBFD2E`
- Immutable first-pass raw SHA-256: `5041BED367359EE18D7E9576FC6F6383D962F2F7D2E2A72DF2D8A76B66FA96B6`
- Output: `003_after_cross_domain_semantic_foundation.json`
- This was the single post-implementation run. The first-pass JSON and source were not overwritten.
- No paid AI call, external provider call, production access, commit, or push was used.

## First blind pass versus after-foundation output

| Layer | #003 first blind pass | After foundation | Assessment |
|---|---:|---:|---|
| Entities | 3 | 40 | Recall and basic typing improved, but metadata/case suffix over-capture remains |
| Numeric mentions | 8 | 17 | Percentage, threshold, age, count and tariff kinds are now distinguished |
| Canonical claims | 1 unsafe `PROJECT_START` | 0 | Unsafe legal-to-project conversion removed |
| Relations | 0 | 0 | No unsupported relation was invented; recall remains weak |
| Events | 1 weak generic court event | 0 | Bare historical `ítélet` no longer creates an event |
| Semantic frames | unavailable | 19 | New routing layer preserves local evidence and qualifiers, but some frames are over-broad |
| Changes | 0 | 0 | No unsupported from→to change emitted |
| Conflicts | 0 | 0 | No false conflict emitted |
| Exact evidence checks | 1/1 | 19/19 | Raw offsets remain exact |

## What was recognized correctly

- Flávio Bolsonaro, Jair Bolsonaro, Lula, Ronaldo Caiado, Renan Santos and several other person mentions were recovered as person candidates.
- Liberális Párt and Munkáspárt-style organization mentions and Guardian/CNN media-context candidates were recovered as organizations in several contexts.
- Brazíliaváros was separated from a preceding person mention instead of being merged into one location span.
- `47,3 százalék`, `45,16 százalék`, `50 százalék`, `2,1 százalék`, `2,2 százalék`, `21 százalék`, `50 százalékos` and `40 százalék` received explicit percentage/threshold/tariff semantic kinds.
- Age and count forms such as `45 éves`, `27 éves`, `159 millió brazil` and `12 millió szavazó` were kept distinct from percentages.
- The legal-investigation sentence no longer became a `PROJECT_START` claim.
- The sentence containing a historical judgment reference no longer became a court event.
- Admission, denial and conditional/promise cues are represented as separate frame classes where the local pattern is recognized.
- All 19 persisted semantic-frame evidence spans matched the original raw article offsets exactly.

## Important information missed or weakly represented

- The article's central election result was not projected as a canonical claim or relation; only a routing frame exists.
- The two election percentages were both bound to Flávio Bolsonaro in one frame instead of keeping the second value with Lula.
- The 2.1% and 2.2% candidate percentages were split inconsistently: one frame binds 2.1% to Ronaldo Caiado, while its actor is Renan Santos.
- No canonical relation was produced for family, party leadership, election advancement, or the promised pardon/amnesty.
- Article metadata and image-credit text caused false or oversized entity spans, including byline/caption fragments.
- Several inflected names were retained as separate identities (`Bolsonarónak`, `Bolsonaróhoz`, `Jair Bolsonaróról`, `São Paulót`, `Minas Gerais-t`) instead of a normalized identity plus grammatical surface form.
- Some media attribution frames used punctuation or surrounding prose as labels, for example a quote marker or a long clause.
- The new frame layer emitted duplicate frames for the same admission/denial sentence.
- Some conditional/promise frames lack an actor or retain `conditionality: false` despite a conditional status.
- No useful event timeline was projected from the election, investigation, campaign and promised future actions.

## Human audit classification

### HELYESEN FELISMERTE

Basic person/location boundary recovery, several numeric kinds, exact evidence spans, and abstention from the two unsafe canonical outputs above.

### KIHAGYTA

Most explicit relations, canonical election claims, event participants, and a usable temporal sequence.

### ROSSZUL ÉRTETTE / ROSSZUL KÖTÖTTE

Multi-subject percentage binding, several actor/subject choices, and some source/byline/caption boundaries.

### NEM ALÁTÁMASZTOTT

No canonical claim or event was persisted after the safety gates. The frame layer nevertheless contains routing-level over-classifications; these are treated as semantic safety findings, not accepted facts.

### DUPLIKÁCIÓ

The admission and denial sentence generated duplicate semantic frames. Some media/report frames also repeat the same source context.

### EMBERI ELLENŐRZÉST IGÉNYEL

Whether every campaign and legal statement should become a canonical event or relation requires product-level ontology decisions; this run does not infer those decisions.

## Safety measurements

- Total semantic-frame evidence spans: 19
- Exact raw-offset matches: 19
- Evidence failures: 0
- Numeric mentions: 17; all finite and typed
- Canonical unsupported claims: 0
- Canonical false events: 0 emitted after the stricter event gate
- False conflicts: 0
- Duplicate semantic frames: present (at least one repeated admission/denial pair)
- Multi-subject numeric safety: **FAIL** for the 47.3/45.16 and 2.1/2.2 examples because one frame's actor and numeric subject do not consistently agree
- Attribution safety: **PARTIAL**; source context is recovered, but some labels and quote boundaries are wrong
- Conditional/future safety: **PARTIAL**; no future promise became a canonical completed event, but several frame qualifiers are internally inconsistent

## REAL_WORLD_003_FINDINGS

1. **HIGH – multi-subject numeric binding remains unsafe.** General numeric extraction finds both values, but the local frame can attach both to the first actor or mismatch frame actor and numeric subject. Affected module: `lib/v2/deterministic-semantic.js` numeric/frame binding.
2. **HIGH – entity span boundary leakage.** Byline, photo-credit and sentence-prefix text can be included in person or organization mentions. Affected module: entity candidate extraction and metadata segmentation.
3. **HIGH – attribution scope leakage.** Quote markers and surrounding clauses can be used as attribution labels. Affected module: `attributionFor` and semantic-frame source context.
4. **MEDIUM – duplicate frame emission.** One sentence can produce repeated admission/denial frames. Affected module: `extractSemanticFrames` deduplication.
5. **MEDIUM – inflected identity normalization is incomplete.** Hungarian case suffixes remain in several normalized names. Affected module: entity normalization.
6. **MEDIUM – frame qualifier consistency.** Some frames have a conditional status while the boolean conditionality or modality does not agree. Affected module: `semanticFrameActions` and frame status mapping.
7. **MEDIUM – canonical relation/event recall is still low.** The safety gate abstains correctly, but the current layer does not yet project a useful election/campaign/legal timeline. Affected module: semantic-frame routing and canonical projection boundary.

These findings are recorded for the next owner-approved hardening round. No #003-specific or post-result intelligence modification was made after the single after-run.

## Final classification

`REAL WORLD ARTICLE #003: PARTIAL`

`TEXTUAL GROUNDING SAFETY: PASS`

`SEMANTIC ENTAILMENT SAFETY: FAIL`

`EVIDENCE SAFETY: PASS`

`UNSUPPORTED CLAIM SAFETY: PASS` (no unsupported canonical claim was persisted; routing-frame overclassification remains)

`ATTRIBUTION SAFETY: PARTIAL`

`TEMPORAL UNDERSTANDING: WEAK`

`CLAIM COVERAGE: WEAK`

`ENTITY/RELATION COVERAGE: PARTIAL`

`EVENT PRECISION: PASS` (zero events emitted after the safety gate; recall is weak)

`FALSE CONFLICT SAFETY: PASS`

## Generalization comparison

- **#001 original blind baseline:** the initial Volvo article run contained unsafe or weak numeric/temporal interpretations that motivated the hardening work.
- **#001 final hardened result:** evidence and temporal safety improved after the approved rounds, with domain-specific findings closed under their stated tests.
- **#002 blind baseline:** a different article domain exposed the need to test generalization independently; it was not used as a tuning source in this run.
- **#003 after foundation:** generic typing, numeric kinds, abstention and exact evidence offsets improved materially, but multi-subject binding, metadata boundaries, attribution scope and canonical recall remain insufficient for a PASS.

The cross-domain layer therefore transfers some safety improvements across domains, but the measured result does not justify claiming complete semantic generalization.
