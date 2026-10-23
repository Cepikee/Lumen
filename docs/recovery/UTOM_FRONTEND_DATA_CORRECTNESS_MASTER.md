# UTOM frontend és adatkonzisztencia recovery master

Dátum: 2026. október 23.  
Branch: `develop/utom-recovery`  
Scope: főoldal, Insights, Trends, ezek publikus API-kontraktusai és megjelenítési logikája.  
Production adatbázis, VPS, pipeline, feature flag, fizetős provider és deployment: **nem érintett**.

## Állapotjelölések

- `OPEN`: ismert, még nem javított hiba.
- `INVESTIGATING`: a kiváltó ok vizsgálata folyamatban van.
- `FIXED`: a forráskód javítva, de a végleges környezetben még nincs elég bizonyíték.
- `VERIFIED`: célzott regresszió és a rendelkezésre álló futtatási környezet igazolta.
- `BLOCKED`: a következő bizonyítékhoz kizárólag VPS-en elérhető adat vagy hitelesített production nézet szükséges.

`FIXED` nem jelent productionben igazolt működést. A helyi környezetben nincs MySQL, ezért valós production darabszámot ez a dokumentum nem állít.

## Közös adatfogalmak

| Felhasználói fogalom | Kanonikus technikai jelentés |
|---|---|
| Beérkezett RSS-cikk | Egy kanonikus `articles` sor, amelyet egy aktív `sources` rekordhoz mentett az ingestion. |
| Feldolgozásra váró cikk | Az article state machine szerint `status='pending'`; nem azonos a publikálható hírekkel. |
| Feldolgozott cikk | Sikeres pipeline completion: `status='done'`, `processed=1`. |
| Publikálható / főoldalon megjeleníthető cikk | A publikus feed jelenlegi, változatlan biztonsági kapuja szerint olyan summary, amelyre `summaries.ai_clean=1`; az API továbbra sem kerüli meg a publikációs és forrásaktivitási szabályokat. |
| Főoldali összes találat | A teljes, aktuálisan szűrt `ai_clean=1` summary-halmaz darabszáma; nem az éppen betöltött oldal mérete. |
| Insights publikált cikk | A kiválasztott időablakban `articles.published_at` alapján megfigyelt cikk. A feldolgozottság és az elemzési lefedettség külön quality mező. |
| Elemzett cikk | Az adott mutatóhoz tényleges értékkel rendelkező cikk; a nevező mutatónként látható. |
| Kategorizált cikk | Ugyanabban a publication window-ban ismert, nem üres és nem `unknown/ismeretlen` kategóriával rendelkező cikk. |
| Trends kapcsolat | `distinct_article_keyword_category`: egyedi cikk–kulcsszó–kategória megfigyelés. Nem azonos az egyedi hírek számával. |
| Trend | Ugyanazon normalizált kulcsszó és kategória időablakos aggregációja. |
| Hírcsoport | Közös cluster-azonosítóval rendelkező cikkek csoportja; nem azonos kulcsszóval vagy forrással. |
| Főoldali aktív forrás | Aktív canonical source, amelyhez az aktuális facet-alaphalmazban legalább egy publikálható summary tartozik. |

Ez magyarázza, miért lehet egyszerre helyes egy 30 elemű betöltött feedoldal, egy nagyobb Insights publication count és egy még nagyobb Trends kapcsolatszám. A három szám három külön mértékegység; a felület most megnevezi a halmazt és a mértékegységet.

## Egységes időablak-szemantika

- `Ma`: Europe/Budapest naptári nap, helyi 00:00-tól a jelenlegi pillanatig, fél-nyílt `[start,end)` intervallumban. Az óraátállítás miatt ez 23 vagy 25 órás is lehet.
- `Elmúlt 24 óra`: a jelenlegi percre rögzített időponttól pontosan 24 órával visszafelé; ezért tartalmazhat tegnapi órákat.
- `7/30/90 nap`: gördülő, az API által visszaadott pontos kezdő és záró idővel.
- Insights időalap: `articles.published_at`.
- Trends időalap: a kulcsszó–cikk megfigyelés kanonikus időpontja; a 24 órás nézet a jelenlegi részórát is tartalmazza, és nem gyárt megfigyelést a hiányzó adatok helyére.

## Finding registry

### P0 — főoldal

