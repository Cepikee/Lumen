# M16 – Premium intelligence

## M16 definition

**Exact name:** Premium intelligence.

**Product goal:** expose evidence-backed V2 context, conflict references and temporal history only to a server-verified active premium user.

**Free/premium boundary:** anonymous, non-premium and expired users receive no premium data. The entitlement is loaded from the existing server-side session/user implementation; client flags and query parameters are ignored.

**Input:** exactly one canonical `eventId` or `claimId`, with bounded `page` and `limit`.

**Output:** `v2.premium-intelligence.1` envelope containing the existing event/claim context, the M15 source comparison projection, redacted conflict references, and premium timeline history when an event timeline exists. Empty scopes are explicit and do not fabricate analysis.

**AI role:** none in this deterministic slice. No provider stack or direct provider call was added.

**Deterministic role:** entitlement gate, input validation, canonical M13/M15 read models, M10 timeline projection and redaction of internal conflict/audit fields.

**Cost routing:** no AI path is present, therefore M12 is not bypassed and provider calls remain zero.

**Persistence:** read-only over existing V2 tables; no migration, write, cache or new history table.

**API/frontend boundary:** new server endpoint `GET /api/v2/premium/intelligence`. Existing legacy premium proxy and UI remain unchanged. A dedicated V2 premium panel is outside the frozen M16 output specification and is not invented here.

**Non-goals:** payment, billing, upgrade actions, source ranking, winner/trust/bias scoring, automatic conflict resolution, raw provider output, internal confidence/cost audit and prompt-generated claims.

## Acceptance-gap matrix

| ID | Requirement | Status | Evidence | Dependency | Remaining |
|---|---|---|---|---|---|
| M16-01 | Server-side canonical entitlement | COMPLETE | route calls `getCurrentPremiumEntitlement` after V2 gate | auth/session/users | none |
| M16-02 | Anonymous response | COMPLETE | route contract regression; 401 mapping | session | none |
| M16-03 | Non-premium response | COMPLETE | route contract regression; 403 mapping | entitlement core | none |
| M16-04 | Expired entitlement response | COMPLETE | shared entitlement implementation and existing regression | entitlement core | none |
| M16-05 | Malformed scope/page/limit validation | COMPLETE | `validatePremiumInput`, unit regression | M13/M15 input rules | none |
| M16-06 | Canonical event/claim context | COMPLETE | `getEvent`/`getClaim` reuse | M8–M11/M13 | none |
| M16-07 | M15 source comparison reuse | COMPLETE | `compareSourcesDetailed` reuse | M15 | none |
| M16-08 | Conflict redaction/projection | COMPLETE | allowlisted conflict fields only | M11 | none |
| M16-09 | Temporal history projection | COMPLETE | premium event timeline read with bounded limit | M10 | none |
| M16-10 | Empty/not-found/error states | COMPLETE | stable empty projection and route mappings | M13/M15 contracts | none |
| M16-11 | No ranking/winner/trust/bias leakage | COMPLETE | contract and projection regressions | product boundary | none |
| M16-12 | No AI/provider side effect | COMPLETE | deterministic implementation and tests | M12 | none |
| M16-13 | Payment/pricing/upgrade policy | N/A | no payment/provider contract exists | owner Q08 | not implemented by design |
| M16-14 | Dedicated V2 premium frontend panel | N/A | M16 spec freezes backend intelligence boundary only | later frontend rollout | not invented |

**Matrix totals:** COMPLETE 12, PARTIAL 0, NOT STARTED 0, BLOCKED 0, N/A 2.

## Validation

- M16 targeted unit tests: PASS (5/5).
- Existing premium entitlement/proxy regressions: PASS in offline suite.
- Offline suite after M16 changes: PASS (352/352).
- MySQL: M15 fixture already validated canonical source comparison; M16 adds read-only queries and has no migration.
- TypeScript: PASS.
- ESLint: 0 errors (existing warnings only).
- Import check: PASS.
- `npm run check`: PASS, including production build (74 static pages).
- Paid provider calls: 0.

## Findings and final state

- New M16 application findings: 0.
- Open fixable bugs: 0.
- Owner questions: 0 for this deterministic slice.
- M16 implementation is intentionally uncommitted until its final quality gate.

`M16 IMPLEMENTATION: COMPLETE`

`M16 COMPLETE: YES – deterministic entitlement, context, conflict redaction and history projection passed the available quality gates`

`M16 BLOCKING OWNER QUESTIONS: 0`

`OPEN FIXABLE BUGS: 0`
