# Utom.hu – helyreállítási és fejlesztési főterv

Állapot: első tervezési lépés, 2026-09-24  
Kiinduló commit: `7df3f0792715f513f1293277b97095dcbbf89ce4`  
Helyi fejlesztői ág: `develop/utom-recovery`  
Kapcsolódó auditok: [technikai audit](../audit/01_TECHNIKAI_AUDIT.md), [üzleti elemzés](../audit/02_UZLETI_ELEMZES.md), [korábbi fejlesztési terv](../audit/03_FEJLESZTESI_TERV.md)

## 1. Cél, keretek és döntési elvek

A program célja a meglévő Utom.hu kódbázis megőrzése és fokozatos helyreállítása: először külső költség és élő gyűjtés nélkül localhoston, majd ellenőrzött hírgyűjtéssel, végül előfizetéses szöveges médiafigyelő szolgáltatásként. A régi adatbázis elveszettnek tekintendő. Korábbi híreket és felhasználókat nem szabad kitalált adatokkal „helyreállítani”; az új seed adatok egyértelműen fiktívek lesznek.

A munka minden szakasza kapuval zárul. A következő szakasz csak akkor indulhat, ha az előző kötelező tesztjei sikeresek, vagy az eltérés dokumentált, elfogadott és nem veszélyezteti a következő munkát. Hibás buildből vagy sikertelen kötelező tesztből nem készül „kész” commit.

A videó, TTS, forecast, régi Ollama-útvonalak és kísérleti statisztikák megmaradnak, de nem részei az első fizetős szöveges MVP kritikus útjának. A fő rendszer stabilizálásáig funkciókapcsoló mögé vagy dokumentáltan kikapcsolt állapotba kerülnek; törlésük külön tulajdonosi döntés.

## 2. Ellenőrzött Git-állapot

| Vizsgálat | Eredmény |
|---|---|
| Kiinduló ág | `main` |
| Távoli repository | `origin = https://github.com/Cepikee/Lumen.git` fetch/push címként |
| Kiinduló HEAD | `7df3f0792715f513f1293277b97095dcbbf89ce4` |
| Main állapota | `main...origin/main`; a vizsgálat nem végzett fetch-et, ezért csak a helyi remote-tracking ref ismert |
| Korábbi audit változásai | három új, nem követett fájl az `audit/` könyvtárban |
| Követett fájl módosítás | nem volt |
| Létrehozott ág | helyi `develop/utom-recovery`, ugyanarról a commitról |
| Távoli művelet | nem történt |

A branch létrehozása megőrizte az auditfájlokat. A `main` ref változatlan maradt. A remote hitelessége az URL alapján megfelelő; a távoli aktuális állapotot fetch nélkül nem lehet bizonyítani. Bármely fetch/pull/push előtt tulajdonosi jóváhagyás szükséges.

### Gitignore- és titokvizsgálat

A `.gitignore` jelenleg kizárja az `.env*`, `node_modules`, `.next`, `out`, `build`, coverage, debug log, `.vercel`, TypeScript buildinfo és PEM fájlokat. Később javasolt hozzáadni: `*.sql`, `*.sql.gz`, lokális adatkönyvtárak, dump/backup könyvtárak, `*.key`, `*.p12`, `*.pfx`, helyi logok, generált média és tesztkimenetek. Az `.env.example` követhető kivételként kerülhet be, kizárólag üres/helyőrző értékekkel.

A forrásvizsgálat nem talált követett `.env`, PEM vagy tipikus credential fájlt. Talált viszont sok beégetett, dokumentációs helyőrzőnek tűnő DB-jelszót és root felhasználót, valamint a videószerverben tényleges fallbackként használható aláíró titkot. A jelentés nem ismétli meg az értékeket. Nem bizonyítható, hogy ezek valaha éles hitelesítők voltak; biztonságos eljárásként rotálni és a Git-történetben később titokszkennerrel ellenőrizni kell őket.

