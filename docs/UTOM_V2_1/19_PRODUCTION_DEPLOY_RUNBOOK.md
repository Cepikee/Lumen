# UTOM production deploy runbook – terv

Ez csak jóváhagyásra váró terv. Nem futott production környezetben.

## Előfeltételek

1. Remote stagingen azonos Node/Next/MySQL főverzió és a schema-059 migration chain PASS.
2. Production backup target, restore rehearsal és rollback owner kijelölve.
3. Minden secret runtime secret store-ban, érték nélkül a Gitben.
4. `production-preflight` PASS: explicit production mode, DB connectivity, latest migration, readiness, nulla aktív claim/writer.
5. Owner döntések lezárva: retention, source/TDM, 444, email, FFmpeg, monitoring és backup retention.

## Deploy sorrend

1. Change window és rollback felelős kijelölése.
2. Worker kontrollált leállítása; új ingestion és maintenance művelet tiltása.
3. MySQL backup készítése, checksum és off-host másolat ellenőrzése.
4. Új release könyvtár előkészítése, kód és lockfile ellenőrzése.
5. `npm ci` és production build futtatása a release könyvtárban.
6. Migration plan/diff ellenőrzése; csak jóváhagyott, additive és kompatibilis migration alkalmazható.
7. Production schema readiness és migration status ellenőrzése.
8. Web process restart systemd alatt; localhost liveness és readiness ellenőrzése.
9. Same-origin smoke: homepage, article, auth/me, public feed, Premium locked state, internal health.
10. Proxy HTTPS, forwarded headers, trusted-origin és rate-limit ellenőrzése.
11. Worker indítása `BACKGROUND_JOBS_ENABLED=true` és valid internal token mellett.
12. Első 15–30 perc fokozott monitorozás: 5xx, DB connections, worker heartbeat, stale claims, queue/backlog, disk és memory.

## Stop és rollback

Azonnali stop: readiness failure, schema mismatch, migration error, auth/premium bypass, 5xx emelkedés, worker duplicate, DB connection exhaustion, disk/logging kritikus állapot.

- App hiba esetén az előző release könyvtár és process image állítható vissza.
- Schema-változásnál destructive rollback helyett csak bizonyított forward-compatible eljárás vagy backup restore használható.
- Data restore előtt a web/worker írás leállítandó, az adatvesztési ablakot az ownernek jóvá kell hagynia.
- Rollback után readiness, smoke és worker heartbeat újra kötelező.

## Zero/low downtime

Az induló egy VPS-es, systemd-alapú modell rövid process restarttal és rövid karbantartási ablakkal számol. Zero downtime nem ígérhető, amíg nincs külön többpéldányos web, kompatibilis migration policy és proxy oldali drain.

## Utóellenőrzés

- release commit és schema verzió naplózása;
- backup és restore evidence megőrzése;
- readiness snapshot exportálása;
- log/alert trend ellenőrzése;
- worker és scheduled job állapot dokumentálása;
- GO/NO-GO döntés rögzítése.
