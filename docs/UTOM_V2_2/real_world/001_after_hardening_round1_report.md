# REAL_WORLD_ARTICLE_001 – Hardening Round 1 after report

## Mérési azonosító és befagyasztás

- Teszt: `REAL_WORLD_ARTICLE_001`
- Futtatás: általános hardening módosítások és regressziók után, egyszeri after futás.
- Branch: `develop/utom-recovery`
- HEAD: `c111f880b5e4117d958af029a330b72b933f0cad`
- Production, production DB, commit és push: nem történt.
- Paid AI / külső provider: 0 hívás.
- Adatbázis-írás: nem történt.

Az első mérési artefaktumokat nem írtam felül:

| Artefaktum | SHA-256 | Állapot |
|---|---|---|
| `001_source_article.txt` | `8201C036E78C91A0C1DB26C6EE1BEC86217EFCB70AF7DA3EBD049D9EFCF2180E` | változatlan |
| `001_first_pass_raw.json` | `22BF2986BB5D1ECBEEEE78A0190FD3A24D535FFB7B0A4E41B5919FED8794A0B1` | változatlan |
| `001_state_freeze.json` | `D4FCCA1C0248CAF7747B88809E5B5E1908507AF10592ACA209DAEDA791FE675B` | változatlan |

Az új eredmény külön fájlban van: `001_after_hardening_round1.json`.

## Módosított általános képességek

A hardening az alábbi általános, magyar hírszövegekre alkalmazható képességeket erősítette:

- null, `undefined`, NaN vagy tényleges szám nélküli numerikus claim-ek biztonsági szintje;
- cím, byline, fotójóváírás, másolási felirat és forrás-metaadat leválasztása;
- magyar `ezer`, `millió`, `milliárd`, NBSP/keskeny NBSP, vesszős tizedes, HUF/EUR, km és évintervallum felismerése;
- pénzösszeg és jogi követelés óvatos szétválasztása a `PROJECT_COST` jelentéstől;
- attribúció és bizonytalanság (`szerint`, `úgy emlékszik`, `becslés`, `nagyjából`, `felmerül`);
- általános appozíciós személy-, szervezet- és termékfelismerés;
- általános narratív események (adásvétel, szerződés, javítás, követelés, per, bírósági döntés, fizetési kötelezettség);
- részleges időbeli kontextus évvel, hónappal és sorrendi jelölőkkel.

Érintett általános kód:

- `lib/v2/deterministic-semantic.js`
- `lib/v22/deterministic-text-provider.cjs`

A célzott regresszió:

- `tests/unit/v22-real-world-hardening-round1.test.cjs`
- `scripts/real-world-001-after-hardening-round1.cjs`

## Before → after

| Kimenet | First pass | After hardening | Megjegyzés |
|---|---:|---:|---|
| Entitások | 3 | 9 | a korábbi `Telex + Zoltán` összeolvadás megszűnt; maradt egy téves szervezeti span |
| Kapcsolatok | 0 | 0 | a jelenlegi általános relation extractor ezt a cikket nem kötötte össze |
| Állítások | 2 | 9 | null numerikus claim már nincs; a claim-ek többsége futásteljesítmény |
| Numerikus mention | 0 strukturált | 22 | a magyar számalakok és evidence-spanek felismerhetők |
| Események | 0 | 7 | általános eseménytípusok, visszakereshető evidence-szel |
| Időbeli kontextussal rendelkező claim | 0 | 5 | év/hónap/sorrend részlegesen megőrződött |
| Attribúcióval rendelkező claim | 0 | 3 | például eredeti hirdetés, kalkuláció, Zoltán |
| Konfliktus | 0 | 0 | nincs automatikus winner; a cikk értéksora nincs még konfliktusmodellbe vetítve |
| Omisszió / change | 0 | 0 | külön read-model idővonal még nem készült |

## Utólagos emberi ellenőrzés

### Helyesen javult

1. A `VEHICLE_COUNT = null` jellegű, szám nélküli numerikus claim nem jelenik meg többé.
2. A fotó/byline/metaadat nem hozta létre újra a `Telex Zoltán` hibás személyentitást.
3. A `153`, `227`, `168`, `247`, `257`, `169`, `256`, `75` és `170 ezer km` említések evidence-szel megjelentek.
4. A jogi `1,5 millió forintos` mondat nem lett `PROJECT_COST` claim.
5. A bizonytalanság és az attribúció több helyen megmaradt.
6. A cikk narratív eseményei már nem maradtak teljesen üresen.

### Megmaradt hibák / veszélyes félreértések

