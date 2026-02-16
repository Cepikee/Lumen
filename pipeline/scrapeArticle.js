// scrapeArticle.js — Cloudflare Worker proxy támogatással
const mysql = require("mysql2/promise");
const { cleanArticle } = require("./cleanArticle");

// 🔥 A TE WORKERED:
const WORKER_URL = "https://royal-king-47c3.vashiri6562.workers.dev/?url=";

// --- HTTP letöltés (közvetlen vagy Worker proxy) ---
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
    let html;

    // 🔥 1) Ha 444.hu → automatikusan Worker proxy
    if (is444(url)) {
      const proxyUrl = WORKER_URL + encodeURIComponent(url);
      console.log(`[SCRAPER] 444.hu észlelve → Cloudflare Worker proxy: ${proxyUrl}`);

      try {
        html = await fetchHtml(proxyUrl);
      } catch (err) {
        console.error(`[SCRAPER] ❌ Worker proxy hiba: ${err.message}`);
        throw new Error("444.hu Worker proxy is failed");
      }

    } else {
      // 🔥 2) Normál oldal → közvetlen letöltés
      html = await fetchHtml(url);
    }

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
