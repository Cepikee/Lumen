// pipeline/saveSources.js
const mysql = require("mysql2/promise");

function cleanUrl(rawUrl) {
  try {
    const urlObj = new URL(rawUrl);
    urlObj.search = ""; // törli az összes query paramétert
    return urlObj.toString();
  } catch {
    return rawUrl;
  }
}

async function saveSources(articleId, url) {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let source = "ismeretlen";

    try {
      const cleaned = cleanUrl(url);
      source = new URL(cleaned).hostname.replace("www.", "");
    } catch {
      // ha rossz az URL, marad "ismeretlen"
    }

    await conn.execute(
      `
      INSERT INTO summaries (article_id, source)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE source = VALUES(source)
      `,
      [articleId, source]
    );

    await conn.end();

    return { ok: true, source };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { saveSources };
