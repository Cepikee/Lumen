// lib/trend-cron.js
const cron = require("node-cron");
const mysql = require("mysql2/promise");

// 🔁 Aggregációs függvény
async function runTrendAggregation() {
  console.log(">>> Trend aggregáció indul!");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025"
  });

  const [rows] = await connection.execute(
    `SELECT keyword, COUNT(*) AS freq
     FROM keywords
     WHERE created_at > NOW() - INTERVAL 1 DAY
     GROUP BY keyword
     HAVING COUNT(*) >= 1
     ORDER BY freq DESC
     LIMIT 20`
  );

  for (const row of rows) {
    await connection.execute(
      "INSERT INTO trends (keyword, frequency, period) VALUES (?, ?, ?)",
      [row.keyword, row.freq, "daily"]
    );
  }

  await connection.end();
  console.log(">>> Trendek frissítve!");
}

// ⏰ Cron job: óránként
cron.schedule("0 * * * *", runTrendAggregation);

// 🚀 Azonnali indulás, ha kézzel futtatod
runTrendAggregation();
