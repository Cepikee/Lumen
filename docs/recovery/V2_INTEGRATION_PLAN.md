# V2 staged production integration plan

V2 is additive and feature-flagged. This document is a plan, not authorization to enable it. V2.2 semantic research remains excluded.

| Stage | Capability | Current state | Required data and worker | Cost/failure policy | Backfill and rollback | Acceptance gate |
|---|---|---|---|---|---|---|
| V2-A | Entity extraction and normalization | Canonical post-V1 shadow caller implemented; default OFF and not deployed | Completed canonical article and schema 064 `v2_processing_steps` | Deterministic local provider only; bounded extraction; all failures contained | New articles only; disable `UTOM_V2_SHADOW_ENABLED` to stop writes | Exact evidence offsets, idempotent persistence, no V1 output change |
| V2-B | Entity resolution, claims and claim evidence | Included in the same bounded shadow orchestrator; default OFF and not deployed | Persisted mentions, conservative resolver and validated deterministic claims | False-claim prevention first; no paid escalation; malformed output writes nothing | No historical backfill in this phase; additive V2 rows may remain | Entity/claim rerun safety, evidence integrity, provider calls zero |
| V2-C | Relations, events, matching and timelines | Conservative claim-backed article events/timelines plus non-destructive cross-article read-time matching integrated; default OFF and not deployed | Resolved subject and explicit object role, validated claim, exact evidence, known time and compatible location | Missing discriminator/time/location proof abstains; semantic mismatches reject; no destructive merge | New articles only; disable V2 read/shadow flags; derived rows remain additive | Exact evidence, hard false-merge gates, deterministic grouping, rerun safety, zero external calls |
| V2-D | Source comparison, conflicts and confidence history | Evidence-backed claim-level comparison and conservative conflict detection integrated at read time; confidence/truth resolution remains deferred | Canonical sources, resolved entities, atomic claims, exact evidence and optional evidence-backed event membership | Only compatible `different_observation` candidates may conflict; winner/trust/bias remain null; no automatic truth claim | Existing V2 read flags; no comparison/conflict persistence or backfill | Exact proposition matching, missing-coverage safety, source symmetry, provenance and false-conflict prevention |
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
| events/event matching | yes | yes | article-local shadow writes plus source-comparison/premium read-time grouping, OFF | run controlled VPS multi-source acceptance before UI activation |
| timeline/temporal graph | yes | yes | read API only | V2-C |
| conflicts/confidence | conflict candidates yes; confidence/truth resolution deferred | yes | source-comparison and premium read APIs only | keep winner null and require exact evidence |
| source comparison | yes | yes | read API and dormant UI behind existing flags | backend read model ready; UI activation waits for accepted multi-source event membership |
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
- Events: only `BUS_PURCHASE`, completed `EVENT_STATUS=pilot-start` and completed `OPENING_EVENT=true` from the existing claim vocabulary are eligible. A persisted evidence row and exactly one explicit or uniquely evidence-contained resolved subject are mandatory; an explicit claim object is retained as an `object` role. Every persisted output remains an article-local review-only `candidate`.
- Event safety: negated, conditional, uncertain, non-observed, attributed or unsupported claims abstain. Unknown event time stays null; article publication time is never substituted. Cross-article matching is read-only and requires exact evidence-backed structured identity: type, resolved subject, explicit object-class role, exact known time, compatible location, predicate and claim state. Missing proof remains a candidate and hard mismatches reject.
- Timeline: only a successfully persisted event with its article membership evidence may become an article-owned timeline item. Exact timestamps/dates remain points; month/year precision becomes an explicitly labelled interval; ranges retain both bounds; unknown time remains null and sorts after known time. Relative, malformed, planned and same-event conflicting times abstain. No temporal order is interpreted as causality.
- Source comparison: composition happens at read time, outside the article-local writer. Canonical source rows, resolved canonical entity IDs, atomic claim semantics and exact claim evidence are mandatory. A shared proposition requires exact semantic compatibility across distinct sources; value/unit or temporal mismatch cannot become shared. Same-source articles merge into one source observation, and absent coverage never becomes denial.
- Conflicts: detection starts only from bidirectional `different_observation` source-comparison candidates. Both observations must have distinct canonical sources, resolved subject/object identity, exact claim evidence and matching predicate, type, temporal scope, attribution, modality, public status and unit dimension. Supported conflicts are disjoint numeric/range observations, explicit opposite polarity for the same value, and exclusive boolean/status/categorical values. Approximate, uncertain, conditional, unknown-time, cross-attribution, unresolved-entity, incompatible-unit and unsupported semantic cases abstain. Every candidate has `automaticWinner: null`; source count, order and majority never select truth.
- Backfill: none is started or exposed by this change. The existing bounded incremental backfill remains separate and is not a shadow activation mechanism.

