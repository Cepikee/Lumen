# Cost and Scaling

Initial volume: 100–500 articles/day; design for one order of magnitude growth.

Controls: deterministic bypass, alias/cache, bounded worker concurrency, batch extraction, per-step budget, cursor pagination, indexed time/source queries, async read models and diagnostics retention.

Measure cost/article, cost/day/month, tokens, cache hit and escalation. Do not introduce distributed graph DB or message bus before measured MySQL/read-model limits justify it.
