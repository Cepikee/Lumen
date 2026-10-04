# UTOM.HU / LUMEN V2 – RELEASE CANDIDATE / STAGING READINESS

Ez a dokumentum nem M19 és nem új feature-milestone. Az M1–M18 implementáció lezárása után végzett, productiont nem érintő, izolált release-candidate ellenőrzés bizonyítéka.

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
HEAD: `02429136c90265f6d57e74c7510b77a392c3a16d`
Audit dátuma: 2026-10-04 (Europe/Budapest)
Production deploy: **NEM**
Production adatbázis: **NEM ÉRINTETT**
Valódi fizetős provider hívás: **0**

## 1. Ellenőrzési határ

- M1–M18: korábban lezárt, nem nyitottuk újra.
- M19: nincs definiálva és nem került létrehozásra.
- A release-candidate dokumentum célja a staging-szerű együttműködés ellenőrzése, nem új funkcionalitás.
- Ebben a sessionben commit és push nem történt.

## 2. Kiinduló diff

Az audit kezdetén a branch és a remote azonos HEAD-en állt. A working tree-ben a korábbi V2-dokumentációs módosítások mellett az audit során az alábbi célzott alkalmazási javítás készült:

- `docs/UTOM_V2/99_IMPLEMENTATION_MASTER_PLAN.md` – V2-CLOSE-F001 elavult státuszszöveg javítása;
- `docs/UTOM_V2/V2_FINAL_CLOSURE.md` – M1–M18 záró audit bizonyítéka;
- `lib/operations.js` – a readiness latest sémaverziója 058-ra igazítva;
- `tests/integration/mysql-pipeline-recovery.test.cjs` – a 058-as latest elvárás rögzítése;
- `tests/unit/schema-readiness-latest-version.test.cjs` – célzott regresszió;
- ez a dokumentum.

`git diff --check`: **PASS**. Tracked credential, session token, teszt-DB URL, dump vagy log nem került a diffbe.

## 3. Környezet

| Elem | Tényleges érték |
|---|---|
| Windows Node | v24.19.0 |
| npm | 11.17.0 |
| WSL | Ubuntu 24.04.5 LTS |
| WSL MySQL kliens/szerver | MySQL 8.0.46; a szolgáltatás fut |
| Git | 2.55.0.windows.3 |
| Branch | `develop/utom-recovery` |
| HEAD | `02429136c90265f6d57e74c7510b77a392c3a16d` |

## 4. Owner kérdések

Az alábbi szövegek közvetlenül a `91_OPEN_QUESTIONS.md` canonical registerből származnak.

### Q08 – source trust weighting

- **Pontos kérdés:** source trust weighting.
- **Fázis:** M11 – conflict display.
- **Dokumentált opciók:** none / weighted.
- **Ajánlás:** no hidden winner; explicit evidence.
- **Miért maradt nyitva:** a rendszernek nem kell forrássúlyt választania ahhoz, hogy az ellentmondó megfigyeléseket megőrizze.
- **Jelenlegi viselkedés:** nincs rejtett forrásgyőztes; a bizonyítékok és konfliktusok explicit módon maradnak meg.
- **Production előtti döntés:** nem szükséges a jelenlegi, winner nélküli működéshez.
- **Ha nem döntünk:** konfliktusok review állapotban maradnak, automatikus rangsorolás nem történik.
- **Besorolás:** **B – indulás után is eldönthető**.

### Q10 – manual review roles

- **Pontos kérdés:** manual review roles.
- **Fázis:** M5 – operations.
- **Dokumentált opciók:** admin / reviewer.
- **Ajánlás:** explicit role matrix.
- **Miért maradt nyitva:** a jelenlegi M1–M18 slice review-jelölést és auditot biztosít, de nem vezet be új manuális review-admin felületet.
- **Jelenlegi viselkedés:** az ambiguous/review állapotok megmaradnak; automatikus merge vagy split nincs.
- **Production előtti döntés:** csak akkor kötelező, ha review-műveletet akarunk élesben megnyitni; a jelenlegi read-only release-hez nem.
- **Ha nem döntünk:** a review állapotok nem kapnak új szerepkör-alapú mutációs workflow-t.
- **Besorolás:** **B – indulás után is eldönthető**.

### Q11 – payment and billing

