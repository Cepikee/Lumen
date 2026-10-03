# M12 – AI Cost Router

## Exact scope

The router is a policy boundary, not a provider client. It consumes an explicit step, input fingerprint, deterministic eligibility, cache/provider state, circuit state and budget context. It returns one of `deterministic`, `cache`, `small_model`, `large_model` or `review`, and records the reason, budget snapshot, provider/model and escalation flag. It never calls a provider itself and never treats a provider result as truth.

M11 supplies the confidence/conflict context; M12 supplies the cost decision before any later provider call. M12 does not implement entity extraction, claim extraction, event matching, conflict detection, provider SDKs, billing, or automatic truth selection.

## Acceptance matrix

| ID | Requirement | Status | Evidence | Remaining |
|---|---|---|---|---|
| M12-01 | Deterministic-first route | COMPLETE | `ai-cost-router.js`, unit | none |
| M12-02 | Compatible cache route | COMPLETE | route ordering unit | none |
| M12-03 | Explicit small/large model escalation | COMPLETE | escalation unit and Q09 policy | one large escalation per article; provider policy resolved |
| M12-04 | Hard daily/monthly/per-article/per-step budget gate | COMPLETE | explicit budget validation, projected-cost and boundary unit | canonical Q09 limits |
| M12-05 | Circuit breaker gate | COMPLETE | circuit-open unit | none |
| M12-06 | Provider outage and retry classification | COMPLETE | `classifyProviderOutcome` unit | none |
| M12-07 | Malformed output quarantine/deferred state | COMPLETE | malformed-output unit | none |
| M12-08 | Decision audit persistence | COMPLETE | `ai-cost-router-repository.js`, MySQL | none |
| M12-09 | Retry/idempotency/concurrency/rollback | COMPLETE | MySQL 2/2 integration | none |
| M12-10 | Feature OFF/ON side-effect boundary | COMPLETE | runtime unit | none |
| M12-11 | Provider/budget product policy | COMPLETE | Q09 in `90_DECISIONS.md` and canonical policy module | none |
| M12-12 | Paid provider activation | N/A | mock/default boundary; no paid calls | later owner approval |

## Contract

`v2.cost-router.1` is deterministic and versioned. Missing or invalid budget context fails closed; persistence requires an article identity because the existing nullable `article_id` unique key cannot guarantee idempotency for NULL values. No migration is needed: schema 051 `v2_ai_decisions` already stores route, reason, budget snapshot, provider/model and escalation.

## Validation

- M12 unit regression: 8/8 PASS.
- M12 MySQL 8.0.46 integration: 2/2 PASS (retry, two-connection concurrency, rollback).
- Paid provider calls: 0.
- Q09 is resolved: OpenAI primary, explicit production opt-in, and canonical HUF budget caps are recorded in `90_DECISIONS.md`.

## Status

`M12 IMPLEMENTATION: COMPLETE`

`M12 COMPLETE: YES`

`M12 IMPLEMENTATION BLOCKER: NONE`
