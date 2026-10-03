const fs = require("fs");
const source = fs.readFileSync("components/FeedItemCard.tsx", "utf8");
if (!source.includes('return "ismeretlen időpont"')) throw new Error("feed card must handle invalid dates");
if (!source.includes('return "Ismeretlen dátum"')) throw new Error("feed card must handle invalid full dates");
if (!source.includes('"Cím nélkül"')) throw new Error("feed card must handle missing titles");
console.log("feed item null/date regression: PASS");
