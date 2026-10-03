const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("pipeline batch routes claim heartbeat failures through article failure handling", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "pipeline", "cron.js"),
    "utf8",
  );
  const batch = source.slice(source.indexOf("async function processBatch"), source.indexOf("async function fetchFeedInternally"));

  assert.match(batch, /let claim = null;/);
  const tryIndex = batch.indexOf("try {");
  const heartbeatIndex = batch.indexOf('await heartbeatWorker(pool, WORKER_ID, "claim")');
  assert.ok(tryIndex >= 0 && heartbeatIndex > tryIndex, "claim heartbeat must be covered by the failure handler");
  assert.match(batch, /if \(claim\) \{[\s\S]*?pipelineState\.failArticle\(claim, "pipeline", err\)/);
});
