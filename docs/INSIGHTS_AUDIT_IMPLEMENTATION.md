# UTOM Insights – megvalósítási jelentés

> A 2026-10-15 continuation aktuális eredményei a dokumentum végi MYSQL_ACCEPTANCE / FINAL_TEST_GATE fejezetekben vannak. Az alábbi első futás eredményei történeti checkpointot rögzítenek, nem írják felül a későbbi valódi MySQL-próbát.

Frissítve: 2026-10-15. Branch: develop/utom-recovery.
A meglévő dashboardon végzett munka; nincs commit, push vagy deploy.

## IMPLEMENTED

1. Közös publication-alapú, félig nyitott [start,end) ablak: gördülő 24h/7d/30d/90d. UTC SQL-idők, explicit Europe/Budapest megjelenítés. A publikálás, summary-feldolgozás és clusterkezdés külön mező.
2. Közös quality réteg: jogosult/elemzett/hiányzó, teljes/részleges/nincs adat, 20 alatti mintajelzés, utolsó mérés kora. A nulla nevező nem százalék.
3. Jelenlegi és előző azonos hosszúságú ablak: maximum három mintával alátámasztott kiemelés. Hangulatváltozás százalékpontként és mindkét mintával.
4. Növekvő és csökkenő kulcsszólista, nulla előzmény esetén „Új”.
5. Snapshothoz kötött, lapozható bizonyítéklista ugyanazon szűrésből. Korábbi ablak külön; elveszett cache esetén 410, nem újraszámolt bizonyíték.
6. Utolsó teljes óra aktivitása, hasonló budapesti napszak/hétköznap történeti mediánja és MAD. Minimum minták, több forrás és feldolgozási késés feltételei; azonos ablakhoz stabil signalId.
7. Források clickbait-átlaga és változása, minták, elsőként megfigyelt/követő clusterek, medián megjelenési késés. A követés nem plágium.
8. URL category/source/keyword/cluster szűrők; kattintható diagramjelmagyarázat és forrás. A kategóriaoldal is megőrzi a közös szűrőket, a snapshotot és a lapozást.
9. Kulcsszó-életciklus a választott ablak négy részéből; szabályalapú megfigyelés, nem bizonyított csúcspont.
10. Több forrásból felfutó meglévő clusterek; opcionális V2 eseménytagság csak külön kapcsoló és globális V2 engedély mellett.
11. Feldolgozási hullám elkülönítése, cikk/cluster szám, forrásterjedési idővonal, azonos cluster friss forráshangulata, saját előző 30 napos kategóriarészarány, rendszeres források hiányjelzése. Meglévő V2 source-comparison numerikus állításai attribúcióval és időbeli hatállyal; nincs automatikus igazságnyertes.
12. Runhoz kötött, atomikusan publikált forecast. Running/succeeded/partial/failed; csak succeeded olvasható aktuálisként. Korábbi siker megmarad. GeneratedAt/validUntil/freshness; lejárt pontok nem frissként jelennek meg.
13. Determinisztikus budapesti órás medián baseline; 28 napos előzmény, 7 nap walk-forward visszamérés, legalább 30 hibamintából intervallum. Tényleges érték/error külön tárolható; értékelés legalább 24 órás türelmi idővel.
14. Determinisztikus, input-hash/model-version/idő/bizonyítékhivatkozás alapú leíró magyarázat. Nem állít okot és nem hív AI-t.
15. Közös bounded single-flight snapshot SQL/cache, nincs külön teljes SQL minden kártyához. Részletes cluster-idővonalak maximum 20 csoport, megjelenített teljes elemszámmal; konkrét cluster szűrhető.

## API_CHANGES

- Új `/api/insights/intelligence`, prémium proxyn át `/api/premium-insights/intelligence`.
- Paraméterek: period, category, source, keyword, cluster, asOf, page, phase. Ismeretlen paraméter 400; lejárt snapshot 410; DB/capacity probléma 503.
- Kategória API közös snapshotból dolgozik; 24h támogatás; hiányzó summary számít a populációba, de nincs hamis /cikk link.
- Forecast és forecast-status új run tárolóból olvas. Forecast csak category szűrést támogat; a UI a többi szűrőnél ezt kifejezetten jelzi.
- Snapshot cache process-local, legfeljebb négy end érték és 10 perc TTL; eviction is 410-et okozhat.

## DATABASE_CHANGES

`061_insights_forecast_snapshots.sql`: két additív tábla, insights_forecast_runs és insights_forecast_points. UTC DATETIME órás célidő. Runhoz kötött PK/FK.
Régi DATE-pontokat nem másol át feltételezett órára, nem törli a régi táblát.
Migráció NEM alkalmazva ebben a munkában. A forecast bekapcsolásának feltétele a migráció helyi/staging validációja és alkalmazása.
Nincs spekulatív új teljesítményindex.

