# Utom.hu – helyreállítási progress napló

## HIST-027 + HIST-034 célzott lezárás – 2026-09-30

HIST-027 lezárult: a `lib/generateThumbnail.ts` valódi `execFile` production helper CJS core-t kapott, amely input/output realpath allowlistet, argument-array indítást, explicit timeoutot, nem nulla exit kezelést, output file/format validációt, részleges output cleanupot és path-előkészítés előtti concurrency guardot használ. Ideiglenes lokális statikus ffmpeg binárissal a két másodperces MP4→JPEG fixture PASS; missing/empty/traversal, non-zero, timeout, concurrency és child cleanup PASS. A disabled maintenance HTTP route nem lett újraaktiválva.

HIST-034 lezárult: létrejött a `Europe/Budapest` IANA-alapú business-time helper. A daily/weekly/monthly business aggregátumok helyi határai UTC tartományokká alakulnak; rolling operational analytics, lease, recovery, session/reset expiry és rate window abszolút UTC. A repository audit javította a host-local nap/hour számítást, a DST matrix 23/25 órás napokkal, ambiguous/nonexistent civil idővel és `TZ=UTC`/`TZ=Europe/Budapest` egyezéssel PASS. Új migration nem készült; schema 033 maradt.

Offline regresszió 71/71 PASS, MySQL suite 30/30 PASS, ffmpeg runtime 1/1 PASS, `npm run check` PASS, production preflight 033 PASS, npm audit 0 vulnerability. A registry 33 FIXED, 0 PARTIALLY FIXED, 1 OPEN (HIST-033 jogi), 3 ACCEPTED tételt tartalmaz. `TECHNICAL HISTORICAL BUG CLOSURE: VERIFIED`; production change-window és deployment továbbra sem végrehajtott.

## HIST-025 + HIST-026 célzott lezárás – 2026-09-29

HIST-025 lezárult: a 009-es rekonstruált users sémában tárolt négyjegyű plaintext legacy PIN valódi production HTTP login során, user-sorszintű zárral és tranzakcióban bcrypt cost 12 állapotba frissült. Kétprocesszes concurrent login, valid/invalid/null/üres/korrupt fixture, modern hash, restart, session/logout, PIN-reset és régi/új PIN login PASS. Kikényszerített DB CHECK hiba esetén az upgrade rollbackelt, a régi használható állapot megmaradt, majd a retry sikerült.

HIST-026 lezárult: Puppeteer/browser subprocess már nincs a production pathban; a tényleges böngészős termékút a DB-sessionnel védett, szerveroldali premium entitlementet használó `/api/premium-insights` HTTP proxy. Lokális upstreammel success, 400, 500, timeout, disconnect, malformed HTTP, oversized response, redirect, allowlist/encoded path, missing/invalid/basic/expired session és négy concurrent request PASS. A proxy közös MySQL limitert, explicit abort timeoutot és 2 MiB felső response limitet kapott; credential leak és fizetős proxyhívás 0.

Új high findingként a login feltétel nélkül elfogadta az `X-Forwarded-For` headert. HIST-037 alatt javítva: a közös trust policy alapállapotban figyelmen kívül hagyja, runtime spoof fixture PASS. Új migráció nem készült; latest schema 033. MySQL 30/30, korábbi session/reset E2E 1/1 és az új PIN/premium E2E 1/1 PASS. A registry 31 FIXED, 2 PARTIALLY FIXED, 1 OPEN és 3 INTENTIONAL / ACCEPTED tételt tartalmaz.

## HIST-023 + HIST-024 célzott lezárás – 2026-09-29

HIST-023 lezárult: a production buildből indított Next.js runtime valódi HTTP login/cookie/auth/logout/expiry tesztje, két párhuzamos session-read, szabályos Process A→B restart és SIGKILL utáni Process C restart is PASS. A session cookie szerveroldali, 256 bites véletlen tokent kap; a DB-ben csak hash szerepel, a cookie attribútumai `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` és 86400 másodperces Max-Age. Fixation és token/log leakage nem reprodukálódott.

