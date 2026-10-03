# Data Model Concept

Current tables remain backward-compatible. Additive V2 tables: v2_entities, v2_entity_aliases, v2_entity_mentions, v2_entity_relations, v2_relation_evidence, v2_events, v2_event_entities, v2_event_articles, v2_claims, v2_claim_groups, v2_claim_evidence, v2_conflicts, v2_confidence_history, v2_entity_graph_history, v2_timelines, v2_timeline_items, v2_ai_runs, v2_ai_decisions, v2_processing_steps.

All use InnoDB, utf8mb4, UTC DATETIME(6), FK, stable indexes and idempotency keys.

No destructive rename of legacy fields. Retention and partitioning remain volume-dependent decisions.