## UX_CHANGES

A dark dashboard megmaradt. Elöl a változás, quality és movers; utána a korábbi grafikonok, majd forrás/esemény részletek. Loading/error/empty/malformed elkülönítve. Az új panelek külön render-hibahatárt kaptak. A kategóriaoldalnak tényleges előző/következő lapozása van.
A source-focus az összes kategóriát, a source-coverage a teljes mintát használja; ezt a felület jelzi.

## DATA_QUALITY

A null mérés nem nulla. Hiányzó summary nem tünteti el a publikált cikket. 50 000 rekord felett a snapshot hibával leáll; nem mutat csonkolt populációból teljes statisztikát.
A feldolgozási szám legfeljebb 180 napja publikált cikkekre terjed ki, ezt a felület jelzi.
A frissesség az utolsó mért cikk ideje, nem a forrás egészségének bizonyítéka.

## FORECAST

A régi LLM futtató helyett statisztikai baseline fut. Nincs forecast törlés az új eredmény előtt. Részleges kategóriakészlet nem lehet succeeded. DB írási hiba rollbacket és csak a saját run hibajelzését okozza.
A már commitolt forecast sikerét nem írja felül a későbbi visszamérés hibája. Ekkor evaluationStatus=failed; a következő futás újra próbálja az értékeletlen pontokat.
Az előző LLM és az új baseline korrekt órás összevetése nem áll rendelkezésre: a legacy DATE nem őrizte meg az órákat. A UI nem állít LLM-fölényt.

## TESTS

- `node --test tests/unit/insights*.test.cjs tests/unit/forecast*.test.cjs tests/unit/ui-user-regressions.test.cjs`: **70/70 PASS**, 0 skip.
- `npm run typecheck`: **PASS**.
- Célzott ESLint: **0 error, 17 warning** (any és maradt unused deklarációk).
- `npm run check:imports`: **FAIL** archivált `scripts/agents/runs/.../backup`, `run-start-backup`, `rejected-run-state` research hivatkozások miatt. Ezeket ez a task nem módosította. Nem állítunk globális import PASS-t.
- MySQL integration: **NOT EXECUTED**. Nem találtunk helyi MySQL listenert a 3306/3307/3308 portokon. Nincs valódi DB acceptance állítás.
- Célzott új regressziók: DST/ablak, missing summary, zero baseline, backlog, drilldown count, insufficient anomaly, lifecycle, atomic forecast/partial/rollback, post-commit evaluation failure, route validation/auth/410, malformed fetch, single-flight cache, bounded cluster payload és szűrt hozzáférés.
- Teljes offline suite nem futott.

## BUILD

`npm run build`: **PASS**, Next 16.3.6, **76/76** statikus oldal. Utolsó futás a payloadkorlát módosítása után is sikeres.

## BROWSER

Headless Windows Edge, külön E:/Temp/utom-insights-audit-browser tesztprofil, localhost:3099. Valódi render, de interceptált fixture API: nem production és nem valódi DB acceptance.
1920/1440/900/390 px: renderelt grafikonok, nincs oldalirányú túlcsordulás. Loading/empty/500/malformed ágak renderelve; nincs megfigyelt Runtime.exceptionThrown. 7d/30d/90d váltás a közös intelligence végpontot hívja.
A böngészős futás a végső payloadcsökkentés előtti builden történt; az utána változott cluster-listacímke/payloadkorlát unit/build validált, böngészőben még nem ismételt.
Képek és futási napló: E:/Temp/utom-audit-*.png, E:/Temp/utom-audit-browser-results.txt (nem commitanyag).

## PERFORMANCE

Egy 180 napra korlátozott SQL max 50 001 sorral; legutóbbi, asOf előtti summary determinisztikusan. Ugyanazon end párhuzamos olvasása egy DB query: célzott teszt bizonyítja.
Szintetikus 50 000 sor / 90d, helyi JS mérés: előtte 2961 ms / 4 087 609 byte; utána 450 ms / 508 774 byte. Nem DB benchmark és nem production latency-garancia. A cluster aktuális tagságkeresése Set-alapú, az idővonal-payload korlátos.
Valódi EXPLAIN/index és DB response-time mérés hiányzik; MySQL környezet kell hozzá.

## AI_COST

Új AI/provider-hívás: **0**. A tesztelés alatt fizetős AI-hívás: **0**.

## KNOWN_LIMITATIONS

