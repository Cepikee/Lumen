const mysql = require("mysql2/promise");

// --- AI hívás ---
async function callOllama(prompt, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: true }),
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
function isValidSummary(text) {
  if (!text) return false;
  const t = text.trim();

  // Ne legyen túl rövid
  if (t.length < 40) return false;

  // Ne legyen prompt visszaírás
  if (t.toLowerCase().includes("összefoglal") ||
      t.toLowerCase().includes("foglaljad") ||
      t.toLowerCase().includes("sajnálom")) {
    return false;
  }

  // Ne legyen HTML
  if (t.startsWith("<") && t.endsWith(">")) return false;

  return true;
}

async function summarizeShort(articleId) {
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
      console.error(`[SHORT] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 2) Prompt – summarize-all stílusban
    const prompt = `Foglaljad össze a következő szöveget röviden, maximum 5 mondatban magyarul.
Csak az összefoglalót írd ki, bevezető mondat nélkül.
Ne írj olyat, hogy "Itt a lényeg", "Íme az összefoglaló", "Röviden", vagy bármilyen bevezetőt.
Csak magyarul válaszolj:

${contentText}`.trim();


    // 3) AI hívás
    let summary = await callOllama(prompt);

    // 4) Validálás + újrapróbálás

    if (!isValidSummary(summary)) { 
      console.warn(`[SHORT] ⚠️ Érvénytelen összefoglaló — AI válasz:`); 
      console.warn(summary); 
      console.warn(`[SHORT] Újrapróbálás...`); summary = await callOllama(prompt); }

    if (!isValidSummary(summary)) {
      console.error(`[SHORT] ❌ AI nem adott érvényes összefoglalót! articleId=${articleId}`);
      return { ok: false, error: "Érvénytelen összefoglaló" };
    }

    // 5) Mentés a summaries táblába
    await conn.execute(
      `
      INSERT INTO summaries (article_id, content)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE content = VALUES(content), created_at = NOW()
      `,
      [articleId, summary]
    );

    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { summarizeShort };
