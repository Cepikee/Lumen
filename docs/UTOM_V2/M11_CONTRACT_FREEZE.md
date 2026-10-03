# UTOM V2 – M1.1 Contract Freeze

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Állapot: `M1.1 COMPLETE`
Dátum: 2026-10-03 (Europe/Budapest)

Ez a dokumentum az M1.1 kódolás előtti kanonikus contract-freeze. A részletes domain-specifikációk továbbra is a `10_`–`24_`, `40_`–`42_` és `99_IMPLEMENTATION_MASTER_PLAN.md` dokumentumok. Ez a fájl az első implementációs lépéshez szükséges közös szerződéseket foglalja össze.

## 1. Contract-verziók

- Knowledge schema: `v2.1`
- Controlled vocabulary: `v2.vocabulary.1`
- Extraction schema: `v2.extraction.1`
- Resolver/rule version: `v2.resolver.1`
- API envelope schema: `v2.envelope.1`
- Minden rekord és AI-run tárolja a rá vonatkozó verziót; későbbi szabályváltozás új verzió, nem csendes átértelmezés.

## 2. Entity contract

Kezdeti, kontrollált `entity_type` allowlist:

`person`, `company`, `organization`, `location`, `project`, `product`, `topic`.

Egy entity kötelező mezői: `id`, `entity_type`, `canonical_name`, `normalized_name`, `language`, `status`, `created_at`, `updated_at`. Az időpontok UTC `DATETIME(6)` értékek. Opcionális mezők: `confidence_current`, `first_observed_at`, `last_observed_at`, `canonical_entity_id`.

Engedélyezett státuszok: `review`, `active`, `merged`, `disputed`, `archived`. A canonical identity az `(entity_type, language, normalized_name)` kulcson alapul. A név önmagában nem univerzális igazság és nem elegendő automatikus merge-hez.

Merge csak canonical pointert és append-only historyt ír; korábbi entityt, mentiont vagy evidence-t nem töröl. Alacsony vagy nem bizonyított resolution confidence esetén az entity `review` vagy unresolved állapotban marad.

## 3. Alias contract

Az alias-normalizálás determinisztikus: Unicode normalizálás, case-folding, whitespace-trim és összevonás, valamint a specifikáció szerinti punctuation-kezelés. A magyar ékezetek jelentéses karakterek; az ékezet nélküli egyezés legfeljebb jelölt, nem automatikus merge-bizonyíték.

Az alias rekord tárolja az eredeti és normalizált alakot, nyelvet, alias típust, státuszt, confidence-et és evidence-hivatkozást. Az alias uniqueness kulcsa `(entity_id, normalized_alias, language)`. Ugyanaz az alias több entityhez tartozhat, ha a candidate-ek ambiguek; ilyen esetben nincs automatikus választás, review/deferred állapot szükséges.

## 4. Relation contract

Minden relation tartalmazza: `subject_entity_id`, kontrollált `predicate`, opcionális `object_entity_id` vagy `object_value`, `status`, `confidence`, `valid_from`, `valid_until`, megfigyelési időpontok és evidence-hivatkozás.

Kontrollált predicate vocabulary:

`OWNS`, `WORKS_FOR`, `CEO_OF`, `LOCATED_IN`, `BUILDS`, `INVESTS_IN`, `ACQUIRED`, `PARTNER_OF`, `SUPPORTS`, `OPPOSES`, `PARTICIPATES_IN`, `RELATED_TO`.

AI által kitalált predicate közvetlenül nem perzisztálható. Új predicate csak külön döntési és schema-frissítési lépéssel vezethető be. Relation identity fingerprinten és idempotens unique kulcson alapul. Eltérő vagy ellentétes relation nem törli a régit; `disputed` vagy `superseded` állapotot kap.

## 5. Claim contract

A claim egy atomic proposition, nem bizonyított tény. Identity elemei: subject, predicate/type, object/value, source/article observation és releváns időscope. A claim tárolja az article/source, publication/observation/extraction időt, confidence-et, extraction run-t, evidence-et és státuszt.

