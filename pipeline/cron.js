// cron.js — OpenAI verzió, 3‑cikkes batch, stabil pipeline
require("dotenv").config({ path: "/var/www/utom/.env" });

// ─────────────────────────────────────────────
//  IMPORTOK
// ─────────────────────────────────────────────

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const { createHash } = require("node:crypto");

const { callOpenAI } = require("./aiClient");
const { summarizeShort } = require("./summarizeShort");
const { summarizeLong } = require("./summarizeLong");
const { plagiarismCheck } = require("./plagiarismCheck");
const { saveSources } = require("./saveSources");
const { saveSummary } = require("./saveSummary");
const { scrapeArticle } = require("./scrapeArticle");
const { categorizeArticle } = require("./fillCategory");
const { createMysqlPipelineStore, createPipelineCoordinator } = require("./state-machine");
const { externalOperationKey, shortClaimToken } = require("./operation-identity");
const { parseValidEmbedding, uniqueKeywords } = require("./idempotency");

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
const AI_STEP_MAX_ATTEMPTS = Math.min(2, Math.max(1, Number(process.env.AI_STEP_MAX_ATTEMPTS) || 1));
const ARTICLE_CLAIM_STALE_MS = Math.max(60_000, Number(process.env.ARTICLE_CLAIM_STALE_MS) || 15 * 60 * 1000);
const ARTICLE_MAX_ATTEMPTS = Math.min(10, Math.max(1, Number(process.env.ARTICLE_MAX_ATTEMPTS) || 3));

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
const pipelineState = createPipelineCoordinator(createMysqlPipelineStore(pool), {
  workerId: process.env.UTOM_WORKER_ID || undefined,
  staleMs: ARTICLE_CLAIM_STALE_MS,
  maxArticleAttempts: ARTICLE_MAX_ATTEMPTS,
  logger(event) {
    cronLog(JSON.stringify(event));
  },
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

async function runDurableStep(claim, stepName, label, fn, options) {
  const execute = options?.external ? fn : () => runWithRetries(label, fn);
  return pipelineState.runStep(claim, stepName, execute, options);
}

function externalOptions(article, stepName, input) {
  const inputVersion = createHash("sha256").update(String(input ?? "")).digest("hex");
  return {
    external: true,
    operationKey: externalOperationKey({
      articleId: article.id,
      stepName,
      inputVersion,
      model: process.env.OPENAI_MODEL || "configured-openai-model",
      configVersion: "pipeline-2026-09-27",
    }),
  };
}

// ─────────────────────────────────────────────
//  PENDING LEKÉRÉS
// ─────────────────────────────────────────────

async function fetchPendingArticles(limit) {
  const [rows] = await pool.execute(
    `SELECT id, title, url_canonical, content_text, category, source, short_summary, long_summary, embedding, cluster_id
     FROM articles
     WHERE status = 'pending'
        OR (status = 'in_progress' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND
          AND NOT EXISTS (SELECT 1 FROM article_processing_steps s WHERE s.article_id=articles.id AND s.status='uncertain'))
        OR (status = 'failed' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND AND processing_attempts < ?)
     ORDER BY created_at DESC
     LIMIT ${Number(limit)}`,
    [Math.trunc(ARTICLE_CLAIM_STALE_MS * 1000), Math.trunc(ARTICLE_CLAIM_STALE_MS * 1000), ARTICLE_MAX_ATTEMPTS]
  );

  return rows;
}

async function quarantineStaleExternalOperations() {
  const [result] = await pool.execute(
    `UPDATE articles a SET a.status='needs_recovery', a.failed_step=(
       SELECT s.step_name FROM article_processing_steps s
       WHERE s.article_id=a.id AND s.status='uncertain' LIMIT 1
     ), a.last_processing_error='external_operation_outcome_uncertain'
     WHERE a.status='in_progress'
       AND a.heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND
       AND EXISTS (SELECT 1 FROM article_processing_steps s WHERE s.article_id=a.id AND s.status='uncertain')`,
    [Math.trunc(ARTICLE_CLAIM_STALE_MS * 1000)],
  );
  if (result.affectedRows > 0) cronLog(JSON.stringify({ event: "stale_external_quarantined", count: result.affectedRows }));
}

// ─────────────────────────────────────────────
//  STATUS UPDATE
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  TELJES PIPELINE — OpenAI verzió
// ─────────────────────────────────────────────

async function processArticlePipeline(article, claim) {
  await sleep(1000);

  const articleId = article.id;

  console.log("──────────────────────────────────────────────");
  console.log(
    `▶️  ${CYAN}CIKK FELDOLGOZÁS INDUL — ID: ${articleId}, worker=${claim.workerId}, claim=${shortClaimToken(claim.claimToken)}${RESET}`
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

    const scrapeStep = await runDurableStep(claim, "scrape", "[SCRAPER] 🌐 Cikk letöltése", () => scrapeArticle(
      articleId, article.url_canonical || "", claim
    ));
    const scrapeRes = scrapeStep.result;

    if (scrapeRes.skipped) {
      throw new Error(`article_skipped:${scrapeRes.error || "scrape_skipped"}`);
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
  } else {
    await runDurableStep(claim, "scrape", "[SCRAPER] ✅ Meglévő tartalom", async () => ({
      reusedContent: true,
      contentLength: article.content_text.length,
    }));
  }

  // 1) Rövid összefoglaló
  if (shortSummary) {
    await runDurableStep(claim, "short_summary", "[SHORT] ✅ Meglévő összefoglaló", async () => ({ summary: shortSummary }));
  } else {
    const step = await runDurableStep(claim, "short_summary", "[SHORT] ✂️ Rövid összefoglaló", async () => {
    const res = await summarizeShort(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "summarizeShort sikertelen");
    }

      const summary = res.summary || "";
      await pool.execute("UPDATE articles SET short_summary = ? WHERE id = ?", [summary, articleId]);
      return { summary };
  }, externalOptions(article, "short_summary", article.content_text));
    shortSummary = step.result?.summary || "";
  }

  // 2) Hosszú elemzés
  if (longSummary) {
    await runDurableStep(claim, "long_summary", "[LONG] ✅ Meglévő elemzés", async () => ({ detailed: longSummary }));
  } else {
    const step = await runDurableStep(claim, "long_summary", "[LONG] 📄 Hosszú elemzés", async () => {
    const res = await summarizeLong(articleId, shortSummary);

    if (!res?.ok) {
      throw new Error(res?.error || "summarizeLong sikertelen");
    }

      const detailed = res.detailed || "";
      await pool.execute("UPDATE articles SET long_summary = ? WHERE id = ?", [detailed, articleId]);
      return { detailed };
  }, externalOptions(article, "long_summary", `${shortSummary}\n${article.content_text || ""}`));
    longSummary = step.result?.detailed || "";
  }

  // 3) Plágium
  const plagiarismStep = await runDurableStep(claim, "plagiarism", "[PLAG] 🔍 Plágium", async () => {
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

    return { plagiarismScore };
  });
  plagiarismScore = plagiarismStep.result?.plagiarismScore ?? plagiarismScore;

  // 4) Kategorizálás
  const categoryStep = await runDurableStep(claim, "category", "[CAT] 🏷️ Kategorizálás", async () => {
    const res = await categorizeArticle(articleId);

    if (!res?.ok) {
      throw new Error("Kategorizálás sikertelen");
    }

    return { category: res.category };
  }, externalOptions(article, "category", shortSummary || article.content_text));
  article.category = categoryStep.result?.category || article.category;

  // 4/B) SENTIMENT — OpenAI
  await runDurableStep(claim, "sentiment", "[SENTIMENT] 😊 Hangulatelemzés", async () => {
    const { processSentiment } = require("./sentiment");
    const res = await processSentiment(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "sentiment sikertelen");
    }

    return res;
  }, { ...externalOptions(article, "sentiment", article.content_text), optional: true });

  // 5) Cím generálás — OPENAI
  let title = "";

  const titleStep = await runDurableStep(claim, "title", "[TITLE] 🏷️ Cím", async () => {
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

    title = await callOpenAI(prompt, 60, "title");

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
    return { title };
  }, externalOptions(article, "title", shortSummary));
  title = titleStep.result?.title || article.title || "";

  // 6) Kulcsszavak — OPENAI
  const keywordStep = await runDurableStep(claim, "keywords", "[KW] 🔑 Kulcsszavak", async () => {
    const prompt = `
Szöveg:
${article.content_text || ""}

Feladat:
Adj vissza pontosan 6–10 magyar kulcsszót.

Korlátozások:
- Csak a kulcsszavakat add vissza, vesszővel elválasztva.
- Ne írj bevezetőt, magyarázatot, sorszámot, címkét.
    `.trim();

    const raw = await callOpenAI(prompt, 80, "keywords");

    const kw = raw
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(k => k.length >= 2);

    const unique = uniqueKeywords(kw);

    return { keywords: unique, trendKeywords: unique.join(",") };
  }, externalOptions(article, "keywords", article.content_text));
  keywords = keywordStep.result?.keywords || [];
  trendKeywords = keywordStep.result?.trendKeywords || keywords.join(",");

  // 6/B) Kulcsszavak mentése
  await runDurableStep(claim, "trends", "[KW-SAVE] 💾 Kulcsszavak és trend input mentése", async () => {
    if (keywords.length === 0) return;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM keywords WHERE article_id = ?", [articleId]);
      for (const keyword of keywords) {
        await connection.execute(
          "INSERT INTO keywords (article_id, keyword, created_at) VALUES (?, ?, UTC_TIMESTAMP())",
          [articleId, keyword],
        );
        await connection.execute(
          `INSERT INTO trends (article_id, keyword, frequency, period, category, source)
           VALUES (?, ?, 1, '7d', ?, ?) ON DUPLICATE KEY UPDATE category=VALUES(category), source=VALUES(source)`,
          [articleId, keyword, article.category, article.source],
        );
      }
      await connection.commit();
      return { count: keywords.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // 7) Forrás mentése
  const sourceStep = await runDurableStep(claim, "source", "[SOURCE] 🌐 Forrás", async () => {
    const res = await saveSources(
      articleId,
      article.url_canonical || ""
    );

    if (!res?.ok) {
      throw new Error(res?.error || "saveSources sikertelen");
    }

    return { source: res.source || "ismeretlen" };
  });
  source = sourceStep.result?.source || article.source || "ismeretlen";

  // 8) Summary mentése
  await runDurableStep(claim, "summary_persistence", "[SAVE] 💾 Summary", async () => {
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
  await runDurableStep(claim, "clickbait", "[CLICKBAIT] 🎯 Clickbait elemzés", async () => {
    const { processClickbaitOpenAI } = require("./clickbait_openai");
    const res = await processClickbaitOpenAI(articleId);

    if (!res?.ok) {
      throw new Error(res?.error || "clickbaitOpenAI sikertelen");
    }
  }, externalOptions(article, "clickbait", `${title}\n${article.content_text || ""}`));

  // ─────────────────────────────────────────────
  // 10) EMBEDDING + CLUSTER + SPEED INDEX
  // ─────────────────────────────────────────────

  const embeddingOptions = parseValidEmbedding(article.embedding)
    ? undefined
    : externalOptions(article, "embedding", `${article.title || ""}\n${article.content_text || ""}`);
  await runDurableStep(claim, "embedding", "[EMBED] 🧠 Embedding generálás", async () => {
    const {
      generaljEmbeddingetCikkhez
    } = require("../pipeline/generateEmbedding");

    return generaljEmbeddingetCikkhez(articleId);
  }, embeddingOptions);

  await runDurableStep(claim, "cluster", "[CLUSTER] 🧩 Clusterezés", async () => {
    const {
      clusterArticle
    } = require("../pipeline/clusterArticles");

    return clusterArticle(articleId);
  });

  await runDurableStep(claim, "speed_index", "[SPEED] ⚡ Speed Index frissítés", async () => {
    const {
      updateSpeedIndex
    } = require("../pipeline/updateSpeedIndex");

    await updateSpeedIndex();
    return { updated: true };
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
    const claim = await pipelineState.claimArticle(article.id);

    if (!claim) return;

    try {
      await processArticlePipeline(article, claim);
      await pipelineState.finishArticle(claim);
    } catch (err) {
      console.error(
        `❌ ${RED}Hiba (${article.id}): ${err.message}${RESET}`
      );

      // Részleges, már kifizetett OpenAI-munka után nem indítjuk
      // automatikusan újra az egész cikk feldolgozását.
      // A state machine az aktuális lépést és a cikket claim-tokenhez kötve failedre állítja.
      await pipelineState.failArticle(claim, "pipeline", err);
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

      await quarantineStaleExternalOperations();

      const [pendingCountRows] = await pool.execute(
        `SELECT COUNT(*) AS c FROM articles WHERE status = 'pending'
          OR (status='in_progress' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND
            AND NOT EXISTS (SELECT 1 FROM article_processing_steps s WHERE s.article_id=articles.id AND s.status='uncertain'))
          OR (status='failed' AND heartbeat_at < UTC_TIMESTAMP(6) - INTERVAL ? MICROSECOND AND processing_attempts < ?)`,
        [Math.trunc(ARTICLE_CLAIM_STALE_MS * 1000), Math.trunc(ARTICLE_CLAIM_STALE_MS * 1000), ARTICLE_MAX_ATTEMPTS]
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

module.exports = { processArticlePipeline, runPipelineWorker };
