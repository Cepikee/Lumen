"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { demoGuardFailure, isV2DemoAllowed, selectedDemoUser, requestHostIsLoopback } = require("../../lib/dev-v2-demo");

test("V2 demo is enabled only for explicit loopback utom_dev development", () => {
  const env = { NODE_ENV: "development", UTOM_V2_DEMO_ENABLED: "true", DB_HOST: "127.0.0.1", DB_NAME: "utom_dev" };
  assert.equal(isV2DemoAllowed(env, "127.0.0.1:3000"), true);
  assert.equal(isV2DemoAllowed({ ...env, NODE_ENV: "production" }, "127.0.0.1:3000"), false);
  assert.equal(isV2DemoAllowed(env, "203.0.113.10:3000"), false);
  assert.equal(isV2DemoAllowed({ ...env, DB_NAME: "utom_retention_test" }, "127.0.0.1:3000"), false);
  assert.equal(demoGuardFailure(env, "203.0.113.10:3000"), "request_not_loopback");
  assert.equal(requestHostIsLoopback("[::1]:3000"), true);
});

test("V2 demo user selector is allowlisted and production route stays guarded", () => {
  assert.equal(selectedDemoUser("premium"), "premium");
  assert.equal(selectedDemoUser("not-a-user"), "anonymous");
  const route = fs.readFileSync(path.join(__dirname, "../../app/api/dev/v2-demo/route.ts"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../../app/dev/v2-demo/page.tsx"), "utf8");
  assert.match(route, /return new NextResponse\(null, \{ status: 404 \}\)/);
  assert.match(page, /notFound\(\)/);
});
