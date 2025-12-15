const cron = require("node-cron");
import db from "./db.js";
import { processArticle } from "./processArticle.js";

console.log("✅ cron.js elindult!");

let counter = 0;
const intervalMinutes = 5;

// ---- 1) Percenként logol ----
cron.schedule("* * * * *", () => {
  counter++;
  const remaining = intervalMinutes - (counter % intervalMinutes);
  console.log(
    `⏱️ Futok... még ${remaining} perc a következő frissítésig (${new Date().toLocaleTimeString(
      "hu-HU"
    )})`
  );
});

// ---- 2) 5 percenként teljes automata feldolgozás ----
cron.schedule("*/5 * * * *", async () => {
  console.log("🚀 Automatikus frissítés indul:", new Date().toLocaleString("hu-HU"));

  try {
    // 1. Hírek begyűjtése
    const feedRes = await fetch("http://localhost:3000/api/fetch-feed");
    const feedData = await feedRes.json();
    console.log("📰 Feed feldolgozás eredmény:", feedData);

    // 2. Új cikkek lekérése (ahol még nincs summary)
    const [newArticles] = await db.execute(`
      SELECT a.*
      FROM articles a
      LEFT JOIN summaries s ON s.article_id = a.id
      WHERE s.id IS NULL
      ORDER BY a.id DESC
      LIMIT 50
    `);

    console.log(`🆕 Új cikkek feldolgozása: ${newArticles.length} db`);

    // 3. Mindegyik új cikkre lefuttatjuk a teljes AI folyamatot
    for (const article of newArticles) {
      try {
        console.log(`⚙️ Feldolgozás: ${article.title}`);
        await processArticle(article);
        console.log(`✅ Kész: ${article.title}`);
      } catch (innerErr) {
        console.error("❌ Hiba a cikk feldolgozásnál:", innerErr);
      }
    }

    console.log("📊 Összes feldolgozás kész!");
  } catch (err) {
    console.error("❌ Hiba a cron futtatás közben:", err);
  }
});
