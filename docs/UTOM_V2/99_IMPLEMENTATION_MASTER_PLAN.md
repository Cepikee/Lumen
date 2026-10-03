# UTOM V2 – Implementation Master Plan

Projekt: UTOM.HU / Lumen
Repository: F:\Projekt2025\Lumen
Branch: develop/utom-recovery
Dokumentum státusza: végrehajtható terv, kódolás nélkül
Utolsó repository-ellenőrzés: 2026-10-03, Europe/Budapest

## 1. Hatály és bizonyíték

Ez a terv a jelenlegi Lumen repositoryra és a feladatban megadott UTOM V2 követelménylistára épül. A repositoryban talált fő technológiák:

- Next.js 16 App Router, React 19, TypeScript 5
- MySQL 8 célkörnyezet, mysql2, SQL migrációs runner
- Node 24 engine
- feed ingestion, scraping, normalization, summarization, sentiment, clickbait, keywords, trends, clustering, plagiarism, speed index, idempotency és state machine pipeline modulok
- frontend route-ok: feed, article detail, trends, insights, category insights, premium, auth/reset és Híradó
- premium proxy az app/api/premium-insights útvonalon
- db/migrations/001_sources.sql–033_email_outbox.sql legacy baseline plus `034`–`053` additive V2 schema migrations
- offline regresszió: 224/224 PASS (recovery baseline)
- TypeScript: PASS
- ESLint: 0 hiba
- MySQL integration: 30/30 PASS (recovery baseline)
- migrations 001→033 and upgrade 032→033: PASS (recovery baseline)
- production build/start/health/E2E: PASS (recovery baseline)

A docs/UTOM_V2 specifikációs csomag repository-specifikus tervezési dokumentáció. A product owner az M1-D01–M1-D05 döntéseket 2026-10-02-án OPTION A szerint jóváhagyta; az M1.1 szerződésfagyasztás 2026-10-03-án elkészült és a `M11_CONTRACT_FREEZE.md` a kanonikus contract-forrás. Ezek a döntések többé nem blokkolják az M1 indulását. A későbbi mérföldkövek nyitott kérdései továbbra is a saját mérföldkövük előtt kerülnek döntésre.

Ez a terv nem módosít production alkalmazáskódot, nem indít paymentet, nem hív fizetős AI-szolgáltatást, és nem igényel big-bang átállást.

## 2. Jelenlegi rendszer

### 2.1 Feldolgozási lánc

RSS/feed vagy belső receive-feed
→ canonical URL és source identity
→ articles
→ processing claim és step state
→ scrape/clean
→ embedding és cluster
→ short/long summary
→ category, keywords, sentiment, clickbait, plagiarism
→ summaries, trends, speed index és history
→ Next.js API-k
→ feed, article, related, trends, insights és premium UI

A pipeline az articles státuszait, claim token/heartbeat mezőit és article_processing_steps táblát használja. Az external operation recovery külön állapotot és operation identity-t kezel. A clustering embedding threshold alapján működik, napi ablakra korlátozva. A related news cluster/source/időablak alapján választ.

### 2.2 Jelenlegi adatbázis

| Terület | Meglévő | V2 kiindulás |
|---|---|---|
| Források | sources | újrahasznosítható, alias-réteg kell |
| Cikkek | articles | újrahasznosítható, provenance mezőkkel bővítendő |
| Összefoglalók | summaries | újrahasznosítható, AI provenance és strukturált elemzés kell |
| Kulcsszó/trend | keywords, trends | article-szintű idempotens kulcsokkal bővítendő |
| Cluster/speed | clusters, speed_index, speed_index_history | event/history szemantikával bővítendő |
| Pipeline | claim/recovery mezők, article_processing_steps, recovery log | orchestration alapja |
| User/premium | users, sessions, reset és rate-limit táblák | entitlement contract alapja |
| Híradó | videos, video_views, video_access_logs | külön kompatibilitási modul |
| Runtime | forecast, worker health, email outbox | observability/outbox minták |

