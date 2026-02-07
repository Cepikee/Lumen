// scrapeArticle.js
const mysql = require("mysql2/promise");
const { cleanArticle } = require("./cleanArticle");

// Egyszerű HTTP letöltés
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; UtomScraper/1.0)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function scrapeArticle(articleId, url) {
  console.log(`[SCRAPER] Indul: articleId=${articleId}, url=${url}`);

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025"
  });

  try {
    const html = await fetchHtml(url);

    // 🔥 ÚJ: tisztított, nyers cikk szöveg (reklámok, képek, kapcsolódók nélkül)
    const text = cleanArticle(html, url);

    // Biztonsági log
    console.log(
      `[SCRAPER] ℹ️ Tisztított szöveg hossza: len=${text?.length || 0} articleId=${articleId}`
    );

    // 🔥 Ha túl rövid → FAILED, nincs retry
    if (!text || text.length < 200) {
      console.warn(
        `[SCRAPER] ⚠️ Túl rövid szöveg (len=${text.length}). FAILED státusz beállítva. articleId=${articleId}`
      );

      await conn.execute(
        `UPDATE articles SET status = 'failed', content_text = NULL WHERE id = ?`,
        [articleId]
      );

      return { ok: true, skipped: true };
    }

    // 🔥 Normál eset: elég hosszú → mentjük, vissza pending-re
    await conn.execute(
      `UPDATE articles SET content_text = ?, status = 'pending' WHERE id = ?`,
      [text, articleId]
    );

    console.log(
      `[SCRAPER] ✅ Sikeres scraping. len=${text.length} articleId=${articleId}`
    );
    return { ok: true, text };
  } catch (err) {
    console.error(
      `[SCRAPER] ❌ Hiba scraping közben. articleId=${articleId} - ${err.message}`
    );
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { scrapeArticle };
