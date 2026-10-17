# UTOM AI article illustrations V1

## Purpose and safety boundary

The illustration system enriches already completed articles. It is deliberately outside the canonical article state machine: an image-provider, budget, conversion, or storage failure never changes an article from `done` and never resets `processed=1`. The worker only discovers articles already in that terminal publication state.

The feature is off by default (`IMAGE_GEN_ENABLED=false`). It has no public prompt endpoint and accepts no arbitrary user prompt. A real Cloudflare request additionally requires server-only account credentials. Tests use injected providers and consume no quota.

## Flow

1. `pipeline/image-worker.js` inserts one `article_images` job per completed article.
2. A worker claims the row with a UUID token. All heartbeats and terminal writes are fenced by article ID, worker ID, and claim token.
3. `image_prompt` applies `UTOM_EDITORIAL_V1`, records its fingerprint, and writes a durable audit row to `article_processing_steps`.
4. Policy returns `generate`, `fallback_only`, or `skip`. Sensitive or context-free articles use a category fallback.
5. A ready image from the same article cluster is reused only when provider, model and prompt version match. The source article is recorded explicitly.
6. Before every external attempt the worker atomically reserves a conservative neuron estimate in `image_generation_daily_usage`. Unknown real usage never releases the reservation. A terminal HTTP 400 is the narrow exception: Cloudflare rejected the request contract before a successful inference, so the worker atomically releases that reservation while retaining the request counter. HTTP 400 is never retried automatically. Network errors, timeouts, 429 and 5xx keep their reservation because inference consumption is unknown, preserving the hard daily upper bound.
7. Cloudflare Workers AI receives native `FormData` with only `prompt`, `width`, `height`, and the optional `seed`. The runtime supplies the multipart boundary; the application does not set `Content-Type`. The bounded response is then validated by a native-free metadata parser for JPEG, PNG or WebP magic, declared MIME and the exact 1024×576 dimensions. The validated original raster is written atomically under `public/article-images/YYYY/MM/DD/`; its extension and database MIME follow the actual bytes.
8. `image_generate` records the terminal result. The feed API exposes a path only for `ready` rows.

The fingerprint determines one bounded set of `.jpg`, `.png` and `.webp` recovery candidates. If the file is committed but the terminal database update is interrupted, a stale-claim retry finds and validates the matching raster, then repairs the database state without a second provider request or budget reservation. The database does not claim an extension before provider bytes have been validated.

## Legacy CPU compatibility and optional optimization

The supported production VPS uses `QEMU Virtual CPU version 2.5+` without SSE4.2. The image pipeline therefore has no mandatory native image dependency and does not require an x86-64-v2 CPU. Metadata validation reads only bounded headers/chunks and never fully decodes an image.

Sharp is an optional dependency and optional optimization capability. `IMAGE_GEN_OPTIMIZE_WITH_SHARP=false` is the default and stores the validated original raster. When `IMAGE_GEN_OPTIMIZE_WITH_SHARP=true`, Sharp is loaded lazily; successful optimization is revalidated before storage. A missing module, unsupported CPU, or optimization error emits `article_image_optimizer_unavailable` once per process and safely falls back to the original raster. `IMAGE_GEN_WEBP_QUALITY` only affects this optional path.

## Prompt and content policy

The prompt uses the article title, summaries, category, keywords, and non-person entity mentions when present. It requests a restrained editorial illustration and explicitly prohibits text, letters, numbers, logos, watermarks, fake charts, unsupported implications, graphic imagery, and identifiable real-person likenesses. This reduces risk but does not replace editorial review.

## Provider controls

- Provider: Cloudflare Workers AI
- Model: `@cf/black-forest-labs/flux-2-klein-4b`
- Timeout: 45 seconds by default
- Concurrency: 1 by default
- Retries: at most 2 after the initial request
- Circuit breaker: opens after 3 consecutive failures for 5 minutes
- Daily budget: 8000 conservatively reserved neurons by default
- Maximum response: 15 MiB

Authentication failures are terminal for the job. HTTP 429, HTTP 5xx, network failures, and timeouts are retryable within the configured limit. Malformed JSON, invalid base64, undersized data, unsupported magic, MIME/magic disagreement, malformed metadata, excessive dimensions, and non-1024×576 images fail closed to the frontend fallback.

