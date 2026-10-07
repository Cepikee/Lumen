#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");

async function inspect(connection) {
  const [[[sourceCount]], [[articleCount]], [[pendingCount]], [bySource], [recent]] = await Promise.all([
    connection.query("SELECT COUNT(*) count FROM sources"),
    connection.query("SELECT COUNT(*) count FROM articles"),
    connection.query("SELECT COUNT(*) count FROM articles WHERE status='pending'"),
    connection.query("SELECT s.slug,s.name,COUNT(a.id) articleCount FROM sources s LEFT JOIN articles a ON a.source_id=s.id GROUP BY s.id,s.slug,s.name ORDER BY s.slug"),
    connection.query("SELECT a.id,a.title,COALESCE(s.slug,a.source) source,a.published_at publishedAt,a.status FROM articles a LEFT JOIN sources s ON s.id=a.source_id ORDER BY a.created_at DESC,a.id DESC LIMIT 10"),
  ]);
  return { sourceCount: Number(sourceCount.count), articleCount: Number(articleCount.count), pendingArticleCount: Number(pendingCount.count), articlesBySource: bySource.map((row) => ({ slug: row.slug, name: row.name, articleCount: Number(row.articleCount) })), recentArticles: recent.map((row) => ({ id: Number(row.id), title: row.title, source: row.source, publishedAt: row.publishedAt, status: row.status })) };
}

async function main() {
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((name) => !String(process.env[name] || "").trim());
  if (missing.length) throw new Error(`feed_inspection_missing:${missing.join(",")}`);
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000 });
  try { console.log(JSON.stringify(await inspect(connection), null, 2)); }
  finally { await connection.end(); }
}

if (require.main === module) main().catch((error) => { console.error(`FEED_INSPECTION: FAIL ${error.message}`); process.exitCode = 1; });

module.exports = { inspect };
