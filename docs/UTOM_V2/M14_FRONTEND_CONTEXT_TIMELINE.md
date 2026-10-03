# M14 – Frontend context és timeline

## Scope

M14 adds a feature-flagged article context/timeline panel to the existing article detail page. It is read-only, uses the M13 API envelope, and does not introduce premium intelligence, AI calls, graph writes or a second temporal engine.

## Implemented slice

- `useV2ArticleContext` hook with sequence guard and `AbortController` cleanup;
- canonical frontend flag parser in `lib/v2/frontend-config.js` (`true/1/yes/on` only; malformed values fail closed);
- malformed response, null field, HTTP error and empty-state normalization;
- `V2ArticleContextPanel` with disabled/loading/ready/empty/error states;
- article detail integration behind `NEXT_PUBLIC_UTOM_V2_ENABLED` (default OFF);
- legacy article and related-news flows remain unchanged when the flag is OFF;
- no provider calls and no writes from the frontend panel.

## Flag contract

`NEXT_PUBLIC_UTOM_V2_ENABLED` is a Next.js public build-time value. Changing it requires a new frontend build and deployment; it never enables the backend. `UTOM_V2_ENABLED` remains the canonical server runtime flag and takes effect after the server process is restarted/redeployed. Both default to `false`.

| Frontend | Server | Expected behavior |
|---|---|---|
| OFF | OFF | panel hidden, no V2 request, direct V2 call returns `404 v2_disabled`, legacy article/related flow remains available |
| OFF | ON | backend available, panel hidden, no browser V2 request |
| ON | OFF | safe degraded panel state on `404 v2_disabled`; no retry loop or page crash |
| ON | ON | panel performs read-only GET and renders loading/ready/empty/error states |

Safe rollout: deploy the V2-capable backend with its flag OFF, deploy the frontend with its flag OFF, enable and smoke-test the backend, then rebuild/deploy the frontend with its flag ON. Rollback is frontend OFF plus server OFF; no schema rollback is required.

## Validation

- frontend flag parser regression: PASS;
- malformed/null response normalization regression: PASS;
- offline suite: `343/343 PASS`;
- TypeScript, import check and ESLint (0 errors): PASS;
- OFF production build: PASS; ON production build: PASS;
- real browser acceptance: PASS in installed Google Chrome headless production runtime using a temporary CDP network-interception harness; MySQL was not required for M14 client behavior.
- OFF/OFF and OFF/ON: legacy article and related content rendered, context request count `0`, no runtime exception.
- ON/ON: one context GET, loading→ready, summary and timeline rendered, legacy article and related content remained visible, POST count `0`, runtime exception count `0`.
- ON/OFF: controlled `404 v2_disabled` produced the safe generic degraded state, with one request and no retry storm or runtime exception.
- empty, 500, malformed JSON and null envelope: safe empty/error states, no crash or raw backend details.
- A→B rapid navigation: final DOM contained article/context B, with two logical context requests and no stale A render.
- desktop and mobile viewport runs: panel rendered; mobile overflow result matched the OFF baseline and was not introduced by the panel.
- hydration/console: no runtime exception or console error was captured.

## Status

`M14 IMPLEMENTATION: COMPLETE – article context/timeline panel, flag boundary and real-browser acceptance complete.`

`M14 COMPLETE: YES – all applicable browser, state, error, race, responsive and quality-gate requirements passed.`
