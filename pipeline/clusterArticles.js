// /pipeline/clusterArticles.js — Cikk clusterezés embedding alapján
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

// --- Cosine similarity kiszámítása két embedding között ---
function cosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;

  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }

  const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (denom === 0) return 0;

  return dot / denom;
}

// --- Fő függvény: cikk clusterezése ---
async function clusterArticle(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 1) Lekérjük az adott cikk embeddingjét
  const [rows] = await conn.execute(
    "SELECT id, embedding, published_at, source FROM articles WHERE id = ?",
    [articleId]
  );

  if (!rows || rows.length === 0) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk: ${articleId}`);
  }

  const article = rows[0];

  if (!article.embedding) {
    await conn.end();
    throw new Error(`A cikknek nincs embeddingje: ${articleId}`);
  }

  const currentEmbedding = JSON.parse(article.embedding);

  // 2) Lekérjük az utolsó 7 nap cikkjeit embeddinggel
  const [otherArticles] = await conn.execute(
    `
    SELECT id, embedding, cluster_id
    FROM articles
    WHERE id != ?
      AND embedding IS NOT NULL
      AND published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `,
    [articleId]
  );

  let bestSimilarity = 0;
  let bestClusterId = null;

  // 3) Similarity számítás minden más cikkel
  for (const other of otherArticles) {
    if (!other.embedding) continue;

    const otherEmbedding = JSON.parse(other.embedding);
    const sim = cosineSimilarity(currentEmbedding, otherEmbedding);

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestClusterId = other.cluster_id;
    }
  }

  // 4) Döntés: meglévő cluster vagy új cluster?
  const THRESHOLD = 0.82;

  if (bestSimilarity >= THRESHOLD && bestClusterId) {
    // --- Meglévő cluster ---
    await conn.execute(
      "UPDATE articles SET cluster_id = ? WHERE id = ?",
      [bestClusterId, articleId]
    );

    await conn.end();
    return {
      articleId,
      clusterId: bestClusterId,
      similarity: bestSimilarity,
      newCluster: false,
    };
  }

  // --- Új cluster létrehozása ---
  const [insertRes] = await conn.execute(
    `
    INSERT INTO clusters (first_published_at, first_source, title)
    VALUES (?, ?, ?)
    `,
    [article.published_at, article.source, null]
  );

  const newClusterId = insertRes.insertId;

  // Cikk hozzárendelése az új clusterhez
  await conn.execute(
    "UPDATE articles SET cluster_id = ? WHERE id = ?",
    [newClusterId, articleId]
  );

  await conn.end();

  return {
    articleId,
    clusterId: newClusterId,
    similarity: bestSimilarity,
    newCluster: true,
  };
}

// Export
module.exports = { clusterArticle };
