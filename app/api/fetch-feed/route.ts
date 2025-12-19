import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";

export async function GET() {
  console.log(">>> fetch-feed route elindult!");

  try {
    const parser = new Parser();

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    // Telex RSS
    const feedTelex = await parser.parseURL("https://telex.hu/rss");
    for (const item of feedTelex.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );
      if (rows.length === 0) {
        await connection.execute(
          `INSERT INTO articles (title, url_canonical, content_text, published_at, language)
           VALUES (?, ?, ?, NOW(), ?)`,
          [item.title || "", item.link, item.contentSnippet || "", "hu"]
        );
        inserted++;
        console.log("🆕 Új Telex cikk mentve:", item.link);
      }
    }

    // HVG RSS
    const feedHvg = await parser.parseURL("https://hvg.hu/rss");
    for (const item of feedHvg.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );
      if (rows.length === 0) {
        await connection.execute(
          `INSERT INTO articles (title, url_canonical, content_text, published_at, language)
           VALUES (?, ?, ?, NOW(), ?)`,
          [item.title || "", item.link, item.contentSnippet || "", "hu"]
        );
        inserted++;
        console.log("🆕 Új HVG cikk mentve:", item.link);
      }
    }

    await connection.end();
    return NextResponse.json({ status: "ok", inserted });
  } catch (err: unknown) {
  const message =
    err instanceof Error ? err.message : "Ismeretlen hiba történt";
  console.error("API /fetch-feed hiba:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
}
