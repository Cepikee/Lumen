// clickbait.js
// Magyar clickbait-értékelő modul Ollama-hoz (CommonJS verzió)

// 1) Prompt generálása
function buildClickbaitPrompt(cim, cikkSzoveg) {
  return `
CÍM:
"${cim}"

CIKK SZÖVEGE:
${cikkSzoveg}

FELADAT:
A fenti cím és a cikk tartalma alapján értékeld, mennyire clickbait a cím.

Szempontok:
- mennyire ígér többet, mint amit a cikk ténylegesen tartalmaz
- van-e túlzás, ferdítés, érzelmi túlfűtés
- mennyire próbál kattintásra manipulálni
- mennyire félrevezető a cím a tartalomhoz képest

Adj egy 0–100 közötti pontszámot:
0 = egyáltalán nem clickbait
100 = extrém módon clickbait

VÁLASZ:
Csak ÉS KIZÁRÓLAG ezt a JSON-t add vissza:

{"pontszam": <szám>}
`.trim();
}

// 2) Egyetlen clickbait értékelés
async function evaluateClickbait(cim, cikkSzoveg, callOllama) {
  const prompt = buildClickbaitPrompt(cim, cikkSzoveg);

  // FONTOS: nagyon alacsony numPredict → gyors, stabil, csak számot ad
  let raw = await callOllama(prompt, 40);

  raw = raw.trim();

  try {
    const json = JSON.parse(raw);
    const pont = Number(json.pontszam ?? 0);
    if (isNaN(pont)) return 0;
    return pont;
  } catch (err) {
    console.warn("[CLICKBAIT] ⚠️ JSON parse hiba, nyers válasz:", raw);
    return 0;
  }
}

// 3) Teljes clickbait folyamat egy cikkre
async function processClickbaitForArticle(articleId, conn, callOllama) {
  console.log(`[CLICKBAIT] ▶️ Feldolgozás indul: articleId=${articleId}`);

  // Cikk lekérése
  const [rows] = await conn.execute(
    "SELECT title, content_text, utom_title FROM articles WHERE id = ?",
    [articleId]
  );

  if (!rows || rows.length === 0) {
    console.error(`[CLICKBAIT] ❌ Nincs ilyen articleId: ${articleId}`);
    return { ok: false, error: "Nincs ilyen cikk" };
  }

  const { title, content_text, utom_title } = rows[0];

  if (!content_text || content_text.trim().length < 50) {
    console.error(`[CLICKBAIT] ❌ Üres vagy túl rövid content_text!`);
    return { ok: false, error: "Üres content_text" };
  }

  // Forrás cím clickbait értékelése
  const sourceScore = await evaluateClickbait(title, content_text, callOllama);

  // Utom cím clickbait értékelése
  const utomScore = await evaluateClickbait(utom_title, content_text, callOllama);

  // Mentés summaries táblába
  await conn.execute(
    `
    UPDATE summaries
    SET 
      source_clickbait = ?,
      utom_clickbait = ?,
      created_at = NOW()
    WHERE article_id = ?
    `,
    [sourceScore, utomScore, articleId]
  );

  console.log(
    `[CLICKBAIT] ✔️ Mentve: forrás=${sourceScore}, utom=${utomScore}, articleId=${articleId}`
  );

  return {
    ok: true,
    source: sourceScore,
    utom: utomScore,
    javulas: sourceScore - utomScore,
  };
}

// CommonJS export
module.exports = {
  evaluateClickbait,
  processClickbaitForArticle
};
