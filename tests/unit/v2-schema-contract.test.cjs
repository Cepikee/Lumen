"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const contract = require("../fixtures/v2-schema-contract.cjs");

const tableNames = Object.keys(contract.tables);

test("M1.3 fixture freezes the complete additive V2 table scope", () => {
  assert.deepEqual(tableNames, [
    "v2_entities", "v2_entity_aliases", "v2_entity_mentions", "v2_entity_relations", "v2_relation_evidence",
    "v2_events", "v2_event_entities", "v2_event_articles", "v2_claims", "v2_claim_groups", "v2_claim_evidence",
    "v2_conflicts", "v2_confidence_history", "v2_entity_graph_history", "v2_timelines", "v2_timeline_items",
    "v2_ai_runs", "v2_ai_decisions", "v2_processing_steps",
  ]);
  for (const [name, table] of Object.entries(contract.tables)) {
    assert.equal(table.engine, "InnoDB", name);
    assert.equal(table.charset, "utf8mb4", name);
    assert.ok(table.primaryKey.length > 0, `${name} primary key`);
    assert.equal(table.columns[table.primaryKey[0]].autoIncrement, true, `${name} identity generation`);
    assert.ok(Object.keys(table.columns).length > 0, `${name} columns`);
    for (const [columnName, definition] of Object.entries(table.columns)) {
      assert.match(definition.type, /^[A-Z]+(?:\([^)]+\))?(?: UNSIGNED)?$/, `${name}.${columnName} type`);
      assert.equal(typeof definition.nullable, "boolean", `${name}.${columnName} nullability`);
    }
  }
});

test("identity, duplicate and provenance constraints are explicit", () => {
  assert.deepEqual(contract.tables.v2_entities.unique[0].columns, ["entity_type", "language", "normalized_name"]);
  assert.deepEqual(contract.tables.v2_entity_aliases.unique[0].columns, ["entity_id", "normalized_alias", "language"]);
  assert.deepEqual(contract.tables.v2_entity_relations.unique[0].columns, ["idempotency_key"]);
  assert.deepEqual(contract.tables.v2_claims.unique[0].columns, ["observation_key"]);
  assert.deepEqual(contract.tables.v2_claim_evidence.unique[0].columns, ["claim_id", "article_id", "span_hash"]);
  assert.deepEqual(contract.tables.v2_ai_runs.unique[0].columns, ["operation_key"]);
  for (const [name, table] of Object.entries(contract.tables)) {
    for (const index of [...table.unique, ...table.indexes]) assert.match(index.name, /^(uq|idx)_/, `${name} index name`);
  }
  assert.ok(contract.tables.v2_entity_mentions.columns.entity_id.nullable, "unresolved mentions remain representable");
  assert.ok(contract.tables.v2_claims.columns.subject_entity_id.nullable, "unresolved claim subjects remain representable");
  assert.ok(contract.tables.v2_claims.columns.value_json.nullable, "polymorphic claim value is optional");
  assert.ok(contract.tables.v2_entity_relations.columns.object_entity_id.nullable, "relation can use object_value");
  assert.equal(contract.conventions.rawProviderResponseColumn, false);
  assert.equal(Object.values(contract.tables).some((table) => Object.keys(table.columns).some((name) => /raw.*response|provider.*raw/i.test(name))), false);
});

test("controlled vocabulary and temporal/confidence contracts are machine-checkable", () => {
  assert.deepEqual(contract.controlledValues.entityTypes, ["person", "company", "organization", "location", "project", "product", "topic"]);
  assert.deepEqual(contract.controlledValues.relationPredicates, ["OWNS", "WORKS_FOR", "CEO_OF", "LOCATED_IN", "BUILDS", "INVESTS_IN", "ACQUIRED", "PARTNER_OF", "SUPPORTS", "OPPOSES", "PARTICIPATES_IN", "RELATED_TO"]);
  assert.deepEqual(contract.conventions.confidenceRange, [0, 1]);
  assert.equal(contract.conventions.timestampType, "DATETIME(6)");
  assert.equal(contract.conventions.timestampStorage, "UTC");
  for (const table of Object.values(contract.tables)) {
    for (const [name, definition] of Object.entries(table.columns)) {
      if (/confidence/i.test(name)) assert.equal(definition.type, "DECIMAL(5,4)");
      if (/_at$/.test(name)) assert.equal(definition.type, "DATETIME(6)", `${name} must use UTC DATETIME(6)`);
    }
  }
});

test("foreign keys declare delete and update policy", () => {
  for (const [name, table] of Object.entries(contract.tables)) {
    for (const foreignKey of table.foreignKeys) {
      assert.ok(table.columns[foreignKey.columns[0]], `${name} FK child column`);
      assert.ok(contract.tables[foreignKey.table] || ["articles", "summaries", "sources"].includes(foreignKey.table), `${name} FK parent`);
      assert.ok(["CASCADE", "SET NULL", "RESTRICT"].includes(foreignKey.onDelete), `${name} FK delete policy`);
      assert.equal(foreignKey.onUpdate, "RESTRICT", `${name} FK update policy`);
    }
  }
});

console.log(`M1.3 schema contract fixture: ${tableNames.length} tables, PASS`);
