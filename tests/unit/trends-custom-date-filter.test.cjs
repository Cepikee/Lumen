const fs = require("fs");
for (const file of ["components/TrendsList.tsx", "components/TrendsPanel.tsx"]) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes('day >= filters.startDate!') || !source.includes('day <= filters.endDate!')) {
    throw new Error(`${file} must compare custom trend dates as date-only values`);
  }
  if (source.includes('new Date(filters.startDate + "T00:00:00")')) {
    throw new Error(`${file} must not use host-timezone parsing for custom trend dates`);
  }
}
console.log("trends custom date filter regression: PASS");