- **Pontos kérdés:** payment and billing.
- **Fázis:** M16 – entitlement.
- **Dokumentált opciók:** provider choices.
- **Ajánlás:** keep actions disabled.
- **Miért maradt nyitva:** payment provider és billing lifecycle nincs jóváhagyva.
- **Jelenlegi viselkedés:** Premium hozzáférés csak szerveroldali entitlementből jön; payment/upgrade CTA nincs bekötve, a műveletek letiltva maradnak.
- **Production előtti döntés:** nem szükséges, amíg fizetési műveletet nem teszünk elérhetővé.
- **Ha nem döntünk:** Premium tartalom meglévő entitlementtel működik, új előfizetés nem vásárolható az alkalmazásból.
- **Besorolás:** **B – indulás után is eldönthető**.

### Q12 – separate reporting database

- **Pontos kérdés:** separate reporting database.
- **Fázis:** M13/M17 – scale and isolation.
- **Dokumentált opciók:** same MySQL / reporting replica.
- **Ajánlás:** measure read-model load first.
- **Miért maradt nyitva:** a read model terhelési bizonyíték nélkül nem indokolt külön adatbázist bevezetni.
- **Jelenlegi viselkedés:** a V2 read model ugyanazon MySQL boundaryn, bounded és read-only lekérdezésekkel működik.
- **Production előtti döntés:** nem szükséges a jelenlegi bounded release-hez.
- **Ha nem döntünk:** a rendszer ugyanazt a MySQL-t használja; későbbi terhelési mérés alapján lehet szétválasztani.
- **Besorolás:** **B – indulás után is eldönthető**.

### Q13 – graph database

- **Pontos kérdés:** graph database.
- **Fázis:** M13 – scale.
- **Dokumentált opciók:** MySQL / separate graph.
- **Ajánlás:** measure before adding.
- **Miért maradt nyitva:** a V2 jelenlegi gráfmodellje relációs MySQL táblákon teljesíti a lezárt acceptance-eket.
- **Jelenlegi viselkedés:** nincs külön graph database és nincs hozzá provider vagy runtime dependency.
- **Production előtti döntés:** nem szükséges a jelenlegi M1–M18 funkcionalitáshoz.
- **Ha nem döntünk:** a relációs modell marad; későbbi traversal/scale mérés alapozhatja meg a változtatást.
- **Besorolás:** **B – indulás után is eldönthető**.

### Q14 – timeline business-day presentation policy

- **Pontos kérdés:** timeline business-day presentation policy.
- **Fázis:** M10/M13 – temporal correctness.
- **Dokumentált opciók:** UTC / Budapest / user locale.
- **Ajánlás:** UTC storage, explicit display policy.
- **Miért maradt nyitva:** a tárolási és `asOf` szemantika rögzített, de a későbbi termékfelületek üzleti-nap megjelenítési szabálya külön döntés lehet.
- **Jelenlegi viselkedés:** UTC tárolás, explicit `asOf`, stabil felső korlát és determinisztikus sorrend; a jelenlegi UI nem választ automatikusan új üzleti-nap szabályt.
- **Production előtti döntés:** nem szükséges a jelenlegi UTC-alapú release-hez.
- **Ha nem döntünk:** a V2 UTC és explicit megjelenítési alapelve szerint működik; új lokalizált üzleti-nap funkció nem jelenik meg.
- **Besorolás:** **B – indulás után is eldönthető**.

## 5. Adatbázis release gate

Elvárt lánc: `001 → 058`, jelenlegi latest schema: `058`.

- Statikus migration plan: **PASS**, 58 fájl, folytonos lánc, `safe=true`.
- Fresh migration 001→058 izolált tesztadatbázison: **PASS**.
- Upgrade migration 032→058 izolált tesztadatbázison: **PASS**.
- Ledger/checksum/readiness: **PASS**; 58 migráció, latest/current `058`, pending `0`, readiness `ready=true`.
- Idempotencia: **PASS**; a második teljes migration futtatás `0` új migrációt alkalmazott.
- Backup/restore izolált tesztadatbázison: **PASS**; dump mérete `78 961` byte, backup `409 ms`, restore `6 735 ms`, restore utáni readiness `ready=true`, ledger `58`, latest `058`.
- Concurrency, rollback, worker health, rate limiting és recovery: **PASS**, a 37/37 célzott MySQL pipeline teszten.

A futtatás közvetlen WSL root socketen, kizárólag ideiglenes `utom_rc_20261004_*` adatbázisokon és `utom_release_admin` tesztfelhasználóval történt. Az adatbázisokat, felhasználót és dumpot a futás után eltávolítottam. Production adatbázist vagy ismeretlen jelszókerülő utat nem használtam.

### V2-RC-F001 – sémakövetelmény és legfrissebb migration eltérése

