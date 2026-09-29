"use strict";

require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { existingClusterId, parseValidEmbedding } = require("./idempotency");

const CLUSTER_LOCK_NAME = "utom:cluster:utc-day:v1";
const THRESHOLD = 0.90;

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
  const denominator = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denominator === 0 ? 0 : dot / denominator;
}

async function clusterArticleWithConnection(conn, articleId, options = {}) {
  const manageTransaction = options.manageTransaction !== false;
  if (manageTransaction) await conn.beginTransaction();
  try {
    const [rows] = await conn.execute(
      "SELECT id, embedding, published_at, source, cluster_id FROM articles WHERE id = ? FOR UPDATE",
      [articleId],
    );
    if (!rows.length) throw new Error(`Nincs ilyen cikk: ${articleId}`);

    const article = rows[0];
    const storedClusterId = existingClusterId(article.cluster_id);
    if (storedClusterId) {
      if (manageTransaction) await conn.commit();
      return { articleId, clusterId: storedClusterId, reused: true, newCluster: false };
    }

    const [[dateState]] = await conn.execute(
      "SELECT published_at >= UTC_DATE() AND published_at < UTC_DATE() + INTERVAL 1 DAY AS is_current_utc_day FROM articles WHERE id=?",
      [articleId],
    );
    if (!dateState?.is_current_utc_day) {
      if (manageTransaction) await conn.commit();
      return { articleId, clusterId: null, skipped: true, reason: "Nem a jelenlegi UTC-nap cikke" };
    }

    const currentEmbedding = parseValidEmbedding(article.embedding);
    if (!currentEmbedding) throw new Error(`A cikknek nincs érvényes embeddingje: ${articleId}`);

    const [otherArticles] = await conn.execute(
      `SELECT id, embedding, cluster_id FROM articles
       WHERE id != ? AND embedding IS NOT NULL
         AND published_at >= UTC_DATE() AND published_at < UTC_DATE() + INTERVAL 1 DAY`,
      [articleId],
    );

    let bestSimilarity = 0;
    let bestClusterId = null;
    for (const other of otherArticles) {
      const otherEmbedding = parseValidEmbedding(other.embedding);
      if (!otherEmbedding) continue;
      const similarity = cosineSimilarity(currentEmbedding, otherEmbedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestClusterId = existingClusterId(other.cluster_id);
      }
    }

    if (bestSimilarity >= THRESHOLD && bestClusterId) {
      await conn.execute("UPDATE articles SET cluster_id = ? WHERE id = ?", [bestClusterId, articleId]);
      if (manageTransaction) await conn.commit();
      return { articleId, clusterId: bestClusterId, similarity: bestSimilarity, newCluster: false };
    }

    const [insertResult] = await conn.execute(
      "INSERT INTO clusters (first_published_at, first_source, title) VALUES (?, ?, ?)",
      [article.published_at, article.source, null],
    );
    await conn.execute("UPDATE articles SET cluster_id = ? WHERE id = ?", [insertResult.insertId, articleId]);
    if (manageTransaction) await conn.commit();
    return { articleId, clusterId: insertResult.insertId, similarity: bestSimilarity, newCluster: true };
  } catch (error) {
    if (manageTransaction) await conn.rollback();
    throw error;
  }
}

async function clusterArticle(articleId) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });
  try {
    return await withClusterAdvisoryLock(conn, () => clusterArticleWithConnection(conn, articleId));
  } finally {
    await conn.end();
  }
}

async function withClusterAdvisoryLock(conn, operation) {
  let locked = false;
  try {
    const [[lockRow]] = await conn.execute("SELECT GET_LOCK(?, 10) AS acquired", [CLUSTER_LOCK_NAME]);
    locked = Number(lockRow?.acquired) === 1;
    if (!locked) throw new Error("cluster_lock_unavailable");
    return await operation();
  } finally {
    if (locked) {
      try { await conn.execute("SELECT RELEASE_LOCK(?)", [CLUSTER_LOCK_NAME]); } catch {}
    }
  }
}

module.exports = { CLUSTER_LOCK_NAME, clusterArticle, clusterArticleWithConnection, cosineSimilarity, withClusterAdvisoryLock };
