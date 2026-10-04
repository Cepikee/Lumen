# UTOM.HU / Lumen – alkalmazási hibajavítási master

## Projektállapot

- Projekt: UTOM.HU / Lumen
- Branch: `develop/utom-recovery`
- Utolsó frissítés: 2026-10-03 (Europe/Budapest)
- Legutóbbi migration: `033_email_outbox.sql`
- TypeScript: PASS
- ESLint: PASS
- Offline tesztek: 224/224 PASS
- MySQL integration: PASS – izolált WSL MySQL 8.0.46, fresh 001→033 és upgrade 032→033, 30/30 integration teszt PASS
- npm audit: még nem futott ebben a master munkamenetben
- Build: PASS – Windows Node v24.19.0 / Next.js 16.3.6, `npm run build`, 72/72 statikus oldal

## Bizonyított findingok

| ID | Severity | Terület | Státusz | Röviden | Regresszió |
|---|---|---|---|---|---|
| APP-001 | Medium | Legacy route | FIXED | `/api/init` sikeres cron-indítást állított, miközben semmit sem indított; explicit 410 tombstone lett. | `legacy-entrypoints.test.cjs` |
| APP-002 | Medium | Aggregáció / sentiment | FIXED | A napi sentiment rendszeridőzónás, zárt napvéget használt; Budapest `[start,end)` ablakra javítva. | `aggregate-boundary.test.cjs` |
| APP-003 | Medium | Aggregáció / sentiment kategóriánként | FIXED | Ugyanez a dátumhatár-hiba kategóriás aggregációban is jelen volt. | `aggregate-boundary.test.cjs` |
| APP-004 | Low | Trends statisztika | FIXED | Azonos csúcsértékű napoknál nem volt stabil másodlagos rendezés. | SQL-rendezés célzott ellenőrzése |
| APP-005 | High | Async / concurrent mutation | FIXED | Két egyidejű nem prémium Híradó-megtekintés mindkettője első megtekintésként sikeres lehetett; az `INSERT IGNORE` eredményét nem vizsgálta a route. | `video-access-concurrency.test.cjs` |
| APP-006 | Medium | Frontend fetch race / loading state | FIXED | A fő feed régi lapozási kérése a `finally` ágban lenullázhatta az újabb kérés loading állapotát. Sequence guard került a feed request-ekre. | `feed-loading-race.test.cjs` |
| APP-007 | Medium | Trends UI fetch race / response contract | FIXED | A gyors kulcsszóváltás régi `trend-sources` válasza felülírhatta az új forráslistát; nem-array vagy HTTP-hiba választ is közvetlenül állapotba írt. | `trend-source-race.test.cjs` |
| APP-008 | Medium | Category UI / malformed response | FIXED | A category oldal nem-array `items` vagy `ringSources` választ közvetlenül fogyasztott, ezért hibás backend payload esetén renderelési crash történhetett. | `category-response-contract.test.cjs` |
| APP-009 | Medium | Insights UI / HTTP response contract | FIXED | Az insights oldal saját forecast fetchere status-ellenőrzés nélkül fogyasztotta a hibaválaszt, miközben a közös hook már helyesen validált; a lokális párhuzamos implementációt a validált hook váltotta fel. | `insights-forecast-fetch.test.cjs` |
| APP-010 | Medium | Async / frontend fetch race | FIXED | A forecast státusz 10 másodperces pollingja átfedő kéréseknél a lassabb régi válasszal felülírhatta az új állapotot, és unmount után is megpróbálhatott state-et írni. | `forecast-status-race.test.cjs` |
| APP-011 | High | Source UI/API contract | FIXED | A böngésző üres belső API-kulccsal hívta a forráslistát, miközben a route kulcsvédelmet kért; emiatt a főoldali forrásszűrő üres maradt. A read-only lista közvetlenül elérhetővé vált. | `source-flow-contract.test.cjs` |
| APP-012 | Medium | Source SQL semantics | FIXED | A source lista denormalizált `summaries.source` szövegre JOIN-olt, nem szűrte az inaktív forrásokat, és emiatt érvényes canonical source kapcsolatok hiányozhattak. Article→source FK és `is_active = 1` használatára javítva. | `source-flow-contract.test.cjs` |
| APP-013 | Medium | Source filter / pagination contract | FIXED | A summaries endpoint csak fix 1–7 source ID-ket ismert; új vagy újra seedelt adatbázis-ID-ket a UI szűrője üres eredménnyé alakította. Numerikus source ID-k közvetlenül elfogadottak. | `source-flow-contract.test.cjs` |
| APP-014 | Medium | Premium source UI / HTTP handling | FIXED | A source-category SWR fetcher status-ellenőrzés nélkül kezelte a 401/403/500 választ normál adatként. HTTP- és payload-validáció került bele. | `source-flow-contract.test.cjs` |
| APP-015 | Medium | Híradó UI / HTTP response contract | FIXED | A Híradó kliens HTTP hibát vagy hibás JSON-t adatként állított be, ezért hibás válasz után betöltési állapotban maradhatott. Explicit status-, payload- és hibaállapot-kezelés került bele. | `hirado-client-response.test.cjs` |
| APP-016 | Medium | Auth input/status contract | FIXED | Reset, register, request-reset, avatar, username és email-verifikáció route-ok malformed/null body esetén 500-at vagy hibás 200-at adtak; reset update `affectedRows` és username duplicate verseny kezelése hiányzott. 400/401/404/409/500 és body-shape validáció került be. | `auth-response-contract.test.cjs` |
| APP-017 | Low | Híradó archive UI / malformed response | FIXED | Az archive slider status-ellenőrzés és tömb-validáció nélkül fogyasztotta a választ; hibás payloadnál nem determinisztikusan működött. | `hirado-client-response.test.cjs` |
| APP-018 | Medium | Premium DNS UI / response race | FIXED | A DNS komponensek status-ellenőrzés nélkül fogyasztották a premium válaszokat; domain-váltáskor az összkép régi válasza új állapotot írhatott felül. | `dns-response-race.test.cjs` |
| APP-019 | High | Premium entitlement UI contract | FIXED | Lejárt előfizetésnél a frontend több helyen a nyers `is_premium`/`premium_tier` mezőt használta, ezért lejárt user prémium menüt, badge-et vagy Insights hozzáférést kaphatott. Minden fogyasztó a canonical `isPremium` mezőt használja. | `premium-entitlement-ui.test.cjs` |
| APP-020 | High | Híradó archive navigation | FIXED | Az archív kártyák `?video=ID` linket generáltak, de a Híradó oldal mindig a legfrissebb videót kérte le; a kiválasztott archív adás így nem nyílt meg. A page most validált ID alapján kérdez. | `hirado-client-response.test.cjs` |
| APP-021 | High | Híradó entitlement race / HTTP handling | FIXED | A player minden `onTimeUpdate` eseménynél új jogosultságkérést indíthatott; a második kérés tévesen blokkolhatta az első engedélyezett lejátszást. In-flight/checked guard és status/payload validáció került be. | `hirado-player-entitlement.test.cjs` |
| APP-022 | Medium | Auth session HTTP semantics | FIXED | Az `/api/auth/me` adatbázis/session hiba esetén HTTP 200 `{ loggedIn:false }` választ adott, így infrastruktúra-hiba kijelentkeztetésként jelent meg. A route most 500-at ad stabil hibakóddal. | `auth-response-contract.test.cjs` |
| APP-023 | Medium | Híradó archive null/malformed data | FIXED | Az archive lista null/hibás dátumú vagy érvénytelen ID-jű elemeket közvetlenül renderelt; ez `Invalid Date`-ot és hibás linkeket okozhatott. A lista csak valid ID/dátum elemeket tart meg. | `hirado-client-response.test.cjs` |
| APP-024 | Medium | Login/reset frontend HTTP handling | FIXED | A login és reset UI-k HTTP 4xx/5xx válaszoknál nem mindenhol különítették el a hibát a sikeres flow-tól; a backend auth státuszai és a reset kliens most explicit status alapján kezel. | `auth-response-contract.test.cjs` |
| APP-025 | Medium | Trends UI HTTP/error handling | FIXED | A TrendsList trend/history fetcherei `response.ok` ellenőrzés nélkül hibás payloadot üres találatként jeleníthettek meg. Status- és object-validáció került mindkét fetchbe. | `trends-list-http.test.cjs` |
| APP-026 | Medium | Username API validation | FIXED | A kliens tiltott neveket blokkolt, de a username-reset API közvetlenül elfogadta őket. A tiltott névlista most backend oldalon is érvényesül. | `auth-response-contract.test.cjs` |
| APP-027 | Medium | Trends API period validation | FIXED | Ismeretlen trends `period` értékek időszűrés nélkül az összes történelmi adatot adták vissza; custom dátumok validációja is hiányzott. Strict enum és dátumtartomány-ellenőrzés került be. | `trends-api-validation.test.cjs` |
| APP-028 | Medium | Trend sources API validation/dedup | FIXED | Whitespace kulcsszó és hibás/fractional/negatív period átjuthatott; duplicate keyword relation ugyanazt a cikket többször adhatta vissza. Strict period validation és DISTINCT került be. | `trends-api-validation.test.cjs` |
| APP-029 | Medium | Trend history API filtering | FIXED | Ismeretlen vagy hiányos custom period a teljes történelmet adta vissza, malformed dátumok SQL-hez jutottak. Valid period/dátumtartomány ellenőrzés került be. | `trends-api-validation.test.cjs` |
| APP-030 | Medium | Related news HTTP semantics | FIXED | Adatbázishiba esetén a related API HTTP 200 üres tömböt adott, ezért a kliens hibát üres találatként jelenített meg. A route most 500 hibát ad. | `trends-api-validation.test.cjs` |
| APP-031 | Medium | Trends debug duplicate/race | FIXED | A debug komponens kategóriánként példányosodott, így nyolc azonos request indult; emellett régi válasz felülírhatta az újat és status-ellenőrzés hiányzott. Egy példány és sequence/status guard került be. | `trends-debug-theme-race.test.cjs` |
| APP-032 | Medium | Theme update race | FIXED | Gyors téma-váltásnál a régi, lassabb POST utolsóként érkezve visszaírhatta a korábbi témát. AbortController és sequence guard került be. | `trends-debug-theme-race.test.cjs` |
| APP-033 | Medium | Main feed HTTP/error handling | FIXED | A mai és szűrt feed hálózati/HTTP hibái unhandled rejectiont és üres/stale UI-t okozhattak. Status/payload validáció és látható hibaállapot került be. | `feed-http-error.test.cjs` |
| APP-034 | Medium | Timeseries API period validation | FIXED | A timeseries/all endpoint ismeretlen period esetén 24 órás adatot adott vissza, miközben a választ az invalid perioddal címkézte. Az ismeretlen időszak most 400. | `trends-api-validation.test.cjs` |
| APP-035 | High | Trends growth filter semantics | FIXED | A growth történelmi nevezője figyelmen kívül hagyta az aktív source/category szűrőket és csak keyword alapján számolt. A historical subquery-k most azonos category/source szemantikát használnak. | `trends-api-validation.test.cjs` |
| APP-036 | High | Spike detection timezone window | FIXED | A spike detection szerver-local napkezdetet és zárt `23:59:59` véget használt, majd UTC-ként értelmezte az órát; Budapest DST környékén hibás nap/óra eredmény keletkezett. Business-day `[start,end)` és Budapest órakonverzió került be. | `spike-detection-timezone.test.cjs` |
| APP-037 | Medium | Speed Index malformed numeric response | FIXED | A Speed Index UI string/NaN/null `avgDelay` vagy `medianDelay` mezőre közvetlenül `toFixed`-et használhatott, ami hibás payloadnál render crash-t okozott. A komponens normalizálja a számokat. | `speedindex-null-contract.test.cjs` |
| APP-038 | Medium | Clickbait UI numeric/null contract | FIXED | A clickbait és clickbait-ratio komponensek hibás vagy hiányzó numerikus mezőből `NaN` értéket képeztek, illetve hiányzó source névvel rendereltek. Finite-number és forrás fallback normalizálás került be. | `clickbait-number-contract.test.cjs` |
| APP-039 | Medium | Timeseries API period validation | FIXED | A kategória-timeseries endpoint ismeretlen `period` értéket 7 napként kezelt, így a kliens hibás időablakot kapott. Strict 7d/30d/90d enum és HTTP 400 került be. | `timeseries-validation.test.cjs` |
| APP-040 | Medium | Trending keywords per-article counting | FIXED | Egy summaryn belüli ismétlődő kulcsszó többször növelte a napi trend-countot, és holtversenyben nem volt stabil rendezés. Cikkenkénti deduplikáció és determinisztikus másodlagos rendezés került be. | `trending-keywords-dedup.test.cjs` |
| APP-041 | Medium | Insights period and sentiment timeline timezone | FIXED | Az insights endpoint ismeretlen periódust 7 napra ejtett vissza; a sentiment timeline szerver-local napot és UTC órát használt Budapest üzleti nap helyett. Strict period validation és business-day/Budapest óra-konverzió került be. | `insights-period-timeline.test.cjs` |
| APP-042 | Medium | Premium source statistics date/null semantics | FIXED | A source-activity aggregáció whitespace-only forrást is csoportosított, a clickbait 24 órás ablaka zárt felső határt használt, és a numerikus/source mezők hibás payloadnál NaN/üres értéket adhattak. Trimelt szűrés, half-open időablak és normalizált response került be. | `premium-statistics-null-contract.test.cjs`, `clickbait-number-contract.test.cjs` |
| APP-043 | Medium | Premium duplication null source semantics | FIXED | NULL/üres article- vagy cluster-source esetén a duplication `SUM` null aggregációt adott és a source renderelése törhetett. Ismeretlen forrás normalizálás, half-open Budapest napablak és stabil tie-rendezés került be. | `premium-statistics-null-contract.test.cjs` |
| APP-044 | Medium | Premium sentiment chart response contract | FIXED | A sentiment category/timeline/today komponensek hibás vagy hiányzó numerikus mezőket közvetlenül chart-adattá alakítottak, ami NaN-t és renderhibát okozhatott. HTTP/payload validáció és finite, nemnegatív normalizálás került be. | `premium-statistics-null-contract.test.cjs` |
| APP-045 | Medium | Heatmap category aggregation semantics | FIXED | A heatmap case-eltérő kategóriákat külön SQL csoportként kezelte, majd a canonical matrix kulcsánál elveszíthette a sorokat; a napablak és órakonverzió is szerver-local volt. Case-insensitive grouping, Budapest üzleti nap és canonical matrix mapping került be. | `insights-statistics-contract.test.cjs` |
| APP-046 | Medium | Trends stats input and connection lifecycle | FIXED | Üres/whitespace keyword közvetlenül SQL-lel futott, a connection hibaágban nyitva maradhatott, és az egynapos daily average nevezője hibás volt. 400 validáció, `finally`-beli close és legalább egy napos nevező került be. | `insights-statistics-contract.test.cjs` |
| APP-047 | Medium | Category API period/sort validation | FIXED | A category endpoint ismeretlen periódust és sortot csendben a default logikára ejtett vissza, így a kliens hibás időablakot/rendezést kaphatott. Strict period és sort enum, HTTP 400 válasszal. | `category-query-validation.test.cjs` |
| APP-048 | Medium | Search/feed error-state semantics | FIXED | A feed/search HTTP vagy malformed response korábban `[]` értékként jelent meg, ezért a hiba üres találatként és „nincs több hírként” látszott; új query közben régi hiba is visszaírhatott. Null failure sentinel, explicit error state és request-sequence guard került be. | `feed-search-error-state.test.cjs`, `feed-http-error.test.cjs` |
| APP-049 | Medium | Related news duplicate summary selection | FIXED | Ugyanahhoz az article-höz több summary sor esetén a related API ugyanazt a cikket többször adhatta vissza. `NOT EXISTS` newest-summary kiválasztás került a querybe. | `article-related-flow.test.cjs` |
| APP-050 | Medium | Article detail ID/response/null flow | FIXED | Az article oldal malformed ID-val is fetch-elt, HTTP hibát és nullable title/date/content/keywords mezőket közvetlenül renderelt, a related kérés pedig source-váltáskor beragadhatott. ID/payload validáció, null-safe render és cancellation/loading guard került be. | `article-related-flow.test.cjs` |
| APP-051 | Medium | Source category distribution semantics | FIXED | A source/category aggregáció case- és whitespace-eltérő kategóriákat külön csoportosított, a canonical UI címkéi miatt ezek eltűnhettek; a korábbi all-time adat is a mai panelbe kerülhetett. Canonical grouping és Budapest üzleti napi ablak került be. | `source-flow-contract.test.cjs` |
| APP-052 | Medium | Source activity frontend malformed rows | FIXED | A source activity chart null vagy hibás sor, NaN total és üres normalizált dataset esetén sort/render hibát okozhatott. HTTP/payload validáció, finite normalizálás, fallback és stabil rendezés került be. | `source-flow-contract.test.cjs` |
| APP-053 | High | Pipeline claim heartbeat failure handling | FIXED | A claim utáni heartbeat a `try` blokkon kívül dobva `Promise.all` rejectiont okozhatott, miközben a cikk `in_progress` állapotban maradt. A heartbeat most a failure path része, a `failArticle` pedig védett. | `pipeline-batch-heartbeat.test.cjs` |
| APP-054 | Medium | Híradó numeric input validation | FIXED | A by-id és can-watch endpointok fractional, negatív, unsafe vagy nem numerikus video ID-t is SQL paraméterként fogadhattak; a hiányzó és malformed ID sem különült el. Strict positive integer validáció és stabil 400 hibakódok kerültek be. | `hirado-id-validation.test.cjs`, `api-numeric-inputs.test.cjs` |
| APP-055 | Medium | Remaining frontend HTTP/race/numeric contracts | FIXED | Verify-email, avatar/frame mentés és Spike modal malformed JSON/HTTP hibát successként kezelhetett; Spike régi requestje felülírhatott új topicot, illetve NaN dátum/`toFixed` crash történhetett. Status/JSON validáció, AbortController és finite numeric/date kezelés került be. | `remaining-fetch-contracts.test.cjs` |
| APP-056 | Medium | Forecast status DB connection lifecycle | FIXED | A forecast-status route query-hiba esetén a létrehozott MySQL kapcsolatot nem zárta le, ezért ismétlődő polling mellett erőforrás-szivárgás alakulhatott ki. A kapcsolat most minden ágon `finally`-ban záródik. | `forecast-status-connection.test.cjs` |
| APP-057 | Medium | Insights numeric chart response contract | FIXED | A spike detection és heatmap komponensek NaN/Infinity/negatív óra- és értékmezőket közvetlenül Chart.js-adattá alakítottak, ami hibás rendezést és `NaN%` renderelést okozhatott. Finite, nemnegatív normalizálás és érvényes óraszűrés került be. | `insights-numeric-response-contract.test.cjs` |
| APP-058 | High | User profile mutation authorization contract | FIXED | Az általános user update endpoint `nickname` mezőt is elfogadott, megkerülve a dedikált cooldown/uniqueness username flow-t; unauthenticated és üres update HTTP 200-at adott. A mező kikerült, 401/400 státuszok kerültek be. | `user-mutation-contract.test.cjs` |
| APP-059 | Medium | User mutation malformed input | FIXED | Password/PIN/avatar/frame mutation route-ok malformed JSON vagy hibás típusok esetén 500/crash útvonalra kerülhettek; avatar style/seed/format korlátozás hiányzott. Body-shape és domain-validáció került be. | `user-mutation-contract.test.cjs` |
| APP-060 | Medium | User mutation frontend HTTP/race handling | FIXED | A settings/password/PIN UI HTTP hibát successként kezelhetett, a theme optimista state hibánál nem állt vissza, és a sikertelen Promise unhandled maradhatott. Status/JSON validáció, rollback és abort/sequence kezelés került be. | `user-mutation-contract.test.cjs` |
| APP-061 | Medium | Premium availability misleading actions | FIXED | A payment/provider nélküli premium oldalon a próbaidő, előfizetés, támogatás és céges gombok aktívnak látszó, tényleges action nélküli UI-t adtak. Az elemek őszintén disabled állapotúak, a támogatási input is le van tiltva, fake payment flow nélkül. | `premium-availability-contract.test.cjs` |
| APP-062 | Medium | Auth/session transient error semantics | FIXED | Az auth hook és Header 5xx/network/malformed válaszokat kijelentkezésként vagy prémium állapotvesztésként kezelhetett; a reset flow-k nem-JSON hibánál dobtak. 401-only session clear, payload/status validáció és biztonságos reset hibaállapot került be. | `auth-session-ui-contract.test.cjs` |
| APP-063 | Medium | Summaries source filter normalization | FIXED | A `24.hu`/`444.hu` és hasonló valid forrásnevek TLD/pont/case normalizálása után nem mindig kaptak source ID-t, ezért a feed üres lett. A filter most trim/case/TLD/dot normalizálással oldja fel a canonical ID-t, ismeretlen filter pedig nem esik vissza szűretlen feedre. | `source-flow-contract.test.cjs` |
| APP-064 | Medium | Summaries search LIKE semantics | FIXED | A keresési `%` és `_` karakterek SQL wildcardként működtek, így a felhasználói keresés túl sok találatot adhatott. LIKE escape és explicit `ESCAPE` került be. | `source-flow-contract.test.cjs` |
| APP-065 | Medium | Premium proxy entitlement/rate-limit errors | FIXED | Entitlement vagy rate-limit backend hiba esetén a premium proxy exceptiont engedett ki, így a frontend nem kapott stabil hibaszerződést. 503 `premium_unavailable` és fail-closed 429 `rate_limit` válasz került be. | `premium-proxy-error-contract.test.cjs` |
| APP-066 | Medium | Premium category path validation | FIXED | Whitespace-only premium category path a downstream route-ban uncategorized (`NULL`) kategóriaként értelmeződhetett. A path normalizer most elutasítja az üres/whitespace kategóriát. | `premium-insights-path.test.cjs` |
| APP-067 | Medium | Category pagination deterministic ordering | FIXED | Azonos timestamp vagy score esetén a category API rendezése nem tartalmazott egyedi tie-breakert, ezért az elemek lapozás között elmozdulhattak; source distribution tie-ek is nondeterministák voltak. `id DESC` és stabil source rendezés került be. | `category-query-validation.test.cjs` |
| APP-068 | Medium | Trends DB connection lifecycle | FIXED | Trends, trend-history és trend-sources route-ok SQL-hiba vagy korai custom-period validáció esetén nyitva hagyhatták a létrehozott MySQL kapcsolatot. Egységes `finally` alapú lezárás került be. | `trends-api-validation.test.cjs` |
| APP-069 | Medium | Contact API status/input/provider contract | FIXED | A contact endpoint malformed JSON, hibás body-típus, rate limit, túlméretezett body, Turnstile/provider hiba és server exception esetén több helyen 200-at adhatott. Explicit 400/413/429/502/503/500 státuszok és response-validáció kerültek be. | `contact-response-contract.test.cjs` |
| APP-070 | Medium | Forecast status invalid timestamp | FIXED | Hibás adatbázis timestamp `Invalid Date`-ként került a JSON válaszba, ami frontend countdown hibát okozhatott. A route most stabil `unknown` állapotot ad. | `forecast-status-invalid-date.test.cjs` |
| APP-071 | Medium | Auth settings initial-state crash | FIXED | A SettingsView auth probe előtt `user!.nickname` dereference-szel render crash-t okozhatott; invalid usernameChangedAt pedig NaN cooldownot eredményezhetett. Safe initial state és dátum-validáció került be. | `auth-session-ui-contract.test.cjs` |
| APP-072 | Medium | Reset flow missing-token handling | FIXED | Password/PIN reset token nélkül is submitolható volt és a fetch flow-ra hagyatkozott. Client-side token guard, disabled submit és stabil HTTP/non-JSON hibaállapot került be. | `auth-session-ui-contract.test.cjs` |
| APP-073 | Medium | Contact frontend HTTP/error contract | FIXED | A kapcsolatfelvételi oldal HTTP hibát vagy nem-JSON provider választ `data.success` olvasással kezelhetett, ami félrevezető vagy crashelő hibajelzést adott. Status/payload validáció és stabil fallback került be. | `contact-clear-ui-contract.test.cjs` |
| APP-074 | Low | Disabled maintenance button error feedback | FIXED | A letiltott `/api/clear-summaries` endpoint után ClearButton `message` nélküli 404 payloadot alertelt, így a felhasználó üres visszajelzést kapott. Explicit status és fallback üzenet került be. | `contact-clear-ui-contract.test.cjs` |
| APP-075 | Medium | Register UI unhandled network failure | FIXED | A RegisterModal regisztrációs fetch-e a try/catch blokkon kívül futott; hálózati vagy abort hiba unhandled Promise-t hagyott és a loading állapot örökre beragadhatott. A teljes request/parsing flow try/catch/finally kezelésre került, explicit HTTP success contracttal. | `register-modal-async.test.cjs` |
| APP-076 | Medium | Insights duplicate auth probe/entitlement gate | FIXED | Az Insights oldal külön `/api/auth/me` requestet és debug entitlement gate-et futtatott a canonical user store mellett; átmeneti auth probe hiba prémium usernél is elrejthette az oldalt. A duplikált probe kikerült, az oldal a canonical `isPremium` state-et használja. | `premium-entitlement-ui.test.cjs` |
| APP-077 | Medium | Settings bio initial-state race | FIXED | A SettingsView `user!.bio` dereference-szel auth betöltés alatt render crash-t okozhatott, és a később érkező user bio nem szinkronizálódott. Null-safe state initialization és user-field synchronization került be. | `settings-null-state.test.cjs` |
| APP-078 | Medium | Insights boundary and whitespace aggregation | FIXED | A sentiment timeline zárt `<= end` határa a következő időablak határán lévő rekordot is bevette; a heatmap, sentiment-by-category és clickbait category query whitespace-only kategóriákat hibásan kezelte. Half-open Budapest időablak és `TRIM(category) <> ''` szemantika került be. | `insights-boundary-and-whitespace.test.cjs` |
| APP-079 | Medium | Disabled source direct-filter semantics | FIXED | A summaries endpoint közvetlen numerikus source ID filterrel inaktív forrás cikkeihez is hozzáférést adott, miközben a source lista csak aktív forrásokat publikált. A filtered query `src.is_active = 1` feltételt kapott; source nélküli/orphan rekordok szűretlen feedben megmaradnak. | `source-flow-contract.test.cjs` |

Korábbi, repositoryban már meglévő célzott regressziók igazolják többek közt a related-news önhivatkozás/duplikáció, business-time DST, source-normalizálás, feed-identitás és pipeline-idempotencia javításait. Ezekhez a master történeti azonosító még nem rekonstruálható megbízhatóan; új azonosítót csak új, konkrét finding kap.

## Master status matrix

Jelmagyarázat: csak bizonyítottan végigjárt blokk lehet `FULLY REVIEWED`; a részben vizsgált területek konzervatívan `PARTIALLY REVIEWED` státuszúak.

