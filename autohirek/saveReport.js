const mysql = require("mysql2/promise");

async function saveReport(content) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  const [result] = await conn.execute(
    "INSERT INTO daily_reports (content, created_at) VALUES (?, NOW())",
    [content]
  );

  await conn.end();
  return result.insertId;
}

module.exports = saveReport;