- **Severity:** HIGH (release gate működési hiba).
- **Reprodukció:** friss 001→058 migráció után a readiness ellenőrzés `latestRequiredVersion=057` és `unsupported_schema_version:058` eredményt adott.
- **Root cause:** `lib/operations.js` a repository aktuális legfrissebb migrációja helyett a korábbi `057` verziót deklarálta kötelező latest verzióként.
- **Javítás:** a kötelező latest verzió `058` lett; az integrációs elvárások és az önálló regressziós teszt a migration lista utolsó verziójához köti az értéket.
- **Regresszió:** `tests/unit/schema-readiness-latest-version.test.cjs`; a teljes célzott MySQL pipeline `37/37 PASS`.
- **Státusz:** `FIXED`.

## 6. Build és runtime

- `npm audit --omit=dev`: **PASS**, 0 vulnerability.
- TypeScript: **PASS**.
- ESLint: **0 error, 386 warning**; tömeges warning-refaktor nem része ennek a gate-nek.
- Import check: **PASS**.
- `npm run check`: **PASS**.
- Production build: **PASS**, 74 static page.
- Production-mode local runtime: **PASS**, `/` és `/api/auth/me` HTTP 200 offline konfigurációval.
- Repository-local clean install: **BLOCKED**, `npm ci --ignore-scripts` Windows `EPERM` hibával állt meg az `@next/swc-win32-x64-msvc` bináris fájl zárolása miatt. A lockfile nem változott.
- Izolált temporary clean install: **PASS**, 706 csomag települt a lockfile alapján.
- Temporary quality gate TypeScript: **PASS**.
- Temporary quality gate ESLint: **PASS**, `--quiet` módban 0 hiba; teljes futásban 386 warning.
- Temporary quality gate import check: **PASS**.
- Temporary quality gate offline suite: **366/366 PASS**.
- Temporary `npm run check`: **PASS**, production build 74 statikus oldallal.
- Temporary production runtime smoke: **PASS**, `/` → 200, `/api/auth/me` → 200, V2 context jogosulatlan kérés → 401.
- A teljes fejlesztői dependency audit ebben az izolált installban 5 high találatot jelzett; a kért runtime audit (`npm audit --omit=dev`) továbbra is **0 vulnerability**. Az audit scope-ban nem futott `npm audit fix`.

## 7. Feature flag és legacy mátrix

| Mátrix | Elvárt viselkedés | Állapot |
|---|---|---|
| Server OFF / frontend OFF | legacy működés, nincs V2 kérés/provider | PASS a korábbi M14–M18 evidence és offline regressziók szerint |
| Server ON / frontend OFF | V2 backend elérhető, V2 panel nem látható | PASS a flag/import/API contract tesztek szerint |
| Server OFF / frontend ON | fail-closed, biztonságos degrade | PASS a frontend normalizáló és M14 flag regressziók szerint |
| Server ON / frontend ON | teljes V2 panel/runtime | PASS a M18 Chrome evidence szerint |

Legacy article, related news, auth, meglévő Premium és feed/pipeline: **PASS** a canonical regressziók szerint.

## 8. V2 staging smoke evidence

Az M18 canonical fixture bizonyítékai:

- article context: PASS;
- entity/relation/claim/event strukturált lánc: PASS determinisztikus fixture-rel;
- temporal as-of/current: PASS;
- conflict: PASS, nincs automatikus winner;
- source comparison: PASS shared/source-only/numeric/attribution/temporal/missing semantics;
- Premium: anonymous 401, non-premium 403, active 200, expired 403;
- single context fetch: PASS;
- multi-event selector: PASS;
- mobile/desktop és hydration: PASS a browser acceptance bizonyítékban;
- konzolhiba és stale Premium DOM: nem maradt.

## 9. M17 backfill gate

Bounded batch, pause/resume, duplicate run, busy claim, kétkapcsolatos concurrency, leased connection, deadlock retry és rollback: **PASS** a `M17_INCREMENTAL_BACKFILL.md` MySQL 8.0.46 és unit bizonyítékai szerint.

## 10. AI, költség és biztonság

- Valódi fizetős provider: **0**.
- M12 cost router: **PASS**.
- Hard cap: **PASS**.
- Közvetlen provider bypass: **NINCS** a statikus auditban.
- M18-F01: **PASS** – pontosan három opt-in GET route, fetch metadata, Origin/Referer ellenőrzés, cross-site és mutation tiltás.
- Premium entitlement: **PASS**, session + szerveroldali entitlement.
- SSRF releváns regressziók: **PASS**.
- Belső adat/sensitive leak: **0**.
- Tracked secret: **0**.

