const fs = require("fs");
const source = fs.readFileSync("app/api/hirado/archive/route.ts", "utf8");

if (!source.includes('status: 500')) {
  throw new Error("archive route must expose a JSON 500 response on DB failure");
}
if (!source.includes("ORDER BY date DESC, id DESC")) {
  throw new Error("archive ordering must be deterministic for equal dates");
}

console.log("hirado archive response/order regression: PASS");
