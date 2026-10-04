# UTOM remote staging build manifest

Állapot: terv és provisioning gate. VPS/SSH/DNS módosítás nem történt.

## Starting profile

- OS: friss támogatott Linux LTS, x86_64.
- CPU/RAM: **4 vCPU / 8 GB RAM – ajánlott staging kezdőprofil, még nem bizonyított**.
- 2 vCPU / 4 GB: `INSUFFICIENT EVIDENCE`, csak későbbi resource-constrained összehasonlító mérés.
- Storage: SSD/NVMe, kezdetben legalább 80–120 GB használható hely tartalékkal; a tényleges igényt MySQL, backup és log mérés alapján kell pontosítani.
- Node: `24.19.0` vagy kompatibilis Node 24 LTS runtime.
- npm: a repository lockfile-jához tartozó npm, `npm ci` kötelező.
- MySQL: 8.x, izolált staging adatbázis, schema `059`, UTC és `utf8mb4`.

## Network and firewall

- Public: TCP 80 és 443.
- SSH: csak kontrollált admin/deploy forrásból, kulcsos autentikációval.
- MySQL: nem public; csak loopback vagy belső/private hálózati cím.
- Next internal port: csak loopback/private binding; reverse proxy mögött.
- Internal readiness: protected reverse-proxy location vagy private access, public liveness külön minimalizált.
- Production DNS és Cloudflare ebben a buildben nem módosítható.

## Users and directories

- Külön, nem root `utom-deploy` user a release kezelésére.
- Külön, minimális jogosultságú `utom-web` és `utom-worker` service user, ha a host policy ezt támogatja.
- Javasolt layout:

```text
/srv/utom/releases/<commit>/
/srv/utom/current -> /srv/utom/releases/<commit>
/srv/utom/shared/.env
/srv/utom/shared/log/
/srv/utom/shared/backups/
/srv/utom/shared/tmp/
```

- A secret env csak `/srv/utom/shared/.env` vagy secret manager runtime injektálás lehet; érték nem kerülhet Gitbe.

## Services

- `utom-web.service`: `npm run start -- -p <loopback-port>`, `After=network-online.target mysql.service`, restart policy és readiness check.
- `utom-worker.service`: `node pipeline/cron.js`, explicit worker token, DB dependency, single active instance a staging első körében.
- Optional systemd timers: email outbox, rate-limit cleanup, backup és maintenance; minden timer külön engedélyezendő.
- Production backfill, paid AI, payment, analytics és demo bootstrap OFF.

## Reverse proxy and TLS

- Nginx vagy Caddy terminálja a TLS-t, az app loopbacken figyel.
- ACME certificate staging hostnévre; renewal failure alert kötelező.
- Proxy a forwarded headereket felülírja/szűri; `UTOM_TRUST_PROXY_HEADERS=true` csak ezen proxy mögött.
- `UTOM_ALLOWED_ORIGIN` explicit staging origin.
- Request body/timeout/connection limit és security headers először stagingen mérendő.

## Environment categories

- Identity: `NODE_ENV`, `APP_MODE`, `NEXT_PUBLIC_APP_URL`.
- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Runtime: `UTOM_OFFLINE_MODE=false`, `DB_WRITE_ENABLED`, `BACKGROUND_JOBS_ENABLED`, `FEED_FETCH_ENABLED`.
- Internal auth: `UTOM_INTERNAL_WORKER_TOKEN`, `UTOM_API_KEY`, `UTOM_ALLOWED_ORIGIN`, `UTOM_TRUST_PROXY_HEADERS`.
- Auth/email: CAPTCHA keys, `EMAIL_OUTBOX_ENCRYPTION_KEY`, optional `MAIL_*` staging sink.
- Flags: V2, paid AI, payment, analytics, demo and video flags explicitly OFF.

## Backup, monitoring and validation

- Staging DB backup és restore próba kötelező, legalább egy másik storage helyre másolva.
- Monitor: public liveness, protected readiness, DB connections, worker heartbeat, pending/failed/stale article, RSS failures, disk, memory, backup age.
- Validation sorrend: clean OS → Node/npm → MySQL → migration 001→059 → build → services → HTTPS → readiness → browser/auth → Premium mock/entitlement → normal RSS → backup/restore → rollback → load → worker+read.

## Rollback

- Release symlink visszaállítása csak kompatibilis schema esetén.
- Migration mismatch vagy data issue esetén web/worker stop, backup restore terv és owner approval.
- Minden rollback után readiness, browser smoke és worker heartbeat újra PASS kell.