The circuit breaker is process-local. This is appropriate for the current single-VPS worker deployment; multiple independent worker processes would each have their own failure counter and would require a shared breaker before horizontal scaling.

## Continuous worker operations

Apply migrations `063` and `064` before enabling the worker. No later migration is required for continuous operation. `articles.id` is a monotonic `BIGINT UNSIGNED AUTO_INCREMENT`, so the first rollout uses an explicit, restart-stable article-ID boundary. `article_images` is the durable queue and state source: every loop idempotently materializes missing rows only for completed articles above that boundary, then atomically claims eligible work through the existing lease token and `FOR UPDATE SKIP LOCKED` fencing. The same boundary is applied to existing pending/failed rows, so a pre-existing historical job cannot bypass materialization protection. The canonical article pipeline never calls or waits for the image provider.

Automatic operation is fail-safe. With the default `IMAGE_GEN_BACKFILL_EXISTING=false`, an enabled automatic worker refuses to start unless `IMAGE_GEN_MIN_ARTICLE_ID` is a non-negative integer. Setting `IMAGE_GEN_BACKFILL_EXISTING=true` is an explicit operator decision to remove the boundary and is never the default. The startup event records the effective cutoff, backfill flag and one-time counts for excluded historical articles, eligible articles and pending jobs; idle cycles do not repeat these counts.

`npm run image:worker` is a foreground, long-running process. It immediately drains pending work up to `IMAGE_GEN_CONCURRENCY` (default `1`). It sleeps for `IMAGE_WORKER_IDLE_MS` (default `2000`, accepted range 250–60000 ms) only after the queue is empty, so there is no delay between backlog items and a newly eligible article is normally noticed within one idle interval plus its database query time. This is deliberately short database polling for the single-VPS V1 architecture: there is no cron, systemd timer, Redis or message broker.

The provider, storage adapter and process-memory circuit breaker live for the complete process lifetime. Active claims receive a heartbeat at most every 30 seconds and at one third of the configured stale-claim interval. A job exception is logged and isolated; the loop continues with the next article. Database-loop failures use bounded exponential backoff from twice the idle interval up to 30 seconds. `mysql2` supplies fresh pooled connections after a transient disconnect; a fatal configuration error exits non-zero for systemd supervision.

`SIGTERM` and `SIGINT` interrupt an idle wait immediately, prevent further claims and allow already claimed work to finish. The provider timeout and bounded retry count bound normal shutdown: with the defaults, allow up to approximately 150 seconds for three 45-second attempts and retry delays. Fencing keeps a force-killed claim non-terminal; after the stale lease interval, a replacement worker either validates and adopts the already committed fingerprint file or safely retries. A deploy may therefore delay one image, but cannot change the parent article state or let an old worker overwrite a newer claim.

When `IMAGE_GEN_ENABLED=false`, the continuous process logs `worker_disabled` and remains idle until shutdown. Prefer stopping and disabling the unit when generation is intentionally disabled. Missing credentials, an unsupported provider, or an enabled automatic worker without either a cutoff or explicit backfill opt-in are startup failures.

### First production activation

1. With the image worker stopped, read the current maximum article ID: `SELECT COALESCE(MAX(id),0) FROM articles;`.
2. Set that exact value as `IMAGE_GEN_MIN_ARTICLE_ID`. Do not derive the boundary from process startup time.
3. Keep `IMAGE_GEN_BACKFILL_EXISTING=false` and set `IMAGE_GEN_ENABLED=true` with the documented server-only provider credentials.
4. Start the single continuous systemd worker and verify `article_image_worker_started` reports the expected `minArticleId`, `backfillExisting=false`, and backlog counts.
5. Confirm that only subsequently inserted articles (`article.id > IMAGE_GEN_MIN_ARTICLE_ID`) are automatically materialized and claimed.

For example, a cutoff of `112` excludes IDs `1..112` and makes `113+` eligible. Restarting the worker with the same environment preserves the exact boundary. A ready historical image such as article `112` remains untouched.

### Historical backfill

There is no automatic historical backfill by default. `IMAGE_GEN_BACKFILL_EXISTING=true` deliberately enables it and should only be used in a separately reviewed operation. For one old article, use `npm run image:regenerate -- <articleId>`: its incremented `force_revision` is the narrow durable operator override that lets the normal worker claim that one historical row without widening the automatic cutoff. The explicit one-article smoke similarly bypasses discovery only for its selected article and remains limited to one provider request.

