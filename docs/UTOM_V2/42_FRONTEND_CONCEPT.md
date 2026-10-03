# Frontend Concept

V2 panels behind feature flags: article context, entity chips, event timeline, source comparison, claim/evidence drawer, conflict indicator, premium intelligence.

Each panel supports loading, empty, partial, 401, 403, 404, 409, 429 and 5xx states. Fetches use sequence/cancellation guards.

Legacy feed/article/trends/insights remain available during rollout. Malformed arrays, null dates, invalid IDs and stale responses must not crash the page.
