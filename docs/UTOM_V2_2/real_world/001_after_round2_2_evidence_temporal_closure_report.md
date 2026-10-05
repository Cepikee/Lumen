# REAL_WORLD_ARTICLE_001 – Round 2.2 evidence and temporal closure

## Frozen state and immutable artefacts

- Branch: `develop/utom-recovery`
- HEAD at freeze: `c111f880b5e4117d958af029a330b72b933f0cad`
- Freeze record: `001_round2_2_state_freeze.json`
- Working-tree status hash at freeze: `3bd483cd01d6f5dee2310a35c4a687f735d56ce7e7f8de8f75e10dd65709844c`
- Source article SHA-256: `8201C036E78C91A0C1DB26C6EE1BEC86217EFCB70AF7DA3EBD049D9EFCF2180E`
- First-pass SHA-256: `22BF2986BB5D1ECBEEEE78A0190FD3A24D535FFB7B0A4E41B5919FED8794A0B1`
- Round 1 SHA-256: `609724EFE071C6B93FBCBAFF4C51924CF15D567D6CFAE8422198F041C539EC44`
- Round 2 SHA-256: `0D8786F4F7F55AFE6072DA45732B91D7A63A729CD08A4BE2942EBFC7E3A263F3`
- Round 2.1 SHA-256: `8A3874741C75DBF6D0564ED63A66A3AD00520AB58ABFC6F205C957AAF45BD0C5`
- Round 2.2 output SHA-256: `C1188C34792C2B2A86296912B68E63E2FC7FDCE0F07D0FFCC3E711AAAD45ED8C`

The source and all earlier result files were verified unchanged. The new result was generated exactly once after the general regression and integration gates. No benchmark gold, Volvo-specific answer key, paid AI call, external provider call, production database or deployment was used.

## General fixes applied before the single real-article run

1. Evidence-bearing extraction now uses an offset-preserving segmented source and offset-preserving sentence records. Metadata/title masking keeps the original string length, and NFC normalization is skipped on the raw-coordinate path.
2. Numeric delta mentions are represented in the existing additive `changes` output. They carry property, delta value, unit, direction, approximation, safe subject when available, time/attribution/uncertainty and raw evidence.
3. Generic from→to changes are detected across distance, amount, percentage, temperature, headcount, age and speed wording. The model keeps `from`, `to`, `unit`, `direction`, `time`, `status`, attribution, uncertainty and evidence.
4. Temporal changes remain changes, not cross-source conflicts, and no winner is selected.

## First result after Round 2.2

Output: `001_after_round2_2_evidence_temporal_closure.json`

- entities: 8
- relations: 1
- claims: 10
- numeric mentions: 21
- events: 7
- changes: 3
- conflicts: 0

### Entities and relation

The provider retained eight source-grounded entities and one explicit relation: `Zoltán — ACQUIRED — Volvo V60 PHEV`. It did not invent the unnamed dealers or Zoltán's wife as named entities.

### Claims

The output keeps 153k, 227k, 168k, 247k, 257k and 170k km observations distinct, with reported, displayed, estimated and comparison status where the local text supports it. The 1.5M HUF legal demand remains `CLAIM_AMOUNT`; the 169k/256k km values remain reference-class comparisons. Evidence spans are raw-source sliceable for all 10 claims.

### Changes

| Kind | Property | Value | From | To | Unit | Direction | Approx. | Time | Evidence |
|---|---|---:|---:|---:|---|---|---|---|---|
| delta | DISTANCE | 74,000 | – | – | generic number | increase | yes | 2018-12 | `74 ezerrel több` |
| delta | DISTANCE | 75,000 | – | – | km | increase | yes | unknown | `75 ezer kilométerrel magasabb` |
| from_to | DISTANCE | – | 168,000 | 247,000 | km | increase | yes | 2020-06 | `168 ezerről 247 ezer kilométer közelébe ugrott` |

The 75k phrase is no longer an absolute `DISTANCE=75000` claim. It is an approximate delta with an increase direction and vehicle subject. The 168k→247k odometer jump is a structured from→to change with June 2020 context and no conflict. The 74k phrase is safely retained as a generic-number delta because the local clause does not itself repeat the unit; it is not promoted to an unsupported absolute measurement.

## Human audit classification

### Correctly recognized

- article entities, the explicit purchase relation and seven concrete event categories;
- source-local 153k and 227k reported mileage observations;
- displayed 168k/247k readings and estimated 257k mileage;
- comparison-class 169k/256k values;
- absolute 1.5M HUF claim and 4.5M HUF estimated obligation;
- approximate 75k mileage delta and 168k→247k temporal change;
- raw evidence text and coordinates for all persisted claims and changes;
- no false conflict and no automatic winner.

### Omitted or only partially structured

- unnamed dealer identities and the spouse as independently named participants;
- full causal linkage between software manipulation, steering play and service-book edits;
- several role-only participants in repair and legal events;
- complete legal first-instance/second-instance reasoning as a typed graph;
- a safe subject for the 74k delta and a repeated local unit for that phrase.

