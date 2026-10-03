const fs = require("fs");
const source = fs.readFileSync("components/HiradoLayout2026.tsx", "utf8");
if (!source.includes('timeZone: "Europe/Budapest"')) {
  throw new Error("Hirado layout date must use Budapest timezone");
}
console.log("hirado layout local-date regression: PASS");
