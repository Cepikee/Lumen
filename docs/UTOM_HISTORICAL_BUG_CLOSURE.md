# Utom.hu / Lumen – historical bug closure registry

Audit dátuma: 2026-09-29. Átnézett történeti források: a három `audit/*.md` jelentés, valamint 10 recovery, migration, feed, Speed Index, staging, deployment és hardening dokumentum. A Git working tree-t és a történetet csak olvastuk; reset, commit és push nem történt.

A `FIXED` státusz csak konkrét kód- és regressziós bizonyítékkal szerepel. A termékminőségi, külső infrastruktúra- vagy még hiányos runtime-bizonyítékot tartalmazó tételek nem kaptak `FIXED` minősítést.

## A kilenc induló részleges tétel lezárási terve

| ID | Partial reason | Missing proof | Planned closure |
|---|---|---|---|
| HIST-021 | DNS check és kapcsolat nincs egy címhez kötve | Rebinding/redirect/IPv4/IPv6 runtime | Pinned HTTP kliens vagy bizonyított egress policy |
| HIST-022 | Rate bucket process-local | Két Node process közös limitje | Atomi MySQL bucket és multiprocess fixture |
| HIST-023 | Session kód mellett nem volt fresh-schema/runtime lifecycle | Commit/rollback/reconnect/restart | Migráció és valódi MySQL lifecycle |
| HIST-024 | Reset token kód mellett nincs mail concurrency runtime | Párhuzamos request, egyszeri token, mock mail | DB-lock/outbox fixture |
| HIST-025 | Legacy PIN csak unit szinten bizonyított | Valódi legacy DB login/upgrade | MySQL fixture és auth runtime |
| HIST-026 | Proxy csak unit szinten bizonyított | Browser auth/entitlement/proxy/cleanup | Lokális Puppeteer E2E |
| HIST-027 | ffmpeg csak kódreview | Valódi binary/spawn/media/error/timeout | Mini lokális média fixture |
| HIST-028 | Search csak statikus bizonyíték | MySQL search és stabil pagination | Azonos timestampes többoldalas fixture |
| HIST-034 | Kritikus idők javítva, legacy business-time vegyes | CET/CEST/DST és kategorizált policy | Business-time policy és célzott runtime tesztek |

