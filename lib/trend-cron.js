// lib/trend-cron.js
const cron = require("node-cron");
const mysql = require("mysql2/promise");

// 🔁 Aggregációs függvény
async function runTrendAggregation() {
  console.log(">>> Trend aggregáció indul!");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev"
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

function startTrendCron() {
  const { assertCapability } = require("./config/runtime");
  assertCapability("backgroundJobs");
  return cron.schedule("0 * * * *", runTrendAggregation);
}

if (require.main === module) {
  startTrendCron();
  runTrendAggregation();
}

module.exports = { runTrendAggregation, startTrendCron };
