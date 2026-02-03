const mysql = require("mysql2/promise");

async function getTimeseries(hoursBack = 168) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  const start = new Date(Date.now() - hoursBack * 3600 * 1000);
  const startStr = start.toISOString().slice(0, 19).replace("T", " ");

  const [cats] = await conn.execute(`
    SELECT DISTINCT TRIM(category) AS category
    FROM articles
    WHERE category IS NOT NULL AND category <> ''
  `);

  const categories = cats.map(c => c.category);

  const result = {};

  for (const cat of categories) {
    const [rows] = await conn.execute(
      `
      SELECT 
        DATE_FORMAT(published_at, '%Y-%m-%d %H:00:00') AS bucket,
        COUNT(*) AS count
      FROM articles
      WHERE LOWER(TRIM(category)) = LOWER(TRIM(?))
        AND published_at >= ?
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [cat, startStr]
    );

    const map = new Map();
    for (const r of rows) map.set(r.bucket, r.count);

    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);

    const points = [];

    for (let i = 0; i < hoursBack; i++) {
      const key = cursor.toISOString().slice(0, 19).replace("T", " ");
      points.push({
        date: key,
        count: map.get(key) ?? 0,
      });
      cursor.setHours(cursor.getHours() + 1);
    }

    result[cat] = points;
  }

  await conn.end();
  return result;
}

module.exports = getTimeseries;
