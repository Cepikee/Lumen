// scrapeArticle.js
const mysql = require("mysql2/promise");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

// Egyszerű HTTP letöltés
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; UtomScraper/1.0)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

// HTML → tiszta szöveg (Readability)
function extractArticleText(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = article?.textContent?.trim() || "";
  return text;
}

async function scrapeArticle(articleId, url) {
  console.log(`[SCRAPER] Indul: articleId=${articleId}, url=${url}`);

  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    const html = await fetchHtml(url);
    const text = extractArticleText(html, url);

    // 🔥 ÚJ LOGIKA: ha túl rövid → FAILED státusz, nincs retry
    if (!text || text.length < 40) {
      console.warn(
        `[SCRAPER] ⚠️ Túl rövid szöveg (len=${text.length}). FAILED státusz beállítva. articleId=${articleId}`
      );

      await conn.execute(
        `UPDATE articles SET status = 'failed', content_text = NULL WHERE id = ?`,
        [articleId]
      );

      return { ok: true, skipped: true }; // <-- NEM hiba → pipeline nem retry-ol
    }

    // 🔥 Normál eset: elég hosszú → mentjük
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