## 3. Javasolt localhost-környezet

### Döntés: WSL2 + Ubuntu + VS Code Remote

A fő fejlesztői környezethez WSL2 ajánlott, mert a repository több helyen Linux-útvonalakat (`/var/www/utom`), külön Node háttérfolyamatokat, MySQL-t, Puppeteert/Chromiumot és ffmpeg-et feltételez. Ez közelebb áll a várható éles Linux környezethez, és csökkenti a Windows/Linux eltéréseket.

Az aktív fejlesztői példányt célszerű a WSL ext4 fájlrendszerében tartani, nem tartósan `/mnt/f` alatt, mert a sok kis fájlt kezelő Node és Git műveletek ott lassabbak lehetnek. A jelenlegi Windows-példányt változatlan biztonsági kiindulópontként kell megőrizni. A WSL-példány csak egy ellenőrzött commitból készüljön; a Git legyen az átadás forrása, ne kézi, kétirányú fájlmásolás.

Natív Windows alternatíva használható csak a webes felület gyors vizsgálatára, de több eltérő útvonal-, daemon-, Chromium-, ffmpeg- és MySQL-kezelést igényelne. Docker Desktop később választható a MySQL és integrációs környezet reprodukálására, de az első helyreállítás ne függjön egyszerre WSL2-től és egy új konténeres architektúrától.

### Verziók és komponensek

| Komponens | Kezdő beállítás | Indok / korlát |
|---|---|---|
| Windows | WSL2 engedélyezve, aktuális Ubuntu LTS | Linux-kompatibilis helyi és későbbi éles út |
| VS Code | Remote – WSL | A szerkesztő Windowsból használható, a parancsok Linuxban futnak |
| Node.js | 24 LTS vagy a lockfile engine-feltételeit teljesítő támogatott verzió; `.nvmrc`/`.node-version` rögzítendő | A jelenlegi Next >=20.9, JSDOM pedig >=24-et is támogat; a CI ugyanazt használja |
| npm | A választott Node-hoz tartozó rögzített főverzió; telepítés `npm ci` | A `package-lock.json` az egyetlen dependency-forrás |
| MySQL | MySQL 8.x, utf8mb4, UTC session/időzóna | A kód MySQL 8 kollációt is használ; MariaDB csak külön kompatibilitási teszttel |
| OpenAI | kezdetben `AI_PROVIDER=mock`, valódi kulcs nélkül | Első induláskor nincs fizetős hívás |
| Gyűjtő | kezdetben `FEED_FETCH_ENABLED=false` | Első induláskor nincs élő forráselérés |
| Fájltárolás | projekt-adatkönyvtár környezeti változóból, Git által ignorálva | Nincs `/var/www/utom` hardcode; videó nem MVP-feltétel |
| Külső eszköz | Chromium/Puppeteer és ffmpeg csak a megfelelő későbbi kapunál | Ne terhelje az első statikus helyreállítást |

### Tervezett indítási módok

1. `offline`: fiktív seed adat, mock AI, tiltott külső hálózat, nincs worker.
2. `integration`: helyi MySQL, mock feed és mock AI; adatbázis-integrációs tesztek.
3. `staging`: külön tesztadatbázis, kontrollált forráslista, költségplafon, valódi külső szolgáltatás csak jóváhagyással.
4. `production`: külön hitelesítők, mentés, monitoring, jogi jóváhagyás és indulási kapu után.

## 4. Új adatbázis és migrációs stratégia

A régi sémát nem lehet pontosan visszaállítani. Az új séma a kódból rekonstruált mezőket konzisztens modellbe rendezi, és a kompatibilitást migrációkkal biztosítja. Javasolt egy könnyű SQL-alapú migrációs runner, amely sorszámozott `up` migrációkat, checksumot és `schema_migrations` táblát használ. A technológia végleges kiválasztása az első fejlesztési napon történik; a cél nem ORM-csere, hanem az elveszett séma verziózható újraalkotása.

