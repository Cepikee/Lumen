# UTOM current state

Canonical as of **2026-10-18**, verified against local commit `9b3161fd5aa8ccdeb8784f1c2366e40314426bcc` on `develop/utom-recovery`. This file supersedes historical progress and milestone documents for current operational decisions.

## Project

| Item | Current value |
|---|---|
| Product | UTOM.hu / Lumen |
| Framework | Next.js 16.4.2, React 19.2, Node.js 24 |
| Database | MySQL 8; canonical schema 064 |
| Host model | single Linux VPS, Next.js plus separate foreground workers, MySQL |
| Production deployment | not performed by this recovery pass |

## Production services

| Service | Purpose | Mode | Repository status | Known host status |
|---|---|---|---|---|
| `utom.service` | Next.js web and API | required continuous | existing external unit | reported live |
| `utom-pipeline.service` | canonical feed polling and article pipeline | required continuous | template added, `npm run pipeline:worker` | not proven installed |
| `utom-image-worker.service` | article illustration queue | optional continuous | template added, `npm run image:worker` | reported live |
| `utom-email-outbox.timer` | encrypted email delivery | timer + one-shot | template added | not proven installed |
| `utom-maintenance.timer` | expiry cleanup and optional raw-text retention | daily timer + one-shot | template added | not proven installed |

Repository templates are under `ops/systemd/`. They must be reviewed against the target host before installation.

## Canonical runtime paths

- **Ingestion:** `pipeline/cron.js` calls authenticated `POST /api/fetch-feed`; the route reads enabled source slugs from MySQL and persists through `lib/feed-ingestion.js`.
- **Sources:** Telex, 24.hu, Index, HVG, Portfolio, 444.hu and Origo have canonical identities/adapters. Runtime activation is controlled by `sources.is_active`.
- **Processing:** `pipeline/cron.js` is the only article writer. It uses durable claims, heartbeats, claim tokens, per-step state, external-operation uncertainty and stale recovery. Completion sets `status='done'` and `processed=1`.
- **Images:** `pipeline/image-worker.js` is a separate continuous queue consumer with rollout cutoff, heartbeat, circuit breaker, budget and content-addressed storage.
- **Web:** `npm start` serves the built Next.js application. It never initializes a worker.

The old 444 GitHub ingestion workflow is disabled and cannot run. `/api/receive-feed` remains an authenticated compatibility ingress but shares the canonical persistence logic.

## Important feature flags

Values are deliberately omitted.

| Flag | Meaning |
|---|---|
| `UTOM_OFFLINE_MODE` | master side-effect safety mode |
| `BACKGROUND_JOBS_ENABLED` | permits pipeline/maintenance worker startup |
| `FEED_FETCH_ENABLED` | permits canonical outbound RSS fetch |
| `DB_WRITE_ENABLED` | permits guarded database mutation paths |
| `UTOM_PAID_AI_ENABLED`, `REAL_AI_ENABLED`, `AI_PROVIDER` | paid AI/provider gates |
| `UTOM_V2_ENABLED` | server-side V2 shadow/read capability |
| `NEXT_PUBLIC_UTOM_V2_ENABLED` | browser V2 panels; must not exceed server authorization |
| `IMAGE_GEN_ENABLED`, `IMAGE_GEN_MIN_ARTICLE_ID`, `IMAGE_GEN_BACKFILL_EXISTING` | illustration worker and safe rollout |
| `EMAIL_SEND_ENABLED` | email transport side effect |
| `UTOM_RETENTION_EXECUTE` | destructive raw-text retention opt-in |
| `UTOM_TRUST_PROXY_HEADERS` | trusted reverse-proxy client identity policy |
| `PAYMENT_ENABLED` | billing gate; keep false because billing is not implemented |
| `VIDEO_GENERATION_ENABLED` | Híradó generation side effect |

Secret-bearing environment variable names are documented in `.env.example`; secret values must remain in the host environment file.

## Live V1 features

