# Utom.hu – hírfeldolgozó pipeline helyreállítása

Állapot: kódszinten elkészült, a 022–025 migrációk telepítése és a valódi MySQL/OpenAI/RSS próba még szükséges.

## Egyetlen aktív feldolgozó

Az egyetlen kanonikus cikkfeldolgozó a `pipeline/cron.js`. A worker csak közvetlen futtatáskor indul, és indulás előtt ellenőrzi a `backgroundJobs` képességet. A ciklus előbb a hitelesített `/api/fetch-feed` végponttal beolvassa az RSS-elemeket, majd legfeljebb három cikket foglal le és dolgoz fel párhuzamosan. Üres sor esetén 60 másodpercet vár.

Indítás a projekt gyökeréből, a deployment környezet kifejezett online és háttérmunka engedélyeivel:

```text
node pipeline/cron.js
```

A `lib/cron.ts` és `lib/cron.js` legacy scheduler le van tiltva. Az `/api/summarize` és `/api/summarize-all` nem dolgoz fel cikket; belső hitelesítés után is `409 canonical_pipeline_only` választ ad. A feed-végpontok kizárólag beolvasnak és `pending` állapotú rekordot hoznak létre, AI-hívást nem végeznek.

## Feldolgozási állapotgép

A cikk atomikus claimet kap `worker_id`, egyedi `claim_token`, `claimed_at` és `heartbeat_at` mezőkkel. Az alapértelmezett lease 15 perc (`ARTICLE_CLAIM_STALE_MS=900000`), a cikkenkénti teljes próbálkozási korlát 3 (`ARTICLE_MAX_ATTEMPTS=3`). Egy aktív claimet másik worker nem vehet át. Leállt worker claimje a lease lejárta után újra átvehető.

A kötelező lépések sorrendje:

1. `scrape`
2. `short_summary`
3. `long_summary`
4. `plagiarism`
5. `category`
6. `title`
7. `keywords`
8. `trends`
9. `source`
10. `summary_persistence`
11. `clickbait`
12. `embedding`
13. `cluster`
14. `speed_index`

A `sentiment` opcionális. Hibája `skipped` állapotként marad meg és nem akadályozza a cikk lezárását. A cikk csak akkor kaphat `done` állapotot, ha minden kötelező lépés `done`. A hibás lépés neve és rövid hibája a cikkrekordban, részletes lépésállapota az `article_processing_steps` táblában marad.

A már `done` vagy `skipped` lépés eredményét az újraindított worker újrahasználja. Ez megakadályozza a korábban sikeresen elmentett, fizetős AI-lépések ismétlését. Fizetős AI-lépéshez nincs automatikus hálózati újrapróbálás; az `AI_STEP_MAX_ATTEMPTS` csak bizonyítottan idempotens, nem külső lépésekre vonatkozik.

### Claim fencing

Minden heartbeat, step claim, step completion, step failure és article végállapot-módosítás ellenőrzi az aktuális `article_id + worker_id + claim_token` tulajdonjogot. A step-tábla saját tokenje önmagában nem elég: az article aktuális claimjének is egyeznie kell. Nulla módosított sor `claim_lost` hiba. Így a lease után magához térő régi worker nem írhat heartbeatet, step eredményt, hibát vagy `done` állapotot.

A scraper tartalomírása szintén fenced. Többé nem állítja vissza a cikket `pending` vagy `failed` állapotba a state machine megkerülésével.

### Bizonytalan külső művelet

Minden fizetős AI-lépés determinisztikus SHA-256 `operation_key` értéket kap az article ID, step, input hash, modell és pipeline-konfiguráció alapján. Közvetlenül a külső hívás előtt a step `uncertain` állapotba kerül. Sikeres válasz és tartós mentés után ugyanaz az atomikus step UPDATE menti a `result_json` értéket és állítja `done` állapotba.

Ha a folyamat a szolgáltatói elfogadás és a tartós lezárás között meghal, a step `uncertain` marad. A stale article `needs_recovery` állapotba kerül, és a normál worker nem claimeli újra. Automatikus fizetős újrahívás tilos; operátori ellenőrzésnek kell eldöntenie, hogy a domain eredmény már megtalálható-e, lezárható-e a lépés, vagy kontrollált újrafuttatás szükséges. Ez nem valódi exactly-once szolgáltatói garancia, hanem a bizonytalan kimenetel biztonságos karanténja.

