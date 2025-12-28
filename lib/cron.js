const mysql = require("mysql2/promise");

// AI/pipeline modulok – igazítsd az elérési útvonalakat a build szerint
const { summarizeShort } = require("./pipeline/summarizeShort");
const { summarizeLong } = require("./pipeline/summarizeLong");
const { plagiarismCheck } = require("./pipeline//plagiarismCheck");
const { extractKeywords } = require("./pipeline/extractKeywords");
const { detectTrends } = require("./pipeline/detectTrends");
const { saveSources } = require("./pipeline/saveSources");
const { saveSummary } = require("./pipeline/saveSummary");

// ANSI színek
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";

// ---- Konfiguráció ----
const BATCH_SIZE = 2;
const LOOP_DELAY_MS = 300000;       // 3 perc
const CONCURRENCY = 1;
const ARTICLE_TIMEOUT_MS = 180000;  // 3 perc timeout
const MAX_RETRIES = 3;

console.log(`${GREEN}✅ cron.js elindult!${RESET}`);

// ---- Segédfüggvények ----
async function sleep(ms) {
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
        console.warn(
          `${label} ${YELLOW}Hiba: ${err.message || err} (${attempt}/${MAX_RETRIES}). Újrapróbálás...${RESET}`
        );
      } else {
        console.error(
          `${label} ${RED}Végleges hiba ${attempt}/${MAX_RETRIES}: ${err.message || err}${RESET}`
        );
        throw err;
      }
    }
  }
}

// Idempotens lekérdezés
async function fetchPendingArticles(connection, limit) {
  const [rows] = await connection.execute(`
    SELECT a.*
    FROM articles a
    WHERE a.status = 'pending'
    ORDER BY a.id ASC
    LIMIT ${limit}
  `);
  return rows;
}

// Státusz frissítés
async function markStatus(connection, ids, status) {
  if (!ids.length) return;
  console.log(
    `[STATUS] 🔄 ${CYAN}${ids.join(", ")} → ${status}${RESET}`
  );
  await connection.query(
    `UPDATE articles SET status = ? WHERE id IN (?)`,
    [status, ids]
  );
}

// Egy cikk teljes pipeline feldolgozása
async function processArticlePipeline(article) {
  const articleId = article.id;
  console.log("──────────────────────────────────────────────");
  console.log(`▶️  ${CYAN}CIKK FELDOLGOZÁS INDUL — ID: ${articleId}${RESET}`);
  console.log("──────────────────────────────────────────────");

  let shortSummary = "";
  let longSummary = "";
  let plagiarismScore = 0;
  let keywords = [];
  let trendKeywords = "";
  let source = "";

  // 1) Rövid összefoglaló
  await runWithRetries(
    "[SHORT] ✂️ Rövid összefoglaló",
    async () => {
      console.log(`${BLUE}[SHORT] Input előkészítés articleId=${articleId}${RESET}`);
      const res = await summarizeShort(articleId);
      if (!res || !res.ok) {
        throw new Error(res?.error || "summarizeShort sikertelen");
      }
      shortSummary = res.summary || "";
      console.log(
        `[SHORT] AI válasz hossza: ${shortSummary.length} karakter`
      );
      return res;
    }
  );

  // 2) Hosszú elemzés
  await runWithRetries(
    "[LONG] 📄 Hosszú elemzés",
    async () => {
      const res = await summarizeLong(articleId, shortSummary);
      if (!res || !res.ok) {
        throw new Error(res?.error || "summarizeLong sikertelen");
      }
      longSummary = res.detailed || "";
      console.log(
        `[LONG] AI válasz hossza: ${longSummary.length} karakter`
      );
      return res;
    }
  );

  // 3) Plágium ellenőrzés (frissítheti a rövid összefoglalót)
  await runWithRetries(
    "[PLAG] 🔍 Plágium ellenőrzés",
    async () => {
      const res = await plagiarismCheck(articleId, shortSummary);
      if (!res || !res.ok) {
        throw new Error(res?.error || "plagiarismCheck sikertelen");
      }
      plagiarismScore = typeof res.plagiarismScore === "number" ? res.plagiarismScore : 0;
      shortSummary = res.summaryShort || shortSummary;
      console.log(
        `[PLAG] Score=${plagiarismScore} → ${plagiarismScore > 0 ? `${YELLOW}GYANÚ${RESET}` : `${GREEN}OK${RESET}`}`
      );
      return res;
    }
  );

  // 4) Kulcsszavak
  await runWithRetries(
    "[KEY] 🏷️ Kulcsszavak",
    async () => {
      const res = await extractKeywords(articleId);
      if (!res || !res.ok) {
        throw new Error(res?.error || "extractKeywords sikertelen");
      }
      keywords = Array.isArray(res.keywords) ? res.keywords : [];
      console.log(
        `[KEY] ${keywords.length} kulcsszó: ${keywords.length ? JSON.stringify(keywords) : "nincs"}`
      );
      return res;
    }
  );

  // 5) Trend kulcsszavak
  await runWithRetries(
    "[TREND] 📈 Trend kulcsszavak",
    async () => {
      const res = detectTrends(keywords);
      if (!res || !res.ok) {
        throw new Error(res?.error || "detectTrends sikertelen");
      }
      trendKeywords = res.trendKeywords || "";
      console.log(
        `[TREND] Trend kulcsszavak: ${trendKeywords || "nincs"}`
      );
      return res;
    }
  );

  // 6) Forrás mentése + forrás meghatározása
  await runWithRetries(
    "[SOURCE] 🌐 Forrás mentése",
    async () => {
      const url = article.url_canonical || "";
      const res = await saveSources(articleId, url);
      if (!res || !res.ok) {
        throw new Error(res?.error || "saveSources sikertelen");
      }
      source = res.source || "ismeretlen";
      console.log(`[SOURCE] Forrás meghatározva: ${source}`);
      return res;
    }
  );

  // 7) Summary mentése (összes AI eredmény)
  await runWithRetries(
    "[SAVE] 💾 Summary mentése",
    async () => {
      const res = await saveSummary({
        articleId,
        shortSummary,
        longSummary,
        plagiarismScore,
        trendKeywords,
        source,
      });
      if (!res || !res.ok) {
        throw new Error(res?.error || "saveSummary sikertelen");
      }
      console.log(`[SAVE] Summary mentve az adatbázisba.`);
      return res;
    }
  );

  console.log(
    `✔️  ${GREEN}CIKK FELDOLGOZVA — ID: ${articleId}${RESET}`
  );
  console.log("──────────────────────────────────────────────");
}

