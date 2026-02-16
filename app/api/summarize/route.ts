import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function POST(req: Request) {
  const { articleId } = await req.json();

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025"
  });

  // Lekérjük a cikket
  const [rows] = await connection.execute(
    "SELECT id, title, content_text FROM articles WHERE id = ?",
    [articleId]
  );
  const article = (rows as any[])[0];

  if (!article) {
    await connection.end();
    return NextResponse.json({ error: "Nincs ilyen cikk" }, { status: 404 });
  }

  // --- OPENAI SUMMARIZER ---
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Foglalj össze magyarul tényszerűen, 5-8 mondatban.
Adj vissza egy JSON-t a következő formában:

{
  "category": "…",
  "short_summary": "…"
}

Semmi mást ne írj, csak érvényes JSON-t.
`
        },
        {
          role: "user",
          content: `Cikk címe: ${article.title}\n\nCikk tartalma:\n${article.content_text}`
        }
      ]
    })
  });

  const json = await openaiRes.json();

  // A modell KIZÁRÓLAG JSON-t adhat vissza
  const parsed = JSON.parse(json.choices[0].message.content);

  const category = parsed.category;
  const short_summary = parsed.short_summary;

  // --- VISSZAÍRÁS AZ ARTICLES TÁBLÁBA ---
  await connection.execute(
    "UPDATE articles SET category = ?, short_summary = ? WHERE id = ?",
    [category, short_summary, article.id]
  );

  // --- Mentés a summaries táblába (opcionális) ---
  await connection.execute(
    "INSERT INTO summaries (article_id, summary_text, model_name) VALUES (?, ?, ?)",
    [article.id, short_summary, "gpt-4o-mini"]
  );

  await connection.end();

  return NextResponse.json({
    status: "ok",
    category,
    short_summary
  });
}
