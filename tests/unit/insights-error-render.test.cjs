const fs = require("fs");
const source = fs.readFileSync("app/insights/page.tsx", "utf8");
if (!source.includes("error: tsError")) throw new Error("insights page must consume timeseries errors");
if (!source.includes("Az idősor adatai nem tölthetők be.")) throw new Error("timeseries errors must be visible to users");
if (!source.includes("error ? (") || !source.includes("Az Insights adatai nem tölthetők be.")) throw new Error("insights errors must not render as an empty successful state");
console.log("insights error rendering regression: PASS");
