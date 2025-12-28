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
      shortSummary,
      longSummary,
      plagiarismScore,
      trendKeywords,
      source,
    } = payload;

    await conn.execute(
      `
      INSERT INTO summaries (
        article_id,
        content,
        detailed_content,
        plagiarism_score,
        trend_keywords,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        detailed_content = VALUES(detailed_content),
        plagiarism_score = VALUES(plagiarism_score),
        trend_keywords = VALUES(trend_keywords),
        source = VALUES(source)
      `,
      [
        articleId,
        shortSummary,
        longSummary,
        plagiarismScore,
        trendKeywords,
        source,
      ]
    );

    await conn.end();

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { saveSummary };