HIST-024 lezárult: a 033 migráció AES-256-GCM titkosított transactional email outboxot ad. A password/PIN reset token és outbox scheduling egy tranzakció, a párhuzamos kérések egy aktív tokenre és egy üzenetre coalescelődnek, ugyanazon token kétprocesszes fogyasztása pontosan egy sikerrel zárult. Az update+consume rollback fault, expiry boundary, malformed/unknown/reuse, session invalidation, account-privacy, közös MySQL rate limiter és teljes reset→login flow PASS. A mock provider utáni crash `uncertain` állapotot hagyott és nem történt vak újraküldés; valódi SMTP hívás 0.

Latest schema: 033. Fresh 001→033 és existing 032→033 PASS; MySQL suite 30/30, célzott production HTTP E2E 1/1 PASS. A registry 28 FIXED, 4 PARTIALLY FIXED, 1 OPEN és 3 INTENTIONAL / ACCEPTED tételt tartalmaz. Új critical/high hiba nem maradt nyitva ebben a körben.

## HIST-021 + HIST-022 célzott lezárás – 2026-09-29

HIST-021 lezárult: az analyze, scraper és feed letöltő most az ellenőrzött DNS-címre köti a tényleges socketet, miközben megtartja az eredeti Host/SNI és TLS-hitelesítési viselkedést; minden átirányítás új ellenőrzést kap. A privát IPv4/IPv6, IPv4-mapped IPv6, vegyes DNS, public→private és public→public redirect, timeout és tényleges pinned kapcsolat tesztje PASS. A megkerülhető Puppeteer fallback és dependency kikerült. HIST-022 lezárult: a 032 migráció közös MySQL rate-limit táblát hoz létre, az atomi upsert pedig több processz között is egyetlen limitet érvényesít. Három ismételt körben 30 párhuzamos kérésből pontosan 10 volt elfogadott, a restart/expiry/identity/cleanup/index és DB-kiesés fail-closed ellenőrzése PASS. Offline 68/68 és MySQL 30/30 célzott futás PASS. A registry 26 FIXED, 6 PARTIALLY FIXED, 1 OPEN és 3 INTENTIONAL / ACCEPTED tételt tartalmaz.

## Remaining partial closure – 2026-09-28

Kilenc PARTIALLY FIXED tételből HIST-028 lezárult: a summary rendezés stabil `created_at,id` tie-breakert és minden listázó ágon lapozást kapott; a 25 azonos timestampes, háromoldalas MySQL fixture nem talált átfedést vagy eltűnő sort. A session runtime vizsgálat új critical hibát talált: a `user_sessions` nem volt része a migrációs láncnak. A 031 migráció és a MySQL commit/rollback/expiry/reconnect/lock teszt ezt lezárta, de a teljes HTTP/process E2E miatt HIST-023 részleges marad. A feed most kizárólag `sources.is_active=1` forrásokat kér le, és hibaágon is zárja a kapcsolatot. Offline 62/62, MySQL 28/28 célzott futás PASS. Nyolc partial maradt; ezért a technical historical closure még nem VERIFIED.

## Historical bug closure audit – 2026-09-28

A 13 történeti audit/recovery dokumentum és a jelenlegi kód összevetéséből 35 tételes master registry készült. Ebben a körben megszűnt a feed hardcoded, hibát továbbdobó file logger útvonala. A Puppeteer 25.12.0 és Nodemailer 10.0.12 kontrollált frissítése után a production dependency audit 0 sérülékenységet mutat; offline API-regresszió és build fut. A registry 22 FIXED, 9 PARTIALLY FIXED, 1 OPEN és 3 INTENTIONAL / ACCEPTED tételt tartalmaz, ezért a historical closure még nem VERIFIED. Production deployment nem történt.

## Production hardening – 2026-09-28

Elkészült a seedelhető SMALL/MEDIUM/LARGE 021 fixture, a per-migration scale audit és a read-only production preflight. A LARGE mérés 10 000 article-lel, valódi MySQL 8 backup/restore-ral, 022–030 migrációval, query plan/health latency és duplikáció/orphan invariánsokkal PASS. A schema gate jövőbeni verziót blokkol; a production config AI, health és engedélyezett email/payment/video secret nélkül fail-fast. Nyitott blocker az öt high dependency advisory kontrollált major upgrade-je, a production cardinalitású rehearsal és a külön soak/resource trend. Production deployment nem történt.

