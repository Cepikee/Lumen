# Failure Modes

| Failure | Recovery |
|---|---|
| hallucinated entity | schema reject or review; evidence retained |
| false merge | canonical pointer rollback; history retained |
| duplicate entity | identity key and merge queue |
| wrong event merge | split/reopen event; membership retained |
| conflicting claims | preserve all claims; unresolved conflict |
| malformed AI output | quarantine, bounded retry, dead letter |
| provider outage | deterministic/cache/deferred fallback |
| DB crash | transaction rollback and resumable claim |
| partial pipeline | step-level resume |
| stale knowledge | valid intervals and review |
| runaway cost | hard budget and circuit breaker |
