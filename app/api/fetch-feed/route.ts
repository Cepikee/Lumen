import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";

// Forrás felismerése URL alapján
function detectSourceId(url: string): number | null {
  if (!url) return null;

  if (url.includes("telex.hu")) return 1;
  if (url.includes("hvg.hu")) return 4;
  if (url.includes("24.hu")) return 2;
  if (url.includes("portfolio.hu")) return 3;
  if (url.includes("index.hu")) return 5;
  if (url.includes("444.hu")) return 6;

  return null; // ismeretlen forrás
}

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

    // ---- TELEX ----
    const feedTelex = await parser.parseURL("https://telex.hu/rss");
    for (const item of feedTelex.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        const sourceId = detectSourceId(item.link ?? "");

        await connection.execute(
          `INSERT INTO articles 
             (title, url_canonical, content_text, published_at, language, source_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [
            item.title || "",
            item.link,
            item['content:encoded'] || item.content || item.contentSnippet || "",
            "hu",
            sourceId,
          ]
        );

        inserted++;
        console.log("🆕 Új Telex cikk mentve:", item.link);
      }
    }

    // ---- HVG ----
    const feedHvg = await parser.parseURL("https://hvg.hu/rss");
    for (const item of feedHvg.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        const sourceId = detectSourceId(item.link ?? "");

        await connection.execute(
          `INSERT INTO articles 
             (title, url_canonical, content_text, published_at, language, source_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [
            item.title || "",
            item.link,
            item.contentSnippet || "",
            "hu",
            sourceId,
          ]
        );

        inserted++;
        console.log("🆕 Új HVG cikk mentve:", item.link);
      }
    }

    // ---- 24.hu ----
    const feed24 = await parser.parseURL("https://24.hu/feed/");
    for (const item of feed24.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        const sourceId = detectSourceId(item.link ?? "");

        await connection.execute(
          `INSERT INTO articles 
             (title, url_canonical, content_text, published_at, language, source_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [
            item.title || "",
            item.link,
            item.contentSnippet || "",
            "hu",
            sourceId,
          ]
        );

        inserted++;
        console.log("🆕 Új 24.hu cikk mentve:", item.link);
      }
    }

    // ---- INDEX ----
    const feedIndex = await parser.parseURL("https://index.hu/24ora/rss/");
    for (const item of feedIndex.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        const sourceId = detectSourceId(item.link ?? "");

        await connection.execute(
          `INSERT INTO articles 
             (title, url_canonical, content_text, published_at, language, source_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [
            item.title || "",
            item.link,
            item.contentSnippet || "",
            "hu",
            sourceId,
          ]
        );

        inserted++;
        console.log("🆕 Új Index cikk mentve:", item.link);
      }
    }

    // ---- 444 ----
    const feed444 = await parser.parseURL("https://444.hu/feed");
    for (const item of feed444.items) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM articles WHERE url_canonical = ?",
        [item.link]
      );

      if (rows.length === 0) {
        const sourceId = detectSourceId(item.link ?? "");

        await connection.execute(
          `INSERT INTO articles 
             (title, url_canonical, content_text, published_at, language, source_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [
            item.title || "",
            item.link,
            item.contentSnippet || "",
            "hu",
            sourceId,
          ]
        );

        inserted++;
        console.log("🆕 Új 444 cikk mentve:", item.link);
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