For a bounded troubleshooting drain, use:

```text
npm run image:worker:once
```

The one-shot command uses the same claims, service and policy, drains currently eligible jobs, closes its database pool and exits. The real provider smoke remains a separate one-article command and never enters the continuous loop.

### systemd service

Install one service only; do not install a timer or cron entry. Adjust the paths to the deployed release layout:

```ini
[Unit]
Description=UTOM AI Article Image Worker
After=network-online.target utom.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/srv/utom/app
EnvironmentFile=/etc/utom/production.env
ExecStart=/usr/bin/npm run image:worker
Restart=always
RestartSec=5
TimeoutStopSec=180
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`PrivateTmp=true` is compatible with the default image storage because `IMAGE_GEN_STORAGE_ROOT=public/article-images` resolves under `WorkingDirectory`, not under `/tmp`. Do not point production image storage into `/tmp` when this hardening option is enabled. The process does not daemonize or respawn itself; JSON stdout/stderr is intended for journald.

Expected lifecycle events are `article_image_worker_started`, `article_image_claimed`, terminal `article_image_ready`/`article_image_fallback`/`article_image_failed`, `article_image_worker_stopping`, and `article_image_worker_stopped`. Idle polls are intentionally silent. The startup event contains provider, model, concurrency, idle interval, rollout policy and a one-time backlog summary, but never credentials. `article_image_worker_loop_failed` includes the chosen database backoff. The existing database rows provide last per-article failure state; a separate monitoring subsystem or public health endpoint is outside V1 scope.

Troubleshooting order:

1. Check the startup/config event and `IMAGE_GEN_ENABLED`.
2. Check MySQL connectivity and that migrations `063` and `064` are present.
3. Inspect `article_images.image_status`, `last_error_code`, heartbeat and worker fencing fields.
4. Confirm the configured storage directory is writable by the service user.
5. Use `npm run image:worker:once` only with the continuous unit stopped when an isolated drain is required.

To queue a controlled developer regeneration:

```text
npm run image:regenerate -- <articleId>
```

The command increments the row revision and returns it to `pending`; the next worker run generates a new fingerprint. It does not call Cloudflare itself.

A real provider smoke is intentionally opt-in and quota-bearing. It requires `RUN_CLOUDFLARE_IMAGE_SMOKE=1`, `IMAGE_GEN_ENABLED=true`, credentials, a migrated environment, and an eligible completed article whose image is not already ready:

```text
npm run image:smoke
```

Do not run the smoke against production as part of ordinary verification.
For a controlled smoke after the continuous service is installed, stop the worker unit first, run the one-shot smoke, then start the unit again. This avoids the normal worker racing the deliberately reset smoke article.

After deploying this compatibility hotfix, the controlled production smoke may be repeated on the VPS with `IMAGE_GEN_OPTIMIZE_WITH_SHARP=false`. It resets only its selected non-ready image job, disables recovery and cluster reuse, disables retries, and enforces exactly one provider request. It exits non-zero for fallback, quota exhaustion, provider/storage/validation failure, missing DB readiness, or a missing/invalid file. Confirm its explicit `REAL CLOUDFLARE IMAGE SMOKE: PASS`, then disable generation again if the rollout window requires it. Never place credentials in command history or repository files.

## Frontend behavior

The API returns `image_url`, `image_status`, and `image_source_type`. Only ready, fingerprinted paths matching `/article-images/YYYY/MM/DD/<article>-<hash>.(jpg|jpeg|png|webp)` render. The API, filesystem layer, cache-header route and frontend consumers enforce the same shape, so absolute paths and traversal segments cannot be projected. These content-addressed generated URLs receive a one-year immutable cache header; fallback assets are outside that route. File extensions let the static server emit the correct browser MIME. Feed images are lazy-loaded with explicit dimensions; detail images reserve a 16:9 area. Missing or broken images use a category-tinted fallback without layout shift. Provider-generated images show `AI illusztráció`.

## Structured events

The worker emits JSON lines with `component=article-image-worker` and events including `worker_disabled`, `article_image_ready`, `article_image_reused`, `article_image_fallback`, `article_image_attempt_failed`, `worker_complete`, and `worker_failed`. Prompts and credentials are excluded from logs.
