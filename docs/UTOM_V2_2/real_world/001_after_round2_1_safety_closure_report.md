# REAL_WORLD_ARTICLE_001 – Round 2.1 safety closure

## Frozen input and immutable artifacts

- Input: `docs/UTOM_V2_2/real_world/001_source_article.txt`
- Input SHA-256: `8201C036E78C91A0C1DB26C6EE1BEC86217EFCB70AF7DA3EBD049D9EFCF2180E`
- First-pass SHA-256: `22BF2986BB5D1ECBEEEE78A0190FD3A24D535FFB7B0A4E41B5919FED8794A0B1`
- Round 1 output SHA-256: `609724EFE071C6B93FBCBAFF4C51924CF15D567D6CFAE8422198F041C539EC44`
- Round 2 output SHA-256: `0D8786F4F7F55AFE6072DA45732B91D7A63A729CD08A4BE2942EBFC7E3A263F3`
- Branch: `develop/utom-recovery`
- HEAD at freeze: `c111f880b5e4117d958af029a330b72b933f0cad`
- Freeze record: `001_round2_1_state_freeze.json`

The prior three result files and the source article were verified unchanged. The new result was generated exactly once after the code and test gates below passed. No benchmark gold or article-specific answer key was supplied to the provider.

## General fixes applied before the single run

1. Delta-like numeric mentions no longer fall through to `VEHICLE_COUNT` (or another count predicate). A bare `74 ezerrel` remains a numeric approximate delta and produces no fabricated count claim.
2. Numeric qualifiers are represented separately: `lower_bound`, `upper_bound`, `range`, `approximate`, `delta`, `comparison`, and `absolute`.
3. Numeric claim semantics are clause-local. The reported `227 ezer kilométer` observation stays reported/asserted even when a later clause says `nagyjából 74 ezerrel több`.
4. The `1,5 millió forint` demand remains an absolute `CLAIM_AMOUNT`; the nearby `értékkülönbség` does not turn it into a comparison.
5. Generic `megállapodott ... -val/-vel` no longer creates `PARTNER_OF`. The real article retains only the explicit `ACQUIRED` relation.
6. The 169/256 thousand-kilometre figures are marked as `reference_class` comparisons for similar vehicles, rather than measurements of the concrete Volvo.
7. Event participants use only explicit article-local names/products. The purchase event contains Zoltán and Volvo V60 PHEV; no inferred spouse or unnamed dealer is fabricated.
8. Duplicated title lines are masked before downstream numeric projection; the original raw article remains untouched.
9. The MySQL wrapper now leaves the recovery integration's phased reset/migration fixture to that test instead of pre-migrating it.

## First-pass result after Round 2.1

Output: `001_after_round2_1_safety_closure.json`

- entities: 8
- relations: 1
- claims: 11
- numeric mentions: 21
- events: 7
- conflicts: 0

### Entities

The deterministic provider extracted Volvo V60 PHEV, Hovány, Novák András, D5T5, Vágány Tamás, Lajos, Zoltán and Auto DNA. Unnamed Dutch/German dealers, Zoltán's wife and generic roles remain unresolved rather than being invented.

### Relations

The only projected relation is:

`Zoltán — ACQUIRED — Volvo V60 PHEV`

The earlier false-positive `Lajos — PARTNER_OF — Zoltán` is absent.

### Numeric safety

The result correctly keeps the 227,000 km service observation separate from the approximate 74,000 km delta. The 1.5 million HUF legal demand is absolute. The 169,000/256,000 km values are comparison/reference-class values. The 1–3 year legal penalty is a range.

The remaining precision limitation is that the 75,000 km phrase in “körülbelül 75 ezer kilométerrel magasabb futásteljesítmény” is still projected as a `DISTANCE` estimate instead of a dedicated delta/property relation. This is a general semantic gap, not an article-specific patch.

### Events and timeline

The provider emits purchase, contract, measurement change, repair, demand, litigation and court-decision events. The purchase and contract events have explicit participants. Several later events remain participant-sparse because the text uses roles or pronouns; no participants were guessed.

### Conflicts and evidence

No automatic conflict winner or false conflict was emitted. All 11 claims retain non-empty evidence text. However, the existing `evidenceSpan` offsets are based on the trimmed/segmented projection and do not validate directly against the original raw-file offsets for this article. Therefore evidence text is traceable, but raw-offset integrity is not yet safe enough for a PASS.

## Human audit classification

### Correctly recognized

- core Volvo, Zoltán and Lajos mentions;
- 153k, 168k, 227k, 247k, 257k and 170k mileage observations with distinct reported/displayed/estimated status where the local wording supports it;
- 13,700 EUR, 4.4M HUF, 5.2M HUF, 330k HUF, 442k HUF and the 1.5M HUF claim amount;
- similar-vehicle reference values at 169k and 256k km;
- the purchase relation and explicit purchase participants;
- no fabricated `PARTNER_OF` relation and no automatic conflict winner.

