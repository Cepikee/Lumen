"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { shouldPreMigrate } = require("../../scripts/run-mysql-integration-suite.cjs");

test("mysql wrapper leaves recovery-owned phased reset isolated", () => {
  assert.equal(shouldPreMigrate("mysql-pipeline-recovery.test.cjs"), false);
  assert.equal(shouldPreMigrate("mysql-v2-schema.test.cjs"), true);
});
