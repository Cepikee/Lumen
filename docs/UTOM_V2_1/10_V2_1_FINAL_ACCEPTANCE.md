# V2.1 végső acceptance

## Kötelező kapuk

- V2.1 dokumentáció kész.
- Localhost reset/migrate/seed/start reprodukálható.
- Anonymous, free, active Premium és expired Premium session végigtesztelve.
- Chrome acceptance desktop és mobil viewportokon PASS.
- Bizonyított UX/bug/security findingok FIXED vagy indokolt BLOCKED.
- TypeScript, ESLint, import, npm check, offline és build PASS.
- MySQL/browser evidence csak izolált környezetből.
- Paid AI hívás: 0. Payment hívás: 0. Production érintés: NEM.

## Státusz

`PASS – BROWSER ACCEPTANCE CLOSED`.

### Bizonyíték 2026-10-04

- Tiszta ideiglenes másolat: `npm ci`, TypeScript, ESLint (0 error), import check, offline **379/379**, production build PASS.
- Izolált demo MySQL reset PASS, schema 059 és a master tervben rögzített fixture-számok.
- A három kontrollált V2 forrásváltozat saját, 746–754 szavas magyar cikkfixture; a 120/150 millió forintos és a hiányzó összegű változatok külön source-állításként maradnak meg.
- A canonical raw-input harness derived tábla közvetlen írása nélkül futott. M2/M4/M5/M6/M8/M9/M10/M12/M13/M15 ágak PASS; 7 scope-olt unresolved anchor és az M11 winner nélküli conflict is létrejött.
- Runtime smoke PASS: fő route-ok és feed/source/trends endpointok 200; `V21-BUG-F002`, `V21-BUG-F003` és `V21-BUG-F004` javítva.
- RSS live acceptance PASS: hat hivatalos kiadói feed 200 + parse sikeres, a proxy feed külön nem hivatalosként jelölve; izolált Telex ingest és dedup PASS.
- V2 article context és source comparison trace PASS; `V21-TRACE-F001` javítva, a context most claim/entity/timeline projectiont ad.
- Az explicit loopbackos `utom_v21_test` MySQL célponton a fájlonként izolált teljes integration suite 56 tesztből 55 PASS; az egyetlen SKIP a lokálisan hiányzó FFmpeg. A production HTTP auth és legacy PIN/proxy tesztek explicit helyi encryption key-jel PASS.
- Valódi Windows Chrome CDP acceptance PASS izolált, disposable `E:\\TEMP\\utom-chrome-v21` profillal; a normál felhasználói Chrome profil nem volt használva.
- Desktop és mobil jellegű viewport ellenőrzés PASS: a tesztelt effektív viewportokban (438, 768 és 1366 CSS px) a főoldal, Trends, Insights, category Insights, Premium, Híradó és article detail oldalak rendereltek; horizontal overflow nem volt.
- Anonim flow PASS: a főoldal, keresés, Trends, article detail, Premium oldal és category Insights oldal betöltődött; a category premium 401 most egyértelmű bejelentkezési üzenet.
- Aktív Premium flow PASS: local demo login után az Insights és category Insights adatai megjelentek; a premium proxy és minden vizsgált statisztikai fetch 200 választ adott.
- Híradó üres adatállapot PASS: a `/hirado` oldal konfigurált lokális video-sign secret mellett 200-at ad és „Ma még nincs elérhető híradó” állapotot renderel.
- Chrome acceptance során három alkalmazási finding került elő és javult: `V21-BUG-F005`, `V21-BUG-F006`, `V21-BUG-F007`. Célzott regressziók: `tests/unit/browser-product-contract.test.cjs`; offline suite 382/382 PASS, TypeScript PASS, ESLint 0 error, import check PASS.
- A böngészős ellenőrzés paid AI, payment és production érintés nélkül, az izolált `utom_v21_test` adatbázison futott.

## FINAL BROWSER CLOSURE – 2026-10-04

`PASS` – valódi Windows Chrome CDP-ben, disposable profillal, izolált MySQL demo runtime mellett.

- Viewport matrix: 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080; homepage, Trends, Insights, category Insights, Premium és article detail; 36/36 ellenőrzés, vízszintes túlcsordulás 0.
- Canonical article: article 1 context 200, `partial=false`, entity/claim/event/timeline projection jelen; source comparison 200, 3 source jelen.
- Event edge cases: 0-event article, 1-event article és több eseményes article két választható eseménnyel; render crash és overflow nélkül.
- Session matrix: anonymous, free, active Premium és expired Premium. Anonymous/free/expired állapotban a premium UI zárolt; active Premium alatt Insights, category Insights és article intelligence adat renderel; active futásban failed same-origin request, console error és runtime error 0.
- Premium UX: payment provider hiánya miatt a subscription/support gombok őszintén `Jelenleg nem elérhető` állapotúak; fake payment flow nincs.
- Accessibility: article `h1`, LoginModal dialog semantics, ProfileMenu keyboard semantics, named controls, image alt és keyboard `:focus-visible` ring ellenőrizve.
- Híradó: FFmpeg executable hiányában az üres/capability állapot kezelhető; ez környezeti finding, nem alkalmazási blocker.
- Targeted tests: browser-product-contract, browser-a11y-contract, m18-integration-gate PASS; TypeScript, ESLint és import check PASS.
- Performance evidence: a külön baseline szakaszban rögzítve; LCP a jelenlegi CDP mérőscriptben nem volt megfigyelhető, ezért `UNAVAILABLE`, nem PASS-ként dokumentált.
- Production boundary: production DB/deploy, payment és paid AI 0.
