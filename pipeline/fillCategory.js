// fillCategory.js — OpenAI verzió (javított, prompt változatlan)
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

    if (!rows || rows.length === 0) {
      console.error(`[CAT] ❌ Nincs ilyen cikk: id=${articleId}`);
      return { ok: false };
    }

    let contentText = rows[0].content_text || "";
    let shortSummary = rows[0].short_summary || "";

    // 2) Input kiválasztása — először summary
    let baseText =
      shortSummary && shortSummary.trim().length > 40
        ? shortSummary
        : contentText;

    if (!baseText || baseText.trim().length < 40) {
      console.error(`[CAT] ❌ Nincs elég szöveg kategorizáláshoz! id=${articleId}`);
      return { ok: false };
    }

    baseText = baseText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);

    // 3) A RÉGI PROMPTOD — érintetlenül
    const prompt = `
Cikk szöveg:
${baseText}

Kategóriák:
${VALID_CATEGORIES.join(", ")}

Feladat:
Válaszd ki a cikkhez legjobban illő kategóriát a listából, és csak a kategória nevét írd ki.
    `.trim();

    // 4) OpenAI hívás
    let rawCategory = await callOpenAI(prompt, 40);
    let category = rawCategory.trim();

    // 5) Validáció
    if (!isValidCategory(category)) {
      console.warn(`[CAT] ⚠️ Érvénytelen kategória: "${category}". Újrapróbálás...`);

      rawCategory = await callOpenAI(prompt, 40);
      category = rawCategory.trim();
    }

    if (!isValidCategory(category)) {
      console.error(`[CAT] ❌ AI nem adott érvényes kategóriát! id=${articleId} RAW="${rawCategory}"`);
      return { ok: false };
    }

    const finalCategory = VALID_CATEGORIES.find(
      c => c.toLowerCase() === category.toLowerCase()
    );

    // 6) Mentés
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