| ID | Eredeti forrás és hiba | Root cause / következmény | Severity / komponens | Státusz | Javítás és bizonyíték | Jelenlegi kockázat / következő lépés |
|---|---|---|---|---|---|---|
| HIST-001 | Audit: párhuzamos cron és summarize pipeline | Több writer duplán dolgozhatott | critical / pipeline | FIXED | `pipeline/cron.js` az egyetlen worker; `lib/cron.*` fail-fast; summarize route-ok 409. Import- és buildteszt PASS | Nincs aktív alternate writer |
| HIST-002 | P-01: failed cikk végül done | A batch feltétlen completiont írt | critical / state | FIXED | Tartós state machine; unit „invalid or incomplete article cannot be marked done”; MySQL canonical pipeline PASS | Nincs ismert edge case |
| HIST-003 | P-02: végtelen retry | Nem volt tartós attempt limit | critical / worker | FIXED | `processing_attempts`, max attempt, failed/dead-letter állapot; MySQL retry/recovery tesztek | Manuális operátori kezelés szükséges végleges hibánál |
| HIST-004 | P-03: nem atomikus claim | SELECT/update race, lease nélkül | critical / worker | FIXED | Tokenes atomikus UPDATE, heartbeat/stale lease; kétprocesszes MySQL claim PASS | Nincs ismert race |
| HIST-005 | Zombie worker késői írása | Tulajdonvesztés után nem volt fencing | critical / transaction | FIXED | Article- és step-token fencing; unit és MySQL late-result/zombie teszt PASS | Nincs ismert bypass |
| HIST-006 | Domain write és completion külön kapcsolat | Crash részleges projekciót hagyhatott | critical / transaction | FIXED | Kritikus projekció és completion azonos tranzakcióban; injected rollback tesztek PASS | `partial domain write = 0` a tesztelt lépéseken |
| HIST-007 | P-04: hibás AI válasz 0/neutral | Parser fallback érvényes adatot gyártott | high / AI | FIXED | Szigorú parser és typed failure; malformed mock/unit, canonical pipeline PASS | Valós provider minőség külön mérendő |
| HIST-008 | Sikeres AI lépés újrafutott | Nem volt tartós step checkpoint | high / AI/state | FIXED | Done/skipped result reuse, operation key; final-completion crash teszt PASS | Külső uncertain művelet kézi döntést kér |
| HIST-009 | Keyword/trend duplikáció | Ismételt INSERT idempotenciakulcs nélkül | high / DB | FIXED | Article-scoped trend identity és tranzakció; concurrent MySQL idempotency PASS | Legacy NULL article sorok változatlanok |
| HIST-010 | Cluster race | Párhuzamos worker két clustert hozhatott létre | high / cluster | FIXED | Advisory lock és fenced projection; kétprocesszes cluster teszt PASS | Minőségi pontosság külön tétel |
| HIST-011 | Speed Index N+1 és history duplikáció | Article pipeline közvetlen teljes recalculation | high / Speed Index | FIXED | Deferred generation/batch, event key, stale recovery; burst, restart és rollback tesztek PASS | Módszertani kalibráció külön tétel |
| HIST-012 | `published_at=NOW()` | Feed publikációs idő elveszett | high / feed/time | FIXED | Explicit timezone parser, provenance és fallback; UTC/CET/CEST unit + MySQL timezone teszt PASS | Legacy időpontok `legacy_unknown` |
| HIST-013 | Pontatlan URL identity | Prefix index és tracking eltérések | high / ingestion | FIXED | Teljes SHA-256 identity, canonicalization; sequential/concurrent feed tesztek PASS | Source-first first-writer szabály dokumentált |
| HIST-014 | Feed check-then-insert race | Külön SELECT és INSERT | high / ingestion | FIXED | Unique identity + `INSERT IGNORE` visszaolvasás; concurrent process PASS | Nincs ismert duplikáció |
| HIST-015 | Health negatív backlog age | Local `created_at` és UTC összevetése | high / health/time | FIXED | Row timestamphez `CURRENT_TIMESTAMP`, lease-hez UTC; staging runtime és MySQL health PASS | Régi, bizonytalan business timestamp nem konvertált |
| HIST-016 | Elveszett séma/migráció | Nem volt verziózott DDL | critical / DB | FIXED | 001–033 lánc, ledger/checksum/lock; unit és fresh MySQL PASS; 032→033 upgrade PASS | DDL rollback restore-alapú |
| HIST-017 | Hamis migration completion | DDL-hiba után metadata veszély | critical / DB | FIXED | Metadata csak sikeres DDL után; failure injection és checksum teszt PASS | Fél DDL-nél restore/runbook szükséges |
| HIST-018 | Recovery CLI téves automatikus retry | External side effect ismétlődhetett | critical / recovery | FIXED | External uncertain checkpoint, inspect read-only, local-only safe retry és audit trail; MySQL PASS | Uncertain eset operátori döntés |
| HIST-019 | Graceful shutdown/open handle timeout | Cleanup után a helper csak exitCode-ot állított | high / lifecycle | FIXED | Pool/state/IPC cleanup után determinisztikus exit; SIGTERM+SIGINT MySQL lifecycle 26/26 részeként PASS | Production main cleanup továbbra is természetes event-loop exitet használ |
| HIST-020 | Feed file logger maga is hibát dobhatott | Fix `/var/www/utom` útvonal, sync write védelem nélkül | high / feed/error | FIXED | `UTOM_LOG_DIR` explicit opt-in, console fallback, mkdir és védett file write; typecheck/build PASS | File logger hibája nem szakítja meg a feedet |
| HIST-021 | Analyze/scraper DNS rebinding | DNS check és fetch között cím változhatott | high / API/SSRF | FIXED | Az Undici dispatcher ugyanarra az előzetesen ellenőrzött IP-re köti a socketet; az eredeti host/SNI és TLS-hitelesítés megmarad. Minden redirect új DNS- és IP-ellenőrzést kap; IPv4/IPv6/mapped/mixed DNS, public→private, public→public, timeout, Host és tényleges pinned socket teszt PASS | A hálózati egress policy továbbra is ajánlott másodlagos védelem |
| HIST-022 | Többprocesszes rate limit | In-memory limiter processzenként külön működött | high / auth | FIXED | 032 `shared_rate_limits`; atomi MySQL upsert és fix ablak. Két külön processz három körben, körönként 30 párhuzamos kérésből globálisan pontosan 10-et engedett; restart, expiry, identity, cleanup és PRIMARY index bizonyíték PASS | DB-kieséskor az API fail-closed; a DB kapacitását production terhelésen figyelni kell |
| HIST-023 | Hamisítható session | Nyers user ID cookie; a session tábla kimaradt a migrációs láncból | critical / auth | FIXED | 031 séma és production-build HTTP E2E: szerveroldali 256 bites token/hash, biztonságos cookie, invalid/expired/logout, két párhuzamos read, szabályos és SIGKILL utáni külön process restart PASS | Nincs ismert session lifecycle rés; production ingress/TLS smoke a change window része |
| HIST-024 | Reset/verify és email visszaélés | Közvetlen mailküldés és COUNT-alapú request limit mellett DB/mail race és crash-ablak maradt | high / auth/mail | FIXED | 033 titkosított transactional outbox; tranzakciós token+mail scheduling; aktív token coalescing; kétprocesszes request/consume, single-use, rollback, expiry, password/PIN reset-login és uncertain mail crash E2E PASS, SMTP 0 | `uncertain` mailt operátor dönt el; outbox processz és monitoring szükséges |
| HIST-025 | Nyers legacy PIN | Plaintext mező és az auth utáni, zárolás nélküli lazy upgrade | high / auth | FIXED | 009-séma legacy fixture; timing-safe verify; `FOR UPDATE` + tranzakciós bcrypt upgrade; concurrent HTTP login, injected rollback, restart, session és reset→login E2E PASS | Sikeres legacy login után plaintext nem marad; hibás/null/üres rekord fail-closed |
| HIST-026 | Premium proxy titok kliensben | Public API key, route traversal és hiányzó teljes runtime bizonyíték | high / premium | FIXED | Server-only key; szerveroldali entitlement; allowlist; közös MySQL limiter; 15 s felső timeout és 2 MiB response cap; production HTTP E2E lokális upstreammel PASS | Browser subprocess már nincs; az operátor által konfigurált belső origin célpont-policyja deployment feladat |
| HIST-027 | ffmpeg shell injection | DB útvonal shell-stringben | high / video | PARTIALLY FIXED | `execFile`, path allowlist, timeout/concurrency, route tiltás | Valódi ffmpeg fixture runtime hiányzik |
| HIST-028 | Summary SQL interpolation és instabil pagination | Paraméterezés hiánya; csak timestamp rendezés | critical / search | FIXED | Paraméterezett query, `created_at DESC,id DESC`, minden ágon LIMIT/OFFSET; 25 azonos timestampes MySQL háromoldalas teszt PASS | Stabil datasetnél nincs overlap vagy eltűnő sor |
| HIST-029 | Öt high dependency advisory | Puppeteer extract-zip lánc; Nodemailer parser/file/URL hibák | high / dependency | FIXED | A Puppeteer fallback és dependency eltávolítva; `nodemailer@10.0.12`; `npm audit --omit=dev`: 0; API regresszió és build PASS | Valódi email hálózati művelet nem futott |
| HIST-030 | Forecast 48h/7 nap és destruktív csere | Kísérleti modell validáció nélkül | medium / forecast | INTENTIONAL / ACCEPTED | Production capability alapból tiltott | Külön termék- és modellvalidáció előtt nem production funkció |
| HIST-031 | „Plágium” Jaccard elnevezés | Heurisztika nem jogi/ténybeli bizonyíték | medium / analytics | INTENTIONAL / ACCEPTED | Módszertani korlát dokumentált | Átnevezés/kalibráció termékfeladat |
| HIST-032 | Cluster/clickbait pontosság | Nincs címkézett evaluation dataset | high / analytics | INTENTIONAL / ACCEPTED | Technikai determinisztika/race javítva | Címkézett minta és mérőszám külső adatfeladat |
| HIST-033 | Forrásjogok | RSS/scraping engedélyek nem igazoltak | high / legal | OPEN | Nincs kódoldali bizonyíték | Tulajdonosi/jogi forrásengedélyezés kell |
| HIST-034 | Teljes legacy timestamp egységesítés | Régi modulokban `NOW()` és lokális business idő maradt | medium / time | PARTIALLY FIXED | Claim/recovery/health/feed/Speed UTC-biztos és tesztelt | Nem kritikus legacy report/forecast időszemantika külön migrációt igényel |
| HIST-035 | `daily_reports` író/olvasó eltérő mező | `created_at` vs `report_date` | high / reports | FIXED | 016 generated `report_date`, index és kompatibilis reader; fresh migration/build PASS | Nincs ismert schema mismatch |
| HIST-036 | Aktív session runtime tábla nem volt migrációban; feed nem tisztelte a source tiltást | Kézi S01 import és hardcoded feedlista | critical / schema, feed policy | FIXED | 031 `user_sessions` fresh migration + MySQL lifecycle PASS; fetch route csak `sources.is_active=1` forrást kér le és `finally` zárja a kapcsolatot | Jogi engedélyt továbbra is tulajdonos állítja be |
| HIST-037 | Login IP spoofolható forwarding headerrel | A login feltétel nélkül elfogadta az `X-Forwarded-For` értéket, miközben más security útvonalak explicit trust policyt használtak | high / auth/rate-limit | FIXED | A login a közös `getIp` policyt használja; alapállapotban `direct`, forwarding header csak `UTOM_TRUST_PROXY_HEADERS=true` mellett; production HTTP spoof fixture PASS | Az ingressnek trusted módban törölnie és újraírnia kell a forwarding headereket |

