import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { checkPlagiarism } from "../../../lib/checkPlagiarism.js";

// ---- Helpers ----
function unwrapValue(v: any) {
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

// ---- Ollama hívás timeouttal ----
async function callOllama(prompt: string, timeoutMs = 180000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false }),
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

// ---- AI segédfüggvények ----
async function runOllamaShortSummary(text: string) {
  return await callOllama(`Foglaljad össze röviden (max 5 mondatban), plágiummentesen:\n\n${text}`);
}
async function runOllamaLongAnalysis(text: string) {
  return await callOllama(`Írj részletes elemzést (3–6 bekezdés), plágiummentesen:\n\n${text}`);
}
async function runOllamaKeywords(text: string) {
  const raw = await callOllama(`Adj vissza 6–10 kulcsszót magyarul, vesszővel elválasztva:\n\n${text}`);
  return raw.split(/[,\n]/).map(k => k.trim()).filter(k => k.length >= 2).slice(0, 10);
}
const VALID_CATEGORIES = ["Politika", "Sport", "Gazdaság", "Tech"];
async function runOllamaCategory(text: string) {
  const raw = await callOllama(`Adj meg egyetlen kategóriát az alábbi listából: ${VALID_CATEGORIES.join(", ")}.\n\n${text}`);
  const candidate = (raw || "").charAt(0).toUpperCase() + (raw || "").slice(1).toLowerCase();
  return VALID_CATEGORIES.includes(candidate) ? candidate : "Politika";
}
function getSourceFromUrl(url: string) {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const overrides: Record<string, string> = {
      "telex.hu": "telex", "index.hu": "index", "444.hu": "444",
      "24.hu": "24", "hvg.hu": "hvg", "portfolio.hu": "portfolio"
    };
    if (overrides[host]) return overrides[host];
    const parts = host.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : host;
  } catch { return "ismeretlen"; }
}
function hasContent(s: string | null | undefined, minLen = 50) {
  return !!s && s.trim().length >= minLen;
}

// ---- Konfiguráció ----
const BATCH_SIZE = 1;
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
      WHERE (s.id IS NULL OR s.detailed_content IS NULL OR s.detailed_content = '')
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
          const rawSummary = await runOllamaLongAnalysis(contentText);
          let summary = await runOllamaShortSummary(contentText);

          if (!hasContent(summary) || !hasContent(rawSummary)) {
            console.warn(">>> Összefoglaló túl rövid/üres, kihagyva:", articleId);
            errors.push({ id: articleId, error: "Summary too short or empty" });
            return;
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
            console.warn(">>> Full insert failed for", articleId, "trying minimal insert. Error:", (fullErr as any)?.message ?? fullErr);
            try {
              await safeExecute(connection,
                `INSERT INTO summaries (article_id, url, language, content)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE content = VALUES(content)`,
                [articleId, article.url_canonical ?? "", "hu", summary ?? ""],
                `minimal-insert-${articleId}`
              );
            } catch (miniErr) {
              console.error(">>> Minimal insert also failed for articleId:", articleId, "err:", miniErr);
              errors.push({ id: articleId, error: String((miniErr as any)?.message ?? miniErr) });
              return;
            }
          }

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

    return NextResponse.json({
      status: "ok",
      message: "Összefoglalások + kulcsszavak + trendek frissítve",
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
