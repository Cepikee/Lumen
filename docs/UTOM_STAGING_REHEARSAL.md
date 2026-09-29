# Utom.hu staging rollout rehearsal

## Jegyzőkönyv

- Időpont: 2026-09-28, Europe/Budapest
- Branch: `develop/utom-recovery`
- Kiinduló commit: `7c6edb9` plusz a dokumentált, nem commitolt recovery munkafa
- Node.js: 24.19.0
- MySQL: 8.0.46
- Next.js: 16.3.6 production build/runtime
- Adatbázisok: három disposable MySQL séma (`source`, első restore, rollback restore)
- Pre-upgrade séma: 001–021
- Post-upgrade séma: 001–030
- Runtime: staging, mock AI, fixture feed, valódi DB-write, feed polling/email/video/payment/real AI tiltva
- Production adat, secret, endpoint vagy szolgáltatás nem szerepelt a próbában.

## Mért staging fixture eredmények

| Művelet | Eredmény |
|---|---:|
| Pre-upgrade backup | 189 ms |
| Backup méret | 30 567 byte |
| Backup SHA-256 | `d5c27c3e934e0e90dd5b5030dd7ce38c9c12e2d42ce6a410af6afdbf22a3e8eb` |
| Első restore | 2 029 ms |
| 022–030 migráció | 1 370 ms |
| Next.js production startup | 111 ms |
| Első hitelesített HTTP readiness kör | 326 ms |
| Restore-alapú rollback drill | 2 120 ms |

Ezek kis staging fixture mérések, nem production SLA-k.

## Backup és restore

A pre-upgrade adatbázis 22 táblát, 3 article-t és reprezentatív summary, keyword, trend, cluster, Speed Index és history adatot tartalmazott. Az első `mysqldump` próbán a minimális jogosultságú user tablespace PROCESS figyelmeztetést kapott. Ezt stop conditionként kezeltük; a javított parancs `--no-tablespaces --single-transaction` móddal exit 0 eredményt adott.

A dump nem üres, tartalmazott schema- és INSERT-utasításokat, szabályos completion sort és SHA-256 checksumot. A külön restore adatbázis táblaszámai, domain row countjai, article state-jei és kiválasztott article rekordhash-e megegyeztek a source adatbázissal.

A rollout végén ugyanebből a pre-migration dumpból egy harmadik, tiszta adatbázisba végzett rollback restore is exit 0 lett. A visszaállított séma verziója 021, az article state-ek `pending/done/failed`, a rekordhash az eredeti backup source hashével azonos. Új séma fölött destruktív DDL rollback nem történt.

## Migráció

A writer shutdown ellenőrzés 0 aktív article claimet és 0 aktív staging write kapcsolatot mutatott. A status pontosan 9 pending migrációt jelzett 022–030 között. A statikus audit egy szándékos warningot adott a 027-es URL identity indexcserére; critical vagy nem várt destructive finding nem volt.

A tényleges apply-lista megegyezett a status listával. A végső verzió 030, pending migráció 0, schema readiness true. Az article-, summary-, keyword-, trend-, cluster-, Speed Index- és history darabszám nem csökkent. Mindhárom legacy article `publication_time_source=legacy_unknown` értéket kapott, mindhárom URL identity létrejött, az article state-ek és a két source identity külön maradtak.

## HTTP és runtime smoke

Valódi `next start` production runtime futott a disposable staging DB-n.

| HTTP eset | Státusz | Eredmény |
|---|---:|---|
| Anonymous health | 401 | diagnosztika nem szivárgott |
| Hibás token | 401 | diagnosztika nem szivárgott |
| Helyes internal token | 200 | liveness/readiness/schema ready |
| Első fixture RSS POST | 200 | inserted=1 |
| Ismételt fixture RSS POST | 200 | inserted=0, deduplicated=1 |

A smoke article canonical URL-je tracking paraméter nélkül tárolódott, az original URL megmaradt, a source `444.hu`, a publication timestamp UTC-re normalizált és `feed_explicit` eredetű lett.

