const fs = require("fs");
const line = fs.readFileSync("components/InsightLineChart.tsx", "utf8");
const ring = fs.readFileSync("components/InsightSourceRing.tsx", "utf8");
if (!line.includes("Number(p?.count)") || !line.includes("Number.isFinite(p.count)")) throw new Error("line chart must normalize count values");
if (!ring.includes("Number.isFinite(value)")) throw new Error("source ring must reject non-finite percentages");
console.log("insight canvas number regression: PASS");
