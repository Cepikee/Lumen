#!/usr/bin/env node
"use strict";

const mysql = require("mysql2/promise");
const { loadMigrations, applyMigrations } = require("../db/migration-core.cjs");

const PROFILES = Object.freeze({ SMALL: 200, MEDIUM: 2000, LARGE: 10000 });
const profile = String(process.env.SCALE_PROFILE || "SMALL").toUpperCase();
const articleCount = PROFILES[profile];
const seed = Number(process.env.SCALE_SEED || 20260928);
if (!articleCount) throw new Error(`Unknown SCALE_PROFILE: ${profile}`);

function randomAt(index) {
  let value = (seed + index * 0x9e3779b1) >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return (value >>> 0) / 0x100000000;
}

async function insertRows(connection, table, columns, rows, batchSize = 200) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const placeholders = batch.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    await connection.query(`INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders}`, batch.flat());
  }
}

async function main() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const started = Date.now();
  try {
    await applyMigrations(connection, loadMigrations().filter((item) => Number(item.version) <= 21));
    const sources = Array.from({ length: 12 }, (_, i) => [`source-${i + 1}`, `Forrás ${i + 1}`, `https://source-${i + 1}.invalid`, i < 10 ? 1 : 0]);
    await insertRows(connection, "sources", ["slug", "name", "homepage_url", "is_active"], sources);
    const clusterCount = Math.ceil(articleCount / 8);
    const clusters = Array.from({ length: clusterCount }, (_, i) => [new Date(Date.UTC(2025, 0, 1) + i * 3600000), `source-${i % 12 + 1}`, `Klaszter ${i + 1}: őrült időjárás 🌍`]);
    await insertRows(connection, "clusters", ["first_published_at", "first_source", "title"], clusters);
    const embedding = JSON.stringify([0.01, 0.12, 0.23, 0.34, 0.45, 0.56, 0.67, 0.78]);
    const articles = Array.from({ length: articleCount }, (_, i) => {
      const status = i % 20 === 0 ? "failed" : i % 5 === 0 ? "pending" : "done";
      const variant = i % 11 === 0 ? `?utm_source=scale&utm_campaign=${i}` : i % 13 === 0 ? `?a=1&a=2#rész` : "";
      return [`Árvíztűrő tükörfúrógép ${i} 🚀 ${"hosszú ".repeat(i % 8)}`, `https://source-${i % 12 + 1}.invalid/hir/${i}/${variant}`, (`Magyar ő és ű, HTML &amp;, emoji 🧪. `).repeat(16 + i % 8), new Date(Date.UTC(2024 + i % 3, i % 12, i % 27 + 1, i % 24)), i % 12 + 1, `source-${i % 12 + 1}`, status, embedding, i % clusterCount + 1, status === "done" ? 1 : 0];
    });
    await insertRows(connection, "articles", ["title", "url_canonical", "content_text", "published_at", "source_id", "source", "status", "embedding", "cluster_id", "processed"], articles, 100);
    const summaries = [], keywords = [], trends = [];
    for (let i = 0; i < articleCount; i++) if (i % 20 !== 0 && i % 5 !== 0) {
      summaries.push([i + 1, `Összefoglaló ${i}: őű 🧪 ` + "részletes ".repeat(12), `Részletes tartalom ${i} ` + "adat ".repeat(24), `source-${i % 12 + 1}`]);
      keywords.push([i + 1, `téma-${i % 100}`], [i + 1, "magyar-őű"]);
      if (i % 4 === 0) trends.push([`téma-${i % 100}`, 1 + Math.floor(randomAt(i) * 20), "daily", `source-${i % 12 + 1}`]);
    }
    await insertRows(connection, "summaries", ["article_id", "content", "detailed_content", "source"], summaries, 100);
    await insertRows(connection, "keywords", ["article_id", "keyword"], keywords);
    await insertRows(connection, "trends", ["keyword", "frequency", "period", "source"], trends);
    await insertRows(connection, "speed_index", ["source", "avg_delay_minutes", "median_delay_minutes"], sources.map((_, i) => [`source-${i + 1}`, i + 0.5, i + 0.25]));
    const historyCount = Math.min(articleCount, 5000);
    await insertRows(connection, "speed_index_history", ["source", "delay_minutes", "created_at"], Array.from({ length: historyCount }, (_, i) => [`source-${i % 12 + 1}`, i % 180, new Date(Date.UTC(2025, i % 12, i % 27 + 1))]));
    console.log(JSON.stringify({ profile, seed, schema: "021", articles: articleCount, summaries: summaries.length, keywords: keywords.length, trends: trends.length, clusters: clusterCount, speedHistory: historyCount, durationMs: Date.now() - started }));
  } finally { await connection.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
