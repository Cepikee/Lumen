"use strict";

// M1.3 is a schema expectation fixture. It intentionally contains no SQL and
// is not imported by application/runtime modules.
const column = (type, options = {}) => ({
  type,
  nullable: options.nullable === true,
  ...(options.autoIncrement ? { autoIncrement: true } : {}),
  ...(Object.prototype.hasOwnProperty.call(options, "default") ? { default: options.default } : {}),
  ...(options.generated ? { generated: options.generated } : {}),
  ...(options.semantic ? { semantic: options.semantic } : {}),
});
const { CONTRACT_VERSIONS } = require("../../lib/v2/contract-versions");

const id = () => column("BIGINT UNSIGNED", { autoIncrement: true, semantic: "surrogate identity" });
const utc = (semantic) => column("DATETIME(6)", { nullable: true, semantic: `${semantic}; UTC storage` });
const requiredUtc = (semantic) => column("DATETIME(6)", { semantic: `${semantic}; UTC storage` });

const table = (purpose, columns, primaryKey, options = {}) => ({
  purpose,
  engine: "InnoDB",
  charset: "utf8mb4",
  columns,
  primaryKey,
  unique: options.unique || [],
  indexes: options.indexes || [],
  foreignKeys: options.foreignKeys || [],
});

const entityTypes = ["person", "company", "organization", "location", "project", "product", "topic"];
const entityStatuses = ["review", "active", "merged", "disputed", "archived"];
const relationPredicates = ["OWNS", "WORKS_FOR", "CEO_OF", "LOCATED_IN", "BUILDS", "INVESTS_IN", "ACQUIRED", "PARTNER_OF", "SUPPORTS", "OPPOSES", "PARTICIPATES_IN", "RELATED_TO"];
const claimStatuses = ["observed", "disputed", "superseded", "retracted", "unresolved"];
const eventStatuses = ["candidate", "active", "completed", "disputed", "merged"];
const conflictTypes = ["numeric", "categorical", "temporal", "entity_identity", "relation"];
const conflictStates = ["open", "resolved", "dismissed"];

const provenanceFk = (columns, tableName, onDelete = "RESTRICT") => ({ columns, table: tableName, referencedColumns: ["id"], onDelete, onUpdate: "RESTRICT" });

