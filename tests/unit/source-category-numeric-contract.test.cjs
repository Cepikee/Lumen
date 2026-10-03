const fs = require("fs");
const source = fs.readFileSync("components/WSourceCategoryDistribution.tsx", "utf8");
if (!source.includes("Number((src as any)?.[c])")) throw new Error("source category values must be coerced to numbers");
if (!source.includes("Number.isFinite(value) && value >= 0 ? value : 0")) throw new Error("invalid category values must be zeroed");
if (!source.includes('key={`${src.source}-${sourceIndex}`}')) throw new Error("duplicate source rows need stable unique React keys");
console.log("source category numeric contract regression: PASS");
