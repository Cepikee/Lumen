# Decisions

Projekt: UTOM.HU / Lumen V2
Owner decision date: 2026-10-02
Decision authority: USER / PRODUCT OWNER
Branch: `develop/utom-recovery`

The M1.1 contract freeze based on these decisions is complete in
`docs/UTOM_V2/M11_CONTRACT_FREEZE.md` (2026-10-03). That document is the
canonical pre-implementation contract record; it does not authorize runtime
implementation beyond the next explicitly gated M1.2 step.

## EXISTING REPOSITORY CONSTRAINT

V2 is additive to the current Lumen MySQL, Node pipeline and Next.js application. Existing feed, authentication, pipeline and premium behavior remains compatible while V2 is introduced behind a disabled-by-default boundary.

## USER / PRODUCT DECISIONS – M1 OWNER DECISION GATE

The following five decisions were explicitly approved by the owner. They are product decisions, not merely technical recommendations.

### M1-D01 – V2 source pack

- **Decision:** OPTION A – approve the V2 specification pack as the official product and architecture source, with the remaining non-blocking questions tracked separately.
- **Owner status:** APPROVED
- **Rationale:** M1 needs one authoritative vocabulary and traceability source while still allowing later decisions where the plan explicitly permits them.

### M1-D02 – Entity taxonomy

- **Decision:** OPTION A – use a controlled initial entity vocabulary with additive future extension.
- **Approved initial types:** `person`, `company`, `organization`, `location`, `project`, `product`, `topic`.
- **Owner status:** APPROVED
- **Rationale:** Stable types protect identity, indexing, API contracts and reviewable entity merging while allowing later additions.

### M1-D03 – Legacy compatibility and migration

- **Decision:** OPTION A – use additive V2 migrations; do not delete or rename legacy tables or columns in M1.
- **Owner status:** APPROVED
- **Rationale:** Current Lumen feed, authentication and pipeline behavior must remain available while V2 is introduced incrementally.

### M1-D04 – Temporal baseline

- **Decision:** OPTION A – store V2 timestamps in UTC and apply an explicit Budapest presentation and business-day policy.
- **Owner status:** APPROVED
- **Rationale:** A single storage baseline avoids DST and cross-endpoint inconsistencies while keeping Hungarian user-facing presentation possible.

### M1-D05 – AI diagnostic retention

- **Decision:** OPTION A – store AI run metadata and redacted references by default; do not retain unrestricted raw provider output in M1.
- **Owner status:** APPROVED
- **Rationale:** This preserves operational traceability while controlling privacy, retention and storage cost. A separately approved additive raw-payload policy may be introduced later.

## CODEX TECHNICAL RECOMMENDATIONS

- Start with MySQL relational graph tables. Add a graph database only after measured traversal and scale evidence.
- Keep V2 disabled by default during M1.
- Keep payment and billing actions disabled until a later owner-approved milestone.
- Record every later decision with owner, date and rationale.

## REMAINING OPEN QUESTIONS

The M1-blocking questions above are resolved. The following questions remain open for their later milestones and do not block M1 start: source trust weighting, manual review roles, payment and billing lifecycle, separate reporting database, graph database choice, and detailed timeline business-day presentation rules beyond the approved UTC storage baseline. Q07 is resolved for M9: merge and split authority remain review-only. Q09 is resolved for M12 below.

### Q06 – Confidence thresholds (M5)

- **Decision:** PRECISION-FIRST CONFIDENCE POLICY – `autoResolveMin=0.95`, `reviewMin=0.80`.
- **Owner status:** APPROVED
- **Owner decision date:** 2026-10-03
- **Rationale:** Confidence alone never resolves identity. A single exact, type-compatible, non-ambiguous candidate may resolve at or above 0.95; 0.80–0.9499 remains review/unresolved; below 0.80 remains unresolved. Ambiguity always wins, and M5 never performs automatic entity merge.

No recommendation outside the approved M1-D01–M1-D05 and Q06 decisions is a final product decision.

### Q07 – Event merge authority (M9)

- **Decision:** REVIEW-ONLY EVENT MATCHING – M9 may create deterministic merge/split recommendations with evidence, but it must not mutate event identity through automatic merge or split.
- **Automatic merge:** NO
- **Automatic split:** NO
- **Owner status:** APPROVED
- **Owner decision date:** 2026-10-03
- **Rationale:** A false historical merge is more damaging than deferred review; later lifecycle/policy work may add explicit mutation authority.

### Q09 – AI provider and budget (M12)

- **Decision:** OpenAI is the sole primary paid provider at launch. Automatic multi-provider failover is disabled.
- **Provider model configuration:** `AI_SMALL_MODEL` and `AI_LARGE_MODEL`; concrete model IDs are deployment configuration, never domain-code constants.
- **Paid AI default:** disabled in development, test and staging; production requires explicit `UTOM_PAID_AI_ENABLED=true`, a provider credential and an allowed router decision.
- **Budget policy:** monthly soft 12,000 HUF, monthly hard 15,000 HUF, daily soft 350 HUF, daily hard 500 HUF, per-article hard 5 HUF, per-step hard 2 HUF.
- **Escalation:** small model first; maximum one large-model escalation per article lifecycle; deterministic and cache paths always precede paid calls.
- **Owner status:** APPROVED
- **Owner decision date:** 2026-10-03
- **Rationale:** A single provider and explicit hard caps keep launch behavior auditable and reversible. Provider failover, payment and currency conversion changes require separate decisions.