## 11. Backup, restore és recovery

Az izolált release-candidate MySQL gate eredménye:

- ideiglenes release DB backup: **PASS** (`78 961` byte);
- új izolált DB restore: **PASS** (`6 735 ms`);
- restore utáni readiness és ledger: **PASS** (`058`, 58 bejegyzés, nincs pending migration).

A canonical M17/M18 recovery bizonyítékokban a pause/resume, rollback, checksum és recovery út szintén PASS; production adat nem érintett.

## 12. Release blokkolók

- **P0:** nincs.
- **P1:** nincs.
- A repository-local `npm ci` fájlzárolása környezeti hiba, de az izolált package-only install PASS, ezért önálló release blockernek nem minősül.
- **P2:** 386 ESLint warning; nem release-blocker ebben a körben.
- **Döntés:** Q08, Q10, Q11, Q12, Q13, Q14 nyitott, nem blokkoló owner döntések.

## 13. Nem végrehajtandó rollout-terv

1. staging/production backup jóváhagyása;
2. migration readiness ellenőrzése;
3. backend deploy V2 OFF állapotban;
4. legacy smoke;
5. kontrollált server V2 ON;
6. V2 backend smoke;
7. frontend V2 OFF build/deploy;
8. kontrollált frontend ON;
9. browser smoke és monitoring;
10. rollback trigger figyelése.

Ez a dokumentum a lépéseket csak tervezi; production deploy, production migration és provider/payment művelet nem történt.

## 14. Végső értékelés

`M1–M18 COMPLETE: IGEN`
`V2 IMPLEMENTÁCIÓ KÉSZ: IGEN`
`V2 ZÁRÓ AUDIT PASS: IGEN`
`V2 RELEASE CANDIDATE STAGING PASS: IGEN`
`PRODUCTION DEPLOY VÉGREHAJTVA: NEM`
`TECHNIKAILAG JAVASOLHATÓ A PRODUCTION DEPLOYMENT TERVEZÉSE: IGEN – külön jóváhagyás és rollout ablak továbbra is szükséges`
`P0 BLOKKOLÓ: 0`
`P1: 0`
`P2: 386 ESLint warning`
`NYITOTT TULAJDONOSI DÖNTÉSEK: 6`
`AKTUÁLIS SÉMAVERZIÓ: 058`
`HEAD: 02429136c90265f6d57e74c7510b77a392c3a16d`

**Következő konkrét lépés:** külön owner által jóváhagyott staging rollout-tervezés; production deploy és migration továbbra sem történt.

## 15. Session végi MySQL helyreállítási jelentés

| Tétel | Eredmény |
|---|---|
| WSL distro | Ubuntu-24.04 |
| WSL root hozzáférés | **PASS**, közvetlen Windows→WSL root indítás |
| MySQL service | **MŰKÖDIK** |
| MySQL verzió | 8.0.46 |
| Root socket admin | **PASS**, `root@localhost`; root jelszó nem került felhasználásra vagy dokumentálásra |
| Temporary release user | Létrehozva, TCP teszttel használva, majd eltávolítva |
| Production DB érintve | **NEM** |
| Fresh migration | **PASS**, 001→058 |
| Upgrade | **PASS**, támogatott 032→058 fixture útvonal |
| Ledger / pending / readiness | `058` / `0` / `ready=true` |
| Idempotencia | **PASS**, második futás: 0 új migration |
| Backup | **PASS**, 78 961 byte / 409 ms |
| Restore | **PASS**, 6 735 ms; restore readiness `ready=true` |
| M13 | **PASS** |
| M15 | **PASS** |
| M17 | **PASS**, bounded batch, busy claim, concurrency, lease, deadlock retry, rollback |
| M18 | **PASS**, 6/6 célzott backend/session regresszió |
| Cleanup | **PASS**, fresh/restore DB, temporary user, dump és izolált függőségkönyvtár eltávolítva |
| V2-RC-F001 | **FIXED**, célzott regresszióval és 37/37 MySQL recovery teszttel igazolva |

Az audit végén nem maradt ideiglenes release adatbázis, felhasználó vagy backup fájl. A repository-local Node telepítés zárolt SWC bináris miatt továbbra is környezeti korlátozás; a célzott teszt és az offline suite izolált, lockfile-alapú telepítéssel PASS. A korábbi TypeScript, ESLint, import, `npm run check` és production build bizonyíték érvényes; az aktuális shellben a sérült repository-local `node_modules` miatt ezek binárisai újra nem indíthatók.
