"use strict";

const { isV2Enabled } = require("./feature-flags");
const { adaptDedupClusterResult } = require("./dedup-cluster-adapter");

/**
 * Single runtime handoff for the stable legacy dedup/cluster snapshot.
 * The feature-off branch does no adapter work and returns no V2 value.
 */
function adaptOptionalDedupClusterSnapshot(snapshot, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return undefined;
  const adapt = options.adapt || adaptDedupClusterResult;
  try {
    return adapt(snapshot);
  } catch (error) {
    options.logger?.({ event: "v2_dedup_cluster_adapter_failed", error: String(error?.message || error) });
    return { outcome: "error", reason: "adapter_failed" };
  }
}

module.exports = { adaptOptionalDedupClusterSnapshot };
