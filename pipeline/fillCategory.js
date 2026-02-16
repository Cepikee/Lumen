// fillCategory.js — OpenAI verzió
const mysql = require("mysql2/promise");
const { callOpenAI } = require("./aiClient");

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

// --- Lokális kategória detektálás ---
function extractCategoryFromText(rawText) {
  if (!rawText) return null;

  const lower = rawText.toLowerCase();

  for (const cat of VALID_CATEGORIES) {
    if (lower.includes(cat.toLowerCase())) {
      return cat;
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

    // 3) Prompt — OpenAI verzió
    const prompt = `
Cikk szöveg:
${contentText}

Kategóriák:
${VALID_CATEGORIES.join(", ")}

Feladat:
Válaszd ki a cikkhez legjobban illő kategóriát a listából, és csak a kategória nevét írd ki.
    `.trim();

    // 4) OpenAI hívás
    let rawCategory = await callOpenAI(prompt, 40);
    let category = rawCategory.trim();

    // 5) Validáció + fallback
    if (!isValidCategory(category)) {
      const extracted = extractCategoryFromText(rawCategory);
      if (extracted) category = extracted;
    }

    if (!isValidCategory(category)) {
      console.warn(`[CAT] ⚠️ Érvénytelen kategória: "${rawCategory}". Újrapróbálás...`);
      rawCategory = await callOpenAI(prompt, 40);

      const extracted = extractCategoryFromText(rawCategory);
      category = extracted || rawCategory.trim();
    }

    if (!isValidCategory(category)) {
      console.error(`[CAT] ❌ AI nem adott érvényes kategóriát! id=${articleId}`);
      return { ok: false };
    }

    // 6) Mentés
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
