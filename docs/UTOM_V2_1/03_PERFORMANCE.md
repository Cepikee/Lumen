# Performance mérési terv

## Mérés előtt

Először baseline készül, vak optimalizálás nincs. Homepage és article mellett a context, timeline, source comparison és Premium útvonalat is mérni kell.

## Mérőszámok

TTFB, LCP, CLS, INP, request count, JS route chunk, átvitt byte, kép byte, hydration, render blocking, MySQL query count és latency.

## Acceptance

Minden javításnál rögzített BEFORE → FIX → AFTER bizonyíték készül.

## Státusz

`MEASURED – DUPLICATE AUTH PROBE FIXED` – a navigáció előtti LCP-observeres Chrome mérés és az API p50/p95 mérés elkészült; a production-like futásban észlelt háromszoros auth-probe javítva.

## Browser performance baseline – 2026-10-04

Izolált demo runtime, Windows Chrome 154 CDP, disposable profile. A mérés navigációs Performance API időpontokat és resource byte-okat rögzített.

| Route | TTFB | DOMContentLoaded | Load event | Requests | Transfer | JS | Image | CLS | LCP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Homepage | 33.1 ms | 54.4 ms | 102.1 ms | 34 | 36,424 B | 4,500 B | 0 B | 0 | UNAVAILABLE |
| Article | 44.4 ms | 62.5 ms | 95.7 ms | 34 | 26,215 B | 4,200 B | 0 B | 0 | UNAVAILABLE |
| Premium/Insights | 34.6 ms | 87.5 ms | 136.7 ms | 57 | 25,482 B | 6,900 B | 300 B | 0 | UNAVAILABLE |

Az LCP értékét a jelenlegi CDP harness nem figyelte meg navigáció előtt, ezért nincs kitalált szám; a mező `UNAVAILABLE`. A baseline összehasonlítható későbbi méréshez, de önmagában nem jelent teljes Core Web Vitals kaput.

## V21-PERF-F001 – production auth probe duplikáció

- **Reprodukció:** disposable Windows Chrome CDP profillal, `NODE_ENV=production` runtime-ban a homepage, article és Premium navigációk mindegyike három `/api/auth/me` kérést indított 390×844 és 1366×768 viewporton.
- **Root cause:** a `ClientLayout` saját store-loader effectet futtatott, a `Header` ugyanazt a loadert futtatta, és a `Header` külön kézi `/api/auth/me` fetch-et is indított.
- **Javítás:** a `Header` maradt az egyetlen auth-store betöltési pont; a `ClientLayout` saját loader effectje és a Header kézi auth-probe állapota/fetch-e megszűnt.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs` – a megosztott loader jelenléte és a duplikált `/api/auth/me` fogyasztók hiánya; 5/5 PASS.
- **Státusz:** `FIXED`.

### Browser production-like mérés – fix után, 2026-10-04

Az observer a navigáció előtt lett telepítve (`PerformanceObserver`, `buffered: true`). A táblázat egy egymás utáni, cache-t is tartalmazó CDP-futás eredménye; ezért a route-ok közötti JS byte-értékek nem önálló cache-warm/cold összehasonlítások.

| Viewport | Route | TTFB | DCL | Load | Requests | Transfer | LCP | Duplicate auth |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 390×844 | Homepage | 25.1 ms | 46.0 ms | 58.6 ms | 25 | 31,899 B | 76 ms | 0 |
| 390×844 | Article | 60.1 ms | 74.4 ms | 74.6 ms | 25 | 5,996 B | 96 ms | 0 |
| 390×844 | Premium | 6.5 ms | 27.2 ms | 31.3 ms | 25 | 4,472 B | 40 ms | 0 |
| 1366×768 | Homepage | 3.7 ms | 14.8 ms | 29.5 ms | 40 | 29,568 B | 40 ms | 0 |
| 1366×768 | Article | 9.0 ms | 24.1 ms | 24.3 ms | 40 | 14,908 B | 52 ms | 0 |
| 1366×768 | Premium | 2.0 ms | 18.5 ms | 18.7 ms | 40 | 13,384 B | 36 ms | 0 |

**BEFORE → AFTER:** minden vizsgált route-on `3 → 0` duplikált auth-kérés; a homepage 390×844 útvonalán a teljes kérésmennyiség `28 → 25`, az article útvonalán `27 → 25`. A 1366 px-es route-ok teljes request-countja a route-chunk és cache állapota miatt nem hasonlítható össze közvetlenül; az auth-duplikáció ott is megszűnt.

### API mérés – izolált MySQL 8.0.46, 20 szekvenciális minta/végpont

Az API-mérés production-like Next runtime-on, érvényes API-kulccsal és a védett végpontokhoz külön rate-key-kel futott. A `responseBytes` átlagos body-méret.

Környezet: `127.0.0.1:33307`, WSL Ubuntu 24.04 / MySQL `8.0.46-0ubuntu0.24.04.4`, host `Yosohara`, `utf8mb4`; a lekérdezett SQL mode: `IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`.

| Végpont | p50 | p95 | Átlagos válasz |
|---|---:|---:|---:|
| `/api/summaries?page=1&limit=10&q=` | 15.26 ms | 16.96 ms | 7,942 B |
| `/api/summaries?id=1` | 14.77 ms | 15.88 ms | 842 B |
| `/api/v2/articles/1/context` | 30.08 ms | 32.71 ms | 6,358 B |
| `/api/v2/source-comparison?eventId=1&detail=claims` | 15.73 ms | 18.94 ms | 2,084 B |
| `/api/v2/timelines/event/1?limit=25` | 15.76 ms | 17.50 ms | 5,656 B |
| `/api/trends?period=7d` | 15.34 ms | 18.07 ms | 1,832 B |
| `/api/insights?period=24h` | 16.30 ms | 32.22 ms | 58 B |
| `/api/v2/premium/intelligence?eventId=1` | 30.50 ms | 32.98 ms | 2,809 B |

Ezek lokális, izolált mérési adatok, nem production SLO-k. A közös rate limiter külön rate-key nélkül 429-et adhat ismételt, nagy mintaszámú futásnál; ez a védelmi működés része, nem teljesítményhiba.


## V2.1 final closure cross-reference – 2026-10-04

SEO/sharing, Premium UX, ingestion technical audit, localhost load/soak and final quality evidence are consolidated in docs/UTOM_V2_1/10_V2_1_FINAL_ACCEPTANCE.md and docs/UTOM_V2_1/17_V2_1_RELEASE_READINESS.md. No production DB, deploy, payment or paid AI was used.