A jelenlegi schema legacy kompatibilitási oszlopokat tartalmaz, például summaries.content és summary_text. V2-ben ezek additív migrációval és provenance mezőkkel kezelendők; korai törlés tilos.

### 2.3 API és frontend

Fő API-csoportok: summaries, related, sources; trends és trend-history; insights és statistics; premium-insights; auth/session/reset/user; Híradó; feed ingestion és belső pipeline. Fő frontend fogyasztók: app/page.tsx, article detail, trends/insights, source/category widgetek, premium widgetek, auth/settings.

A V2 API-k verziózott, explicit envelope contractot kapnak, hogy a jelenlegi UI fokozatosan megmaradhasson.

## 3. Gap analysis

| V2 képesség | Jelenlegi állapot | Besorolás | Irány |
|---|---|---|---|
| Ingestion/normalization | létezik | részben létezik | közös provenance envelope |
| Existing dedup | canonical URL, hash, idempotency | újrahasznosítható | entity/event kulcsok |
| Cluster | embedding threshold és cluster ID | részben létezik | event-aware cluster |
| Entity system | nincs dedikált persistence | új fejlesztés | M2–M5 |
| Entity resolution | source identity normalizálás van | részben létezik | staged resolver |
| Relation system | cluster/source related logic | részben létezik | typed relation + evidence |
| Event system | explicit event nincs | új fejlesztés | event lifecycle |
| Claim system | summary mezők vannak | új fejlesztés | atomic claims |
| Evidence | implicit article/source hivatkozás | részben létezik | evidence táblák |
| Temporal knowledge | created/published/history van | részben létezik | valid interval |
| Conflict detection | explicit modell nincs | új fejlesztés | claim comparison |
| Confidence | több pontszám van | részben létezik | közös history |
| AI pipeline | külön modulok vannak | újrahasznosítható | typed orchestration |
| AI Cost Router | nincs közös router | új fejlesztés | deterministic/cache/model route |
| Premium intelligence | proxy és widgetek vannak | részben létezik | graph-backed read model |
| Timeline/context | trends/timeseries van | részben létezik | event/entity timeline |
| Self-expanding knowledge | nincs graph-bővítő réteg | új fejlesztés | reviewable writes |
| API | sok route, nincs V2 namespace | részben létezik | api/v2 additive |
| Frontend | működő legacy UI | újrahasznosítható | V2 feature flaggel |
| Observability | logger/recovery/outbox van | részben létezik | graph/cost/conflict metrics |

## 4. Célarchitektúra

Rétegek:

1. Ingestion: feed fetch, source policy, canonical identity, raw snapshot.
2. Deterministic normalization: language, date, source, category, URL, content.
3. Existing dedup és cluster candidate generation.
4. AI Cost Router.
5. Entity, claim, event, relation és evidence extraction workers.
6. Entity resolution: exact, alias, deterministic, fuzzy, contextual, AI, review.
7. Temporal graph store.
8. Conflict és confidence service.
9. Public és premium read models.
10. Versioned API layer.
11. Feature-flagged frontend panels.
12. Metrics, logs, queue és recovery observability.

Teljes feldolgozás:

ARTICLE INGESTION
→ NORMALIZATION
→ EXISTING DEDUP
→ CLUSTER
→ ENTITY EXTRACTION
→ ENTITY RESOLUTION
→ CLAIM EXTRACTION
→ EVENT MATCHING
→ RELATION EXTRACTION
→ EVIDENCE STORAGE
→ CONFLICT DETECTION
→ CONFIDENCE UPDATE
→ TEMPORAL GRAPH UPDATE
→ CONTEXT/TIMELINE
→ PUBLIC/PREMIUM OUTPUT

Determinisztikus réteg: normalization, schema validation, identity, exact lookup, temporal mechanics, permission, entitlement, aggregation. AI réteg: candidate extraction, ambiguous resolution, context generation. AI output csak schema-validáció, evidence span, confidence és idempotency után írhat graph adatot.

