# UTOM V2.2 – Intelligence Quality Master

## Cél és határ

Ez a V2.2 program az evidence-first hírtartalmi megértést méri és javítja. Nem új infrastruktúra-, deployment- vagy payment-projekt. A gold manifest kizárólag értékelési oracle; közvetlenül nem ír V2 táblákba.

## Első baseline

| Tétel | Érték |
|---|---:|
| Szenáriók | 20 |
| Saját készítésű forrásváltozatok | 45 |
| Forrásszöveg | 521–532 szó/változat |
| Várt entity | 23 |
| Várt relation | 2 |
| Várt claim-megfigyelés | 46 |
| Várt event | 2 |
| Várt conflict | 3 |
| Paid AI | 0 |

Az első baseline a jelenlegi alapértelmezett üres mock providerrel készült. Ez architekturális alsó baseline: a provider nem ad szemantikai kimenetet, ezért a recall 0, a precision pedig értelmezhetetlen (nincs prediction). Ez nem állítás egy későbbi modell várható minőségéről.

## Benchmark validation és dense tier

Az alap safety tier 20 kötelező scenario és 45 source-változat. A dense tier 5 scenario, mindegyikben 3 forrás, 720–733 szó/forrás és 8 claim-observation/forrás. A dense tier a hosszabb, több entitást, attribúciót, idővonalat, feltételes és hiányzó információt tartalmazó szövegek külön mérési rétege; nem írja felül a core safety eredményeit.

A test-only oracle a provider-shaped normalizációs határon keresztül tökéletes core eredményt ad. A mutation suite kimutatja a negáció, feltételesség, attribúció, namesake identity, false/missed conflict, temporal change és omission-status hibákat. Az oracle nem ír adatbázisba, és production kód nem importálja.

## Első üres-provider baseline legnagyobb hiányai

1. Entity extraction: 23 várt entity, 0 prediction.
2. Claim extraction: 46 várt claim-megfigyelés, 0 prediction.
3. Relation extraction: 2 várt relation, 0 prediction.
4. Event matching: 2 várt event, 0 prediction.
5. Conflict detection: 3 várt conflict, 0 prediction.
6. Negation: a 2 negált claimből 0 került kiértékelésre.
7. Attribution: a 9 attribúciós claimből 0 került kiértékelésre.
8. Temporal/modality: a tervezett, feltételes és változó időállapotokból 0 került kiértékelésre.
9. Source omission: 3 várt missing-coverage eset, 0 prediction.
10. Showcase owner mode: ezt a hibát a central presentation mapping javította; az owner nézet emberi címkéket használ.

| Mérőszám | Baseline |
|---|---:|
| Entity precision / recall | N/A / 0.000 |
| Relation precision / recall | N/A / 0.000 |
| Claim precision / recall | N/A / 0.000 |
| Attribution accuracy | N/A |
| Evidence accuracy | N/A |
| Event matching accuracy | 0.000 |
| Conflict precision / recall | N/A / 0.000 |
| False-conflict rate | N/A (0 prediction) |
| Temporal accuracy | N/A |
| Negation accuracy | N/A |
| Modality accuracy | N/A |
| Source-omission precision / recall | N/A / 0.000 |

## Determinisztikus szöveg-baseline

A `lib/v22/deterministic-text-provider.cjs` kizárólag a cikk szövegét olvassa. Nem olvassa a gold manifestet, nem használ scenario-ID kivételágat, és nem ír canonical/V2 táblát. A jelenlegi baseline csak biztosan felismerhető szám+egység, dátum, explicit negáció, feltételes jelölő, attribúciós fordulat és egyszerű tulajdonnévi említés jelöltjeit adja vissza.

Az aktuális mérés részletesen a `10_deterministic_baseline.json` fájlban van. A precision-first működés mellett a core claim precision 0.0479, recall 0.1739; a dense claim precision 0.2143, recall 0.1500. Ezek első, lexikális baseline értékek, nem modellminőségi ígéretek.

## Finding registry

### V22-INT-F001 – Owner mode nyers predicate/status értéket mutat

- Severity: `MEDIUM`
- Terület: showcase presentation / human-facing intelligence
- Reprodukció: `/dev/v2-demo` → Owner mode → Megértés. A kapcsolat és állapot `works_for`, `located_in`, `accepted` vagy `review` formában jelenik meg.
- Root cause: a `V2DemoShowcase` közvetlenül stringesíti a canonical predicate és status mezőket; nincs központi owner-mode presentation mapping.
- Hatás: a tulajdonosi nézet technikai szerződésértékeket mutat, ezért a jelentés félreérthető.
- Státusz: `FIXED` – `lib/v22/presentation.cjs` központi mapping és `tests/unit/v22-owner-presentation.test.cjs` regresszió.
- Célzott regresszió: owner mode a canonical `works_for`, `accepted` és typed object értékeket emberi címkére alakítja; `[object Object]` nem jelenik meg.

`[object Object]` értéket a baseline statikus ellenőrzése és a korábbi browser acceptance során nem reprodukáltunk; typed formatter a következő presentation slice része.

## Források

- Gépi gold: `tests/fixtures/v22-intelligence-benchmark/gold-manifest.json`
- Saját cikkváltozatok: `tests/fixtures/v22-intelligence-benchmark/articles.json`
- Dataset builder: `lib/v22/benchmark-dataset.cjs`
- Evaluator: `lib/v22/benchmark-evaluator.cjs`
- Futtatás: `node scripts/generate-v22-benchmark.cjs` és `node scripts/run-v22-benchmark.cjs`
- Baseline JSON: `docs/UTOM_V2_2/00_baseline.json`

## Következő munkasorrend

1. Determinisztikus baseline pontosságának javítása csak új, reprodukálható regresszióval.
2. Showcase scenario selector és human-facing projection bővítése.
3. Provider-backed benchmark futtatás, ha ilyen provider külön engedélyezetten rendelkezésre áll.

## Állapot

`V2.2 BENCHMARK VALIDATION: CORE + DENSE + ORACLE + MUTATION + DETERMINISTIC BASELINE COMPLETE`

Production, payment és paid AI érintetlen.
