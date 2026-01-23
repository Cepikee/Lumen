const mysql = require("mysql2/promise");

async function getArticles() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  const [rows] = await conn.execute("SELECT * FROM articles ORDER BY id DESC LIMIT 10");
  await conn.end();
  return rows;
}

module.exports = getArticles;
