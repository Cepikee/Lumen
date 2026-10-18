# UTOM.hu / Lumen

UTOM is a Hungarian news aggregation and analysis platform. The production core ingests configured RSS sources, processes articles through a durable AI pipeline, serves a Next.js web application and can generate article illustrations through a separate queue worker.

The canonical state and boundary between V1, V2 and V2.2 is documented in [`UTOM_CURRENT_STATE.md`](UTOM_CURRENT_STATE.md). Read that file before changing runtime wiring.

## Architecture

```text
configured RSS sources
  -> POST /api/fetch-feed (authenticated internal call)
  -> articles(status=pending)
  -> npm run pipeline:worker
  -> durable article steps + V1 projections
  -> articles(status=done, processed=1)
  -> Next.js web/API

completed articles
  -> npm run image:worker
  -> article_images queue
  -> public/article-images content-addressed files
```

The web process does not start background workers. Production workers are foreground processes supervised by systemd. Templates and operator notes are in [`ops/systemd/`](ops/systemd/) and [`docs/recovery/PRODUCTION_OPERATIONS.md`](docs/recovery/PRODUCTION_OPERATIONS.md).

## Runtime generations

- **V1 production core:** ingestion, summaries, categories, sentiment, keywords, trends, clickbait, clustering, related news, Speed Index, images, feed/Insights UI, authentication and premium entitlement.
- **V2 integration candidate:** additive entity/claim/event/timeline/source-comparison modules and guarded read APIs. Only the entity extraction shadow step has a canonical pipeline caller, and all V2 behavior remains disabled by default.
- **V2.2 research:** deterministic semantic/NLP experiments, benchmarks, blind tests and agent harnesses. It is not production-wired.

## Local development

Requirements: Node.js 24, npm and optionally MySQL 8 for integration tests.

```text
npm ci
copy .env.example .env.local
npm run dev
```

Safe defaults use offline mode, mock AI and disabled side effects. Do not place secrets in tracked files.

## Canonical commands

```text
npm run typecheck
npm run lint
npm run check:imports
npm run test:offline
npm run test:security
npm run build
npm run check
```

MySQL tests are opt-in and use a disposable test database configured by environment:

```text
npm run test:integration
```

Operational commands:

```text
npm run pipeline:worker
npm run image:worker
npm run email-outbox:process
npm run maintenance:run
npm run production:preflight
```

## Database migrations

The canonical migration chain is `db/migrations/001` through `064`. The runner records checksums and uses a MySQL advisory lock.

```text
npm run db:plan
npm run db:status
npm run db:migrate:local
```

`db:migrate:local` requires an explicit safe target and is never run by the web application. Never point development or CI commands at the production database.

## Production services

| Unit | Role |
|---|---|
| `utom.service` | Next.js web/API |
| `utom-pipeline.service` | canonical ingestion and article processing |
| `utom-image-worker.service` | optional article image generation |
| `utom-email-outbox.timer` | encrypted email outbox delivery |
| `utom-maintenance.timer` | bounded expiry and retention maintenance |

Repository units are templates, not proof that a target host has installed them. Run the preflight and follow the deployment instructions; this repository task does not deploy production.

## Security

The application uses server-side sessions, hashed reset/session tokens, shared database rate limits, internal worker authentication, origin and trusted-proxy policy, SSRF-safe outbound fetches, bounded bodies, premium entitlement checks and prompt-injection boundaries. Preserve fail-closed capability flags. Run `npm run test:security` and `npm audit --omit=dev` for security-sensitive changes.

## Documentation

- Current state: [`UTOM_CURRENT_STATE.md`](UTOM_CURRENT_STATE.md)
- Current documentation index: [`docs/current/README.md`](docs/current/README.md)
- Operations: [`docs/recovery/PRODUCTION_OPERATIONS.md`](docs/recovery/PRODUCTION_OPERATIONS.md)
- Validation: [`docs/recovery/VALIDATION_REPORT.md`](docs/recovery/VALIDATION_REPORT.md)
- Inventory: [`docs/recovery/repository-inventory.json`](docs/recovery/repository-inventory.json)
- V2 rollout plan: [`docs/recovery/V2_INTEGRATION_PLAN.md`](docs/recovery/V2_INTEGRATION_PLAN.md)
- Research index: [`docs/research/README.md`](docs/research/README.md)
- Historical index: [`docs/historical/README.md`](docs/historical/README.md)

Payment billing is not implemented. Híradó remains implemented but deferred and requires its documented media/runtime dependencies. Neither state should be inferred from UI placeholders alone.