| ID | Állapot | Reprodukció / előtte | Gyökérok | Javítás és bizonyíték |
|---|---|---|---|---|
| HOME-P0-001 | VERIFIED | Kategória kiválasztása után a „További kategóriák” újranyitásakor az aktív elem eltűnt. | A facet lista a már megszűrt, éppen betöltött feedből származott. | Új, stabil `/api/feed-facets` kontraktus; a kategórialista független az aktív kategóriaszűrőtől, az aktív további kategória nyitva és kijelölve marad. `frontend-data-correctness` regresszió PASS. |
| HOME-P0-002 | FIXED | Telex/HVG/Origo választáskor üres eredmény vagy eltűnő, átrendeződő forráslista. | Fix, 1–7 közötti source-ID megfeleltetés és eltérő név/slug alakok; a UI lista a szűrt oldalból épült. | A summaries API az aktív canonical source registryből old fel ID-t, slugot és nevet, kezeli a `.hu`, `www` és kis-/nagybetű alakokat; a UI slugot ír az URL-be; a stabil facet API adja a listát. Jövőbeni forrást is lefedő regresszió PASS. Production-adatos ellenőrzés: `PROD-VERIFY-001`. |
| HOME-P0-003 | FIXED | A felület nem különítette el a betöltött kártyák számát az összes találattól; az Insights eltérő számának oka nem látszott. | Oldalméret, publication population és public-summary population ugyanazzal a „hír” szóval jelent meg. | A feed exact, szűrt total countot kap, és „Megjelenítve X / Y” formában jelzi; a definíció `Publikálható AI-összefoglalók (ai_clean=1)`. Insights külön publication/coverage definíciót mutat. Valós 30/288 ellenőrzés: `PROD-VERIFY-002`. |
| HOME-P0-004 | VERIFIED | Indokolatlan nagy rés a navigáció és kategóriák között. | A bal oszlop rugalmas térkitöltése és minimum magassági viselkedése. | A navigáció és a népszerű kategóriák kompakt folyamban maradnak. Helyi böngészős empty-state ellenőrzésen nincs több cikknyi üres köz. |
| HOME-P0-005 | VERIFIED | Hosszú oldalon a side rail a header alá került vagy használhatatlanná vált. | Eltérő sticky offset és nem egységes rail viselkedés. | Desktop rail offset 66 px; kisebb nézetben normál dokumentumfolyam. CSS + helyi böngészős ellenőrzés PASS. |

### P0 — Insights

| ID | Állapot | Reprodukció / előtte | Gyökérok | Javítás és bizonyíték |
|---|---|---|---|---|
| INS-P0-001 | VERIFIED | A „24h” napi nézetként volt értelmezhető, ezért a tegnapi órák hibának tűntek. | Gördülő 24 óra és budapesti naptári nap nem volt külön modell és felirat. | Központi `today` és `24h` szemantika, Ma/Elmúlt 24 óra külön vezérlővel; DST 23/25 órás tesztek PASS. |
| INS-P0-002 | VERIFIED | Hangulati százalékok és elemszámok összeértek. | Merev, szűk grid és nem megfelelő wrapping. | Reszponzív sentiment layout, külön arány- és mintaszám-megjelenítés; null/hiányzó adat külön állapot. TypeScript, lint és build kapu lefedi. |
| INS-P0-003 | VERIFIED | A heatmap intenzitása, helyi órája, nulla és hiányzó adata nem volt érthető; expand instabil volt. | Hiányzó skála és mérési magyarázat, túl merev kártyaméret. | Helyi idő felirat, vizuális skála, pontos tooltip-kontraktus, nulla/hiány megkülönböztetés és bővíthető kártya. Célzott kontraktus + build PASS. |
| INS-P0-004 | FIXED | Eltérő, megmagyarázatlan kategória-nevezők jelentek meg. | Publication population, kategória coverage és summary coverage egy kártyán keveredett. | Az API quality blokkjában külön eligible/analyzed/missing; a UI megnevezi a publication időalapot és a nevezőt. Production mintán ellenőrzendő: `PROD-VERIFY-003`. |

### P0 — Trends

| ID | Állapot | Reprodukció / előtte | Gyökérok | Javítás és bizonyíték |
|---|---|---|---|---|
| TREND-P0-001 | VERIFIED | A „1956” és „1956-os forradalom” kapcsolat nélkül duplikáltnak tűnt. | Nem volt bizonyítékalapú alias-kapcsolat, a vak összevonás viszont szemantikailag veszélyes lett volna. | Konzervatív kapcsolat: azonos kategória, szabályos év–forradalom alak és legalább 80% közös article-ID. A számok nem olvadnak össze; related-topic jelzés készül. Pozitív és abstention regresszió PASS. |
| TREND-P0-002 | VERIFIED | Bezárás után ugyanaz a kártya csak a nyíllal nyílt újra. | A panel close eseménye felbuborékolt a kártyára; két kattintási út eltérően kezelte a state-et. | Close propagation megállítása; a teljes nem-interaktív kártya ugyanazt a toggle állapotot használja. UI-regresszió PASS. |
| TREND-P0-003 | VERIFIED | A 24 órás nézet elhagyta a folyamatban lévő aktuális órát. | A záró idő a korábbi teljes órára volt lefelé kerekítve. | A 24h ablak a jelenlegi percnél zár, pontosan 24 órás, utolsó részbucketet is képez. Éjfél/DST regresszió PASS. |
| TREND-P0-004 | VERIFIED | „Adatpont kiválasztása billentyűzettel” technikai felirat. | Akadálymentes implementációs részlet került fő feliratba. | Emberi „Időpont részletei” felirat és kattintás/billentyűzet magyarázat; billentyűzetes működés megmaradt. |
| TREND-P0-005 | VERIFIED | Top növekvő 1–5 üres sor látszott. | Nem bizonyítható baseline esetén is ranglista-váz jelent meg. | Őszinte skeleton/empty state konkrét okkal; fiktív százalék és helyezés nincs. |

