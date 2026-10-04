# V2.1 – RSS source acceptance (2026-10-04)

Ez a jelentés kizárólag publikus RSS olvasást és az izolált `utom_dev` adatbázisba történő teszt-ingestiont dokumentálja. Production rendszerhez nem csatlakoztam, fizetős AI- és payment-hívás nem történt.

## Forrás-inventory

| Forrás | Feed URL | Hivatalos? | Parser | Bekötve? | Állapot |
|---|---|---:|---|---:|---|
| Telex | `https://telex.hu/rss` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| HVG | `https://hvg.hu/rss` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| 24.hu | `https://24.hu/feed` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| Index | `https://index.hu/24ora/rss/` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| Portfolio | `https://www.portfolio.hu/rss/all.xml` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| Origo | `https://www.origo.hu/publicapi/hu/rss/origo/articles` | PUBLISHER-DOMAIN | `rss-parser` | IGEN | PASS |
| 444.hu | `https://royal-king-47c3.vashiri6562.workers.dev/` | THIRD-PARTY / PROXY – HOLD | `rss-parser` | IGEN | HOLD |

A hat kiadói feed saját publisher domainen működik, ezért `PUBLISHER-DOMAIN` szintű bizonyíték áll rendelkezésre. Ez önmagában nem bizonyítja, hogy a publisher saját discovery oldalán hivatkozza a feedet; `VERIFIED-PUBLISHER` csak ilyen elsődleges discovery bizonyítékkal lenne kimondható. A 444-es URL külső worker/proxy, ezért `THIRD-PARTY / PROXY – HOLD`, production canonical source-ként nem aktiválható owner/jogi/technikai döntés nélkül.

## Live fetch eredmény

| Forrás | HTTP | Végső URL | Content-Type | Méret | Parse | Elem | Első/legfrissebb |
|---|---:|---|---|---:|---:|---:|---|
| Telex | 200 | változatlan | `text/xml; charset=UTF-8` | 38 655 B | IGEN | 50 | 2026-10-04 11:28:01Z / 11:28:01Z |
| HVG | 200 | változatlan | `application/xml; charset=utf-8` | 77 580 B | IGEN | 60 | 2026-10-04 11:17:26Z / 11:17:26Z |
| 24.hu | 200 | `https://24.hu/feed/` | `application/rss+xml; charset=UTF-8` | 59 557 B | IGEN | 10 | 2026-10-04 11:08:54Z / 11:08:54Z |
| Index | 200 | változatlan | `text/xml;charset=UTF-8` | 47 565 B | IGEN | 48 | 2026-10-04 11:32:40Z / 11:32:40Z |
| Portfolio | 200 | változatlan | `text/xml; charset=utf-8` | 25 625 B | IGEN | 20 | 2026-10-04 11:29:00Z / 11:29:00Z |
| Origo | 200 | változatlan | `text/xml; charset=UTF-8` | 39 653 B | IGEN | 50 | 2026-10-04 11:30:00Z / 11:30:00Z |
| 444 proxy | 200 | változatlan | `application/rss+xml` | 172 298 B | IGEN | 30 | 2026-10-04 11:04:34Z / 11:04:34Z |

## Forrásonkénti legutóbbi minták

A live ellenőrzés minden feedből egyetlen első elemet is kiolvasott. Az alábbi adatok ugyanabból a read-only futásból származnak; az RSS tartalma természetesen időközben változhat.

