// pipeline/detectTrends.js
const mysql = require("mysql2/promise");

// Itt bent a callOllama, nincs külön fájl
async function callOllama(prompt, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: true,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();

    try {
      const data = JSON.parse(raw);
      return (data.response ?? "").trim();
    } catch {
      return raw.trim();
    }
  } finally {
    clearTimeout(t);
  }
}

// EREDETI CIKK SZÖVEGRE ÉPÜL
async function detectTrends(articleId, category, text) {
  try {
    if (!text || text.length < 5) {
      return { ok: true, trendKeywords: "" };
    }

    const raw = await callOllama(
      `Adj vissza pontosan 6–10 kulcsszót magyarul, vesszővel elválasztva.
Semmi mást ne írj, ne magyarázz, ne vezess be.
Szöveg: ${text}`
    );

    const trendKeywords = raw
      .split(/[,\n]/)
      .map(k => k.trim())
      .filter(k => k.length >= 2)
      .slice(0, 10)
      .join(", ");

    // summaries-ben csak a mező frissítés itt, a többit cron intézi
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    await connection.execute(
      `UPDATE summaries 
       SET trend_keywords = ?
       WHERE article_id = ?`,
      [trendKeywords, articleId]
    );

    await connection.end();

    return { ok: true, trendKeywords };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { detectTrends };