## 5. V2 adatmodell

Minden új tábla InnoDB, utf8mb4, UTC DATETIME(6), explicit FK és migration ledger alatt legyen.

### Entities

v2_entities:
- id BIGINT UNSIGNED primary key
- entity_type, canonical_name, normalized_name, language
- status: review, active, merged, disputed, archived
- canonical_entity_id nullable
- confidence_current, first_observed, last_observed, created_at, updated_at
- unique type/language/normalized identity, indexes status/time/canonical
- merge csak canonical pointert ír, historyt nem töröl

v2_entity_aliases:
- entity_id, alias, normalized_alias, language, alias_type, confidence, evidence_id, valid_from, valid_until
- unique entity/normalized_alias/language
- weak alias review queue

v2_entity_mentions:
- article_id, summary_id, entity_id nullable, raw span, offsets, extraction_run_id, confidence, resolution status
- unresolved mention entity nélkül megmarad

### Relations

v2_entity_relations:
- subject_entity_id, predicate, object_entity_id nullable, object_value JSON nullable
- status, confidence, valid_from/until, first/last observed, superseded_by
- idempotency key subject/predicate/object/observation alapján
- index subject/predicate, object/predicate, status/interval

v2_relation_evidence:
- relation_id, article_id, source_id, text span/hash, extraction run, support type, confidence
- unique relation/evidence/span hash
- append-only

### Events

v2_events:
- event_type, canonical_title, normalized_key, status
- start/end/first/last observed, confidence, superseded_by
- candidate, active, disputed, completed, merged lifecycle

v2_event_entities:
- event_id, entity_id, role, confidence, valid interval, evidence reference
- unique event/entity/role/interval identity

v2_event_articles:
- event_id, article_id, membership type, confidence, evidence, first/last observed
- unique event/article/membership

### Claims and evidence

v2_claims:
- subject/object entity nullable, predicate, value JSON, normalized value
- claim type, source article/source, valid and observed interval, status, confidence, extraction run
- unique observation key, nem universal truth key

v2_claim_groups:
- claim family subject/predicate/time scope, resolution status, optional display policy
- unresolved conflict esetén nincs automatikus winner

v2_claim_evidence:
- claim_id, article_id, source_id, text span/hash, evidence type, support/contradict, extraction run, confidence
- append-only

v2_conflicts:
- conflict_type numeric/categorical/temporal/identity
- scope IDs, state, severity, explanation JSON, detected/resolved timestamps, resolver
- unique conflict fingerprint

### Temporal/history

v2_confidence_history:
- object type/id, old/new confidence, reason, evidence delta, rule/model version, created_at
- append-only

v2_entity_graph_history:
- mutation type, object IDs, before/after JSON, operation key, actor/run, created_at
- append-only audit

v2_timelines és v2_timeline_items:
- timeline entity/event/topic; referenced event/article/claim; valid/display time; confidence; visibility; ordering key
- unique timeline/object/order identity

### AI processing

v2_ai_runs:
- article/step, provider/model, prompt/schema version, input hash, status, retries, timestamps
- input/output token, estimated cost, cache hit, escalation reason, redacted response reference

v2_ai_decisions:
- article/step, deterministic/cache/model route, reason, budget snapshot, provider/model, escalation, created_at

v2_processing_steps:
- article_id, step, input fingerprint, status, attempt, claim/heartbeat, output reference, error, completed_at
- unique article/step/input fingerprint

Initial 100–500 article/day mellett ezek éves szinten kezelhető méretűek; partitioning csak mért volumen után.

## 6. AI Cost Router

Közös döntési szerződés:

decide(step, inputFingerprint, context, budget)
→ deterministic | cache | small_model | large_model | review

Sorrend: deterministic szabály; kompatibilis cache; olcsó modell; erősebb modell; review; budget/provider hiba esetén fallback vagy deferred state.

Mérendő: AI call/article, token/article, cost/article, cost/day/month, escalation rate, cache hit, provider error, budget rejection. Kötelező a hard budget, per-step limit, timeout/retry, malformed output quarantine és circuit breaker.

