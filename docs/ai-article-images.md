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

## Operations

Apply migrations `063` and `064` before enabling the worker. Set server-only values from `.env.example`, then invoke `npm run image:worker` from the scheduler used for other background jobs. The command performs one bounded drain and exits, which makes overlapping scheduler invocations safe through DB claims.

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

After deploying this compatibility hotfix, the controlled production smoke may be repeated on the VPS with `IMAGE_GEN_OPTIMIZE_WITH_SHARP=false`. It resets only its selected non-ready image job, disables recovery and cluster reuse, disables retries, and enforces exactly one provider request. It exits non-zero for fallback, quota exhaustion, provider/storage/validation failure, missing DB readiness, or a missing/invalid file. Confirm its explicit `REAL CLOUDFLARE IMAGE SMOKE: PASS`, then disable generation again if the rollout window requires it. Never place credentials in command history or repository files.

## Frontend behavior

The API returns `image_url`, `image_status`, and `image_source_type`. Only ready, fingerprinted paths matching `/article-images/YYYY/MM/DD/<article>-<hash>.(jpg|jpeg|png|webp)` render. The API, filesystem layer, cache-header route and frontend consumers enforce the same shape, so absolute paths and traversal segments cannot be projected. These content-addressed generated URLs receive a one-year immutable cache header; fallback assets are outside that route. File extensions let the static server emit the correct browser MIME. Feed images are lazy-loaded with explicit dimensions; detail images reserve a 16:9 area. Missing or broken images use a category-tinted fallback without layout shift. Provider-generated images show `AI illusztráció`.

## Structured events

The worker emits JSON lines with `component=article-image-worker` and events including `worker_disabled`, `article_image_ready`, `article_image_reused`, `article_image_fallback`, `article_image_attempt_failed`, `worker_complete`, and `worker_failed`. Prompts and credentials are excluded from logs.
