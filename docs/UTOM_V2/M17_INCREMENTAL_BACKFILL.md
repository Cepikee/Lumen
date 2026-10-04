# M17 – Növekményes visszatöltés és optimalizálás

## Definíció

Az M17 egy feature-flagelt, bounded és újraindítható runtime-adapter a meglévő `articles`, `v2_processing_steps` és `v2_ai_decisions` táblákhoz. Nem hoz létre második pipeline-motort és nem indít külső AI-szolgáltatót.

## Megvalósított hatókör

- `lib/v2/incremental-backfill.js` – bemenet-validáció, determinisztikus article fingerprint, bounded cursor-batch futás, pause/resume eredmény, checksum reconciliation és költségplafon.
- `lib/v2/incremental-backfill-repository.js` – MySQL 8 adapter a meglévő `v2_processing_steps` claim/heartbeat/completed állapotához, poolból leased kapcsolaton futó tranzakcióval és M12 `v2_ai_decisions` perzisztenciával.
- `lib/v2/incremental-backfill-runtime.js` – canonical `UTOM_V2_ENABLED` flag; OFF állapotban nincs DB-olvasás, írás vagy provider-hívás.
- `tests/unit/m17-incremental-backfill.test.cjs` – pause/resume, duplicate run, busy claim, DB rollback/cost ceiling, feature-off és pool-transaction regressziók.

## Elfogadási mátrix

| Requirement | Status | Evidence |
|---|---|---|
| korlátozott batch és kurzor | PASS | bemenet-validáció és hét célzott teszt |
| pause/resume | PASS | cursor csak completed/reused article után lép tovább |
| duplicate run idempotencia | PASS | a completed `v2_processing_steps` újrafeldolgozás nélkül újrahasználódik |
| stale/busy claim kezelés | PASS | a friss processing claim nem kerül átugorva |
| DB-hiba miatti rollback | PASS | a tranzakciós wrapper rollback ága |
| checksum-egyeztetés | PASS | stabilan rendezett id/status/output checksum |
| költségplafon | PASS | M12 `decideRoute`, véges nemnegatív költség és plafonellenőrzés |
| provider/költség határ | PASS | determinisztikus útvonal; provider útvonal nem választható |
| feature OFF mellékhatásmentesség | PASS | a canonical runtime wrapper korai inert eredményt ad |
| sémamigráció | N/A | az M1.4 táblái elegendők; új migration nem kell |
| valódi MySQL-végrehajtás | PASS | MySQL 8.0.46 izolált adatbázisban teljes M17 forgatókönyv |

## Safety boundaries

- A feldolgozás tranzakcióban fut; hiba esetén a claim, decision és output állapot nem commitálódik.
- A pool esetén egyetlen leased kapcsolat viszi a teljes batch-et; commit/rollback után mindig release történik.
- A busy claim nem lépteti előre a kurzort, ezért egy másik worker befejezése után a sor újrafelvehető.
- Az input fingerprint tartalmazza a step/version/article identity/content hash/update timestamp értékeket; változás új idempotencia-kulcsot ad.
- A checksum a feldolgozott sorok stabil, rendezett reprezentációjára épül.
- A default process handler költsége nulla és nincs provider-hívás; valódi provider csak külön, explicit felsőbb rétegben lenne megengedhető, az M12 döntés és budget után.

## Findingok

### M17-F01 – a pool tranzakció korábban megkerülhető volt

- Severity: HIGH
- Reprodukció: MySQL poolt (`getConnection`) adva a visszatöltő repositorynak az első implementáció csak a poolon ellenőrizte a `beginTransaction` metódust, ezért a batch saját tranzakció nélkül futott.
- Gyökérok: a mysql2 tranzakciós metódusai a leased kapcsolaton érhetők el, nem a pool objektumon.
- Javítás: a `withTransaction` egy kapcsolatot kér a poolból, azon futtatja a teljes korlátozott batchet, commit vagy rollback után pedig mindig felszabadítja.
- Regresszió: `M17 pool adapter owns one transaction connection and releases it`.
- Állapot: FIXED

### M17-F02 – a busy claim időzónafüggően tévesen stale lehetett

- Súlyosság: HIGH
- Reprodukció: valódi MySQL-ben friss `heartbeat_at` értékkel rendelkező processing claim mellett a JavaScript oldali dátum-összehasonlítás feldolgozhatónak látta a rekordot.
- Gyökérok: a driver által visszaadott dátum és a Node időzónaértelmezése nem adott stabil egyezést az adatbázis órájával.
- Javítás: a frissességet SQL-ben, `UTC_TIMESTAMP(6)` és ötperces ablak alapján számítjuk ki; a cursor busy rekordnál nem lép tovább.
- Regresszió: valódi MySQL busy-claim és felszabadítási forgatókönyv.
- Állapot: FIXED

## Validation

- Targeted M17 unit regression: **7/7 PASS**.
- TypeScript: **PASS**.
- ESLint: **PASS** (`npm run lint -- --quiet`).
- Import check: **PASS**.
- Offline suite: **359/359 PASS**.
- `npm run check`: **PASS**, including production build (74 static pages).
- MySQL integration: **PASS** – Ubuntu 24.04 / MySQL 8.0.46 izolált adatbázisban bounded batch, cursor, pause/resume, duplicate run, busy claim, kétkapcsolatos concurrency, rollback, checksum és feature OFF.

`M17 COMPLETE: YES`
