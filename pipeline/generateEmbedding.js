// /pipeline/generateEmbedding.js — Cikk embedding generálás OpenAI-val (text-embedding-3-small)
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { parseValidEmbedding } = require("./idempotency");
const { generateEmbedding } = require("./aiClient");

async function generaljEmbeddingetCikkhez(cikkId) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
  });

  // 1) Cikk lekérése — CSAK AZ EREDETI SZÖVEG
  const [rows] = await conn.execute(
    `SELECT id, title, content_text, embedding
     FROM articles 
     WHERE id = ?`,
    [cikkId]
  );

  if (!rows.length) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk: ${cikkId}`);
  }

  const { title, content_text, embedding: storedEmbedding } = rows[0];

  const existingEmbedding = parseValidEmbedding(storedEmbedding);
  if (existingEmbedding) {
    await conn.end();
    return { cikkId, embeddingHossz: existingEmbedding.length, reused: true };
  }

  if (!content_text || content_text.trim().length < 50) {
    await conn.end();
    throw new Error(`A cikk eredeti szövege túl rövid: ${cikkId}`);
  }

  const szoveg = `${title}\n\n${content_text}`.slice(0, 8000);

  // 2) VALÓDI OpenAI embedding API — text-embedding-3-small
  const response = await generateEmbedding(szoveg, "text-embedding-3-small");
  const embedding = response.embedding;

  // 3) Mentés
  await conn.execute(
    "UPDATE articles SET embedding = ? WHERE id = ?",
    [JSON.stringify(embedding), cikkId]
  );

  await conn.end();

  return {
    cikkId,
    embeddingHossz: embedding.length
  };
}

module.exports = { generaljEmbeddingetCikkhez };
