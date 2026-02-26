// /pipeline/updateSpeedIndex.js — Speed Index számítás és rangsor frissítés
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

/**
 * Medián számítása egy tömbből
 */
function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Speed Index frissítése az összes cluster alapján
 */
async function updateSpeedIndex() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 1) Lekérjük az összes clustert
  const [clusters] = await conn.execute("SELECT id FROM clusters");

  // Forrásonként gyűjtjük a késéseket
  const delaysBySource = {};

  // 2) Végigmegyünk minden clusteren
  for (const cluster of clusters) {
    const clusterId = cluster.id;

    // 2/a) Lekérjük a cluster összes cikkét
    const [articles] = await conn.execute(
      `
      SELECT id, source, published_at
      FROM articles
      WHERE cluster_id = ?
      ORDER BY published_at ASC
      `,
      [clusterId]
    );

    if (!articles || articles.length === 0) continue;

    // 2/b) Az első cikk publikálási ideje
    const firstPublished = new Date(articles[0].published_at).getTime();

    // 2/c) Minden cikk késésének kiszámítása
    for (const article of articles) {
      const pubTime = new Date(article.published_at).getTime();
      const delayMinutes = (pubTime - firstPublished) / 1000 / 60;

      if (!delaysBySource[article.source]) {
        delaysBySource[article.source] = [];
      }

      delaysBySource[article.source].push(delayMinutes);
    }
  }

  // 3) Speed Index táblába mentjük az eredményeket
  for (const source of Object.keys(delaysBySource)) {
    const delays = delaysBySource[source];

    const avg =
      delays.reduce((sum, v) => sum + v, 0) / (delays.length || 1);

    const med = median(delays);

    await conn.execute(
      `
      INSERT INTO speed_index (source, avg_delay_minutes, median_delay_minutes, updated_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        avg_delay_minutes = VALUES(avg_delay_minutes),
        median_delay_minutes = VALUES(median_delay_minutes),
        updated_at = NOW()
      `,
      [source, avg, med]
    );
  }

  await conn.end();

  return {
    status: "ok",
    sourcesUpdated: Object.keys(delaysBySource).length,
  };
}

// Export
module.exports = { updateSpeedIndex };
