// cron.js — OpenAI verzió, 3‑cikkes batch, stabil pipeline
require("dotenv").config({ path: "/var/www/utom/.env" });

// ─────────────────────────────────────────────
//  IMPORTOK
// ─────────────────────────────────────────────

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const { callOpenAI } = require("./aiClient");
const { summarizeShort } = require("./summarizeShort");
const { summarizeLong } = require("./summarizeLong");
const { plagiarismCheck } = require("./plagiarismCheck");
const { saveSources } = require("./saveSources");
const { saveSummary } = require("./saveSummary");
const { scrapeArticle } = require("./scrapeArticle");
const { categorizeArticle } = require("./fillCategory");

// ANSI színek
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

// ─────────────────────────────────────────────
//  KONFIGURÁCIÓ — 3 cikk egyszerre
// ─────────────────────────────────────────────

const BATCH_SIZE = 3;
const LOOP_DELAY_MS = 60000;
const CONCURRENCY = 3;
const AI_STEP_MAX_ATTEMPTS = Math.min(2, Math.max(1, Number(process.env.AI_STEP_MAX_ATTEMPTS) || 1));

console.log(`${GREEN}✅ cron.js — OpenAI verzió elindult!${RESET}`);

// ─────────────────────────────────────────────
//  DB POOL
// ─────────────────────────────────────────────

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "utom_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "utom_dev",
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
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, line);
  } catch (err) {
    console.error("[CRON LOG]", line.trim(), err.message);
  }
}

// ─────────────────────────────────────────────
//  SEGÉDFÜGGVÉNYEK
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWithRetries(label, fn) {
  const start = Date.now();

  for (let attempt = 1; attempt <= AI_STEP_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await fn();
      const dur = ((Date.now() - start) / 1000).toFixed(2);

      console.log(
        `${label} ${GREEN}Sikeres${RESET} ${CYAN}(${attempt}/${AI_STEP_MAX_ATTEMPTS}, idő: ${dur}s)${RESET}`
      );

      return result;
    } catch (err) {
      if (attempt < AI_STEP_MAX_ATTEMPTS) {
        console.warn(
          `${label} ${YELLOW}Hiba: ${err.message} (${attempt}/${AI_STEP_MAX_ATTEMPTS}). Újrapróbálás...${RESET}`
        );
      } else {
        console.error(
          `${label} ${RED}Végleges hiba: ${err.message}${RESET}`
        );
        throw err;
      }
    }
  }
}

// ─────────────────────────────────────────────
//  PENDING LEKÉRÉS
// ─────────────────────────────────────────────

async function fetchPendingArticles(limit) {
  const [rows] = await pool.execute(
    `SELECT id, title, url_canonical, content_text, category, source, short_summary, long_summary
     FROM articles
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT ${Number(limit)}`
  );

  return rows;
}

// ─────────────────────────────────────────────
//  STATUS UPDATE
// ─────────────────────────────────────────────

async function claimArticle(id) {
  // Egy cikket egyszerre csak egy worker foglalhat le.
  const [result] = await pool.execute(
    "UPDATE articles SET status = 'in_progress' WHERE id = ? AND status = 'pending'",
    [id]
  );

  return result.affectedRows === 1;
}

async function markStatus(id, status) {
  await pool.execute(
    "UPDATE articles SET status = ? WHERE id = ? AND status = 'in_progress'",
    [status, id]
  );
}

// ─────────────────────────────────────────────
//  TELJES PIPELINE — OpenAI verzió
// ─────────────────────────────────────────────