Utolsó frissítés: 2026-09-24  
Aktuális fázis: **A1 fejlesztési szakasz elkészült; az A mérföldkő nincs lezárva**  
Aktuális helyi branch: `develop/utom-recovery`  
Aktuális commit: `7df3f0792715f513f1293277b97095dcbbf89ce4` (új commit nem készült)

## A1-ben elkészült

- Node 24 rögzítése `.nvmrc` és `package.json#engines` segítségével.
- Egységes `typecheck`, `lint`, `check:imports`, `test:offline`, `build` és összefogó `check` npm scriptek.
- Biztonságos `.env.example`; offline mód, mock AI és minden költséges vagy írható képesség tiltott alapértéke.
- Központi, fail-closed futásidejű konfiguráció és capability guard.
- Determinisztikus mock AI rövid/hosszú összefoglalóhoz, kategóriához, kulcsszavakhoz, clickbait-válaszhoz és hibás válaszhoz. A mock tartalom tesztadatként jelölt.
- A pipeline OpenAI kliensének lusta, konfigurációvezérelt adapterre cserélése. Offline módban OpenAI-kliens sem jön létre.
- Feed/elemző/összefoglaló route-ok offline blokkolása; SMTP küldés explicit engedélyhez kötése.
- Az importkor automatikusan induló cron/worker belépési pontok explicit indítás mögé helyezése.
- Nyolc hibás legacy importútvonal javítása és automatikus helyiimport-ellenőrző hozzáadása.
- Next 16 build akadályainak javítása: a no-op webpack blokk eltávolítása, impresszum CSS útvonal javítása, a DB-t olvasó híradó oldal dinamikussá tétele.

## Ténylegesen módosított vagy létrehozott fájlok

- Alapkonfiguráció: `.nvmrc`, `.env.example`, `.gitignore`, `package.json`, `eslint.config.mjs`, `next.config.ts`.
- Offline konfiguráció és AI: `lib/config/runtime.js`, `lib/config/runtime.d.ts`, `lib/config/routeGuard.ts`, `lib/ai/mockAi.js`, `lib/ai/client.js`, `pipeline/aiClient.js`.
- Külső műveletek védelme: `lib/mailer.ts`, `app/api/analyze/route.ts`, `app/api/fetch-feed/route.ts`, `app/api/summarize/route.ts`, `app/api/summarize-all/route.ts`.
- Háttérfolyamatok leválasztása: `app/middleware.ts`, `lib/serverInit.ts`, `lib/cron.ts`, `lib/cron.js`, `lib/trend-cron.js`, `pipeline/cron.js`, `forecast/forecast.js`, `autohirek/index.js`.
- Buildjavítások: `app/hirado/page.tsx`, `app/impresszum/page.tsx`.
- Ellenőrzések: `scripts/check-local-imports.cjs`, `tests/unit/runtime-config.test.cjs`, `tests/unit/mock-ai.test.cjs`, `tests/unit/ai-client-offline.test.cjs`.
- Dokumentáció: `docs/UTOM_PROGRESS.md`; a korábban létrehozott audit- és helyreállítási dokumentumok változatlanul megmaradtak.

## Ellenőrzések

| Ellenőrzés | Eredmény |
|---|---|
| `node --version` | `v24.19.0` |
| `npm --version` | `11.17.0` |
| `npm ci` | sikeres, 829 csomag települt |
| `npm run typecheck` | sikeres |
| `npm run lint` | sikeres, 0 hiba és 404 örökölt figyelmeztetés |
| `npm run check:imports` | sikeres; minden statikusan felismerhető helyi import feloldható |
| `npm run test:offline` | 6/6 sikeres; külső hálózati hívás nem történt |
| `npm run build` | sikeres offline alapértékekkel; 71 statikus oldal elkészült, a dinamikus route-ok felépültek |
| `npm run check` | teljes ellenőrzési lánc sikeres |
| `npm audit` (`npm ci` részeként) | 46 jelzés: 5 critical, 18 high, 22 moderate, 1 low |
| Git branch/HEAD | `develop/utom-recovery`, HEAD és `main` változatlanul `7df3f079...` |
| Távoli Git-művelet | nem történt |
| Adatbázis-újraépítés vagy migráció | nem történt |

## Ismert korlátok és következő munka

