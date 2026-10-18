"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { positiveInteger, runMaintenance } = require("../../scripts/maintenance.cjs");

test("maintenance uses bounded settings and cleans only the canonical expiry tables", async () => {
  assert.equal(positiveInteger("100", 1), 100);
  assert.equal(positiveInteger("0", 7), 7);
  assert.equal(positiveInteger("999999", 7), 7);
  const statements = [];
  const pool = {
    async query(sql) {
      statements.push(sql.replace(/\s+/g, " ").trim());
      return [{ affectedRows: 1 }];
    },
  };
  const result = await runMaintenance(pool, {
    env: { MAINTENANCE_BATCH_SIZE: "25", UTOM_RETENTION_EXECUTE: "false" },
  });
  assert.equal(statements.length, 9);
  assert.ok(statements.every((sql) => / LIMIT 25$/.test(sql)));
  assert.match(statements.join("\n"), /user_sessions WHERE expires_at < UTC_TIMESTAMP/);
  assert.match(statements.join("\n"), /email_outbox WHERE status='sent'/);
  assert.doesNotMatch(statements.join("\n"), /status='uncertain'/);
  assert.equal(result.rawTextRetention.status, "disabled");
});

test("maintenance rejects malformed retention values instead of interpolating them", async () => {
  const statements = [];
  const pool = { async query(sql) { statements.push(sql); return [{ affectedRows: 0 }]; } };
  await runMaintenance(pool, { env: { LOGIN_ATTEMPT_RETENTION_DAYS: "1 DAY; DROP TABLE users", MAINTENANCE_BATCH_SIZE: "50" } });
  assert.ok(statements.some((sql) => sql.includes("INTERVAL 30 DAY")));
  assert.ok(statements.every((sql) => !sql.includes("DROP TABLE")));
});
