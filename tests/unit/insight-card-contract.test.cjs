const fs = require("fs");
const source = fs.readFileSync("components/InsightCard.tsx", "utf8");
if (!source.includes('href !== "/null"') || !source.includes('href !== "/undefined"')) throw new Error("insight card must reject placeholder links");
if (!source.includes("safeTitle")) throw new Error("insight card must handle missing titles");
if (!source.includes("Number.isFinite(Number(sources))")) throw new Error("insight card must normalize source counts");
console.log("insight card contract regression: PASS");
