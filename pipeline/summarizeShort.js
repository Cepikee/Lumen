// short.js — stabil, 1-instance kompatibilis verzió
const mysql = require("mysql2/promise");

// --- Validáció ---
function isValidSummary(text) {
  if (!text) return false;
  const t = text.trim();

  if (t.length < 40) return false;

  if (
    t.toLowerCase().includes("összefoglal") ||
    t.toLowerCase().includes("foglaljad") ||
    t.toLowerCase().includes("sajnálom")
  ) {
    return false;
  }

  if (t.startsWith("<") && t.endsWith(">")) return false;

  return true;
}

// --- Rövid összefoglaló ---
async function summarizeShort(articleId, baseUrl) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 50) {
      console.error(`[SHORT] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 2) Prompt
    const prompt = `Foglaljad össze a következő szöveget röviden, maximum 5 mondatban magyarul.
Csak az összefoglalót írd ki, bevezető mondat nélkül.
Ne írj olyat, hogy "Itt a lényeg", "Íme az összefoglaló", "Röviden", vagy bármilyen bevezetőt.
Csak magyarul válaszolj:

${contentText}`.trim();

    // 3) AI hívás — JAVÍTVA!
    let summary = await global.callOllama(prompt, 300);

    // 4) Validálás + újrapróbálás
    if (!isValidSummary(summary)) {
      console.warn(`[SHORT] ⚠️ Érvénytelen összefoglaló, újrapróbálás...`);
      summary = await global.callOllama(prompt, 300);
    }

    if (!isValidSummary(summary)) {
      console.error(`[SHORT] ❌ AI nem adott érvényes összefoglalót! articleId=${articleId}`);
      return { ok: false, error: "Érvénytelen összefoglaló" };
    }

    // 5) Mentés
    await conn.execute(
      `
      INSERT INTO summaries (article_id, content)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE content = VALUES(content), created_at = NOW()
      `,
      [articleId, summary]
    );

    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { summarizeShort };
