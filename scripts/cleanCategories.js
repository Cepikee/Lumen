import path from "path";
import { fileURLToPath } from "url";

// ABS PATH FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
function r(p) {
  return path.join(ROOT, p);
}

// DB + SECURITY
import { db } from r("lib/db.js");
import { securityCheck } from r("lib/security.js");

export async function cleanCategories() {
  console.log(">>> CLEANING CATEGORIES <<<");

  // ide jön a logika amit eddig TS-ben használtál
}