### P0 — közös adatkontraktus

| ID | Állapot | Előtte | Gyökérok | Javítás és bizonyíték |
|---|---|---|---|---|
| DATA-P0-001 | VERIFIED | Ugyanaz a „hír” szó feedoldalt, publication populationt és kulcsszókapcsolatot is jelentett. | A három felület külön aggregációt használt, látható mértékegység nélkül. | Verziózott feed contract, Insights `insights-publication-v1`, Trends `distinct_article_keyword_category`; mértékegység és időalap megjelenik. Contract tesztek PASS. |

### P1 — Insights

| ID | Állapot | Javítás | Bizonyíték / korlát |
|---|---|---|---|
| INS-P1-101 | VERIFIED | Kategóriatrend kártya részletes nézetre bővíthető; mobilon visszarendeződik. | Komponens/CSS contract, typecheck, build PASS. |
| INS-P1-102 | FIXED | Clickbait kártya és jelmagyarázat ugyanabból a source-stat modellből dolgozik; hiányzó minta nem lesz nulla. | Valós többforrású adat: `PROD-VERIFY-003`. |
| INS-P1-103 | VERIFIED | Sentiment timeline helyes period scope-ot, mintaszámot és null állapotot közöl. | Unit/contract és build PASS. |
| INS-P1-104 | VERIFIED | Előrejelzés csak elég, többforrású történeti baseline esetén jelenik meg; egyébként okot ír. | Determinisztikus intelligence regressziók PASS; nincs fake forecast. |
| INS-P1-105 | VERIFIED | „Hírciklus” helyett „Terjedés”, „cluster” helyett „témacsoport”; mérési magyarázatok hozzáadva. | Statikus/UI contract és build PASS. |
| INS-P1-106 | FIXED | Esemény- és coverage-panelek explicit adatfeltételeket és őszinte üres állapotot használnak. | Production történeti lefedettség: `PROD-VERIFY-003`. |

### P1 — Trends

| ID | Állapot | Javítás | Bizonyíték / korlát |
|---|---|---|---|
| TREND-P1-101 | VERIFIED | A source-share donut közepén „kapcsolat” mértékegység; SVG szegmensenként forrás, érték és százalék tooltip; azonos palette a legendával. | TypeScript/build + exact source-total contract PASS. |
| TREND-P1-102 | VERIFIED | Trendaktivitás magyar, budapesti időcímkékkel; minden oszlop exact idő/érték tooltipet kap; hiányzó adat nem lesz hamis nulla. | Trend history és point-label regresszió PASS. |
| TREND-P1-103 | VERIFIED | Jobb rail desktopon sticky, kisebb viewporton normál flow; hosszú kulcsszólista nem hoz létre beágyazott oldal-scrollt. | CSS és helyi böngészős empty-state ellenőrzés PASS. |

## Módosított területek

- Főoldal/adatút: `app/api/feed-facets/route.ts`, `app/api/summaries/route.ts`, `app/page.tsx`, `components/HomeFeedLayout.tsx`, `components/HomeFeedLayout.module.css`.
- Insights: `lib/insights-intelligence.js`, `lib/insights-period.ts`, `lib/insights-dashboard.ts`, az érintett Insights API route-ok és dashboard/chart komponensek.
- Trends: `lib/trend-intelligence.ts`, `lib/trend-intelligence-service.ts`, `components/TrendsDashboard.tsx`, `components/TrendsDashboard.module.css`, `components/TrendIntelligencePanel.tsx`.
- Regressziók: `tests/unit/frontend-data-correctness.test.cjs`, valamint a source-flow, trend-intelligence és trends API tesztek.

## Mérföldkövek és elfogadás

### M1 — adat és navigáció

- Stabil facet source, canonical source resolution, exact feed total.
- Ma és gördülő 24 óra központi szemantikája.
- Trends current partial-hour és bizonyítékalapú related-topic kapcsolat.
- Elfogadás: célzott adatkontraktusok és DST regressziók PASS. Production darabszám-gate még külön szükséges.

### M2 — grafikon és interakció

