# UTOM V2.1 – Release readiness

Dátum: 2026-10-04
Branch: `develop/utom-recovery`
Schema: `060`

## Kód- és termékállapot

- Canonical V2.1 intelligence, entity lifecycle, provenance és read model flow: a korábbi izolált acceptance evidence szerint PASS.
- SEO/sharing: metadata, canonical, robots, sitemap és adatból képzett article `NewsArticle` structured data PASS.
- Premium UX: a jelenleg működő context/timeline/source comparison értékek dokumentáltak; payment/provider nélküli gombok őszintén disabled állapotúak.
- Ingestion/data audit: technikailag kész; a full-text retention implementáció lezárva, a forrásonkénti policy owner/legal review külön marad.
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

## Production readiness planning – 2026-10-04

- A részletes preflight checklist: `docs/PRODUCTION_READINESS_CHECKLIST.md`.
- A release identity, flags, secrets és service inventory: `docs/UTOM_V2_1/18_RELEASE_MANIFEST.md`.
- A kizárólag tervként kezelt deploy/rollback sorrend: `docs/UTOM_V2_1/19_PRODUCTION_DEPLOY_RUNBOOK.md`.
- A tulajdonosi döntési kapu: `docs/UTOM_V2_1/20_OWNER_DECISIONS_BEFORE_PRODUCTION.md`.
- Minimális induló modellként systemd alatt futó web + worker, MySQL 8, reverse proxy és off-host backup javasolt; a végleges VPS/DB elhelyezés staging mérés és owner döntés után rögzíthető.
- `INFRASTRUCTURE READY: NO`; `OWNER DECISIONS READY: NO`; `REMOTE STAGING READY TO BUILD: NO`; `PRODUCTION DEPLOY READY: NO`.

## Owner policy freeze és remote staging gate – 2026-10-04

- Owner policy baseline: retention target 24 óra successful / 7 nap failed-retry; paywall bypass tilos; bizonytalan source HOLD; 444 canonical ingestion OFF; paid AI és analytics OFF; FFmpeg deferred; backup 7 daily / 4 weekly / 3 monthly, off-host és restore rehearsal kötelező.
- Raw/full-text retention technikai állapot: `RAW FULL-TEXT RETENTION IMPLEMENTED: YES`. A 24 órás/7 napos cleanup külön, dry-run alapértelmezett, lockolt és auditált workerben működik; acceptance: `docs/UTOM_V2_1/23_RAW_TEXT_RETENTION_ACCEPTANCE.md`.
- Raw/full-text retention runtime gate: `PASS` MySQL 8.0.46-on; fresh/upgrade/idempotence, lifecycle, rollback és duplicate-worker ellenőrzések zöldek.
- Source policy, payment, staging email, hosting, monitoring alerts és production domain rollout státusza az owner döntési dokumentumban szerepel.
- Remote staging manifest: `docs/UTOM_V2_1/21_REMOTE_STAGING_BUILD_MANIFEST.md`.
- `REMOTE STAGING READY TO BUILD: NO` – a provisioning host, staging secrets, email sink, backup target és owner/infra hozzáférések még nincsenek megadva.
- `FREE PUBLIC PRODUCTION READY: NO` – transactional email és production infrastructure továbbra is hiányzik; a kódoldali raw retention blocker megszűnt.
- `PAID PREMIUM PRODUCTION READY: NO` – payment project nincs implementálva.
