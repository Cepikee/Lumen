// scripts/cleanCategories.js

import path from "path";
import { fileURLToPath } from "url";

// ABS PATH FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function r(p) {
  return path.join(ROOT, p);
}

export async function cleanCategories() {
  console.log(">>> CLEAN CATEGORIES START <<<");

  // DINAMIKUS IMPORT – ESM-ben ez az egyetlen mód változó path-ra
  const { db } = await import(r("lib/db.js"));
  const { securityCheck } = await import(r("lib/security.js"));

  // --- IDE JÖN A TISZTÍTÓ LOGIKA ---
  console.log("DB OK, SECURITY OK – fut a tisztítás...");

  // ... a te kódod ...

  console.log(">>> CLEAN CATEGORIES DONE <<<");
}