A step `result_json` és a step végállapota egyetlen adatbázis UPDATE része. A külön domain projekciók egy része legacy modulban maradt; külső AI esetén a hívás előtti `uncertain` checkpoint akadályozza meg, hogy mentési hiba után a rendszer késznek állítsa vagy vakon megismételje a műveletet.

## Idempotencia

- Az RSS URL-ek kanonikus alakot kapnak: egységes HTTPS/host/path, tracking paraméterek nélkül. Az adatbázis egyedi `url_canonical` kulcsa és az `INSERT IGNORE` védi a párhuzamos feed-beolvasást.
- A kulcsszavak cikkenként tranzakcióban újraépülnek. A trendek `(article_id, keyword, period)` egyedi kulccsal upsertelődnek.
- Érvényes, már eltárolt embeddinget a worker újrahasznál, ezért nem kér új OpenAI embeddinget.
- Már kiosztott `cluster_id` újrahasználható.
- A sebességindex-előzmény determinisztikus `event_key` értéket kap, így ugyanaz az esemény nem kerül be kétszer.
- Provider oldali szigorú exactly-once AI-hívás adatbázis-tranzakcióval nem garantálható: ha a folyamat a szolgáltatói elfogadás után, de a válasz mentése előtt áll le, az eredmény nem bizonyíthatóan visszanyerhető. A rendszer a sikeresen eltárolt lépések ismétlését akadályozza meg.

## Migrációk és bevezetés

Telepítés előtt terv módban ellenőrizendő, majd a projekt szabályai szerint alkalmazandó:

- `022_article_processing_claim.sql`: article claim, heartbeat, attempt és hibamezők.
- `023_article_processing_steps.sql`: tartós, cikkenkénti lépésállapotok.
- `024_trends_article_idempotency.sql`: trend–cikk kapcsolat és egyedi kulcs.
- `025_speed_history_idempotency.sql`: determinisztikus history event kulcs.
- `026_external_operation_recovery.sql`: operation identity, külső művelet-jelző, indítási idő, hibatípus és retryability.

A mostani fejlesztési körben helyi MySQL/Docker szolgáltatás nem volt elérhető, ezért a migrációk adatbázison nem futottak. Elkészült az explicit `UTOM_MYSQL_TEST_OPT_IN=true`, loopback host és `_test` végű adatbázisnév által védett reprodukálható teszt. Ez előbb 001–021-et telepít, reprezentatív adatot hoz létre, majd 022–026-ot futtat, ismételt migrációt ellenőriz és két külön Node processzel versenyezteti a claimet.

## Időkezelés

A claim, heartbeat és stale összehasonlítás teljes egészében ugyanazon MySQL szerveren, `UTC_TIMESTAMP(6)` alapján történik; a 15 perces lease ezért nem függ a Node vagy az operációs rendszer időzónájától. Az új feed timestamp, a cluster napi ablak és a Speed Index napi ablak UTC-alapú. A felhasználói felület magyar helyi időzónás megjelenítése változatlan. Régi rekordok és további legacy `NOW()` használatok miatt teljes történeti időzóna-migráció továbbra is külön feladat.

## Nyitott üzemeltetési tételek

- Valódi MySQL 8 integrációs próba két egyidejű workerrel, megszakítás és lease utáni helyreállás ellenőrzésével.
- Szolgáltatói sandbox vagy kis költségű OpenAI/RSS próba a migrált adatbázison.
- A cluster hozzárendelést MySQL advisory lock sorosítja; lock alatt újraolvassa a cikket és a mai jelölteket. Ez megőrzi a jelenlegi cosine/threshold algoritmust, miközben megszünteti a két worker közti create race-et.
- A globális speed index jelenleg cikkenként újraszámolódik. Külön batch-lépés hatékonyabb lenne.
- A legacy dátumkezelés egységesítése és a feed eredeti publikációs idejének megőrzése.
- A kapcsolódó hírek a meglévő cluster-egyezést részesítik előnyben, majd normalizált forrással egészítik ki a listát. Saját summary és article kizárt, a lista determinisztikus, és a jelenlegi cikkhez képest ±7 napos ablakot használ. Új recommendation engine nem készült.
