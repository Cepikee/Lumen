// /pipeline/generateEmbedding.js — Cikk embedding generálás OpenAI-val (text-embedding-3-small)
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { parseValidEmbedding } = require("./idempotency");
const { generateEmbedding } = require("./aiClient");

async function generaljEmbeddingetCikkhez(cikkId, options = {}) {
  const ownsConnection = !options.connection;
  const conn = options.connection || await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  try {
    const [rows] = await conn.execute(
      "SELECT id, title, content_text, embedding FROM articles WHERE id = ?",
      [cikkId],
    );
    if (!rows.length) throw new Error(`Nincs ilyen cikk: ${cikkId}`);

    const { title, content_text, embedding: storedEmbedding } = rows[0];
    const existingEmbedding = parseValidEmbedding(storedEmbedding);
    if (existingEmbedding) return { cikkId, embeddingHossz: existingEmbedding.length, reused: true };
    if (!content_text || content_text.trim().length < 50) {
      throw new Error(`A cikk eredeti szövege túl rövid: ${cikkId}`);
    }

    const response = await generateEmbedding(`${title}\n\n${content_text}`.slice(0, 8000), "text-embedding-3-small");
    const embedding = response.embedding;
    if (options.persist !== false) {
      await conn.execute("UPDATE articles SET embedding = ? WHERE id = ?", [JSON.stringify(embedding), cikkId]);
    }
    return { cikkId, embeddingHossz: embedding.length, embedding };
  } finally {
    if (ownsConnection) await conn.end();
  }
}

module.exports = { generaljEmbeddingetCikkhez };
