const mysql = require("mysql2/promise");
const processArticle = require("./processArticle.js");

console.log("✅ cron.js elindult!");

// ---- Konfiguráció ----
const BATCH_SIZE = 2;                // egyszerre 5 cikk
const LOOP_DELAY_MS = 300000;          // 3 perc  várakozás
const CONCURRENCY = 1;               // párhuzamosan max. 3
const ARTICLE_TIMEOUT_MS = 180_000;  // 3 perc timeout

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
  if (ids.length === 0) return;
  console.log(`🔄 Státusz frissítés: ${ids.join(", ")} → ${status}`);
  await connection.query(
    `UPDATE articles SET status = ? WHERE id IN (?)`,
    [status, ids]
  );
}

// Batch feldolgozás concurrency-vel + per-cikk timeout + retry
async function processBatch(connection, batch) {
  const ids = batch.map(a => a.id);
  await markStatus(connection, ids, "in_progress");

  const workers = [];

  for (const article of batch) {
    console.log(`⚙️ Feldolgozás: ${article.id} - ${article.title}`);

    const task = withTimeout(
      processArticle(article),
      ARTICLE_TIMEOUT_MS,
      `processArticle(${article.id})`
    )
      .then(async () => {
        console.log(`✅ Kész: ${article.id}`);
        await markStatus(connection, [article.id], "done");
      })
      .catch(async (err) => {
        console.error(`❌ Hiba/Timeout a cikk feldolgozásnál (${article.id}):`, err.message);
        // Retry logika: failed helyett visszaállítjuk pendingre
        await markStatus(connection, [article.id], "pending");
        console.log(`🔄 Retry beállítva: ${article.id} → pending`);
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
      console.log("🚀 Feed begyűjtés:", new Date().toLocaleString("hu-HU"));
      const feedRes = await fetch("http://127.0.0.1:3000/api/fetch-feed");
      const feedData = await feedRes.json();
      console.log("📰 Feed feldolgozás eredmény:", feedData);

      const batch = await fetchPendingArticles(connection, BATCH_SIZE);

      if (batch.length === 0) {
        console.log("⏸️ Nincs új pending cikk, várok...");
        await sleep(LOOP_DELAY_MS);
        // summarize-all akkor is futhat, hátha maradt olyan cikk, amihez még nincs summary
        try {
          console.log("➡️ summarize-all hívás indul (no-batch)...");
          const res = await fetch("http://127.0.0.1:3000/api/summarize-all");
          const status = res.status;
          const raw = await res.text();
          console.log(`🧾 Summarize-all státusz: ${status}, válasz:`, raw.slice(0, 200));
        } catch (err) {
          console.error("❌ Hiba summarize-all (no-batch) közben:", err);
        }
        continue;
      }

      console.log(`🆕 Feldolgozás indul: ${batch.length} db cikk`);

      // A summarize-all hívást “finally”-ben futtatjuk, hogy batch hiba esetén se maradjon ki
      try {
        await processBatch(connection, batch);
        console.log("📊 Batch feldolgozás kész!");
      } finally {
        try {
          console.log("➡️ summarize-all hívás indul...");
          const res = await fetch("http://127.0.0.1:3000/api/summarize-all");
          const status = res.status;
          const raw = await res.text();
          console.log(`🧾 Summarize-all státusz: ${status}, válasz:`, raw.slice(0, 200));
        } catch (err) {
          console.error("❌ Hiba summarize-all közben:", err);
        }
      }
    } catch (err) {
      console.error("❌ Hiba a ciklusban:", err);
      await sleep(10_000);
    }
  }
})();
