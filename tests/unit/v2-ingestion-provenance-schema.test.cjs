"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const contract = require("../fixtures/v2-ingestion-provenance-schema-contract.cjs");

test("M2 provenance schema contract is additive, structured and audit-safe", () => {
  assert.equal(contract.table.name, "v2_ingestion_provenance");
  assert.equal(contract.table.engine, "InnoDB");
  assert.equal(contract.table.columns.operation_key.type, "char(64)");
  assert.equal(contract.table.columns.operation_key.nullable, false);
  assert.equal(contract.table.columns.article_id.nullable, true);
  assert.equal(contract.table.columns.publication_at.nullable, true);
  assert.deepEqual(contract.table.unique, [{ name: "uq_v2_ingestion_provenance_operation_key", columns: ["operation_key"] }]);
  assert.equal(contract.table.foreignKeys.find((fk) => fk.columns[0] === "article_id").onDelete, "SET NULL");
  assert.equal(contract.table.foreignKeys.find((fk) => fk.columns[0] === "source_id").onDelete, "SET NULL");
  const migration = fs.readFileSync(path.join(__dirname, "..", "..", "db", "migrations", "053_v2_ingestion_provenance.sql"), "utf8");
  assert.match(migration, /CREATE TABLE v2_ingestion_provenance/);
  assert.doesNotMatch(migration, /DROP TABLE|ALTER TABLE .* DROP/i);
});

console.log("M2 provenance schema contract: PASS");
