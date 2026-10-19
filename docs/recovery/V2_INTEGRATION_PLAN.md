# V2 staged production integration plan

V2 is additive and feature-flagged. This document is a plan, not authorization to enable it. V2.2 semantic research remains excluded.

| Stage | Capability | Current state | Required data and worker | Cost/failure policy | Backfill and rollback | Acceptance gate |
|---|---|---|---|---|---|---|
| V2-A | Entity extraction and normalization | Canonical post-V1 shadow caller implemented; default OFF and not deployed | Completed canonical article and schema 064 `v2_processing_steps` | Deterministic local provider only; bounded extraction; all failures contained | New articles only; disable `UTOM_V2_SHADOW_ENABLED` to stop writes | Exact evidence offsets, idempotent persistence, no V1 output change |
| V2-B | Entity resolution, claims and claim evidence | Included in the same bounded shadow orchestrator; default OFF and not deployed | Persisted mentions, conservative resolver and validated deterministic claims | False-claim prevention first; no paid escalation; malformed output writes nothing | No historical backfill in this phase; additive V2 rows may remain | Entity/claim rerun safety, evidence integrity, provider calls zero |
| V2-C | Relations, events, matching and timelines | Implemented and tested; read APIs exist, writers not wired | Resolved entities/claims; ordered post-processing worker | No V1 publication dependency; partial projection hidden | Feature flag per projection; rebuild derived rows from evidence | Stable matching, temporal boundaries, pagination and browser acceptance |
| V2-D | Source comparison, conflicts and confidence history | Implemented and tested; read API exists, writer chain not wired | Multi-source event membership and evidence | Winner remains null without explicit policy; no automatic truth claim | Enable read-only comparison first; rollback by disabling endpoints | False-conflict fixture, provenance and audit-history verification |
| V2-E | Premium intelligence panels | UI/API implemented behind entitlement and frontend/backend flags | Stable V2 read models and premium session | No billing implied; errors must fall back without exposing data | Per-user feature flag; disable public flag to hide UI | Entitlement E2E, malformed-response and real-browser acceptance |

## Subsystem status

| Subsystem | Implemented | Tested | Production caller | Recommendation |
|---|---:|---:|---:|---|
| ingestion provenance | yes | yes | entity shadow path creates envelope; full handoff is partial | include in V2-A evidence |
| dedup/cluster adapter | yes | yes | optional projection in pipeline | retain shadow-only |
| entity extraction/normalization | yes | yes | post-completion shadow orchestrator, OFF | first staged candidate |
| entity resolution | yes | yes | post-completion shadow orchestrator, OFF | conservative exact/provisional resolution |
| claims/evidence | yes | yes | post-completion shadow orchestrator, OFF | persist only validated evidence-backed output |
| relations | yes | yes | no | V2-C |
| events/event matching | yes | yes | no | V2-C |
| timeline/temporal graph | yes | yes | read API only | V2-C |
| conflicts/confidence | yes | yes | read API only | V2-D |
| source comparison | yes | yes | API/UI behind flags | V2-D read-only first |
| AI cost router | yes | yes | no canonical worker | required before paid V2 calls |
| premium intelligence | yes | yes | API/UI behind flags | V2-E after read-model gates |

Every stage requires structured started/completed/failed events, backlog and cost metrics, a disabled-by-default flag, a bounded backfill, an explicit rollback switch and an acceptance test using production-shaped data.

## Canonical shadow call graph

```text
pipeline/cron.js
  V1 processArticlePipeline
  -> pipelineState.finishArticle (status=done, processed=1 is durable)
  -> worker completion heartbeat
  -> runPostCompletionShadow (second no-throw boundary)
  -> lib/v2/shadow-intelligence.js
     -> dual feature gate + local-provider allowlist
     -> load completed canonical article
     -> claim v2_processing_steps fingerprint
     -> runtime-ai-cost-router (deterministic route, providerCalls=0)
     -> ingestion-envelope
     -> deterministic entity extraction + validation
     -> entity-extraction-repository
     -> conservative entity-resolution batch
     -> deterministic claim extraction + exact evidence validation
     -> claim-extraction-repository
     -> completed/failed shadow state + structured metrics
```

The orchestrator imports no OpenAI, Cloudflare, V2.2, relation, temporal or conflict implementation. V1 transactions are already closed before it starts.

## Shadow contract

- Flags: both `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` are required. Either false means zero shadow reads, writes and provider calls.
- Eligibility: the article must exist, be `done`, have `processed=1`, have a canonical URL and non-empty retained text. The current article schema has no soft-delete column; a missing row or purged text is skipped.
- Idempotence: `v2_processing_steps` owns a content fingerprint and claim token; completed fingerprints are reused. Existing entity-run, mention, resolution-history, claim and evidence identities remain the persistence-level duplicate guards.
- Failure: invalid envelope/output, timeout, DB failure or lost claim becomes `v2_shadow_failed`; the orchestrator resolves a failed result and the pipeline wrapper catches any unexpected escape. V1 is never marked failed or recovery-required by this path.
- Cost: the cost router must select `deterministic`; entity and claim providers must identify as local `deterministic-semantic`. Any other provider is rejected before invocation. There is no paid fallback.
- Events: no safe deterministic text-to-event candidate extractor exists in the stable V2 layer. The result records `deferred_no_safe_candidate_extractor`; no event row is fabricated.
- Backfill: none is started or exposed by this change. The existing bounded incremental backfill remains separate and is not a shadow activation mechanism.

## Structured events and metrics

Events are `v2_shadow_started`, `v2_shadow_completed`, `v2_shadow_failed`, `v2_shadow_skipped` and `v2_shadow_paid_ai_blocked`. Completion includes processed/succeeded/failed/skipped counts, entity/claim/event counts, duration, deterministic cost route and `externalProviderCalls: 0`. Logs contain IDs, statuses and bounded errors, never article bodies or credentials.

## Source comparison readiness

The current read model can compare evidence for an individual claim and can compare claims across an event. This shadow phase creates article/source-backed claims, but it deliberately does not create event membership, cross-article canonical claim groups for unresolved subjects, relations, timelines or conflicts. Therefore source comparison stays read-only and feature-flagged; useful multi-source event comparison still requires the deferred event writer and reviewed cross-article resolution policy.

## Rollout and rollback

1. Deploy code with both flags false and verify V1 publication is unchanged.
2. On a controlled non-production or staging worker, enable `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` for new completed articles only.
3. Watch the structured completion/failure/skip counts, duration, entity/claim volume and evidence failures. Do not enable browser V2 panels from this signal alone.
4. Roll back instantly by setting `UTOM_V2_SHADOW_ENABLED=false` and restarting the worker. Existing additive V2 rows may remain; V1 needs no data rollback.
5. Historical backfill, event graph activation, user-visible rollout and production enablement each require a separate approval and acceptance gate.
