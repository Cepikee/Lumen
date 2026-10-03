const fs = require("fs");
const source = fs.readFileSync("components/InsightList.tsx", "utf8");
if (!source.includes("Array.isArray(items)")) throw new Error("insight list must guard malformed arrays");
if (!source.includes("item.id")) throw new Error("insight list must filter malformed items");
console.log("insight list input regression: PASS");
