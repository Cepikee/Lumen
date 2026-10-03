# UTOM V2 – M1.5 Feature Flag és Request/Run Context Foundation

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Állapot: `M1.5 COMPLETE`

## 1. Hatókör és eredmény

Az M1.5 kizárólag a V2 alapozó konfigurációs és korrelációs szerződését vezette
be. A meglévő üzleti route-ok, pipeline-ok, frontend flow-k és legacy viselkedés
nem kaptak V2 üzleti ágat.

`M1.5 COMPLETE: IGEN`
`V2 FEATURE FLAG: IGEN`
`REQUEST/RUN CONTEXT: IGEN`
`DB WRITE: NEM`
`AI CALL: NEM`
`BACKFILL: NEM`
`PUBLIC V2 ROUTE: NEM`

Kifejezetten kimaradt: entity extraction, resolver, AI Cost Router, V2 API,
frontend, payment/provider, migration és bármely V2 adatírás.

## 2. Canonical feature flag

A kanonikus környezeti változó:

`UTOM_V2_ENABLED`

A parser a meglévő `lib/config/runtime.js` allowlistjét használja. A true
értékek whitespace- és kis/nagybetű-függetlenül: `1`, `true`, `yes`, `on`.
Hiányzó, üres, `0`, `false`, `no`, `off` és minden ismeretlen érték false.
Ez fail-closed alapértelmezést ad. Az offline mód nem írja át a V2 flag
értékét: a flag önmagában csak az alapozó capability-t jelzi, side effectet
nem engedélyez.

Implementáció: `lib/v2/feature-flags.js`, runtime bekötés:
`lib/config/runtime.js`.

## 3. Request és run context

A `createV2RequestContext()` (`lib/v2/request-context.js`) explicit, immutable
metadata contextet készít:

- külön `requestId` és `runId`, mindkettő Node beépített
  `crypto.randomUUID()` alapú UUID;
- opcionális, pozitív `articleId`, canonical stringként, BIGINT UNSIGNED
  tartomány-ellenőrzéssel;
- `environment` a runtime környezetből, offline módban `offline`;
- `startedAt` UTC ISO-8601 timestamp;
- `v2Enabled` a canonical flag aktuális értéke;
- a canonical contract verziók: knowledge schema, extraction schema,
  vocabulary és resolver.

A verziók egyetlen forrása: `lib/v2/contract-versions.js`. A context csak
JSON-safe metadata-t tartalmaz, `Object.freeze()` védi, és nem tartalmaz
passwordöt, authorizationt, tokent, request body-t vagy nyers AI-választ.
Nincs adatbázis- vagy AI-mellékhatása. AsyncLocalStorage és új külső
függőség nem került bevezetésre; a context explicit módon adható tovább.

## 4. OFF/ON viselkedési határ

- `UTOM_V2_ENABLED` hiányában vagy false értéknél a meglévő alkalmazás ugyanúgy
  működik; nincs V2 route, worker vagy write path.
- true érték esetén jelenleg csak a foundation capability és a context
  használható tesztelhető módon. M1.5 nem kapcsol be üzleti feldolgozást.
- A flag és a context nem módosít legacy táblát, nem indít hálózati vagy AI
  műveletet, és nem változtat entitlementet.

## 5. Változott fájlok

- `.env.example` – biztonságos, alapértelmezett `UTOM_V2_ENABLED=false`.
- `lib/config/runtime.js` – canonical capability parser bekötése.
- `lib/v2/contract-versions.js` – frozen contract-version source of truth.
- `lib/v2/feature-flags.js` – canonical flag consumer.
- `lib/v2/request-context.js` – immutable request/run context factory.
- `tests/unit/v2-feature-flags.test.cjs` – fail-closed és offline flag regressziók.
- `tests/unit/v2-request-context.test.cjs` – identity, validation, immutability,
  UTC és side-effect regressziók.
- `tests/fixtures/v2-schema-contract.cjs` – a canonical versionek használata.

## 6. Ellenőrzések

- M1.5 célzott + M1.3/M1.4/migration/operations tesztek: **25/25 PASS**.
- Offline suite: **238/238 PASS**.
- TypeScript: **PASS**.
- Import check: **PASS**.
- Érintett ESLint: **PASS**.
- Production build: **PASS** (`next build`, 72/72 static pages).
- MySQL: M1.5 nem módosít SQL-t; az M1.4 korábbi MySQL 8 evidence változatlanul
  érvényes.

## 7. Findingok és státusz

- Új M1.5 alkalmazási bug: **0**.
- Javított M1.5 bug: **0**.
- Nyitott, biztonságosan javítható M1.5 bug: **0**.
- Környezeti blocker: **NINCS**.

## 8. Következő lépés

`NEXT STEP: M2 – Ingestion provenance és normalization envelope`

M1 lezárult; M2 a következő külön végrehajtási lépés, ebben a körben nem indul el.
