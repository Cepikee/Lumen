"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { adaptOptionalDedupClusterSnapshot } = require("../../lib/v2/runtime-dedup-cluster");

test("M3 runtime handoff is completely inert when the V2 flag is off", () => {
  let calls = 0;
  const result = adaptOptionalDedupClusterSnapshot({ articleId: 1 }, {
    enabled: false,
    adapt: () => { calls += 1; return {}; },
  });
  assert.equal(result, undefined);
  assert.equal(calls, 0);
});

test("M3 runtime handoff invokes the canonical adapter exactly once when enabled", () => {
  let calls = 0;
  const snapshot = { articleId: 7, canonicalUrl: "https://example.com/a", clusterResult: { clusterId: 3 } };
  const result = adaptOptionalDedupClusterSnapshot(snapshot, {
    enabled: true,
    adapt: (input) => { calls += 1; assert.equal(input, snapshot); return Object.freeze({ contractVersion: "v2.dedup-cluster.1" }); },
  });
  assert.equal(calls, 1);
  assert.equal(result.contractVersion, "v2.dedup-cluster.1");
});

test("M3 runtime adapter errors are isolated and observable", () => {
  const events = [];
  const result = adaptOptionalDedupClusterSnapshot({ articleId: 1 }, {
    enabled: true,
    adapt: () => { throw new TypeError("bad_snapshot"); },
    logger: (event) => events.push(event),
  });
  assert.deepEqual(result, { outcome: "error", reason: "adapter_failed" });
  assert.deepEqual(events, [{ event: "v2_dedup_cluster_adapter_failed", error: "bad_snapshot" }]);
});

test("pipeline has one canonical, feature-gated M3 runtime handoff", () => {
  const source = fs.readFileSync("pipeline/cron.js", "utf8");
  assert.equal((source.match(/^\s*\?\s*adaptOptionalDedupClusterSnapshot\(/gm) || []).length, 1);
  assert.match(source, /isV2Enabled\(\)\s*\n\s*\?/);
  assert.match(source, /clusterResult:\s*legacyClusterSnapshot/);
});
