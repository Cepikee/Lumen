# UTOM V2.2 – Round 3 final generalization and MySQL canonical gate

## Scope

Round 3 is local and uncommitted. Round 2 baseline commit: `c111f88`
(`origin/develop/utom-recovery` matches local HEAD). Production, payment,
paid AI and V2.1 runtime paths were not changed. `AGENTS.md`, `CLAUDE.md`
and `docs.zip` remain untouched and untracked.

## Held-out dataset

- 12 scenarios, 26 source articles
- expected entities: 37
- expected relations: 2
- expected claims: 39
- expected events: 8
- expected conflicts: 1
- expected temporal changes: 2
- expected omissions: 2
- source-derived gold checks: 86/86

The held-out corpus is independent from the core and dense fixtures. It uses
different names, organisations, places, sentence shapes, historical/current
near-misses, namesakes, omissions and multi-event wording.

## Frozen first pass

The first pass was executed before any held-out-driven extractor change. Brain
hashes:

| File | SHA-256 |
|---|---|
| `lib/v2/deterministic-semantic.js` | `EB62BC13A1E9804C25E6C4A3DFD7ECEB77EC18887ECEAB9EDB88C399649E01E3` |
| `lib/v22/deterministic-text-provider.cjs` | `508D61CA3C9E33ADEED7383263A59ABB101FA71EEFF51B7D3F5027488C4119D7` |

The machine-readable frozen summary is
`15_heldout_first_pass_frozen.json`.

| Metric | Frozen first pass |
|---|---:|
| Entity precision / recall | 0.5294 / 0.2432 |
| Relation precision / recall | N/A / 0.0000 |
| Claim precision / recall | 0.4118 / 0.1795 |
| Event matching accuracy | 0.0000 |
| Conflict precision / recall | 0.5000 / 1.0000 |
| False-conflict rate | 0.5000 |
| Temporal change recall | 0.0000 |
| Omission precision / recall | 1.0000 / 0.5000 |
| Attribution / evidence / negation | 0.8571 / 1.0000 / 1.0000 |
| Modality accuracy | 0.7143 |
| Truly unsupported rate | 0.0000 |
| Critical fact recall | 0.2105 |

## Generalization findings and fixes

| Finding | Root cause | Fix | Regression |
|---|---|---|---|
| V22-INT-F022 | Appositive role clauses did not expose both the named person and full organisation. | Added source-local role-clause extraction and longest organisation selection. | Held-out H02 relation assertion. |
| V22-INT-F023 | Colon-labelled event lists could produce a combined title; event-entity context was also treated as an event. | Normalize labels, split explicit lists and ignore event-entity context. | Core V22-S20 and held-out H05/H12 assertions. |
| V22-INT-F024 | Repeated local matches projected the same canonical claim more than once. | Deduplicate by canonical claim identity while retaining distinct values/modalities/attributions. | Core/dense duplicate projection and focused precision suite. |
| V22-INT-F025 | Day and accented-name boundaries reduced held-out matching. | Preserve Unicode letter boundaries and source-derived day wording in held-out fixtures. | 15-test focused suite and held-out derivability check. |

## After-generalization scorecard

Machine-readable result: `15_heldout_after_generalization.json`.

| Metric | Core | Dense | Held-out |
|---|---:|---:|---:|
| Entity precision / recall | 0.8400 / 0.9130 | 0.7600 / 0.9500 | 0.6552 / 0.5135 |
| Relation precision / recall | 1.0000 / 1.0000 | 1.0000 / 1.0000 | 1.0000 / 0.5000 |
| Claim precision / recall | 0.6078 / 0.6739 | 0.7273 / 0.6000 | 0.4118 / 0.1795 |
| Event matching accuracy | 1.0000 | 1.0000 | 0.7500 |
| Conflict precision / recall | 1.0000 / 1.0000 | N/A | 1.0000 / 1.0000 |
| False-conflict rate | 0.0000 | N/A | 0.0000 |
| Temporal change recall | 1.0000 | 1.0000 | 0.0000 |
| Omission precision / recall | 1.0000 / 0.6667 | 1.0000 / 0.8000 | 1.0000 / 0.5000 |
| Attribution / evidence / negation | 0.8387 / 1.0000 / 1.0000 | 0.7895 / 1.0000 / 1.0000 | 0.8571 / 1.0000 / 1.0000 |
| Modality accuracy | 0.9032 | 0.9474 | 0.7143 |
| Truly unsupported rate | 0.0000 | 0.0000 | 0.0000 |
| Information coverage | 0.7692 | 0.7125 | 0.3778 |
| Critical fact recall | 0.8750 | 0.6705 | 0.3421 |

The generalization result is **PARTIAL**: the safety floors hold and the
role/event/duplicate fixes are covered, but unseen claim vocabulary and
temporal-change wording still leave material recall gaps. This is a quality
finding, not a fabricated PASS.

## Quality gates

- `npm run benchmark:v22:generate`: PASS.
- `npm run benchmark:v22:deterministic`: PASS.
- `npm run benchmark:v22:fp`: PASS; 0 truly unsupported, 0 semantic mismatch,
  0 duplicate, 21 evaluator-normalization mismatches.
- Focused precision regression: 15/15 PASS.
- Full offline suite: 450/450 PASS.
- TypeScript: PASS; local import check: PASS; ESLint: 0 errors / 402
  warnings; `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities;
  `npm run check`: PASS; production build: 75/75 PASS.
- MySQL canonical gate: PASS on a freshly initialized disposable datadir and
  loopback database `utom_v22_r3_test`, MySQL `8.0.46-0ubuntu0.24.04.4`,
  Ubuntu WSL2, dedicated port 33306, and a temporary test user. Full
  integration runner: 57 PASS / 0 FAIL / 1 SKIP. The single skip is the
  FFmpeg executable capability test; HTTP session/reset and PIN/premium
  lifecycle tests were enabled and passed. Identity query returned version,
  vendor comment, hostname and port as required.

## MySQL canonical scenario evidence

The Round 3 minimum scenarios are covered by the existing raw-input and
repository integration paths; no derived table was directly seeded:

| Scenario | Evidence | Result |
|---|---|---|
| Numeric conflict, unresolved winner | V21 canonical raw article E2E + M11 conflict history | PASS; both observations persist and winner is `null` |
| Semantic non-conflict | M11 unit-compatible/disjoint-scope controls and M15 source comparison | PASS; no conflict row for distinct semantics |
| Temporal change | M10 temporal graph integration | PASS; prior and current items remain queryable with bounded as-of read |
| Multi-event | M9 event matching integration | PASS; event and membership identities are idempotent and distinct |
| Explicit relation/evidence | M7 relation/evidence integration | PASS; relation row and multiple evidence rows are transactional |
| Source omission/read models | M13 read models and M15 source comparison | PASS; source-only/shared coverage is preserved |
| Namesake/identity safety | M4/M5/M6 entity extraction, alias and resolution suites | PASS; ambiguous names remain review-bound |

## Release decision

Round 3 remains **PARTIAL** despite the green quality and MySQL gates. The
held-out acceptance target is not met: claim recall is 0.1795, temporal-change
recall is 0, and event matching is 0.75. No Round 3 commit or push was made.
Further generalization or an explicit owner acceptance decision is required
before release packaging.
