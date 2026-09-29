# Utom.hu production change plan

## Előfeltételek

Rögzítsd a felelőst, jóváhagyót, előző kompatibilis release-t, új restore DB-t és megfigyelési ablakot. Töltsd be a konfigurációt a secret managerből, majd futtasd a read-only `npm run production:preflight` parancsot. Bármely FAIL esetén STOP.

## Sorrend

1. Release artifact, Node 24 és teljes preflight.
2. Scheduler, feed poller és minden writer leállítása.
3. Új preflight; active writer és claim legyen 0.
4. Tárhely: forrás DB + dump + restore DB + index/temp + build, legalább kétszeres tervezési biztonsági faktorral.
5. `--single-transaction --no-tablespaces` backup; exit, méret, footer, táblák és checksum ellenőrzése.
6. Migration plan; kizárólag az előre jóváhagyott lista fogadható el.
7. Migráció, migrációnkénti idő/hiba naplózással; writer továbbra sem indulhat.
8. Schema readiness és preflight; csak pontos 033 támogatott. Az email outbox titkosítási kulcsát a secret managerből kell betölteni.
9. App startup és autentikált HTTP health.
10. Külső side effect nélküli smoke és idempotens fixture feed.
11. Egy worker, heartbeat, egy canonical pipeline és Speed Index completion.
12. Többi writer/scheduler fokozatos indítása.
13. Megfigyelés: HTTP hibák, worker, pending/oldest backlog, email outbox `pending`/`uncertain`, failed/retry, DB kapcsolatok, Speed Index backlog, memória/CPU, provider hibák.
14. Dokumentált GO lezárás.

STOP: backup/restore/checksum hiba; kevés tárhely; aktív writer/claim; eltérő migration lista; váratlan destruktív warning; migration/readiness/HTTP/auth/smoke/dedup hiba; secret leak; worker/Speed Index megakadás; paid side effect; connection leak; súlyos erőforrásnyomás.

## Rollback

Ne próbálj helyben DDL rollbacket. Állíts le minden writert, izoláld a hibás release-t, hozz létre új üres restore DB-t, töltsd vissza az ellenőrzött pre-migration backupot, majd ellenőrizd checksum, schema version, row count és reprezentatív rekordhash alapján. Állítsd az előző release-t az új restore DB-re; app health után egy worker, smoke és Speed Index következik. A connection-string váltás és a GO/NO-GO manuális; backup/checksum/restore/integrity automatizálható.