- Az ESLint jelenleg 404 örökölt figyelmeztetést mutat. A korábban hibaként jelentett legacy `any`, CommonJS és React 19 szabálytalanságokat A1-ben látható figyelmeztetéssé minősítettük; ezek fokozatos javítása külön munkacsomag.
- A dependency audit 46 sérülékenységét célzottan kell feloldani. Automatikus, törő főverzió-frissítés nem történt.
- Több régi modul továbbra is beégetett DB-konfigurációt és közvetlen Ollama/OpenAI integrációt tartalmaz. Az aktív A1 belépési pontok védettek, a teljes adapteres migráció az A mérföldkő további része.
- A verziózott adatbázisséma, migrációs rendszer, auth/admin hardening, teljes route-szintű írásvédelem és egységes CI workflow még hátravan.
- WSL2 tiszta környezetben külön reprodukció még nem történt; a mostani ellenőrzés Windows/PowerShell alatt futott.

## Következő konkrét fejlesztési feladat

**A2 – adatbázis-séma és migrációs alap:** a jelenlegi táblák és lekérdezések összevetése, verziózott kezdeti séma/migráció létrehozása, üres helyi adatbázison determinisztikus migrációs teszt. Ez csak külön következő munkacsomagban indul; A1 nem építette újra az adatbázist.

## Commitnapló

Új commit nem készült. Az A1 változások, a korábbi audit és a helyreállítási dokumentumok helyi working tree-ben vannak; `main` nem módosult, push/fetch/pull/PR nem történt.

---

## 2026-09-28 – Pipeline recovery, valódi MySQL 8 validáció

- Környezet: WSL2 Ubuntu 24.04, MySQL `8.0.46-0ubuntu0.24.04.4`, InnoDB, `REPEATABLE-READ`, strict SQL mode, szerver `SYSTEM`/CEST időzóna.
- Migráció: 001–021 baseline, reprezentatív meglévő adatok, majd a teljes listából 022–026; ismételt futás üres változáslistával. PASS.
- MySQL integration runner: 11 teszt, 11 PASS, 0 FAIL, 0 SKIP; teljes idő 12,122 s.
- Multi-process: claim race 10 iteráció UTC/Budapest processzekkel; cluster advisory-lock race 10 iterációval. Minden iteráció PASS.
- Lease/fencing: active lease, stale reclaim, zombie heartbeat/step/final write tiltása 10 iterációval PASS. Külön Honolulu worker és CEST szerver mellett a friss/stale döntés `UTC_TIMESTAMP(6)` alapján PASS.
- Fault injection: short-summary külső crash és embedding mentési hiba után a provider call count 1/1, `uncertain` + `needs_recovery`, automatikus retry nélkül; lokális hiba retry; final-completion recovery; rollback. PASS.
- Teljes kanonikus pipeline mocked külső adapterekkel: article `done`, 14 required step `done`, sentiment `done` vagy indokolt `skipped`, domain projekciók jelen vannak. A végső fixture runtime 2,551 s.
- Lifecycle: a teszt után 0 nyitott `utom_pipeline_test` kapcsolat; cluster advisory lock szabad; a gyermekfolyamat természetesen kilép. A cron poolhoz explicit `shutdownPipelineResources()` készült.
- A korábbi 30 másodperces megakadás oka: üresre létrehozott teszt-DB jelszó miatt a Speed Index konfigurációhibát dobott, majd a modul-szintű cron pool nyitva tartotta a hibázott Node processt.
- Regresszió: `git diff --check` PASS; typecheck PASS; importellenőrzés PASS; offline 46/46 PASS, 0 FAIL, 0 SKIP; ESLint 0 error, 369 warning; production build PASS, 72 oldal; `npm run check` PASS.
- A korábban nyitott domain projection/step tranzakciós rés a következő körben lezárult; lásd az alábbi acceptance-kiegészítést.
- Production DB, valódi OpenAI/RSS/SMTP/video és deployment nem lett érintve. Commit és push nem történt.

### 2026-09-28 – Atomic projection acceptance

