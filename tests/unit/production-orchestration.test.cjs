"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "../..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("canonical workers and timers are explicit foreground systemd units", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["pipeline:worker"], "node pipeline/cron.js");
  assert.equal(pkg.scripts["maintenance:run"], "node scripts/maintenance.cjs");
  for (const name of ["utom-pipeline.service", "utom-image-worker.service"]) {
    const unit = read(`ops/systemd/${name}`);
    assert.match(unit, /Type=simple/);
    assert.match(unit, /EnvironmentFile=\/etc\/utom\/production\.env/);
    assert.match(unit, /Restart=always/);
    assert.match(unit, /KillSignal=SIGTERM/);
  }
  assert.match(read("ops/systemd/utom-email-outbox.timer"), /OnUnitActiveSec=1min/);
  assert.match(read("ops/systemd/utom-maintenance.timer"), /OnCalendar=/);
});

test("pipeline logging defaults to journald-compatible stdout without a fixed deployment path", () => {
  const source = read("pipeline/cron.js");
  assert.match(source, /UTOM_PIPELINE_LOG_FILE/);
  assert.doesNotMatch(source, /\/var\/www\/utom\/logs\/cron\.log/);
});
