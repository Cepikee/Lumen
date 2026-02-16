// app/api/fetch-feed/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import Parser from "rss-parser";
import fs from "fs";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

/** Logolás */
function logError(source: string, err: any) {
  const p = "/var/www/utom/logs/fetch-feed.log";
  const line = `[${new Date().toISOString()}] ${source}: ${
    err instanceof Error ? err.message : String(err)
  }\n`;
  fs.appendFileSync(p, line);
}

/** FEED STATISZTIKA */
const feedStats: Record<string, number> = {
  "Telex": 0,
  "HVG": 0,
  "24.hu": 0,
  "Index": 0,
  "Portfolio": 0,
  "444.hu": 0
};

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

/** ⭐ Puppeteer wrapper */
async function loadWithPuppeteer(url: string): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    logError("PUPPETEER", err);
    return "";
  }
}

/** ⭐ 444.hu mindig Puppeteer */
async function fetch444ArticleContent(url: string): Promise<string> {
  const html = await loadWithPuppeteer(url);
  const $ = cheerio.load(html);
  const article = $("article");

  article.find("aside, .related, .recommended, .share, .social, .ad, .advertisement, script, style, nav, footer, #comments, iframe").remove();

  return cleanHtmlText(article.text());
}

/** ⭐ Portfolio.hu fallback: fetch → ha rövid → Puppeteer */
async function fetchPortfolioArticle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      },
    });

    const html = await res.text();
    let $ = cheerio.load(html);
    let article = $(".article-content, .article-body, article");
    let text = cleanHtmlText(article.text());

    if (text.length > 500) {
      return text;
    }

    logError("PORTFOLIO-FALLBACK", `Fetch too short (len=${text.length}), using Puppeteer`);

    const html2 = await loadWithPuppeteer(url);
    $ = cheerio.load(html2);
    article = $(".article-content, .article-body, article");
    text = cleanHtmlText(article.text());

    return text;
  } catch (err) {
    logError("PORTFOLIO", err);
    return "";
  }
}

/** ⭐ 444.hu főoldal Puppeteer */
async function fetch444Articles(): Promise<{ title: string; link: string }[]> {
  try {
    const html = await loadWithPuppeteer("https://444.hu");
    const $ = cheerio.load(html);

    const articles: { title: string; link: string }[] = [];

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title || title.length < 10) return;

      const link = href.startsWith("http") ? href : `https://444.hu${href}`;
      if (!link.startsWith("https://444.hu")) return;

      articles.push({ title, link });
    });

    const unique = new Map<string, { title: string; link: string }>();
    for (const a of articles) {
      if (!unique.has(a.link)) unique.set(a.link, a);
    }

    return Array.from(unique.values()).slice(0, 50);
  } catch (err) {
    logError("444-LIST", err);
    return [];
  }
}

export async function GET() {
  try {
    const parser = new Parser({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
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

            let content = item["content:encoded"] || item.content || "";

            if (sourceId === 5 && content.length < 500) {
              content = await fetchPortfolioArticle(link);
            }

            await connection.execute(
              `INSERT INTO articles (title, url_canonical, content_text, published_at, language, source_id, source)
               VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
              [
                item.title || "",
                link,
                content,
                "hu",
                sourceId,
                sourceName,
              ]
            );

            inserted++;
            feedStats[sourceName] = (feedStats[sourceName] || 0) + 1;
          }
        }
      } catch (err) {
        logError(sourceName, err);
      }
    }

    /** ⭐ 444.hu feldolgozás Puppeteerrel */
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
                "444.hu",
              ]
            );

            inserted++;
            feedStats["444.hu"]++;
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
    await processRssFeed("https://444.hu/feed", "444.hu");


    await process444Html();

    await connection.end();

    /** ⭐ FEED STATISZTIKA KIÍRÁSA */
    console.log("──────────────── FEED STATISZTIKA ────────────────");
    for (const [source, count] of Object.entries(feedStats)) {
      console.log(`[FEED-STATS] ${source} → ${count} új cikk`);
      fs.appendFileSync(
        "/var/www/utom/logs/fetch-feed.log",
        `[${new Date().toISOString()}] FEED-STATS ${source}: ${count} új cikk\n`
      );
    }
    console.log("────────────────────────────────────────────────────");

    return NextResponse.json({
      status: "ok",
      inserted,
      stats: feedStats
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