## HIST-025 legacy PIN runtime bizonyíték

A rekonstruált történeti 009 `users` séma `VARCHAR(255)` `pin_code` mezőjében a legacy formátum négyjegyű plaintext volt. A kompatibilitási ellenőrzés csak valid négyjegyű inputnál fut, az összehasonlítás `timingSafeEqual`; a modern formátum bcrypt cost 12. A sikeres legacy login most user-sorszintű `FOR UPDATE` zárral, egy tranzakcióban írja a bcrypt állapotot és az auth audit metadata értékeket. Két külön processz párhuzamos loginja ugyanabba az egyetlen tartós hash állapotba jutott.

A fixture valid plaintext, hibás plaintext, null, üres, modern bcrypt és külön fault-injection rekordot tartalmazott. Wrong/malformed/rövid/hosszú/null/üres input és korrupt rekord authot nem kapott. Egy ideiglenes DB CHECK constraint szándékosan meghiúsította a bcrypt update-et: a teljes login tranzakció rollbackelt, a legacy érték változatlan maradt, a constraint eltávolítása után retry sikerült. Restart után ugyanaz a hash és login működött. PIN-reset után a régi PIN és korábbi session elutasítva, az új PIN elfogadva; PIN nem jelent meg a runtime kimenetben.

## HIST-026 jelenlegi proxy runtime bizonyíték