## 7. Entity resolution

1. Unicode/case/space/diacritic normalization
2. exact canonical lookup
3. alias lookup
4. deterministic source/domain rules
5. fuzzy candidate generation
6. contextual scoring
7. AI disambiguation bounded candidate settel
8. csak magas confidence mellett automatikus link/merge
9. review queue
10. merge canonical pointerrel és historyval

OPEN DESIGN QUESTION: confidence küszöbök és entity-type specifikus merge policy.

## 8. Temporal knowledge, claim és evidence

A graph minden állítása valid time és observation time mezőket használ. Új megfigyelés új rekord vagy interval close; korábbi állítás nem törlődik. Claimhez article, source, evidence span, extraction run és confidence kötelező. Inferred conclusion külön típus.

Konfliktusok: numeric, categorical, temporal, identity és relation contradiction. A rendszer megőrzi az eltérő állításokat és unresolved állapotot mutat; későbbi feldolgozás nem választ automatikusan győztest.

Self-expanding knowledge csak adatrekordok, aliasok, eventek, claim-ek, relationök, evidence és confidence history bővítése. A programkód, prompt és schema nem módosul automatikusan.

## 9. API és frontend

V2 response envelope:

data, meta(requestId, schemaVersion, generatedAt), errors.

V2 route családok:

- api/v2/articles/:id/context
- api/v2/entities/:id
- api/v2/entities/:id/timeline
- api/v2/events/:id
- api/v2/topics/:id/claims
- api/v2/sources/compare
- api/v2/premium/intelligence
- belső worker/admin route-ok külön védelemmel

Timeline/evidence cursor pagination, stabil created_at/id rendezés. Raw prompt, secret és unredacted provider response nem publikálható.

Frontend V2 feature flaggel: article context, entity chip, event timeline, source comparison, claim/evidence drawer, conflict indicator, premium intelligence. Minden panel loading, empty, partial, 401/403/404/409/5xx és race/cancellation állapotot kezel.

Premium entitlement mindig szerveroldali canonical entitlement. Payment/provider nincs megadva; az actionök jóváhagyásig letiltva maradnak.

## 10. Migration és rollout

Additive migration → read-only projection → bounded backfill → idempotens dual-write → legacy/V2 összehasonlítás → panelenkénti enable → szélesítés → csak jóváhagyott legacy deprecation.

Backfill: article checkpoint, resumable claim, per-step idempotency, AI budget, review/dead-letter, counts/checksums, legacy delete nélkül. Rollback feature flag/read model rollback, nem destructive down migration.

## 11. Milestone-ok

### M1 – V2 contract és schema foundation
Objective: V2 docs, vocabulary, envelope, migration convention, feature flags.
Impacted: db/migrations, lib/db, lib/v2, tests, docs.
Tests: schema lint, migration plan, JSON schema, rollback/read-only.
Gate: PASS csak jóváhagyott schema és open decision lista után.

### M2 – Ingestion provenance és normalization envelope
Objective: stable ingestion identity és provenance.
Impacted: feed ingestion, source identity, publication time.
Tests: URL/source/date normalization, duplicate feed, malformed source.
Gate: retry mellett egy identity és teljes audit.

### M3 – Existing dedup és cluster adapter
Objective: jelenlegi idempotency/cluster újrahasznosítása.
Impacted: pipeline/idempotency, clusterArticles, speed history.
Tests: same URL, hash, divergent title, concurrency.
Gate: duplicate cluster/article write nincs.

### M4 – Entity extraction
Objective: typed mention és evidence span structured AI outputtal.
Current slice: canonical M2 envelope input és `v2.extraction.1` deterministic validator, mock provider, optional runtime handoff és typed unresolved mention/audit persistence.
Completed: canonical mock provider, feature-flagelt optional runtime handoff, AI-run audit és typed unresolved mention persistence (`054_v2_entity_mention_type.sql`).
Tests: malformed output, span bound, hallucinated entity reject, confidence/allowlist, empty és duplicate occurrence, provider failure, feature OFF/ON, persistence.
Gate: csak schema-valid mention perzisztál; M4 final gate PASS.

