# UTOM V2 VPS production-shaped acceptance

## Cél és módok

Az egyetlen harness két, egymást kiegészítő tulajdonságot ellenőriz. A `production-negative` mód legalább két explicit production cikket kizárólag olvas, azokat ideiglenes acceptance adatbázisba másolja, majd azt várja, hogy a kanonikus matcher a külön eseményeket **ne** vonja össze. A `synthetic-positive` mód production kapcsolat és production cikk nélkül három eltérően megfogalmazott, azonos eseményű acceptance fixture-rel bizonyítja a pozitív strukturált egyezést.

## Biztonsági modell

- A futás csak `UTOM_ACCEPTANCE_RUN=true` mellett indul.
- Minden írási cél neve illeszkedik a `^utom_acceptance_[a-z0-9_]+$` mintára.
- A production adapter csak `SELECT`, `SHOW`, `DESCRIBE` és `EXPLAIN` utasítást enged. Stacked statement, lock, server-side file write és minden mutáció még a driver előtt hibát dob.
- A `synthetic-positive` mód production adatbázis-kapcsolatot sem nyit.
- Productionből user, session, reset, payment, email és V2-derived adat nem kerül másolásra.
- A synthetic fixture forrásai és cikkei kizárólag a friss acceptance adatbázisban jönnek létre. Mindhárom nyers cikken lefut a kanonikus `runV2ShadowIntelligence` determinisztikus útvonal. A közös subject/project/location referenciaidentitás kontrollált acceptance-előfeltétel; a pozitív claim, evidence, event, source-comparison és timeline a kanonikus V2 repository/runtime API-kon halad át.
- Csak a `deterministic-semantic` provider engedélyezett. OpenAI, Cloudflare V2 és más külső AI hívás tiltott.

## Production-negative

```bash
cd /srv/utom/app
set -a
. /etc/utom/production.env
set +a
UTOM_ACCEPTANCE_RUN=true npm run v2:acceptance:vps -- --mode=production-negative --article-ids=123,456
```

Legalább két külön canonical forrásból származó, kész cikk kell. A `matched` eredmény `false_cross_article_merge` hibával FAIL. A `single`, `rejected`, `no_group` vagy más nem-egyező canonical eredmény PASS, ha a provenance és article-local timeline audit zöld, a source comparison `SKIPPED_NO_SHARED_EVENT`, a cross-event conflict count nulla, és nem készül kombinált timeline.

## Synthetic-positive

```bash
cd /srv/utom/app
set -a
. /etc/utom/production.env
set +a
UTOM_ACCEPTANCE_RUN=true npm run v2:acceptance:vps -- --mode=synthetic-positive
```

Ez a mód nem használ `--article-ids` paramétert, és nem olvas production cikket. Friss `utom_acceptance_*` adatbázist migrál, létrehozza az `acceptance-hvg`, `acceptance-telex` és `acceptance-24hu` forrásokat, majd három külön magyar megfogalmazásból ugyanazt az Alpha Kft./debreceni gyár/2026. október 20. strukturált eseményt vezeti végig. PASS feltétel: három completed article-local eredmény, `MATCHED`, valid provenance, `ready` source comparison, valid timeline és konfliktusbiztonság.

## Riport és cleanup

A JSON és Markdown riport a working tree-n kívül készül:

```text
/tmp/utom-v2-acceptance-<run-id>/report.json
/tmp/utom-v2-acceptance-<run-id>/report.md
```

Siker után az acceptance adatbázis alapból törlődik. FAIL/PARTIAL esetén megmarad; `--drop-on-failure` kérhet törlést, `--keep-db` mindig megtartja. A névőr production adatbázist nem tud törölni.

## Értelmezés

- `production-negative`: két unrelated production article → NO MATCH → PASS.
- `synthetic-positive`: három same-event synthetic article → MATCHED → PASS.
- Bármely production write, külső providerhívás, provenance/timeline hiba vagy automatikus konfliktusgyőztes FAIL.

Ez a dokumentum és a lokális regresszió nem bizonyít VPS futást. A státusz a kézi SSH futtatásig: `VPS ACCEPTANCE: NOT EXECUTED`.
