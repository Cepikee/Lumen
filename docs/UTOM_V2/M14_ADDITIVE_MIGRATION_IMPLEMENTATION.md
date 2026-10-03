# UTOM V2 – M1.4 Additive Migration Implementation

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Állapot: `M1.4 COMPLETE`

## 1. Eredmény

`M1.4 COMPLETE: IGEN`
`M1 IMPLEMENTATION BLOCKER: NINCS`
`034 MIGRATION CREATED: IGEN`
`RUNTIME BUSINESS LOGIC MODIFIED: NEM`

Az M1.3 fixture 19 táblája 19 külön migrationben készült el, mert a runner
single-statement szabálya minden fájlban egyetlen `CREATE TABLE` statementet
enged. A migrationök kizárólag additive V2 táblákat hoznak létre; legacy tábla,
oszlop, index vagy adat nem módosul és backfill nem fut.

## 2. Migration dependency plan

| Verzió | Fájl | Cél |
|---|---|---|
| 034 | `034_v2_entities.sql` | canonical entities és merge pointer |
| 035 | `035_v2_ai_runs.sql` | AI/extraction audit metadata |
| 036 | `036_v2_claim_groups.sql` | competing claim scope |
| 037 | `037_v2_claims.sql` | atomic claims |
| 038 | `038_v2_claim_evidence.sql` | claim evidence/provenance |
| 039 | `039_v2_entity_aliases.sql` | entity aliases |
| 040 | `040_v2_entity_mentions.sql` | article mentions és unresolved state |
| 041 | `041_v2_entity_relations.sql` | typed relations |
| 042 | `042_v2_relation_evidence.sql` | relation evidence |
| 043 | `043_v2_events.sql` | event objects |
| 044 | `044_v2_event_entities.sql` | event/entity membership |
| 045 | `045_v2_event_articles.sql` | event/article membership |
| 046 | `046_v2_conflicts.sql` | conflict state és fingerprint |
| 047 | `047_v2_confidence_history.sql` | append-only confidence history |
| 048 | `048_v2_entity_graph_history.sql` | append-only graph mutation audit |
| 049 | `049_v2_timelines.sql` | timeline owners |
| 050 | `050_v2_timeline_items.sql` | deterministic timeline items |
| 051 | `051_v2_ai_decisions.sql` | AI Cost Router decision audit |
| 052 | `052_v2_processing_steps.sql` | V2 processing state |

Az order a fixture `migrationOrder` mezőjében is rögzített. A dependency-körben
nem maradt circular FK: minden parent tábla a hivatkozó child előtt készül el.

## 3. Fixture-egyezés

A migrationök forrása kizárólag a `tests/fixtures/v2-schema-contract.cjs`.
Statikus contract teszt ellenőrzi:

- 19/19 migration és 19/19 canonical table;
- 034-től folytonos verziók és egyedi fájlnevek;
- single-statement szabályt;
- InnoDB, utf8mb4 és canonical collationt;
- minden oszlopot, primary key-t, névvel ellátott unique/index definíciót;
- minden FK targetet és delete/update policyt.

A fixture-ben az index- és unique-nevek determinisztikusan a table/column
identityből származnak. Ez nem második schema-spec, hanem a gépi összevetéshez
szükséges névkontraktus.

## 4. Runtime readiness

Az új latest schema `052`, ezért a `lib/operations.js` readiness-kontraktusa
052-re frissült. Ez kizárólag a támogatott schema-verzió elvárása; V2 üzleti
logika, extractor, resolver, AI routing és write path nem került be.

Az új readiness check a 022–052 recovery/V2 láncot és az exact latest `052`
verziót várja. A korábbi 033-as readiness állapotot az új V2 release nem
tekintheti késznek, mert az új táblák hiányoznának.

## 5. MySQL 8 validáció

Izolált WSL MySQL: **8.0.46**.

- Fresh `001→052`: **PASS**
  - ledger: 52 sor, latest `052`;
  - összes tábla: 48;
  - V2 táblák: 19.
- Upgrade `033→052`: **PASS**
  - legacy source/article fixture megmaradt;
  - ledger: 52 sor, latest `052`;
  - V2 táblák: 19;
  - legacy article: 1;
  - legacy source: 1.
- Actual schema introspection: **PASS**
  - minden 19 tábla jelen van;
  - fixture szerinti oszlopszámok egyeznek;
  - fixture szerinti index/unique és FK darabszámok egyeznek.

A tesztadatbázis neve `utom_v2_m14_20261003_a` és
`utom_v2_m14_upgrade_20261003_b`; production adatbázis nem érintett.

## 6. Tesztek

- `v2-schema-contract.test.cjs`: **4/4 PASS**
- `v2-migration-static.test.cjs`: **2/2 PASS**
- migration-core és operations unit tesztek: **11/11 PASS**
- teljes offline suite: **230/230 PASS**
- TypeScript: **PASS**
- MySQL V2 contract integration test: létrejött, opt-in nélkül **SKIP**;
  a tényleges WSL MySQL validáció a fenti friss/upgrade/introspection gatekkel PASS.
- Import check: **PASS**
- Érintett ESLint: **PASS**

## 7. Findingok

- Migration implementation bug: **0**
- Fixture bug/clarification: az index- és unique-nevek gépi összevethetőségéhez
  determinisztikus névképzés került a fixture-be; ez nem schema-szemantikai változás.
- Spec contradiction: **NINCS**
- Nyitott migration bug: **NINCS**

## 8. Módosított fájlok

- `db/migrations/034_v2_entities.sql` … `db/migrations/052_v2_processing_steps.sql`
- `tests/fixtures/v2-schema-contract.cjs`
- `tests/unit/v2-schema-contract.test.cjs`
- `tests/unit/v2-migration-static.test.cjs`
- `tests/integration/mysql-v2-schema.test.cjs`
- `lib/operations.js`
- `tests/unit/operations.test.cjs`
- `tests/integration/mysql-pipeline-recovery.test.cjs`
- `docs/UTOM_V2/M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`
- `docs/UTOM_V2/M01_EXECUTION_PLAN.md`
- `docs/UTOM_V2/99_IMPLEMENTATION_MASTER_PLAN.md`

`BACKFILL: NEM`
`V2 RUNTIME WRITE PATH: NEM`
`RAW PROVIDER RESPONSE: NINCS`

`NEXT STEP: M2 – Ingestion provenance és normalization envelope` (M1.5 feature flag/request context, M1.6 repository boundary and M1.7 integration evidence complete; see `M15_FEATURE_FLAG_REQUEST_CONTEXT.md`, `M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md` and `M17_INTEGRATION_GATE_EVIDENCE.md`)
