const fs = require("fs");
for (const file of ["components/SparklineDetailed.tsx", "components/SparklineMini.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("Number.isFinite(value)") || !source.includes("value >= 0")) {
    throw new Error(`${file} must normalize nullable/non-numeric frequency values`);
  }
}
console.log("sparkline frequency null/number regression: PASS");
