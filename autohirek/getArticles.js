const mysql = require("mysql2/promise");

async function getArticles() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  // A summaries tábla a forrás
  const [rows] = await conn.execute(
  `SELECT id, title, content, detailed_content
   FROM summaries
   WHERE DATE(created_at) = CURDATE()
   ORDER BY id DESC`
);


  await conn.end();
  return rows;
}

module.exports = getArticles;
