# UTOM current state

Canonical as of **2026-10-20**, based on local commit `2831e8737df9e0af8e02c8020950d5435a8f94bc` plus the current reviewable VPS acceptance harness working-tree change on `develop/utom-recovery`. This file supersedes historical progress and milestone documents for current operational decisions.

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
| `UTOM_V2_SHADOW_ENABLED` | explicit server-side post-completion V2 shadow writer opt-in; also requires `UTOM_V2_ENABLED` |
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

## Implemented but disabled V2 shadow path

- The canonical pipeline now has one post-completion V2 shadow orchestrator. It runs only after V1 has durably set `status='done'` and `processed=1` and has a second no-throw boundary in the worker.
- `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` are both required. The default remains OFF. No deployment or production configuration change was made.
- The shadow chain uses only the local deterministic cost route and providers: canonical envelope, entity extraction/normalization, idempotent mention persistence, conservative entity resolution, validated claim extraction, exact evidence persistence, claim-backed relations, conservative article-local event candidates and an article-local temporal projection.
- The shadow state reuses schema 064 `v2_processing_steps`; no migration was needed. A content fingerprint and claim token fence concurrent runs, completed reruns are reused, and failures remain retryable without altering V1.
- Paid/unknown providers fail closed before a DB read or provider invocation. OpenAI and Cloudflare are not imported by the orchestrator; external provider calls remain zero.
- Events are projected only from a small allowlist of existing claim predicates with persisted claim evidence and an unambiguous resolved subject; an explicit claim object is retained as an event role. Negated, conditional, uncertain, attributed, unsupported or evidence-free claims are skipped. Every persisted event remains article-local `candidate`; cross-article identity is now a non-destructive read-time projection.
- Relations are projected only from validated claims that already carry a canonical relation predicate, two explicit resolved entity IDs and persisted evidence. Negated, conditional, uncertain, attributed, unsupported, ambiguous or evidence-free claims abstain. Relation and relation-evidence writes use the existing V2 tables in one transaction and an article/evidence-scoped shadow identity.
- Event, article membership and participant membership writes use the existing V2 event tables in one transaction. Timeline rows are then written in a separate caller-owned transaction only for those persisted evidence-backed events. The article-local timeline preserves exact/date/month/year/range precision, retains unknown time, never substitutes publication time and excludes planned events. V2.2 research remains unwired.
- The timeline read path verifies the persisted event → article membership → claim evidence → article chain before returning an item. Empty timelines return a normal empty collection; malformed or incomplete provenance is hidden rather than presented as ready intelligence.
- Source comparison is a read-time composition over canonical source IDs and evidence-backed atomic claims. `shared` requires identical resolved subject/object, predicate, value/unit, temporal scope, attribution, qualifiers and public status across at least two distinct sources. Different values remain `different_observation` comparison candidates and missing coverage remains `not_covered`.
- Conflict detection is an additive read-time projection over bidirectional `different_observation` candidates. It emits only evidence-backed, source-distinct numeric/range, explicit polarity or status conflicts with equal entity, object, temporal, attribution, modality and unit semantics. Conditional, uncertain, unresolved, differently attributed, temporally mismatched or unit-incompatible observations abstain. It never ranks sources, treats majority as truth or selects a winner.
- Event-scoped comparison reads only the claim referenced by each event membership evidence row; it no longer treats every claim in a member article as event evidence. Claims with missing evidence, noncanonical sources or unresolved subject/object identities abstain. Same-source articles collapse to one source observation while retaining article and evidence references.
- Cross-article event matching reads bounded article-local events of the same type and accepts a group only when persisted evidence, resolved subject, explicit object/target/project/product, exact known temporal bounds, compatible resolved location, predicate and claim state all agree. Titles, keywords, categories and publication time are not inputs. Unknown time, missing discriminators and incomplete location proof remain candidates; hard semantic mismatches are rejected. No event row is merged or deleted.
- Matched event IDs feed the existing source-comparison and conflict projections at read time. The returned canonical timeline descriptor represents one anchor event with multiple article observations, while preserving every article-local event and evidence chain. Same-source observations remain one source identity and are never labelled independent confirmation.
- A standalone, fail-closed VPS acceptance harness is available through `npm run v2:acceptance:vps -- --article-ids=...`. It reads selected production inputs through a SQL allowlist, writes only to a guarded `utom_acceptance_*` database, runs fresh migrations and the canonical deterministic chain, and produces reports under `/tmp`. This has not yet been executed on the VPS and does not enable V2 globally.
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
4. Run the documented bounded multi-source acceptance command on the VPS with three owner-reviewed production article IDs. Keep the UI and historical backfill disabled until that run proves real persisted object/location/temporal coverage.
5. Create a checksummed external archive for local V2.2 agent runs and historical root scratch files.

## Last verified

- Date: 2026-10-20 (Europe/Budapest)
- Branch: `develop/utom-recovery`
- Base commit: `2831e8737df9e0af8e02c8020950d5435a8f94bc`
- Inventory: `docs/recovery/repository-inventory.json`
- Validation results: `docs/recovery/VALIDATION_REPORT.md`; production was not deployed.
