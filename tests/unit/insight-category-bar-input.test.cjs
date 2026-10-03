const fs = require("fs");
const source = fs.readFileSync("components/InsightCategoryBar.tsx", "utf8");
if (!source.includes("Array.isArray(categories)")) throw new Error("category bar must guard malformed category payloads");
if (!source.includes('cat.trim().length > 0')) throw new Error("category bar must skip empty category labels");
console.log("insight category bar input regression: PASS");