1. **Numerikus skála-hiba:** a `4,5 millió forint` értéke a nyers mentionben `4.5`, nem `4 500 000`; a `330 ezer forint` értéke `330`, nem `330 000`. Az egység mező (`million HUF`, `thousand HUF`) jelzi a skálát, de a numerikus érték önmagában félrevezető.
2. **Téves szervezeti entitás:** `Magyarországra kerülése előtt két kereskedés` teljes környezet került organization mentionként a kimenetbe.
3. **Túl széles claim evidence:** a `153 ezer km` claim evidence-e a mondat végét levágva, a kapcsolódó `13 700 euró` környezetével együtt jelenik meg; ez bizonyíték-szempontból visszakereshető, de nem elég finom szemantikai span.
4. **Hiányzó kapcsolatok:** Zoltán–Lajos–Volvo, holland szerviz, Hovány és a bíróság kapcsolatai nem kerültek strukturált relation-ként a kimenetbe.
5. **Hiányzó valódi tulajdonságmodell:** a 153/168/227/247/257 km értékek külön claim-ként megvannak, de a kijelzett érték, korábbi szervizadat, szakértői becslés és tényleges mérés státusza még nincs teljesen elkülönítve.
6. **Hiányzó bírósági és jogi attribúció:** a bírósági események és a több szereplő által tett állítások nem kaptak mindenhol szereplőhöz kötött relation/claim szerkezetet.
7. **A pénzösszegek szándékosan nem kaptak kitalált speciális production predicate-et.** Ez coverage-veszteség, de a téves `PROJECT_COST` állítás elkerülése biztonságosabb.

### Nem alátámasztott állítások

- Külön nullértékű vagy szám nélküli numerikus claim: **0**.
- A téves szervezeti entitás és a túl széles evidence-span azonban minőségi extraction hiba; nem szabad őket pozitív tényként továbbvetíteni.

### False conflict és duplikáció

- Kibocsátott false conflict: **0**.
- Automatikus conflict winner: **nincs**.
- A különböző futásteljesítmény-adatok időbeli és bizonyossági státusza még nincs teljesen modellálva, ezért a 0 conflict nem jelent teljes temporal/conflict coverage-et.
- Nyilvánvaló strukturális duplikáció az after JSON-ban: **0**.

## Általános regresszió és régi benchmark állapot

- V2/V2.2 célzott tesztek: **160/160 PASS**.
- Teljes offline suite: **458/458 PASS**.
- TypeScript: **PASS**.
- Import check: **PASS**.
- ESLint: **0 error**, 403 meglévő warning.
- `npm run check`: **PASS** (typecheck, lint, import, offline suite, build).
- Production build: **PASS**, 75 static page generation.
- Core deterministic benchmark: lefutott, regressziós teszt PASS; `trulyUnsupportedPredictionCount = 0`, `falseConflictRate = 0`.
- Dense deterministic benchmark: lefutott, regressziós teszt PASS; evidence/negation safety megmaradt.
- Frozen held-out generalization: lefutott. Evidence accuracy `1`, negation accuracy `1`, false-conflict rate `0`, duplicate projection `0`; coverage továbbra is részleges (`claimRecall ≈ 0.231`, `criticalFactRecall ≈ 0.382`), ezért ez nem teljes intelligencia-acceptance.
- MySQL integration: **BLOCKED / NOT EXECUTED – `UTOM_TEST_MYSQL_URL` nincs beállítva**. Ez környezeti blokk, nem a hardening regressziós suite hibája.

## Végső minősítés

`REAL-WORLD HARDENING ROUND 1: PARTIAL`

`SAFETY FLOOR: PASS`

`GENERALIZATION TESTS: PASS`

`OLD BENCHMARK REGRESSION: PASS`

`REAL_WORLD_001 IMPROVEMENT: PARTIAL`

A részleges minősítés oka nem tesztregresszió, hanem a valódi cikk after eredményének fennmaradó szemantikai hibái: pénzügyi skálázás, téves organization span, hiányzó kapcsolatok és hiányos property/time/status modell.

## Következő, külön engedélyezendő fejlesztési körök

1. Általános numeric value normalizálás: a skaláris érték és a skála legyen egyszerre gépileg egyértelmű (`4.5` + `million HUF` ne legyen félreérthető).
2. Organization/entity span visszavágása név- és szerephatárokra.
3. Claim evidence finomítása több numerikus mentiont tartalmazó mondatokban.
4. Property/time/status modell a történeti mérési sorokhoz.
5. Relation és szerep-visszakötés óvatos bővítése.
6. Események résztvevőinek és időbeli sorrendjének kiterjesztése.

A first-pass és az after output külön marad; az after output után intelligencia-kódot ebben a körben nem módosítottam.