### M5 – Entity normalization és alias
Objective: canonical name, exact lookup, observed alias lifecycle és collision review.
Implementation complete: deterministic NFC/whitespace/case-preserving normalization, exact type-aware canonical/alias lookup, accent-sensitive MySQL semantics, provenance-linked observed alias persistence, idempotent observations, explicit ambiguous/review outcome and the owner-approved Q06 confidence gate (`lib/v2/entity-normalization.js`, `lib/v2/entity-resolution-repository.js`, `lib/v2/entity-resolution-policy.js`, migrations `055`–`057`). Automatic merge remains M6 scope.
Tests: Hungarian accents, punctuation, invisible characters, diacritic distinction, canonical/alias hit, miss, collision, idempotency and MySQL integration.
Gate: M5 complete; fuzzy/semantic/AI resolution and automatic merge remain M6 scope.

### M6 – Entity resolution
Objective: staged scoring és bounded AI disambiguation.
Tests: same-name entities, false merge, threshold.
Gate: low-confidence auto-merge nincs.

### M7 – Relation és evidence
Objective: typed relation, append-only evidence.
Tests: duplicate evidence, contradiction, retry.
Gate: idempotens, reversible writes.

### M8 – Claim extraction
Objective: atomic claims article/source/evidence kapcsolattal.
Tests: numeric/categorical/date, malformed JSON, attribution.
Gate: displayelt claim provenance-t tartalmaz.

### M9 – Event matching
Objective: event candidate cluster/entity/claim alapján.
Tests: split/merge, repeated coverage, temporal overlap.
Gate: merge reviewable, membership history megmarad.

### M10 – Temporal graph
Objective: as-of historical state.
Tests: interval, DST, historical reconstruction, supersession.
Gate: későbbi adat nem töröl korábbi történetet.

### M11 – Conflict és confidence history
Objective: contradiction preservation és explainability.
Tests: conflict types, rerun idempotency.
Gate: unresolved conflict nem kap önkényes győztest.

### M12 – AI Cost Router
Objective: deterministic/cache/model/escalation centralizálása.
Tests: budget, cache, outage, malformed output, retry.
Gate: minden AI call döntés és cost rekorddal rendelkezik.

### M13 – Read models és V2 API
Objective: article context, entity, event, timeline, claim, source compare.
Tests: envelope, cursor, 401/403/404/409/5xx, no leakage.
Gate: contract fixtures zöldek.

### M14 – Frontend context/timeline
Objective: feature-flagged article context és timeline panel.
Tests: malformed response, race, flag on/off, null.
Gate: legacy UI regresszió nélkül.

### M15 – Source comparison
Objective: source claims/evidence compare.
Tests: missing source, contradiction, ordering, pagination.
Gate: reported/inferred/disputed elkülönül.

### M16 – Premium intelligence
Objective: entitlement-védett context/conflict/history.
Tests: anonymous, non-premium, expired, active, malformed session, empty.
Gate: entitlement boundary és redaction bizonyított; payment továbbra is disabled.

### M17 – Incremental backfill és optimization
Objective: bounded, resumable processing és költségmérés.
Tests: pause/resume, duplicate run, DB failure, cost ceiling.
Gate: checksum reconciliation és rollback működik.

### M18 – Final integration
Objective: jóváhagyott V2 panel rollout.
Tests: offline, MySQL, pipeline, API E2E, concurrency, recovery.
Gate: minden kötelező teszt PASS, high severity open bug nincs, owner approval megvan.

## 12. Tesztelési stratégia

