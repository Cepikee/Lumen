# Lokális terheléses teszt

## Fokozatok

10, 25, 50, 100, 250, 500 konkurens kérés, vagy a bizonyított biztonságos limitnél korábbi megállással.

## Mérőszámok

req/s, p50/p95/p99, error rate, CPU, RAM, Node heap, MySQL kapcsolat és latency, event loop lag, worker hatás.

## Szabály

Csak a localhost, illetve kontrollált staging-szerű kör teljesítménye mérhető; VPS-re vagy productionre következtetés csak adatokból.

## V2.1 localhost read-mix baseline – 2026-10-04

### Futtatási környezet

- Windows 11 Pro, AMD Ryzen 7 5800X (8 mag / 16 logikai szál), 31.91 GB RAM.
- Node `v24.19.0`, Next `16.3.6`, production build (`next start`) a `127.0.0.1:3011` címen.
- A harness kizárólag localhostot céloz; production/staging URL-t nem használ.
- A read mix: `/`, `/trends`, `/insights`, `/insights/category/politika`, `/premium`, `/cikk/1`, `/api/health`. A DB-függő `/api/summaries`, `/api/sources` és `/api/trends` route-ok az aktuális default runtime-ban fixture/DB hiány miatt nem kerültek sikeres terhelési mixbe; ezek külön MySQL fixture-kört igényelnek.

### Mérési eredmény

`node scripts/v21-load-sanity.cjs` 500 kérést futtatott minden fokozatban, 5% hibaaránynál automatikusan megállt volna.

| Konkurencia | Kérés | req/s | p50 | p95 | p99 | Hibaarány | RSS | Event-loop p99 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 500 | 455.37 | 14.71 ms | 51.42 ms | 63.00 ms | 0% | 75.4 MB | 26.38 ms |
| 25 | 500 | 581.13 | 24.94 ms | 106.33 ms | 118.79 ms | 0% | 80.9 MB | 25.94 ms |
| 50 | 500 | 631.95 | 49.27 ms | 200.08 ms | 218.21 ms | 0% | 86.1 MB | 28.11 ms |
| 100 | 500 | 661.98 | 94.30 ms | 377.25 ms | 438.29 ms | 0% | 91.3 MB | 32.01 ms |
| 250 | 500 | 674.53 | 332.28 ms | 723.71 ms | 725.03 ms | 0% | 98.3 MB | 31.28 ms |
| 500 | 500 | 674.27 | 644.96 ms | 736.44 ms | 737.39 ms | 0% | 132.5 MB | 31.52 ms |

HTTP státuszok: minden kérés `200`, 5xx/429: `0`. A folyamat CPU- és heap-mérése a harness JSON kimenetében megmaradt; a legmagasabb mért RSS 132.5 MB volt.

### Soak, worker+read és VPS következtetés

- Hosszú soak és worker+read kombinált terhelés ebben a körben nem bizonyított; a teljes pipeline és MySQL write path külön, izolált fixture-t igényel.
- VPS kapacitásra ebből a fejlesztői Windows mérésből nincs felelős következtetés. `INSUFFICIENT EVIDENCE`.
- A mérés termék/renderelt route baseline, nem production SLO és nem deployment approval.

## Státusz

`PASS – LOCALHOST READ-MIX BASELINE; FULL DB/WORKER SOAK ÉS VPS ASSESSMENT NEM BIZONYÍTOTT`
