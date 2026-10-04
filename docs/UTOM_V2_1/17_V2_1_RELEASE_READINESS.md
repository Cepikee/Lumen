# UTOM V2.1 – Release readiness

Dátum: 2026-10-04
Branch: `develop/utom-recovery`
Schema: `059`

## Kód- és termékállapot

- Canonical V2.1 intelligence, entity lifecycle, provenance és read model flow: a korábbi izolált acceptance evidence szerint PASS.
- SEO/sharing: metadata, canonical, robots, sitemap és adatból képzett article `NewsArticle` structured data PASS.
- Premium UX: a jelenleg működő context/timeline/source comparison értékek dokumentáltak; payment/provider nélküli gombok őszintén disabled állapotúak.
- Ingestion/data audit: technikailag kész, de a full-text retention és a forrásonkénti policy owner review-t igényel.
- Localhost render read-mix terhelés: 10/25/50/100/250/500 konkurencia, 0% HTTP hiba, 500 kérés/fokozat. A DB/worker soak és a VPS méretezés ebből nem bizonyított.

## Quality evidence

- TypeScript: PASS.
- ESLint: PASS, 0 error.
- Local import check: PASS.
- Offline suite: a jelenlegi záró futtatáskor újra futtatandó; az előző operations gate 395/395 PASS volt.
- Production build: PASS; az új SEO route-okkal 75 route.
- npm audit: 0 high-level vulnerability az előző gate szerint.
- MySQL: az előző izolált 8.0.46 suite 56 PASS / 0 FAIL és 1 FFmpeg capability skip; a jelenlegi változás nem módosít sémát.

## Kód release vs production deploy

`CODE RELEASE READY: YES` a jelenlegi lokális/staging-szerű V2.1 acceptance scope-ban, a fenti quality gate újrafuttatása után.

`PRODUCTION DEPLOY READY: NO`.

A deployhoz még külön owner/infrastruktúra kapu kell:

1. production `NEXT_PUBLIC_APP_URL`, adatbázis, session, worker és belső token konfiguráció ellenőrzése;
2. full-text retention és forrásonkénti paywall/TDM policy jóváhagyása (`V21-DATA-F001`, `V21-DATA-F003`);
3. 444 proxy feed státuszának owner döntése (`V21-DATA-F002`);
4. production monitoring, alerting, backup és rollback runbook bizonyítása;
5. payment provider csak külön, későbbi scope-ban; jelenleg nincs payment és nincs paid AI.

## Nyitott technikai korlátok

- FFmpeg executable hiányzik a lokális hostról; ez capability skip, nem V2.1 kódhiba.
- A default, fixture nélküli helyi runtime DB-függő API smoke útvonalai nem használhatók teljes read-mix bizonyítékként; ehhez izolált MySQL fixture szükséges.
- A production build és a lokális load baseline nem helyettesít éles környezetben végzett változásablakot vagy üzemeltetési jóváhagyást.

## Döntés

`V2.1 CODE/PRODUCT GATE: PASS`
`V2.1 PRODUCTION GATE: OWNER + INFRASTRUCTURE REVIEW REQUIRED`

## Final local quality rerun – 2026-10-04

- `npm run test:offline`: **401/401 PASS**.
- `npm run typecheck`: **PASS**.
- `npm run lint`: **PASS**, 0 error; existing warnings remain.
- `npm run check:imports`: **PASS**.
- `npm run check`: **PASS** (includes the preceding checks and `next build`).
- `npm run build`: **PASS**, 75/75 static generation steps; `robots.txt` and `sitemap.xml` are included.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**.
- Local browser HTTP smoke: `/`, `/premium`, `/cikk/1`, `/robots.txt`, `/sitemap.xml` returned 200.
- Local load sanity: all six concurrency steps completed with 0% error and 200-only responses.
- Soak: 30.132 s at concurrency 25, 21,000 requests, 0 errors; maximum RSS 190.8 MB and heap 54.5 MB. Worker+read and DB contention remain unmeasured.
