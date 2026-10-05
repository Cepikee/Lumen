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

The unit matrix is implemented in `tests/unit/raw-text-retention.test.cjs`. The isolated MySQL gate must execute fresh `001→060`, upgrade `059→060`, migration idempotence, the 22 scenarios above, a concurrent duplicate-worker run, forced rollback, canonical V2 lifecycle, read models and Premium. No raw body may appear in stdout, audit metadata or error logs.

## Release decision

`RAW FULL-TEXT RETENTION IMPLEMENTED: YES` for code and offline regression scope. `PRODUCTION DEPLOY EXECUTED: NO`. Remote staging and production acceptance remain environment gates, not code changes.
