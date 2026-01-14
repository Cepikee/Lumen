const mysql = require("mysql2/promise");

// --- AI hívás ---
async function callOllama(prompt, numPredict = 128, timeoutMs = 180000) {
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
        keep_alive: 0,
        options: {
          num_predict: numPredict
        }
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

async function plagiarismCheck(articleId, shortSummary) {
  try {
    const prompt = `
Ellenőrizd a következő szöveget plágium szempontból.
Adj vissza egyetlen számot 0 és 1 között, semmi mást.
Ha szeretnéd, javítsd a szöveget is, és írd a végére így:
[JAVÍTOTT]: <új szöveg>

Szöveg:
${shortSummary}
    `.trim();

    // AI hívás limitálva 128 tokenre
    const raw = await callOllama(prompt, 128);

    // --- plágium pontszám kinyerése ---
    const score = parseFloat(raw);
    const finalScore = isNaN(score) ? 0 : score;

    // --- javított szöveg kinyerése ---
    let improved = shortSummary;
    const marker = "[JAVÍTOTT]:";
    if (raw.includes(marker)) {
      improved = raw.split(marker)[1].trim();
    }

    // --- adatbázis frissítés ---
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    await conn.execute(
      `
      UPDATE summaries
      SET plagiarism_score = ?, content = ?
      WHERE article_id = ?
      `,
      [finalScore, improved, articleId]
    );

    await conn.end();

    return {
      ok: true,
      plagiarismScore: finalScore,
      summaryShort: improved,
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { plagiarismCheck };
