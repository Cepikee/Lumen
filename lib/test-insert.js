// test-insert.js
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  const insertSql = `
    INSERT INTO summaries (
      article_id, url, language, content, detailed_content,
      category, plagiarism_score, ai_clean, source,
      trend_keywords, sentiment, model_version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      content = VALUES(content)
  `;

  const params = [
    12345,
    "https://example.com/test",
    "hu",
    "teszt tartalom",
    "teszt részletes",
    "Tech",
    0.0,
    1,
    "example",
    "kulcs1,kulcs2",
    "neutral",
    "test-model-v1"
  ];

  console.log("Params length:", params.length);
  params.forEach((p, i) => console.log(i, typeof p, p));

  try {
    const [res] = await conn.execute(insertSql, params);
    console.log("Insert OK:", res);
  } catch (err) {
    console.error("SQL error:", err);
  } finally {
    await conn.end();
  }
})();
