# Lokális terheléses teszt

## Fokozatok

10, 25, 50, 100, 250, 500 konkurens kérés, vagy a bizonyított biztonságos limitnél korábbi megállással.

## Mérőszámok

req/s, p50/p95/p99, error rate, CPU, RAM, Node heap, MySQL kapcsolat és latency, event loop lag, worker hatás.

## Szabály

Csak a localhost, illetve kontrollált staging-szerű kör teljesítménye mérhető; VPS-re vagy productionre következtetés csak adatokból.

## Státusz

`NOT STARTED`.