A Puppeteer/browser subprocess már nem része a production útvonalnak. A kliensoldali Insights oldal ugyanazon originen a `/api/premium-insights/[[...path]]` route-ot hívja. A route DB-backed sessionből kér szerveroldali entitlementet, normalizált allowlistes insights pathot épít, és kizárólag az operátor `UTOM_INTERNAL_BASE_URL` originjére továbbít server-only API keyvel. A kliens sem upstream hostot, sem credentialt nem adhat meg; private/localhost szöveg és encoded separator nem változtathatja meg a célt. Az upstream redirect tiltott.

A production build E2E premium, non-premium, expired, missing és invalid sessiont ellenőrzött. A lokális upstream success, 400, 500, timeout, disconnect, malformed HTTP, oversized body és public→private redirect esetet szimulált. A proxy közvetlenül használja a shared MySQL limitert, timeoutja konfigurálható, de legfeljebb 15 másodperc, response limitje legfeljebb 2 MiB. Négy párhuzamos kérés PASS; app/upstream process és socket cleanup PASS. A secret marker nem jelent meg response-ban vagy logban; fizetős proxyhívás 0.

## HIST-021 outbound surface és threat model

Az internet által befolyásolható célok az `/api/analyze` URL-je, a feedből származó article URL és a Portfolio article fallback. Ezek, valamint a rögzített RSS/444 feed URL-ek ugyanazt a `fetchPinnedText` klienst használják. A kliens a Node `BlockList` és `isIP` primitívjeivel tiltja a loopback, private, link-local, shared, documentation, benchmark, unspecified, multicast, reserved, IPv4-mapped IPv6, ULA és site-local tartományokat. Több A/AAAA rekordnál egyetlen tiltott cím is blokkolja a teljes célt. Nincs globális DNS cache.

