// processArticle.js

const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { checkPlagiarism } = require("./checkPlagiarism.js");

// ---- Segédfüggvények ----
function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Ollama HTTP API hívás timeouttal
async function callOllama(prompt, timeoutMs = 180000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false }),
      signal: controller.signal
    });

    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
      return (data.response ?? "").trim();
    } catch {
      return raw.trim();
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ---- AI funkciók ----
async function runOllamaZeroPlagiarism(originalText) {
  const prompt = `Olvasd el a következő cikket, és írj belőle egy teljesen új szöveget magyarul.
Fontos szabályok:
- Ne vegyél át szó szerint mondatokat vagy kifejezéseket az eredetiből.
- Fogalmazd át minden gondolatot saját szavakkal.
- A szöveg legyen 100% újrafogalmazott, plágiummentes.
- Őrizd meg a tartalom lényegét, de adj más szerkezetet és stílust.

Cikk:

${originalText}`;
  return await callOllama(prompt);
}

async function extractKeywords(summary) {
   const prompt = `Feladat: térj vissza pontosan 5 magyar kulcsszóval.
Formátum: egyetlen sor, vesszővel elválasztva, bevezető és magyarázat nélkül.
Csak kulcsszavak, nincsenek számok, pontok, idézőjelek vagy zárójelek.
Szöveg: ${summary}`;
  return await callOllama(prompt);
}

// ---- Fő feldolgozó függvény ----
async function processArticle(article) {
  let connection;
  try {
    const content = article.content_text || "";
    const contentHash = sha256(content);

    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    // Hash mentése
    await connection.execute(
      "UPDATE articles SET content_hash = ? WHERE id = ?",
      [contentHash, article.id]
    );

    // Duplikátum ellenőrzés
    const [dupes] = await connection.execute(
      "SELECT id FROM articles WHERE content_hash = ? AND id != ?",
      [contentHash, article.id]
    );
    let plagiarismScore = dupes.length ? 1 : 0;

    // Összefoglaló
    let summaryText = await runOllamaZeroPlagiarism(content);

    // Plágium ellenőrzés
    const similarityScore = checkPlagiarism(content, summaryText);
    if (similarityScore > 0.8) {
      plagiarismScore = 1;
      console.log("⚠️ Plágium gyanú! Újrafogalmazás indul...");
      summaryText = await runOllamaZeroPlagiarism(content); // <-- mindig az eredetire
    }

    console.log(
      `🔍 Plágium ellenőrzés: hash=${contentHash}, score=${plagiarismScore}, similarity=${similarityScore}`
    );

    // Kulcsszavak
    const trendKeywords = await extractKeywords(summaryText);

    // Summary mentése
    // Summary mentése — idempotens upsert
await connection.execute(
  `INSERT INTO summaries 
   (article_id, url, content, language, plagiarism_score, trend_keywords, model_version, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
   ON DUPLICATE KEY UPDATE
     url = VALUES(url),
     content = VALUES(content),
     language = VALUES(language),
     plagiarism_score = VALUES(plagiarism_score),
     trend_keywords = VALUES(trend_keywords),
     model_version = VALUES(model_version)`
,
  [
    article.id,
    article.url_canonical,
    summaryText,
    article.language || "hu",
    plagiarismScore,
    trendKeywords,
    "llama3-local-v1",
  ]
);

    

    // Processed flag
    await connection.execute(
      `UPDATE articles SET processed = 1 WHERE id = ?`,
      [article.id]
    );

    console.log(`✅ Feldolgozás kész: ${article.title}`);
    return true; // <-- lezárja az ígéretet
  } catch (err) {
    console.error(`❌ processArticle hiba (${article.id}):`, err);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = processArticle;
