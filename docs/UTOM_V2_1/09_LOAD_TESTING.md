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
- A read mix: `/`, `/trends`, `/insights`, `/insights/category/politika`, `/premium`, `/cikk/1`, `/api/health`. A DB-függő `/api/summaries`, `/api/sources` és `/api/trends` route-ok az aktuális default runtime-ban fixture/DB hiány miatt nem kerültek sikeres terhelési mixbe; ezek külön MySQL fixture-kört igényelnek. Az article oldal a DB-hiányt adat nélküli metadata fallbackkel kezeli; ez HTTP/render stabilitás, nem adatminőségi bizonyíték.

### Mérési eredmény

`node scripts/v21-load-sanity.cjs` 500 kérést futtatott minden fokozatban, 5% hibaaránynál automatikusan megállt volna.

| Konkurencia | Kérés | req/s | p50 | p95 | p99 | Hibaarány | RSS | Event-loop p99 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 500 | 384.10 | 15.53 ms | 60.64 ms | 173.82 ms | 0% | 77.0 MB | 29.33 ms |
| 25 | 500 | 555.22 | 26.97 ms | 113.75 ms | 123.97 ms | 0% | 81.1 MB | 26.72 ms |
| 50 | 500 | 669.38 | 46.59 ms | 188.81 ms | 209.06 ms | 0% | 87.2 MB | 25.67 ms |
| 100 | 500 | 653.54 | 95.33 ms | 386.38 ms | 448.47 ms | 0% | 89.0 MB | 30.06 ms |
| 250 | 500 | 687.26 | 312.16 ms | 714.69 ms | 716.04 ms | 0% | 118.8 MB | 27.64 ms |
| 500 | 500 | 672.58 | 638.81 ms | 738.23 ms | 739.21 ms | 0% | 145.8 MB | 33.36 ms |

HTTP státuszok: minden kérés `200`, 5xx/429: `0`. A folyamat CPU- és heap-mérése a harness JSON kimenetében megmaradt; a ladder legmagasabb mért RSS 145.8 MB volt.

### Soak, worker+read és VPS következtetés

- Soak: 30.132 másodperc, 25 konkurencia, 42 batch / 21 000 kérés, 0 hiba; maximális mért RSS 190.8 MB, heap 54.5 MB.
- Worker+read kombinált terhelés ebben a körben nem bizonyított; a teljes pipeline és MySQL write path külön, izolált fixture-t igényel.
- VPS kapacitásra ebből a fejlesztői Windows mérésből nincs felelős következtetés. `INSUFFICIENT EVIDENCE`.
- A mérés termék/renderelt route baseline, nem production SLO és nem deployment approval.

## Státusz

`PASS – LOCALHOST READ-MIX BASELINE; FULL DB/WORKER SOAK ÉS VPS ASSESSMENT NEM BIZONYÍTOTT`