Engedélyezett claim státuszok: `observed`, `disputed`, `superseded`, `retracted`, `unresolved`. A claim group azonos subject/predicate/time scope köré szervezhet több, egymással versengő megfigyelést. A legújabb claim nem válik automatikusan igazsággá; `claim` és `fact` külön fogalom.

## 6. Evidence contract

Minden fontos claim és relation visszavezethető legalább egy evidence rekordra, amely tartalmazza az article-t, source-t, publication timestampet, extraction run-t, evidence type-ot, támogatás/ellentmondás irányát, text span vagy span hash referenciát és confidence-et.

Az evidence append-only. Identity-je a kapcsolt objektum, article/source és span/hash/extraction reference kombinációja. Ugyanazon input újrafeldolgozása idempotens. Raw provider response nem publikálható és nem tárolható korlátlanul alapértelmezésként; csak redacted reference és schema-validált strukturált eredmény tárolható.

## 7. Event contract

Az event külön történeti objektum, nem entity és nem article. Kötelező szemantikai elemei: event type, canonical title/normalized key, status, confidence, event interval vagy ismeretlen idő, publication time, participating entities, claims, articles, source coverage és evidence.

Lifecycle: `candidate`, `active`, `completed`, `disputed`, `merged`. Event identity normalized key, résztvevők és időbeli jelek alapján készül, de nem puszta title equality. Merge megőrzi a membership és history rekordokat. `publication_time` és `event_time` soha nem cserélhető fel.

## 8. Temporal contract

- `observed_at`: mikor figyelte meg a rendszer az állítást.
- `valid_from`, `valid_until`: az állítás érvényességi intervalluma; a `valid_until = NULL` nyitott intervallum.
- `event_time`: az esemény bekövetkezési ideje vagy intervalluma.
- `publication_time`: az article vagy forrás közzétételi ideje.
- `created_at`, `updated_at`: technikai rekordidő.

Tárolás mindenhol UTC. Felhasználói és üzleti napértelmezés Europe/Budapest, ahol releváns. Ismeretlen vagy csak hozzávetőleges idő nem kap kitalált pontos timestampet; a pontosság és time-quality külön jelölendő. Javítás vagy temporal change új observation/interval, nem történelmi törlés.

## 9. Confidence contract

A confidence `0..1` skálán tárolható, de nem truth flag. A contract különbözteti meg az extraction confidence-et, entity-resolution confidence-et, relation confidence-et, claim confidence-et, evidence quality-t, deterministic certainty-t és conflict hatását.

Confidence history append-only: előző/új érték, indok, rule/model/resolver version és evidence delta. M1.1 nem rögzít végleges automatikus merge küszöböt; az M5/M6 owner-döntéshez tartozik. Addig alacsony vagy bizonytalan confidence nem írhat canonical pointert.

## 10. Conflict contract

Conflict csak akkor keletkezik, ha ugyanazon scope-ban az állítások ténylegesen összeegyeztethetetlenek. Típusok: `numeric`, `categorical`, `temporal`, `entity_identity`, `relation`.

Különböző időbeli érték temporal change lehet, nem automatikusan conflict. A rendszer minden érintett claimet és evidence-t megőriz, a conflict állapota `open`, `resolved` vagy `dismissed` lehet, és nincs rejtett winner source trust alapján. Resolution authority és weighting későbbi milestone/open question.

## 11. AI extraction contract

Az első strukturált extraction output legfeljebb az alábbi részeket adja: `entities`, `aliases`, `relations`, `claims`, `events`, `evidence_references`, `confidence` és extractor metadata. A séma-validáció determinisztikus; hibás JSON, ismeretlen type/predicate, érvénytelen span, out-of-range offset vagy hiányzó kötelező provenance quarantine/deferred állapotot kap.

Deterministic mezőket deterministic kód állít elő: canonical URL/source/date normalization, identity, known lookup, időintervallum-mechanika, permission és entitlement. AI csak jelöltet vagy magyarázatot adhat, amely evidence- és confidence-ellenőrzés után kerülhet projectionbe.

## 12. AI Cost Router boundary

Döntési sorrend: `deterministic → existing identity → alias/cache → SQL/rule resolution → AI semantic resolution → review/deferred`.

