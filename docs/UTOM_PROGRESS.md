# Utom.hu – helyreállítási progress napló

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
