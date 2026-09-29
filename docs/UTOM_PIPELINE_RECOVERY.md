# Utom.hu – hírfeldolgozó pipeline helyreállítása

Állapot: **PIPELINE RECOVERY ACCEPTANCE: VERIFIED**. A recovery mechanizmus, a 022–026 migrációk, valamint az atomikus domain projection + fenced step completion valódi MySQL 8.0.46 alatt validálva. A külső szolgáltatások determinisztikus mockkal futottak; production OpenAI/RSS/deployment próba nem történt.

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
14. `speed_index` — a globális számítás tartós MySQL batch-be ütemezése; az article tranzakcióban nem fut teljes recalculation

A Speed Index batch claim, generation fencing és crash recovery részletes leírása: `docs/UTOM_SPEED_INDEX.md`.

Rollout előtt a worker ellenőrzi a 022–033 kritikus táblákat, oszlopokat, indexeket és migration ledger verziókat. Hiányos sémával nem kezd claimelni. A 033-as email outbox `uncertain` sorai provider-egyeztetést igényelnek, automatikus retry nem megengedett. A read-only recovery inspect és az auditált lokális retry használata a `docs/UTOM_DEPLOYMENT_CHECKLIST.md` fájlban található.

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

A validáció WSL2 Ubuntu 24.04 alatt futó MySQL `8.0.46-0ubuntu0.24.04.4` szerveren történt, InnoDB, `REPEATABLE-READ`, strict SQL mode és CEST rendszer-időzóna mellett. Az explicit `UTOM_MYSQL_TEST_OPT_IN=true`, loopback host és `_test` végű adatbázisnév által védett harness előbb 001–021-et telepített, reprezentatív adatot hozott létre, majd a teljes listával alkalmazta a 022–026 migrációkat és igazolta az ismételt futás változatlanságát.

Valódi MySQL-lel bizonyított: migráció és meglévő adatok megőrzése; tízszeres kétprocesszes claim race; aktív lease, stale reclaim és zombie fencing tízszer; UTC lease-döntés eltérő Node időzónákkal; external uncertain karantén; lokális hiba újrafuttatása; final-completion recovery; atomikus domain projection rollback; feed/trend/Speed History idempotencia; cluster advisory lock és connection release tízszer; teljes kanonikus pipeline-fixture. A 2026-09-28-i végső integrációs futás 13/13 tesztet teljesített, 0 fail és 0 skip eredménnyel; a teljes fixture 2,484 másodperc volt.

Mockkal bizonyított: short/long summary, kategória, sentiment, cím, kulcsszó, clickbait és embedding külső adapterei, valamint a teljes production-path pipeline hálózati és fizetős hívás nélkül. A short-summary és embedding crash-window próbában a logical provider call count egyaránt 1 maradt, a lépés `uncertain`, a cikk `needs_recovery` lett, és automatikus második hívás nem történt.

Még nem bizonyított: valódi provider/RSS/SMTP/video/deployment működés. Ezek nem részei a helyi pipeline recovery acceptance-nek.

## Atomikus domain projection és fencing

A kanonikus worker a `completeStepWithProjection` művelettel zárja a domain adatot író lépéseket. A művelet egy pooltól kapott connectionön tranzakciót indít, `FOR UPDATE` zárral ellenőrzi az aktuális article `worker_id + claim_token` tulajdonjogát és a step saját tokenjét, ugyanazon connectionön futtatja a domain projectiont, majd ugyanabban a tranzakcióban írja a step eredményét és `done` állapotát. Hiba vagy claim-loss esetén rollback történik.

Connection-injektálható lett a short/long summary, plagiarism, category, sentiment, source, summary persistence, clickbait, embedding, cluster, Speed Index és scraper modul. A standalone hívási mód megtartotta a saját connection fallbacket. A kanonikus workerben a domain write mindig az állapotgép által átadott tranzakciós connectiont használja; a számításhoz szükséges read vagy külső AI-hívás a tranzakció előtt történik.

A keywords/trends projection, az article summary mezők, a sentiment/category/embedding article-mezők, a summary/clickbait/source/plagiarism rekordok, a cluster-hozzárendelés és a Speed Index írásai közös tranzakcióban záródnak a megfelelő steppel. A cluster advisory lock ugyanazon connectionön marad a tranzakció commitjáig, majd felszabadul.

A valódi MySQL adversarial teszt igazolta, hogy domain write utáni kivétel és step-completion előtti hiba esetén a domain adat eltűnik; Worker B stale takeover után Worker A projection callbackje el sem indul; Worker A nem írhat keywordot vagy step completiont; a későn visszatérő AI-eredmény nem menthető, a provider call count 1, a state pedig `uncertain`/`needs_recovery`. A connection-ID ellenpróba igazolta, hogy a projection és a completion ugyanazon MySQL sessionön futott.

## Időkezelés

A claim, heartbeat és stale összehasonlítás teljes egészében ugyanazon MySQL szerveren, `UTC_TIMESTAMP(6)` alapján történik; a 15 perces lease ezért nem függ a Node vagy az operációs rendszer időzónájától. Az új feed timestamp, a cluster napi ablak és a Speed Index napi ablak UTC-alapú. A felhasználói felület magyar helyi időzónás megjelenítése változatlan. Régi rekordok és további legacy `NOW()` használatok miatt teljes történeti időzóna-migráció továbbra is külön feladat.

## A korábbi 30 másodperces fixture-hiba

A megakadás reprodukált oka kettős volt. A WSL-ből létrehozott első tesztfelhasználó jelszava egy shell-változó átadási hiba miatt üres lett. A pipeline a Speed Index lépésig eljutott, ahol az ottani szigorú konfigurációellenőrzés `DB_PASSWORD` hibát dobott. A kivétel után a `pipeline/cron.js` importjakor létrejött modul-szintű MySQL pool nem záródott le, ezért a gyermek Node folyamat életben maradt és a külső 30 másodperces várakozás lejárt. A tesztjelszó rotálva lett; a worker `finally` ágban lezárja a saját poolját és a `shutdownPipelineResources()` segítségével a cron poolját is. A végső fixture ezután természetes process-kilépéssel 2,551 másodperc alatt végzett.

## Nyitott üzemeltetési tételek

- Szolgáltatói sandbox vagy kis költségű OpenAI/RSS próba a migrált adatbázison.
- A cluster hozzárendelést MySQL advisory lock sorosítja; lock alatt újraolvassa a cikket és a mai jelölteket. Ez megőrzi a jelenlegi cosine/threshold algoritmust, miközben megszünteti a két worker közti create race-et.
- A globális speed index jelenleg cikkenként újraszámolódik. Külön batch-lépés hatékonyabb lenne.
- A legacy dátumkezelés egységesítése és a feed eredeti publikációs idejének megőrzése.
- A kapcsolódó hírek a meglévő cluster-egyezést részesítik előnyben, majd normalizált forrással egészítik ki a listát. Saját summary és article kizárt, a lista determinisztikus, és a jelenlegi cikkhez képest ±7 napos ablakot használ. Új recommendation engine nem készült.
