# UTOM V2 – M1.7 Integration Gate és Evidence Package

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Állapot: `M1.7 COMPLETE` / `M1 COMPLETE`

## 1. Végső állapot

`M1.7 COMPLETE: IGEN`
`M1 COMPLETE: IGEN`
`M1 IMPLEMENTATION BLOCKER: NINCS`
`LATEST SCHEMA VERSION: 052`
`M1 BLOCKING OPEN QUESTIONS: 0`

Az M1.7 nem vezetett be új V2 üzleti funkciót. A V2 schema additive maradt,
feature flag alapértelmezésben OFF, és nincs V2 runtime write path.

## 2. M1.1 contract freeze gate

Az M1.2–M1.6 eredményeit a befagyasztott M1.1 szerződéseivel összevetve:

- entity/predicate/status vocabulary: egyező;
- additive migration és legacy kompatibilitás: egyező;
- UTC technikai tárolás és explicit Budapest display/business határ: egyező;
- raw provider response tiltás és metadata-only AI audit: egyező;
- temporal, confidence és conflict semantics: egyező;
- versioning külön kezeli a knowledge/extraction/vocabulary/resolver contractot
  és a DB migration `052` verziót;
- MySQL-first, evidence-first, persistent knowledge és precision-first elv:
  egyező.

`M1.1 CONTRACT DRIFT: NINCS`

## 3. M1.2 migration runner gate

`npm run db:plan` eredménye:

- migration count: **52**;
- latest version: **052**;
- chain: **contiguous 001–052**;
- `safe=true`;
- checksum és filename audit: **PASS**;
- single-statement szabály: **PASS**;
- `GET_LOCK`/`RELEASE_LOCK`: a runner implementációja és migration-core
  tesztjei alapján **PASS**;
- duplicate/missing migration: **NINCS**.

A plan egy korábbi 027-es index-cserét warningként jelez; ez nem destructive
schema művelet és nem blokkoló M1 regresszió.

## 4. M1.3 schema contract gate

- canonical fixture: `tests/fixtures/v2-schema-contract.cjs`;
- V2 table contract: **19/19**;
- PK, FK, unique, index, nullability, temporal, confidence és vocabulary
  ellenőrzés: **PASS**;
- unresolved/ambiguous és raw-provider-retention szabály: **PASS**;
- contract tests: **4/4 PASS**;
- migration static tests: **2/2 PASS**.

`M1.3 SCHEMA CONTRACT: PASS`

## 5. M1.4 valódi MySQL 8 gate

Izolált WSL Ubuntu 24.04 MySQL: **8.0.46**. Tesztadatbázis: loopbackon futó,
`_test` célú izolált adatbázis; production DB nem volt használva.

`tests/integration/mysql-v2-schema.test.cjs` opt-in módban ténylegesen futott:

- fresh `001→052`: **PASS**;
  - ledger: **52** sor;
  - latest: **052**;
  - V2 táblák: **19**;
  - legacy `sources` és `articles`: megmaradtak;
- upgrade `033→052`: **PASS**;
  - 33 legacy migration először lefutott;
  - legacy source és article fixture adat megmaradt;
  - V2 migrationök `034–052`: **PASS**;
  - V2 táblák: **19**;
- idempotencia: **PASS**;
  - második `applyMigrations`: `[]`;
  - pending migration: **0**;
  - ledger count: **52**;
  - latest: **052**;
  - checksum/schema drift: **NINCS**;
- actual `information_schema` vs M1.3 fixture: **PASS**;
  - table/column/type/nullability/identity/index/unique/FK és delete/update
    policy összehasonlítás.

### M1.7 finding – M17-F01

- Terület: M1.4 integration comparator.
- Severity: LOW (tesztvalidációs hiba).
- Reprodukció: MySQL 8.0.46 `BOOLEAN` mezője `information_schema` alatt
  `tinyint(1)` típusként jelent meg, miközben a fixture szemantikai típusa
  `BOOLEAN` volt.
- Root cause: a comparator a MySQL display spellinget hasonlította, nem a
  szemantikai aliasokat.
- Javítás: `tests/integration/mysql-v2-schema.test.cjs` a `BOOLEAN` ↔
  `TINYINT(1)` MySQL alias-egyezést normalizálja; a schema fixture nem változott.
- Regression: a teljes valódi MySQL integration újrafutott és **PASS**.
- Státusz: **FIXED**.

