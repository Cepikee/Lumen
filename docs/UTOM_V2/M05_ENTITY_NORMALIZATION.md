# UTOM V2 – M5 Entity normalization és alias

Állapot: `M5 COMPLETE` – determinisztikus exact lookup, Q06 confidence gate, observed alias lifecycle és collision review boundary
Dátum: 2026-10-03 (Europe/Budapest)
Schema baseline: `057`

## Acceptance-gap

| M5 requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Unicode/NFC és whitespace normalizálás | COMPLETE | `lib/v2/entity-normalization.js`, unit regressions | nincs |
| Magyar ékezetek és punctuation megőrzése | COMPLETE | accented/hyphen fixture | nincs |
| Determinisztikus normalized lookup name | COMPLETE | repeated-input equality regression | nincs |
| Alias output boundary, resolution nélkül | COMPLETE | alias contract regression; nincs entityId/merge | persistence későbbi slice |
| Canonical entity exact lookup | COMPLETE | `lib/v2/entity-resolution-repository.js`, MySQL regression | nincs |
| Alias persistence/lifecycle | COMPLETE | migrations `055`–`057`, repository + MySQL regression | nincs |
| Alias collision review/deferred semantics | COMPLETE | explicit `ambiguous`/review result, no auto merge | nincs |
| Automatic merge/resolution | N/A | M6 feladata | későbbi milestone |

**M5 acceptance: 8/8 COMPLETE, 0 NOT STARTED, 1 N/A, 0 BLOCKED.**

## Dependency inventory

- input: extracted mention/candidate name from M4
- deterministic helper: `lib/v2/entity-normalization.js`
- vocabulary/version: `v2.vocabulary.1`
- language: explicit, default `hu`
- display form: NFC, trimelt, whitespace-collapsed, accents/punctuation preserved
- lookup form: locale-aware lowercase, diacritics are retained
- alias boundary: observed alias only; no entity ID, lookup, merge or resolution
- persistence: observed alias plus separate provenance observation rows, migrations `055`–`057`
- AI/paid call: 0

## Scope boundary

Az M5 exact lookupja csak a befagyasztott normalizálót használja: nincs fuzzy, semantic vagy AI fallback. A collision eredménye explicit `ambiguous`, és review/deferred állapotban marad. Az observed alias csak valid M4 mentionből, extraction runnel és normalization versionnel visszakövethető observation sorral írható.

## Validation

- M5 targeted: `tests/unit/v2-entity-normalization.test.cjs`, `tests/unit/v2-entity-resolution.test.cjs`
- Hungarian accents, NBSP/zero-width, hyphen, diacritic distinction, empty/non-string/language validation: PASS
- MySQL: canonical hit, alias hit, miss, accent-sensitive lookup, collision, idempotent observation és transaction boundary PASS
- M4/M1–M3 runtime és contract regression: PASS

## M5 final gate

- Normalization: PASS
- Exact canonical lookup: PASS
- Exact alias lookup: PASS
- Miss: PASS
- Ambiguity/review: PASS
- Alias lifecycle/provenance/idempotency: PASS
- MySQL normalized-key collation: `utf8mb4_bin`, PASS
- Fuzzy/semantic/AI merge: 0
- Q06 confidence gate: PASS (`0.95` exact single candidate, `0.80` review, ambiguity override)
- M5 completion: `8/8 applicable COMPLETE`; automatic merge is M6 and N/A
