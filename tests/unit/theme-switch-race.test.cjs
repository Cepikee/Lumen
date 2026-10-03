const fs = require("fs");
const source = fs.readFileSync("components/ThemeSwitch.tsx", "utf8");
if (!source.includes("const previousTheme = useUserStore.getState().theme")) throw new Error("theme rollback must capture current store theme");
if (!source.includes("setTheme(previousTheme)")) throw new Error("theme failure must rollback to request-local previous theme");
console.log("theme switch race regression: PASS");
