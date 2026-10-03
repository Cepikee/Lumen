# UTOM V2 – M1.3 Schema Contract Fixture

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)
Állapot: `M1.3 COMPLETE`

## 1. Scope

Az M1.3 kizárólag az első V2 additive schema géppel ellenőrizhető szerződését fagyasztja be. A fixture nem migration SQL, nem runtime dependency, nem ír adatbázist, nem végez backfillt és nem hív AI-szolgáltatót.

Az M1.3-ba tartozik:

- entity, alias és unresolved mention persistence;
- typed relation és relation evidence;
- event és event membership;
- atomic claim, claim group és claim evidence;
- conflict, confidence history és graph mutation history;
- timeline és timeline item reference;
- AI run audit, AI Cost Router decision audit és V2 processing step state;
- controlled vocabulary, temporal, confidence, provenance, FK, unique és index contract.

Az M1.3-ba még nem tartozik:

- `034` migration létrehozása vagy futtatása;
- schema runner/runtime módosítása;
- extractor, resolver, AI Cost Router vagy worker implementáció;
- backfill, dual-write, projection vagy public/premium API;
- legacy schema módosítása;
- frontend vagy payment/provider integráció.

## 2. Canonical machine fixture

Fixture: `tests/fixtures/v2-schema-contract.cjs`
Teszt: `tests/unit/v2-schema-contract.test.cjs`

A fixture determinisztikus CJS objektumot exportál, névvel ellátott unique/index definíciókkal és explicit `migrationOrder` mezővel. SQL stringet nem tartalmaz, így nem tud migrationt végrehajtani és nem válhat runtime alkalmazásfüggőséggé.

Lefedett táblák száma: **19**

1. `v2_entities`
2. `v2_entity_aliases`
3. `v2_entity_mentions`
4. `v2_entity_relations`
5. `v2_relation_evidence`
6. `v2_events`
7. `v2_event_entities`
8. `v2_event_articles`
9. `v2_claims`
10. `v2_claim_groups`
11. `v2_claim_evidence`
12. `v2_conflicts`
13. `v2_confidence_history`
14. `v2_entity_graph_history`
15. `v2_timelines`
16. `v2_timeline_items`
17. `v2_ai_runs`
18. `v2_ai_decisions`
19. `v2_processing_steps`

## 3. Frozen contract rules

- Táblák: plural `snake_case`, InnoDB, utf8mb4.
- Elsődleges kulcs: `BIGINT UNSIGNED` surrogate `id`.
- Foreign key mezők: `<name>_id`.
- Timestamp mezők: `DATETIME(6)`, UTC tárolással.
- Confidence mezők: `DECIMAL(5,4)`, szemantikailag `0..1`; a különböző confidence-dimenziók nem cserélhetők fel.
- Entity identity: `(entity_type, language, normalized_name)`.
- Entity type: `person`, `company`, `organization`, `location`, `project`, `product`, `topic`.
- Entity status: `review`, `active`, `merged`, `disputed`, `archived`.
- Relation predicate: az M1.1-ben befagyasztott 12 érték; szabad AI predicate nem írható közvetlenül.
- Claim status: `observed`, `disputed`, `superseded`, `retracted`, `unresolved`.
- Event status: `candidate`, `active`, `completed`, `disputed`, `merged`.
- Conflict állapot: `open`, `resolved`, `dismissed`; eltérő időbeli érték önmagában nem conflict.
- Ambiguous alias és unresolved mention/claim representálható; a schema nem kényszerít hamis merge-et.
- `event_time` és `publication_time` külön mező és külön jelentés.
- Minden relation/claim/evidence/AI retry determinisztikus fingerprint vagy operation key alapján idempotens.
- A claim nem automatikusan verified fact; a legújabb megfigyelés sem rejtett truth winner.
- `v2_ai_runs` nem tartalmaz teljes, korlátlan raw provider response oszlopot; redacted/sanitized reference és structured result reference használható.

## 4. Foreign key policy

A fixture minden FK-nél rögzíti a parent táblát, a nullabilityt és az `ON DELETE`/`ON UPDATE` policyt.

- Tulajdonoshoz tartozó alias, evidence és timeline item: `CASCADE`, ahol a tulajdonos törlése logikailag megengedett.
- Legacy article/source/summary és provenance hivatkozás: alapértelmezésben `RESTRICT`, illetve opcionális kapcsolatnál `SET NULL`; V2 nem törölhet csendben legacy provenance-t.
- Canonical merge/supersession pointer: `SET NULL`, mert a history megmarad.
- Minden update policy explicit `RESTRICT`.

## 5. Legacy boundary

A fixture csak a szükséges `articles`, `summaries` és `sources` rekordokra hivatkozik. A legacy cikkeket, összefoglalókat és forrásokat nem másolja V2 táblákba, és a meglévő source-of-truth táblák nem változnak.

## 6. A contract teszt bizonyítékai

A `v2-schema-contract.test.cjs` géppel ellenőrzi:

- a teljes 19 táblás scope-ot;
- engine/charset, primary key és minden oszlop típus/nullability értéket;
- entity, alias, relation, claim, evidence és AI idempotency unique kulcsokat;
- unresolved és polymorphic nullable mezőket;
- controlled vocabulary határokat;
- UTC `DATETIME(6)` és `DECIMAL(5,4)` confidence contractot;
- minden FK parent, delete és update policyját;
- a teljes raw provider response tiltását.

A későbbi `034` migration acceptance gate-je: a disposable MySQL tényleges sémája legyen összevethető ezzel a fixture-rel, beleértve a táblákat, oszlopokat, nullabilityt, PK/FK/unique/index definíciókat és collationt.

## 7. Eredmény

`Schema contract fixture elkészült: IGEN`
`Machine-testable: IGEN`
`Contract teszt: 4/4 PASS`
`Spec contradiction: NINCS`
`Owner decision szükséges: NEM`
`M1 blocker: NINCS`

`034 MIGRATION CREATED: NEM`
`RUNTIME CODE MODIFIED: NEM`
`M1.3 COMPLETE: IGEN`
`NEXT STEP: M2 – Ingestion provenance és normalization envelope` (M1.4 additive migration, M1.5 foundation, M1.6 repository boundary and M1.7 integration evidence complete; see `M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`, `M15_FEATURE_FLAG_REQUEST_CONTEXT.md`, `M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md` and `M17_INTEGRATION_GATE_EVIDENCE.md`)