The production core includes article ingestion and publication, AI summaries, categories, sentiment, keywords, trends, clickbait scoring, clustering/related news, Speed Index, generated illustrations, homepage/feed, article detail, Insights, authentication/session/reset flows and premium entitlement enforcement.

## Implemented but not fully wired

- V2 entity extraction is available as an optional shadow pipeline step.
- V2 entity resolution, claims/evidence, relations, events/matching, temporal graph, conflicts/confidence and AI cost routing are implemented and tested but lack a complete canonical production writer chain.
- V2 read APIs and article/source/premium panels exist behind server and browser flags; they depend on populated V2 read models.
- Email, maintenance and pipeline unit templates exist in the repository but are not proof of host installation.

See `docs/recovery/V2_INTEGRATION_PLAN.md` for staged gates.

## Research only

V2.2 deterministic NLP, HuSpaCy/Stanza/local-worker experiments, semantic roles, attribution/scope/negation/numeric binding, blind tests, benchmarks and agent harnesses are research. Their locations are indexed in `docs/research/README.md`. Canonical production projection remains off.

## Deferred

- **Payments:** premium product and entitlement exist; billing/provider/checkout/webhook/reconciliation do not. Do not enable `PAYMENT_ENABLED`.
- **Híradó:** routes, player, archive, media and tests exist; further product work and production media dependencies are deferred. FFmpeg is optional and environment-dependent.
- **Advanced V2/V2.2:** no automatic production integration in this recovery pass.

## Database and migrations

- 64 contiguous migrations (`001`–`064`), no duplicate or empty version, latest schema 064.
- The static migration audit is safe, with two reviewed index-replacement warnings (`027`, `059`) and no critical finding.
- Critical uniqueness represented in schema includes users email/nickname, session token hash, password/PIN reset token, per-user video view, article URL identity, email operation key, article image per article and V2 operation/identity keys.
- The runner uses checksums, a migration ledger and advisory locking. MySQL execution results belong in the final validation report; static inspection alone is not an integration PASS.

## CI

- `.github/workflows/ci.yml` is the canonical push/PR quality gate.
- `.github/workflows/build.yml` is a manual complete check.
- Redundant standalone lint/depcheck workflows were archived under `archive/github-workflows/`; the old depcheck job referenced a package not installed by the repository.
- The old 444 workflow is retained as `archive/github-workflows/fetch-444.yml.disabled`, outside GitHub's active workflow directory.

## Current risks

1. Production installation and health of `utom-pipeline.service` is not proven; without it new articles are not processed automatically.
2. Email and maintenance timers are repository templates and may not yet be installed.
3. Production schema 064 and migration checksum drift must be verified on the host before deployment.
4. V2 read APIs can return sparse data until a bounded writer/backfill is approved.
5. V2.2 research lives in the same repository and must remain excluded from runtime wiring.
6. Email `uncertain` rows require operator reconciliation to avoid duplicate delivery.
7. Generated image storage is local to the release host and needs persistent-path/backup verification.
8. Híradó FFmpeg capability is environment-dependent and not a core release blocker.
9. Local untracked agent-run artefacts need an external research archive before workspace cleanup.
10. Payment UI/entitlement must not be interpreted as working billing.

## Next work

1. Review/install `utom-pipeline.service` in a controlled deployment window and verify one healthy worker plus stale-lease recovery.
2. Verify schema 064 and run production preflight against the intended host without exposing secrets.
3. Install email and maintenance timers, then monitor first activations and reconcile any uncertain email rows.
4. Decide whether to start V2-A shadow extraction using the staged acceptance plan.
5. Create a checksummed external archive for local V2.2 agent runs and historical root scratch files.

## Last verified

- Date: 2026-10-18 (Europe/Budapest)
- Branch: `develop/utom-recovery`
- Base commit: `9b3161fd5aa8ccdeb8784f1c2366e40314426bcc`
- Inventory: `docs/recovery/repository-inventory.json`
- Validation results: `docs/recovery/VALIDATION_REPORT.md`; production was not deployed.