// Batch feldolgozás concurrency-vel + per-cikk timeout + retry
async function processBatch(connection, batch) {
  const ids = batch.map(a => a.id);
  await markStatus(connection, ids, "in_progress");

  const workers = [];

  for (const article of batch) {
    console.log(`⚙️ Feldolgozás indul cikkre: ID=${article.id} - "${article.title}"`);

    const task = withTimeout(
      processArticlePipeline(article),
      ARTICLE_TIMEOUT_MS,
      `processArticlePipeline(${article.id})`
    )
      .then(async () => {
        await markStatus(connection, [article.id], "done");
      })
      .catch(async (err) => {
        console.error(
          `❌ ${RED}Hiba/Timeout a cikk feldolgozásnál (${article.id}): ${err.message || err}${RESET}`
        );
        // 3 sikertelen kísérlet után is pending-re tesszük (retry később)
        await markStatus(connection, [article.id], "pending");
        console.log(
          `🔁 ${YELLOW}Retry beállítva: ${article.id} → pending${RESET}`
        );
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
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  while (true) {
    try {
      console.log(`🚀 Feed begyűjtés: ${new Date().toLocaleString("hu-HU")}`);
      try {
        const feedRes = await fetch("http://127.0.0.1:3000/api/fetch-feed");
        const feedData = await feedRes.json();
        console.log("📰 Feed feldolgozás eredmény:", feedData);
      } catch (feedErr) {
        console.error(`❌ ${RED}Hiba fetch-feed közben:${RESET}`, feedErr);
      }

      const batch = await fetchPendingArticles(connection, BATCH_SIZE);

      if (batch.length === 0) {
        console.log("⏸️ Nincs új pending cikk. Régi cikkek ellenőrzése...");

        const [oldRows] = await connection.execute(`
          SELECT a.*
          FROM articles a
          LEFT JOIN summaries s ON s.article_id = a.id
          WHERE a.status = 'done'
            AND a.content_hash IS NOT NULL
            AND (
              s.article_id IS NULL
              OR s.trend_keywords IS NULL
            )
          ORDER BY a.id ASC
          LIMIT ${BATCH_SIZE};
        `);

        if (oldRows.length > 0) {
          console.log(
            `🔁 Régi cikkek újrafeldolgozása indul: ${oldRows.length} db`
          );
          const oldIds = oldRows.map(a => a.id);
          await markStatus(connection, oldIds, "pending");
          // következő ciklusban már pendingként felveszi őket
          continue;
        }

        console.log(`😴 Nincs új vagy régi feldolgozatlan cikk. Várakozás ${LOOP_DELAY_MS / 60000} percet...`);
        await sleep(LOOP_DELAY_MS);
        continue;
      }

      console.log(`🆕 Új batch feldolgozása indul: ${batch.length} db cikk`);
      await processBatch(connection, batch);
      console.log("📊 Batch feldolgozás kész!");
    } catch (err) {
      console.error(`❌ ${RED}Hiba a fő ciklusban:${RESET}`, err);
      await sleep(10_000);
    }
  }
})();
