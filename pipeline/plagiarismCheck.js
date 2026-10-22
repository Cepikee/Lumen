// plagiarismCheck.js — AI nélküli, stabil, gyors verzió
const mysql = require("mysql2/promise");
const { assessContentOverlap } = require("../lib/content-overlap");

// --- Plágium ellenőrzés ---
async function plagiarismCheck(articleId, shortSummary, longSummary, options = {}) {
  const ownsConnection = !options.connection;
  const conn = options.connection || await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  try {
    // 1) Eredeti cikk lekérése
    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const original = rows?.[0]?.content_text ?? "";

    if (!original || original.trim().length < 50) {
      return { ok: false, error: "Üres eredeti szöveg" };
    }

    // 2) Similarity számítás
    const shortAssessment = assessContentOverlap(original, shortSummary);
    const longAssessment = assessContentOverlap(original, longSummary);

    // 3) A kettő közül a magasabb a plágiumScore
    const plagiarismScore = Math.max(shortAssessment.jaccard, longAssessment.jaccard);
    const reviewReasons = [...new Set([...shortAssessment.reasons, ...longAssessment.reasons])];
    const reviewRequired = shortAssessment.reviewRequired || longAssessment.reviewRequired;

    // 4) Mentés
    if (options.persist !== false) await conn.execute(
      `
      UPDATE summaries
      SET plagiarism_score = ?
      WHERE article_id = ?
      `,
      [plagiarismScore, articleId]
    );

    return {
      ok: true,
      plagiarismScore,
      reviewRequired,
      reviewReasons,
      assessments: { short: shortAssessment, long: longAssessment },
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    if (ownsConnection) await conn.end();
  }
}

module.exports = { plagiarismCheck };
