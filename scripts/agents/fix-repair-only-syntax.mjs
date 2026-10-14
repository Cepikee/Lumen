import fs from "node:fs";

const file = "scripts/agents/utom-brain-autoresearch.mjs";
let s = fs.readFileSync(file, "utf8");

const bt = String.fromCharCode(96);

const badOpen = "const reports = \\" + bt;
const goodOpen = "const reports = " + bt;

const openPos = s.indexOf(badOpen);

if (openPos < 0) {
  throw new Error("Hibas reports nyito template literal nem talalhato.");
}

if (s.indexOf(badOpen, openPos + badOpen.length) >= 0) {
  throw new Error("Tobb hibas reports nyitas van; nem vegzunk vak cseret.");
}

s =
  s.slice(0, openPos) +
  goodOpen +
  s.slice(openPos + badOpen.length);

const saveMarker = `
await save(
  "03-research-reports.md",
  reports
);`;

const savePos = s.indexOf(saveMarker, openPos);

if (savePos < 0) {
  throw new Error("03-research-reports save marker nem talalhato.");
}

const badClose = "\\" + bt + ";";
const closePos = s.lastIndexOf(badClose, savePos);

if (closePos < openPos) {
  throw new Error("Hibas reports zaro template literal nem talalhato.");
}

s =
  s.slice(0, closePos) +
  bt + ";" +
  s.slice(closePos + badClose.length);

fs.writeFileSync(file, s, "utf8");

console.log("REPORTS TEMPLATE FIX OK");
