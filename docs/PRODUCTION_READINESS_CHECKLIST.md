# UTOM.hu production readiness checklist

Dátum: 2026-10-04  
Release baseline: `3b54f65`  
Branch: `develop/utom-recovery`  
Schema: `059`

Ez a dokumentum előkészítési ellenőrzőlista. Production deploy, DNS-módosítás és production adatbázis-művelet ebben a körben nem történt.

## Release és alkalmazás

| Tétel | Állapot | Bizonyíték / következő lépés |
|---|---|---|
| Release commit rögzítve | PASS | `3b54f65` és a követő dokumentációs commitok |
| Node verzió | PASS | Node `24.19.0`; production hoston ugyanaz a főverzió kötelező |
| Next.js verzió | PASS | `16.3.6` |
| Schema | PASS | Migration chain latest `059` |
| TypeScript / lint / import | PASS | legutóbbi gate zöld, lint 0 error |
| Offline regresszió | PASS | `401/401` |
| Production build | PASS | `75/75` route-generálás |
| Production hostname metadata | OWNER ACTION | `NEXT_PUBLIC_APP_URL` éles értéke még nincs beállítva |

## Infrastructure

| Tétel | Állapot | Megjegyzés |
|---|---|---|
| Remote staging VPS | OWNER ACTION | valódi remote staging környezet szükséges |
| Reverse proxy | OWNER ACTION | Nginx vagy Caddy, localhost app bindinggel |
| HTTPS/ACME | OWNER ACTION | tanúsítvány kiadás és megújítás stagingen bizonyítandó |
| MySQL 8 production target | OWNER ACTION | izolált teszt 8.0.46; production host/szolgáltató nincs kiválasztva |
| Off-host backup | FAIL | policy, storage és restore rehearsal hiányzik |
| Monitoring alerts | OWNER ACTION | alert provider és címzettek nincsenek jóváhagyva |
| Log rotation | OWNER ACTION | disk quota, retention és operator hozzáférés stagingen állítandó |
| VPS capacity | OWNER ACTION | 2 vCPU/4 GB és 4 vCPU/8 GB resource-constrained mérés kell |

## Secrets és providers

| Tétel | Állapot | Megjegyzés |
|---|---|---|
| DB credentials | OWNER ACTION | secret store/runtime env; Gitbe nem kerülhet |
| Internal worker token | OWNER ACTION | legalább 32 karakter, rotálható |
| Email outbox encryption key | OWNER ACTION | pontosan 32 byte hex/base64 érték |
| CAPTCHA production credentials | OWNER ACTION | reCAPTCHA vagy jóváhagyott provider |
| Email provider | FAIL | regisztráció, verification, reset és contact éles szolgáltatója nincs beállítva |
| Payment provider | N/A / DEFERRED | V2.1-ben nincs implementálva |
| Paid AI provider | N/A / DEFERRED | alapállapotban OFF |
| Analytics consent | OWNER ACTION | explicit privacy/consent döntés szükséges |

## Owner / policy

| Tétel | Állapot |
|---|---|
| Full-text retention | OWNER ACTION |
| Source/TDM/paywall policy | OWNER ACTION |
| 444 canonical feed | OWNER ACTION – jelenleg HOLD |
| FFmpeg/Híradó indulási scope | OWNER ACTION |
| Backup retention | OWNER ACTION |
| Production alerting és ügyelet | OWNER ACTION |

## Gate

`CODE RELEASE READY: YES`  
`INFRASTRUCTURE READY: NO`  
`OWNER DECISIONS READY: NO`  
`REMOTE STAGING READY TO BUILD: NO`  
`PRODUCTION DEPLOY READY: NO`
