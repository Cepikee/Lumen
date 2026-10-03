# UTOM V2 M6 – Entity resolution

Status: M6 COMPLETE; paid provider remains disabled by the later Q09 provider/budget decision.

## M5/M6 boundary

| Area | M5 evidence | M6 implementation |
|---|---|---|
| Normalization | `lib/v2/entity-normalization.js` | reused; no second normalizer |
| Exact canonical and alias lookup | `lookupExactEntity` | reused and short-circuited |
| Q06 confidence/ambiguity policy | `entity-resolution-policy.js` | unchanged and authoritative |
| Candidate generation | not in M5 | bounded repository query, max 20 candidates |
| Contextual scoring | not in M5 | deterministic token/type/language/context scoring |
| Semantic escalation | not in M5 | injected, mock-first, bounded review recommendation |
| Persistence | alias observation only | mention link + confidence and graph history, caller transaction |
| Automatic merge | explicitly excluded | still excluded |

## Acceptance-gap ledger

The ledger uses 21 independently testable M6 capabilities extracted from the M6 specification. `COMPLETE` means the behavior is implemented and covered by a targeted regression. The semantic provider boundary is complete in mock-first form; the real provider/budget remains a later owner decision (Q09/M12) and is not invoked.

| Requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Reuse M5 exact canonical lookup | COMPLETE | `resolveEntityMention`, exact short-circuit test | none |
| Reuse M5 exact alias lookup | COMPLETE | repository delegation and M5 regression | none |
| Preserve Q06 confidence thresholds | COMPLETE | policy regression and persistence gate | none |
| Preserve ambiguity precedence | COMPLETE | same-name candidate and Q06 tests | none |
| Bounded candidate generation | COMPLETE | repository `findEntityCandidates`, bound regression | none |
| Type-aware candidates | COMPLETE | repository filter and mismatch regression | none |
| Language-aware candidates | COMPLETE | repository filter and scorer regression | none |
| Deterministic candidate ordering | COMPLETE | `ORDER BY e.id`, ranking regression | none |
| Deterministic contextual scoring | COMPLETE | token/type/source evidence scorer | none |
| Candidate result contract | COMPLETE | normalized status/method/evidence/version result | none |
| Same-name different entity safety | COMPLETE | equal-score ambiguity regression | none |
| Alias collision safety | COMPLETE | M5 collision remains authoritative | none |
| Semantic escalation boundary | COMPLETE | bounded injected resolver, candidate membership validation | real provider deferred to Q09 |
| AI output validation | COMPLETE | invalid candidate/confidence is quarantined | none |
| AI cannot bypass ambiguity/Q06 | COMPLETE | escalation returns review only | none |
| Mention link persistence | COMPLETE | repository update regression | none |
| Resolution confidence history | COMPLETE | append-only confidence insert regression | none |
| Graph mutation audit | COMPLETE | operation-key audit insert regression | none |
| Retry/idempotency and conflict guard | COMPLETE | resolved retry and conflicting entity tests | none |
| Feature flag OFF / ON routing | COMPLETE | runtime OFF/ON and M4 extraction-batch chain targeted tests | none |
| Automatic entity merge | N/A | separate merge lifecycle; no M6 merge write | M7+ governed merge policy |

## Persistence contract

`persistEntityResolution` expects a caller-owned transaction. It locks the mention row, rejects a conflicting already-resolved entity, updates only unresolved/review/ambiguous mentions, and appends graph and confidence history. The operation key is deterministic, and an already-resolved identical mention is idempotent. No schema change was required: `v2_entity_mentions`, `v2_confidence_history`, and `v2_entity_graph_history` in schema 057 represent the M6 state and audit fields.

## AI and cost boundary

The default runtime makes zero provider calls. A caller may inject a mock resolver for ambiguous candidates. Its input contains only the normalized mention, bounded candidate IDs, and structured context fields; raw article text and secrets are excluded. Output must select one returned candidate and a finite 0..1 confidence. The result remains `review` and is never persisted as an automatic link. A paid provider and budget policy are intentionally deferred to Q09/M12.

## Targeted validation

- `tests/unit/v2-entity-resolution-m6.test.cjs`
- `tests/unit/v2-entity-resolution-policy.test.cjs`
- `tests/unit/v2-entity-resolution.test.cjs`
- M4 extraction and M5 normalization/resolution regressions
- `tests/integration/mysql-v2-entity-resolution-m6.test.cjs` on isolated MySQL 8 test schema

No migration was added; the schema contract remains at 057.
