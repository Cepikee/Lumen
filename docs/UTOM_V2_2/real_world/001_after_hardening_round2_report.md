# REAL_WORLD_ARTICLE_001 – Semantic Hardening Round 2

## Mérési határ és befagyasztás

Ez a riport egyetlen, vak Round 2 after futást értékel. A cikket és az első két korábbi eredményt nem írtam felül, az after JSON elkülönített fájlba került. Az after futás után intelligencia-kódot nem módosítottam.

| Artefaktum | SHA-256 | Állapot |
|---|---|---|
| `001_source_article.txt` | `8201C036E78C91A0C1DB26C6EE1BEC86217EFCB70AF7DA3EBD049D9EFCF2180E` | változatlan |
| `001_first_pass_raw.json` | `22BF2986BB5D1ECBEEEE78A0190FD3A24D535FFB7B0A4E41B5919FED8794A0B1` | változatlan |
| `001_after_hardening_round1.json` | `609724EFE071C6B93FBCBAFF4C51924CF15D567D6CFAE8422198F041C539EC44` | változatlan |
| `001_after_hardening_round2.json` | `0D8786F4F7F55AFE6072DA45732B91D7A63A729CD08A4BE2942EBFC7E3A263F3` | új Round 2 eredmény |

Branch: `develop/utom-recovery`  
Production, production DB, paid AI, külső provider, commit és push: nem történt.

## Round 2 általános változásai

- Feltételes vagy háttérben említett fizetési kötelezettségből nem lett konkrét fizetési esemény.
- A szervizkönyv/dokumentum módosítása nem lett járműjavítási esemény.
- A numerikus említések megőrzik a régi `value`/`unit` mezőket, és melléjük kerül `parsedValue`, `multiplier`, `canonicalValue`, `canonicalUnit`, `valueKind`.
- Az abszolút érték, delta és összehasonlítás külön státuszt kapott.
- A claim-ek státusza külön jelöli a riportált megfigyelést, kijelzett értéket, becslést és összehasonlítást.
- A `2018. december` alak egyben marad, és a későbbi numerikus állításhoz év/hónap kötődik.
- Szűkült az organization span felismerés; a korábbi „Magyarországra kerülése előtt két kereskedés” hamis entitás nem jelent meg újra.
- Két explicit, bizonyítékhoz kötött kapcsolat jelent meg: Zoltán → `ACQUIRED` → Volvo V60 PHEV; Lajos → `PARTNER_OF` → Zoltán.

## First pass → Round 1 → Round 2

| Kimenet | First pass | Round 1 | Round 2 |
|---|---:|---:|---:|
| Entitások | 3 | 9 | 8 |
| Kapcsolatok | 0 | 0 | 2 |
| Állítások | 2 | 9 | 10 |
| Numerikus említések | 0 strukturált | 22 | 23 |
| Események | 0 | 7 | 7 |
| Időbeli kontextussal rendelkező claim | 0 | 5 | 5 |
| Attribúcióval rendelkező claim | 0 | 3 | 5 |
| Konfliktus | 0 | 0 | 0 |

## Mit értett meg helyesen

1. A 153, 227, 168, 247, 257, 169, 256, 75 és 170 ezer kilométeres említésekhez gépileg használható alapérték és mértékegység került.
2. A 4,5 millió, 4,8 millió, 4,4 millió, 330 ezer és 442 ezer forintos értékek canonical HUF értéket kaptak, a régi skálázott alak megőrzése mellett.
3. A `75 ezer kilométerrel magasabb` és a `74 ezerrel több` delta jellegű, nem abszolút futásteljesítményként van megjelölve.
4. A kalkulációs értékek összehasonlításként, a műszerfalérték kijelzett adatként, a szakértői érték becslésként jelenik meg.
5. A feltételes, általános kártérítési mondat és a szervizkönyvbe való belejavítás nem generált konkrét eseményt.

## Round 2 eredményben maradt hibák

### R2-001 – Delta számból hibás `VEHICLE_COUNT` claim

- Súlyosság: **HIGH**.
- Reprodukció: a `74 ezerrel több` említés a `numericMentions` kimenetben helyesen `delta`, de a claim réteg ugyanebben a mondatban `VEHICLE_COUNT`, `value: 74000`, `unit: number` állítást ad.
- Gyökérok: a count-predikátum szabály a mondatban szereplő autó/jármű szavakat akkor is felhasználja, amikor a numerikus említésnek nincs darabszám-egysége.
- Következmény: a delta nem válik önálló futásteljesítmény-állítássá, hanem félrevezető járműdarabszámként továbbítható.
- Állapot: **OPEN – ebben a mérési körben szándékosan nem javítva**, mert az első Round 2 after futás után az intelligencia-kód befagyasztott.
- Következő javítási kör célja: `number` egységű delta ne kerüljön count predicate-be; ehhez célzott regresszió szükséges.

