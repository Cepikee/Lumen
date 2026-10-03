const fs = require("fs");
const source = fs.readFileSync("app/page.tsx", "utf8");

const start = source.indexOf("async function fetchFilteredPage");
const end = source.indexOf("// --- Normál fetch ---", start);
if (start < 0 || end < 0) throw new Error("filtered feed loader not found");
const loader = source.slice(start, end);
if (!loader.includes("setLoading(true)")) {
  throw new Error("filtered feed requests must enter loading state");
}
if (!loader.includes("setLoading(false)")) {
  throw new Error("filtered feed requests must clear loading state");
}

console.log("feed filtered loading-state regression: PASS");
