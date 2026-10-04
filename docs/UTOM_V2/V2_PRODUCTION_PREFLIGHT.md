# UTOM.HU / LUMEN – PRODUCTION PREFLIGHT

Ez a dokumentum read-only preflight eredménye a 0eda4a31725aaf3d17b5584e78bdddaf8f8d2a6c release candidate commithez. Production deploy, production migration, production DB-írás, DNS-módosítás és feature flag bekapcsolás nem történt.

## 1. Git állapot

- Branch: develop/utom-recovery
- Local és remote HEAD: 0eda4a31725aaf3d17b5584e78bdddaf8f8d2a6c
- Working tree: tiszta
- Release commit elérhető: IGEN

## 2. Bizonyított release állapot

- M1–M18 COMPLETE; V2 implementáció KÉSZ.
- Release Candidate staging és quality gate: PASS.
- MySQL fresh 001→058, upgrade 032→058, backup/restore: PASS.
- MySQL recovery: 37/37 PASS; offline suite: 370/370 PASS.
- Production build és runtime smoke: PASS; runtime audit: 0 vulnerability.
- Production DB/deploy: NEM ÉRINTETT / NEM TÖRTÉNT.

## 3. Production infrastruktúra-inventory

| Tétel | Bizonyíték |
|---|---|
| Alkalmazás | Next.js Node runtime-mal |
| Runtime | Node 24.x a package engine alapján |
| Adatbázis | MySQL 8.x; release gate 8.0.46-on |
| Hosting, OS, process manager | NINCS BIZONYÍTOTT ADAT |
| Reverse proxy, domain, TLS | NINCS BIZONYÍTOTT ADAT |
| Production DB host/name | NINCS BIZONYÍTOTT ADAT |
| Build/deploy platform | NINCS BIZONYÍTOTT ADAT |

A README Vercel-sablonszövege nem bizonyítja a tényleges production hostingot.

## 4. Production env inventory

### Kötelező

NODE_ENV=production, APP_MODE=production, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, UTOM_OFFLINE_MODE=false, BACKGROUND_JOBS_ENABLED, UTOM_INTERNAL_WORKER_TOKEN és EMAIL_OUTBOX_ENCRYPTION_KEY. A validator az internal tokent legalább 32 karakteresként, az outbox kulcsot 32 byte-os kulcsként ellenőrzi.

### V2

- UTOM_V2_ENABLED=false az első backend deploynál.
- UTOM_PAID_AI_ENABLED=false az első rolloutnál.
- NEXT_PUBLIC_UTOM_V2_ENABLED=false az első frontend buildnél.
- A frontend flag build-time érték, módosítása új buildet és deployt igényel.
- A server flag új process/redeploy után érvényesül.

### Auth/security

UTOM_ALLOWED_ORIGIN, UTOM_TRUST_PROXY_HEADERS, UTOM_API_KEY, PUBLIC_APP_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, VIDEO_SIGN_SECRET.

A domainhez kötött reCAPTCHA/Turnstile konfiguráció operátori ellenőrzést igényel.

### AI/provider

AI_PROVIDER, REAL_AI_ENABLED, OPENAI_API_KEY, OPENAI_MODEL. A jóváhagyott első rollout policy paid AI OFF, de a production validator openai + real AI + API key beállítást kötelezően várja. Ez P1 finding.

M12 policy: havi soft 12 000 Ft, havi hard 15 000 Ft, napi soft 350 Ft, napi hard 500 Ft, article hard 5 Ft, step hard 2 Ft, legfeljebb egy large escalation/article.

### Email és payment

MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM csak EMAIL_SEND_ENABLED=true esetén szükségesek. Payment actionök OFF állapotban maradnak; payment provider aktiválása nem része ennek a release-nek.

## 5. Production DB

Production credential vagy canonical production kapcsolat nincs, ezért production DB-kapcsolatot nem próbáltam.

- Kapcsolat, current schema, ledger, backup-hely és restore-környezet: NINCS BIZONYÍTOTT ADAT / OPERÁTORI ADAT SZÜKSÉGES.
- Target schema: 058.
- Migration path: CURRENT → 058, a tényleges current verziótól függően.
- Production DB-re semmilyen SELECT, migration, CREATE, ALTER, INSERT, UPDATE, DELETE, DROP vagy lockoló művelet nem futott.

## 6. Végrehajtatlan migration/backup runbook

1. Current schema read-only felismerése.
2. Production backup készítése jóváhagyott helyre.
3. Dump méret, checksum és restore-olhatóság ellenőrzése.
4. CURRENT → 058 migration terv jóváhagyása.
5. Migration futtatása csak külön jóváhagyás után.
6. Ledger/checksum/readiness ellenőrzése.
7. Csak sikeres readiness után alkalmazás rollout.

## 7. Rollout checklist

