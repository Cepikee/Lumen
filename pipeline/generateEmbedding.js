// /pipeline/generateEmbedding.js — Cikk embedding generálás OpenAI-val (text-embedding-3-small)
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generaljEmbeddingetCikkhez(cikkId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 1) Cikk lekérése — CSAK AZ EREDETI SZÖVEG
  const [rows] = await conn.execute(
    `SELECT id, title, content_text 
     FROM articles 
     WHERE id = ?`,
    [cikkId]
  );

  if (!rows.length) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk: ${cikkId}`);
  }

  const { title, content_text } = rows[0];

  if (!content_text || content_text.trim().length < 50) {
    await conn.end();
    throw new Error(`A cikk eredeti szövege túl rövid: ${cikkId}`);
  }

  const szoveg = `${title}\n\n${content_text}`.slice(0, 8000);

  // 2) VALÓDI OpenAI embedding API — text-embedding-3-small
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: szoveg
  });

  const embedding = response.data[0].embedding;

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
