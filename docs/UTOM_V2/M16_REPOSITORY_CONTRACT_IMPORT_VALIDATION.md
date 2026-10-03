# UTOM V2 – M1.6 Repository Contract és Import Validation

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Állapot: `M1.6 COMPLETE`

## 1. Hatókör

Az M1.6 a V2 runtime modulhatárát és import-szerződését fagyasztja be. Nem
valósít repository CRUD-ot, SQL queryt, entity/claim/relation write pathot,
extractort, resolvert, backfillt, AI-hívást, route-ot vagy frontendet.

`M1.6 COMPLETE: IGEN`
`M1 IMPLEMENTATION BLOCKER: NINCS`
`LATEST SCHEMA VERSION: 052`
`NEW MIGRATION: NEM`

## 2. M1.6 runtime inventory

| Modul | Szerep | Publikus export | Függőségi irány |
|---|---|---|---|
| `lib/v2/contract-versions.js` | befagyasztott contract verziók | `CONTRACT_VERSIONS` | nincs |
| `lib/v2/feature-flags.js` | canonical V2 capability olvasó | `CANONICAL_V2_FLAG`, `isV2Enabled` | `config/runtime` |
| `lib/v2/request-context.js` | immutable request/run metadata factory | `createV2RequestContext` | `feature-flags`, `contract-versions`, Node crypto |
| `lib/v2/repository-contract.js` | M1.6 repository boundary contract | `REPOSITORY_CONTRACT` | nincs |

V2 teszt/fixture inventory:

- `tests/fixtures/v2-schema-contract.cjs` – kizárólag teszt- és migration
  validációs fixture, runtime nem importálja;
- `tests/unit/v2-schema-contract.test.cjs` – schema contract tesztek;
- `tests/unit/v2-migration-static.test.cjs` – migration/fixture egyezés;
- `tests/unit/v2-feature-flags.test.cjs` – flag contract és OFF regression;
- `tests/unit/v2-request-context.test.cjs` – context contract;
- `tests/unit/v2-repository-contract.test.cjs` – repository boundary, graph,
  side-effect és fixture-import validation;
- `tests/integration/mysql-v2-schema.test.cjs` – opt-in MySQL schema gate.

M1.6 alatt nem volt V2 repository implementation consumer, ezért nincs még
SQL persistence consumer vagy request-context üzleti consumer. Ez szándékos:
a későbbi persistence milestone a most fagyasztott határra épül.

## 3. Canonical repository contract

Forrás: `lib/v2/repository-contract.js`.

- contract version: `v2.repository.1`;
- boundary: `server-only`;
- input és output: `normalized-record`;
- raw SQL: kizárólag a későbbi repository implementationben;
- scope-ok: entities, aliases, mentions, relations, evidence, claims, events,
  AI run audit és processing state;
- hibatípusok: validation, not-found, conflict, database.

A modul csak befagyasztott metadata-contractot exportál. Nem exportál poolt,
connectiont, SQL buildert vagy table-name registryt, és nem nyit adatbázist.
Teljes CRUD és operation method surface szándékosan nincs még implementálva.

## 4. Transaction és context boundary

A későbbi repository operation caller-owned transaction modellben működik:

- a caller adja a connection/transaction scope-ot;
- a repository nem commitol önállóan;
- a repository nem rollbackel vagy release-el caller-owned connectiont;
- a lifecycle felelőse a caller marad.

A repository nem dönt az `UTOM_V2_ENABLED` flagről. A V2 feature gate a caller
feladata; a repository kizárólag persistence contractot biztosít. A request/run
context csak akkor szükséges, amikor későbbi audit, processing vagy AI-run
operation ezt ténylegesen igényli; egyszerű read műveletet nem kényszerítünk
teljes contextre.

## 5. Import és runtime boundary

A megengedett irány:

`config/context → domain contract → repository contract/implementation → db`

Az M1.6 V2 runtime graphban nincs ciklus, nincs route/UI import, nincs
tesztfixture- vagy test-helper-import, és nincs reverse dependency az
`app` vagy `tests` felé. A schema fixture nem runtime source of truth: azt a
migration és schema validation tesztek használják.

A repository boundary server-only szemantikáját a contract rögzíti. Mivel
M1.6-ban nincs SQL-t vagy DB-t importáló repository implementation, nem került
be új `server-only` package vagy kliensoldali guard. Későbbi persistence modul
nem importálható kliens bundle-ből.

Minden V2 modul CommonJS-kompatibilis, explicit relatív importot használ,
Windows és WSL/Linux case-sensitive feloldással ellenőrizhető. Nincs dynamic
import és nincs új alias.

## 6. Side-effect és feature boundary

A V2 modulok betöltése nem:

- nyit DB poolt vagy connectiont;
- futtat SQL-t vagy migrationt;
- ír adatot;
- indít timer/worker loopot;
- fetch-el vagy hív AI-t;
- generál request/run UUID-t importkor.

`UTOM_V2_ENABLED=false` esetén a legacy graph nem kap V2 repository side
effectet. `true` esetén is csak a foundation és contract válik elérhetővé;
automatikus persistence, extraction vagy backfill nincs.

## 7. Gépi validáció

`tests/unit/v2-repository-contract.test.cjs` ellenőrzi:

- a contract pontos exportját, scope-ját és caller-owned transaction policyját;
- a V2 runtime dependency graph aciklikusságát;
- test/fixture és `app` reverse import hiányát;
- a runtime modulok importálhatóságát;
- DB, hálózat, SQL és timer side effect hiányát;
- a fagyasztott exportok immutabilitását.

## 8. Teszteredmények

- M1.6 targeted repository/import tests: **3/3 PASS**.
- M1.5 feature/context tests: **8/8 PASS**.
- M1.3/M1.4/schema/migration/operations tests: **17/17 PASS**.
- Combined M1.6 gate: **28/28 PASS**.
- Offline suite: **241/241 PASS**.
- TypeScript: **PASS**.
- Import check: **PASS**.
- ESLint: **PASS** (0 hiba; meglévő warningokkal).
- Production build: **PASS** (72/72 static pages).
- MySQL újrafuttatás: **NEM SZÜKSÉGES** – M1.6 nem módosított SQL-t, migrationt,
  DB helper-t vagy runtime queryt.

## 9. Findingok és következő lépés

- Új M1.6 bug: **0**.
- Javított M1.6 bug: **0**.
- Spec contradiction: **NINCS**.
- Owner decision: **NEM SZÜKSÉGES**.
- Nyitott blocker: **NINCS**.

`NEXT STEP: M2 – Ingestion provenance és normalization envelope`

M1 lezárult; M2 külön végrehajtási lépés, ebben a körben nem indul el.
