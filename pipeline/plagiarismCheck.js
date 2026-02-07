// plagiarismCheck.js — AI nélküli, stabil, gyors verzió
const mysql = require("mysql2/promise");

// --- Normalizálás ---
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóöőúüű0-9 ]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Tokenizálás ---
function tokenize(text) {
  return new Set(normalize(text).split(" "));
}

// --- Jaccard similarity ---
function jaccard(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

// --- Plágium ellenőrzés ---
async function plagiarismCheck(articleId, shortSummary, longSummary) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
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
    const scoreShort = jaccard(original, shortSummary);
    const scoreLong = jaccard(original, longSummary);

    // 3) A kettő közül a magasabb a plágiumScore
    const plagiarismScore = Math.max(scoreShort, scoreLong);

    // 4) Mentés
    await conn.execute(
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
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { plagiarismCheck };
