const mysql = require("mysql2/promise");

// --- AI hívás ---
async function callOllama(prompt, numPredict = 2048, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
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

// --- Validáció ---
function isValidDetailed(text) {
  if (!text) return false;
  const t = text.trim();

  // Ne legyen túl rövid
  if (t.length < 150) return false;

  // Ne legyen prompt visszaírás
  if (t.toLowerCase().includes("írj részletes") ||
      t.toLowerCase().includes("elemzést") ||
      t.toLowerCase().includes("sajnálom")) {
    return false;
  }

  // Ne legyen HTML
  if (t.startsWith("<") && t.endsWith(">")) return false;

  return true;
}

async function summarizeLong(articleId, shortSummary) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 50) {
      console.error(`[LONG] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 2) Prompt – summarize-all stílusban
    const prompt = `Írj részletes elemzést (3–6 bekezdés), plágiummentesen, kizárólag magyar nyelven:
${contentText}
`.trim();

    // 3) AI hívás (limit: 2048 token)
    let detailed = await callOllama(prompt, 2048);

    // 4) Validálás + újrapróbálás
    if (!isValidDetailed(detailed)) {
      console.warn(`[LONG] ⚠️ Első elemzés érvénytelen, újrapróbálás...`);
      detailed = await callOllama(prompt, 2048);
    }

    // 5) Ha még mindig rossz → fallback
    if (!isValidDetailed(detailed)) {
      detailed = `
A cikk tartalma rövid vagy hiányos, ezért az elemzés csak alapvető megállapításokat tartalmaz.
A szöveg fő témája: ${shortSummary}.
További részletek a cikkben nem szerepelnek, ezért az elemzés korlátozott.
      `.trim();
    }

    // 6) Mentés a summaries táblába
    await conn.execute(
      `
      INSERT INTO summaries (article_id, detailed_content)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE detailed_content = VALUES(detailed_content), created_at = NOW()
      `,
      [articleId, detailed]
    );

    return { ok: true, detailed };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { summarizeLong };