### Omitted or only partially structured

- unnamed dealer identities and the spouse as a separate person;
- the full causal chain of software manipulation, steering play and hidden service-book edits;
- detailed repair-participant and court-participant roles;
- the legal distinction between first and second instance beyond the available event text;
- property-level linkage between the 75k mileage difference and the displayed mileage.

### Most dangerous remaining misunderstandings

1. A property delta can still be represented as a generic `DISTANCE` estimate when no dedicated property relation is available.
2. A displayed odometer jump is projected as the later value, without a structured from/to change claim.
3. Generic role phrases can yield events with no participants, which is safe against fabrication but incomplete for downstream navigation.
4. The legal demand amount has no explicit claimant/defendant subject in the read model.
5. Evidence text is present, but raw source offsets are shifted by preprocessing trim and require a subsequent general fix.

## Measurement summary

This is one article, so percentages are descriptive only and are not a statistically meaningful accuracy estimate.

| Metric | Result |
|---|---:|
| Important entity coverage | PARTIAL; denominator is not stable for one article |
| Important relation coverage | PARTIAL; explicit acquisition found, several role/property links omitted |
| Important claim coverage | PARTIAL; 11 structured claims, many legal/causal propositions remain untyped |
| Critical fact coverage | PARTIAL |
| Temporal change recognition | PARTIAL; observations are separated, full 168→247 change is not a structured from/to claim |
| Attribution correctness | PARTIAL; explicit reported sources are retained, role attribution remains incomplete |
| Negation preservation | PASS for exercised article claims; no false negation was introduced |
| Modality/conditionality preservation | PARTIAL; local approximate/reported distinctions work, article-wide legal nuance remains incomplete |
| Evidence text correctness | 11/11 claims have non-empty source text |
| Raw evidence-offset correctness | FAIL for direct raw-file slicing because preprocessing trim shifts offsets |
| Truly unsupported claim count | 0 observed in this run; semantic misclassification remains possible |
| False conflict count | 0 |
| Duplicate projection count | 0; duplicated headline was not emitted twice |

## Gate results

- Round 2.1 targeted regression: **PASS** (7/7)
- Round 2 regression: **PASS** (7/7)
- Full offline suite: **PASS** (473/473)
- Deterministic core/dense benchmark: **PASS**
- Held-out benchmark: **PASS as a regression run; coverage remains partial by design**
- TypeScript: **PASS**
- Import check: **PASS**
- ESLint: **PASS, 0 errors** (warnings remain)
- Production build: **PASS** (75 static pages)
- MySQL integration wrapper: **PASS**; recovery 30/30 and all executed integration files passed
- FFmpeg integration: **SKIP – executable unavailable in this environment**
- `npm audit --omit=dev`: **0 vulnerabilities**
- Full `npm audit`: **5 high dev-toolchain findings** (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob`/`micromatch`/`braces`); npm offers only an incompatible major downgrade to `eslint-config-next@14.2.35`, so no unsafe forced change was made.

## REAL_WORLD_001_FINDINGS

| ID | Severity | Generalizable | Finding | Likely root cause | Affected module | Status |
|---|---|---|---|---|---|---|
| R21-001 | High | Yes | Raw evidence offsets do not slice the original article after preprocessing trim | `clean(segmentArticleText(...))` removes leading masked title bytes without offset rebasing | `lib/v2/deterministic-semantic.js` | OPEN – next round |
| R21-002 | Medium | Yes | Property deltas can remain generic DISTANCE claims | Numeric layer has no property/delta claim binding for mileage differences | `lib/v2/deterministic-semantic.js` | OPEN – next round |
| R21-003 | Medium | Yes | Odometer jump lacks structured from/to change projection | Scalar extraction retains only the later scalar in a compound sentence | `lib/v2/deterministic-semantic.js` / `lib/v22/deterministic-text-provider.cjs` | OPEN – next round |
| R21-004 | Medium | Yes | Role-only legal/repair events have sparse participants | Participant extraction is intentionally explicit-only and has no role-resolution projection | `lib/v22/deterministic-text-provider.cjs` | OPEN – next round |

No article-specific rule or gold answer key was added. No intelligence code was changed after the single Round 2.1 output generation.

## Final status

`REAL WORLD ARTICLE #001: PARTIAL`

`EVIDENCE SAFETY: FAIL`

`UNSUPPORTED CLAIM SAFETY: PARTIAL`

`ATTRIBUTION SAFETY: PARTIAL`

`TEMPORAL UNDERSTANDING: PARTIAL`

`CLAIM COVERAGE: PARTIAL`

`ENTITY/RELATION COVERAGE: PARTIAL`

`FALSE CONFLICT SAFETY: PASS`
