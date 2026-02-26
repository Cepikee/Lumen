// /pipeline/generateEmbedding.js — Cikk embedding generálás OpenAI-val (EREDTI SZÖVEGBŐL)
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { callOpenAI } = require("./aiClient");

/**
 * Embedding generálása egy cikkhez OpenAI-val
 * @param {number} cikkId
 * @param {number} timeoutMs
 */
async function generaljEmbeddingetCikkhez(cikkId, timeoutMs = 180000) {
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

  if (!rows || rows.length === 0) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk az adatbázisban: ${cikkId}`);
  }

  const cikk = rows[0];

  // 2) Eredeti szöveg ellenőrzése
  if (!cikk.content_text || cikk.content_text.trim().length < 50) {
    await conn.end();
    throw new Error(`A cikk eredeti szövege túl rövid vagy üres: ${cikkId}`);
  }

  // 3) Embedding szöveg összeállítása — CSAK EREDETI
  const szoveg = `${cikk.title}\n\n${cikk.content_text}`.trim().slice(0, 8000);

  // 4) OpenAI embedding hívás
  const prompt = `
Készíts embeddinget a következő szöveghez.
Csak a nyers embedding vektort add vissza JSON tömbként.

SZÖVEG:
${szoveg}
  `.trim();

  let rawEmbedding = await callOpenAI(prompt, 300);

  // 5) JSON parsolás
  let embedding;
  try {
    embedding = JSON.parse(rawEmbedding);
  } catch (e) {
    console.error("Embedding JSON parse error:", rawEmbedding);
    throw new Error("Embedding JSON parse error");
  }

  if (!Array.isArray(embedding)) {
    throw new Error("Embedding nem tömb!");
  }

  // 6) Mentés adatbázisba
  await conn.execute(
    "UPDATE articles SET embedding = ? WHERE id = ?",
    [JSON.stringify(embedding), cikkId]
  );

  await conn.end();

  return {
    cikkId,
    embeddingHossz: embedding.length,
  };
}

module.exports = { generaljEmbeddingetCikkhez };