## 6. M1.5 foundation gate

- canonical flag: `UTOM_V2_ENABLED`;
- default/missing/malformed: OFF;
- allowlist: `1`, `true`, `yes`, `on`;
- feature flag + context tests: **8/8 PASS**;
- feature OFF: legacy capabilityk változatlanok, nincs V2 side effect;
- feature ON: csak foundation capability, nincs persistence/extraction/AI;
- request/run context: külön UUID-k, UTC timestamp, immutable JSON-safe metadata;
- contract versions: canonical és külön a DB `052` verziótól.

`FEATURE FLAG CONTRACT: PASS`
`FEATURE OFF LEGACY SAFETY: PASS`
`FEATURE ON FOUNDATION ONLY: PASS`
`REQUEST/RUN CONTEXT CONTRACT: PASS`
`CONTRACT VERSION BOUNDARY: PASS`

## 7. M1.6 repository/import gate

- repository contract: `v2.repository.1`;
- normalized-record input/output;
- caller-owned transaction boundary;
- raw pool/connection/SQL builder export: **NINCS**;
- teljes SQL CRUD: **NINCS**;
- fixture/test reverse import: **NINCS**;
- V2 dependency cycle: **0**;
- import-time DB/network/timer/UUID side effect: **NINCS**;
- M1.6 targeted tests: **3/3 PASS**.

`M1 V2 DEPENDENCY GRAPH: PASS`

## 8. Cross-layer regression gates

- combined M1.6 gate: **28/28 PASS**;
- teljes offline suite: **241/241 PASS**;
- TypeScript: **PASS**;
- ESLint: **PASS**, **0 error**, 361 meglévő warning;
- import check: **PASS**;
- production build: **PASS**, compile, TypeScript, page data, 72/72 static
  page és route optimization sikeres;
- Windows/WSL import path és CJS runtime smoke: **PASS**.

## 9. Isolated production runtime smoke

Izolált build után, a teszt MySQL ellenőrzött `052` sémájával:

- `/`: HTTP **200**;
- `/api/auth/me`: HTTP **200**, `{"loggedIn":false}`;
- `/api/internal/health`: HTTP **200**;
- liveness: **true**;
- readiness: **true**;
- schema readiness: **052**, `missing=[]`.

Az alkalmazást és az izolált MySQL folyamatot a smoke után leállítottam.

## 10. Legacy HTTP E2E

Az izolált MySQL + lokális production build mellett:

- `http-auth-e2e.test.cjs`: **PASS**;
- `http-pin-premium-e2e.test.cjs`: **PASS**;
- valódi SMTP hívás: **0**;
- fizetős proxy/AI hívás: **0**;
- payment: **0**.

## 11. Izoláció és V2 üzleti scope

- production DB: **NEM HASZNÁLT**;
- production SMTP: **NEM HASZNÁLT**;
- payment provider: **NEM HASZNÁLT**;
- valódi AI provider: **0 call**;
- backfill: **NEM**;
- V2 entity/claim/relation/event population: **NEM**;
- V2 business write path: **NINCS**.

## 12. M1 step státuszok

| Step | Státusz | Evidence |
|---|---|---|
| M1.1 | COMPLETE | `M11_CONTRACT_FREEZE.md` |
| M1.2 | COMPLETE | `M12_MIGRATION_RUNNER_COMPATIBILITY_AUDIT.md` |
| M1.3 | COMPLETE | `M13_SCHEMA_CONTRACT_FIXTURE.md` |
| M1.4 | COMPLETE | `M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md` |
| M1.5 | COMPLETE | `M15_FEATURE_FLAG_REQUEST_CONTEXT.md` |
| M1.6 | COMPLETE | `M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md` |
| M1.7 | COMPLETE | this document |

## 13. M1 lezárás

- M1 blocking owner decisions: **0**;
- M1 blocking open questions: **0**;
- open M1 bug: **0**;
- open M1 blocker: **0**;
- fixed M1.7 finding: **M17-F01**.

`M1.7 COMPLETE: IGEN`
`M1 COMPLETE: IGEN`
`M1 IMPLEMENTATION BLOCKER: NINCS`
`LATEST SCHEMA VERSION: 052`
`NEXT PHASE: M2 – Ingestion provenance és normalization envelope`

M2 ebben a körben nem indul el.
