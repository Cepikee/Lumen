const mysql = require("mysql2/promise");
const processArticle = require("./processArticle.js");

console.log("✅ cron.js elindult!");

let counter = 0;
const intervalSeconds = 20;
const fullCycleMinutes = 1; // 1 percenként teljes folyamat

// ---- 1) 20 másodpercenként logol és visszaszámol ----
setInterval(() => {
  counter++;
  const remaining = (fullCycleMinutes * 60 - (counter * intervalSeconds)) / intervalSeconds;
  console.log(
    `⏱️ Futok... még ${remaining} × ${intervalSeconds} mp a következő teljes frissítésig (${new Date().toLocaleTimeString("hu-HU")})`
  );
}, intervalSeconds * 1000);

// ---- 2) Induláskor azonnal fetch-feed ----
(async () => {
  try {
    console.log("🚀 Induláskor feed begyűjtés:", new Date().toLocaleString("hu-HU"));
    const feedRes = await fetch("http://localhost:3000/api/fetch-feed");
    const feedData = await feedRes.json();
    console.log("📰 Feed feldolgozás eredmény:", feedData);
  } catch (err) {
    console.error("❌ Hiba induláskor feednél:", err);
  }

  // ---- 3) 20 másodperc múlva summarize-all ----
  setTimeout(async () => {
    try {
      console.log("🧾 Indulás utáni summarize-all:", new Date().toLocaleString("hu-HU"));
      const res = await fetch("http://localhost:3000/api/summarize-all");
      const data = await res.json();
      console.log("🧾 Summarize-all lefutott:", data);
    } catch (err) {
      console.error("❌ Hiba summarize-all futtatás közben:", err);
    }
  }, 20 * 1000);
})();

// ---- 4) 1 percenként teljes automata feldolgozás ----
setInterval(async () => {
  console.log("🚀 Teljes automata frissítés indul:", new Date().toLocaleString("hu-HU"));

  try {
    // 1. Feed
    const feedRes = await fetch("http://localhost:3000/api/fetch-feed");
    const feedData = await feedRes.json();
    console.log("📰 Feed feldolgozás eredmény:", feedData);

    // 2. Új cikkek
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    const [newArticles] = await connection.execute(`
      SELECT a.*
      FROM articles a
      LEFT JOIN summaries s ON s.article_id = a.id
      WHERE s.id IS NULL
      ORDER BY a.id DESC
      LIMIT 50
    `);

    console.log(`🆕 Új cikkek feldolgozása: ${newArticles.length} db`);

    for (const article of newArticles) {
      try {
        console.log(`⚙️ Feldolgozás: ${article.title}`);
        await processArticle(article);
        console.log(`✅ Kész: ${article.title}`);
      } catch (innerErr) {
        console.error("❌ Hiba a cikk feldolgozásnál:", innerErr);
      }
    }

    await connection.end();
    console.log("📊 Összes feldolgozás kész!");

    // 3. summarize-all
    try {
      const res = await fetch("http://localhost:3000/api/summarize-all");
      const data = await res.json();
      console.log("🧾 Summarize-all lefutott:", data);
    } catch (err) {
      console.error("❌ Hiba a summarize-all futtatás közben:", err);
    }

  } catch (err) {
    console.error("❌ Hiba a teljes ciklus futtatás közben:", err);
  }
}, fullCycleMinutes * 60 * 1000);