A tényleges socketet az Undici dispatcher saját `lookup` callbackje a már ellenőrzött címhez köti. Az URL hostname-je változatlan, így a HTTP Host és a TLS SNI az eredeti host marad. A lokális HTTPS fixture rögzítette a `public.example` SNI-t, majd a self-signed tanúsítványt a kliens elutasította; TLS-verifikációt kikapcsoló beállítás nincs. Minden 3xx cél új resolve/validation/pinning ciklust kap, legfeljebb öt redirecttel.

Az aktív feed útvonalból a Chromium/Puppeteer navigáció kikerült, mert annak al-erőforrásai a Node kliens DNS-pinningjét megkerülhették volna. A korábbi böngészős/proxys `test-444-feed.js` diagnosztika szintén a pinned helperre került. A fix vendor végpontok (Cloudflare Turnstile, Google reCAPTCHA) nem fogadnak kliens URL-t. A premium proxy kizárólag allowlistelt belső útvonalat fűz az operátor által beállított `UTOM_INTERNAL_BASE_URL` értékhez; a proxy destination DNS-feloldását nem állítjuk kliensoldali pinninggel védettnek, és a teljes browser/session proxy bizonyítás továbbra is HIST-026 része. A `scripts/fetch-and-post-444.js` kézi operátori segéd, rögzített külső feed URL-lel és környezeti belső céllal; nem webes bemenet.

## HIST-022 algoritmus és üzemeltetés

A limiter egyszerű, a MySQL `UTC_TIMESTAMP(6)` órájából képzett UTC epoch fixed window algoritmust használ, így külön processzek helyi órája nem nyithat eltérő ablakot. A kulcs a scope és az identity SHA-256 lenyomata; az identity a hitelesített premium proxy belső user-kulcsa, egyébként a közvetlen kapcsolat vagy csak explicit `UTOM_TRUST_PROXY_HEADERS=true` mögött az ingress által megtisztított proxy IP. A deploymentnek a kliens által küldött forwarding headereket el kell távolítania, mielőtt saját értéket ír. Alapállapotban a headerek figyelmen kívül maradnak.

Az egyedi `(bucket_key, window_start_ms)` elsődleges kulcson futó `INSERT ... ON DUPLICATE KEY UPDATE` egyetlen szerveroldali műveletben növeli a teljes számlálót, és csak szabad quota esetén az elfogadott számlálót. A process restart nem törli az állapotot. DB-hibánál a security wrapper fail-closed eredményt ad, belső SQL/IP/secret részlet naplózása nélkül. A sorok `expires_at` értéket és expiry indexet kapnak; a batchelt `npm run rate-limit:cleanup` karbantartást az üzemeltetési schedulerből kell futtatni, nem minden kérés hot pathján.

## HIST-023 HTTP és process bizonyíték

A hiányzó bizonyíték a valódi Next.js production runtime, cookie-kezelés és processzek közötti folytonosság volt. A MySQL 8 fixture valódi HTTP login során új, szerver által generált 64 hex karakteres tokent kapott; a DB kizárólag SHA-256 lenyomatot tárol. A cookie `HttpOnly`, production módban `Secure`, `SameSite=Lax`, `Path=/`, normál login esetén `Max-Age=86400`. A kliens által előre küldött session azonosítót a login nem használta újra.

Az autentikált `/api/auth/me`, a malformed és ismeretlen cookie, a DB-ben lejáratott session, az idempotens logout, két egyidejű session-read és a read/logout verseny HTTP-n futott. A commitált session szabályos leállítás után Process B-ben, majd külön loginból SIGKILL után Process C-ben is érvényes maradt. Logout vagy lejárat után ugyanaz a cookie nem adott jogosultságot. A három alkalmazásfolyamat leállt, a poolok felszabadultak, és a jelölő session/reset tokenek nem jelentek meg az alkalmazáskimenetben.

## HIST-024 reset/outbox bizonyíték

