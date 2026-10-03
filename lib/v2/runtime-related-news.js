"use strict";

const { isV2Enabled } = require("./feature-flags");
const { projectRelatedNews } = require("./related-news-projection");

function adaptOptionalRelatedProjection(snapshot, options = {}) {
  const enabled = options.enabled ?? isV2Enabled();
  if (!enabled) return undefined;
  const project = options.project || projectRelatedNews;
  try {
    return project(snapshot);
  } catch (error) {
    options.logger?.({ event: "v2_related_projection_failed", error: String(error?.message || error) });
    return { outcome: "error", reason: "projection_failed" };
  }
}

module.exports = { adaptOptionalRelatedProjection };
