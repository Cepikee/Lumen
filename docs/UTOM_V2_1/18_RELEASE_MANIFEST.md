# UTOM V2.1 release manifest

## Release identity

- Commit: `3b54f65` (release baseline; későbbi dokumentációs commitok: `6a3bbd1`, `16345f6`, `60ed737`, `5e0a0be`, `1c588c7`, `3b54f65`)
- Branch: `develop/utom-recovery`
- Schema: `059`
- Node: `24.19.0`
- Next.js: `16.3.6`
- MySQL target: `8.x`; isolated evidence `8.0.46`
- Build: `75` route generation PASS
- Offline suite: `401/401 PASS`

## Required runtime configuration

Values are secret/runtime configuration and must never be committed:

- `NODE_ENV=production`, `APP_MODE=production`
- `NEXT_PUBLIC_APP_URL=https://<approved-host>`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `UTOM_OFFLINE_MODE=false`
- `DB_WRITE_ENABLED=true` only after staging gate
- `UTOM_INTERNAL_WORKER_TOKEN` (minimum 32 characters)
- `EMAIL_OUTBOX_ENCRYPTION_KEY` (32 bytes, hex or base64)
- `UTOM_ALLOWED_ORIGIN=https://<approved-host>`
- `UTOM_TRUST_PROXY_HEADERS=true` only behind the configured reverse proxy
- `UTOM_API_KEY` if the legacy/internal premium proxy is enabled
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` for production auth
- `TURNSTILE_SECRET_KEY` if the contact route uses Turnstile
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` when `EMAIL_SEND_ENABLED=true`

## Startup flags

Safe initial rollout:

- `UTOM_V2_ENABLED=false`
- `NEXT_PUBLIC_UTOM_V2_ENABLED=false`
- `UTOM_PAID_AI_ENABLED=false`
- `REAL_AI_ENABLED=false`
- `PAYMENT_ENABLED=false`
- `VIDEO_GENERATION_ENABLED=false` unless FFmpeg/Híradó is explicitly approved
- `UTOM_LOCAL_DEMO_CAPTCHA=false`
- `NEXT_PUBLIC_LOCAL_DEMO_CAPTCHA=false`
- `UTOM_DEV_DEMO_BOOTSTRAP=false`
- `NEXT_PUBLIC_ANALYTICS_ENABLED=false` until consent/analytics decision
- `FEED_FETCH_ENABLED` and `BACKGROUND_JOBS_ENABLED` only after worker/token/DB staging validation
- `EMAIL_SEND_ENABLED` only after provider and outbox-key validation

## V2 contract boundary

The release contains the schema-059 V2 provenance, entity, claim, relation, event, timeline, conflict/history and read-model contracts. V2 server and frontend flags remain independently controllable and OFF for the first production rollout.

## Required services

- reverse proxy with HTTPS
- Next.js web process bound to loopback
- one pipeline worker process
- scheduled maintenance/cleanup jobs
- MySQL 8.x
- backup job and off-host backup target
- log rotation and monitoring/readiness probes

## Known limitations and deferred items

- Full-text retention and source/TDM policy require owner approval.
- 444 remains `THIRD-PARTY / PROXY – HOLD`.
- Payment, paid AI, production hosting, DNS/Cloudflare and production alert provider are not implemented/configured.
- FFmpeg is a host capability skip.
- Local load/soak is not a VPS capacity proof; remote resource-constrained staging is required.
