import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { checkPlagiarism } from "../../../lib/checkPlagiarism.js";

// Rövid összefoglaló prompt
async function runOllamaShortSummary(originalText: string) {
  const prompt = `Olvasd el a következő cikket, és írj belőle egy rövid összefoglalót magyarul.
Fontos szabályok:
- Maximum 5 mondatban foglald össze.
- Ne vegyél át szó szerint mondatokat vagy kifejezéseket az eredetiből.
- Fogalmazd át minden gondolatot saját szavakkal.
- A szöveg legyen plágiummentes, tömör és világos.

Cikk:

${originalText}`;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false })
    });

    const text = await res.text();
    const data = JSON.parse(text);
    return (data.response ?? "").trim();
  } catch (err) {
    console.error(">>> runOllamaShortSummary hiba:", err);
    return "";
  }
}

// Hosszú elemzés prompt
async function runOllamaLongAnalysis(originalText: string) {
  const prompt = `Olvasd el a következő cikket, és írj belőle egy részletes elemzést magyarul.
Fontos szabályok:
- Írj annyit, amennyit szükségesnek érzel (3–6 bekezdés vagy több).
- Mutasd be a hátteret, a folyamatot és a következményeket.
- Adj értelmezést és összefüggéseket, hogy a szöveg többet adjon, mint egy rövid összefoglaló.
- Ne vegyél át szó szerint mondatokat vagy kifejezéseket az eredetiből.
- A szöveg legyen plágiummentes, informatív és kerek.

Cikk:

${originalText}`;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false })
    });

    const text = await res.text();
    const data = JSON.parse(text);
    return (data.response ?? "").trim();
  } catch (err) {
    console.error(">>> runOllamaLongAnalysis hiba:", err);
    return "";
  }
}

// Kulcsszó kivonás
async function runOllamaKeywords(originalText: string) {
  const prompt = `Adj vissza pontosan 6–10 kulcsszót magyarul.
Csak a kulcsszavakat írd, semmi mást.
Ne írj bevezetőt, ne írj „Kulcsszavak:” sort.
Kulcsszavakat vesszővel válaszd el.

Cikk:

${originalText}`;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false })
    });

    const text = await res.text();
    const data = JSON.parse(text);
    let raw = (data.response ?? "").trim();

    raw = raw.replace(/^(Here.*|Itt.*)/i, "");
    raw = raw.replace(/^Kulcsszavak[:\-]?\s*/i, "");

    const keywords = raw
      .split(/[,\n\-]/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    while (keywords.length < 6) {
      keywords.push("extra");
    }

    return keywords.slice(0, 10);
  } catch (err) {
    console.error(">>> runOllamaKeywords hiba:", err);
    return [];
  }
}

// Kategorizáló függvény – csak Politika, Sport, Gazdaság, Tech
function toTitleCase(str: string) {
  const s = str.trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const VALID_CATEGORIES = ["Politika", "Sport", "Gazdaság", "Tech"];

async function runOllamaCategory(text: string) {
  const prompt = `Adj meg egyetlen kategóriát az alábbi listából:
${VALID_CATEGORIES.join(", ")}.
Csak a kategória nevét írd vissza, első betű nagy, többi kicsi, semmi mást:

${text}`;

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:latest", prompt, stream: false })
    });

    const raw = await res.text();
    let candidate: string;

    try {
      const data = JSON.parse(raw);
      candidate = String(data.response ?? "").trim();
    } catch {
      candidate = raw.trim();
    }

    candidate = toTitleCase(candidate);

    if (!VALID_CATEGORIES.includes(candidate)) {
      candidate = VALID_CATEGORIES[0]; // Politika fallback
    }

    return candidate;
  } catch (err) {
    console.error(">>> runOllamaCategory hiba:", err);
    return "Politika";
  }
}

