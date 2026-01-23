const db = require("../lib/db");

async function getTodayArticles() {
  const conn = await db();

  const [rows] = await conn.execute(
    `
    SELECT article_id, content, detailed_content, created_at
    FROM summaries
    WHERE DATE(created_at) = CURDATE()
    ORDER BY created_at ASC
    `
  );

  return rows;
}

module.exports = getTodayArticles;
