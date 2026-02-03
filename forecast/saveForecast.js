const mysql = require("mysql2/promise");

async function saveForecast(category, forecastArray) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
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
