const fs = require("fs");
const source = fs.readFileSync("components/CategoryHeatMap.tsx", "utf8");
if (!source.includes("Number.isFinite(strength)")) throw new Error("category heatmap must normalize strength");
if (!source.includes("Math.min(1, Math.max(0")) throw new Error("category heatmap opacity must be bounded");
console.log("category heatmap input regression: PASS");
