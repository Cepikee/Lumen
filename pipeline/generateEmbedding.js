// /pipeline/generateEmbedding.js — Cikk embedding generálás Ollama + llama3:latest
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");

// Ollama embedding végpont
const OLLAMA_EMBEDDING_URL = "http://127.0.0.1:11434/api/embeddings";

// Modell neve
const MODELL_NEV = "llama3:latest";

/**
 * Embedding generálása egy cikkhez
 * @param {number} cikkId
 * @param {number} timeoutMs
 */
async function generaljEmbeddingetCikkhez(cikkId, timeoutMs = 180000) {
  // 1) Adatbázis kapcsolat
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 2) Cikk lekérése
  const [sorok] = await conn.execute(
    "SELECT id, title, content FROM articles WHERE id = ?",
    [cikkId]
  );

  if (!sorok || sorok.length === 0) {
    await conn.end();
    throw new Error(`Nincs ilyen cikk az adatbázisban: ${cikkId}`);
  }

  const cikk = sorok[0];
  const szoveg = `${cikk.title}\n\n${cikk.content || ""}`.trim();

  if (!szoveg) {
    await conn.end();
    throw new Error(`A cikk szövege üres: ${cikkId}`);
  }

  // 3) Timeout + AbortController
  const vezerlo = new AbortController();
  const timeout = setTimeout(() => vezerlo.abort(), timeoutMs);

  try {
    // 4) Embedding kérés az Ollama-tól
    const valasz = await fetch(OLLAMA_EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: vezerlo.signal,
      body: JSON.stringify({
        model: MODELL_NEV,
        prompt: szoveg,
      }),
    });

    if (!valasz.ok) {
      const hibaszoveg = await valasz.text();
      throw new Error(`Ollama hiba: ${valasz.status} ${hibaszoveg}`);
    }

    const adat = await valasz.json();

    if (!adat.embedding || !Array.isArray(adat.embedding)) {
      throw new Error("Az Ollama hibás embedding választ adott vissza.");
    }

    // 5) Embedding mentése az adatbázisba
    await conn.execute(
      "UPDATE articles SET embedding = ? WHERE id = ?",
      [JSON.stringify(adat.embedding), cikkId]
    );

    return {
      cikkId,
      embeddingHossz: adat.embedding.length,
    };
  } finally {
    clearTimeout(timeout);
    await conn.end();
  }
}

// Exportáljuk
module.exports = { generaljEmbeddingetCikkhez };
