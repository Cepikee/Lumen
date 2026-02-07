// fillCategory.js — optimalizált, stabil, 1-instance kompatibilis verzió
const mysql = require("mysql2/promise");

// --- Valid kategóriák ---
const VALID_CATEGORIES = [
  "Politika",
  "Gazdaság",
  "Közélet",
  "Kultúra",
  "Sport",
  "Tech",
  "Egészségügy",
  "Oktatás"
];

// --- Validáció ---
function isValidCategory(cat) {
  if (!cat) return false;
  const clean = cat.trim().toLowerCase();
  return VALID_CATEGORIES.some(c => c.toLowerCase() === clean);
}

// --- Lokális kategória detektálás a teljes AI válaszból ---
function extractCategoryFromText(rawText) {
  if (!rawText) return null;

  const lower = rawText.toLowerCase();

  for (const cat of VALID_CATEGORIES) {
    const cLower = cat.toLowerCase();
    if (lower.includes(cLower)) {
      return cat; // mindig a nagybetűs, hivatalos verziót adjuk vissza
    }
  }

  return null;
}

// --- Egy cikk kategorizálása ---
async function categorizeArticle(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT content_text, short_summary FROM articles WHERE id = ?",
      [articleId]
    );

    let contentText = rows?.[0]?.content_text ?? "";
    let shortSummary = rows?.[0]?.short_summary ?? "";

    if (!shortSummary || shortSummary.trim().length < 20) {
      console.error(`[CAT] ❌ Nincs short summary! id=${articleId}`);
      return { ok: false };
    }

    // 2) Rövidítés — max 1000 karakter
    contentText = contentText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    // 3) Prompt — VÁLTOZATLAN!
    const prompt = `
Cikk szöveg:
${contentText}

Kategóriák:
${VALID_CATEGORIES.join(", ")}

Feladat:
Válaszd ki a cikkhez legjobban illő kategóriát a listából, és csak a kategória nevét írd ki.
`.trim();

    // 4) AI hívás — gyors, kevés token
    let rawCategory = await global.callOllama(prompt, 60);

    // 4/A) Első próbálkozás: AI válasz közvetlenül
    let category = rawCategory.trim();

    // 4/B) Ha nem valid → próbáljuk lokálisan kinyerni a teljes szövegből
    if (!isValidCategory(category)) {
      const extracted = extractCategoryFromText(rawCategory);
      if (extracted) {
        category = extracted;
      }
    }

    // 4/C) Ha még mindig nem valid → újrapróbálás AI-val
    if (!isValidCategory(category)) {
      console.warn(`[CAT] ⚠️ Érvénytelen kategória: "${rawCategory}". Újrapróbálás...`);
      rawCategory = await global.callOllama(prompt, 60);

      const extracted = extractCategoryFromText(rawCategory);
      category = extracted || rawCategory.trim();
    }

    // 4/D) Ha még mindig nem valid → hiba
    if (!isValidCategory(category)) {
      console.error(`[CAT] ❌ AI nem adott érvényes kategóriát! id=${articleId}`);
      return { ok: false };
    }

    // 5) Mentés — mindig nagybetűs, hivatalos formában
    const finalCategory = VALID_CATEGORIES.find(
      c => c.toLowerCase() === category.toLowerCase()
    );

    await conn.execute(
      "UPDATE articles SET category = ? WHERE id = ?",
      [finalCategory, articleId]
    );

    console.log(`[CAT] ✔️ Mentve: ${articleId} → ${finalCategory}`);
    return { ok: true, category: finalCategory };

  } catch (err) {
    console.error(`[CAT] ❌ Hiba:`, err);
    return { ok: false };
  } finally {
    await conn.end();
  }
}

module.exports = { categorizeArticle };