- Új `completeStepWithProjection`: `BEGIN`, article és step fence validáció `FOR UPDATE` zárral, injektált domain projection, fenced step completion, `COMMIT`; bármely hiba `ROLLBACK`.
- Connection-injektálható modulok: scraper, short/long summary, plagiarism, category, sentiment, source, summary persistence, clickbait, embedding, cluster és Speed Index. Standalone fallbackjeik megmaradtak.
- Közös tranzakcióba került: scrape tartalom, summary mezők és rekordok, plagiarism, category, sentiment, keywords/trends, source, végleges summary, clickbait, embedding, cluster-hozzárendelés, Speed Index és history.
- Adversarial teszt: Worker A stale lett, Worker B új tokennel átvette a cikket, Worker A késői projectionje `article_claim_lost` hibával elbukott; sem domain adat, sem step completion nem maradt. Worker B maradt az egyetlen tulajdonos.
- Fault injection: domain write utáni exception és completion előtti serializációs hiba egyaránt teljes rollbacket adott. A sikeres ágban a projection és completion MySQL `CONNECTION_ID()` értéke azonos volt.
- Késői AI-eredmény: 1 provider call, 0 domain commit, step `uncertain`, article `needs_recovery`, automatikus második hívás nélkül.
- Végső MySQL runner: 13/13 PASS, 0 FAIL, 0 SKIP; full canonical fixture `done`, 2,484 s; 0 nyitott tesztkapcsolat, advisory lock szabad.
- Regresszió: offline 46/46 PASS; typecheck, importellenőrzés, build és `npm run check` PASS; ESLint 0 error, 369 warning.
- **PIPELINE RECOVERY ACCEPTANCE: VERIFIED**.

---

## 2026-09-28 – Feed ingestion correctness

- A két aktív article-ingestion route közös `lib/feed-ingestion.js` logikát használ; legacy insert bypass nem maradt az aktív útvonalakon.
- A canonical URL normalizálás idempotens, csak bizonyított tracking paramétert töröl, a jelentéssel bíró queryt és az eredeti URL-t megőrzi.
- Új közös source identity helper egységesíti a feed, related-news és Speed Index aliasokat; `24hu`, `24.hu`, `www.24.hu` egy identity.
- Publication timestamp: explicit timezone-os feed idő → metadata → ingestion fallback; UTC storage semantics, hibás/ambiguous dátum nem képez hamis epoch értéket.
- `027_article_ingestion_identity.sql`: original URL, external ID, timestamp provenance és teljes, binary SHA-256 URL identity. Régi timestamp/backfill nem futott.
- Valódi MySQL bizonyította: kétprocesszes dedup, retry, címváltozás, state preservation, same-title/different-URL, source-local GUID collision, path case és hosszú közös prefix helyes kezelése, invalid timestamp fallback, Speed Index alias-normalizáció.
- Offline suite: 52/52 PASS. MySQL suite: 15/15 PASS a dokumentálás előtti célzott futásban. Production DB és élő feed nem lett érintve.
- **FEED INGESTION CORRECTNESS: VERIFIED**.

---

## Kiegészítés – GitHub mentés és A2 migrációs alap

- A felhasználó visszaigazolt GitHub-mentése: `develop/utom-recovery`, commit `9bc90f3` (`Utom.hu A1 helyreállítás`). A fenti A1-kori, commit előtti Git-állapot történeti bejegyzés, már nem aktuális.
- A feltöltött A1 utáni forráscsomag alapján elkészült az **A2 migrációs keret és a forrástábla első migrációja**: `db/migration-core.cjs`, `db/migrate.cjs`, `db/migrations/001_sources.sql`, `tests/unit/migration-core.test.cjs`, `docs/UTOM_A2_MIGRATIONS.md`; továbbá `package.json` és `.env.example` bővült.
- Az offline terv/listázás és a migrációs egységtesztek az elemzői környezetben lefutottak. Valódi MySQL 8 integrációs próba, teljes `npm run check` és WSL2-teszt itt még nem futott; az A2 és a teljes A mérföldkő nincs lezárva.
- Az elemzői példány nem módosította a helyi Git- vagy GitHub-repositoryt. A módosított fájlokat előbb a felhasználó saját `develop/utom-recovery` ágába kell beilleszteni és ellenőrizni, majd csak sikeres teszt után committolni.

---

## 2026-09-27 – S-01–S-14 biztonsági folytatás

### Állapot auditpontonként

