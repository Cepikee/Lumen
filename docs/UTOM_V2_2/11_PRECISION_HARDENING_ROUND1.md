# V2.2 Precision Hardening Round 1

## Határ és kanonikus útvonal

Ez a kör a canonical, evidence-first szemantikát erősítette. A benchmark-adapter (`lib/v22/deterministic-text-provider.cjs`) most ugyanazt a gold-független, újrahasznosítható logikát használja, mint a kontrollált canonical provider tesztek (`lib/v2/deterministic-semantic.js`). A helper nem importál gold manifestet, scenario-ID-t vagy benchmark fixture-t, és nem ír adatbázist. Az alapértelmezett production provider továbbra is explicit mock policy; a determinisztikus provider opt-in, így a precision javítása nem kapcsol be váratlanul production extractiont.

Controlled canonical flow:

`raw article → createIngestionEnvelope → deterministic entity/claim/relation provider → V2 contract validation → existing persistence/read-model/showcase gates`

A raw→DB→read-model→showcase integráció korábbi M4/M13/M18 tesztjei megmaradtak; ez a kör az extraction boundary-t és a szemantikai contractot kötötte hozzájuk. Paid AI és payment: `0`.

## False-positive analysis

A top-50 riport gépileg újragenerálható:

```text
node scripts/analyze-v22-false-positives.cjs
```

Részletes sorok: `docs/UTOM_V2_2/11_false_positives_top50.json`. Minden sor tartalmaz scenario/source azonosítót, evidence-snippetet, predictiont, legközelebbi expected elemet, kategóriát és root-cause komponenst.

| Integrity class | Top-50 előfordulás |
|---|---:|
| TRUE_UNSUPPORTED | 0 |
| SUPPORTED_BUT_NOT_IN_GOLD | 41 |
| SEMANTIC_MISMATCH | 0 |
| DUPLICATE | 9 |
| EVALUATOR_MISMATCH | 0 |
| **Összesen** | **50** |

A legnagyobb ok a korábbi széles tulajdonnév-regex volt. A javítás erős helyi context cue-kat, legal minimum két-tokenes személynevet, szervezet/projekt/hely cue-kat és namesake identity hintet használ; bizonytalan jelöltnél abstainol.

## Mérés: deterministic baseline

| Tier | Mutató | Előző | Round 1 után |
|---|---|---:|---:|
| Core | entity precision | 0.0811 | 1.0000 |
| Core | entity recall | 0.1304 | 0.1739 |
| Core | claim precision | 0.0479 | 0.4333 |
| Core | claim recall | 0.1739 | 0.2826 |
| Core | supported claim precision / recall | – | 0.5000 / 0.4444 |
| Core | attribution accuracy | 0.7500 | 0.9231 |
| Core | evidence accuracy | 1.0000 | 1.0000 |
| Core | negation accuracy | 1.0000 | 1.0000 |
| Core | modality accuracy | 1.0000 | 0.9231 |
| Core | unsupported prediction rate | 0.9214 | 0.5000 |
| Dense | entity precision / recall | 0.1481 / 0.2000 | 0.5000 / 0.2000 |
| Dense | claim precision / recall | 0.2143 / 0.1500 | 0.4694 / 0.3833 |
| Dense | supported claim precision / recall | – | 0.5395 / 0.5062 |
| Dense | attribution accuracy | 0.7222 | 0.8913 |
| Dense | evidence accuracy | 1.0000 | 1.0000 |
| Dense | negation accuracy | 1.0000 | 1.0000 |
| Dense | modality accuracy | 1.0000 | 1.0000 |
| Dense | unsupported prediction rate | 0.7634 | 0.5283 |

The direct-denial attribution fixture was corrected in Round 2 so the official speaker is present in source text. The resulting score is the canonical post-integrity measurement; the previous accepted fixture limitation is closed as `V22-INT-F005`.

## Canonical conflict semantics

`lib/v2/conflict-history.js` now preserves modality/polarity/status fields in the canonical claim and:

- treats `1 km` and `1000 m`, illetve `10 million HUF` and `0.01 billion HUF` as equal after explicit unit conversion;
- keeps plan vs completed event states as a non-conflict;
- continues to require same subject, predicate, claim type and overlapping time;
- keeps real same-scope project-cost differences as open candidates with `automaticWinner: null`.

## Robustness and regression evidence

- 10 core source variants are re-run after paragraph reordering and whitespace normalization;
- evidence spans remain exact substrings;
- numeric outputs remain finite;
- namesake contexts remain distinct;
- negation and conditional modality are preserved;
- canonical entity, claim and relation providers pass V2 contract validation;
- static gold-leak check passes.

## Findings

### V22-INT-F002 – Broad text regex generated unsupported semantic claims

- Severity: `HIGH`
- Root cause: benchmark-only parser emitted filler `szerint`/unknown sentences as `TEXT_ASSERTION` and classified weak capitalized words as entities.
- Fix: shared `lib/v2/deterministic-semantic.js`, context-bound predicates, conservative abstention and exact evidence spans.
- Regression: `tests/unit/v22-precision-hardening.test.cjs`, false-positive top-50 generator.
- Status: `FIXED`.

### V22-INT-F003 – Canonical conflict comparison ignored convertible units and event modality

- Severity: `HIGH`
- Root cause: numeric comparison rejected every unit mismatch and discarded `plan`/`completed` state.
- Fix: explicit conversion table and modality preservation in `lib/v2/conflict-history.js`.
- Regression: `tests/unit/v2-conflict-history.test.cjs`.
- Status: `FIXED`.

### V22-INT-F004 – Canonical deterministic provider contracts were not executable

- Severity: `MEDIUM`
- Root cause: only mock providers existed, so the reusable semantic path could not be contract-tested end to end.
- Fix: opt-in deterministic entity/claim/relation providers and canonical runtime regression.
- Regression: `tests/unit/v22-precision-hardening.test.cjs`.
- Status: `FIXED`.

### V22-INT-F005 – One benchmark attribution was not textually grounded

- Severity: `LOW` (measurement limitation, not production code failure)
- Reproduction: the core direct-denial expected record assigns an official speaker to a sentence that contains no speaker name or attribution cue.
- Root cause: controlled gold fixture semantics exceeded the observable source span.
- Fix: the direct-denial source sentence now names the mentőszolgálat; generated articles and gold manifest were regenerated, and official-attribution parsing was added to the shared helper.
- Status: `FIXED` in Round 2; source derivability is now explicit.

## Quality gate

The precision changes were validated with 25 targeted semantic/conflict/oracle tests and the full repository gate: TypeScript PASS, offline 439/439 PASS, ESLint 0 errors (existing warnings only), import check PASS, `npm run check` PASS, production build 75/75 PASS, and npm audit 0 high vulnerabilities. Precision changes were **not pushed** automatically. The three baseline commits were pushed before this round:

`08a3e4d`, `0f9c7a5`, `78d5ec4` → `origin/develop/utom-recovery`.

`AGENTS.md`, `CLAUDE.md` and `docs.zip` remain untracked and untouched.

Current local MySQL integration command is `BLOCKED / NOT EXECUTED – UTOM_TEST_MYSQL_URL is not configured`. The last repository checkpoint recorded 55 PASS / 0 FAIL / 1 environment SKIP (FFmpeg unavailable); no SQL or migration was changed in this round.

Current round state: `PRECISION HARDENING ROUND 1: COMPLETE` for the implemented precision slice; the unsupported attribution boundary remains an explicit accepted measurement limitation, with no production activation.
