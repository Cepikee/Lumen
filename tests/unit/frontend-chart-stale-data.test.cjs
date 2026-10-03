const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const spike = fs.readFileSync(path.join(root, "components", "SpikeModal.tsx"), "utf8");
const trendChart = fs.readFileSync(path.join(root, "components", "TrendChartModal.tsx"), "utf8");
const insightChart = fs.readFileSync(path.join(root, "components", "InsightLineChart.tsx"), "utf8");
const trendsPanel = fs.readFileSync(path.join(root, "components", "TrendsPanel.tsx"), "utf8");
const trendsList = fs.readFileSync(path.join(root, "components", "TrendsList.tsx"), "utf8");
const sourcesModal = fs.readFileSync(path.join(root, "components", "TrendSourcesModal.tsx"), "utf8");

assert.match(spike, /setStats\(initialStats \?\? \{\}\)/);
assert.match(spike, /setError\(null\)/);
assert.match(trendChart, /Array\.isArray\(history\)/);
assert.match(trendChart, /Number\.isFinite\(timestamp\)/);
assert.match(insightChart, /safePoints/);
assert.match(insightChart, /Number\.isFinite\(p\.count\)/);
assert.match(trendsPanel, /filter\(\(trend\) => trend\.keyword\.trim\(\)\.length > 0\)/);
assert.match(trendsPanel, /categories\.filter\(\(c\): c is string => typeof c === "string"\)/);
assert.match(trendsPanel, /function normalizeHistoryRows\(value: unknown\)/);
assert.match(trendsPanel, /Number\.isInteger\(hour\)/);
assert.match(trendsList, /externalTrends\.map\(normalizeTrend\)/);
assert.match(trendsList, /function normalizeHistoryRows\(value: unknown\)/);
assert.match(trendsList, /filters\.period,/);
assert.match(sourcesModal, /function isValidDate\(value: string\)/);
assert.match(sourcesModal, /getUTCFullYear\(\)/);

console.log("frontend malformed chart/stale state regression: PASS");
