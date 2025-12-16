import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";

export async function GET() {
  console.log(">>> fetch-feed route elindult!");

  try {
    const parser = new Parser();
    const feed = await parser.parseURL("https://telex.hu/rss"); // RSS URL

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    for (const item of feed.items) {
      // Ellenőrizzük, hogy már benne van-e az articles táblában
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        // mindig a mostani dátumot mentjük published_at mezőbe
        await connection.execute(
          `INSERT INTO articles (title, url_canonical, content_text, published_at, language)
           VALUES (?, ?, ?, NOW(), ?)`,
          [
            item.title || "",
            item.link,
            item.contentSnippet || "",
            "hu",
          ]
        );
        inserted++;
        console.log("🆕 Új cikk mentve:", item.link);
      }
    }

    await connection.end();
    return NextResponse.json({ status: "ok", inserted });
  } catch (err: any) {
    console.error("API /fetch-feed hiba:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
