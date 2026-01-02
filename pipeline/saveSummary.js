// pipeline/saveSummary.js
const mysql = require("mysql2/promise");

async function saveSummary(payload) {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    const {
      articleId,
      url,
      title,            // <-- ÚJ MEZŐ
      shortSummary,
      longSummary,
      plagiarismScore,
      trendKeywords,
      source,
      category
    } = payload;

    await conn.execute(
      `
      INSERT INTO summaries (
        article_id,
        url,
        title,               -- <-- ÚJ MEZŐ
        content,
        detailed_content,
        plagiarism_score,
        trend_keywords,
        source,
        category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        url = VALUES(url),
        title = VALUES(title),               -- <-- ÚJ MEZŐ
        content = VALUES(content),
        detailed_content = VALUES(detailed_content),
        plagiarism_score = VALUES(plagiarism_score),
        trend_keywords = VALUES(trend_keywords),
        source = VALUES(source),
        category = VALUES(category)
      `,
      [
        articleId,
        url,
        title,               // <-- ÚJ PARAMÉTER
        shortSummary,
        longSummary,
        plagiarismScore,
        trendKeywords,
        source,
        category
      ]
    );

    await conn.end();

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { saveSummary };