- MySQL 061 migration/runtime acceptance és query plan még nem igazolt.
- A folyamatonkénti snapshotcache több worker/restart esetén 410-et adhat. Nem osztott snapshot-tároló.
- Az article sentiment/cluster mezők jelenlegi állapotból származnak; ez nem teljes történeti versioned asOf reconstruction.
- A statisztikai baseline üres óráit a megfigyelt előzményen belül nullának veszi; adatgyűjtési kiesés torzíthat. Valós backtest előtt nincs pontossági állítás.
- V2 event membership automatikus listája alapértelmezetten kikapcsolt; lefedettségmérés és UTOM_INSIGHTS_V2_EVENTS=1, valamint globális V2 flag kell hozzá.
- A V2 numerikus összehasonlítás meglévő claim/evidence számlálókra és ID-kre épül, nem új evidence-adatbázis.
- A teljes korábbi kutatási importbacklog nem része ennek a javításnak.

## NOT_IMPLEMENTED

- Fizetős vagy lokális LLM magyarázóhívás (opcionális; helyette determinisztikus leírás).
- Nem rekonstruálható legacy órás LLM-visszamérés.
- Production/staging migráció, deploy és éles adatminőség-engedélyezés.

## PREVIOUS RESUME (végrehajtva részben; lásd az új checkpointot)

A kód és a célzott ellenőrzések elkészültek. A valódi adatbázisos lezáráshoz: helyi eldobható MySQL-en 061 migration, empty/partial/success/expired run olvasás-írás, aktuális schema-oszlopok és SQL-plan ellenőrzése. Ezután valós adatú end-to-end Insights acceptance; V2 kapcsoló csak igazolt tagsági lefedettséggel. Ne állítsd ezt már elvégzettnek.

## FILES_CHANGED
- `app/api/forecast-status/route.ts`
- `app/api/insights/category/[category]/route.ts`
- `app/api/insights/forecast/route.ts`
- `app/api/insights/intelligence/route.ts`
- `app/insights/category/[category]/page.tsx`
- `components/InsightsCharts.tsx`
- `components/InsightsDashboard.module.css`
- `components/InsightsDashboard.tsx`
- `components/InsightsIntelligence.tsx`
- `components/InsightsSourceIntelligence.tsx`
- `db/migrations/061_insights_forecast_snapshots.sql`
- `docs/INSIGHTS_AUDIT_IMPLEMENTATION.md`
- `forecast/baseline.js`
- `forecast/buildForecastPrompt.js`
- `forecast/forecast.js`
- `forecast/snapshot-repository.js`
- `hooks/useForecast.ts`
- `hooks/useInsightsSnapshot.ts`
- `lib/insights-intelligence.js`
- `lib/insights-snapshot.ts`
- `lib/insights-v2.ts`
- `lib/premium-insights-path.js`
- `tests/helpers/insights-loader.cjs`
- `tests/unit/forecast-response-contract.test.cjs`
- `tests/unit/forecast-status-connection.test.cjs`
- `tests/unit/forecast-status-invalid-date.test.cjs`
- `tests/unit/insights-dashboard-period-api.test.cjs`
- `tests/unit/insights-forecast-baseline.test.cjs`
- `tests/unit/insights-forecast-transaction.test.cjs`
- `tests/unit/insights-intelligence.test.cjs`
- `tests/unit/insights-snapshot-api.test.cjs`
- `tests/unit/insights-ux-regressions.test.cjs`

# CONTINUATION – 2026-10-15

## CONTINUATION_IMPLEMENTED

A Windows fagyás utáni folytatás soros tesztfuttatással történt. A WSL Ubuntu-24.04 MySQL 8.0.46 szolgáltatását használtuk külön `utom_insights_20261015_test` adatbázissal. A korábbi „nincs MySQL” megállapítás helyett most valódi, lokális SQL-bizonyíték van. A tesztadat technikai fixture, nem élő hírkorpusz.

Valódi hiba: a 061 két CREATE TABLE utasítást tartalmazott, de a migration runner fájlonként csak egyet enged. A runner elutasítását reprodukáltuk. Javítás: 061 létrehozza a runs táblát, az új 062 a points táblát. A runner szabálya változatlan; nincs destructive migration.

A régi kategória-regressziók konkrét, megszűnt SQL-stringeket kerestek. Az érintett teszteket runtime route/populáció/validáció/sorrend ellenőrzésre cseréltük, megőrizve a mögöttes biztonsági célokat. A schema-latest tesztek 062-re frissültek; a történeti 060 retention-teszt változatlan.

A WSourceDuplication felületi elnevezése Témakövetési arány; a modal és tooltip nem állít átvételt/plágiumot/AI-eredetiségvizsgálatot. Belső API-mezők változatlanok.

