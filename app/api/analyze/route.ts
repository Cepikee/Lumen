import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "Hiányzó URL" }, { status: 400 });
  }

  // 1. Lekérjük a cikk tartalmát
  const res = await fetch(url);
  const text = await res.text();

  // 2. Ollama hívás (nem streamelve)
  const ollamaRes = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt: `Elemezd és foglald össze ezt a cikket magyarul:\n\n${text}`,
      stream: true,
    }),
  });

  if (!ollamaRes.ok) {
    const msg = await ollamaRes.text();
    return NextResponse.json({ error: `Ollama hiba: ${msg}` }, { status: 500 });
  }

  const ollamaData = await ollamaRes.json();
  const summary = ollamaData.response;

  // 3. Mentés MySQL-be
  await db.query(
    "INSERT INTO summaries (url, language, content) VALUES (?, ?, ?)",
    [url, "hu", summary]
  );

  return NextResponse.json({ summary });
}