## Structured events and metrics

Events are `v2_shadow_started`, `v2_shadow_completed`, `v2_shadow_failed`, `v2_shadow_skipped`, `v2_shadow_paid_ai_blocked`, the relation/event/timeline lifecycle events, `v2_event_match_started`, `completed`, `candidate`, `rejected`, `failed`, `v2_source_comparison_started`, `completed`, `skipped`, `failed`, and `v2_conflict_detection_started`, `completed`, `skipped`, `failed`. Event-match metrics include compared/accepted/candidate/rejected/abstained events, cross/same-source matches, duration and `externalProviderCalls: 0`. Logs contain IDs, statuses and bounded errors, never article bodies, evidence text or credentials.

## Integrated source comparison architecture

| Module | Input | Output / persistence | Current callers | Idempotence / flags | External dependency / failure mode |
|---|---|---|---|---|---|
| `source-comparison.js` | canonical source rows plus resolved, evidence-backed atomic claim observations | deterministic shared/source-only/not-covered/different-observation read model; no writes | read-model repository and tests | pure projection; stable semantic hash and source ordering | no provider/network; malformed, unresolved or evidence-free rows abstain |
| `conflict-history.js` read-time detector | bidirectional `different_observation` candidates from source comparison | deterministic evidence-backed potential conflicts with no winner; no writes | source-comparison and premium APIs | pure projection; symmetric fingerprints and source-neutral ordering | no provider/network; unsafe or semantically mismatched pairs abstain |
| `read-model-repository.js` | claim scope or event scope | bounded claim/source rows with canonical source and evidence provenance | source-comparison and premium APIs | read-only; existing V2 server gate at routes | event scope follows `event_articles.evidence_id`; missing proof yields no claim |
| source-comparison API | exactly one claim/event scope plus bounded pagination | V2 envelope, empty/insufficient/ready result and structured metrics | dormant article/Insights consumers | existing `UTOM_V2_ENABLED`; no new flag or persistence | invalid input 422, missing scope 404, DB error 500, no data 200 |
| client/hook/panel | validated response envelope | null-safe source and proposition display state | V2 article integration behind browser flag | abort + sequence guard; frontend flag OFF by default | malformed observations are excluded; insufficient evidence renders empty state |

Claim-level comparison remains canonical. Event-level comparison first resolves a conservative cross-article event group and then reads only the claim evidence referenced by memberships of accepted event IDs. Candidate/rejected events cannot enter the shared comparison or conflict scope. Matching, comparison and conflict detection are read-only; they never rank sources, select a winner or import V2.2 research.

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
| `event-matching.js` | structured article-local events, canonical roles, time and evidence | deterministic matched/candidate/rejected/abstain group plus canonical timeline descriptor | runtime wrapper, source-comparison/premium routes and tests | pure stable grouping; no writes | no title similarity, provider or network; missing proof abstains |
| `runtime-event-matching.js` | structured candidate and V2 gate | candidate or invalid/disabled result | canonical E2E, tests, shadow orchestrator | read/write free | zero provider calls |
| `event-matching-repository.js` | validated writer candidate or bounded read anchor | existing event tables for article-local writes; read-only structured observations/group resolution | shadow writer and V2 source-comparison/premium readers | existing write keys; read grouping is deterministic | MySQL only; exact evidence joins fail closed |
| `shadow-event-projection.js` | validated claims, persisted claim evidence, resolved mentions | conservative article-local candidates or structured skips | shadow orchestrator | article + semantic role + exact evidence key | three safe predicates only; no paid or V2.2 dependency |
| `temporal-graph*` | persisted evidence-backed event plus explicit temporal scope | article-owned timelines and event items; matching adds one canonical read-time descriptor with observation IDs | shadow orchestrator, tests and flagged read paths | repository keys; caller-owned transaction | local MySQL only; no destructive consolidation |
| event read APIs | persisted event memberships | event/context views plus matched source-comparison/premium scope | authenticated/flagged API readers | read-only | strict gates intentionally keep coverage sparse |