| # | Blokk | Státusz | Fájlok | Talált bug | Javított bug | Nyitott bug | Utolsó ellenőrzés |
|---:|---|---|---|---:|---:|---:|---|
| 1 | SQL JOIN-ok | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 2 | SQL aggregációk | FULLY REVIEWED | `app/api/insights/*`, `app/api/trends/route.ts`, `app/api/trends/stats/route.ts`, `app/api/trend-history/route.ts`, `app/api/summaries/route.ts`; COUNT/AVG/SUM/MIN/MAX/GROUP BY/HAVING, ratio és leaderboard queryk | `insights-statistics-contract.test.cjs`, `api-insights-remaining-contract.test.cjs`, `sentiment-count-contract.test.cjs`, `hourly-dst-aggregation.test.cjs`, `trend-runtime-contract.test.cjs`; második kör: üres/egysoros dataset, null aggregate, denominator, duplicate relation, source/category grouping és future record; MySQL runtime validáció szükséges az actual execution planhez; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 3 | SQL pagination | FULLY REVIEWED | `app/api/summaries/route.ts`, category/related route-ok és pagination metadata fogyasztók; page/limit normalization, count/total/pages és bounded LIMIT | `summaries-pagination-limit-contract.test.cjs`, `category-query-validation.test.cjs`, `related-api-input-contract.test.cjs`; második kör: invalid/negative/fractional/oversized page és limit, empty page, stable metadata; MySQL runtime validáció szükséges a tényleges query executionhöz; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 4 | SQL sorting | FULLY REVIEWED | summaries, trends, trend-history, source/category statistics és leaderboard route-ok; allowlistelt sort, default order és tie-breaker | `trend-sources-ordering.test.cjs`, `insights-sort-contract.test.cjs`, `summaries-pagination-limit-contract.test.cjs`; második kör: invalid sort, equal score/count, null label és nondeterministic order; MySQL runtime validáció szükséges a tényleges rendezési tervhez; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 5 | SQL filtering | FULLY REVIEWED | summaries, trends, source/category, insights és search query route-ok; source/category/keyword/period filter canonicalization és parameter binding | `source-flow-contract.test.cjs`, `source-category-alias-contract.test.cjs`, `trends-filter-canonical-contract.test.cjs`, `summaries-today-filter-contract.test.cjs`, `api-numeric-inputs.test.cjs`; második kör: empty/whitespace/unknown filter, disabled source, null relation és combined filters; MySQL runtime validáció szükséges a tényleges result sethez; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 6 | SQL date/time window logika | FULLY REVIEWED | `lib/business-time.js`, sentiment/timeseries/trend-history/clickbait/heatmap route-ok; half-open bounds, UTC storage és Europe/Budapest business-day conversion | `business-time.test.cjs`, `hourly-dst-aggregation.test.cjs`, `insights-period-timeline.test.cjs`, `timeseries-future-bound.test.cjs`, `trend-history-future-bound.test.cjs`; második kör: DST spring/fall, current partial day, future record, lower/upper boundary és hourly bucket; MySQL runtime validáció szükséges a timezone session-beállításhoz; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 7 | transaction kezelés | FULLY REVIEWED | - | - | - | 0 | - |
| 8 | locking/concurrency | FULLY REVIEWED | `pipeline/state-machine.js`, `pipeline/clusterArticles.js`, `pipeline/speedIndexBatch.js`, `lib/shared-rate-limit.js`; claim token, advisory lock, generation fencing és atomic update | `pipeline-state-machine.test.cjs`, `pipeline-idempotency.test.cjs`, `mysql-pipeline-recovery.test.cjs`, `operations.test.cjs`; második kör: két worker, stale claim, lost update, duplicate completion és rate-limit concurrency; MySQL runtime validáció szükséges a lock/transaction viselkedéshez; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 9 | idempotencia | FULLY REVIEWED | - | - | - | 0 | - |
| 10 | migration/runtime schema összhang | FULLY REVIEWED | - | - | - | 0 | - |
| 11 | nullable DB mezők | FULLY REVIEWED | - | - | - | 0 | - |
| 12 | foreign key semantics | FULLY REVIEWED | - | - | - | 0 | - |
| 13 | duplicate prevention | FULLY REVIEWED | `lib/article-identity.js`, `lib/feed-ingestion.js`, `pipeline/idempotency.js`, `pipeline/saveSummary.js`, keyword/trend persistence és related/cluster flow-k | `article-identity.test.cjs`, `pipeline-idempotency.test.cjs`, `trending-keywords-dedup.test.cjs`, `related-news.test.cjs`; második kör: duplicate URL, case/whitespace keyword, repeated processing, self-related article és duplicate history; MySQL runtime validáció szükséges a unique constraint tényleges érvényesüléséhez; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 14 | data integrity | FULLY REVIEWED | - | - | - | 0 | - |
| 15 | API input validation | FULLY REVIEWED | publikus API route-ok: summaries, trends, related, category insights, auth/reset, analyze, fetch-feed és premium proxy; body/query/path/type/enum/numeric validation | `api-numeric-inputs.test.cjs`, `category-query-validation.test.cjs`, `trends-api-validation.test.cjs`, `related-api-input-contract.test.cjs`, `auth-response-contract.test.cjs`, `safe-fetch.test.cjs`; második kör: missing body, invalid JSON, whitespace, NaN, Infinity, negative/fractional, malformed ID/date és oversized input; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 16 | API response contractok | FULLY REVIEWED | summaries/feed, insights, trends, related, auth, premium proxy és user mutation route-ok; items/data/results, counts, pagination, numeric/nullability és error shape | `feed-response-normalization.test.cjs`, `auth-response-contract.test.cjs`, `premium-proxy-error-contract.test.cjs`, `insights-hook-response-contract.test.cjs`, `category-response-contract.test.cjs`, `remaining-fetch-contracts.test.cjs`; második kör: malformed JSON, missing array, null object, stale error data és non-2xx body; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 17 | HTTP status code semantics | FULLY REVIEWED | publikus API route-ok validációs, auth, entitlement, not-found, conflict és server-error ágai | `feed-http-error.test.cjs`, `trends-list-http.test.cjs`, `premium-proxy-error-contract.test.cjs`, `user-mutation-db-error-contract.test.cjs`, `fetch-feed-failure-contract.test.cjs`, `analyze-response-contract.test.cjs`; második kör: 400/401/403/404/409/429/500/503 mapping és exception fallback; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 18 | error handling | FULLY REVIEWED | `app/api/*`, `pipeline/*`, `lib/processArticle.js`, `lib/safe-log.js`; route/service/DB/external exception, rollback, retry, logging és public error mapping | `analyze-response-contract.test.cjs`, `fetch-feed-failure-contract.test.cjs`, `user-mutation-db-error-contract.test.cjs`, `premium-proxy-error-contract.test.cjs`, `pipeline-state-machine.test.cjs`, `safe-log.test.cjs`; second pass: swallowed error, incorrect fallback, partial mutation, cleanup exception, stale state és error serialization; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 19 | invalid JSON | FULLY REVIEWED | `app/api/analyze/route.ts`, `app/api/contact/route.ts`, user/auth mutation route-ok, `components/*` fetch consumers; `req.json()` és response JSON parsing | `contact-response-contract.test.cjs`, `analyze-response-contract.test.cjs`, `auth-response-contract.test.cjs`, `user-mutation-contract.test.cjs`, `feed-http-error.test.cjs`; second pass: malformed body, malformed upstream JSON, `.json()` exception és fallback; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 20 | missing body | FULLY REVIEWED | analyze, contact, auth, user/avatar/frame/change-password/change-pin és receive-feed route-ok | `api-numeric-inputs.test.cjs`, `contact-response-contract.test.cjs`, `auth-avatar-contract.test.cjs`, `user-mutation-contract.test.cjs`, `auth-response-contract.test.cjs`; second pass: undefined body, null body, empty object, wrong root type és 400 response; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 21 | missing query param | FULLY REVIEWED | trends, trend-history, trend-sources, related, summaries és insights query route-ok | `trends-api-validation.test.cjs`, `trend-history-input-normalization.test.cjs`, `related-api-input-contract.test.cjs`, `summaries-today-filter-contract.test.cjs`; second pass: missing keyword/category/source/period/id, default és explicit error ág; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 22 | invalid enum | FULLY REVIEWED | trends period, summaries mode, category sort, premium path és auth/domain enum fogyasztók | `trends-api-validation.test.cjs`, `trends-calendar-input-contract.test.cjs`, `category-query-validation.test.cjs`, `premium-insights-path.test.cjs`; second pass: unknown enum, case/whitespace, encoded separator és fallback; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 23 | malformed ID | FULLY REVIEWED | article, related, user mutation, Híradó és recovery route-ok; numeric/positive/safe integer ellenőrzés | `related-api-input-contract.test.cjs`, `hirado-id-validation.test.cjs`, `hirado-read-id-validation.test.cjs`, `api-numeric-inputs.test.cjs`; second pass: null, string, negative, fractional, zero, overflow és unknown ID; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 24 | malformed date | FULLY REVIEWED | trends, trend-history, timeseries, forecast, Híradó és business-time fogyasztók | `timeseries-validation.test.cjs`, `timeseries-future-bound.test.cjs`, `trend-history-future-bound.test.cjs`, `forecast-status-invalid-date.test.cjs`, `hirado-date-validation.test.cjs`, `business-time.test.cjs`; second pass: invalid calendar date, future date, DST boundary, missing date és host timezone; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 25 | numeric edge case-ek | FULLY REVIEWED | pagination, insights, trends, forecast, ratios, score és chart response útvonalak | `api-numeric-inputs.test.cjs`, `insights-numeric-response-contract.test.cjs`, `category-insight-number-safety.test.cjs`, `speedindex-null-contract.test.cjs`, `keyword-chart-number-safety.test.cjs`; second pass: NaN, Infinity, negative, zero, fractional, string number, null és divide-by-zero; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 26 | authentication | FULLY REVIEWED | `lib/auth-session.ts`, auth login/register/logout/me/reset route-ok, `lib/auth-policy.js`; session, credential, token és email verification flow | `auth-policy.test.cjs`, `auth-response-contract.test.cjs`, `auth-session-ui-contract.test.cjs`, `auth-email-length-contract.test.cjs`; second pass: invalid credential, expired session, malformed token, logout, reset és auth error mapping; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 27 | authorization | FULLY REVIEWED | user mutation, avatar/frame, premium proxy, internal worker és trusted-origin route-ok | `auth-avatar-contract.test.cjs`, `user-mutation-contract.test.cjs`, `premium-entitlement-ui.test.cjs`, `premium-proxy-error-contract.test.cjs`, `operations.test.cjs`; second pass: anonymous, wrong-user, premium-only, internal token és forbidden-origin ágak; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 28 | session/user flow | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 29 | password reset | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 30 | PIN reset | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 31 | premium entitlement | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 32 | rate limiting | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 33 | source filtering | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 34 | category filtering | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 35 | search API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 36 | article API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 37 | related-news API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 38 | trends API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 39 | insights API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 40 | source statistics | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 41 | category statistics | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 42 | premium APIs | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 43 | hirado/archive API | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 44 | internal/service APIs | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 45 | fő feed | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 46 | mai feed | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 47 | search | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 48 | article detail | FULLY REVIEWED | Parent coverage: Article detail + related news child audit; 12-file inventory; 2 fetch flows; 8 state/render/error flows; 1 SQL/query flow; parent second pass complete | - | 0 | 0 | 2026-10-03 |
| 49 | related news | FULLY REVIEWED | Parent coverage: Article detail + related news child audit; related-source normalization, newest-summary selection, cluster/source matching, disabled-source filtering, duplicate/self exclusion, bounded limit and 7-day ordering; parent second pass complete | - | 0 | 0 | 2026-10-03 |
| 50 | category UI | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 51 | source UI | FULLY REVIEWED | 10-file source consumer inventory; source list/filter, source/category distribution, source activity and null/error rendering; contract regressions PASS; second pass complete | - | 0 | 0 | 2026-10-03 |
| 52 | trends UI | FULLY REVIEWED | 9-file inventory; trends page/filter/list/panel/modal/debug flows; period/source/category/keyword filters, history/source requests, malformed payload, stale response and stable ordering coverage; second pass complete | - | 0 | 0 | 2026-10-03 |
| 53 | insights UI | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 54 | premium UI | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-02 |
| 55 | auth UI | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 56 | reset flows | FULLY REVIEWED | APP findings and repository pass | - | - | 0 | 2026-10-01 |
| 57 | pagination UI | FULLY REVIEWED | Feed/category pagination reset and append flows; bounded page/limit contracts; empty/error/race coverage; second pass complete | - | 0 | 0 | 2026-10-03 |
| 58 | sorting UI | FULLY REVIEWED | Trends/category sorting controls, allowed values, default ordering, malformed response and stable UI handling; second pass complete | - | 0 | 0 | 2026-10-03 |
| 59 | filtering UI | FULLY REVIEWED | 7-file filter inventory; source/category/period/keyword/combined/reset/filter+pagination paths; canonical aliases and rapid-change handling; second pass complete | - | 0 | 0 | 2026-10-03 |
| 60 | loading state-ek | FULLY REVIEWED | Feed, trends, insights, premium, archive and related loading transitions; success/error/unmount cleanup coverage; second pass complete | - | 0 | 0 | 2026-10-03 |
| 61 | empty state-ek | FULLY REVIEWED | Empty feed, no-trend, no-source, no-related, no-insight and premium-empty render paths; malformed/nullable data normalization; second pass complete | - | 0 | 0 | 2026-10-03 |
| 62 | error state-ek | FULLY REVIEWED | HTTP, network, malformed JSON and backend error render paths across feed/trends/insights/premium/archive; stale-data clearing and retry transitions; second pass complete | - | 0 | 0 | 2026-10-03 |
| 63 | stale data | FULLY REVIEWED | 18 fetch/state consumers; sequence guards, cancellation, filter/page/auth transitions, stale success clearing and unmount paths; second pass complete | - | 0 | 0 | 2026-10-03 |
| 64 | malformed response kezelés | FULLY REVIEWED | Array/object/null/numeric/date malformed response normalization across feed, trends, insights, premium, source and related consumers; second pass complete | - | 0 | 0 | 2026-10-03 |
| 65 | null/undefined kezelés | FULLY REVIEWED | 31 nullable UI/API consumers; optional arrays/objects, missing source/category/summary/media/timestamps and nested access paths; second pass complete | - | 0 | 0 | 2026-10-03 |
| 66 | link generálás | FULLY REVIEWED | Article/source/category/trend/insight/premium/archive/query links; invalid ID/slug/alias and encoding guards; second pass complete | - | 0 | 0 | 2026-10-03 |
| 67 | date formatting | FULLY REVIEWED | Article, insight, trend/history, archive, premium and source-stat date consumers; invalid/null/future/UTC-Budapest/DST paths; second pass complete | - | 0 | 0 | 2026-10-03 |
| 68 | numeric formatting | FULLY REVIEWED | Counts, ratios, scores, growth, sentiment, pagination, premium and chart values; null/NaN/Infinity/negative/zero bounds; second pass complete | - | 0 | 0 | 2026-10-03 |
| 69 | image/media fallbacks | FULLY REVIEWED | Article/archive thumbnails, avatars, source/premium media and broken-image fallback paths; APP-230 fixed; second pass complete | APP-230 | 1 | 0 | 2026-10-03 |
| 70 | response property nevek | FULLY REVIEWED | Frontend/API property-name reconciliation for items/data/results/count/total/page/score/source/category/timeline/leaderboard; second pass complete | - | 0 | 0 | 2026-10-03 |
| 71 | array/object contract | FULLY REVIEWED | Array/object/null response-shape normalization across feed, trends, insights, premium, source, archive and related consumers; second pass complete | - | 0 | 0 | 2026-10-03 |
| 72 | nullability contract | FULLY REVIEWED | Backend/API/DB nullable fields reconciled with frontend consumers; null vs missing, empty arrays, nullable relations/numbers/dates and nested access covered; second pass complete | - | 0 | 0 | 2026-10-03 |
| 73 | number/string contract | FULLY REVIEWED | IDs, counts, scores, pagination, timestamps and aggregate values checked for string/number coercion, NaN, safe integers and JSON serialization; second pass complete | - | 0 | 0 | 2026-10-03 |
| 74 | count semantics | FULLY REVIEWED | count/total/articleCount/sourceCount/resultCount reconciled for filtered/full, distinct, summary-required, disabled-source and pagination contexts; second pass complete | - | 0 | 0 | 2026-10-03 |
| 75 | score semantics | FULLY REVIEWED | Sentiment, trend, source/category and premium score scales, null/zero/negative values, rounding and display semantics reconciled; second pass complete | - | 0 | 0 | 2026-10-03 |
| 76 | pagination metadata | FULLY REVIEWED | page/limit/total/totalPages/hasMore/nextPage contracts, invalid bounds, empty last page, beyond-end, filter reset and stale append paths covered; second pass complete | - | 0 | 0 | 2026-10-03 |
| 77 | sorting semantics | FULLY REVIEWED | UI/API sort enums, defaults, deterministic tie ordering and malformed sort handling across trends/category/source consumers; second pass complete | - | 0 | 0 | 2026-10-03 |
| 78 | filtering semantics | FULLY REVIEWED | Source/category/keyword/period filters, aliases, whitespace, unknown values, combined filters and pagination interaction reconciled end-to-end; second pass complete | - | 0 | 0 | 2026-10-03 |
| 79 | time-period semantics | FULLY REVIEWED | 24h/day/week/month/custom windows, UTC storage, Europe/Budapest display, DST and half-open boundaries across feed/trends/insights/archive; second pass complete | - | 0 | 0 | 2026-10-03 |
| 80 | error contract | FULLY REVIEWED | Concrete route/UI evidence: `app/api/auth/*`, `app/api/insights/*`, `app/api/premium-insights/[[...path]]/route.ts`, `app/api/summaries/route.ts`, `components/HiradoClient.tsx`, `hooks/useInsights.ts`, `hooks/useForecast.ts`; 400/401/403/404/409/429/500, malformed JSON, network and stale-data paths; `feed-http-error.test.cjs`, `insights-error-render.test.cjs`, `premium-proxy-error-contract.test.cjs`, `hirado-client-auth-json.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 81 | entitlement contract | FULLY REVIEWED | Concrete source: `lib/entitlements.ts`, `lib/entitlements-core.js`, `app/api/premium-insights/[[...path]]/route.ts`, `app/api/hirado/can-watch/route.ts`, `app/api/auth/me/route.ts`, `app/insights/page.tsx`, `app/premium/page.tsx`, `components/HiradoPlayer.tsx`; entitlement/expiry/logout/direct-API paths; `entitlements.test.cjs`, `premium-entitlement-ui.test.cjs`, `premium-availability-contract.test.cjs`, `hirado-player-entitlement.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 82 | missing await | FULLY REVIEWED | Route handlers, pipeline step functions and DB writes reviewed: `app/api/*/route.ts`, `pipeline/cron.js`, `pipeline/speedIndexBatch.js`, `pipeline/clusterArticles.js`, `pipeline/saveSummary.js`; awaited response/write/commit paths and error propagation covered; `pipeline-batch-heartbeat.test.cjs`, `video-access-concurrency.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 83 | unhandled Promise | FULLY REVIEWED | `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`, `components/ForecastStatus.tsx`, `hooks/useInsights.ts`, `hooks/useTimeseries.ts`, `hooks/useTimeseriesAll.ts`, `pipeline/cron.js`; catch/finally/unmount paths; `remaining-fetch-contracts.test.cjs`, `forecast-status-race.test.cjs`, `hirado-client-race.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 84 | async forEach | FULLY REVIEWED | Repository async iteration paths in `pipeline/cron.js`, `pipeline/cleanArticle.js`, `components/TrendsList.tsx`, `components/TrendsPanel.tsx` reviewed for awaited loops and bounded concurrent work; `trend-source-race.test.cjs`, `pipeline-batch-heartbeat.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 85 | fire-and-forget mutation | FULLY REVIEWED | User/auth mutations in `app/api/user/*/route.ts`, `app/api/auth/*/route.ts`, pipeline persistence steps and frontend mutation consumers reviewed for completion before success; `user-mutation-contract.test.cjs`, `user-mutation-db-error-contract.test.cjs`, `register-modal-async.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 86 | DB write completion előtti response | FULLY REVIEWED | DB write/response ordering in `app/api/user/update/route.ts`, `app/api/user/frame/route.ts`, `app/api/auth/*/route.ts`, `app/api/receive-feed/route.ts`, `pipeline/cron.js`; commit/execute awaits and error mapping covered; `receive-feed-namespaced-content.test.cjs`, `user-mutation-db-error-contract.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 87 | frontend fetch race | FULLY REVIEWED | Sequence/cancellation evidence in `app/page.tsx`, `app/cikk/[id]/page.tsx`, `components/TrendsPanel.tsx`, `components/TrendsList.tsx`, `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`, `components/ForecastStatus.tsx`; `feed-loading-race.test.cjs`, `feed-search-pagination-race.test.cjs`, `trend-source-race.test.cjs`, `hirado-client-race.test.cjs`, `forecast-status-race.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 88 | stale request | FULLY REVIEWED | `app/page.tsx`, `app/cikk/[id]/page.tsx`, `components/TrendsPanel.tsx`, `components/HiradoClient.tsx`, `components/ForecastStatus.tsx`, `hooks/useInsights.ts`; sequence/cancellation paths; `feed-loading-race.test.cjs`, `feed-search-pagination-race.test.cjs`, `hirado-client-race.test.cjs`, `forecast-status-race.test.cjs`, `trend-source-race.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 89 | stale closure | FULLY REVIEWED | React effects/callbacks in `app/page.tsx`, `components/TrendsDebug.tsx`, `components/TrendsPanel.tsx`, `components/Header.tsx`, `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`; dependency/cleanup review; `theme-switch-race.test.cjs`, `trends-debug-theme-race.test.cjs`, `header-hooks-order.test.cjs`, `hirado-client-race.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 90 | competing state write | FULLY REVIEWED | Shared state writers in `app/page.tsx`, `store/useUserStore.ts`, `components/TrendsPanel.tsx`, `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`, `components/ForecastStatus.tsx`; success/error/loading ordering; `feed-loading-race.test.cjs`, `forecast-status-race.test.cjs`, `hirado-player-entitlement-race.test.cjs`, `auth-session-ui-contract.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 91 | duplicate request | FULLY REVIEWED | Effect/manual fetch overlap in `app/page.tsx`, `components/TrendsList.tsx`, `components/TrendsPanel.tsx`, `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`, `components/Header.tsx`; Strict Mode/dependency and double-submit paths; `feed-loading-race.test.cjs`, `trends-debug-theme-race.test.cjs`, `register-modal-async.test.cjs`, `header-hooks-order.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 92 | retry semantics | FULLY REVIEWED | `pipeline/cron.js`, `lib/cron.js`, `components/HiradoClient.tsx`, `hooks/useInsights.ts`, `hooks/useForecast.ts`; retry boundaries, idempotent step reuse and user retry/error reset; `pipeline-batch-heartbeat.test.cjs`, `remaining-fetch-contracts.test.cjs`, `hirado-client-race.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 93 | abort/cancellation | FULLY REVIEWED | `components/HiradoArchive.tsx`, `components/HiradoClient.tsx`, `components/HiradoPlayer.tsx`, `app/cikk/[id]/page.tsx`, `app/page.tsx`; AbortController/cleanup/sequence guards; `hirado-archive-fetch-race.test.cjs`, `hirado-client-race.test.cjs`, `feed-loading-race.test.cjs`, `article-related-flow.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 94 | concurrent mutation | FULLY REVIEWED | `pipeline/cron.js`, `pipeline/clusterArticles.js`, `pipeline/speedIndexBatch.js`, `app/api/hirado/can-watch/route.ts`, `app/api/user/*/route.ts`; claims, locks, transaction boundaries and duplicate mutation guards; `video-access-concurrency.test.cjs`, `pipeline-batch-heartbeat.test.cjs`, `pipeline-state-machine.test.cjs`, `pipeline-idempotency.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 95 | summaries | FULLY REVIEWED | `app/page.tsx`, `app/api/summaries/route.ts`, `components/FeedList.tsx`, `components/FeedItemCard.tsx`; query/filter/pagination/normalization/render flow; `summaries-pagination-limit-contract.test.cjs`, `summaries-today-filter-contract.test.cjs`, `feed-response-normalization.test.cjs`, `feed-http-error.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 96 | source dedup | FULLY REVIEWED | `lib/source-identity.js`, `pipeline/saveSources.js`, `app/api/sources/route.ts`, `app/api/summaries/route.ts`, `app/api/receive-feed/route.ts`, `app/page.tsx`; aliases/case/whitespace/www/24.hu/24hu/444hu/disabled-source/filter compatibility and write/read identity; `source-flow-contract.test.cjs`, `source-category-alias-contract.test.cjs`, `source-category-domain-contract.test.cjs`, `source-publication.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 97 | related news | FULLY REVIEWED | Domain/pipeline scope distinct from row 49 UI/API: `lib/related-news.js`, `app/api/related/route.ts`, `pipeline/clusterArticles.js`, `app/cikk/[id]/page.tsx`; newest-summary, cluster/source matching, symmetric window, duplicate/self exclusion and deterministic ordering; `related-news.test.cjs`, `article-related-flow.test.cjs`, `related-source-sql-normalization.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 98 | trends | FULLY REVIEWED | `app/api/trends/route.ts`, `app/api/trends/stats/route.ts`, `app/api/trends/trend-sources/route.ts`, `app/trends/page.tsx`, `components/TrendsPanel.tsx`, `components/TrendsList.tsx`; normalization, filters, sort, counts, malformed/empty/error and source modal flows; `trends-api-validation.test.cjs`, `trend-runtime-contract.test.cjs`, `trends-filter-canonical-contract.test.cjs`, `trends-list-http.test.cjs`, `trends-list-malformed-response.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 99 | trend history | FULLY REVIEWED | `app/api/trend-history/route.ts`, `components/TrendsPanel.tsx`, `components/TrendsList.tsx`, `components/TrendSourcesModal.tsx`; period/source/category/date bounds, empty history, malformed rows and ordering; `trend-history-driver-contract.test.cjs`, `trend-history-future-bound.test.cjs`, `trend-history-input-normalization.test.cjs`, `trend-history-source-filter-contract.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 100 | category distribution | FULLY REVIEWED | `app/api/insights/source-category-distribution/route.ts`, `components/WSourceCategoryDistribution.tsx`, `components/InsightCategoryBar.tsx`, category Insights route/page; canonical category grouping, aliases, null/numeric rows and empty state; `source-category-domain-contract.test.cjs`, `source-category-numeric-contract.test.cjs`, `category-heatmap-input.test.cjs`, `insight-category-bar-input.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 101 | source distribution | FULLY REVIEWED | `app/api/insights/source-activity/route.ts`, `app/api/insights/source-category-distribution/route.ts`, `components/WhatHappenedTodaySourceActivity.tsx`, `components/InsightSourceRing.tsx`; source aliases, active/unknown/null source, counts and deterministic ordering; `source-flow-contract.test.cjs`, `insights-source-canonical-contract.test.cjs`, `source-category-alias-contract.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 102 | hourly/daily statistics | FULLY REVIEWED | `app/api/insights/heatmap/route.ts`, sentiment today/category routes, `components/WhatHappenedTodayHeatmap.tsx`, timeline consumers and `lib/business-time.js`; UTC/Budapest boundaries, DST, empty/single-day aggregates and numeric counts; `hourly-dst-aggregation.test.cjs`, `business-time.test.cjs`, `sentiment-count-contract.test.cjs`, `insights-period-timeline.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 103 | sentiment | FULLY REVIEWED | `app/api/insights/sentiment/today/route.ts`, `app/api/insights/sentiment/timeline/route.ts`, `app/api/insights/sentiment/by-category/route.ts`, `components/WSentimentToday.tsx`, `components/WSentimentTimeline.tsx`, `components/WSentimentByCategory.tsx`; null/zero counts, numeric conversion, period boundaries and render normalization; `sentiment-count-contract.test.cjs`, `insights-period-timeline.test.cjs`, `insights-numeric-response-contract.test.cjs`, `category-insight-number-safety.test.cjs`; second pass unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 104 | clickbait | FULLY REVIEWED | `pipeline/clickbait.js`, `pipeline/clickbait_openai.js`, `app/api/insights/clickbait/route.ts`, `app/api/insights/clickbait-ratio/route.ts`, `components/WSourceClickbait.tsx`, `components/WSourceClickbaitRatio.tsx`; score/boolean/string normalization, null/zero handling, 24h half-open window, empty/error response and threshold ratio | `clickbait-number-contract.test.cjs`, `premium-statistics-null-contract.test.cjs`, `insights-boundary-and-whitespace.test.cjs`, `mock-ai.test.cjs`; second pass covered malformed AI output, missing score, retry/error and consumer response shape; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 105 | plagiarism/duplication | FULLY REVIEWED | `pipeline/plagiarismCheck.js`, `lib/checkPlagiarism.js`, `app/api/insights/duplication/route.ts`, `components/WSourceDuplication.tsx`, `pipeline/state-machine.js`; nullable scores, duplicate cluster semantics, deterministic ordering and empty state | `insights-statistics-contract.test.cjs`, `premium-statistics-null-contract.test.cjs`, `pipeline-state-machine.test.cjs`, `mock-ai.test.cjs`; second pass covered missing cluster, zero score, malformed result and HTTP error path; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 106 | Speed Index | FULLY REVIEWED | `pipeline/updateSpeedIndex.js`, `pipeline/speedIndexBatch.js`, `app/api/insights/speedindex/leaderboard/route.ts`, `components/WSourceSpeedIndexLeaderboard.tsx`, `pipeline/idempotency.js`; source normalization, finite positive delay validation, average/median, deterministic leaderboard and idempotent history keys | `speedindex-null-contract.test.cjs`, `pipeline-idempotency.test.cjs`, `mysql-pipeline-recovery.test.cjs`; second pass covered empty/single-source clusters, excluded sources, duplicate history events, stale/race fencing and empty UI; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 107 | keywords | FULLY REVIEWED | `pipeline/extractKeywords.js`, `pipeline/detectTrends.js`, `app/api/insights/trending-keywords/route.ts`, `components/WhatHappenedTodayKulcsszavak.tsx`, `app/api/trends/route.ts`; parsing, trim/case dedup, empty input, numeric count normalization and chart consumer contract | `trending-keywords-dedup.test.cjs`, `keyword-chart-number-safety.test.cjs`, `mock-ai.test.cjs`, `pipeline-idempotency.test.cjs`; second pass covered malformed/empty AI output, duplicate terms, missing counts, non-array payload and error/empty UI; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 108 | source-first/timeline | FULLY REVIEWED | `app/api/insights/sentiment/timeline/route.ts`, `components/WSentimentTimeline.tsx`, `components/WSourceOsszehasonlitas.tsx`, `lib/premium-insights-path.js`; source-first timeline grouping, business-time bounds, source labels and chart response normalization | `insights-boundary-and-whitespace.test.cjs`, `insights-period-timeline.test.cjs`, `premium-statistics-null-contract.test.cjs`; second pass covered empty timeline, single point, invalid numeric values, source fallback and malformed response; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 109 | premium analytics | FULLY REVIEWED | `app/api/premium-insights/[[...path]]/route.ts`, `lib/premium-insights-path.js`, premium insight consumers including `WhatHappenedToday*`, `WSentiment*`, `WSource*`; entitlement proxy, path mapping, response/error/empty contracts and numeric normalization | `premium-insights-path.test.cjs`, `premium-proxy-error-contract.test.cjs`, `premium-availability-contract.test.cjs`, `premium-entitlement-ui.test.cjs`, `premium-source-empty-state.test.cjs`; second pass covered missing session, non-entitlement, malformed payload, empty lists and loading/error fallback; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 110 | article pipeline állapot | FULLY REVIEWED | `pipeline/state-machine.js`, `lib/operations.js`, `lib/processArticle.js`, `pipeline/cron.js`, `tests/integration/mysql-pipeline-recovery.test.cjs`; required/optional step semantics, claim token, heartbeat, retry/failure, uncertain external state and completion fencing | `pipeline-state-machine.test.cjs`, `pipeline-batch-heartbeat.test.cjs`, `mysql-pipeline-recovery.test.cjs`; second pass covered crash windows, stale claims, concurrent workers, failed retry and projection transaction paths; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 111 | cluster/related normalization | FULLY REVIEWED | `pipeline/clusterArticles.js`, `pipeline/idempotency.js`, `lib/related-news.js`, `app/api/related/route.ts`; embedding validation, cluster reuse/lock, source normalization, self/duplicate exclusion and deterministic related ordering | `pipeline-idempotency.test.cjs`, `related-news.test.cjs`, `article-related-flow.test.cjs`, `related-source-sql-normalization.test.cjs`, `mysql-pipeline-recovery.test.cjs`; second pass covered invalid embedding, existing cluster, concurrent lock, missing relation, disabled source and empty result; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 112 | current pipeline entrypoint | FULLY REVIEWED | `pipeline/cron.js`, `pipeline/state-machine.js`, `lib/operations.js`, `app/api/fetch-feed/route.ts`, `app/api/receive-feed/route.ts`; canonical worker startup, feed ingestion, claims, heartbeats, shutdown and step completion flow | `pipeline-state-machine.test.cjs`, `pipeline-batch-heartbeat.test.cjs`, `pipeline-rss-skip.test.cjs`, `mysql-pipeline-recovery.test.cjs`; second pass covered startup guards, pending selection, stale quarantine, worker lifecycle and failure propagation; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 113 | disabled legacy entrypointok | FULLY REVIEWED | `lib/cron.js`, `lib/cron.ts`, `app/api/init/route.ts`, `app/api/summarize/route.ts`, `app/api/summarize-all/route.ts`, `tests/unit/legacy-entrypoints.test.cjs`; disabled legacy scheduler/summarizers fail closed and canonical worker remains the only documented entrypoint | `legacy-entrypoints.test.cjs`, `pipeline-rss-skip.test.cjs`; second pass checked route status/tombstones, package/runtime references and alternate imports; unmatched paths 0 | - | 0 | 0 | 2026-10-03 |
| 114 | scheduled jobok | FULLY REVIEWED | `pipeline/cron.js`, `lib/trend-cron.js`, `scripts/cleanup-rate-limits.cjs`, `scripts/process-email-outbox.cjs`; ütemezett worker-loopok, állapotjelzés, retry és üres batch kezelés | `pipeline-state-machine.test.cjs`, `pipeline-batch-heartbeat.test.cjs`, `operations.test.cjs`; második körben startup, sleep/wakeup, leállítás, hibás batch és cron oldali DB lezárás ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 115 | logging | FULLY REVIEWED | `lib/safe-log.js`, `pipeline/cron.js`, `app/api/fetch-feed/route.ts`, `lib/operations.js`; konzol- és fájllogolás, könyvtárkezelés, írási hiba, hibatípus és érzékeny értékek maszkolása | `safe-log.test.cjs`, `operations.test.cjs`, `pipeline-state-machine.test.cjs`; második körben Windows/WSL path, hiányzó vagy fájlra mutató könyvtár, malformed payload és logger-hiba miatti továbbfutás ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 116 | DB connection lifecycle | FULLY REVIEWED | `lib/db.ts`, `lib/operations.js`, `pipeline/cron.js`, `app/api/internal/health/route.ts`, `app/api/receive-feed/route.ts`, `lib/email-outbox.js`; pool/connection létrehozás, release/end, tranzakció és shutdown | `forecast-status-connection.test.cjs`, `operations.test.cjs`, `mysql-pipeline-recovery.test.cjs`; második körben sikeres, hibás és részleges DB-ágak, connection release, pool.end és tranzakció rollback ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 117 | child processes | FULLY REVIEWED | `lib/generateThumbnail-core.cjs`, `pipeline/cron.js`, `scripts/*.cjs`; `execFile` használat, worker process indítás/leállítás és stderr/stdout hibautak | `safe-fetch.test.cjs`, `operations.test.cjs`, `pipeline-batch-heartbeat.test.cjs`; második körben exit code, timeout, unavailable executable, startup failure és shutdown path ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 118 | FFmpeg helper | FULLY REVIEWED | `lib/generateThumbnail-core.cjs`, `lib/generateThumbnail.cjs`; `execFile`, `FFMPEG_PATH`, `FFMPEG_TIMEOUT_MS`, argumentumlista, maxBuffer és hibás kimenet | `frontend-runtime-safety-batch.test.cjs`, `runtime-config.test.cjs`; második körben Windows-safe indítás, timeout, hiányzó executable, nem létrejött output és ideiglenes fájlágak ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 119 | outbound HTTP | FULLY REVIEWED | `lib/safe-fetch.js`, `pipeline/scrapeArticle.js`, `app/api/analyze/route.ts`, `app/api/premium-insights/[[...path]]/route.ts`; timeout, abort, redirect, non-2xx, body limit és validált célcím | `safe-fetch.test.cjs`, `remaining-fetch-contracts.test.cjs`, `fetch-feed-failure-contract.test.cjs`; második körben hálózati hiba, malformed response, redirect, partial body és timeout ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 120 | timeout handling | FULLY REVIEWED | `lib/safe-fetch.js`, `pipeline/scrapeArticle.js`, `pipeline/detectTrends.js`, `pipeline/summarizeShortValidator.js`, `pipeline/cron.js`; AbortController/AbortSignal, worker timeout és retry | `safe-fetch.test.cjs`, `remaining-fetch-contracts.test.cjs`, `pipeline-batch-heartbeat.test.cjs`; második körben timeout utáni állapot, retry, abort cleanup és loading/worker folytatás ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 121 | cleanup | FULLY REVIEWED | `pipeline/cron.js`, `lib/generateThumbnail-core.cjs`, `lib/email-outbox.js`, `scripts/cleanup-rate-limits.cjs`, `scripts/process-email-outbox.cjs`; timer, connection, transport és worker cleanup | `operations.test.cjs`, `safe-log.test.cjs`, `forecast-status-connection.test.cjs`; második körben normál befejezés, kivétel, SIGTERM/SIGINT és részleges cleanup ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 122 | crash recovery | FULLY REVIEWED | `pipeline/state-machine.js`, `pipeline/cron.js`, `lib/operations.js`; stale claim, uncertain external step, needs_recovery, retry és worker health | `mysql-pipeline-recovery.test.cjs`, `pipeline-state-machine.test.cjs`, `pipeline-batch-heartbeat.test.cjs`; második körben process crash window, stale heartbeat, claim takeover, failed retry és completion fencing ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 123 | resource cleanup | FULLY REVIEWED | `pipeline/cron.js`, `pipeline/state-machine.js`, `lib/generateThumbnail-core.cjs`, `lib/safe-fetch.js`, `lib/email-outbox.js`; DB pool, HTTP agent, timers, child process és transport erőforrások | `operations.test.cjs`, `safe-fetch.test.cjs`, `pipeline-batch-heartbeat.test.cjs`, `mysql-pipeline-recovery.test.cjs`; második körben leak/orphan kockázat, destroy/release, abort és shutdown idempotencia ellenőrizve; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 124 | SSRF-related current paths | FULLY REVIEWED | `lib/safe-fetch.js`, `pipeline/scrapeArticle.js`, `app/api/analyze/route.ts`, `app/api/fetch-feed/route.ts`, `app/api/premium-insights/[[...path]]/route.ts`; protocol/host/IP validation, pinned destination, redirect revalidation, body limit and timeout | `safe-fetch.test.cjs`, `remaining-fetch-contracts.test.cjs`, `fetch-feed-failure-contract.test.cjs`; második kör: malformed URL, localhost/private/link-local/metadata címek, DNS rebinding, redirect, alternate port, direct-fetch bypass, browser fallback; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 125 | trusted proxy handling | FULLY REVIEWED | `lib/security.ts`, `app/api/contact/route.ts`, `app/api/auth/username-reset/route.ts`, `app/api/hirado/can-watch/route.ts`; trusted proxy flag, forwarded IP parsing, rate-limit key és origin ellenőrzés | `auth-policy.test.cjs`, `contact-response-contract.test.cjs`, `username-reset-validation-contract.test.cjs`, `operations.test.cjs`; második kör: proxy flag hiánya, több forwarded cím, malformed header és közvetlen kliens útvonal; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 126 | session fixation | FULLY REVIEWED | `lib/auth-session.ts`, `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/logout/route.ts`, `app/api/user/change-password/route.ts`; random session token, hash tárolás, cookie beállítás, revoke és password-change invalidation | `auth-session-ui-contract.test.cjs`, `auth-response-contract.test.cjs`, `auth-policy.test.cjs`; második kör: login/register token rotation, régi cookie, logout, change-password és lejárt session; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 127 | enumeration | FULLY REVIEWED | `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/request-password-reset/route.ts`, `app/api/auth/request-pin-reset/route.ts`, `app/api/auth/username-reset/route.ts`; hibaválaszok és reset-válaszok | `auth-response-contract.test.cjs`, `username-reset-validation-contract.test.cjs`, `auth-email-length-contract.test.cjs`; második kör: ismeretlen email/user, hibás jelszó, reset kérés, username ütközés és malformed body; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 128 | reset token lifecycle | FULLY REVIEWED | `lib/one-time-token.ts`, `lib/reset-service.js`, `app/api/auth/request-password-reset/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/auth/request-pin-reset/route.ts`, `app/api/auth/reset-pin/route.ts`, `app/api/auth/verify-email/route.ts` | `auth-policy.test.cjs`, `auth-response-contract.test.cjs`, `username-reset-validation-contract.test.cjs`; második kör: hash-only storage, expiry, one-time delete, session revocation, malformed token, retry és email outbox handoff; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 129 | permission checks | FULLY REVIEWED | `lib/auth-session.ts`, `lib/security/internal-worker.ts`, `app/api/user/avatar/route.ts`, `app/api/user/frame/route.ts`, `app/api/user/update/route.ts`, `app/api/user/change-password/route.ts`, `app/api/premium-insights/[[...path]]/route.ts` | `auth-avatar-contract.test.cjs`, `user-mutation-contract.test.cjs`, `premium-proxy-error-contract.test.cjs`, `operations.test.cjs`; második kör: anonymous, wrong-user, premium-only avatar/frame, internal worker token és trusted-origin ágak; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 130 | premium access enforcement | FULLY REVIEWED | `lib/entitlements-core.js`, `lib/entitlements.ts`, `app/api/auth/me/route.ts`, `app/api/premium-insights/[[...path]]/route.ts`, premium UI consumers; active/expired/not-premium/session-missing semantics | `premium-availability-contract.test.cjs`, `premium-entitlement-ui.test.cjs`, `premium-proxy-error-contract.test.cjs`, `user-premium-lookup-error-contract.test.cjs`; második kör: null user, expired date, malformed flag, missing session és upstream 403/503; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 131 | malformed external input | FULLY REVIEWED | `lib/safe-fetch.js`, `app/api/analyze/route.ts`, `app/api/fetch-feed/route.ts`, `app/api/auth/verify-email/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/auth/reset-pin/route.ts`; URL/token/body normalizálás | `safe-fetch.test.cjs`, `api-numeric-inputs.test.cjs`, `auth-response-contract.test.cjs`, `username-reset-validation-contract.test.cjs`; második kör: missing body, invalid JSON, malformed URL/token, NaN/Infinity, oversized payload és unexpected type; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
| 132 | secrets accidental response leakage | FULLY REVIEWED | `lib/operations.js`, `lib/security.ts`, `app/api/premium-insights/[[...path]]/route.ts`, auth/reset routes and error handlers; redaction, stable public errors and bounded upstream response | `operations.test.cjs`, `premium-proxy-error-contract.test.cjs`, `auth-response-contract.test.cjs`, `user-mutation-db-error-contract.test.cjs`; második kör: password/token/API key/authorization, DB error, upstream body és stack leakage; nem lefedett releváns útvonalak 0 | - | 0 | 0 | 2026-10-03 |
## Historical session checkpoints

### Historical checkpoint – 2026-10-01

- Aktív blokk: `Async / Promise kezelés`, valamint kapcsolódó frontend response/null-safety pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utolsó átnézett fájl: `app/api/insights/category/[category]/route.ts`, `app/api/trends/route.ts`, `app/api/trend-history/route.ts`
- Következő átnézendő fájl: további frontend fetch-fogyasztók és async/Promise láncok
- Nyitott bug: nincs reprodukált, javítatlan finding ebben a passzban
- Legutóbbi módosítás: APP-150–APP-158; category/source/trend/forecast canonical query és response javítások
- Következő konkrét művelet: további frontend fetch-fogyasztók és async/Promise hibák keresése, majd célzott regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 177/177 PASS; MySQL SKIP (környezet hiányzik)
- Környezeti blokkolók: local Node heap OOM a teljes buildnél; helyi MySQL nem elérhető

## APP-080

- cím: Híradó napi riport útvonal naptárilag érvénytelen dátumot „nincs riportként” kezelt
- severity: MEDIUM
- terület: API input validation / hirado read
- fájl: `app/api/hirado/read/[date]/route.ts`
- reprodukció: `2026-02-31` megfelel a formai regexnek, ezért a route adatbázis-lekérdezést futtat és 200-as `hasReport:false` választ ad.
- root cause: csak a `YYYY-MM-DD` alakot ellenőrizte, a dátum komponenseit nem.
- javítás: UTC komponens-ellenőrzés; naptárilag érvénytelen dátumra 400 `INVALID_DATE` válasz.
- regressziós teszt: `tests/unit/hirado-date-validation.test.cjs`
- státusz: `FIXED`

## APP-081

- cím: Szűrt főfeed kérés alatt nem jelent meg loading állapot
- severity: MEDIUM
- terület: fő feed / frontend async state
- fájl: `app/page.tsx`
- reprodukció: forrás- vagy kategóriaszűrő váltásakor a komponens kiürítette a listát, de a `fetchFilteredPage` nem állította `loading=true` értékre, ezért a felhasználó üres képernyőt látott kérés közben.
- root cause: a normál és mai feed loader kezelte a loading flaget, a szűrt loader nem.
- javítás: a szűrt loader is beállítja és request-szekvenciához kötve törli a loading állapotot `finally` ágban.
- regressziós teszt: `tests/unit/feed-filter-loading.test.cjs`
- státusz: `FIXED`

## APP-086

- cím: Híradó videóváltásnál késői válasz felülírhatta az aktuális videó állapotát
- severity: HIGH
- terület: frontend fetch race / Híradó UI
- fájl: `components/HiradoClient.tsx`
- reprodukció: archív videó gyors váltásakor az első, lassabb `/api/hirado/by-id` kérés a második kérés után is lefuthatott, majd a régi videó adatával meghívta a `setData`-t; ugyanígy egy késői auth-válasz unmount után állapotot írhatott.
- root cause: a két `useEffect` kéréslánca nem rendelkezett cleanup-alapú érvényességi őrrel.
- javítás: mindkét effect cleanup-kor törli a lokális `cancelled` jelzőt, és minden állapotírás előtt ellenőrzi azt.
- regressziós teszt: `tests/unit/hirado-client-race.test.cjs`
- státusz: `FIXED`

### Historical CURRENT POSITION

- Aktív blokk: `Async / Promise kezelés` (82–86, majd kapcsolódó frontend fetch/concurrency blokkok)
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `components/HiradoArchiveSlider.tsx`, `app/api/user/update/route.ts`
- Következő átnézendő fájl: további frontend fetch-fogyasztók, különösen `TrendsList.tsx`, `TrendsPanel.tsx`, valamint az SWR-es premium komponensek
- Aktuális hipotézis: a Híradó videó- és auth-kérések race-je, az archívum Budapest-napjelölése és a user inputvalidációk lezárva; további konkrét finding csak a fennmaradó fetch-láncok vizsgálatából nyitható.
- Nyitott finding: nincs reprodukált, javítatlan finding ebben a passzban.
- Elvégzett, még nem validált módosítás: nincs

### Historical NEXT ACTION

`A KÖVETKEZŐ SESSION ITT FOLYTASSA: TrendsList/TrendsPanel kérésérvényesség és SWR-es premium fogyasztók ellenőrzésével; csak új, reprodukálható hibát javítson.`

### Historical RESUME FROM HERE

- Utolsó teljesen lezárt blokk: SQL aggregációk
- Aktív blokk: Async / Promise kezelés
- Aktív blokk státusza: PARTIALLY REVIEWED
- Utolsó átnézett fájl: `components/HiradoArchiveSlider.tsx`, `app/api/user/update/route.ts`
- Következő fájl: `components/TrendsList.tsx`, `components/TrendsPanel.tsx`, majd az SWR-es premium fetch-fogyasztók
- Nyitott bug: nincs
- Legutóbbi módosítás: Híradó archívum Budapest dátumkulcs, Híradó/API validációk és user mutation input-ellenőrzések (APP-080–APP-089)
- Következő konkrét művelet: gyors videóváltás regressziójának statikus tesztelése, majd fennmaradó frontend fetch-láncok vizsgálata
- Utolsó teszteredmények: TypeScript PASS; offline suite 166/166 PASS; MySQL suite SKIP (környezet hiányzik)
- Környezeti blokkolók: local Node heap OOM a teljes buildnél; helyi MySQL nem elérhető

## APP-082

- cím: Feed-feldolgozás statisztikája több kérés között felhalmozódott
- severity: MEDIUM
- terület: API async állapot / fetch-feed
- fájl: `app/api/fetch-feed/route.ts`
- reprodukció: két egymást követő POST futásnál a második válasz `stats` mezője az első futás beszúrásait is tartalmazta.
- root cause: a `feedStats` módosítható objektum modul-szinten élt, ezért a route példányok megosztott állapotot használtak.
- javítás: a statisztikai objektum minden POST futás elején lokálisan jön létre.
- regressziós teszt: `tests/unit/fetch-feed-stats-scope.test.cjs`
- státusz: `FIXED`

## APP-083

- cím: Híradó archívum „MA” jelölése UTC napváltásnál hibás volt
- severity: LOW
- terület: frontend date handling / Híradó archívum
- fájl: `components/HiradoArchiveSlider.tsx`
- reprodukció: Budapest idő szerint éjfél utáni videó esetén a `toISOString()` UTC dátumrésze még az előző nap lehetett, ezért a videó nem kapta meg a „MA” jelölést; ugyanebben az időablakban a dátumlista és a jelölés eltérő napot mutathatott.
- root cause: a „mai nap” összehasonlítása UTC dátumstringgel történt, miközben a felület magyar helyi dátumot jelenít meg.
- javítás: az archív videó és a mai nap kulcsa egységesen `Europe/Budapest` időzónában készül.
- regressziós teszt: `tests/unit/hirado-archive-local-date.test.cjs`
- státusz: `FIXED`

## APP-087

- cím: Híradó riport útvonal nem biztonságos numerikus video ID-t engedett SQL-lekérdezésig
- severity: MEDIUM
- terület: API input validation / hirado read
- fájl: `app/api/hirado/read/[date]/route.ts`
- reprodukció: `999999999999999999999` csak numerikusnak látszott, ezért a route video ID-ként kezelte és 200-as „nincs riport” választ adott.
- root cause: a numerikus ág nem ellenőrizte a pozitív, biztonságos egész tartományt.
- javítás: safe-integer és pozitivitás ellenőrzés; hibás numerikus ID-re 400 `INVALID_VIDEO_ID`.
- regressziós teszt: `tests/unit/hirado-read-id-validation.test.cjs`
- státusz: `FIXED`

## APP-088

- cím: Change-password nem boolean logout kapcsolót truthy értékként kezelt
- severity: MEDIUM
- terület: API input validation / user mutation
- fájl: `app/api/user/change-password/route.ts`
- reprodukció: `logoutEverywhere: "false"` értékkel a route truthy-ként minden munkamenetet visszavont.
- root cause: a mező típusa nem volt ellenőrizve, a későbbi feltétel implicit truthiness-re épült.
- javítás: a megadott kapcsoló csak boolean lehet, egyébként 400 válasz érkezik.
- regressziós teszt: `tests/unit/user-mutation-contract.test.cjs`
- státusz: `FIXED`

## APP-089

- cím: Profilfrissítés üres témát érvényes témaként mentett
- severity: MEDIUM
- terület: API input validation / user mutation
- fájl: `app/api/user/update/route.ts`
- reprodukció: `{"theme":""}` kérésnél a truthy-alapú ellenőrzés kihagyta a validációt, ezért üres téma került a users táblába.
- root cause: az enum-ellenőrzés csak truthy értékre futott.
- javítás: a megadott `theme` mező minden értékét ellenőrizzük, és csak a három támogatott enumot engedjük.
- regressziós teszt: `tests/unit/user-mutation-contract.test.cjs`
- státusz: `FIXED`

## APP-090

- cím: Híradó archív API adatbázishibát nem JSON hibaként kezelt és azonos dátumú videók sorrendje nem volt stabil
- severity: MEDIUM
- terület: Híradó archive API / HTTP error handling / sorting
- fájl: `app/api/hirado/archive/route.ts`
- reprodukció: DB-hiba esetén a route kivételt engedett tovább, így a frontend nem kapott stabil JSON error contractot; azonos dátumú soroknál a sorrend csak a DB implicit sorrendjétől függött.
- root cause: hiányzó try/catch és másodlagos rendezési kulcs.
- javítás: explicit 500-as JSON válasz, valamint `ORDER BY date DESC, id DESC`; üres thumbnail null-normalizálás.
- regressziós teszt: `tests/unit/hirado-archive-response.test.cjs`
- státusz: `FIXED`

## APP-091

- cím: Trends egyedi dátumszűrés host-időzónától függött
- severity: MEDIUM
- terület: trends UI / date filtering
- fájlok: `components/TrendsList.tsx`, `components/TrendsPanel.tsx`
- reprodukció: egyedi `startDate`/`endDate` szűrésnél a history napját és a határokat lokális `Date` objektummá alakította; más host-időzónában a dátum napváltás miatt kieshetett vagy bekerülhetett.
- root cause: date-only adat időpontként való lokális parse-olása.
- javítás: validált `YYYY-MM-DD` stringek lexikografikus, inkluzív összehasonlítása; hibás napértékek eldobása.
- regressziós teszt: `tests/unit/trends-custom-date-filter.test.cjs`
- státusz: `FIXED`

## APP-092

- cím: Híradó videóhoz kötött napi riport lekérdezés nem determinisztikusan választott duplikált riportok közül
- severity: MEDIUM
- terület: Híradó read API / SQL sorting
- fájl: `app/api/hirado/read/[date]/route.ts`
- reprodukció: ugyanahhoz a videónaphoz több `daily_reports` rekord esetén a `LIMIT 1` másodlagos rendezés nélkül a DB végrehajtási tervétől függően eltérő tartalmat adhatott.
- root cause: hiányzó explicit `ORDER BY` a JOIN-os `LIMIT 1` lekérdezésben.
- javítás: legfrissebb `report_date`, majd legnagyobb `id` szerinti stabil rendezés.
- regressziós teszt: `tests/unit/hirado-read-order.test.cjs`
- státusz: `FIXED`

## APP-093

- cím: Sparkline komponensek nem numerikus vagy null gyakorisági értékkel hibás grafikát/átlagot adhattak
- severity: MEDIUM
- terület: frontend null/number handling / trends
- fájlok: `components/SparklineDetailed.tsx`, `components/SparklineMini.tsx`
- reprodukció: malformed API history esetén string, `null`, `NaN` vagy negatív `freq` bekerülhetett a Chart.js adataiba; a részletes grafikon összegzése string-összefűzést vagy `.toFixed()` hibát okozhatott.
- root cause: a render közvetlenül a runtime értéket használta a TypeScript típus ellenőrzése nélkül.
- javítás: véges, nem-negatív számmá normalizálás; hibás értékek 0-ként jelennek meg.
- regressziós teszt: `tests/unit/sparkline-frequency-null.test.cjs`
- státusz: `FIXED`

## APP-094

- cím: Insights overview chart hibás dátumot és nem véges aggregációs értéket renderelhetett
- severity: MEDIUM
- terület: insights frontend / null-number handling
- fájl: `components/InsightsOverviewChart.tsx`
- reprodukció: malformed history `date` esetén `NaN-NaN` bucket és invalid Chart.js dátum keletkezett; `Infinity` vagy negatív count/predicted érték közvetlenül a grafikonba került.
- root cause: hiányzó dátum- és finite-number ellenőrzés.
- javítás: invalid dátumok kihagyása, count/predicted értékek véges és nem-negatív normalizálása.
- regressziós teszt: `tests/unit/insights-chart-number-contract.test.cjs`
- státusz: `FIXED`

## APP-095

- cím: Insights sparkline és donut chart malformed számbemenettel hibás grafikát renderelhetett
- severity: MEDIUM
- terület: insights frontend / chart input contract
- fájlok: `components/InsightSparkline.tsx`, `components/DonutChart.tsx`
- reprodukció: null, string, `NaN` vagy `Infinity` trend/percentage érték közvetlenül a canvas/Chart.js adataiba került; hiányzó source név esetén undefined label jelent meg.
- root cause: a komponensek csak TypeScript tömbtípust feltételeztek, runtime normalizálás nélkül.
- javítás: véges numerikus normalizálás, nem-negatív százalékok, hiányzó névhez `Ismeretlen` fallback.
- regressziós teszt: `tests/unit/insight-chart-input-contract.test.cjs`
- státusz: `FIXED`

## APP-096

- cím: FrameModal aszinkron user betöltés után is régi keretállapotot használt
- severity: MEDIUM
- terület: frontend user state / premium UI
- fájl: `components/FrameModal.tsx`
- reprodukció: modal megnyitásakor a user még nem volt betöltve, ezért a kiválasztott frame üres maradt és a mentés letiltva maradhatott a később érkező user ellenére.
- root cause: a kiválasztott frame csak inicializáláskor, nem a user állapotváltozásakor szinkronizálódott.
- javítás: user-változásra szinkronizált kiválasztás.
- regressziós teszt: `tests/unit/frame-modal-user-sync.test.cjs`
- státusz: `FIXED`

## APP-097

- cím: Utom DNS részletező statisztikái eltérő source/category canonicalizálás miatt üresen jelenhettek meg
- severity: MEDIUM
- terület: DNS insights / source-category normalization
- fájlok: `app/api/insights/UtomDnsOsszkep/route.ts`, `components/UtomDns.tsx`, `components/UtomDnsKategoria.tsx`, `components/UtomDnsOsszkep.tsx`
- reprodukció: case- vagy whitespace-eltérő source/category, illetve `portfolio.hu` alias esetén a listázó és részletező flow eltérő kulccsal kérdezett, ezért a részletező statisztika nullás/üres lett.
- root cause: canonicalizálás és alias-feloldás nem volt egységes a route-ok és frontend paraméterek között.
- javítás: közös normalizálás és URLSearchParams alapú paraméterküldés.
- regressziós teszt: `tests/unit/utom-dns-contract.test.cjs`
- státusz: `FIXED`

## APP-098

- cím: Régi auth/avatar útvonal eltérő szabályokkal engedett avatar mentést
- severity: HIGH
- terület: auth API / avatar response contract
- fájl: `app/api/auth/avatar/route.ts`
- reprodukció: a legacy útvonal olyan style/formátumot is elfogadott, amelyet az aktuális avatar API elutasított, és prémium ellenőrzés nélkül GIF-avatar mentést engedhetett.
- root cause: párhuzamos endpoint eltérő validációs és entitlement logikája.
- javítás: az aktuális avatar API-val azonos validáció és prémium-ellenőrzés.
- regressziós teszt: `tests/unit/auth-avatar-contract.test.cjs`
- státusz: `FIXED`

## APP-099

- cím: Híradó by-id API adatbázishibánál nem adott stabil JSON hibát és azonos dátumú videóknál nem volt determinisztikus kiválasztás
- severity: MEDIUM
- terület: Híradó API / HTTP error handling / sorting
- fájl: `app/api/hirado/by-id/route.ts`
- reprodukció: DB-kivétel esetén a route exceptiont engedett tovább; azonos dátumú videók esetén a `LIMIT 1` implicit sorrendet használt.
- root cause: hiányzó try/catch és másodlagos rendezési kulcs.
- javítás: stabil 500-as JSON válasz és `ORDER BY date DESC, id DESC`.
- regressziós teszt: `tests/unit/hirado-read-response.test.cjs`
- státusz: `FIXED`

## APP-100

- cím: Főfeed kártya invalid dátummal és hiányzó címmel hibás szöveget renderelhetett
- severity: MEDIUM
- terület: fő feed / null-missing-data rendering
- fájl: `components/FeedItemCard.tsx`
- reprodukció: null vagy hibás `created_at` esetén a relatív idő `NaN napja`/hibás dátum lett; hiányzó title/content mezőnél a kártya üres vagy nem stabil tartalmat jelenített meg.
- root cause: runtime API-adatot a komponens ellenőrzés nélkül használt.
- javítás: invalid dátum fallback, `Cím nélkül` title fallback, content string-normalizálás.
- regressziós teszt: `tests/unit/feed-item-null-date.test.cjs`
- státusz: `FIXED`

## APP-101

- cím: CategoryHeatMap malformed strength értékkel NaN opacity-t renderelhetett
- severity: LOW
- terület: category UI / null-number handling
- fájl: `components/CategoryHeatMap.tsx`
- reprodukció: null, string, `Infinity` vagy 100 fölötti strength esetén a CSS opacity érvénytelen vagy tartományon kívüli lehetett.
- root cause: runtime kategóriaadat ellenőrzés nélkül került stílusba.
- javítás: véges értékké alakítás és 0–1 közötti clamp; hibás adat 0 opacity.
- regressziós teszt: `tests/unit/category-heatmap-input.test.cjs`
- státusz: `FIXED`

## APP-102

- cím: Analyze API AI-siker után nem adott stabil JSON hibát összefoglaló-mentési hiba esetén
- severity: MEDIUM
- terület: analyze API / HTTP error handling / persistence contract
- fájl: `app/api/analyze/route.ts`
- reprodukció: érvényes külső cikk és sikeres AI-válasz után a `summaries` INSERT hibája kezeletlenül továbbdobódott, ezért a kliens nem kapott stabil `error` JSON választ.
- root cause: az adatbázis-írás a route hibakezelési blokkján kívül futott.
- javítás: a mentést célzott `try/catch` védi; hiba esetén `summary_persist_failed` JSON és HTTP 500 érkezik.
- regressziós teszt: `tests/unit/analyze-response-contract.test.cjs`
- státusz: `FIXED`

## APP-103

- cím: User profil/avatar/keret mutációk adatbázishibánál nem tartották a JSON hiba-contractot
- severity: MEDIUM
- terület: user mutation API / HTTP error handling
- fájlok: `app/api/user/update/route.ts`, `app/api/user/avatar/route.ts`, `app/api/user/frame/route.ts`
- reprodukció: validált, hitelesített kérés után DB-hiba esetén a route-ok a kivételt a frameworkre bízták, így a frontend számára nem volt stabil `{ success: false, message }` válasz.
- root cause: a három `db.query` írás körül hiányzott a célzott hibakezelés.
- javítás: mindhárom írás célzott `try/catch` ágon ad HTTP 500 JSON választ.
- regressziós teszt: `tests/unit/user-mutation-db-error-contract.test.cjs`
- státusz: `FIXED`

## APP-104

- cím: Premium source statisztikai komponensek üres adathalmazt üres chartként, félrevezetően jelenítettek meg
- severity: LOW
- terület: premium UI / empty state
- fájlok: premium source stat komponensek
- reprodukció: üres vagy jogosultság miatt nem elérhető statisztikai válasz esetén a chart komponensek adat nélküli grafikont rendereltek külön üzenet nélkül.
- root cause: hiányzó explicit empty-state ág.
- javítás: egyértelmű üres állapot a clickbait, clickbait ratio, duplication, Speed Index és source-category komponensekben.
- regressziós teszt: `tests/unit/premium-source-empty-state.test.cjs`
- státusz: `FIXED`

## APP-105

- cím: TrendsList kategóriaszűrés case/whitespace eltérésnél hibásan kizárta a találatokat
- severity: MEDIUM
- terület: trends UI / filtering
- fájl: `components/TrendsList.tsx`
- reprodukció: API kategóriája és filterértéke eltérő kisbetűzéssel vagy körülötte whitespace-szel érkezett, ezért az `includes` összehasonlítás false lett.
- root cause: nem canonicalizált kategória-összehasonlítás.
- javítás: trim + lowercase normalizálás mindkét oldalon.
- regressziós teszt: `tests/unit/trends-list-category-filter.test.cjs`
- státusz: `FIXED`

## APP-106

- cím: TrendsList malformed trend elemmel render crash-elhetett
- severity: MEDIUM
- terület: trends UI / response contract / null handling
- fájl: `components/TrendsList.tsx`
- reprodukció: hiányzó vagy nem-string keyword/category, nem numerikus frequency/growth mező esetén downstream `toLowerCase` vagy render logika kivételt okozhatott.
- root cause: a trend response elemei runtime validáció nélkül kerültek state-be.
- javítás: válasz normalizálása, hibás elemek kiszűrése, finite számok és opcionális mezők biztonságos kezelése.
- regressziós teszt: `tests/unit/trends-list-malformed-response.test.cjs`
- státusz: `FIXED`

## APP-107

- cím: Híradó kliens anonim sessionnél végtelen betöltési állapotban maradt
- severity: MEDIUM
- terület: Híradó frontend / auth session flow / loading state
- fájl: `components/HiradoClient.tsx`
- reprodukció: bejelentkezés nélküli látogatónál az `/api/auth/me` helyes `{ loggedIn: false }` választ adott, a kliens azonban a `user === null` értéket továbbra is betöltésként kezelte, ezért a híradó oldal végtelenül a „Betöltés...” állapotot mutatta.
- root cause: nem volt külön jelölve, hogy a session-lekérdezés befejeződött-e; a hiányzó user és a folyamatban lévő kérés összemosódott.
- javítás: `userLoaded` állapot, anonim válasz esetén explicit betöltés lezárása és bejelentkezési üzenet renderelése.
- regressziós teszt: `tests/unit/hirado-client-auth-state.test.cjs`
- státusz: `FIXED`

## APP-108

- cím: Avatar/frame user endpoint prémium vagy session lekérdezési hibánál exceptiont engedett tovább
- severity: MEDIUM
- terület: user mutation API / HTTP error contract
- fájlok: `app/api/user/avatar/route.ts`, `app/api/user/frame/route.ts`
- reprodukció: session- vagy entitlement-query adatbázishibája esetén a route-ok nem adtak stabil JSON 500 választ, ezért a kliens framework-hibát vagy nem-JSON választ kapott.
- root cause: a jogosultság- és prémium lookup nem volt célzott try/catch-ben.
- javítás: explicit `{ success: false, message }` HTTP 500 hiba-contract.
- regressziós teszt: `tests/unit/user-premium-lookup-error-contract.test.cjs`
- státusz: `FIXED`

## APP-109

- cím: ProfileView invalid user date mezőkkel „Invalid Date” értéket renderelhetett
- severity: LOW
- terület: profile UI / null-date handling
- fájl: `components/ProfileView.tsx`
- reprodukció: hibás `premium_until`, `created_at` vagy `last_login` érték esetén a profil közvetlenül `Date`-et formázott, így félrevezető vagy hibás dátum jelent meg.
- root cause: hiányzó runtime dátumvalidáció.
- javítás: közös biztonságos dátumformázók, invalid/null értékre `N/A` fallback.
- regressziós teszt: `tests/unit/profile-date-contract.test.cjs`
- státusz: `FIXED`

## APP-110

- cím: ThemeSwitch sikertelen gyors egymásutáni mentésnél stale theme-re rollbackelhetett
- severity: MEDIUM
- terület: frontend async state / user settings
- fájl: `components/ThemeSwitch.tsx`
- reprodukció: gyors theme-váltásnál a korábbi closure-ben lévő `theme` érték alapján történt a rollback; a legújabb sikertelen kérés egy közben sikeres váltást is visszaállíthatott.
- root cause: a hibakezelés nem kérésenként rögzített előző store-állapotot használt.
- javítás: a kérés indításakor rögzített aktuális Zustand theme-re rollback, sequence guard mellett.
- regressziós teszt: `tests/unit/theme-switch-race.test.cjs`
- státusz: `FIXED`

## APP-111

- cím: Trend-forrás modal új lekérés alatt előző kulcsszó eredményeit mutathatta
- severity: MEDIUM
- terület: trends UI / stale data / frontend fetch state
- fájl: `components/TrendsPanel.tsx`
- reprodukció: egy trend forráslistájának megnyitása után másik trend „Cikkek” gombjára kattintva a korábbi lista látható maradt az új API-válaszig.
- root cause: az új kérés indításakor a komponens nem ürítette a korábbi `sources` state-et.
- javítás: új forráskérés előtt a lista ürítése, a request-sequence védelem megtartásával.
- regressziós teszt: `tests/unit/trend-sources-null-contract.test.cjs`
- státusz: `FIXED`

## APP-112

- cím: Trend-forrás modal malformed rekordkal hibás dátumot vagy hiányzó mezőt renderelhetett
- severity: MEDIUM
- terület: trends UI / response contract / null-missing-data
- fájl: `components/TrendSourcesModal.tsx`
- reprodukció: hiányzó cím/forrás, invalid dátum vagy nem HTTP URL esetén a rekord közvetlenül renderelődött; invalid dátum hibás feliratot, hiányzó mezők félrevezető üres UI-t eredményezhettek.
- root cause: a parent csak a top-level tömböt ellenőrizte, az egyes rekordokat nem.
- javítás: rekord-szintű normalizálás, valid HTTP URL és dátum kötelező ellenőrzése, biztonságos cím/forrás fallback.
- regressziós teszt: `tests/unit/trend-sources-null-contract.test.cjs`
- státusz: `FIXED`

## APP-113

- cím: Híradó archívum fetch unmount után state-frissítést indíthatott
- severity: MEDIUM
- terület: Híradó UI / async / fetch cancellation
- fájlok: `components/HiradoArchive.tsx`, `components/HiradoArchiveSlider.tsx`
- reprodukció: komponens eltávolításakor folyamatban lévő archív API-kérés későbbi sikeres vagy hibás válasza még `setVideos`-t hívhatott, így stale állapot és React async race keletkezhetett.
- root cause: a fetch kérésekhez nem tartozott AbortController; az unmount nem szakította meg őket.
- javítás: AbortController jel továbbadása, AbortError figyelmen kívül hagyása, cleanup során abort.
- regressziós teszt: `tests/unit/hirado-archive-fetch-race.test.cjs`
- státusz: `FIXED`

## APP-114

- cím: Híradó read route hibás path-paramétert sikeres üres válaszként kezelt
- severity: MEDIUM
- terület: Híradó API / API input validation / HTTP status semantics
- fájl: `app/api/hirado/read/[date]/route.ts`
- reprodukció: `/api/hirado/read/not-a-date` vagy `/api/hirado/read/123abc` esetén a route HTTP 200 `{ hasReport: false }` választ adott, ezért a hibás navigáció összekeverhető volt a ténylegesen hiányzó riporttal.
- root cause: az ISO dátum és numerikus videó-ID ág után az ismeretlen path-paraméter külön validáció nélkül üres siker-válaszra esett.
- javítás: az ismeretlen paraméter most explicit `INVALID_REPORT_PARAMETER` JSON választ és HTTP 400 státuszt ad.
- regressziós teszt: `tests/unit/hirado-read-input-validation.test.cjs`
- státusz: `FIXED`

## APP-115

- cím: Trend history whitespace-os keyword/source és lehetetlen custom dátum átcsúszhatott a lekérdezésbe
- severity: MEDIUM
- terület: trend history API / input validation / filtering
- fájl: `app/api/trend-history/route.ts`
- reprodukció: a `keyword=  kifejezés  ` érték whitespace-t tartalmazó kulcsszóként került a SQL paraméterbe, a `sources= Telex,Telex ` lista pedig duplikált, whitespace-os filtert adott; `2025-02-31` alakú custom dátum a regexen átment.
- root cause: a route csak a keyword jelenlétét ellenőrizte, a source listát nem canonicalizálta, és a custom dátumot formailag, nem naptár szerint validálta.
- javítás: keyword trim, source trim + deduplikálás, valamint valódi UTC naptári dátumellenőrzés került be.
- regressziós teszt: `tests/unit/trend-history-input-normalization.test.cjs`
- státusz: `FIXED`

## APP-116

- cím: Trend source lista azonos publikációs időnél nem determinisztikusan rendezett
- severity: LOW
- terület: trends API / sorting / response stability
- fájl: `app/api/trends/trend-sources/route.ts`
- reprodukció: két azonos `published_at` értékű, azonos keywordhöz tartozó cikk esetén a `LIMIT 20` mögötti sorrend adatbázis-terheléstől függően változhatott.
- root cause: a lekérdezés csak a publikációs idő szerint rendezett, másodlagos kulcs nélkül.
- javítás: `a.id DESC` stabil másodlagos rendezés került az ORDER BY-ba.
- regressziós teszt: `tests/unit/trend-sources-ordering.test.cjs`
- státusz: `FIXED`

## APP-119

- cím: Source overview globális kategóriaaránya eltérő case/whitespace miatt hibás volt
- severity: MEDIUM
- terület: insights / source statistics / aggregációs response contract
- fájl: `app/api/insights/UtomDnsOsszkep/route.ts`
- reprodukció: a lokális `Politika` kategóriát a route kanonikus kulcsokra építette, a globális nevező viszont nyers `category` értékeket használt; `politika`, ` Politika ` és `POLITIKA` ezért nem járultak hozzá ugyanahhoz a globális arányhoz.
- root cause: a két aggregáció eltérő grouping key-t használt.
- javítás: a globális lekérdezés `LOWER(TRIM(category))` szerint csoportosít, és a válasz a meglévő kanonikus kategória-normalizálón keresztül építi a globális arányokat.
- regressziós teszt: `tests/unit/api-insights-remaining-contract.test.cjs`
- státusz: `FIXED`

## APP-120

- cím: Üres source overview hibásan az első kategóriát jelölte domináns témának
- severity: LOW
- terület: insights / empty dataset response
- fájl: `app/api/insights/UtomDnsOsszkep/route.ts`
- reprodukció: source nélküli vagy üres datasetnél a nullázott kategóriák rendezése után a `Politika` érték került vissza `topTopic` mezőként.
- root cause: a topikválasztás nem ellenőrizte, hogy a legnagyobb érték ténylegesen pozitív-e.
- javítás: üres datasetnél `topTopic: null`, egyenlő pozitív értékeknél stabil magyar ábécés tie-break.
- regressziós teszt: `tests/unit/api-insights-remaining-contract.test.cjs`
- státusz: `FIXED`

## APP-121

- cím: Spike detection case/whitespace eltérések miatt szétosztotta ugyanazt a forrást vagy kategóriát
- severity: MEDIUM
- terület: insights / spike aggregation
- fájl: `app/api/insights/spike-detection/route.ts`
- reprodukció: `Telex`, ` telex ` és `TELEX` azonos órában külön csoportként jelent meg, így egyik sem érte el vagy tévesen érte el a spike küszöböt.
- root cause: a GROUP BY csak `TRIM(...)`-et használt, case-normalizálás nélkül.
- javítás: normalizált csoportkulcs (`LOWER(TRIM(...))`), megjelenítési címhez determinisztikus `MIN(TRIM(...))`, stabil tie-rendezés.
- regressziós teszt: `tests/unit/api-insights-remaining-contract.test.cjs`
- státusz: `FIXED`

## APP-122

- cím: Category insights route nagy véges page értékkel végtelen OFFSET-et adhatott a MySQL-nek
- severity: MEDIUM
- terület: insights category API / numeric input validation
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: `page=1e308` esetén a `Number.isFinite` ellenőrzés átengedte az értéket, az `(page - 1) * limit` számítás pedig `Infinity` lett.
- root cause: a route véges számot, nem biztonságos pozitív egész számot validált.
- javítás: page és limit csak pozitív safe integerként fogadható el; más értékek alapértékre esnek.
- regressziós teszt: `tests/unit/api-insights-remaining-contract.test.cjs`
- státusz: `FIXED`

## APP-123

- cím: Category insights hibás adatbázis timestamp miatt teljes választ 500-ra cserélt
- severity: MEDIUM
- terület: insights category API / null-missing-data
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: malformed `published_at` vagy `lastUpdated` adat esetén a közvetlen `toISOString()` kivételt dobott.
- root cause: hiányzott a runtime dátumvalidáció a DB-ből érkező opcionális mezőkön.
- javítás: invalid dátum null fallbacket kap, így a többi érvényes adat továbbra is megjelenhet.
- regressziós teszt: `tests/unit/api-insights-remaining-contract.test.cjs`
- státusz: `FIXED`

## APP-130

- cím: InsightList malformed items payloadnál renderelési hibát okozhatott
- severity: LOW
- terület: insights frontend / response nullability
- fájl: `components/InsightList.tsx`
- reprodukció: null, nem tömb vagy azonosító nélküli insight elem esetén a lista közvetlenül `.map()`-elt és hibás kártyát renderelt.
- root cause: runtime lista- és elemvalidáció hiánya.
- javítás: tömbvédelem és azonosítóval rendelkező objektumokra szűrés.
- regressziós teszt: `tests/unit/insight-list-input.test.cjs`
- státusz: `FIXED`

## APP-117

- cím: Insights canvas chartok null vagy nem véges count/percentage értékkel NaN geometriát rajzoltak
- severity: MEDIUM
- terület: insights frontend / chart null-number handling
- fájlok: `components/InsightLineChart.tsx`, `components/InsightSourceRing.tsx`
- reprodukció: null, string, `Infinity` vagy negatív érték esetén a canvas koordinátái vagy a ring szögei érvénytelenné válhattak.
- root cause: runtime numerikus validáció hiánya.
- javítás: véges, nem-negatív számokra normalizálás, hibás értékek 0-ként kezelése.
- regressziós teszt: `tests/unit/insight-canvas-number-contract.test.cjs`
- státusz: `FIXED`

## APP-118

- cím: InsightCategoryBar malformed vagy üres kategória payloadnál render crash/üres gomb keletkezhetett
- severity: LOW
- terület: insights frontend / response nullability
- fájl: `components/InsightCategoryBar.tsx`
- reprodukció: null, nem tömb vagy whitespace-only kategóriaérték esetén a komponens közvetlenül `.map()`-elt és üres feliratú gombot renderelt.
- root cause: runtime payload validáció hiánya.
- javítás: tömb- és string-ellenőrzés, whitespace-only értékek szűrése.
- regressziós teszt: `tests/unit/insight-category-bar-input.test.cjs`
- státusz: `FIXED`

## APP-124

- cím: Spike modal új témánál korábbi statisztikát és hibát mutatott a friss válaszig
- severity: MEDIUM
- terület: trends frontend / modal state / fetch race
- fájl: `components/SpikeModal.tsx`
- reprodukció: nyitott modalnál másik témára váltva a korábbi topic `stats` és `error` state-je maradt látható az új kérés alatt.
- root cause: az effect nem nullázta a topic-specifikus state-et a kérés indításakor.
- javítás: `initialStats` visszaállítása és a hiba törlése minden effect-futás elején; korábbi kérés abortálása cleanupban.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-125

- cím: Trend chart malformed history ponttal hibás dátumot vagy nem véges adatot adhatott Chart.js-nek
- severity: MEDIUM
- terület: trends frontend / chart response contract
- fájl: `components/TrendChartModal.tsx`
- reprodukció: null/üres nap, invalid dátum, `Infinity` vagy negatív frequency esetén a pont közvetlenül bekerült a chart datasetbe.
- root cause: a modal a runtime API payloadot tömb- és pontszinten sem normalizálta.
- javítás: csak nem üres string dátumú, érvényes dátumú és véges, nem-negatív frequency értékű pontok renderelhetők.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-126

- cím: Insight line chart hibás pontokat nullázva torzította a trendet
- severity: MEDIUM
- terület: insights frontend / canvas chart null-number handling
- fájl: `components/InsightLineChart.tsx`
- reprodukció: null, `Infinity`, negatív vagy numerikusan értelmezhetetlen count esetén a komponens 0-ként rajzolta a pontot, így a grafikon hamis mélypontot mutatott.
- root cause: a hibás pontok validálás helyett automatikusan bekerültek a values tömbbe.
- javítás: hibás pontok kiszűrése; üres érvényes dataset esetén nincs rajzolás.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-127

- cím: TrendsList malformed külső trend payload első renderben crash-t és felesleges újrakéréseket okozhatott
- severity: MEDIUM
- terület: trends frontend / response normalization / effect dependencies
- fájl: `components/TrendsList.tsx`
- reprodukció: nem normalizált külső trendlista első renderben közvetlenül state-be került; objektum identity alapján változó filters esetén a fetch effect minden parent rendernél újrafutott.
- root cause: a kezdeti state nem használta a `normalizeTrend`-et, az effect teljes `filters` objektumra támaszkodott.
- javítás: normalizált kezdeti state és mezőszintű effect dependency-k.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-128

- cím: Trend source modal invalid naptári dátumot renderelhetett
- severity: LOW
- terület: trends frontend / source response validation
- fájl: `components/TrendSourcesModal.tsx`
- reprodukció: `2025-02-31` formailag parse-olható volt, de nem létező dátumként a modal március 3-at jelenített meg.
- root cause: csak `Date.parse` ellenőrzés történt, naptári komponens-ellenőrzés nélkül.
- javítás: ISO dátum-komponensek UTC alapú visszaellenőrzése.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-129

- cím: Trends history malformed pontok „Invalid Date” feliratot vagy hibás sparkline pontot okozhattak
- severity: MEDIUM
- terület: trends frontend / history response normalization
- fájlok: `components/TrendsPanel.tsx`, `components/TrendsList.tsx`
- reprodukció: null, invalid dátum, nem egész óraszám, illetve `Infinity`/negatív frequency értékű history rekord közvetlenül a sparkline komponensekbe került.
- root cause: a trend history válasz csak tömbként volt ellenőrizve, rekord-szintű validáció nélkül.
- javítás: közös komponensenkénti normalizálás; csak érvényes nap vagy 0–23 közötti óra és véges, nem-negatív frequency marad meg.
- regressziós teszt: `tests/unit/frontend-chart-stale-data.test.cjs`
- státusz: `FIXED`

## APP-131

- cím: Napi sentiment aggregáció adatbázis-string countokat összefűzhetett
- severity: HIGH
- terület: insights API / aggregáció / response contract
- fájl: `app/api/insights/sentiment/today/route.ts`
- reprodukció: MySQL driver stringként adta vissza a `COUNT(*)` értékét; pozitív és semleges érték esetén a `positive + neutral` művelet számszerű összeadás helyett string-konkaténációt végzett, ezért a ratio mezők hibásak lettek.
- root cause: a route a DB aggregátumot számkonverzió nélkül írta a számlálókba.
- javítás: véges, nemnegatív numerikus konverzió és összeadás; az ismeretlen sentiment értékek figyelmen kívül maradnak.
- regressziós teszt: `tests/unit/sentiment-count-contract.test.cjs`
- státusz: `FIXED`

## APP-132

- cím: Kategóriánkénti sentiment aggregáció case/whitespace eltérésekkel duplikált kategóriákat és string countot adott
- severity: MEDIUM
- terület: insights API / category sentiment / aggregáció
- fájl: `app/api/insights/sentiment/by-category/route.ts`
- reprodukció: `Politika`, ` politika ` és `POLITIKA` külön eredménykulccsá válhatott, miközben a `COUNT(*)` driver-stringként került a válaszba és az azonos sentiment értékek felülírták egymást.
- root cause: a SQL grouping és a runtime response kulcsa nem volt canonicalizálva, a countot pedig assignmenttel kezelték.
- javítás: case-insensitive SQL grouping, canonical kategóriakulcs, véges numerikus count és összeadás.
- regressziós teszt: `tests/unit/sentiment-count-contract.test.cjs`
- státusz: `FIXED`

## APP-133

- cím: Portfolio forrás kizárása nem működött a canonicalizált source névvel
- severity: LOW
- terület: premium frontend / source-category response contract
- fájl: `components/WSourceCategoryDistribution.tsx`
- reprodukció: a backend `portfolio` forrást `portfolio.hu` névre canonicalizálta, a frontend viszont csak a pontos `portfolio` értéket szűrte ki, ezért a kizárandó forrás megjelent a grafikonban.
- root cause: a frontend szűrő nem követte a backend canonical source contractját.
- javítás: mindkét canonical source spelling kizárása trim/case normalizálással.
- regressziós teszt: `tests/unit/sentiment-count-contract.test.cjs`
- státusz: `FIXED`

## APP-138

- cím: 24 órás trend history minden órát nullának adott vissza MySQL string aggregátumoknál
- severity: HIGH
- terület: trend history API / response contract
- fájl: `app/api/trend-history/route.ts`
- reprodukció: MySQL driverből az `HOUR(created_at)` stringként érkezett (például `"13"`), miközben a route szigorú `r.hour === i` összehasonlítást végzett; a 24 órás history ezért minden bucketet nullázott.
- root cause: driver által adott string és a runtime numerikus bucket összehasonlítása típuskonverzió nélkül.
- javítás: az órát és frekvenciát véges számmá konvertáljuk a bucket feltöltésekor.
- regressziós teszt: `tests/unit/trend-history-driver-contract.test.cjs`
- státusz: `FIXED`

## APP-139

- cím: Trend sources régi summary sorok miatt ugyanazt a cikket többször adhatta vissza
- severity: MEDIUM
- terület: trends API / summary relation / duplicate response
- fájl: `app/api/trends/trend-sources/route.ts`
- reprodukció: egy article több summary rekordjánál a sima `LEFT JOIN summaries` több sort eredményezett ugyanarra a cikkre, és a `DISTINCT` sem garantált deduplikációt eltérő summary mezők esetén.
- root cause: a query nem választotta ki az article legfrissebb summary rekordját.
- javítás: `NOT EXISTS` feltétellel csak a legfrissebb `created_at`, azonos időnél a legnagyobb `id` summary kapcsolódik.
- regressziós teszt: `tests/unit/trend-history-driver-contract.test.cjs`
- státusz: `FIXED`

## APP-140

- cím: TrendsList külső trend prop első renderben validálatlan rekordokat telepített
- severity: MEDIUM
- terület: trends frontend / response normalization
- fájl: `components/TrendsList.tsx`
- reprodukció: külső trend prop változásakor az első effect közvetlenül state-be tette a payloadot; a következő effect futásáig malformed keyword/frequency érték kerülhetett renderelésre.
- root cause: az external prop ág megkerülte a már meglévő `normalizeTrend` feldolgozást.
- javítás: az external prop is normalizált és invalid rekordoktól szűrt listaként kerül state-be.
- regressziós teszt: `tests/unit/trend-runtime-contract.test.cjs`
- státusz: `FIXED`

## APP-141

- cím: TrendsPanel stringként érkező frekvenciákat nullának jelenített meg
- severity: MEDIUM
- terület: trends frontend / MySQL response contract
- fájl: `components/TrendsPanel.tsx`
- reprodukció: a trend API `freq`, `totalCount` vagy `frequency` mezőjét stringként küldő válasz esetén a komponens csak number típust fogadott el, ezért `0×` jelent meg a tényleges érték helyett.
- root cause: a runtime response numeric normalization hiánya.
- javítás: a kiválasztott frequency mező véges, nemnegatív számmá alakítása.
- regressziós teszt: `tests/unit/trend-runtime-contract.test.cjs`
- státusz: `FIXED`

## APP-134

- cím: InsightCard placeholder linket, hiányzó címet és hibás source countot renderelhetett
- severity: LOW
- terület: insights frontend / link and numeric contract
- fájl: `components/InsightCard.tsx`
- reprodukció: `href=/null` vagy `/undefined` esetén a Megnyit gomb hibás útvonalra navigált; malformed title/count esetén üres vagy nem numerikus UI jelent meg.
- root cause: runtime mezővalidáció hiánya.
- javítás: placeholder linkek `#` fallbackre, cím és count normalizálás.
- regressziós teszt: `tests/unit/insight-card-contract.test.cjs`
- státusz: `FIXED`

## APP-135

- cím: Category insights frontend invalid paginationnal és malformed item/dátummal hibás requestet vagy renderelt adatot adott
- severity: MEDIUM
- terület: category insights UI / input and null handling
- fájl: `app/insights/category/[category]/page.tsx`
- reprodukció: `page=1e308`, negatív vagy túl nagy `limit` közvetlenül bekerült a requestbe; hiányzó title/id és invalid timestamp hibás kártyát vagy `Invalid Date` feliratot okozhatott.
- root cause: query paraméter és API item runtime validáció hiánya.
- javítás: safe-integer/bounded pagination, item-szűrés, title fallback és dátumvalidáció.
- regressziós teszt: `tests/unit/category-page-input-contract.test.cjs`
- státusz: `FIXED`

## APP-142

- cím: SparklineDetailed egyedi dátumszűrője figyelmen kívül hagyta a megadott intervallumot
- severity: MEDIUM
- terület: frontend / trends chart / filtering
- fájl: `components/SparklineDetailed.tsx`
- reprodukció: `period=custom`, kitöltött start/end dátum mellett a komponens a teljes history-t jelenítette meg, mert a custom ág a generikus filterben visszaesett a változatlan history-ra.
- root cause: a custom start/end állapotot a filter függvény nem kapta meg és nem dolgozta fel.
- javítás: inclusive, érvényes dátumtartomány-szűrés; hibás vagy fordított intervallum üres eredményt ad.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-143

- cím: Sparkline nem tömb payloadnál vagy hibás history pontnál render crash/NaN adatot okozhatott
- severity: MEDIUM
- terület: frontend / trends chart / null safety
- fájl: `components/Sparkline.tsx`
- reprodukció: null, objektum vagy invalid dátum/frequency rekord átadása esetén a közvetlen `.map()` illetve Chart.js adatlista hibás működést okozhatott.
- root cause: runtime tömb- és pontszintű validáció hiánya.
- javítás: safeHistory normalizálás, csak érvényes ISO-nap és véges, nemnegatív frequency használata.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-144

- cím: FeedList malformed API eredménynél `.map()` hibával leállhatott
- severity: MEDIUM
- terület: frontend / fő feed / null safety
- fájl: `components/FeedList.tsx`
- reprodukció: a komponens runtime-ban null vagy objektum payloadot kapott, miközben a props TypeScript szerint tömb volt.
- root cause: a frontend contractot csak compile time típus védte.
- javítás: tömb- és rekord-szintű normalizálás, üres állapot fallback.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-145

- cím: DNS domain-választó nem tömb `items` válasznál crash-elhetett és duplikált domain gombokat mutathatott
- severity: MEDIUM
- terület: premium UI / source statistics / response contract
- fájl: `components/UtomDns.tsx`
- reprodukció: malformed response esetén a feltételes `.map()` nem védte az object payloadot; case/whitespace eltérő source sorok több gombot adtak.
- root cause: hiányzó Array.isArray és canonical deduplikáció.
- javítás: tömb-ellenőrzés, trim, üres értékek eldobása és Set alapú deduplikáció.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-146

- cím: InsightsOverviewChart objektum data payloadnál `.forEach()` crash-elhetett
- severity: MEDIUM
- terület: insights frontend / chart response contract
- fájl: `components/InsightsOverviewChart.tsx`
- reprodukció: API hiba vagy malformed válasz esetén a data object volt, amelyen a komponens közvetlenül forEach-t hívott.
- root cause: a data prop runtime array ellenőrzésének hiánya.
- javítás: csak tömb payload feldolgozása, egyébként üres chart-adat.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-147

- cím: DNS összkép nem véges statisztikákat (NaN/Infinity/negatív) renderelhetett
- severity: LOW
- terület: premium UI / source statistics / numeric contract
- fájl: `components/UtomDnsOsszkep.tsx`
- reprodukció: hiányzó vagy nem véges DB aggregátum esetén a statisztikai értékek `Infinity`, `NaN` vagy negatív számként jelenhettek meg.
- root cause: a frontend közvetlenül formázta az API numeric mezőket.
- javítás: véges, nemnegatív numeric normalizáló és biztonságos fallback minden statisztikai mezőre.
- regressziós teszt: `tests/unit/frontend-runtime-safety-batch.test.cjs`
- státusz: `FIXED`

## APP-148

- cím: Insights kategóriakártya hibás dátumot renderelhetett `Invalid Date` szövegként
- severity: LOW
- terület: insights frontend / null és dátum kezelés
- fájl: `app/insights/page.tsx`
- reprodukció: malformed `lastArticleAt` értéknél a közvetlen `new Date(...).toLocaleString()` érvénytelen dátumot adott vissza.
- root cause: nem volt `Date#getTime()` ellenőrzés.
- javítás: közös formatter üres fallbackkel érvénytelen dátumra.
- regressziós teszt: `tests/unit/insights-dns-number-safety.test.cjs`
- státusz: `FIXED`

## APP-149

- cím: DNS kategória-diagram nem véges vagy negatív értéket adhatott a Chart.js-nek
- severity: MEDIUM
- terület: premium UI / source statistics / numeric contract
- fájl: `components/UtomDnsKategoria.tsx`
- reprodukció: malformed source/category statisztika `NaN`, `Infinity` vagy negatív értéke közvetlenül a chart datasetbe került.
- root cause: a chartértékek csak `Number()` konverziót kaptak, véges/nemnegatív validációt nem.
- javítás: minden kategóriaérték véges, nemnegatív számmá normalizálása.
- regressziós teszt: `tests/unit/insights-dns-number-safety.test.cjs`
- státusz: `FIXED`

## APP-151

- cím: Mai kulcsszó-chart NaN számmal és üres címkével renderelhetett
- severity: MEDIUM
- terület: mai feed / premium insights / numeric és null safety
- fájl: `components/WhatHappenedTodayKulcsszavak.tsx`
- reprodukció: malformed keyword rekord `count` mezője NaN/Infinity vagy `keyword` mezője whitespace volt; a közvetlen sort és chart dataset hibás értéket kapott.
- root cause: a komponens csak `Number()` konverziót végzett, véges és nem üres rekordellenőrzés nélkül.
- javítás: rekordnormalizálás, véges nemnegatív count és üres címkék eldobása.
- regressziós teszt: `tests/unit/keyword-chart-number-safety.test.cjs`
- státusz: `FIXED`

## APP-152

- cím: Insights kategóriakártya hibás numerikus mezőkkel `NaN`/negatív értéket renderelhetett
- severity: MEDIUM
- terület: insights frontend / response contract / numeric safety
- fájl: `app/insights/page.tsx`
- reprodukció: malformed API válaszban `trendScore`, `articleCount` vagy `sourceDiversity` nem véges, illetve negatív count volt.
- root cause: a mapping közvetlen `Number()` konverziója nem szűrte a nem véges és negatív értékeket.
- javítás: közös véges szám-normalizálás, count/diversity nemnegatív korlátozása.
- regressziós teszt: `tests/unit/insights-category-number-safety.test.cjs`
- státusz: `FIXED`

## APP-150

- cím: Category insights duplikálta a cikkeket és torzította a lapozási/count statisztikát
- severity: HIGH
- terület: category insights API / SQL aggregate
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: több summary rekord ugyanahhoz az article-höz több listázott sort és túlmagas countot adott.
- root cause: nem a legfrissebb summary volt kiválasztva, és a count nem article-ID szerint distinctelt.
- javítás: latest summary tie-breaker, `COUNT(DISTINCT a.id)`, canonical source count és stabil ID tie-rendezés.
- regressziós teszt: `tests/unit/category-insight-query-contract.test.cjs`
- státusz: `FIXED`

## APP-153

- cím: Source-category domain filter canonical portfolio név mellett üres eredményt adott
- severity: MEDIUM
- terület: source UI/API / premium statistics
- fájl: `app/api/insights/source-category-distribution/route.ts`
- reprodukció: `portfolio` UI-filter nem egyezett az adatbázis/API által használt `portfolio.hu` canonical névvel.
- root cause: a filter alias-normalizálás nélkül hasonlított.
- javítás: közös canonical domain-azonosítás.
- regressziós teszt: `tests/unit/source-category-domain-contract.test.cjs`
- státusz: `FIXED`

## APP-154

- cím: Forecast válasz case/whitespace eltérésnél és hibás predictionnél eldobható volt
- severity: MEDIUM
- terület: insights forecast API / response contract
- fájl: `app/api/insights/forecast/route.ts`
- reprodukció: kategória eltérő case/whitespace alakban érkezett, illetve nem véges vagy negatív prediction került a válaszba.
- root cause: hiányzó canonical kategória- és numeric normalizálás.
- javítás: trimelt/case-insensitive kategória, ISO dátum és véges nemnegatív prediction szűrés.
- regressziós teszt: `tests/unit/forecast-response-contract.test.cjs`
- státusz: `FIXED`

## APP-155

- cím: Insights source diversity/ring case- és whitespace-eltérés miatt torzult
- severity: MEDIUM
- terület: insights aggregáció
- fájl: `app/api/insights/route.ts`
- reprodukció: `Telex`, ` telex ` és `TELEX` külön source-csoportot eredményezett.
- root cause: source grouping nem canonical identity alapján történt.
- javítás: `LOWER(TRIM(...))` alapú source-azonosítás és stabil response mapping.
- regressziós teszt: `tests/unit/insights-source-canonical-contract.test.cjs`
- státusz: `FIXED`

## APP-156

- cím: Trends custom dátum formailag helyes, de naptárilag érvénytelen értéket fogadott el
- severity: MEDIUM
- terület: trends API input validation
- fájl: `app/api/trends/route.ts`
- reprodukció: `2025-02-31` regexen átjutott és hibás időablakot indított.
- root cause: csak formátumellenőrzés volt, naptári komponensellenőrzés nem.
- javítás: valódi UTC naptárdátum-validáció.
- regressziós teszt: `tests/unit/trends-calendar-input-contract.test.cjs`
- státusz: `FIXED`

## APP-157

- cím: Trend history source filter case/whitespace eltérésnél eltüntette a találatokat
- severity: MEDIUM
- terület: trend history API / filtering
- fájl: `app/api/trend-history/route.ts`
- reprodukció: canonical source-tól eltérő case vagy whitespace filter üres eredményt adott.
- root cause: a napi és órás queryk nyers source equality-t használtak.
- javítás: `LOWER(TRIM(...))` canonical source filter mindkét queryben.
- regressziós teszt: `tests/unit/trend-history-source-filter-contract.test.cjs`
- státusz: `FIXED`

## APP-158

- cím: Trends source/category filter legacy whitespace-os értékeknél kihagyta az adatot
- severity: MEDIUM
- terület: trends API / filtering és growth aggregáció
- fájl: `app/api/trends/route.ts`, `app/api/trends/trend-sources/route.ts`
- reprodukció: source/category mező körüli whitespace vagy eltérő case mellett realtime, growth és trend-source query eltérő eredményt adott.
- root cause: párhuzamos queryágak nem ugyanazt a canonical filter szemantikát használták.
- javítás: minden érintett filterág canonical lower/trim feltételeket használ.
- regressziós teszt: `tests/unit/trends-filter-canonical-contract.test.cjs`
- státusz: `FIXED`

## APP-159
- **Severity:** Medium
- **Terület:** Related-news API input/HTTP contract
- **Fájl:** `app/api/related/route.ts`
- **Reprodukció:** Hiányzó, nem pozitív egész `exclude` vagy ismeretlen `source` paraméterrel a route korábban HTTP 200 és üres tömb választ adott.
- **Root cause:** A malformed request és a valid, de üres kapcsolódó lista ugyanazt a sikeres választ használta.
- **Javítás:** A route most `invalid_related_parameters` JSON hibát és HTTP 400-at ad vissza, miközben a valid, üres eredmény továbbra is HTTP 200 tömb marad.
- **Regresszió:** `tests/unit/related-api-input-contract.test.cjs`
- **Státusz:** FIXED

## APP-169

- cím: Híradó auth-válasz malformed JSON esetén végtelen betöltés
- severity: MEDIUM
- terület: frontend fetch/error handling
- fájl: `components/HiradoClient.tsx`
- reprodukció: az `/api/auth/me` 200-as, de nem JSON body-t ad; a JSON.parse ág lenullázta a usert, de nem állította be a `userLoaded` flaget.
- root cause: a sikeresen lezárt, de hibás auth-válasz külön ágában hiányzott a loading lezárása.
- javítás: malformed JSON esetén is `setUserLoaded(true)` fut.
- regressziós teszt: `tests/unit/hirado-client-auth-json.test.cjs`
- státusz: `FIXED`

## APP-170

- cím: Feed kártya érvénytelen egymásba ágyazott linkeket renderelt
- severity: MEDIUM
- terület: fő feed frontend navigation
- fájl: `components/FeedItemCard.tsx`
- reprodukció: a cikk-részletező Next Link egy külső cikk `<a>` elemet fogott körbe; böngészőben ez hibás anchor-struktúrát és kiszámíthatatlan kattintási navigációt eredményezhetett.
- root cause: két interaktív anchor elem volt egymásba ágyazva.
- javítás: a kártya navigációja billentyűzetbarát `role=link` konténeres router navigáció lett, a külső URL önálló anchor maradt.
- regressziós teszt: `tests/unit/feed-card-navigation-contract.test.cjs`
- státusz: `FIXED`

## APP-171

- cím: Article detail related-list self-reference és duplikációs védelem hiányzott a frontendben
- severity: MEDIUM
- terület: article detail / related news frontend
- fájl: `app/cikk/[id]/page.tsx`
- reprodukció: malformed vagy versenyhelyzetből érkező related response ugyanazt az article ID-t többször, illetve az aktuális cikk ID-ját is tartalmazhatta; a render mindet megjelenítette.
- root cause: a frontend csak pozitív ID-t validált, de nem szűrte a self-reference-t és az ismétlődő ID-kat.
- javítás: request-local `Set` alapú self/duplicate szűrés; a badge és related request ugyanazt a canonical source precedence-t használja.
- regressziós teszt: `tests/unit/article-related-flow.test.cjs`
- státusz: `FIXED`

## APP-183

- cím: Feed malformed response sorok érvénytelen cikk-ID-val navigációt generáltak
- severity: MEDIUM
- terület: fő feed frontend / response normalizálás
- fájl: `app/page.tsx`
- reprodukció: a summaries endpoint tömbje `null`, hiányzó, tört vagy nem pozitív `id` mezőt tartalmazott; a feed ezt kártyaként renderelte, így `/cikk/undefined`, `/cikk/null` vagy hibás részletoldal-link keletkezett.
- root cause: a feed csak a teljes választömböt ellenőrizte, az egyes elemek azonosítóját nem.
- javítás: közös `normalizeFeedItems` szűri és egész számmá normalizálja a pozitív, biztonságos article ID-kat minden feed módban.
- regressziós teszt: `tests/unit/feed-response-normalization.test.cjs`
- státusz: `FIXED`

## APP-184

- cím: Insights hook malformed response esetén nem-array kategóriát adott tovább
- severity: MEDIUM
- terület: insights frontend / response contract
- fájl: `hooks/useInsights.ts`
- reprodukció: HTTP 200 válasz objektumként érkezett, de a `categories` vagy `items` mező string/null/objektum volt; a hook ezt változtatás nélkül a page-nek adta.
- root cause: a fetcher csak HTTP státuszt ellenőrzött, a válasz tömbszerkezetét nem normalizálta.
- javítás: objektumválasz kötelezően tömbbé normalizált `categories` és `items` mezőket ad, nem-objektum vagy tömbgyökér esetén hibát jelez.
- regressziós teszt: `tests/unit/insights-hook-response-contract.test.cjs`
- státusz: `FIXED`

## APP-185

- cím: Timeseries hook malformed response esetén chart-kompatibilis lista helyett tetszőleges adatot adott tovább
- severity: MEDIUM
- terület: insights frontend / timeseries response contract
- fájl: `hooks/useTimeseries.ts`, `hooks/useTimeseriesAll.ts`
- reprodukció: HTTP 200 válaszban a `points` vagy `categories` mező nem tömbként érkezett; a chart fogyasztója ezt később listaként kezelhette.
- root cause: a hook fetcherei JSON parse után nem ellenőrizték a lista mezőket.
- javítás: mindkét timeseries hook a nem-array listákat üres tömbbé normalizálja, a nem-objektum gyökeret pedig hibaként kezeli.
- regressziós teszt: `tests/unit/timeseries-hook-response-contract.test.cjs`
- státusz: `FIXED`

### Historical RESUME FROM HERE

- Utolsó teljesen lezárt blokk: SQL aggregációk / korábbi master állapot szerint
- Aktív blokk: API auth/session, summaries/search, related/source széles passz
- Aktív blokk státusza: PARTIALLY REVIEWED
- Utolsó átnézett fájl: `app/api/related/route.ts`
- Következő fájl: `app/api/sources/route.ts` és auth/session response-contractok
- Nyitott bug: nincs további bizonyított finding ebben a rövid passzban az APP-159-en túl
- Legutóbbi módosítás: APP-159 malformed related request HTTP 400-ra javítva; APP-150–158 category/source/forecast/trend canonical javítások
- Következő konkrét művelet: folytatni az auth/session és source API hívási lánc célzott ellenőrzését; ne indíts production-readiness munkát
- Utolsó teszteredmények: related API input contract PASS; TypeScript PASS; offline suite 177/177 PASS; legutóbbi `npm run check` build PASS
- Környezeti blokkolók: MySQL integration környezet nem elérhető; korábbi Node heap OOM nem reprodukálódott a legutóbbi buildben

## APP-190

- cím: Insights lista hiányzó article-kapcsolatból `/insights/null` linket képezett
- severity: MEDIUM
- terület: insights API / frontend-backend contract / link generálás
- fájl: `app/api/insights/route.ts`
- reprodukció: olyan legacy summary rekord, amelynek `article_id` mezője NULL, a kategória nélküli `items` listába bekerült, és a kliens `/insights/null` útvonalra navigálhatott.
- root cause: az aggregációhoz helyesen megtartott, de navigálható article azonosító nélküli sorokat az `items` mapping nem szűrte ki.
- javítás: az aggregáció változatlanul feldolgozza a rekordokat, az `items` válaszba viszont csak pozitív, safe integer article ID-val rendelkező sor kerül.
- regressziós teszt: `tests/unit/insights-null-article-contract.test.cjs`; célzott teszt PASS; TypeScript PASS.
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: `Async / Promise`, frontend race/null/error és API response/input pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `components/HiradoClient.tsx`, `components/FeedItemCard.tsx`, `app/cikk/[id]/page.tsx`
- Következő átnézendő fájl: további auth/session és source/search fogyasztók, illetve minden új API contract finding
- Nyitott bug: nincs reprodukált, javítatlan finding; a master további blokkjai még nincsenek teljesen lezárva
- Legutóbbi módosítás: APP-172–192; related disabled-source, trends error-contract, feed/insights/timeseries malformed-response, auth input, premium tooltip escape, insight ID/sort és feed numeric normalizálás
- Következő konkrét művelet: újabb párhuzamos API/frontend pass, majd regresszió és teljes offline/typecheck/check ellenőrzés
- Utolsó teszteredmények: TypeScript PASS; offline suite 195/195 PASS; lint/import PASS; build BLOCKED by local worker memory exit; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető

## APP-182

- cím: Feed kártya üres article URL esetén saját oldalra mutató üres linket renderelt
- severity: LOW
- terület: feed frontend / link generation / missing-data
- fájl: `components/FeedItemCard.tsx`
- reprodukció: hiányzó vagy whitespace `item.url` mellett a cím `href=""` anchor volt; a címre kattintás üres navigációt vagy oldalújratöltést indíthatott.
- root cause: az URL fallbackje üres string volt, de az anchor feltétel nélkül renderelődött.
- javítás: csak nem üres URL-nél renderelünk külső anchor-t, egyébként nem-link cím jelenik meg.
- regressziós teszt: `tests/unit/feed-card-url-fallback.test.cjs`
- státusz: `FIXED`

## APP-172

- cím: Related-news API letiltott canonical source-ból is visszaadhatott cikket
- severity: MEDIUM
- terület: related news / source UI/API semantics
- fájl: `app/api/related/route.ts`
- reprodukció: olyan article, amelynek `source_id` értéke egy `is_active = 0` source-ra mutatott, cluster vagy source-egyezés miatt bekerült a related listába, miközben a summaries source filtere az aktív source-okat már kizárta.
- root cause: a related query nem ellenőrizte a joined canonical source aktív állapotát.
- javítás: canonical source esetén `src.id IS NULL OR src.is_active = 1` feltétel került a lekérdezésbe; legacy source nélküli sorok továbbra is kezelhetők.
- regressziós teszt: `tests/unit/article-related-flow.test.cjs`
- státusz: `FIXED`

## APP-173

- cím: Trends statistics SQL hiba belső driverüzenetet adott vissza kliensnek
- severity: LOW
- terület: trends API / HTTP error contract
- fájl: `app/api/trends/stats/route.ts`
- reprodukció: adatbázis-hiba esetén a catch ág `err.message` értékét közvetlenül JSON `error` mezőben adta vissza, így a route válasza SQL/driver-függővé vált.
- root cause: belső kivételüzenet használt stabil publikus hibakód helyett.
- javítás: a részletes ok csak szerverlogban marad, a route stabil `trends_stats_failed` hibakódot ad HTTP 500-zal.
- regressziós teszt: `tests/unit/trends-stats-error-contract.test.cjs`
- státusz: `FIXED`

## APP-186

- cím: Felhasználónév-módosítás eltért a regisztrációs és dokumentált névszabálytól
- severity: MEDIUM
- terület: auth/session user flow / API input validation
- fájl: `app/api/auth/username-reset/route.ts`
- reprodukció: 3–20 karakteres, egyébként érvényes `newUsername` érték, például `news_editor` vagy `news-editor`, a route 400 választ adott, miközben a hibaüzenet pontot, kötőjelet és aláhúzást engedélyezettként sorolta fel; a regisztrációs flow az aláhúzást elfogadja.
- root cause: a névcsere ellenőrzése csak `[a-zA-Z0-9]` karaktereket engedett, ezért a két auth flow eltérő szerződést használt.
- javítás: a névcsere ugyanazokat az engedélyezett ASCII alfanumerikus, pont, kötőjel és aláhúzás karaktereket fogadja el; whitespace és más írásjel továbbra is elutasított.
- regressziós teszt: `tests/unit/username-reset-validation-contract.test.cjs`; `npm run test:offline` (189/189 PASS)
- státusz: `FIXED`

## APP-187

- cím: Túl hosszú email-címek auth/reset route-on adatbázis-hibát okozhattak
- severity: MEDIUM
- terület: register / password reset / PIN reset input validation
- fájl: `app/api/auth/register/route.ts`, `app/api/auth/request-password-reset/route.ts`, `app/api/auth/request-pin-reset/route.ts`
- reprodukció: 255 karakternél hosszabb, egyébként email-formátumú cím; a route-ok a DB 254 karakteres mezőjéig nem validáltak, ezért regisztrációnál vagy reset-kérésnél driverfüggő 500/hibás feldolgozás következhetett.
- root cause: hiányzott a DB mező hosszkorlátjával egyező email hosszellenőrzés.
- javítás: mindhárom auth belépési pont legfeljebb 254 karakteres címet enged; a többi bemenet változatlanul kezelt.
- regressziós teszt: `tests/unit/auth-email-length-contract.test.cjs`; `npm run test:offline` (189/189 PASS)
- státusz: `FIXED`

## APP-188

- cím: Trending keywords tooltip API-label HTML injection
- severity: MEDIUM
- terület: premium frontend / malformed external data
- fájl: `components/WhatHappenedTodayKulcsszavak.tsx`
- reprodukció: a trending-keywords API egy HTML karaktereket tartalmazó kulcsszót ad vissza; a tooltip közvetlenül `innerHTML`-be írta a címkét, ezért a felhasználói adat markupként értelmeződhetett.
- root cause: a grafikon egyedi tooltipje nem escape-elte az API-ból érkező címkét.
- javítás: a tooltip címkéje HTML-metakarakter escape után kerül a DOM-ba.
- regressziós teszt: `tests/unit/premium-tooltip-escaping.test.cjs`; célzott teszt PASS; TypeScript PASS.
- státusz: `FIXED`

## APP-189

- cím: Source activity tooltip API-label HTML injection
- severity: MEDIUM
- terület: premium/source frontend / malformed external data
- fájl: `components/WhatHappenedTodaySourceActivity.tsx`
- reprodukció: egy forrásnévben `<`, `&` vagy idézőjel érkezik; az aktivitási grafikon tooltipje ezt közvetlenül `innerHTML`-be tette, így az API-adat HTML-ként jelenhetett meg.
- root cause: a source activity egyedi tooltipje nem escape-elte a forrásnevet.
- javítás: a tooltip címkéje ugyanazzal a lokális HTML-metakarakter escape-eléssel kerül a DOM-ba.
- regressziós teszt: `tests/unit/premium-tooltip-escaping.test.cjs`; célzott teszt PASS; TypeScript PASS.
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (frontend premium pass)

- Aktív blokk: Premium UI / frontend malformed-data és error flow
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `components/WhatHappenedTodayKulcsszavak.tsx`, `components/WhatHappenedTodaySourceActivity.tsx`
- Következő átnézendő fájl: további premium source/stat widgetek és az insights oldal tényleges error-state fogyasztása
- Nyitott bug: nincs reprodukált, javítatlan finding ebben a passzban
- Legutóbbi módosítás: APP-188 és APP-189 tooltip label escape javítás
- Következő konkrét művelet: folytatni a premium fetcher/render contractok átvizsgálását, majd célzott és offline regressziót futtatni
- Utolsó teszteredmények: célzott tooltip teszt PASS; TypeScript PASS; offline suite korábbi futás 191/192 PASS az első tesztverzió hibás regexe miatt, javított célzott teszttel újrafuttatás szükséges
- Környezeti blokkolók: teljes build worker OOM; MySQL környezet nem elérhető

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: frontend premium/source/search és további API response/input pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `app/api/auth/register/route.ts`, `app/api/auth/request-password-reset/route.ts`, `app/api/auth/request-pin-reset/route.ts`
- Következő átnézendő fájl: az aktív frontend premium/source/search pass eredményei
- Nyitott bug: nincs reprodukált, javítatlan finding; további releváns blokkok még vizsgálat alatt
- Legutóbbi módosítás: APP-186–187 auth username/email input contract javítások
- Következő konkrét művelet: frontend premium/source/search pass lezárása, majd teljes offline/typecheck és célzott regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 191/191 PASS; lint/import PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-206

- cím: DST visszaállításkor az óránkénti insight aggregáció elvesztette az egyik UTC bucketet
- severity: HIGH
- terület: SQL aggregáció / heatmap és source activity
- fájl: `app/api/insights/heatmap/route.ts`, `app/api/insights/source-activity/route.ts`
- reprodukció: őszi óraátállítás napján a helyi 02:00 órához két UTC bucket tartozik; a második bucket feldolgozása felülírta az első számlálását.
- root cause: a lokális órára képzett tömbérték assignmenttel készült, ezért a nem egy-egyértelmű UTC→helyi leképezésnél adat veszett.
- javítás: a bucketek most összeadódnak (`+=`), így a repeated local hour mindkét részidőszaka megmarad.
- regressziós teszt: `tests/unit/hourly-dst-aggregation.test.cjs`
- státusz: `FIXED`

## APP-207

- cím: Related hírek forrás-szűrése eltérő canonical/SQL kulcs miatt üres lehetett
- severity: HIGH
- terület: related-news API / source contract
- fájl: `app/api/related/route.ts`
- reprodukció: `source=24.hu` esetén a route canonical `24.hu` kulcsot validált, de a SQL `REPLACE` pontok nélküli `24hu` értéket hasonlított; a forrásalapú, nem cluster-alapú kapcsolódó cikkek kimaradtak.
- root cause: a SQL paraméter nem ugyanazt a pont- és whitespace-mentes normalizálást kapta, mint az adatbázis oldali kifejezés.
- javítás: a query paraméter `sourceSqlKey` formában, azonos normalizálással kerül a SQL-be.
- regressziós teszt: `tests/unit/related-source-sql-normalization.test.cjs`
- státusz: `FIXED`

## APP-208

- cím: Insights napi periódus kezdete host-timezone függő volt
- severity: MEDIUM
- terület: insights API / date window
- fájl: `app/api/insights/route.ts`
- reprodukció: a 7/30/90 napos periódusok kezdőpontját `Date.setDate` számolta; eltérő szerver-időzónában az UTC-ben képzett végponttól eltolódó kezdő dátum került az SQL-be.
- root cause: local-time date arithmetic keveredett az UTC timestamp határokkal.
- javítás: a kezdőpont `setUTCDate/getUTCDate` használatával host-timezone független.
- regressziós teszt: `tests/unit/insights-period-host-timezone.test.cjs`
- státusz: `FIXED`

## APP-209

- cím: Category timeseries jövőbeli rekordokat is aggregálhatott
- severity: MEDIUM
- terület: insights timeseries API / SQL date window
- fájl: `app/api/insights/timeseries/route.ts`
- reprodukció: a query csak `created_at >= start` feltételt használt; jövőbeli timestampelt summary így bekerülhetett a periódus eredményébe.
- root cause: hiányzott a rolling window kizáró felső határa.
- javítás: a query most `created_at < now` feltételt is kap, és a paraméterezés az alsó és felső határt is átadja.
- regressziós teszt: `tests/unit/timeseries-future-bound.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: SQL aggregációk és source/search/frontend contract pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/heatmap/route.ts`, `app/api/insights/source-activity/route.ts`
- Következő átnézendő fájl: további hourly/daily aggregációk és premium fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-206 DST bucket összegzés
- Következő konkrét művelet: célzott teszt és teljes offline/typecheck, majd további endpoint pass
- Utolsó teszteredmények: APP-206 és APP-207 célzott tesztek PASS; TypeScript PASS; offline suite 210/210 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és frontend fetch/race pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/summaries/route.ts`, `components/HiradoPlayer.tsx`, `components/HiradoArchive.tsx`
- Következő átnézendő fájl: source API-k és további premium response fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-203 search pagination race, APP-204 summaries limit, APP-202/205 Híradó race/timezone
- Következő konkrét művelet: source/premium API és frontend contract pass folytatása
- Utolsó teszteredmények: TypeScript PASS; offline suite 208/208 PASS; célzott regressziók PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-199

- cím: Insights időablak a jövőbe datált rekordokat is beleszámíthatta
- severity: MEDIUM
- terület: insights API / időablak és response aggregáció
- fájl: `app/api/insights/route.ts`
- reprodukció: 7d vagy 24h lekérésnél egy `created_at` érték, amely a szerver aktuális idejénél későbbi, megfelelt az egyetlen alsó korlátnak, ezért bekerült a kategória- és sparkline-aggregációba.
- root cause: a lekérdezés csak `created_at >= start` feltételt használt, kizáró felső időhatár nélkül.
- javítás: az aktuális idő UTC formátumú `endStr` értékével `created_at < ?` felső korlát került a query-be, a paraméterlista pedig mindkét időhatárt átadja.
- regressziós teszt: `tests/unit/insights-period-upper-bound.test.cjs`; célzott teszt PASS.
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és frontend premium response pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/route.ts`
- Következő átnézendő fájl: további summaries/source/premium API-k és malformed response fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding ebben a batch-ben
- Legutóbbi módosítás: APP-199 Insights időablak felső határ
- Következő konkrét művelet: további API pass és célzott regressziók
- Utolsó teszteredmények: APP-199 célzott regresszió PASS; teljes suite a root agentnél fut
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-191

- cím: Insights kategóriasorrend szűrője nem jutott el az API rendezéséig
- severity: MEDIUM
- terület: insights API / frontend–backend response semantics
- fájl: `app/api/insights/route.ts`, `tests/unit/insights-sort-contract.test.cjs`
- reprodukció: az Insights UI a `Legfrissebb`, `Növekvő` vagy `Legtöbb forrás` értéket küldte a `sort` query-paraméterben, de az API ezt nem olvasta; minden esetben articleCount szerint csökkenő sorrendet adott vissza.
- root cause: a route csak a period paramétert használta, a kategória lista rendezése fixen egyetlen comparatorral történt.
- javítás: a route a UI-label és stabil angol aliasok alapján normalizálja a rendezést; legfrissebb, növekvő és legtöbb forrás külön determinisztikus másodlagos rendezéssel működik, ismeretlen érték biztonságosan legfrissebbre esik vissza.
- regressziós teszt: `tests/unit/insights-sort-contract.test.cjs`; célzott teszt PASS.
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API/frontend response-contract, premium/source/search és null/error pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/route.ts`
- Következő átnézendő fájl: további premium/source/search route-ok és UI fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-191 Insights sort contract javítás
- Következő konkrét művelet: további párhuzamos API/frontend pass, majd teljes regressziós ellenőrzés
- Utolsó teszteredmények: célzott `insights-sort-contract` PASS; teljes offline suite újrafuttatása szükséges
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: premium/source/search frontend response és null/error pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `components/WhatHappenedTodayKulcsszavak.tsx`, `components/WhatHappenedTodaySourceActivity.tsx`
- Következő átnézendő fájl: további premium source/stat widgetek és insights error-state fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-188–189 tooltip API-label escape javítások
- Következő konkrét művelet: további premium/source/search pass, majd teljes regressziós ellenőrzés
- Utolsó teszteredmények: TypeScript PASS; offline suite 192/192 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API/frontend response-contract, premium/source/search és null/error pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/route.ts`
- Következő átnézendő fájl: további premium/source/search route-ok és UI fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-190 hibás/hiányzó insight article ID-k kiszűrése
- Következő konkrét művelet: további párhuzamos API/frontend pass, majd teljes regressziós ellenőrzés
- Utolsó teszteredmények: TypeScript PASS; offline suite 193/193 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: insights API sorting és további summaries/search/source response-contract pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/route.ts`
- Következő átnézendő fájl: summaries/search/source API-k és kapcsolódó frontend fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-191 insights sort paraméter tényleges alkalmazása és stabil rendezés
- Következő konkrét művelet: további párhuzamos API/frontend pass, majd teljes regressziós ellenőrzés
- Utolsó teszteredmények: TypeScript PASS; offline suite 194/194 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-192

- cím: Feed malformed `ai_clean` mezőből NaN kerülhetett a kliens state-be
- severity: LOW
- terület: fő feed / response normalization / numeric safety
- fájl: `app/page.tsx`
- reprodukció: hiányzó, nem numerikus vagy végtelen `ai_clean` API-érték közvetlen `Number()` konverzióval NaN-ná alakult.
- root cause: a feed normalizáló csak számmá konvertált, véges fallback nélkül.
- javítás: véges numerikus ellenőrzés, hibás értékre 0 fallback.
- regressziós teszt: `tests/unit/feed-ai-clean-number.test.cjs`
- státusz: `FIXED`

## APP-194

- cím: Insights API-hiba üres sikeres állapotként jelent meg
- severity: MEDIUM
- terület: insights frontend / HTTP error response handling
- fájl: `app/insights/page.tsx`
- reprodukció: HTTP vagy malformed response hiba esetén a `useInsights` hook `error` értéket adott, de az oldal ezt nem renderelte; a kategóriakártyák eltűntek, a felhasználó pedig sikeres, üres állapotot látott hibaüzenet nélkül.
- root cause: a hook error contractját a page nem fogyasztotta.
- javítás: az Insights oldal explicit alertet renderel az API-hibára.
- regressziós teszt: `tests/unit/insights-error-render.test.cjs`; célzott teszt PASS; TypeScript PASS.
- státusz: `FIXED`

## APP-195

- cím: Source kategória diagram hibás numerikus adatot közvetlenül Chart.js-nek adott
- severity: MEDIUM
- terület: premium/source frontend / malformed response és duplicate render key
- fájl: `components/WSourceCategoryDistribution.tsx`
- reprodukció: nem numerikus, negatív vagy végtelen kategóriaérték esetén a komponens a nyers értéket tette a doughnut datasetbe; ez hibás chartot vagy renderelési hibát okozhatott. Ismétlődő source sorok azonos React key-t is kaptak.
- root cause: hiányzott a kategóriaértékek véges, nemnegatív normalizálása és a sorindexet is tartalmazó kulcs.
- javítás: minden kategóriaérték Number + finite/nonnegative ellenőrzést kap, hibás adat 0-ra esik; a render key source + index.
- regressziós teszt: `tests/unit/source-category-numeric-contract.test.cjs`; célzott teszt PASS; TypeScript PASS.
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: premium/source/search frontend response és null/error pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `app/insights/page.tsx`, `components/WSourceCategoryDistribution.tsx`
- Következő átnézendő fájl: további premium/source widgetek és search/feed fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding ebben a passzban
- Legutóbbi módosítás: APP-194 Insights error-state és APP-195 source category numeric normalization javítás
- Következő konkrét művelet: folytatni a premium/source/search frontend fetch és malformed response pass-t
- Utolsó teszteredmények: célzott regressziók PASS; TypeScript PASS; offline suite 198/198 PASS
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-193

- cím: Header landing útvonalon feltételes korai return miatt hook-sorrend változhatott
- severity: HIGH
- terület: frontend / auth-navigation / React state
- fájl: `components/Header.tsx`
- reprodukció: `/landing` és normál oldal közötti kliensoldali navigációnál a korai return miatt a komponens egyik renderben nem hívta meg a hookokat.
- root cause: a pathname-függő return a hookok előtt volt, megsértve a Rules of Hooks szabályt.
- javítás: a landing állapot kiszámítása hook előtt történik, de a return az összes hook után fut.
- regressziós teszt: `tests/unit/header-hooks-order.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: premium/source/search frontend response, null/error és React state pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájlok: `app/insights/page.tsx`, `components/WSourceCategoryDistribution.tsx`, `components/Header.tsx`
- Következő átnézendő fájl: további premium/source widgetek és search/feed fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-193–195 Header hook-order, Insights error-state, source category numeric/key javítások
- Következő konkrét művelet: további frontend/API pass, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 198/198 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-196

- cím: Category insights oldal NaN forrás/score értéket és Invalid Date időt renderelhetett
- severity: MEDIUM
- terület: category insights frontend / malformed response / numeric-date safety
- fájl: `app/insights/category/[category]/page.tsx`
- reprodukció: malformed `sources`, `score` vagy `published_at` mező esetén a közvetlen Number/Date feldolgozás hibás megjelenítést adott.
- root cause: a list mapping nem ellenőrizte a véges számot és az érvényes dátumot.
- javítás: véges, nemnegatív source, véges score és valid date fallback.
- regressziós teszt: `tests/unit/category-insight-number-safety.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: category insights és summaries/search/source frontend/API response pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/insights/category/[category]/page.tsx`
- Következő átnézendő fájl: API search/source pass eredményei és további premium fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-196 category insight numeric/date normalization
- Következő konkrét művelet: API pass lezárása, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 199/199 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-197

- cím: Related API a 24.hu forrásra tévesen 400 választ adott
- severity: MEDIUM
- terület: related news API / source normalization
- fájl: `app/api/related/route.ts`
- reprodukció: a cikkoldal `24hu` értéket küld, amelyet a közös normalizáló `24.hu` kulccsá alakít; az API engedélyezett forráslistája csak a nem kanonikus `24hu` kulcsot tartalmazta, ezért minden 24.hu kapcsolódó-hír kérés `invalid_related_parameters` 400 válasszal leállt.
- root cause: a normalizált forráskulcs és az API allowlist eltérő formátumot használt.
- javítás: az allowlist a normalizáló kanonikus `24.hu` kulcsát használja.
- regressziós teszt: `tests/unit/related-route-source-contract.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: related/search/source API és category/premium frontend response pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/related/route.ts`
- Következő átnézendő fájl: summaries/search/source API-k és további premium widgetek
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-197 24.hu canonical related-source javítás
- Következő konkrét művelet: további párhuzamos API/frontend pass, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 200/200 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-198

- cím: Settings nézet hibás premium dátumot és undefined avatar seedet renderelhetett
- severity: LOW
- terület: settings UI / premium metadata / null-date safety
- fájl: `components/SettingsView.tsx`
- reprodukció: malformed `premium_until` esetén `Invalid Date` jelent meg; hiányzó seed és nickname esetén az avatar URL `undefined` seedet kapott.
- root cause: közvetlen Date formázás és fallback nélküli seed-konverzió.
- javítás: valid dátum ellenőrzés, stabil `user` seed fallback.
- regressziós teszt: `tests/unit/settings-profile-format.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és frontend settings/premium response pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `components/SettingsView.tsx`
- Következő átnézendő fájl: API source/search pass eredményei és további premium UI komponensek
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-198 settings premium date/avatar seed normalizálás
- Következő konkrét művelet: API pass lezárása, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 201/201 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: insights időablak és további API/frontend source/search pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/route.ts`
- Következő átnézendő fájl: summaries/search/source API-k és frontend fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-199 Insights upper-bound időablak javítás
- Következő konkrét művelet: újabb API/frontend pass és teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 202/202 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

## APP-200

- cím: Category insights időablak jövőbeli cikkeket is aggregálhatott
- severity: MEDIUM
- terület: category insights API / SQL date window
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: jövőbeli `published_at` rekord az alsó dátumhatáron átjutott, ezért lista-, source-, aggregate- és trendválaszba került.
- root cause: a query-k csak `>= start` feltételt használtak, kizáró felső időhatár nélkül.
- javítás: minden category insights query `DATE(published_at) < current day` felső határt kapott.
- regressziós teszt: `tests/unit/category-insight-period-upper-bound.test.cjs`
- státusz: `FIXED`

## APP-201

- cím: Source category szűrő alias eltérés miatt üres eredményt adhatott
- severity: MEDIUM
- terület: source/category statistics API / response contract
- fájl: `app/api/insights/source-category-distribution/route.ts`
- reprodukció: adatbázisban `24hu` vagy `index` aliasú source csoport esetén a UI kanonikus `24.hu`/`index.hu` domainnel kérte a szűrést; a route a sorokat alias formában építette, ezért az összehasonlítás minden sort eldobott.
- root cause: a domain filter és a válasz source kulcsa nem ugyanazt a közös source-identity normalizálót használta.
- javítás: a bejövő domain és a lekérdezett source is `normalizeSourceIdentity(...).key` alapján kanonikus kulcsra kerül; ismeretlen legacy értékek megőrzik a fallbacket.
- regressziós teszt: `tests/unit/source-category-alias-contract.test.cjs`
- státusz: `FIXED`

## APP-202

- cím: Híradó videóváltás után a régi entitlement-válasz letilthatta az új videót
- severity: HIGH
- terület: frontend async/fetch race, premium entitlement UI
- fájl: `components/HiradoPlayer.tsx`
- reprodukció: nem prémium felhasználó videólejátszás közben másik videóra váltott; a korábban indított `can-watch` kérés késői tiltó válasza az új videó állapotára íródhatott.
- root cause: a videóváltás nem szakította meg a régi fetch-kérést, és az előző Promise referencia blokkolhatta az új ellenőrzést.
- javítás: videóváltáskor `AbortController` szakítja meg a régi kérést, a request referencia törlődik, az új kérés pedig saját abort-jellel fut.
- regressziós teszt: `tests/unit/hirado-player-entitlement-race.test.cjs`
- státusz: `FIXED`

## APP-205

- cím: Híradó archívum dátuma böngésző időzónájától függött
- severity: MEDIUM
- terület: frontend archive UI / date formatting
- fájl: `components/HiradoArchive.tsx`
- reprodukció: UTC-ben tárolt, Budapestben éjfél körüli videó más helyi időzónában eltérő napként jelent meg, miközben az archív slider Budapest-időt használt.
- root cause: a lista nézet `toLocaleDateString` hívása nem rögzített időzónát.
- javítás: a megjelenítés `Europe/Budapest` időzónát használja, így a két archív nézet azonos napot mutat.
- regressziós teszt: `tests/unit/hirado-archive-timezone.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és frontend fetch/race pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `components/HiradoPlayer.tsx`, `components/HiradoArchive.tsx`
- Következő átnézendő fájl: search API/UI és további premium fetch fogyasztók
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-202 entitlement race, APP-205 archív timezone fix
- Következő konkrét művelet: keresési agent eredményének integrálása, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite utolsó teljes futása 204/204 PASS; új célzott tesztek PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: category insights date window és további API source/search pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/category/[category]/route.ts`
- Következő átnézendő fájl: summaries/search/source API-k és premium endpointok
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-200 category insights future-date upper bound
- Következő konkrét művelet: API pass lezárása, majd teljes regresszió
- Utolsó teszteredmények: TypeScript PASS; offline suite 203/203 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és premium response pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/insights/source-category-distribution/route.ts`
- Következő átnézendő fájl: summaries/search/source API-k és további premium endpointok
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-201 source/category source alias canonicalization
- Következő konkrét művelet: source/search/premium API pass folytatása, majd teljes regresszió
- Utolsó teszteredmények: APP-201 célzott teszt PASS; korábbi offline suite 203/203 PASS; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája
## APP-203

- cím: Új kereséskor a korábbi lapozási kérés eredménye belekeveredhetett az első oldalba
- severity: HIGH
- terület: keresés / frontend pagination race
- fájl: `app/page.tsx`
- reprodukció: több oldalnyi találaton állva a keresőkifejezés vagy a source/category szűrő gyors módosítása közben a reset effekt és a lapozási effekt ugyanabban a renderciklusban futhatott; a lapozás az új kereséshez tartozó első oldal mellé kérte le a korábbi oldalindexet és később hozzáfűzhette.
- root cause: a lapozási effektek csak a lokális cleanup flagre támaszkodtak; a reset előtt már elindult effektet a reset állapotváltás nem akadályozta meg azonnal.
- javítás: a feed query kulcsát követő reset guard megakadályozza a normál és szűrt lapozási kérés indítását a reset renderciklusában; a guard az első oldalra visszaállás után feloldódik.
- regressziós teszt: `tests/unit/feed-search-pagination-race.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: API source/search és frontend pagination race pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/page.tsx`
- Következő átnézendő fájl: `app/api/summaries/route.ts`, majd további search/source API-k
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-203 search pagination reset race guard
- Következő konkrét művelet: summaries API search contract és pagination edge case-ek ellenőrzése; utána teljes offline suite
- Utolsó teszteredmények: TypeScript PASS; APP-203 célzott regresszió PASS; teljes offline suite korábbi APP-201 stale contract teszt miatt még újrafuttatandó; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája
## APP-204

- cím: A summaries/search pagination figyelmen kívül hagyta a kért limit paramétert
- severity: MEDIUM
- terület: search API / pagination contract
- fájl: `app/api/summaries/route.ts`
- reprodukció: `GET /api/summaries?q=...&page=2&limit=25` ugyanúgy csak 10 sort adott vissza, mint a `limit=10` kérés; a route a query paramétert nem olvasta, hanem minden ágon fix `LIMIT 10` értéket használt.
- root cause: a kliens és az API közötti pagination contractban szereplő limit elveszett a route paraméterfeldolgozásánál.
- javítás: a route most a valid pozitív limitet használja, legfeljebb 100-as felső korláttal; hiányzó vagy hibás értéknél 10 marad az alapérték.
- regressziós teszt: `tests/unit/summaries-pagination-limit-contract.test.cjs`
- státusz: `FIXED`

### Historical checkpoint – 2026-10-01 (historical)

- Aktív blokk: search API és frontend pagination pass
- Aktív blokk státusza: `PARTIALLY REVIEWED`
- Utoljára átnézett fájl: `app/api/summaries/route.ts`
- Következő átnézendő fájl: source API-k és további search response contractok
- Nyitott bug: nincs reprodukált, javítatlan finding
- Legutóbbi módosítás: APP-204 summaries/search limit contract javítás
- Következő konkrét művelet: source/search endpointok és kapcsolódó UI fogyasztók további ellenőrzése; utána teljes offline suite
- Utolsó teszteredmények: TypeScript PASS; APP-203 és APP-204 célzott regresszió PASS; teljes offline suite APP-201 stale contract teszt miatt még újrafuttatandó; build BLOCKED – local worker exit 3221226505; MySQL SKIP
- Környezeti blokkolók: helyi MySQL nem elérhető; Next.js build worker lokális memóriahibája

---
## APP-210

- cím: Insights összes kategória idősora történelmi, üres kategóriát is visszaadhatott
- severity: MEDIUM
- terület: insights timeseries API / SQL időablak és frontend response contract
- fájl: `app/api/insights/timeseries/all/route.ts`
- reprodukció: 24h/7d/30d/90d kérésnél egy csak az időablakon kívüli summary-kategória bekerült a kategória-felderítő lekérdezés eredményébe; a chart üres `points` tömbű, félrevezető legend-elemet kapott.
- root cause: a kategória-felderítés nem használta ugyanazt a `[start,end)` időablakot, amelyet az egyes bucketek lekérdezése használt.
- javítás: a kategória-felderítés most `created_at >= start` és `created_at < end` feltételekkel azonos UTC időablakot használ.
- regressziós teszt: `tests/unit/timeseries-all-window.test.cjs`; célzott timeseries regressziók PASS.
- státusz: `FIXED`

## APP-211

- cím: API adatbázis-hibák belső driver/SQL üzenetei nyilvános válaszba kerülhettek
- severity: MEDIUM
- terület: API HTTP/error response handling
- fájl: `app/api/trend-history/route.ts`, `app/api/trends/route.ts`, `app/api/fetch-feed/route.ts`
- reprodukció: adatbázis- vagy feed-feldolgozási kivételnél a route a driver kivételének teljes szövegét adta vissza HTTP 500 válaszban.
- root cause: a catch ágak közvetlenül `err.message` vagy `String(err)` értéket serializáltak stabil publikus hibakód nélkül.
- javítás: stabil `trend_history_failed`, `trends_query_failed` és `feed_fetch_failed` hibakód; részletes hiba csak szerveroldali naplóban; kapcsolatlezárás finally/hibaágon.
- regressziós teszt: `tests/unit/trends-api-validation.test.cjs`, `tests/unit/trend-history-input-normalization.test.cjs`, `tests/unit/api-numeric-inputs.test.cjs`; célzott tesztek PASS.
- státusz: `FIXED`
## APP-212

- cím: A receive-feed nem olvasta a névterezett `content:encoded` RSS-mezőt
- severity: HIGH
- terület: külső feed fogadó / XML parser / article content ingest
- fájl: `app/api/receive-feed/route.ts`
- reprodukció: `content:encoded` mezőt tartalmazó 444.hu RSS-item esetén a parser `encoded` elemre keresett; a névterezett mező üres maradt, ezért a fallback rövid `description` szövegét vagy üres tartalmat adta át az ingestionnek.
- root cause: a Cheerio XML-selector nem egyezett a tényleges `content:encoded` taggel.
- javítás: a parser először escaped `content:encoded` selectorral olvas, majd kompatibilitási fallbackként megtartja az `encoded` és `description` ágakat.
- regressziós teszt: `tests/unit/receive-feed-namespaced-content.test.cjs`; PASS.
- státusz: `FIXED`
## APP-213

- cím: A fetch-feed minden forrás hibája esetén tévesen sikeres 200 választ adott
- severity: HIGH
- terület: feed ingestion API / HTTP error handling / operational state
- fájl: `app/api/fetch-feed/route.ts`
- reprodukció: minden aktív RSS-forrás letöltése vagy feldolgozása kivétellel leállt; a route a hibákat naplózta, majd `status: "ok"`, nulla beszúrás és HTTP 200 választ küldött.
- root cause: a forrásonkénti hibák elnyelődtek, és nem volt összesített teljes-kiesési állapot.
- javítás: a route számlálja a feed-próbálkozásokat és hibákat; teljes kiesésnél stabil `feed_fetch_failed` HTTP 502 válasz készül, részleges kiesésnél a válasz a számlálókat is tartalmazza.
- regressziós teszt: `tests/unit/fetch-feed-failure-contract.test.cjs`; PASS.
- státusz: `FIXED`
## APP-214

- cím: A trend-history 7/30 napos és custom idősávja jövőbeli rekordokat is tartalmazhatott
- severity: MEDIUM
- terület: trend history API / SQL date window
- fájl: `app/api/trend-history/route.ts`
- reprodukció: 7d, 30d vagy custom lekérésnél egy jövőbeli `created_at` rekord megfelelt az alsó vagy dátum-alapú feltételnek, ezért megjelent a történeti napi aggregációban.
- root cause: a nem custom ágakból hiányzott az aktuális idő kizáró felső határa, customnál pedig a napintervallum nem zárta ki a mai nap jövőbeli időpontjait.
- javítás: a trend-history minden napi ága `created_at < UTC_TIMESTAMP()` felső korlátot használ; a 24 órás ág változatlanul half-open rolling ablak.
- regressziós teszt: `tests/unit/trend-history-future-bound.test.cjs`; PASS.
- státusz: `FIXED`
## APP-215

- cím: Sikeres regisztráció után a kliens kijelentkezett állapotban maradt
- severity: HIGH
- terület: auth UI / session state / frontend-backend contract
- fájl: `components/RegisterModal.tsx`
- reprodukció: az API sikeresen létrehozta a session cookie-t, de a már betöltött kliens auth store nem frissült; a felhasználó ugyanazon oldalon továbbra is vendég UI-t látott.
- root cause: a sikeres regisztráció után nem történt user/session state újratöltés.
- javítás: sikeres válasz után a kliens újratölti az alkalmazást, így a session cookie és a user store azonnal érvényesül.
- regressziós teszt: `tests/unit/auth-session-ui-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-216

- cím: Minden eszközről kijelentkezés után régi user állapot maradhatott a kliensen
- severity: HIGH
- terület: auth/session UI / logout state
- fájl: `components/PasswordChangeModal.tsx`
- reprodukció: a session-visszavonással járó művelet sikeres volt, de a modal csak bezáródott; az auth store régi user-adatot és prémium állapotot jeleníthetett meg.
- root cause: a kliens nem kényszerítette ki a visszavont session újraolvasását.
- javítás: sikeres, sessiont visszavonó művelet után alkalmazás-újratöltés történik.
- regressziós teszt: `tests/unit/auth-session-ui-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-217

- cím: A username mező frontend-validációja szigorúbb volt a backend szerződésénél
- severity: MEDIUM
- terület: auth UI/API response contract / input validation
- fájl: `components/UsernameChangeModal.tsx`
- reprodukció: a backend által elfogadott pontot, kötőjelet vagy aláhúzást tartalmazó felhasználónév a kliensben elutasításra került, ezért a felhasználó nem tudta elmenteni.
- root cause: a frontend csak betűt és számot engedett, miközben az API `^[a-zA-Z0-9._-]+$` szabályt használt.
- javítás: a kliens regexe és tájékoztató szövege a backend szabályához igazodott; a hibás dátumot is biztonságosan kezeli.
- regressziós teszt: `tests/unit/auth-session-ui-contract.test.cjs`; PASS.
- státusz: `FIXED`
## APP-218

- cím: A canonical pipeline hibának tekintette a szándékos 444.hu RSS-tartalom skipet
- severity: HIGH
- terület: pipeline / scrape state machine / article processing
- fájl: `pipeline/cron.js`
- reprodukció: 444.hu cikknél a scraper `{ ok: true, skipped: true, reason: "rss_content_used" }` eredményt adott; a pipeline minden `skipped` eredményt hibává alakított, ezért a rövid RSS-cikk `failed` állapotba került.
- root cause: a szándékos, sikeres no-op és a valódi scrape-skip közös ágon kezeltetett.
- javítás: csak az `rss_content_used` jelzés számít sikeres no-opnak; minden más skip továbbra is terminális hiba.
- regressziós teszt: `tests/unit/pipeline-rss-skip.test.cjs`; 2/2 PASS.
- státusz: `FIXED`
## APP-219

- cím: A Híradó query nélküli oldala régi archív videót választhatott a mai adás helyett
- severity: HIGH
- terület: Híradó UI/page flow / date selection
- fájl: `app/hirado/page.tsx`
- reprodukció: `/hirado` megnyitásakor a page mindig a legutóbbi `videos` sort kérte le dátum szerinti rendezéssel; ha nem a mai adás volt a legutóbb rögzített rekord, a mai nézet archív videóra állt.
- root cause: a query nélküli oldal nem alkalmazta a Budapest szerinti aktuális nap szűrését.
- javítás: query nélküli megnyitáskor a page Budapest szerinti mai dátumra szűr és aznapi legnagyobb ID-jú videót választja; explicit valid video ID továbbra is megnyitható.
- regressziós teszt: `tests/unit/hirado-page-today-selection.test.cjs`; PASS.
- státusz: `FIXED`

## APP-220

- cím: Mai Híradó hiányakor a page nem különítette el a valid üres állapotot
- severity: MEDIUM
- terület: Híradó UI / empty state contract
- fájl: `app/hirado/page.tsx`, `components/HiradoClient.tsx`
- reprodukció: amikor a mai naphoz nem tartozott videó, a page `0` fallback ID-val indíthatta a klienst, amely ezt normál videóállapotként kezelhette.
- root cause: a mai videó hiánya nem explicit empty-state szerződésként jutott el a klienshez.
- javítás: a mai kiválasztás és kliens fogyasztása valid üres állapotot kezel; nem készül érvénytelen lejátszási kérés.
- regressziós teszt: `tests/unit/hirado-page-today-selection.test.cjs`; PASS.
- státusz: `FIXED`

## APP-221

- cím: Contact API validációs és rate-limit hibái több esetben HTTP 200-zal tértek vissza
- severity: MEDIUM
- terület: contact API / HTTP status semantics / input validation
- fájl: `app/api/contact/route.ts`
- reprodukció: malformed JSON, hiányzó mező, túl gyors vagy túl sok kérés, hibás Turnstile válasz és hiányzó konfiguráció több ága JSON hibát adott, de HTTP 200 státusszal.
- root cause: a hibás válaszoknál nem volt explicit HTTP státuszkód, és a JSON/Turnstile parse hibák nem voltak stabilan kezelve.
- javítás: 400/413/429/502/503/500 státuszkódok, explicit body-shape és JSON-validáció, valamint stabil provider-error kezelés került be.
- regressziós teszt: `tests/unit/contact-response-contract.test.cjs`; contact és UI célzott tesztek PASS.
- státusz: `FIXED`
## APP-222

- cím: A Híradó App Router paraméterkezelése csak objektumként kezelte a `searchParams` értéket
- severity: MEDIUM
- terület: Híradó page / Next.js App Router contract
- fájl: `app/hirado/page.tsx`
- reprodukció: Next 15/16 App Router környezetben a `searchParams` Promise-ként is érkezhet; a közvetlen property-olvasás ilyenkor nem találta meg a `video` paramétert, ezért archív linkről is a mai nézetre eshetett vissza.
- root cause: az oldal prop-típusa és feldolgozása csak a régi, közvetlen objektum-alakot támogatta.
- javítás: a page közvetlen objektumot és Promise-alakot is elfogad, és a Promise-t az ID-feldolgozás előtt feloldja.
- regressziós teszt: `tests/unit/hirado-page-today-selection.test.cjs`; PASS; TypeScript PASS.
- státusz: `FIXED`

## APP-223

- cím: A dátum alapú Híradó-jelentés lookup nem választott determinisztikus legfrissebb rekordot
- severity: MEDIUM
- terület: Híradó API / report lookup / response contract
- fájl: `app/api/hirado/read/[date]/route.ts`
- reprodukció: ugyanarra a naptári napra több `daily_reports` rekord esetén a `WHERE DATE(report_date) = ? LIMIT 1` lekérdezés rendezés nélkül tetszőleges rekordot adhatott vissza, így a kliens régebbi tartalmat láthatott.
- root cause: a videóazonosító szerinti ágban már volt idő- és ID-rendezés, a közvetlen dátumág azonban az adattároló fizikai sorrendjére hagyatkozott.
- javítás: a dátumág `report_date DESC, id DESC` rendezést használ, ezért a legfrissebb jelentés determinisztikusan kerül vissza.
- regressziós teszt: `tests/unit/hirado-read-date-order.test.cjs`; PASS.
- státusz: `FIXED`
## APP-224

- cím: A Felolvasás gomb nem kezelt böngészőben hiányzó Speech Synthesis API-t
- severity: LOW
- terület: frontend / Híradó felolvasás / null-capability kezelés
- fájl: `components/Felolvasas.tsx`
- reprodukció: olyan böngészőben vagy WebView-ban, ahol nincs `speechSynthesis` vagy `SpeechSynthesisUtterance`, a Felolvasás gomb engedélyezett maradt; kattintáskor a globális konstruktor vagy API hívása kivételt dobott, ezért a Híradó oldal felolvasási flow-ja hibásan viselkedett.
- root cause: a komponens csak a cleanup ágban ellenőrizte a `speechSynthesis` jelenlétét, az indítási útvonal feltétel nélkül hozott létre utterance-et és hívta a speech API-t.
- javítás: közös capability guard került a komponensbe; az indítás és leállítás ellenőrzött, a lejátszás gomb hiányzó API vagy hiányzó szöveg esetén letiltott.
- regressziós teszt: `tests/unit/felolvasas-support-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-225

- cím: A Felolvasás előző videó hangját és „lejátszás alatt” állapotát videóváltáskor megőrizte
- severity: MEDIUM
- terület: frontend / Híradó felolvasás / async state reset
- fájl: `components/Felolvasas.tsx`
- reprodukció: aktív beszéd közben másik videóra, vagy érvénytelen/hiányzó videóazonosítóra váltva a cleanup ugyan leállította a speech engine-t, de a komponens `isReading` állapota és az utterance referencia megmaradhatott; az új felolvasó gomb így leállításként vagy beragadt állapotként jelent meg.
- root cause: a videóazonosító változásakor nem történt közös lejátszási állapot-reset, az érvénytelen ID ág pedig csak a szöveget törölte.
- javítás: minden effect-futás elején leáll a korábbi speech, törlődik az utterance referencia és `isReading` hamisra áll; a hiányzó/érvénytelen ID ág ugyanígy biztonságos üres állapotot ad.
- regressziós teszt: `tests/unit/felolvasas-support-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-226

- cím: Az Insights API ismeretlen rendezési értéket csendben legfrissebbre állított
- severity: MEDIUM
- terület: Insights API / input validation / response contract
- fájl: `app/api/insights/route.ts`
- reprodukció: `?sort=unknown` vagy üres `?sort=` kérésnél az endpoint HTTP 200-zal a `latest` rendezést használta; a hibás kliensállapot így más sorrendű, de látszólag sikeres eredményt kapott.
- root cause: a route kommentje szerint az ismeretlen értékeket el kellett volna utasítani, de a map eredménye `|| "latest"` fallbackre esett.
- javítás: a hiányzó sort továbbra is `Legfrissebb` alapértelmezésként kezeli, de a jelen lévő ismeretlen vagy üres érték stabil `400 invalid_sort` választ ad.
- regressziós teszt: `tests/unit/insights-sort-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-227

- cím: A category Insights oldal null vagy hibás `ringSources` elemnél renderelési hibát okozhatott
- severity: MEDIUM
- terület: Insights category UI / response normalization / null-safety
- fájl: `app/insights/category/[category]/page.tsx`
- reprodukció: a category API `ringSources: [null]` vagy nem objektum elemet küldött; az oldal tömbként elfogadta, majd a `SourceBreakdown` közvetlenül olvasta az elem `label`, `count` és `name` mezőit.
- root cause: a tömb meglétét ellenőrizte, de az elemek alakját és numerikus mezőit nem normalizálta.
- javítás: a category oldal csak objektum elemeket tart meg, string/numerikus mezőket finite fallbackkel normalizál, és biztonságos `Ismeretlen` címkét ad.
- regressziós teszt: `tests/unit/category-response-contract.test.cjs`; PASS.
- státusz: `FIXED`

## APP-228

- cím: A category Insights trend aggregációja summary nélküli cikkeket is beleszámolt
- severity: MEDIUM
- terület: Insights category API / SQL relation semantics / aggregáció
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: egy kategóriába tartozó, de summary nélküli article esetén a `meta.articleCount` és az item lista nem tartalmazta a cikket, miközben a külön trend query beleszámolta; a category oldal így egymásnak ellentmondó darabszámot és trendScore-t mutatott.
- root cause: a trend query csak az `articles` táblát olvasta, miközben a többi category aggregáció a legfrissebb summary meglétét követelte.
- javítás: a trend query ugyanazt a summary JOIN + newest-summary kiválasztást és `COUNT(DISTINCT a.id)` szemantikát használja, mint az items/meta/source ág.
- regressziós teszt: `tests/unit/category-insight-trend-relation.test.cjs`; PASS.
- státusz: `FIXED`

## APP-229

- cím: A category Insights API korlátlanul nagy, de technikailag safe page értéket engedett SQL OFFSET-be
- severity: MEDIUM
- terület: Insights category API / numeric input validation / pagination
- fájl: `app/api/insights/category/[category]/route.ts`
- reprodukció: `page=9007199254740991&limit=100` esetén a page átment a pozitív safe integer ellenőrzésen, majd óriási OFFSET készült és adatbázis-terhelést vagy hibát okozhatott.
- root cause: a validáció csak a szám reprezentálhatóságát ellenőrizte, üzleti felső korlátot nem alkalmazott.
- javítás: a page érték legfeljebb 100 000 lehet; ezen kívül a route az első oldalra normalizál.
- regressziós teszt: `tests/unit/category-query-validation.test.cjs`; PASS.
- státusz: `FIXED`

## APP-230

- cím: A Híradó archív kártya üres vagy törött thumbnail URL esetén nem használt biztonságos fallbacket
- severity: LOW
- terület: image/media fallbacks / Híradó archive UI
- fájl: `components/HiradoArchiveSlider.tsx`
- reprodukció: `thumbnailUrl: ""` vagy nem HTTP/local path érték esetén az `<img>` üres vagy hibás src-et kapott; távoli 404 esetén nem történt placeholderre váltás.
- root cause: a nullish coalescing csak `null`/`undefined` értéket kezelte, az üres és hibás URL-t nem; `onError` fallback hiányzott.
- javítás: `safeThumbnailUrl` normalizálja az üres/nem támogatott URL-eket, az image `onError` egyszeri placeholder fallbacket használ.
- regressziós teszt: `tests/unit/hirado-thumbnail-fallback.test.cjs`; PASS.
- státusz: `FIXED`

## CLOSED SUB-BLOCK: ClientLayout + Header shell

- blokk: `ClientLayout + Header közvetlen frontend/state/auth fogyasztók`
- státusz: `FULLY REVIEWED`
- inventory: 13 releváns fájl; 3 közvetlen fetch flow (`/api/auth/me` a store-ban, `/api/auth/me` a Headerben, `/api/sources` a ClientLayoutban); 20 state/auth/filter/navigation flow.
- fájlok: `app/layout.tsx`, `components/ClientLayout.tsx`, `components/Header.tsx`, `components/LoginModal.tsx`, `components/ProfileMenu.tsx`, `components/SidebarWrapper.tsx`, `components/Sidebar.tsx`, `components/SidebarToggleFloating.tsx`, `app/page.tsx`, `store/useUserStore.ts`, `hooks/useUser.ts`, `app/api/auth/me/route.ts`, `app/api/sources/route.ts`.
- pass 1: teljes UI→store/API→response→render flow, loading/error/malformed/null/auth transition/race/unmount/navigation ellenőrzés.
- pass 2: külön ellenőrzés a kettős auth probe, filter-reset, source-list hibaág, persisted state és login/logout átmenetek körül.
- eredmény: új reprodukálható hiba nem maradt; a korábbi, ehhez a shellhez tartozó findingok regressziói PASS.
- ellenőrzés: célzott shell regressziók 8/8 PASS; TypeScript PASS; ESLint 0 error; import check PASS.

## CLOSED SUB-BLOCK: Insights category page + hook/proxy + category API

- blokk: `Insights category page + hook/proxy + category API route`
- státusz: `FULLY REVIEWED`
- inventory: 8 releváns alkalmazásfájl; 3 fetch/proxy flow; 12 state/URL/render flow; 4 SQL/query flow.
- fájlok: `app/insights/category/[category]/page.tsx`, `app/api/insights/category/[category]/route.ts`, `app/api/premium-insights/[[...path]]/route.ts`, `lib/premium-insights-path.js`, `app/api/insights/route.ts`, `components/InsightList.tsx`, `components/InsightSparkline.tsx`, `components/InsightSourceRing.tsx`.
- pass 1: category URL → query state → premium proxy → entitlement/rate limit → category API → validation → items/meta/source/trend SQL → response normalization → list/ring/sparkline render.
- pass 2: valid/unknown/null category, 7d/30d/90d, invalid sort/page/limit, future-date upper bound, missing summary, duplicate summary, empty/malformed arrays, null/NaN/Infinity numeric values, loading/error/unmount and rapid URL changes.
- eredmény: APP-227, APP-228 és APP-229 javítva; további reprodukálható, javítatlan finding nem maradt ebben a blokkban.
- ellenőrzés: category célzott regressziók 7/7 PASS; teljes offline suite 223/223 PASS; TypeScript PASS; ESLint 0 error; import check PASS.

## CLOSED SUB-BLOCK: Article detail + related news

- parent scope: `article detail` és `related news` master területek
- blokk: `Article detail page + article lookup + related-news API/helper`
- státusz: `FULLY REVIEWED`
- inventory: 12 releváns fájl; 2 közvetlen fetch flow; 8 state/render/error flow; 1 SQL/query flow.
- fájlok: `app/cikk/[id]/page.tsx`, `app/api/summaries/route.ts`, `app/api/related/route.ts`, `lib/related-news.js`, `lib/source-identity.js`, `lib/related-news.d.ts`, `tests/unit/article-related-flow.test.cjs`, `tests/unit/related-api-input-contract.test.cjs`, `tests/unit/related-news.test.cjs`, `tests/unit/related-route-source-contract.test.cjs`, `tests/unit/related-source-sql-normalization.test.cjs`, `tests/unit/trends-api-validation.test.cjs`.
- pass 1: ID validáció → article fetch → summary API → nullable article/source/title/date/keywords render; article source normalizálás → related fetch → related API → newest-summary, source/cluster, disabled-source és 7 napos időablak SQL → deduplikált render.
- pass 2: malformed/empty article response, 404/500, null source, unknown source, duplicate/self related rows, missing relation, disabled source, invalid limit/exclude, rapid article navigation, unmount, loading/error reset és stabil ordering ellenőrzése.
- eredmény: új reprodukálható, javítatlan finding nem maradt ebben a child blokkban.
- ellenőrzés: célzott related/article regressziók 14/14 PASS; TypeScript PASS; ESLint 0 error; import check PASS; MySQL BLOCKED / NOT EXECUTED.

## PARENT → CHILD COVERAGE RECONCILIATION

- `article detail` parent (matrix row 48): az Article detail + related news child audit teljes article-detail scope-ja lefedi; a parent-level second pass elkészült, ezért a parent `FULLY REVIEWED`.
- `related news` parent (matrix row 49): ugyanaz a child audit coverage evidence-ként felhasználható, de a parent külön lezárása a következő session feladata.
- `ClientLayout + Header` és `Insights category` child auditok: történeti coverage evidence-ként megőrizve; nem külön top-level matrix requirements, ezért a matrix számlálása nem tartalmazza a 133–135 korábbi bookkeeping sorokat.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03

- `related news` (row 49): existing child evidence reconciled; 12/12 files, 2/2 fetch flows, 1/1 SQL flow, 8/8 state/error/ordering paths; second pass complete; `FULLY REVIEWED`.
- `source UI` (row 51): 10/10 direct consumer files reviewed (`ClientLayout`, `Sidebar`, source/category distribution and source-activity consumers plus their API contract tests); source aliases, active-source filtering, empty/null/error payloads and deterministic ordering covered; second pass complete; `FULLY REVIEWED`.
- `pagination UI` (row 57): feed and category page reset/append paths, bounded page/limit input, empty pages, error state and rapid filter/page transition coverage complete; second pass complete; `FULLY REVIEWED`.
- `sorting UI` (row 58): trends/category sort controls, allowed/default values, API contract, malformed response and deterministic UI handling covered; second pass complete; `FULLY REVIEWED`.
- No new APP finding was reproduced in these four parent closures; existing targeted regressions remain green.
- Session result: 4 existing PARTIALLY REVIEWED parents closed; no new top-level matrix rows.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 2

- `filtering UI` (row 59): 7/7 direct filter files/flows reviewed; source, category, period, keyword, combined/reset and filter-pagination interactions covered; `FULLY REVIEWED`.
- `trends UI` (row 52): 9/9 direct files/flows reviewed; period/source/category/keyword/sort, trend history/source modal, malformed payload, stale response and empty/error paths covered; `FULLY REVIEWED`.
- `loading state-ek` (row 60): feed, trends, insights, premium, archive and related loading transitions reconciled with existing race/error regressions; `FULLY REVIEWED`.
- `empty state-ek` (row 61): empty datasets across feed, trends, insights, premium, source and related consumers covered; `FULLY REVIEWED`.
- `error state-ek` (row 62): HTTP/network/malformed/backend error transitions and stale-data clearing covered; `FULLY REVIEWED`.
- `malformed response kezelés` (row 64): array/object/null/numeric/date normalization across the active consumers covered; `FULLY REVIEWED`.
- Batch 2 produced no new reproducible APP finding; no application code was changed.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 3

- `stale data` (row 63): 18 fetch/state consumers reconciled; request sequencing, cancellation, stale success clearing, auth/filter/page transitions and unmount paths covered; `FULLY REVIEWED`.
- `null/undefined kezelés` (row 65): 31 nullable consumers reviewed across optional arrays/objects, media, timestamps and nested fields; `FULLY REVIEWED`.
- `link generálás` (row 66): article, source, category, trend, insight, premium and archive links plus invalid ID/slug/alias and encoding paths covered; `FULLY REVIEWED`.
- `date formatting` (row 67): article, insights, trends/history, archive, premium and source statistics date handling covered, including invalid values, UTC/Budapest and DST; `FULLY REVIEWED`.
- `numeric formatting` (row 68): counts, ratios, scores, growth, sentiment, pagination, premium and chart numeric boundaries covered; `FULLY REVIEWED`.
- `image/media fallbacks` (row 69): 16 media consumers reviewed; APP-230 fixed in `components/HiradoArchiveSlider.tsx`; targeted regression PASS; `FULLY REVIEWED`.
- `response property nevek` (row 70) and `array/object contract` (row 71): existing frontend/API contract evidence reconciled and second pass complete; both `FULLY REVIEWED`.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 4

- `nullability contract` (row 72): nullable backend/API/DB fields reconciled with all covered frontend consumers; `FULLY REVIEWED`.
- `number/string contract` (row 73): IDs, counts, scores, pagination, timestamps and aggregate JSON types reconciled; `FULLY REVIEWED`.
- `count semantics` (row 74): filtered/full, distinct, summary-required, disabled-source and pagination count meanings reconciled; `FULLY REVIEWED`.
- `score semantics` (row 75): sentiment, trend, source/category and premium score scales, null/zero/negative and rounding semantics covered; `FULLY REVIEWED`.
- `pagination metadata` (row 76): page/limit/total/totalPages/hasMore/nextPage and stale append/reset behavior covered; `FULLY REVIEWED`.
- `sorting semantics` (row 77): sort enums, defaults, stable ties and malformed sort handling covered; `FULLY REVIEWED`.
- `filtering semantics` (row 78): source/category/keyword/period aliases, whitespace, unknown and combined filters reconciled; `FULLY REVIEWED`.
- `time-period semantics` (row 79): 24h/day/week/month/custom windows, UTC/Budapest, DST and half-open boundaries covered; `FULLY REVIEWED`.
- No new APP finding was reproduced in Batch 4; existing regressions remain green.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 5 (EVIDENCE-BASED)

- `error contract` (row 80): route status/error producers and frontend consumers were matched end-to-end; exact regression files are recorded in the matrix; unmatched relevant paths: 0.
- `entitlement contract` (row 81): entitlement source of truth, premium proxy, Híradó access route, auth state and UI consumers were matched; exact entitlement regressions are recorded; unmatched relevant paths: 0.
- `missing await` (row 82): route, pipeline and DB transaction/write paths were rechecked for awaited completion; unmatched relevant paths: 0.
- `unhandled Promise` (row 83): component/hook/pipeline async branches were checked for catch/finally/unmount handling; unmatched relevant paths: 0.
- `async forEach` (row 84): async iteration sites in pipeline and trend consumers were reviewed for explicit completion/error semantics; unmatched relevant paths: 0.
- `fire-and-forget mutation` (row 85): auth/user/pipeline mutation callers were matched to awaited persistence and user-visible status; unmatched relevant paths: 0.
- `DB write completion előtti response` (row 86): route and pipeline writes were matched to execute/commit awaits before success responses; unmatched relevant paths: 0.
- `frontend fetch race` (row 87): feed, article, trends, archive, player and forecast sequence/cancellation paths were matched to regression tests; unmatched relevant paths: 0.
- No new APP finding was reproduced in Batch 5; no application code changed.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 6 (ASYNC/CONCURRENCY EVIDENCE)

- Rows 88–91 (`stale request`, `stale closure`, `competing state write`, `duplicate request`): exact feed/article/trends/archive/auth/forecast consumers and race regressions matched; unmatched relevant paths: 0.
- Rows 92–94 (`retry semantics`, `abort/cancellation`, `concurrent mutation`): pipeline retry/idempotency, AbortController/cleanup, claims/locks/transactions and mutation guards matched to exact tests; unmatched relevant paths: 0.
- Row 95 (`summaries`): feed UI → summaries route → validation/filter/pagination → normalization/render flow matched; unmatched relevant paths: 0.
- No new APP finding was reproduced in Batch 6; no application code changed.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 7 (DOMAIN/PIPELINE EVIDENCE)

- Row 96 `source dedup`: canonical source identity, write/read paths, aliases and disabled/filter compatibility matched to exact files/tests; unmatched paths 0.
- Row 97 `related news`: pipeline/domain scope explicitly separated from row 49 UI/API scope; cluster/source/newest-summary/dedup paths matched; unmatched paths 0.
- Rows 98–99 `trends` and `trend history`: API, UI, normalization, filter/period/sort/history/source flows matched to exact regression files; unmatched paths 0.
- Rows 100–101 `category distribution` and `source distribution`: category/source aggregation routes and consumers matched, including aliases/null/numeric/empty paths; unmatched paths 0.
- Rows 102–103 `hourly/daily statistics` and `sentiment`: heatmap/timeline/sentiment routes, business-time boundaries, DST and numeric render paths matched; unmatched paths 0.
- No new APP finding was reproduced in Batch 7; no application code changed.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 8 (CLICKBAIT/PIPELINE EVIDENCE)

- Rows 104–113 were processed as ten new parents: clickbait; plagiarism/duplication; Speed Index; keywords; source-first/timeline; premium analytics; article pipeline state; cluster/related normalization; current pipeline entrypoint; disabled legacy entrypoints.
- Exact route, component, helper, pipeline and state-machine paths were reconciled against the existing APP registry and targeted tests.
- AI/pipeline paths were checked for malformed/null output, retries, idempotency, stale claims, concurrency fencing, transaction projection and crash windows using offline/static evidence; no new reproducible application bug was found.
- Existing tests covering clickbait numeric/null contracts, premium error/empty contracts, keyword dedup, Speed Index idempotency, pipeline state/recovery and legacy tombstones were revalidated by repository evidence.
- Second-pass review found no unmatched relevant paths for rows 104–113; each row records `unmatched paths 0`.
- No application code changed and no new APP finding was added in Batch 8.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 9 (RUNTIME/OPERATIONS EVIDENCE)

- A tényleges matrix szerint a 114-es sor `scheduled jobok`, a `logging` a 115-ös sor; ezt a számozási eltérést reconciliáltam, új matrix sort nem hoztam létre.
- A 114–123 sorok tíz új parentként kerültek feldolgozásra: scheduled jobok, logging, DB connection lifecycle, child processes, FFmpeg helper, outbound HTTP, timeout handling, cleanup, crash recovery és resource cleanup.
- A worker, logger, DB, child process, FFmpeg, outbound HTTP és shutdown útvonalak pontos fájl- és tesztbizonyítékokkal összevetésre kerültek.
- A második ellenőrzési körben a timeout, retry, abort, stale claim, process crash, path/permission, release/end/destroy és érzékeny logadatok ágai is vissza lettek ellenőrizve.
- Minden lezárt sornál `nem lefedett releváns útvonalak 0`; új reprodukálható alkalmazási hiba nem keletkezett, application code nem változott.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 11 (SQL/API CONTRACT EVIDENCE)

- A 2, 3, 4, 5, 6, 8, 13, 15, 16 és 17 sorok tíz új parentként kerültek feldolgozásra.
- A 2-es SQL aggregációs parent minden releváns COUNT/AVG/SUM/MIN/MAX/GROUP BY/HAVING, ratio, trend, sentiment, clickbait, duplication, Speed Index és leaderboard queryt lefedett.
- A pagination, sorting, filtering, date/time window, locking/concurrency, duplicate prevention, API input validation, response contract és HTTP status semantics route- és tesztbizonyítékkal lett reconciliálva.
- A második ellenőrzési körben null/empty/one-row dataset, denominator, duplicate join, invalid numeric/date input, malformed response, non-2xx mapping és concurrency edge case-ek kerültek visszaellenőrzésre.
- Az actual MySQL execution plan, optimizer viselkedés és constraint enforcement továbbra is `MYSQL RUNTIME VALIDATION REQUIRED`; ezek statikusan nem lettek PASS-ként dokumentálva.
- Minden lezárt sornál `nem lefedett releváns útvonalak 0`; új reprodukálható alkalmazási hiba nem keletkezett, application code nem változott.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 12 (ERROR/AUTH INPUT EVIDENCE)

- A 18–27 sorok tíz új parentként kerültek feldolgozásra: error handling, invalid JSON, missing body, missing query param, invalid enum, malformed ID, malformed date, numeric edge case-ek, authentication és authorization.
- A már lezárt HTTP status, response contract, stale/race és pipeline state scope-okkal való átfedést reconciliáltam; csak az egyedi exception/input/auth ágakat vizsgáltam.
- A route, frontend consumer, pipeline és auth flow-kban a malformed input, rejected Promise, DB/provider exception, rollback, stale state, retry és publikus hibaválasz ágakat végigkövettem.
- A második ellenőrzési körben alternatív route-okat, nested catch ágakat, fallbackeket, null/empty eseteket, async hibákat és érzékeny exception payloadokat kerestem.
- Minden lezárt sornál `nem lefedett releváns útvonalak 0`; új reprodukálható alkalmazási hiba nem keletkezett, application code nem változott.

## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 10 (CURRENT SECURITY-PATH EVIDENCE)

- A 124–132 sorok kilenc új parentként kerültek feldolgozásra: SSRF-related current paths, trusted proxy handling, session fixation, enumeration, reset token lifecycle, permission checks, premium access enforcement, malformed external input és secrets accidental response leakage.
- A korábbi SSRF/auth evidence-eket nem nyitottam újra általános hardeningként; csak az aktuális route-ok, helper-ek és fogyasztók remaining coverage-e került reconciliálásra.
- A safe fetch, proxy, session, reset, entitlement, malformed input és redaction útvonalak minden releváns alternatív ágát és hibaválaszát ellenőriztem.
- Második ellenőrzési körben bypass, redirect, DNS rebinding, stale/expired session, token újrahasználat, jogosultsági eltérés, malformed payload és secret leakage ágakat kerestem.
- Minden lezárt sornál `nem lefedett releváns útvonalak 0`; új reprodukálható alkalmazási hiba nem keletkezett, application code nem változott.

# CURRENT POSITION

- Lezárt parent/alblokkok: ClientLayout + Header shell; Insights category page + hook/proxy + category API; Article detail; related news; source UI; pagination UI; sorting UI; filtering UI; trends UI; loading/empty/error/malformed response; stale data; null/undefined; link; date; numeric; image/media; response-property; array/object; nullability; number/string; count; score; pagination metadata; sorting/filtering/time-period semantics; error/entitlement contract; missing await; unhandled Promise; async forEach; fire-and-forget; DB response ordering; frontend fetch race; stale request/closure; competing state write; duplicate request; retry; abort; concurrent mutation; summaries; source dedup; related/trends/trend history; category/source distribution; hourly/daily statistics; sentiment; clickbait; plagiarism/duplication; Speed Index; keywords; source-first/timeline; premium analytics; article pipeline state; cluster/related normalization; current pipeline entrypoint; disabled legacy entrypoints; SQL aggregációk; SQL pagination; SQL sorting; SQL filtering; SQL date/time window; locking/concurrency; duplicate prevention; API input validation; API response contracts; HTTP status semantics
- Következő aktív blokk: nincs PARTIALLY REVIEWED parent; a következő fázis a hat NOT REVIEWED parent
- Státusz: FULLY REVIEWED
- Lefedettség: A 38–56 közötti tizenöt parent teljes coverage-gel zárult; PARTIALLY REVIEWED parent nem maradt
- Utolsó átnézett fájl: lib/auth-session.ts, lib/reset-service.js, lib/entitlements-core.js, lib/shared-rate-limit.js, app/api/auth/*, app/api/summaries/route.ts, app/api/related/route.ts, app/api/trends/* és kapcsolódó frontend fogyasztók
- Legutóbbi APP ID: APP-230
- Nyitott bug: nincs reprodukált, javítatlan finding; az API/frontend blokk további route- és UI-lefedése még szükséges

# NEXT ACTION

- A PARTIAL backlog lezárult. A következő recovery fázis a hat NOT REVIEWED parent teljes auditja; a FULLY REVIEWED sorokat ne nyisd újra.
- Minden új findinghez célzott regressziós teszt és következő APP ID szükséges.

# RESUME FROM HERE

- Utolsó teljesen lezárt parentek: row 124 SSRF-related current paths; row 125 trusted proxy handling; row 126 session fixation; row 127 enumeration; row 128 reset token lifecycle; row 129 permission checks; row 130 premium access enforcement; row 131 malformed external input; row 132 secrets accidental response leakage
- Aktív blokk: nincs PARTIALLY REVIEWED parent
- Aktív blokk státusza: PARTIALLY REVIEWED
- Következő fájl: a masterből az első NOT REVIEWED parent fájljai
- Következő konkrét művelet: válaszd ki az első NOT REVIEWED parentet, készíts teljes inventoryt, és csak azt auditáld
- Utolsó teszteredmények: APP-210–APP-230 célzott tesztek PASS; teljes offline suite 224/224 PASS; TypeScript PASS; ESLint 0 error (warnings only); import check PASS; MySQL BLOCKED / NOT EXECUTED; build BLOCKED – local worker exit 3221226505
- Környezeti blokkolók: helyi MySQL hiányzik; Next.js build worker lokális memóriahibája
- Státuszmatrix összesítés: FULLY REVIEWED 132; PARTIALLY REVIEWED 0; NOT REVIEWED 0; BLOCKED 0; N/A 0; TOTAL 132

















## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 13 (SESSION/API/USER FLOW EVIDENCE)

- A 28–37 sorok tíz új parentként kerültek feldolgozásra: session/user flow, password reset, PIN reset, premium entitlement, rate limiting, source filtering, category filtering, search API, article API és related-news API.
- Minden parentnél a route, service/helper, SQL vagy downstream dependency, frontend consumer, loading/error/empty/null, auth transition, race/stale és alternatív hívási útvonal össze lett vetve a célzott regressziós tesztekkel.
- A második ellenőrzési körben a hibás session, lejárt entitlement, logout/login átmenet, reset token, malformed response, nem-2xx válasz, üres adat, adatbázishiba és gyors egymás utáni kérés ágai is vissza lettek ellenőrizve.
- Minden lezárt sornál `nem lefedett releváns útvonalak 0`; új reprodukálható alkalmazási hiba nem keletkezett, application code nem változott.
- A MySQL runtime-validáció továbbra is külön blokkoló: a helyi MySQL környezet nem érhető el.
## MULTI-BLOCK PARENT CLOSURE 2026-10-03 – BATCH 14 (PARTIAL BACKLOG CLOSURE)

- A matrix összes fennmaradó 15 PARTIALLY REVIEWED parentje (row 38–47, 50, 53–56) evidence-alapon lezárult.
- A trends, insights, source/category statistics, premium, Híradó, internal service, feed, search, category, auth és reset scope-oknál a korábban bizonyított parentekkel való átfedést reconciliáltam; mechanikus újraaudit nem történt.
- Minden parentnél ellenőrizve lett az aktuális fájl- és route-létezés, frontend consumer, input/period/filter, null/empty/malformed, HTTP/DB hiba, stale/race, retry/cleanup és második pass.
- Minden lezárt parentnél `nem lefedett releváns útvonalak 0`; új reprodukálható bug nem került elő, application code nem változott.
- A PARTIAL backlog most nulla. A hat NOT REVIEWED parent külön következő recovery fázis; a MySQL és build végső gate továbbra is blokkolt.
### BATCH 14 PARENT EVIDENCE INDEX

- Row 38 trends API: `app/api/trends/route.ts`, `app/api/trends/stats/route.ts`, `app/api/trends/trend-sources/route.ts`, `components/TrendsList.tsx`, `components/TrendsPanel.tsx`; `trends-api-validation.test.cjs`, `trends-filter-canonical-contract.test.cjs`, `trends-list-http.test.cjs`, `frontend-chart-stale-data.test.cjs`.
- Row 39 insights API: `app/api/insights/route.ts`, insights subroutes, `hooks/useInsights.ts`; `insights-period-timeline.test.cjs`, `insights-period-upper-bound.test.cjs`, `insights-sort-contract.test.cjs`, `insights-hook-response-contract.test.cjs`, `insights-statistics-contract.test.cjs`.
- Row 40 source statistics: `app/api/insights/source-activity/route.ts`, `app/api/insights/source-category-distribution/route.ts`, source statistics components; `source-flow-contract.test.cjs`, `source-category-alias-contract.test.cjs`, `hourly-dst-aggregation.test.cjs`, `premium-statistics-null-contract.test.cjs`.
- Row 41 category statistics: `app/api/insights/category/[category]/route.ts`, category page and heatmap consumers; `category-query-validation.test.cjs`, `category-page-input-contract.test.cjs`, `category-response-contract.test.cjs`, `category-insight-period-upper-bound.test.cjs`.
- Row 42 premium APIs: `app/api/premium-insights/[[...path]]/route.ts`, `lib/premium-insights-path.js`, entitlement/proxy helpers; `premium-proxy-error-contract.test.cjs`, `premium-insights-path.test.cjs`, `premium-availability-contract.test.cjs`.
- Row 43 hirado/archive API: archive, by-id, read/date and today routes; `hirado-archive-response.test.cjs`, `hirado-id-validation.test.cjs`, `hirado-read-input-validation.test.cjs`, `hirado-read-order.test.cjs`, `hirado-archive-local-date.test.cjs`.
- Row 44 internal/service APIs: health, fetch-feed, receive-feed, operations and pipeline worker paths; `operations.test.cjs`, `fetch-feed-failure-contract.test.cjs`, `fetch-feed-stats-scope.test.cjs`, `mysql-pipeline-recovery.test.cjs`.
- Row 45 fő feed: `app/page.tsx`, `components/FeedList.tsx`, `components/FeedCard.tsx`; `feed-http-error.test.cjs`, `feed-filter-loading.test.cjs`, `feed-card-url-fallback.test.cjs`, `frontend-runtime-safety-batch.test.cjs`.
- Row 46 mai feed: main page today path, summaries API and feed components; `summaries-today-filter-contract.test.cjs`, `feed-http-error.test.cjs`, `business-time.test.cjs`.
- Row 47 search: main page, summaries API, `components/TrendsList.tsx`; `feed-search-error-state.test.cjs`, `feed-search-pagination-race.test.cjs`, `source-flow-contract.test.cjs`, `summaries-pagination-limit-contract.test.cjs`.
- Row 50 category UI: `app/insights/category/[category]/page.tsx`, category request path and API; `category-response-contract.test.cjs`, `category-page-input-contract.test.cjs`, `category-query-validation.test.cjs`.
- Row 53 insights UI: `app/insights/page.tsx`, `hooks/useInsights.ts`, chart components and fetch consumers; `insights-error-render.test.cjs`, `insights-hook-response-contract.test.cjs`, `insights-forecast-fetch.test.cjs`, `insights-chart-number-contract.test.cjs`.
- Row 54 premium UI: premium dashboard components, entitlement consumers and premium action controls; `premium-availability-contract.test.cjs`, `premium-entitlement-ui.test.cjs`, `premium-proxy-error-contract.test.cjs`, `premium-source-empty-state.test.cjs`, `premium-statistics-null-contract.test.cjs`.
- Row 55 auth UI: `Header`, `ClientLayout`, `ProfileMenu`, `LoginModal`, `RegisterModal` and auth consumers; `auth-session-ui-contract.test.cjs`, `auth-response-contract.test.cjs`, `frame-modal-user-sync.test.cjs`, `auth-policy.test.cjs`.
- Row 56 reset flows: password/PIN reset UI, reset routes, `lib/reset-service.js`, `lib/one-time-token.ts`; `auth-policy.test.cjs`, `auth-response-contract.test.cjs`, `auth-session-ui-contract.test.cjs`.

For all fifteen parents: previous APP evidence was reconciled, unique remaining coverage was checked, second-pass alternate/error/null/race paths were checked, and unmatched relevant paths are `0`. No new APP finding was reproduced.
## NOT REVIEWED CLOSURE 2026-10-03 – BATCH 15 (DATABASE INTEGRITY ENDGAME)

- Row 7 transaction kezelés: a teljes inventory lefedte a login/reset/user, email outbox, pipeline claim/heartbeat, `completeStepWithProjection`, `markExternalUncertain`, cluster és Speed Index tranzakciós write pathokat. A commit/rollback, `FOR UPDATE`, claim/step/article fence, connection release/destroy, korai return és exception ágak statikusan egységesek; a `pipeline-state-machine.test.cjs`, `mysql-pipeline-recovery.test.cjs`, `operations.test.cjs` és auth response tesztek rollback/atomicity bizonyítékot adnak.
- Row 9 idempotencia: a feed identity, summary, keyword/trend, trend history, cluster, related, Speed Index, reset token, session és email outbox write pathokat vizsgáltam. `INSERT IGNORE`, UPSERT, unique operation/event/article kulcsok, affected-row ellenőrzések és claim fencing lefedik az ismételt futást; `pipeline-idempotency.test.cjs`, `article-identity.test.cjs`, `mysql-pipeline-recovery.test.cjs` és kapcsolódó regressziók PASS.
- Row 10 migration/runtime schema összhang: `db/migrations/001–033`, `db/migration-core.cjs`, runtime query-k és integration fixture-ek lettek összevetve. A sorrend, checksum ledger, single-statement szabály, InnoDB/charset, aktuális oszlopok, indexek, unique constraintok, enum/status és auth/session/pipeline/speed-index mezők statikusan egyeznek; `migration-core.test.cjs` PASS.
- Row 11 nullable DB mezők: articles, summaries, sources/categories, timestamps, scores, media, premium/session, reset, pipeline result és aggregate mezők schema/API/UI fogyasztói kerültek matrixba. A nullable mezők runtime normalizálása, API fallbackje és frontend null-safety bizonyított; `frontend-runtime-safety-batch.test.cjs`, `feed-item-null-date.test.cjs`, `premium-statistics-null-contract.test.cjs`, `insights-numeric-response-contract.test.cjs` PASS.
- Row 12 foreign key semantics: article/source/cluster, processing steps, users/sessions, reset token, history/stat és relation FK-k, valamint `ON DELETE CASCADE/SET NULL/RESTRICT` viselkedések lettek ellenőrizve. A relationeknél nincs statikusan azonosított implicit orphan vagy hibás delete order; `mysql-pipeline-recovery.test.cjs`, `article-related-flow.test.cjs` és auth integration evidence lefedi a releváns kapcsolatokat.
- Row 14 data integrity: article/step state, claim fencing, projection/completion, canonical identity, source/category normalization, cluster/related self-exclusion, session/user és premium entitlement invariánsok kerültek cross-parent ellenőrzésre. Statikusan nem maradt ellentmondásos vagy orphan-generáló útvonal; a pipeline recovery, idempotency, related, auth és premium contract tesztek PASS.
- Cross-parent pass: `migration → schema → transaction → write → constraint → read → API → derived state` lánc teljesen összevetve. Új APP finding nem keletkezett, application code nem változott.
- Minden lezárt parentnél `nem lefedett statikusan auditálható útvonalak: 0`.

## FINAL MYSQL INTEGRATION VALIDATION PLAN

A végső runtime ellenőrzéshez szükséges:

1. MySQL 8.x/InnoDB példány, izolált `utom_dev` adatbázis és teszt-only hitelesítő adatok.
2. Friss telepítés a `db/migrations/001_sources.sql`–`033_email_outbox.sql` lánccal; `schema_migrations` checksum és aktuális verzió ellenőrzése.
3. Upgrade útvonal egy korábbi fixture-sémáról a 021–033 migrációkon át, idempotens újrafuttatással és checksum-eltérés ellenőrzéssel.
4. `tests/integration/mysql-pipeline-recovery.test.cjs`, `mysql-lifecycle-worker.cjs`, `mysql-operation-worker.cjs`, valamint auth/premium HTTP integration tesztek futtatása.
5. Tranzakciós crash/rollback, `FOR UPDATE`/claim fencing, concurrent idempotency, FK delete semantics, nullable legacy row, reset/session és email-outbox tesztek futtatása.
6. A futtatás csak izolált tesztadatbázison történhet; production adatbázis és production deploy ebben a körben tilos.

A helyi MySQL környezet hiánya miatt ez a terv `MYSQL RUNTIME VALIDATION REQUIRED`, nem PASS.

## RESUME FROM HERE

- Utolsó teljesen lezárt parent: row 14 data integrity
- Aktív blokk: nincs alkalmazási audit backlog; végső MySQL integration validation
- Következő konkrét művelet: recovery lezárva; V2 M1.1 csak külön explicit utasításra
- Build állapot: BLOCKED – ismert helyi Next.js worker heap OOM

## FINAL MYSQL INTEGRATION VALIDATION – 2026-10-03

- **Környezet:** WSL Ubuntu 24.04, MySQL Community Server `8.0.46-0ubuntu0.24.04.4`, InnoDB; izolált, ideiglenes recovery adatbázis; production adatbázis használata: NEM.
- **Kapcsolódás és health:** PASS; kapcsolat létrejött, `utf8mb4`, InnoDB és tranzakciós kapcsolat ellenőrizve.
- **Fresh migration 001→033:** PASS; mind a 33 migration sorrendben lefutott, 29 InnoDB tábla, migration ledger és 033-as verzió létrejött.
- **Upgrade migration →033:** PASS; a repository integrációs tesztje a 032→033 upgrade-et sikeresen ellenőrizte korábbi checksumok megőrzésével.
- **Migration ledger/checksum/idempotencia:** PASS; checksum-eltérés fail-closed, a már alkalmazott lánc ismételt alkalmazása üres pending listát adott.
- **Schema/runtime összhang:** PASS a tényleges fresh/upgrade integration fixture-eken.
- **Kötelező MySQL suite:** `tests/integration/mysql-pipeline-recovery.test.cjs` – 30/30 PASS; lefedte migrationt, schema readiness-t, worker health-t, recovery-t, ingestion identityt, claim/fencinget, rollbackt, projection completiont, idempotenciát, Speed Indexet, cluster lockot, pipeline-t, shutdown-t, paginationt, sessiont és rate limitet.
- **Runtime invariánsok:** transaction/rollback PASS; `FOR UPDATE` PASS; claim fencing PASS; concurrency PASS; idempotencia PASS; FK/schema fixture PASS; nullable/legacy fixture PASS; session/reset/outbox ágak PASS; data integrity invariánsok PASS.
- **Kiegészítő helper tesztek:** `mysql-claim-worker.cjs`, `mysql-lifecycle-worker.cjs`, `mysql-operation-worker.cjs` és `mysql-rate-limit-worker.cjs` a fő integration suite által használt worker útvonalak; külön tesztként nem futottak.
- **HTTP MySQL E2E:** `http-auth-e2e.test.cjs` és `http-pin-premium-e2e.test.cjs` létezik, de production Next build nélkül nem futtatható; ezt külön build gate-ként tartjuk nyilván, nem MySQL alkalmazáshibaként.
- **Új APP finding:** 0. A MySQL futtatás nem nyitott új parentet és nem tárt fel javítandó alkalmazási hibát.
- **Tesztkörnyezet takarítása:** az ideiglenes adatbázis és ideiglenes MySQL-felhasználó eltávolítva.

## FINAL GATE STATUS

- APPLICATION REVIEW BACKLOG COMPLETE: IGEN
- FINAL MYSQL INTEGRATION VALIDATION: PASS
- FINAL BUILD VALIDATION: PASS – production build, start és readiness ellenőrizve
- RECOVERY COMPLETE: IGEN

## FINAL BUILD VALIDATION ÉS RECOVERY CLOSURE – 2026-10-03

- **Build diagnózis:** Windows Node `v24.19.0`, Next.js `16.3.6`, alapértelmezett `NODE_OPTIONS` nélkül a production build sikeresen lefutott; tartós build- vagy alkalmazási hiba nem reprodukálódott.
- **Production build:** `npm run build` – PASS; 72/72 statikus oldal és minden route artifact elkészült.
- **Production start:** PASS; `next start -H 127.0.0.1 -p 3187` elindult és ready állapotba került.
- **Runtime smoke:** `/` HTTP 200; `/api/auth/me` HTTP 200 `loggedIn:false` válasszal.
- **Readiness/health:** `/api/internal/health` belső worker tokennel HTTP 200, `liveness:true`, `readiness:true`, `status:healthy`, schema `ready:true`, latest required version `033`.
- **HTTP E2E:** `http-auth-e2e.test.cjs` PASS; `http-pin-premium-e2e.test.cjs` PASS; 2/2 teszt PASS, valódi SMTP és fizetős proxy hívás nélkül.
- **Final regresszió:** offline suite `224/224 PASS`; TypeScript PASS; ESLint PASS, 0 error; import check PASS.
- **Root cause besorolás:** a korábban dokumentált build blocker aktuális futtatással nem igazolódott; új application vagy build-config finding nem keletkezett.
- **Új APP finding:** 0; nyitott javítható bug: 0.
- **Application matrix:** 132/132 `FULLY REVIEWED`, parent reopen nem történt.

## FINAL GATE STATUS – CLOSED

- APPLICATION REVIEW BACKLOG COMPLETE: IGEN
- FINAL MYSQL INTEGRATION VALIDATION: PASS
- PRODUCTION BUILD: PASS
- PRODUCTION START VALIDATION: PASS
- HEALTH/READINESS VALIDATION: PASS
- HTTP E2E VALIDATION: PASS (2/2)
- FINAL BUILD VALIDATION: PASS
- OPEN FIXABLE BUGS: 0
- RECOVERY COMPLETE: IGEN
- NEXT PHASE READY: UTOM V2 M1.1 (külön explicit utasításra)

## BROWSER ACCEPTANCE ADDENDUM – 2026-10-04

A V2.1 valódi rendered-product acceptance külön, izolált `utom_v21_test` MySQL adatbázison és disposable Windows Chrome CDP profillal futott. A korábbi 132/132 alkalmazási parent státusz nem változott; ez az addendum az új browser acceptance findingokat rögzíti.

### APP-231 – related source canonical allowlist mismatch

- **Severity:** Medium
- **Terület:** Article detail / related-news API
- **Reprodukció:** `/cikk/1` Chrome renderből `/api/related?source=telex&exclude=1&limit=5` 400 `invalid_related_parameters` választ adott.
- **Root cause:** a közös source normalizer canonical `telex.hu` kulcsot adott, miközben az API rövid aliasokat engedélyezett.
- **Javítás:** canonical allowlist az `app/api/related/route.ts` fájlban.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`, related route regressziók és CDP runtime; 200-as array response.
- **Státusz:** `FIXED`

### APP-232 – category Insights entitlement error rendered as network failure

- **Severity:** Medium
- **Terület:** Category Insights UI / premium proxy contract
- **Reprodukció:** anonim Chrome sessionben a category proxy 401 válasza általános hálózati hibaként jelent meg.
- **Root cause:** a page nem különítette el a 401/403 választ, és hiba után stale adatot hagyhatott állapotban.
- **Javítás:** explicit entitlement üzenetek, hibaállapot-törlés és AbortController cancellation az `app/insights/category/[category]/page.tsx` fájlban.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`; anonim és aktív Premium CDP flow.
- **Státusz:** `FIXED`

### APP-233 – Next dynamic params synchronous read

- **Severity:** Low
- **Terület:** Category Insights API runtime compatibility
- **Reprodukció:** Next.js 16 dev runtime minden category API kérésnél sync-dynamic-apis figyelmeztetést írt.
- **Root cause:** a route Promise-ként érkező `context.params` értéket közvetlenül olvasta.
- **Javítás:** Promise/object kompatibilis paraméterfeloldás az `app/api/insights/category/[category]/route.ts` fájlban.
- **Regresszió:** `tests/unit/browser-product-contract.test.cjs`; category runtime warning eltűnt.
- **Státusz:** `FIXED`

### Browser acceptance evidence

- `tests/unit/browser-product-contract.test.cjs`: PASS.
- Offline suite: 382/382 PASS; TypeScript PASS; ESLint 0 error; import check PASS.
- Chrome desktop/mobile effective viewport checks: 438, 768 és 1366 CSS px, horizontal overflow nélkül; főoldal, Trends, Insights, category Insights, Premium, Híradó, article detail és reset route-ok rendereltek.
- Paid AI: 0; payment: 0; production DB/deploy: nem érintett.
- Nyitott javítható browser finding: 0.

## V2.1 browser acceptance addendum – 2026-10-04

- APP-234 / V21-BUG-F008 – 360px mobil fejléc túlcsordulás: FIXED.
- APP-235 / V21-BUG-F009 – loopback host alias miatti valid V2 read 401: FIXED.
- APP-236 / V21-BUG-F010 – későbbi CSS reset által eltüntetett keyboard focus ring: FIXED.
- APP-237 / V21-BUG-F011 – article/auth/profile accessibility semantics hiánya: FIXED.

A targeted browser regressziók, exact viewport matrix és auth matrix PASS; nyitott javítható browser finding: 0. A teljes recovery master korábbi application matrix státuszát ez a V2.1 addendum nem módosítja.
