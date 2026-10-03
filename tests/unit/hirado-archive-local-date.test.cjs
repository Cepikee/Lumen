const fs = require("fs");
const source = fs.readFileSync("components/HiradoArchiveSlider.tsx", "utf8");

if (!source.includes('timeZone: "Europe/Budapest"')) {
  throw new Error("archive today marker must use Budapest local date");
}
if (source.includes("new Date().toISOString().split(\"T\")[0]")) {
  throw new Error("archive today marker must not use UTC date key");
}

console.log("hirado archive local-date regression: PASS");
