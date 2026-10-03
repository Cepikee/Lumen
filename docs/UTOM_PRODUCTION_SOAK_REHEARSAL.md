# UTOM.HU / LUMEN – Production soak rehearsal

## Döntés

`TECHNICAL PRODUCTION CHANGE-WINDOW READINESS: NOT VERIFIED`

`FULL PRODUCTION GO-LIVE READINESS: BLOCKED`

`PRODUCTION DEPLOYMENT: NOT EXECUTED`

Ez a jegyzőkönyv csak lokális, izolált rehearsal bizonyítékot tartalmaz. Production adatbázist, production secretet, valódi külső szolgáltatást vagy tömegeltetést nem használtam.

## Environment és scale forrás

- Branch: `develop/utom-recovery`
- Target schema: `033`
- Node: repository által használt Node 24 runtime
- Scale forrás: meglévő `scripts/scale-fixture.cjs`, determinisztikus seedelt profilok: SMALL 200, MEDIUM 2 000, LARGE 10 000 article.
- A repository nem tartalmaz hiteles production cardinality exportot; ezért a profilok `HIGH SYNTHETIC CAPACITY PROFILE` értékűek, nem production-méretű állítások.
- A fixture kizárólag szintetikus adatot használ, valódi személyes adatot és production secretet nem.

## Korábbi bizonyíték

Az előző staging rehearsal külön dokumentuma rögzíti a pre-021 → post-030 migrációt, backup/restore-t, production build/runtime smoke-ot, pipeline-t, Speed Indexet, graceful restartet, hard-crash recoveryt és rollback restore-t. A jelenlegi baseline ezek után schema 033-ra frissült; az offline suite 71/71, MySQL suite 30/30 és production preflight PASS.

## Jelen kör futási eredménye

| Kapu | Eredmény | Megjegyzés |
|---|---|---|
| Working tree / branch audit | PASS | módosítások megőrizve, commit/push nem történt |
| Historical technical closure | PASS | 33 FIXED, 1 jogi OPEN |
| Existing scale fixture audit | PASS | `scripts/scale-fixture.cjs`, `scripts/scale-audit.cjs` |
| Local MySQL startup | BLOCKED | a disposable WSL MySQL endpoint nem vált elérhetővé a futási ablakban |
| New schema-033 scale population | NOT RUN | nincs mérési adat kitalálva |
| Long soak / resource trend | NOT VERIFIED | nincs futó DB/runtime target |
| Backup/restore of processed scale state | NOT RUN | izolált disposable DB nélkül nem futtatható |
| Production build artifact | PASS (baseline) | korábbi teljes build PASS |
| Full `npm run check` in this constrained run | BLOCKED | lint completed; Next build compiled then host `VirtualAlloc` failed under local memory pressure; previous baseline build remains PASS |
| External paid calls | 0 | tiltva |

## Required measurements not claimed

Az alábbiakhoz ebben a körben nincs hiteles számérték: article/summary/keyword/trend/cluster/history cardinality, DB size, dump size/duration, restore duration, per-migration lock timing, soak duration, throughput, CPU/RSS/heap trend, connection peak, backlog trend, health latency under load, restart/crash counts és post-soak invariants.

## Reconciliation és blockers

- Dependency advisory: RESOLVED (`npm audit --omit=dev`: 0 vulnerability).
- Schema/migration readiness: RESOLVED at 033; 33/33 applied in prior disposable rehearsal.
- Production cardinality: STILL OPEN until a real anonymized cardinality export or a completed synthetic capacity run is available.
- Long soak/resource trend: STILL OPEN; this run was blocked by unavailable local MySQL.
- Backup/restore on post-soak state: STILL OPEN for the same reason.
- HIST-033 source authorization: EXTERNAL / OPEN. Technical toggles and kill-switch controls exist, but legal authorization is not documented.

## Objective decision

`NO-GO` for claiming final technical change-window readiness. The existing technical closure and earlier staging rehearsal remain valid evidence, but the acceptance criteria require a completed scale, long soak, resource trend and post-soak backup/restore run. The next action is to bring up an isolated MySQL 8 disposable target, run the existing fixture through schema 033, execute the workload/restart/recovery matrix, collect measurements, then rerun the full regression.
