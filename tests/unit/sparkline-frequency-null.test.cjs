const fs = require("fs");
for (const file of ["components/SparklineDetailed.tsx", "components/SparklineMini.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  if (!/Number\.isFinite\(p\.freq\)/.test(source) || !/p\.freq\s*>=\s*0/.test(source)) {
    throw new Error(`${file} must reject nullable, non-numeric and negative frequency values`);
  }
}
console.log("sparkline frequency null/number regression: PASS");
