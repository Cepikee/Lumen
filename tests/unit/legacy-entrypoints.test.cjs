const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

test("legacy init endpoint is an explicit tombstone, not a false cron success", () => {
  const source = fs.readFileSync(
    path.join(root, "app/api/init/route.ts"),
    "utf8",
  );

  assert.match(source, /legacy_init_endpoint_disabled/);
  assert.match(source, /status:\s*410/);
  assert.doesNotMatch(source, /Cron fut a háttérben/);
});

test("legacy scheduler fails fast and cannot start a second article pipeline", () => {
  const source = fs.readFileSync(path.join(root, "lib/cron.js"), "utf8");

  assert.match(source, /legacy_cron_disabled/);
  assert.match(source, /pipeline\/cron\.js/);
});
