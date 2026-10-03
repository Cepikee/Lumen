const fs = require("fs");
const source = fs.readFileSync("app/insights/category/[category]/page.tsx", "utf8");
if (!source.includes("Number.isSafeInteger(parsedPage)")) throw new Error("category page must normalize page input");
if (!source.includes("parsedLimit <= 100")) throw new Error("category page must bound limit input");
if (!source.includes('"Cím nélkül"')) throw new Error("category page must handle missing item titles");
if (!source.includes("Number.isNaN(date.getTime())")) throw new Error("category page must handle invalid dates");
console.log("category page input contract regression: PASS");