The schema already provides event, article membership and participant membership tables with claim-evidence foreign keys. No migration is needed. Cross-article identity is computed at read time and never mutates these rows. Shared entity, generic predicate, nearby publication time, title or keyword similarity are insufficient proof.

The event layer supplies explicit event time or safely unknown time, stable article-local identity, article membership, participant roles and evidence provenance. A match requires exact known event bounds and explicit object-class identity, so legacy subject-only rows safely remain candidates. The canonical timeline descriptor exposes one real-event anchor and its article observations without deleting local timelines.

## Existing temporal architecture audit and integrated article timeline

| Module | Input | Output / persistence | Callers | Idempotence / flags | External dependency / failure mode |
|---|---|---|---|---|---|
| `temporal-graph.js` | owner, item identity, explicit temporal point/bounds, status and ordering key | validated temporal projection and deterministic as-of ordering | runtime wrapper, repository tests | pure validation; `UTOM_V2_ENABLED` is applied by runtime | none; invalid dates and intervals fail closed |
| `runtime-temporal-graph.js` | an already structured projection | completed/disabled/invalid read-only result | canonical tests | V2 server flag; zero writes | none; validation errors are returned |
| `temporal-graph-repository.js` | validated timeline item or owner read query | schema 064 `v2_timelines` and `v2_timeline_items`; generic and article-local readers | shadow orchestrator, entity/article/timeline APIs, tests | unique owner/item/order keys; caller owns transactions | MySQL only; conflicting temporal data throws, incomplete article provenance is excluded from reads |
| `shadow-timeline-projection.js` | persisted article-local events plus the exact event candidates that produced them | article-owned event items with precision, stable order and evidence references | shadow orchestrator | both shadow flags inherited; event ID + scope ordering identity | no provider/network; malformed, relative, planned, missing-evidence or conflicting inputs abstain |
| timeline API | owner/id, as-of, cursor, limit | envelope with empty or enriched item collection | flagged V2 readers | read-only; V2 server flag | bad input is 422, DB failure is 500, no data is 200 + empty |
| article context API/client | article ID and article-local timeline page | safe read model with event ID/type, time precision, label and status | V2 article panel behind browser flag | read-only; server and browser V2 flags | malformed response fails closed in the client |

The input authority is the persisted event and its `v2_event_articles.evidence_id` chain. Raw article text cannot create a timeline item. The owner is the current article and each item references the existing event ID, so the first scope is exactly one article → its validated events. A read joins event membership and claim evidence back to the same article before exposing an item. Cross-article ordering, event merging, conflict winner selection and historical backfill remain deferred; source comparison consumes only separately proven claim/event evidence at read time.

Schema 064 has sufficient nullable point/bound columns and stable ordering keys, so this phase requires no migration. Year and month values use interval bounds plus an ordering-key precision marker; the API returns that marker as `timePrecision`, preventing a technical lower bound from being presented as an invented January 1/day fact. Article history reads exclude future starts but retain already ended historical ranges. Unknown time has null temporal fields and a stable `unknown` ordering suffix. Same-event conflicting temporal scopes abstain rather than creating a winner.

## Rollout and rollback

1. Deploy code with both flags false and verify V1 publication is unchanged.
2. On a controlled non-production or staging worker, enable `UTOM_V2_ENABLED=true` and `UTOM_V2_SHADOW_ENABLED=true` for new completed articles only.
3. Watch the structured completion/failure/skip counts, duration, entity/claim volume and evidence failures. Do not enable browser V2 panels from this signal alone.
4. Roll back instantly by setting `UTOM_V2_SHADOW_ENABLED=false` and restarting the worker. Existing additive V2 rows may remain; V1 needs no data rollback.
5. Historical backfill, event graph activation, user-visible rollout and production enablement each require a separate approval and acceptance gate.