## MYSQL_ACCEPTANCE

**PASS – célzott technikai acceptance: 13/13, 0 SKIP.**
Teszt: `tests/integration/mysql-insights-acceptance.test.cjs`.
Külön meglévő schema integration: `mysql-v2-schema.test.cjs` **1/1 PASS** (clean és régebbi baseline upgrade).
A teszt csak loopback és dedikált insights*_test DB-n enged destructive fixture-resetet. Productionhoz nem csatlakoztunk.

## MIGRATION_061

**PASS: baseline 001–060 → 061–062**, valamint tiszta teljes migráció és ismételt apply üres változáslistával. Két tábla összesen 19 oszlop. target_at DATETIME; összetett PK (run_id,category,target_at), run FK. A legacy forecast DATE-tábla és a beleírt fixture sor megmaradt; nincs órákra kitalált adatmásolás.
Az utolsó canonical schema most **062**. A két új migration még nem commitolt; productionra nem lett alkalmazva.

## FORECAST_ACCEPTANCE

**PASS**: 35 nap órás SQL-fixture → 6 jövőbeli órás pont; 168 walk-forward hibaminta; kalibrált sáv. Running/partial/failed nem váltja le az előző sikerest. Külön connection az új transaction commitjáig az előzőt olvassa, utána az újat. Tényleges MySQL NOT NULL írási hiba után nincs fél pontkészlet. Evaluation SQL-hiba nem rontja el a már commitolt succeeded runt. Lejárat fresh helyett expired. 26 órás pont kap actual/error értéket, 24 órás még nem.
Ez determinisztikus technikai fixture; nem valódi forecast pontosságmérés.

## INSIGHTS_DB_ACCEPTANCE

**PASS az integrációs teszt felsorolt eseteire**: 24h/7d/30d/90d, azonos count/evidence populáció, kategória/forrás/kulcsszó/cluster szűrők, hiányzó summary, NULL sentiment/clickbait, current/previous keyword mozgás, nulla baseline, backlog, UTC/DST dátumok, evidence lapozás, cache single-flight/eviction/restart, invalid 400, expired 410, SQL-hiba 503, 50 000 feletti capacity guard.
A route-kezelők test loaderből, valódi MySQL service-szel futottak; ez nem azonos a teljes HTTP/auth/böngésző lánc validációjával.

## QUERY_PLAN

Bizonyíték: `docs/INSIGHTS_MYSQL_ACCEPTANCE_EVIDENCE.json`.
840 soros technikai fixture: közös snapshot articles ALL + filesort; clusters és summaries PRIMARY eq_ref; summary-alquery uq_summaries_article_id eq_ref. Forecast history ALL + temporary + filesort. Az összes period/filter ugyanazt a 180 napos SQL-populációt használja, így nem hét külön SQL-terv létezik.
Nem került be új index: a kicsi, majdnem egészében releváns fixture teljes bejárása önmagában nem indokolja. Nagy, valós eloszlású korpusz EXPLAIN ANALYZE és tényleges rows-examined mérése továbbra nincs meg; a tervben szereplő rows becslés.

## PERFORMANCE

Az EXPLAIN + ismételt snapshot query együtt kb. 5–9 ms volt a 840 soros helyi fixture-en. Ez nem produkciós SLA, és nem izolált hálózati SQL-latencia. Az előző 50 000 soros JS-mérés külön technikai mérés marad.

## SNAPSHOT_CACHE

Single-flight, több end, legfeljebb négy snapshot, eviction és restart fail-closed: MySQL integration PASS. Pontosan 600 000 ms TTL: fake-clock unit PASS; lejárt pinned read nem indít automatikus új SQL-t, hanem snapshot_expired.
A repository runbookja (`docs/UTOM_V2_1/19_PRODUCTION_DEPLOY_RUNBOOK.md`) egy VPS-es systemd webfolyamatról ír. E modellben a process-local cache elfogadható rövid életű drilldownhoz, restart/eviction esetén 410 várható. A tényleges production process countot nem ellenőriztük. Több worker esetén route affinity vagy közös snapshot szükséges lehet; ilyet bizonyíték nélkül nem építettünk.

## V2_COVERAGE

A technikai fixture mérési pontján: 840 article, 0 event membership, coverage 0%. Ez nem a production coverage-e; a fixture nem futtatott V2 pipeline-t. Nincs mesterséges event feltöltés.
A kapcsoló OFF marad. Bekapcsolás előtt javasolt technikai minimum: reprezentatív friss korpuszon legalább 95% releváns tagsági lefedettség, 0 orphan/hibás membership, validálható cluster–event megfeleltetés és időbeli frissesség. A production küszöb elfogadása és mérése nincs ebben a körben igazolva. A 0 tagság miatt orphan-ráta százalék nem értelmezhető; nem jelentjük 100%-osan biztonságos V2-adatként.

