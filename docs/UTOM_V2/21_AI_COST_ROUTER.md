# AI Cost Router

The router is a policy boundary, not a provider wrapper. It records why deterministic, cache, low-cost, high-cost or review route was selected.

No route may bypass daily/monthly budget, per-article limit, timeout, retry and circuit breaker. Cache keys include input and schema/model version.