const tables = {
  v2_entities: table("Canonical typed knowledge entities", {
    id: id(), entity_type: column("VARCHAR(32)", { semantic: "controlled entity type" }),
    canonical_name: column("VARCHAR(512)"), normalized_name: column("VARCHAR(512)"), language: column("VARCHAR(16)", { default: "hu" }),
    status: column("VARCHAR(24)", { default: "review", semantic: "entity lifecycle" }), canonical_entity_id: column("BIGINT UNSIGNED", { nullable: true, semantic: "merge canonical pointer" }),
    confidence_current: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1; resolution/current confidence" }),
    first_observed_at: utc("first observation"), last_observed_at: utc("last observation"), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], {
    unique: [["entity_type", "language", "normalized_name"]],
    indexes: [["status"], ["canonical_entity_id"], ["last_observed_at"]],
    foreignKeys: [{ columns: ["canonical_entity_id"], table: "v2_entities", referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "RESTRICT" }],
  }),
  v2_entity_aliases: table("Normalized aliases and ambiguous candidate names", {
    id: id(), entity_id: column("BIGINT UNSIGNED"), alias: column("VARCHAR(512)"), normalized_alias: column("VARCHAR(512)"), language: column("VARCHAR(16)"),
    alias_type: column("VARCHAR(32)"), status: column("VARCHAR(24)", { default: "review" }), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), evidence_id: column("BIGINT UNSIGNED", { nullable: true }),
    valid_from: utc("alias validity start"), valid_until: utc("alias validity end"), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], {
    unique: [["entity_id", "normalized_alias", "language"]], indexes: [["normalized_alias", "status"], ["entity_id"]],
    foreignKeys: [provenanceFk(["entity_id"], "v2_entities", "CASCADE"), provenanceFk(["evidence_id"], "v2_claim_evidence", "SET NULL")],
  }),
  v2_entity_mentions: table("Article-level entity mentions, including unresolved mentions", {
    id: id(), article_id: column("BIGINT UNSIGNED"), summary_id: column("BIGINT UNSIGNED", { nullable: true }), entity_id: column("BIGINT UNSIGNED", { nullable: true }), raw_text: column("TEXT"), normalized_text: column("TEXT"),
    entity_type: column("VARCHAR(32)", { nullable: true }), start_offset: column("INT UNSIGNED"), end_offset: column("INT UNSIGNED"), extraction_run_id: column("BIGINT UNSIGNED", { nullable: true }), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), resolution_status: column("VARCHAR(24)", { default: "unresolved" }), created_at: requiredUtc("technical creation"),
  }, ["id"], { indexes: [["article_id"], ["entity_id"], ["resolution_status"]], foreignKeys: [provenanceFk(["article_id"], "articles"), provenanceFk(["summary_id"], "summaries", "SET NULL"), provenanceFk(["entity_id"], "v2_entities", "SET NULL"), provenanceFk(["extraction_run_id"], "v2_ai_runs", "SET NULL")] }),
  v2_entity_relations: table("Typed directional relations with temporal and evidence state", {
    id: id(), subject_entity_id: column("BIGINT UNSIGNED"), predicate: column("VARCHAR(64)", { semantic: "controlled relation predicate" }), object_entity_id: column("BIGINT UNSIGNED", { nullable: true }), object_value: column("JSON", { nullable: true }), status: column("VARCHAR(24)", { default: "active" }), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }),
    valid_from: utc("relation validity start"), valid_until: utc("relation validity end"), first_observed_at: utc("first observation"), last_observed_at: utc("last observation"), superseded_by: column("BIGINT UNSIGNED", { nullable: true }), idempotency_key: column("CHAR(64)", { semantic: "deterministic relation fingerprint" }), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["idempotency_key"]], indexes: [["subject_entity_id", "predicate"], ["object_entity_id", "predicate"], ["status", "valid_from", "valid_until"]], foreignKeys: [provenanceFk(["subject_entity_id"], "v2_entities"), provenanceFk(["object_entity_id"], "v2_entities", "SET NULL"), provenanceFk(["superseded_by"], "v2_entity_relations", "SET NULL")] }),
  v2_relation_evidence: table("Append-only provenance for relations", {
    id: id(), relation_id: column("BIGINT UNSIGNED"), article_id: column("BIGINT UNSIGNED"), source_id: column("BIGINT UNSIGNED", { nullable: true }), evidence_hash: column("CHAR(64)"), text_span: column("TEXT", { nullable: true }), extraction_run_id: column("BIGINT UNSIGNED", { nullable: true }), support_type: column("VARCHAR(24)"), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["relation_id", "evidence_hash"]], indexes: [["article_id"], ["source_id"], ["extraction_run_id"]], foreignKeys: [provenanceFk(["relation_id"], "v2_entity_relations", "CASCADE"), provenanceFk(["article_id"], "articles"), provenanceFk(["source_id"], "sources", "SET NULL"), provenanceFk(["extraction_run_id"], "v2_ai_runs", "SET NULL")] }),
  v2_events: table("Historical event objects separate from articles and entities", {
    id: id(), event_type: column("VARCHAR(64)"), canonical_title: column("VARCHAR(512)"), normalized_key: column("VARCHAR(512)"), status: column("VARCHAR(24)", { default: "candidate" }), start_at: utc("event interval start"), end_at: utc("event interval end"), first_observed_at: utc("first observation"), last_observed_at: utc("last observation"), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), superseded_by: column("BIGINT UNSIGNED", { nullable: true }), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["normalized_key"]], indexes: [["event_type", "status"], ["start_at", "end_at"], ["status"]], foreignKeys: [provenanceFk(["superseded_by"], "v2_events", "SET NULL")] }),
  v2_event_entities: table("Event participant/entity roles", {
    id: id(), event_id: column("BIGINT UNSIGNED"), entity_id: column("BIGINT UNSIGNED"), role: column("VARCHAR(64)"), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), valid_from: utc("membership validity start"), valid_until: utc("membership validity end"), evidence_id: column("BIGINT UNSIGNED", { nullable: true }), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["event_id", "entity_id", "role", "valid_from"]], indexes: [["entity_id", "role"], ["event_id"]], foreignKeys: [provenanceFk(["event_id"], "v2_events", "CASCADE"), provenanceFk(["entity_id"], "v2_entities"), provenanceFk(["evidence_id"], "v2_claim_evidence", "SET NULL")] }),
  v2_event_articles: table("Event/article membership and coverage", {
    id: id(), event_id: column("BIGINT UNSIGNED"), article_id: column("BIGINT UNSIGNED"), membership_type: column("VARCHAR(32)"), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), evidence_id: column("BIGINT UNSIGNED", { nullable: true }), first_observed_at: utc("first observation"), last_observed_at: utc("last observation"), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["event_id", "article_id", "membership_type"]], indexes: [["article_id"], ["event_id"]], foreignKeys: [provenanceFk(["event_id"], "v2_events", "CASCADE"), provenanceFk(["article_id"], "articles"), provenanceFk(["evidence_id"], "v2_claim_evidence", "SET NULL")] }),
  v2_claims: table("Atomic source observations; claims are not automatically facts", {
    id: id(), subject_entity_id: column("BIGINT UNSIGNED", { nullable: true }), predicate: column("VARCHAR(128)"), object_entity_id: column("BIGINT UNSIGNED", { nullable: true }), value_json: column("JSON", { nullable: true }), normalized_value: column("VARCHAR(512)", { nullable: true }), claim_type: column("VARCHAR(64)"), article_id: column("BIGINT UNSIGNED"), source_id: column("BIGINT UNSIGNED", { nullable: true }), valid_from: utc("claim validity start"), valid_until: utc("claim validity end"), observed_at: requiredUtc("observation"), publication_time: utc("article publication"), status: column("VARCHAR(24)", { default: "observed" }), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), extraction_run_id: column("BIGINT UNSIGNED", { nullable: true }), claim_group_id: column("BIGINT UNSIGNED", { nullable: true }), superseded_by: column("BIGINT UNSIGNED", { nullable: true }), observation_key: column("CHAR(64)", { semantic: "source observation identity" }), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["observation_key"]], indexes: [["subject_entity_id", "predicate"], ["article_id"], ["source_id"], ["status"], ["claim_group_id"]], foreignKeys: [provenanceFk(["subject_entity_id"], "v2_entities", "SET NULL"), provenanceFk(["object_entity_id"], "v2_entities", "SET NULL"), provenanceFk(["article_id"], "articles"), provenanceFk(["source_id"], "sources", "SET NULL"), provenanceFk(["extraction_run_id"], "v2_ai_runs", "SET NULL"), provenanceFk(["claim_group_id"], "v2_claim_groups", "SET NULL"), provenanceFk(["superseded_by"], "v2_claims", "SET NULL")] }),
  v2_claim_groups: table("Competing claim observations in one subject/predicate/time scope", {
    id: id(), subject_entity_id: column("BIGINT UNSIGNED", { nullable: true }), predicate: column("VARCHAR(128)"), time_scope_key: column("VARCHAR(128)"), resolution_status: column("VARCHAR(24)", { default: "unresolved" }), display_policy: column("VARCHAR(32)", { nullable: true }), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["subject_entity_id", "predicate", "time_scope_key"]], indexes: [["resolution_status"], ["predicate"]], foreignKeys: [provenanceFk(["subject_entity_id"], "v2_entities", "SET NULL")] }),
  v2_claim_evidence: table("Append-only evidence for claims and aliases/event links", {
    id: id(), claim_id: column("BIGINT UNSIGNED", { nullable: true }), article_id: column("BIGINT UNSIGNED"), source_id: column("BIGINT UNSIGNED", { nullable: true }), text_span: column("TEXT", { nullable: true }), span_hash: column("CHAR(64)"), evidence_type: column("VARCHAR(32)"), support_type: column("VARCHAR(24)"), extraction_run_id: column("BIGINT UNSIGNED", { nullable: true }), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), publication_time: utc("article publication"), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["claim_id", "article_id", "span_hash"]], indexes: [["article_id"], ["source_id"], ["extraction_run_id"]], foreignKeys: [provenanceFk(["claim_id"], "v2_claims", "CASCADE"), provenanceFk(["article_id"], "articles"), provenanceFk(["source_id"], "sources", "SET NULL"), provenanceFk(["extraction_run_id"], "v2_ai_runs", "SET NULL")] }),
  v2_conflicts: table("Explainable unresolved or resolved claim/relation conflicts", {
    id: id(), conflict_type: column("VARCHAR(32)"), fingerprint: column("CHAR(64)"), scope_type: column("VARCHAR(32)"), scope_id: column("BIGINT UNSIGNED"), severity: column("VARCHAR(24)"), state: column("VARCHAR(24)", { default: "open" }), explanation_json: column("JSON", { nullable: true }), resolver: column("VARCHAR(128)", { nullable: true }), detected_at: requiredUtc("conflict detection"), resolved_at: utc("conflict resolution"), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["fingerprint"]], indexes: [["conflict_type", "state"], ["scope_type", "scope_id"], ["severity"]] }),
  v2_confidence_history: table("Append-only confidence changes", {
    id: id(), object_type: column("VARCHAR(32)"), object_id: column("BIGINT UNSIGNED"), old_confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), new_confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), reason: column("VARCHAR(255)"), evidence_delta: column("JSON", { nullable: true }), rule_version: column("VARCHAR(64)", { nullable: true }), model_version: column("VARCHAR(64)", { nullable: true }), resolver_version: column("VARCHAR(64)", { nullable: true }), created_at: requiredUtc("confidence change"),
  }, ["id"], { indexes: [["object_type", "object_id", "created_at"]] }),
  v2_entity_graph_history: table("Append-only graph mutation audit", {
    id: id(), mutation_type: column("VARCHAR(64)"), object_type: column("VARCHAR(32)"), object_id: column("BIGINT UNSIGNED"), before_json: column("JSON", { nullable: true }), after_json: column("JSON", { nullable: true }), operation_key: column("CHAR(64)"), actor: column("VARCHAR(128)"), run_id: column("BIGINT UNSIGNED", { nullable: true }), created_at: requiredUtc("graph mutation"),
  }, ["id"], { unique: [["operation_key"]], indexes: [["object_type", "object_id", "created_at"], ["run_id"]], foreignKeys: [provenanceFk(["run_id"], "v2_ai_runs", "SET NULL")] }),
  v2_timelines: table("Timeline owners for entity/event/topic projections", {
    id: id(), owner_type: column("VARCHAR(32)"), owner_id: column("BIGINT UNSIGNED"), visibility: column("VARCHAR(24)", { default: "public" }), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["owner_type", "owner_id"]], indexes: [["owner_type", "owner_id"], ["visibility"]] }),
  v2_timeline_items: table("Timeline references with deterministic ordering", {
    id: id(), timeline_id: column("BIGINT UNSIGNED"), item_type: column("VARCHAR(32)"), item_id: column("BIGINT UNSIGNED"), valid_at: utc("valid/display time"), display_at: utc("display time"), confidence: column("DECIMAL(5,4)", { nullable: true, semantic: "0..1" }), visibility: column("VARCHAR(24)", { default: "public" }), ordering_key: column("VARCHAR(128)"), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["timeline_id", "item_type", "item_id", "ordering_key"]], indexes: [["timeline_id", "ordering_key"], ["item_type", "item_id"], ["valid_at"]], foreignKeys: [provenanceFk(["timeline_id"], "v2_timelines", "CASCADE")] }),
  v2_ai_runs: table("AI/extraction execution audit without unrestricted raw provider payload", {
    id: id(), article_id: column("BIGINT UNSIGNED", { nullable: true }), step_name: column("VARCHAR(64)"), provider: column("VARCHAR(64)"), model: column("VARCHAR(128)"), prompt_version: column("VARCHAR(64)"), extractor_version: column("VARCHAR(64)"), schema_version: column("VARCHAR(64)"), input_hash: column("CHAR(64)"), sanitized_input_ref: column("VARCHAR(512)", { nullable: true }), status: column("VARCHAR(24)"), retry_count: column("INT UNSIGNED", { default: 0 }), started_at: requiredUtc("AI run start"), completed_at: utc("AI run completion"), input_tokens: column("INT UNSIGNED", { nullable: true }), output_tokens: column("INT UNSIGNED", { nullable: true }), estimated_cost: column("DECIMAL(12,6)", { nullable: true }), cache_hit: column("BOOLEAN", { default: false }), escalation_reason: column("VARCHAR(255)", { nullable: true }), structured_result_ref: column("VARCHAR(512)", { nullable: true }), error_metadata: column("JSON", { nullable: true }), operation_key: column("CHAR(64)"), created_at: requiredUtc("technical creation"),
  }, ["id"], { unique: [["operation_key"]], indexes: [["article_id", "step_name"], ["status", "started_at"], ["provider", "model"]], foreignKeys: [provenanceFk(["article_id"], "articles", "SET NULL")] }),
  v2_ai_decisions: table("AI Cost Router decision audit", {
    id: id(), article_id: column("BIGINT UNSIGNED", { nullable: true }), step_name: column("VARCHAR(64)"), input_fingerprint: column("CHAR(64)"), route: column("VARCHAR(32)"), reason: column("VARCHAR(255)"), budget_snapshot: column("JSON", { nullable: true }), provider: column("VARCHAR(64)", { nullable: true }), model: column("VARCHAR(128)", { nullable: true }), escalation: column("BOOLEAN", { default: false }), created_at: requiredUtc("decision time"),
  }, ["id"], { unique: [["article_id", "step_name", "input_fingerprint"]], indexes: [["route", "created_at"], ["article_id", "step_name"]], foreignKeys: [provenanceFk(["article_id"], "articles", "SET NULL")] }),
  v2_processing_steps: table("Idempotent V2 processing step state", {
    id: id(), article_id: column("BIGINT UNSIGNED"), step_name: column("VARCHAR(64)"), input_fingerprint: column("CHAR(64)"), status: column("VARCHAR(24)"), attempt: column("INT UNSIGNED", { default: 0 }), claim_token: column("CHAR(36)", { nullable: true }), heartbeat_at: utc("worker heartbeat"), output_ref: column("VARCHAR(512)", { nullable: true }), error_metadata: column("JSON", { nullable: true }), completed_at: utc("step completion"), created_at: requiredUtc("technical creation"), updated_at: requiredUtc("technical update"),
  }, ["id"], { unique: [["article_id", "step_name", "input_fingerprint"]], indexes: [["status", "heartbeat_at"], ["article_id", "step_name"]], foreignKeys: [provenanceFk(["article_id"], "articles")] }),
};

