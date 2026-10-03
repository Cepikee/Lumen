# M3 – Existing dedup és cluster adapter

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03 (Europe/Budapest)

## M3 acceptance-gap

Az M3 specifikációja nem számozott al-lépéseket ad, ezért az alábbi mátrix a dokumentumban szereplő explicit acceptance-kapukat követi. A related-news projection elkészítésével az összes M3 acceptance requirement teljesült.

Aktuális összesítés: **8 explicit requirement; COMPLETE 8; PARTIAL 0; NOT STARTED 0; BLOCKED 0; N/A 0.**

| M3 requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Meglévő canonical article identity és retry-safe dedup újrahasznosítása | COMPLETE | `lib/article-identity.js`, `lib/feed-ingestion.js`, legacy pipeline regressziók, runtime handoff | nincs |
| Meglévő cluster assignment/identity és membership újrahasznosítása | COMPLETE | `pipeline/clusterArticles.js`, `pipeline/idempotency.js`, cluster lock regresszió, runtime handoff | nincs |
| Stabil, verziózott V2 adapter contract | COMPLETE | `lib/v2/dedup-cluster-adapter.js`, contract version `v2.dedup-cluster.1`, targeted regressziók | nincs a kiválasztott pure slice-ban |
| Null/unresolved és malformed input explicit kezelése | COMPLETE | adapter: null cluster, unknown dedup, invalid identity reject; targeted regressziók | nincs a kiválasztott pure slice-ban |
| Determinisztikus, immutable, self-reference-mentes output | COMPLETE | stabil ID-rendezés, deduplication, self exclusion, deep freeze; targeted regressziók | nincs a kiválasztott pure slice-ban |
| Legacy related-news projection adaptálása | COMPLETE | `lib/v2/related-news-projection.js`, `lib/v2/runtime-related-news.js`, `app/api/related/route.ts`, targeted related regressziók | nincs |
| Feature-flagelt runtime integráció és ON/OFF evidence | COMPLETE | `lib/v2/runtime-dedup-cluster.js`, `pipeline/cron.js`, explicit OFF/ON targeted regressziók | nincs |
| Concurrency/no duplicate cluster/article write gate | COMPLETE (legacy baseline) | `pipeline/clusterArticles.js` advisory lock, pipeline idempotency és MySQL recovery regressziók | adapter nem birtokol új lockot vagy write-ot |

## Legacy dedup/cluster inventory

- canonical article identity: `lib/article-identity.js`, `lib/feed-ingestion.js`, `db/migrations/027_article_ingestion_identity.sql`
- source dedup: `lib/source-identity.js`, feed ingestion, related-news normalization
- duplicate handling: `INSERT IGNORE` + canonical `url_identity` lookup; ingestion outcome `inserted/deduplicated`
- cluster implementation: `pipeline/clusterArticles.js`, `pipeline/cron.js`
- cluster locking: MySQL `GET_LOCK('utom:cluster:utc-day:v1', 10)`
- membership: `articles.cluster_id`, `clusters.id`
- related-news: `lib/related-news.js`, `app/api/related/route.ts`, related-news tests
- retry/idempotency: `pipeline/idempotency.js`, `pipeline/state-machine.js`, `tests/integration/mysql-pipeline-recovery.test.cjs`
- relevant DB structures: `articles.url_identity`, `articles.cluster_id`, `clusters`, `summaries`, `sources`, `speed_index_history`
- relevant regression tests: article identity, pipeline idempotency/cluster lock, related-news, MySQL pipeline recovery

## Final selected slice

**Exact requirement:** a már létező legacy related-news eredmény stabil, verziózott V2 projectionje.

**Why now:** ez volt az egyetlen fennmaradó M3 acceptance requirement; a related route queryje után a stabil snapshot már rendelkezésre áll.

**Scope:** a legacy related result egyszeri pure projectionje, canonical `UTOM_V2_ENABLED` gate, ordering/self/duplicate/null contract és legacy response változatlansága.

**Out of scope:** új SQL/query, reranking, cluster engine, migrations, backfill, AI, DB write.

## Adapter contract

- input: validated object with positive `articleId`, canonical/original URL, optional legacy ingestion outcome, optional legacy cluster result, optional related IDs
- output: `contractVersion`, `article`, `dedup`, nullable `cluster`, `relatedArticleIds`
- article identity: canonical URL plus SHA-256 `urlIdentity`; canonicalization remains in legacy helper
- cluster identity: legacy positive `clusterId`; no re-hash or replacement
- duplicate semantics: `inserted → new_article`, `deduplicated → same_article`, otherwise explicit `unknown`
- related semantics: supplied legacy IDs only; self and invalid/duplicate IDs excluded; no new relation inference
- null/unresolved: missing cluster is `null`; missing dedup evidence is `unknown`
- ordering: numeric ascending IDs for deterministic projection
- version: `CONTRACT_VERSIONS.dedupClusterAdapter = v2.dedup-cluster.1`
- immutable: deep-frozen, JSON-safe, no DB connection/function/circular value

### Related projection contract

- version: `CONTRACT_VERSIONS.relatedNewsProjection = v2.related-news.1`
- input: the already returned legacy related array and current summary/article identifiers
- output: `current`, `items` and the projection contract version
- identity: legacy `summaryId` is preserved; `articleId` is preserved when the legacy snapshot provides it, otherwise remains `null`
- ordering: original legacy array order is preserved; no new ranking or sorting
- duplicates: first occurrence wins by article ID, or summary ID when article ID is unavailable
- self-reference: current summary and current article are excluded
- empty/unresolved: `[]` means a completed empty result; `null` means no related snapshot yet
- malformed rows: ignored without changing the legacy array
- source metadata: canonical source key when present; missing source remains `null`
- publication time: not invented; legacy `created_at` is retained as `createdAt`, not relabeled as publication time
- immutable/JSON-safe: deep-frozen output, no connection, function or secret

## Validation

Related projection targeted + runtime tests: **5/5 PASS**. M3 pure/runtime/legacy regressziók: **26/26 PASS**. Full offline suite: **263/263 PASS**. TypeScript: **PASS**. ESLint: **0 errors** (existing warnings only). Import check: **PASS**. Production build: **PASS**. No SQL or schema was added; MySQL runtime gate is not required.

## M3 status

- M1 COMPLETE: IGEN
- M2 COMPLETE: IGEN
- M3 CURRENT SLICE COMPLETE: IGEN
- M3 COMPLETE: IGEN
- M3 IMPLEMENTATION BLOCKER: NINCS
- LATEST SCHEMA VERSION: 053
- NEXT STEP: M4 – Entity extraction

## M3 final integration gate

- legacy canonical identity, source/dedup, cluster engine és advisory lock: változatlan, a korábbi regressziókkal PASS
- pure dedup/cluster adapter: PASS
- runtime adapter OFF/ON: PASS; OFF call count 0, ON call count 1
- related projection: PASS; egyetlen meglévő query eredményét fogyasztja, nem rankol újra
- feature OFF: nincs M3 V2 runtime hatás
- feature ON: csak adapter/projection, nincs új engine, DB write vagy AI
- AI: 0
- M3 schema: nincs változás, latest `053`
- blocking M3 open questions: 0
- open M3 bugs: 0

**M3 COMPLETE: IGEN**
