# Performance mérési terv

## Mérés előtt

Először baseline készül, vak optimalizálás nincs. Homepage és article mellett a context, timeline, source comparison és Premium útvonalat is mérni kell.

## Mérőszámok

TTFB, LCP, CLS, INP, request count, JS route chunk, átvitt byte, kép byte, hydration, render blocking, MySQL query count és latency.

## Acceptance

Minden javításnál rögzített BEFORE → FIX → AFTER bizonyíték készül.

## Státusz

`BASELINE RECORDED` – összehasonlítható lokális Chrome mérés elkészült; LCP a harnessben UNAVAILABLE.

## Browser performance baseline – 2026-10-04

Izolált demo runtime, Windows Chrome 154 CDP, disposable profile. A mérés navigációs Performance API időpontokat és resource byte-okat rögzített.

| Route | TTFB | DOMContentLoaded | Load event | Requests | Transfer | JS | Image | CLS | LCP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Homepage | 33.1 ms | 54.4 ms | 102.1 ms | 34 | 36,424 B | 4,500 B | 0 B | 0 | UNAVAILABLE |
| Article | 44.4 ms | 62.5 ms | 95.7 ms | 34 | 26,215 B | 4,200 B | 0 B | 0 | UNAVAILABLE |
| Premium/Insights | 34.6 ms | 87.5 ms | 136.7 ms | 57 | 25,482 B | 6,900 B | 300 B | 0 | UNAVAILABLE |

Az LCP értékét a jelenlegi CDP harness nem figyelte meg navigáció előtt, ezért nincs kitalált szám; a mező `UNAVAILABLE`. A baseline összehasonlítható későbbi méréshez, de önmagában nem jelent teljes Core Web Vitals kaput.