- **S-01 – code-level fixed, runtime verification pending.** A közös hash-elt szerveroldali sessiont minden Next user/auth route használja. A külön video server is SHA-256 token hash alapján ellenőriz; régi numerikus cookie nem érvényes. Valódi MySQL session-életciklus teszt még szükséges.
- **S-02 – code-level fixed, worker integration pending.** A veszélyes endpointok worker tokennel védettek vagy letiltottak; a legacy worker letiltott. Az egyetlen végleges pipeline és a teljes per-article state machine még nincs lezárva.
- **S-03 – code-level fixed, runtime verification pending.** A summaries keresés paraméterezett; typecheck és build sikeres. Valódi DB-adatkészletes kombinált filter/pagination próba még hiányzik.
- **S-04 – részben javított.** Protokoll-, cím-, DNS-, redirect-, timeout-, méret- és content-type védelem van. A DNS-validáció és a későbbi `fetch` közti DNS rebinding kockázatot deployment egress szűrés vagy címhez kötött HTTP kliens zárhatja le.
- **S-05 – code-level fixed.** Aktív forrásban nem találtunk beégetett DB user/jelszó/root fallbacket, `DB_PASS` eltérést vagy production video secret fallbacket.
- **S-06 – code-level fixed.** Aktív forrásban nincs `debug=true` vagy hardcoded user-ID video bypass.
- **S-07 – code-level fixed, runtime verification pending.** Elkészült az elveszett `app/api/premium-insights/[[...path]]/route.ts`: session és prémium ellenőrzés, szigorú útvonal-allowlist, traversal/rekurzió védelem, szerveroldali `UTOM_API_KEY`, query/status/body továbbítás, timeout. A böngészős forrásban nincs `NEXT_PUBLIC_UTOM_API_KEY`.
- **S-08 – code-level fixed, runtime verification pending.** Új közös `lib/entitlements.ts`; lejárt prémium flag nem ad hozzáférést. Insights, avatar, frame, auth/me és video can-watch ezt használja. Fizetési forrás nincs bevezetve.
- **S-09 – code-level fixed, migration runtime pending.** Közös jelszópolicy; bcrypt PIN-hash; régi plaintext PIN sikeres ellenőrzéskor automatikusan hashre frissül; login limit már csak sikertelen próbákat számol. Valódi legacy DB-próba még kell.
- **S-10 – részben javított.** Timing-safe API-key ellenőrzés, explicit origin lista, production fail-closed origin alap, opcionális trusted proxy header és CSRF helper készült. Többprocesszes rate limithez Redis vagy más közös tároló és dokumentált reverse-proxy konfiguráció szükséges.
- **S-11 – code-level fixed, runtime verification pending.** A test-email endpoint letiltott; verification sessionhöz kötött; verification/reset tokenek hash-elve tárolódnak; reset token fogyasztása tranzakciós és egyszeri; jelszó/PIN reset minden sessiont visszavon. SMTP/DB integrációs teszt nem futott.
- **S-12 – code-level fixed.** Az ffmpeg shell string helyett `execFile` argumentumlista, bemeneti/output könyvtárkorlát, fájlnév-validáció, timeout és egyidejűségi korlát készült. Valódi ffmpeg nem futott.
- **S-13 – code-level fixed, runtime verification pending.** A user/update csak `theme`, `nickname`, `bio` mezőket enged; password/PIN kizárt; session userre korlátozott; értékvalidáció és paraméterezett értékek maradtak.
- **S-14 – részben javított.** Friss `npm audit fix` (`--force` nélkül) 46 sérülékenységről 5 high szintre csökkentette a listát. A maradék Puppeteer 25 és Nodemailer 10 breaking főverziót igényel; külön kompatibilitási munkát kér.

### Ebben a körben módosított/létrehozott fájlok

