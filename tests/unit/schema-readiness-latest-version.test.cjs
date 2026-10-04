"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED_SCHEMA } = require("../../lib/operations");
const { loadMigrations } = require("../../db/migration-core.cjs");

test("schema readiness tracks the latest migration version", () => {
  const migrations = loadMigrations();
  assert.equal(REQUIRED_SCHEMA.latestVersion, migrations.at(-1).version);
});

console.log("schema readiness latest migration regression: PASS");
