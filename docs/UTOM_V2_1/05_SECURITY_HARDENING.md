# Biztonsági hardening

## Hatókör

CSP, HSTS, cookie- és session-szabályok, CSRF, rate limit, SSRF, SQL injection, XSS, open redirect, path traversal, input/body limit, admin/internal route, worker token, secret leakage és reverse proxy header kezelés.

## Production határ

Localhost adapter csak explicit development/test módban engedélyezhető; productionben minden határ fail-closed marad. Frontend flag, localStorage vagy query paraméter nem adhat Premium hozzáférést.

## Státusz

PASS – LOCAL EVIDENCE COMPLETE

## Fenyegetési modell és ellenőrzési mátrix – 2026-10-04

| Felület | Releváns támadó/input | Védett eszköz | Bizonyíték | Státusz |
|---|---|---|---|---|
| Nyilvános feed/read | anonim HTTP kliens, hibás query | olvasási adatok és DB kapcsolat | route input-validáció, parameter binding, browser/API regressziók | PASS |
| Auth/session | hibás jelszó/PIN, replayelt cookie, lejárt session | user session és credential állapot | HTTP auth/PIN E2E, HttpOnly/SameSite/expiry ellenőrzés | PASS |
| Premium/V2 | anonim, free vagy expired user | premium adat és entitlement | entitlement/proxy E2E, active/expired browser matrix | PASS |
| User mutation | sessiontől eltérő user ID, malformed body | saját user profil és tokenek | session-derived authorization és auth response regressziók | PASS |
| Internal/maintenance | külső kliens belső route-ra küldve | worker és karbantartási műveletek | worker token, init/maintenance tombstone tesztek | PASS |
| RSS/outbound | átirányítás, private/link-local host, timeout | belső hálózat és process erőforrás | safe-fetch DNS pinning, redirect és body-limit tesztek | PASS |
| V2 runtime | hibás vagy ismételt ingest | canonical és derived állapot | MySQL recovery, fencing, idempotencia és canonical E2E | PASS |
| Külső függőségek | CAPTCHA/AI/payment szolgáltatás kiesése | auth és költségvetés | loopback adapter, paid AI 0, payment 0 | PASS |

## V21-SEC-F001 – közös login lockout trusted proxy nélkül

- Severity: Medium.
- Reprodukció: proxy header trust nélkül a security réteg minden klienshez ugyanazt a direct sentinel IP-t adta. Tíz sikertelen login után a login route csak az IP sentinel alapján számolt, ezért egy kliens minden email címet 429-re zárhatott ugyanazon processben.
- Root cause: a trusted proxy nélküli direct/unknown fallback nem valós kliens IP, mégis globális per-IP login limitként volt használva.
- Javítás: a lib/login-rate-limit.js a direct és unknown sentinel esetén emaillel együtt szűr; bizonyított kliens IP esetén változatlanul per-IP limit marad. A query paraméterezett maradt.
- Regresszió: tests/unit/login-rate-limit-contract.test.cjs; route wiring, direct/unknown email scope és trusted-IP scope ellenőrizve.
- Státusz: FIXED.

## Security gate evidence

- Authentication, session, premium authorization, CORS/origin, SSRF, SQL injection, XSS, redirects, traversal, enumeration, reset-token lifecycle, user authorization, internal routes, worker token és secret/log leakage: PASS vagy FIXED a fenti evidence szerint.
- Local demo bypass: PASS; kizárólag loopback/development guard mellett aktív, production fail-closed.
- Critical security finding: 0; High: 0; Medium open: 0.
- A teljes, minden route-ra kiterjedő generikus body-limit és lassú-DB terhelési mérés külön fault-injection gate; ez nem nyitott security alkalmazási finding.


## V2.1 final closure cross-reference – 2026-10-04

SEO/sharing, Premium UX, ingestion technical audit, localhost load/soak and final quality evidence are consolidated in docs/UTOM_V2_1/10_V2_1_FINAL_ACCEPTANCE.md and docs/UTOM_V2_1/17_V2_1_RELEASE_READINESS.md. No production DB, deploy, payment or paid AI was used.