## FINAL_BROWSER_ACCEPTANCE

**BLOCKED / NOT EXECUTED ezen a végleges builden.** A local webszerver indítását a tool automatikus policy ellenőrzése elutasította: `blocked by policy`. A tiltott művelet: localhost:3099 Next start a dedikált local teszt-DB beállításaival. Részletes indok nem érkezett. Nem próbáltuk megkerülni más shelllel vagy más indítóúttal.
Az előző kör desktop/tablet/mobile fixture-képei csak korábbi bizonyítékok. Nem állítunk végső browser PASS-t, sem valódi DB-s böngészős acceptance-t. A teljes kért 400/410/503/partial/low sample/Back-Forward/refresh interakciós mátrix még nyitott.

## NEW_MIGRATIONS

- 061_insights_forecast_snapshots.sql: runs, egy SQL statement.
- 062_insights_forecast_points.sql: points, egy SQL statement; FK a runs táblára.

## READY_FOR_COMMIT

**READY_FOR_COMMIT: NO**. A végső böngészős kapu blokkolt. A teljes általános offline suite fennmaradó hibáit lásd FINAL_TEST_GATE. Nincs commit/push/deploy.

## RESUME FROM HERE

1. A policy által elutasított localhost webindítás blokkolójának rendezése után a végső builden futtasd a teljes kért browser-mátrixot, legalább egy helyi MySQL-backed adatflow-val. Ne kerüld meg a tiltást.
2. Értékeld a FINAL_TEST_GATE-ben felsorolt, mostani Insights-módosításon kívüli offline hibákat; ne jelents globális PASS-t.
3. Reprezentatív nagyobb DB-eloszláson EXPLAIN ANALYZE/rows-examined és V2 coverage csak rendelkezésre álló megfelelő tesztkorpusszal. A kapcsoló addig OFF.

## FINAL_TEST_GATE

- Insights/forecast/UI/category/API/schema-readiness célzott unit: **89/89 PASS**.
- Valódi MySQL Insights integration: **13/13 PASS**, 0 SKIP.
- Meglévő MySQL schema integration: **1/1 PASS**, 0 SKIP.
- TypeScript: **PASS**.
- Végleges production build: **PASS, 76/76**. A terminológiajavítás már ebben a buildben van.
- Érintett production importok: **20 fájl, 0 hiányzó, PASS** (`scripts/check-changed-production-imports.cjs`).
- Teljes offline suite sorosan: **1030 teszt, 1024 PASS, 6 FAIL, 0 SKIP**. Nem globális PASS.
- A teljes más API-családokra is kiterjedő MySQL suite nem futott; ebben a körben az Insights és a schema integrációs tesztje futott.
- Final browser gate: **BLOCKED**, lásd FINAL_BROWSER_ACCEPTANCE.

Fennmaradó offline hibák:
1. premium-availability-contract.test.cjs
2. premium-entitlement-ui.test.cjs
3. premium-source-empty-state.test.cjs
4. trends-debug-theme-race.test.cjs
5. Premium page describes implemented value and keeps provider actions disabled
6. localhost layout nem tölt külső captcha vagy analitika scriptet explicit bekapcsolás nélkül

A Premium oldalak, Header/Profile/Settings, app/insights/page, TrendsFilters/TrendsDebug/ThemeSwitch és root layout a HEAD-hez képest változatlanok (git diff --quiet exit 0). A régi source-empty teszt konkrét, korábban már közös InsightsEmptyState-re cserélt szövegeket vár. Ezen általános történeti teszteltérésekhez ebben a körben nem készítettünk valótlan PASS-t vagy kikapcsolt tesztet.

