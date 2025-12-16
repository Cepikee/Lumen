// processArticle.js

const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { checkPlagiarism } = require("./checkPlagiarism.js");
const { spawn } = require("child_process");

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function processArticle(article) {
  const content = article.content_text || "";

  // 1) Hash kiszámítása – plágium ellenőrzéshez
  const contentHash = sha256(content);

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  await connection.execute("UPDATE articles SET content_hash = ? WHERE id = ?", [
    contentHash,
    article.id,
  ]);

  // 2) Gyors plágium ellenőrzés (ugyanolyan hash máshol?)
  const [dupes] = await connection.execute(
    "SELECT id FROM articles WHERE content_hash = ? AND id != ?",
    [contentHash, article.id]
  );

  let plagiarismScore = dupes.length ? 1 : 0;

  // 3) Rövid összegzés (Zero Plagiarism prompt)
  let summaryText = await runOllamaZeroPlagiarism(content);

  // --- Plágium ellenőrzés az eredeti cikk és az AI összefoglaló között ---
  const similarityScore = checkPlagiarism(content, summaryText);
  if (similarityScore > 0.8) {
    plagiarismScore = 1;
    console.log("⚠️ Plágium gyanú! Újrafogalmazás indul...");
    const rephrased = await runOllamaZeroPlagiarism(summaryText);
    summaryText = rephrased;
  }

  console.log(
    `🔍 Plágium ellenőrzés: hash=${contentHash}, score=${plagiarismScore}, similarity=${similarityScore}`
  );

  // 4) Kulcsszavak
  const trendKeywords = await extractKeywords(summaryText);

  // 5) Mentés summary táblába
  await connection.execute(
    `INSERT INTO summaries 
     (article_id, url, content, language, plagiarism_score, trend_keywords, model_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
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

  // 6) Processed flag beállítása
  await connection.execute(
    `UPDATE articles SET processed = 1 WHERE id = ?`,
    [article.id]
  );

  console.log(`✅ Feldolgozás kész: ${article.title}`);

  await connection.end();
}

// -------- AI függvények ---------

function runOllama(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn("ollama", ["run", "llama3:latest", prompt], {
      shell: false,
      windowsHide: true   // <-- ez elrejti a cmd ablakot
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.on("error", reject);
    child.on("close", () => resolve(output.trim()));
  });
}

async function summarize(text) {
  const prompt = `Foglaljad össze 3 mondatban:\n\n${text}`;
  return await runOllama(prompt);
}

async function extractKeywords(summary) {
  const prompt = `Adj meg 5 legfontosabb kulcsszót vesszővel elválasztva:\n\n${summary}`;
  return await runOllama(prompt);
}

// Új függvény: Zero Plagiarism prompt
async function runOllamaZeroPlagiarism(originalText) {
  const prompt = `Olvasd el a következő cikket, és írj belőle egy teljesen új szöveget magyarul.
Fontos szabályok:
- Ne vegyél át szó szerint mondatokat vagy kifejezéseket az eredetiből.
- Fogalmazd át minden gondolatot saját szavakkal.
- A szöveg legyen 100% újrafogalmazott, plágiummentes.
- Őrizd meg a tartalom lényegét, de adj más szerkezetet és stílust.

Cikk:

${originalText}`;
  return await runOllama(prompt);
}

module.exports = processArticle;
