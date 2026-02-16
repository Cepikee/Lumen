// scrapeArticle.js — 444.hu RSS-alapú támogatással
const mysql = require("mysql2/promise");
const { cleanArticle } = require("./cleanArticle");

// --- HTTP letöltés (közvetlen) ---
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "hu-HU,hu;q=0.9"
    },
    redirect: "follow"
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

// --- 444.hu felismerés ---
function is444(url) {
  return url.includes("444.hu");
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

    // 🔥 1) 444.hu → NEM scrapelünk, mert RSS-ből jön a teljes cikk
    if (is444(url)) {
      console.log(`[SCRAPER] 🟢 444.hu → scraping kihagyva, RSS content:encoded használata.`);

      // A content_text-et az RSS feldolgozó már beírta
      await conn.execute(
        `UPDATE articles 
         SET status = 'pending', scraped_via = 'rss' 
         WHERE id = ?`,
        [articleId]
      );

      return { ok: true, skipped: true, reason: "rss_content_used" };
    }

    // 🔥 2) Normál oldal → fetch
    const html = await fetchHtml(url);

    // 🔥 3) Tisztítás
    const text = cleanArticle(html, url);

    console.log(
      `[SCRAPER] ℹ️ Tisztított szöveg hossza: len=${text?.length || 0} articleId=${articleId}`
    );

    // 🔥 4) Túl rövid → FAILED (nincs retry)
    if (!text || text.length < 200) {
      console.warn(
        `[SCRAPER] ⚠️ Túl rövid szöveg. FAILED státusz. articleId=${articleId}`
      );

      await conn.execute(
        `UPDATE articles SET status = 'failed', content_text = NULL WHERE id = ?`,
        [articleId]
      );

      return { ok: true, skipped: true };
    }

    // 🔥 5) Mentés → vissza pending státuszba
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
    return { ok: false, error: err.message };
  } finally {
    await conn.end();
  }
}

module.exports = { scrapeArticle };
