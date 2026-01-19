const mysql = require("mysql2/promise");
module.exports = async function categorizeArticle() {
  return { ok: false };
};

// --- AI hívás ---
async function callOllama(prompt, timeoutMs = 120000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false
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

// --- Valid kategóriák ---
const VALID_CATEGORIES = [
  "Politika",
  "Gazdaság",
  "Közélet",
  "Kultúra",
  "Sport",
  "Tech",
  "Egészségügy",
  "Oktatás"
];

// --- Validáció ---
function isValidCategory(cat) {
  if (!cat) return false;
  const clean = cat.trim().toLowerCase();

  return VALID_CATEGORIES.some(
    (c) => c.toLowerCase() === clean
  );
}

// --- Egy cikk kategorizálása ---
async function categorizeArticle(articleId) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    const [rows] = await conn.execute(
      "SELECT content_text FROM articles WHERE id = ?",
      [articleId]
    );

    const contentText = rows?.[0]?.content_text ?? "";

    if (!contentText || contentText.trim().length < 15) {
      console.error(`[CAT] ❌ Üres vagy túl rövid content_text! id=${articleId}`);
      return { ok: false };
    }

    const prompt = `
Cikk szöveg:
${contentText}

Kategóriák:
${VALID_CATEGORIES.join(", ")}

Feladat:
Válaszd ki a cikkhez legjobban illő kategóriát a listából, és csak a kategória nevét írd ki.
`.trim();

    let category = await callOllama(prompt);

    if (!isValidCategory(category)) {
      console.warn(`[CAT] ⚠️ Érvénytelen kategória: "${category}". Újrapróbálás...`);
      category = await callOllama(prompt);
    }

    if (!isValidCategory(category)) {
      console.error(`[CAT] ❌ AI nem adott érvényes kategóriát! id=${articleId}`);
      return { ok: false };
    }

    await conn.execute(
      "UPDATE articles SET category = ? WHERE id = ?",
      [category.trim(), articleId]
    );

    console.log(`[CAT] ✔️ Mentve: ${articleId} → ${category}`);
    return { ok: true, category };

  } catch (err) {
    console.error(`[CAT] ❌ Hiba:`, err);
    return { ok: false };
  } finally {
    await conn.end();
  }
}

// --- Fő futtató ---
async function run() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  // 🔥 JAVÍTOTT LEKÉRDEZÉS — LEGFIRISSEBB CIKKEK ELŐRE
  const [rows] = await conn.execute(
    "SELECT id FROM articles WHERE category IS NULL OR category = '' ORDER BY id DESC"
  );

  await conn.end();

  console.log(`Talált cikkek kategória nélkül: ${rows.length}`);

  for (const row of rows) {
    await categorizeArticle(row.id);
  }

  console.log("Kész.");
}

run();

module.exports = { categorizeArticle };