async function processArticlePipeline(article) {
  await sleep(1000);

  const articleId = article.id;

  console.log("──────────────────────────────────────────────");
  console.log(
    `▶️  ${CYAN}CIKK FELDOLGOZÁS INDUL — ID: ${articleId}${RESET}`
  );
  console.log("──────────────────────────────────────────────");

  let shortSummary = String(article.short_summary || "").trim();
  let longSummary = String(article.long_summary || "").trim();
  let plagiarismScore = 0;
  let trendKeywords = "";
  let source = "";
  let keywords = [];

  // 0) Scraping fallback
  if (!article.content_text || article.content_text.trim().length < 400) {
    console.log("[SCRAPER] ℹ️ Túl rövid content_text, scraping...");

    const scrapeRes = await scrapeArticle(
      articleId,
      article.url_canonical || ""
    );

    if (scrapeRes.skipped) {
      return { skipped: true };
    }

    if (!scrapeRes.ok) {
      if (scrapeRes.error?.includes("404")) {
        return { skipped: true };
      }

      throw new Error(`Scraping sikertelen: ${scrapeRes.error}`);
    }

    article.content_text = scrapeRes.text
      .replace(/Kapcsolódó cikkek[\s\S]*/i, "")
      .replace(/<[^>]+>/g, "")
      .replace(/Hirdetés[\s\S]*?$/gi, "")
      .replace(/Borítókép:[\s\S]*?$/gi, "")
      .replace(/Címlapkép:[\s\S]*?$/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  }

  // 1) Rövid összefoglaló
  if (!shortSummary) await runWithRetries("[SHORT] ✂️ Rövid összefoglaló", async () => {
    const res = await summarizeShort(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "summarizeShort sikertelen");
    }

    shortSummary = res.summary || "";
    return res;
  });

  if (!article.short_summary) {
    await pool.execute(
      "UPDATE articles SET short_summary = ? WHERE id = ?",
      [shortSummary, articleId]
    );
  }

  // 2) Hosszú elemzés
  if (!longSummary) await runWithRetries("[LONG] 📄 Hosszú elemzés", async () => {
    const res = await summarizeLong(articleId, shortSummary);

    if (!res?.ok) {
      throw new Error(res?.error || "summarizeLong sikertelen");
    }

    longSummary = res.detailed || "";
    return res;
  });

  if (!article.long_summary) {
    await pool.execute(
      "UPDATE articles SET long_summary = ? WHERE id = ?",
      [longSummary, articleId]
    );
  }

  // 3) Plágium
  await runWithRetries("[PLAG] 🔍 Plágium", async () => {
    const res = await plagiarismCheck(
      articleId,
      shortSummary,
      longSummary
    );

    if (!res?.ok) {
      throw new Error(res?.error || "plagiarismCheck sikertelen");
    }

    plagiarismScore = res.plagiarismScore ?? 0;
    console.log(`🧪 PlágiumScore: ${plagiarismScore.toFixed(2)}`);

    return res;
  });

  // 4) Kategorizálás
  await runWithRetries("[CAT] 🏷️ Kategorizálás", async () => {
    const res = await categorizeArticle(articleId);

    if (!res?.ok) {
      throw new Error("Kategorizálás sikertelen");
    }

    article.category = res.category;
    return res;
  });

  // 4/B) SENTIMENT — OpenAI
  await runWithRetries("[SENTIMENT] 😊 Hangulatelemzés", async () => {
    const { processSentiment } = require("./sentiment");
    const res = await processSentiment(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "sentiment sikertelen");
    }

    return res;
  });

  // 5) Cím generálás — OPENAI
  let title = "";

  await runWithRetries("[TITLE] 🏷️ Cím", async () => {
    const prompt = `
Írj egy rövid, újságírói stílusú magyar címet a cikkhez.

Követelmények:
- Csak a címet add vissza.
- Ne írj bevezetőt, magyarázatot, kommentet.
- Ne használj markdown-t, csillagokat, zárójeleket, meta-megjegyzést.
- A cím legyen tömör, figyelemfelkeltő, magyar nyelvű.

Rövid összefoglaló:
${shortSummary}
    `.trim();

    title = await callOpenAI(prompt, 60);

    if (!title || title.length < 5) {
      const slug = (article.url_canonical || "").split("/").pop() || "";
      const words = slug.split("-").filter(w => w.length > 2);

      title = words.length >= 3
        ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : shortSummary.split("\n")[0].trim().slice(0, 120);
    }

    title = title
      .replace(/\*\*/g, "")
      .replace(/#+/g, "")
      .replace(/\(.+?\)/g, "")
      .replace(/\[.+?\]/g, "")
      .replace(/[_*~`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  });

  // 6) Kulcsszavak — OPENAI
  await runWithRetries("[KW] 🔑 Kulcsszavak", async () => {
    const prompt = `
Szöveg:
${article.content_text || ""}

Feladat:
Adj vissza pontosan 6–10 magyar kulcsszót.

Korlátozások:
- Csak a kulcsszavakat add vissza, vesszővel elválasztva.
- Ne írj bevezetőt, magyarázatot, sorszámot, címkét.
    `.trim();

    const raw = await callOpenAI(prompt, 80);

    const kw = raw
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(k => k.length >= 2);

    const unique = [...new Set(kw)];

    trendKeywords = unique.join(",");
    keywords = unique;

    return unique;
  });

  // 6/B) Kulcsszavak mentése
  await runWithRetries("[KW-SAVE] 💾 Kulcsszavak mentése", async () => {
    if (keywords.length === 0) return;

    const values = keywords
      .map(k => `(${articleId}, ${pool.escape(k)}, NOW())`)
      .join(",");

    await pool.query(
      `INSERT INTO keywords (article_id, keyword, created_at) VALUES ${values}`
    );
  });

  // 6/C) Trends mentése
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

  // 7) Forrás mentése
  await runWithRetries("[SOURCE] 🌐 Forrás", async () => {
    const res = await saveSources(
      articleId,
      article.url_canonical || ""
    );

    if (!res?.ok) {
      throw new Error(res?.error || "saveSources sikertelen");
    }

    source = res.source || "ismeretlen";
    return res;
  });

  // 8) Summary mentése
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

    if (!res?.ok) {
      throw new Error(res?.error || "saveSummary sikertelen");
    }

    await pool.execute(
      "UPDATE summaries SET ai_clean = 1, created_at = NOW() WHERE article_id = ?",
      [articleId]
    );
  });

  // 9) CLICKBAIT — OpenAI
  await runWithRetries("[CLICKBAIT] 🎯 Clickbait elemzés", async () => {
    const { processClickbaitOpenAI } = require("./clickbait_openai");
    const res = await processClickbaitOpenAI(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "clickbaitOpenAI sikertelen");
    }
  });

  // ─────────────────────────────────────────────
  // 10) EMBEDDING + CLUSTER + SPEED INDEX
  // ─────────────────────────────────────────────

  await runWithRetries("[EMBED] 🧠 Embedding generálás", async () => {
    const {
      generaljEmbeddingetCikkhez
    } = require("../pipeline/generateEmbedding");

    await generaljEmbeddingetCikkhez(articleId);
  });

  await runWithRetries("[CLUSTER] 🧩 Clusterezés", async () => {
    const {
      clusterArticle
    } = require("../pipeline/clusterArticles");

    await clusterArticle(articleId);
  });

  await runWithRetries("[SPEED] ⚡ Speed Index frissítés", async () => {
    const {
      updateSpeedIndex
    } = require("../pipeline/updateSpeedIndex");

    await updateSpeedIndex();
  });

  console.log(
    `✔️  ${GREEN}CIKK TELJES PIPELINE KÉSZ — ID: ${articleId}${RESET}`
  );

  cronLog(`Cikk teljes pipeline kész: ID=${articleId}`);
  console.log("──────────────────────────────────────────────");
}

// ─────────────────────────────────────────────
//  BATCH FELDOLGOZÁS — 3 concurrency
// ─────────────────────────────────────────────

async function processBatch(batch) {
  // Atomikus lefoglalás: egy cikket csak egy worker vehet át.
  // Nem tesszük vissza pending állapotba, amíg dolgozhat rajta valaki.
  await Promise.all(batch.map(async article => {
    const claimed = await claimArticle(article.id);

    if (!claimed) return;

    try {
      const result = await processArticlePipeline(article);

      await markStatus(
        article.id,
        result?.skipped ? "failed" : "done"
      );
    } catch (err) {
      console.error(
        `❌ ${RED}Hiba (${article.id}): ${err.message}${RESET}`
      );

      // Részleges, már kifizetett OpenAI-munka után nem indítjuk
      // automatikusan újra az egész cikk feldolgozását.
      await markStatus(article.id, "failed");
    }
  }));
}

async function fetchFeedInternally() {
  const token = process.env.UTOM_INTERNAL_WORKER_TOKEN;

  if (!token || token.length < 32) {
    throw new Error(
      "UTOM_INTERNAL_WORKER_TOKEN nincs beállítva vagy túl rövid"
    );
  }

  const base =
    process.env.UTOM_INTERNAL_BASE_URL ||
    "http://127.0.0.1:3000";

  const response = await fetch(
    new URL("/api/fetch-feed", base),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(120000),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`fetch-feed: HTTP ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────
//  FŐ CIKLUS — IDŐALAPÚ FEED FRISSÍTÉSSEL
// ─────────────────────────────────────────────

async function runPipelineWorker() {
  while (true) {
    try {
      console.log(
        `🚀 Feed begyűjtés: ${new Date().toLocaleString("hu-HU")}`
      );

      try {
        console.log("🔄 Feed frissítés indul (védett POST)...");

        const feedData = await fetchFeedInternally();

        console.log("📰 Feed eredmény:", feedData);

        cronLog(
          `Feed fetch eredmény: inserted=${feedData.inserted}`
        );
      } catch (feedErr) {
        console.error(
          `❌ ${RED}Hiba fetch-feed közben:${RESET}`,
          feedErr
        );

        cronLog(`Feed fetch hiba: ${feedErr.message}`);
      }

      const [pendingCountRows] = await pool.execute(
        "SELECT COUNT(*) AS c FROM articles WHERE status = 'pending'"
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
      console.error(
        `❌ ${RED}Hiba a fő ciklusban:${RESET}`,
        err
      );

      cronLog(`Hiba a pipeline-ban: ${err.message}`);

      await sleep(10000);
    }
  }
}

if (require.main === module) {
  const { assertCapability } = require("../lib/config/runtime");

  assertCapability("backgroundJobs");
  runPipelineWorker();
}

module.exports = { runPipelineWorker };