### Tervezett migrációs csomagok

| Verzió | Tartalom |
|---|---|
| 001 | `schema_migrations`, `sources`, forráskonfiguráció és stabil forráskulcs |
| 002 | `articles`, kanonikus URL, tartalomhash, publikálási/észlelési/feldolgozási idők, státusz és retry mezők |
| 003 | `summaries`, AI provenance, strukturált elemzési státusz; `keywords` és egyedi kulcsok |
| 004 | `clusters`, klasztertagság és felülvizsgálati mezők; `trends`, `speed_index`, idempotens history |
| 005 | `users`, biztonságos sessions, roles/entitlements, reset/verification tokenhash és naplók |
| 006 | `daily_reports`, `videos`, `video_views`, `video_access_logs` kompatibilitási séma, MVP-n kívül |
| 007 | `watchlists`, `watchlist_terms`, `article_matches`, értesítési outbox/delivery |
| 008 | `subscriptions`, `billing_events`, usage/cost ledger, webhook-idempotencia |

Az `articles` külön tárolja a kiadói publikálási időt, annak nyers forrásértékét/időzónáját, az első és utolsó észlelést, valamint a feldolgozás idejét. A régi `published_at = NOW()` jelentését nem örökítjük tovább. A summary-k nem írják át a hírek időbeli helyét. A szöveges forrásnevek mellett minden üzleti lekérdezés stabil `source_id`-t használ.

A felhasználói session véletlen, hash-elve tárolt tokennel, lejárattal és visszavonással készül. A szerep és a fizetési jogosultság külön fogalom. A PIN csak hash-elve tárolható, vagy az MVP-ből eltávolítható tulajdonosi döntés alapján. A fizetési szolgáltató eseménye nem közvetlenül egy kliens által írható `is_premium` bitet módosít, hanem auditálható előfizetésből képzett entitlementet.

### Seed adatok

A seed generátor determinisztikus, újrafuttatható és kizárólag fiktív adatokat hoz létre. Minden cím, domain (`example.test`), személy és cég fiktív jelölést kap. Tervezett csomag: 7 tesztforrás, 80–150 cikk több időponttal és státusszal, összefoglalók, kulcsszavak, 10–15 eseményklaszter, statisztikai adatok, 3 felhasználói szerep és prémium/nem prémium esetek. Valódi email, URL, hírszöveg vagy régi felhasználói rekord nem kerül a seedbe.

Kötelező seedtesztek: kétszeri futás nem dupláz; törlés csak kifejezett teszt-reset parancsnál történik; production környezetben a seed/reset parancs megtagadja a futást; migráció friss üres DB-n végigmegy; mentés-visszaállítás után a migrációs checksum egyezik.

## 5. Egységes hibajegyzék

Becslés: fejlesztőnap, egy tapasztalt full-stack fejlesztővel. A tételek átfednek; nem összeadandó projektbecslés. P0 blokkolja az első nyilvános indulást; P1 blokkolja a fizetős pilotot; P2 minőség/üzemeltetés.

