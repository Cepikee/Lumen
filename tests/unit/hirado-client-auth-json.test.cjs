const fs = require("fs");
const source = fs.readFileSync("components/HiradoClient.tsx", "utf8");
const malformedBranch = source.match(/catch \{[\s\S]*?setUser\(null\);[\s\S]*?setUserLoaded\(true\);[\s\S]*?return;/);
if (!malformedBranch) throw new Error("malformed auth JSON must complete the user loading state");
console.log("hirado malformed auth JSON loading regression: PASS");
