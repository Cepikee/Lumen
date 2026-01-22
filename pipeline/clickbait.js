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
Csak egyetlen számot írj 0 és 100 között. Semmi mást.
`.trim();
}

// 2) Egyetlen clickbait értékelés
async function evaluateClickbait(cim, cikkSzoveg, callOllama) {
  const prompt = buildClickbaitPrompt(cim, cikkSzoveg);

  let raw = await callOllama(prompt, 20); // nagyon kevés token elég
  raw = raw.trim();

  // csak számot várunk → parseInt mindent megold
  const num = parseInt(raw, 10);

  if (isNaN(num)) {
    console.warn("[CLICKBAIT] ⚠️ Nem szám jött vissza:", raw);
    return 0;
  }

  // 0–100 közé szorítjuk
  return Math.max(0, Math.min(100, num));
}


// 3) Teljes clickbait folyamat egy cikkre
async function processClickbaitForArticle(articleId, conn, callOllama, utomTitle) {
  console.log(`\x1b[34m[CLICKBAIT] ▶️ Feldolgozás indul: articleId=${articleId}\x1b[0m`);


  // Cikk lekérése
  const [rows] = await conn.execute(
    "SELECT title, content_text FROM articles WHERE id = ?",
    [articleId]
  );

  if (!rows || rows.length === 0) {
    console.error(`[CLICKBAIT] ❌ Nincs ilyen articleId: ${articleId}`);
    return { ok: false, error: "Nincs ilyen cikk" };
  }

  const { title, content_text } = rows[0];

  if (!content_text || content_text.trim().length < 50) {
    console.error(`[CLICKBAIT] ❌ Üres vagy túl rövid content_text!`);
    return { ok: false, error: "Üres content_text" };
  }

  // Forrás cím clickbait értékelése
  const sourceScore = await evaluateClickbait(title, content_text, callOllama);

  // Utom cím clickbait értékelése (EZT a cron.js adja át!)
  const utomScore = await evaluateClickbait(utomTitle, content_text, callOllama);

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
    console.log(`\x1b[32m[CLICKBAIT] ✔️ Mentve: forrás=${sourceScore}, utom=${utomScore}, articleId=${articleId}\x1b[0m`)
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
