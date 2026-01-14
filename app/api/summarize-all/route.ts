import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { checkPlagiarism } from "../../../lib/checkPlagiarism.js";

// ---- Helpers ----
function unwrapValue(v: unknown) {
  if (v && typeof v === "object" && typeof v.valueOf === "function") {
    try {
      const un = v.valueOf();
      if (un !== v) return unwrapValue(un);
    } catch {}
  }
  return v;
}
function normalizeParam(p: any) {
  const v = unwrapValue(p);
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(v)) return v.toString("hex");
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return v;
}
function normalizeParams(arr: any[]) {
  return arr.map(normalizeParam);
}
function countPlaceholders(sql: string) {
  let count = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "?" && !inSingle && !inDouble) count++;
  }
  return count;
}
async function safeExecute(conn: mysql.Connection, sql: string, params: any[], context = "") {
  const unwrapped = params.map(p => unwrapValue(p));
  const normalized = normalizeParams(unwrapped);

  const placeholders = countPlaceholders(sql);

  console.log(`>>> [SQL EXECUTE] ${context} placeholders=${placeholders} params.length=${normalized.length}`);
  normalized.forEach((p, i) => {
    console.log(`    param[${i}] type=${Object.prototype.toString.call(p)} value=${JSON.stringify(p)}`);
  });

  if (placeholders !== normalized.length) {
    const err = new Error(`Placeholder count (${placeholders}) !== params.length (${normalized.length})`);
    console.error(">>> Placeholder mismatch:", err.message);
    throw err;
  }

  try {
    return await conn.execute(sql, normalized);
  } catch (e: any) {
    console.error(">>> SQL ERROR in", context);
    console.error("    message:", e?.message);
    console.error("    code:", e?.code);
    console.error("    errno:", e?.errno);
    console.error("    sqlState:", e?.sqlState);
    console.error("    sqlMessage:", e?.sqlMessage);
    console.error("    sql:", e?.sql || sql);
    throw e;
  }
}

// ---- Ollama hívás timeouttal a fő dolgokhoz ----
async function callOllama(prompt: string, timeoutMs = 180000): Promise<string> {
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
// ---- OLLAMA HíVÁS CSAK A KATEGÓRIZÁLÁSRA ----
async function callOllamaCategory(prompt: string): Promise<string> {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama3.1:8b-instruct-q4_K_M", prompt, stream: true }),
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw);
    return (data.response ?? "").trim();
  } catch {
    return raw.trim();
  }
}





// ---- AI segédfüggvények ----
async function runOllamaShortSummary(text: string) {
  return await callOllama(`Foglaljad össze röviden (max 5 mondatban), plágiummentesen, kizárólag magyar nyelven:\n\n${text}`);
}

async function runOllamaLongAnalysis(text: string) {
  return await callOllama(`Írj részletes elemzést (3–6 bekezdés), plágiummentesen, kizárólag magyar nyelven:\n\n${text}`);
}

// Kulcsszavak
async function runOllamaKeywords(text: string) {
  const raw = await callOllama(
    `Adj vissza pontosan 6–10 kulcsszót magyarul, vesszővel elválasztva.
Semmi mást ne írj, ne magyarázz, ne vezess be.
Szöveg: ${text}`
  );

  return raw
    .split(/[,\n]/)
    .map(k => k.trim())
    .filter(k => k.length >= 2)
    .slice(0, 10);
}


// Kategória
export async function runOllamaCategory(text: string) {
  if (!text || text.trim().length < 5) {
    throw new Error("Nincs szöveg a kategorizáláshoz, újrafuttatás szükséges.");
  }

  const valid = [
    "politika",
    "sport",
    "gazdaság",
    "tech",
    "kultúra",
    "egészségügy",
    "oktatás",
    "közélet"
  ];

  const blocks = text
    .split(/\n{2,}|<h1>|<h2>|<h3>|<\/p>|<li>|•|\*/gi)
    .map(b => b.trim())
    .filter(b => b.length > 30);

  const votes: string[] = [];

  for (const block of blocks) {
    const prompt = `Válassz egy kategóriát az alábbi listából a tartalom alapján. 
Csak a kategória nevét írd vissza.

politika
sport
gazdaság
tech
kultúra
egészségügy
oktatás
közélet

Tartalom:
${block}
`;

    const raw = await callOllamaCategory(prompt);

    const cleaned = (raw ?? "")
      .trim()
      .replace(/^["“”'`]+|["“”'`]+$/g, "")
      .replace(/[<>]/g, "")
      .replace(/\.+$/g, "")
      .toLowerCase();

    if (valid.includes(cleaned)) {
      votes.push(cleaned);
    } else {
      console.warn(">>> Érvénytelen kategória válasz:", cleaned, "RAW:", raw);
    }
  }

  if (votes.length === 0) {
    throw new Error("Nem sikerült kategóriát meghatározni, újrafuttatás szükséges.");
  }

  const freq: Record<string, number> = {};
  for (const v of votes) {
    freq[v] = (freq[v] || 0) + 1;
  }

  const dominant = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])[0][0];

  const finalCategory = {
    politika: "Politika",
    sport: "Sport",
    gazdaság: "Gazdaság",
    tech: "Tech",
    kultúra: "Kultúra",
    egészségügy: "Egészségügy",
    oktatás: "Oktatás",
    közélet: "Közélet"
  }[dominant];

  console.log(">>> Végső kategória:", finalCategory);

  return finalCategory;
}





