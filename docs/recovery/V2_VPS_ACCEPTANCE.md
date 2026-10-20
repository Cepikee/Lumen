# UTOM V2 VPS production-shaped acceptance

## Cél

Ez a standalone harness három, ember által kiválasztott production cikket **csak olvas**, majd egy friss, ideiglenes MySQL adatbázisban lefuttatja a repository 001–064 migrációit és a kanonikus determinisztikus V2 shadow láncot. Ezután értékeli a cross-article event match, timeline, source comparison, conflict és provenance eredményét. A production szolgáltatásokat és feature flageket nem módosítja.

## Biztonsági modell

- A futás csak `UTOM_ACCEPTANCE_RUN=true` mellett indul.
- Minden írási cél neve kötelezően illeszkedik a `^utom_acceptance_[a-z0-9_]+$` mintára.
- A production kapcsolat külön adapteren halad át. Az adapter csak `SELECT`, `SHOW`, `DESCRIBE` és `EXPLAIN` utasítást enged; minden más SQL még a driver meghívása előtt hibát dob.
- A schema létrehozását és törlését külön acceptance database controller végzi. Más adatbázis törlését a névőr kizárja.
- Productionből kizárólag a kijelölt `sources` és `articles` rekordok szükséges mezői kerülnek át. User, session, reset, payment, email és már létrehozott V2 adat nem kerül másolásra.
- A V2 flag override csak a harness Node folyamatában él. A `/etc/utom/production.env`, systemd és a futó webalkalmazás változatlan marad.
- A provider útvonal `deterministic-semantic`; OpenAI, Cloudflare és más külső AI hívás nem megengedett.

## Architektúra

1. A CLI és az opt-in ellenőrzése még adatbázis-kapcsolat előtt megtörténik.
2. A read-only production adapter beolvassa és fingerprinteli a három cikket és forrást.
3. A harness létrehozza a `utom_acceptance_<run-id>` adatbázist.
4. A kanonikus migrációs mag friss adatbázison alkalmazza a teljes láncot.
5. A fixture megőrzi az article ID-t, source ID-t, URL-t, publikációs időt és nyers szöveget.
6. A meglévő `runV2ShadowIntelligence` végzi az entity, resolution, claim/evidence, relation, article-local event és timeline feldolgozást.
7. A meglévő cross-article matcher, source comparison és conflict detector fut le.
8. Külön SQL audit ellenőrzi a claim/evidence/article, relation és event membership provenance láncokat, valamint az article-local timeline kötéseket.
9. A production fingerprint ismételt olvasása után készül a JSON és Markdown riport.

## Cikkek kiválasztása

Pontosan ismert production article ID-ket adj meg. A fő acceptance legalább három külön canonical forrás három cikkét várja, amelyekről emberi ellenőrzéssel feltételezhető, hogy ugyanazt a valós eseményt írják le. A harness ezt nem feltételezi és nem javítja kézzel: a `candidate`, `single`, `abstain` vagy `rejected` eredményt őszintén PARTIAL/FAIL kategóriába sorolja.

A kiválasztás előtt ellenőrizd, hogy minden cikk rendelkezik nyers `content_text` mezővel, canonical URL-lel és `sources` kapcsolattal. Duplikált ID, hiányzó cikk, hiányzó szöveg vagy háromnál kevesebb külön forrás még a fixture létrehozása előtt leállítja a futást.

## VPS futtatás

Az ops unitok tényleges környezeti szerződése egyetlen `EnvironmentFile=/etc/utom/production.env` fájl. A harness ugyanazokat a meglévő `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` változókat olvassa. A következő blokk nem módosítja a fájlt vagy a futó szolgáltatásokat:

```bash
cd /srv/utom/app
set -a
. /etc/utom/production.env
set +a
UTOM_ACCEPTANCE_RUN=true npm run v2:acceptance:vps -- --article-ids=123,456,789
```

Cseréld le kizárólag a három ID-t. Debughoz hozzáadható a `--keep-db`; hibánál az adatbázis alapból megmarad. Sikertelen futás utáni automatikus törléshez explicit `--drop-on-failure` használható.

## Riport és értelmezés

A riport a git working tree-n kívül jön létre:

```text
/tmp/utom-v2-acceptance-<run-id>/report.md
/tmp/utom-v2-acceptance-<run-id>/report.json
```

- `PASS`: minden cikk feldolgozódott, a provenance/timeline/conflict biztonsági ellenőrzés zöld, a cross-source event match `matched`, a source comparison `ready`, és külső providerhívás nem történt.
- `PARTIAL`: a runtime biztonságosan működött, de a konzervatív extractor/matcher nem kapott elég strukturált bizonyítékot vagy a comparison üres maradt.
- `FAIL`: rendszerhiba, migration/fixture/provenance/safety hiba, match rejection vagy külső providerhasználat történt.

A structured stdout események: `acceptance_started`, `acceptance_production_read`, `acceptance_fixture_created`, `acceptance_article_processed`, `acceptance_match_completed`, `acceptance_comparison_completed`, `acceptance_conflict_completed`, `acceptance_cleanup`, `acceptance_completed`, `acceptance_failed`.

## Cleanup

Teljes PASS után az acceptance adatbázis alapból törlődik. PARTIAL/FAIL után megmarad vizsgálatra. A `--keep-db` mindig megtartja. A controller csak `utom_acceptance_` prefixű adatbázist képes törölni; production névvel már a controller létrehozása is hibát ad.

## Hibaelhárítás

- `acceptance_opt_in_required`: az explicit process-local opt-in hiányzik.
- `unsafe_acceptance_database_name`: a write/drop cél nem acceptance adatbázis.
- `database_environment_incomplete`: a production service által is használt DB környezeti változók hiányosak.
- `selected_article_*`: a kiválasztott production input hiányos.
- `three_distinct_canonical_sources_required`: a három cikk nem három canonical forrásból jön.
- `acceptance_timeout:*`: egy bounded stage túllépte az időkeretét.
- `event_match_candidate` vagy `source_comparison_not_ready`: biztonságos coverage limit; vizsgáld a riport evidence/object/location/time részét, ne erőltesd a match-et.

Ez a dokumentum és a lokális unit/regressziós eredmény nem bizonyít VPS acceptance PASS-t. A státusz addig `VPS ACCEPTANCE: NOT EXECUTED`, amíg a fenti parancs ténylegesen nem futott le a cél VPS-en három ellenőrzött production cikkel.
