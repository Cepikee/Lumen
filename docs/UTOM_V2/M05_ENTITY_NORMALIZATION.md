# UTOM V2 – M5 Entity normalization és alias

Állapot: `M5 CURRENT SLICE COMPLETE` – determinisztikus entity/alias normalization
Dátum: 2026-10-03 (Europe/Budapest)
Schema baseline: `054`

## Acceptance-gap

| M5 requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Unicode/NFC és whitespace normalizálás | COMPLETE | `lib/v2/entity-normalization.js`, unit regressions | nincs |
| Magyar ékezetek és punctuation megőrzése | COMPLETE | accented/hyphen fixture | nincs |
| Determinisztikus normalized lookup name | COMPLETE | repeated-input equality regression | nincs |
| Alias output boundary, resolution nélkül | COMPLETE | alias contract regression; nincs entityId/merge | persistence későbbi slice |
| Canonical entity exact lookup | NOT STARTED | M5 következő dependency | repository lookup |
| Alias persistence/lifecycle | NOT STARTED | M1 schema rendelkezésre áll | repository + MySQL |
| Alias collision review/deferred semantics | NOT STARTED | Q06/Q10 és M5 domain gate | következő slice |
| Automatic merge/resolution | N/A | M6 feladata | későbbi milestone |

**M5 acceptance: 4/8 COMPLETE, 3 NOT STARTED, 1 N/A, 0 BLOCKED.**

## Dependency inventory

- input: extracted mention/candidate name from M4
- deterministic helper: `lib/v2/entity-normalization.js`
- vocabulary/version: `v2.vocabulary.1`
- language: explicit, default `hu`
- display form: NFC, trimelt, whitespace-collapsed, accents/punctuation preserved
- lookup form: locale-aware lowercase, diacritics are retained
- alias boundary: observed alias only; no entity ID, lookup, merge or resolution
- persistence: none in this slice
- AI/paid call: 0

## Scope boundary

Ez a slice csak a név- és alias-alak determinisztikus normalizálását fagyasztja be. Nem végez exact entity lookupot, alias DB-írást, collision reviewt, fuzzy matchinget, resolutiont vagy merge-et.

## Validation

- M5 targeted: `tests/unit/v2-entity-normalization.test.cjs`
- Hungarian accents, NBSP/zero-width, hyphen, diacritic distinction, empty/non-string/language validation: PASS
- M4/M1–M3 runtime és contract regression: változatlanul PASS

## Next exact unmet requirement

Canonical entity exact lookup és alias persistence/review boundary, M6 resolution nélkül.
