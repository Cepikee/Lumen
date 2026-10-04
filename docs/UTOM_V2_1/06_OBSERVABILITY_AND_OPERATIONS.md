# Megfigyelhetőség és operations

## Követelmények

Biztonságos health válasz app/DB/schema/worker állapottal; pipeline pending, in_progress, done, failed, skipped, stale; backfill cursor/remaining; AI cost state csak belső vagy ops szinten.

## Acceptance

Secret és belső érzékeny adat nem kerül public response-ba, a hibás és stale állapot megkülönböztethető.

## Státusz

`NOT STARTED`.

## Observability és operations closure – 2026-10-04

- A meglévő internal health route read-only operational snapshotot ad: schema, workers, article/processing state-ek, recent failure count, backfill state, V2 counts és AI budget állapot.
- A public `/api/health` csak minimális liveness választ ad: `status=ok`, `liveness=true`; DB és belső topology nélkül.
- Internal health továbbra is worker-token védett, és a válasz nem tartalmaz DB hostot, portot, usert, jelszót, SQL-t vagy stack trace-t.
- A DB observability wrapper lokálisan méri az operation időt, failure-t és slow/critical diagnosztikai eseményt; paraméterezett SQL vagy titok nem kerül a logba.
- A backfill, worker stale, pipeline state és V2 quality signalok read-only diagnosztikaként jelennek meg; a health kérés nem módosít state-et.
- Állapot: `PASS – LOCAL/STAGING-READY DIAGNOSTICS`.

## Final observability closure – 2026-10-04

- Internal health diagnostics are `PASS – LOCAL/STAGING-READY`; public liveness is minimal and database-free.
- The operational snapshot is schema-gated, read-only and returns no credentials, SQL, host, port or stack trace.
- `V21-OPS-F001` (wrong AI escalation source table) was reproduced, fixed and regression-tested.
- Full evidence: offline 395/395, MySQL 56 PASS/0 FAIL plus one FFmpeg capability skip, TypeScript PASS, ESLint 0 errors, import PASS, `npm run check` PASS, build 74/74 PASS, npm audit 0.


## V2.1 final closure cross-reference – 2026-10-04

SEO/sharing, Premium UX, ingestion technical audit, localhost load/soak and final quality evidence are consolidated in docs/UTOM_V2_1/10_V2_1_FINAL_ACCEPTANCE.md and docs/UTOM_V2_1/17_V2_1_RELEASE_READINESS.md. No production DB, deploy, payment or paid AI was used.

