# Utom.hu staging/production deployment gate

## Production scale hardening – 2026-09-28

- [x] Reprodukálható SMALL/MEDIUM/LARGE 021 fixture.
- [x] LARGE 10 000 article backup, checksum/footer és külön DB restore PASS.
- [x] 021→030 timing és post-migration integrity PASS.
- [x] Read-only `production:preflight`; a transactional email outbox óta exact 033 gate szükséges.
- [x] High dependency advisories kontrollált major upgrade-je és regressziója; production audit 0.
- [ ] Production cardinalitású anonim rehearsal és külön soak/resource trend.
- [ ] Production deployment; ebben a körben tiltott és nem történt meg.

## Kompatibilitás és kötelező sorrend

- Régi alkalmazás + új séma: a 022–033 változások additívak, a 027 a régi URL-prefix unique indexet SHA-256 identity indexre cseréli. A 031 a session táblát, a 032 a közös rate-limit bucketet, a 033 a titkosított email outboxot emeli a migrációs láncba. Vegyes verziójú feed-írás nem támogatott.
- Új alkalmazás + régi séma: nem támogatott. A worker startup schema readiness ellenőrzése szándékosan fail-fast állapotot ad.
- Javasolt rollout: író web/worker és email-outbox folyamatok leállítása → ellenőrzött backup → migration status → 022–033 migráció → új alkalmazás indítása → readiness és smoke teszt. Rolling worker upgrade nem javasolt a 027-es ingest indexváltás miatt.

## Pre-deploy

- Azonosítsd és jegyezd fel a kiadandó branch és commit SHA értékét.
- Készíts ellenőrzött, visszaállítható teljes adatbázis-backupot. Ebben a repositoryban nincs automatikus production backup vagy DDL rollback.
- Állítsd le az article workereket és a feedet író webfolyamatokat. Ellenőrizd, hogy nincs aktív tranzakció vagy advisory lock.
- Futtasd kapcsolat nélkül: `npm run db:plan`. Az eredménynek folytonos 001–033 láncot és nulla critical findingot kell mutatnia.
- Állítsd be a migrátor környezetét secret managerből: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_MIGRATION_ENABLED=true`, valamint stagingen `UTOM_MIGRATION_TARGET=staging`, productionön `UTOM_MIGRATION_TARGET=production` és csak igazolt backup után `UTOM_PRODUCTION_BACKUP_CONFIRMED=true`.
- Futtasd: `npm run db:status`. Ellenőrizd a jelenlegi verziót és minden pending fájlt.
- Ellenőrizd a runtime flag-eket. Külső hatás csak explicit `*_ENABLED=true` mellett engedélyezett. Az `EMAIL_OUTBOX_ENCRYPTION_KEY` legyen secret managerből betöltött, 32 bájtos kulcs. Offline/integration környezetben `UTOM_OFFLINE_MODE=true`, `AI_PROVIDER=mock` legyen.
- Ha `UTOM_TRUST_PROXY_HEADERS=true`, az ingress dobjon el minden kliens által érkező `CF-Connecting-IP`, `X-Real-IP` és `X-Forwarded-For` értéket, majd kizárólag a hiteles kapcsolat címéből írja újra őket. Közvetlen publikus elérés mellett hagyd `false` értéken.
- A premium Insights proxy `UTOM_INTERNAL_BASE_URL` értéke kizárólag operátor által kezelt `http`/`https` origin legyen, path/query/fragment és beágyazott credential nélkül. Az opcionális `UTOM_INTERNAL_PROXY_TIMEOUT_MS` tartománya 100–15000 ms, a `UTOM_INTERNAL_PROXY_MAX_BYTES` tartománya 1024–2097152 byte.

## Migration

1. Futtasd az előző pont szerinti status parancsot ugyanazzal a célkonfigurációval.
2. Futtasd: `npm run db:migrate:local -- --apply` helyett közvetlenül `node db/migrate.cjs --apply`; a célkörnyezetet az `UTOM_MIGRATION_TARGET` választja ki.
3. Várt eredmény: a pending migrációk sorrendben jelennek meg az `Applied:` sorban; ismételt `npm run db:status` esetén `pending=0`, aktuális verzió `033`.
4. Hiba, checksum mismatch, hiányzó ledger vagy DDL warning esetén állj meg. MySQL DDL-re nincs megbízható automatikus rollback; ne folytasd kézi sémaátírással.

## Worker startup

- Indíts egy workert. A startup csak teljes recovery/feed/Speed Index/operations séma mellett lehet ready.
- Hívd a `GET /api/internal/health` végpontot a legalább 32 karakteres belső Bearer tokennel.
- Ellenőrizd: `readiness=true`, legalább egy friss worker heartbeat, nulla váratlan stale article és stale Speed Index batch.
- Ezután indítható a többi worker. Worker ID legyen processzenként egyedi; az alapértelmezett PID + UUID, konfigurált környezetben stabil deployment prefix használható.

## Staging smoke teszt

- Kizárólag staging fixture-adatot és mock AI providert használj.
- Ellenőrizd a DB connectivityt, a schema version `033` értéket és a health readiness állapotot.
- Két külön alkalmazásfolyamatból ellenőrizd, hogy ugyanaz az identity közös rate-limit bucketet használ, és a limit fölötti kérés fail-closed választ kap.
- Premium, basic és expired fixture sessionnel ellenőrizd a premium Insights átjárót; az upstream timeout, redirect és túlméretes válasz adjon generic hibát, az API key ne jelenjen meg kliensválaszban vagy logban.
- Ütemezd az indexelt, batchelt `npm run rate-limit:cleanup` karbantartást, és figyeld a `shared_rate_limits` sor- és tárhelytrendjét. Egy futás alapból legfeljebb 500 lejárt sort töröl; a batch a `RATE_LIMIT_CLEANUP_BATCH` változóval állítható.
- Ütemezd az `npm run email-outbox:process` feldolgozót. Figyeld a `pending` korát és az `uncertain` darabszámot; `uncertain` rekordot csak provider-egyeztetés után kezelj, mert a processzor nem küldi automatikusan újra.
- Illessz be egy fixture feed article-t; ellenőrizd a canonical identityt és az explicit UTC publication timestampet.
- Várd meg az article `done` állapotát, a summaryt, clustert és related-news olvasást.
- Ellenőrizd, hogy a Speed Index article-step csak ütemezett, majd a deferred batch külön completiont kapott.
- Ellenőrizd újra a backlog age, `needs_recovery`, stale és generation lag értékeket.

## Stop condition és visszaállítás

Állj meg schema mismatch, checksum mismatch, DB warning, readiness=false, növekvő stale count, elveszett heartbeat, unexpected `needs_recovery`, vagy hibás smoke eredmény esetén. Állítsd le az új workereket és őrizd meg a logokat. DDL-visszaállítást csak az előzetesen ellenőrzött backupból, külön jóváhagyott adatbázis-helyreállítási eljárással végezz.

## Recovery műveletek

- Read-only: `npm run recovery:inspect -- <article-id>`.
- Biztonságos lokális failed step retry: `npm run recovery:retry -- <article-id> <step-name>`.
- `uncertain` külső/AI műveletet a CLI nem resetel. Operátori eredmény-egyeztetés és külön javítás szükséges.
- Minden engedett manuális retry bekerül a `recovery_audit_log` táblába.
