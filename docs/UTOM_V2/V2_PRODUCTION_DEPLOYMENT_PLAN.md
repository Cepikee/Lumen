# UTOM.HU / LUMEN V2 – PRODUCTION DEPLOYMENT TERV

Ez a dokumentum végrehajtatlan rollout-terv. Production deploy, production migration és production adatbázis-módosítás ebben a sessionben nem történt. M19 nem került létrehozásra.

## Előfeltételek

- Jóváhagyott release commit és visszaállítható Git checkpoint.
- Tulajdonos és üzemeltető által jóváhagyott change-window.
- Production DB backup és ellenőrzött restore-út.
- Production MySQL, Node és disk-space ellenőrzés.
- Production secret-ek és credentialek ellenőrzése; konkrét értékek: **TULAJDONOSI/ÜZEMELTETŐI KITÖLTÉS SZÜKSÉGES**.
- Server és frontend V2 flag kezdetben `OFF`.
- Paid AI provider alapértelmezésben `OFF`; bekapcsolás csak külön explicit művelettel, M12 költségkerettel és hard cappal.

## Pre-deploy backup

1. Production adatbázis teljes mentése.
2. Dump méret, checksum és olvashatóság rögzítése.
3. Elkülönített restore-próba vagy meglévő bizonyított restore-út ellenőrzése.
4. Sikertelen vagy hiányos backup esetén rollout leállítása.

## Migration

1. Aktuális production schema verzió felismerése.
2. Readiness és dry-run futtatása.
3. Csak a hiányzó canonical migration lánc alkalmazása.
4. Ledger, checksum és readiness ellenőrzése.
5. Visszaállítási határ előre rögzítve: alkalmazás rollback, majd csak indokolt adatinkonzisztencia esetén DB restore.

## Backend rollout

1. Backend deploy V2 server flaggel `OFF`.
2. Legacy smoke: homepage, article, auth, feed, related news és meglévő Premium működés.
3. Monitoring ellenőrzése.
4. Kontrollált server V2 `ON` kapcsolás.
5. V2 backend smoke: context API, timeline, source comparison, Premium endpoint, backfill readiness.

## Frontend rollout

1. Frontend deploy V2 flaggel `OFF`.
2. Legacy böngészős smoke.
3. Kontrollált frontend V2 `ON` kapcsolás.
4. Browser smoke: context, source comparison, multi-event, anonymous, non-premium, active és expired Premium.

## Backfill

- Teljes production backfill nem indul automatikusan a deploy pillanatában.
- Először kis batch, megfigyelés, pause/resume és cost ceiling.
- Csak stabil eredmény után fokozatos batch-növelés.
- Minden batchhez audit és rollback-kompatibilis checkpoint szükséges.

## Monitoring és rollback trigger

Rollout megállítása vagy visszagörgetése szükséges többek között:

- readiness vagy migration checksum hibánál;
- 5xx vagy auth/entitlement regressziónál;
- V2 context/timeline/source-comparison hibánál;
- adatvesztés, duplikáció vagy növekvő queue/retry esetén;
- költségkeret vagy provider boundary megsértésekor.

## Rollback sorrend

1. Frontend V2 `OFF`.
2. Server V2 `OFF`.
3. Alkalmazás előző release-re visszaállítása.
4. DB restore csak bizonyított adatprobléma esetén, jóváhagyással.
5. Paid provider és backfill kikapcsolva marad.

## Nyitott owner kérdések

Q08, Q10, Q11, Q12, Q13 és Q14 a canonical dokumentáció szerinti, nem blokkoló deferred döntések. Ez a terv nem dönt helyettük.

## Jelenlegi állapot

- Release Candidate staging PASS: **IGEN**.
- Production deployment terv elkészült: **IGEN**.
- Production secrets kitöltése: **SZÜKSÉGES**.
- Production DB érintve: **NEM**.
- Production deploy végrehajtva: **NEM**.
