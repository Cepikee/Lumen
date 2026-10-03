const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const sparkline = read("components/Sparkline.tsx");
const detailed = read("components/SparklineDetailed.tsx");
const feed = read("components/FeedList.tsx");
const dns = read("components/UtomDns.tsx");
const overview = read("components/InsightsOverviewChart.tsx");
const dnsOverview = read("components/UtomDnsOsszkep.tsx");

assert.match(sparkline, /const safeHistory = \(Array\.isArray\(history\) \? history : \[\]\)/);
assert.match(detailed, /function filterByPeriod\(history: HistoryPoint\[\], period: string, lastDate: Date, startDate\?: string, endDate\?: string\)/);
assert.match(detailed, /if \(period === "custom"\)/);
assert.match(feed, /const safeItems = Array\.isArray\(items\)/);
assert.match(dns, /Array\.isArray\(data\?\.items\)/);
assert.match(overview, /Array\.isArray\(data\) \? data : \[\]/);
assert.match(dnsOverview, /const finiteNonNegative =/);

console.log("frontend runtime safety batch regression: PASS");