- Újranyitható trendkártyák, helyes tooltip/mértékegység, őszinte empty state.
- Olvasható sentiment, heatmap, bővíthető trendgrafikon, közös source legendamodel.
- Elfogadás: UI-contract tesztek, TypeScript és production build PASS; valós prémium adatot igénylő vizuális ellenőrzés blokkolt.

### M3 — UX és reszponzivitás

- Kompakt feed rail, header alá igazított sticky oldalsávok, kisebb képernyőn flow.
- Magyar feliratok, mérési magyarázatok és természetes akadálymentes súgó.
- Elfogadás: helyi böngészős empty-state render, lint, build PASS. Teljes öt-viewportos, adatokkal feltöltött screenshot-gate production/staging környezetet igényel.

## Futtatott ellenőrzések

- Célzott frontend/adat/trend tesztek: 17/17 PASS.
- Teljes offline suite: 1314 tesztből 1313 PASS, 0 FAIL, 1 környezeti SKIP (host symlink policy).
- TypeScript: PASS (`tsc --noEmit`).
- ESLint: 0 error; a repository korábbi warningjai megmaradnak.
- Importellenőrzés: PASS.
- Next.js production build: PASS, 76/76 statikus oldal.
- Helyi böngésző: főoldal és Trends shell/empty-state render PASS; vízszintes oldal-túlcsordulás és header alá csúszó rail nem látszott. Valós adat nem volt, mert helyi MySQL használata tiltott és nem érhető el. A glóbusz hidratációs korrekciója utáni ismételt böngészőmegnyitást az alkalmazás URL-biztonsági kapuja blokkolta; ezt nem kerültük meg, a korrekciót TypeScript, ESLint és production build igazolja.

## Blokkolt production-validációk

| ID | Állapot | Hiányzó bizonyíték | Kizárólag olvasó ellenőrzés |
|---|---|---|---|
| PROD-VERIFY-001 | BLOCKED | Telex, HVG és Origo tényleges production facet countja és szűrt találata. | A deploy után read-only API összevetés: facet slug/count, `/api/summaries` azonos queryvel, URL refresh/back/forward. Írás és pipeline-művelet nélkül. |
| PROD-VERIFY-002 | BLOCKED | A korábban látott 30 és 288 érték aktuális, azonos időpontú eredete. | Ugyanazon időpontban rögzített feed contract + Insights window/quality válasz; a két mértékegység dokumentált összevetése. A két számot nem kell egyenlővé tenni. |
| PROD-VERIFY-003 | BLOCKED | Hitelesített prémium Insights és valós Trends grafikonok adatokkal, 320/390/768/1280/1440 viewporton. | Read-only böngészős acceptance: százalékok, legendák, tooltip, expand/collapse, sticky, filter history és screenshotok. |

## Fennmaradó kockázatok

1. A valódi source registry tartalma, régi aliasai és publication adatállapota csak VPS MySQL-lel bizonyítható; a kód dinamikus, de a production adatminőség külön tényező.
2. A helyi böngésző csak adat nélküli állapotot tudott megjeleníteni. Nagy valós mintán előforduló hosszú cím, forrásnév vagy extrém érték vizuális ellenőrzése még szükséges.
3. A Trends related-topic szabály szándékosan szűk. Más valódi aliaspárok külön maradnak, amíg nincs determinisztikus és bizonyítható kapcsolatuk.
4. A donut és activity vizualizáció nem gyárt adatot. Hiányos backend aggregátumnál semleges empty state jelenik meg.
5. A repository lint-warning adóssága nem része ennek a javításnak; új lint error nem került be.

## Production bevezetés feltételei

1. Review-zott diff; külön tulajdonosi engedély commitra, pushra és deployra.
2. A jelenlegi teljes offline suite, TypeScript, ESLint, import és build gate ismételt futtatása a deployolandó commiton.
3. Normál mentés és rollback-képes alkalmazás-release; adatbázis-migráció nem része ennek a változásnak.
4. Staging vagy read-only production acceptance a három `PROD-VERIFY` tétellel.
5. Production után azonnali smoke: főoldali kategória/source toggle + refresh/history; Insights Ma/24h; Trends 24h/30d + open/close/reopen.
6. Eltérés esetén alkalmazás rollback; adatbázishoz, pipeline-hoz és AI flaghez nem kell nyúlni.

## Aktuális összesítés

- P0 finding: 15; lokálisan `VERIFIED`: 11; `FIXED`, production adatra vár: 4; `OPEN`: 0.
- P1 finding: 9; lokálisan `VERIFIED`: 7; `FIXED`, production adatra vár: 2; `OPEN`: 0.
- Külön production validation gate: 3 `BLOCKED`.
- Kritikus, lokálisan reprodukálható nyitott navigációs vagy adathelyességi hiba: 0.
- Production teljes elfogadás: a három read-only validation gate lezárásáig **feltételes**.
