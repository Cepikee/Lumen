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
- Chrome acceptance során három alkalmazási finding került elő és javult: `V21-BUG-F005`, `V21-BUG-F006`, `V21-BUG-F007`. Célzott regressziók: `tests/unit/browser-product-contract.test.cjs`; a legutóbbi offline suite 387/387 PASS, TypeScript PASS, ESLint 0 error, import check PASS.
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
- Performance evidence: a `docs/UTOM_V2_1/03_PERFORMANCE.md` külön mérési szakaszban rögzítve; navigáció előtti `PerformanceObserver`-rel LCP mérve, és a production-like háromszoros auth-probe `V21-PERF-F001` javítva. A fix utáni CDP-mérésben a vizsgált route-ok mindegyikén 0 duplikált auth-kérés volt.
- Production boundary: production DB/deploy, payment és paid AI 0.

## SECURITY + FAULT-INJECTION GATE – 2026-10-04

- Security matrix: authentication/session, premium entitlement, origin/CORS, SSRF/outbound, SQL injection, XSS, redirects/traversal, reset lifecycle, authorization, internal worker routes and secret leakage are PASS or FIXED with local evidence.
- V21-SEC-F001 login throttling sentinel scope: FIXED; direct/unknown proxy fallback is per email and trusted IP remains per-IP. Targeted regression PASS.
- Fault matrix: MySQL unavailable, rollback, duplicate worker, stale lease, pipeline restart, RSS failure, AI mock failure and session/premium transitions PASS. Artificial slow-DB and large-data stress remain BLOCKED as unexecuted local measurement scenarios; FFmpeg is N/A capability-only.
- Payment: 0. Paid AI: 0. Production DB/deploy: 0.
- Current targeted security tests: PASS. MySQL 8.0.46 isolated integration: 53 PASS, 0 FAIL, FFmpeg capability skip; HTTP auth/PIN E2E: 2/2 PASS.
- Current offline suite after the new regression: to be rerun before release of this change. TypeScript, ESLint and import checks are required again after documentation/code validation.

`SECURITY HARDENING: PASS`
`FAULT INJECTION: PARTIAL – slow-DB and large-data scenarios BLOCKED`

## V2.1 security/fault validation update – 2026-10-04

- Targeted login-rate-limit regression: 3/3 PASS.
- Offline suite: 390/390 PASS.
- TypeScript: PASS.
- ESLint: PASS, 0 errors.
- Local import check: PASS.
- npm check: PASS, including production build 74/74.
- npm audit --omit=dev --audit-level=high: 0 vulnerabilities.
- Isolated MySQL 8.0.46 suite: 53 PASS, 0 FAIL; FFmpeg optional capability skip.
- Explicit HTTP auth/PIN E2E: 2/2 PASS; SMTP calls 0; paid proxy calls 0.

## OBSERVABILITY + FAULT-INJECTION CLOSURE – 2026-10-04

- Slow MySQL fixture: PASS; isolated MySQL 8.0.46 SLEEP delays at 100 ms, 500 ms and 2 s, controlled timeout, destroyed timed-out connection and successful connection recovery.
- Large article/V2 parser fixture: PASS; generated 10/50/100/250 KB content, 100 entity mentions and 100 claim candidates, no crash or truncation.
- Internal health: read-only operational snapshot with schema, worker, pipeline, backfill, V2 and AI-budget signals.
- Public liveness: minimal `/api/health` response, no DB or secret data.
- Slow DB diagnostics: local warning/critical thresholds only; no production SLO claim.
- Operations runbook: `docs/UTOM_V2_1/15_OPERATIONS_RUNBOOK.md`.
- Security: PASS. Fault injection: PASS for bounded local scenarios. Observability: PASS for local/staging-ready diagnostics.

## V2.1 observability and fault-injection final gate – 2026-10-04

- Slow MySQL timeout/recovery fixture: PASS.
- Large article/V2 parser bounded fixture: PASS.
- Internal operational snapshot and public liveness contract: PASS.
- `V21-OPS-F001` wrong AI escalation table: FIXED with unit and MySQL regression coverage.
- Final validation: offline 395/395, MySQL 56 PASS/0 FAIL plus FFmpeg capability skip, TypeScript PASS, ESLint 0 errors, import PASS, npm check PASS, build 74/74 PASS, npm audit 0.