function getSourceFromUrl(url: string) { 
  try { 
    const u = new URL(url); 
    let host = u.hostname.toLowerCase(); 
    if (host.startsWith("www.")) host = host.slice(4); 
    const overrides: Record<string, string> = 
  { "telex.hu": "telex", "index.hu": "index", "444.hu": "444", "24.hu": "24", "hvg.hu": "hvg", "portfolio.hu": "portfolio" }; 
  // Pontos egyezés 
  if (overrides[host]) return overrides[host]; 
  // // Ha nem ismert domain → "ismeretlen"
   return "ismeretlen"; 
  } catch { return "ismeretlen"; } }
function hasContent(s: string | null | undefined, minLen = 50) {
  return !!s && s.trim().length >= minLen;
}

// ---- Konfiguráció ----
const BATCH_SIZE = 10;
const CONCURRENCY = 1;

export async function GET() {
  console.log(">>> summarize-all route elindult!");
  const processed: number[] = [];
  const errors: { id: number | null; error: string }[] = [];

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });

  try {
    // --- IMPORTANT: inline LIMIT to avoid prepared-statement edge cases with LIMIT ?
    const selectSql = `
      SELECT a.id, a.url_canonical, a.content_text, s.id AS summary_id
      FROM articles a
      LEFT JOIN summaries s ON s.article_id = a.id
      WHERE (s.id IS NULL OR s.detailed_content IS NULL OR TRIM(s.detailed_content) = '')
        AND a.content_text IS NOT NULL AND a.content_text <> ''
      ORDER BY a.published_at DESC
      LIMIT ${Number(BATCH_SIZE)}
    `;

    // Use safeExecute with empty params for the inlined query
    const [articlesResult] = await safeExecute(connection, selectSql, [], "select-articles") as any;
    const articles = Array.isArray(articlesResult) ? articlesResult : [];

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({
        status: "ok",
        message: "Nincs feldolgozatlan cikk a summaries számára",
        processedCount: 0,
        processed,
        errors,
      });
    }

    for (let i = 0; i < articles.length; i += CONCURRENCY) {
      const chunk = articles.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (article) => {
        const articleId = article?.id;
        try {
          if (articleId === undefined || articleId === null || typeof articleId !== "number") {
            console.warn(">>> Hibás article.id, kihagyva:", articleId);
            errors.push({ id: articleId ?? null, error: "Invalid article.id (not a number)" });
            return;
          }

          const [checkRows] = await safeExecute(connection, "SELECT id FROM articles WHERE id = ?", [articleId], `check-article-${articleId}`) as any;
          if (!Array.isArray(checkRows) || checkRows.length === 0) {
            console.warn(">>> Nincs ilyen article.id az articles táblában, kihagyva:", articleId);
            errors.push({ id: articleId, error: "Article id not found in articles table" });
            return;
          }

          const contentText = article.content_text ?? "";
const source = getSourceFromUrl(article.url_canonical ?? "");

// --- Rövid összefoglaló (kötelező) ---
let summary = await runOllamaShortSummary(contentText);

// Ha túl rövid, újrapróbálkozás
if (!hasContent(summary)) {
  console.warn(">>> Rövid összefoglaló túl rövid, újrapróbálkozás:", articleId);
  summary = await runOllamaShortSummary(contentText);
}

// Ha még mindig rövid, akkor is megtartjuk – a cikket nem dobjuk el
if (!hasContent(summary)) {
  console.warn(">>> Rövid összefoglaló továbbra is rövid, de a cikket NEM dobjuk el:", articleId);
}


// --- Hosszú elemzés (KÖTELEZŐ) ---
let rawSummary = await runOllamaLongAnalysis(contentText);

// Ha túl rövid, újrapróbálkozás
if (!hasContent(rawSummary)) {
  console.warn(">>> Hosszú elemzés túl rövid, újrapróbálkozás:", articleId);
  rawSummary = await runOllamaLongAnalysis(contentText);
}

// Ha még mindig rövid, generálunk egy minimális fallback-et
if (!hasContent(rawSummary)) {
  console.warn(">>> Hosszú elemzés továbbra is rövid, fallback generálása:", articleId);

  rawSummary = `
A cikk tartalma rövid, ezért az elemzés csak alapvető megállapításokat tartalmaz.
A szöveg fő témája: ${summary}.
További részletek a cikkben nem szerepelnek, ezért az elemzés korlátozott.
  `.trim();
}


          let plagiarismScore = 0;
          try {
            const similarityScore = checkPlagiarism(contentText, summary);
            if (typeof similarityScore === "number" && similarityScore > 0.8) {
              plagiarismScore = 1;
              summary = await runOllamaShortSummary(contentText);
            }
          } catch (e) {
            console.error(">>> Plágium ellenőrzés hiba:", e);
          }

          const category = await runOllamaCategory(contentText);
          const keywords = await runOllamaKeywords(contentText);
          const trendKeywords = Array.isArray(keywords) ? keywords.join(",") : "";

          const insertSql = `
            INSERT INTO summaries (
              article_id, url, language, content, detailed_content,
              category, plagiarism_score, ai_clean, source,
              trend_keywords, sentiment, model_version
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              url = VALUES(url),
              language = VALUES(language),
              content = VALUES(content),
              detailed_content = VALUES(detailed_content),
              category = VALUES(category),
              plagiarism_score = VALUES(plagiarism_score),
              ai_clean = VALUES(ai_clean),
              source = VALUES(source),
              trend_keywords = VALUES(trend_keywords),
              sentiment = VALUES(sentiment),
              model_version = VALUES(model_version)
          `;

          const params = [
            articleId,
            article.url_canonical ?? "",
            "hu",
            summary ?? "",
            rawSummary ?? "",
            category ?? "",
            typeof plagiarismScore === "number" ? plagiarismScore : 0,
            1,
            source ?? "",
            trendKeywords,
            "neutral",
            "llama3-local-v1",
          ];

          try {
  await safeExecute(connection, insertSql, params, `insert-summary-${articleId}`);
} catch (fullErr) {
  console.error(">>> Full insert failed for", articleId, (fullErr as any)?.message ?? fullErr);

  try {
    await safeExecute(connection,
      `INSERT INTO summaries (article_id, content, detailed_content)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         content = VALUES(content),
         detailed_content = VALUES(detailed_content)`,
      [articleId, summary ?? "", rawSummary ?? ""],
      `fallback-insert-${articleId}`
    );
  } catch (miniErr) {
    console.error(">>> Fallback insert also failed for articleId:", articleId, (miniErr as any)?.message ?? miniErr);
    errors.push({ id: articleId, error: String((miniErr as any)?.message ?? miniErr) });
    return;
  }
} // <-- ez a külső catch lezárása


          if (Array.isArray(keywords) && keywords.length > 0) {
            for (const kw of keywords) {
              const kwCategory = await runOllamaCategory(kw);
              try {
                await safeExecute(connection,
                  "INSERT INTO keywords (article_id, keyword, category, created_at) VALUES (?, ?, ?, NOW())",
                  [articleId, kw ?? "", kwCategory ?? ""],
                  `insert-keyword-${articleId}`
                );
              } catch (kwErr) {
                console.error(">>> Hiba keywords beszúrásnál:", kwErr);
              }
              try {
                await safeExecute(connection,
                  "INSERT INTO trends (keyword, created_at, category, source) VALUES (?, NOW(), ?, ?)",
                  [kw ?? "", kwCategory ?? "", source ?? ""],
                  `insert-trend-${articleId}`
                );
              } catch (trendErr) {
                console.error(">>> Hiba trends beszúrásnál:", trendErr);
              }
            }
          }

          processed.push(articleId);
          console.log(">>> Feldolgozva:", articleId);
        } catch (err: any) {
          console.error(">>> Unexpected processing error for articleId:", articleId, err);
          errors.push({ id: articleId ?? null, error: String(err?.message ?? err) });
        }
      }));
    }
    // --- summarize-all feldolgozás logikája ---
    // ... itt futnak a cikkek feldolgozásai, inserts, trendek stb. ...

    // A végén jelöljük meg minden summary rekordot AI-clean státusszal
    await connection.execute(
      "UPDATE summaries SET ai_clean = 1 WHERE ai_clean IS NULL OR ai_clean = 0"
    );

    // Kapcsolat lezárása
    await connection.end();

    // Egyetlen return, minden infóval
    return NextResponse.json({
      status: "ok",
      message: "Összefoglalások + kulcsszavak + trendek frissítve, minden cikk AI–fogalmazásként megjelölve",
      processedCount: processed.length,
      processed,
      errors,
    });
  } catch (err: any) {
    console.error("API /summarize-all hiba:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  } finally {
    try { await connection.end(); } catch (e) { console.error("DB kapcsolat lezárási hiba:", e); }
  }
}
