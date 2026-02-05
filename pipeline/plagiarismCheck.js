// plagiarismCheck.js — 6-instance kompatibilis, modern verzió
const mysql = require("mysql2/promise");

async function plagiarismCheck(articleId, shortSummary, baseUrl) {
  try {
    const prompt = `
Ellenőrizd a következő szöveget plágium szempontból.
Adj vissza egyetlen számot 0 és 1 között, semmi mást.
Ha szeretnéd, javítsd a szöveget is, és írd a végére így:
[JAVÍTOTT]: <új szöveg>

Szöveg:
${shortSummary}
    `.trim();

    // AI hívás (már a cron.js által adott instance-re)
    const raw = await global.callOllama(baseUrl, prompt, 128);

    // --- plágium pontszám kinyerése ---
    const score = parseFloat(raw);
    const finalScore = isNaN(score) ? 0 : score;

    // --- javított szöveg kinyerése ---
    let improved = shortSummary;
    const marker = "[JAVÍTOTT]:";
    if (raw.includes(marker)) {
      improved = raw.split(marker)[1].trim();
    }

    // --- adatbázis frissítés ---
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    await conn.execute(
      `
      UPDATE summaries
      SET plagiarism_score = ?, content = ?
      WHERE article_id = ?
      `,
      [finalScore, improved, articleId]
    );

    await conn.end();

    return {
      ok: true,
      plagiarismScore: finalScore,
      summaryShort: improved,
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { plagiarismCheck };
