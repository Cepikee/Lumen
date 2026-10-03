const fs = require("fs");
const sparkline = fs.readFileSync("components/InsightSparkline.tsx", "utf8");
const donut = fs.readFileSync("components/DonutChart.tsx", "utf8");
if (!sparkline.includes("Number.isFinite(numeric)")) throw new Error("sparkline must normalize invalid values");
if (!donut.includes("Number.isFinite(value)") || !donut.includes('"Ismeretlen"')) throw new Error("donut must normalize labels and percentages");
console.log("insight chart input contract regression: PASS");
