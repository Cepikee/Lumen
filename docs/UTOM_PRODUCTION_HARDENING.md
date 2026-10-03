# Utom.hu / Lumen production hardening

Mérés: 2026-09-28. Minden szám **local synthetic measurement**, nem production SLA. Production adat és külső szolgáltatás nem szerepelt.

## Scale fixture

A `npm run scale:fixture` `SCALE_PROFILE` (`SMALL`, `MEDIUM`, `LARGE`) és opcionális `SCALE_SEED` alapján 021-es sémát épít; az alap seed `20260928`. Magyar többbyte-os szöveget, emoji-t, hosszú tartalmat, tracking/duplikált query-paraméteres URL-változatot, régi/új időpontokat, source/cluster kapcsolatot, embeddinget, pending/done/failed állapotot, summaryt, keywordöt, trendet és Speed Index historyt tartalmaz.

| Profil | Article | Summary | Keyword | Trend | Cluster | Speed history | Generálás |
|---|---:|---:|---:|---:|---:|---:|---:|
| SMALL | 200 | 160 | 320 | 40 | 25 | 200 | 2,31 s |
| MEDIUM | 2 000 | 1 600 | 3 200 | 400 | 250 | 2 000 | 5,19 s |
| LARGE | 10 000 | 8 000 | 16 000 | 2 000 | 1 250 | 5 000 | 12,96–13,06 s |

LARGE 021: `articles` adat/index 13 123 584 / 3 817 472 byte, `summaries` 3 686 400 / 1 261 568 byte. Elérhető tárhely: 216 447 569 920 byte.

## Backup, restore és migráció

A LARGE 021 backup `--single-transaction --no-tablespaces --routines --triggers` opciókkal exit 0. A footer és a nem üres fájl ellenőrzése PASS. Dump: 16 147 274 byte; gzip: 536 530 byte; SHA-256: `4e83273e66bf81e46ecf00207610e42f27de2b6cdabb37d5b5c02757a1c43921`; idő: 287 ms. A külön DB restore 5 191 ms. Integritás: 10 000 article, 8 000 summary, 16 000 keyword, séma 021.

Mindhárom dry-run pontosan 022–030 volt. LARGE teljes migráció: 10 909,83 ms.

| Migráció | Idő (ms) |
|---|---:|
| 022 article processing claim | 8 621,21 |
| 023 processing steps | 80,20 |
| 024 trend idempotency | 408,56 |
| 025 speed history idempotency | 481,84 |
| 026 external recovery | 143,32 |
| 027 ingestion identity | 906,73 |
| 028 deferred Speed Index | 113,77 |
| 029 worker health | 76,70 |
| 030 recovery audit | 77,51 |

A fő change-window kockázat a 022-es `ALTER TABLE articles`; 10 000 hosszabb rekordnál 8,62 s. MySQL DDL miatt writer-stop és restore rollback szükséges. Új index/migráció nem készült: a pending claim az `idx_articles_status_created` covering indexet használta. A health snapshot tíz LARGE mérésének átlaga 6,76 ms, maximuma 11,93 ms.

Post-migration duplicate URL identity/summary és orphan summary/keyword/cluster: 0; hiányzó URL identity: 0. A session runtime hiányzó DDL-je miatt a 031 `user_sessions`, a többprocesszes limithez a 032 `shared_rate_limits`, a reset DB/mail atomicitásához a 033 `email_outbox` migráció készült; exact 033 readiness szükséges. A read-only `production:preflight` Node/config/disk/build/DB/migration/schema/claim/writer ellenőrzése erre frissült. A korábbi 021→030 scale mérés változatlan történeti mérés; a 031–033 új, kezdetben üres runtime táblákat hoz létre.

