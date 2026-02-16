// cron.js — Stabil, 1-instance verzió
require("dotenv").config();
// ─────────────────────────────────────────────
//  IMPORTOK
// ─────────────────────────────────────────────

const mysql = require("mysql2/promise");
const { summarizeShort } = require("./summarizeShort");
const { summarizeLong } = require("./summarizeLong");
const { plagiarismCheck } = require("./plagiarismCheck");
const { saveSources } = require("./saveSources");
const { saveSummary } = require("./saveSummary");
const { scrapeArticle } = require("./scrapeArticle");
const { fixShortSummary, isValidShortSummary } = require("./summarizeShortValidator");
const { categorizeArticle } = require("./fillCategory");
const fs = require("fs");

// ANSI színek
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

// ─────────────────────────────────────────────
//  KONFIGURÁCIÓ — VISSZAÁLLÍTVA A RÉGI STABILRA
// ─────────────────────────────────────────────

const BATCH_SIZE = 1;
const LOOP_DELAY_MS = 60000;
const CONCURRENCY = 1;
const ARTICLE_TIMEOUT_MS = 600000;
const MAX_RETRIES = 3;

console.log(`${GREEN}✅ cron.js — stabil 1-instance verzió elindult!${RESET}`);

// ─────────────────────────────────────────────
//  DB POOL
// ─────────────────────────────────────────────

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "jelszo",
  database: "projekt2025",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ─────────────────────────────────────────────
//  LOG FUNKCIÓ
// ─────────────────────────────────────────────

function cronLog(message) {
  const p = "/var/www/utom/logs/cron.log";
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(p, line);
}

// ─────────────────────────────────────────────
//  SEGÉDFÜGGVÉNYEK
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  1 OLLAMA INSTANCE — RÉGI STABIL VERZIÓ
// ─────────────────────────────────────────────

const OLLAMA_URL = "http://127.0.0.1:11434";

// ─────────────────────────────────────────────
//  AI HÍVÁS — minden ide megy
// ─────────────────────────────────────────────