## CONTINUATION_FILES_CHANGED
- `app/api/forecast-status/route.ts`
- `app/api/insights/category/[category]/route.ts`
- `app/api/insights/forecast/route.ts`
- `app/api/insights/intelligence/route.ts`
- `app/insights/category/[category]/page.tsx`
- `components/InsightsCharts.tsx`
- `components/InsightsDashboard.module.css`
- `components/InsightsDashboard.tsx`
- `components/InsightsIntelligence.tsx`
- `components/InsightsSourceIntelligence.tsx`
- `components/WSourceDuplication.tsx`
- `db/migrations/061_insights_forecast_snapshots.sql`
- `db/migrations/062_insights_forecast_points.sql`
- `docs/INSIGHTS_AUDIT_IMPLEMENTATION.md`
- `docs/INSIGHTS_MYSQL_ACCEPTANCE_EVIDENCE.json`
- `forecast/baseline.js`
- `forecast/buildForecastPrompt.js`
- `forecast/forecast.js`
- `forecast/snapshot-repository.js`
- `hooks/useForecast.ts`
- `hooks/useInsightsSnapshot.ts`
- `lib/insights-intelligence.js`
- `lib/insights-snapshot.ts`
- `lib/insights-v2.ts`
- `lib/premium-insights-path.js`
- `scripts/check-changed-production-imports.cjs`
- `tests/helpers/insights-loader.cjs`
- `tests/integration/mysql-insights-acceptance.test.cjs`
- `tests/integration/mysql-v2-schema.test.cjs`
- `tests/unit/api-insights-remaining-contract.test.cjs`
- `tests/unit/browser-product-contract.test.cjs`
- `tests/unit/category-insight-period-upper-bound.test.cjs`
- `tests/unit/category-insight-query-contract.test.cjs`
- `tests/unit/category-insight-trend-relation.test.cjs`
- `tests/unit/category-query-validation.test.cjs`
- `tests/unit/forecast-response-contract.test.cjs`
- `tests/unit/forecast-status-connection.test.cjs`
- `tests/unit/forecast-status-invalid-date.test.cjs`
- `tests/unit/insights-dashboard-period-api.test.cjs`
- `tests/unit/insights-forecast-baseline.test.cjs`
- `tests/unit/insights-forecast-transaction.test.cjs`
- `tests/unit/insights-intelligence.test.cjs`
- `tests/unit/insights-snapshot-api.test.cjs`
- `tests/unit/insights-ux-regressions.test.cjs`
- `tests/unit/production-preflight.test.cjs`

Célzott continuation ESLint: **PASS, 0 error / 1 warning** (meglévő img elem a WSourceDuplication komponensben). A korábbi nagyobb Insights ESLint-kör 0 error / 17 warning volt.


## FINAL_CLOSURE — 2026-10-16 (kanonikus végső checkpoint)

Ez a fejezet a korábbi 1024/1030 státusz folytatása; a korábbi eredmények történeti bizonyítékok.

### SIX_FAILURE_TRIAGE
Mind a hat korábbi bukás **B – elavult tesztelvárás**. Nem kellett production viselkedést megváltoztatni, tesztet kihagyni vagy hibát elrejteni.

| Teszt | Gyökérok | Megőrzött / erősített ellenőrzés |
|---|---|---|
| premium-availability-contract | Régi 5 gomb + redundáns aria-disabled + már nem létező támogatási input | Valós TSX: 4 ajánlatgomb mind natívan disabled, nincs onClick/form/aktív beviteli mező vagy checkout-link; elérhetetlenség közölve |
| premium-entitlement-ui | Jogosultsági kapu átkerült a page wrapperből az InsightsDashboard komponensbe | Valós komponens: loading, nincs session, non-premium, premium ág; page tényleg Dashboardot használ; megmaradt Header/Profile/Settings ellenőrzés |
| premium-source-empty-state | Négy egyedi régi üresállapot-szöveget közös periódusérzékeny komponens váltott | Mind az öt fogyasztó valós renderje: üres siker, 4 period, loading, HTTP-hiba stale adattal, success=false; Speed Index saját üres állapota |
| trends-debug-theme-race | A publikus filter panelből eltávolított debug komponenst kötelezőnek várta | Publikus filter render megtörténik debug nélkül; megmaradt sequence/status/abort guard ellenőrzés a debug és ThemeSwitch kódon |
| v21-final-product-contract / Premium | A natív disabled mellé a régi aria attribútumot követelte | Valós gombok mind disabled és nincs onClick; jelenlegi funkcióígéretek és tiltott fake funkciónevek ellenőrzése megmaradt |
| v21-localhost-adapters / layout | Már eltávolított reCAPTCHA root-layout kapcsolót követelt | Valós layout render: analytics undefined/false esetén nincs analytics script; true esetén van; nincs captcha script; többi adapterellenőrzés megmaradt |

Új közös tesztsegéd: `tests/helpers/render-ui.cjs`. A tényleges TSX-et fordítja és React szerver-renderrel vizsgálja; a külső integrációkat explicit helyettesíti. Ez nem valós böngészős acceptance.

### CURRENT VALIDATION
- Hat érintett tesztfájl: **13/13 PASS**.
- Teljes offline suite sorosan: **1030/1030 PASS, 0 FAIL, 0 SKIP**. Log: `E:\Temp\insights-closure-offline.txt`.
- TypeScript: **PASS**. Log: `E:\Temp\insights-closure-typecheck.txt`.
- Changed production imports: **20 fájl, 0 hiányzó, PASS**.
- Build / friss MySQL / célzott regresszió / ESLint: lezárva; a végleges kapulista alább található.