A közös rate limiter három lokális szintetikus körben, körönként két külön processz 30 párhuzamos kísérleténél pontosan 10 elfogadást adott; a teljes körök 547–577 ms, egy külön, DB-UTC órát használó kérés 11,32 ms volt (`LOCAL SYNTHETIC MEASUREMENT`, nem production SLA). Process restart, következő időablak, eltérő identity, lejárt sorok takarítása és PRIMARY-key query plan is PASS. A DNS-pinned fetch valós lokális socketen bizonyította, hogy a feloldás után ugyanarra a címre csatlakozik, az eredeti Host és TLS SNI megmarad, és minden redirect új ellenőrzést kap. A self-signed HTTPS fixture elutasítása igazolja, hogy a TLS-verifikáció aktív.

A production-build auth E2E három külön alkalmazásfolyamattal igazolta a DB-backed session folytonosságát szabályos és SIGKILL restart után. A reset token és az AES-256-GCM titkosított email outbox rekord egy tranzakcióban készül; párhuzamos request egy tokenre és egy mailre coalescelődik. A provider utáni crash `uncertain` állapota nem kerül automatikus újraküldésre. A mérésekben valódi SMTP hívás nem történt.

A legacy plaintext PIN kompatibilitási út user-row lockkal és tranzakciós bcrypt lazy upgrade-del működik; concurrent login, injected rollback és restart runtime bizonyítást kapott. A premium Insights útvonalban nincs browser subprocess: a session/entitlement után allowlistes belső HTTP proxy fut. A boundary saját shared MySQL limitert, legfeljebb 15 másodperces timeoutot és legfeljebb 2 MiB-os response capet alkalmaz; redirectet nem követ. Lokális upstream failure-mátrix és concurrent E2E PASS, fizetős proxyhívás 0.

A thumbnail helper valódi ffmpeg executable-t használ argument arrayjal, engedélyezett input/output gyökérrel, 60 másodperces alap timeouttal, nem nulla exit/output-validációval és hiba utáni partial artifact törléssel. A lokális MP4→JPEG fixture, timeout, hibás input és párhuzamos guard PASS; production video generation nem futott.

Az operatív időpolicy audit lezárult: DB/lease/session/reset/rate-limit instant UTC, magyar üzleti aggregátum `Europe/Budapest`, source timestamp explicit offset + provenance, ismeretlen legacy érték `legacy_unknown`. A 2026-os budapesti spring-forward és fall-back 23/25 órás napjai, ambiguous/nonexistent civil idők és host timezone independence PASS.

Production módban explicit mode, online worker, OpenAI provider, real-AI opt-in, AI secret és legalább 32 karakteres internal token kötelező. Engedélyezett email/payment/video capability saját secret nélkül fail-fast. A redaction marker teszt PASS. A meglévő suite bizonyítja a konkurens claim kizárását, fencinget, zombie-write tiltást, uncertain védelmet, atomikus completiont, stale recoveryt, Speed Index idempotenciát, feed és UTC viselkedést. Paid external call: 0.

Az öt high advisoryt okozó dependency láncból a DNS-pinninget megkerülő Puppeteer fallback és maga a dependency kikerült; a Nodemailer explicit `10.0.12` verziót kapott. Az érintett API-k célzott offline regressziója és a build PASS; `npm audit --omit=dev` eredménye 0 vulnerability. Force upgrade nem történt.

## Korlátok és státusz

A 10 000 article lokális fixture nem igazolja a valós production cardinalitást, I/O-t, replikációt vagy live trafficet. Nincs külön hosszú soak/CPU-trend bizonyíték minden acceptance pontra.

`PRODUCTION CHANGE-WINDOW READINESS: NOT VERIFIED`

Blocker: production cardinalitáshoz igazított anonim rehearsal; külön soak/resource trend; az egy nyitott jogi HIST-033 tétel.

`PRODUCTION DEPLOYMENT: NOT EXECUTED`
### Final production-cardinality rehearsal status (2026-09-30)

The repository's deterministic scale fixture is available, but no verified production cardinality export is present. The final synthetic scale/soak run was blocked because the disposable local MySQL 8 endpoint did not become available in the execution window. Consequently technical change-window readiness remains **NOT VERIFIED**; no production deployment or production database action occurred. Detailed evidence is in `docs/UTOM_PRODUCTION_SOAK_REHEARSAL.md`.