1. Release commit, change-window és production infrastruktúra ellenőrzése.
2. Node 24.x, MySQL 8.x, disk és env ellenőrzése.
3. Backup/restore útvonal ellenőrzése.
4. Backend deploy V2 OFF állapotban.
5. Legacy smoke: homepage, article, auth, feed, related news, meglévő Premium.
6. Backend V2 kontrollált ON, majd context/timeline/source-comparison/Premium smoke.
7. Frontend deploy V2 OFF állapotban.
8. Frontend V2 kontrollált ON, majd anonymous/non-premium/active/expired browser smoke.
9. Kis backfill batch, monitor, pause/resume és cost ceiling.
10. Csak stabil eredmény után fokozatos folytatás.

## 8. Rollback és monitoring

Rollback sorrend: frontend V2 OFF; server V2 OFF; backfill pause; paid AI OFF; előző alkalmazás-release; DB restore csak bizonyított DB-probléma esetén.

Figyelendő: HTTP 5xx, auth 401/403 anomália, DB kapcsolat, migration/checksum, backfill failed/busy/deadlock, AI budget denial, process restart, response-time romlás, disk usage.

## 9. Preflight findingek

### PROD-PREFLIGHT-F001 – Elavult production preflight schema baseline

- Kategória: P1 → **FIXED**.
- A script korábban 033-at várt, miközben a canonical runtime és release target 058.
- Javítás: a script a REQUIRED_SCHEMA.latestVersion authoritative forrását használja; nincs külön latest-verzió hardcode.
- Regresszió: schema 058 PASS, 057 upgrade-required/not ready, 059 safe fail-closed; targeted production-preflight teszt PASS.

### PROD-PREFLIGHT-F002 – Paid AI policy és production validator konfliktus

- Kategória: P1 → **FIXED**.
- Rollout policy paid AI OFF, a validator korábban mindig AI_PROVIDER=openai, REAL_AI_ENABLED=true és OPENAI_API_KEY értéket követelt.
- Javítás: paid AI OFF esetén a provider credential nem kötelező; paid AI ON esetén megmarad az explicit provider, real AI és credential ellenőrzés.
- Regresszió: paid AI OFF kulcs nélkül PASS; paid AI ON hiányos vagy nem támogatott configgal FAIL, érvényes configgal PASS.

### PROD-PREFLIGHT-F003 – Production infrastruktúra és hozzáférések nem bizonyítottak

- Kategória: OWNER ACTION.
- Hiányzik hosting, OS, process manager, proxy, domain/TLS, production DB, backup-hely, restore-környezet és production env.

### PROD-PREFLIGHT-F004 – CI Node-verzió eltérés

- Kategória: P2 → **FIXED**.
- A package engine Node 24.x, több aktív push/schedule workflow korábban Node 18 vagy 20 verziót használt.
- Javítás: az aktív CI workflow-k Node 24-re állítva; a build workflow üres jobját nem tekintettem működő quality gate-nek.

## 10. GO / NO-GO

| Feltétel | Állapot | User action |
|---|---|---|
| Release commit és clean Git | PASS | Nem |
| Release Candidate | PASS | Nem |
| Production backup/DB/current schema | NEM IGAZOLT | Igen |
| Migration readiness | F001 javítva; production current verzió nem igazolt | Igen |
| Node/MySQL production verzió | NEM IGAZOLT | Igen |
| Env, auth, reCAPTCHA | NEM IGAZOLT | Igen |
| Flags | TERVEZETT OFF | Deploykor |
| Paid AI | OFF policy, F002 javítva | Nem |
| Build/runtime/rollback terv | PASS/TERVEZETT | Operátori ellenőrzés |
| Payment | OFF | Nem |

RELEASE CANDIDATE: PASS

PRODUCTION PREFLIGHT: PARTIAL – OWNER/OPERÁTORI ADAT SZÜKSÉGES

P0: 0

P1: 0

P2: 0

OWNER ACTION: 1

APPLICATION TECHNIKAI PRODUCTION BLOKKOLÓ: NEM

PRODUCTION DEPLOY TECHNIKAILAG ELŐKÉSZÍTVE: NEM – production infrastruktúra és operátori adatok hiányoznak

PRODUCTION DEPLOY ENGEDÉLYEZVE: NEM

PRODUCTION DB MÓDOSÍTVA: NEM

PRODUCTION DEPLOY VÉGREHAJTVA: NEM

## 11. Owner actions

1. Production hosting/runtime, domain/TLS, process manager és proxy adatainak megadása.
2. Production DB read-only preflight kapcsolat, backup-hely és restore-út biztosítása.
3. Production env/secrets kitöltése titkos csatornán.
4. Production rollout jóváhagyása a teljes operátori adatokkal.
5. A CI Node 24-re igazítása megtörtént; további workflow-módosítás nem szükséges ehhez a preflighthez.

Q08, Q10, Q11, Q12, Q13 és Q14 nem blokkoló deferred döntések maradnak. Ebben a sessionben production deploy, migration, DNS- vagy feature flag-módosítás nem történt. A docs.zip untracked, érintetlen, commitból kizárva.
