// cron.js — Node.js CommonJS verzió (v2, optimalizált)

const mysql = require("mysql2/promise");
const { summarizeShort } = require("./summarizeShort");
const { summarizeLong } = require("./summarizeLong");
const { plagiarismCheck } = require("./plagiarismCheck");
const { saveSources } = require("./saveSources");
const { saveSummary } = require("./saveSummary");
const { scrapeArticle } = require("./scrapeArticle");
const { fixShortSummary, isValidShortSummary } = require("./summarizeShortValidator");
const { categorizeArticle } = require("./fillCategory");

// ANSI színek
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

// ---- Konfiguráció ----
const BATCH_SIZE = 1;
const LOOP_DELAY_MS = 60000;
const CONCURRENCY = 2;
const ARTICLE_TIMEOUT_MS = 600000;
const MAX_RETRIES = 3;

console.log(`${GREEN}✅ cron.js v2 elindult!${RESET}`);

// ---- Connection POOL ----
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "jelszo",
  database: "projekt2025",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ---- Segédfüggvények ----
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label = "task") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} after ${ms}ms`)), ms)
    )
  ]);
}

async function runWithRetries(label, fn) {
  const start = Date.now();
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      const dur = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`${label} ${GREEN}Sikeres${RESET} ${CYAN}(${attempt}/${MAX_RETRIES}, idő: ${dur}s)${RESET}`);
      return result;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`${label} ${YELLOW}Hiba: ${err.message} (${attempt}/${MAX_RETRIES}). Újrapróbálás...${RESET}`);
      } else {
        console.error(`${label} ${RED}Végleges hiba: ${err.message}${RESET}`);
        throw err;
      }
    }
  }
}

// ---- AI hívás ----
async function callOllama(prompt, numPredict = 512, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
        keep_alive: 0,
        num_predict: numPredict
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    try {
      const data = JSON.parse(raw);
      return (data.response ?? "").trim();
    } catch {
      return raw.trim();
    }
  } finally {
    clearTimeout(t);
  }
}

async function runOllamaKeywords(text) {
  const raw = await callOllama(
`Ez a szöveg:

${text}

Most adj vissza pontosan 6–10 magyar kulcsszót a fenti szöveg alapján.

SZABÁLYOK:
- Csak kulcsszavakat adj vissza.
- Ne írj mondatot.
- Ne írj bevezetőt.
- Ne írj magyarázatot.
- Ne írj sorszámot.
- Ne írj listát.
- Ne ismételd meg a promptot.
- Csak vesszővel elválasztott kulcsszavakat adj vissza.

Kimenet (csak kulcsszavak):`,
100
  );

  return raw
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(k => k.length >= 2)
    .slice(0, 10);
}

async function runOllamaTitle(url, shortSummary, longSummary) {
  const prompt = `
Írj egy rövid, újságírói stílusú MAGYAR címet az alábbi hírhez.
SZABÁLYOK:
- Csak a címet add vissza.
- Ne írj magyarázatot.
- Ne írj kommentárt.
- Ne írj zárójeles megjegyzést.
- Ne írj meta‑szöveget.
- Ne ismételd meg a promptot.
- Ne írj semmi mást a cím után.

Legyen tömör, 6–12 szavas.
Ne legyen clickbait.
A cím legyen természetes, magyar nyelvű megfogalmazás.

URL: ${url}

Rövid összefoglaló:
${shortSummary}

Részletes elemzés:
${longSummary}

