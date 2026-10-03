const fs = require("fs");
const source = fs.readFileSync("app/api/hirado/read/[date]/route.ts", "utf8");
if (!source.includes("ORDER BY dr.report_date DESC, dr.id DESC")) {
  throw new Error("daily report lookup must choose a deterministic latest row");
}
console.log("hirado report ordering regression: PASS");