### R2-002 – Történeti mérési sorok még nem teljes property/time modellben

- Súlyosság: **MEDIUM**.
- A kijelzett, szervizből riportált, szakértői becslés és összehasonlító érték státusza már külön mező, de a teljes járműtulajdonos–esemény–időpont kötés nincs teljesen normalizálva.
- Állapot: **OPEN – részleges coverage**, nem módosítva a vak futás után.

### R2-003 – Kapcsolati coverage korlátozott

- Súlyosság: **MEDIUM**.
- Két explicit kapcsolat megjelent, de a holland szerviz, Hovány, Lajos, Zoltán, a bíróság és a szerelő teljes szerep- és objektumhálója nem állt elő.
- Állapot: **OPEN – coverage hiány**, nem módosítva a vak futás után.

## Biztonsági ellenőrzés

- A claim- és relation-evidence a cikkből származik; nyilvánvalóan kitalált evidence-span nem látszik: **PASS**.
- A feltételes általános jogi háttérmondatból nem lett fizetési esemény: **PASS**.
- A dokumentum-módosításból nem lett járműjavítás: **PASS**.
- A `74 ezerrel több` hibás claim-predikátuma miatt az unsupported claim safety teljes egészében nem zöld: **FAIL**.
- Automatikus konfliktus-winner nem született, false conflict: **0**.
- Nyilvánvaló strukturális duplikáció: **0**.

## Ellenőrzések

- Round 2 célzott regresszió: **32/32 PASS** a teljes kapcsolódó fókuszkörben.
- Teljes offline suite: **465/465 PASS**.
- TypeScript: **PASS**.
- Import check: **PASS**.
- ESLint: **PASS, 0 error, 404 warning**.
- `npm run check`: **PASS**.
- Production build: **PASS**, 75 static page.
- Deterministic core benchmark: **PASS**, `informationCoverageScore=0.7179`, `criticalFactRecall=0.775`, `falseConflictRate=0`, `trulyUnsupportedPredictionCount=0`.
- Deterministic dense benchmark: **PASS**, `informationCoverageScore=0.6375`, `criticalFactRecall=0.6818`, `falseConflictRate=null` (a készletben nincs konfliktus).
- Held-out generalization: lefutott, evidence accuracy 1, negation accuracy 1, false-conflict rate 0; coverage továbbra is részleges.
- MySQL 8.0.46 célzott V2/integrációs futások: **52/52 PASS, 0 FAIL** (schema, entity, relation, claim, temporal, source comparison, read models, event, conflict, resolution, provenance, AI-cost, raw retention és pipeline recovery).
- A teljes wrapper `npm run test:integration:mysql` nem minősíthető teljes PASS-nak, mert a wrapper előre migrál, miközben a recovery teszt saját resetet végez; ez teszt-harness összeférhetetlenség, nem a Round 2 szemantikai kód bizonyított hibája.
- `npm audit`: **FAIL / 5 high**, függőségi lánc (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob`/`micromatch`/`braces`); ebben a körben nem futott automatikus force-javítás.

## Minősítés

`REAL WORLD ARTICLE #001: PARTIAL`

`EVIDENCE SAFETY: PASS`

`UNSUPPORTED CLAIM SAFETY: FAIL`

`ATTRIBUTION SAFETY: PASS`

`TEMPORAL UNDERSTANDING: PARTIAL`

`CLAIM COVERAGE: PARTIAL`

`ENTITY/RELATION COVERAGE: PARTIAL`

`FALSE CONFLICT SAFETY: PASS`

## Legfontosabb következő fejlesztési körök

1. A `number` egységű delta ne kapjon `VEHICLE_COUNT` vagy más darabszám predicate-et.
2. A történeti mérésekhez subject/property/event/time kapcsolatot kell tovább kötni.
3. A relation extractiont csak explicit, bizonyítékos szerep- és objektumkapcsolatokkal érdemes bővíteni.
4. A MySQL integration wrapper recovery-reset összeférhetetlenségét külön tesztharness-körben kell rendezni.
