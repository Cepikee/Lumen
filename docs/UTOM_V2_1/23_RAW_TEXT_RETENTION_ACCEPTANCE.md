# Raw/full-text retention acceptance

## Acceptance scope

Schema `060`, worker `scripts/raw-text-retention.cjs`, runtime `lib/raw-text-retention.js`. A cél az `articles.content_text` biztonságos, auditált törlése a sikeres 24 órás és terminal failed 7 napos policy szerint.

## Required matrix

| Scenario | Expected |
|---|---|
| successful <24h | NOT PURGED |
| successful >24h + all required steps done | PURGED |
| pending/in-progress/uncertain raw step | NOT PURGED |
| stale but recoverable claim | NOT PURGED |
| failed <7d | NOT PURGED |
| terminal failed >7d | PURGED |
| active retry / external uncertainty | NOT PURGED |
| raw already NULL | NO-OP |
| duplicate worker / retry | one purge, then NO-OP |
| transaction failure | rollback, raw remains |
| evidence, summary, V2 state, URL/hash | preserved |
| article/context/source comparison/Premium reads | remain available |
| purged backfill | explicit `raw_text_unavailable` |
| purged reprocess | explicit `raw_text_unavailable`, no empty-body processing |

## Evidence

The unit matrix is implemented in `tests/unit/raw-text-retention.test.cjs`. The isolated MySQL gate executed fresh `001→060`, upgrade `059→060`, migration idempotence, the retention lifecycle scenarios, concurrent duplicate-worker handling and forced rollback on disposable loopback MySQL 8.0.46. The complete MySQL integration suite finished with 56 PASS / 0 FAIL / 3 documented SKIP. No raw body appeared in stdout, audit metadata or error logs.

## Runtime evidence

- Vendor/version: MySQL 8.0.46 (Ubuntu 24.04), disposable datadir, loopback port 3387.
- Fresh migration `001→060`: PASS.
- Upgrade migration `059→060` with existing article, user and V2 entity data: PASS; `content_text` preserved.
- Migration idempotence and readiness at `060`: PASS.
- Retention lifecycle, evidence-safe purge, rollback and duplicate-worker runtime test: PASS.
- Full MySQL integration suite: 56 PASS / 0 FAIL / 3 documented SKIP.

## Release decision

`RAW FULL-TEXT RETENTION IMPLEMENTED: YES`. `RAW FULL-TEXT RETENTION MYSQL RUNTIME: PASS`. `PRODUCTION DEPLOY EXECUTED: NO`. Remote staging and production deployment remain separate environment gates.