### Most dangerous remaining limitations

1. The 74k delta has a generic `number` unit because the local evidence phrase omits the unit; the system abstains instead of importing a distant unit.
2. Role-only legal and repair events remain participant-sparse; this is incomplete context, not invented attribution.
3. The article contains several causal and legal propositions outside the current deterministic predicate vocabulary.

### Unsupported claims and conflicts

- Unsupported claims observed: 0.
- False conflicts observed: 0.
- Duplicate projections observed: 0.
- Automatic conflict winner: none.

## Measurement summary

This is one article, so percentages are descriptive and are not a statistically meaningful benchmark estimate.

| Metric | Result |
|---|---|
| Important entity coverage | PARTIAL |
| Important relation coverage | PARTIAL |
| Important claim coverage | PARTIAL |
| Critical fact coverage | PARTIAL |
| Temporal change recognition | STRONG for the exercised from→to pattern; article-wide coverage remains PARTIAL |
| Attribution correctness | PASS for exercised reported observations; article-wide role attribution remains PARTIAL |
| Negation preservation | PASS for exercised paths |
| Modality/conditionality preservation | PASS for exercised delta/estimate paths; article-wide coverage remains PARTIAL |
| Evidence correctness | PASS; every claim and change has source-backed text |
| Raw evidence-offset correctness | PASS; `raw.slice(start,end) === textSpan` for every persisted claim/change |
| Truly unsupported claim count | 0 |
| False conflict count | 0 |
| Duplicate count | 0 |

## Test and gate results

- Round 2.2 targeted regression: **PASS** (3/3)
- Round 2.1 targeted regression: **PASS** (7/7)
- Round 2 targeted regression: **PASS** (7/7)
- Round 1 targeted regression: **PASS** (8/8)
- Full offline suite: **PASS** (476/476)
- Deterministic core/dense benchmark: **PASS**
- Frozen held-out regression: **PASS as a regression run**; broad coverage remains intentionally partial
- TypeScript: **PASS**
- Import check: **PASS**
- ESLint: **PASS, 0 errors** (403 existing warnings)
- `npm run check`: **PASS**
- Production build: **PASS** (75 generated pages)
- MySQL 8.0.46 full wrapper: **PASS**; all executed integration tests passed, including fresh migrations, recovery, entity/relation/claim/event/temporal/read-model/source-comparison/retention/pipeline and HTTP lifecycle gates
- FFmpeg: **SKIP** – executable unavailable in the disposable environment
- `npm audit --omit=dev`: **0 vulnerabilities**
- Full `npm audit`: **5 high dev-toolchain findings** through `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob`/`micromatch`/`braces`; npm's proposed fix is the incompatible `eslint-config-next@14.2.35`, so no forced downgrade was made

## REAL_WORLD_001_FINDINGS

| ID | Severity | Generalizable | Finding | Affected module | Status |
|---|---|---|---|---|---|
| R22-001 | High | Yes | Raw evidence coordinates were shifted by preprocessing trim | `lib/v2/deterministic-semantic.js` | FIXED |
| R22-002 | High | Yes | Property delta could be projected as an absolute property | `lib/v2/deterministic-semantic.js`, `lib/v22/deterministic-text-provider.cjs` | FIXED |
| R22-003 | High | Yes | Scalar from→to changes kept only the final value | `lib/v2/deterministic-semantic.js`, `lib/v22/deterministic-text-provider.cjs` | FIXED |

## Final status

`REAL WORLD ARTICLE #001: PASS`

`EVIDENCE SAFETY: PASS`

`UNSUPPORTED CLAIM SAFETY: PASS`

`ATTRIBUTION SAFETY: PASS`

`TEMPORAL UNDERSTANDING: STRONG`

`CLAIM COVERAGE: PARTIAL`

`ENTITY/RELATION COVERAGE: PARTIAL`

`FALSE CONFLICT SAFETY: PASS`

### Best five correctly understood items

1. The 227k Dutch service observation is retained as reported evidence.
2. The 1.5M HUF legal demand remains an absolute claim amount.
3. The 169k/256k figures are comparison-class mileage, not the concrete vehicle's reading.
4. The 75k phrase is an approximate delta rather than a fake absolute distance.
5. The 168k→247k odometer jump is a time-bounded from→to change without a conflict winner.

### Five most important omissions

1. unnamed dealer identities;
2. independently typed spouse identity;
3. complete causal chain around software, steering and service-book manipulation;
4. full role linkage for repair and legal events;
5. complete legal procedural graph and causal consequences.

### Recommended general next-round groups

- safe role-to-entity resolution with explicit evidence;
- causal event/property linkage;
- legal procedure and decision-state projection;
- unit inheritance only when a deterministic local evidence rule proves it;
- broader source-grounded relation coverage without co-occurrence inference.
