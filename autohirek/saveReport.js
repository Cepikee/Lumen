const mysql = require("mysql2/promise");

async function saveReport(content) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  const [result] = await conn.execute(
    "INSERT INTO daily_reports (content, created_at) VALUES (?, NOW())",
    [content]
  );

  await conn.end();
  return result.insertId;
}

module.exports = saveReport;
