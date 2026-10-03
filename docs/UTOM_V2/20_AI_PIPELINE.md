# AI Pipeline

The extraction pipeline is an adapter over the current pipeline state machine. Each step declares input fingerprint, schema version, deterministic preconditions, AI decision, output validation, retry policy and projection.

Combined extraction should return entity candidates, relation candidates, claims, event candidates, dates, locations and confidence in one bounded structured result. Follow-up AI is escalation only.
