"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadMigrations } = require("../../db/migration-core.cjs");
const contract = require("../fixtures/v2-schema-contract.cjs");

const m1Migrations = loadMigrations().filter((migration) => Number(migration.version) >= 34 && Number(migration.version) <= 52);
const m2Migrations = loadMigrations().filter((migration) => Number(migration.version) === 53);
const m4Migrations = loadMigrations().filter((migration) => Number(migration.version) === 54);
const m5Migrations = loadMigrations().filter((migration) => Number(migration.version) >= 55 && Number(migration.version) <= 57);

test("M1.4 has one ordered migration statement per fixture table", () => {
  const names = contract.migrationOrder;
  assert.equal(m1Migrations.length, names.length);
  for (const [index, migration] of m1Migrations.entries()) {
    assert.equal(migration.version, String(34 + index).padStart(3, "0"));
    const tableName = names[index];
    assert.equal(migration.filename, `${migration.version}_${tableName}.sql`);
    assert.match(migration.sql, new RegExp(`^--[^\\n]+\\nCREATE TABLE ${tableName} \\(`));
    assert.equal(migration.sql.replace(/^\s*--[^\n]*$/gm, "").includes(";"), false, `${migration.filename} single statement`);
    assert.match(migration.sql, /ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci/);
  }
});

test("M1.4 migrations contain every fixture column and named constraint", () => {
  for (const migration of m1Migrations) {
    const tableName = migration.filename.replace(/^\d{3}_/, "").replace(/\.sql$/, "");
    const table = contract.tables[tableName];
    for (const columnName of Object.keys(table.columns).filter((name) => !(tableName === "v2_entity_mentions" && name === "entity_type"))) assert.match(migration.sql, new RegExp(`\\b${columnName}\\b`), `${tableName}.${columnName}`);
    for (const unique of table.unique) assert.match(migration.sql, new RegExp(`UNIQUE KEY ${unique.name} \\(`), unique.name);
    for (const index of table.indexes) assert.match(migration.sql, new RegExp(`KEY ${index.name} \\(`), index.name);
    for (const foreignKey of table.foreignKeys) assert.match(migration.sql, new RegExp(`FOREIGN KEY \\(${foreignKey.columns.join(", ")}\\) REFERENCES ${foreignKey.table} \\(${foreignKey.referencedColumns.join(", ")}\\) ON DELETE ${foreignKey.onDelete} ON UPDATE ${foreignKey.onUpdate}`), `${tableName} FK`);
  }
});

test("M2 provenance migration is additive and uses the dedicated contract", () => {
  assert.equal(m2Migrations.length, 1);
  assert.equal(m2Migrations[0].filename, "053_v2_ingestion_provenance.sql");
  assert.match(m2Migrations[0].sql, /^--[^\n]+\nCREATE TABLE v2_ingestion_provenance \(/);
  assert.match(m2Migrations[0].sql, /UNIQUE KEY uq_v2_ingestion_provenance_operation_key \(/);
  assert.doesNotMatch(m2Migrations[0].sql, /DROP TABLE|ALTER TABLE .* DROP/i);
});

test("M4 mention type migration is additive and preserves existing rows", () => {
  assert.equal(m4Migrations.length, 1);
  assert.equal(m4Migrations[0].filename, "054_v2_entity_mention_type.sql");
  assert.match(m4Migrations[0].sql, /ALTER TABLE v2_entity_mentions\s+ADD COLUMN entity_type VARCHAR\(32\) NULL/i);
  assert.doesNotMatch(m4Migrations[0].sql, /DROP TABLE|DROP COLUMN/i);
});

test("M5 lookup migration makes normalized identity accent-sensitive and stores alias observations", () => {
  assert.equal(m5Migrations.length, 3);
  assert.equal(m5Migrations[0].filename, "055_v2_entity_normalized_collation.sql");
  assert.equal(m5Migrations[1].filename, "056_v2_alias_normalized_collation.sql");
  assert.equal(m5Migrations[2].filename, "057_v2_entity_alias_observations.sql");
  assert.match(m5Migrations[0].sql, /normalized_name VARCHAR\(512\).*utf8mb4_bin/i);
  assert.match(m5Migrations[1].sql, /normalized_alias VARCHAR\(512\).*utf8mb4_bin/i);
  assert.match(m5Migrations[2].sql, /CREATE TABLE v2_entity_alias_observations/i);
  for (const migration of m5Migrations) assert.doesNotMatch(migration.sql, /DROP TABLE|DROP COLUMN/i);
});

console.log(`M1.4 static migration contract: ${m1Migrations.length} migrations; M2 extension: ${m2Migrations.length}; M4 extension: ${m4Migrations.length}, PASS`);
