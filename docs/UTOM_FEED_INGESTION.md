# Utom.hu – feed ingestion és article identity

Állapot: **FEED INGESTION CORRECTNESS: VERIFIED** helyi offline és disposable MySQL 8 tesztekkel.

## Kanonikus út

Két hitelesített HTTP belépési pont hozhat létre article rekordot: a több forrást olvasó `POST /api/fetch-feed` és a 444.hu feedet fogadó `POST /api/receive-feed`. Mindkettő ugyanazt a `lib/feed-ingestion.js` függvényt használja. A `pipeline/cron.js` csak már létező `pending` rekordot claimel; article-t nem hoz létre. Más aktív article insert útvonalat a forrásaudit nem talált.

## Article identity és URL-szabályok

Az elsődleges identity a canonical URL teljes SHA-256 lenyomata (`url_identity`, ASCII binary UNIQUE). A cím, GUID, source string és publication time önmagában nem identity. Ez megőrzi a külön URL-en megjelent, akár azonos című cikkeket, és nem függ a korábbi 700 karakteres, case-insensitive index-prefixtől.

A canonicalizer:

- a HTTP/HTTPS változatot HTTPS-re egységesíti;
- kisbetűsíti a hostot és eltávolítja a `www.` előtagot;
- eltávolítja a fragmentet, a default 80/443 portot, a duplikált path slash-eket és a záró slash-t;
- dekódolja az unreserved percent-encodingot, más escape-eket nagybetűsít;
- név és érték szerint rendezi a query paramétereket;
- eltávolítja az `utm_*`, `fbclid`, `gclid`, `dclid`, `gbraid`, `wbraid`, `msclkid`, `igshid`, `mc_cid`, `mc_eid`, `mkt_tok`, `vero_conv`, `vero_id`, `_hsenc`, `_hsmi`, `oly_anon_id`, `oly_enc` tracking paramétereket;
- megőrzi az összes más query paramétert, beleértve az `id`, `lang`, `ref` és `source` értékeket;
- elutasítja a nem HTTP(S), hibás vagy credentialt tartalmazó URL-eket;
- idempotens.

Az eredeti feed URL változatlanul az `original_url` mezőbe kerül audit/debug célra.

## Source identity

A kanonikus belső kulcs domain alakú: `telex.hu`, `24.hu`, `index.hu`, `hvg.hu`, `portfolio.hu`, `444.hu`, `origo.hu`. A közös helper kezeli a történeti megjelenítési és domain aliasokat; például `24hu`, `24.hu` és `www.24.hu` mind `source_id=2`, `source='24.hu'` értékre kerül. Ismeretlen source nem kerül automatikusan összevonásra, az ingestion `unknown_source` eredményt ad.

Ugyanez a helper működik a feed ingestionben, related-news összevetésben és a Speed Index számításában. A UI megjelenítési címkéi ettől külön maradhatnak.

Az `external_id` megőrzi a feed GUID-ot, de nem kapott UNIQUE constraintet. A vizsgált kódból nem bizonyítható minden feed GUID-stabilitása; globális uniqueness biztosan hibás lenne. A `(source_id, external_id)` normál index auditot segít, de az URL marad az authoritative identity.

## Publication timestamp

- `published_at`: a forrás által közölt publikálási pillanat UTC-re normalizált, timezone nélküli MySQL `DATETIME`; ha nincs biztonságosan értelmezhető idő, az ingestion pillanata.
- `publication_time_source`: `feed_explicit`, `article_metadata`, `ingested_at_fallback` vagy régi sornál `legacy_unknown`.
- `created_at`: az article rekord helyi rendszerbe kerülésének ideje.
- `clusters.first_published_at`: a cluster első ismert cikkének `published_at` értéke; nem ingestion retry ideje.

Prioritás: explicit feed timestamp, majd rendelkezésre álló article metadata, végül ingestion idő. RFC 822 és ISO 8601 csak explicit timezone-nal fogadható el. Timezone nélküli, hibás, 1990 előtti vagy több mint egy évvel jövőbeli dátum fallbacket kap; soha nem válik 1970-es hamis dátummá. A storage UTC szemantikájú, a magyar UI továbbra is Europe/Budapest időben jeleníthet meg.

Régi timestampet a migráció nem konvertál. Az új `publication_time_source='legacy_unknown'` kifejezetten jelöli, hogy eredete bizonytalan és automatikusan nem javítható.

## Duplicate kezelés

Az `INSERT IGNORE` és a teljes URL hash UNIQUE index együtt kezeli a párhuzamos processeket. Duplicate esetben a helper visszaolvassa ugyanazt az article ID-t. Nem frissíti a címet, source-ot, publication time-ot vagy feldolgozási állapotot, ezért a first-writer értékek authoritative-ek, és a `done`, `in_progress`, `failed`, `needs_recovery`, attempt- és claim-mezők változatlanok maradnak.

A 027-es migráció additív mezőket és indexet ad hozzá, adatot nem töröl és timestampet nem alakít át. A régi prefix UNIQUE indexet a teljes SHA-256 identity index váltja fel.

## Audit és történeti adatok

A `scripts/audit-article-ingestion.cjs` kizárólag explicit opt-innel és `_test` végű adatbázison fut. Read-only riportot ad canonical duplicate-ról, source-scoped external ID collisionről, source aliasokról és gyanús title+publication-minute egyezésről. Automatikus merge vagy backfill nem készült; bizonytalan történeti rekordot nem módosítunk.

Redirect- és HTML canonical metadata crawler nem készült. Az ingestion nem indít új hálózati kérést pusztán dedup céljából.
# Rollout megjegyzés

A 027-es migráció a legacy URL-prefix unique indexet teljes SHA-256 URL identity indexre cseréli. Emiatt a rollout idején a régi és új feed-író kód párhuzamos használata nem támogatott; az író folyamatokat a migráció idejére le kell állítani. Részletes sorrend: `docs/UTOM_DEPLOYMENT_CHECKLIST.md`.
