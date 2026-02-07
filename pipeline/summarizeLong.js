// summarizeLong.js — 6-instance kompatibilis, modern verzió
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
async function summarizeLong(articleId, shortSummary, baseUrl) {
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
      console.error(`[LONG] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 2) Prompt
    const prompt = `Írj részletes elemzést (3–6 bekezdés), plágiummentesen, kizárólag magyar nyelven:

${contentText}
`.trim();

    // 3) AI hívás (ugyanúgy, mint a short.js-ben)
    let detailed = await global.callOllama(prompt, 1000);

    // 4) Validálás + újrapróbálás
    if (!isValidDetailed(detailed)) {
      console.warn(`[LONG] ⚠️ Első elemzés érvénytelen, újrapróbálás...`);
      detailed = await global.callOllama(prompt, 1000);
    }

    // 5) Ha még mindig rossz → fallback
    if (!isValidDetailed(detailed)) {
      detailed = `
A cikk tartalma rövid vagy hiányos, ezért az elemzés csak alapvető megállapításokat tartalmaz.
A szöveg fő témája: ${shortSummary}.
További részletek a cikkben nem szerepelnek, ezért az elemzés korlátozott.
      `.trim();
    }

    // 6) Mentés
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