### FINAL_BROWSER_ACCEPTANCE
**BLOCKED_BY_TEST_ENVIRONMENT_POLICY**. A tulajdonos által engedélyezett egyszeri normál retry megtörtént: `npm run start -- --hostname 127.0.0.1 --port 3099`, explicit loopback tesztadatbázis-konfigurációval. A végrehajtási eszköz a folyamatindítás előtt `rejected: blocked by policy` választ adott, részletesebb indok nélkül. Más shell, indítási trükk vagy policy-megkerülés nem történt.

A végső builden a kért 1920/1440/900/390 viewport és interakciós mátrix nem futott; nem jelöljük PASS-nak. A korábbi fixture-browser bizonyíték nem egyenértékű a végső acceptance-szel.

### LIMITS / SCOPE
- V2 events továbbra is OFF: az explicit opt-in és validált tagsági lefedettség nincs meg; nincs mesterséges eseménypótlás.
- Témakövetési arány megfigyelési statisztika; nem másolás/plágium bizonyítéka és nem AI-minősítés.
- Process-local, korlátos snapshot cache; nem többgépes osztott cache. Az előrejelzés determinisztikus baseline, nem igazolt valós prediktív pontosság.
- Commit/push/deploy nem történt. Production és V2.2 research változatlan ebben a záró körben.

### FINAL GATE RESULTS — 2026-10-16
- Teljes offline: **1030/1030 PASS, 0 FAIL / 0 SKIP**.
- Hat triage fájl: **13/13 PASS**.
- Insights/forecast/category/UI célzott csomag: **89/89 PASS** (`insights-closure-targeted.txt`).
- MySQL Insights: **13/13 PASS, 0 SKIP**, MySQL 8.0.46, kizárólag elkülönített loopback adatbázison (`insights-closure-mysql.txt`).
- MySQL schema: **1/1 PASS, 0 SKIP** (`insights-closure-schema.txt`).
- TypeScript: **PASS**.
- Production build: **PASS, 76/76**, Next.js 16.3.6 (`insights-closure-build.txt`).
- Production import validation: **PASS, 20 fájl, 0 hiányzó import**.
- ESLint: **PASS, 0 error** az összes változott production/test/script JS/TS fájlon. A teljes célzott futás 22 warningot jelzett; az új teszt egy unused változóját eltávolítottuk és a teszt + ESLint újrafutott PASS-szal, így 21 fennmaradó warning. A többi warning nem ebben a záró körben keletkezett. Log: `insights-closure-lint.txt`.
- Final browser: **BLOCKED_BY_TEST_ENVIRONMENT_POLICY**, nem PASS.

A logok lokális könyvtára: `E:\Temp`. Tartós SQL-bizonyíték: `docs/INSIGHTS_MYSQL_ACCEPTANCE_EVIDENCE.json` (frissítve a mostani futásból).

### MIGRATIONS
Canonical latest **062**. A 061 és 062 fájl egyenként egy CREATE TABLE statement; a runner szigorítása változatlan. Valós MySQL: clean baseline → 060 → 061/062, újrafuttatás/idempotencia, 19 új oszlop, DATETIME órás target, összetett run/category/target kulcs és run FK ellenőrizve. A legacy forecast DATE rekord megmarad, nem konvertáljuk félrevezetően órás adattá. Nincs production schema-módosítás.

### CLOSURE FILE DELTA
Ebben a záró körben a korábbi production változásokon nem módosítottunk. Új vagy módosított ellenőrzési/dokumentációs fájlok:
- `tests/helpers/render-ui.cjs`
- `tests/unit/premium-availability-contract.test.cjs`
- `tests/unit/premium-entitlement-ui.test.cjs`
- `tests/unit/premium-source-empty-state.test.cjs`
- `tests/unit/trends-debug-theme-race.test.cjs`
- `tests/unit/v21-final-product-contract.test.cjs`
- `tests/unit/v21-localhost-adapters.test.cjs`
- `docs/INSIGHTS_MYSQL_ACCEPTANCE_EVIDENCE.json`
- `docs/INSIGHTS_AUDIT_IMPLEMENTATION.md`

A teljes, korábbi körökből fennmaradó implementáció fájljai a CONTINUATION_FILES_CHANGED szakaszban szerepelnek; ez a felsorolás annak kiegészítése, nem helyettesítése.

