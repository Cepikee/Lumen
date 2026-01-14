// cron.js — Node.js CommonJS verzió

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
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";

// ---- Konfiguráció ----
const BATCH_SIZE = 1;
const LOOP_DELAY_MS = 60000;
const CONCURRENCY = 2;
const ARTICLE_TIMEOUT_MS = 600000;
const MAX_RETRIES = 3;

console.log(`${GREEN}✅ cron.js elindult!${RESET}`);

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

// ---- AI hívás + kulcsszavak generálása ----
async function callOllama(prompt, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3:mini",
        prompt,
        stream: true,
        keep_alive: 0
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

Kimenet (csak kulcsszavak):`
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


  return await callOllama(prompt);
}





// ---- Pending cikkek lekérése ----
async function fetchPendingArticles(connection, limit) {
  const [rows] = await connection.execute(
    `SELECT id, title, url_canonical, content_text 
     FROM articles 
     WHERE status = 'pending' 
     ORDER BY created_at DESC
     LIMIT ${limit}`
  );
  return rows;
}

// ---- Státusz frissítés ----
async function markStatus(connection, ids, status) {
  if (!ids.length) return;
  console.log(`[STATUS] 🔄 ${CYAN}${ids.join(", ")} → ${status}${RESET}`);
  await connection.query(`UPDATE articles SET status = ? WHERE id IN (?)`, [status, ids]);
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

// -0) Feed frissítése 
await fetch("http://127.0.0.1:3000/api/fetch-feed");

// 0) Biztosítsuk, hogy legyen rendes content_text (SCRAPER)
// 0) Biztosítsuk, hogy legyen rendes content_text (SCRAPER)
if (!article.content_text || article.content_text.trim().length < 400) {
  console.log(
    `[SCRAPER] ℹ️ Túl rövid content_text (len=${(article.content_text || "").length}), scraping próbálkozás...`
  );

  const scrapeRes = await scrapeArticle(articleId, article.url_canonical || "");

  // 🔥 ÚJ: ha a scraper SKIPPED → FAILED státusz, nincs retry
  if (scrapeRes.skipped) {
    console.warn(`[SCRAPER] ⛔ Rövid cikk SKIPPED. FAILED státusz beállítva. articleId=${articleId}`);

    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    await conn.execute(
      "UPDATE articles SET status = 'failed' WHERE id = ?",
      [articleId]
    );

    await conn.end();
    return; // 🔥 NINCS HIBA, NINCS RETRY
  }

  // ❗ 404 → azonnal FAILED, nincs retry, nincs pending loop
  if (!scrapeRes.ok) {
    if (scrapeRes.error && scrapeRes.error.includes("404")) {
      console.error(
        `[SCRAPER] ❌ 404 – nem létező oldal. articleId=${articleId}`
      );

      const conn = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "jelszo",
        database: "projekt2025",
      });

      await conn.execute(
        "UPDATE articles SET status = 'failed' WHERE id = ?",
        [articleId]
      );

      await conn.end();
      console.log(`[SCRAPER] ⛔ Cikk FAILED státuszba téve (404).`);
      return;
    }

    // ❗ Minden más scraper hiba → normál error
    console.error(
      `[SCRAPER] ❌ Scraping sikertelen. Megszakítjuk a pipeline-t. articleId=${articleId}`
    );
    throw new Error(`Scraping sikertelen: ${scrapeRes.error || "ismeretlen hiba"}`);
  }

  // ✔️ Sikeres scraping → friss szöveg beállítása
  article.content_text = scrapeRes.text;
}


// 0/B) Kategorizálás (scraping után)
try {
  console.log(`[CAT] 🏷️ Kategorizálás indul: articleId=${articleId}`);
  const catRes = await categorizeArticle(articleId);

  if (!catRes?.ok) {
    console.warn(`[CAT] ⚠️ Kategorizálás sikertelen, fallback később. articleId=${articleId}`);
  } else {
    // 🔥 Friss kategória beolvasása az article objektumba
    const conn2 = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    const [catRow] = await conn2.execute(
      "SELECT category FROM articles WHERE id = ?",
      [articleId]
    );

    await conn2.end();

    article.category = catRow?.[0]?.category || null;
    console.log(`[CAT] ✔️ Kategória beállítva a pipeline-ban: ${article.category}`);
  }
} catch (err) {
  console.error(`[CAT] ❌ Kategorizálási hiba:`, err);
}



  
  // 1) Rövid összefoglaló
await runWithRetries("[SHORT] ✂️ Rövid összefoglaló", async () => {
  const res = await summarizeShort(articleId);
  if (!res?.ok) throw new Error(res?.error || "summarizeShort sikertelen");
  shortSummary = res.summary || "";
  console.log(`[SHORT] AI válasz hossza: ${shortSummary.length} karakter`);
  return res;
});
  // 2) Hosszú elemzés
  await runWithRetries("[LONG] 📄 Hosszú elemzés", async () => {
    const res = await summarizeLong(articleId, shortSummary);
    if (!res?.ok) throw new Error(res?.error || "summarizeLong sikertelen");
    longSummary = res.detailed || "";
    console.log(`[LONG] AI válasz hossza: ${longSummary.length} karakter`);
    return res;
  });

  // 3) Plágium ellenőrzés
  await runWithRetries("[PLAG] 🔍 Plágium ellenőrzés", async () => {
    const res = await plagiarismCheck(articleId, shortSummary);
    if (!res?.ok) throw new Error(res?.error || "plagiarismCheck sikertelen");
    plagiarismScore = res.plagiarismScore ?? 0;
    shortSummary = res.summaryShort || shortSummary;
    console.log(`[PLAG] Score=${plagiarismScore}`);
    return res;
  });
// 4) AI cím generálás
let title = "";
await runWithRetries("[TITLE] 🏷️ Cím generálás", async () => {
  title = await runOllamaTitle(article.url_canonical, shortSummary, longSummary);

  // Ha az AI valami hülyeséget ad vissza → fallback
  if (!title || title.length < 5) {
    const slug = (article.url_canonical || "").split("/").pop() || "";
    const words = slug.split("-").filter(w => w.length > 2);
    if (words.length >= 3) {
      title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } else {
      title = shortSummary.split("\n")[0].trim().slice(0, 120);
    }
  }

  console.log(`[TITLE] Generált cím: ${title}`);
});





  // 4) Kulcsszavak generálása + NORMALIZÁLÁS + DEDUPLIKÁLÁS
let keywords = [];

keywords = await runWithRetries("[KW] 🔑 Kulcsszavak", async () => {
  const kw = await runOllamaKeywords(article.content_text || "");

  // 🔥 NORMALIZÁLÁS
  const normalized = (Array.isArray(kw) ? kw : [])
    .map(k => (k || "").trim().toLowerCase())   // kisbetű + trim
    .filter(k => k.length > 0);                 // üres stringek kiszűrése

  // 🔥 DEDUPLIKÁLÁS
  const unique = [...new Set(normalized)];

  trendKeywords = unique.join(",");
  console.log(`[KW] Kulcsszavak (normalizált): ${trendKeywords}`);

  return unique;
});


// 4/B) Kulcsszavak mentése
await runWithRetries("[KW-SAVE] 💾 Kulcsszavak mentése", async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  for (const kw of keywords) {
    await conn.execute(
      `INSERT INTO keywords (article_id, keyword, created_at)
       VALUES (?, ?, NOW())`,
      [articleId, kw.trim().toLowerCase()]
    );
  }

  await conn.end();
  console.log(`[KW-SAVE] Kulcsszavak mentve: ${keywords.length} db`);
});

// 4/C) Trends mentése (nyers eseménylog)
await runWithRetries("[TRENDS-SAVE] 📈 Trends mentése", async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  for (const kw of keywords) {
    await conn.execute(
      `INSERT INTO trends (keyword, frequency, period, category, source)
       VALUES (?, 1, '7d', ?, ?)`,
      [
        kw.trim().toLowerCase(), // 🔥 NORMALIZÁLT KULCSSZÓ          // keyword
        article.category ?? null, 
        article.source ?? null    // forrás (index, telex, hvg, stb.)
      ]
    );
  }

  await conn.end();
  console.log(`[TRENDS-SAVE] Trends sorok mentve: ${keywords.length} db`);
});

  // 5) Forrás mentése
  await runWithRetries("[SOURCE] 🌐 Forrás mentése", async () => {
    const res = await saveSources(articleId, article.url_canonical || "");
    if (!res?.ok) throw new Error(res?.error || "saveSources sikertelen");
    source = res.source || "ismeretlen";
    console.log(`[SOURCE] Forrás meghatározva: ${source}`);
    return res;
  });

  // 6) Summary mentése
  await runWithRetries("[SAVE] 💾 Summary mentése", async () => {
    const url = article.url_canonical || "";
    const res = await saveSummary({
      articleId,
      url,
      title,
      shortSummary,
      longSummary, 
      plagiarismScore, 
      trendKeywords, 
      source,
      category: article.category // <-- EZ A LÉNYEG
    });
    if (!res?.ok) throw new Error(res?.error || "saveSummary sikertelen");
    console.log(`[SAVE] Summary mentve.`);

    // AI clean flag
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });
    await conn.execute(
      `UPDATE summaries SET ai_clean = 1, created_at = NOW() WHERE article_id = ?`,
      [articleId]
    );
    await conn.end();
    console.log(`[AICLEAN] 🤖 AI clean beállítva: articleId=${articleId}`);

    return res;
  });

  console.log(`✔️  ${GREEN}CIKK FELDOLGOZVA — ID: ${articleId}${RESET}`);
  console.log("──────────────────────────────────────────────");
}

// ---- Batch feldolgozás ----
async function processBatch(connection, batch) {
  const ids = batch.map(a => a.id);
  await markStatus(connection, ids, "in_progress");

  const workers = [];

  for (const article of batch) {
    console.log(`⚙️ Feldolgozás indul: ID=${article.id} - "${article.title}"`);

    const task = withTimeout(
      processArticlePipeline(article),
      ARTICLE_TIMEOUT_MS,
      `processArticlePipeline(${article.id})`
    )
      .then(() => markStatus(connection, [article.id], "done"))
      .catch(async (err) => {
        console.error(`❌ ${RED}Hiba (${article.id}): ${err.message}${RESET}`);
        await markStatus(connection, [article.id], "pending");
        console.log(`🔁 ${YELLOW}Retry beállítva: ${article.id} → pending${RESET}`);
      });

    workers.push(task);

    if (workers.length >= CONCURRENCY) {
      await Promise.all(workers);
      workers.length = 0;
    }
  }

  if (workers.length > 0) await Promise.all(workers);
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
        console.log("📰 Feed eredmény:", feedData);
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
            AND (s.article_id IS NULL OR s.trend_keywords IS NULL)
          ORDER BY a.id ASC
          LIMIT ${BATCH_SIZE};
        `);

        if (oldRows.length > 0) {
          console.log(`🔁 Régi cikkek újrafeldolgozása: ${oldRows.length} db`);
          const oldIds = oldRows.map(a => a.id);
          await markStatus(connection, oldIds, "pending");
          continue;
        }

        console.log(`😴 Várakozás ${LOOP_DELAY_MS / 60000} percet...`);
        await sleep(LOOP_DELAY_MS);
        continue;
      }

      console.log(`🆕 Új batch: ${batch.length} db cikk`);
      await processBatch(connection, batch);
      console.log("📊 Batch kész!");
    } catch (err) {
      console.error(`❌ ${RED}Hiba a fő ciklusban:${RESET}`, err);
      await sleep(10000);
    }
  }
})();