| ID | Pri. | Érintett fájlok/modulok | Probléma | Javítás | Kötelező teszt és elfogadás | Függőség | Nap |
|---|---|---|---|---|---|---|---:|
| SEC-01 | P0 | `app/api/auth/*`, `app/api/user/*`, `video-server.js` | A session cookie nyers felhasználó-ID, hamisítható | Hash-elt, véletlen szerveroldali session, lejárat/revokáció, közös helper | Hamis/lejárt/más user cookie minden védett műveletnél 401/403; logout visszavon | DB-005 | 3–5 |
| SEC-02 | P0 | `clear-summaries`, `ai-clean`, `maintenance`, `summarize*`, `fetch-feed`, thumbnail route | Védtelen destruktív vagy költséges végpontok | Worker/admin auth és RBAC; GET ne írjon; belső route-ok izolálása | Anonim és normál user nem indíthatja; admin/worker auditálva igen | SEC-01 | 2–4 |
| SEC-03 | P0 | `lib/db*`, pipeline, API-k, forecast, autohirek | Root DB és beégetett jelszó-helyőrző sok fájlban | Egyetlen DB config/pool, env-validáció, külön minimális jogú DB userek, rotáció | Titok nélkül fail-fast; repo scan nem talál credentialt; jogosultsági teszt | ENV-01 | 2–3 |
| SEC-04 | P0 | `app/api/summaries/route.ts` | Keresési szöveg SQL-be interpolálódik | Paraméteres LIKE/full-text adapter, bemenet- és limitvalidáció | Apostrophe/backslash/payload teszt nem módosít lekérdezést; helyes találat | DB-002 | 1–2 |
| SEC-05 | P0 | `app/api/analyze/route.ts`, scraper | Felhasználói URL SSRF-et okozhat | Protokoll/host/IP/redirect ellenőrzés, egress-szabály, méret/timeout | localhost, metadata, private IPv4/IPv6 és redirect blokkolt | — | 2–4 |
| SEC-06 | P0 | `video-server.js`, `app/hirado/page.tsx` | Debug bypass és beégetett aláíró fallback | Bypass eltávolítás, kötelező secret, entitlement közösítése | `debug=true` nem ad hozzáférést; hiányzó secret leállítja a szolgáltatást | SEC-01 | 1–2 |
| SEC-07 | P1 | `lib/security.ts`, insights kliensek | `NEXT_PUBLIC_UTOM_API_KEY` megosztott titkot tesz kliensbe | Session/entitlement alapú szerveroldali védelem, szolgáltatói kulcs csak szerveren | Bundle-ben nincs titok; prémium és nem prémium negatív tesztek | SEC-01 | 2–3 |
| SEC-08 | P1 | auth reset/verify, `test-email` | Nyers tokenek, eltérő jelszószabály, email-visszaélés | Tokenhash, atomikus egyszeri felhasználás, egységes policy és limiter | Ismétlés/lejárat/verseny sikertelen; teszt-email nem publikus | SEC-01, DB-005 | 2–4 |
| SEC-09 | P1 | user update, PIN route-ok | Nyers PIN és általános update mezők veszélyesek | PIN megszüntetés vagy hash; explicit DTO és külön változtatási endpoint | Jelszó/PIN nem írható profil endpointtal; DB-ben nincs nyers PIN | SEC-01 | 1–3 |
| SEC-10 | P1 | `generate-thumbnail`, ffmpeg | DB-útvonal shellbe kerül, auth nélkül | `execFile`, valós útvonal/ID allowlist, queue és auth | Shell metakarakteres útvonal nem hajt végre parancsot; párhuzam limitált | SEC-02 | 1–2 |
| SEC-11 | P1 | `lib/security`, auth/video limiterek | Memória-rate-limit és feltétlen proxyfejléc | Megbízható proxylista, közös tároló/DB limiter, szabványos válaszok | Több processz mellett is közös limit; hamisított header nem kerül előre | DB-005 | 2–3 |
| SEC-12 | P0 | `package-lock.json`, CI | Audit szerint kritikus/high sérülékenységek és eltérő toolverziók | Célzott dependency-frissítés, advisory reachability, lockfile és regresszió | Type/lint/test/build sikeres; nincs kezeletlen elérhető P0/P1 advisory | ENV-02 | 3–6 |
| ENV-01 | P0 | minden DB/útvonal konfiguráció | Linux hardcode-ok és részleges env-kezelés | Típusos konfigurációs modul, `.env.example`, offline feature flag | Hiányzó kötelező változó érthetően hibázik; mock mód kulcs nélkül indul | — | 2–3 |
| ENV-02 | P0 | package/tsconfig/CI/workflows | Nincs reprodukált install/build; CI verziók eltérnek; build job üres | Node/npm rögzítés, `npm ci`, typecheck/test/build scriptek, egységes CI | Tiszta checkoutból zöld CI, külső hívás nélkül | ENV-01 | 2–4 |
| DB-001 | P0 | új `db/migrations`, összes SQL-fogyasztó | Elveszett séma, nincs migráció | Verziózott MySQL 8 schema_migrations és baseline | Üres DB migrálható; második futás no-op; checksum védett | ENV-01 | 4–7 |
| DB-002 | P0 | articles/sources/summaries/keywords | Mezőnév-, default- és forráskonvenciók ütköznek | Kanonikus séma, kompatibilitási adapter/migráció, indexek | Repository SQL contract tesztek; FK/UNIQUE megsértése elutasított | DB-001 | 4–7 |
| DB-003 | P1 | `daily_reports`, hirado API | `created_at` és `report_date` eltér | Egy kanonikus jelentésdátum és kompatibilis olvasás | Seedelt napi jelentés írása/olvasása egyezik | DB-001 | 1–2 |
| DB-004 | P1 | új seed eszköz | Nincs biztonságos tesztadat | Determinisztikus, idempotens, csak fiktív seed | Kétszeri futás egyező; production guard; nincs valódi domain/email | DB-001–003 | 2–3 |
| DB-005 | P0 | users/sessions/tokens/logs | Hiányzó biztonságos felhasználói séma | Sessions, tokenhash, szerepek és entitlements migráció | FK, lejárat, revokáció és audit integrációs teszt | DB-001 | 2–4 |
| PIPE-01 | P0 | `pipeline/cron.js`, scraper | Skipped/failed cikk végül done lehet | Típusos lépéseredmény és csak teljes sikerre done | Reprodukált audit-próba megfordul: failed nem lesz done | DB-002 | 1–2 |
| PIPE-02 | P0 | worker/pipeline | Végtelen tartós retry, nincs dead-letter | Próbálkozásszám, backoff, végleges hiba, kézi replay | N próbálkozás után failed; újraindítás nem nullázza | DB-002 | 2–4 |
| PIPE-03 | P0 | worker/pipeline | Promise-race nem szakítja meg a háttérműveletet; nincs lease | AbortSignal, atomikus claim, lease/heartbeat és recovery | Két worker nem dolgozza fel ugyanazt; crash után visszavehető | PIPE-02 | 3–5 |
| PIPE-04 | P1 | keywords/trends/summaries | Részleges és nem idempotens írások | Lépés-checkpoint, tranzakció/idempotenciakulcs, egyedi index | Ismételt feldolgozás nem dupláz; köztes hiba után konzisztens | DB-002, PIPE-03 | 2–4 |
| TIME-01 | P0 | feed route-ok, schema, stats | `published_at=NOW()` összekeveri publikálást és észlelést | Feed-dátum nyers + UTC, first/last_seen, processed_at külön | Fixture pubDate és first_seen pontos; hiányzó pubDate NULL és jelölt | DB-002 | 2–4 |
| FEED-01 | P1 | fetch-feed, receive-feed, 444 workflow | Soros források, egy elem hibája megszakíthat feedet; hibás workflow útvonal | Forrásonkénti adapter/timeout/result, fixture teszt, workflow javítás | Egy hibás elem mellett többi bekerül; offline fixture sikeres | TIME-01 | 3–5 |
| FEED-02 | P1 | URL/hash kezelés | Csak pontos URL-deduplikáció; nincs frissítés/verzió | Kanonizálás, tartalomhash, article_versions vagy dokumentált overwrite | Tracking paraméter nem dupláz; változás verziózott | DB-002 | 2–4 |
| AI-01 | P0 | `aiClient`, prompt modulok | Nincs egységes schema-validáció, usage/provenance és mock | Provider interfész, strukturált schema, usage ledger, mock provider | Offline teljes pipeline determinisztikus; hibás válasz typed error | DB-002 | 3–5 |
| AI-02 | P1 | clickbait/sentiment | Hibás AI-válasz 0/semleges érvényes adatként mentődik | Kötelező mezők/tartományok, unknown/error státusz | Audit invalid válasza nem ment pontszámot; retry véges | AI-01 | 1–2 |
| AI-03 | P1 | summarizers/category/title/keyword | Többszörös hívások és gyenge cache költséget növelnek | Tartalomhash+promptverzió cache, összevonási kísérlet, budget | Azonos input nem hív újra; költséglimit leállít | AI-01, PIPE-04 | 2–4 |
| AI-04 | P1 | clickbait UI/API | Skála, 45-ös küszöb és „consistency” nincs kalibrálva | Definíció, provenance, magyarázat/uncertainty, címkézett értékelés | Címkézett mintán előre rögzített mérőszám teljesül | AI-02 | 4–8 |
| CLU-01 | P1 | embedding/cluster | Éjfélhatár, sorrend, párhuzamos klaszter és nincs merge/review | Időablakos candidate search, determinisztikus assignment, review | ≥300 címkézett pár; precision cél ≥90%, recall közölve | TIME-01, AI-01 | 5–9 |
| SPD-01 | P1 | updateSpeedIndex, API | Nullakésés és >240 perc kizárása, ismételt history, hibás first_source | Idempotens esemény-forrás mérés, módszertan/mintaszám, UTC | Ugyanaz a futás nem dupláz; fixture rangsor helyes | CLU-01, TIME-01 | 3–5 |
| SRCH-01 | P1 | summaries API/UI | Szűrők nem mindig kombinálhatók, today lapozatlan | Közös query builder/DTO, stabil lapozás és rendezés | Dátum+forrás+kategória+q kombinációk és határok tesztelve | SEC-04, DB-002 | 2–4 |
| STAT-01 | P1 | trends/spike/insights | 24h szűrőket ignorál; COUNT/frequency és spike jelentés hibás | Egyértelmű metrika, SQL aggregáció és baseline; módszertani címkék | Fixture várható aggregátumai egyeznek | TIME-01, DB-002 | 4–7 |
| PERF-01 | P2 | insights/widgetek | Sok 60 mp-es lekérdezés, LIKE/DATE/LOWER indexbarátságtalan | Összevont endpoint/cache, normalizált oszlopok, EXPLAIN | 100k seed/load adaton p95 cél és query budget teljesül | SRCH-01, STAT-01 | 3–6 |
| PREM-01 | P0 | premium UI, auth, user API | `is_premium` nem megbízható entitlement, nincs fizetési életciklus | Subscription/billing esemény, egységes entitlement service | Lejárat/lemondás/webhook replay teszt | SEC-01, DB-005 | 4–7 |
| PREM-02 | P1 | új billing API/UI | Checkout, webhook, számlázás hiányzik | Szolgáltatói sandbox integráció, idempotens webhook, audit | Sandbox vásárlás aktivál; ismétlés nem dupláz; refund/failed kezelt | PREM-01, tulajdonosi választás | 5–9 |
| MON-01 | P1 | új watchlist/notification/report modul | Nincs ügyfélspecifikus figyelés és értesítés | Watchlist, matching, outbox, email, unsubscribe | Saját watchlist izolált; értesítés egyszer; retry és leiratkozás működik | SEC-01, DB-002 | 8–14 |
| EXP-01 | P1 | új export/API | Nincs professzionális export vagy ügyfélkvóta | CSV sanitization, mező/jogosultság/limit; később API keys | Formula-injection semleges; tenant-adat nem szivárog; limit működik | MON-01 | 3–6 |
| VID-01 | P2 | hirado/video/autohirek | Hozzáférés-, séma-, fájlútvonal- és üres DB hibák | MVP-ben off; később külön hardening és storage adapter | Feature off mellett build zöld; későbbi E2E jogosultsági teszt | SEC-06, DB-003 | 4–8 |
| FRC-01 | P2 | forecast | 48h adat vs 7 nap prompt, destruktív csere, nincs validáció | MVP-ben off; baseline, staging swap és schema-validáció | Hat pont, nemnegatív, korábbi forecast hiba esetén megmarad | TIME-01, AI-01 | 3–6 |
| OPS-01 | P0 | új backup/runbook/CI | Nincs bizonyított backup/restore és rollback | Automatizált backup, külön restore-próba, migrációs runbook | RPO/RTO célon belüli helyreállítás; app rollback DB-t nem töröl | DB-001, ENV-02 | 3–5 |
| LEG-01 | P0 | forrásadapterek, termékfeltételek | Forrásjogok és scraping feltételei nem igazoltak | Forrásonkénti jogi/üzleti döntési napló és engedélyezett mód | Csak jóváhagyott forrás aktív; export/API terjedelem dokumentált | Tulajdonos+jogi szakértő | külső |