| Forrás | Első elem címe | Eredeti URL | GUID/id | Publikáció | Szerző | Kategória | Leírás | Kép/enclosure |
|---|---|---|---|---|---|---|---:|---:|
| Telex | MCC alapítója: Haldoklásra ítélték az intézményt… | `https://telex.hu/belfold/2026/10/04/mcc-tombor-andras-merlegeles-kozlemeny-felszamolas` | nincs | `2026-10-04T11:28:01Z` | Németh-Halász Nikolett | Belföld | igen | igen |
| HVG | Megmutatta a BBC-szakértő, mekkorát nőttek a gyerekei… | `https://hvg.hu/elet/20261004_bbc-szakerto-gyerekek-robert-kelly` | `4170df49-f8f9-44a9-bb51-35a2e2482741` | `2026-10-04T11:17:26Z` | szerzo@hvg.hu (HVG) | Élet+Stílus; média; Robert Kelly | igen | igen |
| 24.hu | Halálbüntetést kaphat a Flydubai merényletre készülő másodpilótája | `https://24.hu/kulfold/2026/10/04/flydubai-hammam-al-hammami-halalbuntetes-masodpilota/` | `https://24.hu/?p=4840730` | `2026-10-04T11:08:54Z` | Schultz Antal | Nagyvilág; flydubai; halálbüntetés | igen | igen |
| Index | „Ezek lenyúltak minket 3 millió forinttal!” – Kitört a botrány… | `https://index.hu/mindekozben/poszt/2026/10/04/farm-vip-atveres-3-millio-forint-kovaszos-uborka/` | az URL | `2026-10-04T11:32:40Z` | nincs | Mindeközben | nincs | igen |
| Portfolio | Friedrich Merz német kancellár Kijevbe érkezett… | `https://www.portfolio.hu/global/20261004/friedrich-merz-nemet-kancellar-kijevbe-erkezett-ujra-lovik-az-eszaki-hidat-haborus-hireink-vasarnap-867168` | `article867168@https://www.portfolio.hu` | `2026-10-04T11:29:00Z` | nincs | Globál | igen | igen |
| Origo | Gudics Máté végre nő lehet a Sztárban Sztárban… | `https://www.origo.hu/teve/2026/10/sztarban-sztar-gudics-mate-pa-do-do-lang-gyorgyi` | `1f1be60b-264e-6028-be0c-ef5ab8446bf8` | `2026-10-04T11:30:00Z` | nincs | nincs | igen | igen |
| 444 proxy | Leégett a műemléki védelem alatt álló radostyáni református templom… | `https://444.hu/2026/10/04/leegett-a-muemleki-vedelem-alatt-allo-radostyani-reformatus-templom-megsemmisult-a-264-eves-barokk-fa-harangtorony-is?utm_source=rss_feed&utm_medium=rss&utm_campaign=rss_syndication` | nincs | `2026-10-04T11:04:34Z` | Német Szilvi | magyar református szeretetszolgálat; Radostyán; KULTÚRA | igen | nincs |

### Raw → UTOM normalizált mapping

Minden feednél ugyanaz a normalizáló határ fut: `title` → `article.title`, `link` → tracking-paraméterektől megtisztított canonical URL, `guid/id` → elsődleges külső identity ha elérhető, `pubDate/isoDate` → UTC `published_at`, szerző és kategória → opcionális mezők, `description/content/enclosure` → tartalom- és média-metaadat. Hiányzó GUID, szerző vagy leírás nem állítja meg az ingestiont; a canonical URL marad a deduplikációs identity.

## Élő mintacikk: Telex (ingestion futás)

Az ingestion/dedup bizonyíték egy külön, korábbi read-only fetch futás első feldolgozható Telex eleméhez kötődik; a feed tartalma közben frissülhetett. Ezért a fenti legutóbbi minta és az alábbi ténylegesen betöltött elem címe eltérhet, miközben ugyanazt a canonicalization és dedup útvonalat bizonyítják.

- Cím: „Évek óta bűzlik Hódmezővásárhely, az ATEV most újabb szagcsökkentő programot indít”
- Eredeti és canonical URL: `https://telex.hu/belfold/2026/10/04/hodmezovasarhely-marki-zay-atev-buz-szag`
- GUID: a Telex elemben nem érkezett külön GUID.
- Publikáció: `2026-10-04T11:05:43.000Z` (`feed_explicit`).
- Szerző: Farkas Anna; kategória: Belföld; description/content és enclosure jelen volt.
- Tracking parameter: nem volt; ezért az URL hash az eredeti és canonical URL-nél azonos.

## Ingestion és deduplikáció

Az izolált DB reset után a cikk első futása `inserted`, `articleId=205`, `source=telex.hu`, `publicationTimeSource=feed_explicit` eredményt adott. A második, azonos canonical URL-es futás `deduplicated`, ugyanazzal az `articleId=205` értékkel. A V2 provenance mindkét futásnál ugyanazt az operation key-t használta; az első beszúrt, a második meglévő rekordot talált.

## Javított diagnosztikai hibák

- `V21-RSS-F001`: a demo források nem canonical slugokkal szerepeltek, ezért a valós RSS route a reset utáni auto-increment ID-k mellett minden feedet kihagyhatott. A fixture most a hét kiadói canonical source slugot tartalmazza.
- `V21-RSS-F002`: az ingestion a vocabulary fix source ID-ját használta foreign key-ként. Reset/import után ez eltérhetett a tényleges DB ID-tól. Az ingestion most slug alapján oldja fel az aktuális, aktív source sort; a V2 envelope-ben is a tényleges DB source ID szerepel.

## RSS státusz

`PUBLISHER-DOMAIN RSS FORRÁSOK LIVE TESZTELVE: IGEN`

`RSS INGESTION VALÓDI ADATTAL: PASS`

`RSS DEDUPLIKÁCIÓ: PASS`

`444: THIRD-PARTY / PROXY – HOLD; PRODUCTION CANONICAL SOURCE: NEM`