// Index and unique names are deterministic contract data, not implementation
// detail. They are derived from the canonical table/column identity so the
// fixture remains the only expected-schema source.
const namedTables = Object.fromEntries(Object.entries(tables).map(([tableName, definition]) => [tableName, {
  ...definition,
  unique: definition.unique.map((columns) => ({ name: `uq_${tableName}_${columns.join("_")}`, columns })),
  indexes: definition.indexes.map((columns) => ({ name: `idx_${tableName}_${columns.join("_")}`, columns, unique: false })),
}]));

module.exports = {
  contractVersion: CONTRACT_VERSIONS.knowledgeSchema,
  vocabularyVersion: CONTRACT_VERSIONS.vocabulary,
  extractionSchemaVersion: CONTRACT_VERSIONS.extractionSchema,
  resolverVersion: CONTRACT_VERSIONS.resolver,
  controlledValues: { entityTypes, entityStatuses, relationPredicates, claimStatuses, eventStatuses, conflictTypes, conflictStates },
  conventions: {
    tableCase: "snake_case_plural",
    foreignKeyCase: "snake_case_id",
    timestampType: "DATETIME(6)",
    timestampStorage: "UTC",
    confidenceType: "DECIMAL(5,4)",
    confidenceRange: [0, 1],
    defaultEngine: "InnoDB",
    defaultCharset: "utf8mb4",
    rawProviderResponseColumn: false,
  },
  migrationOrder: [
    "v2_entities", "v2_ai_runs", "v2_claim_groups", "v2_claims", "v2_claim_evidence", "v2_entity_aliases", "v2_entity_mentions",
    "v2_entity_relations", "v2_relation_evidence", "v2_events", "v2_event_entities", "v2_event_articles", "v2_conflicts",
    "v2_confidence_history", "v2_entity_graph_history", "v2_timelines", "v2_timeline_items", "v2_ai_decisions", "v2_processing_steps",
  ],
  tables: namedTables,
};
