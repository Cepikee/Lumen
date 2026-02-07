// summarizeLong.js — stabil, optimalizált verzió
const mysql = require("mysql2/promise");

// --- Validáció ---
function isValidDetailed(text) {
  if (!text) return false;
  const t = text.trim();

  if (t.length < 150) return false;

  if (
    t.toLowerCase().includes("írj részletes") ||
    t.toLowerCase().includes("elemzést") ||
    t.toLowerCase().includes("sajnálom")
  ) {
    return false;
  }

  if (t.startsWith("<") && t.endsWith(">")) return false;

  return true;
}

// --- Hosszú elemzés ---
async function summarizeLong(articleId, shortSummary) {
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

    let contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 50) {
      console.error(`[LONG] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 🔥 2) Rövidítés — max 2000 karakter
    contentText = contentText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    // 🔥 3) Optimalizált prompt — shortSummary + rövidített content
    const prompt = `
Készíts részletes, 3–5 bekezdéses elemzést magyar nyelven, plágiummentesen.

Rövid összefoglaló:
${shortSummary}

A cikk részletei:
${contentText}
    `.trim();

    // 🔥 4) AI hívás — max 300 token (nem 1000!)
    let detailed = await global.callOllama(prompt, 300);

    // 🔥 5) Validáció — csak 1 újrapróbálás
    if (!isValidDetailed(detailed)) {
      console.warn(`[LONG] ⚠️ Első elemzés érvénytelen, újrapróbálás...`);
      detailed = await global.callOllama(prompt, 300);
    }

    // 🔥 6) Fallback — ha még mindig rossz
    if (!isValidDetailed(detailed)) {
      detailed = `
A cikk rövid összefoglalója alapján az alábbi elemzés készíthető:

${shortSummary}

A részletes tartalom hiánya miatt az elemzés korlátozott.
      `.trim();
    }

    // 7) Mentés
    await conn.execute(
      `
      INSERT INTO summaries (article_id, detailed_content)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE detailed_content = VALUES(detailed_content), created_at = NOW()
      `,
      [articleId, detailed]
    );

    return { ok: true, detailed };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { summarizeLong };