- Premium és proxy: `lib/entitlements.ts`, `lib/entitlements-core.js`, `lib/entitlements-core.d.ts`, `lib/premium-insights-path.js`, `lib/premium-insights-path.d.ts`, `app/api/premium-insights/[[...path]]/route.ts`, `app/api/user/avatar/route.ts`, `app/api/user/frame/route.ts`, `app/api/hirado/can-watch/route.ts`, `app/api/auth/me/route.ts`.
- Auth és tokenek: `lib/auth-policy.js`, `lib/auth-policy.d.ts`, `lib/pin-security.ts`, `lib/one-time-token.ts`, `lib/email-verification.ts`, valamint a login/register/password/PIN/verification route-ok.
- Egyéb biztonság: `lib/security.ts`, `lib/generateThumbnail.ts`, `app/api/user/update/route.ts`, `app/api/test-email/route.ts`, `.env.example`.
- Függőségek és tesztek: `package-lock.json`, `tests/unit/auth-policy.test.cjs`, `tests/unit/entitlements.test.cjs`, `tests/unit/premium-insights-path.test.cjs`.
- A jelen munkamenet előtt már módosított S-03–S-07, worker és kliensfájlokat megőriztük; nem állítottuk vissza őket.

### Ellenőrzési eredmények

| Ellenőrzés | Eredmény |
|---|---|
| `git diff --check` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint -- --quiet` | PASS, 0 error |
| teljes ESLint összesítés | 0 error, 372 warning |
| `npm run check:imports` | PASS |
| `npm run test:offline` | PASS, 18/18 |
| `npm run build` | PASS, Next 16.3.6, 72 statikus oldal |
| friss `npm audit` a javítás előtt | 46: 5 critical, 18 high, 22 moderate, 1 low |
| `npm audit fix` után | 5 high; force nem futott |
| valódi DB/SMTP/OpenAI/RSS/ffmpeg | nem futott |

### Következő konkrét feladat

Izolált MySQL integrációs teszt az S-01, S-07–S-11 folyamatokra, majd a news worker egyetlen aktív pipeline-ba rendezése tartós, lépésenkénti article state-tel és idempotens AI-feldolgozással. Deployment oldalon egress firewall, hiteles reverse-proxy header kezelés és közös Redis rate limiter szükséges.

Első pipeline-stabilizációként a worker már újrahasználja az `articles.short_summary` és `articles.long_summary` meglévő eredményeit. Az AI-lépések alapértelmezett próbálkozásszáma 1; legfeljebb 2 csak explicit `AI_STEP_MAX_ATTEMPTS` beállítással engedélyezhető. A teljes lépésenkénti, tartós state machine ettől még nyitott.

---

## 2026-09-27 – kanonikus pipeline és crash recovery

- A `pipeline/cron.js` lett az egyetlen aktív cikkfeldolgozó. A legacy TypeScript scheduler, valamint a `/api/summarize` és `/api/summarize-all` párhuzamos feldolgozási útvonal le van tiltva.
- A feed route-ok csak kanonizált URL-lel ingestálnak; közvetlen AI-feldolgozást nem indítanak. A párhuzamos duplikációt a meglévő egyedi URL-kulcs és `INSERT IGNORE` kezeli.
- Elkészült a tartós article claim, heartbeat, lease, korlátozott újrapróbálás és lépésenkénti state machine. A sikeres lépések eredménye újraindítás után használható, a cikk kizárólag minden kötelező lépés után lehet `done`.
- Az embedding, a meglévő cluster-hozzárendelés, a trendírás és a speed history ismételhetővé vált duplikált mellékhatás nélkül.
- A related news végpont forrásnormalizációja és limitje javítva lett; a saját summary kizárása megmaradt. A jelenlegi ajánlás továbbra is forrásalapú, cluster/embedding és dátumablak nélkül.
- Új, még nem alkalmazott migrációk: 022–025. Adatbázis-írás, külső szolgáltatáshívás és migrációfuttatás nem történt.
- Részletes működés és bevezetés: `docs/UTOM_PIPELINE_RECOVERY.md`.
- Új offline regressziós tesztek fedik a két worker versenyét, a stale claim átvételét, a sikeres fizetős lépés újrahasználatát, a kötelező lépéseket, az opcionális lépés hibáját, az URL-azonosságot és az idempotencia segédfüggvényeket.

---

## 2026-09-27 – adversarial recovery és fencing

- Az article aktuális claim tokenje most minden kritikus step-módosítást fence-el; a régi step-token önmagában nem jogosít írásra. Nulla érintett sor elvesztett claimnek számít.
- A scraper többé nem ír `pending`/`failed` article státuszt, tartalommentése claim-feltételes.
- A fizetős AI-lépések determinisztikus operation keyt és hívás előtti `uncertain` checkpointot kapnak. Bizonytalan kimenetel `needs_recovery` karanténba kerül, automatikus AI retry nélkül.
- A short summary, long summary és category belső második OpenAI-hívása megszűnt. Meglévő summary/embedding helyi checkpointként újrahasználható.
- Új 026-os additív migráció tárolja a külső operation recovery diagnosztikáját.
- A cluster race MySQL advisory lockkal és lock alatti újraellenőrzéssel javítva lett. A korábbi lekérdezésből hiányzó `cluster_id` mező is bekerült.
- A feed, cluster és Speed Index új időírásai/napablakai UTC-alapúak; a lease összehasonlítása kizárólag DB-oldali UTC-idővel történik.
- A related news a saját article-t is kizárja, clustert priorizál, normalizált source fallbacket, determinisztikus sorrendet és ±7 napos ablakot használ.
- Elkészült a valódi MySQL 8 migrációs és kétprocesszes claim teszt, de helyi MySQL/Docker hiányában ebben a környezetben szabályosan SKIP lett; PASS állítást nem teszünk rá.
- A két ismert React ref-render runtime warning javítva lett a Speed Index komponensben és a `useInView` hookban.
# Speed Index deferred processing (2026-09-28)

- Az article-onkénti teljes UTC-napi Speed Index újraszámítás megszűnt.
- A `028_speed_index_deferred_batch.sql` tartós, coalescing dirty/generation állapotot ad.
- A batch claim tokennel és generation fencinggel védett; stale claim átvehető.
- A score, history és marker completion egy tranzakcióban történik.
- 100 egyidejű dirty eseményből 1 teljes recalculation lett; a referenciaeredmény és a deferred eredmény azonos.
- Offline suite: 52/52 PASS. Valódi MySQL 8 suite: 21/21 PASS a Speed Index concurrency és fault-injection esetekkel együtt.

`SPEED INDEX DEFERRED PROCESSING: VERIFIED`

# Rollout readiness (2026-09-28)

- A teljes 001–030 migrációs lánc statikusan auditálható, checksum-védett és dry-run/status móddal rendelkezik.
- A worker schema readiness ellenőrzéssel indul; hiányos sémán fail-fast.
- Belső tokennel védett health endpoint mutatja a worker, backlog, stale, `needs_recovery` és Speed Index állapotot.
- A recovery CLI alapértelmezett inspect művelete read-only; csak lokális, failed, retryable step állítható explicit retryra, audit traillel.
- A graceful SIGTERM út lezárja a poolt és worker shutdown állapotot rögzít.
- Deployment gate és rollout sorrend: `docs/UTOM_DEPLOYMENT_CHECKLIST.md`.

Ellenőrzés: offline 57/57 PASS, valódi MySQL 8 integration 26/26 PASS, fresh migration 30/30 PASS, production build PASS, ESLint 0 error.

`ROLLOUT READINESS: VERIFIED`

# Staging rollout rehearsal (2026-09-28)

- Valódi MySQL 8 pre-upgrade fixture, checksumolt backup, két külön restore és restore-alapú rollback drill PASS.
- 022–030 staging migration, post-migration integrity és schema readiness PASS.
- Valódi Next.js production runtime HTTP health/auth és fixture RSS ingestion PASS.
- Canonical worker, domain projectionök, deferred Speed Index, safe recovery és uncertain protection PASS.
- Graceful restart, article hard-crash és Speed Index stale recovery PASS.
- Részletes jegyzőkönyv: `docs/UTOM_STAGING_REHEARSAL.md`.

`STAGING ROLLOUT REHEARSAL: VERIFIED`

`PRODUCTION DEPLOYMENT: NOT EXECUTED`
## 2026-09-30 – final production readiness rehearsal

The final production-cardinality/soak request was audited. The existing deterministic fixture (`scripts/scale-fixture.cjs`) supports SMALL/MEDIUM/LARGE synthetic profiles, but no documented production cardinality export exists, so these are explicitly `HIGH SYNTHETIC CAPACITY PROFILE` measurements. The isolated WSL MySQL endpoint did not become available during this run; therefore no scale, soak, resource, backup/restore or throughput numbers were invented. See `docs/UTOM_PRODUCTION_SOAK_REHEARSAL.md`. Technical historical closure remains verified; final change-window readiness is not verified and production deployment was not executed.
