# V2 staged production integration plan

V2 is additive and feature-flagged. This document is a plan, not authorization to enable it. V2.2 semantic research remains excluded.

| Stage | Capability | Current state | Required data and worker | Cost/failure policy | Backfill and rollback | Acceptance gate |
|---|---|---|---|---|---|---|
| V2-A | Entity extraction and normalization | Canonical post-V1 shadow caller implemented; default OFF and not deployed | Completed canonical article and schema 064 `v2_processing_steps` | Deterministic local provider only; bounded extraction; all failures contained | New articles only; disable `UTOM_V2_SHADOW_ENABLED` to stop writes | Exact evidence offsets, idempotent persistence, no V1 output change |
| V2-B | Entity resolution, claims and claim evidence | Included in the same bounded shadow orchestrator; default OFF and not deployed | Persisted mentions, conservative resolver and validated deterministic claims | False-claim prevention first; no paid escalation; malformed output writes nothing | No historical backfill in this phase; additive V2 rows may remain | Entity/claim rerun safety, evidence integrity, provider calls zero |
| V2-C | Relations, events, matching and timelines | Conservative claim-backed relations, article-local events and article-local timeline projection integrated; cross-article matching remains deferred | Resolved endpoints/participant, validated claim, persisted evidence and persisted event membership | Unsupported, negated, conditional, uncertain, attributed, planned or temporally conflicting candidates abstain | New articles only; disable shadow flag; derived rows are additive | Exact evidence, temporal precision, transactional writes, rerun safety, zero external calls |
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
| relations | yes | yes | post-completion shadow, claim-backed only and OFF | review conservative edges before graph reads |
| events/event matching | yes | yes | post-completion shadow, article-local only and OFF | review article-local candidates before cross-article matching |
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
     -> evidence-based claim-to-relation projection
     -> relation + relation evidence in one transaction
     -> evidence-based claim-to-event projection
     -> event-matching validation (article-local; no merge)
     -> event + article/entity memberships in one transaction
     -> evidence-backed article-local timeline projection
     -> timeline items in one transaction
     -> completed/failed shadow state + structured metrics
