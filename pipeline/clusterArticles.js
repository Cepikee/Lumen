// /pipeline/clusterArticles.js — Javított clusterezés
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

// --- Cosine similarity ---
function cosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;

  let dot = 0, mag1 = 0, mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denom === 0 ? 0 : dot / denom;
}

async function clusterArticle(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 1) Lekérjük a cikket
  const [rows] = await conn.execute(
    "SELECT id, embedding, published_at, source FROM articles WHERE id = ?",
    [articleId]
  );

  if (!rows.length) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk: ${articleId}`);
  }

  const article = rows[0];

  // --- DÁTUMKORLÁT: csak a mai cikkeket clusterezzük ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const publishedAt = new Date(article.published_at);
  if (publishedAt < today) {
    await conn.end();
    return {
      articleId,
      clusterId: null,
      skipped: true,
      reason: "Régi cikk — nem clusterezzük"
    };
  }

  if (!article.embedding) {
    await conn.end();
    throw new Error(`A cikknek nincs embeddingje: ${articleId}`);
  }

  const currentEmbedding = JSON.parse(article.embedding);

  // 2) Csak a MAI cikkekkel hasonlítjuk össze
  const [otherArticles] = await conn.execute(
    `
    SELECT id, embedding, cluster_id
    FROM articles
    WHERE id != ?
      AND embedding IS NOT NULL
      AND published_at >= CURDATE()
    `,
    [articleId]
  );

  let bestSimilarity = 0;
  let bestClusterId = null;

  // 3) Similarity számítás
  for (const other of otherArticles) {
    if (!other.embedding) continue;

    const otherEmbedding = JSON.parse(other.embedding);
    const sim = cosineSimilarity(currentEmbedding, otherEmbedding);

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestClusterId = other.cluster_id;
    }
  }

  // --- ÚJ THRESHOLD: sokkal pontosabb ---
  const THRESHOLD = 0.90;

  if (bestSimilarity >= THRESHOLD && bestClusterId) {
    // Meglévő cluster
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

  // Új cluster
  const [insertRes] = await conn.execute(
    `
    INSERT INTO clusters (first_published_at, first_source, title)
    VALUES (?, ?, ?)
    `,
    [article.published_at, article.source, null]
  );

  const newClusterId = insertRes.insertId;

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

module.exports = { clusterArticle };