Kimenet (csak a cím):
`;

  return await callOllama(prompt, 60);
}

// ---- Pending cikkek ----
async function fetchPendingArticles(limit) {
  const [rows] = await pool.execute(
    `SELECT id, title, url_canonical, content_text, category, source
     FROM articles 
     WHERE status = 'pending' 
     ORDER BY created_at DESC
     LIMIT ${limit}`
  );
  return rows;
}

// ---- Státusz frissítés ----
async function markStatus(ids, status) {
  if (!ids.length) return;
  console.log(`[STATUS] 🔄 ${CYAN}${ids.join(", ")} → ${status}${RESET}`);
  await pool.query(`UPDATE articles SET status = ? WHERE id IN (?)`, [status, ids]);
}

// ---- Egy cikk teljes pipeline feldolgozása ----
async function processArticlePipeline(article) {
  const articleId = article.id;

  console.log("──────────────────────────────────────────────");
  console.log(`▶️  ${CYAN}CIKK FELDOLGOZÁS INDUL — ID: ${articleId}${RESET}`);
  console.log("──────────────────────────────────────────────");

  let shortSummary = "";
  let longSummary = "";
  let plagiarismScore = 0;
  let trendKeywords = "";
  let source = "";

  // 0) Scraping fallback
  if (!article.content_text || article.content_text.trim().length < 400) {
    console.log(`[SCRAPER] ℹ️ Túl rövid content_text, scraping...`);

    const scrapeRes = await scrapeArticle(articleId, article.url_canonical || "");

    if (scrapeRes.skipped) {
      await pool.execute(`UPDATE articles SET status = 'failed' WHERE id = ?`, [articleId]);
      return;
    }

    if (!scrapeRes.ok) {
      if (scrapeRes.error?.includes("404")) {
        await pool.execute(`UPDATE articles SET status = 'failed' WHERE id = ?`, [articleId]);
        return;
      }
      throw new Error(`Scraping sikertelen: ${scrapeRes.error}`);
    }

    article.content_text = scrapeRes.text;
  }

  // 1) Rövid összefoglaló
  await runWithRetries("[SHORT] ✂️ Rövid összefoglaló", async () => {
    const res = await summarizeShort(articleId);
    if (!res?.ok) throw new Error(res?.error || "summarizeShort sikertelen");
    shortSummary = res.summary || "";
    return res;
  });

  // 2) Hosszú elemzés
  await runWithRetries("[LONG] 📄 Hosszú elemzés", async () => {
    const res = await summarizeLong(articleId, shortSummary);
    if (!res?.ok) throw new Error(res?.error || "summarizeLong sikertelen");
    longSummary = res.detailed || "";
    return res;
  });

  // 3) Plágium
  await runWithRetries("[PLAG] 🔍 Plágium", async () => {
    const res = await plagiarismCheck(articleId, shortSummary);
    if (!res?.ok) throw new Error(res?.error || "plagiarismCheck sikertelen");
    plagiarismScore = res.plagiarismScore ?? 0;
    shortSummary = res.summaryShort || shortSummary;
    return res;
  });

  // 4) Cím generálás
  let title = "";
  await runWithRetries("[TITLE] 🏷️ Cím", async () => {
    title = await runOllamaTitle(article.url_canonical, shortSummary, longSummary);
    if (!title || title.length < 5) {
      const slug = (article.url_canonical || "").split("/").pop() || "";
      const words = slug.split("-").filter(w => w.length > 2);
      title = words.length >= 3
        ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : shortSummary.split("\n")[0].trim().slice(0, 120);
    }
  });

  // 5) Kulcsszavak
  let keywords = [];
  keywords = await runWithRetries("[KW] 🔑 Kulcsszavak", async () => {
    const kw = await runOllamaKeywords(article.content_text || "");
    const normalized = kw.map(k => k.trim().toLowerCase());
    const unique = [...new Set(normalized)];
    trendKeywords = unique.join(",");
    return unique;
  });

  // 5/B) Kulcsszavak batch insert
  await runWithRetries("[KW-SAVE] 💾 Kulcsszavak mentése", async () => {
    if (keywords.length === 0) return;

    const values = keywords
      .map(k => `(${articleId}, ${pool.escape(k)}, NOW())`)
      .join(",");

    await pool.query(
      `INSERT INTO keywords (article_id, keyword, created_at) VALUES ${values}`
    );
  });

  // 5/C) Trends batch insert
  await runWithRetries("[TRENDS-SAVE] 📈 Trends mentése", async () => {
    if (keywords.length === 0) return;

    const values = keywords
      .map(k =>
        `(${pool.escape(k)}, 1, '7d', ${pool.escape(article.category)}, ${pool.escape(article.source)})`
      )
      .join(",");

    await pool.query(
      `INSERT INTO trends (keyword, frequency, period, category, source) VALUES ${values}`
    );
  });

  // 6) Forrás mentése
  await runWithRetries("[SOURCE] 🌐 Forrás", async () => {
    const res = await saveSources(articleId, article.url_canonical || "");
    if (!res?.ok) throw new Error(res?.error || "saveSources sikertelen");
    source = res.source || "ismeretlen";
    return res;
  });

  // 7) Summary mentése
  await runWithRetries("[SAVE] 💾 Summary", async () => {
    const res = await saveSummary({
      articleId,
      url: article.url_canonical || "",
      title,
      shortSummary,
      longSummary,
      plagiarismScore,
      trendKeywords,
      source,
      category: article.category
    });

    if (!res?.ok) throw new Error(res?.error || "saveSummary sikertelen");

    await pool.execute(
      `UPDATE summaries SET ai_clean = 1, created_at = NOW() WHERE article_id = ?`,
      [articleId]
    );
  });

  console.log(`✔️  ${GREEN}CIKK FELDOLGOZVA — ID: ${articleId}${RESET}`);
  console.log("──────────────────────────────────────────────");
}

// ---- Batch feldolgozás ----
async function processBatch(batch) {
  const ids = batch.map(a => a.id);
  await markStatus(ids, "in_progress");

  const workers = [];

  for (const article of batch) {
    const task = withTimeout(
      processArticlePipeline(article),
      ARTICLE_TIMEOUT_MS,
      `processArticlePipeline(${article.id})`
    )
      .then(() => markStatus([article.id], "done"))
      .catch(async (err) => {
        console.error(`❌ ${RED}Hiba (${article.id}): ${err.message}${RESET}`);
        await markStatus([article.id], "pending");
      });

        workers.push(task);

    if (workers.length >= CONCURRENCY) {
      await Promise.all(workers);
      workers.length = 0;
    }
  }

  if (workers.length > 0) {
    await Promise.all(workers);
  }
}

// ---- Folyamatos ciklus ----
(async () => {
  while (true) {
    try {
      console.log(`🚀 Feed begyűjtés: ${new Date().toLocaleString("hu-HU")}`);

      // 🔥 Feed fetch CSAK akkor, ha nincs pending cikk
      const [pendingCountRows] = await pool.execute(
        `SELECT COUNT(*) AS c FROM articles WHERE status = 'pending'`
      );
      const pendingCount = pendingCountRows[0].c;

      if (pendingCount === 0) {
        console.log("📰 Nincs pending cikk → feed frissítés indul...");
        try {
          const feedRes = await fetch("http://127.0.0.1:3000/api/fetch-feed");
          const feedData = await feedRes.json();
          console.log("📰 Feed eredmény:", feedData);
        } catch (feedErr) {
          console.error(`❌ ${RED}Hiba fetch-feed közben:${RESET}`, feedErr);
        }
      }

      // 🔥 Pending cikkek lekérése
      const batch = await fetchPendingArticles(BATCH_SIZE);

      if (batch.length === 0) {
        console.log("⏸️ Nincs új pending cikk. Régi cikkek ellenőrzése...");

        const [oldRows] = await pool.execute(`
          SELECT a.*
          FROM articles a
          LEFT JOIN summaries s ON s.article_id = a.id
          WHERE a.status = 'done'
            AND a.content_hash IS NOT NULL
            AND (s.article_id IS NULL OR s.trend_keywords IS NULL)
          ORDER BY a.id ASC
          LIMIT ${BATCH_SIZE};
        `);

        if (oldRows.length > 0) {
          console.log(`🔁 Régi cikkek újrafeldolgozása: ${oldRows.length} db`);
          const oldIds = oldRows.map(a => a.id);
          await markStatus(oldIds, "pending");
          continue;
        }

        console.log(`😴 Várakozás ${LOOP_DELAY_MS / 60000} percet...`);
        await sleep(LOOP_DELAY_MS);
        continue;
      }

      console.log(`🆕 Új batch: ${batch.length} db cikk`);
      await processBatch(batch);
      console.log("📊 Batch kész!");
    } catch (err) {
      console.error(`❌ ${RED}Hiba a fő ciklusban:${RESET}`, err);
      await sleep(10000);
    }
  }
})();
