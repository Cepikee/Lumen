// pipeline/extractKeywords.js
const mysql = require("mysql2/promise");

async function callOllama(prompt) {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "phi3:mini", prompt, stream: false }),
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw);
    return (data.response ?? "").trim();
  } catch {
    return raw.trim();
  }
}

async function extractKeywords(articleId) {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const text = rows?.[0]?.content_text ?? "";

    const prompt = `
A következő szövegből adj vissza legalább 7 kulcsszót.
Csak a kulcsszavakat add vissza, vesszővel elválasztva.
Semmi mást ne írj.

Szöveg:
${text}
    `.trim();

    const raw = await callOllama(prompt);

    // Kulcsszavak kinyerése JSON nélkül
    const keywords = raw
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    await conn.end();

    return { ok: true, keywords };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

module.exports = { extractKeywords };
