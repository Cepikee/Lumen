// scripts/cleanCategories.js

import path from "path";
import { fileURLToPath } from "url";

// --- ABS PATH FIX ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A scripts mappa a projekt root alatt van → fel kell lépni 1-et
const ROOT = path.resolve(__dirname, "..");

function r(p) {
  return path.join(ROOT, p);
}

export async function cleanCategories() {
  console.log(">>> CLEAN CATEGORIES START <<<");

  // --- DINAMIKUS IMPORTOK (ESM + változó path) ---
  const { db } = await import(r("lib/db.js"));

  // --- IDE JÖN A TISZTÍTÓ LOGIKA ---
  console.log("DB OK, SECURITY OK – fut a tisztítás...");

  // Példa:
  // await db.query("UPDATE summaries SET category = TRIM(category)");

  console.log(">>> CLEAN CATEGORIES DONE <<<");
}
