// summarizeLong.js — stabil, optimalizált, helyes prompt struktúrával
const mysql = require("mysql2/promise");

// --- Validáció ---
function isValidDetailed(text) {
  if (!text) return false;
  const t = text.trim();

  if (t.length < 150) return false;

  if (
    t.toLowerCase().includes("írj részletes") ||
    t.toLowerCase().includes("elemzést") ||
    t.toLowerCase().includes("sajnálom")
  ) {
    return false;
  }

  if (t.startsWith("<") && t.endsWith(">")) return false;

  return true;
}

// --- Tisztító függvény ---
function cleanDetailedSummary(text, shortSummary) {
  if (!text) return "";

  let cleaned = text;

  // 1) Rövid összefoglaló eltávolítása
  if (shortSummary) {
    const escaped = shortSummary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const shortRegex = new RegExp(escaped, "gi");
    cleaned = cleaned.replace(shortRegex, "");
  }

  // 2) AI címkék eltávolítása
  cleaned = cleaned
    .replace(/^\s*(Elemzés|Összegzés|Háttér|Következtetés)\s*[:：-]\s*/gim, "")
    .replace(/^\s*[-–]\s*/gim, "");

  // 3) Markdown csillagok eltávolítása
  cleaned = cleaned.replace(/\*\*/g, "");

  // 4) Duplikált mondatok kiszedése
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const unique = [...new Set(sentences)];
  cleaned = unique.join(" ");

  // 5) Extra whitespace takarítás
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

// --- Hosszú elemzés ---
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

    let contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 50) {
      console.error(`[LONG] ❌ Üres vagy túl rövid content_text! articleId=${articleId}`);
      return { ok: false, error: "Üres content_text" };
    }

    // 2) Rövidítés — max 2000 karakter
    contentText = contentText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    // 3) Tökéletes prompt
    const prompt = `
Rövid összefoglaló:
${shortSummary}

Cikk szövege:
${contentText}

Feladat:
Készíts részletes, 3–5 bekezdéses elemzést magyar nyelven, a fenti tartalom alapján.

Fontos szabályok:
- Ne ismételd meg szó szerint a rövid összefoglalót.
- Ne írj új információt, csak azt használd, ami a cikkben szerepel.
- Ne írj újságcikket, csak elemző összefoglalót.
- Ne ismételd önmagad.
- Ne sorold fel többször ugyanazt.
- Ne írj listát, csak folyamatos szöveget.
- Ne írj bevezetőt vagy lezárást.
    `.trim();

    // 4) AI hívás
    let detailed = await global.callOllama(prompt, 300);

    // 5) Validáció — 1 újrapróbálás
    if (!isValidDetailed(detailed)) {
      console.warn(`[LONG] ⚠️ Első elemzés érvénytelen, újrapróbálás...`);
      detailed = await global.callOllama(prompt, 300);
    }

    // 6) Fallback
    if (!isValidDetailed(detailed)) {
      detailed = `
A cikk rövid összefoglalója alapján az alábbi elemzés készíthető:

${shortSummary}

A részletes tartalom hiánya miatt az elemzés korlátozott.
      `.trim();
    }

    // 🔥 7) Tisztítás
    detailed = cleanDetailedSummary(detailed, shortSummary);

    // 🔥 8) Mentés
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