A password- és PIN-reset kérés ugyanazt a tranzakciós szolgáltatást használja. A user sor zárolása mellett egy még aktív tokenre érkező párhuzamos kérés coalescelődik; az új bearer token 32 kriptográfiai véletlen bájt, a reset táblában csak SHA-256 lenyomata szerepel. A token és az AES-256-GCM titkosított outbox rekord ugyanabban a DB-tranzakcióban commitálódik. A recipient csak hash formában kereshető, a titkosított payloadhoz külön `EMAIL_OUTBOX_ENCRYPTION_KEY` szükséges.

Két külön Node process ugyanarra az emailre egyszerre kért password resetet: egy aktív token és egy outbox üzenet keletkezett. Ugyanazt a tokent két külön process egyszerre fogyasztotta: egy siker és egy elutasítás történt. A password/PIN update, token törlés és minden korábbi session törlése azonos tranzakció; egy szándékos foreign-key delete hiba bizonyította, hogy a password write visszagördül és a token megmarad. Exact-boundary, lejárt, malformed, ismeretlen és újrahasznált token elutasítva; régi password/PIN sikertelen, új értékekkel login sikeres.

Az outbox claim a provider előtt `uncertain` állapotot ír. A mock provider utáni szándékos crash egyetlen küldési kísérletet hagyott `uncertain` állapotban, amelyet a processzor nem küldött újra vakon. A commitált `pending` rekord crash előtt tartósan lekérhető. Létező és nem létező email ugyanazt a HTTP választ kapta, a reset route-ok a közös MySQL limiter IP- és email-scope-ját használták. Valódi SMTP hívás nem történt.

## Repository-wide audit eredménye

- Canonical pipeline, state machine, claim, fencing, transaction, partial-write, recovery, feed, URL identity, cluster race és Speed Index: MySQL runtime bizonyíték PASS.
- Legacy pipeline: két summarize route csak autentikált 409-et ad; legacy cron fail-fast; más aktív article INSERT útvonalat a source audit nem talált.
- UTC: lease/claim/heartbeat/recovery és publication tesztelt UTC/CET/CEST környezetben. A dokumentált legacy business-time terület HIST-034 miatt részleges.
- Connection/process: SIGTERM és SIGINT után worker state `stopped`, pool/lock felszabadul. A jelen auditban talált lifecycle helper leak lezárva.
- TODO/FIXME/HACK: aktív pipeline-ban elrejtett bypass vagy ideiglenes success-path nem található. A „legacy” találatok migrációs kommentek, compatibility guardok vagy a registryben jelzett modulok.
- Async/error handling: aktív workerben async `forEach` és fire-and-forget DB completion nem található. A state-machine heartbeat timer `finally` ágban törlődik. A feed logger failure-pathja ebben a körben javult.
- ESLint: 362 warning, 0 error. Fő kategóriák: `no-explicit-any` legacy typing; unused/dead code; React hook szabályok; `<img>` performance; kisebb `prefer-const` style. A runtime szempontból releváns auth/proxy területet célzottan javítottuk; tömeges automatikus fix nem történt.
- Production cardinality: nem található hiteles, nem érzékeny production row-count. A SMALL/MEDIUM/LARGE továbbra is synthetic baseline; számot nem találtunk ki.

## Összesítés

| Státusz | Darab |
|---|---:|
| Total historical findings | 37 |
| FIXED | 31 |
| PARTIALLY FIXED | 2 |
| OPEN | 1 |
| OBSOLETE | 0 |
| NOT REPRODUCIBLE | 0 |
| INTENTIONAL / ACCEPTED | 3 |
| NEWLY DISCOVERED | 1 |

Ebben a célzott körben HIST-025 és HIST-026 lezárult, az új HIST-037 pedig feltárás után azonnal javítást és runtime regressziót kapott. A fennmaradó high részleges vagy nyitott tételek: HIST-027 és HIST-033; a medium HIST-034 továbbra is részleges. A jogi HIST-033 nem kódhiba; technikailag a source enable/disable fail-closed módon érvényesül.

`HISTORICAL BUG CLOSURE AUDIT: NOT VERIFIED`

Indok: két részlegesen bizonyított és egy külső jogi tétel maradt. Nem állítható bizonyítottan, hogy minden korábbi programozási hiba teljesen lezárult.

`PRODUCTION CHANGE-WINDOW READINESS: NOT VERIFIED`

`PRODUCTION DEPLOYMENT: NOT EXECUTED`
