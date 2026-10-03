const fs = require("fs");
const source = fs.readFileSync("components/ProfileView.tsx", "utf8");
if (!source.includes("Number.isNaN(date.getTime())")) throw new Error("profile must guard invalid user dates");
if (!source.includes("formatUserDateOnly(user.premium_until)")) throw new Error("profile premium date must use safe formatter");
console.log("profile date contract regression: PASS");
