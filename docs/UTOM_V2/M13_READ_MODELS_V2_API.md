# M13 – Read models és V2 API

## Scope

M13 adds a disabled-by-default, read-only V2 envelope boundary. It does not replace legacy routes, mutate knowledge state, expose raw database rows, expose provider payloads, or start premium/payment behavior.

## Implemented slice

- `v2.envelope.1` envelope with `data`, `meta` and safe `errors`.
- bounded ID, `asOf`, cursor and limit validation;
- deterministic base64url cursor encoding;
- nullable article context projection with latest summary selection;
- V2 article context endpoint: `/api/v2/articles/:id/context`;
- V2 timeline endpoint: `/api/v2/timelines/:ownerType/:ownerId`;
- feature flag OFF returns stable `404 v2_disabled`;
- timeline endpoint reuses M10 temporal semantics and stable cursor pagination;
- raw secrets, prompts, provider payloads and internal SQL errors are not returned.

## Acceptance status

| Requirement | Status | Evidence |
|---|---|---|
| Versioned envelope | COMPLETE | `read-model-contract.js`, unit regression |
| Read-only article context projection | COMPLETE | context route, unit regression |
| Bounded cursor pagination | COMPLETE | timeline route, temporal repository, unit regression |
| As-of validation and future exclusion | COMPLETE | temporal repository and M10 regressions |
| Feature OFF boundary | COMPLETE | both routes |
| Public entity detail | COMPLETE | `/api/v2/entities/:id`, allowlist repository and regression |
| Public event detail | COMPLETE | `/api/v2/events/:id`, allowlist repository and regression |
| Public claim detail | COMPLETE | `/api/v2/claims/:id`, bounded evidence and regression |
| Scoped source comparison | COMPLETE | `/api/v2/source-comparison`, event/claim scope validation and regression |
| Real MySQL 8 fixture validation | COMPLETE | isolated WSL MySQL 8.0.46 entity/event/claim/source fixture |
| HTTP runtime smoke | COMPLETE | production runtime feature OFF/ON, envelope and public-field assertions |
| Premium intelligence endpoint | DEFERRED | M16; existing premium entitlement boundary remains unchanged |

## Known M13 design dependencies

Q12/Q13 remain measurement-dependent infrastructure decisions and do not change the read-only MySQL boundary. Q14 uses the approved UTC storage and explicit `asOf` semantics; display-localization remains a later product decision.

`M13 IMPLEMENTATION: COMPLETE – owner-approved public detail and source-comparison contracts are implemented.`
`M13 COMPLETE: YES`