### CURRENT POSITION / NEXT ACTION / RESUME FROM HERE
- Kanonikus állapot: **READY_FOR_COMMIT: YES** a tulajdonos által megengedett környezeti browser-kivétellel; ez nem teljes böngészős vagy production acceptance.
- A hat offline bukás lezárva, nyitott reprodukált javítható hiba ebben a scope-ban: **0**.
- Minden futtatható kód/teszt kapu PASS. A legutolsó tesztváltozás kizárólag unused olvasás eltávolítása; annak regressziója és lintje újrafutott PASS-szal.
- **FINAL_BROWSER_ACCEPTANCE: BLOCKED_BY_TEST_ENVIRONMENT_POLICY**.
- Következő konkrét művelet: tulajdonosi review és Git checkpoint. Engedélyezett helyi szerverindítású környezetben a végső builden a 1920/1440/900/390 böngészős mátrix pótlása (állapotok, periódusok, filterek, URL/back/forward/refresh, evidence lapozás, overflow és console ellenőrzés). Nem kell újrakezdeni az Insights implementációt vagy a hat teszt triage-át.
- A lokális MySQL-t életben tartó, erre a körre indított segédfolyamat leállítva; más szolgáltatást nem állítottunk le.
- Branch: `develop/utom-recovery`. Commit/push/deploy: **nem történt**.

READY_FOR_COMMIT: YES

## PRODUCTION_SCREENSHOT_DATA_QUALITY_GATE — 2026-10-16

### DATA_PROVENANCE_RESULT

The screenshot-observed 30-day values (271 published articles, 7 sources, 269 uncategorized articles, 2 sentiment measurements and the sparse clickbait sample) cannot be attributed to a specific production pipeline generation from repository state alone. Production access was not used. A guarded, read-only diagnostic was added at `scripts/diagnose-insights-provenance.cjs`. It refuses to connect unless `UTOM_READONLY_DIAGNOSTICS=true`, starts a read-only transaction, reports publication/ingestion and summary time ranges, sources, category gaps, sentiment/clickbait coverage and processing states, then rolls the transaction back. Therefore the provenance result is: **UNVERIFIED UNTIL THE READ-ONLY SCRIPT IS RUN AGAINST THE INTENDED ENVIRONMENT**.

### CENTRAL QUALITY POLICY

The canonical UI policy lives in `lib/insights-quality.ts`:

| Metric | Minimum analyzed | Minimum coverage | Additional condition |
|---|---:|---:|---|
| Sentiment | 20 | 20% | at least 2 sources; timeline needs 3 measured points |
| Clickbait overall | 20 | 20% | at least 2 sources |
| Clickbait by source | 5 | 20% | evaluated per source |
| Category | 20 | 20% | at least 2 sources; unknown/empty is a coverage gap |
| Category sentiment | 10 | 20% | evaluated per category |
| Trend | — | — | at least 3 buckets |
| Keyword lifecycle | 10 mentions | — | insufficient states hidden |
| Propagation | 2 articles | — | a single article is not propagation |

When a gate is not met, the UI shows the analyzed/eligible coverage and a neutral “nincs elég adat” state. It does not publish a score, percentage, rank, trend or propagation conclusion.

### MISLEADING_METRICS_FIXED

- Sentiment KPI, donut and timeline are suppressed for a 2/271 sample.
- A 1/1 clickbait sample is not promoted into a source ranking; sample coverage remains visible.
- `ismeretlen`, empty, `unknown` and `n/a` are category quality gaps, not chart categories.
- Missing prior history no longer becomes a zero baseline, “new” mover or growth claim.
- Sparse category, trend and lifecycle panels display an honest coverage state.
- A one-article cluster no longer appears as a propagation pattern.
- V2 evidence controls and internal disable reasons are absent when V2 is disabled.

### LAYOUT_CHANGES

- Header owns period and global filters.
- Summary and movers use an 8/4 information row.
- Four KPIs precede a stable 3×2 analytics grid.
- Category sorting is local to the category section.
- Forecast is compact and follows category detail.

### ADVANCED_INTELLIGENCE

The advanced section has six mutually exclusive tabs: Hírciklus, Források, Clickbait, Kulcsszavak, Események and Lefedettség. Only the selected panel renders. Source information is compact, lifecycle lists are capped at ten qualified items, and propagation excludes one-article clusters.

### V2_UI

When `v2Events.enabled` is false, the V2 evidence interface is not rendered. No environment variable name or internal feature-flag reason is exposed to the user.

### KNOWN_LIMITATIONS

- Production provenance remains unverified until the guarded diagnostic is intentionally run against that environment.
- Browser screenshot acceptance could not be repeated in this turn because the available browser-control transport stopped before it could determine the active URL. No visual PASS is claimed.
- Thresholds protect presentation integrity; they do not repair missing upstream analyses.