// Forrás meghatározása URL alapján
function getSourceFromUrl(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);

    const overrides: Record<string, string> = {
      "telex.hu": "telex",
      "index.hu": "index",
      "444.hu": "444",
      "24.hu": "24",
      "hvg.hu": "hvg",
      "portfolio.hu": "portfolio"
    };
    if (overrides[host]) return overrides[host];

    const parts = host.split(".");
    if (parts.length >= 2) return parts[parts.length - 2];
    return host;
  } catch {
    return "ismeretlen";
  }
}

export async function GET() {
  console.log(">>> summarize-all route elindult!");

  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025"
    });

    const [articles] = await connection.execute<any[]>(
      `SELECT a.id, a.url_canonical, a.content_text, s.id AS summary_id, s.detailed_content
       FROM articles a
       LEFT JOIN summaries s ON s.article_id = a.id
       WHERE (s.id IS NULL OR s.detailed_content IS NULL OR s.detailed_content = '')
       ORDER BY a.published_at DESC
       LIMIT 3`
    );

    console.log(">>> Talált cikkek száma:", articles.length);

    for (const article of articles) {
      console.log(">>> Összefoglalás indul:", article.url_canonical);

      const source = getSourceFromUrl(article.url_canonical);
      console.log(">>> Forrás:", source);

      const rawSummary = await runOllamaLongAnalysis(article.content_text);
      let summary = await runOllamaShortSummary(article.content_text);

      let plagiarismScore = 0;
      try {
        const similarityScore = checkPlagiarism(article.content_text, summary);
        if (similarityScore > 0.8) {
          plagiarismScore = 1;
          console.log("⚠️ Plágium gyanú rövid összefoglalónál! Újrafogalmazás indul...");
          summary = await runOllamaShortSummary(article.content_text);
        }
        console.log(`>>> Plágium ellenőrzés: score=${plagiarismScore}, similarity=${similarityScore}`);
      } catch (plErr) {
        console.error(">>> Plágium ellenőrzés hiba:", plErr);
      }

      // ✅ Cikk kategorizálása (garantált érvényes kategória)
      const category = await runOllamaCategory(article.content_text);
      console.log(">>> Cikk kategória:", category);

      // Kulcsszavak generálása
      const keywords = await runOllamaKeywords(article.content_text);
      console.log(">>> Kulcsszavak:", keywords);

      for (const kw of keywords) {
        const kwCategory = await runOllamaCategory(kw);

        try {
          await connection.execute(
            "INSERT INTO keywords (article_id, keyword, category, created_at) VALUES (?, ?, ?, NOW())",
            [article.id, kw, kwCategory]
          );
        } catch (kwErr) {
          console.error(">>> Hiba keywords beszúrásnál:", kwErr);
        }

        try {
          await connection.execute(
            "INSERT INTO trends (keyword, created_at, category, source) VALUES (?, NOW(), ?, ?)",
            [kw, kwCategory, source]
          );
        } catch (trendErr) {
          console.error(">>> Hiba trends beszúrásnál:", trendErr);
        }
      }

      // Summaries tábla frissítése vagy beszúrása
      try {
        if (article.summary_id) {
          await connection.execute(
            "UPDATE summaries SET content = ?, detailed_content = ?, category = ?, plagiarism_score = ?, ai_clean = 1, source = ? WHERE id = ?",
            [summary, rawSummary, category, plagiarismScore, source, article.summary_id]
          );
          console.log(">>> Frissítve az adatbázisban:", article.url_canonical);
        } else {
          await connection.execute(
            "INSERT INTO summaries (article_id, url, language, content, detailed_content, category, plagiarism_score, ai_clean, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [article.id, article.url_canonical, "hu", summary, rawSummary, category, plagiarismScore, 1, source]
          );
          console.log(">>> Mentve az adatbázisba:", article.url_canonical);
        }
      } catch (sumErr) {
        console.error(">>> Hiba summaries beszúrásnál/frissítésnél:", sumErr);
      }
    }

    await connection.end();
    return NextResponse.json({ status: "ok", message: "Összefoglalások + kulcsszavak + trendek frissítve" });
  } catch (err: any) {
    console.error("API /summarize-all hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
