// clickbaitOpenAI.js — OpenAI alapú clickbait detektor
require("dotenv").config({ path: "/var/www/utom/.env" });
const mysql = require("mysql2/promise");
const { callOpenAI } = require("./aiClient");

// --- Segédfüggvény: számot parsol ---
function toScore(raw) {
  const n = parseInt(String(raw).trim(), 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// --- Prompt generálása ---
function buildClickbaitPrompt(title, content) {
 return `
CÍM:
${title}

CIKK SZÖVEGE:
${content}

FELADAT:
Állapítsd meg, hogy a cikk mennyire clickbait. A clickbait azt jelenti, hogy a cím vagy a tartalom félrevezető, túlzó, manipuláló vagy bulváros.

Kiemelten vizsgáld az alábbiakat:

1) A cím és a szöveg ugyanarról az eseményről szól-e.
2) A cikkben szereplő esemény aktuális-e.
3) Ha a cím mást sugall, mint amit a cikk valójában tartalmaz → ez clickbait.
4) Csak akkor adj magas pontszámot, ha valódi bulvár, túlzás vagy félrevezetés történik.

Adj három 0–100 közötti pontszámot **ÉS SEMMI MÁST**:

TITLE: <szám>
CONTENT: <szám>
CONSISTENCY: <szám>

NE írj magyarázatot, indoklást, elemzést, kommentárt vagy szöveges értékelést.
Csak a három számot add vissza pontosan ebben a formátumban.
`.trim();

}

// --- Fő függvény: clickbait feldolgozás ---
async function processClickbaitOpenAI(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    console.log(`\x1b[34m[CLICKBAIT-OAI] ▶️ Indul: articleId=${articleId}\x1b[0m`);

    // 0) Ha már van clickbait eredmény, ne futtasd újra
    const [existing] = await conn.execute(
      "SELECT final_clickbait FROM summaries WHERE article_id = ?",
      [articleId]
    );

    if (existing.length && existing[0].final_clickbait !== null) {
      console.log(`[CLICKBAIT-OAI] ⏭ Már van clickbait eredmény, kihagyva.`);
      return { ok: true, skipped: true };
    }

    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT title, content_text FROM articles WHERE id = ?",
      [articleId]
    );

    if (!rows || rows.length === 0) {
      console.error(`[CLICKBAIT-OAI] ❌ Nincs ilyen articleId: ${articleId}`);
      return { ok: false, error: "Nincs ilyen cikk" };
    }

    let { title, content_text } = rows[0];

    // Ha túl rövid → fallback a címre
    if (!content_text || content_text.trim().length < 50) {
      console.warn(`[CLICKBAIT-OAI] ⚠️ Rövid content_text, fallback a címre.`);
      content_text = title;
    }

    // 2) Prompt
    const prompt = buildClickbaitPrompt(title, content_text.slice(0, 3000));

    // 3) OpenAI hívás
    const raw = await callOpenAI(prompt, 200);
    console.log("[CLICKBAIT-OAI] Nyers válasz:", raw);

    // 4) Parsolás
    const lines = raw.split("\n").map(l => l.trim());

    let titleScore = 0;
    let contentScore = 0;
    let consistencyScore = 0;

    for (const line of lines) {
      if (line.toUpperCase().startsWith("TITLE:")) {
        titleScore = toScore(line.split(":")[1]);
      }
      if (line.toUpperCase().startsWith("CONTENT:")) {
        contentScore = toScore(line.split(":")[1]);
      }
      if (line.toUpperCase().startsWith("CONSISTENCY:")) {
        consistencyScore = toScore(line.split(":")[1]);
      }
    }

    const finalScore = Math.round(
      (titleScore + contentScore + consistencyScore) / 3
    );

    // 5) Mentés summaries táblába
    await conn.execute(
      `
      UPDATE summaries
      SET 
        title_clickbait = ?,
        content_clickbait = ?,
        consistency_clickbait = ?,
        final_clickbait = ?,
        created_at = NOW()
      WHERE article_id = ?
      `,
      [titleScore, contentScore, consistencyScore, finalScore, articleId]
    );

    console.log(
      `\x1b[32m[CLICKBAIT-OAI] ✔️ Mentve: title=${titleScore}, content=${contentScore}, consistency=${consistencyScore}, final=${finalScore}\x1b[0m`
    );

    return {
      ok: true,
      title: titleScore,
      content: contentScore,
      consistency: consistencyScore,
      final: finalScore,
    };
  } catch (err) {
    console.error("[CLICKBAIT-OAI] ❌ Hiba:", err);
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    await conn.end();
  }
}

module.exports = { processClickbaitOpenAI };
