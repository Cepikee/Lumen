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
"{title}"

CIKK SZÖVEGE:
{content}

FELADAT:
Állapítsd meg, hogy a cikk mennyire clickbait. A clickbait azt jelenti, hogy a cím vagy a tartalom félrevezető, túlzó, manipuláló vagy bulváros.

Kiemelten vizsgáld az alábbiakat:

1) A cím és a szöveg ugyanarról az eseményről szól-e.
2) A cikkben szereplő esemény aktuális-e. 
   - Ha a cikk régi eseményt ír le (pl. évekkel vagy évtizedekkel ezelőtti történés), de a cím úgy hangzik, mintha most történne → ez clickbait.
3) Ha a cím mást sugall, mint amit a cikk valójában tartalmaz → ez clickbait.
4) Csak akkor adj magas pontszámot, ha valódi bulvár, túlzás vagy félrevezetés történik. 
   - A pusztán drámai vagy konfliktusos téma NEM clickbait önmagában.

Adj három 0–100 közötti pontszámot:

TITLE_CLICKBAIT:
A cím mennyire túlzó, félrevezető vagy bulváros?

CONTENT_CLICKBAIT:
A cikk szövege mennyire bulváros vagy szenzációhajhász?

CONSISTENCY_CLICKBAIT:
A cím mennyire tér el a tartalomtól? 
0 = teljesen korrekt, 
100 = nagyon félrevezető (pl. régi eseményt frissnek állít be, vagy mást sugall, mint a tartalom).

VÁLASZ FORMÁTUMA:
TITLE: <szám>
CONTENT: <szám>
CONSISTENCY: <szám>

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

    // 1) Cikk lekérése
    const [rows] = await conn.execute(
      "SELECT title, content_text FROM articles WHERE id = ?",
      [articleId]
    );

    if (!rows || rows.length === 0) {
      console.error(`[CLICKBAIT-OAI] ❌ Nincs ilyen articleId: ${articleId}`);
      return { ok: false, error: "Nincs ilyen cikk" };
    }

    const { title, content_text } = rows[0];

    if (!content_text || content_text.trim().length < 50) {
      console.error(`[CLICKBAIT-OAI] ❌ Üres vagy túl rövid content_text!`);
      return { ok: false, error: "Üres content_text" };
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

    // 5) Final score (átlag)
    const finalScore = Math.round(
      (titleScore + contentScore + consistencyScore) / 3
    );

    // 6) Mentés summaries táblába
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
