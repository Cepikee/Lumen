const mysql = require("mysql2/promise");

async function getArticles() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
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