## 6. Mérföldkövek és kilépési feltételek

### A. Biztonságos fejlesztői környezet

Kimenet: WSL2-alapú reprodukálható install, mock/offline mód, `.env.example`, zöld helyi és CI type/lint/unit/build. Kilépés: nincs külső hívás vagy titokigény az alapindításhoz; a dependency P0/P1 tételek kezelési döntése dokumentált.

### B. Új, működő adatbázis

Kimenet: migrációs runner, 001–006 alapmigráció, idempotens fiktív seed, backup/restore runbook. Kilépés: üres DB migrálható, seedelt app olvas/ír, a restore-próba sikeres.

### C. Helyi híroldal és kereső

Kimenet: seedelt hírlista, cikkoldal, kombinálható kereső/szűrők, stabil lapozás. Kilépés: kötelező UI/API/integrációs tesztek zöldek, nincs SQL-injekció.

### D. Stabil AI-alapú hírgyűjtés

Kimenet: fixture feed adapterek, atomikus worker, helyes időadat, mock AI, majd külön engedéllyel limitált staging OpenAI. Kilépés: idempotens feldolgozás, véges retry, mérhető token/költség, költségstop.

### E. Pontos hírelemzések és statisztikák

Kimenet: validált AI-schema, címkézett klaszter/clickbait minta, korrekt trend/speed index és módszertani címkék. Kilépés: előre rögzített minőségi küszöbök teljesülnek; ellenkező esetben a funkció kísérleti marad.