Unit: normalizer, identity, confidence, cost decision, interval, schema validation.
DB integration: migration, FK/unique, transaction projection, cursor, null semantics.
Pipeline: full article, retry, claim loss, stale worker, uncertain external outcome.
AI contract: malformed JSON, wrong type, missing spans, hallucinated entity, outage/rate limit.
Graph fixtures: alias collision, false merge, duplicate relation, contradictory claims.
Temporal: interval close, as-of, DST, future exclusion.
Concurrency: duplicate ingestion, resolution, event merge, projection, retry.
E2E: public context, source compare, premium entitlement, malformed/error response, feature flags.

## 13. Failure recovery

- hallucinated entity: reject/review, evidence retained
- false merge: canonical pointer rollback, old entity/history retained
- duplicate entity: identity key and merge queue
- wrong event merge: split/reopen with membership history
- conflicting claim: unresolved conflict with both evidence
- malformed AI: quarantine, bounded retry, dead-letter
- provider outage: cache/deterministic/deferred fallback
- DB crash: transaction rollback and resumable claim
- partial pipeline: step state resume
- stale knowledge: validity intervals and review/decay policy
- incorrect relation: disputed/superseded, evidence retained
- runaway cost: hard budget/circuit breaker

## 14. Observability és scale

Mérendő: articles processed, entities/aliases/mentions/relations/claims/events, review depth, confidence, conflicts, AI calls/tokens/cost, cache/escalation, merge/split, step latency/retries, API errors, read model lag, backfill progress, entitlement denials.

100–500 articles/day kezdeti cél. Bounded concurrency, batch/cache, indexelt time/source lookups, cursor pagination és async projections elegendők az első nagyságrendi növekedéshez. Distributed graph DB vagy message bus csak mérés alapján.

## 15. Open design questions

1. A létrehozott docs/UTOM_V2 source pack product-owner jóváhagyása.
2. Entity types, relation predicates, claim taxonomy.
3. Confidence küszöbök és merge policy.
4. Event identity és merge authority.
5. Source trust weighting és conflict display.
6. Timeline timezone/business-day policy.
7. AI provider/model, retention és budget.
8. Payment, pricing, billing, refunds, grace period.
9. Premium entitlement/redaction.
10. Manual review role/UI.
11. Article/evidence/AI diagnostics retention.
12. Separate reporting DB szükségessége.

## 16. Requirement traceability

| Requirement dokumentum | Követelmény | Implementáló milestone | Acceptance gate |
|---|---|---|---|
| 00_V2_VISION, 01_PRODUCT_PRINCIPLES | evidence-first, precision, no self-modifying code | M1.1, M1.3, M7, M11 | contract/schema gate |
| 10_KNOWLEDGE_GRAPH–17_CONFLICT_DETECTION | graph vocabulary, typed relations, claims, evidence, temporal state, conflicts | M4–M11 | graph fixtures and conflict gate |
| 20_AI_PIPELINE–24_SELF_EXPANDING_KNOWLEDGE | staged extraction, cost routing, resolution, confidence, governed expansion | M2–M12 | malformed output, budget, merge gates |
| 30_TIMELINES–33_PREMIUM_INTELLIGENCE | timeline, source comparison, context, premium intelligence | M13–M16 | API, UI, entitlement gates |
| 40_DATA_MODEL_CONCEPT–42_FRONTEND_CONCEPT | MySQL model, V2 envelope, feature-flagged frontend | M1.2–M1.6, M13, M14 | migration and contract gates |
| 50_COST_AND_SCALING–53_FAILURE_MODES | cost, observability, quality, failure recovery | M1, M12, M17, M18 | operational and recovery gates |
| 90_DECISIONS, 91_OPEN_QUESTIONS | decision ownership and unresolved design questions | M1.1 and each dependent milestone | owner decision record |

No approved requirement is intentionally without a milestone. OPEN DESIGN QUESTION items cannot be treated as approved product behavior until recorded in 90_DECISIONS.

