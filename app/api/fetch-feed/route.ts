// app/api/fetch-feed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import * as cheerio from "cheerio";

/** Logolás */
function logError(source: string, err: any) {
  const p = "/var/www/utom/logs/fetch-feed.log";
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;
  fs.appendFileSync(p, line);
}

/** Domain → source_id */
function detectSourceId(url: string | null | undefined): number | null {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    switch (domain) {
      case "telex.hu": return 1;
      case "24.hu": return 2;
      case "index.hu": return 3;
      case "hvg.hu": return 4;
      case "portfolio.hu": return 5;
      case "444.hu": return 6;
      case "magyarnemzet.hu": return 7;
      case "origo.hu": return 8;
      case "nepszava.hu": return 9;
      default: return null;
    }
  } catch {
    return null;
  }
}

/** HTML tisztítás */
function cleanHtmlText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

/** 444.hu cikkoldal scraper */
async function fetch444ArticleContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      Accept: "text/html",
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const article = $("article");

  // Zavaró elemek törlése
  article.find("aside").remove();
  article.find(".related").remove();
  article.find(".recommended").remove();
  article.find(".share").remove();
  article.find(".social").remove();
  article.find(".ad").remove();
  article.find(".advertisement").remove();
  article.find("script").remove();
  article.find("style").remove();
  article.find("nav").remove();
  article.find("footer").remove();
  article.find("#comments").remove();
  article.find("iframe").remove();

  const text = cleanHtmlText(article.text());
  return text;
}

/** 444.hu főoldal scraper (cikk linkek) */
async function fetch444Articles(): Promise<{ title: string; link: string }[]> {
  const url = "https://444.hu";

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      Accept: "text/html",
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const articles: { title: string; link: string }[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    let title = $(el).text().trim();

    if (!href) return;
    if (!title) return;
    if (title.length < 10) return;

    let link = href.startsWith("http") ? href : `https://444.hu${href}`;
    if (!link.startsWith("https://444.hu")) return;

    articles.push({ title, link });
  });

  const unique = new Map<string, { title: string; link: string }>();
  for (const a of articles) {
    if (!unique.has(a.link)) unique.set(a.link, a);
  }

  return Array.from(unique.values()).slice(0, 50);
}

export async function GET() {
  try {
    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "jelszo",
      database: "projekt2025",
    });

    let inserted = 0;

    /** Normál RSS feldolgozás */
    async function processRssFeed(feedUrl: string, sourceName: string) {
      try {
        const res = await fetch(feedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
          },
        });

        const xml = await res.text();
        const feed = await parser.parseString(xml);

        for (const item of feed.items) {
          const link = item.link;
          if (!link) continue;

          const [rows] = await connection.execute<RowDataPacket[]>(
            "SELECT id FROM articles WHERE url_canonical = ?",
            [link]
          );

          if (rows.length === 0) {
            const sourceId = detectSourceId(link);
            if (!sourceId) continue;

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                item.title || "",
                link,
                item["content:encoded"] || item.content || "",
                "hu",
                sourceId,
                sourceName,
              ]
            );

            inserted++;
          }
        }
      } catch (err) {
        logError(sourceName, err);
      }
    }

    /** 444 HTML scraper */
    async function process444Html() {
      try {
        const articles = await fetch444Articles();

        for (const { title, link } of articles) {
          const [rows] = await connection.execute<RowDataPacket[]>(
            "SELECT id FROM articles WHERE url_canonical = ?",
            [link]
          );

          if (rows.length === 0) {
            const sourceId = detectSourceId(link);
            if (!sourceId) continue;

            const content = await fetch444ArticleContent(link);

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                title,
                link,
                content,
                "hu",
                sourceId,
                "444",
              ]
            );

            inserted++;
          }
        }
      } catch (err) {
        logError("444-HTML", err);
      }
    }

    // ---- FEED LISTA ----
    await processRssFeed("https://telex.hu/rss", "Telex");
    await processRssFeed("https://hvg.hu/rss", "HVG");
    await processRssFeed("https://24.hu/feed", "24.hu");
    await processRssFeed("https://index.hu/24ora/rss/", "Index");
    await processRssFeed("https://www.portfolio.hu/rss/all.xml", "Portfolio");

    await process444Html(); // 444 HTML scraper + content

    await connection.end();

    return NextResponse.json({ status: "ok", inserted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