async function callOllama(prompt, numPredict = 512, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
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

global.callOllama = callOllama;

// ─────────────────────────────────────────────
//  AI WRAPPEREK — minden OLLAMA_URL-re megy
// ─────────────────────────────────────────────

async function runOllamaKeywords(text) {
  const prompt = `
Szöveg:
${text}

Feladat:
Adj vissza pontosan 6–10 magyar kulcsszót.

Korlátozások:
❗ Csak a kulcsszavakat add vissza, vesszővel elválasztva.
❗ Ne írj bevezetőt, magyarázatot, sorszámot, címkét, semmi mást.
  `.trim();

  const raw = await callOllama(prompt, 100);

  return raw
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(k => k.length >= 2)
    .slice(0, 10);
}


async function runOllamaTitle(shortSummary) {
  const prompt = `
Írj egy rövid, újságírói stílusú magyar címet a cikkhez.

❗ Csak a címet add vissza.
❗ Ne írj bevezetőt, magyarázatot, kommentet, angol szöveget, formázást vagy meta‑megjegyzést.
❗ Ne használj csillagokat, markdown-t, nagybetűs kiemelést vagy zárójeles megjegyzést.
❗ A kimenetben kizárólag a cím szerepeljen.

Rövid összefoglaló:
${shortSummary}
  `.trim();

  let title = await callOllama(prompt, 60);

  // --- TISZTÍTÁS ---
  title = title
    .replace(/\*\*/g, "")        // markdown csillagok törlése
    .replace(/#+/g, "")          // markdown heading törlése
    .replace(/\(.+?\)/g, "")     // zárójeles meta-megjegyzések törlése
    .replace(/\[.+?\]/g, "")     // szögletes meta-megjegyzések törlése
    .replace(/[_*~`]/g, "")      // egyéb markdown jelek törlése
    .replace(/\s+/g, " ")        // dupla whitespace-ek eltüntetése
    .trim();

  return title;
}



// ─────────────────────────────────────────────
//  PENDING LEKÉRÉS
// ─────────────────────────────────────────────

async function fetchPendingArticles(limit) {
  const [rows] = await pool.execute(
    `SELECT id, title, url_canonical, content_text, category, source
     FROM articles
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}


// ─────────────────────────────────────────────
//  STATUS UPDATE
// ─────────────────────────────────────────────

async function markStatus(ids, status) {
  if (!ids.length) return;
  console.log(`[STATUS] 🔄 ${CYAN}${ids.join(", ")} → ${status}${RESET}`);
  await pool.query(`UPDATE articles SET status = ? WHERE id IN (?)`, [status, ids]);
}

// ─────────────────────────────────────────────
//  TELJES PIPELINE — minden hívás 1 instance
// ─────────────────────────────────────────────

async function processArticlePipeline(article) {
  await sleep(2000);
  const articleId = article.id;

  console.log(`${CYAN}⚙️ Ollama instance: ${OLLAMA_URL}${RESET}`);
  console.log("──────────────────────────────────────────────");
  console.log(`▶️  ${CYAN}CIKK FELDOLGOZÁS INDUL — ID: ${articleId}${RESET}`);
  console.log("──────────────────────────────────────────────");

  let shortSummary = "";
  let longSummary = "";
  let plagiarismScore = 0;
  let trendKeywords = "";
  let source = "";

  // 0) Scraping fallback
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

  // 🔥 ÚJ: szöveg rövidítése azonnal scraping után
  article.content_text = article.content_text
    .replace(/Kapcsolódó cikkek[\s\S]*/i, "")   // kapcsolódó cikkek törlése
    .replace(/<[^>]+>/g, "")                   // HTML törlése
    .replace(/Hirdetés[\s\S]*?$/gi, "")        // hirdetés blokkok törlése
    .replace(/Borítókép:[\s\S]*?$/gi, "")      // borítókép leírás törlése
    .replace(/Címlapkép:[\s\S]*?$/gi, "")      // címlapkép leírás törlése
    .replace(/\s+/g, " ")                      // whitespace normalizálás
    .trim()
    .slice(0, 3000);                            // max 3000 karakter
}


  // 1) Rövid összefoglaló — JAVÍTVA!
  await runWithRetries("[SHORT] ✂️ Rövid összefoglaló", async () => {
    const res = await summarizeShort(articleId, OLLAMA_URL);
    if (!res?.ok) throw new Error(res?.error || "summarizeShort sikertelen");
    shortSummary = res.summary || "";
    return res;
  });
  // 🔥 Rövid összefoglaló mentése a DB-be
await pool.execute(
  `UPDATE articles SET short_summary = ? WHERE id = ?`,
  [shortSummary, articleId]
);


  // 2) Hosszú elemzés — JAVÍTVA!
  await runWithRetries("[LONG] 📄 Hosszú elemzés", async () => {
    const res = await summarizeLong(articleId, shortSummary, OLLAMA_URL);
    if (!res?.ok) throw new Error(res?.error || "summarizeLong sikertelen");
    longSummary = res.detailed || "";
    return res;
  });
  // 🔥 Hosszú összefoglaló mentése a DB-be
await pool.execute(
  `UPDATE articles SET long_summary = ? WHERE id = ?`,
  [longSummary, articleId]
);


  // 3) Plágium — AI nélküli verzió
await runWithRetries("[PLAG] 🔍 Plágium", async () => {
  const res = await plagiarismCheck(articleId, shortSummary, longSummary);
  if (!res?.ok) throw new Error(res?.error || "plagiarismCheck sikertelen");

  plagiarismScore = res.plagiarismScore ?? 0;

  console.log(`🧪 PlágiumScore: ${plagiarismScore.toFixed(2)}`);

  return res;
});

  // 3/B) Kategorizálás
await runWithRetries("[CAT] 🏷️ Kategorizálás", async () => {
  const res = await categorizeArticle(articleId);
  if (!res?.ok) throw new Error("Kategorizálás sikertelen");
  article.category = res.category;
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

  // 5/B) Kulcsszavak mentése
  await runWithRetries("[KW-SAVE] 💾 Kulcsszavak mentése", async () => {
    if (keywords.length === 0) return;

    const values = keywords
      .map(k => `(${articleId}, ${pool.escape(k)}, NOW())`)
      .join(",");

    await pool.query(
      `INSERT INTO keywords (article_id, keyword, created_at) VALUES ${values}`
    );
  });

  // 5/C) Trends mentése
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
  cronLog(`Cikk feldolgozva: ID=${articleId}`);

  console.log("──────────────────────────────────────────────");
}

// ─────────────────────────────────────────────
//  BATCH FELDOLGOZÁS — 1 concurrency
// ─────────────────────────────────────────────

async function processBatch(batch) {
  const ids = batch.map(a => a.id);
  await markStatus(ids, "in_progress");

  for (const article of batch) {
    try {
      await withTimeout(
        processArticlePipeline(article),
        ARTICLE_TIMEOUT_MS,
        `processArticlePipeline(${article.id})`
      );

      // Cikk kész
      await markStatus([article.id], "done");

      // ─────────────────────────────────────────────
      //  ÚJ: IDŐALAPÚ FEED FRISSÍTÉS MINDEN CIKK UTÁN
      // ─────────────────────────────────────────────
      try {
        console.log("🔄 Új cikkek keresése a feedben...");
        const feedRes = await fetch("http://127.0.0.1:3000/api/fetch-feed?limit=10");
        const feedData = await feedRes.json();
        console.log("📰 Feed frissítés eredménye:", feedData);
        cronLog(`Időalapú feed frissítés: inserted=${feedData.inserted}`);
      } catch (err) {
        console.error("❌ Feed frissítés hiba:", err);
        cronLog(`Feed frissítés hiba: ${err.message}`);
      }

    } catch (err) {
      console.error(`❌ ${RED}Hiba (${article.id}): ${err.message}${RESET}`);
      await markStatus([article.id], "pending");
    }
  }
}


/// ─────────────────────────────────────────────
//  FŐ CIKLUS — IDŐALAPÚ FEED FRISSÍTÉSSEL
// ─────────────────────────────────────────────

(async () => {
  while (true) {
    try {
      console.log(`🚀 Feed begyűjtés: ${new Date().toLocaleString("hu-HU")}`);

      // 🔥 MINDIG fut a fetch-feed, pendingtől függetlenül
      try {
        console.log("🔄 Feed frissítés indul (limit=1)...");
        const feedRes = await fetch("http://127.0.0.1:3000/api/fetch-feed?limit=1");
        const feedData = await feedRes.json();
        console.log("📰 Feed eredmény:", feedData);
        cronLog(`Feed fetch eredmény: inserted=${feedData.inserted}`);
      } catch (feedErr) {
        console.error(`❌ ${RED}Hiba fetch-feed közben:${RESET}`, feedErr);
        cronLog(`Feed fetch hiba: ${feedErr.message}`);
      }

      // Pending cikkek lekérése
      const [pendingCountRows] = await pool.execute(
        `SELECT COUNT(*) AS c FROM articles WHERE status = 'pending'`
      );
      const pendingCount = pendingCountRows[0].c;

      console.log(`📌 Pending cikkek száma: ${pendingCount}`);
      cronLog(`Pending cikkek száma: ${pendingCount}`);

      const batch = await fetchPendingArticles(BATCH_SIZE);

      if (batch.length === 0) {
        console.log("😴 Várakozás...");
        await sleep(LOOP_DELAY_MS);
        continue;
      }

      console.log(`🆕 Új batch: ${batch.length} db cikk`);
      cronLog(`Batch indul: ${batch.length} cikk`);

      await processBatch(batch);

      console.log("📊 Batch kész!");
    } catch (err) {
      console.error(`❌ ${RED}Hiba a fő ciklusban:${RESET}`, err);
      cronLog(`Hiba a pipeline-ban: ${err.message}`);
      await sleep(10000);
    }
  }
})();