A production worker mock AI providert használt. A feed polling, real AI, SMTP, video és payment capability tiltva volt. A kontrollált outputok a mock provider determinisztikus válaszai voltak. Fizetős vagy külső szolgáltatáshívás: **0**.

## Pipeline és Speed Index

A smoke article `done` állapotot ért el. Minden required step `done`; a sentiment is `done`. Summary, keyword, trend, normalizált source, embedding, cluster és clean summary projection létrejött.

Az article completion előtt a Speed Index scheduling tartós generationt hozott létre. A következő worker loop külön claimelte és futtatta a batch-et. Végállapot: `clean`, `generation=completed_generation`, claim owner törölve. A history eseményszám restart és crash recovery után sem duplázódott.

A health a worker claim/completion időpontját, a pending article-t, a Speed Index generation laget, majd a végső nulla backlogot és clean batchet valódi HTTP-n mutatta. A rehearsal közben talált negatív backlog age oka a legacy `created_at` szerverhelyi idejének UTC órával való összevetése volt. A javítás a created/updated age-et `CURRENT_TIMESTAMP`, a lease age-et továbbra is `UTC_TIMESTAMP` alapján számolja; az újramért health pozitív életkort adott.

## Recovery és lifecycle

- Read-only recovery inspect: PASS, adatváltozás nélkül.
- Lokális failed/retryable `cluster` step explicit retry: PASS.
- Recovery audit sor: PASS.
- Új worker a retryra állított article-t teljes pipeline-on `done` állapotba vitte.
- `uncertain` külső summary operation inspect: `operator_adjudication_required`.
- Normál recovery retry ugyanarra: elutasítva, state változatlan.
- SIGINT graceful stop: worker `stopped`, pool connection 0.
- Újraindítás: readiness és heartbeat visszatért.
- Hard-crash article fixture: a claimelő processz kapcsolat nélkül megszűnt; a production minimum 60 másodperces lease után az új worker kézi DB-edit nélkül átvette. `processing_attempts=2`, végállapot `done`, partial domain write nem maradt.
- Speed Index crash fixture: a claimelő processz completion előtt megszűnt; az új worker stale claimként átvette, a generation nem veszett el, history nem duplázódott, végállapot clean.

## Konfigurációs mátrix

| Funkció | Staging rehearsal | Production |
|---|---|---|
| DB write | disposable staging DB, engedélyezve | production DB, explicit engedély |
| AI | mock | explicit provider + real-AI enable + secret |
| RSS | egy hitelesített fixture POST; polling tiltva | explicit feed enable + belső token |
| Internal health | staging token | külön production internal token |
| SMTP | tiltva | explicit enable + SMTP secret |
| Video/storage | tiltva | explicit enable + szolgáltatói secret |
| Payment | tiltva | explicit enable + payment secret |

Production secret kategóriák: DB és internal token kötelező; OpenAI, SMTP, video/storage és payment csak az adott explicit capability bekapcsolásakor kötelező. Értékeket a rehearsal nem olvasott ki és nem dokumentált.

## GO / NO-GO

- [x] backup
- [x] backup-validáció és checksum
- [x] külön DB restore
- [x] restore-integritás és rekordhash
- [x] migration status/lista egyezés
- [x] 022–030 migration
- [x] post-migration adatintegritás
- [x] schema readiness
- [x] production build/runtime
- [x] HTTP health és auth
- [x] fixture ingestion és deduplikáció
- [x] canonical pipeline és domain projectionök
- [x] deferred Speed Index
- [x] recovery inspect, safe retry és audit
- [x] uncertain external védelem
- [x] graceful shutdown/restart
- [x] article hard-crash recovery
- [x] Speed Index crash recovery
- [x] restore-alapú rollback drill
- [x] fizetős külső hívás 0
- [x] connection leak 0
- [x] teljes regresszió és build

Objektív rehearsal döntés: **GO** a dokumentált staging próbára és egy kontrollált production change window előkészítésére. Ez nem production telepítési engedély; a production backup, change approval, secret provisioning és stop conditionök végrehajtása továbbra is kötelező.

`STAGING ROLLOUT REHEARSAL: VERIFIED`

`PRODUCTION DEPLOYMENT: NOT EXECUTED`
