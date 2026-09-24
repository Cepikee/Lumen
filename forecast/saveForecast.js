const mysql = require("mysql2/promise");

async function saveForecast(category, forecastArray) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  await conn.execute(
    "DELETE FROM forecast WHERE category = ?",
    [category]
  );

  for (const f of forecastArray) {
    await conn.execute(
      `
      INSERT INTO forecast (category, date, predicted)
      VALUES (?, ?, ?)
      `,
      [category, f.date, f.predicted]
    );
  }

  await conn.end();
}

module.exports = saveForecast;
