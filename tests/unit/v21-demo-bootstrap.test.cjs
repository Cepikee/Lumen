"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertLocalDemoTarget } = require("../../scripts/dev-demo-bootstrap.cjs");

const base = { UTOM_DEV_DEMO_BOOTSTRAP: "true", NODE_ENV: "development", DB_HOST: "127.0.0.1", DB_NAME: "utom_dev" };

test("V2.1 demo bootstrap csak explicit loopback utom_dev célponton engedélyezett", () => {
  assert.doesNotThrow(() => assertLocalDemoTarget(base));
  assert.throws(() => assertLocalDemoTarget({ ...base, DB_NAME: "production" }), /utom_dev/);
  assert.throws(() => assertLocalDemoTarget({ ...base, DB_HOST: "db.example.invalid" }), /loopback/);
  assert.throws(() => assertLocalDemoTarget({ ...base, NODE_ENV: "production" }), /productionben tiltott/);
  assert.throws(() => assertLocalDemoTarget({ ...base, UTOM_DEV_DEMO_BOOTSTRAP: "false" }), /true szükséges/);
});

test("V2.1 demo bootstrap canonical latest migrationre és fizetős szolgáltatás nélküli seedre hivatkozik", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync("scripts/dev-demo-bootstrap.cjs", "utf8");
  assert.match(source, /loadMigrations\(\)/);
  assert.match(source, /migrations\.at\(-1\)\.version/);
  assert.match(source, /articles = Array\.from\(\{ length: 40 \}/);
  assert.match(source, /paidAiCalls: 0/);
  assert.match(source, /paymentCalls: 0/);
  for (const slug of ["telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu"]) {
    assert.match(source, new RegExp(`\\[\\"${slug}\\"`));
  }
});