```

The orchestrator imports no OpenAI, Cloudflare, V2.2, temporal or conflict implementation. It reuses the canonical V2 relation repository after a zero-provider claim projection. V1 transactions are already closed before it starts.

## Shadow contract

- Flags: both `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` are required. Either false means zero shadow reads, writes and provider calls.
- Eligibility: the article must exist, be `done`, have `processed=1`, have a canonical URL and non-empty retained text. The current article schema has no soft-delete column; a missing row or purged text is skipped.
- Idempotence: `v2_processing_steps` owns a content fingerprint and claim token; completed fingerprints are reused. Existing entity-run, mention, resolution-history, claim and evidence identities remain the persistence-level duplicate guards.
- Failure: invalid envelope/output, timeout, DB failure or lost claim becomes `v2_shadow_failed`; the orchestrator resolves a failed result and the pipeline wrapper catches any unexpected escape. V1 is never marked failed or recovery-required by this path.
- Cost: the cost router must select `deterministic`; entity and claim providers must identify as local `deterministic-semantic`. Any other provider is rejected before invocation. There is no paid fallback.
- Relations: only an allowlisted canonical relation predicate already present on a validated claim is eligible. Two distinct explicit entity IDs must both occur in the current resolution results, and persisted claim/evidence IDs are mandatory. No raw-text relation provider is called by shadow.
- Relation safety: negated, conditional, uncertain, non-observed, attributed, unsupported or unresolved claims abstain. Unknown validity remains null; publication time is never substituted. The shadow operation key includes article, claim/evidence identity, endpoints, predicate, exact span and explicit validity, preventing unsafe cross-article collapse.
- Events: only `BUS_PURCHASE`, completed `EVENT_STATUS=pilot-start` and completed `OPENING_EVENT=true` from the existing claim vocabulary are eligible. A persisted evidence row and exactly one explicit or uniquely evidence-contained resolved participant are mandatory. Every output is a review-only `candidate`.
- Event safety: negated, conditional, uncertain, non-observed, attributed or unsupported claims abstain. Unknown event time stays null; article publication time is never substituted. Article-local evidence identity prevents automatic cross-article merging.
- Timeline: only a successfully persisted event with its article membership evidence may become an article-owned timeline item. Exact timestamps/dates remain points; month/year precision becomes an explicitly labelled interval; ranges retain both bounds; unknown time remains null and sorts after known time. Relative, malformed, planned and same-event conflicting times abstain. No temporal order is interpreted as causality.
- Backfill: none is started or exposed by this change. The existing bounded incremental backfill remains separate and is not a shadow activation mechanism.

## Structured events and metrics

Events are `v2_shadow_started`, `v2_shadow_completed`, `v2_shadow_failed`, `v2_shadow_skipped`, `v2_shadow_paid_ai_blocked`, and the relation/event/timeline `started`, `completed`, `skipped`, `failed` lifecycle events. Completion includes processed/succeeded/failed/skipped counts, entity/claim/relation/event/timeline counts and durations, unknown timeline time count, deterministic cost route and `externalProviderCalls: 0`. Logs contain IDs, statuses and bounded errors, never article bodies or credentials.

## Source comparison readiness

The current read model can compare evidence for an individual claim and can compare claims across an event. This shadow phase now creates conservative claim-backed relation observations plus evidence-backed article and participant memberships for article-local event candidates. It deliberately does not merge events or shadow relation observations across articles and does not create cross-article canonical claim groups, timelines or conflicts. Therefore useful multi-source event comparison still requires a separately reviewed cross-article matching policy.

## Existing relation architecture audit

| Module | Input | Output / persistence | Current callers | Flags / idempotence | External dependency / failure mode |
|---|---|---|---|---|---|
| `relation-extraction.js` | article identity, raw text and structured candidates | strict canonical predicate/entity/evidence validation | runtime wrapper and tests | V2 runtime gate; no writes | malformed output is rejected as a whole |
| `relation-extraction-provider.js` | raw text plus supplied entities | mock or local deterministic candidates | tests and standalone runtime only | caller-controlled; read-only | deterministic module only; shadow deliberately does not call it |
| `runtime-relation-extraction.js` | validated input and provider | completed/invalid/failed result | tests and canonical fixtures | `UTOM_V2_ENABLED`; zero persistence | provider exceptions become bounded failed results |
| `relation-extraction-repository.js` | resolved endpoints, allowlisted predicate, exact evidence and caller operation key | `v2_entity_relations` plus `v2_relation_evidence` | tests and shadow orchestrator | DB unique keys; caller owns transaction | rejects missing/archived entities; any SQL failure rolls back in shadow transaction |
| `shadow-relation-projection.js` | validated claims, persisted claim evidence and current resolution results | conservative relation candidates or structured skips | shadow orchestrator | article + claim/evidence + endpoints + predicate + exact span + explicit interval | zero provider/network calls; malformed alignment throws before writes |
| relation read APIs | persisted graph rows and evidence | read models | flagged V2 readers | read-only | user-visible activation remains deferred |

Schema 064 already contains `v2_entity_relations` and `v2_relation_evidence`; no migration is required. The raw-text deterministic relation provider remains available to its existing tests but is not an authoritative shadow writer. This phase requires a validated claim with explicit resolved endpoints, so coverage is intentionally lower than the standalone extractor.

## Existing event architecture audit

| Module | Input | Output / persistence | Current callers | Idempotence | External dependency / limitation |
|---|---|---|---|---|---|
| `event-matching.js` | already structured event candidate | validated review candidate and deterministic key | runtime wrapper, tests, shadow event projection | normalized key | no extraction; permissive type syntax |
| `runtime-event-matching.js` | structured candidate and V2 gate | candidate or invalid/disabled result | canonical E2E, tests, shadow orchestrator | read/write free | zero provider calls |
| `event-matching-repository.js` | validated candidate plus evidence IDs | `v2_events`, `v2_event_articles`, `v2_event_entities` | canonical E2E, MySQL tests, shadow orchestrator | event key, article unique key and locked entity upsert | caller owns transaction |
| `shadow-event-projection.js` | validated claims, persisted claim evidence, resolved mentions | conservative article-local candidates or structured skips | shadow orchestrator | article + semantic role + exact evidence key | three safe predicates only; no paid or V2.2 dependency |
| `temporal-graph*` | persisted evidence-backed event plus explicit temporal scope | article-owned timelines and event items | shadow orchestrator, tests and flagged read paths | repository keys; caller-owned transaction | local MySQL only; cross-article projection remains deferred |
| event read APIs | persisted event memberships | event/context/source-comparison views | authenticated/flagged API readers | read-only | cross-article comparison remains sparse until matching is approved |

The schema already provides event, article membership and participant membership tables with claim-evidence foreign keys. No migration is needed. The existing matcher can suggest review merges, but it is not invoked for cross-article mutation in this phase because shared entity, generic predicate and nearby time are insufficient proof of event identity.

The event layer supplies explicit event time or safely unknown time, stable article-local identity, article membership, participant roles and evidence provenance. The timeline layer now consumes those records without enabling cross-article identity or matching.

## Existing temporal architecture audit and integrated article timeline

| Module | Input | Output / persistence | Callers | Idempotence / flags | External dependency / failure mode |
|---|---|---|---|---|---|
| `temporal-graph.js` | owner, item identity, explicit temporal point/bounds, status and ordering key | validated temporal projection and deterministic as-of ordering | runtime wrapper, repository tests | pure validation; `UTOM_V2_ENABLED` is applied by runtime | none; invalid dates and intervals fail closed |
| `runtime-temporal-graph.js` | an already structured projection | completed/disabled/invalid read-only result | canonical tests | V2 server flag; zero writes | none; validation errors are returned |
| `temporal-graph-repository.js` | validated timeline item or owner read query | schema 064 `v2_timelines` and `v2_timeline_items`; generic and article-local readers | shadow orchestrator, entity/article/timeline APIs, tests | unique owner/item/order keys; caller owns transactions | MySQL only; conflicting temporal data throws, incomplete article provenance is excluded from reads |
| `shadow-timeline-projection.js` | persisted article-local events plus the exact event candidates that produced them | article-owned event items with precision, stable order and evidence references | shadow orchestrator | both shadow flags inherited; event ID + scope ordering identity | no provider/network; malformed, relative, planned, missing-evidence or conflicting inputs abstain |
| timeline API | owner/id, as-of, cursor, limit | envelope with empty or enriched item collection | flagged V2 readers | read-only; V2 server flag | bad input is 422, DB failure is 500, no data is 200 + empty |
| article context API/client | article ID and article-local timeline page | safe read model with event ID/type, time precision, label and status | V2 article panel behind browser flag | read-only; server and browser V2 flags | malformed response fails closed in the client |

The input authority is the persisted event and its `v2_event_articles.evidence_id` chain. Raw article text cannot create a timeline item. The owner is the current article and each item references the existing event ID, so the first scope is exactly one article → its validated events. A read joins event membership and claim evidence back to the same article before exposing an item. Cross-article ordering, event merging, source comparison, conflict winner selection and historical backfill remain deferred.

Schema 064 has sufficient nullable point/bound columns and stable ordering keys, so this phase requires no migration. Year and month values use interval bounds plus an ordering-key precision marker; the API returns that marker as `timePrecision`, preventing a technical lower bound from being presented as an invented January 1/day fact. Article history reads exclude future starts but retain already ended historical ranges. Unknown time has null temporal fields and a stable `unknown` ordering suffix. Same-event conflicting temporal scopes abstain rather than creating a winner.

## Rollout and rollback

1. Deploy code with both flags false and verify V1 publication is unchanged.
2. On a controlled non-production or staging worker, enable `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` for new completed articles only.
3. Watch the structured completion/failure/skip counts, duration, entity/claim volume and evidence failures. Do not enable browser V2 panels from this signal alone.
4. Roll back instantly by setting `UTOM_V2_SHADOW_ENABLED=false` and restarting the worker. Existing additive V2 rows may remain; V1 needs no data rollback.
5. Historical backfill, event graph activation, user-visible rollout and production enablement each require a separate approval and acceptance gate.
