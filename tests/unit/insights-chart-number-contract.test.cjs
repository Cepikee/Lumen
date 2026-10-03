const fs = require("fs");
const source = fs.readFileSync("components/InsightsOverviewChart.tsx", "utf8");
if (!source.includes("Number.isNaN(d.getTime())")) {
  throw new Error("insights chart must skip invalid history dates");
}
if (!source.includes("Number.isFinite(rawValue)") || !source.includes("const safePred = Number.isFinite(pred)")) {
  throw new Error("insights chart must reject non-finite counts and forecasts");
}
console.log("insights chart number/date regression: PASS");
