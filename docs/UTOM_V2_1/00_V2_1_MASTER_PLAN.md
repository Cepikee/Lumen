# UTOM V2.1 – Termékesítés és hardening master terv

## Keretek

- Projekt: UTOM.hu / Lumen
- Branch: `develop/utom-recovery`
- V2.1 külön termékesítési és hardening program; új M19 milestone nem készül.
- A munka kizárólag localhoston, izolált teszt- vagy staging-szerű környezetben történik.
- Production adatbázis, deploy, DNS, Cloudflare, fizetős AI és payment nem érinthető.
- Minden embernek szánt szöveg magyarul készül.

## Kiindulási állapot

- Stabil kiinduló commit: `7de40e04c2530e40184bb4e694637dd4d5419a78`.
- V2 M1–M18 lezárva, release candidate PASS.
- Paid AI és payment alapértelmezésben kikapcsolva.
- A `docs.zip` felhasználói fájl: untracked, érintetlen, nem része a változásoknak.

## Fázisok és mérhető kapuk

| Fázis | Cél | Acceptance |
|---|---|---|
| A | Dokumentáció és inventory | 14 V2.1 dokumentum, route/UI inventory, függőségek rögzítve |
| B | Localhost dev/demo harness | reset → migration 001–059 → determinisztikus seed → readiness → indítás reprodukálható |
| C | Helyi auth és Premium | anonymous/free/active/expired állapotok valódi sessionnel, production auth változatlan |
| D | Chrome acceptance | a fontos route-ok végigjárhatók production szolgáltatás nélkül |
| E | UI/UX és mobil | 360, 390, 430, 768, 1366 és 1920 viewport lefedve |
| F | Performance | before/after mérés homepage, article, context, timeline, comparison, Premium |
| G | Fault injection és security | bizonyított finding → javítás → regresszió |
| H | Observability, SEO, Premium UX, load | csak az előző kapuk után, lokális/staging környezetben |

## Alapelv

Minden változás útja: inventory → reprodukció → minimális javítás → célzott regresszió → dokumentáció → következő finding. Hipotetikus hibát nem javítunk, owner döntést igénylő termékpolitikát nem találunk ki.

## Aktuális checkpoint

- Aktív fázis: B – localhost dev/demo harness és első Chrome acceptance.
- Inventory: 94 `app/` route/page/layout elem és a fő UI/hook/API függőségek rögzítve (`ROUTE_UI_INVENTORY.md`).
- Következő konkrét lépés: a demo runtime Chrome acceptance folytatása a tiszta ideiglenes másolaton, különösen mobil viewportokon.
- A tiszta ideiglenes másolatban `npm ci`, TypeScript, ESLint (0 error), import check, offline **379/379** és production build PASS; az ESLint meglévő figyelmeztetései nem hibák.
- Izolált MySQL 8.0.46 demo reset PASS: schema 059, 12 source (11 aktív), 40 article, 34 summary, 3 user, 4 entity, 8 alias, 3 relation, 12 claim, 3 event, 25 timeline item, 2 conflict; paid AI/payment 0.
- V2.1 finding `V21-BUG-F001`: FIXED. A layout localhoston is külső reCAPTCHA/Analytics kódot töltött, és a LoginModal közvetlenül a hiányzó `grecaptcha` globálishoz kötődött. A javítás explicit site-key/analytics kapcsolót, loopback-only `local-demo` CAPTCHA adaptert és közös kliens helper-t használ; productionben nincs bypass.
- `REAL PAID AI CALL = 0`, `PAYMENT CALL = 0`.
- `V21-BUG-F002`: FIXED. Több runtime MySQL connection config figyelmen kívül hagyta a `DB_PORT` értéket, így a localhost demo a 3306-os példányra esett vissza. A route-ok, a node pool és a kapcsolódó worker configok most explicit portot használnak.
- `V21-BUG-F003`: FIXED. A Híradó oldal a query eredményt közvetlen destructuringgel kezelte; üres vagy eltérő driver-válasz esetén 500-ra esett. A render biztonságos tuple-normalizálást és üres videóállapotot használ.
- `V21-BUG-F004`: FIXED. Production-mode localhost demo login után a `Secure` session cookie HTTP-n nem került visszaküldésre. A cookie csak a szigorúan loopback + `utom_dev` + explicit local-demo konfigurációban nem Secure; éles környezetben továbbra is Secure.
- `V21-RSS-F001`: FIXED. A demo source fixture canonical kiadói slugokat használ; a live RSS route így az auto-incrementelt reset utáni DB ID-k mellett sem hagyja ki a feedeket.
- `V21-RSS-F002`: FIXED. A feed ingestion slug alapján oldja fel az aktuális DB source ID-t, és ezt használja az article/V2 provenance foreign key-ekhez.
- `V21-TRACE-F001`: FIXED. Az article context route korábban tárolt claim/entity/timeline adatok mellett is üres tömböket adott vissza. A route most tényleges read-model projectiont ad, és elfogadja az `accepted`/`organisation` fixture állapotokat.
- Runtime smoke evidence: `/`, `/insights`, `/insights/category/politika`, `/trends`, `/premium`, `/hirado`, `/cikk/103`, reset oldalak 200; `/api/summaries`, `/api/sources`, `/api/trends` 200 demo DB-vel.
- Live RSS evidence: Telex/HVG/24.hu/Index/Portfolio/Origo hivatalos feedek 200 és parse PASS; a 444 proxy feed külön `NEM BIZONYÍTOTT` státuszú. Telex első ingest + második dedup PASS.
- V2 intelligence trace: article context, 3-source event comparison, timeline és aktív Premium read model PASS izolált demo fixture-en; paid AI 0.
- A kontrollált V2 esemény három saját, 746–754 szavas magyar forrásváltozatot használ; a források közötti pénzügyi eltérés és a hiányzó összeg külön claimként marad meg.
- A raw-input canonical acceptance külön harnessben fut: 3 nyers cikkből 21 entity mention, 7 scope-olt provisional anchor, 11 claim, 1 event és 3 timeline item canonical repository-kódon keresztül jön létre; az M11 numeric conflict winner nélkül megmarad.
- Explicit disposable MySQL gate: `UTOM_TEST_MYSQL_URL=.../utom_v21_test`; a fájlonként izolált integration suite 56 tesztből 55 PASS, 1 FFmpeg teszt külső eszköz hiánya miatt SKIP.

## Minőségi kapu

TypeScript, ESLint (0 error), import check, npm check, offline suite és production build minden implementációs fázis végén. MySQL és Chrome csak izolált környezetben; hiányzó környezetet BLOCKED-ként dokumentálunk, nem tekintjük PASS-nak.
