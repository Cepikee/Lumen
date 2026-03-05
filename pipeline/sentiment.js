// sentiment.js — OpenAI alapú hangulatelemzés
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { callOpenAI } = require("./aiClient");

// --- Segédfüggvény: sentiment érték konvertálása ---
function toSentiment(raw) {
  if (!raw) return 0;
  const t = raw.toLowerCase().trim();

  if (t.includes("pozitív")) return 1;
  if (t.includes("negatív")) return -1;
  return 0; // semleges fallback
}

// --- Prompt generálása ---
function buildSentimentPrompt(title, content) {
  return `
Osztályozd a hír hangulatát a következő kategóriák egyikébe:
- pozitív
- semleges
- negatív

Csak EGY szót adj vissza.

CÍM:
${title}

TARTALOM:
${content}

NE írj magyarázatot, indoklást vagy kommentárt.
`.trim();
}

// --- Fő függvény: sentiment feldolgozás ---
async function processSentiment(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    console.log(`\x1b[35m[SENTIMENT] ▶️ Indul: articleId=${articleId}\x1b[0m`);

    // 0) Ha már van sentiment, ne futtasd újra
    const [existing] = await conn.execute(
      "SELECT sentiment FROM articles WHERE id = ?",
      [articleId]
    );

    if (existing.length && existing[0].sentiment !== null) {
      console.log(`[SENTIMENT] ⏭ Már van sentiment, kihagyva.`);
      return { ok: true, skipped: true };
    }

    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT title, content_text FROM articles WHERE id = ?",
      [articleId]
    );

    if (!rows || rows.length === 0) {
      console.error(`[SENTIMENT] ❌ Nincs ilyen articleId: ${articleId}`);
      return { ok: false, error: "Nincs ilyen cikk" };
    }

    let { title, content_text } = rows[0];

    // Ha túl rövid → fallback a címre
    if (!content_text || content_text.trim().length < 50) {
      console.warn(`[SENTIMENT] ⚠️ Rövid content_text, fallback a címre.`);
      content_text = title;
    }

    // 2) Prompt
    const prompt = buildSentimentPrompt(title, content_text.slice(0, 2000));

    // 3) OpenAI hívás
    const raw = await callOpenAI(prompt, 50);
    console.log("[SENTIMENT] Nyers válasz:", raw);

    // 4) Parsolás
    const sentimentValue = toSentiment(raw);

    // 5) Mentés articles táblába
    await conn.execute(
      `
      UPDATE articles
      SET 
        sentiment = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [sentimentValue, articleId]
    );

    console.log(
      `\x1b[32m[SENTIMENT] ✔️ Mentve: sentiment=${sentimentValue}\x1b[0m`
    );

    return {
      ok: true,
      sentiment: sentimentValue,
    };
  } catch (err) {
    console.error("[SENTIMENT] ❌ Hiba:", err);
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { processSentiment };
