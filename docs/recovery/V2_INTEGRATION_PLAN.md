# V2 staged production integration plan

V2 is additive and feature-flagged. This document is a plan, not authorization to enable it. V2.2 semantic research remains excluded.

| Stage | Capability | Current state | Required data and worker | Cost/failure policy | Backfill and rollback | Acceptance gate |
|---|---|---|---|---|---|---|
| V2-A | Entity extraction and normalization | Implemented, tested, optional shadow caller exists in the canonical pipeline | Raw article text; `entity_extraction` optional durable step | Bounded provider call; optional step may skip without failing V1 | Start with new articles; disable `UTOM_V2_ENABLED` to stop writes | Exact evidence offsets, idempotent persistence, no V1 output change |
| V2-B | Entity resolution, claims and claim evidence | Implemented and tested; no canonical pipeline caller | A separate bounded post-extraction worker using durable `v2_processing_steps` | Fail closed per item; preserve unresolved outcomes; cost router required for paid calls | Small ID range, resumable backfill; disable worker and keep additive rows | MySQL idempotence, evidence integrity, unsupported-claim threshold, cost ceiling |
| V2-C | Relations, events, matching and timelines | Implemented and tested; read APIs exist, writers not wired | Resolved entities/claims; ordered post-processing worker | No V1 publication dependency; partial projection hidden | Feature flag per projection; rebuild derived rows from evidence | Stable matching, temporal boundaries, pagination and browser acceptance |
| V2-D | Source comparison, conflicts and confidence history | Implemented and tested; read API exists, writer chain not wired | Multi-source event membership and evidence | Winner remains null without explicit policy; no automatic truth claim | Enable read-only comparison first; rollback by disabling endpoints | False-conflict fixture, provenance and audit-history verification |
| V2-E | Premium intelligence panels | UI/API implemented behind entitlement and frontend/backend flags | Stable V2 read models and premium session | No billing implied; errors must fall back without exposing data | Per-user feature flag; disable public flag to hide UI | Entitlement E2E, malformed-response and real-browser acceptance |

## Subsystem status

| Subsystem | Implemented | Tested | Production caller | Recommendation |
|---|---:|---:|---:|---|
| ingestion provenance | yes | yes | entity shadow path creates envelope; full handoff is partial | include in V2-A evidence |
| dedup/cluster adapter | yes | yes | optional projection in pipeline | retain shadow-only |
| entity extraction/normalization | yes | yes | optional pipeline caller | first staged candidate |
| entity resolution | yes | yes | no | V2-B |
| claims/evidence | yes | yes | no | V2-B after entity gate |
| relations | yes | yes | no | V2-C |
| events/event matching | yes | yes | no | V2-C |
| timeline/temporal graph | yes | yes | read API only | V2-C |
| conflicts/confidence | yes | yes | read API only | V2-D |
| source comparison | yes | yes | API/UI behind flags | V2-D read-only first |
| AI cost router | yes | yes | no canonical worker | required before paid V2 calls |
| premium intelligence | yes | yes | API/UI behind flags | V2-E after read-model gates |

Every stage requires structured started/completed/failed events, backlog and cost metrics, a disabled-by-default flag, a bounded backfill, an explicit rollback switch and an acceptance test using production-shaped data.