The detailed M1 execution breakdown is canonical in M01_EXECUTION_PLAN.md: M1.1 owner/contract freeze (COMPLETE; see `M11_CONTRACT_FREEZE.md`), M1.2 migration-runner audit (COMPLETE; see `M12_MIGRATION_RUNNER_COMPATIBILITY_AUDIT.md`), M1.3 schema fixture (COMPLETE; see `M13_SCHEMA_CONTRACT_FIXTURE.md`), M1.4 additive migration (COMPLETE; see `M14_ADDITIVE_MIGRATION_IMPLEMENTATION.md`), M1.5 feature flag/request context (COMPLETE; see `M15_FEATURE_FLAG_REQUEST_CONTEXT.md`), M1.6 repository contract/import validation (COMPLETE; see `M16_REPOSITORY_CONTRACT_IMPORT_VALIDATION.md`), M1.7 integration evidence gate (COMPLETE; see `M17_INTEGRATION_GATE_EVIDENCE.md`).

## 17. Codex technical recommendations

- Additive, feature-flagged rollout; current MySQL migration runner és claim/state machinery újrahasznosítása.
- Append-only evidence/history és canonical pointers; normál feldolgozásban nincs hard delete.
- Schema validation és deterministic identity kötelező AI output előtt.
- Cursor pagination és stabil V2 envelope már az első endpointtól.
- Mock AI/offline default; valódi provider csak explicit környezetben.
- Payment actionök jóváhagyásig disabled.

## 18. Első milestone és indítási kapu

M1 előtt:

1. A docs/UTOM_V2 dokumentumcsomag product-owner átnézése és jóváhagyása.
2. Entity/relation/claim/event vocabulary elfogadása.
3. V2 envelope és error code elfogadása.
4. Migration naming és feature flag konvenció elfogadása.
5. Disposable MySQL integration környezet a későbbi schema gate-hez.
6. M1 tulajdonos és acceptance evidence kijelölése.

M1 PASS után első kódolási lépés: additive schema migration és contract fixture. Legacy feed, auth, premium vagy pipeline route nem cserélhető le V2 read model összehasonlítás előtt.

## 19. Jelenlegi tervezési státusz

- Plan status: M1 COMPLETE – M1.7 INTEGRATION EVIDENCE PASS; M2 COMPLETE; M3 COMPLETE
- Coding status: M1 FOUNDATION AND BOUNDARY IMPLEMENTED; M2 ingestion envelope, runtime handoff és provenance persistence implemented; M3 pure dedup/cluster adapter, feature-flagelt runtime handoff és related projection implemented; M4 entity extraction contract, mock provider, feature-flagelt runtime handoff, AI audit és typed unresolved mention persistence implemented; M4 final MySQL 8 gate PASS
- Production application behavior changed: NO – legacy response/processing behavior is unchanged; M3 additions are disabled-by-default, additive adapter/projection boundaries
- V2 source documents available: YES – specification documents plus M01 execution plan and M11 contract freeze; M1-D01–M1-D05 owner-approved 2026-10-02; M1.1 complete
- Requirement traceability: YES – minden dokumentált approved requirement M1–M18 milestone-hoz rendelve
- Requirement nélküli milestone: NINCS
- Milestone nélküli approved requirement: NINCS
- M2 completed slices: **COMPLETE** – envelope foundation, feature-flagged runtime handoff, additive provenance persistence és audit history (`docs/UTOM_V2/M02_INGESTION_PROVENANCE_ENVELOPE.md`)
- M2 acceptance: **5/5 COMPLETE**, persistence migration `053`, fresh/upgrade/idempotency/rollback evidence PASS
- M3 completed slices: **pure existing dedup/cluster adapter contract + feature-flagged runtime handoff + related-news projection** – see `M03_DEDUP_CLUSTER_ADAPTER.md`
- M3 acceptance: **8/8 COMPLETE**, no new query/ranking/engine/AI/schema write; legacy source-of-truth unchanged
- M5 completed slices: **deterministic normalization + exact canonical/alias lookup + provenance-linked alias lifecycle + explicit collision review boundary** – see `M05_ENTITY_NORMALIZATION.md`
- M5 final gate: **COMPLETE**. Következő művelet: **M6 – entity resolution**, implementation intentionally not started in this session.