### F. Biztonságos felhasználói rendszer

Kimenet: session, regisztráció, login/logout, reset, email-ellenőrzés, szerepek és entitlement. Kilépés: negatív jogosultsági tesztek, CSRF/rate-limit/session revokáció zöld.

### G. Prémium előfizetési funkciók

Kimenet: mentett figyelések, email/napi riport, CSV, sandbox fizetés, előfizetés-életciklus. Kilépés: tenant/adatizoláció, webhook replay, lemondás/lejárat, értesítési deduplikáció zöld.

### H. Éles indulás előtti teljes ellenőrzés

Kimenet: staging, terhelés, biztonság, backup/restore, monitoring, jogi és üzleti kapu. Kilépés: nincs nyitott P0; elfogadott P1-lista; RPO ≤24 óra, RTO ≤4 óra; p95 keresés ≤1 s a rögzített tesztkészleten; feldolgozási siker ≥98% a feldolgozható mintán; legalább három fizető pilotpartner vagy külön tulajdonosi döntés.

## 7. GitHub-kompatibilis munkafolyamat

1. A `main` kiadási ág. Közvetlen fejlesztés és automatikus push nincs.
2. A mostani integrációs ág `develop/utom-recovery`. Minden napi munkacsomaghoz innen rövid `codex/...` vagy csapat által elfogadott feature ág nyílik, ha párhuzamos fejlesztés indul; egyfejlesztős helyreállításnál a mérföldkő-commitok közvetlenül ezen az ágon is készülhetnek.
3. Minden commit egy lezárt, tesztelt logikai egység. Üzenetformátum: `type(scope): konkrét eredmény`, például `fix(auth): replace raw user cookie with server sessions`.
4. Commit előtt: `git status`, célzott diff, titokszkennelés, formatter/lint/typecheck/teszt/build a munkacsomag szerint. Sikertelen kötelező ellenőrzés esetén nincs kész commit.
5. Távoli fetch/pull/push és PR csak tulajdonosi jóváhagyással. Force push tiltott. Main merge külön jóváhagyással, zöld CI után.
6. A migráció és a kompatibilis alkalmazáskód együtt kerül verzióba. Destruktív migráció csak mentés + restore-próba + külön jóváhagyás után.
7. A rollback alapelve: alkalmazás visszaállítása egy korábbi tagre/commitra, az adatbázis külön, előre dokumentált kompatibilitási lépéssel. Alkalmazás-rollback soha nem futtat automatikus DB resetet vagy seedet.
8. Kiadási jelölés csak ellenőrzött mérföldkőn: például `recovery-a`, később szemantikus verzió. A pontos tag létrehozása külön tulajdonosi utasításra történik.

