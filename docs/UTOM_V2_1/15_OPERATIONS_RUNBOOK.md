# UTOM V2.1 Operations Runbook

Ez a runbook helyi vagy staging jellegű diagnosztikára készült. Production adatbázist, deployt, DNS-t, fizetést és fizetős AI-t ebben a folyamatban nem használunk.

## App nem indul

1. Ellenőrizd a futó process és a Next logját.
2. Futtasd a TypeScript, import és build ellenőrzést: `npm run typecheck`, `npm run check:imports`, `npm run build`.
3. Nézd meg, hogy az alkalmazási konfiguráció explicit-e: `npm run production:preflight` csak izolált, megfelelően konfigurált környezetben futtatható.
4. Titkot ne írj a ticketbe vagy logba; az operations redactor használata kötelező.

## DB unavailable

- A public `GET /api/health` csak process liveness választ ad.
- A részletes `GET /api/internal/health` kizárólag a belső worker tokennel érhető el.
- DB hiba esetén a readiness 503 és a válasz `health_unavailable`; a host, port, user és jelszó nem kerül visszaadásra.
- Ellenőrizd a DB elérhetőségét, majd a schema státuszt. Automatikus destructive javítást ne indíts.

## Schema mismatch

- Ellenőrizd az aktuális migration láncot a `npm run db:status` paranccsal.
- A szükséges séma verziója a repository legutóbbi migrationje, jelenleg 060.
- Hiányzó tábla, oszlop, index vagy checksum eltérés esetén állj meg és készíts külön migration tervet.

## Worker stale

- A részletes health válaszban nézd a workers, heartbeat és stale mezőket.
- A stale/zombie állapot diagnosztikai jelzés; a health endpoint nem módosítja a state-et.
- Ellenőrizd a worker folyamatot és a claim fencinget, majd csak bizonyítottan biztonságos recovery műveletet használj.

## Sok failed article

- Nézd a pipeline articleStates, processingStepStates és recentFailureCount mezőit.
- Egyedi rekordhoz használd a `npm run recovery:inspect -- <articleId>` parancsot.
- Csak retryable local step esetén használható a `npm run recovery:retry -- <articleId> <stepName>`; external/uncertain műveletet ne indíts automatikusan.

## RSS source hibázik

- Vizsgáld a fetch státuszt, parse eredményt és a consecutive failure mintát a worker logban.
- A belső health `rss` része a konfigurált, aktív és letiltott source-ok számát adja; a fetch/parse hibák forrásonként a worker logban és a feed failure eseményekben követhetők.
- Egyetlen 404 vagy parse hiba nem jelenti az egész alkalmazás leállását.
- A 444 proxy továbbra is `THIRD-PARTY / PROXY – HOLD`; ne állítsd canonical production source-ként.

## Backfill megállt

- A health operációs részében nézd a backfill stepStates és lastUpdated mezőt.
- A paused állapotot és a checksumot az M17 incremental backfill tesztjeinek szerződése szerint kezeld.
- Cursor vagy batch módosítása előtt ellenőrizd a claim heartbeatet és a költségkeretet.

## AI budget ceiling

- Paid AI alapértelmezésben ki van kapcsolva.
- A health aiBudget része csak módot, mock/paid futásszámot, becsült költséget és blokkolt escalation számot ad; kulcsot vagy promptot soha.
- Hard ceiling esetén az escalation blokkolt állapot; fizetős szolgáltatást ne engedélyezz a diagnosztika kedvéért.

## Premium auth hiba

- Először anonymous/free/active/expired entitlement állapotot különítsd el.
- 401/403 entitlement válasz zárolt állapot; 5xx upstream hiba diagnosztikai hiba.
- Ellenőrizd a session expiry-t, a premium proxy allowlistet és a belső upstream státuszt. Payment flow nincs implementálva.

## Rollback szükséges

- Csak a már bizonyított tranzakciós rollback és recovery eljárás használható.
- Ellenőrizd az operation key-t, claim fencinget és recovery auditot.
- Bizonytalan külső műveletet ne próbálj újra automatikusan; előbb operatori adjudikáció szükséges.

## Diagnosztikai riasztási feltételek

- readiness fail;
- ismételt DB connection failure;
- stale worker vagy stale claim;
- failed article spike;
- forrásonként ismételt RSS hiba;
- backfill tartósan paused;
- AI hard ceiling.

Production thresholdök: `TBD in production baseline`. Egyetlen RSS 404, egyetlen expected 401/403 és a paid AI disabled állapot önmagában nem incident.


## V2.1 final closure cross-reference – 2026-10-04

SEO/sharing, Premium UX, ingestion technical audit, localhost load/soak and final quality evidence are consolidated in docs/UTOM_V2_1/10_V2_1_FINAL_ACCEPTANCE.md and docs/UTOM_V2_1/17_V2_1_RELEASE_READINESS.md. No production DB, deploy, payment or paid AI was used.

