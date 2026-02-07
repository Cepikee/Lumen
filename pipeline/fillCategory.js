// fillCategory.js — stabil, 1-instance kompatibilis verzió
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

// --- Egy cikk kategorizálása ---
async function categorizeArticle(articleId, baseUrl) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 15) {
      console.error(`[CAT] ❌ Üres vagy túl rövid content_text! id=${articleId}`);
      return { ok: false };
    }

    const prompt = `
Cikk szöveg:
${contentText}

Kategóriák:
${VALID_CATEGORIES.join(", ")}

Feladat:
Válaszd ki a cikkhez legjobban illő kategóriát a listából, és csak a kategória nevét írd ki.
`.trim();

    // AI hívás — JAVÍTVA!
    let category = await global.callOllama(prompt, 100);

    if (!isValidCategory(category)) {
      console.warn(`[CAT] ⚠️ Érvénytelen kategória: "${category}". Újrapróbálás...`);
      category = await global.callOllama(prompt, 100);
    }

    if (!isValidCategory(category)) {
      console.error(`[CAT] ❌ AI nem adott érvényes kategóriát! id=${articleId}`);
      return { ok: false };
    }

    await conn.execute(
      "UPDATE articles SET category = ? WHERE id = ?",
      [category.trim(), articleId]
    );

    console.log(`[CAT] ✔️ Mentve: ${articleId} → ${category}`);
    return { ok: true, category };

  } catch (err) {
    console.error(`[CAT] ❌ Hiba:`, err);
    return { ok: false };
  } finally {
    await conn.end();
  }
}

module.exports = { categorizeArticle };