### Tervezett CI

- `quality`: checkout, rögzített Node, `npm ci`, formatter check, lint, typecheck, unit tesztek.
- `build-offline`: mock env, Next build külső hálózati vagy DB-módosító mellékhatás nélkül.
- `db-integration`: MySQL 8 service, migráció friss DB-n, seed, integrációs teszt, második migráció no-op.
- `security`: dependency audit policy, secret scan és később SAST; találat nem kerül automatikus „force fix” folyamatba.
- `e2e`: a C mérföldkőtől seedelt offline alkalmazáson böngészős smoke teszt.

## 8. Tulajdonosi közreműködés és jóváhagyási pontok

| Pont | Szükséges döntés / adat |
|---|---|
| Távoli Git | Fetch/pull/push és első PR engedélyezése; branch protection beállítása |
| Fejlesztői környezet | WSL2/Ubuntu telepítés lehetősége, rendelkezésre álló RAM/tárhely, adminjog |
| Titkok | Régi DB/video/API/SMTP titkok rotációja; új értékek biztonságos csatornán, nem chatben vagy Gitben |
| Adatbázis | Annak végleges megerősítése, hogy nincs használható dump/backup; ha van, csak read-only vizsgálatra átadás |
| Források | Engedélyezett forráslista, RSS/scraping feltételek és a külső 444 worker tulajdonjoga |
| Termék | PIN megtartása vagy megszüntetése; videó/TTS/forecast későbbi prioritása; első pilot célcsoport |
| Fizetés | Szolgáltató, árak, pénznem, próbaidő, számlázási/adózási folyamat |
| Külső hívások | Élő feed, OpenAI, SMTP és fizetési sandbox első engedélyezése külön kapuknál |
| Indulás | Staging és production telepítés, domain/DNS, jogi szövegek és pilot elfogadása |

## 9. Első konkrét fejlesztési feladat

A következő jóváhagyott munkacsomag: **A1 – reprodukálható offline fejlesztői alap**. Tartalma: Node-verzió rögzítése, `.env.example`, típusos konfigurációs modul, `AI_PROVIDER=mock` és `FEED_FETCH_ENABLED=false` alapértelmezés, teszt/typecheck scriptek és egységes CI-váz. Ekkor még nem készül éles DB és nem indul külső hívás. Az A1 csak akkor tekinthető késznek, ha tiszta környezetből telepíthető és a build sem próbál DB-t, feedet, SMTP-t vagy OpenAI-t elérni.

A részletes napokra bontást a [napi terv](UTOM_DAILY_PLAN.md), a végrehajtás tényállapotát a [progress napló](UTOM_PROGRESS.md) tartalmazza.
