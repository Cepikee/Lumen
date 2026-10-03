"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeInsightsPath } = require("../../lib/premium-insights-path");

test("premium insights proxy accepts only known endpoints and bounded categories", () => {
  assert.equal(normalizeInsightsPath(undefined), "");
  assert.equal(normalizeInsightsPath(["timeseries", "all"]), "timeseries/all");
  assert.equal(normalizeInsightsPath(["category", "Tech"]), "category/Tech");
  assert.equal(normalizeInsightsPath(["unknown"]), null);
});

test("premium insights proxy rejects traversal and encoded separators", () => {
  assert.equal(normalizeInsightsPath(["..", "forecast"]), null);
  assert.equal(normalizeInsightsPath(["category", "%2e%2e"]), null);
  assert.equal(normalizeInsightsPath(["category", "a%2Fb"]), null);
  assert.equal(normalizeInsightsPath(["category", "a%5Cb"]), null);
  assert.equal(normalizeInsightsPath(["category", "%20%20"]), null);
});