AI nem használható biztosan megoldható normalizationre, exact lookupra, schema-validációra, időmechanikára, permissionre vagy entitlementre. AI-escaláció csak ambiguitásnál, bounded candidate settel és költségkereten belül történhet. Cache key tartalmazza az input fingerprintet, schema/extractor verziót és modellt. M1.1 nem építi meg a routert és nem rögzít későbbi milestone-hoz tartozó confidence küszöböt.

## 13. AI run audit és retention

Alapértelmezett tárolás: provider, model, schema version, extractor/prompt version, started/completed timestamp, status, retry count, input hash/sanitized reference, token metadata, cost metadata, cache hit, escalation reason, structured result reference és error metadata.

Alapértelmezésben nem tárolunk korlátlan teljes raw provider response-ot, secretet, promptban lévő érzékeny adatot vagy unredacted upstream payloadot. Raw retention csak külön későbbi owner-döntéssel és additive mezővel bővíthető.

## 14. Identity és dedup

Entity, alias, relation, claim, event és evidence identity adatbázis unique/fingerprint kulcsokkal és determinisztikus normalizálással működik. String equality önmagában nem elég. Retry ugyanazt a logikai observationt nem hozhatja létre második alkalommal; eltérő source/article observation külön rekord maradhat.

## 15. Legacy compatibility és migration boundary

- A legacy `articles`, `summaries`, `sources`, `keywords`, `trends`, `clusters`, pipeline, auth és premium táblák és route-ok változatlanul működnek.
- A V2 táblák additive knowledge/projection réteget képeznek; M1 nem töröl, nem nevez át és nem ír át legacy source-of-truth mezőt.
- M1.1 nem készít migrationt, nem végez backfillt és nem ír dual-write-ot.
- V2 alapértelmezésben OFF; fallback legacy read marad, ha nincs V2 adat.
- Migration boundary: M1.2 runner audit, M1.3 schema fixture, M1.4 additive migration. Csak ezek után kezdődhet schema implementation.

## 16. Self-expanding knowledge boundary

A V2 bővülése csak adatrekordokat, aliasokat, eventeket, claim-eket, relationöket, evidence-t és confidence historyt jelenthet. A rendszer nem írja át saját kódját, promptját, schema-ját, vocabularyját vagy migrationjét automatikusan. Új entity/relation type owner-döntés és verziózott contract nélkül nem keletkezhet.

## 17. API envelope és frontend boundary

V2 API envelope:

```json
{
  "data": {},
  "meta": { "requestId": "...", "schemaVersion": "v2.envelope.1", "generatedAt": "..." },
  "errors": []
}
```

Raw prompt, secret és unredacted provider output nem kerülhet API-válaszba. V2 route-ok additive namespace-ben és feature flag mögött jelennek meg. A legacy feed/article/trends/insights/premium működés M1-ben változatlan.

## 18. M1.1 acceptance

- M1-D01–M1-D05: owner-approved, `90_DECISIONS.md` szerint.
- Entity, alias, relation, claim, evidence, event, temporal, confidence, conflict és AI contract: befagyasztva.
- AI Cost Router: boundary befagyasztva, implementáció későbbi milestone.
- Legacy compatibility és additive migration boundary: befagyasztva.
- Verziózás és envelope: befagyasztva.
- Spec contradiction: nincs implementációt blokkoló eltérés.
- Migration, extractor, resolver, backfill, API és frontend implementáció: ebben a lépésben nem történt.

`M1.1 COMPLETE: IGEN`

`M1 IMPLEMENTATION BLOCKER: NINCS`

`NEXT STEP: M2 – Ingestion provenance és normalization envelope` (M1.2 audit, M1.3 schema fixture, M1.4 additive migration, M1.5 foundation, M1.6 repository boundary and M1.7 integration evidence complete; see `M12_MIGRATION_RUNNER_COMPATIBILITY_AUDIT.md`, `M13_SCHEMA_CONTRACT_FIXTURE.md`, `M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`, `M15_FEATURE_FLAG_REQUEST_CONTEXT.md`, `M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md` and `M17_INTEGRATION_GATE_EVIDENCE.md`)
