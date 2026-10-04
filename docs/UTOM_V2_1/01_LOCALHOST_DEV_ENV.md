# Localhost fejlesztési és demo környezet

## Cél

Reprodukálható, productiontól elválasztott környezet, amelyben a teljes felület valósághű adatokkal indítható.

## Követelmények

- WSL Ubuntu 24.04 és MySQL 8.0.46, kizárólag helyi adatbázissal.
- Migration lánc: 001–059.
- Determinisztikus seed legalább 30–50 cikkel és V2 edge case-ekkel.
- Explicit reset és reseed parancs; production célpontot megtagadó védelemmel.
- Cloudflare, analytics, email, payment és paid AI nélkül is működő UI.
- Canonical MySQL acceptancehez explicit, loopbackos disposable cél: `UTOM_TEST_MYSQL_URL=mysql://demo:demo@127.0.0.1:3307/utom_v21_test` és `UTOM_MYSQL_TEST_OPT_IN=true`.

## Acceptance

`reset → migrate → seed → readiness → app start` egymás után, két egymást követő futásban azonos eredménnyel végrehajtható.

## Helyi auth adapter

Developmentben a `NEXT_PUBLIC_LOCAL_DEMO_CAPTCHA=true` és `UTOM_LOCAL_DEMO_CAPTCHA=true` együtt, loopback `utom_dev` célponton engedélyezi a `local-demo` token használatát. Ez nem működik productionben, nem jelent auth vagy Premium bypass-t, és nem kerülhet production konfigurációba. Email küldés helyett a meglévő outbox/local sink marad az alapértelmezett.

## Státusz

`IN PROGRESS` – elkészült a `scripts/dev-demo-bootstrap.cjs` és a `npm run db:demo:reset` belépési pont. A workspace saját node_modules állapota külön környezeti korlát lehet; a tiszta temp másolatban a canonical MySQL 8.0.46 suite explicit `_test` adatbázissal futott.
## 2026-10-04 validációs checkpoint

- A demo MySQL izolált, nem production példányon futott: loopback, `utom_dev`, MySQL 8.0.46, ideiglenes 3307 port.
- A reset/migration/seed eredménye: schema 059; 12 source, 40 article, 34 summary, 3 user, 4 entity, 8 alias, 3 relation, 12 claim, 3 event, 25 timeline item, 2 conflict; paid AI és payment 0.
- A tiszta temp másolatban `npm ci` és `npm run check` PASS. A workspace `node_modules` változatlan maradt.
- A localhost demo során a DB portot figyelmen kívül hagyó route-poolok és a Híradó üres-result renderhibája reprodukálva és javítva lett (`V21-BUG-F002`, `V21-BUG-F003`).
- A production-mode demo Premium login session HTTP localhoston is visszaolvasható (`V21-BUG-F004` után). A valódi Windows Chrome CDP acceptance disposable profillal lefutott; a viewportonkénti screenshotok külső ideiglenes acceptance könyvtárban készültek.
- A canonical E2E harness nem seedel derived V2 táblákat; a 3 nyers forrásváltozatból 21 mention, 11 claim, 1 event és 3 timeline item jött létre. Az új entity-master writer hiánya miatt az M6/M11 kapu blokkolt; a részletek a `13_CANONICAL_INTELLIGENCE_E2E.md` dokumentumban vannak.
