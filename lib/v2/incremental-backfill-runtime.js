"use strict";

const { isV2Enabled } = require("./feature-flags");
const { runIncrementalBackfill } = require("./incremental-backfill");

async function executeIncrementalBackfill({ repository, input = {}, processArticle, budget, env = process.env }) {
  return runIncrementalBackfill({ repository, input: { ...input, featureEnabled: isV2Enabled(env) && input.featureEnabled !== false }, processArticle, budget });
}

module.exports = { executeIncrementalBackfill };
