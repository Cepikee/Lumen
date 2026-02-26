// /pipeline/generateEmbedding.js — Cikk embedding generálás Ollama + llama3:latest
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

const OLLAMA_EMBEDDING_URL = "http://127.0.0.1:11434/api/embeddings";
const MODELL_NEV = "llama3:latest";

/**
 * Embedding generálása egy cikkhez
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

  // 1) Cikk lekérése — HELYES MEZŐK
  const [rows] = await conn.execute(
    `SELECT id, title, content_text, short_summary, long_summary 
     FROM articles 
     WHERE id = ?`,
    [cikkId]
  );

  if (!rows || rows.length === 0) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk az adatbázisban: ${cikkId}`);
  }

  const cikk = rows[0];

  // 2) Embedding szöveg összeállítása
  let szoveg = "";

  if (cikk.content_text && cikk.content_text.trim().length > 0) {
    szoveg = `${cikk.title}\n\n${cikk.content_text}`;
  } else if (cikk.long_summary && cikk.long_summary.trim().length > 0) {
    szoveg = `${cikk.title}\n\n${cikk.long_summary}`;
  } else if (cikk.short_summary && cikk.short_summary.trim().length > 0) {
    szoveg = `${cikk.title}\n\n${cikk.short_summary}`;
  } else {
    await conn.end();
    throw new Error(`A cikk szövege üres: ${cikkId}`);
  }

  szoveg = szoveg.trim().slice(0, 4000); // biztonsági limit

  // 3) Timeout + AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 4) Embedding kérés az Ollama-tól
    const response = await fetch(OLLAMA_EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODELL_NEV,
        prompt: szoveg,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama hiba: ${response.status} ${text}`);
    }

    const data = await response.json();

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error("Az Ollama hibás embedding választ adott vissza.");
    }

    // 5) Embedding mentése
    await conn.execute(
      "UPDATE articles SET embedding = ? WHERE id = ?",
      [JSON.stringify(data.embedding), cikkId]
    );

    return {
      cikkId,
      embeddingHossz: data.embedding.length,
    };
  } finally {
    clearTimeout(timeout);
    await conn.end();
  }
}

module.exports = { generaljEmbeddingetCikkhez };
