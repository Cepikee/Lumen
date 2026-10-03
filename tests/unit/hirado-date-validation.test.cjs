const fs = require("fs");
const source = fs.readFileSync("app/api/hirado/read/[date]/route.ts", "utf8");

if (!source.includes('error: "INVALID_DATE"')) {
  throw new Error("daily report route must reject calendar-invalid dates");
}
if (!source.includes("getUTCFullYear()") || !source.includes("getUTCMonth()")) {
  throw new Error("daily report route must validate date components, not only regex shape");
}

console.log("hirado invalid calendar date regression: PASS");
