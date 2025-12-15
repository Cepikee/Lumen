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
    "SELECT id, content_text FROM articles WHERE id = ?",
    [articleId]
  );
  const article = (rows as any[])[0];
  if (!article) {
    await connection.end();
    return NextResponse.json({ error: "Nincs ilyen cikk" }, { status: 404 });
  }

  // AI összefoglalás (Ollama példa)
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt: `Foglalj össze magyarul tényszerűen, 5-8 mondatban:\n\n${article.content_text}`
    })
  });
  const data = await res.json();
  const summary = (data.response ?? "").trim();

  // Mentés a summaries táblába
  await connection.execute(
    "INSERT INTO summaries (article_id, summary_text, model_name) VALUES (?, ?, ?)",
    [article.id, summary, "mistral"]
  );

  await connection.end();
  return NextResponse.json({ status: "ok", summary });
}
