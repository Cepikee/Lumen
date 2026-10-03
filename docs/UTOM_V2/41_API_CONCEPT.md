# API Concept

V2 envelope: data, meta(requestId, schemaVersion, generatedAt), errors(code, message, details).

Initial families: articles/id/context, entities/id, entities/id/timeline, events/id, topics/id/claims, sources/compare, premium/intelligence and protected worker/admin.

Cursor pagination, stable tie ordering and explicit HTTP 401/403/404/409/422/429/5xx semantics required.

No raw prompts, secrets or unredacted provider output. Existing routes remain until V2 comparison gate passes.
