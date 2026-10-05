# Raw/full-text retention implementation plan — COMPLETED

**Projekt:** UTOM.HU / Lumen
**Branch:** `develop/utom-recovery`
**Schema:** `060`
**Owner policy:** sikeres feldolgozás után 24 óra; terminal failed/retry esetén 7 nap.
**Runtime policy:** UTC, fail-closed konfiguráció, alapértelmezett dry-run.

## Dependency audit

| Consumer | Raw text szükséges? | Meddig? | Reconstructable? | Retention impact |
|---|---:|---|---:|---|
| `lib/feed-ingestion.js`, `pipeline/scrapeArticle.js` | írás | ingest és scrape checkpoint | source URL alapján csak policy szerint | purge nem módosítja az article identityt |
| `pipeline/cron.js`, `lib/cron.js` | igen | minden raw-függő step terminális állapotáig | nem | aktív/pending/uncertain/recoverable állapot blokkol |
| summary/category/sentiment/keywords/embedding/plagiarism/clickbait | igen | saját durable step befejezéséig | saját outputból nem teljesen | required step és retry ellenőrzés |
| V2 entity/claim/relation extraction | igen | V2 processing és evidence persistence végéig | csak mentett projectionből | processing és hiányzó evidence span blokkol |
| `lib/v2/incremental-backfill*` | esetenként | batch feldolgozás közben | explicit `raw_text_unavailable` | purged article nem kerül csendben feldolgozásra |
| article/context/source comparison/Premium read models | nem a teljes body | tartós summary/projection után | igen | saját summary, metadata, V2 és evidence megmarad |
| debug/admin/legacy | nincs request-time purge függőség | explicit reprocessig | raw hiánynál kontrollált hiba | nincs arbitrary public delete |

Az audit során a teljes raw/full body egyetlen kanonikus tárolója az `articles.content_text` volt. A `summaries`, V2 claim/relation evidence spanok, provenance, canonical URL/hash és strukturált V2 táblák külön maradnak.

## Implementált modell

- A `060_raw_text_retention_audit` migráció append-only audit/run táblát hoz létre.
- A worker csak `done` vagy `failed` cikkeket vizsgál, bounded keyset batch-ben.
- Successful purge: `updated_at + 24h`, minden required step `done`, nincs aktív claim, nincs aktív/pending/uncertain step, V2 projection kész, minden evidence span tartósan jelen van.
- Failed purge: `updated_at + 7d`, nincs aktív vagy pending recovery, és az attempt limit kimerült vagy a failure explicit nem retryable.
- A purge tranzakcióban `SELECT ... FOR UPDATE`, új eligibility ellenőrzés, majd kizárólag `articles.content_text=NULL` történik.
- Második worker és ismételt futás no-op; csak a lockot megszerző worker ír purged audit eseményt.
- A script alapértelmezett módja dry-run; végrehajtás külön `--execute` és `UTOM_RETENTION_EXECUTE=true` opt-in.
- A raw body soha nem kerül logba vagy audit metadata-ba.

## Recovery, backfill és reprocess

`in_progress`, `pending`, `uncertain`, friss retry és stale-but-recoverable állapot fail-closed módon védett. Purge után a pipeline és a legacy útvonal explicit `raw_text_unavailable` hibát ad, nem indul üres szöveges AI-feldolgozás. Az incremental backfill purged rekordnál `unavailable` számlálót és `raw_text_unavailable` eredményt ad vissza, és nem claimel vagy módosít processing stepet.

## Observability

Az internal operational snapshot retention metrikákat tartalmaz: legutóbbi eligible/purged/failed számlálók, utolsó 24 órás purge időpont, legöregebb eligible időpont és worker last run. A public liveness válasz ezekből semmit nem tesz közzé.

## Teszt- és release-gate eredmény

- Célzott retention regression: `tests/unit/raw-text-retention.test.cjs` — 14/14 PASS.
- Migration chain: 001→060 statikusan contiguous és safe; readiness 060-ra frissítve; 059 és 061 fail-closed.
- M17 backfill regression: 7/7 PASS, beleértve explicit raw-unavailable ágat.
- TypeScript, import check és offline suite a teljes quality körben futtatandó a commit előtt.
- MySQL 8 fresh/upgrade/idempotence, transaction rollback és duplicate-worker acceptance a `23_RAW_TEXT_RETENTION_ACCEPTANCE.md` szerint izolált környezetben futtatandó.

**RAW FULL-TEXT RETENTION IMPLEMENTED: YES — code path and targeted regressions complete.**
Production deploy, VPS, payment, paid AI és source-policy bypass ebben a körben nem történt.
